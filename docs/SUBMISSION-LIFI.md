# ChartRunner — LI.FI Frontier Hackathon Track (Superteam Germany)
**Track:** Build with LI.FI · Superteam Germany
**Prize:** $2.5k USDC
**Status:** integrated in v1.0.58 (Day 15 of post-Frontier sprint)

---

## What we shipped

A **`+ Fund`** button on the in-game wallet card opens a LI.FI cross-chain funding modal (Jumper Exchange iframe, LI.FI's own frontend). Players can route assets from any supported chain — Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, etc — straight to their connected Solana wallet, in two clicks, without leaving the game.

Pre-configured destination: USDC on Solana, auto-filled to the connected ChartRunner pubkey. Players who arrive with ETH and want to trade SOL/USDT on ChartRunner skip the entire CEX detour.

## Why this wins the LI.FI Superteam Germany track

The track scope says: *"Integrate LI.FI to power cross-chain functionality in your Solana app. Cross-chain swaps, deposits, multi-step txs, complex DeFi flows, AI agents executing transactions, any novel use-case."*

Eligibility check:
- [x] Project submitted to Colosseum Frontier ✓
- [x] Superteam Earn submission marked Germany ✓
- [x] Eligible per the official global hackathon rules ✓

ChartRunner's novel use-case: **LI.FI as the trading-wallet funding layer**, not just a swap surface. Players topping up from EVM chains land directly in the wallet that powers the in-game broker chassis (Jupiter / Jito / Phoenix). The destination wallet is the SAME wallet used by:

- Direct in-page Phantom `save_map` signing (v1.0.47)
- SNS Identity primary-domain reads (v1.0.51)
- Jupiter swap routing (v1.0.53)
- Jito MEV-protected bundles (v1.0.54)
- USDT settle (v1.0.55)
- Zerion agent portfolio reads (v1.0.56)
- Torque MCP `submit_trade` calls (v1.0.57)

Funding via LI.FI is the **on-ramp** to that entire stack. One wallet, one cross-chain hop, every subsequent ChartRunner primitive available.

## Technical integration

### `ChartRunner_Prototype.html` — three small additions

**1.** "+ Fund" button on the $CRDS card in the lite-profile Wallet tab:

```html
<div class="lp-wcard-head">
  <span class="k">$CRDS · this run</span>
  <button class="lp-fund" id="crLpFundBtn" type="button">+ Fund</button>
</div>
```

**2.** Card-head + Fund-button styles — mint-on-dark, hover gets the same green-glow language as the broker pills.

**3.** `window.crLifiFunding` IIFE at end of script. Lazy-builds the modal on first open; src-clears the iframe on close so we don't keep the LI.FI session alive in the background.

### How the iframe is configured

Jumper accepts pre-config via URL params. For ChartRunner:

```js
function _jumperUrl(toAddress){
  var u = new URL('https://jumper.exchange/');
  u.searchParams.set('toChain',  '1151111081099710');           // Solana
  u.searchParams.set('toToken',  'EPjFWdd5...USDC mint...');     // USDC on Solana
  if(toAddress) u.searchParams.set('toAddress', toAddress);     // connected wallet
  u.searchParams.set('theme', 'dark');
  return u.toString();
}
```

Destination wallet is auto-filled from `window.crWallet.get()`. If no wallet connected, the widget still loads but the user has to paste the destination address manually.

### Modal hardening

- **Backdrop click** closes the modal
- **Escape key** closes the modal
- **iframe `sandbox`** + `allow` attrs: scripts, forms, popups, popups-to-escape-sandbox, storage-access. Phantom wallet popup pages need `popups-to-escape-sandbox` to render correctly when triggered from inside the LI.FI iframe.
- **`allow="clipboard-read; clipboard-write; payment *"`** for copy-paste of swap details + payment intents
- **iframe src cleared to `about:blank`** on close so the LI.FI session doesn't keep polling chain APIs in the background

### Where it fits in the game flow

```
Player opens game
  → lite-profile Wallet tab
  → sees "$CRDS · this run · 0" with "+ Fund" badge
  → clicks Fund
  → LI.FI modal opens, destination auto-filled
  → swap ETH → USDC on Solana
  → wallet receives USDC, ready for $RUN → USDT/USDC pairs
  → close modal, fire Blue Laser, broker (Jupiter/Jito) routes the trade
```

Zero CEX detour. Zero wallet juggling. Same Phantom session throughout.

## Bonus: this surface also reinforces Visa Germany

The Visa Germany submission (v1.0.x docs) frames ChartRunner as "stablecoin-settled trade routing for German retail." LI.FI is the missing bridge: German players holding ETH on a CEX can withdraw to a self-custodied EVM wallet, then use ChartRunner's `+ Fund` button to land on Solana USDC without ever touching another centralised venue. Same widget, two track narratives.

## Submission package

- **Project title:** ChartRunner — LI.FI as the trading-wallet on-ramp
- **Description:** Cross-chain funding modal embedded in ChartRunner's in-game wallet card. Players fund their Solana trading wallet from ETH/BSC/Polygon/Arbitrum/etc via LI.FI (Jumper Exchange iframe) in two clicks. Destination auto-filled to the same Phantom session that powers Jupiter / Jito / Zerion / Torque MCP routes. One wallet, every ChartRunner primitive.
- **GitHub:** github.com/\<owner\>/chartrunner · search `crLifiFunding` in `ChartRunner_Prototype.html`
- **Website:** chartrunner.xyz
- **Demo path:** chartrunner.xyz/play/ → connect Phantom → open lite profile → Wallet tab → "+ Fund" → LI.FI modal opens with destination prefilled → ready for cross-chain swap
- **Sponsor integrated:** LI.FI (via Jumper Exchange — LI.FI's own frontend)
- **Region:** Superteam Germany ✓

## Tweet draft

> 🌉 @lifiprotocol just became @ChartRunner's funding layer.
>
> Click "+ Fund" in the wallet card → Jumper iframe opens → cross-chain swap from ETH/BSC/Polygon/Arbitrum lands directly in your ChartRunner Phantom session.
>
> Same wallet for fund-in → trade via Jupiter → MEV-protect via Jito → identity via SNS → save on-chain via chartrunner_maps.
>
> 🇩🇪 🔗 chartrunner.xyz · Superteam Germany track
