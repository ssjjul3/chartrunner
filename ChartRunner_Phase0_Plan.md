# ChartRunner — Phase 0 Plan

*Evaluation of v0.4 and work items for v0.5. The north star for this phase is: **a first-time player can load the page, understand what the game is, and place their first trade within 60 seconds, without reading docs.***

---

## The pitch, in one breath

> **Fortnite meets Space Invaders meets a trading chart.** You run on candles, collect liquidity in the upper world, and fight bears in the upside-down — every "ability" is a real trading primitive (bracket, ladder, OCO, hedge, radar, rescue).

That is the story. Everything in the UI, tutorial, and loop should reinforce it.

---

## Phase roadmap

| Phase | Goal | State |
|---|---|---|
| **Phase 0** — first oneshot | Game evaluation + fun, legible, teachable prototype | **in progress** |
| **Phase 1** — SDK | Pull-over layer for dexscreener / tradingview / any chart host. Abilities expose as library. | next |
| **Phase 2** — dApp | Wallet connect, live Solana trades through the same SDK contract. | later |

Phase 0 is *the* phase that decides whether anyone plays long enough to care about Phase 1 or 2.

---

## v0.4 evaluation

### What works
- Real Binance candles render cleanly across 5 timeframes with rescaled hazards and bracket defaults.
- Three perspectives (Lin / Log / Auto) are mathematically correct and the bracket / HUD overlays follow.
- Three avatar states (Runner / Flight / Upside-Down) coexist and switch via intuitive double-taps.
- Combat loop is working: spawn → chase → shoot → kill, with HP and i-frames.
- SDK surface is cleanly decoupled — swapping a DEX backend is a file-local change.

### Top friction points (observed from the code / flow)
1. **The topbar is overloaded.** 10+ controls compete for attention before the player knows what the game is. Symbol, price, 5 TF buttons, 3 perspective buttons, src tag, TICK, Creds, Score, SDK, menu — all at once.
2. **No onboarding.** A first-time player sees a chart, some numbers, and a splash card full of keyboard shortcuts. There is nothing that *shows* them what to do.
3. **No missions / goals.** The run has no direction. You walk, you might jump, you might die. There is no "what's next?" pull.
4. **Trading abilities are buried in digit keys.** The bracket editor especially requires ~4 inputs on first use. A player who hit "2" to see what happens is not going to enter a trade.
5. **Combat feedback is thin.** Kills disappear with a TICK pop, hits barely register. No screen shake, no particles, no hit-stop, no damage numbers.
6. **Story is absent.** The splash says "collect TICK, fight bears" as a bullet list. There is no world, no character, no reason.
7. **Physics feels floaty in places.** Walk speed vs. candle geometry sometimes makes the player land inside a wick; dash has no visual telegraph.

### What we're keeping
Core loop (collect up top, fight below, trade primitives as abilities), single-file architecture, framework-free SDK, candle-native physics, event-driven SDK for future replay / anti-cheat.

---

## v0.5 work items — prioritized

Ordered by **impact × ease × "makes the game legible in 60 seconds"**. Items 1–5 are the critical path for Phase 0 shipping; 6–8 are polish.

### 1. Simplify the topbar ⚡
Strip to the five things a player *needs* in-game:
- `Symbol · Price · Timeframe · Score · HP`

Move behind the menu (`M` / ☰): perspective, src tag, TICK, Creds, SDK drawer toggle. Power users still reach them in one click; new players see a clean HUD.

### 2. Onboarding tutorial — 4 steps, ~30s
First load only. Semi-transparent overlay with a single highlighted control at a time:
1. **WALK** — "Press → to run along the chart." Waits for any right arrow.
2. **JUMP & FLY** — "Press ↑ to jump. Double-tap ↑ to fly." Waits for a double-tap.
3. **COLLECT** — "Fly through a ◆ to collect TICK." Waits for first pickup.
4. **TRADE** — "Tap **2** to place a 1:2 bracket." Waits for first bracket fill.

Dismissible with `Esc`. Skippable from menu. Re-runnable from menu ("Replay tutorial").

### 3. Mission pill (center-top HUD)
Three evergreen starter missions cycling one at a time:
- *"Collect 5 TICK"* — teaches movement + pickups.
- *"Place one bracket trade"* — teaches the core trading primitive.
- *"Survive 30s in the upside-down"* — teaches combat + world switch.

One active mission at a time, visible as a pill with progress. Completion rewards Creds + tiny confetti. Missions are defined as `{ id, text, progressFn, isDone, onComplete }` — easy to extend later.

### 4. Bracket quick-mode
- **Tap 2** → instantly place a 1:2 bracket at current price, default risk. No menu. Confirms with the ghost-then-solid animation.
- **Hold 2** (>300ms) → opens the full editor (existing behavior).

This turns the trading primitive from a 4-input form into a single keypress for 80% of plays. Power still lives behind the hold.

### 5. Hit/kill juice
- **On kill**: 8-particle burst, +TICK / +Score float, brief 60ms hit-stop.
- **On player hit**: red screen flash (150ms), 120ms hit-stop, screen-shake (~6px decaying).
- **Floating numbers**: "-1 HP", "+2 TICK" rising + fading.
- **Damage number on monster**: bullet hit → pop.

Pure game-feel. No SDK changes.

### 6. Storytelling tightening
- Splash shrinks to **one sentence + one verb**: *"Trade the chart. Survive the upside-down."* then a big `[Play]` button.
- World lore line in the menu: *"Runners extract liquidity from the chart; bears live in the upside-down."*
- Kill flavor: first kill of a run = toast *"First blood — the bear market bit back."*
- Small character flavor in the upside-down: player sprite's eyes flash red on hit.

### 7. Physics pass
- Snap player's foot to the *top edge* of the candle under them (no more wick clipping).
- Coyote-time: 80ms of jump-grace after walking off an edge.
- Dash telegraph: brief afterimage on the player sprite for 150ms post-dash.

### 8. Reorchestrate for Phase 1 adaptability
Prep work that makes Phase 1 cheap:
- Move **rendering** behind a `ChartHost` interface: `{ priceToY, xToTime, timeToX, visibleRange, onResize }`. The game reads from `ChartHost`; today's implementation is `InternalCandleHost`; tomorrow's is `DexScreenerHost` / `TradingViewHost`.
- Move **abilities** behind an `AbilityRegistry` so new primitives can be added without touching the game loop: `registerAbility({ id, key, cooldown, onFire, drawOverlay? })`.
- Keep `ChartRunnerSDK` the only thing that sends / receives "orders" — no direct network inside abilities.

This is scaffolding, not a rewrite. A few hundred lines of refactoring in v0.5 saves a Phase 1 rewrite.

---

## Verification

Every v0.5 change gets a pass from a **playtest bot** (subagent) that reads the final HTML and traces:
- First-time-user flow: splash → tutorial → first pickup → first bracket. Flags any place it cannot describe in one sentence what to do next.
- Topbar scan: counts elements visible before any interaction. Target ≤ 5.
- Mission system: verifies each mission has a reachable completion path in the current build.
- Bracket quick-mode: confirms tap-vs-hold discriminator is 300ms and the full editor path still works.

Bot runs after item #5 lands and again after item #8.

---

## Non-goals for Phase 0

- Wallet connection — Phase 2.
- External chart host integration — Phase 1.
- WebSocket live candles — nice-to-have, not blocking.
- Mobile touch controls — Phase 1+.
- Leaderboards — after signed run summaries, Phase 1+.

## Success criteria for Phase 0 shipping

- A first-time player, given only the page URL, can reach "first bracket trade placed" in under 60 seconds.
- Topbar has ≤ 5 visible elements in the default state.
- At least one mission is completable on every timeframe.
- No code path in an ability touches rendering directly.
