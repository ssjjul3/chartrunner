# ChartRunner — Cloak Frontier Hackathon Track
**Track:** Cloak · Build real-world payment solutions with privacy
**Prize:** $5,010 USDC
**Status:** integration plan delivered (Day 17 of post-Frontier sprint) · code-touch pending Cloak SDK access

---

## Honest scoping

We're submitting an **integration plan, not a working integration**. Cloak's SDK surface area isn't fully public in the docs we could find at submission time; the implementation depth depends entirely on what Cloak exposes (Solana on-chain mixer-style program? Off-chain orchestrator with a relayer? Zero-knowledge proof flow?). Rather than guess and ship broken code, we're laying out the **three concrete integration points** where Cloak fits ChartRunner — any of which can be live in 1-3 days once we have the SDK in hand.

## Why ChartRunner is a fit for Cloak

Cloak's scope: *"Real-world payment solutions with privacy on Solana."* ChartRunner is a real-world payment surface with three layers where privacy has obvious value:

### Integration point 1 — Confidential trade size on the broker chassis

Our Jupiter (v1.0.53) + Jito (v1.0.54) brokers currently submit swaps as plaintext mainnet transactions. Anyone watching the mempool sees:
- Player wallet address
- Trade size in raw lamports
- Source and destination mints
- The slippage tolerance (which tells you their expected fill)

A Cloak-wrapped broker would obscure at least one of these — most naturally, the **trade size**. If Cloak's primitive is amount-blinding (commitment-and-reveal pattern), the broker could:

1. Player arms a Blue Laser trade for 5.0 SOL
2. Broker.submit() routes through Cloak's "private size" wrapper
3. Cloak commits to the swap amount; submits the commitment on-chain
4. Validator-side execution reveals at fill time
5. Mempool watchers see "swap happened" but not "swap was 5 SOL"

This is a **new broker driver**, slotted alongside `jupiter` / `jito` / `phoenix`:

```js
// sdk-m1-scaffold/sdk/brokers/cloak.js
import { jupiterBroker } from './jupiter.js';
import { CloakClient } from '@cloak/sdk';   // pending SDK access

export const cloakBroker = {
  key:   'cloak',
  label: 'Cloak · privacy-wrapped Jupiter',
  state: 'pending',                          // → 'live' once SDK lands
  venue: 'cloak-on-jupiter',

  async submit(order){
    // Get Jupiter quote, build swap tx, wrap in Cloak commitment, send.
    // ~ same shape as jito.js wrapping jupiter.js.
  },
};
```

Same 5-driver registry pattern; one more line in `brokers/index.js`.

### Integration point 2 — Private $RUN → fiat off-ramp at M1

The M1 tokenomics whitepaper has $RUN cashing out to USDC / USDT / fiat via MoonPay or Coinbase Onramp. Both providers require KYC and observe the payout amount.

Cloak as an alternative off-ramp lane: $RUN → cUSDC (Cloak-wrapped USDC) → off-ramp to a different counterparty per session, so the M1 payout pattern doesn't leak "this wallet earned X $RUN this week" to any single observer. The privacy is at the off-ramp surface, not the gameplay surface.

This is M1 work — won't ship for Frontier itself, but the design slot exists.

### Integration point 3 — Sealed tournament entry at M8

The M8 milestone is **NvN player token launches** — players each launch a token, fight on the chart, win opponent supply. Tournament entry fees in stablecoins; per the original roadmap, "World ID proof-of-human gate against bot farms."

Cloak's privacy layer adds a complementary primitive: **sealed entry**. A player's entry amount and choice of opponent token are committed but not revealed until the tournament starts. Prevents front-running of entry bracket order, prevents whales from copying entry strategy. Same Cloak primitive as integration point 1, different surface.

## What we'll ship when SDK access lands

| Order | Item | Effort | Frontier-relevant |
|---|---|---|---|
| 1 | `sdk-m1-scaffold/sdk/brokers/cloak.js` — privacy-wrapped Jupiter broker | 1-2 days | ✓ (this submission) |
| 2 | Tutorial slide 7 footnote: "BLUE LASER + Cloak = private trade size" | 30 min | ✓ |
| 3 | Demo flow: open broker picker → set 'cloak' → fire trade → tx is confirmed-but-amount-hidden | 1 day | ✓ |
| 4 | M1 design slot: $RUN off-ramp via Cloak | post-Frontier | — |
| 5 | M8 design slot: sealed tournament entry via Cloak | post-Frontier | — |

## Submission package

- **Project title:** ChartRunner — Cloak as a privacy-wrapped broker driver
- **Description:** Integration plan for adding Cloak as the 6th broker in ChartRunner's broker chassis. Wraps Jupiter routing with Cloak's privacy primitive to obscure trade size on the mempool. Same `BrokerAdapter` contract as the 5 existing drivers; one additional line in the registry. Plus M1 design slot for private $RUN off-ramp + M8 design slot for sealed tournament entry. Code-touch pending Cloak SDK access.
- **GitHub:** github.com/\<owner\>/chartrunner · `docs/SUBMISSION-CLOAK.md` (this file)
- **Website:** chartrunner.xyz
- **Demo path:** N/A pre-SDK. Once Cloak SDK accessible: clone repo → `cd sdk-m1-scaffold/sdk/brokers && npm install @cloak/sdk` → set broker `cloak` → fire any trade → tx confirms with hidden amount.
- **Sponsor integrated:** Cloak (design integration; code follows SDK access)

## Why this honest framing wins anyway

Cloak's bounty has 6 submissions at writing. Many will throw together a 1-tool demo. ChartRunner ships the **architecture** that lets Cloak slot into a real product across three distinct surfaces — broker driver, off-ramp lane, tournament entry seal — backed by 14 already-integrated sponsor tracks worth ~$135k of submitted value.

If Cloak's team wants a real production integration after Frontier, ChartRunner's broker chassis is the cleanest target on the hackathon: 5 LIVE driver slots already proven, one more line of code adds Cloak.

## Tweet draft

> 🥷 ChartRunner's 6th broker slot is reserved for @Cloak.
>
> Same chassis as @JupiterExchange + @jito_sol. Wraps the swap tx in Cloak's privacy primitive — fill happens, mempool watchers see "swap" but not "size."
>
> Plus M1 design slot: private $RUN off-ramp. M8 design slot: sealed tournament entry.
>
> Code lands the moment SDK access ships. 🔗 chartrunner.xyz · Frontier Cloak track
