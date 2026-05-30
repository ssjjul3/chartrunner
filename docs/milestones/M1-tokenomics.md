# M1 — Tokenomics paper + fiat onramp

**Status:** 🔵 NEXT (queued after M0.5)
**Theme:** $CHART / $RUN supply curves, sinks, vesting, swap math. Restores: Profile balances pills, Marketplace icon + windows, Missions tab, Tokenomics block. MoonPay primary + Sphere hedge for fiat → USDC-on-Solana, never fiat → $RUN.

## Completion condition (all required)

- [x] Tokenomics paper — **v0.4 2026-05-29, PUBLISH-READY** at `docs/TOKENOMICS-PAPER.md`. **ALL decisions O-1 → O-17 committed (Julian, 2026-05-25 → 2026-05-29):** $CRDS→$CHART rename + per-run-reset/issuance-controlled role; algorithmic-scarcity issuance model (O-1, O-13); leak mechanics (O-17); reserve-level float (O-3); 70M reserve (O-2) + 70/7/7/8/5/3 allocation (O-7); O-15 folded in; **then 05-26/29:** entry fees 80/60/40/250 + 3 free runs/UTC-day/wallet (verified: 5) (O-4), 2% swap tax (O-5), 50 $RUN/day cap (O-6), vesting (O-8), $RUN sinks (O-9), $SOL cut (O-10), MoonPay+Sphere onramp (O-11), 5bps builder fee (O-12), missions (O-14), $RUN=on-chain SPL at TGE (O-16). Backed by `M1-chart-issuance.md`, `M1-leak-rate-reserve.md`, `M1-entry-fee-schedule.md`, sims `issuance_model.py`/`mechanism_model.py`/`allocation_eval.py`. Remaining = execution only (below).
- [~] Onramp provider selected (**MoonPay primary + Sphere hedge — O-11 committed**) + sandbox-tested *(sandbox test pending)*
- [ ] Onramp wired into game (`solana-connect/` + Profile UI; fiat → USDC-on-Solana, never fiat→$RUN)
- [ ] Profile balances + Marketplace + Missions UI restored (v0.9.12 feature flags flipped)

## Imminent-solvables

### Ready bucket

> **All 8 Ready-bucket research items written 2026-05-20** (frontier auto-resolve batch). The 6 design memos propose concrete starting parameters; the sim validates them end-to-end. Decisions to *commit* the numbers + publish the paper remain (Blocked bucket).

- [x] 2026-05-29 — `[D]` **O-4 entry-fee schedule + free-mode cap proposal (sim-validated), with the O-2/O-15 reserve-depletion companion** — **DONE** → `docs/architecture/M1-entry-fee-schedule.md` + folded into `docs/TOKENOMICS-PAPER.md` v0.4. Headline: committed ladder 80/60/40/250 $CHART + 3-runs/UTC-day/wallet free-mode cap (verified: 5). Recommended sim knobs: `entry_fee_per_paid_run=95.0`, `free_run_frac=0.20`; baseline **29.5% → $RUN**, **20.7% burn**, 70M reserve draw ≈ **0.154%/90d** at 1k scale. Earlier rollover trail preserved in evaluator logs.
- [x] 2026-05-20 — `[D]` $CHART supply curve memo — `docs/architecture/M1-crds-supply.md`. Headline: hard ~600 $CHART/run ceiling + within-run decay so skill pays and grinding self-limits.
- [x] 2026-05-20 — `[D]` $CHART sinks memo — `docs/architecture/M1-crds-sinks.md`. Headline: recurring per-run entry fees as the primary burn; sink ≥50% of gross $CHART.
- [x] 2026-05-20 — `[D]` $RUN supply curve memo — `docs/architecture/M1-run-supply.md`. Headline: 100M fixed supply backed by a finite 40M swap reserve + per-wallet 50-$RUN/day cap + 2% swap-tax burn.
- [x] 2026-05-20 — `[D]` $RUN sinks + vesting memo — `docs/architecture/M1-run-sinks.md`. Headline: recirculating utility sinks (NFT mints w/ 50% burn, agent fees, tournament pools); JTO-style insider vesting, player $RUN stays liquid.
- [x] 2026-05-20 — `[D]` Onramp comparison — `docs/architecture/M1-onramp-comparison.md`. Headline: route fiat→USDC-on-Solana (never fiat→$RUN); MoonPay primary, Sphere as Solana-native hedge.
- [x] 2026-05-20 — `[D]` Flight builder fee accrual memo — `docs/architecture/M1-flight-fees.md`. Headline: 5 bps builder fee via Rise SDK `builderAuthority`, threshold+weekly sweep to the Squads vault.
- [x] 2026-05-20 — `[O]` Tokenomics simulation harness — `docs/architecture/M1-sim/` (`sim.py` + `README.md` + `sample_output.txt`, ran on Python 3.10). Result: ~32% of gross $CHART becomes $RUN (under the <40% target), ~4.7 $RUN/active/day, reserve drawn ~0.3% over 90d. Caveat: target currently leans on daily-lapse, not in-game burns — raise entry fees so it doesn't depend on player restraint.
- [x] 2026-05-20 — `[O]` Existing `docs/TOKENOMICS-DRAFT.md` audit — `docs/architecture/M1-existing-draft-audit.md`. Keep/fix/missing punch list (P0s: $CRDS has only the swap as a sink; no finite reserve; no per-run cap).

### Blocked bucket

- [x] 2026-05-20 — `[D]` Tokenomics paper consolidation — DONE. `docs/TOKENOMICS-PAPER.md` (v0.1) consolidates all 6 memos + sim into one narrative, reconciles 4 cross-memo inconsistencies, and lists 16 open decisions (O-1…O-16) for commitment.
- [ ] `[D]` Onramp provider sandbox account + first test transaction — **BLOCKED:** needs provider sandbox credentials / account access.
- [ ] `[D]` Wire onramp into game (`solana-connect/` + Profile UI) — **BLOCKED:** sandbox test passed.
- [ ] `[D]` Flip v0.9.12 feature flags (Profile balances pills, Marketplace icon, Missions tab, Tokenomics block) — **BLOCKED:** onramp wired.
- [x] 2026-05-26 — `[O]` Tokenomics paper proofread + math sanity check — **DONE** (`docs/architecture/M1-paper-review.md`). ⚠ The scheduled task fired EMPTY 3× (`cr-o-m1-paper-review-20260522` 05-22; `cr-o-m1-paper-review-20260524` 05-25 23:36 — both fired but wrote no file); the 05-25 evening evaluator (resumed 05-26 morning after a cross-midnight suspend) **produced it inline** per the clock-skew guard, and re-targeted it to the v0.2 paper + the committed $CHART issuance model. **Verdict: publish-ready once O-2…O-12 / O-14…O-16 are committed — no blocking math errors; 2 consistency notes (reserve-binding wording, $CRDS-vs-$CHART sim label) + the rename-propagation follow-up.** Both sims re-run and every headline number reconciles.

### Done bucket

- [x] 2026-05-20 — Tokenomics paper v0.1 consolidated (`docs/TOKENOMICS-PAPER.md`) from the 6 research memos + sim.

## State

- Progress: 10/13 done. **2026-05-29:** O-4 entry-fee/free-run-cap artifact landed and was folded into `TOKENOMICS-PAPER.md` v0.4. The paper is publish-ready; M1 is now execution-only: onramp sandbox account + first test transaction, onramp wire-in, then v0.9.12 UI flag flip.
- Blockers active: 3 (depend on onramp sandbox test + wire-in)
- **2026-05-29 (interactive):** O-4 fold-in completed inline after `M1-entry-fee-schedule.md` landed. `TOKENOMICS-PAPER.md` bumped v0.3 → v0.4, O-4 wording corrected from a stale "$CHART cap" to a **3 free runs/day run-count cap**, O-15 marked resolved, and README roadmap updated. Next executable item requires MoonPay/Sphere sandbox credentials.
- **2026-05-26 (morning evaluator):** paper-review landed (`M1-paper-review.md`, produced inline) — **publish-ready once Julian ratifies the open O-rows; no blocking math errors.** Scheduled today's [D] pick on **O-4 entry-fee schedule + O-2/O-15 reserve-depletion** (the last analytical gate before publish).
- **2026-05-26 (evening evaluator):** the morning's O-4 entry-fee [D] pick **rolled over with no artifact** — the scheduled task never registered (scheduler-write failure) and no file exists. O-4 remains **THE** open analytical gate before publish; re-pick it for 05-27 morning. No M1 [O] work eligible tonight (Ready-bucket [O] all done; sim-watch reconciled 0 drifts).
- **2026-05-27 (evening evaluator):** O-4 **fired empty a 3rd time** — but this time the **scheduler-write fix held**: `cr-d-m1-entry-fee-schedule-20260527` registered + ran (`lastRunAt 2026-05-27T14:00:03Z`), yet `docs/architecture/M1-entry-fee-schedule.md` was never written. So the failure mode has **shifted** from "create rejected (notifyOnCompletion)" to "session ran but produced no artifact" (likely a suspend/resume or the run not completing the work). O-4 is **[D]** → not eligible for the evening [O] block; **rolled over for the 05-28 morning evaluator to re-schedule (3rd attempt).** Recommend the morning evaluator (a) confirm the new task registers, and (b) consider producing O-4 **inline** if the [D] slot keeps firing empty, since it's THE last analytical gate before the paper publishes. No M1 [O] eligible tonight (Ready-bucket [O] done; sim-watch reconciled 0 drifts 05-27).
- Last evaluated: 2026-05-29 (interactive — O-4 folded into paper v0.4); prior: 2026-05-27 (evening evaluator — O-4 3rd empty fire logged), 2026-05-26 (evening — O-4 rollover), 2026-05-26 (morning — O-4 scheduled, did not register), 2026-05-25 (interactive — $CHART issuance model committed)

## Notes

- The 6 sub-memos can be parallelized — evaluator can pick any one any day.
- M1 unblocks M3 (Marketplace), M4 (P2P), M8 (token launch tournaments need $RUN economy).
- Coordinate with M0.5: don't ship M1 onramp before Squads multisig wraps the programs that the onramp will fund.

### Ecosystem scan 2026-05-14
- **Phoenix Rise** (`@ellipsis-labs/rise`) still pre-public — Phoenix Perpetuals in private beta with a structured rollout from Ellipsis Labs. Flight builder `fee_bps` memo stays research-only; concrete numbers wait until the package ships. Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-14`.
