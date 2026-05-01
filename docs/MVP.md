# MVP Credibility — What's Built

## TL;DR

A **single HTML file** you open in any modern browser. Real Binance candles. Six trading primitives wired to a framework-free SDK. Workbench Pine Script builder. Backtest tab. Multi-tracker Terminal. Drag-to-desktop widgets. Phone OS overlay. ~14,700 lines of vanilla JS. No build step. No npm. No wallet required.

This is **Phase 0**. It's playable now. The architecture is shaped so Phase 2 (live Solana devnet trades) is a swap, not a rewrite.

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
- **Profile** — Trader header + tabs: Balances · Stats · Missions
- **Marketplace** — Game Shop ($RUN gear) · P2P ($SOL bots/maps/strategies)
- **Terminal** — five tracker tabs: Darkflow / HyperTracker / SolanaTracker / CEXTracker / Strategies, each with multiple draggable panes
- **Workbench** — five tabs: Bots / Strategies / Indicators / Backtest / App Builder
- **Maps** — save chart setups (asset, TF, indicators, tools, strategy, destruction state) with thumbnail; load drops you into the game
- **Bot Terminal** — three tabs: Agents / Console / Chat — connect Claude / Telegram / Lobster / OpenClaw / Hermes
- **Configs** — opens after mode pick (asset / strategy / perspective / TF) → Start Run

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

## What's mocked (Phase 0)
- Wallet (Phantom-Connect ships in Phase 2)
- Solana transactions
- On-chain fills

The `ChartRunnerSDK` surface is shaped so a real DEX adapter drops in cleanly.

## What's NOT in the MVP yet (next ships)
- WebSocket live candles (REST polled)
- Mobile touch controls (desktop only for now)
- Signed run summaries
- Leaderboards
- Per-asset P&L tracking
- Real Solana devnet adapter

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
| **Lines of code (single file)** | ~14,700 |
| **External dependencies** | 0 |
| **Build steps** | 0 |
| **Trading primitives wired** | 6 |
| **Indicators implemented** | 9 |
| **OS apps shipping** | 9 (Run, Marketplace, Profile, Workbench, Maps, Terminal, Bot Terminal, Configs, +custom-built apps) |
| **Tracker views** | 5 (Darkflow / HyperTracker / SolanaTracker / CEXTracker / Strategies) |
| **Themes** | 3 (Platinum / Solana / Ascii) |
| **Persistence keys** | 4 (`cr_maps_v1` / `cr_workbench_v1` / `cr_equipped_bots_v1` / `cr_widgets_v1`) |

## Why this is credible (not a slide deck)

- It runs. Right now. Open the file.
- It carries 230+ atomic version commits — each one a vetted change with comments explaining the why.
- The SDK is real. The constitutional rule is real. The Phase 2 swap is structural, not aspirational.
- The single-file constraint forced architectural discipline most prototypes don't survive. The fact that a 14,700-line game is one HTML file *is* the credibility.
