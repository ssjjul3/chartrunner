# Traction Proof

## What we have today (real, current state)

### Product
- ✅ **Playable single-file MVP** — `ChartRunner_Prototype.html`, ~14,700 lines, zero dependencies, opens in any modern browser
- ✅ **Phase 0 shipped at v0.8k#24ay** — 230+ atomic, vetted, commented version commits
- ✅ **Phase 1 SDK architecture document** — `ChartRunner_Phase1_SDK_Architecture.md` (in repo root)
- ✅ **Phase 1 SDK skeleton on a feature branch** — ES modules, RiskManager parity tests, demo page importing the SDK (M1 milestone)
- ✅ **M5 Solana paper-mode wallet + session + approver** — Ed25519 signer, lifecycle, parity vectors with the EVM track

### Architecture
- ✅ Constitutional rule enforced: abilities never touch the canvas, SDK is the only thing that issues orders
- ✅ Six trading primitives wired (bracket / ladder / fib ladder / OCO / hedge / radar / rescue)
- ✅ TradingView-native chart tools (drag, snap, two-anchor laser, per-endpoint handles)
- ✅ Workbench Pine Script builder with backtest tab
- ✅ Multi-tracker Terminal: 5 tracker views with draggable panes
- ✅ Drag-to-desktop widget system
- ✅ Mobile phone OS overlay

### Documentation
- ✅ Phase 0 evaluation + plan
- ✅ Phase 1 SDK architecture
- ✅ Skill folder for AI-agent contributors (`/skills/chartrunner/`)
- ✅ This MVP submission package

## What we're collecting next (committed targets)

### 30-day post-launch
- [ ] **100 X followers** on the project handle
- [ ] **25 game sessions ≥10 minutes** in the public prototype (Vercel / GitHub Pages instrumentation)
- [ ] **5 closed-loop trader-creator conversations** about Workbench strategy publishing
- [ ] **1 devnet integration LOI** — Hyperliquid OR Drift OR Phoenix
- [ ] **Public demo embed** in 1 tier-2 crypto media outlet

### 90-day post-launch (Phase 1 entry)
- [ ] **500 unique sessions** through the public demo
- [ ] **3 Workbench-built strategies** listed on the P2P Marketplace (mock $SOL settlement → real settlement on devnet)
- [ ] **Phase 1 ChartHost adapter shipping** — drop ChartRunner UI on top of Dexscreener and TradingView
- [ ] **First devnet partner integration live** — players placing real (testnet) trades through the SDK
- [ ] **10K social impressions / week** on the project handle

## How we'll measure (the instrumentation)

The single-file prototype already emits structured events through the SDK:

```js
sdk.on('order:filled', e => analytics.track('trade.filled', e));
sdk.on('position:closed', e => analytics.track('position.closed', e));
sdk.on('mission:complete', e => analytics.track('mission.complete', e));
```

Same surface that Phase 2 calls live. **Day-one analytics on the same primitive layer.**

## Founder execution evidence

Every change in this prototype landed as a versioned, commented, parse-validated edit. The version log in the source file tells the story — 230+ atomic commits ranging from `v0.6a` (real P&L tracking) through `v0.8k#24ay` (Terminal window-drag fix), each one with:
- A specific scoped goal
- A code change
- A reasoning comment in-source (`// v0.8k#24n — ...`)
- A parse + boot validation

**That's the development cadence we sustain.** It's documented in the file itself.

## Public proof points (queue these for launch week)

| Asset | Status | Drop window |
|---|---|---|
| **GitHub repo (public)** | 🟡 Ready to publish | Day 0 |
| **GitHub Pages live demo** | 🟡 Folder ready (`chartrunner-prototype/`) | Day 0 |
| **3-min explainer video** | 🟡 Script done (see VIDEO-SCRIPT.md) | Day 1 |
| **Pitch deck PDF** | ✅ This package | Day 0 |
| **X launch thread (10 tweets)** | 🟡 Drafted (see X-LAUNCH.md) | Day 1 |
| **Hacker News Show HN** | 🟡 Drafted | Day 2 |
| **Solana hackathon submission** | 🟡 Ready | Per hackathon window |
| **3 Discord seeds** (r/solana, Hyperliquid, Drift) | 🟡 Plan in EXECUTION-CHECKLIST.md | Day 3 |

## What we will *not* claim

- We don't have users yet. The prototype is unreleased.
- We don't have revenue. The economy is paper-mode.
- We don't have a token. We don't plan a TGE in Phase 1.

What we have is a **shipping discipline, an architecture that survives Phase 2, and an MVP credible enough that a devnet partner can integrate against it tomorrow.**

That's the traction story.
