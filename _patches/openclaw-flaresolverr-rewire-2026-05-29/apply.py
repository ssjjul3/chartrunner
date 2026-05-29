#!/usr/bin/env python3
"""
Apply the flaresolverr-rewire patch to scrape_ohlc.py.

Two changes, both idempotent:

1. Insert the flaresolverr block from flaresolverr_block.py right after the
   `from ollama_filter import ...` line. Skips insertion if the marker
   `# ── flaresolverr URL-aware routing ──` already exists.

2. Insert one dispatch line as the first statement of `request_json`:
       if _should_route_via_flaresolverr(url):
           return _request_json_via_flaresolverr(url, params, timeout)
   Skips if `_should_route_via_flaresolverr` already appears in the body.

A backup is written to `<target>.bak-{YYYYMMDD-HHMMSS}` before any change.

Usage:
    python3 apply.py /data/.openclaw/workspace/ohlc-scraper/scrape_ohlc.py
"""
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path


MARKER = "# ── flaresolverr URL-aware routing ──"
DISPATCH = (
    "    if _should_route_via_flaresolverr(url):\n"
    "        return _request_json_via_flaresolverr(url, params, timeout)\n"
)
ANCHOR_IMPORT_LINE = "from ollama_filter import"
ANCHOR_FUNC_DEF = "def request_json("


def main():
    if len(sys.argv) != 2:
        print("usage: apply.py <path to scrape_ohlc.py>", file=sys.stderr)
        return 2
    target = Path(sys.argv[1])
    if not target.is_file():
        print(f"ERROR: target not found: {target}", file=sys.stderr)
        return 2

    block_path = Path(__file__).parent / "flaresolverr_block.py"
    if not block_path.is_file():
        print(f"ERROR: block file missing: {block_path}", file=sys.stderr)
        return 2

    src = target.read_text()
    block = block_path.read_text()

    # Backup
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    bak = target.with_suffix(target.suffix + f".bak-{ts}")
    shutil.copy2(target, bak)
    print(f"[apply] backup: {bak.name}")

    # Step 1: Insert the flaresolverr block after `from ollama_filter import …`
    if MARKER in src:
        print(f"[apply] flaresolverr block already present — skipping insert")
        new = src
    else:
        lines = src.split("\n")
        insert_after = None
        for i, line in enumerate(lines):
            if line.startswith(ANCHOR_IMPORT_LINE):
                insert_after = i
                break
        if insert_after is None:
            print(
                f"ERROR: couldn't find anchor `{ANCHOR_IMPORT_LINE}` in {target}",
                file=sys.stderr,
            )
            print(f"       restore from {bak} if needed", file=sys.stderr)
            return 3
        new_lines = (
            lines[: insert_after + 1]
            + [""]
            + block.rstrip().split("\n")
            + lines[insert_after + 1 :]
        )
        new = "\n".join(new_lines)
        print(f"[apply] inserted flaresolverr block after line {insert_after + 1}")

    # Step 2: Insert the dispatch line at the top of request_json's body
    if "_should_route_via_flaresolverr(url):" in new:
        print(f"[apply] dispatch already present — skipping")
    else:
        # Find the line that starts with `def request_json(` and inject after it
        lines = new.split("\n")
        out_lines = []
        injected = False
        i = 0
        while i < len(lines):
            line = lines[i]
            out_lines.append(line)
            if (
                not injected
                and line.startswith(ANCHOR_FUNC_DEF)
                and "(" in line
            ):
                # Append dispatch as the first body statement
                # (the dispatch already includes 4-space indent + newline)
                # We strip trailing newline of DISPATCH to avoid double blank lines
                for d in DISPATCH.rstrip("\n").split("\n"):
                    out_lines.append(d)
                injected = True
                print(f"[apply] inserted dispatch after line {i + 1}")
            i += 1
        if not injected:
            print(
                f"ERROR: couldn't find `{ANCHOR_FUNC_DEF}` in patched file",
                file=sys.stderr,
            )
            return 4
        new = "\n".join(out_lines)

    target.write_text(new)

    # Verification — both markers should now be present
    final = target.read_text()
    ok = MARKER in final and "_should_route_via_flaresolverr(url):" in final
    if not ok:
        print("ERROR: post-apply verification failed", file=sys.stderr)
        return 5
    print(f"[apply] OK — {target}")
    print(f"[apply] revert: python3 revert.py {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
