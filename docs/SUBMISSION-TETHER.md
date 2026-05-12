# ChartRunner — Tether Frontier Hackathon Track
**Track:** Tether · Frontier Hackathon Track
**Prize:** $10k USDT
**Status:** integrated in v1.0.55 (Day 11 of post-Frontier sprint)

---

## What we shipped

USDT is now a **first-class settle asset** in ChartRunner, switchable per-player at runtime via `setQuoteAsset('usdt')`. Three concrete changes:

1. **Both LIVE brokers (Jupiter + Jito) accept USDT as the quote currency.** When the player flips to USDT, every Bracket / OCO / Ladder fire routes SOL ↔ USDT instead of SOL ↔ USDC. Same broker contract, same call shapes, single line of config.
2. **USDT shows up as a watchlist row in the Token Terminal.** Real Birdeye-sourced price, market cap, holder count, 24h volume. Players can pin USDT as a chart widget like any other token.
3. **Decimal-aware execution path.** A shared `decimalsFor(mint)` helper resolves SOL=9 / USDC=6 / USDT=6 — no hardcoded assumption that the non-SOL side is always USDC.

This isn't "we mention Tether in a slide." It's USDT wired through the same broker chassis that the Jupiter ($3k) and Jito ($2k) submissions ride on — making ChartRunner one of the few Frontier projects where USDT is interchangeable with USDC at the **broker primitive** level.

## Why this wins the track

Tether's scope is broad — they want real USDT integration on Solana. Three angles ChartRunner hits:

### 1 — USDT as settlement currency for an actual product

ChartRunner is a gamified trading SDK, not a payment app. By making USDT a first-class settle asset, every player who chooses USDT pays for their on-chain trades in USDT — directly through Jupiter routing into USDT outputs. No "convert to USDT first then trade" friction. The treasury can hold USDT-denominated revenue from the protocol fee (Phoenix Rise builder codes at M5 settle in stablecoins — USDT is now an option).

### 2 — Global retail onramp emphasis

USDT is the dominant stablecoin in non-US retail markets. Frontier is global, so is ChartRunner — Germany-built but no regional gating. Defaulting USDT alongside USDC means players in markets where USDT dominates (Turkey, Vietnam, Argentina, Korea) get their familiar stablecoin without the unfamiliar one. The runtime `setQuoteAsset` + localStorage persistence means the choice sticks.

### 3 — Tokenomics path

For the M1 tokenomics whitepaper, USDT becomes the **treasury reserve currency** option alongside USDC. The $CRDS ↔ $RUN swap engine at M1 will quote both stablecoins so creators / players can pick which they prefer.

## Technical integration

### `sdk-m1-scaffold/sdk/brokers/jupiter.js` — refactor + USDT support

```js
export const MINT_SOL  = 'So11111111111111111111111111111111111111112';
export const MINT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const MINT_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

const QUOTE_ASSETS = {
  usdc: { mint: MINT_USDC, decimals: 6, label: 'USDC' },
  usdt: { mint: MINT_USDT, decimals: 6, label: 'USDT' },
};

let _quoteAsset = 'usdc';

export function setQuoteAsset(key){
  _quoteAsset = key;
  localStorage.setItem('cr_quote_asset_v1', key);
}
export function getQuoteAsset(){ return QUOTE_ASSETS[_quoteAsset]; }
export function decimalsFor(mint){
  if(mint === MINT_SOL)  return 9;
  if(mint === MINT_USDC) return 6;
  if(mint === MINT_USDT) return 6;
  return 6;
}
```

The `quote()` helper now reads `getQuoteAsset()` for the non-SOL side when the caller doesn't pass an explicit override. Old call sites keep working (default = USDC); new call sites can `setQuoteAsset('usdt')` once at boot.

### `sdk-m1-scaffold/sdk/brokers/jito.js`

Imports the shared mint constants + `decimalsFor` + `getQuoteAsset` from jupiter.js so the wrapper inherits the USDT support transparently. No duplication.

### `sdk-m1-scaffold/sdk/brokers/index.js`

Re-exports `setQuoteAsset` / `getQuoteAsset` / `listQuoteAssets` / `MINT_SOL` / `MINT_USDC` / `MINT_USDT` so consumers have a single entry point:

```js
import { setBroker, setQuoteAsset } from '@chartrunner/core/brokers';
setBroker('jupiter');
setQuoteAsset('usdt');           // all subsequent trades settle in USDT
```

### `ChartRunner_Prototype.html` — Token Terminal additions

```js
// Stablecoins as first-class watchlist rows.
{ id:'usdt', nm:'Tether USD', tag:'USDT', chain:'sol', seed:1009 },
{ id:'usdc', nm:'USD Coin',   tag:'USDC', chain:'sol', seed:1013 },
```

Plus mint mapping in `TOK_BIRDEYE_MINT` — both stablecoins now have real Birdeye-sourced data in the Token Terminal.

### Fill record extras

Both jupiter + jito fill records now include `quoteAsset: 'USDC' | 'USDT'` so the in-game journal entry can show which stablecoin the swap settled into:

```
🪙 SOL/USDT · 0.5 SOL → 84.32 USDT · venue=jupiter ·
   route=Phoenix → Raydium · tx=Cw8…rZU5
```

## Roadmap

| Milestone | USDT touch point |
|---|---|
| **M1 — Tokenomics** | USDT as treasury reserve option alongside USDC; $CRDS / $RUN swap engine quotes both |
| **M5 — Drift perps integration** | USDT settle on Drift Protocol perp markets (Solana-native; v1.0.70 already pulls funding + OI from data.api.drift.trade) |
| **M8 — Token launch tournaments** | Tournament entry fees in USDT for non-US players, USDC for US players |
| **M10 — Mainnet** | USDT pairs go live on mainnet from day 1 of the deploy |

## Submission package

- **Project title:** ChartRunner — USDT as a first-class settle asset
- **Description:** Tether USDT integrated into the ChartRunner broker chassis. Both LIVE brokers (Jupiter + Jito) accept USDT as the quote currency via `setQuoteAsset('usdt')`. USDT also appears as a watchlist row in the Token Terminal with real Birdeye-sourced data. Runtime switch persists per wallet.
- **GitHub:** github.com/\<owner\>/chartrunner · `sdk-m1-scaffold/sdk/brokers/jupiter.js` (lines: MINT_USDT, QUOTE_ASSETS, setQuoteAsset, decimalsFor)
- **Website:** chartrunner.xyz
- **Demo path:** game → open Token Terminal → see USDT row alongside USDC → switch broker to Jupiter or Jito → `window.crBrokers.setQuoteAsset('usdt')` → run Campaign Ch.7 → fire Blue Laser on a Bracket → Phantom popup → fill journal shows "SOL/USDT" with venue + routePlan
- **Sponsor integrated:** Tether USDT (Solana mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`)

## Tweet draft

> 💵 USDT just became a first-class settle asset in @ChartRunner.
>
> Same Bracket / OCO / Ladder primitive. Same Jupiter + Jito brokers. New runtime setting: `setQuoteAsset('usdt')` → every trade routes SOL ↔ USDT instead of SOL ↔ USDC.
>
> USDT also lives in the Token Terminal with real price + holders + MC from Birdeye.
>
> 🔗 chartrunner.xyz · @Tether_to Frontier Track
