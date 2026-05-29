# 2026-05-14 — Overnight evaluator plan

**Block:** overnight (autonomous work while user sleeps)
**Evaluator:** `cr-evaluator-evening`
**Mix:** 2 milestone + 1 marketing — heavy ship day → cap raised to 3

## Today's recap

**Daytime plan ran partially.** Both picks were planned but scheduling was blocked yesterday (same blocker hit again tonight — see ⚠ note below). Today shipped without the cron entries:

**Daytime sub-tasks status:**
- ✅ Done — `[D]` Solana Playground oracle deploy attempt → `docs/architecture/M05-oracle-playground-deploy.md` (5.7 KB; "path closed" — Playground caps anchor-lang at 0.29.0 + lacks pyth-solana-receiver-sdk). Replaced in M0.5 Ready bucket with new sub-task: `[D]` Local `anchor build -p chartrunner_oracle` attempt.
- ❌ Rolled over — `[D]` Draft today's build-in-public X post → no `_drafts/2026-05-14-x-build-in-public.md` exists. Reason: 14:00 cron never fired (no scheduler entry).
- ✅ Bonus ship — Token Terminal bug-hunt sweep → 4 findings + 4 fixes shipped as v1.0.106 in `ChartRunner_Prototype.html` (lines 43961, 44528, 44712-44734, 44753-44763). Documented in `docs/BUGS-CURRENT.md`.
- ✅ Daily watches refreshed — `SOLANA-ECOSYSTEM-DAILY.md` (Colosseum Fall hackathon dates locked Sep 28–Nov 2; Jito JTX context confirmed; MagicBlock + ERS still cold), `ANCHOR-BLOCKER-WATCH.md` (still 🔴), `SURFACE-HEALTH-DAILY.md`.
- ✅ Marketing intel ran overnight (yesterday's pick #2 evidently fired manually) → `_drafts/2026-05-14-marketing-intel.md` (5.4 KB, 0 mentions, Jito JTX competitive flag).

**Files shipped today (count):** 5 substantive artifacts + 1 prod code patch = ~6.
**Git commits today:** repo at `/Users/julianroy/projects/chartrunner` not accessible from sandbox; estimate ≥3 based on filesystem activity.
**Drafts produced today:** 1 (yesterday's overnight marketing-intel; today's daytime X draft did NOT produce).
**Rolled over:** today's daytime X build-in-public draft + yesterday's overnight audit-prep + yesterday's overnight tomorrow-x-pre-draft + yesterday's overnight M1 tokenomics-draft audit (none of last night's [O]s actually fired — scheduler block hit yesterday too).

## Tonight's plan — 3 picks (heavy ship day, mix 2 milestone + 1 marketing)

1. **23:30 +02:00 → `cr-o-m05-audit-prep-20260514`** · [O] M0.5 audit prep
   *Read both `chartrunner_maps` + `chartrunner_registry` `lib.rs`, walk attack surface, output CRITICAL/HIGH/MEDIUM/LOW/INFO checklist → `docs/architecture/M05-audit-prep.md`.*
   **Why:** rollover from 2026-05-13. +3 unblocks (audit kickoff, audit-firm engagement, audit-response triage). +1 milestone ≤30 days. Score: 4.

2. **02:30 +02:00 → `cr-o-x-build-in-public-tomorrow-20260514`** · [O] MKT-X
   *Pre-draft tomorrow's @ChartRunner_xyz post (3 variants ranked) leaning on v1.0.106 token-terminal fix sweep + Playground finding + Colosseum dates → `docs/marketing/_drafts/2026-05-15-x-build-in-public.md`.*
   **Why:** rollover from 2026-05-13. +2 same-day feedback loop (today's bug-fix sweep is gold material). +2 copy-paste-ready for morning. Score: 4.

3. **05:30 +02:00 → `cr-o-m05-idl-drift-20260514`** · [O] M0.5 IDL drift sweep
   *Compare `anchor/target/idl/*.json` vs `lib.rs` for both live programs, flag BREAKING / SILENT / COSMETIC drift → `docs/architecture/M05-idl-drift-20260515.md`.*
   **Why:** +2 surfaces a regression bug-hunt didn't catch (drift = audit firms read different surface than what's deployed). +1 milestone ≤30 days. Score: 3. (05:30 to avoid 04:10 ecosystem-scan slot.)

## Cross-track state

| Track | Active | Tonight's picks |
|---|---|---|
| Milestones (70%) | M0.5 Security + Anchor unblock — 3/15 done, 2 blockers | M0.5 audit prep + IDL drift |
| Marketing (30%) | post-Frontier momentum + Jito JTX competitive flag | X build-in-public pre-draft |

## Sensors at a glance

- 🔴 ANCHOR-BLOCKER-WATCH: still blocked (platform-tools v1.54 = Rust 1.84.1; ERS dep tree unchanged).
- ⚠ SURFACE-HEALTH: Chrome MCP degraded — engagement tasks deferred until reconnect.
- 🚨 COMPETITOR: Jito JTX live (May 5) — same self-custody Solana trading lane, but not gamified. Lean on gamified-onboarding wedge in next 2 weeks of marketing.
- 📅 DEADLINE: Colosseum Fall hackathon Sep 28 – Nov 2, 2026 — natural M0.5 → M1 deadline anchor.

## ⚠ Scheduling blocker (recurring)

`mcp__scheduled-tasks__create_scheduled_task` returns `Cannot create scheduled tasks from within a scheduled task session.` for the second night running. All 3 picks are planned + tagged `[SCHEDULED 2026-05-14]` in their source files but require manual cron creation from a live Cowork session. Self-contained prompts for each pick are embedded below. Until this tooling block clears, the evaluator pair is producing plans-without-fires, which is why three [O] tasks rolled over today.

### Pick 1 prompt (23:30 +02:00) — `cr-o-m05-audit-prep-20260514`

> ChartRunner M0.5 [O] audit-prep. Read `/Users/julianroy/projects/chartrunner/anchor/programs/chartrunner-{maps,registry}/src/lib.rs` plus `docs/milestones/M0.5-security.md` + `docs/architecture/M05-oracle-playground-deploy.md`. For each program walk: instruction signer/account constraints (PDA seeds, mut/init, has_one), authority checks, CPI surface, integer over/underflow, rent/close/SOL drain, PDA collision, upgrade-authority pattern (CRITICAL — currently single key). Tag each finding CRITICAL/HIGH/MEDIUM/LOW/INFO with one-line rationale + suggested fix. Aim 15–30 items total. Save to `docs/architecture/M05-audit-prep.md`. After save, mark M0.5 Audit-prep line `[x] 2026-05-15 — [O]`, move to Done bucket, bump State 3/15 → 4/15. NO code changes. NO mainnet. Live program IDs: `DbzEqKfg…` (maps) + `ER8G9Bnv…` (registry).

### Pick 2 prompt (02:30 +02:00) — `cr-o-x-build-in-public-tomorrow-20260514`

> ChartRunner MKT-X [O] tomorrow-pre-draft. Source: `docs/BUGS-CURRENT.md` (v1.0.106 token-terminal — 4 findings 4 fixes, headline angle), `docs/architecture/M05-oracle-playground-deploy.md` (Playground path-closed honesty), `docs/SOLANA-ECOSYSTEM-DAILY.md` (Colosseum Fall hackathon countdown). Voice (CADENCE.md + TRACK-x.md): ≤280 chars, lead with verb, numbers > adjectives, 0–2 emojis, hit one quality gate (build-in-public/educational/ecosystem/vision). Output 3 variants A/B/C ranked by leverage with body + screenshot suggestion + alt-text + reply-hook each. Save `docs/marketing/_drafts/2026-05-15-x-build-in-public.md`. Tag TRACK-x.md "Draft today's build-in-public" line `[SCHEDULED 2026-05-15]`. NO posting.

### Pick 3 prompt (05:30 +02:00) — `cr-o-m05-idl-drift-20260514`

> ChartRunner M0.5 [O] IDL-drift sweep. Compare `/Users/julianroy/projects/chartrunner/anchor/target/idl/chartrunner_{maps,registry}.json` vs `/Users/julianroy/projects/chartrunner/anchor/programs/chartrunner-{maps,registry}/src/lib.rs`. For each program: instructions (missing/renamed/reordered accounts), `#[account]` fields (name/type/optionality), events, error variants. Output table per program — IDL | lib.rs | drift-type | BREAKING/SILENT/COSMETIC. If zero drift, say so + "IDL freshness verified 2026-05-15". If drift, append fix recipe + hot-take on what audit firm needs vs what user fixes pre-engagement. Save `docs/architecture/M05-idl-drift-20260515.md`. Mark M0.5 IDL-drift line `[x] 2026-05-15 — [O]` if zero drift, else `[DRIFT FOUND]` flag. If repo unreachable from runtime, write stub + leave milestone untouched. NO code changes. NO IDL regen.
