# ChartRunner — Phase 1 SDK Architecture

*Grounded in the actual `trading-stack` code at `/Users/julianroy/trading-stack/` (master, `76ce6b5`). Decisions locked: **A3** hybrid (in-browser SDK + optional RPC to Umbrel), **B2** Binance + Hyperliquid, **C1** new `sdk/` folder inside `trading-stack`.*

---

## The one-liner

> **ChartRunner becomes a signal-emitter bot like `arb_bot` — with a game UI on top.** It runs in any chart host (TradingView widget, DexScreener, a future dApp canvas), emits signals into the existing `shared/signal_bus`, and can optionally route execution through `hl_bot` at `risk: "live"`. No new trading authority is created. The stack already enforces: *only `hl_bot` places live orders*.

---

## Architecture in three layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — In-browser SDK (TypeScript, npm-publishable)                 │
│  @chartrunner/core  @chartrunner/overlay  @chartrunner/adapters         │
│                                                                         │
│  ChartHost ← TradingView / DexScreener / Binance-internal               │
│  AbilityRegistry → bracket, ladder, oco, hedge, radar, rescue, …       │
│  SignalFeed → reads flash-crash, LOB, CVD, funding (in-browser mirror) │
│  RiskManager → paper-book sizing (Kelly, OI-mult, IV-mult)              │
│  BrokerAdapter (sandbox | paper | signed-testnet) runs locally          │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           │  (risk: "live" only)
                           │  WebSocket over Tailscale
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — SDK server (Python, lives in trading-stack/sdk/server.py)    │
│  FastAPI + WebSocket                                                    │
│                                                                         │
│  • Authenticates the browser client (HMAC from .env)                    │
│  • Re-emits game events as signal_bus.emit_signal(source="chartrunner") │
│  • Forwards ability fires → hl_bot (via shared/signal_bus)              │
│  • Never executes directly. Mirrors the arb_bot pattern exactly.        │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — Existing trading-stack (unchanged authority)                 │
│                                                                         │
│  hl_bot.py  reads signal_bus, applies gate_logic, sizes via             │
│  trade_executor, places orders via hl/api.py                            │
│                                                                         │
│  guardian.py keeps everything running (systemd Restart=always)          │
└─────────────────────────────────────────────────────────────────────────┘
```

The game never calls `place_order` directly. It always expresses intent as a signal; the existing stack enforces risk, regime, gate, and sizing. This preserves the invariant in `CLAUDE.md`: *LIVE as of 2026-04-07 — only `hl_bot` trades.*

---

## Package layout inside `trading-stack/`

```
trading-stack/
├── hl/                   # unchanged — the authorized trader
├── shared/               # unchanged — signal_bus, intelligence, state
├── sdk/                  # NEW — Phase 1 deliverable
│   ├── __init__.py
│   ├── server.py         # FastAPI+WS, the layer-2 bridge
│   ├── signal_adapter.py # game events → signal_bus.emit_signal()
│   ├── risk_guard.py     # reject any live intent that would exceed hl_bot policy
│   ├── replay.py         # stores signed run summaries for phase 2 anti-cheat
│   └── web/
│       ├── package.json
│       ├── core/         # @chartrunner/core — ability registry, state machine
│       ├── overlay/      # @chartrunner/overlay — rendering on top of host chart
│       └── adapters/     # @chartrunner/adapters — tradingview, dexscreener, binance
├── sdk.service           # systemd unit, guardian-managed
├── sdk.timer             # optional — scheduled health pings
└── CLAUDE.md             # add a "## SDK" section describing the bridge
```

Justification for C1 (inside-stack): the SDK server reads `state.json`, shares `.env`, and uses `shared/signal_bus` — all three would need to be duplicated or re-mounted if the SDK lived in a second repo. The browser bundle can still be published to npm from this monorepo via a standard workspace setup.

---

## Core interfaces

These are the only interfaces a new chart host or a new ability ever needs to implement.

### ChartHost

The abstraction over *any* chart that hosts ChartRunner. Mirrors what already works in the prototype.

```ts
interface ChartHost {
  priceToY(price: number): number;
  yToPrice(y: number): number;
  xToTime(x: number): number;           // ms since epoch
  timeToX(ts: number): number;
  visibleRange(): { t0: number; t1: number; p0: number; p1: number };
  getCandles(tf: Timeframe): AsyncIterable<Candle>;  // streaming
  onResize(cb: () => void): () => void;              // returns unsubscribe
  onTick(cb: (c: Candle) => void): () => void;
}
```

Concrete implementations for Phase 1:

- `BinanceHost` — current prototype's internal renderer, using REST klines from `api.binance.com`.
- `HyperliquidHost` — talks to `api.hyperliquid.xyz/info` (wraps `hl/api.py::get_all_assets`, `get_price`).
- `TradingViewHost` — uses TradingView's Widget API `onChartReady` + `priceScale().priceToCoordinate()`.
- `DexScreenerHost` — iframe postMessage bridge (best-effort; DexScreener's API is minimal).

### AbilityRegistry

Every trading primitive is an ability. Registry adds new ones without touching the game loop.

```ts
interface Ability {
  id: string;                      // "bracket" | "ladder" | "oco" | …
  key?: string;                    // optional hotkey — "2"
  cooldownMs?: number;             // 0 by default (v0.7 decision)
  icon: string;                    // path or unicode glyph
  onFire(ctx: AbilityContext): Promise<AbilityOutcome>;
  drawOverlay?(host: ChartHost, ctx: CanvasRenderingContext2D): void;
  gate?(ctx: AbilityContext): Promise<GateDecision>;  // optional pre-fire check
}

interface AbilityContext {
  host: ChartHost;
  broker: BrokerAdapter;
  risk: RiskManager;
  signals: SignalFeed;
  state: GameState;
}
```

### BrokerAdapter

The one-way door to execution. Its shape is deliberately narrower than `hl/api.py` — the SDK never needs anything exotic.

```ts
interface BrokerAdapter {
  name: string;                    // "sandbox" | "paper" | "hl-testnet" | "hl-live"
  placeBracket(o: BracketOrder): Promise<OrderResult>;
  placeLadder(o: LadderOrder): Promise<OrderResult>;
  placeOCO(o: OCOOrder): Promise<OrderResult>;
  cancel(orderId: string): Promise<void>;
  getOpenPositions(): Promise<Position[]>;
  getEquity(): Promise<number>;
}
```

The `hl-live` adapter is the only one that opens a WebSocket to `sdk/server.py`. The others are pure-client.

### SignalFeed

A client-side mirror of `shared/signal_bus`. In `sandbox`/`paper`, it's simulated; in `hl-live` it's a readonly WebSocket subscription to the real `state.json["bot_signals"]`.

```ts
interface SignalFeed {
  active(coin?: string): Signal[];
  subscribe(cb: (s: Signal) => void): () => void;
  emit(s: LocalSignal): void;      // writes in sandbox/paper; RPC in live
}
```

### RiskManager

Ports `hl/trade_executor.py::compute_position_size` 1:1 to TS. Same multipliers, same cap, same $10 minimum. This gives the browser-side paper book the *same* sizing discipline as live.

```ts
interface RiskManager {
  sizeFor(ability: Ability, ctx: AbilityContext): number;  // notional USD
  checkGate(ability: Ability, ctx: AbilityContext): Promise<GateDecision>;
}
```

---

## Risk-mode enum

Four modes, each strictly safer than the next is riskier:

| Mode | Execution | Signals | Server RPC? | Use case |
|---|---|---|---|---|
| `sandbox` | in-browser paper book, deterministic seed | simulated | no | tutorial, marketing demo |
| `paper` | in-browser paper book, live price feed | live read-only from `signal_bus` | yes (read-only) | daily practice, backtest comparison |
| `signed-testnet` | real signed orders to HL testnet | live read, local emit | yes (authenticated, testnet-only) | SDK integration testing |
| `live` | intent forwarded to `hl_bot` via `signal_bus` | full read/write | yes (authenticated, HMAC) | the actual product |

Two rules that make the enum safe:

1. **`live` never bypasses `hl_bot`.** The SDK server can only call `signal_bus.emit_signal(source="chartrunner", …)`. `hl_bot` then runs its normal gate (`gate_logic.ollama_pre_trade_gate`), sizing, and regime filters. If `hl_bot` rejects, the ability shows as "gate-rejected" in-game and the run is recorded in the shadow portfolio — exactly like any other rejected signal today.
2. **The mode is set server-side per-session.** The browser cannot elevate itself from `paper` to `live`. The Cowork/Umbrel operator flips a flag in `.env` (`CHARTRUNNER_MODE=live`) and restarts `sdk.service`. Matches the `DRY_RUN=false` pattern already used by `hl_bot`.

---

## RPC contract (browser ↔ `sdk/server.py`)

WebSocket, JSON frames, HMAC-signed. Minimal surface.

**Client → server**

```jsonc
{ "op": "emit", "id": "...", "signal": {
    "source": "chartrunner",
    "direction": "LONG",
    "confidence": 0.72,
    "coin": "BTC",
    "reason": "bracket fired on VWAP retest; OFI +0.41",
    "metadata": { "ability": "bracket", "entry": 65100, "tp": 65900, "sl": 64800 }
} }
```

The server calls `shared.signal_bus.emit_signal(**payload)` and echoes back. No direct execution.

**Server → client**

```jsonc
{ "op": "signals.snapshot", "signals": [ ...current bot_signals... ] }
{ "op": "signals.update",   "signal":  { ... } }
{ "op": "position.update",  "positions": [ ...from hl/api.fetch_open_positions... ] }
{ "op": "equity.update",    "equity": 1234.56 }
{ "op": "gate.result",      "id": "...", "approved": true|false, "reason": "8/10: funding compelling..." }
```

A single WebSocket covers signals, positions, equity, and gate echoes. Heartbeats every 10s. Reconnect with exponential backoff. Server is stateless per-connection — it reads from `state.json` via `shared/state.py`'s `state_lock`, so it coexists with `hl_bot` and `guardian` without contention.

---

## Stack-module → SDK-component mapping

The core reason C1 beats a separate repo: the table below is not a port, it's a graft.

| Trading-stack module | SDK surface | Role |
|---|---|---|
| `hl/api.py::place_order`, `close_order` | `BrokerAdapter.placeBracket` (live only) — called *indirectly* via `signal_bus` → `hl_bot` | execution |
| `hl/api.py::get_all_assets`, `get_price` | `HyperliquidHost` price feed | chart data for HL venue |
| `hl/api.py::fetch_open_positions` | `BrokerAdapter.getOpenPositions` (live) | HUD state |
| `hl/api.py::get_account_equity` | `BrokerAdapter.getEquity` | HUD state |
| `hl/signal_engine.py::evaluate_candidate` | `SignalFeed.evaluate` (port to TS, subset) | ability-fire decisions |
| `hl/signal_engine.py::EntrySignal` dataclass | `Signal` type in `@chartrunner/core` | data shape |
| `hl/gate_logic.py::ollama_pre_trade_gate` | `RiskManager.checkGate` — RPC'd in live mode | AI confirmation gate |
| `hl/gate_logic.py::record_shadow_rejection` | `sdk/replay.py` integration | the learning loop |
| `hl/trade_executor.py::compute_position_size` | `RiskManager.sizeFor` (1:1 TS port) | risk-adjusted notional |
| `hl/position_manager.py::manage_position` | `@chartrunner/core`'s TP/SL/trailing state machine | position lifecycle |
| `shared/signal_bus.py::emit_signal` | `sdk/signal_adapter.py::from_game_event` | game → stack |
| `shared/signal_bus.py::get_active_signals` | WebSocket push `signals.snapshot` + `signals.update` | stack → game |
| `shared/intelligence.py::get_hl_order_flow` | `OrderFlowRadar` overlay (new ability) | paper #7, #11 visualization |
| `shared/intelligence.py::get_cvd_signal` | `CVDLens` overlay (new ability) | CVD divergence visualization |
| `shared/state.py::state_lock` | server-side guard on RPC writes | concurrency |
| `guardian.py` + systemd pattern | `sdk.service` unit | lifecycle |

---

## New abilities, grounded in the research library

`RESEARCH_LIBRARY.md` already identifies the highest-leverage signal upgrades for the stack. Making each of them a **visible in-game ability** turns research into a player feedback loop:

| Ability | Source | What the player sees | What it emits |
|---|---|---|---|
| **Order Flow Radar** | Paper #7, #11 (`get_hl_order_flow`) | heatmap 5min ahead showing bid/ask imbalance | `signal_bus` source with imbalance metadata |
| **Flash Shield** | Paper #3 (`flash_crash_spreads` in `signal_engine.py`) | red screen vignette when spread > 5× baseline; auto-halts abilities | telegram alert + shadow entry |
| **Regime Lens** | Paper #4 (Lévy-OU regime detection) | world tint shifts: calm=blue, trending=green, volatile=red | modulates `kelly_mult` in `RiskManager` |
| **Pair Grapple** | Paper #5 (copula pairs) | grapple line between two assets when BTC/ETH spread > 2.5σ | paired LONG/SHORT signal |
| **Funding Compass** | `hl_bot` funding-threshold strategy | compass points LONG if funding < −0.05%, SHORT if > +0.08% | this is already what `hl_bot` does; compass just shows it |
| **Shadow Mirror** | `gate_logic.record_shadow_rejection` | ghost avatar shows what *would* have happened to rejected trades | read-only view of `shadow_portfolio` |
| **2.5σ Threshold** | Paper #6, #12 | Bollinger band overlay with 2.5σ explicitly labeled | no new signal — just exposes `strategy_discoverer.py`'s parameter |

The `Shadow Mirror` is the one that makes the research-ops loop visible in-game: players see both the trades they were allowed to take **and** the trades the gate blocked, with their eventual outcomes from `shadow_portfolio`. That is how `ollama_optimizer.py` improves its prompts — and exposing it in-game turns optimization from a cron job into a spectator sport.

---

## Milestones

Four tight iterations. Each one ends with a running, demoable thing.

**M1 — Core extraction (2 weeks)**. Extract `ChartHost`, `AbilityRegistry`, `BrokerAdapter`, `SignalFeed`, `RiskManager` from `ChartRunner_Prototype.html` into `sdk/web/core/`. Keep `sandbox` mode only. Ship as a `<script type="module">` import. Regression: the current prototype must keep working by loading `@chartrunner/core` from a local build. No behavior change; just structure.

**M2 — Binance + HL hosts (1 week)**. Implement `BinanceHost` (existing behavior) and `HyperliquidHost`. Add asset toggle entry for `HL:BTC-PERP` / `HL:ETH-PERP` / etc. Paper-book execution only. Verify candles render cleanly in both hosts across 5 timeframes.

**M3 — SDK server + `paper` mode (2 weeks)**. Build `sdk/server.py` (FastAPI + WebSocket). Wire `signal_adapter.py` to `shared/signal_bus`. Browser connects via Tailscale to Umbrel. Gameplay now emits real signals that `hl_bot` *could* consume (but doesn't — `paper` only reads). Add `guardian.py` entry + `sdk.service` unit. Playtest: run ChartRunner for an hour with `paper` mode while `hl_bot` runs live on a different coin; verify no contention on `state.json`.

**M4 — `signed-testnet` + `live` mode gating (2 weeks)**. Enable `live` mode behind a flag. Test that ability fires result in `hl_bot` gate checks and either execute or shadow-reject. Add `Shadow Mirror` ability UI. Ship signed run summaries to `sdk/replay.py`. Update `CLAUDE.md` with a `## SDK` section describing the bridge. Final playtest: have `hl_bot`, `arb_bot`, and `chartrunner` all emitting signals simultaneously; verify `hl_bot` picks a winner coherently.

Total timeline: ~7 weeks with focused work, matching Phase 0's pace on the prototype.

---

## Open decisions that Phase 1 defers

- **Solana venue adapter.** `solana_sniper` and `solana_copy` are disabled in `CLAUDE.md`. Phase 2 territory.
- **Mobile / touch controls.** The Phase 0 plan already parks this for Phase 1+; keep deferred until core SDK ships.
- **Wallet-signed intent.** Phase 2 replaces HMAC with ERC-4337 AA + commit-reveal. Not needed for Umbrel-local `live`.
- **Replay verification.** `sdk/replay.py` stores summaries but doesn't verify them yet. Merkle-proof anti-cheat is Phase 2 work.

---

## Verification checklist for this doc

Before starting M1, a subagent should verify:

1. Every Python file referenced above exists in `/Users/julianroy/trading-stack/` at the expected path.
2. `shared/signal_bus.py::emit_signal` signature matches what `sdk/signal_adapter.py` will call.
3. `hl/api.py` has exactly the 6 async functions assumed (`place_order`, `close_order`, `get_all_assets`, `get_price`, `fetch_open_positions`, `get_account_equity`).
4. `state.json`'s `bot_signals` schema (per `signal_bus.py` docstring) matches the RPC payload shape above.
5. `guardian.py` + systemd timer pattern (`*.service` / `*.timer`) works for a long-running WebSocket server, or we need `Restart=always`.

Pending item 5, the SDK server may need a `sdk/keepalive.py` ping endpoint for guardian to monitor — easy add.

---

*End. Next step after approval: spin up M1 in a feature branch (`chartrunner-sdk-m1`), extract `@chartrunner/core` from the prototype, and cut a regression playtest.*
