# M5 — Hyperliquid integration + production RPC (Helius)

**Status:** 🔵 QUEUED
**Theme:** Hyperliquid as a second live-trading partner alongside Phoenix Rise. Helius RPC replaces public devnet endpoint for production-grade reads. **Open question:** align with a Hyperliquid hackathon if one runs in the window?

## Completion condition (all required)

- [ ] Hyperliquid adapter scaffolded at `solana-connect/src/lib/hyperliquid.ts`
- [ ] All 6 core abilities + 11 primitives route to Hyperliquid via the SDK driver model
- [ ] Driver selector UI in Workbench (`window.crBrokers.setActive('hyperliquid')`)
- [ ] Helius RPC replaces public devnet for prod reads (kept devnet RPC as fallback)
- [ ] Hyperliquid hackathon decision: enter / sponsor-only / skip

## Imminent-solvables

### Ready bucket

> **OpenClaw data-infra crossmap (2026-05-28):** the Umbrel-side corpus at `/opt/data/chartrunner/ohlc-hyperliquid-deep/` already holds **4.79M HL candle rows** across 278 symbol dirs (~1.0 GB), per OpenClaw's 2026-05-25 health report. That's enough to feed the **"1k synthetic orders through each driver"** adapter test harness (Blocked-bucket item below) without needing a fresh HL pull. Pair with the regime-tagged subset from `coin_profiles/` for stress-test slicing (bull / bear / crab / altseason / vol-clustered windows). Cross-ref: [`MILESTONE_AUDIT.md` 2026-05-28 addendum](../../MILESTONE_AUDIT.md).

> **All 4 Ready-bucket items done 2026-05-20** (auto-resolve sweep).

- [x] 2026-05-20 — `[D]` Hyperliquid integration spec — `docs/architecture/M5-hyperliquid-spec.md`. REST `/exchange` + `/info` + WS, order schema (`t` discriminator, tpsl grouping), agent-wallet model, and a 6-ability mapping (bracket collapses to one `normalTpsl` action).
- [x] 2026-05-20 — `[D]` Helius RPC pricing — `docs/architecture/M5-helius-rpc-pricing.md`. RPC-read angle (links the `M26-helius-pricing.md` tier table, no repeat); ~3–4M credits/mo projected; recommends **Developer ($49)**.
- [x] 2026-05-20 — `[D]` Hyperliquid hackathon decision — `docs/architecture/M5-hyperliquid-hackathon.md`. Recommendation: ship the driver when ready (gated on M2.5, not the calendar); show up at **HYPE Singapore (TOKEN2049, Oct 7–8)** with a fresh HIP-3 increment.
- [x] 2026-05-20 — `[O]` Adapter-template audit — `docs/architecture/M5-adapter-template-notes.md`. `phoenix-rise.ts` is a strong *structural* template, weak *literal* one; the Hyperliquid adapter ends up simpler (JSON action signing vs Solana tx building).

### Blocked bucket

- [ ] `[D]` Hyperliquid adapter scaffold (`solana-connect/src/lib/hyperliquid.ts`) — **BLOCKED:** spec done.
- [ ] `[D]` Driver registration in `window.crBrokers` — **BLOCKED:** adapter scaffold.
- [ ] `[D]` Bracket/OCO/limit/market route via Hyperliquid — **BLOCKED:** driver registered.
- [ ] `[D]` Hedge/radar/rescue route via Hyperliquid — **BLOCKED:** basic primitives shipped.
- [ ] `[D]` Helius RPC wire-up in `chartrunner_registry` + `chartrunner_maps` reads — **BLOCKED:** pricing committed.
- [ ] `[D]` Driver selector UI in Workbench Terminal tab — **BLOCKED:** M3 Terminal tab restored.
- [ ] `[O]` Adapter test harness — 1k synthetic orders through each driver, compare fills/latency — **BLOCKED:** drivers live.

### Done bucket

(none yet)

## State

- Progress: 4/11 done — all 4 Ready-bucket items written 2026-05-20. Remaining 7 are the Blocked-bucket adapter/driver chain (scaffold → register → route primitives → Helius wire-up → selector UI → test harness), gated on the now-written spec + M2.5/M3.
- Blockers active: 7
- Scheduled today: 0

## Notes

- Hyperliquid is on its own L1, not Solana — adapter lives in `solana-connect/` but talks to HL native API. Keeps the multi-chain story honest.
- M5 depends on M2.5 (SDK extraction) so the new driver plugs into `@chartrunner/core` rather than the prototype IIFE.
- Helius RPC is a SoFlandation-tier commitment — once committed, hard to back out. Pricing decision wants $RUN economy projection from M1 to be plausible.

### Ecosystem scan 2026-05-14
- **Hyperliquid hackathon calendar locked for 2026:** London Community Hackathon (Encode Club, early 2026), HYPE Cannes meetup (Mar 31, during EthCC), and the flagship **HYPE Singapore during TOKEN2049 week (Oct 2026, 300+ builders)**. Singapore is the realistic anchor if M5 wants to align with a Hyperliquid hackathon. Update the M5-hyperliquid-hackathon.md memo accordingly.
- **Colosseum Fall Hackathon = Sep 28 → Nov 2, 2026** (per `blog.colosseum.com/2026-hackathons-…`). Natural Solana-side deadline if M5 ships before TOKEN2049; winners → Accelerator with $250K pre-seed.
- **MagicBlock** devnet endpoints stable (`devnet-as / devnet-eu / devnet-tee.magicblock.app` + `devnet.magicblock.app`); no new `ephemeral-rollups-sdk` cut today — Anchor blocker still load-bearing for M5 PvP path.
- **Helius** data tiers (LaserStream + Enhanced WS) unchanged: $500/mo (5 TB) → $6,000/mo (100 TB), overage 2 credits/0.1 MB — feeds directly into the `M5-helius-rpc-pricing.md` projection.
Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-14`.
