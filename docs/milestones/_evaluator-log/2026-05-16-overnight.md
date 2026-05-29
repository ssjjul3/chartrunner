# 2026-05-16 — Overnight evaluator plan

**Block:** overnight (autonomous work while user sleeps)
**Evaluator:** `cr-evaluator-evening`
**Mix:** 1 milestone + 1 marketing (default 2-task cap — today shipped 0 code commits, sensors mostly green, no urgent same-day mention)

## Today's recap

**Daytime plan ran 0/2 — same scheduling block.** No `docs/architecture/M05-oracle-local-build.md`, no `docs/marketing/_drafts/2026-05-16-x-build-in-public.md`. 6th consecutive evaluator surface hitting `Cannot create scheduled tasks from within a scheduled task session.` Both picks rolled over.

**Last night's overnight plan also ran 0/2.** No audit-prep artifact, no tomorrow-pre-draft.

**What DID ship today:**
- ✅ `cr-bug-hunt-sweep` — `BUGS-CURRENT.md` got a fresh 2026-05-16 entry: **4 findings on Campaign Ch.1–10** (Ch.18 dead `scaleOutCount` predicate L21489, Ch.19 dead `twapCount` predicate L21498, Ch.10 OR-fallback flag never stamped L21397, stale `loadout:'*'` branch L22237–22246). Yesterday's "sensor write-pipeline broken" assertion was wrong — bug-hunt + marketing-intel are writing, just later than the morning evaluator looked.
- ✅ `cr-marketing-intel` — `_drafts/2026-05-16-marketing-intel.md` (5.6 KB): 0 mentions, no fresh 🚨 (Trojan + JTX both holding, Section 3 SEO skipped — Chrome unpaired).
- ✅ `cr-anchor-blocker-watch` — 🔴 day 9. v1.54 platform-tools still latest (71 days). No Rust 1.85 movement, no ERS without block-buffer 0.12.
- ✅ `cr-surface-health` — green; v1.0.107 local = deployed in sync. Note: prefer non-ARC Browser-2 instance.
- ✅ `cr-solana-ecosystem-scan` — file touched today (Hyperliquid Community Hackathon flag from yesterday still valid).
- 🟡 `chartrunner-prototype/roadmap.html` modified at 08:02 today (BUILD-INFO not updated, still pins v1.0.101).
- ❌ No new prod-code commit (`ChartRunner_Prototype.html` still v1.0.107, mtime 2026-05-15 10:58). Repo at `/Users/julianroy/projects/chartrunner` unreachable from sandbox.

**Files shipped today:** 0 code patches + 5 daily-watch artifacts + 1 roadmap.html edit = 6.
**Git commits today:** 0 estimated (no version bump past v1.0.107; repo unreachable from sandbox).
**Drafts produced today:** 0 marketing drafts.
**Rolled over:** 4 distinct picks (M0.5 audit-prep × 3 nights, M0.5 IDL drift × 2, MKT-X pre-draft × 3, M0.5 oracle local build × 2).

## Tonight's plan — 2 picks (default cap)

### Pick 1 — [O] M0.5 · audit prep @ **23:30 +02:00** (taskId `cr-o-m05-audit-prep-20260516`)

**Why:** 4th rollover. +3 unblocks (audit kickoff, audit-firm engagement, audit-response triage). +1 milestone ≤30 days. Score 4. Same self-contained prompt as 2026-05-15-overnight.

### Pick 2 — [O] MKT-X · pre-draft tomorrow's build-in-public (Trojan + JTX dual-angle) @ **02:30 +02:00** (taskId `cr-o-x-build-in-public-tomorrow-20260516`)

**Why:** 4th rollover. +2 same-day feedback loop (today's marketing-intel surfaced JTX got fresh Fortune/CoinDesk/SolanaFloor coverage — both angles fresh). +2 copy-paste-ready. Score 4. Upgrade vs. last night: now produces 4 ranked variants (A=Trojan-diff, B=JTX-adjacency, C=both-side-by-side, D=v1.0.107 fallback) instead of 3+1.

(No 3rd pick — light ship day, no urgent mentions, default cap holds. **Surfacing for tomorrow's daytime evaluator:** the fresh 4 Campaign Ch.1–10 bug findings landed today and need a [D] code-fix decision — not [O]-eligible, so kept out of tonight's picks but flagged.)

## Cross-track state

| Track | Active | Tonight's picks | Backlog rollover count |
|---|---|---|---|
| Milestones (70%) | M0.5 — 3/15 done, 2 blockers | M0.5 audit prep | 3 [O] + 1 [D] stacked |
| Marketing (30%) | Trojan + JTX both hot, landing SEO 4 ❌, Chrome unpaired for marketing-intel | X tomorrow pre-draft (Trojan+JTX) | 1 [O] + 1 [D] stacked |

## Sensors at a glance

- 🔴 ANCHOR-BLOCKER-WATCH 2026-05-16: blocked, day 9. Next check 2026-05-17. Issue #8443 still open.
- ✅ SURFACE-HEALTH 2026-05-16: green. v1.0.107 in sync. ARC quirk known.
- 🟢 BUG-HUNT 2026-05-16: 4 fresh Campaign-Ch.1–10 findings — [D] follow-up tomorrow.
- 🟢 MARKETING-INTEL 2026-05-16: 0 mentions, no fresh competitor 🚨. JTX got fresh coverage today.
- 🟢 ECOSYSTEM-SCAN: file touched 07:22 today.
- ⚠ Chrome pairing: marketing-intel ran public-fallback again (no live X / DOM). 2nd consecutive run without Chrome.
- 🟡 SEO: 4 ❌ unchanged (meta-desc, og:image, twitter:card, JSON-LD).
- 📅 Colosseum Fall hackathon Sep 28 – Nov 2, 2026 — M0.5 → M1 deadline anchor.

## ⚠ Scheduling blocker — 6th evaluator surface, no escape path found

`mcp__scheduled-tasks__create_scheduled_task` returned `Cannot create scheduled tasks from within a scheduled task session.` for both picks tonight. Confirmed: the restriction is global to all scheduled-task sessions (morning + evening + overnight, 6 surfaces, 5 days). Both prompts below are paste-ready for a fresh non-scheduled Cowork session. Cheapest unblock remains (c): wire an out-of-band channel (e.g., evaluator writes `tonight-prompts.md` + CLAUDE.md hook auto-fires on next interactive session open). **6 picks now stacked rolled-over.**

### Pick 1 prompt (23:30 +02:00) — `cr-o-m05-audit-prep-20260516`

> ChartRunner M0.5 [O] audit-prep — autonomous overnight, fourth rollover (originally 2026-05-13, then -14, -15). INPUTS: `/Users/julianroy/projects/chartrunner/anchor/programs/chartrunner-{maps,registry}/src/lib.rs` + `docs/milestones/M0.5-security.md` + `docs/architecture/M05-oracle-playground-deploy.md` + `docs/SOLANA-ECOSYSTEM-DAILY.md`. If repo unreachable, write a stub artifact noting "repo unreachable" and exit WITHOUT marking M0.5 progress. WALK each program: instruction signer/account constraints, authority checks (CRITICAL — single-key upgrade-authority default), CPI surface, integer over/underflow, rent/close/SOL drain, PDA collision, panics/unwraps, event/log surface, listing-price overflow paths. Tag each finding CRITICAL/HIGH/MEDIUM/LOW/INFO with one-line rationale + suggested fix. Aim 15–30 findings total. SAVE to `docs/architecture/M05-audit-prep.md` (≤900 words, exec summary + per-program tables + cross-program notes + remediation order — ordered Crit→Info). POST-WRITE: edit `docs/milestones/M0.5-security.md` audit-prep line to `[x] 2026-05-17 — [O]`, move to Done bucket, bump State Progress 3/15 → 4/15. Live IDs `DbzEqKfg…` (maps) + `ER8G9Bnv…` (registry). Devnet only. NO code changes, NO mainnet, NO deploys, NO upgrade-authority changes. Output a 3-line summary at the end.

### Pick 2 prompt (02:30 +02:00) — `cr-o-x-build-in-public-tomorrow-20260516`

> ChartRunner MKT-X [O] tomorrow-pre-draft — fourth rollover. PRIMARY ANGLE: dual-positioning per `docs/marketing/_drafts/2026-05-16-marketing-intel.md` Open Question #1 — Trojan Arena (gamified $5M SOL pool, still freshest direct-positioning overlap) AND JTX/Jito Labs (self-custodial Solana trading platform, fresh Fortune + CoinDesk + SolanaFloor coverage today — "CEX speed in self-custody" — NOT a game, so adjacency play). TONE: welcome-the-ecosystem, builder-confident. Frame ChartRunner as skill-loop on real candles + abilities-as-primitives + single-file SDK. Frame Trojan as rewards-loop on existing execution (same chain, different doors), JTX as serious-trader infra (different layer — they own self-custodial execution, we own gamified skill-building on top). Do NOT @-mention named competitors — say "the new $5M trading-game pool" + "the self-custodial trading wave on Solana". VOICE (`CADENCE.md` + `TRACK-x.md`): ≤280 chars, lead with verb, numbers > adjectives, 0–2 emojis, one quality gate. OUTPUT 4 ranked variants: A=Trojan-diff/wedge, B=JTX-adjacency/ecosystem-additive, C=both-side-by-side vision-narrative, D=v1.0.107 dead-code ship-news fallback. Each: body + screenshot suggestion (/play landing | Workbench Tools+Primitives | M0.5 roadmap card | dead-code purge note) + alt-text + reply-hook + rationale. SAVE to `docs/marketing/_drafts/2026-05-17-x-build-in-public.md` with all sources from marketing-intel at the bottom. POST-WRITE: edit `docs/marketing/TRACK-x.md` to append `[SCHEDULED 2026-05-16-OVERNIGHT-DONE]` to the pre-draft [O] line. NO posting. NO DMs. NO @-mentions of named competitors. Output a 3-line summary at the end.
