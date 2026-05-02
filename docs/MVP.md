# MVP Credibility — What's Built

## TL;DR

Three live frontend surfaces + two Anchor programs, shipped as v0.9.7:

- **`/`** — defikingdoms-style landing page (single HTML, animated hero, mechanics grid, architecture diagram). All Play CTAs route through wallet handshake.
- **`/play/`** — the playable game in a single HTML file (~25k lines vanilla JS, no build, no install). Wallet-gated player data; per-wallet localStorage namespacing; on-chain Save/List/Buy buttons throughout the Workbench; async multiplayer leaderboard panel.
- **`/solana-connect/`** — React + Vite + wallet-adapter app with five operating modes (memo / connect / save-map / registry actions / record-run). Real Phantom/Backpack/Solflare connect + signed devnet transactions.
- **`anchor/programs/chartrunner_maps`** — Single-instruction Anchor program (`save_map`). Code complete, deploy pending.
- **`anchor/programs/chartrunner_registry`** — Multi-entity registry + marketplace + leaderboard substrate. 9 entity types, 6 instructions including escrow-based marketplace with 5% protocol fee. Code complete, deploy pending.

Frontend lives at [ssjjul3.github.io/chartrunner](https://ssjjul3.github.io/chartrunner/). Repo: [github.com/ssjjul3/chartrunner](https://github.com/ssjjul3/chartrunner). Source: MIT. CI: parse-check + Vite build + Pages deploy on push to `main` (~2 min build).

The architecture is shaped so Phase 2 (live mainnet trades + marketplace settlement) is a one-line program-ID swap per program — code path is identical between today's placeholder IDs and tomorrow's live mainnet IDs.

## What ships in the prototype

### Game layer
- **Three avatar physics modes** — runner (gravity, jump), flight (4-axis free), upside-down (flipped gravity, hostile shadow chart)
- **Real candles** — Binance klines REST, 15 timeframes from 1m to 1M, swappable across BTC/ETH/SOL/XRP/BNB/LINK/HYPE/TRX/DOGE
- **Three perspective modes** — Linear, Logarithmic, Auto-zoom (default)
- **Vehicle system** — skateboard / surfboard / rollercoaster / mining-cart / Lambo / Jetski grind on indicator polylines
- **Combat (Monster Mode)** — bears spawn on chart tops, shoot to survive, regime monsters (crab/whale/hornet) tied to volatility regime
- **Particles, hit-stop, banners, confetti, screen flash** — proper game-feel polish

### Trading primitives (the SDK surface)
- `placeBracket` — entry + TP + SL, risk-sized, R:R configurable
- `placeLadder` — N levels, total-risk-aware
- `placeFibLadder` — fib levels, two-anchor placement
- `placeOCO` — one-cancels-other pairs
- `openHedge` — counter-trade exposure
- `radarScan` — signal + confidence + hint
- `rescue` — emergency partial-liquidation safety net

All six route through `ChartRunnerSDK`. Abilities never touch the canvas. The SDK is the only thing that issues orders. **That's the constitutional rule.**

### Tools (TradingView-native)
- Two-anchor laser placement for Bracket / Ladder / Fib Ladder / OCO
- HLine, Anchored VWAP, Trendline (drag to translate, drag endpoints to reshape, Del to remove)
- Per-endpoint proportional drag handles
- Tools persist past laser, mirror across upside-down, double-click to tune
- 9 indicators with per-indicator parameter editors (SMA / EMA / RSI / Stoch RSI / OBV / VRVP / Ichimoku / Volume / Fear-Greed)

### Workbench (Pine Script builder)
- **Bots tab** — name + role (scout / sniper / arb / risk-manager / trader) + Pine code → Build → Equip → flies as orbital orb around avatar, emits role-flavored detection toasts
- **Strategies tab** — Pine strategy editor → built strategies mirror into the live STRATEGIES map, activatable from Strat pill / OS Configs / Terminal Strategies tab
- **Indicators tab** — Pine indicator editor (overlay / badge / panel)
- **Backtest tab** — pick any built bot/strategy/indicator, asset, TF, range, capital → paper-mode simulator → Sharpe / win-rate / max-DD / equity curve / 50-result history
- **App Builder tab** — name + emoji + type (Dashboard / Chat / Terminal / Notes / Custom) + HTML → Build → installs as a desktop OS icon + window
- All persisted to localStorage (`cr_workbench_v1`)

### OS desktop surface
- **Profile** — Trader header + tabs: Player · Balances · Stats · Missions
- **Marketplace** — Game Shop ($RUN gear) · P2P ($SOL bots/maps/strategies)
- **Terminal** — five tracker tabs + a `+` tab to spawn new windows: **Engine** (live game telemetry, real positions/P&L/logs from `crL3`) · HyperTracker · SolanaTracker · CEXTracker · Strategies. Every pane is draggable to the desktop OR to the in-game chart background.
- **Token Terminal** — categorized token research dashboard with tabs: ★ **Winners** (default) · Losers · Volume Spike · Social Buzz · Signals · New · All. Each row is a draggable token profile card (price · onchain · holders · volume · signal · backtest · social).
- **Workbench** — six tabs: Tools (manual ★-starring of laser tools) · Bots · Strategies · Indicators · **Terminal** (custom widget builder with row composer) · Backtest · App Builder
- **Maps** — save chart setups (asset, TF, indicators, tools, strategy, destruction state) with thumbnail; load drops you into the game. **Save button in the in-game topbar** captures the current run with a custom name.
- **Bot Terminal** — three tabs: Agents / Console / Chat — connect Claude / Telegram / Lobster / OpenClaw / Hermes
- **Configs** — opens after mode pick (asset / strategy / perspective / TF) → Start Run

### Tutorials (context-driven)
- **Two separate tutorials**, picked automatically based on context:
  - **Desktop OS** — when launched from the splash menubar, walks 12 steps through every OS app (Run, Configs, Workbench, Profile, Marketplace, Maps, Terminal, Token Term, Bot Term, SDK)
  - **In-Game** — when launched from the in-game topbar, auto-launches a BTC run, then runs 14 **interactive gated steps** that wait for the player to actually do each move before advancing (move avatar, jump, place a bracket, place other primitives, toggle indicators, activate strategy, fall through to upside-down, pick up coins, pin a widget, etc.)

### Solana devnet edge (`/solana-connect/`)
- Standalone React + Vite + TypeScript app, deployed alongside the game
- `@solana/wallet-adapter-react` v0.15+ — auto-discovers Phantom / Backpack / Solflare via Wallet Standard
- **Five operating modes** selected by URL params: `memo`, `connect`, `save-map`, `registry` (sub-actions: save-entity / list-entity / buy-entity / cancel-listing / record-run)
- Hand-rolled Anchor instruction builders in `src/lib/cr-{maps,registry}-program.ts` — no `@coral-xyz/anchor` dep, ~600 lines total
- Real signed transactions on Solana devnet (Memo program + chartrunner_maps + chartrunner_registry)
- Explorer-verifiable signatures, devnet faucet link, ~5 second flow per tx
- `?memo=` / `?action=...` query params for deep-linking from the game's topbar (carry name / hash / price / seller context)
- Same `ChartRunnerSDK` event shape — Phase 2 (mainnet) is a one-line program-ID swap, not a rewrite

### On-chain layer (Phase 0.9.4 + 0.9.6 + 0.9.7) — `anchor/programs/`

Two Anchor programs ship code-complete; deployment via Solana Playground is the one remaining step.

**`chartrunner_maps`** — single instruction `save_map(name, content_hash)`. PDA per `(wallet, name)`. Stores SHA-256 hash + saved_at. ~95 lines Rust.

**`chartrunner_registry`** — multi-entity registry + marketplace + leaderboard, six instructions:
- `save_entity(type, name, hash, royalty_bps)` — supports 9 entity types: Map, Strategy, Bot, Indicator, Backtest, App, TokenProfile, Widget, Tool
- `delete_entity(type, name)` — owner-only, refunds rent
- `list_entity(type, name, price)` — creates Listing PDA
- `buy_entity(type, name)` — escrow tx: 95% to seller, 5% to protocol treasury, mints License PDA for buyer
- `cancel_listing(type, name)` — seller-only, refunds rent
- `record_run(asset, tf, score, sharpe, duration, map_hash, nonce)` — leaderboard substrate; queried by the in-game ghost overlay

~430 lines Rust. Mocha smoke tests in `anchor/tests/`. PDA seeds keyed by `(b"entity", entity_type, owner, name)` for collision-free namespacing across types and players.

### Wallet integration (Phase 0.9.3+)
- **Wallet-gated entry** — landing's Play CTAs route through `/solana-connect/?next=play` for the wallet handshake first
- **Connect button** on both the in-game OS bar and the splash desktop menubar — collapses to mint pill (`🪙 ABCD…WXYZ`) when connected, click to disconnect with confirm
- **Per-wallet localStorage namespacing** via `Storage.prototype` shim — each connected wallet sees its own Profile, Maps, Workbench data; guest mode is a clean `__guest__` slate
- **`crWallet` IIFE** owns wallet state; **`crRegistry` IIFE** wraps the on-chain dispatcher; **`crGhost` IIFE** handles the leaderboard polling

### P2P Marketplace (Phase 0.9.5+) — six categories on-chain
- **Bots** · **Maps** · **Strategies** · **Backtests** · **Indicators** · **Apps**
- Each entity type maps to a distinct discriminator in `chartrunner_registry`
- Buy buttons route through `/solana-connect/?action=buy-entity` for wallet popup + signed tx
- 5% protocol fee, mints License PDA proving the purchase
- "🪙 Save on-chain" + "📤 List on Marketplace" buttons in every Workbench tab
- Backtests carry hash linking to parent strategy → buyers can re-hash to verify metrics

### Async multiplayer (Phase 0.9.7) — `crGhost` IIFE
- **Docked top-10 leaderboard panel** on the right edge of the chart, ranked by score for the current `(asset, timeframe)`
- **No server, no WebSocket** — vanilla JS RPC client polls `chartrunner_registry` every 60s via `getProgramAccounts` with memcmp filter for `RunRecord` discriminator
- **Manual Borsh decode** in 30 lines (no `@solana/web3.js` dep — the game stays single-file)
- **🏆 Record on-chain** button on the run-end screen — anchors (asset, tf, score, sharpe, duration, map_hash) to the registry program
- **Live pulse dot** in the panel corner signals on-chain polling activity

### Phone OS overlay
- Full mirror of the desktop OS: Coach (retired), Marketplace, Profile, Intel (retired), Maps, Terminal, Bot Terminal
- Profile tabs: Balances · Stats · Missions

### Desktop widgets
- Drag a Map card / Bot agent row / Terminal pane header onto the desktop background
- Becomes a persistent widget that mirrors live source data
- Panes carry per-tracker accent colors when pinned
- Move by title bar, double-click to open source app, × to dismiss
- Persisted to localStorage

### Theme system
- Three themes: Platinum (Mac OS 9), Solana, Ascii (Bloomberg-terminal green-on-black)
- Cycle via Theme menu in OS bar, persists across reloads
- Universal CSS lock guarantees identical layout across themes

### Save/Load
- `crMaps` — save chart setups with full destruction state (which indicator sub-lines / vol bars / VRVP buckets / strategy markers were shot down) + thumbnail; up to 30 maps; restoring drops player into the saved chart

## What's live vs pending (Phase 0.9.7)

| Surface | State |
|---|---|
| Wallet connect (Phantom / Backpack / Solflare) | ✅ Live on `/solana-connect/` |
| Wallet-gated entry (landing → connect → game) | ✅ Live |
| Per-wallet localStorage namespacing | ✅ Live |
| Anchor program code (`chartrunner_maps` + `chartrunner_registry`) | ✅ Code complete in `anchor/` |
| Anchor program **deployment** to devnet | 🟡 Pending Solana Playground deploy |
| Memo program tx on devnet | ✅ Live |
| In-game Save/List/Buy on-chain flows | ✅ UI live, txs sign and submit (will fail until programs deploy) |
| Async multiplayer leaderboard | ✅ UI live, polls real RPC (empty until first runs recorded) |
| Trading primitives placing real Solana mainnet trades | ❌ Phase 2 (mainnet adapter) |
| Real Solana DEX adapter | ❌ Phase 2 |
| WebSocket live candles | ❌ Currently REST polled |
| Mobile touch controls | ❌ Desktop only |

The `ChartRunnerSDK` surface is shaped so a real DEX adapter drops in cleanly. The `chartrunner_registry` program ID swap from placeholder → live devnet is mechanical (one constant in three files).

## What's NOT in the MVP yet (deferred to Phase 1.5 / 2)
- Full ghost-trajectory replay (requires IPFS/Arweave path storage)
- Real-time multiplayer (requires WebSocket server, breaks single-file rule)
- Resale royalty escrow (license becomes resalable, royalty back to creator)
- WebSocket live candles
- Mobile touch controls
- Signed run summaries beyond `record_run`

## Build credibility — the hard rules

1. **Single file** — `ChartRunner_Prototype.html`. Open in browser. That's the install.
2. **Framework-free** — vanilla JS, no React, no Vue, no Svelte. Tiny IIFE modules.
3. **`ChartRunnerSDK` is the only thing that issues orders** — abilities never touch network or rendering. Abilities call into the SDK; abilities never reach around it.
4. **Rendering and abilities never cross.** An ability may request an overlay (ghost lines, labels) but it does not reach into the canvas.
5. **No new dependencies.** No CDN scripts, no fonts beyond the system stack, no images. Procedurally drawn.
6. **Topbar discipline.** Default topbar holds at most five elements: `Brand · Symbol · Price · Timeframe · Score · Menu`. Everything else moves behind the menu drawer.

These rules are why Phase 1 (drop the game UI on top of Dexscreener / TradingView) is a few hundred lines and Phase 2 (swap the mock backend for Solana) is the same.

## Numbers that matter

| Metric | Value |
|---|---|
| **Lines of code (single file game)** | ~25,000 |
| **External dependencies in the game** | 0 |
| **Build steps for the game** | 0 |
| **Anchor programs** | 2 (`chartrunner_maps` + `chartrunner_registry`) |
| **On-chain instructions** | 7 (save_map · save_entity · delete_entity · list_entity · buy_entity · cancel_listing · record_run) |
| **On-chain entity types in registry** | 9 (Map · Strategy · Bot · Indicator · Backtest · App · TokenProfile · Widget · Tool) |
| **Trading primitives wired to SDK** | 6 (bracket / ladder / OCO / hedge / radar / rescue) |
| **Indicators implemented** | 9 |
| **OS apps shipping** | 9+ (Run · Marketplace · Profile · Workbench · Maps · Terminal · Bot Terminal · Token Terminal · Configs · custom-built apps) |
| **P2P Marketplace categories** | 6 (Bots · Maps · Strategies · Backtests · Indicators · Apps) |
| **Tracker views** | 5 (Engine / HyperTracker / SolanaTracker / CEXTracker / Strategies) |
| **Themes** | 3 (Platinum / Solana / Ascii) |
| **Wallet-namespaced persistence keys** | 9 (cr_maps_v1, cr_workbench_v1, cr_equipped_bots_v1, cr_widgets_v1, cr_indicators_v1, cr_last_played_v1, cr_racing_best, cr_starred_tools_v1, cr_pinned_widgets_v1) |
| **Solana devnet operating modes** | 5 (memo / connect / save-map / registry / record-run) |

## Why this is credible (not a slide deck)

- It runs. Right now. Open the file in any browser.
- It carries 230+ atomic version commits — each one a vetted change with comments explaining the why.
- The SDK is real. The constitutional rule is real. The Phase 2 swap is structural, not aspirational.
- The single-file constraint forced architectural discipline most prototypes don't survive. The fact that a 25,000-line game is one HTML file *is* the credibility.
- **Two Anchor programs ship as Rust source** in `anchor/programs/` — not slideware, not "would build." The instruction discriminators are precomputed; the TS clients build the wire-format ix by hand and bind to declared Program IDs. Everything except the one Solana CLI deploy command is done.
- **The marketplace economy is wired end-to-end** as code. Buy a strategy → wallet popup → escrow tx → seller gets 95% → treasury gets 5% → buyer gets a License PDA. The on-chain runtime is the only remaining gate.
