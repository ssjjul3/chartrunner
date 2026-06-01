# M3 — Build apps (Workbench rebuild + Bot Terminal back online)

**Status:** 🟡 PARTIAL · 10/16
**Theme:** Restore the seven archived Workbench tabs (Bots, Strategies, Indicators, Terminal, Backtest, App Builder, Theme) + bring Bot Terminal icon back to Voll-OS dock. Metaplex Agent Kit registers Workbench bots as on-chain agents; Coinbase x402 for paid API access on premium bots / advanced indicators.

> **Update 2026-05-26** ([CONSOLIDATED_STATUS_2026-05-26.md](../../CONSOLIDATED_STATUS_2026-05-26.md)): **x402 scaffolded.** Scope WIDENED beyond the original one-time-unlock framing to **bidirectional** (bots also *pay* external x402 APIs as agents) + **multi-rail** (the x402 V2 `accepts[]` lets the end-user pick Solana / Base / …), with **no silent auto-spend** (explicit wallet authorization, opt-in capped budget). Implementation plan + 5 build-safe scaffold files shipped — `docs/architecture/x402-integration-plan.md` (reconciled with the `M3-x402.md` research below). The `[ ] Coinbase x402 integration` condition is now **scaffolded, not just researched** — **live integration still BLOCKED** on M1 pricing + a production facilitator + `npm i @x402/*` + a deployed gate on the bot host (Phase 2).

> **Update 2026-05-31 — live UX polish shipped, Workbench rebuild still open.** Public `/play` commit `b8aeb9d` shipped `v1.0.198`: first-load Connect Wallet / Continue as Guest is now a compact native ChartRunnerOS login window over a softly blurred desktop, and the Terminal surface mode repair keeps desktop Terminal broad while in-game Terminal is scoped to chart/run state. This improves the app shell and first-run experience, but it does not restore the seven archived Workbench tabs or real external Bot Terminal bridges.

> **Final wrap 2026-05-31 — app chrome polish logged, no M3 status change.** The same UI-polish lane now records the `COACH.llm` toolbar anchor repair (`v1.0.189`) alongside Liquid Glass chrome repair (`v1.0.186`), live theme allowlist (`v1.0.183`), Configure Run broker wheel integration (`v1.0.180`), and Terminal feed/session polish (`v1.0.177`). These improve the live/app shell, but M3 remains partial because the seven Workbench tab restores and real bridge integrations are still open.

> **Session wrap 2026-06-01 — Configure Run polish shipped; no M3 status change.** Public `/play` and the vault source are aligned at `v1.0.203` after deploy commit `62f30f4`. The recent repair lane restores Start Run hitboxes/local launch auth (`v1.0.202`) and Configure Run broker names, compact DEX/CEX buttons, chart widget spawn/close behavior, and Back/Start visual feedback (`v1.0.203`). This is app-shell UX polish, not a Workbench-tab restore.

> **Live update 2026-06-01 — M3 Ready campaign repairs shipped.** Public `/play` deploy commit `9258e11` restores the four previously archived campaign routes: SDK-first MACD, Bollinger Bands, and ATR helpers are inlined and rendered in the prototype, `parChannel` is live as a 3-anchor Parallel Channel laser tool, and Campaign Ch.8/25/26/27 are unarchived with the 1-39 numbering intact.

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

> **All 5 Ready-bucket research/audit items done 2026-05-20** (auto-resolve sweep). The 4 indicator/tool *code builds* shipped live in v1.0.204 and are tracked below.

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

- [x] 2026-06-01 — `[D]` Implement MACD indicator — SDK-first helper + prototype render (MACD line, signal line, histogram), INDICATORS catalog entry, quick-chip wiring, and Campaign Ch.25 restored. Spec: `docs/architecture/M3-indicator-macd.md`.
- [x] 2026-06-01 — `[D]` Implement Bollinger Bands indicator — SDK-first SMA/stdev helper + overlay bands/fill, INDICATORS catalog entry, quick-chip wiring, and Campaign Ch.26 restored. Spec: `docs/architecture/M3-indicator-bb.md`.
- [x] 2026-06-01 — `[D]` Implement ATR indicator — SDK-first ATR helper + top-left badge, destructible reset/kill wiring, INDICATORS catalog entry, quick-chip wiring, and Campaign Ch.27 restored. Spec: `docs/architecture/M3-indicator-atr.md`.
- [x] 2026-06-01 — `[D]` Implement parChannel (parallel channel) tool — `live:true` in `WB_LASER_TOOLS`, 3-anchor laser state/preview/commit path, persistent two-rail overlay, and Campaign Ch.8 restored. Spec: `docs/architecture/M3-tool-parchannel.md`.

### Done bucket

- [x] 2026-05-31 — Non-counting app-shell polish logged in maps/docs: Terminal session fold/log (`v1.0.177`), Configure Run broker wheel integration (`v1.0.180`), live theme allowlist (`v1.0.183`), Liquid Glass in-game chrome repair (`v1.0.186`), and `COACH.llm` toolbar anchor repair (`v1.0.189`). These do not restore a Workbench tab.
- [x] 2026-06-01 — M3 Ready campaign code builds shipped live in `v1.0.204`: MACD, Bollinger Bands, ATR, and Parallel Channel now make Ch.8/25/26/27 playable in the main campaign.
- [x] 2026-06-01 — Public `/play` Configure Run polish: broker name label, compact DEX/CEX picker, chart Terminal widgets hidden before run/closable during run, Back/Start feedback, and Start Run full-hitbox repair carried forward. Non-counting for Workbench-tab completion; counted as app-shell polish.
- [x] 2026-05-31 — Public `/play` UX closeout: windowed blurred boot login (`v1.0.196`/`v1.0.198`) and Terminal chart/run mode repair (`v1.0.197`) shipped in commit `b8aeb9d`. Non-counting for Workbench-tab completion; counted as app-shell polish.
- [x] 2026-05-30 — Bot Terminal desktop entry + live Coach summon path are back. Application tab strips and app interiors now inherit Bot Terminal visual language (green tabs, dark terminal panels, mono form fields/buttons) across Run, Workbench, Journal, Token, Maps/Profile surfaces. Real bridge work stays in M6/M14.
- [x] 2026-05-13 — v1.0.105 archived Ch.8/25/26/27 so no broken routes ship while M3 indicators are pending.

## State

- Progress: 10/16 milestone ledger items done — all 5 Ready-bucket research/audit items written 2026-05-20, the 2026-05-30 Bot Terminal desktop/surface restoration, and the 2026-06-01 live M3 Ready code builds (MACD/BB/ATR/parChannel). The 2026-05-31 login/Terminal polish and 2026-06-01 Configure Run polish are app-shell work but do not close a Workbench restore condition. Remaining on the 16-item count: 6 completion conditions. Blocked implementation tracks still active: 10.
- Blockers active: 10
- Scheduled today: 0

## Notes

- Per code intent (CSS comment at line 4367 of `ChartRunner_Prototype.html`), Bots was archived "to move to M3 with the rest of the Build phase". Bots tab MUST be in this milestone.
- M3 depends on M1 (premium bot pricing needs $RUN/$CHART economy) and M2 (cost-per-session for AI-backed bots).
- Each tab restoration is itself decomposable into 3-5 imminent-solvables — evaluator can expand as we get closer.
