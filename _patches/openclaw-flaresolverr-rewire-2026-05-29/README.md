# OpenClaw flaresolverr rewire — 2026-05-29

Routes DEX (GeckoTerminal + Dexscreener) HTTP requests through the
`flaresolverr_server_1` container to defeat the Cloudflare 401/429
challenges that produced 1,581 fails + 8,276 rate-limits in the last
GeckoTerminal window (per `MILESTONE_AUDIT.md §0`). CEX traffic
(Binance, Bybit, OKX, etc.) is untouched — it goes direct as before.

**Target file:** `/data/.openclaw/workspace/ohlc-scraper/scrape_ohlc.py`
inside the `openclaw_gateway_1` container.

**Code change:** ~50 LOC additive. Inserts a flaresolverr block after
the imports and adds a one-line URL-aware dispatch as the first
statement of `request_json()`. Original function body untouched.

**Default behavior:** opt-in via env. Set `OHLC_USE_FLARESOLVERR=1`
in the scraper's Cron Job environment to enable. With the flag off,
the patched file behaves identically to the original.

**Override-able:**

- `OHLC_USE_FLARESOLVERR` — `0` (default off) or `1` (on)
- `FLARESOLVERR_URL` — default `http://flaresolverr_server_1:8191/v1`
- `FLARESOLVERR_HOSTS_GLOB` — default
  `api.geckoterminal.com,api.dexscreener.com` (comma-separated; any
  URL that contains one of these substrings is routed via flaresolverr)

## Files in this directory

- `apply.py` — apply the patch to a target file. Stdlib-only Python.
  Creates a `.bak-{timestamp}` backup, idempotent (safe to re-run).
- `revert.py` — restores from the most recent `.bak-*` file.
- `smoke_test.py` — runs both code paths against live GeckoTerminal +
  Binance endpoints. Prints a comparison.
- `flaresolverr_block.py` — the snippet that gets inserted (for inspection).
- `README.md` — this file.

## Quick install on Umbrel

```bash
# 1) Copy the patch dir from your Mac to Umbrel
scp -r "/Users/julianroy/Desktop/Desktop/Trading Game/_patches/openclaw-flaresolverr-rewire-2026-05-29" \
       umbrel@umbrel.local:/tmp/

# 2) Copy into the container + apply
ssh umbrel@umbrel.local
docker cp /tmp/openclaw-flaresolverr-rewire-2026-05-29 \
          openclaw_gateway_1:/tmp/fs-rewire
docker exec openclaw_gateway_1 python3 /tmp/fs-rewire/apply.py \
    /data/.openclaw/workspace/ohlc-scraper/scrape_ohlc.py

# 3) Smoke-test (env var only affects this process)
docker exec -e OHLC_USE_FLARESOLVERR=1 openclaw_gateway_1 \
    python3 /tmp/fs-rewire/smoke_test.py

# 4) Flip on for the scraper — add OHLC_USE_FLARESOLVERR=1 to whichever
#    Cron Job runs the DEX scrapers (run_dex_deep.sh / run_dex_existing_backfill.sh /
#    run_when_dex_idle.sh + retry_missing_dex.py). Restart the Cron in OpenClaw.
```

## To revert

```bash
docker exec openclaw_gateway_1 python3 /tmp/fs-rewire/revert.py \
    /data/.openclaw/workspace/ohlc-scraper/scrape_ohlc.py
```

The patch is also reversible **without** running `revert.py` by just
unsetting `OHLC_USE_FLARESOLVERR` — the patched function falls back to
the original urllib path. `revert.py` is only needed if you want the
file byte-identical to the pre-patch state (e.g. for a clean upgrade).

## How it integrates with existing retry logic

`request_json` is called by `request_json_with_retries` in
`incremental_daily.py`, which has retry + 429-backoff handling. The
flaresolverr path re-raises HTTPError(429) and HTTPError(5xx) when
flaresolverr surfaces a transient failure from the target — so the
existing retry loop continues to work as before. Only the underlying
transport changes; the failure modes upstream consumers see are the
same.

## What this patch does NOT do

- Does not change `incremental_daily.py` (no need — the dispatch is in
  `scrape_ohlc.py` which is imported).
- Does not modify CEX paths.
- Does not add new dependencies (stdlib `urllib` + `json` + `os`).
- Does not set up the `OHLC_USE_FLARESOLVERR=1` env var anywhere —
  that's a manual Cron Job edit in OpenClaw.

## Important findings from 2026-05-29 install

Three production-URL tests showed that **flaresolverr returns HTML, not JSON, for
GeckoTerminal API endpoints**:

```
routing: flaresolverr
FAIL JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

Root cause: flaresolverr is a *browser proxy* (headless Chrome). It sends
`Accept: text/html` + a Mozilla User-Agent. GeckoTerminal's API endpoints serve
HTML to browser-UA requests and JSON to API-UA requests. There is no way to
inject `Accept: application/json` into flaresolverr's browser-driven request —
the flaresolverr `request.get` command does not honor custom headers.

### Recommendation

- **Leave `OHLC_USE_FLARESOLVERR` unset (off)** for the GeckoTerminal scraper.
  The 2026-05-29 corpus audit confirmed the direct urllib path works fine:
  11.2M rows of GeckoTerminal OHLCV are already on disk and the scraper is
  current through 2026-05-26.
- **Reserve flaresolverr for the future Dexscreener scraper** (M16, currently
  unbuilt). Dexscreener is a JS-rendered webapp where a headless browser is
  the right tool. When the Dexscreener scraper module is added, route it
  through flaresolverr from day one.
- **For future CF-challenged JSON APIs**, the right pattern is
  flaresolverr-as-cookie-harvester (fetch once via flaresolverr to obtain
  `cf_clearance` cookies, then make direct urllib calls with those cookies +
  `Accept: application/json` header). That would be a different patch.

The infrastructure in this patch is sound (apply.py + revert.py + URL-aware
dispatch). It just turns out the current production traffic doesn't need it.
Keeping the patch installed costs nothing — the dispatch is a no-op while
the flag is off. Removing it via `revert.py` is also fine.
