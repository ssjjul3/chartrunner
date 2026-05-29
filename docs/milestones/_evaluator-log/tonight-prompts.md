# tonight-prompts.md — evaluator → interactive-session scheduling queue

> **RETIRED 2026-05-25.** The scheduling-from-scheduled-session restriction that made this
> handoff necessary was lifted ~2026-05-22; evaluators now call `create_scheduled_task`
> directly. Kept only as a dormant fallback — see the retired drain hook in the project
> `CLAUDE.md`. Do not rely on it unless that error reappears in an evaluator log.

**Status:** DRAINED
**Last written by:** `cr-evaluator-evening`, 2026-05-19 overnight run
**Why this file exists:** scheduled-task sessions cannot call `create_scheduled_task`
(`Cannot create scheduled tasks from within a scheduled task session.` — 8th consecutive
day as of 2026-05-19). The evaluator drops its picks here; the **next interactive
(non-scheduled) Cowork session** drains the queue, since interactive sessions CAN schedule.

---

## How the next interactive session processes this file

The CLAUDE.md hook in the Trading Game root tells the session to run these steps. If you
are reading this manually, do the same:

1. If **Status: PENDING** and there is ≥1 `[PENDING]` task below, process the queue. If
   **Status: DRAINED**, do nothing.
2. For each `[PENDING]` task, call `mcp__scheduled-tasks__create_scheduled_task` with its
   `taskId`, `description`, and `prompt` (verbatim — the prompt is self-contained).
3. **fireAt handling:** the `localTime` field is the intended clock time. Compute the next
   *future* occurrence of that time in the user's local timezone (Europe — +02:00). If
   tonight's slot has already passed, roll to the same time the next day. Never schedule a
   `fireAt` in the past (the tool rejects it).
4. On success, change that task's `[PENDING]` marker to `[SCHEDULED <date>]` and flip the
   top-level **Status:** to **DRAINED** once every task is scheduled.
5. Tell the user in one line which tasks you scheduled and for when. Don't dump the prompts.
6. If a `create_scheduled_task` call still returns the scheduled-session restriction, you
   are *also* in a scheduled session — leave the file untouched and stop.

---

## Queue

### [SCHEDULED 2026-05-20] cr-o-m05-squads-dryrun-20260519

- **localTime:** today 23:30 (Europe, +02:00) — if past, next day 23:30
- **description:** `[O] M0.5 · Squads upgrade-authority dry-run runbook`
- **prompt:**

> ChartRunner M0.5 [O] Squads upgrade-authority transfer dry-run — autonomous overnight. NO REPO ACCESS REQUIRED (research + write only — produces a runbook doc). CONTEXT: on 2026-05-19 the user CREATED the Squads V4 multisig on devnet (slot 463494585). multisigPda=`3nLSLFRWfEKQJBTANAnEWwbedFmMexsFc8RLzKbGzsXL`, vaultPda=`fK1J2TLk2qLy3cjtiSYDSuCnWuxezphBcdqNGZEpVsp`, 2-of-3 members (Mac+1P / iPad / cold+1P). Programs live but still single-key authority: `chartrunner_maps` `DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH`, `chartrunner_registry` `ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn`, current authority `PDi6BNFCbGE9H72zxCMNWpDfWo5Rp3gvdhCyfpfcAWM`. Next step = transfer authority to vaultPda, but FIRST we need a dry-run. INPUTS to read FIRST: `_security/squads/README.md` (planned npm scripts + recovery matrix); `_security/squads/MULTISIG_DEVNET.md` (live addresses); `_security/squads/create-multisig.mjs` (SDK code used); `SECURITY_AUDIT_2026-05-19.md` (incident + critical findings); `docs/milestones/M0.5-security.md`. Also WebFetch https://docs.squads.so/main/v/development/transactions/proposing-a-transaction and https://docs.squads.so/main/v/development/transactions/voting-and-executing. DELIVERABLE: `docs/architecture/M05-squads-dryrun.md` (≤900 words): (1) Throwaway program plan — deploy a minimal "hello-world" or no-op BPF program to devnet first (cheapest path; could reuse `chartrunner_oracle` source under fresh program ID). (2) Phase A — `solana program set-upgrade-authority` from single-key to vaultPda. Exact CLI invocation + signature flow + estimated gas/SOL. (3) Phase B — Squads-governance round-trip: propose a `set-upgrade-authority` tx via Squads SDK or web UI at https://app.squads.so, vote 2-of-3, execute, observe via `solana program show <PROGRAM>`. The actual rehearsal. (4) Phase C — Reset: transfer authority back so the throwaway program is reusable. (5) Failure modes — 1-of-3 vote, executor≠voter, time-lock (we set 0). (6) Gas budget — total devnet SOL for all phases. (7) Final go/no-go checklist before applying to the real programs. POST-WRITE: verify line 22 of `docs/milestones/M0.5-security.md` already carries `[SCHEDULED 2026-05-19-OVERNIGHT]`. NO actual deploys, NO authority transfers, NO tx submitted tonight. If WebFetch on docs.squads.so fails, fall back to `Squads-Protocol/v4` GitHub README + in-repo `create-multisig.mjs`. Output a 3-line summary: file path + word count + "ready for [D] dry-run tomorrow" or "missing piece X — flag for daytime evaluator".

### [SCHEDULED 2026-05-20] cr-o-x-build-in-public-tomorrow-20260519

- **localTime:** tomorrow 02:30 (Europe, +02:00) — if past, next day 02:30
- **description:** `[O] MKT-X · Pre-draft build-in-public (Squads-multisig-live angle)`
- **prompt:**

> ChartRunner [O] Draft tomorrow's build-in-public X post (Squads-multisig-live angle) — autonomous overnight. NO REPO ACCESS REQUIRED. CONTEXT: on 2026-05-19 the user shipped the **biggest M0.5 milestone yet** — Squads V4 multisig CREATED on devnet, 2-of-3, vaultPda `fK1J2TLk2qLy3cjtiSYDSuCnWuxezphBcdqNGZEpVsp`, finalized at slot 463494585, tx `2jiVXuuAsPi5PLXRCEEfbspsAwEQaTUQPY72XBcgnQwM6eKdapS6ruXLrnvn1H1yt8NZqmnLV4VhGB3iMVACsUKB`. Programs `chartrunner_maps` + `chartrunner_registry` are still single-key authority but the rails for transfer are now live. Also today: a `SECURITY_AUDIT_2026-05-19.md` shipped (Y-vs-T OCR incident codified). Marketing-intel surfaced fresh competitors — `@BananaZoneApp` (tap-trade game, Solana+MagicBlock+Pyth) and (per the 2026-05-20 TRACK-x.md update) **Mattle.fun** (converts Solana trading volume into game character stats — flagged the closest concept-competitor). INPUTS to read: `_security/squads/MULTISIG_DEVNET.md`, `_security/squads/README.md` (esp. recovery matrix), `SECURITY_AUDIT_2026-05-19.md` §1-CRITICAL, `docs/marketing/_drafts/2026-05-19-marketing-intel.md`, `docs/marketing/TRACK-x.md` (quality gates + watchlist + voice cheat-sheet), `docs/marketing/CADENCE.md`. DELIVERABLE: `docs/marketing/_drafts/<run-date>-x-build-in-public.md` — 4 ranked variants, each ≤280 chars, each with rationale + ideal posting time + suggested screenshot/asset. Variants: (A) **"Gave away the keys — to ourselves"** — 2-of-3 multisig framing, tone: ship-pride + security-discipline, link multisigPda on Solana Explorer. (B) **"Pre-mainnet security audit, public"** — link the SECURITY_AUDIT gist/repo, tone: transparency-flex, audience: Solana auditors + serious builders. (C) **Combined** — both stories, "this is what M0.5 looks like" voice; thread option (3 tweets). (D) **Fallback / build-narrative** — generic M0.5-progress (only if A-C feel too inside-baseball). Rank A→D by expected engagement + quality-gate alignment. For variant A include the actual tx sig as a verification hook. **Do NOT post.** Skip the competitor-positioning post — that's a separate [D] task (needs careful drafting to not punch down). Output a 3-line summary: file path + ranked picks (A>B>C>D) + recommended post time.

---

## Drain log

(Each interactive session that drains the queue appends one line: `<datetime> — scheduled N task(s): <taskIds>`.)

2026-05-20 21:18 (Europe) — scheduled 2 task(s): cr-o-m05-squads-dryrun-20260519 (fireAt 2026-05-20 23:30), cr-o-x-build-in-public-tomorrow-20260519 (fireAt 2026-05-21 02:30). NOTE: dry-run task is now retrospective — registry+oracle already upgraded via multisig.
