# M4 — Intel · P2P commerce (Marketplace)

**Status:** 🔵 QUEUED
**Theme:** Marketplace as a real on-chain P2P surface for bots, maps, strategies, indicators, themes. Backed by `chartrunner_registry` (which already supports `listEntity` / `buyEntity` / `cancelListing` on chain — only the UI is missing).

> **Update 2026-05-26** ([CONSOLIDATED_STATUS_2026-05-26.md](../../CONSOLIDATED_STATUS_2026-05-26.md)): the **Marketplace UI is now WIRED** against the deployed registry — real on-chain listings via `getProgramAccounts` (`crMarket`), buy/list/cancel, resale rows merged into browse, a **"My Licenses"** tab + **"✓ Owned"** badges. **Fixed a real buy drift bug**: the client never sent the v0.9.8 `buy_entity` `max_price` arg and pointed `treasury` at the program ID instead of the vault → every buy would have reverted. The Blocked-bucket browse/listing/purchase/cancel chain below is effectively done client-side. **Resale-royalty routing** (`list_license` / `buy_license` / `cancel_license_listing` + creator split) is now **LIVE on devnet 2026-05-27** (closes the "resale deferred to v1" note) — deployed in the batched 2-of-3 registry re-upgrade (exec tx `3XHRv5j…`, byte-verified); resale buys + the Resell button work on-chain.

## Completion condition (all required)

- [ ] Marketplace icon + windows restored (v0.9.12 feature flag flipped)
- [ ] Browse view: filter by entity type, sort by price/popularity/age
- [ ] Listing flow: select my entity → set price ($SOL or $RUN) → submit on-chain
- [ ] Purchase flow: click listing → review → sign → tx lands → entity transfers
- [ ] Cancel-listing flow
- [ ] Royalty / creator-fee model decided + enforced on-chain (or off-chain attestation)

## Imminent-solvables

### Ready bucket

> **All 3 Ready-bucket items done 2026-05-20** (auto-resolve sweep). Key takeaway: M4 is a **UI-and-wiring** milestone, not a contract one.

- [x] 2026-05-20 — `[D]` Marketplace UX research — `docs/architecture/M4-marketplace-ux.md`. Convergent pattern: free listing, ~2% buyer-side fee, optional post-"royalty-wars" royalties; recommends a "Magic-Eden-lite" in-game shop (the License model already gives escrowless behavior).
- [x] 2026-05-20 — `[D]` Fee/royalty model design — `docs/architecture/M4-fee-model.md`. Keep the program's existing **% fee** (no redeploy); launch at 0 BPS then flip to 200–500 via multisig; resale royalty = hard on-chain enforcement (cheap here — no SPL escape hatch).
- [x] 2026-05-20 — `[O]` Registry-coverage audit — `docs/architecture/M4-registry-coverage.md`. **Essentially all of M4 is already on-chain** (list/buy/cancel + Listing/License accounts, slippage guard, fee path, atomic License mint — live since v0.9.6). Only resale-royalty routing needs a program change.

### Blocked bucket

- [ ] `[D]` Marketplace window UI scaffold (browse view) — **BLOCKED:** UX research + fee model done.
- [ ] `[D]` Listing flow UI + on-chain wire — **BLOCKED:** scaffold done.
- [ ] `[D]` Purchase flow UI + on-chain wire — **BLOCKED:** scaffold done.
- [ ] `[D]` Cancel-listing UI — **BLOCKED:** listing flow done.
- [ ] `[D]` Marketplace feature flag flip (v0.9.12) — **BLOCKED:** all flows tested on devnet.
- [ ] `[O]` Marketplace tx replay tester (drives 10k synthetic listings/purchases against devnet registry) — **BLOCKED:** flows live.

### Done bucket

(none yet — chain primitives shipped in v0.9.6 but UI was deferred)

## State

- Progress: 3/9 done — all 3 Ready-bucket items written 2026-05-20. Remaining 6 are the Blocked-bucket UI/wiring chain (browse scaffold → listing → purchase → cancel → flag flip → replay test); the registry coverage audit confirms the on-chain half is already shipped.
- Blockers active: 6
- Scheduled today: 0

## Notes

- Registry program already supports the on-chain primitives (live since v0.9.6). M4 is purely UI + wiring.
- M4 depends on M1 ($RUN/$CRDS economy for pricing), M2.6 (NFT avatars as marketplace-listable entities).
- Resale logic was explicitly deferred to v1 of the registry program — if M4 needs second-sale royalty enforcement, that's an M0.5-style audit + redeploy.
