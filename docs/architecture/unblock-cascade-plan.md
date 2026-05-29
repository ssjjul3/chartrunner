# Unblock-Cascade Plan — 2026-05-29

> **Purpose:** flat task buckets across 19 milestones produce flat priority. The blocked-bucket items don't all have the same downstream impact — some single decisions or completions unlock cascades of 5+ items across 3+ milestones, others unlock nothing. This doc maps the dependency graph + recommends an attack order so the evaluators (and Julian) prioritize by *leverage*, not by what's loudest.

## Scoreboard (current)

- 19 milestones · 52 ready · 104 blocked · 20 done (ready and blocked refer to imminent-solvables, not top-of-file completion conditions)
- 44/52 ready items concentrate in the 4 new bonus milestones (M12/M13/M14/M15). Numbered roadmap milestones (M1, M2, M2.5, M2.6, M3, M4, M5, M6, M7, M8, M9, M10) are mostly waiting on upstream gates.

## Tier 1 — single items that unlock the most

### 🥇 M1 Tokenomics paper v0.1 publish

**Last analytical gate scheduled today 10:00 CEST** (`cr-d-m1-entry-fee-schedule-20260529`, `notifyOnCompletion:false`, readback-verified). Per `M1-tokenomics.md`: O-4 entry-fees + O-2/O-15 reserve-depletion is named *"the last analytical gate before the paper is publish-ready (O-16 boundary stays pre-TGE, not publish-blocking)"*.

**Once the paper publishes (target this week):**

- M3 — flip the v0.9.12 feature flags (Profile balances pills · Marketplace icon · Missions tab · Tokenomics block). One CSS edit per flag.
- M3 — Workbench Bots tab restoration eligible (a separate condition, but the paper is the gating dependency).
- M4 — Marketplace pricing model is no longer hand-waved.
- M8 — Tournament entry-fees + payouts have a real economy spec.
- M13 — `$RUN` balance read via SPL token account becomes meaningful (currently blocked: "M1 dependency: $RUN mint address must exist before this is testable on devnet").
- M13 — `$CHART → $RUN` swap function unblocks (in-extension swap surface).
- M13 — Backtest payment flow can use real prices.

**Downstream count: ~7 solvables across 5 milestones from one publish event.** Highest single point of leverage on the whole board. Already in motion today.

### 🥈 M2.5 SDK extraction Phase 1 finish (M1.4 + M1.5)

Per `sdk-m1-scaffold/STATUS.md`: M1.1–M1.3 done (surface catalogued, broker + detectors ported to TS, type interfaces stubbed, build pipeline emits to deploy). **M1.4 pending:** swap the inline `class ChartRunnerSDK` (`ChartRunner_Prototype.html` lines **11709–13219, 1511 lines** — line numbers in STATUS.md and `sdk/web/core/src/index.ts` are stale) for `import { ChartRunnerSDK } from "./sdk/core/index.js"`. **M1.5:** static playtest regression.

**Once M1.4+M1.5 land:**

- M14 — Bot SDK surface (`window.ChartRunner.*`) gets a clean module to re-export from. Listed explicitly in M14: *"M2.5 dependency: SDK extraction must finish so window.ChartRunner can re-export from a clean module."*
- M14 — SDK call log instrumentation becomes feasible → unblocks the Replay viewer.
- M15 — `src/core/{chart-engine,game-overlay,game-world,play-guard}.js` slots into the file structure M2.5 establishes. M15 explicitly says *"M2.5 already splits src/core/. Best landed together."*
- M3 — Workbench rebuild gets a real SDK to wire tabs against.

**Downstream count: ~5 solvables across M14/M15/M3.** Pure dev work, no external dependency, no Julian-hands signing. The next pickup is well-defined: pick a single chunk of the IIFE, replace it with an import, regression-test it.

### 🥉 M0.5 — `chartrunner_match` deploy (Anza Rust-1.85 toolchain wall)

Day 13+ stuck. Source is `complete realtime PvP scoreboard` (init/join → delegate → tick_player → commit_and_finish), auditor-readable now. Memory `project_chartrunner_anchor_deploys` says: *"match deployed 2026-05-20 (local build, platform-tools v1.52)"* — so the deploy may have happened locally; check whether on-chain state matches.

**Once the deploy is verified live:**

- M0.5 — closes one of the 4 remaining audit conditions (`match` is the last LIVE-vs-SOURCE gap besides `oracle` Item-4).
- M8 — PvP tournaments centerpiece unblocks. Token-launch primitive can build on `chartrunner_match` matchmaking. World ID gate + CASH escrow + anti-cheat on tick_player still needed before money rides on it (per M8-magicblock-audit).
- M14 — `record_bot_backtest` instruction can ride the same batched upgrade pattern.

**Downstream count: unblocks M8 entirely (4/11 → ~9/11 readiness) + closes M0.5 parity.** External-dependency tail (Anza toolchain timing), so we can't force it; verify current state and document next step.

## Tier 2 — fast wins worth doing alongside

### M11 canonical OHLC choice (Hermes Parquet vs OpenClaw JSONL)

Single decision, no code. Per memory `project_chartrunner_hq_telegram_group`: *"dual-agent OHLC scrape was an EXPERIMENT that didn't work — winding down."* Both corpora exist on Umbrel; canonical-choice pending.

**Unblocks:**
- M3 — Backtest tab → Hermes engine wiring (`docs/architecture/M3-backtest-hermes-wiring.md`)
- M11 — Scanner/Chart/Strategy Lab data layer
- M14 — Bot backtests have a canonical source
- M11 — cross-product contract documented (what's shared with the game, what's separate)

**Downstream count: ~4 items across 3 milestones for one decision.** See [`M11-canonical-ohlc-decision.md`](M11-canonical-ohlc-decision.md) for the pros/cons breakdown + recommendation.

### Apply P0 dev-kit bridge-rewiring patch (Ready M3 item)

Staged in `_patches/p0-bridge-rewiring-2026-05-28/`. One file (`dev-kit/dev-panel.html`), 4 hunks, 50+/1−. Crosscuts M2.5, M3, M4, M6.

**Unblocks:**
- Strategy Composer Execute/Simulate buttons (already coded, silently failing)
- Agent Terminal flow
- On-chain test commands over the dev panel's remote bridge

**Downstream count: ~3 dev-loop surfaces unblock from one patch apply.** Julian-hands single command: `cd ~/projects/chartrunner/dev-kit && bash ../Trading\ Game/_patches/p0-bridge-rewiring-2026-05-28/apply.sh`.

### flaresolverr install (Ready M12 item)

Restores OpenClaw DEX scraper data flow that's actively burning 1,581 fails + 8,276 rate-limits per the audit.

**Unblocks:** DEX OHLC feed, M11 data layer health. 30-min Julian-hands install on `umbrel.local`.

### Privacy policy page on chartrunner.xyz

**Unblocks:** M13 Chrome Web Store submission, Plausible Analytics best practices. Drafted in this session ([`chartrunner-prototype/privacy.html`](../../chartrunner-prototype/privacy.html)) — Julian reviews + deploys.

## Recommended attack order

1. **Let M1 O-4 fire at 10:00 today** (in motion). When it lands, immediately review the artifact and decide publish-readiness. If yes → M1 publish opens the M3/M4/M8/M13 cascade in one move. *Highest-leverage event this week.*
2. **Make the M11 canonical OHLC choice** (decision memo in this session; Julian picks). ~4 items unblock for free, no code.
3. **Apply the P0 dev-kit bridge patch** (one-command Julian-hands). Strategy Composer + Agent Terminal back in service.
4. **Push M2.5 M1.4 finish** to a focused session. Pick one IIFE chunk (start with `class ChartRunnerSDK` line 11709-13219), replace with import, regression-test, commit. Repeat for next chunk. Cascade lands when the inline IIFE is fully gone.
5. **flaresolverr install** opportunistically (M12 Ready, 30-min job).
6. **Verify `chartrunner_match` deploy state** — local build per memory; check on-chain devnet + git source-parity. If live, mark M0.5 condition closed and surface the next step for M8. If not live, document Anza-watch as standing item.

## Items NOT in scope today (parked)

- M2.6 — fully done, no remaining solvables.
- M7 — partial (RUN-tube + Display shipped); rest is queued behind M5/M8.
- M9 — mobile, all 8 items blocked on Solana Mobile Stack / RN choice + M2.5.
- M10 — mainnet, all 10 items blocked on M0.5 audit + finite list of upstream milestones.

These don't move regardless of what's done in Tier 1 / Tier 2 today.

## Cross-references

- [`M11-canonical-ohlc-decision.md`](M11-canonical-ohlc-decision.md) — the Hermes-vs-OpenClaw memo this plan references.
- [`M25-sdk-extraction-status-2026-05-29.md`](M25-sdk-extraction-status-2026-05-29.md) — current state audit with concrete line numbers for the M1.4 swap.
- [`../milestones/M1-tokenomics.md`](../milestones/M1-tokenomics.md) — the O-4 task scheduled today.
- `MILESTONE_AUDIT.md` — per-milestone reality reconciliation (top-level).
