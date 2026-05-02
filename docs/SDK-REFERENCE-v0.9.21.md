# ChartRunnerSDK Reference — v0.9.21

The SDK is the only thing that issues orders. Abilities call into it; renderers read its event stream. This is the keystone that makes Phase 1 (drop on Dexscreener / TradingView) and Phase 2 (Solana wallet) a swap, not a rewrite.

```js
const sdk = new ChartRunnerSDK();   // already instantiated globally as `sdk`
```

---

## Capabilities map

`sdk.capabilities` is the introspection surface for host adapters.

| Method | Capability | Notes |
|---|---|---|
| `bracket` | `true` | Entry + TP + SL in one call |
| `ladder` | `true` | Evenly-spaced order ladder |
| `fibLadder` | `true` | Fib-spaced order ladder |
| `oco` | `true` | One-cancels-other pair |
| `trailStop` | `true` | Per-tick SL ratchet |
| `inverseBracket` | `true` | Mirror direction of an open bracket |
| `closeAll` | `true` | Close every open order |
| `toggleIndicator` | `true` | Toggle a registered indicator |
| `hedgeParachute` | `true` | Real `inverseBracket` + 6s buffer |
| `liquidityRadar` | `true` | Toggles VRVP indicator + 5s scan |
| `rescueDrone` | `true` | Calls `closeAll` + immunity effect |
| `market` / `limit` / `stopLoss` / `takeProfit` / `scaleOut` | `true` | Tier 1 missing-basics |
| `twap` / `iceberg` / `trailingTakeProfit` / `ocoBracket` / `ifThen` | `true` | Tier 2 pro-trader primitives |
| `fundingSnipe` | `'reframe'` | Phase 2 wires live funding feed |
| `borrowShort` / `liquidationGuard` / `perpFlip` | `true` | Tier 3 |
| `copyTrade` | `'reframe'` | Phase 2 wires followee event subscription |
| `comboTrade` / `autoFib` / `magnet` | `true` | Tier 4 gameplay-flavored |
| **`detectCCV`** | `true` | v0.9.10 |
| **`detectBumpAndRun`** | `true` | v0.9.11 |
| **`detectHeadShoulders`** | `true` | v0.9.11 |
| **`detectSFP`** | `true` | v0.9.12 |
| **`detectFailedAuction`** | `true` | v0.9.12 |
| **`detectOIConfirm`** | `true` | v0.9.12 |

---

## Quant brain (v0.9.9–v0.9.12)

### `sdk.scoreSetup(opts) → {score, max, components, recommendation, side, price}`

Live confluence score. Returns 0–20 with tier label.

```js
const r = sdk.scoreSetup({ side: 'buy' });
// → { score: 13, max: 20, recommendation: 'STRONG', components: [
//     { id:'htf_trend',  label:'HTF trend aligned',                  pts:2 },
//     { id:'ref_level',  label:'At pdPOC ($78,206)',                 pts:2 },
//     { id:'vol_node',   label:'Volume node (POC)',                  pts:1 },
//     { id:'div_a',      label:'Class A divergence (HH price + LH RSI)', pts:2 },
//     { id:'champion',   label:'Champions Channel (0.618–0.66)',     pts:2 },
//     { id:'sfp',        label:'SFP at swing extreme ($78,500)',      pts:2 },
//     { id:'ccv',        label:'★ CCV composite (PDF ~80% WR)',      pts:1 },
//     { id:'oi',         label:'OI confirms · bull confirm (1.2%)',  pts:1 },
//   ], side:'buy', price:78206 }
```

**Tier thresholds:** WAIT (<6) · TRADEABLE (≥6) · STRONG (≥11) · PRIME (≥16).

**Custom components:** `sdk.registerScoreComponent(id, fn, defaultWeight)` lets Phase 1+ modules plug in CVD / footprint / regime detector / LOB features.

```js
sdk.registerScoreComponent('cvd_div', (ctx) => {
  // ctx = { side, price, candles, levels, atr, tol }
  const matched = computeCVDDivergence(ctx);
  return matched ? { matched:true, label:'CVD divergence', pts:2 } : null;
});
```

**Custom weights:** `sdk.scoreSetup({ side, weights: { htf_trend:3, sfp:0 } })` — weights override per-component points (0 disables).

---

### `sdk.detectCCV(opts) → {matched, side, components, banner, price}`

CCV Setup composite (PDF cites ~80% historical WR). Three checks:

1. **Consolidation** — last-20-bar range / prior-20-bar range < 0.65
2. **Champion Zone tag** — wick OR close inside 0.55–0.66 fib retrace of last 50-bar swing
3. **Volume confirmation** — current bar vol > 1.5× 14-bar median, OR price within ATR/2 of pdPOC

```js
const r = sdk.detectCCV();
// → { matched: true, side: 'buy', components: [
//     { id:'consol',    label:'Consolidation (range ratio 0.42)',  ok:true },
//     { id:'champion',  label:'Champion Zone (fib 0.622)',          ok:true },
//     { id:'volConfirm',label:'POC tag',                            ok:true },
//   ], banner: 'CCV SETUP · BUY · all 3 firing', price: 78206 }
```

Per-frame watcher (`ccvWatcherTick`) auto-fires banner + optional auto-bracket when matched (config: `cr_ccv_watcher_v1`). Manual probe ability "★ CCV Check" in the abilities menu.

---

### `sdk.detectSFP(opts) → {matched, side, level, kind, price}`

Swing Failure Pattern detector. Uses `_findSwings` to locate the most recent swing high/low at least 3 bars old, fires when the latest bar's wick pierces it but close came back inside.

```js
const r = sdk.detectSFP();
// → { matched: true, side: 'sell', level: 78500, kind: 'bearish', price: 78206 }
```

---

### `sdk.detectFailedAuction(opts) → {matched, side, kind, dOpen, pdVAH, pdVAL, price}`

Promoted from inline scoreSetup check. Reads `pdVAH/pdVAL/dOpen` from `computeReferenceLevels()`. Fires when day opened outside prior-day value area + accepted back inside.

```js
const r = sdk.detectFailedAuction();
// → { matched: true, side: 'buy', kind: 'low-open mean-rev',
//     dOpen: 77800, pdVAH: 78900, pdVAL: 78100, price: 78400 }
```

---

### `sdk.detectOIConfirm(opts) → {matched, side, kind, oiChg, pChg, oiNow, oiPrev, sym, period}`

Async REST poll to `https://fapi.binance.com/futures/data/openInterestHist`. Per `(symbol, period)` cached for 60s. First call returns `{matched:false, pending:true}` and kicks off the fetch; subsequent calls within 60s use the cached result.

```js
const r = sdk.detectOIConfirm({ side: 'buy' });
// First call: { matched: false, pending: true, sym: 'BTCUSDT', period: '15m' }
// After 1s:   { matched: true, side: 'buy', kind: 'bull confirm',
//               oiChg: 0.012, pChg: 0.008, sym: 'BTCUSDT', period: '15m' }
```

Confirmation logic: bull confirm = price up >0.2% + OI up >0.5%. Bear confirm = both down. Distribution / short-cover divergences are flagged via `kind` but not scored.

---

### `sdk.detectBumpAndRun(opts) → {matched, side, leadSlope, bumpSlope, leadAtNow, price}`

Bulkowski's BARR pattern. Fits least-squares slopes on:

- Lead-in: bars `[N-50, N-20]`
- Bump: bars `[N-19, N-3]`

Fires when bump slope ≥ 2× lead slope (same direction) AND the latest close has pierced back through the projected lead trendline.

```js
const r = sdk.detectBumpAndRun();
// → { matched: true, side: 'sell', leadSlope: 0.012, bumpSlope: 0.085,
//     leadAtNow: 78900, price: 78400 }
```

---

### `sdk.detectHeadShoulders(opts) → {matched, side, neckline, LS, H, RS, LL, RL, kind, price}`

5-swing matcher. Constraints:
- Last 3 swing highs (or lows for inverse)
- Shoulders within 5% of each other
- Head meaningfully above (>2%) the higher shoulder
- Neckline through the two intermediate lows

```js
const r = sdk.detectHeadShoulders();
// → { matched: true, side: 'sell', kind: 'topping',
//     neckline: 78100, LS:{idx:340,price:78900}, H:{idx:380,price:79800},
//     RS:{idx:420,price:78850}, LL:{idx:360,price:78050},
//     RL:{idx:400,price:78150}, price: 78050 }
```

Inverse H&S returns `kind: 'bottoming'` and `LH/RH` instead of `LL/RL`.

---

### `sdk._findSwings(candles, kind, windowBars) → [{idx, price}, …]`

Shared fractal-style pivot detector used by SFP, BARR, H&S. A candle is a swing if it exceeds (`high`) or undershoots (`low`) every candle within `windowBars` on either side.

```js
const highs = sdk._findSwings(candles, 'high', 4);
const lows  = sdk._findSwings(candles, 'low',  4);
```

---

## Reference levels — `computeReferenceLevels() → {dOpen, pdHigh, pdLow, pdClose, pdVAH, pdPOC, pdVAL, IBH, IBL}`

Module-level helper (not on the SDK). Computes the canonical Igor / quant.pdf level template from the loaded candle stream. Cached on `game._refLevelsCache` keyed by `(last candle ts, asset, timeframe)`.

```js
const lev = computeReferenceLevels();
// → { dOpen: 78000, pdHigh: 79200, pdLow: 77800, pdClose: 78400,
//     pdVAH: 78900, pdPOC: 78500, pdVAL: 78100, IBH: 78600, IBL: 78050 }
```

`pdVAH/pdPOC/pdVAL` use a 24-bin volume bucket and expand from POC outward until 70% of total volume is captured (standard Market Profile value-area definition).

---

## Event bus

Listen with `sdk.on(evt, fn)`. Existing events (pre-v0.9.x):

- `order` — bracket/ladder/oco placed (`{kind, orders}`)
- `fill` — limit order fills (`{order, price}`)
- `cancel` — order cancelled (`{order}`)
- `edit` — order modified (`{order, prev*, ...}`)
- `expired` — effect expired (`{effect}`)
- `magnet` — magnet engaged (`{order, target}`)
- `hostMode` — host mode changed (`{mode}`)

---

## Host modes

`sdk.setHostMode('standalone' | 'tv' | 'dex')` — 'reframe' methods (`hedgeParachute` / `liquidityRadar` / `rescueDrone` / `fundingSnipe` / `copyTrade`) branch on this. In `standalone` they run the original game logic; in `tv` / `dex` they route to host-native primitives.

---

## Workbench Quick Builder integration

The Quick Builder generates Pine v5 strategies that call back to the same components. Snapshot stored on `wb.strategies[].quick`:

```js
{
  side:     'both',          // 'buy' | 'sell' | 'both'
  minScore: 6,               // 1..17
  risk:     1.0,             // % per trade
  rr:       2.0,             // R:R
  weights:  {                // 0..max per component
    htf_trend: 2, ref_level: 2, vol_node: 1,
    div_a: 2, div_b: 1, champion: 2, breakout: 2,
    sfp: 2, failed_auction: 2,
    ccv: 1, barr: 1, hs: 2, oi: 1,
  }
}
```

Indicator Quick Builder snapshot:

```js
{ preset: 'reflevels', color: '#7ee787', params: { opacity: 0.55, ... } }
```
