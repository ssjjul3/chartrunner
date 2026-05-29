# 2026-05-26 — Overnight evaluator plan

**Block:** overnight (autonomous). **Evaluator:** `cr-evaluator-evening` (fired 21:06 CEST).
**Mix:** 2 picks (not a heavy ship day), both **produced INLINE now** — not scheduled (see ⚠).
**Input note:** `2026-05-26-daytime.md` is **missing** (morning evaluator wrote none) — reconciled from
artifacts + scheduler state instead.

## ⚠ The meta-finding: scheduler **writes** aren't sticking from scheduled sessions

Last night the failure was empty *fires* (one-time `[O]` picks fired, wrote nothing). Today it's worse —
**scheduler mutations don't register at all:**
- The morning's two `[D]` picks — `cr-d-m1-entry-fee-schedule-20260526` (O-4 entry fees) and
  `cr-d-x-phantom-perps-contrast-20260526` — are **not in `list_scheduled_tasks` and produced no file.**
- `SCHEDULE-CONSOLIDATION-2026-05-26.md` claims it merged the 6 nightly sensors into one
  `cr-nightly-sensor-sweep` and disabled the originals. **The scheduler shows all 6 originals still
  enabled and no merged task exists.** The consolidation never took effect.

So `create_scheduled_task` / `update_scheduled_task` from inside a scheduled session are currently
unreliable. **→ I therefore produced tonight's 2 picks INLINE** (the clock-skew guard's preferred path
for write-only research/draft tasks) rather than scheduling fires that would likely vanish. **Action for
the next INTERACTIVE session:** (1) re-run the O-4 + Phantom-contrast `[D]` picks by hand; (2) decide
whether to redo the sensor consolidation from an interactive session; (3) investigate the
scheduled-session write failure. Recurring **cron sensors keep working** (all 6 wrote today).

## Tonight's plan — 2 picks, done inline

1. **`docs/architecture/registry-name-register-verify-2026-05-26.md`** — static-verified today's fresh
   `registry-upgrade-vX-deploy.md` (Item 6 Name Register) against program source + client before Julian
   signs the multisig upgrade (+2 same-day analysis). **Verdict: SHIP-READY** — 3 discriminators
   recomputed + matched, `dataSize:85` filter correct (fixed 85-byte `NameClaim`), handle rules
   consistent across all 3 layers, `release_name` owner-gated (no rent-theft). Both bugs I hunted for
   (off-by-length filter, hostile release) refuted. Banner added atop the deploy doc.
2. **`docs/marketing/seo/structured-data-draft.md`** — TRACK-google-seo `[O]` schema audit (compound
   SEO value, self-contained on local source → dodges the chartrunner.xyz egress block). Landing had a
   thin `WebApplication` only; drafted an enriched `@graph` adding `VideoGame` + `Organization`
   publisher (`sameAs` @ChartRunner_xyz helps disambiguate from the unrelated "CHARTrunner" products) +
   image. Pending the same Pages deploy as the rest of the on-page patch.

## Today's recap (2026-05-26)

- **Shipped (inline, by the resumed 05-25 evening eval ~07:2x):** `M1-paper-review.md`,
  `2026-05-26-x-build-in-public.md` (all-4-live capstone — POSTING-QUEUE's "MISSING" flag was stale,
  written 06:44, before the 07:27 inline production), `SIX-ITEM-VERIFY-2026-05-26.md`.
- **Fresh today:** `registry-upgrade-vX-deploy.md` (Item 6 ready, ~21:05 — Julian-side).
- **Rolled over (produced nothing):** O-4 entry-fee `[D]` + Phantom-contrast `[D]` (scheduler-write
  failure). Git unreachable from sandbox (counted via artifacts).

## Cross-track state

- **M0.5 ACTIVE 3/4 (~75%)** — only the independent audit remains (Neodyme primary, package ready,
  gated on Julian's firm-selection). Ready-bucket fully drained. Registry Name-Register verified
  ship-ready tonight. Blockers: 0.
- **M1 🔵 NEXT** — paper v0.2, publish-ready once O-rows ratified; **O-4 is the open gate and rolled
  over** → 05-27 morning re-pick. Sim-watch reconciled 0 drifts.
- **M2–M10** — research drained; gated on the SIX-ITEM build + later phases. No [O] eligible.
- **Marketing:** bottleneck is **POSTING** (W22 = 0 posted; 3 drafts queued), not drafting. SEO og:image
  + the new JSON-LD both wait on one Pages deploy.

*(~470 words)*
