# 2026-05-27 — Overnight evaluator plan

**Block:** overnight (autonomous). **Evaluator:** `cr-evaluator-evening` (fired 21:06 CEST).
**Mix:** 2 picks (default cap — no bump: git unreachable so no commit count, and 0 mentions / no reply-worthy intel → no same-day-reply trigger). 1 milestone + 1 marketing, honoring the 70/30 weighting.

## Today's recap (2026-05-27)

**Shipped / produced (artifacts — git repo is on Julian's Mac, unreachable from sandbox):**
- **Squads multisig X post finalized INLINE** → `_drafts/2026-05-27-x-squads-post-ready.md` (Var A, 279/280, ready for Julian one-tap approval; `cr-d-x-post-squads-multisig-20260527` fired empty during clock-skip, daytime evaluator produced it inline).
- **Content factory** shipped Phantom-contrast across 5 channels (x / farcaster / telegram / discord / short) + a 2nd Short ("every-trade-is-a-game-move").
- **Review board** (11:00) → `REVIEW-QUEUE.md` batch 2026-05-27 = 9 items PENDING (3 X build-in-public drafts seeded + the content-factory set).
- **Agent dispatch** (12:39) → 7 data-pipeline job specs written for OpenClaw/Hermes.
- **Nightly sweep** (01:06): tokenomics-sim ✅ 0 drifts (gross→$RUN 32.1%, inside <40% band); marketing-intel 0 non-self mentions, CFL-on-Seeker 🟡 (no reply), Phantom Perps continued (no new launch); surface-health stale (05-25), solana-ecosystem 1-day stale (05-26).

**Rolled over:**
- **O-4 entry-fee schedule [D]** (`cr-d-m1-entry-fee-schedule-20260527`) — **fired empty a 3rd time.** The `notifyOnCompletion` scheduler-write fix DID hold (the task registered + ran at 14:00 UTC), but the run wrote no `M1-entry-fee-schedule.md`. Failure mode has shifted: "create rejected" → "session ran, produced nothing." It's **[D]**, so not eligible for tonight's [O] block; re-pick for the 05-28 morning evaluator (3rd attempt) — recommend producing it inline if the slot fails again, since it's THE last analytical gate before the tokenomics paper publishes.

## Tonight's plan — 2 picks

1. **[O] M2.6 · avatar-display bug** → `cr-o-m26-avatar-bug-20260527` @ **22:30 CEST** → `docs/architecture/M26-avatar-bug-diagnosis-2026-05-27.md`.
   *Why:* the **only unblocked milestone [O]** (every other milestone [O] is BLOCKED). Closes a known-unresolved bug — a prior live session ran 527 turns without converging ("Chrome registers no network request at all for the avatar load"). Scoped as static debug: root-cause (CSP/CORS/guard/cache) + paste-ready before/after diff for Julian to apply. Advances the 70% (milestone) lane and unsticks an M2.6 completion checkmark.
2. **[O] MKT-SEO · Lighthouse audit baseline** → `cr-o-seo-lighthouse-20260527` @ **23:30 CEST** → `docs/marketing/seo/lighthouse-2026-05-27.md`.
   *Why:* first-ever run → weekly regression baseline; self-contained via WebFetch (no Chrome needed). High-value cross-check folded in: reads the LIVE HTML to settle whether the 05-20 on-page patch + 05-26 enriched JSON-LD actually **deployed** — resolves the week-old "og:image still unverified / needs Pages deploy" standing item.

**Clock-skew guard:** checked at 21:06 CEST — both 22:30 + 23:30 slots still in the future → scheduled normally, both `enabled:true` on readback, both clear of the ~01:00 nightly sweep window. No inline production needed.

**Not picked (why):** mention/competitor/cross-platform sweeps → already covered by tonight's `cr-nightly-sensor-sweep` (0 mentions today, Chrome-down floor). "Draft tomorrow's build-in-public" → POSTING-QUEUE says the bottleneck is **posting, not drafting** (W22 = 0 posted, 3+5 drafts already queued) — generating more would be counterproductive. Weekly/Sunday audits → not due (Wed). Backlink scan + keyword-rank sweep → valid SEO [O] alternates for a future night; rank-sweep waits on the [D] keyword-research that hasn't run yet.

## Cross-track state summary

- **M0.5 — 🟢 ACTIVE 3/4 (~75%).** Ready-bucket fully drained; only the independent audit remains, **Julian-gated** (Neodyme primary, hash-verified package ready) + the deploy-parity re-upgrade (Julian-hands). No [O] eligible.
- **M1 — 🔵 NEXT 9/13.** Paper publish-ready pending Julian's O-row ratification; O-4 is the last analytical gate and keeps firing empty (re-pick 05-28 morning). Sim reconciles 0 drifts. No [O] eligible.
- **M2.6 — 🟡 PARTIAL.** Avatar-display bug = tonight's pick #1; name-uniqueness `claim_name` + Helius-vs-ME decision both Julian/audit-gated.
- **M2–M10** — all [O] tasks BLOCKED behind the SIX-ITEM build / later-phase prerequisites.
- **Marketing** — drafting is ahead, **posting is behind** (W22 = 0). Lighthouse (pick #2) is the highest-value untouched SEO [O]; intel shows 0 mentions, CFL-on-Seeker 🟡 watch only.

## Pick 1 result

✅ **M2.6 avatar-bug diagnosed** → `docs/architecture/M26-avatar-bug-diagnosis-2026-05-27.md` (696w). Loader is provably correct (`img.src` always assigned at L41135 when reached; boot restore fires at L41314). Couldn't isolate to one cause statically → top-2: **#1** `_nftApplyAvatar` round-trips through `localStorage`, so a blocked/sandboxed/cleared store (incl. the v1.0.121 destructive tab-clear at L27013) starves `_nftPreloadImage` → no request even after picking — *the* fit for "no request + 527 turns unfixable in-file"; **#2** an asymmetric `img-src` CSP header (no CSP in-file; external CDN scripts load, so no blanket `default-src`). Shipped a paste-ready in-file diff (direct preload on pick + in-memory `_crNftSelected` fallback + one `console.debug` instrument) that fixes #1 and decides #1-vs-#2 in a single reload; deploy-side `img-src https:` directive for #2. Parity gaps untouched (draw branch, separate). Static only — Julian applies + deploys.

*(~480 words)*
