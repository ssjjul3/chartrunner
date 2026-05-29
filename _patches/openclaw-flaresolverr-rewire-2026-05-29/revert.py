#!/usr/bin/env python3
"""Restore scrape_ohlc.py from the most recent .bak-{timestamp} backup."""
import shutil
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 2:
        print("usage: revert.py <path to scrape_ohlc.py>", file=sys.stderr)
        return 2
    target = Path(sys.argv[1])
    if not target.is_file():
        print(f"ERROR: target not found: {target}", file=sys.stderr)
        return 2

    pattern = f"{target.name}.bak-*"
    backups = sorted(target.parent.glob(pattern))
    if not backups:
        print(f"ERROR: no backups found matching {pattern}", file=sys.stderr)
        return 3

    latest = backups[-1]
    shutil.copy2(latest, target)
    print(f"[revert] restored from {latest.name}")
    print(f"[revert] OK — {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
