# 2026-05-25 — Overnight evaluator plan

**Block:** overnight (autonomous work while user sleeps)
**Evaluator:** `cr-evaluator-evening` (fired 2026-05-25 21:06 CEST; **suspended mid-run and resumed
2026-05-26 ~07:21 CEST** — cross-midnight clock skew, see ⚠).
**Mix:** 3 picks (heavy-ship-day bump justified — see recap) — 2 M1/M0.5 milestone + 1 MKT-X.

## ⚠ Clock-skew + the big finding of this run

The session suspended right after I re-targeted the M1 paper-review task (~21:30 CEST 05-25) and
resumed at 07:21 CEST 05-26. By resume, **all overnight slots had passed** and — critically —
**both pre-scheduled [O] picks fired but produced NO artifact:**

- `cr-o-m1-paper-review-20260524` fired 05-25 23:36 CEST → no `M1-paper-review.md` (its **3rd**
  consecutive empty fire: also 05-22, and the 05-24 rollover).
- `cr-o-x-anchor-wall-fell-20260524` fired 05-26 02:36 CEST → no `2026-05-26-x-build-in-public.md`.

**All 6 recurring SENSORS wrote normally** (surface-health 23:03, sim-watch 00:04, bug-hunt 01:51,
ecosystem 02:22, marketing-intel 03:38, posting-queue 04:44). So the failure is specific to the
**one-time evaluator picks**, not the scheduler as a whole. **→ ACTION FOR THE NEXT INTERACTIVE
SESSION:** investigate why one-time `cr-o-*` tasks fire (lastRunAt stamps) but never write their
file, while cron sensors do. Until that's understood, scheduling one-time picks into the overnight is
unreliable; producing inline is the safe path.

**What I did:** per the clock-skew guard (passed slot + write-only task → produce inline), I produced
**all three** picks inline this morning rather than push them a day forward:

1. **`docs/architecture/M1-paper-review.md`** — re-ran both sims, audited the v0.2 paper + the
   committed $CHART issuance model. **Verdict: publish-ready once O-2…O-16 are committed; no blocking
   math errors.** Every headline number reconciles (launch 32.1%→$RUN / 0.30% reserve; mature-floor
   27.4%→$RUN / 26.9% burned; issuance 2.4× edge, late=205/run). Logged to `M1-tokenomics.md`.
2. **`docs/marketing/_drafts/2026-05-26-x-build-in-public.md`** — "the wall fell / all 4 live" draft,
   3 variants (A ★), de-conflicted vs the 05-21 + 05-23 drafts (Mon/Wed/Fri), with an honest-scope
   note ("deployed to devnet," not "hardened on-chain" — per the deploy-parity doc).
3. **`docs/architecture/SIX-ITEM-VERIFY-2026-05-26.md`** — my 3rd pick: static-verified the
   SIX-ITEM-PLAN's code claims before Julian builds from it.

## Today's recap (2026-05-25) — heavy ship day

**Daytime plan (both picks DELIVERED):**
- Pick 1 ✅ `cr-d-m05-deploy-parity` → `docs/architecture/M05-deploy-parity.md` (parity table +
  rebuild/re-upgrade runbook; registry + oracle are SOURCE-AHEAD, oracle is the priority).
- Pick 2 ✅ `cr-d-x-anchor-wall-fell` → `docs/marketing/_drafts/2026-05-25-x-posting-plan.md`
  (W22 de-confliction of the 3 M0.5-narrative drafts).

**Also shipped interactively (the headline):** Julian **committed the M1 $CHART issuance model** —
`$CRDS→$CHART` rename, per-run-reset role, 500→200 floor / H=39 / ±4× controller; resolves **O-1 +
O-13**; paper → **v0.2**. New artifacts: `M1-chart-issuance.md`, `M1-sim/issuance_model.py`(+output),
`M05-oracle-cert-binding.md`, `SIX-ITEM-PLAN-2026-05-25.md`, `SCHEDULE-RESTRUCTURE-2026-05-25.md`,
`WIRE-CONNECTORS.md` updates. (Git unreachable from sandbox — counted via artifacts; clearly ≥3.)

**Rolled over → recovered inline:** both empty-fired picks above.

## The SIX-ITEM-VERIFY catch (why the 3rd pick paid off)

The SIX-ITEM-PLAN (written 13:26) flags **two Item-3 drift bugs** — `buildBuyEntityIx` omits
`max_price`, `getTreasuryAddress()` returns the program ID. **Both are already FIXED:**
`cr-registry-program.ts` was edited 15:28 (≈2 h after the plan). `maxPrice` is wired (L248/258),
treasury returns the vault (L40). **→ Item 3 step 1 is done — don't redo it.** Plus 2 under-stated
drift items: the **oracle program ID is still a placeholder in `pyth-feeds.ts`** (Item 1 must rotate
to `4vfZ…`) and the **match program ID is still a placeholder in `magicblock-ephemeral.ts`** (Item 2
Phase A must rotate to the live deploy). Everything else in the plan checks out.

## Cross-track state

- **M0.5 ACTIVE 3/4 (~75%)** — multisig ✅ + oracle ✅ + match ✅. Only the independent audit remains
  (Neodyme primary, package ready, gated on Julian's firm-selection). Deploy-parity runbook now in
  hand (registry + oracle rebuild before the auditor looks). `cr-anchor-blocker-watch` is now
  **disabled** (settled). Blockers: 0.
- **M1 🔵 NEXT** — paper v0.2; O-1/O-13 committed; tonight's review says publish-ready once the rest
  (esp. O-4 entry fees, O-2+O-15 reserve) are committed. Next concrete build = the SIX-ITEM-PLAN
  (verified tonight, 3 corrections noted).
- M2/M2.5/M2.6/M3–M10 — research drained; remainder gated on the SIX-ITEM build + later phases.
- **Marketing:** 3 un-posted X drafts queued (Squads / tokenomics+audit / all-4-live), sequenced
  Mon/Wed/Fri by the posting plan. SEO og:image still needs a Pages deploy ([D]).

## Tonight (05-26 night)
No picks scheduled from this run — its slots are spent and the one-time-pick write failure makes
re-scheduling unreliable. The **05-26 evening evaluator** (fires 21:06 CEST) plans 05-26 night fresh;
the recurring sensors run as normal.
