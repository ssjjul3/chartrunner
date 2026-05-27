# ChartRunner — Visa Frontier Hackathon Track (Germany) Submission
**Track:** Visa · Frontier Hackathon Track — Superteam Germany
**Prize:** $10k USDG total · 5k / 3k / 2k
**Deadline:** ~19h remaining at writing (2026-05-11 18:15)

---

## Eligibility check (per track scope)

- [x] Project submitted to the Colosseum Frontier portal ✅ (Frontier filing complete, May 11)
- [x] Project submitted to Superteam Earn with **GERMANY** marked as country ✅ (team based in Germany)
- [x] Project is eligible per the official global hackathon rules ✅ (German entity, Solana-native build)

## Track scope alignment

Visa's side-track is for "founders building on Solana with a clear path to real-world payments and financial infrastructure use cases. Strong fit includes projects in stablecoin payments, payment infrastructure, tokenisation of real-world-assets (RWAs) and DeFi."

**ChartRunner's fit:** the broker layer (v1.0.4) is exactly stablecoin-settled trade routing. Players trade chart primitives — Bracket, OCO, Ladder, TWAP — that fire through pluggable brokers (Mock / Binance Paper / Phoenix today; Jupiter + Jito coming Week 2 of the post-Frontier sprint). Every trade is denominated in stablecoins by default; the in-game `$CHART` soft-currency swaps to `$RUN` (hard token, Solana mint) on game-over, and `$RUN` becomes USDG-redeemable at M1.

**Real-world payments angle:** ChartRunner is the *training wheels* layer for retail traders who want to learn trade routing on stablecoin rails before risking real fiat. Every gameplay primitive maps 1:1 to a real SDK call. A player who clears the 39-chapter Campaign has practiced ~3,000 stablecoin-denominated trades in muscle memory.

## What we ship at Frontier (already LIVE)

- **39-chapter Campaign** teaching every SDK primitive: bracket / OCO / limit / stop / TP / scale-out / TWAP / iceberg / hedge / radar / rescue
- **2 Anchor programs on devnet**: `chartrunner_maps` (map anchoring, SHA-256 of chart state) and `chartrunner_registry` (entity ownership + on-chain marketplace + run records)
- **Direct in-page Phantom signing** (v1.0.47) — no React-app bounce, no jarring page navigation. Saved a map → Phantom popup → confirmed in ~3 seconds
- **NFT avatar layer** — top 20 Solana collections (offline curated; Helius DAS at M2.6)
- **Broker scaffolding** (v1.0.4) — Mock / Binance Paper / Phoenix adapters wired through one `BLUE LASER · HOTKEY 4` UI

## Build-with-Visa specifically (post-Frontier add)

Three concrete Visa-aligned additions on the M1 → M2 sprint:

1. **USDG as the default $RUN settle asset.** $RUN ↔ USDG swap at M1. Players' soft-currency $CHART converts to $RUN at end-of-run; $RUN cashes out to USDG via Solana mint.
2. **Visa Direct rail for fiat → USDG onramp.** M1 includes MoonPay / Coinbase Onramp evaluation; we'd prioritise a Visa-direct integration alongside if Visa exposes a Solana-aware API.
3. **Stablecoin trade routing for German retail.** Phoenix Rise integration ships at M5; until then the broker chassis treats USDG as a first-class settle asset alongside USDC.

## Judging criteria checklist

Per Visa's posted criteria ("product functionality, potential impact, novelty, UX, whether or not it's open-sourced, business plan"):

| Criterion | ChartRunner answer |
|---|---|
| Product functionality | Live on devnet. 2 Anchor programs deployed. Direct Phantom signing of save_map works in-page. |
| Potential impact | Retail trader onboarding is the single biggest unsolved UX problem in DeFi. ChartRunner turns 6 months of pattern-recognition learning into a 39-chapter game. |
| Novelty | First gamified Solana trading SDK. First implementation we're aware of where game primitives are 1:1 real SDK orders (not abstractions). |
| UX | Mac OS 9–style desktop, in-game LED billboard, terminal-style tabs, drag-anywhere widgets. Optimised for the 22-min focused session. |
| Open source | Anchor programs source-public at github.com/\<owner\>/chartrunner; game HTML source-public on the same repo. MIT licence. |
| Business plan | $CHART / $RUN tokenomics paper at M1. Phoenix Rise builder-code fee share is one revenue lane; on-chain registry protocol fee is another; eventual mainnet token launch via M8 tournaments is the third. |

## Submission package

- **Project title:** ChartRunner
- **Description:** Gamified Solana trading SDK. Players learn DeFi primitives by playing — every in-game ability is a real SDK call.
- **GitHub:** github.com/\<owner\>/chartrunner
- **Website:** chartrunner.xyz
- **Demo:** chartrunner.xyz/play/ (live, connect Phantom, run Campaign Ch.1)
- **Pitch video:** YouTube (delivered today)

## Tweet draft (for the Tweet Link field)

> 🇩🇪 ChartRunner — gamified Solana trading SDK · submitted to @Frontier
>
> 39-chapter Campaign teaching every DeFi primitive · 2 Anchor programs LIVE on devnet · direct Phantom sign-and-anchor
>
> Stablecoin-settled trade routing for retail. Building on @Solana for the @Visa Frontier Track.
>
> 🔗 chartrunner.xyz
