# ChartRunner v0.9.x Changelog

Full sweep from v0.9.9 → v0.9.21, all in `ChartRunner_Prototype.html` unless noted. Every version listed is parse-checked green via `node --check` on the extracted inline script body. Some UI changes require the player to reload the deployed page to see them.

The driving theme is **landing all of quant.pdf Tier 1** — a 39-page institutional trading methodology document that lays out an 11-component confluence weighting table, reference-level templates, and pattern detectors. By v0.9.12 the entire Tier 1 set is implementable in standalone (Binance OHLCV only — no live trade tape needed). v0.9.13–v0.9.21 are the polish layer that makes everything discoverable.

---

## v0.9.9 — The Quant Spine

### Reference Levels overlay (`reflevels` indicator)

New toggleable indicator that draws the canonical Igor / quant.pdf level template:

- `dOpen` — today's open (first candle of current UTC day)
- `pdHigh` / `pdLow` / `pdClose` — prior day OHLC
- `pdVAH` / `pdPOC` / `pdVAL` — prior day's value-area high / point-of-control / value-area low (bucketize prior-day volume by typical price into 24 bins, expand from POC outward until 70% of total volume captured)
- `IBH` / `IBL` — initial-balance high/low (first hour of current day)

Per-level checkboxes + opacity slider. Cached on `game._refLevelsCache` keyed by `(last candle ts, asset, timeframe)` so it only recomputes when underlying data changes. Returned object consumed by both the draw function AND `sdk.scoreSetup()`.

### Signal Quality Scoring spine (`sdk.scoreSetup`)

Returns `{score, max:20, components, recommendation}`. Score badge HUD pill top-right shows live confluence with color-coded ring (red <6, green 6–10, gold 11–15, rainbow ≥16) and tier label (WAIT / TRADEABLE / STRONG / PRIME). Click to expand the per-component breakdown; right-third toggles BUY ↔ SELL side. Persists in `cr_score_badge_v1`.

Components covered in this version: HTF trend alignment (+2), reference level proximity (+2), volume node bonus (+1), Class A/B divergence (+2/+1, RSI lookback), Champions Channel (+2, 0.55–0.66 fib retrace of 50-bar swing), consolidation breakout (+2), inline SFP (+2), inline Failed Auction (+2). Hook for player-registered components via `sdk.registerScoreComponent(id, fn)`.

### Workbench Quick Builder

Two no-code panels above the existing Pine textareas in the Workbench Strategy + Indicator views.

**Strategy Quick Builder** — 9 confluence components shown as togglable rows with weight sliders (default-on; weights 0 to max), side picker (Long/Short/Both), min-score slider, risk % slider, R:R slider. "👁 Preview score now" button calls `sdk.scoreSetup()` on the live candle stream and reports the score breakdown for both BUY and SELL sides. "↓ Sync to Pine" button generates a working Pine v5 strategy from the form state. Snapshots persist alongside the Pine code in `wb.strategies[].quick`.

**Indicator Quick Builder** — preset dropdown clones any built-in INDICATORS entry, color picker, per-param sliders matching the per-indicator editor. "👁 Preview on chart now" toggles the indicator on with the tuned params via `INDICATOR_STATE`.

### Real-data Terminal widget binds

`_wbTermBind` extended with these bind keys (all update on the 1s tick):

- `score_quality`, `score_tier`, `score_breakdown` — live confluence
- `refLevel_*` — every reference level (one bind per key)
- `rsi`, `atr`, `sma50`, `sma200` — live indicator values
- `change24h`, `volRel` — derived from candles
- `ticker:SYMBOL` — async-cached price for any Binance pair (60s cache, in-flight dedup)

Four new `WB_TERM_TEMPLATES`: **Confluence Signals**, **Reference Levels**, **Watchlist** (BTC/ETH/SOL/HYPE/DOGE), **Live Indicators** (RSI · ATR · SMA · Vol).

---

## v0.9.10 — Champions Channel + CCV Setup

### Champions Channel autoFib upgrade

Default fib retracement levels bumped 7 → 8 (added 0.66). Renderer draws a pulsing yellow shaded band between the 0.618 and 0.66 levels with a "★ CHAMPION ZONE 0.618–0.66" label. PDF cites 68% bounce probability inside this band. `championBand: true` on the overlay turns the band on (toggleable in the Style editor).

`sdk.autoFib()` now also pushes a `fibRetrace` overlay (with Champion Zone shaded) alongside the order ladder, infers swing chronology (high after low → buy retrace, vice versa for sell), and reports the inferred side in the toast.

### CCV Setup detector — `sdk.detectCCV()`

Composite of three high-leverage components from the PDF (cited at ~80% historical WR):

1. **Consolidation** — last-20-bar range / prior-20-bar range < 0.65
2. **Champion Zone tag** — wick OR close inside 0.55–0.66 fib retrace of the last 50-bar swing (excluding the consolidation tail)
3. **Volume confirmation** — current bar volume > 1.5× 14-bar median, OR price within ATR/2 of pdPOC (POC tag counts)

Returns `{matched, side, components:[{id,label,ok}], banner, price}`.

### Per-frame CCV watcher

`ccvWatcherTick()` runs every render frame, throttled to 1 check/sec, with a 30s default cooldown between fires. Player config persisted in `cr_ccv_watcher_v1`: `enabled`, `bannerOnly`, `autoBracket`, `cooldownMs`. When matched: fires the "★ CCV SETUP · BUY/SELL · all 3 firing" banner, bursts 18 yellow particles at the price, and (if `autoBracket=true`) auto-arms `sdk.bracket(side, slDistance:60, rr:2.0, risk:20)`.

### Manual probe ability

"★ CCV Check" added to the abilities menu (T4 tier). Always shows the banner with ✓ / ✗ per component so the player learns what each component requires even when no setup is firing.

### Score spine integration

`scoreSetup()` adds a `+1` mega-bonus component (`★ CCV composite (PDF ~80% WR)`) when CCV matches and side aligns. Quick Builder gets a new `ccv` toggleable component (default weight 1, max 3).

---

## v0.9.11 — Pattern detectors (Divergence A/B/C, BARR, H&S)

### Shared swing finder — `sdk._findSwings(candles, 'high'|'low', windowBars)`

Fractal-style pivot detector: a candle is a swing if it exceeds (or undershoots) every candle within `windowBars` on either side. Returns `[{idx, price}, …]` sorted chronologically. Used by all three new detectors so they share a consistent definition of "swing."

### Divergence A/B/C reclassifier

The old check was `priceNow vs price 14 bars ago` — random. New version finds the last two real swing highs (for sell) or swing lows (for buy) and classifies by geometry:

- **Class A (+2)** — HH price + LH RSI at HTF extreme (RSI > 60 for sell, < 40 for buy). The strongest setup.
- **Class B (+1)** — Equal-high price + LH RSI, OR HH price + equal-high RSI. Confirmed but weaker.
- **Class C (0 pts)** — Failed divergence (price LH + RSI HL = trend continuation). Recorded for the inspector but not scored.

Result cached on `sdk._lastDivergence` so the new "÷ Div Class Check" probe shows what the last classification was.

### Bump-and-Run reversal — `sdk.detectBumpAndRun()`

Bulkowski's BARR pattern. Fits least-squares slopes on two windows: lead-in (bars N-50 to N-20) and bump (bars N-19 to N-3). Fires when bump slope ≥ 2× lead slope in the same direction AND the latest close has pierced back through the projected lead trendline. Returns `{matched, side, leadSlope, bumpSlope, leadAtNow}`.

### Head & Shoulders — `sdk.detectHeadShoulders()`

Real 5-swing matcher. Takes the last three swing highs and checks: shoulders within 5% of each other, head meaningfully above both, finds the lows between them, builds the neckline through `LL` and `RL`, fires when the close pierces below it. Mirrored for inverse H&S using swing lows. Returns `{matched, side, neckline, LS, H, RS, LL/LH, RL/RH, kind: 'topping' | 'bottoming'}`.

### Score ceiling raised 17 → 20

Added two new components: `barr` (+1) and `hs` (+2). Tier thresholds rescaled: TRADEABLE ≥6, STRONG ≥11, PRIME ≥16. Score badge color ramp updated to match.

### Three new probe abilities (all T4)

- **⚡ BARR Check** — shows lead vs bump slope, banner-only
- **👤 H&S Check** — shows neckline + topping/bottoming kind
- **÷ Div Class Check** — runs `scoreSetup` for both sides and shows the last classified divergence

---

## v0.9.12 — SFP / Failed Auction / OI confirmation (Tier 1 complete)

### SFP detector — `sdk.detectSFP()`

Promoted from inline 21-bar window check to real-swing detection via `_findSwings(cs, 'high'|'low', 4)`. Finds the most recent swing at least 3 bars old, fires when the latest bar's wick pierces it but close came back inside. Returns `{matched, side, level, kind, price}`. Score component +2.

### Failed Auction — `sdk.detectFailedAuction()`

Promoted from inline check. Reads `pdVAH`/`pdVAL`/`dOpen` from `computeReferenceLevels()`. Fires when the day opened outside prior-day value area then accepted back inside. Returns `{matched, side, kind:'high-open mean-rev' | 'low-open mean-rev', dOpen, pdVAH, pdVAL}`. Score component +2.

### Open Interest confirmation — `sdk.detectOIConfirm()` (Tier 1 unlock)

Async REST poll to `https://fapi.binance.com/futures/data/openInterestHist`. Per `(symbol, period)` cached for 60s. Maps the game timeframe to the closest Binance OI period (5m / 15m / 30m / 1h / 2h / 4h / 6h / 12h / 1d). Compares OI Δ% over last 8 buckets to price Δ% over the same window:

- **bull confirm** — price up >0.2% + OI up >0.5% → +1 if side = buy
- **bear confirm** — price down + OI down → +1 if side = sell
- **distribution** — price down + OI up (flagged but not scored)
- **short-cover** — price up + OI down (flagged but not scored)

Quick Builder slider (`oi`, default weight 1, max 2). Probe ability "∮ OI Check".

### Three new probe abilities + Terminal binds

- **⇄ SFP Check**, **↺ FA Check**, **∮ OI Check**
- New `TERM_BIND_OPTIONS` keys: `sfp_status`, `fa_status`, `oi_change_8`, `oi_status`

### Tier 1 status

All 10 quant.pdf Tier 1 detectors are now live and side-aware in `scoreSetup`. The whole Tier 1 set was implementable in standalone — no live trade tape needed.

---

## v0.9.13 — Play-app subcategories + sleeker mode cards

### Subcategory tab strip

Pill-tab strip above the mode grid in the Run window: **Regular · Campaign · Minigame · PVP**. Tab click filters which `.modecard`s are visible via `data-cat`. Default is Regular. PVP tab also auto-hides the Battle Arena sub-mode picker when leaving.

| Tab | Cards |
|---|---|
| Regular | Time is Money (playable) · Trade (Phase 2) · Creative SDK (v0.7b) |
| Campaign | 8 chapters · Bracket → Reference Levels → Confluence Score → CCV Setup → Patterns → Workbench → Terminal & Bots → Final Run |
| Minigame | Monster Mode · Snake · Racing |
| PVP | Battle Arena (with 6 sub-modes) |

### Sleeker mode-card design

- Padding 16/14 → 11/12, gap 6 → 3, min-height 140 → 96
- Border-radius 14 → 10, lighter background opacity (.72 → .55)
- Name 15px/700 → 13px/600, desc 11 → 10.5px, tighter line-height
- Tag pill: 10px/2-7 → 9px/1-6, uppercase, lower contrast
- Hover lift 2px → 1px, transition 12ms snappier
- New `.modeTabs` style: pill-strip in a subtle dark container, 600/11px monospace caps, active tab gets the green tint

---

## v0.9.14 — Fib Extension tool

New 2-anchor laser tool **🎯 Fib extension** in the laser spawn menu, sibling to 🪜 Fib retracement and 🪶 Fib ladder. Listed as `live:true` and `star:true` so it shows up in starred shortcuts.

9 default levels: **1 · 1.272 · 1.414 · 1.618 · 2 · 2.272 · 2.618 · 3.618 · 4.236**. The 1.618 line gets thicker stroke + a subtly pulsing shaded **GOLDEN EXTENSION** band between 1.5 and 1.7 — same visual treatment as the Champion Zone on retracement. Default extends right past anchor 2. Toggleable in the Style editor (Golden Extension band, extend direction, all 24 fib levels grid). Click hit-testing wired. Old 3-anchor "Trend-based fib extension" stub retired (id collided).

---

## v0.9.15 — Campaign coach (8 scripted chapters)

### CSS + DOM scaffold

Floating banner top-center with green-tinted gradient, soft glow border, slide-in animation. Header shows "📘 Coach" + progress dots (gray → yellow current → green done). Body: "n/total · instruction text" + small-print tip. Skip + Next buttons. Pulsing yellow `crCoachSpotlit` ring around the targeted HUD element.

### Script registry + state machine — `crCampaignCoach` IIFE

8 chapters, 19 steps total, all gated by real game-state predicates (not click-Next-to-fake-it). Polls every 400ms; when a step's `complete()` returns true, auto-advances with a "✓ STEP DONE" float. Predicates check `sdk.openOrders`, `sdk.scoreSetup()`, `sdk.detectCCV()`, `INDICATOR_STATE.active`, `wb.strategies`, `wb.bots`, or DOM state.

### Probe-ability hooks

The five probe abilities (CCV / SFP / FA / BARR / H&S) each set scratch flags on `crCampaignCoach` so chapters 4 + 5 know when the player has actually probed and when a real match has fired.

### Chapter map

1. **The Bracket** — arm Bracket → click chart → wait for close
2. **Reference Levels** — open menu → toggle reflevels → look at lines
3. **Confluence Score** — look at badge → click to expand → wait for ≥6
4. **CCV Setup** — probe → wait for match → place bracket in direction
5. **Patterns** — probe one of 4 patterns → wait for match → trade with it
6. **Workbench** — open Workbench → Strategies tab → Build a strategy
7. **Terminal & Bots** — open Terminal + → spawn widget → equip bot
8. **Final Run** — unscripted, hit ≥3 closed-positive brackets

---

## v0.9.16 — Tool-aware laser beam + setup guide

### Tool-aware laser beam

Replaces the pink-only beam. Per-primitive 3-layer beam: white-hot core + colored mid + glow halo. Spark particles stream toward the target. Pulsing crosshair + price readout in tool color. Color keyed off `game.laserTool`:

| Tool | Color |
|---|---|
| bracket | green (#14f195) |
| oco | red (#ff5b7f) |
| ladder / trendline / ray / extLine | sky blue (#7ad6ff) |
| fibLadder / fibRetrace / frvp | gold (#ffd166) |
| fibExt | blue (#1976d2) |
| longPos | green |
| shortPos | red |
| hLine / vline / rect | purple (#a371f7) |
| vwap | violet (#b58aff) |
| rune | mint (#7ee787) |

`TOOL_VISUAL_STYLES` registry — adding a new primitive is one entry. `_DEFAULT_TOOL_STYLE` (pink) is the legacy idle.

### Setup guide overlay

Top-center floating card per primitive while `game.laserAiming` is true. Per-tool registry (`TOOL_SETUP_GUIDES`):

- **Single-click primitives** (bracket, hLine, vline, vwap, rune) — one step
- **Two-anchor primitives** (ladder, fibLadder, fibRetrace, fibExt, oco, trendline, ray, extLine, longPos, shortPos, rect, frvp) — two steps with anchor-specific instructions ("Click swing low", "Click swing high")

Card shows: tool icon + name (uppercase), current step text, step counter, step dots (current pulses), small-print hint, animated demo glyph (single-click crosshair pulse / two-anchor anchor sequence with current dot pulsing yellow).

### Placement burst

`commitLaserSingleClick` and `commitLaserTwoAnchor` spawn tool-colored confetti particles at the click point + brief 40ms hit-stop on commit. Both single-click and two-anchor flows.

---

## v0.9.17 — Topbar chrome moved to Profile (later relocated in v0.9.20)

Reset / Save / Coins / Connect Wallet hidden from the in-game topbar (CSS `display:none`). Added to the desktop Profile window's "Run Controls" 4-button grid. Wallet-connected glow mirrors via MutationObserver. Buttons stay in DOM so existing handlers keep working — Profile entries `.click()` through.

(Superseded by v0.9.20 — they belong in the lite profile widget, not the desktop one.)

---

## v0.9.18 — Campaign chapters direct-launch

Each chapter sets a sensible per-lesson preset (asset / timeframe / pre-equipped indicators) and bypasses the Configure Run window entirely:

| Ch | Asset | TF | Indicators |
|---|---|---|---|
| 1 The Bracket | BTC | 15m | (clean) |
| 2 Reference Levels | BTC | 1h | reflevels |
| 3 Confluence Score | BTC | 1h | reflevels + RSI |
| 4 CCV Setup | BTC | 15m | reflevels + VRVP |
| 5 Patterns | BTC | 1h | reflevels + RSI |
| 6 Workbench | BTC | 1h | reflevels |
| 7 Terminal & Bots | BTC | 1h | reflevels + RSI |
| 8 Final Run | BTC | 1h | reflevels + RSI + VRVP |

Strategy reset to `none` for a clean slate. Any open OS windows close automatically. `restart()` fires immediately. Banner + coach trigger 700ms later.

---

## v0.9.19 — Hotkey 3 = green primitives laser

Slot 3 was the modal Primitives picker; promoted to a parallel laser-aim mode with `game.laserPalette = 'primitives'`.

- Idle beam draws **green** (#14f195) instead of pink — visual cue before picking a tool
- Spawn menu filtered to **Fibonacci + Forecast** categories only
- Press 3 again or Esc to exit · Shift+3 still opens the legacy modal picker

`_PALETTE_IDLE_STYLE` registry maps `tools` → pink and `primitives` → green for the idle (no-tool-selected) beam state.

---

## v0.9.20 → v0.9.20b — Run Controls in lite profile

v0.9.20 placed the buttons in the right-sidebar Wallet panel (`#crSidePanelWallet`) — wrong target. v0.9.20b corrected: they live in the lite profile widget (`#crLightProfile`, the chart-overlay popover with avatar / name / SCORE / $CRDS / $RUN / P&L / loadout chips / "Open full profile →"). Layout:

1. Avatar + name + ✕
2. SCORE / $CRDS / $RUN / P&L row
3. Loadout chips (AVATAR / SKIN / GEAR / VEHICLE / WEAPON / BOTS)
4. **Run Controls** — new section, 2×2 button grid (↻ Reset · 💾 Save · 🪙 Coins · 🔗 Connect)
5. Open full profile →

Each button is a pill matching the loadout-chip language: dark base, mint-green hover, with a 9px uppercase "RUN CONTROLS" header. Connect button mirrors the wallet-connected mint glow + label "Connected" via the same MutationObserver.

---

## v0.9.21 — Primitives laser polish

Three fixes responding to the v0.9.19 menu still showing "TOOLS":

1. **Header text** — palette-aware: reads "PRIMITIVES" when `game.laserPalette === 'primitives'`, "TOOLS" otherwise
2. **Header price tint** — green for primitives, pink for regular tools
3. **Auto-equip canonical primitive set** — Bracket, OCO, Long Position, Short Position, Fib Ladder, Fib Retracement, Fib Extension always appear on hotkey 3 regardless of player's Workbench equipped tools (`PRIMITIVE_FORCE` set bypasses the equipped check; cat filter still applies)

After v0.9.21 the primitives laser shows two categories with all 7 primitives:

- **Forecasting** — 🎯 Bracket · ⇅ OCO · 📈 Long · 📉 Short
- **Fibonacci** — 🪜 Fib retracement · 🎯 Fib extension · 🪶 Fib ladder

---

## v0.9.22 — Primitives laser expanded (18 entries across 3 categories)

The hotkey 3 menu was showing 7 entries (forecast 4 + fib 3) — far short of the 18 tier-1-4 SDK primitives that v0.9.8 shipped. v0.9.22 surfaces the missing 11 as laser-placement entries in a new **Orders** category, with full visual treatment.

### New Workbench tool category — `'orders'`

Added to `WB_TOOL_CATEGORIES`:
```js
{ id:'orders', label:'Orders', ic:'◇' }
```

Added to `PRIMITIVE_CATS` so it shows on hotkey 3:
```js
const PRIMITIVE_CATS = new Set(['fib','forecast','orders']);
```

### 11 new `WB_LASER_TOOLS` entries

**1-click placements (9):**

| ID | Icon | Label | SDK route |
|---|---|---|---|
| `limit` | ◇ | Limit order | `sdk.limit({side, price, size:4})` — side inferred from click position vs current price |
| `stopLossAt` | ⛔ | Stop loss | Modify most-recent open bracket's `sl` to click price |
| `takeProfitAt` | 🏁 | Take profit | Modify most-recent open bracket's `tp` to click price |
| `trailingTpAt` | 🎢 | Trailing take-profit | `sdk.trailingTakeProfit({id, activatePrice, trailDistance})` · trail = 50% of distance from entry |
| `scaleOutAt` | ⊟ | Scale out | `sdk.scaleOut({id, atPrice, fraction:0.5})` |
| `magnetAt` | 🧲 | Magnet to target | `sdk.magnet({id, target, strength:0.5})` |
| `perpFlipAt` | ⇌ | Perp flip | `sdk.perpFlip({id, price})` · close existing + open inverse |
| `borrowShortAt` | ⇩ | Borrow short | `sdk.borrowShort({price, size:4})` |
| `liqGuardAt` | 🛡 | Liquidation guard | `sdk.liquidationGuard({price})` |

**2-anchor placements (2):**

| ID | Icon | Label | SDK route |
|---|---|---|---|
| `twap` | ∼ | TWAP | `sdk.twap({side, slices:5, fromPrice:p1, toPrice:p2, totalSize:20})` |
| `iceberg` | ❄ | Iceberg | `sdk.iceberg({side, fromPrice, toPrice, visibleSize:4, totalSize:20})` |

### Wiring

- `commitLaserSingleClick` extended with 9 new `else if` branches — each finds the latest open bracket if needed, calls the matching SDK method, toasts result with click price
- `commitLaserTwoAnchor` extended with twap + iceberg branches — side inferred from anchor chronology
- `TOOL_VISUAL_STYLES` extended with 11 new color/glow entries
- `TOOL_SETUP_GUIDES` extended with 11 new step-script entries
- `PRIMITIVE_FORCE` set expanded from 7 IDs to 18 IDs so all primitives auto-equip in primitives palette regardless of player's Workbench equipped set

### Result

Hotkey 3 menu now reads:

```
PRIMITIVES                        @ $78,206
─────────────────────────────────
FORECASTING
  🎯 Bracket
  ⇅ OCO
  📈 Long Position
  📉 Short Position
─────────────────────────────────
FIBONACCI
  🪜 Fib retracement
  🎯 Fib extension
  🪶 Fib ladder
─────────────────────────────────
ORDERS
  ◇ Limit order
  ⛔ Stop loss
  🏁 Take profit
  🎢 Trailing take-profit
  ⊟ Scale out
  🧲 Magnet to target
  ⇌ Perp flip
  ⇩ Borrow short
  🛡 Liquidation guard
  ∼ TWAP
  ❄ Iceberg
```

### What's still in the modal Shift+3 picker (no chart click needed)

These primitives don't have a meaningful "click here" semantics so they stayed in the legacy modal:
- `market` (fires now at current price)
- `closeAll`, `hedgeParachute`, `liquidityRadar`, `rescueDrone`, `inverseBracket`
- `ifThen` (needs JS callback)
- `comboTrade` variants — `ironCondor`, `straddle`, `calendar`
- `fundingSnipe`, `copyTrade` (Phase 2 reframe)
- `autoFib` (uses last visible swing — also available as the φ ability)

---

## Deploy bundling notes

13 conceptual versions in source-code comments → 8 actual deploy commits:

| Deploy commit | Bundles |
|---|---|
| `595f8d3` v0.9.13 | v0.9.9 + v0.9.10 + v0.9.11 + v0.9.12 + v0.9.13 — full quant.pdf Tier 1 (all 10 detectors), Workbench Quick Builder, real-data Terminal widgets, play-app subcategories, sleeker mode cards |
| `daa6cd0` v0.9.14 | v0.9.14 — Fib Extension tool |
| `a6ee269` v0.9.15 | v0.9.15 — Campaign coach IIFE + chapter scripts |
| `d26ce84` v0.9.17 | v0.9.16 + v0.9.17 — tool-aware laser + setup guide + commit confetti + topbar→Profile move |
| `33d7f81` v0.9.18 | v0.9.18 — Campaign chapters direct-launch with preset |
| `7237e50` v0.9.20 | v0.9.20 — Run Controls (wrong target) |
| `1c60780` v0.9.20b | v0.9.20b — Run Controls relocated to lite profile |
| `dfc0564` v0.9.22 | v0.9.19 + v0.9.21 + v0.9.22 — hotkey 3 green primitives laser + PRIMITIVES header + 11 new tier-1-4 primitive placements |

**Why this matters:** the changelog above describes 13 conceptual chunks for narrative clarity, but `git log --oneline` will only show the 8 commits. If you're auditing what actually shipped to Pages, `git log` is authoritative; this changelog is a finer-grained design intent log.

---

## What's still pending (not shipped)

- **Solana Playground deploy** — single highest-ROI deferred item per `AUDIT-v0.9.8.md`. ~20 minutes paste-and-deploy unblocks ~10 separate "tx fails: program not found" gaps + populates leaderboard + makes License PDAs real.
- **Campaign mode loadout lock** — chapters should only equip tools/primitives explained in that chapter (v0.9.x backlog item).
- **Tier 2 (Phase 1 ChartHost adapter)** — CVD divergence, footprint breakout, TPO/Market Profile. Need live trade-tape feed.
- **Tier 3 (Phase 2 / research library)** — regime detector (Lévy-driven OU), LOB feature predictors, HFT Copula Pairs Trading, order flow imbalance signals.
