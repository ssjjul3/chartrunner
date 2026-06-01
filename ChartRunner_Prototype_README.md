# ChartRunner — Playable Prototype (v1.0.204)

> **Fortnite meets Space Invaders meets a trading chart.** Every ability is a real SDK primitive. Every trade is a game move.

Single-file canvas game. Real Binance candles. Phase 0 + Phase 0.5 (devnet on-chain) shipped — Phase 1 (SDK pull-over) and Phase 2 (mainnet) on the post-Frontier roadmap.

**Version note 2026-06-01:** v1.0.204 is live on public `/play` after deploy commit `9258e11`. The M3 Ready campaign repairs are playable: SDK-first MACD, Bollinger Bands, and ATR helpers are inlined into the prototype, the indicators render/toggle in-game, Parallel Channel is a live 3-anchor Tools laser, and Campaign Ch.8/25/26/27 are restored with proper numbering.

**Session closeout 2026-06-01:** live docs/maps now reflect the M3 indicators + Parallel Channel release. No wallet signing, broker route, on-chain write, or production Bot Terminal transport was added.

**Live:** https://chartrunner.xyz/play/ · **Repo README:** [`README.md`](README.md) · **Wallet bridge:** https://chartrunner.xyz/solana-connect/

---

## 30-second elevator

You run a little avatar across a real BTC/USDT chart streamed from Binance (15 timeframes, 9+ assets). Volatility flips you into the **upside-down**, where bears spawn and you fight back with trading primitives. **Bracket** is a grenade. **OCO** is a trap. **Ladder** is a turret. Every primitive routes through `ChartRunnerSDK` — the same SDK the Phase 1 host overlay will plug into Dexscreener and TradingView, and the same SDK Phase 2 swaps for a live Solana adapter.

Three pillars: **gamification · education · on-chain.** The hard rule: abilities never touch the canvas — the SDK is the only thing that issues orders.

---

## Controls

**Movement.** Arrows or WASD to move. Space to jump (hold to charge fly). Mouse aim — your laser tracks the cursor.

**The 4-laser system** (number keys, top-left of the chart shows which is active):

| Key | Laser | What it shoots |
|---|---|---|
| **1** | ⚡ Bolt | Direct projectile — kills monsters, breaks ice, pops pickups |
| **2** | 🛠 Tools | Drawing tools — trendline, ray, parallel channel, rectangle, fib retrace, fib extension |
| **3** | 🟢 Primitives | SDK orders — bracket, OCO, ladder, limit, stopLoss, takeProfit, trailingTP, scaleOut, magnet, perpFlip, borrowShort, liqGuard, TWAP, iceberg |
| **4** | 🔵 Blue | Modal / trade activator — electrifies placed tools into live trade routes |

**Mouse.** Click on the chart to place an anchor. Two-anchor tools want a second click; Parallel Channel wants a third click for width. Bracket opens a risk/reward picker with an embedded competition-risk deck: funded account, max loss, liquidation watch, fee estimate, notional, and execution verdict. Right-click to cancel an in-progress placement.

**Hotkeys.** `C` = Coach popover. `Tab` = cycle Workbench tabs. `Shift+M` = legacy menu drawer (mostly archived).

**Weather Station app.** Weather is private/local-only as of v1.0.169. Open it from the local file or localhost for the Jupiter Perps competition cockpit; live `chartrunner.xyz/play/` hides the launcher/window and guards direct opens. It remains an offline prototype surface in source: BTC/ETH/SOL weather cards, Daily→1s timeframe ladder, liquidity hotspots, Catalyst Tape, Execution Queue, replayable snapshots through `window.crWeatherStation`, and Qualifier/Final account buttons wired into the bracket risk deck.

**Boot login window.** First-load Connect Wallet / Continue as Guest now opens as a compact ChartRunnerOS window over the visible splash desktop. Public v1.0.198 adds the translucent platinum tint and backdrop blur so the login reads as an in-game modal rather than a full-page overlay.

---

## World rules

**Three avatar physics modes:**

- **Runner.** Default. Gravity pulls you onto the candle ribbon. Trendlines, MA polylines, indicator lines, HLines and VWAP all act as rails.
- **Flight.** Hold Space mid-air to charge the lift. Used to traverse gaps and reach far-future candles.
- **Upside-Down (Monster phase).** Triggered by volatility regime. The world flips, bears spawn from short-side liquidity, the chart turns into a hostile arena. Survive by trading.

**Vehicles.** Skateboard / surfboard / glider / lambo. Ride the upper world only — auto-dismount on the upside-down flip. **2× ↑** hops between rails. **3× ↑** launches into flight.

**Phoenix Live overlays.** Five stackable in-game effects — whale ghosts, frogs from longs, bears from shorts, flight charges, liquidity water — with 1.5× / 2× / 3× multipliers.

---

## Campaign — 39 chapters, 6 sections

Direct-launch from the **Campaign** tab in the Run window. Each chapter loads a preset BTC/USDT chart with the lesson tool pre-equipped, the lesson indicators pre-toggled, and `crCampaignCoach` driving a multi-step narrative gated on real game events (SDK orders, indicator toggles, score thresholds).

| Section | Chapters | What you learn |
|---|---|---|
| **Tools** | Ch. 1–9 | Trendline, ray, parallel channel, rectangle, fib retrace, fib extension — the drawing primitives |
| **Primitives** | Ch. 10–19 | Bracket, OCO, ladder, market, scale-out, TWAP, iceberg, limit/stop placement |
| **Indicators** | Ch. 20–27 | RSI, MACD, Bollinger Bands, ATR, SMA(50/200), reference levels, multi-timeframe analysis |
| **Bots** | Ch. 28–33 | Equip + orbit detector bots, watch them fire setups in real time |
| **Foundation** | Ch. 34–38 | Risk management, score thresholds, Champions Channel, CCV composite, the quant.pdf spine |
| **Live** | Ch. 39 | Wallet connect → save a real run on-chain via `chartrunner_registry::record_run` |

Star ratings per chapter: goal hit · probes used · no-skip. Multi-step Coach is fully polished on Ch.1; the rest run the scripted arc.

---

## Coach

An inline **COACH.llm** button in the in-game top toolbar. Single conversation surface — no modal, no drawer.

- **Hotkey `C`** or the toolbar chat icon opens the Coach popover with ChartRunner/trading context matching (`bracket`, `risk`, `timeframe`, `signal`, `Bot Terminal`, `wallet`, etc.)
- **Toolbar anchor** keeps the unread dot on the icon and opens the popover below the in-game chrome across Liquid Glass and compact themes (v1.0.189)
- **Double-click** the legacy Coach widget for the commands menu
- **Shared memory** across surfaces — typing in the in-game Coach, the Phone SMS app, or the Terminal Coach log all hit the same `crCoach` IIFE
- **Coach boundary** (v1.0.190) — COACH.llm is the in-game advisor for ChartRunner and trading context. Bot Terminal is the interface for external bots/agents and tool execution.
- **Provider cockpit** (v1.0.191) — the Coach header model button opens player-visible V1 fallback / Ollama local / OpenAI-compatible / Umbrel MCP settings, with endpoint, model, auth, privacy, status, and test controls.
- **ATR regime** shown in the Coach header (Coach = Quant unified entity since v1.0.34)
- **Setup Guide** card per primitive — icon + step counter + animated demo glyph + commit confetti

Real-model Coach now has a local/BYO provider router behind `window.crCoachProviders`: it builds a bounded `cr.quant.v1` context pack, can call Ollama/OpenAI-compatible/Umbrel-style endpoints when configured, and always falls back to deterministic browser guidance. The default is local-only V1 fallback; remote endpoints require the player to explicitly choose **Remote OK**. Coach cannot execute tools, connect agents, sign, or route orders; wallet/trading actions remain approval-gated through SDK/wallet paths.

---

## On-chain — LIVE on Solana devnet

Two Anchor programs deployed and verifiable on Solana Explorer.

| Program | Address | What it does |
|---|---|---|
| `chartrunner_maps` | [`DbzEqKfg…3UvH`](https://explorer.solana.com/address/DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH?cluster=devnet) | `save_map(name, content_hash)` — PDA per (wallet, name). SHA-256 map index. |
| `chartrunner_registry` | [`ER8G9Bnv…rdcn`](https://explorer.solana.com/address/ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn?cluster=devnet) | 9-entity registry (Map · Strategy · Bot · Indicator · Backtest · App · TokenProfile · Widget · Tool) + first-sale marketplace + `record_run` leaderboard substrate |

**Async multiplayer leaderboard.** No server, no WebSocket. The `crGhost` IIFE polls `getProgramAccounts` every 60s with a memcmp filter for the `RunRecord` discriminator, manual Borsh decode in 30 lines, ghost markers render on every player's chart for the same (asset, timeframe). Click **🏆 Record on-chain** at run-end to anchor your own run.

`chartrunner_match` (MagicBlock Ephemeral Rollups, realtime PvP) and `chartrunner_oracle` (Pyth pull-oracle, verifiable scores) are scaffolded but pending the Anchor 0.32.1 / Rust 1.85 workspace upgrade.

---

## Wallet connect

**Phantom — direct in-page sign** (v1.0.47, repaired in v1.0.99). `@solana/web3.js` loads async in `<head>`, the `crMapsTx` IIFE owns `signAndSendSave`, no `/solana-connect/` bounce required for `save_map`. Falls back to the bounce path if Phantom isn't injected or the script fails to load.

**Backpack + Solflare** via the `/solana-connect/` React app — Wallet Standard auto-discovery, five operating modes (`memo` / `connect` / `save-map` / `registry`), Explorer-verifiable signatures, in-page devnet faucet link.

**Per-wallet localStorage** via a `Storage.prototype` shim — each connected wallet sees its own Profile, Maps, and Workbench data. Guest mode is a clean `__guest__` namespace.

---

## Save · share · anchor maps

Every run can be saved as a **Map** — asset, timeframe, indicators, overlays, destruction state, thumbnail, all packed into a single SHA-256-hashed payload. From the **Maps** app:

- **Save** locally (per-wallet localStorage)
- **Edit** an existing map (rename, retag, swap thumbnail)
- **Delete** — local only, OR with on-chain unanchor when the wallet matches the PDA owner
- **Anchor on-chain** — Phantom direct sign → `chartrunner_maps::save_map` → PDA per (wallet, name), Explorer link returned
- **Share link** — copy a URL that loads the map for any visitor (own copy if anchored, view-only otherwise)

Full lifecycle (open / save / edit / delete / share-link) wired in v0.9.63 + v0.9.64.

---

## What's gated (post-Frontier roadmap)

Several Workbench tabs and OS surfaces are hidden behind CSS `display:none !important` rules around line 4322–4420 of the prototype. The DOM behind them stays intact — restoration is one CSS flip per surface when the milestone lands.

| Gated surface | Returns at |
|---|---|
| Workbench: Strategies / Indicators / Backtest / App Builder / Theme | M3 |
| Marketplace dock icon + windows | M4 |
| Token UI ($CHART / $RUN balances on desktop, swap, Missions tab) | M1 |
| Real Helius DAS NFT detection (offline picker ships now) | M2.6 |
| On-chain Name Register | M2.6 |
| AI Coach v2 (production hosted/eval endpoint) | M2 |
| Real-time PvP via MagicBlock ER · Pyth-verified scores | M0.5 → M2 |

Live `/play` Workbench surfaces today: **Tools** + **Primitives**. As of v1.0.179, live `chartrunner.xyz/play/` still hides and blocks **Bots** + **Terminal** tabs/panels, while local/private builds keep those source paths available.

**Live theme archive (v1.0.183):** public `chartrunner.xyz/play/` rotates Platinum, Solana, Liquid Glass, Black & White, and Monochrome. ASCII and Frontier stay in the local/private source for restoration and testing, but live Theme clicks, legacy Theme cards, and persisted theme state normalize those two away.

**Liquid Glass in-game chrome (v1.0.186):** Liquid Glass keeps the shared compact OS metrics, but its in-game headbar and TradingView toolbar use a dedicated frosted blue-white strip, non-overlapping toolbar spacing, glass control wells, and blue/mint active states.

**Workbench → Bots / Bot Forge (v1.0.178 local/private):** Bots is restored locally as a no-code **Bot Forge** for **Price Action Toolkit** and **SFP Hunter**. The flow is Sensor → Gate → Behavior/Name/Color → preview → **Forge & Equip**. Forge submits through `window.crBots.load`, persists specs to `cr_bot_specs_v1`, equips via `wb.equipped`, and then runs through the normal `ChartRunnerSDK` detector-bot/orb path. Pine is metadata-only here; local forged rows stay browser-local and skip on-chain / Marketplace bot-artifact actions until that flow is explicitly shipped.

**In-game chart terminal feed (v1.0.177):** the live chart overlay feed shown by `window.crNotify` now has a small arrow control. Arrow-down folds the feed to the most recent command, and the full run tape persists to `cr_ingame_terminal_session_v1`. Journal · Sessions mirrors that in-game tape first, exports JSON, and evaluates whether the trace is ready to become an on-chain / marketplace proof candidate.

**Desktop Terminal sessions (v1.0.175):** the Terminal window keeps a visible command-session pane, persists the command tape to `cr_terminal_session_v1`, and has its own arrow control for latest-command mode. Journal · Sessions keeps this as a secondary trace source. Neither flow signs, anchors, lists, or sells anything without an explicit wallet handoff.

**Terminal surface split (v1.0.195):** desktop Terminal stays broad-market, while the in-game chart terminal narrows to run/chart panes, active-run tape, Execution Cockpit state, curated Workbench terms, and Terminal Arc HUD/overlay/promote scaffolds.

**Journal alert bus + ReplayDataset loader (v1.0.185 → v1.0.194):** `window.crAlertBus` is the shared browser-local notification/event model for alert-like events. It persists normalized events to `cr_alert_events_v1`, renders them in Journal · Alerts, and lets each event become a Journal note or seed a replay. Paper journal rows keep the same **Replay** action. The engine now emits `cr-replay-dataset-v2` records from the loaded chart candle source, persists them to `cr_backtest_datasets_v1`, and stores `cr-backtest-run-v1` results in `cr_backtest_replays_v1` with OHLCV/resource hashes, manifest hashes, gap reports, and proof hashes.

**ReplayDataset v2 proof frame (v1.0.192):** `crReplayLab.loadDataset()` now returns `cr-replay-dataset-v2`. The first resource pack is intentionally narrow and trustworthy: canonical OHLCV rows plus a volume frame, `cr-dataset-manifest-v1` source/resource status, and `cr-dataset-proof-v1` hashes (`rawChartHash`, `ohlcvHash`, `volumeHash`, `manifestHash`, `datasetHash`). The manifest marks true CVD and perps data as planned rather than pretending candle-derived volume is trade-side flow.

**data_jobs replay resources (v1.0.194):** `data_jobs/` now scaffolds collectors for trades, funding, OI, and liquidations. The collectors emit `cr-data-resource-v1` records and a `cr-data-resource-index-v1` manifest (`cr_data_resource_index_v1`). When that index is present in browser localStorage, `crReplayLab.loadDataset()` attaches compact external resource proofs and promotes CVD/perps status from planned to complete or partial without changing the Journal buttons. `crReplayLab.installDataResourceIndex(index)` installs a generated index into the browser store.

**data_jobs Binance scrape pass (v1.0.199):** trades, funding, and OI collectors now have live official Binance public API adapters. `data_jobs/out/cr_data_resource_index_v1.json` can be installed into `crReplayLab`, and ReplayDataset only promotes ready resources. Binance liquidations remain blocked until a public liquidation stream/archive adapter is added.

**Umbrel autonomous data_jobs runner (2026-05-31):** `data_jobs/umbrel/run_once.cjs` turns the collector scaffold into a safe one-shot Umbrel operation with config, lock, status, audit JSONL, cron, and systemd timer examples. It publishes the same `cr_data_resource_index_v1` shape for ReplayDataset while staying data-only: no wallet signing, broker routing, order placement, or hidden agent execution.

**Market-wide database design (2026-05-31):** the approved next data-layer spec is `docs/superpowers/specs/2026-05-31-market-wide-crypto-database-design.md`. It keeps the Journal/Replay manifest contract intact while adding a planned Umbrel market catalog for Binance, Bybit, and Solana DEXes.

**Pine Adapter signal bridge (v1.0.188):** `window.crPineAdapter` imports TradingView alerts, TradingView exported trades, and generic webhook payloads into `cr_signal_events_v1` as `cr-signal-event-v1` records. Signals replay through the same v2 ReplayDataset path as Journal rows, producing `cr-backtest-run-v1` records with `signalId` / `signalHash` proof fields. The Pine path is intentionally an adapter, not a runtime: `compilePineSubset()` emits non-executable `cr-strategy-spec-v1` JSON for the supported subset (`ta.sma`, `ta.ema`, `ta.rsi`, `ta.atr`, crosses, `strategy.entry`, `strategy.exit`) and leaves unsupported Pine as metadata.

**COACH.llm provider cockpit (v1.0.191):** the toolbar Coach popover now exposes the model/provider path directly to players. V1 fallback remains the free default, local Ollama stays local-only, OpenAI-compatible/BYO and Umbrel MCP endpoints require explicit remote opt-in, and the status/test controls show whether Coach answered through a model or deterministic fallback.

**COACH.llm context advisor boundary (v1.0.190):** COACH.llm now owns ChartRunner/trading guidance, builds a bounded `cr.quant.v1` snapshot with market/setup/wallet/open-primitive context, and can use an optional local/BYO provider while retaining richer deterministic fallback answers. Bot Terminal remains the external bots/agents interface for `/connect`, `/build`, headless runs, session archives, and tool proposals; Coach cannot execute or bypass approvals.

**COACH.llm toolbar anchor (v1.0.189):** the in-game Coach chat launcher is a normal `#crTopBar` `tvIcon` again, not a fixed floating bubble over the chart. The unread dot stays on the toolbar icon, and the chat popover opens below the top chrome with a Liquid Glass-specific offset.

**Bot Terminal Labs (v1.0.187):** live `chartrunner.xyz/play/` still hides Bot Terminal by default, but `?crLabsBotTerminal=1` or `?crLabs=bot-terminal` exposes the M14 Agent Command Center as a clear LABS surface. Players can connect agents, point the QVAC bridge at a hosted proxy with `?crAgentBridgeUrl=...&crAgentBridgeEngine=bridge` or `/bridge <url>`, see connection/error state, run `/build <template> <name>` to create propose-mode Bot Forge specs, and use `/run headless [steps]`, `/step [n]`, and `/monitor` for headless-safe runs. Trading, wallet, signing, and order-like agent tools stay player-approval gated; BotBacktestRecord anchoring still routes through the explicit wallet handoff.

**Configure Run → Broker** (v1.0.180) is visible now: a CEX/DEX segment toggle plus a compact game-native wheel to pick the venue (DEX: Jupiter / Phoenix / Raydium / Orca / Drift / Meteora / Lifinity · CEX: Binance / Coinbase / Kraken / Bybit / OKX / Bitget / KuCoin). The choice persists (`cr_broker_v1` / `game.broker`) and is read by Terminal Presets, the Execution Cockpit, and Blue Laser route panels. SDK order settlement is still paper/mock until the Phase 2 broker driver (`mock` → `binance-paper` → `phoenix`) lands.

For the full M0.5 → M10 roadmap, see [`README.md` § Post-Frontier roadmap](README.md#post-frontier-roadmap).

---

## Lite profile (top-right in-game)

Avatar centered. Green LED dot-matrix billboard cycles `name → asset · TF → mode` every 2.5s. Two terminal-style tabs:

- **`[ GAME ]`** — Reset · Save · Coins · Support · Perspective · Connect (3×2 grid)
- **`[ WALLET ]`** — `$CHART` (this run) · `$RUN` (persisted) · open positions B-L-O

Topbar buttons stay in DOM so existing handlers still work — lite profile entries `.click()` through.

---

## Tutorial (11 slides, restructured v1.0.40)

`MOVEMENT → JUMP → FLY → UPSIDE-DOWN → TOOLS → PRIMITIVES → BLUE LASER → WIDGETS → PROFILE → RUN CONTROLS → HOTKEY OVERVIEW`

Skippable. Re-openable from the Coach commands menu.

---

## Run locally

```bash
git clone https://github.com/ssjjul3/chartrunner.git
cd chartrunner
open ChartRunner_Prototype.html        # macOS
xdg-open ChartRunner_Prototype.html    # Linux
start ChartRunner_Prototype.html       # Windows
```

No install, no wallet, no npm. The game runs.

For the Solana side (`/solana-connect/`), see the repo-level [`README.md`](README.md#run-locally).

---

## Hard rules

1. No new dependencies in this single HTML file.
2. Abilities don't touch the canvas — they call the SDK.
3. The SDK is the only thing that issues orders.
4. Default topbar ≤ 5 elements.
5. All `innerHTML` writes on intervals or subscribers route through `crSafeHTML` — focus-guarded, idempotent (v1.0.93+).

---

## Contact

- **Email:** jsg@julianroy.com (info@chartrunner.xyz routes here too; whitelist@chartrunner.xyz for waitlist signups)
- **GitHub:** [@ssjjul3](https://github.com/ssjjul3) · [chartrunner](https://github.com/ssjjul3/chartrunner)
- **X:** [@chartrunner_xyz](https://x.com/chartrunner_xyz)
- **Demo:** https://chartrunner.xyz/play/
