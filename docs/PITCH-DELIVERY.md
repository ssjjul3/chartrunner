# Pitch Delivery Guide

Use this when delivering the deck live (demo day, hackathon judges, partner meeting).

## The 90-second elevator

> ChartRunner is a gamified trading SDK. Players run on real candles, fight bears in an upside-down chart world, and every ability they use — bracket, ladder, OCO — is a real trading primitive that routes through the same SDK we'll plug into Solana devnet for live trades. The next 10 million traders won't learn from PDFs. They'll learn from the same loop that taught them Fortnite. We're the on-ramp.

## The 3-minute version (live demo flow)

1. **Hook (10s):** "Open this file in your browser. No install, no wallet."
2. **Show the splash desktop (15s):** "It's an OS. Not a webpage."
3. **Pick mode → Configure → Start Run (15s):** "BTC, 1h, Auto-zoom, go."
4. **Place a bracket (20s):** "Press 2 to laser. Click a candle. Pick Bracket. Click a second candle. That's a real bracket order through the SDK — same call we make on Solana devnet."
5. **Drop into upside-down (15s):** "Walk down through the close line. Physics flips. Bears spawn. This is volatility regime, gamified."
6. **Open Workbench (20s):** "I can write a Pine Script bot in here. Build it. It flies as an orb around my avatar and emits detection toasts. I can list it on the P2P Marketplace for $SOL."
7. **Hit a tracker pane → drag to desktop (15s):** "Every tracker module in the Terminal can pin to the desktop as a live widget."
8. **The architecture line (15s):** "Abilities never touch the canvas. The SDK is the only thing that issues orders. That's why Phase 2 — live Solana trades — is a swap, not a rewrite."
9. **The ask (15s):** "We're looking for a devnet integration partner and a 6-month seed."

## Per-slide narration (matches PITCH-DECK.pptx)

### Slide 1 — Title
**Spoken:**
> "ChartRunner. Fortnite meets Space Invaders meets a trading chart. Every trade is a game move."

**Beat:** Pause. Let it breathe.

### Slide 2 — Problem
**Spoken:**
> "Trading apps are a hospital monitor. 74% of new retail traders quit in 90 days. Not because they're stupid — because the on-ramp is a cliff."

**Body language:** Look at the audience. This is the universal pain.

### Slide 3 — Solution
**Spoken:**
> "We turn the cliff into a game. Every primitive — bracket, ladder, OCO — is taught as a mechanic. The hand learns where the stop goes. And here's the trick: every mechanic in the game routes through a real SDK. What you practice is what graduates."

**Visual cue:** The slide shows the hand-drawn diagram of player → SDK → Solana. Point at it.

### Slide 4 — The MVP (live demo)
**Spoken (while demoing):**
> "I'm going to show you the prototype. It's one HTML file. No build, no install. Open it. Let's place a bracket."

**Demo:** Run the 3-minute flow above. **Don't read slides while demoing.** Talk over the screen.

### Slide 5 — How it works (architecture)
**Spoken:**
> "The constitutional rule: abilities never touch the canvas, the SDK is the only thing that issues orders. That sounds like a small thing. It's the whole bet. It's why Phase 2 is a swap."

### Slide 6 — Why now
**Spoken:**
> "Two structural shifts. Hyperliquid plus Phantom flipped the wallet UX — a 22-year-old can fund and trade in 4 minutes. Memecoin season trained 8 million wallets to swap on-chain. The infra is here. The skill on-ramp is missing. Nobody owns it."

### Slide 7 — Traction
**Spoken:**
> "We're pre-launch. What we have is shipping discipline. 230+ atomic version commits. A single-file prototype that's been parse-validated and playtested at every step. An SDK architecture we'll bolt to Solana devnet."

**If asked about users:** "Zero, today. We'll ship publicly with the next push and we have a 30-day target board."

### Slide 8 — Competitive edge
**Spoken:**
> "Four wedges. We're gamified — TradingView and Phantom aren't. We're skill-building — Bitget Quest and Coinbase Learn aren't. We're on-chain native — TradingView paper isn't. We're SDK-portable — every other gamified trading product locks the player to one venue. We're a runtime artifact, not a SaaS. We can drop on any chart."

### Slide 9 — Roadmap
**Spoken:**
> "Phase 0 shipped. Phase 1 — drop the ChartRunner UI on top of Dexscreener, TradingView, Birdeye. Anywhere with a candle. Phase 2 — wallet-connect and live Solana trades through the same SDK. We're not asking you to imagine the architecture. It's already there."

### Slide 10 — The ask
**Spoken:**
> "We're looking for two things. One — a devnet integration partner. Hyperliquid, Drift, or Phoenix would be the strongest fits. Two — a six-month seed to staff Phase 1 and ship Phase 2 live."

**Don't apologize for asking.** State it flat.

### Slide 11 — Closing
**Spoken:**
> "The next 10 million traders won't learn from PDFs. They'll learn from a game. We're the on-ramp."

**Pause.** Then: *"Questions?"*

## Q&A prep

**"How do you make money?"**
> Three lines: P2P Marketplace fee on bot/strategy sales. Premium themes / vehicles in Game Shop ($RUN). White-label license for chart vendors. Phase 2 also opens venue rev-share.

**"Who's the team?"**
> [Replace with founder bio.] Solo-founder shipping cadence, evidenced by 230+ atomic commits in the source. Looking for a Solana eng + a comms hire post-seed.

**"Why won't TradingView just copy this?"**
> They won't dilute their pro-trader brand with a game mode. And our four-wedge position (gamified + skill-building + on-chain native + SDK-portable) is structurally different from a paper-trading bolt-on.

**"Why Solana?"**
> Phantom UX, Hyperliquid funding flip, memecoin culture. The audience is here. And devnet is mature enough to ship production-shaped flows for free.

**"How big is this market?"**
> 425M+ self-directed retail trader accounts globally. 8M+ active Solana wallets. Even a 0.5% conversion through our funnel is a real business.

**"What happens if you lose the SDK constitutional rule?"**
> We don't. The codebase is structured so violating it shows up as a code-review smell. The Phase 1 architecture document codifies it.

**"What's the riskiest assumption?"**
> That players who learn in the game will graduate to live trading. We mitigate by Phase 2 routing through the same SDK, so the moment they wallet-connect, they're already proficient with the primitives.

## Body language + delivery rules

1. **Don't read slides.** Talk past them. Slides are billboards, not scripts.
2. **Demo wins.** If you have 5 minutes, demo for 3.
3. **One sentence per slide spoken aloud.** Anything more, you've over-narrated.
4. **State the ask flat.** No "we'd love it if maybe possibly." Just: "We're looking for X."
5. **Sit with the silence after the close.** Don't fill it. Wait for the question.

## Pre-deck rituals

- 30 minutes before: open `ChartRunner_Prototype.html` in your browser. Pre-load the splash so the first click pops.
- 10 minutes before: pre-open the Workbench window with a saved bot template loaded so the demo lands clean.
- 1 minute before: drink water. Stand, don't sit.
