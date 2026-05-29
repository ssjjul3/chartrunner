# M15 — Lightweight Charts hybrid + bloat reduction

**Status:** 🟢 BONUS · 0/8 (added 2026-05-28)
**Theme:** Adopt **TradingView Lightweight Charts** as the price-rendering foundation, render ChartRunner's game layer (avatar, abilities, particles, monsters) on a **transparent overlay canvas** on top, and use the split to break the 3 MB `ChartRunner_Prototype.html` monolith into modular files. Closes the Chart-Type-selector + Object-Tree gaps surfaced in the 2026-05-28 Grok session and aligns ChartRunner aesthetics with DexScreener / TradingView for the chart layer while preserving the unique game layer.

> **Cross-milestone notes:**
>
> - **PAIRS WITH [[M2.5-sdk-extraction]]** — M2.5 already splits `src/core/`. M15 lets that split use Lightweight Charts as the price-engine module instead of re-implementing a candle renderer. The two milestones are best landed together — M2.5 builds the file structure, M15 fills in the chart engine.
> - **CLOSES TRADINGVIEW PARITY GAPS** — Chart-type selector (line / area / candle / heikin-ashi / hollow / OHLC / baseline / histogram), zoom-to-fit, crosshair, volume pane, fit-content controls. All standard in Lightweight Charts; today re-built poorly in the monolith.
> - **ENABLES OBJECT TREE / LAYER MANAGER** — once chart objects live in the chart engine (separate from game world objects), an Object Tree panel that lists "candles · indicators · drawings · game-world entities" becomes feasible.
> - **REPLACES [[project_grok_hybrid_chart_architecture]]** memory — that memory captures the design idea; M15 captures the milestone. After M15 ships, the memory marker shifts from "brainstorm only / unbuilt" to "shipped in M15".

> **Why bonus + not numbered priority:** The current self-contained single-file design (v1.0.125, no CDN deps, fast cold-start) was a deliberate choice. M15 trades cold-start simplicity for code-reuse + tradingview parity — defensible but not free. M2.5 SDK extraction is the more critical path (already on numbered roadmap). M15 hooks into M2.5 once Julian signs off on the external-dependency tradeoff.

## Completion condition (all required)

- [ ] **`src/core/chart-engine.js`** — module that owns Lightweight Charts instance, exposes `setCandles()`, `setTimeframe()`, `setType(linelareacandle|…)`, `subscribeCrosshair()`, `getVisibleRange()`, `pixelToPrice()`, `pixelToTime()`. Built on `lightweight-charts@^4` (CDN-loaded or bundled).
- [ ] **`src/core/game-overlay.js`** — transparent `<canvas>` sitting absolutely-positioned over the Lightweight Charts container. Owns the game-render loop (`requestAnimationFrame`). Receives chart-coordinate→pixel maps from chart-engine on each frame.
- [ ] **`src/core/game-world.js`** — game-state model (avatar position in price/time coords, abilities active, monsters spawned). Pure logic, no DOM. Translates between game-world coords and chart coords via chart-engine helpers.
- [ ] **`src/core/play-guard.js`** — input/state guards (no abilities mid-pause, no ladder before tutorial step N, etc.) extracted from the monolith. Pure logic.
- [ ] **`src/play/my-runs.html`** — new shell page that loads chart-engine + game-overlay + game-world + play-guard as ES modules. Replaces (or sits alongside) `ChartRunner_Prototype.html` for the run-a-game path.
- [ ] **All standard chart types** — line / area / candle / Heikin-Ashi / hollow-candle / OHLC bars / baseline / histogram. Toggle in the chart settings panel. (Lightweight Charts ships these natively — the work is just wiring the selector UI.)
- [ ] **Object Tree / Layer Manager panel** — sidebar listing every layer: candles · indicators (MA / VWAP / RSI panes) · drawings (trendlines / fibs) · game-world entities (avatar / abilities / monsters / pickups). Per-row visibility toggle + ordering.
- [ ] **Old monolith preserved + flag-gated** — `ChartRunner_Prototype.html` stays in tree as `chartrunner-prototype/legacy-monolith.html`; `?engine=legacy` query param keeps the old path runnable until M15 reaches parity. Avoids a hard cutover.

## Imminent-solvables

### Ready bucket

- [ ] `[D]` **Spike: load Lightweight Charts in a side page** — `src/play/spike-lwc.html` with a CDN-loaded LWC instance + a transparent overlay canvas + a single bouncing dot whose Y is mapped to price via `priceToCoordinate()`. Proves the coordinate bridge works. Smallest possible "Hello World" milestone.
- [ ] `[D]` **Coordinate-bridge module** — formalize the spike into `src/core/chart-engine.js` with the public API listed above. Pure module, no game logic.
- [ ] `[D]` **Game-overlay loop port** — extract the `requestAnimationFrame` render loop + avatar physics out of `ChartRunner_Prototype.html` into `game-overlay.js`. Smallest viable port: avatar runs across candles, no abilities yet.
- [ ] `[D]` **Ability port — one at a time** — port `bracket` first (simplest), then `ladder`, `OCO`, `hedge`, `radar`, `rescue`. Each is a separate solvable. Cumulative ability inventory in `game-world.js`.
- [ ] `[D]` **Monster port + collision** — port the bear / upside-down world monsters. Collision detection uses chart-coordinate bounding boxes via chart-engine helpers.
- [ ] `[D]` **Chart-type selector UI** — dropdown wired to `chart-engine.setType(…)`. Lightweight Charts handles the rendering swap.
- [ ] `[D]` **Object Tree panel skeleton** — collapsible tree component listing the layers. Visibility toggles wired to chart-engine + game-overlay.
- [ ] `[D]` **Indicator panes (MA + VWAP)** — Lightweight Charts supports separate panes; expose toggle in chart settings.
- [ ] `[O]` **Bloat reduction audit** — line-count + load-time comparison of `ChartRunner_Prototype.html` (3 MB single-file) vs. `src/play/my-runs.html` + modular `src/core/`. Document delta in `docs/architecture/M15-bloat-reduction.md`.
- [ ] `[O]` **Cold-start benchmark** — measure TTI (time-to-interactive) for both paths. Lightweight Charts CDN load is the obvious tradeoff cost; quantify it.
- [ ] `[D]` **`?engine=legacy` flag wiring** — both shells live in tree; query param routes the play link. Easy revert path during cutover.
- [ ] `[D]` **Drawing tools (trendline, fib retracement)** — Lightweight Charts plugins exist for these; survey + pick one. **BLOCKED:** chart-engine module + Object Tree panel both ready.

### Blocked bucket

- [ ] `[D]` **Cut over default play link to `my-runs.html`** — `chartrunner.xyz/play` points at the new engine. **BLOCKED:** ability port + monster port + ≥1 week of testing against the legacy path.
- [ ] `[D]` **Delete `legacy-monolith.html`** — only after the new engine reaches feature parity + 4 weeks of stable production traffic. **BLOCKED:** cutover above.
- [ ] `[D]` **Bot SDK wiring through chart-engine** — `window.ChartRunner.chart` exposes chart-engine read APIs (`getVisibleRange`, `priceToCoordinate`) for bots to reason about chart state. **BLOCKED:** [[M14-bot-first-runtime]] dependency — useful for bots that want to "draw their reasoning on the chart".

### Done bucket

(empty — newly added 2026-05-28)

## State

- Progress: 0/8 completion conditions
- Blockers active: 2 (cutover blocked on feature-parity, monolith delete blocked on cutover)
- Scheduled today: 0

## Notes

### Why hybrid (chart engine + game overlay) instead of "just keep the monolith"

The current monolith re-implements its own candle renderer in ~1.5–2k lines of canvas drawing code. Lightweight Charts does the same job in a battle-tested, well-documented, 50KB library that DexScreener / TradingView / dozens of trading UIs already use. The trade is:

- **Lose:** self-contained single-file simplicity, zero-dep cold-start, exact pixel control over candle rendering.
- **Gain:** professional-grade chart engine (every chart type, every indicator pane, every drawing tool, every interaction), cleaner separation of concerns (chart ≠ game ≠ on-chain), much easier to maintain, aligns ChartRunner aesthetics with what serious traders are used to seeing.

The 2026-05-28 Grok session framed this as a *bloat reduction* play. It's that — but more importantly it's an *expertise reuse* play. ChartRunner's unique value is the game layer (abilities, monsters, score mechanics, on-chain provenance). The chart layer is undifferentiated table-stakes. Reusing TradingView's price-engine lets the team focus 100% of chart-layer effort on the game-layer differentiator.

### Why the Object Tree / Layer Manager matters

A persistent ask from Julian: *"want an Object Tree like in a 3D modeling tool"*. The current monolith makes this impossible — chart objects, indicators, drawings, and game entities all share the same canvas with no scene graph. M15's split *requires* a scene-graph-like layer registry (chart-engine knows its layers, game-overlay knows its layers), which makes the Object Tree panel a natural by-product.

### Cross-milestone dependencies

- **M2.5 SDK extraction** — already in flight; M15 plugs into its file structure. Best landed together.
- **M14 Bot-first runtime** — `window.ChartRunner.chart` exposing chart-engine read APIs lets bots use chart state in their reasoning. Not blocking; nice composition.
- **M11 Umbrel-native toolset** — Scanner + Chart tabs in the Umbrel-hosted quant toolset can use the same chart-engine module. Single canonical chart-engine across both surfaces.

### Sources

Grok session 2026-05-28 (`grok.com/share/c2hhcmQt…df1e785b…`) — Julian's prompts: *"we need to avoid bloat"* / *"tradingview lightweight charts integration"* / *"single large HTML file - what should we do about that"* / *"all chart types matter"* / *"object tree / layer manager"*.

Memory: [[project_grok_hybrid_chart_architecture]] — the design idea captured before this milestone existed.

Important: Grok claimed in that session to have *built* the modular split (`src/core/chart-engine.js`, `game-overlay.js`, `game-world.js`, `play-guard.js`, `src/play/my-runs.html`). **None of those files exist** — verified 2026-05-28 across vault and `~/projects/chartrunner`. The milestone above captures the actual product direction; the work is **unbuilt**. See `feedback_grok_output_unverified`.
