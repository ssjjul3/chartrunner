# ChartRunner — RPC Fast $10k Infrastructure Credit Application
**Track:** RPC Fast · $10,000 in RPC Infrastructure Credits for Colosseum Frontier Hackathon
**Prize:** $10k in RPC credits

---

## Why ChartRunner is an RPC-heavy workload

Every active player generates significant RPC traffic. ChartRunner is *not* a "RPC once at boot" app — it's a continuous read-write pattern that benefits directly from low-latency, high-throughput infrastructure.

### Current RPC consumption profile

Pulled from the v1.0.50 codebase (`grep -n 'api.devnet.solana.com' ChartRunner_Prototype.html`):

**Reads (per session):**
- **`getBalance`** on connect + every 30 s while wallet is open (real SOL balance display in Profile · Wallet tab). Source: line 23561+ `_crWalletFetchSol`.
- **`getProgramAccounts`** with `dataSize` + `memcmp` filters on `RunRecord` discriminator. Polls every 60 s while a session is active to surface ghost-runs of other players on the same asset+timeframe. Source: `crGhost` IIFE at line 9999+.
- **`getAccountInfo`** for NFT metadata fetches (M2.6 Helius DAS when ready; currently offline-cached).

**Writes (per session):**
- **`getLatestBlockhash` + `signAndSendTransaction`** per Save action when a player anchors a map. Direct-Phantom path lives in `crMapsTx` IIFE (v1.0.47, line ~41666).
- **`confirmTransaction`** poll after each save.
- **`record_run`** ix per game-over (when wallet connected and the game-over screen offers on-chain leaderboard entry).

### Order-of-magnitude estimates

Conservative: a single 22-minute Campaign run = ~50 RPC reads + 1-3 writes (save anchor + optional run record).

If we onboard 1,000 weekly active players each playing 3 sessions/week:
- ~150,000 reads/week
- ~3,000-9,000 writes/week
- Plus polling traffic from idle clients (`getProgramAccounts` every 60s on inactive tabs is ~10,000 reads/week per 1k tabs)

Total: ~10-20M reads/month at moderate adoption. That's the regime where RPC Fast's pricing tier starts mattering.

### Public devnet RPC pain points we currently hit

1. **`block-height-exceeded` errors** on the legacy `/solana-connect/` bounce signing flow (fixed in v0.9.72 by retry, then made obsolete in v1.0.47 by direct Phantom signing). A faster RPC reduces the blockhash-stale window.
2. **`getProgramAccounts` rate limits** on public devnet for the `crGhost` ghost-run poll (currently throttled to 60s; want 15s).
3. **No `getSignatureStatuses` batching** on public devnet — each save's confirmation is one round-trip. Faster RPC = batched status checks = better UX.

## What we'd use the $10k credits for

| Use case | Estimated credit consumption |
|---|---|
| Replace `https://api.devnet.solana.com` constant in `crGhost` + `crMapsTx` + `_crWalletFetchSol` with RPC Fast endpoint | ~3M credits/month at current usage |
| Enable `getProgramAccounts` poll at 15s instead of 60s for the ghost-run feed | ~2M credits/month |
| Add a `getSignatureStatuses` batched confirmation path for multi-save campaign chapters | ~500k credits/month |
| Production-grade `getBalance` cache layer (15s TTL → 3s with RPC Fast) | ~1M credits/month |
| **Buffer for growth** post-Frontier as M0.5 + M1 land | ~3.5M credits |

## One-line code swap when credits land

The current public devnet constant is referenced in exactly two places — change once, takes effect across the whole app:

```js
// ChartRunner_Prototype.html line ~10005 (crGhost) and line ~41187 (crMapsTx)
var RPC_URL = 'https://api.devnet.solana.com';
//                              ↓  swap to  ↓
var RPC_URL = 'https://devnet.rpc-fast.io/?api-key=<key>';
```

Plus the `_crWalletFetchSol` constant at line 23564:
```js
const _CR_DEVNET_RPC = 'https://api.devnet.solana.com';
//                                       ↓
const _CR_DEVNET_RPC = 'https://devnet.rpc-fast.io/?api-key=<key>';
```

Three constants. One PR. Zero risk to the existing flows.

## Why we should win this credit

- ChartRunner is **already deployed** to devnet — credits go straight to production traffic, not "we'll integrate later".
- **2 LIVE Anchor programs** at `DbzEqK…UvH` and `ER8G9…rdcn` that emit `MapSaved` / `EntitySaved` / `RunRecorded` events — we're a real read-heavy customer.
- **Predictable usage pattern** — RPC reads scale linearly with active players, no surprise spikes.
- **Public testimonial commitment** — if we win the credits, we'll write a public blog post + tweet thread documenting the RPC Fast latency improvement vs. public devnet, with numbers.

## Submission package

- **Project title:** ChartRunner
- **Description:** Gamified Solana trading SDK with continuous read/write RPC pattern — getProgramAccounts polling, save_map anchoring, balance refreshes. Already devnet-live; credits go straight to production traffic.
- **GitHub:** github.com/\<owner\>/chartrunner
- **Website:** chartrunner.xyz
- **Demo:** chartrunner.xyz/play/ — open DevTools Network tab, filter "rpc", watch the traffic for 60s

## Tweet draft

> 🛰 @ChartRunner is already devnet-LIVE with 2 Anchor programs + a getProgramAccounts ghost-feed polling every 60s.
>
> Applying for @rpcfast credits to drop the poll to 15s, batch our save-confirmations, and ship a production-grade SOL balance cache.
>
> Credits go straight to production traffic. 🔗 chartrunner.xyz
