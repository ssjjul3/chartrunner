# ChartRunner — v0.6 Backlog

*Derived from a second pass over the original brainstorm (GDD DE/EN, 30-day plan, tokenomics addendum, tools deck, Solana pitch v2) compared against v0.5 shipped, plus a look at what comparable indie games did to become sticky.*

---

## Part 1 — Gap analysis: brainstorm vs. v0.5 shipped

The brainstorm describes a substantially larger design than what is in the prototype. Much of the gap is deliberate (Phase 1/2 material), but a surprising amount is **Phase 0-compatible** — we just haven't built it yet.

### Movement & world-building tools — big gap

| Brainstorm tool | Shipped? | Notes |
|---|---|---|
| Run on trendlines / MAs as platforms | ❌ | Today the player runs on candle tops. The "build a trendline, run on it" mechanic is the biggest missing core idea. |
| MA(20) / MA(50) indicator overlay | ❌ | Not even drawn passively. Cheap precursor to Skateboard. |
| VWAP anchor | ❌ | Not drawn, no gravity effect. |
| Sniper Scope (zoom / lookahead) | ❌ | Chart is fixed at the current window. |
| Skateboard on MAs | ❌ | No MA yet → no skate yet. |
| Bid as Shovel (plant stables underground) | partially | We have bracket, but no "plant and wait" limit-order visual. |
| Ask as Balloon (TP in the sky) | partially | Bracket draws a TP line; not an in-world object. |
| Ice Bridge | ❌ | Not built. |
| Teleport Beacons | ❌ | Not built. |
| Trail Painter (leave synthetic MA) | ❌ | Not built. |
| Time Dilation Bubble | ❌ | Not built. |
| Auto-Cut (walk back → close positions) | ❌ | Not built. The Rescue ability is adjacent but different. |
| Glider (above price) | ✅ | Shipped as Flight mode. |
| Flippers (below price) | ✅ | Shipped as Upside-Down. |
| Fireballs / demolition | ❌ | No structure destruction because no buildable structures. |

### Game-theory backbone — largely missing

| Brainstorm concept | Shipped? | Notes |
|---|---|---|
| Sharpe-ELO scoring (risk-adjusted) | ❌ | We display a raw `score`. The brainstorm explicitly wants risk-adjusted so "YOLO" is not dominant. |
| Commit-reveal for orders | ❌ | Irrelevant until PvP, but worth knowing. |
| ATR danger bands on chart | ❌ | Visible volatility zones is a brainstorm pillar. |
| Deterministic 250–600ms input window | ❌ | Nothing enforces it. |
| Heat / Focus resource (caps spam) | ❌ | We use per-ability cooldowns only. |
| Liquidity radar as **passive** HUD | partially | We have it as an ability, not as a passive heatmap overlay. |

### Progression / meta — absent

- Skill trees (Execution / Analysis / Mobility / Disruption) — not present.
- Indicator Fusion (craft indicators from basic blocks) — not present.
- Bot building (Sensor → Operator → Actuator) — not present.
- Ghost replay of optimal play — not present.
- Season pass quest chains — not present.
- Soulbound mastery badges — not present.

### Tokenomics — placeholder only

We display TICK and Creds in the menu drawer. Nothing behind them. The addendum specifies sinks, emissions, veTICK, buybacks, gauge voting — all of that is Phase 2, but **right now the numbers don't even change**. Simple fix for v0.6: actually award TICK on kill/pickup and Creds on mission completion with a visible running total (we do award — so verify it's working and visible in the drawer).

### Modes — missing

- Closed arena with synthetic GBM price feed — the 30-day plan's first shipping surface. We ship only live Binance data.
- PvP with escrow — Phase 2.
- Backtesting with uploaded OHLCV — Phase 2.
- Daily Challenge (seeded historical sequence) — **big retention lever, easy to build.** Not in the brainstorm explicitly, but sits right on top of `mulberry32`.

### UX features — several are quick wins

- **Desktop-style launcher** ("fake OS" with Wallet / DEX / Missions / Marketplace as windows). The menu drawer is a lighter version of this. Full launcher is Phase 1/2.
- **Latency meter** — brainstorm explicitly lists it. One line of code.
- **PnL / Δ / Exposure HUD** — the v0.6 list in the README already calls this out. We track score, not P&L against price.
- **Color-blind palette** — brainstorm pillar. Two palette presets in the menu drawer.
- **Streamer overlay** — nice to have much later.

---

## Part 2 — What comparable indie games teach us

ChartRunner is its own genre, but there are transferable lessons from games that solved adjacent problems.

### Geometry Dash / Celeste — *instant-retry platformers*

Lesson: **R → back in the action in under 200ms**. Our restart is already fast; preserve it through every new feature. The moment a menu appears on death, retention drops. Also: **every input produces a visible particle**. Our juice pass got most of this.

### Vampire Survivors — *passive auto-fire with deep ability fusion*

Lesson: **ability fusion is the late-game hook**. The brainstorm's "Indicator Fusion" is exactly this. A first pass: let the player fuse *Bracket + Radar* into "SmartBracket" (auto-picks side from radar signal) once they've used both N times. No NFTs, no chain — just an unlock.

### Risk of Rain 2 — *stack items, break the game*

Lesson: **scaling chaos is the endgame**. Monster spawn density should ramp as the run progresses. Right now combat intensity is roughly constant. Tie spawn rate to a `difficulty` clock.

### Hades — *narrative progression between runs*

Lesson: **between-run meta matters**. Our menu drawer is strictly functional. A single line of flavor text that rotates ("The bears grow restless.") between runs costs nothing and makes the world feel inhabited.

### Spelunky 2 / Noita — *daily seeded runs*

Lesson: **daily challenge is the single highest-leverage retention mechanic** for a roguelite. One seed, one symbol, one timeframe, shared by everyone that day. We already have deterministic `mulberry32`. This is a ~200-line addition.

### Crypt of the Necrodancer — *action synced to the beat*

Lesson: **candle close is our beat**. Each completed candle could emit a pulse — screen tint, HUD flash, a sound. Abilities fired on the beat get a small bonus. This turns the chart into a rhythm instrument.

### N++ / Celeste — *pure physics feel*

Lesson: **coyote time, jump buffering, dash telegraph**. Phase 0 plan item #7 already lists these. Still outstanding.

### Wordle — *one puzzle, one day, shareable result*

Lesson: **shareable run summaries drive virality**. A run ends, the player gets a tiny grid-art card `CR 2026-04-19  ▲▲▼▲  $3,420  3✕ bears  Bracket 1:2`. Copy to clipboard, share anywhere. No account, no chain. Costs little, payoff is large.

### Balatro — *trading-card roguelite, same "numbers go up" feeling*

Lesson: **a scoring formula the player can reverse-engineer**. Right now our score is opaque. Show the components live: `base + combo × risk_adj – dmg`. Learnability = retention.

### Twin-stick shooters (Geometry Wars, Nex Machina) — *escalating wave pressure*

Lesson: **waves have a shape**. A run should have calm-build-crisis-release beats, not constant chaos. Currently we're flat-intensity.

---

## Part 3 — Ranked v0.6 backlog

Ordered by **impact × ease × Phase 0 compatibility**. Items 1–6 are the critical path for "v0.6 ship"; 7–15 are polish and groundwork. Items 16+ explicitly defer to Phase 1/2.

Legend: **I** = impact (1–5), **E** = ease (1–5, higher = easier), **P** = Phase 0 compatible (✓/✗).

### Ship-list for v0.6

1. **Real P&L on the HUD** (I 5, E 4, P ✓)
   Track each bracket's unrealized P&L against live price; aggregate into `unrealized` + `realized`. Display next to score. Already on the README v0.6 list. Turns the score from arbitrary into meaningful.

2. **Sharpe-adjusted score** (I 4, E 4, P ✓)
   `scoreFinal = realizedPnL × (realizedPnL / max(stdev(frameReturns), 1))`. Rebalances the leaderboard so risk matters. No UI change required beyond showing the formula.

3. **Daily Challenge mode** (I 5, E 3, P ✓)
   Seed = hash of YYYY-MM-DD. Fixed symbol + timeframe. One attempt per day (soft-enforced — no storage). Menu drawer button "Daily: SOL/USDT 1h — 2026-04-19". Players come back daily. Shareable result card (see #8) piggybacks on this.

4. **ATR danger bands** (I 4, E 4, P ✓)
   Rolling ATR over last N candles, drawn as two semi-transparent horizontal bands above and below the current candle. Readable volatility → more intuitive bracket sizing. No gameplay change, just visual.

5. **MA(20) overlay + Skateboard-lite** (I 5, E 3, P ✓)
   First pass of the "run on indicators" vision. Draw MA(20) as a smoothed line across visible candles. When the player is within ±8px of the line, they attach to it (skate mode) with reduced friction and a combo bonus. Monetary cost: about 150 lines. Unlocks the whole "traversable indicators" direction.

6. **Shareable run summary card** (I 4, E 4, P ✓)
   On game-over, generate a 9-cell glyph summary: timeframe, duration, kills, best bracket, final P&L. Copy-to-clipboard button. Wordle-style. Viral mechanic at basically zero cost.

### Polish / groundwork

7. **Candle-close pulse + procedural sound** (I 3, E 3, P ✓)
   On every new candle closing, emit a screen tint pulse and a short tone. Uses Web Audio API directly (no Tone.js, no dep). Turns the chart into a rhythm surface — necessary groundwork for the brainstorm's beat mechanics.

8. **Physics pass — coyote time, jump buffer, dash telegraph** (I 3, E 4, P ✓)
   Outstanding from Phase 0 plan item #7. ~50 lines. Noticeable game-feel improvement.

9. **Heat bar (ability spam limit)** (I 3, E 4, P ✓)
   Single HUD bar. Each ability fire adds heat; passive cooldown; overheating disables abilities for 2s with visible cooldown. Replaces per-ability cooldowns for most abilities. Cleaner than stacking 6 radial timers.

10. **Auto-Cut mode** (I 3, E 3, P ✓)
    Hold Shift + ← → walking backward closes each bracket you pass over. Matches the original "run back to close" brainstorm exactly. Fits nicely with tap-hold discipline.

11. **WebSocket live candles** (I 4, E 3, P ✓)
    Stream the newest kline so the right-most candle updates in real time. Players see their entries fill against the live market. Big presence upgrade. README v0.6 list.

12. **Trendline drawing (first build tool)** (I 5, E 2, P ✓)
    The flagship missing mechanic. Click-drag between two candles places a trendline as a runnable surface with durability = ATR-scaled lifetime. Big implementation cost (chart-interaction mode + collision + durability model). Worth it — turns ChartRunner from "side-scroller" into "build-and-traverse".

13. **Symbol picker** (I 3, E 5, P ✓)
    Dropdown in menu drawer with SOL, ETH, BTC + any user-typed Binance pair. Five minutes. Large perceived value because players want their bag.

14. **Color-blind palette toggle** (I 2, E 5, P ✓)
    Two palette presets in the menu drawer. Brainstorm pillar, trivial to ship.

15. **Menu-drawer "Lore & Tips" rotator** (I 2, E 5, P ✓)
    Three flavor sentences rotate on open. Tiny atmosphere win.

### Deferred — Phase 1 / Phase 2

These appeared in the brainstorm and the pitch deck but don't belong in Phase 0:

- ChartHost interface extraction (groundwork for Phase 1, track separately)
- AbilityRegistry (groundwork for Phase 1)
- Phantom wallet connect + TICK SPL mint (Phase 2)
- MatchEscrow Anchor program (Phase 2)
- Pyth oracle switch (Phase 2)
- veTICK locking + governance (Phase 2+)
- Indicator Fusion as NFT crafting (Phase 2+)
- Bot building (Sensor→Operator→Actuator) (Phase 2+)
- Full PvP with commit-reveal (Phase 2)
- Creator arenas (Phase 2+)
- Tournaments / leaderboards (needs signed run summaries first — Phase 1)
- Mobile touch controls (Phase 1)
- "Fake OS" launcher (Phase 1+, menu drawer covers it for now)
- zk-attestations for tournament results (Phase 2+)

---

## Part 4 — Suggested order of operations

If we're shipping v0.6 as one pass:

1. **Week 1** — #1 (P&L), #2 (Sharpe), #4 (ATR bands), #8 (physics pass). All additive, no risk. Ships as "v0.6a — readable trading."
2. **Week 2** — #5 (MA overlay + skate), #9 (Heat bar), #10 (Auto-Cut), #7 (candle pulse + sound). Mechanical depth. Ships as "v0.6b — indicator surfaces."
3. **Week 3** — #3 (Daily Challenge), #6 (share card), #11 (WebSocket), #13 (symbol picker), #14 (palette), #15 (lore rotator). Retention + presence. Ships as "v0.6 final."
4. **Week 4 (optional)** — #12 (trendline drawing). This is the big one; if it slips, it becomes v0.7 on its own.

Each sub-ship gets a playtest-bot pass per `references/playtesting.md`.

---

## Part 5 — Reminders that are easy to forget

- Hard rules from `chartrunner-skill/SKILL.md` still apply: single file, no build, no deps (exception: Web Audio API is built-in, not a dep), SDK is the only order issuer, abilities never touch the canvas.
- Every new mission/tutorial step must be **completable on every timeframe** — that invariant is how we caught the soft-lock in v0.5.
- Topbar stays at ≤ 5 elements. New HUD (P&L, Heat, ATR meter) goes **next to** the topbar or integrated into the canvas, not inside it.
- Determinism: the Daily Challenge only works if *every* gameplay-affecting random call routes through the seeded `mulberry32`. Audit before shipping #3.
