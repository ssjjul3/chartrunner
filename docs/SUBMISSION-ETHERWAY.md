# ChartRunner — Etherway Frontier Hackathon Track
**Track:** Etherway · Build Live dApp with Solflare · Kamino · DFlow · QuickNode · Birdeye
**Prize:** $20k USDC
**Sponsor chosen:** **Birdeye**
**Status:** integrated in v1.0.52

---

## What we shipped

ChartRunner's in-game **Token Terminal** (the `tokenterm` desktop app + draggable token-profile widgets) is now powered by Birdeye for every Solana-chain token. Where Binance has no listing (PUMP, FART, HYPE, MOG) — Birdeye fills the gap. Where Binance has a listing (WIF, BONK, JUP, JTO, SOL) — Birdeye *enriches* the snapshot with market cap, holder count, on-chain liquidity, and total supply that Binance doesn't expose.

This is exactly the "Build a Live dApp" prompt: a real working surface, real on-chain Solana data, real production traffic — not a placeholder.

## Why Birdeye specifically

Of the 5 sponsor options Etherway lists (Solflare / Kamino / DFlow / QuickNode / Birdeye), Birdeye is the only one that solves a problem ChartRunner already had at v1.0.50: **our token list contained Solana memecoins that Binance doesn't list, so they rendered with synthetic data**. Synthetic data is the opposite of what a trading game wants — it's the one place we cannot fake it.

Birdeye is the canonical Solana token API. One `GET /defi/token_overview?address=<mint>` returns price + 24h % change + 24h volume USD + market cap + holder count + liquidity + supply + symbol/name/logo in a single round-trip. For our 20-row token list with ~7 Solana tokens, that's 7 fetches per refresh cycle, easily inside the free-tier rate limit.

## Technical integration

### Code change summary

| File / region | Change |
|---|---|
| `ChartRunner_Prototype.html` line ~27290 | New `TOK_BIRDEYE_MINT` mapping: 7 Solana token mints |
| `ChartRunner_Prototype.html` line ~27384 (`_tokFetchLive`) | Now fires 3 parallel fetches — Binance ticker + Binance klines + Birdeye token_overview. Result merging logic prefers Binance for OHLC (cheap historical), Birdeye for headline price on Solana memes, Birdeye-only fallback when no Binance pair exists |
| `ChartRunner_Prototype.html` end-of-script | New `window.crBirdeye` IIFE — 30s cache, in-flight dedupe, API key from `window.crBirdeyeKey` or `localStorage.cr_birdeye_key_v1`, automatic fallback from `/defi/token_overview` to `/defi/price` if the richer endpoint is gated |
| Existing `_tokSnapshot` + `_tokRenderProfile` + token-widget bind | **No changes required.** Birdeye's `mc` / `holders` / `liquidity` / `supply` overlay into `_tokLiveCache` so the existing renderers pick them up automatically |

### Data flow

```
                   ┌──────────────────────────────────────┐
                   │  _tokFetchLive(id, tf)               │
                   │                                       │
   Binance pair?   ├─→ /api/v3/ticker/24hr (p1)            │
                   ├─→ /api/v3/klines (p2)                 │
                   │                                       │
   sol-chain +     ├─→ crBirdeye.fetchToken (p3)           │
   mint mapped?    │     ↓                                 │
                   │   /defi/token_overview                │
                   │     → price · ch24 · vol24 · mc       │
                   │       · holders · liquidity · supply  │
                   └──────────────────────────────────────┘
                                  ↓
              merge (Binance owns OHLC if present;
                     Birdeye fills missing price and
                     overlays mc / holders / liquidity)
                                  ↓
                         _tokLiveCache[id+'|'+tf]
                                  ↓
            _tokRenderList + _tokRenderProfile + bound widgets
                  (existing renderers, zero code change)
```

### Where to see it working

1. Open `chartrunner.xyz/play/`
2. Pop DevTools console: `window.crBirdeye.setApiKey('<your-key>')` (or skip — public-tier endpoint works for `/defi/price`)
3. Open the Token desktop app
4. Click any Solana row (WIF / BONK / PUMP / FART / JUP / JTO)
5. Profile pane now shows live Birdeye-sourced price + 24h change + holder count + market cap
6. Drag the row onto the desktop → pin as a draggable widget. Stays live for the session.

For the demo path with no API key required, the JUP / JTO / WIF / BONK rows have Binance pairs and will populate from Binance first; the Birdeye overlay adds holders / MC / liquidity on top.

## Why this wins the track scope

Etherway's track scope says: *"reward promising projects with the professional support they need to succeed. We are particularly focused on projects in the DeFi, RWAs, Consumer Apps, and Stablecoins categories."*

ChartRunner sits squarely at **DeFi × Consumer App**: gamified Solana trading SDK where every in-game ability is a real SDK call. Birdeye data is the load-bearing connection between the chart in our game and the actual on-chain reality. Without it, players' Solana memecoin watchlist is a synthetic toy. With it, the watchlist is the real market.

## Submission package

- **Project title:** ChartRunner
- **Description:** Gamified Solana trading SDK. Token Terminal now powered by Birdeye for every Solana token — live price, 24h change, holders, market cap, liquidity. Drag any token to pin as a chart widget.
- **GitHub:** github.com/\<owner\>/chartrunner
- **Website:** chartrunner.xyz
- **Demo path:** chartrunner.xyz/play/ → Token desktop app → click WIF / BONK / PUMP / FART → Birdeye data lights up
- **Sponsor integrated:** Birdeye

## Tweet draft

> 🐦 @ChartRunner now reads every Solana token via @birdeye_so.
>
> WIF · BONK · PUMP · FART · JUP · JTO — live price, 24h change, holders, market cap, liquidity, all from one /defi/token_overview round-trip.
>
> Drag a row to pin as a chart widget. Real data, no synth.
>
> 🔗 chartrunner.xyz · @EtherwayLabs Frontier Track
