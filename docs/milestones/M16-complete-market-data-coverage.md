# M16 — Complete Market Data Coverage

**Status:** 🟢 BONUS · 0/14 (added 2026-05-29; 2026-05-30 proved the OpenClaw JSONL corpus can drive P1 bot-spec backtests)
**Theme:** A complete market-data corpus on Umbrel covering every supported venue × every data layer × every available history depth. This is the substrate that makes ChartRunner's backtesting (M11, M14, M3 Workbench Backtest tab) defensible: when a player runs a strategy, the engine has real ticks, real L2 depth, real funding curves to test against — not just OHLCV snapshots from one exchange.

> **Cross-milestone notes:**
>
> - **FEEDS [[M11-umbrel-native-toolset]]** — M11's Backtest Results View needs M16's corpus. Without coverage breadth, M11 is a TradingView clone running on one exchange of OHLCV; with M16, it's a quant-grade backtest harness running on the data nobody else has indexed locally.
> - **FEEDS [[M14-bot-first-runtime]]** — bot backtests recorded on-chain via `BotBacktestRecord` need a canonical multi-venue source. Without M16, every bot is forced to use a single thin venue (currently Binance 2.6M rows; M16 adds the depth + breadth).
> - **PAIRS WITH [[M11-canonical-ohlc-decision]]** — that memo (2026-05-29) recommends OpenClaw JSONL as canonical. M16 commits to building it out properly under that decision. Hermes's parallel Parquet corpus is frozen as a reference snapshot, not extended.
> - **CONSUMES [[M12-umbrel-stack-adoption]]** — M12 added flaresolverr + Plausible + InfluxDB. M16 uses flaresolverr for DEX scraping (Cloudflare-protected GeckoTerminal/Dexscreener) and InfluxDB for scraper health telemetry.
> - **CROSS-REFERENCES [`reference_chartrunner_umbrel_agents`](../../../memory/reference_chartrunner_umbrel_agents.md)** — Hermes (research) + OpenClaw (ops) split; M16 commits the scraper ownership to OpenClaw.

> **Why bonus + not numbered priority:** the numbered M0.5→M10 roadmap is product-shaped (security → tokenomics → coach → SDK → wallet identity → build → marketplace → exchange → AI → streaming → tournaments → mobile → mainnet). M16 is an infrastructure-deepening play that enables M11, M14, and M3 Workbench's Backtest tab without being on any of their critical paths. Pickable opportunistically while those numbered milestones are gated on other dependencies.

## Completion condition (all required)

### Data-layer coverage

- [ ] **OHLCV (all pairs, all timeframes)** across all 11 venues, full history per venue, in JSONL format under `/data/umbrel/chartrunner/<venue>/<symbol>/<tf>.jsonl`.
- [ ] **Trades stream (per-tick)** for every active spot pair across the 9 CEX + perp pair on each perp-supporting venue. Storage: append-only JSONL under `/data/umbrel/chartrunner/<venue>/<symbol>/trades.jsonl`.
- [ ] **Level-2 orderbook depth** snapshots (top-25 bid/ask) at ≥1Hz for the top-100 pairs by 24h volume on each CEX. Storage: rolling NDJSON under `/data/umbrel/chartrunner/<venue>/<symbol>/depth/{YYYY-MM-DD}.jsonl`.
- [ ] **Funding rates + open interest** for every perp pair (Hyperliquid + Binance Futures + Bybit Futures + OKX Perp + Gate Perp + MEXC Perp). Snapshot interval: 1h. Storage: `<venue>/perp/<symbol>/funding.jsonl` + `oi.jsonl`.

### Venue coverage

- [ ] **All 11 existing venues:** Binance · Bybit · OKX · Kraken · Coinbase · KuCoin · Hyperliquid · Gate · MEXC (CEX) + GeckoTerminal · Dexscreener (DEX). Each has its own scraper module, all routed through `incremental_daily.py`'s pattern.
- [ ] **Per-venue health dashboard** in Grafana via InfluxDB: per-layer per-venue success rate, last-successful-fetch timestamp, retry count, rate-limit hit count. (M12 dependency).

### History depth

- [ ] **All-available-history backfill** per venue + per layer. Earliest target: each venue's earliest publicly-available candle (Binance 2017, Coinbase 2015, Kraken 2013, Bybit 2018, OKX 2017, etc).
- [ ] **Backfill completion tracking** — `<venue>/_BACKFILL_STATE.json` per venue tracks which symbol×timeframe pairs are fully backfilled vs. incremental-only.

### Reliability

- [ ] **DEX scraper via flaresolverr** — GeckoTerminal + Dexscreener requests routed through `flaresolverr_server_1:8191` to defeat Cloudflare 401/429. Captured separately as [_patches/openclaw-flaresolverr-rewire-2026-05-29/](../../_patches/openclaw-flaresolverr-rewire-2026-05-29/).
- [ ] **Scraper restart-resilience** — every scraper resumes from its last-known-good checkpoint after a crash. No work redone on restart.
- [ ] **Cron-driven full coverage** — every layer × every venue has at least one Cron Job in OpenClaw's scheduler, with a monitoring trigger that pages on >24h silence.

### Audit + access

- [ ] **Coverage audit script** committed at `_tools/audit-corpus.py`. Reports per-venue / per-layer / per-tf row counts + earliest/latest timestamps + gap days. Runs in <60s on the corpus root.
- [ ] **Documentation** at `docs/architecture/M16-corpus-layout.md` describing the on-disk format, naming conventions, and how to add a new venue scraper.

## Imminent-solvables

### Ready bucket

- [ ] `[D]` **Promote P1 real-OHLC coverage audit** — turn the 2026-05-30 P1 reuse run into a small coverage report: which 58 of the 60 `ohlc-full` daily symbols qualified, which 2 were skipped by `min_candles`, and whether those skips are stale/empty/corrupt data.
- [ ] `[D]` **Run the coverage audit** — `_tools/audit-corpus.py` against `/data/umbrel/chartrunner/`. Output: ground truth on what we have today across the 4 layers × 11 venues. Drives every subsequent prioritization decision in this milestone.
- [ ] `[D]` **Apply the flaresolverr rewire patch** — staged in `_patches/openclaw-flaresolverr-rewire-2026-05-29/`. Closes the DEX OHLCV gap (1,581 fails + 8,276 rate-limits per audit). Smallest win in this milestone.
- [ ] `[D]` **Restart Bybit deep scraper** — died with exit 2 on 2026-05-26 04:21 UTC per audit. Investigate cause (likely transient), restart via OpenClaw Cron Jobs.
- [x] 2026-05-29 — `[D]` **Write `docs/architecture/M16-corpus-layout.md`** — DONE → `docs/architecture/M16-corpus-layout.md`. Formalizes the as-built OpenClaw JSONL layout (`<scrape-job>/<cex|dex>/<venue>/<market>/<SYMBOL>/<tf>.jsonl`), the OHLCV line schema (string OHLCV + ms open_time + confirmed flag), proposed trades/depth/funding/oi schemas, `_BACKFILL_STATE.json`, manifests, the audit tool's classification rules, and a 6-step "add a new venue scraper" recipe. Grounded in the resource map + canonical decision + `audit_corpus.py` (not invented).
- [ ] `[D]` **Audit Hermes corpus** — what's in `/opt/data/chartrunner/data/ohlcv/` (Parquet). Per `M11-canonical-ohlc-decision.md`, Hermes corpus is frozen as a reference snapshot, but we should know what it covers before freezing (in case anything's worth migrating to JSONL).
- [x] 2026-05-29 — `[O]` **Coverage gap report** — DONE → `docs/architecture/M16-gap-report-2026-05-29.md`. Walked the inline corpus audit into a per-venue × per-TF gap ledger (staleness + history-deficit-days) + cost÷value priority list. Headline reframe: DEX isn't the critical path (GeckoTerminal healthy; Dexscreener is the real 0-row hole) — the real path is the 3 stale-scraper restarts (Gate/MEXC/Hyperliquid) + Coinbase/Kraken/KuCoin deep backfills. Per-pair gaps need a full (non-sample) audit run on-host.
- [ ] `[D]` **Trades-stream scraper for Binance** — Binance has the simplest aggTrades endpoint. First trades-layer venue. Tests the JSONL format + storage growth rate before committing to the other 8 CEX.
- [ ] `[D]` **Funding-rate scraper for Hyperliquid** — Hyperliquid has the cleanest funding API; small data volume. First perps-funding venue. Tests the layout for the other 5 perp venues.
- [ ] `[D]` **L2 depth scraper PoC for one CEX** — Binance or Bybit (both have stable depth endpoints). 1Hz polling on BTC/USDT only. Tests storage growth rate. **WARNING:** depth data is multi-TB scale at full coverage; PoC first to size the storage commitment.
- [ ] `[O]` **Scraper-health InfluxDB dashboard** — Cascade Health dashboard from M12 plus per-venue per-layer panels. (M12 dependency: InfluxDB has data flowing.)
- [ ] `[D]` **Add KuCoin + Coinbase + Kraken deep backfills** — currently invisible in the row-count audit. Run `scripts/run_exchange_deep.sh` for each.

### Blocked bucket

- [ ] `[D]` **Trades-stream scraper for all 9 CEX** — **BLOCKED:** Binance PoC validates the JSONL layout + storage growth.
- [ ] `[D]` **L2 depth scraper for top-100 pairs per CEX** — **BLOCKED:** PoC validates storage growth + 1Hz polling is sustainable on the Umbrel hardware.
- [ ] `[D]` **DEX trades + depth via flaresolverr** — **BLOCKED:** DEX OHLCV rewire stable + DEX venues actually expose trades + depth (GeckoTerminal does; Dexscreener does not publish depth).
- [ ] `[D]` **Cross-venue normalization layer** — unified symbol resolution (BTC/USDT on Binance ≡ XBTUSDT on Kraken ≡ tBTCUSD on Bitfinex). **BLOCKED:** all 4 data layers exist per venue (otherwise normalization is academic).

### Done bucket

- [x] 2026-05-30 — `[D]` **P1 reuse proof on real OHLC** — DONE → current Pine/spec backtest runner consumed OpenClaw `ohlc-scraper/data/ohlc-full` JSONL directly. It found 58 usable daily symbol datasets, produced 3712 detector-proxy rows, and produced 232 baseline rows. This does not complete M16's venue/layer coverage goals; it proves the corpus is already usable by product backtests.

## State

- Progress: 0/14 completion conditions
- Blockers active: 4 (trades + depth full-roll-out blocked on PoC validation; DEX trades+depth blocked on OHLCV rewire stable; normalization blocked on all-layers existing)
- Scheduled today: 0

## Current state baseline — 2026-05-29 corpus audit

Captured via `_tools/audit_corpus.py` against `/data/umbrel/chartrunner/`. **71,978 files / 430M rows / 88.4 GB** across 10 of 11 venues (Dexscreener absent). Sample-mode (first+last line per file).

### Product reuse proof — 2026-05-30

The P1 Pine/spec pipeline now reads the older OpenClaw scraper path directly:

`/home/umbrel/umbrel/app-data/openclaw/data/.openclaw/workspace/ohlc-scraper/data/ohlc-full`

The first full run used `1d.jsonl` files and qualified 58 daily symbols at `min_candles=90`. It generated:

- 3712 detector-proxy real-OHLC rows (`chartrunner-detector-proxy-v1`)
- 232 baseline rows (`buy_hold`, `sma_cross`, `ema_cross`, `rsi_mean_reversion`)
- latest exported bot-spec metrics with `dataset = "ohlc-jsonl-v1"`

This is M16 evidence, not completion: OHLCV exists and is product-usable, but M16 still requires all venues, trades, L2 depth, funding/OI, health dashboards, and full backfill tracking.

| Venue | Rows | TFs | Earliest history | Last update | Diagnosis |
|---|---:|---:|---|---|---|
| **Bybit** | 215.7M | 7 | 2021-07-01 (1m) | 2026-05-26 | ✅ Healthy. Resumed after the 05-26 04:21 exit-2. |
| **OKX** | 159.1M | 7 | 2017-09-30 (1m) | 2026-05-26 | ✅ Deep + wide. |
| **Binance** | 14.6M | 7 | **2017-08-01** (1m, 1d) | 2026-05-26 | ⚠ Intra-TF gaps: 5m only since 2026-05-16, 15m since 04-14, 4h since 2025-11-29. Backfill 5m/15m/1h/4h deep. |
| **Gate** | 11.8M | 7 | **2013-03-25** (1w) | 2026-05-22 ❄ | ⚠ Stale 7 days. Restart scraper. |
| **GeckoTerminal** | 11.2M | 6 | 2024-08-11 (1d) | 2026-05-26 | ✅ Scraper IS working — 334 pairs across 5 networks. The "1,581 fails + 8,276 rate-limits" was discovery-side noise, not steady-state failure. |
| **MEXC** | 5.6M | 7 | 2017-09-30 (1m) | 2026-05-22 ❄ | ⚠ Stale 7 days. Restart. |
| **Kraken** | 5.2M | 6 (no 1w) | 2024-05-29 (1d) | 2026-05-26 | ❌ Shallow vs. Kraken's 2013 floor. Deep backfill needed. |
| **Hyperliquid** | 4.8M | 6 (no 1w) | 2024-04-16 (since HL launch) | 2026-05-22 ❄ | ⚠ Stale 7 days. Restart. |
| **KuCoin** | 1.4M | 7 | mostly only May 2026 | 2026-05-26 | ❌ Very thin history. Deep backfill needed. |
| **Coinbase** | **0.7M** | 5 (no 4h/1w) | 2025-03-19 (1d) | 2026-05-26 | ❌ Thinnest. Missing 4h + 1w entirely. Coinbase supports back to 2015; we have 1 year. |
| **Dexscreener** | **0** | — | — | — | ❌ Scraper never built. |

### Reframed gaps (from "fix DEX" to "fill the real holes")

The audit changes the priority order materially. The original assumption — *"DEX scraper is failing, fix it first"* — was based on 1,581 fails + 8,276 rate-limits in the audit memo. The actual on-disk picture: GeckoTerminal has 11M rows of clean OHLCV across 334 pairs and the scraper is up-to-date through 2026-05-26. The flaresolverr rewire becomes a **reliability buffer**, not a critical-path unblock.

The real headline gaps are:

1. **Dexscreener — entirely missing** (0 rows). This is the bigger DEX hole. Needs a brand-new scraper module patterned on the GeckoTerminal one.
2. **Coinbase backfill** — 5 TFs only (no 4h, no 1w), ~1 year of 1d history vs. Coinbase's 2015 floor. The biggest CEX history deficit.
3. **Kraken backfill** — 6 TFs (no 1w), ~2 years vs. Kraken's 2013 floor. Second biggest CEX history deficit.
4. **KuCoin backfill** — 7 TFs but mostly only May 2026 data. ~1 month of history across most pairs.
5. **Binance intra-TF backfill** — 1m+1d are deep (2017) but 5m only goes 2 weeks back, 15m 6 weeks, 4h 6 months. Binance offers all of these deep.
6. **3 stale venues** (Gate, MEXC, Hyperliquid — all stopped 2026-05-22). Likely a coordinated scheduler issue worth one investigation pass to fix all three.

### Revised venue priority order

(supersedes the original "Notes → Venue priority order" guidance now that we have ground truth)

1. **Investigate the 3 stale scrapers** (Gate / MEXC / Hyperliquid). Likely cheap restart. Get them back on the daily cadence.
2. **Coinbase deep backfill** — biggest CEX history gap; smallest pair universe so probably the cheapest to backfill thoroughly.
3. **Kraken deep backfill** — second-biggest gap; deep history available.
4. **KuCoin deep backfill** — fills out the "third-tier CEX" coverage.
5. **Binance intra-TF backfill** — fills the 5m/15m/4h gap on the most-used venue.
6. **Dexscreener scraper** — build a new module patterned on the GeckoTerminal scraper. Route through flaresolverr from day one.
7. **flaresolverr toggle on for GeckoTerminal** — reliability buffer; enable when stable, but not urgent. Patched and ready; flag is `OHLC_USE_FLARESOLVERR=1` in the Cron Job env per [_patches/openclaw-flaresolverr-rewire-2026-05-29/](../../_patches/openclaw-flaresolverr-rewire-2026-05-29/).
8. **Trades / L2 depth / funding** — PoC and storage-decide as originally scoped.

## Notes

### Storage projections

Rough projection per data layer, assuming 5 years of full history × top-200 pairs per venue × all timeframes:

| Layer | Per-venue | × 11 venues | Notes |
|---|---|---|---|
| OHLCV | ~5 GB | ~55 GB | Trivial. Already at ~79 GB across 7 venues. |
| Trades | ~50 GB | ~550 GB | Per-tick is the bulk. Compress with zstd for ~3× savings → ~180 GB compressed. |
| L2 depth | ~500 GB | ~5.5 TB | This is the storage commitment. Sample less aggressively for tail venues. |
| Funding/OI | ~100 MB | ~1 GB | Trivial. 1h snapshots only. |
| **Total** | | **~6 TB** | Without compression. ~2 TB with zstd on trades + depth. |

Umbrel typically ships with 1-4 TB drives. A serious L2 depth campaign needs an external array (USB-C or NAS). **This is a hardware planning decision before committing to full L2 depth.**

### Venue priority order (suggested)

1. **DEX (GeckoTerminal + Dexscreener) OHLCV** — broken now; flaresolverr rewire is the immediate fix.
2. **CEX OHLCV gap-fill** — Binance / Coinbase / Kraken / KuCoin currently thin per audit.
3. **Perps funding+OI** — small data, big strategic value (Hyperliquid is the canonical M5 target).
4. **Trades stream** — start with Binance PoC. Scale to all CEX if storage holds.
5. **L2 depth** — last and most expensive. Decide only after storage is sized.

### Open questions

- **Hardware**: external storage for L2 depth → buy / use existing NAS / sample less?
- **Canonical decision**: confirm OpenClaw JSONL per [`M11-canonical-ohlc-decision.md`](../../docs/architecture/M11-canonical-ohlc-decision.md), retire Hermes parallel scrape.
- **API keys**: paid tiers (GeckoTerminal Pro, Dexscreener Pro, CoinGecko Demo) unblock higher rate limits. Worth the spend?
- **Reuse what's there**: per the Telegram coordination memory, Hermes and OpenClaw have been scraping in parallel for weeks. The audit will reveal what's already on disk before we redo any of it.

### Sources

- 2026-05-28 session expansion: *"we need the whole pack, we want to scrape the whole book to let people backtest on all venues"*
- Memory: `project_chartrunner_hq_telegram_group` (dual-scrape coordination)
- Memory: `reference_chartrunner_umbrel_agents` (Hermes/OpenClaw split)
- `MILESTONE_AUDIT.md §0/§3` — current corpus inventory
- [`M11-canonical-ohlc-decision.md`](../../docs/architecture/M11-canonical-ohlc-decision.md) — canonical format choice
