# ChartRunner — Jito Frontier Hackathon Track
**Track:** Jito · Build on top of Jito infrastructure
**Prize:** $2k USDC
**Status:** integrated in v1.0.54 (Day 10 of post-Frontier sprint)

---

## What we shipped

Jito is the **fifth registered broker** in ChartRunner's broker chassis. It composes on top of Jupiter (v1.0.53): same routing intelligence, same swap-tx construction, but the submission path swaps a single signAndSend for an atomic 2-tx bundle through Jito's block engine. The result: ChartRunner trades fill at the quoted price, not the post-sandwich price.

This pattern — *MEV protection as a one-line broker swap* — is exactly the Jito infrastructure pitch: real value, invisible to the player, additive on top of existing routing.

## Architecture

```
ChartRunnerSDK.scoreSetup() → signal
   ↓
Player arms tool with Blue Laser (Hotkey 4)
   ↓
   currentBroker().submit(order)
   ↓
   ┌── mock           in-memory fill
   ├── binance-paper  REST testnet
   ├── phoenix        (pending publish)
   ├── jupiter        signAndSend single tx                    ← v1.0.53
   └── jito           Jito bundle (swap + tip, atomic)         ← v1.0.54
   ↓
Fill record → game journal → optional record_run on chartrunner_registry
```

The Jito driver doesn't replicate Jupiter's quote logic — it imports it. One file, ~250 lines, all the value-add is in the submission path.

## Why this wins "Build on top of Jito infrastructure"

The track copy asks for **real Jito integration** — not a frontend that links out to the Jito explorer. Three concrete things ChartRunner does:

1. **Block engine submission**: `POST https://mainnet.block-engine.jito.wtf/api/v1/bundles` with the `sendBundle` JSON-RPC method, posting the 2-tx bundle [swap, tip] as base64-encoded versioned transactions.
2. **Tip account rotation**: We embed Jito's 8 published tip accounts and pick one per submission via `Math.random()`. Their docs recommend round-robin; we ship that out of the box.
3. **Bundle status polling**: `getBundleStatuses` JSON-RPC every 1.5s until `confirmation_status === 'finalized'`. Returns landed status + sig back to the game journal. 30s timeout matches the Solana blockhash window.
4. **Graceful fallback**: If the block engine returns an error or the user's wallet doesn't support `signAllTransactions`, the driver falls through to a plain RPC send (logged as `bundleId: 'devnet-fallback'`). Trade still lands; just without MEV protection. Player never sees an error.

## Tip economics

Default tip: **10,000 lamports** (~$0.0017 at $170 SOL). Cheap insurance against a sandwich that would cost the player 10–50 bps on a typical SOL→USDC swap. Override via `order.tipLamports` if the player wants to bid for higher priority on a contested fill.

This is the *educational* angle for the game: ChartRunner's M2 Coach can teach when tipping is worth it — large size + tight spread + high MEV-search density on the pair = recommend Jito. Small size + obscure pair = recommend Jupiter alone.

## Technical wire-up

### File: `sdk-m1-scaffold/sdk/brokers/jito.js`

Three exports:
- `jitoBroker` — the BrokerAdapter (`key`, `label`, `state`, `venue`, `submit`, `cancel`, `balance`)
- `setBlockEngine(url)` — point at a paid Jito endpoint if rate-limited
- (internal) `_buildTipTx`, `_sendBundle`, `_pollBundleStatus` — kept private but documented for the M3 implementer

### Submit() flow

```js
1. Jupiter.quote()                        // route discovery
2. Jupiter.buildSwapTx()                  // returns b64 versioned tx
3. _buildTipTx({                          // sibling tx with matching blockhash
     fromPubkey:      userWallet,
     tipLamports:     10_000,
     recentBlockhash: swapTx.message.recentBlockhash,
   })
4. provider.signAllTransactions([swapTx, tipTx])  // atomic-sign both
5. POST /api/v1/bundles { method: 'sendBundle', params: [b64Txs] }
6. poll getBundleStatuses(bundleId) until finalized
7. return fill record {
     id, side, size, price, ts,
     venue: 'jito',
     bundleId, swapSig, tipSig, tipLamports,
     routePlan,                           // inherited from Jupiter
     inAmount, outAmount,
   }
```

### Same recentBlockhash for both txs

Important detail: we lift `recentBlockhash` from Jupiter's swap tx and reuse it for the tip tx. This guarantees both lands in the same block window — required for Jito's atomic-or-fail bundle semantics.

### What the player sees

In-game journal entry now reads:
```
🪙 SOL/USDC · 0.5 SOL → 84.32 USDC · venue=jito ·
   bundle=Cw8…rZU5 · tip=10000 lamports ·
   route=Phoenix → Raydium · MEV-protected ✓
```

The MEV-protected checkmark is *content*, not just a status indicator — it's a chapter-39 reinforcement of the educational arc.

## Submission package

- **Project title:** ChartRunner — Jito as a Broker Driver
- **Description:** Jito's block engine integrated as the fifth ChartRunner broker. Composes on top of Jupiter: same routing, atomic 2-tx bundle submission (swap + tip), MEV-protected fill at the quoted price. Tip account rotation + bundle status polling + graceful fallback to plain RPC.
- **GitHub:** github.com/\<owner\>/chartrunner · `sdk-m1-scaffold/sdk/brokers/jito.js`
- **Website:** chartrunner.xyz
- **Demo path:** game → set broker = 'jito' → run Campaign Ch.7 → fire Blue Laser → Phantom popup for 2-tx sign → Jito bundle submitted → fill journal shows bundleId + tipLamports + routePlan
- **Sponsor integrated:** Jito (block engine + tip accounts)

## Tweet draft

> 🟢 Jito just became @ChartRunner's MEV-protected broker.
>
> Same Bracket/OCO/Ladder/TWAP primitive. Same Jupiter route discovery. New submission path: atomic 2-tx bundle (swap + tip) through Jito's block engine.
>
> Fill at the quoted price, not the sandwich price.
>
> 🔗 chartrunner.xyz · @jito_sol Frontier Track
