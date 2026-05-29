# M2 — Coach · Quant AI v2

**Status:** 🔵 QUEUED · ⚠️ **ABSORPTION PENDING by [[M14-bot-first-runtime]]**
**Theme:** Coach IS the Quant brain (same entity since v1.0.34 rebrand). Replace the hardcoded keyword/state matcher with a real LLM endpoint, fed the FULL Quant snapshot (CCV detector + regime + strategy signals + position context) as conversation context.

> **REDIRECT 2026-05-28** — [[M14-bot-first-runtime]] proposes absorbing this milestone. Under M14, Coach v2 is no longer its own ChartRunnerOS tab — it becomes one LLM panel inside the unified **Bot Terminal / Agent Command Center** surface (Console + Chat + Agents). The "Coach is the Quant brain" identity is preserved; only the surface changes. From the 2026-05-28 Grok session: *"coach should be wired with local llm in bot terminal / delete coach tab / merge console and chat in bot terminal"*. Julian sign-off pending — until then both milestones stay queued; if M14 graduates to numbered priority, this milestone closes in favor of `M14 §LLM panel + Coach panel hook`.

> **Reconciled 2026-05-20** (`MILESTONE_AUDIT.md §3`). v1 Coach groundwork already ships: `crCoach.reply()` keyword/state matching (help/ladder/oco/bracket/wallet/etc.) + a live ATR/score readout in the Coach header. M2 scope is strictly the **v2 model-backed chat path** — the readout and entity stay. Status correctly remains QUEUED.

## Completion condition (all required)

- [ ] LLM endpoint provider selected + cost model documented
- [ ] Quant snapshot prompt template designed (deterministic, contextual, fits in chosen context window)
- [ ] Coach widget routes to live LLM endpoint behind a feature flag
- [ ] Fallback to v1 hardcoded keyword matcher if endpoint fails
- [ ] Cost-per-active-player projected + within budget for M3 paid-bot economy

## Imminent-solvables

### Ready bucket

> **OpenClaw data-infra crossmap (2026-05-28):** `coin_profiles/` on Umbrel (`/opt/data/chartrunner/coin_profiles/`, 8 coins seeded) provides the **regime history JSON** the Quant snapshot's regime field currently has to derive (`docs/architecture/M2-quant-snapshot.md` flagged "trend/range/squeeze has no stored global — must be derived"). Schema is bull / bear / crab / altseason + volatility. Wiring the snapshot to read OpenClaw's profile for the active symbol cuts that derivation cost to a lookup and gives the LLM **historical regime context** as well, not just the current frame. Sandbox can't reach Umbrel; pulling the JSON over via OpenClaw Cron Jobs (per [[reference_chartrunner_umbrel_agents]]) is the natural delivery path. Cross-ref: [`BRAINSTORM_VS_SHIP_2026-05-28.md`](../../BRAINSTORM_VS_SHIP_2026-05-28.md) §"OpenClaw data-infra crossmap" (in addendum at the top of `MILESTONE_AUDIT.md`).

> **All 3 Ready-bucket research items written 2026-05-20** (frontier auto-resolve batch). These tee up the Blocked-bucket build work (prompt template, integration); none of that is started.

- [x] 2026-05-20 — `[D]` LLM endpoint comparison — `docs/architecture/M2-llm-endpoints.md`. Compared Haiku/Groq/Cerebras/Together/gpt-4o-mini on 2026 cost/latency/context. Recommendation: **Claude Haiku 4.5** (persona fidelity + sub-second TTFT, prompt caching makes cost negligible); Groq Llama 3.3 70B as the fast/cheap A/B alternate.
- [x] 2026-05-20 — `[D]` Quant snapshot serialization spec — `docs/architecture/M2-quant-snapshot.md`. Per-turn JSON spec with a source-map to real prototype lines (`scoreSetup`, `detectCCV`, candle `{t,o,h,l,c,v}`, position arrays); ~700–800 tokens/snapshot. Note: trend/range/squeeze has no stored global — must be derived.
- [x] 2026-05-20 — `[O]` `crCoach.reply()` matcher audit — `docs/architecture/M2-coach-v1-matcher.md`. The matcher is at **L40988** (not ~39189). Catalogued 9 branches / ~11 response strings the LLM must cover, the `ctx()` state it reads, and adjacent Coach paths the LLM must NOT touch (T1 tutorial L14976, live Quant header readout L23302).

### Blocked bucket

- [ ] `[D]` Cost-per-session model — **BLOCKED:** endpoint + snapshot spec done.
- [ ] `[D]` Prompt template draft v1 — **BLOCKED:** snapshot spec done.
- [ ] `[D]` Prompt iteration round 1 (manual eval against 20 player questions) — **BLOCKED:** v1 draft.
- [ ] `[D]` Prompt iteration round 2 — **BLOCKED:** round 1 + findings.
- [ ] `[D]` Prompt iteration round 3 — **BLOCKED:** round 2.
- [ ] `[D]` Endpoint integration in `crCoach` module (feature-flagged behind `window.cr.flags.coachAI`) — **BLOCKED:** prompt frozen.
- [ ] `[D]` Fallback wiring — **BLOCKED:** integration done.
- [ ] `[O]` Eval harness — record 50 player Q&A pairs from current dogfood, run LLM against them, score for relevance. **BLOCKED:** integration done.

### Done bucket

(none yet)

## State

- Progress: 3/11 done — all 3 Ready-bucket research items written 2026-05-20 (endpoints, snapshot spec, v1-matcher audit). Remaining 8 are the Blocked-bucket build chain (prompt template → iteration → integration → fallback → eval) + the 5 completion conditions (none met).
- Blockers active: 8
- Scheduled today: 0

## Notes

- v1.0.x ships hardcoded FAQ + live ATR/score readout in Coach header. M2 keeps the readout — only the chat reply path changes.
- M2 unblocks M3 paid-bot pricing (need to know per-session AI cost before pricing bots).
- The Quant snapshot is the same data that drives the in-game CCV detector — so a lot of M2 is plumbing already-computed state to the LLM.
