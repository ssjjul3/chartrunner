# M11 — Umbrel-Native Quant Toolset (Scanner · Chart · Strategy Lab · Backtest)

**Status:** 🟡 PARTIAL · 5/13 (newly added 2026-05-28; Hermes built the spine; 2026-05-30 wired the Pine/backtest lane to real OpenClaw OHLC)
**Theme:** A local-first, Umbrel-hosted ChartRunner companion product. Single workflow **Scanner → Chart → Strategy → Backtest** that unifies what's currently fragmented across DexScreener / TradingView / Birdeye, all on the user's own machine. Hermes has built the strategic positioning docs + the data-access spine + the initial backtest engine + PineScript ingestion. Remaining work is the user-facing surface (CLI or web UI), Backtest Results View, cross-product contract, and an end-to-end smoke test.

> **Cross-product positioning:** the existing `ChartRunner_Prototype.html` is a gamified runner-on-candles experience; M11 is a quant tool. They share the OHLC corpus, the PineScript catalogue, and potentially the `coin_profiles/` regime tagging. They differ in UI, workflow, and audience — runner-physics-game vs. trader-tool. Defining the exact shared/separate surface is part of this milestone's completion conditions.

> **Cross-milestone notes 2026-05-28:**
>
> - **GAINS PAID-BACKTEST PATH from [[M13-runner-wallet]] + [[M14-bot-first-runtime]]** — Runner Wallet exposes a `payForBacktest(N)` flow; M14 introduces an on-chain `BotBacktestRecord` PDA. M11's Backtest Results View can read from the same canonical store M14's bots write to. Single source of truth for backtest history across the game-side and quant-tool-side surfaces.
> - **CAN SHARE CHART ENGINE with [[M15-lightweight-charts-hybrid]]** — M11's Chart View needs a real chart engine. If M15 lands first, M11 reuses `src/core/chart-engine.js` (Lightweight Charts) instead of building a parallel one. Resolves the "what's shared between game-the-product and quant-tool-the-product" question for the chart layer specifically.

## Completion condition (all required)

- [ ] **Scanner View** — pair discovery with filters (new / trending / high-volume), reads from `pairs` table in `chartrunner.db`, scanner filter presets persist to `user/scanner/filters.json`
- [ ] **Chart View** — interactive charting with drawings + on-chain overlays (liquidity heatmap, whale markers, holder concentration), drawings persist to `user/charts/drawings/{symbol}.json`
- [ ] **Strategy Lab UI** — browse PineScript strategies from `pinescript/manifest.db`, "Apply to Chart" action persists to `user/charts/strategies/{symbol}.json`
- [ ] **Backtest Results View** — equity curves + metrics + trade logs, reads from `backtesting/engine/jobs.db`
- [x] 2026-05-30 — Backtest engine wired to **a single canonical OHLC corpus** for the Pine/spec lane: `backtest_specs.py` now reads OpenClaw JSONL from `ohlc-scraper/data/ohlc-full` as `ohlc-jsonl-v1` and writes real-market detector-proxy + baseline rows.
- [ ] Cross-product contract documented: what M11 shares with ChartRunner-the-game, what's separate
- [ ] First end-to-end demo: pair lookup → chart with drawing → strategy apply → backtest run → results view

## Imminent-solvables

### Ready bucket (added 2026-05-28 — Hermes buildout already done)

> The strategic docs + data-access spine + initial engine are already built by Hermes on Umbrel and live at `/opt/data/chartrunner/`. The first four items below are recorded as **Done at creation** because they predate this milestone file.

- [x] 2026-05-27 — `[D]` Strategic positioning + P0 scope — `/opt/data/chartrunner/COMPETITIVE_MAPPING.md` (~10k chars) + `P0_REQUIREMENTS.md` (~5k chars). Four-component P0: Scanner → Chart → Strategy Lab → Backtest Results. Differentiators identified: single flow vs. fragmented tools, lightweight + free vs. TradingView bloat/paywall, crypto-native data, Umbrel-local self-hosted, serious backtesting in DeFi.
- [x] 2026-05-27 — `[D]` Data models — `/opt/data/chartrunner/DATA_MODELS.md` + `db/schema.sql`. Hybrid storage: SQLite for `pairs` + `snapshots` (fast filtering), JSON files for user state (drawings/layouts/strategies — restart-safe + human-readable). Multi-chain primary key (`chain:address`). TradingView-compatible drawing model (trendlines / horizontals / rectangles with style + extend flags). On-chain overlays modelled (liquidity heatmap, whale markers, holder concentration toggles).
- [x] 2026-05-27 — `[D]` Bootstrap + data access layer — `/opt/data/chartrunner/data_access/` Python package (`pairs.py`, `chart_state.py`, `scanner.py`, `db.py`, `paths.py`, `__init__.py`) + `scripts/bootstrap.py`. Context-managed SQLite with WAL + foreign keys. Public API: `upsert_pair`, `query_pairs`, `get_pair`, `save_drawing`, `apply_strategy`, `run_scanner_query`. Umbrel-safe paths (everything under `/opt/data`).
- [x] 2026-05-28 — `[D]` Backtest engine — `/opt/data/chartrunner/backtesting/engine/` (`backtest_runner.py`, `data_loader.py`, `job_manifest.py`, `jobs.db`). Resumable by design (job manifest tracks per-symbol/TF progress). Earlier `EVALUATION_BACKTEST_PLAN.md` + `BACKTEST_ENGINE_REQUIREMENTS.md` design docs feed this.
- [ ] `[D]` **Scanner CLI prototype** — first user-facing surface. CLI before web (faster to ship + verify). Reads `data_access/scanner.py` API.
- [ ] `[D]` **Backtest Results View** — equity curves, metrics, trade logs. First useful target: read `pinescript/db/manifest.db` backtest rows plus artifact JSON from `evaluated/backtests-real/`, then fold into the older `backtesting/engine/jobs.db` view later.

### Blocked bucket

- [ ] `[D]` **Chart View prototype** — interactive chart render + drawing persistence. **BLOCKED:** Scanner CLI (defines the pair-selection flow that hands off to Chart).
- [ ] `[D]` **Strategy Lab UI** — list PineScript strategies from `pinescript/manifest.db`, apply to chart. **BLOCKED:** Chart View.
- [ ] `[D]` **Cross-product contract** — define what M11 (the tool) shares with ChartRunner-the-game (`ChartRunner_Prototype.html`) and what's separate. Data infrastructure can be shared; UI + workflow are distinct. **BLOCKED:** strategic review with Julian.
- [ ] `[O]` **End-to-end smoke test** — pair lookup → chart render → drawing → strategy apply → backtest run → results view. **BLOCKED:** all 4 P0 components live.

### Done bucket

- [x] 2026-05-30 — `[D]` **Pine/spec OHLC corpus integration** — DONE → `/opt/data/chartrunner/pinescript/scripts/backtest_specs.py` accepts `--ohlc-root`, loads OpenClaw `ohlc-full/<SYMBOL>/1d.jsonl`, and ran the exported 64 bot specs over 58 real daily symbol datasets.
- [x] 2026-05-30 — `[D]` **Baseline comparison rows for specs** — DONE → internal SQLite scripts `internal:baseline:{buy_hold,sma_cross,ema_cross,rsi_mean_reversion}` write comparable rows beside each detector-proxy run.

## State

- Progress: 5/13 done — strategic docs (COMPETITIVE_MAPPING + P0_REQUIREMENTS + DATA_MODELS) + data access layer + backtest engine + bootstrap, all Hermes-built on Umbrel between 2026-05-26 and 2026-05-28, plus the 2026-05-30 Pine/spec backtest lane wired to OpenClaw JSONL real OHLC. Remaining 8 = the four P0 views (Scanner CLI → Chart → Strategy Lab → Backtest Results) + cross-product contract + smoke test + folding the older `backtesting/engine` UI onto the same canonical rows.
- Blockers active: 4
- Scheduled today: 0

## Notes

- **Relationship to existing milestones:**
  - **M2 Coach AI** — Coach can read M11's regime profiles + backtest results to advise. Natural integration point.
  - **M3 Build apps** — M3's archived Workbench-Backtest-tab restoration could reuse M11's backtest engine via the dev-kit bridge (after [[_patches/p0-bridge-rewiring-2026-05-28]] applies).
  - **M5 Hyperliquid** — adapter test harness can use M11's backtest engine + OHLC corpus for the "1k synthetic orders" stress test.
  - **M8 Tournaments** — closed-arena seed feeder can use M11's `coin_profiles/` regime-balanced subset.
  - **Trading-stack v1 (archived 2026-05-17, memory `project_trading_stack_2026_05_16`)** — M11 is effectively the v2 attempt, with much better engineering (proper data access layer, resumable engine, Umbrel-native, Pine ingestion) and a clearer four-component P0. The "ChartRunner INDEPENDENT, do NOT pull SDK over" rule from that memory still applies — M11 stays separate from the game's inline SDK.

- **Sandbox reach:** Hermes-built code is at `/opt/data/chartrunner/` inside the Hermes container on Umbrel. Cloud-side Cowork sandbox can't reach Umbrel directly (Tailnet-only); inspect via Hermes chat at `umbrel.local:18790/terminal` (Chrome MCP) or SSH.

- **Canonical OHLC context:** OpenClaw JSONL is now the practical canonical corpus for the Pine/spec backtest lane. The 2026-05-30 run used `/home/umbrel/umbrel/app-data/openclaw/data/.openclaw/workspace/ohlc-scraper/data/ohlc-full`, not the older Hermes Parquet snapshot. The older `backtesting/engine/data_loader.py` still needs a follow-up if M11's standalone UI should read through that engine instead of the Pine manifest backtest table.

- **2026-05-30 P1 Pine/spec backtest result:** 64 exported data-only bot specs, 3712 detector-proxy rows across 58 daily real-market symbol datasets, and 232 baseline rows across `buy_hold`, `sma_cross`, `ema_cross`, and `rsi_mean_reversion`. Latest `bot_specs_latest.json` rows now carry `evaluation.backtest.dataset = "ohlc-jsonl-v1"` and still contain no Pine source/runtime.

- **Where the strategic docs live:** all under `/opt/data/chartrunner/` in the Hermes container. To bring them into the Trading Game vault for editing, copy via `umbrel.local` SSH or the Hermes terminal.
