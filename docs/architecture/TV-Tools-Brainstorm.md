# ChartRunner — TradingView Drawing Tools, Gamified

**Scope:** 11 TV primitives re-imagined as ChartRunner abilities / overlays / SDK hooks. Slots 1–8 are already populated (Bracket, Ladder, OCO, Hedge, Radar, Rescue, Magnez, Trail). These eleven live as a **second tool tier**: no hotkey by default, placed via a right-click menu on the chart or a new "Tools" dropdown in the menu drawer. Each tool becomes a persistent, draggable overlay (same architecture as `visualTrendlines`) and emits SDK events that other abilities can react to.

The underlying design rule stays intact: **ChartRunnerSDK is the only thing that issues orders.** A drawn tool registers intent; abilities react through the SDK event bus. Rendering stays inside the chart host.

---

## 1. Horizontal Line — "Wall"

**TV purpose:** A price level that extends infinitely in both directions. Used to mark S/R, prior highs/lows, liquidation clusters.

**Game mechanic:** A glowing horizontal beam across the chart. Collision is diegetic — the player's runner physically lands on it as a thin platform; if they're in upside-down, it's a ceiling. The line also acts as a **price tripwire**: when the live price candle crosses it, the SDK emits a `line.cross` event. Any bracket pre-armed to that line fires at the cross.

**Strategic wrinkle:** Walls consume a $CHART "ink" cost proportional to how far from current price they're drawn. Drawing walls right next to the current candle is cheap; drawing a moonshot wall at 2× current price costs real $CHART. This teaches that meaningful S/R lives near market, not at random round numbers.

**SDK:** `sdk.line({ price, mode: 'horizontal' })` → returns a handle; `.onCross(side, fn)` binds callbacks. Abilities like Bracket can chain: `sdk.bracket({...}).armOnCross(wall)`.

**Slot idea:** Chart tool, placed via right-click → "Add horizontal line". No hotkey.

---

## 2. Horizontal Ray — "Ray / Laser Sight"

**TV purpose:** Same as a horizontal line but only extends forward in time from the anchor candle.

**Game mechanic:** A **laser sight shooting forward from the player's position** at the moment they cast it. Past candles don't count — the ray only reacts to candles to the right. In-game, it renders as a beam of the player's current form color (cyan in upper world, pink in upside-down).

**Strategic wrinkle:** Rays are the proper "stop-entry order" translation. They expire after N candles (default 50, tunable). The expiry creates a **trade-or-lose-it urgency** that a forever-horizontal-line doesn't. Collecting pickups *directly under the ray* pays 1.25× — a subtle nudge to place rays along your intended path of travel.

**SDK:** `sdk.ray({ priceFrom, anchorCandle, expiresIn })` — same `onCross` hook as the wall, but the ray's handle also reports "miss" if it expires unhit.

---

## 3. Vertical Line — "Timelock"

**TV purpose:** A vertical time marker. Used for events, session opens, expected news drops.

**Game mechanic:** A **countdown barrier** placed N candles ahead. As price approaches, the barrier pulses; screen desaturates slightly on the last 3 candles before it. Crossing the barrier triggers a **scheduled SDK action** the player chose at placement time: `closeAll` (harvest wins, cut losers), `takeProfit` (just close greens), `reviewPositions` (open an OCO summary), or `harvestBonus` (pay out a 10% $RUN bonus if P&L is positive, else a $CHART penalty).

**Strategic wrinkle:** The vertical line is a **commitment device**. Players bad at taking profit can use it to force themselves out. The barrier is visible to the whole session, so a player sees their own intent drifting closer — hard to ignore. A great tool for Monster Mode where fights can drag.

**SDK:** `sdk.timeOrder({ atCandle, action })` — a scheduled job on the SDK event loop.

---

## 4. Parallel Channel — "Rail"

**TV purpose:** Two parallel trendlines enclosing a trend channel (or range). Mean reversion + breakout signal.

**Game mechanic:** A **grind rail** for the player avatar. Inside the channel, the runner's movement becomes sticky, tilting along the channel slope — it literally skis the trend. Breaking out of the channel (price crosses either rail) triggers a **charge-up burst**: the next bracket placed within 3s gets a free 1.5× size.

**Strategic wrinkle:** While price stays inside, the channel pays **passive $CHART** every candle (theta-like), scaling with channel width / ATR. This rewards drawing *tight, meaningful* channels rather than loose catch-all boxes. The tighter the rail, the more it pays — but the more often price breaks out and kills the income.

**SDK:** `sdk.channel({ p1, p2, slope })` emits `inside` / `breakoutUp` / `breakoutDown`. Income tick fires from `sdk.on('candle.close')` while state is `inside`.

---

## 5. Fib Retracement — "Fib Ladder"

**TV purpose:** Seven levels (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0) drawn between a swing high and low.

**Game mechanic:** A **seven-tier glowing staircase**. Each level is a platform with a distinct buff on first touch:

- **0.0** (swing low): +20% run speed for 3s
- **0.236**: small $RUN pickup
- **0.382**: +1 Radar ping (reveals next candle direction)
- **0.500**: auto-fires a 1:2 bracket at this price ("the half tier")
- **0.618**: golden tier — 2× $RUN drop + 2s of i-frames
- **0.786**: spawns a $CHART orb
- **1.0** (swing high): triggers a pre-configured OCO above/below

Once touched, the buff is consumed; the platform stays drawn but loses its glow. This turns fib analysis into a **stratified loot map** — the player physically runs the retrace and harvests each level.

**Strategic wrinkle:** Fibs that hit 0.618 before 1.0 pay a **"golden rejection" bonus** (+300 score). This mirrors the real trader intuition that the 0.618 is the "make-or-break" retrace level — the game gives you the dopamine for noticing it.

**SDK:** `sdk.fibRetrace({ hi, lo })` → seven price-alert handles. Each fires a distinct event that abilities subscribe to.

---

## 6. Fib Extension — "Target Call"

**TV purpose:** Levels beyond 1.0 (1.272, 1.414, 1.618, 2.0, 2.618) projecting where price might go after a retrace completes.

**Game mechanic:** **Call-your-shot**. The player draws a 3-point fib (p0, p1, p2 — swing, retrace, then extend), and ghost target reticles appear at each extension level. If price reaches the target within an expiry window, massive score + $RUN reward scaling with tier: 1.272 pays 100 $RUN, 1.618 pays 300, 2.618 pays 1000. Miss → no penalty.

**Strategic wrinkle:** Pure upside-bet mechanic. This is the **high-conviction projection ability** — you're telling the game "I think price moves to 1.618× the retrace". It's risk-free dopamine for being right about measured moves, which is the single most replicable edge a new trader learns.

**SDK:** `sdk.fibExt({ p0, p1, p2, expiresIn })` → list of `{ level, price, onHit }`. Hit callbacks fire the reward; misses silently decay.

---

## 7. Bar Pattern — "Rune Scanner"

**TV purpose:** Highlights candles that match a named pattern (pin bar, engulfing, inside bar, doji, three white soldiers).

**Game mechanic:** A **scanner ability** that sweeps the last N candles and stamps matching ones with pattern **runes**. Runes are pickups — the player physically walks over them to collect, gaining **charge refills** tied to the pattern's implied direction:

- **Pin bar**: +1 Hedge charge (reversal signal)
- **Engulfing**: +1 Bracket charge (momentum)
- **Inside bar**: +1 Ladder charge (compression = DCA setup)
- **Doji**: +1 Radar charge (indecision = need more info)
- **Three white soldiers**: +1 OCO charge (trend continuation)

**Strategic wrinkle:** The scanner is a **resource refill mechanism tied to chart structure**. Unlike the pickup-drop RNG in the existing $RUN loop, this loop is earned by *reading the chart*. It's the single most on-theme ability of the eleven — it literally rewards pattern recognition.

**SDK:** `sdk.scanPatterns({ lookback, patterns })` → returns `[{ candleIndex, pattern, strength }]`. Rune placement is a pure visual effect; the SDK emits a `rune.spawn` event that the chart host listens to.

---

## 8. Anchored VWAP — "Anchor Line"

**TV purpose:** Volume-weighted average price anchored to a specific candle (session open, breakout bar, news event).

**Game mechanic:** A **dynamic tether line** starting from the anchor candle and curving through price space weighted by volume. The player's avatar can **hook onto the VWAP** — hold a key and they're magnetically drawn to it, running along its curve like a railway. Above VWAP means price is distributing, below means accumulating.

**Strategic wrinkle:** Any bracket placed on the **right side of VWAP** (buy below, sell above) gets a size multiplier equal to `1 + |z|/3` where `z` is the distance in standard deviations. Fading a 2σ deviation pays 1.67× size; fading 3σ pays 2×. This teaches **mean reversion sizing**: bet bigger when the tether is stretched.

The anchor point matters enormously — anchoring to the session open is mean-reversion; anchoring to a breakout bar turns the VWAP into a trend-following trail.

**SDK:** `sdk.anchoredVWAP({ anchorCandle })` → a callable `.priceAt(candle)` and `.deviation(candle, price)`. Bracket internally calls `.deviation()` to compute the size multiplier.

---

## 9. Fixed Range Volume Profile — "Liquidity Map"

**TV purpose:** Horizontal volume histogram across a defined price range, showing HVN (high-volume nodes) and LVN (low-volume nodes) and the POC (point of control).

**Game mechanic:** A **heatmap column pinned to the right edge of the selected range**. HVNs render as bright platforms — the player can stand on them for $RUN income ticks (liquidity yield). LVNs render as **gap tunnels** — walking through them grants a short speed boost, because "price moves fast through low-volume areas".

**Strategic wrinkle:** Brackets placed at **HVN levels** fill at 2× reward on hit (deep liquidity = real fills, real execution). Brackets at LVN fill with **1.5× speed** (fast moves through the gap) but at 0.7× size (thin books, partial fills). The tool forces the player to trade-off *where they can size big* versus *where they can move fast* — which is exactly what a real VP reader does.

The **POC** (the thickest volume bar) is visualized as a **gold rail** — standing on it pays the highest income tick. Losing the POC (price breaks through) triggers a cascade event: all nearby brackets auto-trail to the nearest lower HVN.

**SDK:** `sdk.volumeProfile({ rangeStart, rangeEnd })` → `{ buckets: [{price, volume, isHVN, isLVN}], poc }`.

---

## 10. Price Range — "Territory Box"

**TV purpose:** A rectangle spanning a price range, displaying high, low, midline, absolute change, percent change.

**Game mechanic:** **Claim territory**. Draw a box — it shows hi/mid/lo rails and the percentage range. Any pickups that spawn inside the box are **1.5×** during the box's active lifetime. The player can set the box to auto-dissolve on breakout (standard range play) or to persist permanently (level marker).

**Strategic wrinkle:** While inside the box, brackets placed get a **fee discount** (lower $CHART cost) — the game's expression of "tight ranges are cheap to trade, wide ranges expensive". When price breaks out, all active brackets inside the box **auto-trail their SL to the box midline** — a forced "move stop to entry on breakout" hygiene nudge. The breakout itself pays a bonus proportional to how long price stayed inside (patience reward).

**SDK:** `sdk.priceRange({ hi, lo, anchorCandle })` → emits `inside`, `breakoutUp`, `breakoutDown`, with a `.livedFor()` accessor for the dwell-time bonus.

---

## 11. Date Range — "Session Window"

**TV purpose:** A rectangle bounded by two time points, showing duration, candle count, volume traded, percent move over the window.

**Game mechanic:** A **self-imposed challenge window**. The player defines a date range and commits to a goal — "+2% P&L before this window closes" or "Sharpe > 1.0" or "no losses during this window". Inside the window, scoring rules change — a **session modifier** is in effect (2× score on win, -50% on loss, combat disabled, or reversed controls, depending on the difficulty the player picks).

**Strategic wrinkle:** This is the **public-commitment tool**. Committing a Date Range **publishes the goal to the L3 terminal / Telegram bot in real time** — a pre-announced intent that the game judges at exit. Hit the goal → whole-run score multiplier for the rest of the session (+10% per successful window, stackable). Miss → the window silently closes, no penalty, just no reward.

This is the self-accountability ability. It maps directly onto the `guardian.py` mental model — declare an intent, let the system hold you to it.

**SDK:** `sdk.dateRange({ startCandle, endCandle, constraint })` → evaluates at end-of-window and emits `window.resolved` with `{ passed, actualStat }`.

---

## Slot economy — what to ship first

The eleven tools split cleanly into three classes:

**Pure overlays (no slot needed)** — Horizontal line, Horizontal ray, Vertical line, Parallel channel, Price range, Date range. These live in a new "Tools" section of the menu drawer or behind a right-click chart menu. No hotkey conflict with slots 1–8. **Ship first**: Horizontal line, because every trader draws S/R and it unlocks the tripwire+bracket chain (the single highest-leverage gameplay loop).

**Resource-generating tools** — Bar pattern (Rune Scanner), Anchored VWAP, Fixed range volume profile. These need slots because they're **active abilities** not passive overlays. Candidates for a second row `Q W E` (to match TradingView-style left-hand chord). **Ship second**: Rune Scanner — it directly fixes the v0.8+ "abilities never run out, shop lost its purpose" hole by tying charge refills to chart reading.

**Prediction / commitment tools** — Fib retracement, Fib extension, Date range session window. These are the **depth-of-play tools** — not needed for first-60-seconds legibility (Phase 0 north star), but they're what turns a 2-minute run into a 20-minute one. **Ship third**: Fib retracement, because the staircase mechanic is pure juice — seven tiers of reward with the 0.618 as the legend moment.

## Phase-1 crossover

All eleven tools route through `ChartRunnerSDK`, so the Phase 1 pull-over (drop the game UI on top of Dexscreener / TradingView) keeps working: the SDK emits the events, the host chart renders the tool. A real TV account would see its native horizontal line; a Dexscreener host would see the ChartRunner overlay. The game layer becomes a **reward-and-feedback skin** over any chart that emits OHLCV candles.
