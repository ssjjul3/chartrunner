# ChartRunner Phase 2 — PlayerModel + AgentModel Parity Spec

*Guarantees the L3 learning channels produce deterministic, reproducible model outputs. Python is oracle, JS must match — the same gating pattern as Phase 1's 1,458-vector `compute_position_size` parity test, extended to stream-oriented models.*

*Companion to `ChartRunner_Phase2_Consumer_Architecture.md`. Implementation split: skeleton seeded in **M5**, computation completed in **M7**, gated for merge in **M7/M8**.*

---

## The one-liner

> **Given the same event stream, `PlayerModel` and `AgentModel` must produce byte-identical output in TypeScript (L3 Tauri app) and Python (trading-stack nightly batch).** Non-determinism in either model would break: (a) the tournament-disabled same-seed coaching promise, (b) the "revertible LearningUpdate" invariant, (c) any future nightly optimizer running against the same event logs, and (d) the audit trail shown in L3's "Coach history" panel. This spec lifts Phase 1's float-parity gating pattern to stream-computed models.

---

## Why this test is essential

Three failure modes the parity test prevents. Each has already bitten similar systems at other teams — the test exists to make sure we don't repeat the mistake.

1. **Hidden non-determinism in rolling aggregates.** JavaScript `Array.sort()` is not stable pre-ES2019, floating-point `reduce()` order depends on traversal direction, and `Map` iteration order depends on insertion. A JS implementation that computes `r_mean` by iterating a `Map` can drift from a Python implementation that sorts by timestamp first. Caught by parity vectors that include same-timestamp receipt clusters.
2. **Off-by-one in window boundaries.** `window_days = 30` with `now_ts = T` means events at `ts < T - 30d * 86400 * 1000` are excluded. Off-by-one here is the most common model bug: inclusive vs exclusive boundary, `<=` vs `<`, truncate vs drop. Caught by invariant tests that reissue the same query after a 1-ms tick.
3. **Silent schema drift between JS and Python.** If TS adds a new field to `PlayerModel.ability_edges` without Python catching up, L3 Tauri and the nightly batch produce incompatible models. The stored model becomes un-re-runnable. Caught by schema-shape assertions at the top of the parity test — vectors include the *full* model shape, not just the fields the test author remembered.

**What breaks if this test doesn't exist.** The tournament system (M8) needs to re-run a race from its seed + event log and reproduce the same winner — if models are non-deterministic, disputes about "the coach biased me" become unresolvable even though CoachChannel is disabled, because `PlayerModel` itself influences which abilities get surfaced *before* the tournament-disable flag kicks in. Similarly, revertible LearningUpdates require the "pre-update model" and "post-revert model" to compare identically — if the computation drifts over time, reverts become lossy.

---

## Oracle choice — Python first

Same reasoning as M5's EIP-712 parity (where JS is oracle for signing) — pick the oracle where the richer library ecosystem lives.

For model computation, **Python is oracle** because:

- `pandas` + `numpy` handle rolling-window stats correctly out of the box, with well-tested boundary behavior.
- The trading-stack's nightly `strategy_discoverer.py` + `ollama_optimizer.py` already run in Python — they will want to consume the same PlayerModel/AgentModel shapes for their own drift detection, without re-implementing.
- Python floating-point math under IEEE 754 is bit-identical to JS's `Number` for the operations we use (`+`, `-`, `*`, `/`, `Math.sqrt`). The arithmetic primitive parity is free. It's the *order* of operations that drifts.
- If Julian ever wants to replay a year of agent history through a new model version, Python handles the data volume better than a browser-embedded Tauri renderer.

JS mirror ships in `@chartrunner/terminal` (the L3 Tauri app). It must produce byte-identical output to the Python oracle on the same input. Both are compiled from the same spec; neither is considered "primary" for the user — the user sees JS output in the Tauri UI, but the ground truth for disputes is Python.

---

## Scope — one spec, two models

`PlayerModel` and `AgentModel` share an event source (AgentReceipt stream + BehaviorTape stream), share window semantics, and share the rolling-aggregate primitives. A single parity infrastructure covers both. Separate test files but shared vector format and shared gen-script.

```
                          canonical event stream
                          (AgentReceipt[] + BehaviorTape[] + config)
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                                     ▼
         PlayerModel (L2-targeted)              AgentModel (L1-targeted)
         ability_edges                          mandate_fire_rates
         session_bias                           mandate_pnl_edges
         regime_fit                             mandate_drift
         variance_footprint                     dead_mandates
         drift_from_mandate                     overlapping_mandates
         consecutive_tilt_flag                  chat_style_signal
```

Both models consume the same event stream; the test harness asserts both models parity-match in a single vector pass.

---

## Canonical event stream shape

The single source of truth for what goes in. Both Python and JS parse this same JSON shape.

```json
{
  "schema_version": 1,
  "config": {
    "window_days": 30,
    "now_ts_ms": 1734567890000,
    "player_id": "julian",
    "agent_ids": ["agent-hl", "agent-sol"]
  },
  "events": [
    {
      "kind": "agent_receipt",
      "ts_ms": 1734000000000,
      "agent_id": "agent-hl",
      "event_id": "rec-000001",
      "payload": {
        "mandate_id": "funding-shorts",
        "kind": "fill",
        "venue": "hl",
        "side": "short",
        "price": 65120.5,
        "notional": 420.0,
        "reason": "funding_bps=9.2 exceeds gte=8",
        "gate_breakdown": {
          "funding": 0.82,
          "oi_normalized": 0.61,
          "regime": "trending"
        },
        "session": "ny",
        "r_multiple_closed": null
      }
    },
    {
      "kind": "agent_receipt",
      "ts_ms": 1734001500000,
      "agent_id": "agent-hl",
      "event_id": "rec-000002",
      "payload": {
        "mandate_id": "funding-shorts",
        "kind": "close",
        "parent_receipt_id": "rec-000001",
        "r_multiple_closed": 1.7,
        "reason": "TP hit"
      }
    },
    {
      "kind": "behavior",
      "ts_ms": 1734002000000,
      "event_id": "beh-000001",
      "payload": {
        "action": "ability_fire",
        "ability_id": "bracket",
        "outcome_r": 1.4,
        "session": "ny",
        "regime": "trending"
      }
    },
    {
      "kind": "chat_reaction",
      "ts_ms": 1734002100000,
      "agent_id": "agent-hl",
      "event_id": "chat-000001",
      "payload": {
        "receipt_id": "rec-000001",
        "user_action": "dismissed_without_reading",
        "receipt_verbosity": "full"
      }
    }
  ]
}
```

Five event kinds: `agent_receipt` (fill + close), `behavior` (L2 ability fires + outcomes), `chat_reaction` (for `chat_style_signal`), plus `mandate_granted` and `mandate_revoked` for lifecycle tracking.

**`event_id` provenance.** Every event carries an `event_id: string` field that is unique within the stream. M5's `AgentReceipt` schema did NOT originally carry this field — **M5 DELIV-9 extends the AgentReceipt schema to include `event_id`**, derived as follows (single canonical form, mirrored in `event_schema.json`):

- **Signed receipts** (fill, close, reject, mandate_granted, mandate_revoked): `event_id = sha256(signature).slice(0, 16)`. Signatures are already unique by EIP-712 + nonce + ts_ms, so hashing the signature alone is sufficient and simpler than hashing a concatenation.
- **BehaviorTape events**: `event_id = beh-${source_id}-${seq}` where `seq` is a monotonic per-source counter.
- **chat_reaction events**: `event_id = chat-${seq}`.
- **mandate lifecycle events without a distinct receipt signature**: `event_id = mnd-${mandate_id}-${action}-${seq}`.

The spec pins this: implementations MUST NOT fabricate `event_id`s at read time, because a fabricated id breaks parity across runs that re-read the same log. If `event_schema.json` and this prose ever disagree, the schema wins.

**Event-sorting rule.** Events are sorted by `(ts_ms ASC, event_id ASC)`. This is the only valid ordering.

**Collision policy.** If two events share both `ts_ms` AND `event_id`, the stream is rejected as malformed — `compute_player_model` throws `StreamIntegrityError`. This is not a soft fallback: a collision is either a bug in the emitter (same source emitted the same id twice) or tampering. No silent tiebreaker on array-index or object-identity — those would be order-of-reads-dependent and violate invariant #1.

**`schema_version`.** Every canonical stream carries a top-level `schema_version: integer`. M5 ships `schema_version: 1`. Any additive change to the event schema (new field, new event kind) bumps to `2` and requires `gen_model_vectors.py` to be re-run. Mismatched schema versions between a stored stream and the running implementation cause `compute_*_model` to refuse to execute rather than silently dropping unknown fields.

---

## Vector generation strategy

Like Phase 1's 1,458-vector grid, but stream-shaped. The cartesian product is different:

```
total_vectors = N_scenarios × N_window_sizes × N_stream_scales

            = 10          × 3               × 5
            = 150 vectors
```

| Axis | Values | Why |
|---|---|---|
| `scenario` | 10 named archetypes (below) | covers representative behavior patterns |
| `window_days` | 7, 30, 90 | exercises rolling-window boundary logic |
| `stream_scale` | 10, 50, 200, 1000, 5000 events | catches O(n²) bugs + numerical-stability issues at volume |

150 vectors is smaller than Phase 1's 1,458 because event streams are inherently variable — we trade grid density for scenario coverage. Each vector is a full stream, not a single function call; the aggregate computation per vector is much heavier.

### The 10 canonical scenarios

Each is a hand-authored event stream with a known-good expected model. Python generates both the stream and the expected model in a single `gen_model_vectors.py` run — the Python implementation IS the oracle by definition.

1. **`01_funding_shorts_baseline`** — 50 HL `funding-shorts` mandate fires over 14 days, mixed outcomes (62% win rate, R mean +1.2, R stdev 1.8). Baseline fingerprint everything else perturbs from.
2. **`02_dead_mandate`** — one mandate with 2 fires in first 5 days, then 30 days silence. Expected `dead_mandates` contains that mandate id.
3. **`03_overlapping_mandates`** — two mandates with 80% scope overlap (both SHORT on BTC, one triggers at funding >8bps, the other at funding >10bps). Expected `overlapping_mandates[0]` contains both ids.
4. **`04_drift_scenario`** — mandate trigger says `funding_bps.gte = 8` but receipts show 40% of fires happened with `funding_bps` in range 4–7 (mandate drifted toward looser trigger). Expected `mandate_drift[id] ≈ 0.4`.
5. **`05_regime_switch`** — 30 days in `calm` regime (R mean +0.3), then abrupt switch to `volatile` (R mean -0.8). Expected `regime_fit.calm > 0` and `regime_fit.volatile < 0` sharply.
6. **`06_london_bias`** — identical setups across 3 sessions, but London fires consistently -0.5R worse than NY/Asia. Expected `session_bias.london` markedly negative, others neutral.
7. **`07_persona_verbosity_decline`** — 20 chat receipts in "full" verbosity, user dismisses last 15 without reading. Expected `chat_style_signal.verbosity_preferred = "terse"`.
8. **`08_tilt_cluster`** — 6 consecutive losing trades in a 2-hour window after a big loss. Expected `consecutive_tilt_flag = true`, `variance_footprint` spikes.
9. **`09_cross_mandate_stress`** — 3 agents, 7 mandates, 500 receipts spanning 90 days. Heavy cross-agent activity. Stress-tests `AgentModel` isolation — `agent-hl` stats must not leak into `agent-sol` stats.
10. **`10_window_boundary_exact`** — receipts placed at exactly `now_ts - window_days` and `now_ts - window_days + 1ms`. Former must be excluded, latter must be included. The off-by-one landmine — this scenario tests the *data-shape* boundary case (one hand-crafted vector with a known-good expected model). Invariant test #3 is the orthogonal *property-based* sibling: it re-runs with `now_ts+1ms` and asserts the DELTA is what you'd predict. Both exist because a bug could pass one and fail the other.

Per scenario, 3 window sizes × 5 stream scales = 15 vectors. 10 scenarios × 15 = 150.

---

## Parity check semantics — what "matches" means

Not every field is compared bit-for-bit. Different field types get different tolerance budgets.

| Field category | Match precision | Justification |
|---|---|---|
| Linear aggregates (`r_mean`, `fires_per_day`, per-session weights) | absolute drift < `1e-9` | deterministic float ops on same inputs — same rule as M1 |
| Kahan-reduced aggregates (`r_stdev`, `variance_footprint`) | absolute drift < `1e-7` | two-pass variance over streams up to 5000 events accumulates rounding; Kahan-corrected summation holds 1e-7 at 5000-scale |
| Ratio fields (`drift_from_mandate`) | absolute drift < `1e-9` | defined as `count_out_of_trigger_bounds / count_total` — pure integer division with bounded numerator/denominator, no transcendentals |
| Boolean flags (`consecutive_tilt_flag`) | exact equality | JS boolean must equal Python bool |
| Sorted list fields (`dead_mandates`, `overlapping_mandates[i]`) | exact equality after sort | lexicographic sort applied both sides before compare |
| Enum fields (`chat_style_signal.verbosity_preferred`, `tone_preferred`) | exact string equality | JS and Python emit the same string constants |
| Counts (`ability_edges[id].n`) | exact equality | integer counts, no drift possible |
| Nested objects | recursive application of above rules | no shortcut: every leaf is compared |

**Reduction-order pin.** `shared.py` and `shared.ts` both define `kahan_sum(items, key_fn)` over an input that has ALREADY been sorted by `(ts_ms, event_id)`. Both implementations iterate in that exact order. `numpy.mean` / `numpy.std` are BANNED in the oracle because their internal reduction order (pairwise summation on numpy ≥ 1.15) is not reproducible in pure-JS. The test harness asserts `shared.kahan_sum` is called at least once per model computation — caught by instrumentation, not by reading code.

**Scalar definitions that constrain precision.** `drift_from_mandate` is defined strictly as `count_out_of_trigger / count_total` (integer ratio in [0, 1]). `variance_footprint` is defined as `kahan_stddev(r_multiple_closed[])` — no sigmoid, no normalization. These definitions are load-bearing for the precision budget above; any change to introduce transcendentals requires re-negotiating the tolerance.

**Key mismatches are fatal.** If JS has a key Python doesn't or vice versa, the test fails immediately with a schema-drift error. No "permissive mode" where missing keys default to zero.

**`updated_fields` exclusion.** `PlayerModel.updated_fields` is a bookkeeping field populated by the publisher, not derived from the event stream. Parity tests assert on the *computed* fields only; `updated_fields` is tested separately by the publisher unit tests, which run at M7 end.

**NaN handling.** `variance_footprint` on an empty stream is defined as `null`, not `NaN` — both sides emit `null` and the comparator treats `null == null` as pass. Any NaN from either implementation is a bug by definition.

---

## Invariant tests — separate layer, orthogonal to parity

Parity catches "JS diverged from Python." Invariant tests catch "the computation itself has a bug both implementations share." Three invariants, each as its own test file.

### 1. Deterministic replay

```
compute(stream_X, config_Y) == compute(stream_X, config_Y)   // always
```

Same input → same output, across repeated runs in the same process, across processes, across machines. Test runs the same vector 10 times in a loop and asserts all outputs identical. Catches `Date.now()` or `Math.random()` sneaking into the computation.

### 2. Order-stability within same timestamp

```
compute(shuffle_same_ts(stream_X)) == compute(stream_X)   // for shuffles that preserve (ts, event_id) ordering
```

Events with identical timestamps must sort deterministically by `event_id`. Test shuffles the event array while preserving the sort key, re-runs, asserts output identical. Catches `Array.sort()` stability bugs and iteration-order dependence on Map/Set.

### 3. Window-boundary exactness

```
let A = compute(stream, { now_ts: T });
let B = compute(stream, { now_ts: T + 1 });
assert model_A and model_B differ only in fields affected by the single event newly inside/outside the window.
```

Run the same stream with `now_ts = T` and `now_ts = T + 1ms`. If an event sits exactly on the boundary, the 1ms bump should move it inclusive-vs-exclusive. Test asserts the DELTA between `A` and `B` is consistent with exactly the events that crossed the boundary — no more, no less. This is the test that catches the off-by-one in scenario #10.

---

## File layout

Mirrors Phase 1's `sdk/web/test/` layout. Adds a `model_vectors/` subdirectory because each vector is too big for a single `vectors.json` file.

```
trading-stack/sdk/web/test/
├── parity.test.mjs                     # Phase 1 — RiskManager (unchanged)
├── vectors.json                        # Phase 1 (unchanged)
├── gen_vectors.py                      # Phase 1 (unchanged)
│
├── mandate_parity.test.mjs             # M5 — EIP-712 mandate signing
├── mandate_vectors.json                # M5
├── gen_mandate_vectors.py              # M5
│
├── model_parity.test.mjs               # M7 — this spec
├── model_invariants.test.mjs           # M7 — this spec (invariants)
├── gen_model_vectors.py                # M7 — oracle generator
└── model_vectors/                      # 150 per-scenario files
    ├── 01_funding_shorts_baseline/
    │   ├── 7d_10.json
    │   ├── 7d_50.json
    │   ├── 7d_200.json
    │   ├── 7d_1000.json
    │   ├── 7d_5000.json
    │   ├── 30d_10.json
    │   ├── ... (all 15 window×scale combinations)
    ├── 02_dead_mandate/
    ├── 03_overlapping_mandates/
    ├── ...
    └── 10_window_boundary_exact/
```

Python oracle lives under `trading-stack/sdk/` as a Python module:

```
trading-stack/sdk/
├── models/
│   ├── __init__.py
│   ├── player_model.py                 # compute_player_model(events, config) → PlayerModel
│   ├── agent_model.py                  # compute_agent_model(events, config) → AgentModel
│   └── shared.py                       # event_sort, window_filter, rolling_stats
```

TS mirror lives under `sdk/web/terminal/models/` (or `@chartrunner/terminal` when the package is cut):

```
trading-stack/sdk/web/terminal/models/
├── player_model.ts                     # computePlayerModel(events, config): PlayerModel
├── agent_model.ts                      # computeAgentModel(events, config): AgentModel
└── shared.ts                           # eventSort, windowFilter, rollingStats
```

---

## Implementation sequence — M5 seeds, M7 completes, M8 gates

### M5 (this plan's contemporary) — ship the event schema

M5 already ships `AgentReceipt` (see `ChartRunner_Phase2_M5_Implementation_Plan.md` DELIV-4). **DELIV-9** extends M5 with the schema groundwork:

- Land the canonical event-stream JSON schema in `trading-stack/sdk/models/event_schema.json`, including the top-level `schema_version: 1` field.
- Extend `AgentReceipt` to emit `event_id` (sha256 of signature truncated to 16 hex chars). Propagate to `BehaviorTape` (`beh-${source_id}-${seq}`) and `chat_reaction` (`chat-${seq}`) emitters. This is a material schema change to M5 DELIV-4 — the M5 plan must be updated so AgentReceipt lands with `event_id` from day one, not retrofitted in M7.
- Emit receipts with all fields required by this spec (`gate_breakdown`, `session`, `regime`, `r_multiple_closed`, `parent_receipt_id`). M5's `AgentReceipt.ts` already has most of these per the M5 plan — DELIV-9 confirms alignment and adds any gaps.
- Record a canonical empty-stream unit test asserting `compute_player_model([], config)` returns a well-formed all-`null`-aggregates model in both JS and Python. One-vector parity before there are any events to compute against. Catches schema drift before it compounds.
- Add a schema-version assertion unit test: `compute_player_model({schema_version: 999, ...})` must throw `SchemaVersionError` in both implementations.

**M5 ships parity for the receipt *shape* — not the model computation. Zero model-compute code lands in M5.** DELIV-9 adds at most ~200 lines of code (schema file + empty-stream test + version-mismatch test + AgentReceipt `event_id` field). Fits comfortably inside M5's Week 3 buffer.

### M7 — ship the full parity infrastructure

Week 1 of M7's Learning-Channel work includes:

1. Port `shared.py` helpers (`event_sort`, `window_filter`, `rolling_stats`) to both languages first — these are the primitives; they need their own mini-parity test before the model computations use them.
2. Implement `compute_player_model` in Python, then in TS. Run against vector 01 only, iterate until match.
3. Hand-author the other 9 scenario archetypes. Run all 150 vectors. Fix drift as it appears.
4. Add the three invariant tests.
5. CI gate: `node --test model_parity.test.mjs` + `pytest sdk/models/` must pass before any M7 PR merges.

Same for `compute_agent_model`. Both models share infrastructure (Week 1 helpers) but diverge in computation (Week 2 and Week 3 of M7 respectively).

**By end of M7 the parity infrastructure is green on 150 vectors and 3 invariant tests.** Any CoachChannel/TuneChannel feature that lands thereafter must extend the vector set before merging.

### M8 — parity is an entry condition for tournament deploy

M8's tournament launch requires:

- The parity test has been green for 14 consecutive days across main branch commits.
- A single "tournament dry-run" vector (scenario 11) is added: replays a full 64-player Paper-PnL-Race event log through both implementations and asserts winner + placings identical. If this fails, tournament launch blocks.

---

## Continuous integration

```bash
# Run both parity test suites
cd trading-stack/sdk/web
node --test test/parity.test.mjs              # Phase 1 — 1,458 vectors
node --test test/mandate_parity.test.mjs      # M5 — 50 vectors
node --test test/model_parity.test.mjs        # M7 — 150 vectors
node --test test/model_invariants.test.mjs    # M7 — 3 invariants × 10 stress streams

# Python oracle regeneration (when models change)
cd trading-stack
python3 sdk/web/test/gen_vectors.py > sdk/web/test/vectors.json
python3 sdk/web/test/gen_mandate_vectors.py > sdk/web/test/mandate_vectors.json
python3 sdk/web/test/gen_model_vectors.py --out sdk/web/test/model_vectors/

# Aggregate green check
pytest trading-stack/sdk/models/ && \
  node --test trading-stack/sdk/web/test/ && \
  echo "All parity green."
```

A GitHub Action runs this on every push to `chartrunner-sdk-m7` (and eventually `main`). Failure blocks merge; PR author re-runs `gen_*.py` and pushes updated vectors, OR fixes whichever implementation drifted.

**One invariant for reviewers:** a PR that updates `vectors.json` + implementation files is acceptable. A PR that updates only `vectors.json` (making the test easier to pass) is a red flag and must be reviewed by Julian.

---

## Definition of Done

Parity infrastructure is done when all nine criteria pass:

1. `trading-stack/sdk/models/player_model.py` + `agent_model.py` implemented.
2. `trading-stack/sdk/web/terminal/models/player_model.ts` + `agent_model.ts` implemented.
3. `gen_model_vectors.py` produces 150 vectors in `model_vectors/`, each with full expected models inlined.
4. `model_parity.test.mjs` passes 150/150.
5. `model_invariants.test.mjs` passes all three invariants on 10 randomly-sampled vectors each.
6. CI runs all three parity suites on every push; red blocks merge.
7. `trading-stack/sdk/README.md` gets a "Model parity" section describing how to regenerate vectors.
8. A tournament dry-run vector (scenario 11) exists and passes.
9. A verification subagent reads this spec + the new code and reports all 9 items ✓.

---

## What this spec intentionally does NOT do

- **Does not spec the model computation itself.** This is a parity *spec*, not an implementation plan. The actual formulas for `r_mean`, `drift_from_mandate`, etc. are described in the Phase 2 Consumer Architecture doc and refined during M7 implementation. Parity guarantees equivalence *given a formula* — it does not pick the formula.
- **Does not cover performance.** 150 vectors × 5000 events each = 750k event processing per test run. If that's slow, add a `--fast` flag that runs only the `stream_scale ∈ {10, 50, 200}` subset in CI and runs the full set nightly. Performance is an M7 polish concern, not a correctness concern.
- **Does not address property-based testing.** `fast-check` / `hypothesis` would complement hand-authored vectors well, but are explicitly deferred. Hand-authored scenarios + invariants are the minimum viable parity; property tests are a follow-on.
- **Does not cover privacy.** Event streams contain trading data — vector files must not be committed if they include real user history. The `gen_model_vectors.py` oracle must synthesize events from a seeded RNG, not scrape real logs. Enforced by `.gitignore` on any file matching `model_vectors_*_real.json`.
- **Does not cover Ollama / ThesisEngine determinism.** L3's thesis text is generated by `qwen2.5:14b` via Ollama and is non-deterministic by design (sampling temperature > 0). Parity covers the models that *feed* the thesis engine (PlayerModel, AgentModel), not the thesis text itself. Two runs against the same PlayerModel can produce different `BehaviorTape` narration — that's expected and not a parity failure. If a regression test for narration is needed, it belongs in a separate "snapshot approximation" suite with fuzzy text matching.
- **Does not cover WebSocket retry/reconnect ordering.** If events arrive out-of-order on the wire (network retry, WebSocket reconnect), the sorting rule `(ts_ms, event_id)` re-establishes canonical order at read time. Parity is about computation given a canonical stream, not about transport-layer reordering — that's the signal_bus's responsibility, covered by its own tests.
- **Does not cover UI rendering determinism.** The L3 Tauri webview renders PlayerModel into BotBoard cards; Chromium versions differ across OSes and can produce different antialiasing. Parity covers `computePlayerModel` output, not Canvas/SVG pixel output. A future visual-regression test is orthogonal.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Floating-point accumulation drift at 5000-event scale for `r_stdev` / `variance_footprint` | high | test fails CI on large vectors | Kahan-corrected summation in `shared.py` and `shared.ts`, pinned reduction order; precision budget relaxed to 1e-7 for Kahan-reduced aggregates (1e-9 for linear ones) |
| `gen_model_vectors.py` itself has bugs, baking wrong expectations into all 150 vectors | med | silent "green test, broken model" | cross-check scenarios 01 and 10 against hand-computed spreadsheet before landing; require a second-reviewer sign-off on `gen_model_vectors.py` changes |
| `gen_model_vectors.py` takes >5 min to run | med | slow local iteration | parallelize scenario generation with `multiprocessing`; acceptable if nightly regen ≤30 min |
| Hand-authored scenarios miss a real-world pattern | low | latent bug ships | add scenario 11 (tournament dry-run on real event log) + property tests as follow-on |
| Sort stability differs across Python/JS runtimes | low | invariant #2 fails | both V8 and CPython use Timsort-family (stable since 2019 / Python 2.3); still explicitly tested by invariant #2 rather than assumed |
| Schema drift between M5 `AgentReceipt` and M7 event format | med | M7 blocked | `schema_version` pinned in M5 via `event_schema.json`; bump requires re-running `gen_model_vectors.py`; mismatched versions refuse to execute rather than silently drop fields |
| `event_id` missing from M5 AgentReceipt emit path | med | M7 cannot sort | M5 DELIV-9 explicitly extends AgentReceipt to include `event_id` (sha256 of signature for signed receipts, `${source}-${seq}` otherwise) |

---

*End. Next step after approval: update `ChartRunner_Phase2_M5_Implementation_Plan.md` to fold DELIV-9 into M5 scope — (a) extend `AgentReceipt.ts` with the `event_id` field, (b) land `event_schema.json` with `schema_version: 1`, (c) ship empty-stream + version-mismatch parity unit tests. M5 then exits with the schema pinned so M7's model computation can't drift out from under it.*
