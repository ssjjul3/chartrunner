# M3 — Build apps (Workbench rebuild + Bot Terminal back online)

**Status:** 🟡 PARTIAL · 6/16
**Theme:** Restore the seven archived Workbench tabs (Bots, Strategies, Indicators, Terminal, Backtest, App Builder, Theme) + bring Bot Terminal icon back to Voll-OS dock. Metaplex Agent Kit registers Workbench bots as on-chain agents; Coinbase x402 for paid API access on premium bots / advanced indicators.

> **Update 2026-05-26** ([CONSOLIDATED_STATUS_2026-05-26.md](../../CONSOLIDATED_STATUS_2026-05-26.md)): **x402 scaffolded.** Scope WIDENED beyond the original one-time-unlock framing to **bidirectional** (bots also *pay* external x402 APIs as agents) + **multi-rail** (the x402 V2 `accepts[]` lets the end-user pick Solana / Base / …), with **no silent auto-spend** (explicit wallet authorization, opt-in capped budget). Implementation plan + 5 build-safe scaffold files shipped — `docs/architecture/x402-integration-plan.md` (reconciled with the `M3-x402.md` research below). The `[ ] Coinbase x402 integration` condition is now **scaffolded, not just researched** — **live integration still BLOCKED** on M1 pricing + a production facilitator + `npm i @x402/*` + a deployed gate on the bot host (Phase 2).

## Completion condition (all required)

- [ ] All 7 Workbench tabs visible (CSS feature flags flipped)
- [ ] Each tab functionally restored (not just visible — actually does its job)
- [ ] App Builder template gallery rewritten (v0.9.11 P&L Tracker + Trade Notes deprecated)
- [ ] Metaplex Agent Kit integration: Workbench bots register as on-chain agents (014 registry)
- [ ] Coinbase x402 integration: premium bot subscriptions + advanced indicator unlock
- [x] Bot Terminal icon in Voll-OS dock (surface restored 2026-05-30; real bridges remain M6/M14)
- [ ] Bot Terminal real bridges scaffolded (the real bridge work lands in M6)

## Imminent-solvables

### Ready bucket

> **All 5 Ready-bucket research/audit items done 2026-05-20** (auto-resolve sweep). The 4 indicator/tool *code builds* below stay open — they modify the prototype + need a playtest.

- [x] 2026-05-20 — `[D]` Workbench restoration plan per-tab — `docs/architecture/M3-workbench-tabs.md`. Visibility is one CSS flip per tab; functional gaps vary (Backtest needs a real Binance-candle simulator; App Builder needs the gallery rewrite).
- [x] 2026-05-20 — `[D]` Metaplex Agent Kit research — `docs/architecture/M3-metaplex-agents.md`. `crRegistry` is already a private analogue; new work = mint a Core asset + attach the agent plugin per bot. Includes a `chartrunner.agent.v1` schema.
- [x] 2026-05-20 — `[D]` Coinbase x402 research — `docs/architecture/M3-x402.md`. Strong fit; reuses the `crWallet`/`solana-connect` signing seam; gate premium bots + advanced indicators as one-time 402 unlocks.
- [x] 2026-05-20 — `[O]` Feature-flag audit — `docs/architecture/M3-feature-flag-audit.md`. Confirmed: one flip per tab (delete the `[data-wbview]` rule at L4387–4401), but **5 dead panel-ID selectors** in the flag block target IDs that don't exist.
- [x] 2026-05-20 — `[O]` Bots-tab dry-run — `docs/architecture/M3-feature-flag-bots-dryrun.md`. Flipping the Bots flag exposes a ~80%-functional tab (build→equip→`drawBotOrbs()` is live); only leaks are buttons pointing at the still-hidden Marketplace. No JS error risk. (Live screenshot deferred to a browser session.)

### Blocked bucket

- [ ] `[D]` Bots tab restore — **BLOCKED:** dry-run + restoration plan done.
- [ ] `[D]` Strats tab restore — **BLOCKED:** restoration plan done.
- [ ] `[D]` Inds tab restore — **BLOCKED:** restoration plan done.
- [ ] `[D]` Terminal tab restore (Workbench) — **BLOCKED:** restoration plan done.
- [ ] `[D]` Backtest tab restore — **BLOCKED:** restoration plan done.
- [ ] `[D]` App Builder tab restore + gallery rewrite — **BLOCKED:** restoration plan done.
- [ ] `[D]` Theme tab restore — **BLOCKED:** restoration plan done.
- [ ] `[D]` Metaplex Agent Kit integration — **BLOCKED:** research done + at least Bots tab restored.
- [ ] `[D]` Coinbase x402 integration — **BLOCKED:** research done + premium tier defined (M1 pricing).
- [ ] `[O]` Each tab visual regression suite — **BLOCKED:** tabs restored.

### Ready bucket (added 2026-05-28 — Umbrel-side buildout crossmap, see M11)

> **Backtest tab simulator:** the M3 restoration plan flagged that Backtest "needs a real Binance-candle simulator." **Hermes built `/opt/data/chartrunner/backtesting/engine/`** on Umbrel with the actual runner (`backtest_runner.py`, `data_loader.py`, `job_manifest.py`, `jobs.db`) — resumable by design, on top of the earlier `EVALUATION_BACKTEST_PLAN.md` 3200-run matrix design (50 symbols × 4 timeframes × 4 capital buckets × 4 windows). Candle sources: Hermes Parquet corpus at `/opt/data/chartrunner/data/ohlcv/` (~27 GB, 3.5M files, 3 exchanges) OR OpenClaw JSONL at `/data/umbrel/chartrunner/` (79 GB, 381M rows, 7 exchanges) — canonical-choice pending (see [M11 OHLC-integration condition](M11-umbrel-native-toolset.md)). Wiring the Workbench Backtest tab's "Run" button to call the Hermes runner over the dev-kit bridge closes this gap without building a new engine.

- [ ] `[D]` **Backtest tab — wire to Hermes engine.** Replace the Backtest tab's missing simulator with a thin call into `/opt/data/chartrunner/backtesting/engine/backtest_runner.py`. Bridge path is Hermes/OpenClaw via Chrome MCP (umbrel.local:18790/terminal, per [[reference_chartrunner_umbrel_agents]]); design + write to `docs/architecture/M3-backtest-hermes-wiring.md`. **Blocked by:** Bots tab restore (Backtest depends on Bot artifacts to backtest) + M11 canonical OHLC choice.
- [ ] `[D]` **Indicators tab + Bot Indicator-Fusion — PineScript corpus feed.** Two parallel PineScript scrapers exist: Hermes's at `/opt/data/chartrunner/pinescript/` (SQLite with `scripts/metadata/evaluations/backtests/duplicates` schema; the M11 Strategy Lab feeds from this) and OpenClaw's at `/opt/data/chartrunner/pinescript-scraper/`. Either source can (a) seed the Indicators tab catalogue beyond the 4 already-Ready items below (MACD/BB/ATR/parChannel), and (b) feed the founding-brainstorm Indicator-Fusion Bot-tab mint step (Sensor→Operator→Actuator). Write `docs/architecture/M3-pinescript-corpus.md`.

### Ready bucket (added 2026-05-28 — founding-brainstorm linkage)

- [ ] `[D]` **Indicator-Fusion → Workbench Bot mint.** The Sep 11 GDD §6 (Bot-Blocks: Sensor / Operator / Actuator) maps 1:1 onto the **archived Workbench Bot tab** (one CSS flip per [[project_chartrunner_v0912_feature_flags]]). Brainstorm cross-ref: [`BRAINSTORM_VS_SHIP_2026-05-28.md`](../../BRAINSTORM_VS_SHIP_2026-05-28.md). Imminent-solvable scope: design the "compile bot → on-chain artifact" mint step (probably a new `register_bot_artifact` instruction in `chartrunner_registry`, since the Metaplex Agent Kit work in this milestone overlaps). Save spec to `docs/architecture/M3-indicator-fusion.md`. **Does not unarchive the tab** — that's a separate condition.
- [x] 2026-05-29 — `[O]` **Apply P0 dev-kit bridge-rewiring patch** — APPLIED to vault's `dev-kit/dev-panel.html`. `git apply --check` clean, `node --check` clean across all 199 KB of inline script. File grew 5035 → 5084 lines (+49, advertised +50/−1). All new symbols present at expected locations: `startHeadless` line 327, `terminalComposeExecute/Simulate` 363-364, `terminalOverlayEnable/Disable/Toggle` 368-370, `terminalChordSimulate` 376, `terminalPanicActivate` 379, `agentsList/Connect/Chat/Execute` 395-398, `onchain*` 401-410, `scoring*` 413-416, `experiments*` 419-420, `renderAgentList` null-guard at 1577. Backup at `dev-kit/dev-panel.html.bak-20260529-072013`. **Note:** correct invocation is `cd "Trading Game" && git apply _patches/p0-bridge-rewiring-2026-05-28/p0-bridge-rewiring.patch` (the apply.sh's default `~/projects/chartrunner` path is wrong — `dev-kit/` lives in the vault, not the repo, per memory `reference_chartrunner_devkit_cowork_access`). To take effect: reload the dev panel tab in Chrome (Cmd+R) — `BroadcastChannel` keeps reusing the old module code until reload.

### Ready bucket (added v1.0.105 — restore archived Campaign chapters)

- [ ] `[D]` Implement MACD indicator — add `{ id:'macd' }` to INDICATORS catalog (line ~33014), implement the chart render (EMA(12)−EMA(26) + signal line + histogram). Flip Campaign Ch.25 `archived` off. Save spec to `docs/architecture/M3-indicator-macd.md`.
- [ ] `[D]` Implement Bollinger Bands indicator — add `{ id:'bb' }` to INDICATORS, render SMA(20) ± 2·stdev as overlay bands. Flip Campaign Ch.26 `archived` off. Save to `docs/architecture/M3-indicator-bb.md`.
- [ ] `[D]` Implement ATR indicator — add `{ id:'atr' }` to INDICATORS, render as a badge (14-period average true range). Flip Campaign Ch.27 `archived` off. Save to `docs/architecture/M3-indicator-atr.md`.
- [ ] `[D]` Implement parChannel (parallel channel) tool — flip `live:true` in WB_LASER_TOOLS, add the 3-anchor draw routine to the laser handler. Flip Campaign Ch.8 `archived` off. Save to `docs/architecture/M3-tool-parchannel.md`.

### Done bucket

- [x] 2026-05-30 — Bot Terminal desktop entry + live Coach summon path are back. Application tab strips and app interiors now inherit Bot Terminal visual language (green tabs, dark terminal panels, mono form fields/buttons) across Run, Workbench, Journal, Token, Maps/Profile surfaces. Real bridge work stays in M6/M14.
- [x] 2026-05-13 — v1.0.105 archived Ch.8/25/26/27 so no broken routes ship while M3 indicators are pending.

## State

- Progress: 6/16 done — all 5 Ready-bucket research/audit items written 2026-05-20, plus the 2026-05-30 Bot Terminal desktop/surface restoration. Remaining: 10 Blocked-bucket restores (gated on the plans now written) + the 4 indicator/tool code builds (MACD/BB/ATR/parChannel — not auto-resolvable, they touch the prototype + need a playtest) + the remaining 6 completion conditions.
- Blockers active: 10
- Scheduled today: 0

## Notes

- Per code intent (CSS comment at line 4367 of `ChartRunner_Prototype.html`), Bots was archived "to move to M3 with the rest of the Build phase". Bots tab MUST be in this milestone.
- M3 depends on M1 (premium bot pricing needs $RUN/$CHART economy) and M2 (cost-per-session for AI-backed bots).
- Each tab restoration is itself decomposable into 3-5 imminent-solvables — evaluator can expand as we get closer.
