#!/usr/bin/env python3
"""
M16 corpus audit — what's actually on disk, per venue × per data-layer × per timeframe.

Walks the OpenClaw JSONL corpus (and optionally the Hermes Parquet corpus) and
reports coverage. Stdlib-only, runs in any container with Python 3.8+.

Designed to run on Umbrel inside openclaw_gateway_1:

    docker exec openclaw_gateway_1 python3 /tmp/audit_corpus.py \
        --root /data/umbrel/chartrunner \
        --hermes-root /opt/data/chartrunner/data \
        --out /tmp/audit.json --human

Or just on the OpenClaw root (faster, no Hermes peek):

    docker exec openclaw_gateway_1 python3 /tmp/audit_corpus.py \
        --root /data/umbrel/chartrunner --human

Output:
  - --human: pretty table to stdout (per-venue, per-layer rows + totals).
  - --out:   machine-readable JSON with per-pair / per-tf detail
             (used to drive the gap-fill prioritization).

Performance: avoids reading full JSONL bodies. For OHLCV files it streams
just the first and last line to get earliest/latest timestamps + counts
the lines without parsing them.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Layer detection — maps a file path to a (venue, layer, symbol, tf) tuple.
# Order of patterns matters: more-specific patterns come first.
# ─────────────────────────────────────────────────────────────────────────────

LAYERS = ("ohlcv", "trades", "depth", "funding", "oi", "unknown")
KNOWN_VENUES = (
    "binance", "bybit", "okx", "kraken", "coinbase", "kucoin",
    "hyperliquid", "gate", "mexc",
    "geckoterminal", "dexscreener",
)


def classify_path(root: Path, path: Path):
    """Return (venue, layer, symbol, tf) or (None, ...) if not classifiable."""
    try:
        rel = path.relative_to(root)
    except ValueError:
        return None, None, None, None
    parts = rel.parts
    if not parts:
        return None, None, None, None

    # Layer detection — file/dir name heuristics
    fname = path.name.lower()
    layer = "unknown"
    if "depth" in fname or "/depth/" in str(rel):
        layer = "depth"
    elif "trades" in fname or "/trades/" in str(rel):
        layer = "trades"
    elif "funding" in fname:
        layer = "funding"
    elif fname in ("oi.jsonl", "open_interest.jsonl") or "/oi/" in str(rel):
        layer = "oi"
    elif fname.endswith(".jsonl") or fname.endswith(".parquet"):
        # OHLCV by default for tabular files
        layer = "ohlcv"

    # Venue detection — first path component matching a known venue
    venue = None
    for part in parts:
        p = part.lower()
        # Common subdirectories that aren't venues
        if p in ("dex", "cex", "ohlcv", "ohlc-incremental", "data", "logs",
                 "perp", "spot", "futures"):
            continue
        if p in KNOWN_VENUES:
            venue = p
            break
        # Fuzzy match (handle "geckoterminal_2026" etc)
        for known in KNOWN_VENUES:
            if p.startswith(known):
                venue = known
                break
        if venue:
            break

    # Timeframe + symbol — last two path components, best effort
    tf = path.stem.lower() if path.suffix in (".jsonl", ".parquet") else "?"
    symbol = parts[-2] if len(parts) >= 2 else "?"

    return venue, layer, symbol, tf


# ─────────────────────────────────────────────────────────────────────────────
# JSONL stat — count lines + read first + last open_time, without full parse.
# ─────────────────────────────────────────────────────────────────────────────

def stat_jsonl(path: Path, sample_only: bool = False):
    """Return dict {rows, first_ts, last_ts, size_bytes}."""
    try:
        st = path.stat()
    except OSError:
        return {"rows": 0, "first_ts": None, "last_ts": None, "size_bytes": 0}

    size_bytes = st.st_size
    if size_bytes == 0:
        return {"rows": 0, "first_ts": None, "last_ts": None, "size_bytes": 0}

    rows = 0
    first_ts = None
    last_ts = None
    last_line = b""

    if sample_only:
        # Estimate row count from size + sample first/last only
        try:
            with path.open("rb") as f:
                # First line
                first_line = f.readline()
                if first_line:
                    first_ts = _extract_open_time(first_line)
                # Last line — seek back from end
                f.seek(0, os.SEEK_END)
                pos = f.tell()
                seek_back = min(4096, pos)
                f.seek(pos - seek_back)
                tail = f.read()
                lines = [ln for ln in tail.split(b"\n") if ln.strip()]
                if lines:
                    last_ts = _extract_open_time(lines[-1])
            # Rough rows estimate: size / avg_line_len (use first-line len as proxy)
            if first_line:
                rows = max(1, size_bytes // max(len(first_line), 1))
        except OSError:
            pass
    else:
        try:
            with path.open("rb") as f:
                for line in f:
                    if not line.strip():
                        continue
                    if rows == 0:
                        first_ts = _extract_open_time(line)
                    last_line = line
                    rows += 1
            if last_line:
                last_ts = _extract_open_time(last_line)
        except OSError:
            pass

    return {
        "rows": rows,
        "first_ts": first_ts,
        "last_ts": last_ts,
        "size_bytes": size_bytes,
    }


def _extract_open_time(line: bytes):
    """Pull open_time / t / timestamp from a JSONL row without full JSON parse."""
    try:
        obj = json.loads(line)
    except Exception:
        return None
    for key in ("open_time", "openTime", "t", "ts", "timestamp", "time"):
        if key in obj:
            v = obj[key]
            try:
                v = int(v)
                # Heuristic: if it looks like seconds (10 digits), convert to ms
                if v < 1e12:
                    v *= 1000
                return v
            except (TypeError, ValueError):
                return v
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Walk + aggregate
# ─────────────────────────────────────────────────────────────────────────────

def walk_corpus(root: Path, sample_only: bool = True,
                max_files: int = 0, file_glob: str = "*.jsonl",
                progress_every: int = 1000):
    """Yield per-file records as dicts."""
    n = 0
    t0 = time.time()
    for path in root.rglob(file_glob):
        if not path.is_file():
            continue
        venue, layer, symbol, tf = classify_path(root, path)
        if venue is None:
            continue
        st = stat_jsonl(path, sample_only=sample_only)
        yield {
            "path": str(path.relative_to(root)),
            "venue": venue,
            "layer": layer,
            "symbol": symbol,
            "tf": tf,
            **st,
        }
        n += 1
        if progress_every and n % progress_every == 0:
            print(f"  …scanned {n} files ({time.time()-t0:.1f}s)", file=sys.stderr)
        if max_files and n >= max_files:
            break


def aggregate(records):
    """Roll records up to (venue, layer, tf) → totals."""
    by_vlt = defaultdict(lambda: {
        "files": 0, "rows": 0, "size_bytes": 0,
        "first_ts": None, "last_ts": None, "symbols": set(),
    })
    for r in records:
        key = (r["venue"], r["layer"], r["tf"])
        b = by_vlt[key]
        b["files"] += 1
        b["rows"] += r["rows"]
        b["size_bytes"] += r["size_bytes"]
        b["symbols"].add(r["symbol"])
        if r["first_ts"]:
            b["first_ts"] = min(r["first_ts"], b["first_ts"] or r["first_ts"])
        if r["last_ts"]:
            b["last_ts"] = max(r["last_ts"], b["last_ts"] or r["last_ts"])
    # Convert sets to counts for JSON serialization
    for v in by_vlt.values():
        v["symbol_count"] = len(v["symbols"])
        del v["symbols"]
    return dict(by_vlt)


# ─────────────────────────────────────────────────────────────────────────────
# Pretty print
# ─────────────────────────────────────────────────────────────────────────────

def fmt_size(n):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}PB"


def fmt_ts(ms):
    if not ms:
        return "—"
    try:
        from datetime import datetime, timezone
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return str(ms)


def print_table(agg):
    # Sort by (venue, layer, tf)
    rows = sorted(agg.items())
    print()
    print(f"{'venue':<14} {'layer':<8} {'tf':<6} {'pairs':>7} {'files':>7} "
          f"{'rows':>15} {'size':>10} {'from':>10} {'to':>10}")
    print("─" * 100)
    venue_totals = defaultdict(lambda: [0, 0, 0])  # files, rows, bytes
    grand = [0, 0, 0]
    for (venue, layer, tf), v in rows:
        print(f"{venue:<14} {layer:<8} {tf:<6} "
              f"{v['symbol_count']:>7} {v['files']:>7} {v['rows']:>15,} "
              f"{fmt_size(v['size_bytes']):>10} "
              f"{fmt_ts(v['first_ts']):>10} {fmt_ts(v['last_ts']):>10}")
        venue_totals[venue][0] += v['files']
        venue_totals[venue][1] += v['rows']
        venue_totals[venue][2] += v['size_bytes']
        grand[0] += v['files']
        grand[1] += v['rows']
        grand[2] += v['size_bytes']
    print("─" * 100)
    for venue, (f, r, b) in sorted(venue_totals.items()):
        print(f"{venue:<14} {'TOTAL':<8} {'':<6} {'':>7} {f:>7} {r:>15,} {fmt_size(b):>10}")
    print("─" * 100)
    print(f"{'ALL':<14} {'GRAND':<8} {'':<6} {'':>7} {grand[0]:>7} {grand[1]:>15,} {fmt_size(grand[2]):>10}")


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", required=True,
                    help="Corpus root (e.g. /data/umbrel/chartrunner)")
    ap.add_argument("--hermes-root", default=None,
                    help="Optional Hermes Parquet root (e.g. /opt/data/chartrunner/data)")
    ap.add_argument("--out", default=None, help="Write machine-readable JSON here")
    ap.add_argument("--human", action="store_true",
                    help="Print a human-readable table to stdout")
    ap.add_argument("--full-scan", action="store_true",
                    help="Read every line (slow). Default samples first+last only.")
    ap.add_argument("--max-files", type=int, default=0,
                    help="Stop after N files (for smoke tests). 0 = no limit.")
    args = ap.parse_args()

    root = Path(args.root)
    if not root.is_dir():
        print(f"ERROR: --root {root} not found or not a directory", file=sys.stderr)
        return 1

    print(f"[audit] root: {root}", file=sys.stderr)
    print(f"[audit] mode: {'full-scan' if args.full_scan else 'sample-only'}",
          file=sys.stderr)

    all_records = []
    # OpenClaw JSONL
    for r in walk_corpus(root, sample_only=not args.full_scan,
                         max_files=args.max_files, file_glob="*.jsonl"):
        all_records.append(r)

    # Optional Hermes Parquet
    if args.hermes_root:
        hroot = Path(args.hermes_root)
        if hroot.is_dir():
            print(f"[audit] hermes root: {hroot}", file=sys.stderr)
            for r in walk_corpus(hroot, sample_only=True,
                                 max_files=args.max_files,
                                 file_glob="*.parquet"):
                r["path"] = "[HERMES] " + r["path"]
                all_records.append(r)

    agg = aggregate(all_records)

    if args.human:
        print_table(agg)

    if args.out:
        out = {
            "root": str(root),
            "hermes_root": args.hermes_root,
            "scanned_at": int(time.time()),
            "file_count": len(all_records),
            "aggregate": {
                f"{v}/{l}/{tf}": data
                for (v, l, tf), data in agg.items()
            },
            "files": all_records if len(all_records) < 5000 else None,
        }
        with open(args.out, "w") as f:
            json.dump(out, f, indent=2, default=str)
        print(f"[audit] wrote {args.out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
