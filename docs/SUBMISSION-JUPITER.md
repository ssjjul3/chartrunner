# ChartRunner — Jupiter Frontier Hackathon Track
**Track:** Jupiter · Not Your Regular Bounty
**Prize:** $3k jupUSD
**Status:** integrated in v1.0.53 (Day 8-9 of post-Frontier sprint)

---

## What we shipped

The ChartRunner broker chassis (v1.0.4) now has **Jupiter as the fourth registered driver**. Switch the active broker to `'jupiter'` and every in-game trade primitive — Bracket fire, OCO trigger, BLUE LASER activation on a placed tool — routes through Jupiter v6 with on-chain settlement.

This is the first **live** broker in the registry that actually settles on-chain. Mock fills in memory, Binance Paper hits testnet, Phoenix waits on an npm publish — Jupiter is the one you can run with real lamports right now.

## Architecture fit

The broker pattern was designed for exactly this drop-in:

```
ChartRunnerSDK.scoreSetup() → produces signal
   ↓
Player arms tool with Blue Laser (Hotkey 4)
   ↓
Game emits: order = { side, size, type, price }
   ↓
   currentBroker().submit(order)   ← only this line cares which venue
   ↓
   ┌── mock           → in-memory fill
   ├── binance-paper  → REST testnet
   ├── phoenix        → (pending publish)
   └── jupiter        → /v6/quote → /v6/swap → signAndSendTx ← v1.0.53
   ↓
Fill record → game state → optional record_run on chartrunner_registry
```

Zero change to in-game UX. Players see the same blue-lightning halo on armed tools, the same fill toast, the same notebook entry. The settlement venue is invisible — which is exactly what a SDK is supposed to feel like.

## Technical integration

### File: `sdk-m1-scaffold/sdk/brokers/jupiter.js`

Three exports:
- `jupiterBroker` — the BrokerAdapter object (`key`, `label`, `state`, `venue`, `submit`, `cancel`, `balance`)
- `quote(opts)` — fetch-only quote helper. Used by the game UI to preview the route + slippage before the player arms a trade
- `setEndpoint(quote, swap)` — point at a paid Jupiter endpoint if rate-limited

### Submit() flow (per Jupiter v6 docs)

```js
1. GET https://quote-api.jup.ag/v6/quote
     ?inputMint=<USDC|SOL>
     &outputMint=<SOL|USDC>
     &amount=<raw lamports>
     &slippageBps=50

2. POST https://quote-api.jup.ag/v6/swap
     body: { quoteResponse, userPublicKey, wrapAndUnwrapSol: true,
             prioritizationFeeLamports: 'auto',
             dynamicComputeUnitLimit: true }
     returns: { swapTransaction (b64 versionedTx), lastValidBlockHeight }

3. tx = VersionedTransaction.deserialize(base64-decode(swapTransaction))

4. const { signature } = await provider.signAndSendTransaction(tx)

5. await connection.confirmTransaction({ signature, lastValidBlockHeight }, 'confirmed')

6. return {
     id, side, size, price: derived from inAmount / outAmount,
     ts, venue: 'jupiter', txSig, routePlan, inAmount, outAmount
   }
```

### Settlement

Each fill returns the Jupiter `routePlan` (which DEXes the swap touched — Raydium / Orca / Phoenix / Meteora / etc) so the in-game journal entry shows the actual execution route, not just the headline pair. Players see "filled at $137.42 · routed through Phoenix → Raydium" — the SDK becomes educational hardware.

When the player has wallet-connected and on-chain run recording is on, the fill triggers a follow-on `record_run` ix on `chartrunner_registry` (program `ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn`). That's Chapter 39 capstone Shift 3: *"every fill is provable on-chain."*

### Auth + rate limiting

Jupiter's public quote+swap API works unauthenticated at moderate rates (sufficient for one-player-at-a-time demo flow). For production scaling we'd:
- Point at a paid endpoint via `setEndpoint('https://...your-endpoint/.../v6/quote', '...')`
- Add a 1s client-side debounce so the player can hold-fire the Blue Laser without hammering quotes
- Cache quotes for 5s per pair so the route preview shows instantly on re-arm

### Decimal handling

Quote endpoint expects raw token units. The adapter currently assumes SOL=9 decimals, USDC=6 decimals (correct for the default pair). For arbitrary token pairs we'd query mint decimals via `getMint()` on `@solana/web3.js` before constructing the request — flagged as TODO inline.

## Why Jupiter is "Not Your Regular Bounty"

Jupiter's track copy says they want submissions where Jupiter does something *non-obvious*. ChartRunner answers two ways:

1. **Jupiter as broker, not just swap widget.** Most Jupiter integrations embed the swap modal in their UI. ChartRunner makes Jupiter one of four interchangeable broker drivers — so the *same* Bracket / OCO / Ladder primitive routes through whichever venue the player picks. Jupiter is the implementation, not the product surface.
2. **Educational settlement.** Every Jupiter fill's `routePlan` becomes a chapter beat. Players see WHERE their swap actually filled — across which DEXes, in what order, at what cost. ChartRunner is the first game that uses Jupiter's route data as *content*, not just plumbing.

## Submission package

- **Project title:** ChartRunner — Jupiter as a Broker Driver
- **Description:** Jupiter v6 integrated as the fourth broker in ChartRunner's broker registry. Every in-game trade primitive (Bracket / OCO / Ladder / TWAP) routes through Jupiter when the player picks it. Route plan surfaces in the fill journal — the game teaches WHERE your swap fills, not just THAT it fills.
- **GitHub:** github.com/\<owner\>/chartrunner · `sdk-m1-scaffold/sdk/brokers/jupiter.js`
- **Website:** chartrunner.xyz
- **Demo path:** open game → Workbench → set broker = 'jupiter' → run Campaign Ch.7 (Bracket-the-breakout) → fire Blue Laser on a placed Bracket → Phantom popup → signed → fill journal shows routePlan
- **Sponsor integrated:** Jupiter v6 aggregator (quote + swap API)

## Tweet draft

> 🪐 @JupiterExchange just became a broker driver inside @ChartRunner.
>
> The same Bracket / OCO / Ladder primitive routes through Mock → Binance Paper → Phoenix → Jupiter, picked per player. Live on-chain via /v6/swap + Phantom signAndSendTx.
>
> Bonus: every fill journal entry shows the routePlan. The game teaches where your swap actually fills.
>
> 🔗 chartrunner.xyz · Not Your Regular Bounty
