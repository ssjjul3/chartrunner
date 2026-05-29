#!/usr/bin/env python3
"""
Smoke test for the flaresolverr-rewire patch.

Imports the patched scrape_ohlc.request_json and runs it against:
  - A CEX endpoint (Binance) that should always go direct
  - A DEX endpoint (GeckoTerminal) that should go via flaresolverr when
    OHLC_USE_FLARESOLVERR=1, and direct otherwise.

Run inside the openclaw_gateway_1 container so the same sys.path + imports
work as in production.

Usage:
    # Default: flag is whatever's in env. Pass --flag to force.
    docker exec openclaw_gateway_1 python3 /tmp/fs-rewire/smoke_test.py

    # Force on:
    docker exec -e OHLC_USE_FLARESOLVERR=1 openclaw_gateway_1 \
        python3 /tmp/fs-rewire/smoke_test.py

    # Force off (sanity):
    docker exec -e OHLC_USE_FLARESOLVERR=0 openclaw_gateway_1 \
        python3 /tmp/fs-rewire/smoke_test.py
"""
import os
import sys
import time

SCRAPER_DIR = "/data/.openclaw/workspace/ohlc-scraper"
sys.path.insert(0, SCRAPER_DIR)


def _t():
    return time.strftime("%H:%M:%S")


def main():
    print(f"[{_t()}] importing patched scrape_ohlc from {SCRAPER_DIR}")
    try:
        import scrape_ohlc
    except Exception as e:
        print(f"FAIL: import scrape_ohlc — {e}")
        return 1

    flag = scrape_ohlc._USE_FLARESOLVERR
    url_helper = scrape_ohlc._FLARESOLVERR_URL
    hosts = scrape_ohlc._FLARESOLVERR_HOSTS
    print(f"[{_t()}] env: OHLC_USE_FLARESOLVERR={int(flag)}")
    print(f"[{_t()}] env: FLARESOLVERR_URL={url_helper}")
    print(f"[{_t()}] env: FLARESOLVERR_HOSTS={hosts}")

    # 1) CEX endpoint — should always go direct
    cex_url = "https://api.binance.com/api/v3/ping"
    t0 = time.time()
    try:
        cex_result = scrape_ohlc.request_json(cex_url, timeout=10)
        t_cex = time.time() - t0
        print(f"[{_t()}] CEX  Binance /ping  → {t_cex:.2f}s  result={cex_result}")
    except Exception as e:
        print(f"[{_t()}] CEX  Binance /ping  → FAIL  {e}")
        return 2

    # 2) DEX endpoint — should go via flaresolverr when flag is on
    dex_url = "https://api.geckoterminal.com/api/v2/networks/solana"
    routed = scrape_ohlc._should_route_via_flaresolverr(dex_url)
    print(f"[{_t()}] DEX  routing decision: {'flaresolverr' if routed else 'direct'}")
    t0 = time.time()
    try:
        dex_result = scrape_ohlc.request_json(dex_url, timeout=30)
        t_dex = time.time() - t0
        # GeckoTerminal /networks/<id> returns either a network description
        # or a list of networks; just print the shape
        if isinstance(dex_result, dict):
            keys = sorted(dex_result.keys())[:5]
            print(f"[{_t()}] DEX  GeckoT /networks/solana → {t_dex:.2f}s  keys={keys}")
        else:
            print(f"[{_t()}] DEX  GeckoT /networks/solana → {t_dex:.2f}s  type={type(dex_result).__name__}")
    except Exception as e:
        print(f"[{_t()}] DEX  GeckoT /networks/solana → FAIL  {type(e).__name__}: {e}")
        if not flag:
            print("       (flag is OFF — failure is expected if CF challenges are active.")
            print("        Re-run with OHLC_USE_FLARESOLVERR=1 to verify flaresolverr path.)")
        return 3

    # 3) Decision matrix sanity — confirm the URL classifier is right
    cases = [
        ("https://api.binance.com/api/v3/ping", False),
        ("https://api.bybit.com/v5/market/kline", False),
        ("https://api.geckoterminal.com/api/v2/networks", True),
        ("https://api.dexscreener.com/token-profiles/latest/v1", True),
        ("https://api.coingecko.com/api/v3/coins/markets", False),
    ]
    print(f"[{_t()}] URL classifier matrix:")
    ok = True
    for url, want in cases:
        got = scrape_ohlc._should_route_via_flaresolverr(url)
        # If flag is off, _should_route_via_flaresolverr returns False
        # regardless — so for the "want=True" cases when flag is off we expect False.
        expected = want if flag else False
        status = "OK" if got == expected else "FAIL"
        print(f"        {status:<4} {url[:60]:<60} → flaresolverr={got}  (expected {expected})")
        if got != expected:
            ok = False

    if not ok:
        print(f"[{_t()}] FAIL — URL classifier mismatch")
        return 4

    print(f"[{_t()}] OK — all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
