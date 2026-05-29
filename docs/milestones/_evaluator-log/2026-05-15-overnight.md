# 2026-05-15 — Overnight evaluator plan

**Block:** overnight (autonomous work while user sleeps)
**Evaluator:** `cr-evaluator-evening`
**Mix:** 1 milestone + 1 marketing (default cap — today was a light ship day; no urgent same-day reply mention; default 2-task cap holds)

## Today's recap

**Daytime plan ran 0/2 — both picks hit the recurring scheduling block (same as yesterday).** Today's daytime evaluator scheduled `cr-d-m05-oracle-local-build-20260515` (10:00) and `cr-d-x-build-in-public-jtx-20260515` (14:00) but `mcp__scheduled-tasks__create_scheduled_task` returned the sandbox-restriction error from inside the daytime evaluator session, the user did not run the prompts ad-hoc, and no artifacts landed at `docs/architecture/M05-oracle-local-build.md` or `docs/marketing/_drafts/2026-05-15-x-build-in-public.md`.

**Last night's overnight plan also ran 0/3 — same block.** Confirmed: `docs/architecture/M05-audit-prep.md` (does not exist), `docs/architecture/M05-idl-drift-20260515.md` (does not exist), `docs/marketing/_drafts/2026-05-15-x-build-in-public.md` (does not exist). All 3 picks rolled over.

**What did ship today:**
- ✅ `cr-delete-dead-code` one-shot fired 10:00 — `ChartRunner_Prototype.html` modified at 12:58 local. ~18 KB of audited dead code removed (Strats/Hyper views, `_refreshStratView`, archived Library picker DOM). Per scheduled-tasks log `lastRunAt 2026-05-15T08:00:12.774Z`.
- ✅ `cr-marketing-intel` (overnight) — `_drafts/2026-05-15-marketing-intel.md` (5.3 KB). 🚨 headline: **Trojan Arena** — Solana trading bot launched gamified $5M SOL pool + leaderboards + daily quests. First direct-positioning competitor in our wedge. Section 3 SEO ping found 4 ❌ items on chartrunner.xyz (meta-desc 207ch, no og:image, no twitter:card, no JSON-LD).
- ✅ `cr-surface-health` — green today (Chrome reconnected after manual side-panel touch; v1.0.106 confirmed local + deployed in sync).
- ✅ `cr-anchor-blocker-watch` — still 🔴 (no Anza 1.85 movement; ERS still pulls block-buffer 0.12).
- ✅ `cr-solana-ecosystem-scan` — quiet day; new candidate: Hyperliquid Community Hackathon (4-week, $160K+, 35+ sponsors) as lower-friction M5 alternative to flying to HYPE Singapore.
- ✅ `cr-bug-hunt-sweep` ran 03:08 (output not inspected here).

**Files shipped today (count):** 1 prod code patch (dead-code delete) + 5 daily-watch artifact updates = ~6.
**Git commits today:** repo at `/Users/julianroy/projects/chartrunner` not accessible from sandbox; estimate ~1–2 (single ship: dead-code delete).
**Drafts produced today:** 0 marketing drafts (only the auto-generated marketing-intel scan).
**Rolled over:** 5 distinct picks now stacked — yesterday-overnight × 3 (audit prep, X tomorrow pre-draft, IDL drift) + today-daytime × 2 (oracle local build, X JTX). Plus today-overnight × 2 below.

## Tonight's plan — 2 picks (default cap)

### Pick 1 — [O] M0.5 · audit prep @ **23:30 +02:00** (taskId `cr-o-m05-audit-prep-20260515`)

**Why:** rollover #2 (originally planned 2026-05-13, then 2026-05-14). +3 unblocks (audit kickoff, audit-firm engagement, audit-response triage). +1 milestone ≤30 days. Score 4. Highest-leverage [O] in the M0.5 backlog and a hard prerequisite for engaging any of the four shortlisted firms (OtterSec/Halborn/Neodyme/Zellic) cost-effectively. Self-audit checklist generated overnight saves real prep cost on the paid engagement.

### Pick 2 — [O] MKT-X · pre-draft tomorrow's build-in-public, **Trojan Arena positioning angle** @ **02:30 +02:00** (taskId `cr-o-x-build-in-public-tomorrow-trojan-20260515`)

**Why:** rollover #2 (originally planned 2026-05-13, then 2026-05-14). +2 same-day feedback loop (Trojan Arena flag landed today in marketing-intel — first direct positioning overlap with our wedge). +2 copy-paste-ready for tomorrow morning + answers Q1 from today's marketing-intel ("retarget X build-in-public to Trojan Arena diff angle?" — yes). Score 4. Welcome-the-company tone (skill-loop on real candles vs. rewards-loop on existing execution; same chain, different doors). 3 ranked variants + 4th fallback variant on v1.0.106 ship-news.

(No 3rd pick — today shipped 1 thing, no urgent mentions, default cap holds.)

## Cross-track state

| Track | Active | Tonight's picks | Backlog rollover count |
|---|---|---|---|
| Milestones (70%) | M0.5 — 3/15 done, 2 blockers | M0.5 audit prep | 3 [O] + 1 [D] stacked |
| Marketing (30%) | Trojan Arena hot, JTX cooling, landing SEO 4 ❌ | X tomorrow pre-draft (Trojan angle) | 2 [O]/[D] stacked |

## Sensors at a glance

- 🔴 ANCHOR-BLOCKER-WATCH: still blocked, 7th day. Match deploy still cold. (Local oracle build is the only experiment that could move M0.5 progress this week — still on the daytime backlog, will be reprioritized in tomorrow's morning evaluator.)
- ✅ SURFACE-HEALTH: green today (Chrome sticky after manual side-panel touch).
- 🚨 COMPETITOR: Trojan Arena ($5M SOL pool gamified-trading) is the new first-direct-positioning-overlap competitor. Tonight's Pick 2 is the response.
- 🟡 SEO: 4 ❌ on chartrunner.xyz (meta-desc, og:image, twitter:card, JSON-LD) — single landing-PR fix, ~20 min of work, [D] tomorrow.
- 📅 DEADLINE: Colosseum Fall hackathon Sep 28 – Nov 2, 2026 — natural M0.5 → M1 deadline anchor.

## ⚠ Scheduling blocker — third night running, escape path (b) failed

`mcp__scheduled-tasks__create_scheduled_task` returned `Cannot create scheduled tasks from within a scheduled task session.` from the EVENING evaluator tonight too. The daytime evaluator's hypothesis (b) — "evening evaluator may escape the sandbox restriction" — is **busted**. The block applies to all scheduled-task sessions equally.

**Both picks below are documented as self-contained prompts.** The user must paste them into a fresh (non-scheduled) Cowork session, or the evening evaluator must be re-architected to emit to a non-scheduled-task surface. Cheapest fix now: (c) wire a separate channel — e.g., the evaluator writes a `tonight-prompts.md` and a CLAUDE.md hook auto-fires it on next interactive session-open. **5 picks are now stacked rolled-over; this is the dominant failure mode.**

### Pick 1 prompt (23:30 +02:00) — `cr-o-m05-audit-prep-20260515`

> ChartRunner M0.5 [O] audit-prep — autonomous overnight. INPUTS: `/Users/julianroy/projects/chartrunner/anchor/programs/chartrunner-{maps,registry}/src/lib.rs` + `docs/milestones/M0.5-security.md` + `docs/architecture/M05-oracle-playground-deploy.md`. If repo unreachable, write a stub artifact noting "repo unreachable" and exit WITHOUT marking M0.5 progress. WALK each program: instruction signer/account constraints, authority checks, CPI surface, integer over/underflow, rent/close/SOL drain, PDA collision, upgrade-authority pattern (CRITICAL — single-key default), panics/unwraps, event/log surface. Tag each finding CRITICAL/HIGH/MEDIUM/LOW/INFO with one-line rationale + suggested fix. Aim 15–30 findings total. SAVE to `docs/architecture/M05-audit-prep.md` (≤900 words, exec summary + per-program tables + cross-program notes + remediation order). POST-WRITE: edit `docs/milestones/M0.5-security.md` audit-prep line to `[x] 2026-05-16 — [O]`, move to Done bucket, bump State 3/15 → 4/15. Live IDs `DbzEqKfg…` (maps) + `ER8G9Bnv…` (registry). Devnet only. NO code changes, NO mainnet, NO deploys, NO upgrade-authority changes.

### Pick 2 prompt (02:30 +02:00) — `cr-o-x-build-in-public-tomorrow-trojan-20260515`

> ChartRunner MKT-X [O] tomorrow-pre-draft. PRIMARY ANGLE: Trojan Arena positioning (per `docs/marketing/_drafts/2026-05-15-marketing-intel.md` §2 — Solana trading bot launched gamified $5M SOL pool + leaderboards + daily quests; first direct positioning overlap with our wedge). TONE: welcome-the-company, not snark — frame ChartRunner as skill-loop on real candles + abilities-as-primitives + single-file SDK; frame Trojan Arena as rewards-loop on existing execution. Same chain, different doors. Builder-confident. Do NOT @-mention Trojan in copy without explicit user approval — say "the new $5M trading-game pool". VOICE (CADENCE.md + TRACK-x.md): ≤280 chars, lead with verb, numbers > adjectives, 0–2 emojis, one quality gate. OUTPUT 3 ranked variants A/B/C: A=diff/wedge, B=ecosystem-additive, C=vision-narrative. Each: body + screenshot suggestion (ChartRunner /play landing | Workbench Tools+Primitives | M0.5 roadmap card | v1.0.106 Token Terminal pane) + alt-text + reply-hook + "why this variant" rationale. FALLBACK: 4th variant D = v1.0.106 Token Terminal bug-fix ship-news (per `docs/BUGS-CURRENT.md`). SAVE to `docs/marketing/_drafts/2026-05-16-x-build-in-public.md` with the 4 sources from marketing-intel at the bottom. POST-WRITE: edit `docs/marketing/TRACK-x.md` to append `[SCHEDULED 2026-05-15-OVERNIGHT]` to the "Draft tomorrow's build-in-public" [O] line. NO posting. NO DMs. NO @-mention of named competitors in copy.
