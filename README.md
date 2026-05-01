# ChartRunner

> **Fortnite meets Space Invaders meets a trading chart.** Every trade is a game move.

[![Phase](https://img.shields.io/badge/phase-0%20MVP-9945FF)](#status)
[![Stack](https://img.shields.io/badge/stack-Solana%20devnet-14F195)](#architecture)
[![Build](https://img.shields.io/badge/build-single--file%20HTML-success)](#run-locally)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

## What it is

A **gamified trading SDK** shipped as a playable browser prototype. Players run on real Binance candles, drop into the upside-down to fight bears, and every ability — bracket, ladder, OCO, hedge, radar, rescue — is a real trading primitive that routes through `ChartRunnerSDK`. The same SDK plugs into a real DEX adapter in Phase 2.

## Status

**Phase 0 — MVP shipped.** Open `ChartRunner_Prototype.html` in a desktop browser, no build, no install, no wallet.

| Phase | Goal | State |
|---|---|---|
| **0** | Playable first oneshot · onboarding · juice · simplicity | ✅ Shipped |
| **1** | SDK pull-over layer · drop the game UI on Dexscreener / TradingView | 🟡 Architecture done |
| **2** | Standalone dApp · wallet connect · live Solana devnet trades | 🟢 Planned |

## Why this matters

Trading apps fail new users. The interface looks like a hospital monitor and the learning curve is a cliff. Most "education" is YouTube and PDFs. ChartRunner replaces that with a game where the **act of trading is the lesson** — and every primitive learned in the game is the same SDK call that lives in production.

## What you get in Phase 0

- Real Binance klines (1m → 1M, 15 intervals) loaded live
- Three avatar physics modes (runner / flight / upside-down)
- Six trading primitives wired to a framework-free `ChartRunnerSDK`
- Two-anchor laser placement for Bracket / Ladder / Fib Ladder / OCO
- Workbench Pine Script builder for custom bots, strategies, indicators
- Backtest tab with paper-mode simulator
- Desktop OS surface — Profile, Marketplace, Terminal, Workbench, Maps, Bot Terminal, Configs
- Multi-tracker Terminal: Darkflow · HyperTracker · SolanaTracker · CEXTracker · Strategies
- Drag-to-desktop widgets (maps, chats, terminal modules)
- Mobile phone OS overlay with the same surfaces

## Architecture

```
┌─────────────────────────────────────────────────┐
│  ChartRunner UI (canvas)                        │
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
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌───────────────────────┐
│ Phase 0 mock  │         │ Phase 2: Solana       │
│ paper engine  │         │ devnet → mainnet      │
└───────────────┘         └───────────────────────┘
```

The hard rule: **abilities never touch the canvas, the SDK is the only thing that issues orders.** That's what makes Phase 2 a swap, not a rewrite.

## Run locally

```bash
git clone https://github.com/<you>/chartrunner
cd chartrunner
open ChartRunner_Prototype.html        # macOS
xdg-open ChartRunner_Prototype.html    # Linux
start ChartRunner_Prototype.html       # Windows
```

No build step. No npm. No wallet required for Phase 0.

## Repo layout (target — see [docs/REPO-STRUCTURE.md](docs/REPO-STRUCTURE.md))

```
chartrunner/
├── ChartRunner_Prototype.html      # Phase 0 single-file playable
├── chartrunner-prototype/          # GitHub Pages deploy
├── sdk/                            # Phase 1 ES module SDK (in progress)
├── adapters/
│   ├── solana-devnet/              # Phase 2 adapter
│   └── hyperliquid/
├── docs/
│   ├── PROBLEM.md
│   ├── MVP.md
│   ├── COMPETITIVE.md
│   ├── TRACTION.md
│   ├── PITCH-DELIVERY.md
│   ├── VIDEO-SCRIPT.md
│   ├── REPO-STRUCTURE.md
│   ├── X-LAUNCH.md
│   └── EXECUTION-CHECKLIST.md
├── PITCH-DECK.pptx                 # Submission deck (narrated)
└── README.md                       # ← you are here
```

## Quick links

- 📖 [Problem validation](docs/PROBLEM.md)
- 🎯 [What's in the MVP](docs/MVP.md)
- 🥊 [Competitive edge](docs/COMPETITIVE.md)
- 📈 [Traction](docs/TRACTION.md)
- 🎤 [Pitch delivery guide](docs/PITCH-DELIVERY.md)
- 🎬 [Video script](docs/VIDEO-SCRIPT.md)
- 🐦 [X launch kit](docs/X-LAUNCH.md)
- ✅ [Execution checklist](docs/EXECUTION-CHECKLIST.md)

## Contact

- X: [@chartrunner_xyz](https://x.com/chartrunner_xyz) *(reserve before launch)*
- Demo: open `ChartRunner_Prototype.html` in a desktop browser
- Pitch deck: `PITCH-DECK.pptx`

## License

MIT — see [LICENSE](LICENSE).
