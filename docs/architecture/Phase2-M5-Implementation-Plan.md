# ChartRunner Phase 2 — M5 Implementation Plan

*L1 Agent-Wallet on Hyperliquid. Ships `@chartrunner/agent` wrapping a live `BrokerAdapter`, signs mandates with EIP-712 on HL-EVM AA, routes intents through `shared/signal_bus` to `hl_bot`. Target: 3 calendar weeks of focused work after Phase 1 M3 + M4 ship.*

*Companion to `ChartRunner_Phase2_Consumer_Architecture.md`. Source of truth for all interface shapes: `ChartRunner_Phase1_SDK_Architecture.md`.*

---

## Goal

At end of M5, Julian can:

1. Open `sdk/web/demo-agent.html` in a browser.
2. Connect a test wallet (HL-EVM testnet).
3. Grant a `funding-shorts` mandate through a typed chat message.
4. Watch the mandate show up as `source="chartrunner-agent"` signals in `state.json["bot_signals"]`.
5. See `hl_bot` pick up the signal, run `ollama_pre_trade_gate`, either place or shadow-reject, and the result flow back into the browser chat as an `AgentReceipt` within <5s.

No production rollout. No real funds. Testnet only. Success = demo video + E2E test passes 20 times in a row.

---

## Prerequisites (hard blockers)

These must be shipped before M5 starts. If any are missing, M5 schedule slides.

| Item | Location | Shipping milestone | Status |
|---|---|---|---|
| `sdk/server.py` FastAPI+WS bridge | `/Users/julianroy/trading-stack/sdk/server.py` | Phase 1 M3 | **pending** |
| `sdk/signal_adapter.py` game→signal_bus adapter | `/Users/julianroy/trading-stack/sdk/signal_adapter.py` | Phase 1 M3 | **pending** |
| `sdk/risk_guard.py` hl_bot-policy enforcement | `/Users/julianroy/trading-stack/sdk/risk_guard.py` | Phase 1 M4 | **pending** |
| `sdk/replay.py` signed-summary storage | `/Users/julianroy/trading-stack/sdk/replay.py` | Phase 1 M4 | **pending** |
| HL-EVM mainnet + AA bundler reachable | `api.hyperliquid.xyz` (EVM RPC) | External | verify before W2 |
| `hl_bot.py` reads `source="chartrunner"` signals | `hl/hl_bot.py::_accept_signal` | Phase 1 M4 | **verify** |

**M5 Day 1 gate:** run a one-shot manual smoke test sending a hand-crafted signal from `curl` to `sdk/server.py` → confirm it lands in `state.json["bot_signals"]` → confirm `hl_bot` either gates-through or shadow-rejects. If that loop doesn't work, fix Phase 1 before proceeding.

---

## Deliverables

Nine concrete files ship. Every one has a parity test or an E2E test gating it.

```
trading-stack/sdk/web/agent/
├── AgentWallet.ts          # DELIV-1 — connect/disconnect + wraps BrokerAdapter
├── AgentMandate.ts         # DELIV-2 — schema + EIP-712 typed data + local store
├── AgentChat.ts            # DELIV-3 — bidirectional chat over WebSocket
├── AgentReceipt.ts         # DELIV-4 — signed receipt verification (now with event_id)
└── adapters/
    └── hl-aa.ts            # DELIV-5 — HL-EVM ERC-4337 adapter (only venue in M5)

trading-stack/sdk/
├── mandate_guard.py        # DELIV-6 — extends risk_guard.py with mandate check
├── agent_bridge.py         # DELIV-7 — subscribes to agent WS, emits signal_bus entries
└── models/
    └── event_schema.json   # DELIV-9 — canonical event-stream schema (schema_version: 1)

trading-stack/sdk/web/
├── demo-agent.html         # DELIV-8 — the end-to-end demo
└── test/
    ├── mandate_vectors.json       # EIP-712 hashes across 50 mandate shapes
    ├── mandate_parity.test.mjs    # JS-signed vs Python-verified cross-check
    ├── empty_stream_parity.test.mjs    # DELIV-9 — compute_*_model([]) parity
    └── schema_version_test.mjs         # DELIV-9 — version-mismatch rejection
```

Nine deliverables, ~1,350-2,000 lines of new code. No changes to existing `sdk/web/core/` — M5 only adds.

**DELIV-9 rationale.** The `ChartRunner_Phase2_Model_Parity_Spec.md` needs the event-stream schema pinned in M5 even though model computation doesn't ship until M7. Without a versioned schema and an `event_id` field on every emitted event, M7's parity tests can't gate cleanly. DELIV-9 is ~200 lines: one JSON schema file, two tiny parity tests, and an extension to `AgentReceipt.ts`. It fits in the Week 3.5 buffer.

---

## Interface shapes (locked for M5)

### AgentWallet

```ts
import type { BrokerAdapter } from "@chartrunner/core";

export interface AgentWalletConfig {
  venue: "hl";                             // "solana" deferred to M7
  mode: "paper" | "testnet" | "live";
  fund?: { asset: "USDC"; amount: number };
  serverUrl: string;                        // ws://umbrel:8787/agent
}

export interface AgentWalletHandle {
  id: string;                               // deterministic: hash(pubkey || venue)
  address: string;                          // EVM address
  broker: BrokerAdapter;                    // ← uses Phase 1 contract unchanged
  chat: AgentChat;
  grantMandate(m: AgentMandate): Promise<MandateReceipt>;
  revokeMandate(id: string): Promise<MandateReceipt>;
  listMandates(): Promise<AgentMandate[]>;
  disconnect(): Promise<void>;
}

export class AgentWallet {
  static async connect(cfg: AgentWalletConfig): Promise<AgentWalletHandle>;
}
```

Note the explicit `broker: BrokerAdapter` field. The Phase 1 contract (6 async methods) is preserved unchanged — the wallet holds a reference to it, doesn't re-shape it.

### AgentMandate

```ts
export interface AgentMandate {
  id: string;                               // caller-chosen; must be unique per wallet
  version: 1;                               // bump for breaking schema changes
  scope: {
    venue: "hl";
    coin: string;                           // "BTC" | "ETH" | …
    sideAllowed: ("long" | "short")[];
  };
  trigger: MandateTrigger;                  // funding, spread, CVD, etc.
  sizing: {
    kelly_mult: number;                     // [0, 1]
    max_notional_usd: number;               // hard cap per fill
  };
  exits: {
    tp_pct: number;
    sl_pct: number;
    trail_from_pct?: number;
    trail_by_pct?: number;
  };
  expires_at: string;                       // ISO-8601
  nonce: number;                            // replay protection
}

export type MandateTrigger =
  | { kind: "funding_bps"; gte?: number; lte?: number }
  | { kind: "spread_bps_mean"; gte?: number }
  | { kind: "cvd_divergence"; threshold: number }
  | { kind: "manual" };                     // user fires from chat
```

Same shape ships in Python at `sdk/mandate_guard.py::Mandate` (dataclass) — parity test enforces they hash identically.

### AgentReceipt

```ts
export interface AgentReceipt {
  schema_version: 1;                        // DELIV-9 — pinned to canonical event schema
  ts: number;                               // ms since epoch (alias ts_ms in streams)
  event_id: string;                         // DELIV-9 — sha256(signature).slice(0,16), unique
  kind: "fill" | "close" | "reject" | "mandate_granted" | "mandate_revoked" | "thesis_reply";
  venue: "hl";
  mandate_id: string;
  payload: {
    side?: "long" | "short";
    price?: number;
    notional?: number;
    reason: string;                         // from hl/gate_logic.py or mandate_guard
    gate_breakdown?: {
      funding: number;
      oi_normalized: number;
      regime: "calm" | "trending" | "volatile";
    };
    session?: "asia" | "london" | "ny" | "off_hours";  // DELIV-9 — required for PlayerModel.session_bias
    r_multiple_closed?: number | null;      // DELIV-9 — null for fills, number for closes
    parent_receipt_id?: string;             // DELIV-9 — close receipts reference their fill
  };
  signature: string;                        // agent-signed, EIP-712 domain-separated
}
```

**`event_id` derivation (canonical — single source of truth).** For signed receipts: `event_id = sha256(signature).slice(0, 16)` — deterministic, unique across the stream (EIP-712 signatures are already unique per nonce + ts_ms, so hashing the signature alone suffices). BehaviorTape emitters use `beh-${source_id}-${seq}`; chat_reaction emitters use `chat-${seq}`; mandate lifecycle events use `mnd-${mandate_id}-${action}-${seq}`. The `event_schema.json` file is the tiebreaker between this plan and the parity spec — if either prose description drifts from what the schema encodes, the schema wins.

### WS protocol (browser ↔ `agent_bridge.py`)

Adds three ops on top of the Phase 1 M3 WS. Wire-compatible; existing ops untouched.

**Client → server**

```jsonc
{ "op": "mandate.grant",    "id": "req-1", "mandate": { ... }, "signature": "0x…" }
{ "op": "mandate.revoke",   "id": "req-2", "mandate_id": "funding-shorts", "signature": "0x…" }
{ "op": "chat.send",        "id": "req-3", "text": "how did last 24h look on BTC shorts?" }
```

**Server → client**

```jsonc
{ "op": "mandate.accepted", "mandate_id": "funding-shorts", "active_from": 1734567890 }
{ "op": "mandate.rejected", "mandate_id": "funding-shorts", "reason": "exceeds hl_bot kelly_mult cap" }
{ "op": "receipt",          "receipt": { ... } }       // every fill, reject, chat reply
```

---

## Week-by-week plan

**Week 1 — Core contracts + in-memory round-trip.** Ship DELIV-1..4 in plain ES modules (no HL network calls yet). Build `AgentWallet.connect({ mode: "paper" })` that wraps a `SandboxBrokerAdapter` from Phase 1 M1. Mandate signing uses a locally-generated EIP-712 signature — no wallet connection needed, just a deterministic key from a seed for dev. `AgentChat` talks to an in-process mock server. Parity test: generate 50 mandates in JS, sign with the dev key, verify signatures in Python using `eth_account` — all 50 must round-trip. End-of-week demo: `paper`-mode agent receives a mandate via `grantMandate()`, fires a simulated fill, produces a signed receipt.

**Week 2 — HL-EVM AA adapter + real bundler.** Ship DELIV-5. Implement `adapters/hl-aa.ts` against HL-EVM testnet: connect MetaMask (or a browser-injected provider), deploy/hydrate a 4337 smart account, sign mandates as EIP-712 typed data with the session key, send UserOperations through the bundler. No order-placement yet — mandates just get persisted server-side. Also ship DELIV-6: `sdk/mandate_guard.py::validate_mandate_against_policy()` which reads `hl/config.py::MAX_KELLY_MULT`, `MAX_NOTIONAL_USD`, `ALLOWED_COINS` and rejects any mandate that would let the agent do something `hl_bot` itself wouldn't do. End-of-week demo: user connects testnet wallet, signs a mandate in the browser, sees "accepted" come back within 2s, sees `mandate_guard` reject an intentionally out-of-policy mandate with a clear reason.

**Week 3 — signal_bus integration + hl_bot consumption + E2E.** Ship DELIV-7: `sdk/agent_bridge.py` subscribes to the mandate-grant event and, when the mandate's trigger fires (e.g. funding crosses the threshold), emits a `source="chartrunner-agent"` signal into `shared/signal_bus` with all metadata `hl_bot` needs. Crucial: the bridge polls the same intelligence sources (`shared/intelligence.get_hl_funding`) already used by the existing `hl_bot` — no new data source, no new authority. `hl_bot._accept_signal` already accepts arbitrary `source` strings (verified during prerequisites), so no changes to `hl/` are required; if the verification fails, add a one-line allowlist entry. Ship DELIV-8: `demo-agent.html` with a minimal chat UI, a mandate-picker (dropdown of three pre-built mandates), and a receipt feed pane. End-of-week E2E: script runs 20 iterations, each granting a mandate → waiting for signal_bus emit → waiting for hl_bot decision → verifying receipt arrives within 5s. All 20 must pass on testnet.

**Week 3.5 — DELIV-9 schema pin + buffer.** Ship `event_schema.json` (~80 lines of JSON Schema covering all five event kinds: agent_receipt, behavior, chat_reaction, mandate_granted, mandate_revoked, plus the `schema_version`, `config`, and `events[]` envelope). Extend `AgentReceipt.ts` (and the corresponding `agent_bridge.py` Python emitter) to populate `event_id`, `session`, `r_multiple_closed`, `parent_receipt_id`. Ship `empty_stream_parity.test.mjs` — instantiates a stub `compute_player_model` that returns a hardcoded all-`null` model in both JS and Python, asserts they match. (M7 will replace the stub with the real computation; the test file's structure is what M5 ships.) Ship `schema_version_test.mjs` — feeds `{schema_version: 999, events: []}` to the stub and asserts both sides throw `SchemaVersionError`. Remaining 1.5 days: bug-fix + demo recording + documentation. If E2E flakes burn into the buffer, DELIV-9 ships first (it's smaller and lower-risk), then E2E re-runs.

---

## Test plan

Six test layers. Each gates the milestone above it.

1. **`parity.test.mjs` — EIP-712 round-trip**. 50 mandate vectors, JS signs + Python verifies with `eth_account.messages.encode_typed_data`. Must be bit-identical to Phase 1's `vectors.json` pattern. No mandate ships without 50/50 pass.

2. **`mandate_guard_test.py` — policy enforcement**. 30 mandates (10 in-policy, 10 just-out-of-policy, 10 wildly-out-of-policy). Asserts `validate_mandate_against_policy` accepts exactly the 10 in-policy cases and rejects the other 20 with human-readable reasons. Integrate with existing `pytest` harness in `trading-stack/tests/`.

3. **`agent_bridge_test.py` — signal emission**. Simulates the funding oracle producing a threshold-crossing value. Asserts `agent_bridge.py` emits exactly one `signal_bus` entry, with correct `source`, `coin`, `direction`, `metadata.mandate_id`. Uses `shared.signal_bus` in-memory mode so no state.json contention.

4. **`e2e_hl_testnet.sh` — full round-trip on testnet**. Boots a local `sdk/server.py`, connects a test EVM account, grants a `funding-shorts` mandate, waits for `hl_bot` to either place or shadow-reject, asserts the receipt matches. 20 iterations, zero failures required. Runs nightly in CI once M5 ships.

5. **`empty_stream_parity.test.mjs` — DELIV-9**. Calls `compute_player_model({schema_version: 1, config: {...}, events: []})` in both JS and Python. Asserts both return a well-formed PlayerModel with all aggregate fields `null`, `ability_edges = {}`, `session_bias.asia = session_bias.london = session_bias.ny = session_bias.off_hours = null`. M5 ships the test harness with stubbed implementations; M7 replaces stubs with real computation. The test file itself is load-bearing — M7 must not need to author it.

6. **`schema_version_test.mjs` — DELIV-9**. Feeds `{schema_version: 999, events: []}` to both implementations. Asserts both throw `SchemaVersionError` with the same error code. Also includes a parse-error case: `{events: [{ts_ms: 0}]}` missing `event_id` — both sides must reject with `StreamIntegrityError`. This tests the refuse-to-execute policy from the parity spec.

All six run automatically on every commit to the `chartrunner-sdk-m5` branch. No manual verification required to merge M5 into main.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| HL-EVM bundler unstable on testnet | med | blocks W2 | fallback: sign mandates client-side only, skip 4337; treat AA as optional for M5, mandatory for M6 |
| `hl_bot._accept_signal` doesn't allow arbitrary `source` | low | blocks W3 | verify Day-1; if fails, one-line patch + PR to trading-stack main |
| `signal_bus` contention when ChartRunner + hl_bot + arb_bot all emit | low | flaky E2E | `signal_bus` uses `state_lock`; existing stack has 3+ concurrent writers. Monitor with `shared/state_observer.py` during W3 |
| EIP-712 parity drift between JS `viem` + Python `eth_account` | med | breaks W1 | lock versions in `package.json` + `requirements.txt`; parity test gates upgrades |
| User revokes a mandate mid-fill | low | invalid state | agent_bridge tracks in-flight intents; revoke waits for open positions to clear or force-cancels via `BrokerAdapter.cancel` |
| Phase 1 M3/M4 slip past their target dates | med | M5 can't start | parallelize: W1 of M5 can start while Phase 1 M4 finishes; W2+ blocks on M4 |
| DELIV-9 schema drift between M5 emit path and M7 consumer | med | M7 parity tests fail silently | `schema_version` pinned in `event_schema.json`; any field addition bumps version and forces `gen_model_vectors.py` re-run; `empty_stream_parity.test.mjs` gates every commit touching the schema |
| DELIV-9 stub PlayerModel/AgentModel scaffolds are larger than expected | med | Week 3.5 overrun | shape the stubs as typed null-factories (one function per model, returns frozen null-object) — keeps scaffold under 100 lines per language by leaning on the TS/Python interface definitions as the source of truth |

---

## Definition of Done

M5 is done when all eleven criteria are met:

1. All nine deliverables exist in `trading-stack/` with the paths above.
2. `parity.test.mjs` passes 50/50.
3. `mandate_guard_test.py` passes 30/30.
4. `agent_bridge_test.py` passes 100% of emission cases.
5. `e2e_hl_testnet.sh` passes 20/20 on three consecutive days.
6. `demo-agent.html` is recorded in a ≤90s screen capture showing the full loop.
7. `README.md` at `trading-stack/sdk/` gets an "M5 shipped" section matching the M1 section's format.
8. `CLAUDE.md` gets a `## SDK Agent (L1)` subsection under `## MCP Servers` describing how to grant/revoke mandates from Julian's side.
9. **DELIV-9:** `event_schema.json` lands at `trading-stack/sdk/models/event_schema.json` with `schema_version: 1`, validates against the 5 event-kind shapes from `ChartRunner_Phase2_Model_Parity_Spec.md`, and is referenced from both `AgentReceipt.ts` and the (stubbed) Python model module.
10. **DELIV-9:** `empty_stream_parity.test.mjs` and `schema_version_test.mjs` both pass on stub implementations. The stub `compute_player_model` MUST return a well-formed PlayerModel matching the full shape defined in `ChartRunner_Phase2_Consumer_Architecture.md` (PlayerModel interface) — `ability_edges: {}`, `session_bias: { asia: null, london: null, ny: null, off_hours: null }`, `regime_fit: { calm: null, trending: null, volatile: null }`, `variance_footprint: null`, `drift_from_mandate: null`, `consecutive_tilt_flag: false`, `updated_fields: []`. A stub that returns `null` or a partial shape fails this criterion. Same shape-completeness requirement applies to `compute_agent_model`. M7 swaps stubs for real computation without modifying the tests.
11. A verification subagent reads this plan + the new code and reports all 11 items ✓.

---

## What M5 intentionally does NOT do

Keeping scope honest. These are M6 or later:

- Solana venue (M7 — PDA session-key custody).
- Profile system (`solana-degen` / `hl-perp`) — M6.
- Game-Mode / Live-Mode UI split — M6.
- Chart-Embed web component — M6.
- Terminal / BotBoard / ThesisEngine — M7.
- Tournament formats — M8.
- Multi-mandate agents (one wallet, many mandates) — sketch-friendly in M5's schema (mandates are a list) but not exercised; first multi-mandate user flow lands in M6.
- Real-money rollout — requires a separate security audit, not in the M5 budget.
- **Real model computation.** DELIV-9 ships the *schema* (`event_schema.json`) and *test harness* (empty-stream + version-mismatch) — but `compute_player_model` and `compute_agent_model` ship as stubs returning `null`-aggregates. Real implementations land in M7 alongside the L3 Tauri app. M5 only guarantees that when M7 implements them, the schema they consume is already pinned.

---

## First commits (when M5 kicks off)

Concrete starter sequence a developer runs on Day 1:

```bash
cd /Users/julianroy/trading-stack
git checkout -b chartrunner-sdk-m5
mkdir -p sdk/web/agent/adapters sdk/models
touch sdk/web/agent/AgentWallet.ts \
      sdk/web/agent/AgentMandate.ts \
      sdk/web/agent/AgentChat.ts \
      sdk/web/agent/AgentReceipt.ts \
      sdk/web/agent/adapters/hl-aa.ts \
      sdk/mandate_guard.py \
      sdk/agent_bridge.py \
      sdk/models/event_schema.json \
      sdk/web/test/mandate_parity.test.mjs \
      sdk/web/test/empty_stream_parity.test.mjs \
      sdk/web/test/schema_version_test.mjs
# add viem + eth_account to deps
cd sdk/web && npm install --save viem@^2 ethers@^6
cd ../.. && echo "eth-account>=0.13" >> requirements.txt
git add -A && git commit -m "chore(sdk-m5): scaffold agent package + bridge + tests + event schema"
```

Then: write DELIV-4 (`AgentReceipt.ts`) first — it's the smallest, fully self-contained, and unblocks the parity test before anything else is wired. From there, climb up to DELIV-2 (Mandate) → DELIV-1 (Wallet) → DELIV-5 (HL-AA) → DELIV-3 (Chat) → DELIV-6 (mandate_guard) → DELIV-7 (agent_bridge) → DELIV-8 (demo) → DELIV-9 (schema + stubs) last. DELIV-9 slots last because `AgentReceipt.ts` (written on Day 1) needs the `event_id` field from the start — so the DELIV-9 schema file must be authored first even though its tests land last. Practical ordering: author `event_schema.json` before writing `AgentReceipt.ts` (it defines the fields), then build up through the normal chain, then land the two DELIV-9 tests in Week 3.5. That keeps each commit test-gated without circular dependencies.

---

*End. Next step after M5 ships: M6 kickoff — ChartRunner reference-app gets the profile picker + mode toggle, and the `@chartrunner/chart` web component drops into five external embed demos.*
