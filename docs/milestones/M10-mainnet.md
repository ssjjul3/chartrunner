# M10 — Mainnet deploy

**Status:** 🔵 QUEUED (the finale)
**Theme:** Audit-clean Anchor programs deployed to Solana mainnet-beta. Phoenix Rise + MagicBlock + Honeycomb + Pyth integrations move from devnet to live. CASH and $RUN become spendable, not just demo currencies.

## Completion condition (all required)

- [ ] `chartrunner_maps` deployed to mainnet, upgrade authority = Squads multisig (M0.5)
- [ ] `chartrunner_registry` deployed to mainnet, upgrade authority = Squads
- [ ] `chartrunner_match` deployed to mainnet (depends on M0.5 unblock)
- [ ] `chartrunner_oracle` deployed to mainnet (depends on M0.5 unblock)
- [ ] All four programs audited (M0.5)
- [ ] Phoenix Rise live integration (real fills via `@ellipsis-labs/rise` mainnet)
- [ ] MagicBlock ER live (real PvP matches settled to mainnet)
- [ ] Honeycomb live (real $CHART / $RUN as compressed Honeycomb resources)
- [ ] Pyth live (real price certificates on mainnet)
- [ ] CASH stablecoin live (real settlements in M8 tournaments)
- [ ] Production RPC: Helius (M5) on mainnet endpoints
- [ ] First mainnet RunRecord PDA minted from a real player
- [ ] Marketing push: announcement post + Solana Foundation alignment

## Imminent-solvables

### Ready bucket

> **All 3 Ready-bucket items done 2026-05-20** (auto-resolve sweep).

- [x] 2026-05-20 — `[D]` Mainnet deploy checklist — `docs/architecture/M10-mainnet-checklist.md`. Preconditions + ~18 SOL program rent (~20 SOL budget) + a 7-step deploy sequence (verifiable build → fresh keypairs → buffer-deploy under the multisig → Squads upgrade round-trip → wire-ups → RPC cutover → smoke test).
- [x] 2026-05-20 — `[D]` RPC cost projection — `docs/architecture/M10-rpc-cost-projection.md`. Links `M26-helius-pricing.md` + `M1-sim/`; ~1.5M credits/mo base, ~9–10M stress; recommends **Developer ($49)** at launch (Free fails on credits + RPS; Business is the upgrade trigger).
- [x] 2026-05-20 — `[O]` Devnet→mainnet diff — `docs/architecture/M10-devnet-mainnet-diff.md`. **20 flip points** across prototype/`solana-connect`/`anchor`. ⚠ Found an **oracle program-ID mismatch**: `Anchor.toml:23` + `oracle/src/lib.rs:40` declare a stale placeholder (`7FJjBq98…`) instead of the deployed `4vfZVDfD…` — fix before the audit.

### Blocked bucket

- [ ] `[D]` Squads multisig handoff for mainnet upgrade authorities — **BLOCKED:** M0.5 Squads complete on devnet first.
- [ ] `[D]` Mainnet deploy of all 4 programs (Playground or local CLI) — **BLOCKED:** M0.5 audit passing + Anchor unblock.
- [ ] `[D]` Phoenix Rise mainnet wire-up — **BLOCKED:** Phoenix npm publish (`@ellipsis-labs/rise`) + M2.5 SDK exposes broker driver slot.
- [ ] `[D]` MagicBlock ER mainnet wire-up — **BLOCKED:** ER on mainnet + match program audited + deployed.
- [ ] `[D]` Honeycomb mainnet — **BLOCKED:** Honeycomb mainnet endpoint live + project bootstrap.
- [ ] `[D]` Pyth mainnet — **BLOCKED:** oracle program audited + deployed.
- [ ] `[D]` CASH stablecoin mainnet escrow — **BLOCKED:** M8 escrow contract audited.
- [ ] `[D]` Launch post + Solana Foundation coordination — **BLOCKED:** all programs live.
- [ ] `[O]` Mainnet smoke test (1 player, 1 run, 1 record-on-chain) — **BLOCKED:** programs deployed.
- [ ] `[O]` Mainnet load test (sim 100 concurrent players against Helius RPC) — **BLOCKED:** smoke test passes.

### Done bucket

(none yet)

## State

- Progress: 3/16 done — all 3 Ready-bucket items written 2026-05-20. Remaining 10 are the Blocked-bucket integration chain (multisig handoff, 4-program mainnet deploy, Phoenix/MagicBlock/Honeycomb/Pyth/CASH wire-ups, launch post, smoke + load tests) + the 13 completion conditions, all gated on every prior milestone.
- Blockers active: 10
- Scheduled today: 0

## Notes

- M10 is the union of every prior milestone. Treat it as a final integration phase, not a green-field build.
- Hardest dependency: M0.5 audit. Audit lead times are 4-8 weeks regardless of pace, so pull-forward the audit firm engagement.
- One mainnet program deploy ≈ 4.5 SOL per program based on devnet measurements. Budget ~20 SOL for the four programs.
- Devnet → mainnet diff audit (overnight task) catches the worst category of bug: leaving devnet RPC URL hardcoded in production code.

### Ecosystem scan 2026-05-14
Mainnet integration partners — current readiness signal:
- **Phoenix Rise** — `@ellipsis-labs/rise` still pre-public (private beta, structured rollout). Mainnet wire-up remains BLOCKED on the npm publish.
- **MagicBlock ER** — devnet stable; no new SDK cut today. Mainnet ER still pending; M5 PvP wire-up unmoved.
- **Honeycomb** — `@honeycomb-protocol/edge-client` pinned at `0.0.7-beta.15` since ~Feb 2026 (~3 months stale). This is the slowest of the four integrations — flag for closer watch.
- **Pyth** — `pyth-solana-receiver-sdk` Anchor 0.31.1 ready; only blocker is the M0.5 `chartrunner_oracle` audit + deploy.
- **Helius** RPC pricing tiers stable (input for `M10-rpc-cost-projection.md`).
Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-14`.

### Ecosystem update 2026-05-20 — npm pins re-baselined (prior logs were stale)
- 🚨 **Phoenix Rise `@ellipsis-labs/rise` is LIVE on npm** (v0.4.9, published 2026-04-27; repo `Ellipsis-Labs/rise-public`). The "Phoenix Rise mainnet wire-up — BLOCKED: npm publish + M2.5 SDK broker driver slot" item's **npm half is now CLEARED**; it stays Blocked only on the M2.5 broker-driver slot. Pull the API verify into M2.5/M5 adapter work.
- **MagicBlock ER** TS SDK at v0.14.2 (2026-05-19) — far past the 0.6.5 the log had recorded; ER *JS* integration is package-available. (Native Anchor build still 🔴 on the unchanged Anza Rust 1.85 / `block-buffer 0.12` wall — `chartrunner_match`/`chartrunner_oracle` deploys unaffected.)
- **Pyth** receiver v0.16.0 (2026-05-19). Pull-oracle JS stack refreshed; Anchor program side still gated on the M0.5 oracle deploy.
Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-20`.
