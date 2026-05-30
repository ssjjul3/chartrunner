# M14 — Bot-first runtime + Agent Command Center

**Status:** 🟡 BONUS · prototype/source-wired / deploy-gated (updated 2026-05-30)
**Theme:** Make ChartRunner natively **playable by bots / external agents**, with their runs **provably recorded on-chain**. Build a single UI surface — **Bot Terminal / Agent Command Center** — that lets a player connect external agents (Hermes, OpenClaw, Grok, Claude, Codex) to a running game with one button per agent. Coach AI v2 (originally M2) collapses into this surface — the Coach is just one LLM panel inside the Bot Terminal, not its own tab.

> **SHIP NOTE 2026-05-30 — first `/play` implementation slice exists.** `ChartRunner_Prototype.html` v1.0.141→v1.0.150 turned the Bot Terminal into the active Agent Command Center prototype: COACH.llm was restyled to the COACH.exe terminal chrome, the Bot Terminal Coach tab was archived, tabs now open as **CONSOLE / SESSIONS / AGENTS**, sessions persist as `cr_bot_session_records_v1` records with Markdown docs and archive actions, console + pinned agent chat widgets share `window.crAgentBus`, agent work can be anchored from Sessions or `/anchor <agent>`, and v1.0.150 now prefers the dedicated `crRegistry.recordBotBacktest` wallet bridge before falling back to generic Backtest entities. The broader desktop app family now inherits the same Bot Terminal chrome/interior style across Run, Workbench, Journal, Token, Maps, and Profile surfaces. The milestone is no longer "unbuilt"; it is **prototype-wired**, with deployment + real transports still pending.

> **CLOSEOUT 2026-05-30 — M14 heavy path verified locally.** Dedicated bot backtest provenance is now source-wired end-to-end: Anchor registry instruction/account/event, hand-rolled `solana-connect` transaction builder, `action=record-bot-backtest` wallet route, game-side `crRegistry.recordBotBacktest`, and Bot Terminal proof generation. Static wiring checks, JS parse, browser smokes, and `NO_DNA=1 cargo check -p chartrunner-registry` pass. Not complete-on-chain yet: `anchor build -p chartrunner-registry` is blocked by the local Anchor/IDL `missing field discriminator` error, and the Squads-governed devnet registry upgrade has not been proposed/executed.

> **Cross-milestone notes — this milestone *absorbs* and *expands* others:**
>
> - **REDIRECTS [[M2-coach-ai]]** — Coach AI v2 is no longer its own tab in ChartRunnerOS. Coach becomes a local-LLM-wired panel inside Bot Terminal. From 2026-05-28 Grok session: *"coach should be wired with local llm in bot terminal / delete coach tab / merge console and chat in bot terminal"*.
> - **EXPANDS [[M6-ai-telegram]]** — original M6 scope was *Telegram* bot integration. M14 broadens the AI-connect-to-game surface to ≥5 agents (Hermes / OpenClaw / Grok / Claude / Codex). Telegram becomes one of N agent transports, not the only one.
> - **BUILDS ON [[project_chartrunner_botfriendly]]** — the `window.ChartRunner` automation namespace shipped 2026-05-26 (`sdk` / `setSeed` / `getRunSummary` / `step()` / `headless` / `crCoinSpawn`). M14 extends this with on-chain provenance (`BotBacktestRecord`) + a UI surface (Bot Terminal) for non-developer users to *use* what those primitives enable.
> - **FEEDS [[M11-umbrel-native-toolset]]** — M11's "Backtest Results View" can be the same on-chain history that M14's bots are writing to. Single canonical store.
> - **ALIGNS WITH [[M13-runner-wallet]]** — Bot Terminal's LLM panel uses Runner Wallet's hosted LLM if installed (Ollama bridge), or falls back to a remote model.

> **Why bonus + not numbered priority:** M2 / M6 are already on the numbered M0.5→M10 roadmap and partially-scoped for this. M14 reorganizes their work under a unified surface — "Bot Terminal" — rather than two separate tabs (Coach panel + Telegram bot). Bonus until Julian confirms the M2/M6 absorption, at which point M14 can graduate to numbered priority (or M2/M6 can be officially closed in favor of M14).

## Completion condition (all required)

- [~] **`BotBacktestRecord` PDA on-chain** — source-wired 2026-05-30 in `chartrunner_registry` (`PDA_BOT_RUN = b"bot_run"`, `BotBacktestRecord`, `BotBacktestRecorded`, proof hashes + compact metrics). **Verified locally:** Rust crate compiles with `NO_DNA=1 cargo check -p chartrunner-registry`; browser smoke confirms the Bot Terminal calls `recordBotBacktest`. **Remaining:** Anchor CLI/IDL build blocker + Squads-governed devnet upgrade before calling it on-chain complete.
- [~] **`chartrunner_registry::record_bot_backtest` instruction** — Rust instruction + tests + `solana-connect` builder + game handoff are present. Multisig-governed deploy still required (see M0.5 deploy-parity workflow per `project_chartrunner_anchor_deploys`).
- [ ] **Headless mode upgrades** — replay determinism (same seed + same candles + same SDK calls → same `getRunSummary`), seed capture surfaced in console, score gating (no `recordRun` if headless + suspicious score).
- [ ] **Bot SDK extension on `window.ChartRunner`** — full SDK call surface (bracket / OCO / ladder / hedge / radar / rescue + scoring components + run state). [[M2.5-sdk-extraction]] dependency: SDK extraction must finish so window.ChartRunner can re-export from a clean module.
- [x] **Bot Terminal UI in `/play`** — v1.0.143→v1.0.149 shipped the active surface. Current panels are **CONSOLE / SESSIONS / AGENTS**: console is first, sessions second, agents third; the archived Coach tab stays hidden. Live chat happens through pinned agent widgets and writes into Sessions.
- [~] **Multi-agent adapter pattern** — `window.crAgentBus` now gives the prototype a uniform local bus for connect/disconnect/send/execute/anchor across Claude / Telegram / Lobster / OpenClaw / Hermes. **Remaining:** external transports + an exported `agents.connect(...)` factory with `tail()` / `cancel()`.
- [ ] **Local LLM via Coach panel** — Ollama bridge (`umbrel.local:11434` per `reference_chartrunner_umbrel_agents`) OR a remote model. Coach surface uses whichever's available.
- [~] **Coach tab deletion** — Bot Terminal's COACH.llm tab is archived and hidden. The standalone Coach/COACH.llm surfaces remain because LLM parity is not done yet.
- [ ] **Sample bot scripts** — 4 starter bots in `bots/` directory (or `dev-kit/bots/`): `ladder-radar-combo.js`, `hedge-oco-bot.js`, `rescue-survivor-bot.js`, `fullstack-trader-bot.js`. Each uses the public window.ChartRunner SDK; each auto-records its backtest on-chain.
- [ ] **Backtest History Viewer** — sortable table of all bot runs by current wallet, filterable by bot/asset/timeframe, exportable to CSV, with a per-row "replay" action (loads the run's seed + candles + SDK call log into a fresh game).
- [~] **All bot runs auto-record on-chain** — manual agent-work anchoring now builds a `cr-agent-work-v1` proof and prefers `recordBotBacktest`. **Remaining:** automatic headless-run recording, deployed instruction, and Runner Wallet/payment flow for rent.

## Imminent-solvables

### Ready bucket

- [ ] `[D]` **Rank P1 bot-specs against baselines** — produce a review leaderboard from `pinescript/db/manifest.db` real-OHLC rows. Compare each detector-proxy spec to same-symbol `buy_hold`, `sma_cross`, `ema_cross`, and `rsi_mean_reversion` rows before any Bot Terminal import.
- [ ] `[D]` **Fix Anchor/IDL build blocker for M14 registry upgrade** — `NO_DNA=1 cargo check -p chartrunner-registry` passes, but `NO_DNA=1 anchor build -p chartrunner-registry` currently fails before compile with `missing field discriminator at line 1 column 409`. Resolve that toolchain/IDL issue, regenerate/check IDL, then prepare the Squads proposal for the `record_bot_backtest` registry upgrade.
- [x] 2026-05-30 — `[D]` **Design `BotBacktestRecord` schema** — implemented directly in `anchor/programs/chartrunner-registry/src/lib.rs` with `bot_run` PDA seeds, fixed-size hashes, metrics caps, and event shape. Follow-up architecture doc can still extract the design, but the source schema exists.
- [x] 2026-05-30 — `[D]` **Write `chartrunner_registry::record_bot_backtest`** — Anchor function + tests + `solana-connect` builder + game client call path are present. **DEPLOY:** still pending via batched upgrade + Squads multisig (Julian-hands, `project_chartrunner_onchain_workflow`).
- [ ] `[D]` **Extend `window.ChartRunner` with Coach panel hook** — `window.ChartRunner.coach = { panel, send(prompt), onResponse(cb) }`. Stays mounted regardless of which tab is open.
- [x] 2026-05-30 — `[D]` **Bot Terminal UI mock** — superseded by live `/play` implementation. Console/Sessions/Agents are built, styled as one terminal family, and verified in browser.
- [x] 2026-05-30 — `[D]` **Multi-agent adapter scaffolding** — `window.crAgentBus` is the local uniform bus. External Hermes/OpenClaw/Grok/Claude/Codex/Telegram transports remain the next layer.
- [ ] `[D]` **Headless run controls in Bot Terminal Console** — start/step/monitor buttons wired to `window.ChartRunner.run.start(headless: true, seed: …, candles: …)` and `step()`.
- [ ] `[D]` **Backtest History Viewer panel** — reads on-chain `BotBacktestRecord` PDAs for current wallet via `getProgramAccounts`. Renders sortable table.
- [ ] `[O]` **CSV export + replay viewer** — Tab open: "Replay" loads the row's seed + candles + SDK call log + steps the game through them frame-by-frame. **BLOCKED:** SDK call log instrumentation (M2.5 dependency).
- [ ] `[D]` **First sample bot: Ladder + Radar combo** — script that arms radar at 3 levels, fires bracket on first touch, with ladder fills above/below. Validates the SDK + auto-records the backtest.
- [ ] `[D]` **Bot script library scaffolding** — `bots/` directory at repo root (or `dev-kit/bots/` if Julian wants dev-kit-isolated) with a tiny README, shared imports, and a "submit your bot" template.

### Blocked bucket

- [ ] `[D]` **Coach tab deletion** — UX-sensitive; players are used to Coach as its own app. **BLOCKED:** Bot Terminal Coach panel parity (must match or exceed Coach tab functionality before deletion).
- [ ] `[D]` **Auto-record bot runs on-chain** — every successful headless run fires `record_bot_backtest`. **BLOCKED:** dedicated instruction deployment + payment flow (Runner Wallet M13 OR direct multisig vault funding for the rent cost). Source path is wired; auto-run trigger is not.
- [ ] `[D]` **Telegram bot as one agent adapter** — relegates [[M6-ai-telegram]] to "Telegram is one transport, not the central surface." **BLOCKED:** strategic decision from Julian on whether M6 closes or stays separate.

### Done bucket

- [x] 2026-05-30 — COACH.llm visual unification with COACH.exe chrome; Bot Terminal Coach tab archived.
- [x] 2026-05-30 — Application tab/game surfaces inherit the Bot Terminal styleguide: green active tabs, dark terminal panels, mono form fields/buttons, and consistent green borders across Run, Workbench, Journal, Token, Maps, and Profile.
- [x] 2026-05-30 — Bot Terminal tab model: Console first, Sessions second, Agents third.
- [x] 2026-05-30 — Real session records: `id`, `title`, `agent`, `created`, `updated`, `events`; legacy `cr_bot_sessions_v1` import preserved.
- [x] 2026-05-30 — Sessions dropdown + actions: New, Rename, Copy `.md`, Archive, Delete, Anchor on-chain.
- [x] 2026-05-30 — Markdown session docs render as structured HTML instead of raw `<pre>`.
- [x] 2026-05-30 — `window.crAgentBus` routes console + pinned agent widgets into the same activity/session store.
- [x] 2026-05-30 — Agent icons switched from emoji to procedural game-style SVG glyphs.
- [x] 2026-05-30 — Dedicated M14 `record-bot-backtest` source path exists across registry, wallet bridge, and game client, with generic Backtest fallback retained. Verification: M14 wiring script, agent on-chain wiring script, Bot Terminal browser smoke, Journal alerts regression, JS parse, and Rust `cargo check` passed.
- [x] 2026-05-30 — P1 Pine/spec pipeline produced the off-chain bot evidence corpus M14 needs before on-chain provenance: 64 data-only specs, 3712 detector-proxy real-OHLC rows across 58 daily symbols, and 232 internal baseline rows. Artifact root: `/opt/data/chartrunner/pinescript/`; local review mirror: `_patches/p1-umbrel-pinescript-pipeline-2026-05-30/`.

## State

- Progress: first implementation slice complete; source-wired + browser/Rust verified for BotBacktestRecord, deploy-gated for true on-chain completion
- Blockers active: 7 (Anchor/IDL build blocker, registry deploy, real agent transports, local/remote LLM panel, headless run controls, sample bot scripts, history/replay viewer)
- Scheduled today: 0
- Last evaluated: 2026-05-30 (interactive session wrap)

## Notes

### Why "Agent Command Center" as a name

Julian's prompts in the Grok session escalated from "Bot Terminal" → "**Agent Command Center**" once the multi-agent vision crystallized: *"will it be possible to push a button in chartrunner and connect to hermes/openclaw/grok/claude/codex/..."* → *"thats what bot terminal is supposed to be"* → *"Fully implement this new Agent Command Center version of the Bot Terminal Add agent switching + multi-agent workflows"*.

So: **Bot Terminal** is the original code name (per existing dev-kit `bot-terminal.html` references in `project_chartrunner_v0912_feature_flags`); **Agent Command Center** is the user-facing name once it ships. Both refer to the same surface.

### Why on-chain `BotBacktestRecord`

The point isn't on-chain *fees* — it's on-chain *provenance*. A bot that claims a `+18% return on BTC 1h backtest` is just text until anyone can verify the run was executed against a specific oracle-stamped candle series, in a specific order, with a specific SDK call sequence. `BotBacktestRecord` makes that public + immutable, which is the precondition for selling bots/maps/strategies on the marketplace (M4 territory) with believable performance claims.

From the Grok session: *"chartrunner needs to be properly usable by bots, automated bots need to be visible on chain when they play chartrunner"* and *"when bots backtest strategies, can these runs be recordet onchain?"* — both lines point at the same thing.

### 2026-05-30 P1 bridge into M14

The current P1 Pine/spec pipeline is now the off-chain staging lane for M14. It does **not** satisfy the deployed on-chain `BotBacktestRecord` condition yet, but it supplies the evidence those records should ultimately cite: real OHLC dataset path, symbol/timeframe, detector/spec id, equity curve artifact, trade log artifact, and baseline comparison rows. Next M14 slice should turn those rows into a leaderboard and then choose the compact proof fields that belong on-chain.

### Cross-product positioning

- **M2 Coach AI v2** — *absorbed*. Coach becomes a panel inside Bot Terminal. M2 milestone file should be updated with a "M14 supersedes the Coach-as-its-own-tab scope; remaining matcher-audit + snapshot-spec work stands but lands under M14's Chat panel" note.
- **M6 AI · Telegram bot integration** — *expanded*. Telegram bot becomes one of N agent adapters. M6's existing scope (Hermes gateway exists with crash-loop per memory `project_chartrunner_v0912_feature_flags`) feeds directly into the Agent Command Center.
- **M11 Umbrel-native quant toolset (Scanner / Chart / Strategy / Backtest)** — *connects*. M11 was Hermes-side only; M14's `BotBacktestRecord` provides the on-chain backing store for M11's "Backtest Results View" — same data, two surfaces.
- **M2.5 SDK extraction** — *enables*. window.ChartRunner needs a clean module to re-export from. M14's bot SDK extension waits on M2.5 finishing.
- **M13 Runner Wallet** — *aligns*. Bot Terminal's Coach LLM panel uses Runner Wallet's hosted LLM if installed.

### Sources

Grok session 2026-05-28 (`grok.com/share/c2hhcmQt…`). Julian's prompts spanning ~30 turns on this theme:

- *"chartrunner needs to be properly usable by bots, automated bots need to be visible on chain when they play chartrunner"*
- *"Implement Headless Mode + Bot SDK / Design BotRunRecord on-chain schema / Enhance window.ChartRunner for bots"*
- *"Build the Bot Terminal UI in Dev-Kit"*
- *"Integrate this Bot Terminal into the main Dev-Kit bridge ([[__CR_DEV__]]) / Add real headless run controls (start, step, monitor) / Build the on-chain BotRunRecord creation flow / Create sample bot scripts that use the new SDK"*
- *"Add more advanced bot logic (Ladder + Radar combo)"*
- *"Create more bot variants (e.g. Hedge + OCO, Rescue-focused)"*
- *"when bots backtest strategies, can these runs be recordet onchain?"*
- *"Build a Backtest History Viewer in Dev-Kit that shows on-chain records"*
- *"Implement the full Rust instruction + tests for record_bot_backtest"*
- *"Make the table sortable + exportable to CSV / Add detailed run replay viewer / Integrate this viewer into the main Bot Terminal / Update all bots to automatically record backtests on-chain"*
- *"coach should be wired with local llm in bot terminal / delete coach tab / merge console and chat in bot terminal"*
- *"will it be possible to push a button in chartrunner and connect to hermes/openclaw/grok/claude/codex/..."*
- *"Fully implement this new Agent Command Center version of the Bot Terminal / Add agent switching + multi-agent workflows"*
- *"so i could tell my hermes to install a trade and watch him do that and sell the bot and the map right?"* (revenue thesis — bots/maps as marketable goods, M4 territory)

Important: Grok claimed in that session to have *built* all of this (`bots/ladder-radar-combo.js` etc., `dev-kit/agent-command-center.html`, on-chain `record_bot_backtest`, Backtest History Viewer). **Those claims were false on 2026-05-28.** As of 2026-05-30, the live prototype and source tree now contain the first real M14 slice: Bot Terminal UI/session/agent-bus work plus the dedicated BotBacktestRecord source path. Sample bots, real transports, deployment, and history/replay remain unbuilt.
