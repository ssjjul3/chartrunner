# ChartRunner

> **Fortnite meets Space Invaders meets a trading chart.** Every trade is a game move.

[![Live](https://img.shields.io/badge/live-ssjjul3.github.io%2Fchartrunner-14F195)](https://ssjjul3.github.io/chartrunner/)
[![Solana](https://img.shields.io/badge/solana-devnet%20live-9945FF)](https://ssjjul3.github.io/chartrunner/solana-connect/)
[![Phase](https://img.shields.io/badge/phase-0.9.21%20quant%20tier%201-success)](#status)
[![Anchor](https://img.shields.io/badge/anchor-2%20programs%20ready-orange)](anchor/)
[![Stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Vite%20%2B%20Rust-blue)](#stack)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

## Live now

| Surface | URL | What it is |
|---|---|---|
| 🎮 **Landing** | https://ssjjul3.github.io/chartrunner/ | Project page · pitch · animated hero |
| 🕹 **Game** | https://ssjjul3.github.io/chartrunner/play/ | The playable prototype — no install, no wallet |
| 🪙 **Solana devnet** | https://ssjjul3.github.io/chartrunner/solana-connect/ | Real wallet connect + signed memo on devnet |
| 📖 **Pitch deck** | [PITCH-DECK.pdf](PITCH-DECK.pdf) · [.pptx](PITCH-DECK.pptx) | 12 slides, narrated speaker notes |

## What it is

A **gamified trading SDK** shipped as a playable browser prototype. Players run on real Binance candles, drop into the upside-down to fight bears on volatility, and every ability — bracket, ladder, OCO, hedge, radar, rescue — is a real trading primitive that routes through `ChartRunnerSDK`. The same SDK plugs into a real Solana adapter in Phase 2.

The hard architectural rule: **abilities never touch the canvas, the SDK is the only thing that issues orders.** That's what makes Phase 2 a swap, not a rewrite.

## Status

**Phase 0.9.21 — quant.pdf Tier 1 complete + Campaign coach.** Three surfaces live on GitHub Pages, two Anchor programs ready to deploy, async on-chain leaderboard wired end-to-end, full quant scoring spine + 10 SDK detectors + 8-chapter scripted Campaign + tool-aware laser system.

| Phase | Goal | State |
|---|---|---|
| **0** | Playable single-file game · onboarding · juice · simplicity | ✅ Shipped |
| **0.5** | Devnet wallet + signed transaction | ✅ Live at `/solana-connect/` |
| **0.9** | Public landing · repo · CI · Pages deploy | ✅ Shipped |
| **0.9.3** | Wallet-gated entry + per-wallet localStorage | ✅ Shipped |
| **0.9.4** | `chartrunner_maps` program + on-chain SaveMap | 🟡 Code complete · deploy pending |
| **0.9.5** | P2P Marketplace, 6 categories | ✅ Shipped |
| **0.9.6** | `chartrunner_registry` — multi-entity + marketplace | 🟡 Code complete · deploy pending |
| **0.9.7** | Async multiplayer leaderboard | 🟡 Code complete · deploy pending |
| **0.9.9–0.9.12** | quant.pdf Tier 1 — scoring spine + 10 detectors + Workbench Quick Builder + real-data Terminal widgets | ✅ Shipped |
| **0.9.13–0.9.14** | Play-app subcategories (Regular/Campaign/Minigame/PVP) + sleeker mode cards + Fib Extension tool | ✅ Shipped |
| **0.9.15–0.9.16** | 8-chapter Campaign coach + tool-aware laser beam + per-primitive setup guide + commit confetti | ✅ Shipped |
| **0.9.17–0.9.21** | Run Controls → in-game lite profile · hotkey 3 = green primitives laser · campaign chapters direct-launch | ✅ Shipped |
| **1** | SDK pull-over · drop runtime onto Dexscreener / TradingView | 🟡 Architecture done · in `sdk/` next |
| **2** | Anchor programs deployed to devnet → mainnet | 🟢 Programs ready · pending Solana Playground deploy |

## Why this matters

74% of new retail traders quit within 90 days. Bloomberg looks like a hospital monitor, paper-trading feels like homework, and YouTube doesn't transfer to real screens. ChartRunner replaces that on-ramp with a game where **the act of trading is the lesson** — and every primitive learned in the game is the same SDK call that lives in production.

Hyperliquid + Phantom flipped the wallet UX. Memecoin season trained 8M+ wallets to swap on-chain. The infra is here. The skill on-ramp is missing. We're the on-ramp.

## What's in v0.9.21

### Quant brain — `sdk.scoreSetup()` spine + 10 detectors (Tier 1 from quant.pdf, all live)

A **Signal Quality Scoring system** mirrors institutional confluence weighting from a 39-page trading methodology PDF. Top-right HUD pill shows live 0–20 score with tier label (WAIT / TRADEABLE / STRONG / PRIME) — players trade only ≥6 setups.

| Component | SDK method | Pts | Detection |
|---|---|---|---|
| HTF trend alignment | (inline) | +2 | Last close vs SMA(50) vs SMA(200) |
| Reference level proximity | `computeReferenceLevels` | +2 | Within ATR/4 of dOpen / pdH/L/C / pdVAH/POC/VAL / IBH/IBL |
| Volume node bonus | (inline) | +1 | Nearest level is pdPOC |
| Class A/B/C divergence | `_findSwings` + RSI | +2/+1/0 | Real swing-based geometry classifier |
| Champions Channel | (inline + autoFib band) | +2 | Price in 0.55–0.66 fib retrace of last 50-bar swing |
| Consolidation breakout | (inline) | +2 | Recent 20-bar range / prior 20-bar range < 0.6 + close outside |
| SFP | `sdk.detectSFP` | +2 | Wick beyond real swing high/low + close back inside |
| Failed Auction | `sdk.detectFailedAuction` | +2 | Open outside prior-day VA + accept back inside |
| OI confirmation | `sdk.detectOIConfirm` | +1 | Binance Futures `/openInterestHist` REST · OI direction matches price |
| Bump-and-Run reversal | `sdk.detectBumpAndRun` | +1 | Bulkowski's BARR — bump slope ≥2× lead slope + run pierces lead trendline |
| Head & Shoulders / Inverse | `sdk.detectHeadShoulders` | +2 | 5-swing matcher — shoulders within 5%, head >2% above, neckline pierce |
| **CCV composite mega-bonus** | `sdk.detectCCV` | +1 | All three (consolidation + Champion Zone + volume) fire (PDF cites ~80% WR) |

Per-frame **CCV watcher** (`ccvWatcherTick`) auto-fires a banner + optional auto-bracket when CCV matches. Five **probe abilities** in the menu let players manually inspect any detector and see ✓/✗ per component.

### Reference Levels overlay (`reflevels` indicator)

Toggleable horizontal lines for the canonical Igor / quant.pdf level template: **dOpen** (today's open), **pdHigh/Low/Close**, **pdVAH/POC/VAL** (prior-day value area, 70% capture, 24-bin volume bucket expansion from POC), **IBH/IBL** (initial balance high/low — first hour of session). Per-level checkboxes + opacity slider. Cached on `game._refLevelsCache` keyed by candle/asset/timeframe.

### Champions Channel autoFib upgrade

Fib retracement now ships an 8-level default (added 0.66) with a pulsing yellow shaded band between 0.618–0.66 ("CHAMPION ZONE 0.618–0.66" label). PDF cites 68% bounce probability inside this band. Auto-fib also infers swing chronology and pushes the fibRetrace overlay alongside the order ladder.

### Fib Extension tool (v0.9.14)

New 2-anchor laser tool — 9 default levels (1, 1.272, 1.414, **1.618 Golden Extension** with thicker stroke + pulsing blue band 1.5–1.7, 2, 2.272, 2.618, 3.618, 4.236). Extends right past anchor 2 by default. Use for take-profit targets.

### Workbench Quick Builder (no-code strategy builder)

Strategy + Indicator builder views get a "⚡ Quick Builder · No-code" panel above the existing Pine textareas. **Strategies:** all 12 confluence components shown as toggleable rows with weight sliders (0 to max). Side picker (Long/Short/Both), min-score slider (1–17), risk %, R:R, live preview button (calls `sdk.scoreSetup()` on current candles). **Indicators:** preset dropdown clones any built-in INDICATORS entry, color picker, per-param sliders. Saves snapshots alongside Pine code so future edits restore form state.

### Real-data Terminal widgets

Terminal `+` builder gets four new template kinds: **Confluence Signals** (live score + tier + breakdown), **Reference Levels** (all 9 levels), **Watchlist** (BTC/ETH/SOL/HYPE/DOGE async-cached tickers), **Live Indicators** (RSI/ATR/SMA50/SMA200/Vol vs median). All bind values refresh on the 1s `_wbTermBind` tick — no mocks.

### Tool-aware laser beam + setup guide overlay (v0.9.16)

Per-primitive 3-layer beam (white-hot core + colored mid + glow halo) with spark particles. Color keyed off the active tool: bracket=green, OCO=red, fib=gold, fibExt=blue, etc. **Setup guide card** (top-center floating banner) shows per-primitive: icon + name + step counter + current step ("Click swing low") + animated demo glyph (single-click pulse / two-anchor sequence) + small-print hint. Confetti burst in tool color at click point on commit.

### Hotkey 3 = green primitives laser (v0.9.19 + v0.9.21)

Slot 3 toggles a parallel laser-aim mode tinted green. Spawn menu reads **"PRIMITIVES"** in the header (not "TOOLS") and is filtered to Fibonacci + Forecast categories. Auto-equips the canonical primitive set regardless of player's Workbench tools: Bracket · OCO · Long Position · Short Position · Fib Ladder · Fib Retracement · Fib Extension. Shift+3 still opens the legacy modal picker.

### Play app subcategories + 8-chapter Campaign coach (v0.9.13–v0.9.18)

Run-window pill tabs: **Regular** (Time is Money, Trade) · **Campaign** (8 chapters) · **Minigame** (Snake, Racing, Monster) · **PVP** (Battle Arena). Sleeker mode cards (smaller min-height, refined typography). Each Campaign chapter direct-launches into a preset BTC/USDT chart (skips Configure Run window) with per-chapter indicators pre-equipped, then `crCampaignCoach` activates a top-center banner that gates progression on real game events (SDK orders, indicator toggles, score thresholds). 19 scripted steps total across the 8 chapters; player can Skip or wait for auto-advance.

### Run Controls in lite profile (v0.9.20b)

Reset / Save / Coins / Connect Wallet moved off the topbar (now hidden) into the in-game lite profile widget (`#crLightProfile`) as a 2×2 button grid. Wallet-connected glow mirrors via MutationObserver. Topbar buttons stay in DOM so existing handlers still work — lite profile entries just `.click()` through.

### The game (`/play/`) — pre-existing surfaces

- Real Binance klines (15 timeframes, 1m → 1M), 9+ assets
- Three avatar physics modes — runner / flight / upside-down
- Original 6 SDK primitives + 18 new tier-1-to-4 primitives shipped in v0.9.8
- Two-anchor laser placement for every two-anchor primitive
- Workbench Pine Script builder for custom bots, strategies, indicators, terminal widgets, full apps
- 🪙 Save on-chain + 📤 List on Marketplace buttons on every Workbench row
- Backtest tab with paper-mode simulator
- Desktop OS — Profile · Marketplace · Terminal · Workbench · Maps · Bot Terminal · Token Terminal · Configs
- Multi-tracker Terminal: Engine · HyperTracker · SolanaTracker · CEXTracker · Strategies + `+` tab
- Drag-to-desktop AND drag-to-chart-background widgets
- Save run as a Map → optional on-chain anchor confirm
- Mobile phone OS overlay

### Wallet integration (Phase 0.9.3+)
- **Wallet-gated entry** — landing's Play CTAs route through `/solana-connect/?next=play` for the handshake first
- **Connect button** on both the in-game topbar and the desktop OS menubar (mint pill when connected, click to disconnect with confirm)
- **Per-wallet localStorage namespacing** via `Storage.prototype` shim — each connected wallet sees its own Profile, Maps, Workbench data; guest mode is a clean slate (`__guest__` namespace)
- **`crWallet` IIFE** owns wallet state; `crRegistry` IIFE wraps the on-chain dispatcher

### On-chain (Phase 0.9.4 + 0.9.6 + 0.9.7) — `anchor/programs/`
- **`chartrunner_maps`** — single instruction `save_map(name, content_hash)` → PDA per (wallet, name)
- **`chartrunner_registry`** — multi-entity registry + marketplace, six instructions:
  - `save_entity(type, name, hash, royalty_bps)` — supports 9 entity types (Map · Strategy · Bot · Indicator · Backtest · App · TokenProfile · Widget · Tool)
  - `delete_entity(type, name)` — owner-only, refunds rent
  - `list_entity(type, name, price)` — creates Listing PDA on the marketplace
  - `buy_entity(type, name)` — escrow tx: 95% to seller, 5% to protocol treasury, mints License PDA for buyer
  - `cancel_listing(type, name)` — seller-only, refunds listing rent
  - `record_run(asset, tf, score, sharpe, duration, map_hash, nonce)` — leaderboard substrate
- **TS instruction builders** — hand-rolled in `solana-connect/src/lib/cr-*.ts`, no `@coral-xyz/anchor` dep, ~600 lines covering all 7 instructions
- **Anchor program code-complete; deployment via Solana Playground** is the one remaining step to flip from placeholder Program IDs to live devnet addresses

### P2P Marketplace (Phase 0.9.5+) — six categories
- **Bots** — Pine bot orbs that detect setups in real time
- **Maps** — full saved chart setups (asset, TF, indicators, overlays, destruction state, thumbnail)
- **Strategies** — Pine strategy code with hash anchored to creator
- **Backtests** — verified results (Sharpe / WR / MaxDD) hash-anchored to parent strategy
- **Indicators** — Pine overlay/badge/panel indicators
- **Apps** — HTML widgets that install as desktop OS icons
- **Real on-chain Buy flow** — clicking Buy on a listing with seller info routes through `/solana-connect/?action=buy-entity` for wallet popup + signed tx

### Async multiplayer (Phase 0.9.7) — `crGhost` IIFE
- **On-chain leaderboard** docked to the right edge of the chart, top-10 ranked by score for the current (asset, timeframe)
- **No server, no WebSocket** — vanilla-JS RPC client polls `chartrunner_registry` `getProgramAccounts` every 60s with memcmp filter for `RunRecord` discriminator
- **Manual Borsh decode** in 30 lines (no `@solana/web3.js` dep; keeps single-file constraint intact)
- **🏆 Record on-chain button** on the run-end screen — anchors (asset, tf, score, sharpe, duration, map_hash) so other players see the run on their leaderboard
- **Live pulse dot** in the panel corner signals on-chain polling activity

### Solana edge (`/solana-connect/`)
- React 18 + Vite 5 + TypeScript strict + `@solana/wallet-adapter-react`
- Wallet Standard auto-discovery (Phantom, Backpack, Solflare, Glow, etc.)
- **Five operating modes** selected by URL params:
  - `memo` — default; freeform memo demo
  - `connect` — `?next=play`; wallet-only handshake before `/play/`
  - `save-map` — legacy `chartrunner_maps` flow (one-trick)
  - `registry` — multi-action handler for the registry program (save / list / buy / cancel / record-run)
- Explorer-verifiable signatures, devnet faucet link
- One-card UI per action with full metadata preview before signing

### Landing (`/`)
- defikingdoms-style single-file landing
- Animated candle chart hero with drifting Invader sprite
- Bracket-flow canvas demo (laser → click → click → bracket on a 7s loop)
- 6-card mechanics grid · architecture diagram · Solana section · 3-phase roadmap
- **All Play CTAs route through wallet handshake** (v0.9.3+)
- All inline, no external deps, dark mode

## Stack

| Surface | Stack | Build |
|---|---|---|
| Landing | Single HTML file · vanilla JS · canvas | None |
| Game | Single HTML file · vanilla JS · canvas (~25 KB minified equiv) | None |
| Solana connect | React 18 · TypeScript strict · Vite 5 · `@solana/web3.js` 1.95 · wallet-adapter | `npm run build` |
| Anchor programs | Rust · Anchor 0.30.1 · Solana 1.18.x | `anchor build` (or Solana Playground) |
| Skills | `skills/chartrunner` (game work) · `skills/solana` (devnet React work) | — |
| CI | GitHub Actions: parse-check HTML + Vite build + Pages deploy | Auto on push |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  ChartRunner Game (canvas)                      │
│  - Player physics, monsters, particles          │
│  - Tools: bracket, ladder, OCO, hedge, radar    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  ChartRunnerSDK (framework-free)                │
│  - placeBracket / placeLadder / placeOCO        │
│  - openHedge / radarScan / rescue               │
│  - Event bus: order:filled, position:closed     │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌────────────┐ ┌─────────────┐ ┌──────────────┐
│ Mock       │ │ Solana      │ │ Mainnet      │
│ paper      │ │ devnet      │ │ Phase 2.5    │
│ Phase 0    │ │ live now    │ │ planned      │
└────────────┘ └─────────────┘ └──────────────┘
```

The single architectural rule: **ChartRunnerSDK is the only thing that issues orders.** Abilities call the SDK. The SDK calls the adapter. The adapter calls the venue.

## Run locally

### The game (single file, no build)
```bash
git clone https://github.com/ssjjul3/chartrunner.git
cd chartrunner
open ChartRunner_Prototype.html        # macOS
xdg-open ChartRunner_Prototype.html    # Linux
start ChartRunner_Prototype.html       # Windows
```

No install, no wallet, no npm. The game runs.

### The Solana devnet page
```bash
cd solana-connect
npm install
npm run dev      # http://localhost:5173
```

You'll need a Solana wallet extension (Phantom or Backpack). Get devnet SOL from the in-page faucet link, then sign a memo.

## Repo layout (current state)

```
chartrunner/
├── ChartRunner_Prototype.html          # The single-file game (canonical source)
├── chartrunner-prototype/              # Pages deploy folder
│   ├── index.html                      #   → landing page (root URL)
│   └── README.md
├── solana-connect/                     # Vite + React Solana devnet page
│   ├── src/
│   │   ├── App.tsx                     # 5 modes: memo / connect / save-map / registry
│   │   ├── main.tsx
│   │   └── lib/
│   │       ├── memo.ts · explorer.ts · format.ts
│   │       ├── cr-maps-program.ts      # Manual ix builder for chartrunner_maps
│   │       └── cr-registry-program.ts  # Manual ix builder for chartrunner_registry
│   ├── package.json · vite.config.ts · tsconfig.json
│   └── README.md
├── anchor/                             # Anchor workspace — 2 programs
│   ├── Anchor.toml
│   ├── Cargo.toml
│   ├── programs/
│   │   ├── chartrunner-maps/           # Single instruction: save_map
│   │   │   └── src/lib.rs
│   │   └── chartrunner-registry/       # 9-entity registry + marketplace + record_run
│   │       └── src/lib.rs
│   ├── tests/                          # Mocha smoke tests
│   ├── package.json
│   └── README.md                       # Toolchain install + Playground deploy guide
├── skills/
│   ├── chartrunner/                    # Game-work skill (auto-loaded)
│   └── solana/                         # Solana single-file React skill
├── docs/
│   ├── PROBLEM.md · MVP.md · COMPETITIVE.md · TRACTION.md
│   ├── PITCH-DELIVERY.md · VIDEO-SCRIPT.md · X-LAUNCH.md
│   ├── REPO-STRUCTURE.md · EXECUTION-CHECKLIST.md
├── ChartRunner_Phase0_Plan.md          # Phase 0 evaluation
├── ChartRunner_Phase1_SDK_Architecture.md
├── ChartRunner_Phase2_*.md             # 3 Phase 2 architecture docs
├── ChartRunner_v0.{6,7,8}_Backlog.md   # version backlogs
├── PITCH-DECK.pptx + .pdf              # 12-slide submission deck
├── build_deck.py                       # Python script to regenerate the deck
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # parse-check on PR
│   │   └── pages.yml                   # build + deploy both surfaces
│   ├── ISSUE_TEMPLATE/{bug,feature}.md
│   └── PULL_REQUEST_TEMPLATE.md
├── LICENSE                             # MIT
├── PUBLISH.sh                          # one-shot publish script
└── README.md                           # ← you are here
```

For the **target** Phase 1 layout (sdk/, adapters/, chart-host/, workbench/ as workspaces), see [docs/REPO-STRUCTURE.md](docs/REPO-STRUCTURE.md).

## Quick links

- 📖 [Problem validation](docs/PROBLEM.md)
- 🎯 [What's in the MVP](docs/MVP.md)
- 🥊 [Competitive edge](docs/COMPETITIVE.md)
- 📈 [Traction](docs/TRACTION.md)
- 🎤 [Pitch delivery guide](docs/PITCH-DELIVERY.md)
- 🎬 [Video script](docs/VIDEO-SCRIPT.md)
- 🐦 [X launch kit](docs/X-LAUNCH.md)
- 🏗 [Production repo target](docs/REPO-STRUCTURE.md)
- ✅ [Execution checklist](docs/EXECUTION-CHECKLIST.md)
- 🪙 [Solana skill (devnet React)](skills/solana/SKILL.md)

## Contributing

PRs welcome. The hard rules are documented in `.github/PULL_REQUEST_TEMPLATE.md`:

1. No new dependencies in the single-file HTML
2. Abilities don't touch the canvas (use the SDK)
3. SDK is the only thing that issues orders
4. Default topbar ≤ 5 elements

CI parse-checks the HTML on every PR. The full Pages deploy runs on `main` push and updates both surfaces in ~2 minutes.

## Contact

- **Email:** jsg@julianroy.com
- **GitHub:** [@ssjjul3](https://github.com/ssjjul3) · [chartrunner](https://github.com/ssjjul3/chartrunner)
- **X:** [@chartrunner_xyz](https://x.com/chartrunner_xyz)
- **Demo:** https://ssjjul3.github.io/chartrunner/

## License

MIT — see [LICENSE](LICENSE). Two Anchor programs (`chartrunner_maps` + `chartrunner_registry`) ship code-complete in `anchor/` — runtime requires the one-time Solana Playground deploy described in [`anchor/README.md`](anchor/README.md). Built without raising a round (yet — open to seed conversations after first traction milestones).
