# 2026-05-28 — Overnight evaluator plan

**Block:** overnight (autonomous). **Evaluator:** `cr-evaluator-evening` (fired 21:06 CEST).
**Mix:** **3 picks** — cap bumped (today was an exceptionally heavy ship day: 8 dev-kit/patch files + 2 maps + 8 milestone files updated + content factory across 5 channels + M12 Tier 1 install pass). 2 milestone + 1 marketing, honoring the 70/30 weighting.

## Today's recap (2026-05-28)

**Shipped / produced (artifacts — git repo is on Julian's Mac, unreachable from sandbox):**
- **Dev-kit deliverables set** (`dev-kit-deliverables-2026-05-27/`): `export-seeds.mjs`, `build-coverage-catalog.mjs`, `montecarlo.js`, `devpanel-p0-wiring.js`, `P0-dev-panel-wiring.patch`, `startHeadless-implementation.md`, `DEVKIT_P0_PATCH.md`, `README.md`. P0 live-verified in-session.
- **Separate P0 bridge-rewiring patch** (`_patches/p0-bridge-rewiring-2026-05-28/`) — apply.sh + patch body + _build/_verify/_final_check folders.
- **Cartography refresh**: `SYSTEM_MAP_2026-05-28.md`, updated `GAME_MAP.md`, `MASTER_MAP_2026-05-28.svg`, `DRIVE_AND_VAULT_MAP_2026-05-28.md`, `CHARTRUNNER_DEVKIT_GAME_MAP_2026-05-27.md`, and 5 SVGs under `_maps/`. Mirrors SYSTEM_MAP+GAME_MAP hook (triggers fired).
- **M12 Tier 1 install pass** — 7 apps installed/reachable (Uptime Kuma + 7 HTTP monitors green; InfluxDB→Grafana datasource wired with `grafana-readonly` token; flaresolverr/Plausible/Gitingest/Excalidraw installed pending configure). M12.md heavily updated.
- **Content factory** shipped Phantom-CASH-onramp across 5 channels (x/farcaster/telegram/discord/short) + factory-note + marketing-intel.
- **Nightly sweep** (01:06) all 6 sensors fresh: tokenomics-sim ✅ 0 drifts (gross→$RUN 32.1%); surface-health/solana/bug-hunt/marketing-intel/posting-queue all updated.
- **SESSION_HANDOVER_2026-05-28.md** written.

**Rolled over / failed today:**
- **O-4 entry-fee schedule [D]** (`cr-d-m1-entry-fee-schedule-20260527`) — 3rd attempt produced no artifact. Morning evaluator (which itself fired but wrote no log file) re-scheduled to **`cr-d-m1-entry-fee-schedule-20260529` @ 10:00 CEST** (4th attempt). Still **[D]** → not [O]-eligible.
- **SEO keyword research [D]** (`cr-d-seo-keyword-research-20260528`) fired empty → re-scheduled to 05-29.
- **Last night's Lighthouse [O]** (`cr-o-seo-lighthouse-20260527`) fired empty → retry tonight (pick #2).
- **Daytime 05-28 evaluator log MISSING** — the 07:04 task fired (`lastRunAt 2026-05-28T05:02:16Z`) and DID re-schedule O-4 (proof of partial execution), but `docs/milestones/_evaluator-log/2026-05-28-daytime.md` was not written. Same failure mode as the empty O-4 — sessions running but not writing files. Flag for the 05-29 morning evaluator.

## Tonight's plan — 3 picks

1. **[O] M2.5 · dev-kit deliverables static audit** → `cr-o-m25-devkit-deliverables-audit-20260528` @ **22:30 CEST** → `docs/architecture/M25-devkit-deliverables-audit-2026-05-28.md`.
   *Why:* same-day feedback loop on today's biggest ship (+2 scoring). Static review of all 5 JS/.mjs deliverables + the P0 bridge-rewiring patch + the `startHeadless` design lead, giving Julian a green/yellow/red apply verdict + a recommended apply order before he runs `apply.sh` on his Mac. The P0 was already live-verified once today; this is the cold-read pass.
2. **[O] MKT-SEO · Lighthouse audit retry** → `cr-o-seo-lighthouse-retry-20260528` @ **23:30 CEST** → `docs/marketing/seo/lighthouse-2026-05-28.md`.
   *Why:* last night fired empty; hardened the prompt to ALWAYS write the file (even degraded). Still resolves the week-old "og:image deployed?" + 05-26 enriched JSON-LD `@graph` deploy-verification questions from raw HTML.
3. **[O] M12 · stack-doc / `umbrel-stack.md`** → `cr-o-m12-stack-doc-20260529` @ **06:30 CEST** → `docs/architecture/umbrel-stack.md`.
   *Why:* fresh unblocked [O] (added to M12.md today). Tier 1 install state is fresh in M12.md right now — codify it before the "what was that for in 3 months" decay. Pure documentation generation, ideal for [O].

**Clock-skew guard:** checked at 21:06 CEST — all three slots (22:30, 23:30, 06:30) still future. Scheduled normally with `notifyOnCompletion: false`; readback confirms all three `enabled:true` with the correct `nextRunAt`. Slots #1+#2 are pre-midnight (clear of the ~01:00 nightly sweep window); slot #3 is at 06:30 CEST (clear of the sweep's typical ~06:00 tail).

**Not picked (why):** "Apply P0 bridge-rewiring patch" → **[D]** (Julian-hands on his Mac). Mention/competitor/cross-platform sweeps → already covered by tonight's `cr-nightly-sensor-sweep`. Drafting more marketing → POSTING-QUEUE confirms drafting is ahead, posting is the bottleneck (W22 = 0 posted). Weekly/Sunday audits → not due (Thu). `M12 First Cascade Health dashboard` + `Wire on-chain event tail → InfluxDB` → both unblocked [O] in M12.md but require Umbrel-side access this sandbox doesn't have.

## Cross-track state summary

- **M0.5 — 🟢 ACTIVE 3/4 (~75%).** Only the independent audit remains, **Julian-gated** (Neodyme primary; hash-verified package ready). Deploy-parity re-upgrade also Julian-hands. No [O] eligible.
- **M1 — 🔵 NEXT 9/13.** O-4 entry-fee re-scheduled 4th attempt for 05-29 morning; sim still reconciles 0 drifts. Paper publish-ready pending O-row ratification. No [O] eligible.
- **M2.5 — 🟡 PARTIAL 4/12.** Today's dev-kit ship advances Round-1 work; tonight's pick #1 closes the same-day cold-read on it before Julian applies. `startHeadless-implementation.md` is the single highest-leverage P1.
- **M2.6 — 🟡 PARTIAL.** Avatar-bug **diagnosed 05-27** (pick from last night landed); flipped to `[~]` (awaiting Julian's apply+deploy+verify to mark `[x]`). Other M2.6 items audit/Julian-gated.
- **M3–M11** — all Ready-bucket [O] BLOCKED behind the SIX-ITEM build / later-phase prerequisites.
- **M12 — 🟢 ACTIVE.** Tier 1 install pass shipped today; tonight's pick #3 codifies it. Cascade Health dashboard + on-chain event tail [O] both stay BLOCKED on Umbrel-side data + sandbox reach.
- **Marketing** — drafting ahead, **posting still behind** (W22 = 0). Lighthouse retry = highest-value [O] (resolves og:image week-old open question).

## Scheduled tasks (readback-verified)

| Task ID | Slot | enabled | nextRunAt |
|---|---|---|---|
| `cr-o-m25-devkit-deliverables-audit-20260528` | 22:30 CEST | ✅ | 2026-05-28T20:30:00Z |
| `cr-o-seo-lighthouse-retry-20260528` | 23:30 CEST | ✅ | 2026-05-28T21:30:00Z |
| `cr-o-m12-stack-doc-20260529` | 06:30 CEST | ✅ | 2026-05-29T04:30:00Z |

*(~490 words)*
