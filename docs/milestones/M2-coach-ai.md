# M2 — Coach · Quant AI v2

**Status:** 🔵 QUEUED · ⚠️ **ABSORPTION PENDING by [[M14-bot-first-runtime]]**
**Theme:** Coach IS the Quant brain (same entity since v1.0.34 rebrand). Replace the hardcoded keyword/state matcher with a real LLM endpoint, fed the FULL Quant snapshot (CCV detector + regime + strategy signals + position context) as conversation context.

> **REDIRECT 2026-05-28** — [[M14-bot-first-runtime]] proposes absorbing this milestone. Under M14, Coach v2 is no longer its own ChartRunnerOS tab — it becomes one LLM panel inside the unified **Bot Terminal / Agent Command Center** surface (Console + Chat + Agents). The "Coach is the Quant brain" identity is preserved; only the surface changes. From the 2026-05-28 Grok session: *"coach should be wired with local llm in bot terminal / delete coach tab / merge console and chat in bot terminal"*. Julian sign-off pending — until then both milestones stay queued; if M14 graduates to numbered priority, this milestone closes in favor of `M14 §LLM panel + Coach panel hook`.

> **UPDATE 2026-05-30** — M14 is no longer only a redirect proposal. Bot Terminal / Agent Command Center has a working `/play` implementation slice (Console / Sessions / Agents, session docs, shared `window.crAgentBus`, dedicated `BotBacktestRecord` source path). M2 still owns the model-backed Coach reply quality, prompt/eval chain, and fallback behavior; the UI surface is now expected to land inside M14.

> **Surface closeout 2026-05-30** — Live-game Coach summon is repaired: the topbar/menu Coach path opens `COACH.llm`, and the Coach frame now matches the green `COACH.exe` terminal chrome. This is **surface parity only**. It does not count as model endpoint, live prompt routing, fallback behavior, or LLM eval completion.

> **Reconciled 2026-05-20** (`MILESTONE_AUDIT.md §3`). v1 Coach groundwork already ships: `crCoach.reply()` keyword/state matching (help/ladder/oco/bracket/wallet/etc.) + a live ATR/score readout in the Coach header. M2 scope is strictly the **v2 model-backed chat path** — the readout and entity stay. Status correctly remains QUEUED.

## Completion condition (all required)

- [x] LLM endpoint provider selected + cost model documented — **Haiku 4.5 primary, Groq 70B A/B alternate** (`M2-llm-endpoints.md`, `M2-cost-per-session.md`)
- [x] Quant snapshot prompt template designed (deterministic, contextual, fits in chosen context window) — `M2-coach-prompt-template.md`
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

### Ready bucket — build chain

- [ ] `[D]` Prompt iteration round 3 — **READY:** round 2 complete; re-run the same mock target after prompt hardening, and add a live/local model sample if credentials are available.

### Blocked bucket

- [x] 2026-05-29 — `[D]` Cost-per-session model — **DONE** (`docs/architecture/M2-cost-per-session.md`). Verdict: Haiku 4.5 cached costs about **$0.014 / $0.027 / $0.068** for 10 / 20 / 50-turn sessions; Groq 70B is ~$0.010 / $0.020 / $0.051. M3 paid-bot pricing should reserve **$0.10/session** for AI-backed sessions; free users get **10 AI turns/day** then v1 fallback.
- [x] 2026-05-29 — `[D]` Prompt template draft v1 — **DONE** (`docs/architecture/M2-coach-prompt-template.md`). Static cacheable L3/Quant system prompt + dynamic payload wrapper + 20-question eval seed set. Pass criteria: 18/20 intent preservation, 20/20 under 70 words, 0 invented balances/fills/guarantees.
- [x] 2026-05-29 — `[D]` Prompt iteration round 1 (manual eval against 20 player questions) — **DONE** (`docs/architecture/M2-prompt-eval-round1.md`). Result: 20/20 golden answers pass; patched prompt to display `wallet.crds` as $CHART and disambiguate `score.value` vs `wallet.score`.
- [x] 2026-05-29 — `[D]` Prompt iteration round 2 — **DONE** (`docs/architecture/M2-prompt-eval-round2.md`). Harness-ready mock raw-output pass scored 16/20 on L3 voice due to generic disclaimer, win celebration, `$CRDS` leak, and "send it" language. Prompt hardened with explicit bans and direct-action wording.
- [ ] `[D]` Endpoint integration in `crCoach` module (feature-flagged behind `window.cr.flags.coachAI`) — **BLOCKED:** prompt frozen.
- [ ] `[D]` Fallback wiring — **BLOCKED:** integration done.
- [ ] `[O]` Eval harness — record 50 player Q&A pairs from current dogfood, run LLM against them, score for relevance. **BLOCKED:** integration done.

### Done bucket

- [x] 2026-05-30 — **Non-counting surface parity:** Coach opens in live game as `COACH.llm`, with Bot Terminal green window chrome. M2 remains open for the real model-backed chat path.

## State

- Progress: 7/11 done — endpoint, snapshot spec, v1-matcher audit, cost model, prompt template v1, and prompt iteration rounds 1-2 are complete. The 2026-05-30 Coach window/summon repair is non-counting surface parity. Prompt iteration round 3 is now the next ready item; remaining chain is round 3 → integration → fallback → eval.
- Blockers active: 3
- Scheduled today: 0
- Last evaluated: 2026-05-29 (interactive — prompt iteration round 2 completed)

## Notes

- v1.0.x ships hardcoded FAQ + live ATR/score readout in Coach header. M2 keeps the readout — only the chat reply path changes.
- M2 unblocks M3 paid-bot pricing (need to know per-session AI cost before pricing bots).
- The Quant snapshot is the same data that drives the in-game CCV detector — so a lot of M2 is plumbing already-computed state to the LLM.
