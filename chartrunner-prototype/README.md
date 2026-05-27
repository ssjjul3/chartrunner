# ChartRunner — Playable Prototype (v0.8k#24j)

**Fortnite meets Space Invaders meets a trading chart.** A single-file canvas game where you run on real Binance candles, drop into the upside-down to fight bears, and every ability is a real trading primitive.

**Play:** open `index.html` in any modern desktop browser — no build, no install, no wallet.

## Controls

### Movement — on foot

- **← / →** — walk (no auto-run)
- **← ←** / **→ →** — dash / speed boost
- **↑** — jump · **↑↑** — enter flight · **F** — toggle flight
- **↓↓** — enter upside-down · **F** or **↓↓** again — surface
- In flight: all four arrows move freely

### Movement — on a vehicle

- **V** — tap to mount / dismount. **Hold V** (>320ms) — open vehicle picker.
- **↑↑** — hop to the next grind line above (trail · trendline · indicator · HLine · VWAP)
- **↑↑↑** — launch into flight from the current line
- **↓↓** — hop to the next grind line below
- Vehicles auto-snap to nearby grindable surfaces.

### Combat (Monster Mode)

- **Space** — shoot (gun on ground, laser in flight)

### Trading abilities

| Key | Tool |
|---|---|
| **1** | Trails (toggle run trail overlay) |
| **2** | Laser (aim mode — click chart to open spawn menu. HLine / VWAP drop at the click; Ladder / Fib Ladder / Bracket / OCO arm a two-anchor placement: click two candles to set the tool's dimensions) |
| **3** | OCO (upper + lower one-cancels-other at player position — laser-click for price-anchored) |

**v0.8k#24j — two-anchor placement for Ladder / Fib Ladder / Bracket / OCO.** Picking one of these from the laser menu now arms a two-click anchor phase instead of dropping at the menu-open price. Click the first candle anchor (snaps to wick-high / wick-low / body-top / body-bottom within 14 px) — a green dot lands. Click the second anchor — the tool is committed with side and dimensions inferred from the anchor pair. While anchor2 is being placed, a dashed ghost preview shows where the tool will actually land (Bracket: entry / TP / SL lines; Ladder: 5 evenly-spaced lines; Fib: 5 fib-level lines; OCO: upper + lower). Esc during the anchor phase cancels back to the menu-driven default without leaving laser aim. HLine and VWAP stay single-click — they're one-price primitives.

**v0.8k#24h — tools never disappear on their own.** The laser-menu overlays (Ladder, Fib Ladder, Bracket, OCO, HLine, VWAP) used to silently vanish when any underlying SDK order filled or cancelled — the `_pruneVisualsForOrderId` path. For a laser-dropped ladder placed near market, the first tick would fill the nearest rung and the whole visual would evaporate the moment the laser closed. The prune is gone. Fill and cancel events still log and still credit $CHART + score, but they don't touch the overlay arrays. Bracket overlays also no longer dim after TP/SL resolves — the outcome recolor (win green / loss red) is information and stays; the alpha drop was just fade and it's been removed. Ladders, OCOs, brackets, HLines, and VWAPs are now persistent chart tools in the TradingView sense. Only `Del` (on a selected overlay) or `R` (restart) remove them.

**v0.8k#24g — OCO joins the laser menu.** The laser click-menu (press **2**, click the chart) now has a **⇅ OCO here** entry alongside HLine / VWAP / Ladder / Fib Ladder / Bracket. Clicking it drops a one-cancels-other pair centered on the clicked price — upper/lower offsets are symmetric and scaled by `tfVolScale()` so the pair feels proportional on 15m vs. 1d. Hotkey **3** still fires an OCO at the player's current position. The laser path is the price-anchored variant.

**v0.8k#24f — Tools persist past laser, mirror across the upside-down, double-click to tune.** Placed Ladders / Fib Ladders / Brackets / OCOs / HLines / VWAPs stay on the chart after the laser aim closes (they already did — #24f formalizes it). Every overlay now remembers which world it was placed from; when the viewer switches sides (upper ↔ upside-down), opposite-world tools render as dimmed dashed phantoms so you can always see what the other side set up. Vehicle-ride still honors the world flip — riding in upside-down renders the avatar 180°-mirrored as expected. Double-click a placed Bracket or Ladder overlay to reopen its editor seeded with the current values; double-click any other overlay for a quick hint toast (drag / Del work the same as before).

**v0.8k#24e — Rune Scan moved to Strategies dropdown.** The Rune hotkey (old key 4) is retired. Rune Scan now lives in the **Strategies** topbar dropdown — open it, click `🔮 Rune Scan (SCAN)` to sample the visible candle window for swing highs/lows and drop persistent 🔮 markers on the chart. The active strategy isn't touched. The Rune button was also removed from the laser spawn menu — Strategies is now the single entry point.

**v0.8k#24d hotbar trim.** Ladder, Fib Ladder, and Bracket were unbound from hotkeys — they all drop from the Laser click-menu (press **2**, click the chart, pick a primitive). The 320ms hold-3 bracket editor is retired; to tweak R:R / risk / side on a placed bracket, double-click the bracket overlay.

**Double-click any ability slot** in the HUD to open its editor. Trails → materialize. Abilities without a dedicated editor fall back to `use()`. Single click still fires the default use().

**Double-click any indicator slot** (Menu → Indicators) to open a per-indicator editor. SMA / EMA period, Ichimoku tenkan/kijun/senkouB, VRVP buckets + width, RSI period, Stoch RSI period + window, Volume height % + opacity, Fear/Greed rsi period + volatility window — each is tunable and persists across reloads. The slot label updates to show the current value (e.g. "SMA (50)"). Reset defaults button clears the override.

**What's new in v0.8k#24b — oscillator sub-panel + Fear/Greed gauge.** RSI, Stoch RSI and OBV now render as a proper sub-panel at the bottom of the chart (TradingView-style), not tiny corner text that blended into the topbar. The panel has 30/70/50 guide lines, per-indicator colored line plots, and a live legend reading `RSI(14) 67.3` · `SRSI(14) 82.1` · `OBV 1.2M`. Fear/Greed is now a prominent 176×52px top-left gauge with a big numeric score, sentiment label (Extreme Fear / Fear / Neutral / Greed / Extreme Greed), and a color-coded filled bar (red → orange → yellow → blue → green).

**Bracket editor** (double-click a placed bracket overlay):
- **1 / 2 / 3** — pick R:R (1:1 / 1:2 / 1:3) · **4** — Custom / Precise input
- **↑ / ↓** — shift entry price · **E** — precise input panel
- **Enter** — place · **Esc** — cancel

**Laser aim** (press **2**): avatar freezes, chart arms for spawn clicks. Single-click opens a **HLine · VWAP · Ladder · Fib Ladder · Bracket · OCO · Cancel** menu at the click's price. Press **2** or **Esc** to exit. Bracket drops as a 1:2 BUY with risk 20 / slDistance 60 — shadow-gate-aware, mission+tutorial-aware. For R:R / precise entry tuning, double-click the placed bracket overlay. Rune Scan isn't in the laser menu — it lives in the Strategies dropdown.

**HLine / VWAP / Fib ladder body**: click + drag to translate in 2D. Ladder body grip sits on the left edge (orange tick for Fib). **Delete** (when selected) removes it.

### Other

- **M** — menu drawer (wallet · skins · perspective · run · shop · stats · vehicles · replay tutorial · L3 terminal · chart background)
- **B** — $CHART shop (charges, $CHART → $RUN exchange). Esc closes.
- **Tab** — SDK drawer (event log · API · capabilities · tokenomics)
- **Esc** — skip tutorial · exit laser aim · close menus
- **R** — restart
- **Delete** — remove the currently-selected overlay
- **Menu → Open L3 terminal** — Phase 2 "Eye" preview drawer

## Three avatar states

| Mode | Entered by | Physics |
|---|---|---|
| **Runner** | Default | Gravity, walks on candle tops, jumps |
| **Flight** | Double-tap ↑ (or F) | No gravity, 4-way free movement |
| **Upside-Down** | Double-tap ↓ | Same physics, flipped, hostile shadow chart with monsters |

## Perspective modes

| Mode | Behaviour |
|---|---|
| **Linear** | Constant pixels per dollar. |
| **Logarithmic** | Pixels spaced by log(price). Equal percent moves take equal screen distance. |
| **Auto-zoom** | Each frame, fits visible candles + player into ~72% of viewport. |

## Bracket flow (v0.8k#24d)

1. **Drop:** press **2** → click the chart at the price you want → pick **🎯 Bracket here**. Instant 1:2 BUY with risk 20 / slDistance 60 at the clicked price.
2. **Tune:** double-click the placed bracket overlay → R:R picker opens. Ghost bracket appears with dashed Entry / TP / SL lines.
3. Pick preset (mouse or **1** / **2** / **3** / **4**).
4. Fine-tune: **↑ / ↓** nudges entry · **Flip side** button · **E** for precise input (Side · Entry · SL distance · R:R · Risk).
5. **Enter** → new parameters apply, ghost becomes the solid overlay.

All shadow-gate telemetry (`fireShadowBracket`) and mission/tutorial hooks fire from the laser drop path — the old hotbar path is gone, but nothing downstream of the SDK changed.

## What's real vs. mocked

**Real:** Binance klines (1m → 1M, 15 intervals), candle rendering, game loop, physics for all three avatar modes + the vehicle ride/grind system, perspective math (Lin / Log / Auto), SDK event model + capabilities flag, every order primitive wired (Ladder · Fib Ladder · Bracket · OCO · HLine · VWAP · Trails · Rune — six of them via the Laser menu since #24d), HLine + Anchored VWAP drag/ride/delete, Fib Ladder rung scaling, laser aim + click-spawn menu, overlay hit-testing + per-endpoint drag handles, bracket editor math, Monster Mode combat (spawn / chase / collide / HP / kill rewards — trails and trendlines act as walls), missions, tutorial, particles / floats / hit-stop / banners / confetti, L3 Terminal event stream.

**Mocked:** wallet, Solana transactions, on-chain fills. The `ChartRunnerSDK` surface is shaped to plug a real DEX adapter behind it.

**Not present yet:** WebSocket live candles, mobile touch controls, signed run summaries, leaderboards, symbol picker, per-asset P&L tracking.

## Architecture

`ChartRunnerSDK` is framework-free and decoupled from rendering — it would lift cleanly into an npm package. The bracket editor, mission system, tutorial, and perspective system all sit on top of the SDK and the chart: pure UI / view code that doesn't touch the SDK contract, so swapping a real execution backend or a different chart source requires no changes to either.

Combat is isolated — `updateCombat(dt)` only runs in Monster Mode and clears state on exit. Particles + floating numbers have their own tick (`updateFxOnly`) so they keep animating cleanly during hit-stops.

## Roadmap

**Phase 0** — *shipped at v0.8k#23* — Playable first oneshot. TradingView-native topbar, first-class chart tools, vehicle ride/grind, no-fade overlay discipline.

**Phase 1** — *next* — SDK pull-over layer. Drop the game UI on top of Dexscreener / TradingView / any chart host.

**Phase 2** — *later* — Standalone dApp with wallet connect, live Solana trades through the same SDK contract.

## Credits

Single-file prototype, vanilla JS, no dependencies. Procedurally drawn. Candles fetched live from the public Binance REST API on load.
