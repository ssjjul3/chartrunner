# M14 — Bot-first runtime + Agent Command Center

**Status:** 🟢 BONUS · 0/10 (added 2026-05-28)
**Theme:** Make ChartRunner natively **playable by bots / external agents**, with their runs **provably recorded on-chain**. Build a single UI surface — **Bot Terminal / Agent Command Center** — that lets a player connect external agents (Hermes, OpenClaw, Grok, Claude, Codex) to a running game with one button per agent. Coach AI v2 (originally M2) collapses into this surface — the Coach is just one LLM panel inside the Bot Terminal, not its own tab.

> **Cross-milestone notes — this milestone *absorbs* and *expands* others:**
>
> - **REDIRECTS [[M2-coach-ai]]** — Coach AI v2 is no longer its own tab in ChartRunnerOS. Coach becomes a local-LLM-wired panel inside Bot Terminal. From 2026-05-28 Grok session: *"coach should be wired with local llm in bot terminal / delete coach tab / merge console and chat in bot terminal"*.
> - **EXPANDS [[M6-ai-telegram]]** — original M6 scope was *Telegram* bot integration. M14 broadens the AI-connect-to-game surface to ≥5 agents (Hermes / OpenClaw / Grok / Claude / Codex). Telegram becomes one of N agent transports, not the only one.
> - **BUILDS ON [[project_chartrunner_botfriendly]]** — the `window.ChartRunner` automation namespace shipped 2026-05-26 (`sdk` / `setSeed` / `getRunSummary` / `step()` / `headless` / `crCoinSpawn`). M14 extends this with on-chain provenance (`BotBacktestRecord`) + a UI surface (Bot Terminal) for non-developer users to *use* what those primitives enable.
> - **FEEDS [[M11-umbrel-native-toolset]]** — M11's "Backtest Results View" can be the same on-chain history that M14's bots are writing to. Single canonical store.
> - **ALIGNS WITH [[M13-runner-wallet]]** — Bot Terminal's LLM panel uses Runner Wallet's hosted LLM if installed (Ollama bridge), or falls back to a remote model.

> **Why bonus + not numbered priority:** M2 / M6 are already on the numbered M0.5→M10 roadmap and partially-scoped for this. M14 reorganizes their work under a unified surface — "Bot Terminal" — rather than two separate tabs (Coach panel + Telegram bot). Bonus until Julian confirms the M2/M6 absorption, at which point M14 can graduate to numbered priority (or M2/M6 can be officially closed in favor of M14).

## Completion condition (all required)

- [ ] **`BotBacktestRecord` PDA on-chain** — new struct in `chartrunner_common` crate (or directly in `chartrunner_registry`). Fields: `bot_id`, `bot_owner`, `strategy_hash`, `asset`, `timeframe`, `start_ts`, `end_ts`, `tx_count`, `net_pnl`, `sharpe_x100`, `oracle_cert_ref` (citation of fresh `chartrunner_oracle::PriceCertificate`). PDA seeds: `[b"bot_run", bot_owner, bot_id, run_nonce.to_le_bytes()]`.
- [ ] **`chartrunner_registry::record_bot_backtest` instruction** — Anchor function + tests. Multisig-governed upgrade required (see M0.5 deploy-parity workflow per `project_chartrunner_anchor_deploys`).
- [ ] **Headless mode upgrades** — replay determinism (same seed + same candles + same SDK calls → same `getRunSummary`), seed capture surfaced in console, score gating (no `recordRun` if headless + suspicious score).
- [ ] **Bot SDK extension on `window.ChartRunner`** — full SDK call surface (bracket / OCO / ladder / hedge / radar / rescue + scoring components + run state). [[M2.5-sdk-extraction]] dependency: SDK extraction must finish so window.ChartRunner can re-export from a clean module.
- [ ] **Bot Terminal UI in `/play`** — replaces the Coach tab. Three panels: (a) **Console** — live game state, run controls (start, step, monitor). (b) **Chat** — Coach LLM. (c) **Agents** — connect/switch among Hermes / OpenClaw / Grok / Claude / Codex / Telegram bot. Single unified surface.
- [ ] **Multi-agent adapter pattern** — factory: `agents.connect("hermes" | "openclaw" | "grok" | "claude" | "codex" | "telegram")` returns a uniform handle with `send(prompt)`, `tail(callback)`, `cancel()`. Each adapter handles its transport quirks internally (Hermes via `umbrel.local:18790`, Telegram via bot API, etc.).
- [ ] **Local LLM via Coach panel** — Ollama bridge (`umbrel.local:11434` per `reference_chartrunner_umbrel_agents`) OR a remote model. Coach surface uses whichever's available.
- [ ] **Coach tab deletion** — remove the standalone Coach desktop app from ChartRunnerOS; Bot Terminal hosts the equivalent functionality. UI cleanup.
- [ ] **Sample bot scripts** — 4 starter bots in `bots/` directory (or `dev-kit/bots/`): `ladder-radar-combo.js`, `hedge-oco-bot.js`, `rescue-survivor-bot.js`, `fullstack-trader-bot.js`. Each uses the public window.ChartRunner SDK; each auto-records its backtest on-chain.
- [ ] **Backtest History Viewer** — sortable table of all bot runs by current wallet, filterable by bot/asset/timeframe, exportable to CSV, with a per-row "replay" action (loads the run's seed + candles + SDK call log into a fresh game).
- [ ] **All bot runs auto-record on-chain** — every successful headless run with valid scoring fires `record_bot_backtest`. **BLOCKED:** Anchor instruction + Runner Wallet payment flow for the rent cost.

## Imminent-solvables

### Ready bucket

- [ ] `[D]` **Design `BotBacktestRecord` schema** — Rust struct + PDA seeds + size accounting. Mirror `RunRecord` style (per `project_chartrunner_anchor_deploys`). One-page design doc at `docs/architecture/M14-bot-backtest-record.md`.
- [ ] `[D]` **Write `chartrunner_registry::record_bot_backtest`** — Anchor function. Pin to a fresh oracle cert (M0.5 pattern). Tests in `anchor/tests/chartrunner-registry.ts`. **DEPLOY:** via batched upgrade + Squads multisig (Julian-hands, `project_chartrunner_onchain_workflow`).
- [ ] `[D]` **Extend `window.ChartRunner` with Coach panel hook** — `window.ChartRunner.coach = { panel, send(prompt), onResponse(cb) }`. Stays mounted regardless of which tab is open.
- [ ] `[D]` **Bot Terminal UI mock** — Excalidraw or HTML mock of Console + Chat + Agents 3-panel layout. Drop into `_templates/` or `docs/architecture/`. Get Julian sign-off before building.
- [ ] `[D]` **Multi-agent adapter scaffolding** — `agents.connect(name)` factory + uniform handle. First adapter: Hermes (Chrome MCP harness from `reference_openclaw_hermes_as_tools`). Add OpenClaw / Grok / Claude / Codex / Telegram iteratively.
- [ ] `[D]` **Headless run controls in Bot Terminal Console** — start/step/monitor buttons wired to `window.ChartRunner.run.start(headless: true, seed: …, candles: …)` and `step()`.
- [ ] `[D]` **Backtest History Viewer panel** — reads on-chain `BotBacktestRecord` PDAs for current wallet via `getProgramAccounts`. Renders sortable table.
- [ ] `[O]` **CSV export + replay viewer** — Tab open: "Replay" loads the row's seed + candles + SDK call log + steps the game through them frame-by-frame. **BLOCKED:** SDK call log instrumentation (M2.5 dependency).
- [ ] `[D]` **First sample bot: Ladder + Radar combo** — script that arms radar at 3 levels, fires bracket on first touch, with ladder fills above/below. Validates the SDK + auto-records the backtest.
- [ ] `[D]` **Bot script library scaffolding** — `bots/` directory at repo root (or `dev-kit/bots/` if Julian wants dev-kit-isolated) with a tiny README, shared imports, and a "submit your bot" template.

### Blocked bucket

- [ ] `[D]` **Coach tab deletion** — UX-sensitive; players are used to Coach as its own app. **BLOCKED:** Bot Terminal Coach panel parity (must match or exceed Coach tab functionality before deletion).
- [ ] `[D]` **Auto-record bot runs on-chain** — every successful headless run fires `record_bot_backtest`. **BLOCKED:** Anchor instruction deployed + payment flow (Runner Wallet M13 OR direct multisig vault funding for the rent cost).
- [ ] `[D]` **Telegram bot as one agent adapter** — relegates [[M6-ai-telegram]] to "Telegram is one transport, not the central surface." **BLOCKED:** strategic decision from Julian on whether M6 closes or stays separate.

### Done bucket

(empty — newly added 2026-05-28; existing `project_chartrunner_botfriendly` work is the precursor)

## State

- Progress: 0/10 completion conditions
- Blockers active: 3 (Coach tab deletion, on-chain auto-record, Telegram adapter strategic call)
- Scheduled today: 0

## Notes

### Why "Agent Command Center" as a name

Julian's prompts in the Grok session escalated from "Bot Terminal" → "**Agent Command Center**" once the multi-agent vision crystallized: *"will it be possible to push a button in chartrunner and connect to hermes/openclaw/grok/claude/codex/..."* → *"thats what bot terminal is supposed to be"* → *"Fully implement this new Agent Command Center version of the Bot Terminal Add agent switching + multi-agent workflows"*.

So: **Bot Terminal** is the original code name (per existing dev-kit `bot-terminal.html` references in `project_chartrunner_v0912_feature_flags`); **Agent Command Center** is the user-facing name once it ships. Both refer to the same surface.

### Why on-chain `BotBacktestRecord`

The point isn't on-chain *fees* — it's on-chain *provenance*. A bot that claims a `+18% return on BTC 1h backtest` is just text until anyone can verify the run was executed against a specific oracle-stamped candle series, in a specific order, with a specific SDK call sequence. `BotBacktestRecord` makes that public + immutable, which is the precondition for selling bots/maps/strategies on the marketplace (M4 territory) with believable performance claims.

From the Grok session: *"chartrunner needs to be properly usable by bots, automated bots need to be visible on chain when they play chartrunner"* and *"when bots backtest strategies, can these runs be recordet onchain?"* — both lines point at the same thing.

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

Important: Grok claimed in that session to have *built* all of this (`bots/ladder-radar-combo.js` etc., `dev-kit/agent-command-center.html`, on-chain `record_bot_backtest`, Backtest History Viewer). **None of these files exist** — verified 2026-05-28. The milestone above captures the actual product direction; the work is **unbuilt**. See `feedback_grok_output_unverified`.
