# ChartRunner

> **Fortnite meets Space Invaders meets a trading chart.** Every trade is a game move.

[![Live](https://img.shields.io/badge/live-ssjjul3.github.io%2Fchartrunner-14F195)](https://ssjjul3.github.io/chartrunner/)
[![Solana](https://img.shields.io/badge/solana-devnet%20live-9945FF)](https://ssjjul3.github.io/chartrunner/solana-connect/)
[![Phase](https://img.shields.io/badge/phase-0.9.1%20MVP-success)](#status)
[![Stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Vite-blue)](#stack)
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

**Phase 0.9.1 — MVP shipped.** Three surfaces live on GitHub Pages.

| Phase | Goal | State |
|---|---|---|
| **0** | Playable single-file game · onboarding · juice · simplicity | ✅ Shipped |
| **0.5** | Devnet wallet + signed transaction (proof of on-chain edge) | ✅ Live at `/solana-connect/` |
| **0.9** | Public landing · repo · CI · Pages deploy | ✅ Shipped (this commit) |
| **1** | SDK pull-over · drop the runtime onto Dexscreener / TradingView | 🟡 Architecture done · in `sdk/` next |
| **2** | Anchor programs (RegisterStrategy · RecordRun · SaveMap) on devnet → mainnet | 🟢 Planned |

## Why this matters

74% of new retail traders quit within 90 days. Bloomberg looks like a hospital monitor, paper-trading feels like homework, and YouTube doesn't transfer to real screens. ChartRunner replaces that on-ramp with a game where **the act of trading is the lesson** — and every primitive learned in the game is the same SDK call that lives in production.

Hyperliquid + Phantom flipped the wallet UX. Memecoin season trained 8M+ wallets to swap on-chain. The infra is here. The skill on-ramp is missing. We're the on-ramp.

## What's in v0.9.1

### The game (`/play/`)
- Real Binance klines (15 timeframes, 1m → 1M) loaded live, swappable across BTC/ETH/SOL/XRP/BNB/LINK/HYPE/TRX/DOGE/+more
- Three avatar physics modes — runner / flight / upside-down
- Six trading primitives wired to a framework-free `ChartRunnerSDK` — bracket, ladder, OCO, hedge, radar, rescue
- Two-anchor laser placement for Bracket / Ladder / Fib Ladder / OCO
- Workbench Pine Script builder for custom bots, strategies, indicators, **terminal widgets**, and full apps
- Backtest tab with paper-mode simulator
- Desktop OS surface — Profile · Marketplace · Terminal · Workbench · Maps · Bot Terminal · **Token Terminal** · Configs
- Multi-tracker Terminal: **Engine** (live game telemetry) · HyperTracker · SolanaTracker · CEXTracker · Strategies + `+` tab to spawn new windows
- Drag-to-desktop AND drag-to-chart-background widgets
- Click-on-name editing (button composer for any widget)
- Two-tutorial system — Desktop OS walkthrough + interactive in-game mechanics tutorial (gated on actually doing the move)
- Save run as a Map from the in-game topbar
- Mobile phone OS overlay with the same surfaces

### Solana edge (`/solana-connect/`)
- React + Vite + TypeScript + `@solana/wallet-adapter-react`
- Wallet Standard discovery (Phantom, Backpack, Solflare, Glow, etc. — all auto-detected)
- Real signed memo transaction on Solana devnet (canonical Memo program)
- Explorer-verifiable signature, devnet faucet link, ~5 second flow
- `?memo=...` query param for deep-linking from the game's topbar

### Landing (`/`)
- defikingdoms-style single-file landing
- Animated candle chart hero with drifting Invader sprite
- Bracket-flow canvas demo (laser → click → click → bracket on a 7s loop)
- 6-card mechanics grid · architecture diagram · Solana section · 3-phase roadmap
- All inline, no external deps, dark mode

## Stack

| Surface | Stack | Build |
|---|---|---|
| Landing | Single HTML file · vanilla JS · canvas | None |
| Game | Single HTML file · vanilla JS · canvas | None |
| Solana connect | React 18 · TypeScript strict · Vite 5 · `@solana/web3.js` 1.95 · wallet-adapter | `npm run build` |
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
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── lib/{memo,explorer,format}.ts
│   ├── package.json · vite.config.ts · tsconfig.json
│   └── README.md
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
- **X:** [@chartrunner_xyz](https://x.com/chartrunner_xyz) *(reserve before public launch)*
- **Demo:** https://ssjjul3.github.io/chartrunner/

## License

MIT — see [LICENSE](LICENSE). Built without an Anchor program (yet — Phase 2). Built without raising a round (yet — open to seed conversations after first traction milestones).
