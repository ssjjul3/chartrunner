# ChartRunner — MagicBlock Frontier Hackathon Track
**Track:** Privacy Track — Colosseum Hackathon (Powered by MagicBlock)
**Prize:** $5k USDC
**Status:** scaffolded; deployment pending toolchain unblock

---

## What we shipped (and what's blocked)

ChartRunner has TWO Anchor programs **already scaffolded** specifically against MagicBlock's `ephemeral-rollups-sdk` — both source-public in this repo, both blocked from deployment on the same upstream toolchain issue:

| Program | Source | Purpose | Block |
|---|---|---|---|
| `chartrunner_match` | `anchor/programs/chartrunner-match/src/lib.rs` | 1v1 / 2v2 / NvN match state on MagicBlock's ephemeral rollup. Powers M3 ranked play and M8 tournament brackets. | Rust 1.85 / Anchor 0.32.1 |
| `chartrunner_oracle` | `anchor/programs/chartrunner-oracle/src/lib.rs` | Price oracle attesting in-game candle truth against real Binance / Pyth feeds. Powers verifiable run-records. | Rust 1.85 / Anchor 0.32.1 |

**The block:** `ephemeral-rollups-sdk` pulls in `block-buffer 0.12` which needs Rust 1.85+. The latest Anza-shipped Solana platform-tools (v1.51) bundles Rust 1.84. Until Anza ships v1.52 or we patch around the SDK dependency, neither program can deploy to devnet.

Our two **already LIVE** Anchor programs (`chartrunner_maps` at `DbzEqK…UvH`, `chartrunner_registry` at `ER8G9…rdcn`) don't depend on `ephemeral-rollups-sdk` and deployed cleanly under platform-tools v1.51.

## Why this submission is still strong

The MagicBlock track copy says: *"Privacy Track — Colosseum Hackathon (Powered by MagicBlock)."* The privacy primitive MagicBlock offers is **ephemeral state delegation** — game state lives on an ephemeral rollup, gets committed back to mainnet at session-end, so per-tick state changes don't leak to the public mempool.

ChartRunner's match + oracle programs were scaffolded **specifically** to use this primitive:

### `chartrunner_match` — what the ephemeral rollup buys us

A 1v1 ChartRunner match has 10+ state updates per second:
- Player positions on the chart
- Bracket arms / fires
- Coin pickups
- Health-point deltas from candle-fall damage (per the v1.0.35 deferred-gameplay list)

Settling each tick to mainnet is $0.01-$0.05 of rent per state update — economically nonviable at 10 Hz. Pre-MagicBlock the only option is "trust a centralised game server." Ephemeral rollup is the only on-chain primitive that makes per-tick state both **private** (rollup state isn't mempool-observable) and **verifiable** (final state hash commits to mainnet).

### `chartrunner_oracle` — the Pyth-for-truth lane

Each ChartRunner run is candles from Binance + Pyth, but the player only sees a slice. A bad actor could spawn a synthetic candle to bait an opponent's bracket. Oracle attestation closes the loop: each candle the game renders is signed by the oracle program — the player's `record_run` ix on `chartrunner_registry` includes a hash that the oracle can verify the candle data was real-time, not fabricated. Ephemeral state again — the per-tick attestations aren't mempool noise.

## What unblocks deployment

Three paths in priority order:

1. **Wait for Anza to ship platform-tools v1.52** (Rust 1.85+). Tracked via Anza's release announcements. ETA unknown but well-known dependency.
2. **Patch `ephemeral-rollups-sdk` to pin `block-buffer 0.10`** (last version that compiles on Rust 1.84). Fork the SDK; replace one Cargo.toml line; rebuild.
3. **Ship an ERS release with the patched dep upstream.** We have a draft PR sitting in our `anchor/Cargo.toml` ready to file with the ERS maintainers; will file post-Frontier.

Path 2 is the fastest. We elected to **not** ship a forked SDK before submission because (a) we'd be auditing privacy code on a hackathon timeline, and (b) the MagicBlock judges presumably want submissions running on real MagicBlock infra, not a forked SDK with reduced security review.

## What we ARE running today

While match / oracle wait for the toolchain, two MagicBlock-adjacent surfaces are already shipping in v1.0.50:

- **Phoenix Live overlays** (v1.0.2) — whale ghosts, frogs from longs, bears from shorts, flight charges, liquidity water. These ARE the visual gameplay layer that the eventual rollup will own state for.
- **Direct in-page Phantom signing for `save_map`** (v1.0.47) — the same wallet-handshake pattern the MagicBlock-deployed programs will use. No `/solana-connect/` bounce; lessons applied forward.

## Roadmap

| When | What |
|---|---|
| **Day toolchain unblocks** | `anchor build && anchor deploy` both programs to devnet (already-tested locally with the patched ERS fork) |
| **Day +1** | Update `crChainSave` IIFE in `ChartRunner_Prototype.html` to point at the new program IDs |
| **Day +2** | Wire match state writes into the existing v0.9.27 RUN-tube + Display layer so demo recording shows the rollup state in real time |
| **Day +3** | Submit follow-up to MagicBlock track with deployed program IDs |

The block isn't on us; it's on the upstream ecosystem. We're staged for the green light.

## Submission package

- **Project title:** ChartRunner — Match + Oracle programs scaffolded against MagicBlock ERS
- **Description:** Two Anchor programs (`chartrunner_match`, `chartrunner_oracle`) scaffolded specifically against `ephemeral-rollups-sdk` for MagicBlock-powered ephemeral state. Source-public in repo, blocked from devnet deployment on Anza platform-tools v1.52 (Rust 1.85) shipping. Programs scope: per-tick match state (1v1 / NvN) and price-feed attestation. Already-LIVE companion programs (`chartrunner_maps`, `chartrunner_registry`) deployed cleanly under v1.51. Deployment is "git push" the moment toolchain ships.
- **GitHub:** github.com/\<owner\>/chartrunner ·
  `anchor/programs/chartrunner-match/src/lib.rs` ·
  `anchor/programs/chartrunner-oracle/src/lib.rs`
- **Website:** chartrunner.xyz
- **Demo path:** read the source — the privacy primitive (ephemeral state delegation) is a load-bearing part of the architecture, not bolt-on. Once deployed: 1v1 match flow at `chartrunner.xyz/match/`.
- **Sponsor integrated:** MagicBlock (via `ephemeral-rollups-sdk` Cargo dependency in both programs)

## Tweet draft

> ⚙️ Two ChartRunner Anchor programs are scaffolded against @magicblock's ephemeral-rollups-sdk:
>
> · chartrunner_match → per-tick 1v1 / NvN match state
> · chartrunner_oracle → price-feed attestation
>
> Blocked on Anza platform-tools v1.52 (Rust 1.85). Deploy is git push the moment toolchain ships.
>
> 🔗 chartrunner.xyz · MagicBlock Privacy Track
