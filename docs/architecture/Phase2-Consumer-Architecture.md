# ChartRunner — Phase 2 Consumer Architecture

*Projects the Phase 1 SDK onto a three-layer consumer product. Locked decisions: **L1 = Hand** (agents with custody, chat-mandated execution), **L2 = SDK + Reference-App** (Agent-SDK + Chart-Embed-SDK first, Tournament-SDK deferred), **L3 = Eye** (coach blackboard, monitors and fine-tunes bots, never executes). Two profiles ship side-by-side: Solana-Degen and Hyperliquid-Perp. Game-Mode = Paper-Trading with Juice; Live-Mode is a separate sober UI.*

---

## The one-liner

> **ChartRunner becomes the reference-app for a three-layer consumer stack that connects AI, chain (Solana + Hyperliquid), gaming, and trading.** Developers get three npm packages (`@chartrunner/agent`, `@chartrunner/chart`, later `@chartrunner/tournament`). End-users get three surfaces that talk to each other: a wallet/agent chat (L1), a gamified charting+trading client (L2), and a personal coach terminal (L3). Hackathons, live-trading events, and 1v1 competitions ride on top. Phase 1's invariant holds: *the SDK never becomes a trading authority — intents flow through `hl_bot` (HL) or the Agent-Wallet contract (Solana).*

---

## Pipeline in three layers

```
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — AI-Wallet / Agent Interface              "THE HAND"             │
│  Custody + execution. You talk, they trade.                                │
│                                                                            │
│  @chartrunner/agent  (npm, TypeScript)                                     │
│  AgentWallet       ← ERC-4337 AA on HL-EVM / PDA-session on Solana         │
│  AgentMandate      ← chat-signed policy ("SHORT BTC if funding > 0.08%")   │
│  AgentChat         ← bidirectional chat to the bot; bot answers in receipt │
│  AgentReceipt      ← every fill echoes back with reason + gate breakdown   │
│                                                                            │
│  Venues: Solana (Jito/Pump/Jup) ∥ Hyperliquid (HyperCore perps + HL-EVM)   │
└────────────────────────────────────────────────────────────────────────────┘
                           │            ▲
               mandates ↓  │            │ ↑ receipts + position/equity
                           ▼            │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — Gamified Charting + Trading SDK         "THE PLAYGROUND"        │
│  Reference-app: ChartRunner. SDK: drop-in for any chart host.              │
│                                                                            │
│  @chartrunner/core        (from Phase 1 — ChartHost, Abilities, Risk)      │
│  @chartrunner/chart       (NEW — iframe/embed widget for any site)         │
│  @chartrunner/profiles    (NEW — Solana-Degen ∥ HL-Perp profiles)          │
│  @chartrunner/modes       (NEW — Game-Mode vs Live-Mode UI split)          │
│                                                                            │
│  Game-Mode  = Paper-book with juice, particles, banners, skins             │
│  Live-Mode  = sober monochrome HUD, no juice, gate-reasons front-and-center│
└────────────────────────────────────────────────────────────────────────────┘
                           │            ▲
      behavior telemetry ↓ │            │ ↑ CoachingDirective + LearningUpdate
          (BehaviorTape)   │            │   (the learning channel — L3 teaches L2)
                           ▼            │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — Personal AI-Trading-Terminal            "THE EYE"               │
│  The blackboard. Never trades. Watches everything, reasons about it.       │
│                                                                            │
│  @chartrunner/terminal  (Electron / Tauri desktop app)                     │
│  BotBoard       ← every agent from L1: status, mandate, PnL, drift-score   │
│  BehaviorTape   ← every player action from L2 (own + peers)                │
│  ThesisEngine   ← Ollama/Claude formulates thesis, tags edges, warns       │
│  PlayerModel    ← per-player edge-map, session-bias, variance, drift       │
│  AgentModel     ← per-agent mandate-fire rates, edges, drift, overlap      │
│  CoachChannel   ← publishes directives + learning updates down to L2       │
│  TuneChannel    ← publishes persona directives + mandate suggestions → L1  │
│  MandateEditor  ← edit L1 mandates from the blackboard; L1 signs, not L3   │
└────────────────────────────────────────────────────────────────────────────┘
        ▲                                                                 │
        │ PersonaDirective (silent) + MandateSuggestion (needs L1 sign)   │
        └─────────────────────────────────────────────────────────────────┘
                        L3 → L1 Agent-Tuning Channel (wraparound)
```

**L1 is the Hand. L3 is the Eye — and the Teacher.** L3 can see everything L1 does and everything L2 shows, but L3 never signs, never places orders, never custodies. All execution authority lives in L1 (agents) or — for the HL venue — still flows through `hl_bot` exactly as Phase 1 defined. The user edits mandates in L3, but L1 re-signs them before they become binding on the agent.

**The feedback loop that makes L2 learn:** L3 computes a `PlayerModel` from `BehaviorTape` + receipts, and publishes two kinds of feedback *down* to L2 through the `CoachChannel` — `CoachingDirective` (UI-only overlays, nudges, warnings) and `LearningUpdate` (parameterizes the active `Profile.risk_curve` + ability roster). Without this channel L3 is just a dashboard; with it, the gamified interface gets measurably better at teaching this specific player. See *"L3 → L2 Learning Channel"* below for the full shape.

**The feedback loop that makes L1 agents evolve:** symmetric pattern on the L1 side. L3 computes an `AgentModel` from receipts + mandate history, and publishes via the `TuneChannel` two kinds of feedback *up* to L1 — `PersonaDirective` (chat tone, receipt verbosity, warning escalation — applies silently) and `MandateSuggestion` (proactively proposed mandate drafts or edits — always requires L1 signature, never silent, in any mode). Without this channel the agent is static after grant; with it, mandates get auto-hardened when variance rises, dead mandates surface for consolidation, triggers get backtest-tuned, and the chat persona evolves toward the user's preferred style. See *"L3 → L1 Agent-Tuning Channel"* below for the full shape.

---

## Package layout — extending `trading-stack/sdk/`

Phase 1 shipped M1 (`trading-stack/sdk/web/core/` — five interfaces + sandbox adapters + 1,458-vector parity test). M2–M4 (`adapters/`, `server.py`, `signal_adapter.py`, `risk_guard.py`, `replay.py`) are still pending as of 2026-04-19. Phase 2 adds siblings, not replacements — but items in the tree below that live outside `sdk/web/core/` are *Phase 1 pending work that Phase 2 depends on*, not already-shipped siblings.

```
trading-stack/
├── hl/                          # unchanged — authorized HL trader
├── shared/                      # unchanged — signal_bus, state, intelligence
├── sdk/                         # Phase 1 M1 shipped; M2-M4 pending
│   ├── server.py                # [PENDING Phase 1 M3] signal bridge
│   ├── signal_adapter.py        # [PENDING Phase 1 M3]
│   ├── risk_guard.py            # [PENDING Phase 1 M4]
│   ├── replay.py                # [PENDING Phase 1 M4] → Phase 2 anti-cheat
│   └── web/
│       ├── core/                # Phase 1 — ChartHost, Abilities, Risk…
│       ├── adapters/            # Phase 1 M2 — Binance, HL, TradingView
│       ├── overlay/             # Phase 1 M2 — host overlay rendering
│       │
│       ├── agent/               # NEW — @chartrunner/agent (L1)
│       │   ├── AgentWallet.ts
│       │   ├── AgentMandate.ts
│       │   ├── AgentChat.ts
│       │   └── adapters/
│       │       ├── solana-pda.ts
│       │       └── hl-aa.ts
│       │
│       ├── chart/               # NEW — @chartrunner/chart (L2 embed)
│       │   ├── Embed.ts         # iframe/web-component host
│       │   ├── postmessage.ts   # parent-site ↔ chart bridge
│       │   └── themes/
│       │
│       ├── profiles/            # NEW — @chartrunner/profiles (L2)
│       │   ├── solana-degen.ts
│       │   ├── hl-perp.ts
│       │   └── Profile.ts       # shared shape
│       │
│       ├── modes/               # NEW — @chartrunner/modes (L2)
│       │   ├── GameMode.ts
│       │   └── LiveMode.ts
│       │
│       └── tournament/          # DEFERRED — @chartrunner/tournament
│           └── (M8)
│
├── terminal/                    # NEW — L3 Personal AI-Trading-Terminal
│   ├── package.json             # Electron or Tauri
│   ├── src/
│   │   ├── BotBoard.tsx
│   │   ├── BehaviorTape.tsx
│   │   ├── ThesisEngine.ts      # wraps Ollama qwen2.5:14b (local)
│   │   └── MandateEditor.tsx
│   └── build/
│
└── events/                      # NEW — hackathon / tournament infra
    ├── paper_race.py            # 5-min same-seed race runner
    ├── real_bracket.py          # 24h position-limited bracket
    ├── elo.py                   # season ranking
    └── sponsored.py             # prize-pool escrow (L1 contract)
```

Three npm packages ship from `sdk/web/`: `@chartrunner/agent`, `@chartrunner/chart`, `@chartrunner/profiles+modes` (bundled). `@chartrunner/tournament` is deferred to M8. `terminal/` ships as a desktop binary, not npm.

---

## L1 — Agent Wallet API ("The Hand")

The package a dApp embeds to let users talk to a trading agent. The agent has custody, the user has the chat.

```ts
import { AgentWallet, AgentMandate, AgentChat } from "@chartrunner/agent";

// connect wallet; spawns or re-hydrates the agent
const agent = await AgentWallet.connect({
  venue: "hl" | "solana",
  mode:  "paper" | "live",
  fund:  { asset: "USDC", amount: 200 },        // initial agent budget
});

// mandate = chat-signed policy the agent must obey
const mandate: AgentMandate = {
  id: "mandate-funding-shorts",
  scope: { venue: "hl", coin: "BTC", sideAllowed: ["short"] },
  trigger: { funding_bps: { gte: 8 } },          // >0.08%
  sizing: { kelly_mult: 0.5, max_notional_usd: 500 },
  exits:  { tp_pct: 20, sl_pct: 1, trail_from_pct: 8, trail_by_pct: 1 },
  expires_at: "2026-05-01T00:00:00Z",
};
await agent.grantMandate(mandate);                // wallet signs; agent enforces

// bidirectional chat
const chat = agent.chat();
chat.on("receipt", (r) => console.log(r));
await chat.send("how was last 24h on BTC shorts?");
// → agent replies with a receipt summary + PnL + rejected-signal count
```

**AgentReceipt shape** — every fill, every rejection, every mandate edit produces one:

```ts
interface AgentReceipt {
  ts: number;
  kind: "fill" | "reject" | "mandate_granted" | "mandate_revoked" | "thesis_reply";
  venue: "hl" | "solana";
  mandate_id: string;
  payload: {
    side?: "long" | "short";
    price?: number;
    notional?: number;
    reason: string;                               // from `gate_logic` on HL
    gate_breakdown?: { funding: number, oi: number, regime: string };
  };
  signature: string;                              // agent-signed, verifiable
}
```

**Why this shape.** It mirrors the data that already flows through `shared/signal_bus.py` and `hl/gate_logic.py::record_shadow_rejection` — the agent is just an edge-device proxy for the same decisions, now gated by user-signed mandates instead of hard-coded bot config. Phase 1 M4 already defined `sdk/risk_guard.py` to refuse live intent that exceeds `hl_bot` policy; Phase 2 extends that check to refuse any agent action that exceeds its *signed* mandate.

**Venue adapters.**

| Venue | Custody model | Mandate signing | Settlement |
|---|---|---|---|
| Hyperliquid (perps) | ERC-4337 Account Abstraction on HL-EVM | EIP-712 typed data | routed through existing `hl_bot` via `shared/signal_bus` |
| Solana (spot + perps via Drift/Jupiter) | Program Derived Address session key | Ed25519 on session-key spec | agent signs directly with session key; expires with mandate |

For HL the invariant **stays identical to Phase 1**: `hl_bot` remains the sole order-placer. The agent is a L1 frontend that writes signed intents into `signal_bus`. For Solana, session-key custody is necessary because no equivalent of `hl_bot` exists yet — the agent is its own executor.

---

## L2 — Gamified SDK ("The Playground")

Phase 1 shipped `@chartrunner/core`. Phase 2 adds three sibling packages so developers can ship their own chart-embedded games/dashboards without reimplementing the core.

### `@chartrunner/chart` — drop-in embed

```html
<!-- any site -->
<script type="module" src="https://cdn.chartrunner.app/chart.js"></script>
<chartrunner-embed
  symbol="HL:BTC-PERP"
  tf="15m"
  mode="game"                      <!-- "game" | "live" -->
  profile="hl-perp"                <!-- "solana-degen" | "hl-perp" -->
  agent-id="mandate-funding-shorts"
  theme="dark">
</chartrunner-embed>
```

```ts
// same thing from JS
import { mount } from "@chartrunner/chart";
const ctrl = mount(document.querySelector("#slot"), {
  symbol: "SOL-PERP",
  tf: "5m",
  mode: "game",
  profile: "solana-degen",
  agent: (await AgentWallet.connect({ venue: "solana", mode: "paper" })).id,
});

ctrl.on("ability.fire", (ev) => console.log(ev));   // bracket, ladder, …
ctrl.on("score.change", (ev) => console.log(ev));
```

**postMessage bridge.** When embedded via iframe, the host page talks to ChartRunner through a typed postMessage contract: `{ op: "ability.fire" | "mandate.edit" | "score.request", payload }`. This is how a hackathon submission can embed ChartRunner in a custom dApp without linking it into their bundle.

### Profile system — dual-profile (Solana-Degen ∥ HL-Perp)

Each profile is a `Profile` object that specifies prompts, metrics, skin, abilities, and risk-curve. **Same engine, different personality.**

```ts
interface Profile {
  id: "solana-degen" | "hl-perp";
  chat_persona: string;                // LLM system prompt for AgentChat
  metrics: {                           // what the HUD tracks
    primary: "realized_pnl" | "r_multiple" | "win_rate" | "meme_hits";
    secondary: string[];
  };
  skin: {
    palette: { runner: string; bear: string; hud: string };
    world_tint: "upside-down" | "liquid-neon";
    particle_set: "spark" | "candy" | "plasma";
  };
  abilities: AbilityId[];              // full roster the profile can show
  risk_curve: {                        // defaults; L3 can nudge via LearningUpdate
    kelly_mult: number;                 // clamped in Profile.apply() to [0.1, 0.5]
    max_consecutive_losses: number;     // clamped in Profile.apply() to [2, 6]
    cooldown_after_blowup_s: number;
  };
  learning: {                          // L3 → L2 feedback state (see below)
    active_directives: CoachingDirective[];
    active_update?: LearningUpdate;    // the last-applied LearningUpdate
    abilities_whitelist?: AbilityId[]; // subset of abilities, set by LearningUpdate
    coach_channel_enabled: boolean;    // user can disable the teacher from settings
  };
  // --- methods (on the class, not the shape) ---
  applyDirective(d: CoachingDirective): void;
  applyUpdate(u: LearningUpdate): Promise<void>;
  revertUpdate(id: string): Promise<void>;
}
```

Concrete profiles:

| Field | `solana-degen` | `hl-perp` |
|---|---|---|
| chat persona | "degen memelord who respects stops" | "funding-rate sniper, patient, methodical" |
| primary metric | meme_hits (2×+ in <1h) | r_multiple |
| secondary | rug_survive, copy_alpha | funding_pnl, shadow_delta |
| palette | candy/plasma neons | deep blue / amber |
| particle_set | candy | spark |
| abilities | `bracket`, `ladder`, `rescue`, **`sniper-entry`**, **`rug-radar`** | `bracket`, `oco`, `hedge`, **`funding-compass`**, **`shadow-mirror`** |
| kelly_mult | 0.25 (twitchy) | 0.5 (steady) |
| max_consecutive_losses | 2 → cooldown | 4 → cooldown |
| cooldown_after_blowup | 90s | 600s |

Profiles mount the *same* `@chartrunner/core`. The code path diverges only through this object. That is what keeps the SDK as a real SDK rather than two forks.

### Mode system — Game-Mode vs Live-Mode

```ts
type Mode = "game" | "live";
```

**Game-Mode** is explicitly "Paper-Trading with Juice" — particles, banners, hit-stop, shadow ghosts, skin-switches on streaks. Optimized for *learning* and *fun*.

**Live-Mode** is a separate UI that shares the same abilities but strips the juice. Monochrome HUD, no confetti, gate-reasons front-and-center, risk meters visible, chat-agent responses preferred over toasts. Optimized for *not blowing up*.

The engine toggles layers, not content:

| Layer | Game-Mode | Live-Mode |
|---|---|---|
| Particles / floats | on, lavish | off |
| Hit-stop on fill | 120ms | 0 |
| Banner on R-milestone | yes | no |
| Gate-reject display | small toast | large modal with breakdown |
| Ability cooldown viz | spinning icon | numeric countdown only |
| Shadow Mirror | ghost avatar | line in receipt panel |
| HUD palette | profile color | grayscale |
| Chat opacity | translucent overlay | dedicated panel |

A single `mode="live"` attribute on the embed swaps these. The ability code, the risk math, and the agent protocol are identical.

---

## L3 — Personal AI-Trading-Terminal ("The Eye")

A desktop app — the blackboard. Never trades. Its job is to watch everything the user's agents and the user themselves do, and to formulate thesis + warnings.

### Four panels

**BotBoard** — every `AgentWallet` the user owns. Row per agent. Columns: venue, mode, mandate summary, 24h PnL, drift-score (how far agent's behavior has drifted from its mandate's intent), last-receipt.

**BehaviorTape** — a chronological tape of the user's own L2 actions (every ability fire, every mandate edit) *plus* peer actions in any tournament the user entered. Useful for post-mortems and for the ThesisEngine to reason about patterns.

**ThesisEngine** — wraps local Ollama (`qwen2.5:14b` as already deployed on Umbrel; `CLAUDE.md` confirms). Given last-N events from BotBoard + BehaviorTape, it generates: (a) thesis candidates ("your HL-perp agent is over-trading in London session — 6% worse win-rate vs NY"), (b) warnings ("SOL-degen agent has breached max_consecutive_losses — cooldown triggered"), (c) mandate-edit suggestions that the user signs in L1.

**MandateEditor** — edits an L1 mandate. Writes the proposed change to a staging area. User clicks "Sign" → L1 `AgentWallet` signs → mandate takes effect. **L3 never signs.** This is the firewall that keeps L3 as the Eye.

### L3 API (read-mostly)

```ts
import { Terminal } from "@chartrunner/terminal";

const term = new Terminal({
  ollama_url: "http://localhost:11434",      // local inference
  agents: [ agentHL.id, agentSol.id ],       // L1 handles to watch
  chart_sessions: [ sessionId ],             // L2 handles to tape
});

term.on("thesis", (t) => ui.showThesis(t));
term.on("warning", (w) => ui.showWarning(w));

// user approves a suggestion — L3 packages it, L1 signs it
const draft = term.proposeMandateEdit({ agent_id, field: "kelly_mult", to: 0.4 });
await agentHL.wallet.signMandateEdit(draft);   // L1 signs, not L3
```

**Why Ollama, not a hosted LLM.** `CLAUDE.md` already runs `qwen2.5:14b` locally for trade signal confirmation + nightly optimizer. The terminal piggybacks on that — zero incremental cost, zero egress, the user's trading behavior never leaves their box.

---

## L3 → L2 Learning Channel — how the game learns from the terminal

This is the bone that was missing from the first draft. Without it, L3 is a read-only dashboard. With it, **the gamified interface becomes measurably better at teaching this specific player over time** — because L3 sees every fire, every receipt, every rejection and feeds that back into L2's active `Profile` and overlay system.

### The data flow, top to bottom

```
BehaviorTape + AgentReceipts   →   PlayerModel   →   CoachChannel.publish()   →   L2.Profile.apply()
  (raw events from L2 + L1)       (stats per ability,    (two outbound types:      (re-parameterizes
                                   per session,           CoachingDirective +       risk_curve, ability
                                   per regime)            LearningUpdate)           roster, overlays)
```

**PlayerModel** — a rolling fingerprint of this player's behavior. Computed in L3 from last-N events. Never trusts a single session; weights decay ~30 days.

```ts
interface PlayerModel {
  player_id: string;
  updated_at: number;
  ability_edges: {                              // per-ability R-multiple edge
    [ability_id: string]: { r_mean: number; r_stdev: number; n: number };
  };
  session_bias: {                               // PnL by trading session
    asia: number; london: number; ny: number; off_hours: number;
  };
  regime_fit: {                                 // PnL by Lévy-OU regime
    calm: number; trending: number; volatile: number;
  };
  variance_footprint: number;                   // stdev of R across last-N
  drift_from_mandate: number;                   // 0 = disciplined, 1 = feral
  consecutive_tilt_flag: boolean;               // cluster of bad decisions?
  updated_fields: string[];                     // which fields changed this tick
}
```

### Two outbound types — why the split matters

L3 publishes two kinds of feedback. They look similar; the *authorization level* differs.

**`CoachingDirective`** — UI-only. Changes what the player *sees*, never what the game *does*. Applies instantly, no user approval. Low-risk surface area: overlays, tooltips, visibility, mission generator seeds.

```ts
interface CoachingDirective {
  id: string;
  kind:
    | "dim_session"            // visually dim chart during a session the player bleeds in
    | "surface_ability"        // bring a strong ability to topbar; move weak one to drawer
    | "warn_before_fire"       // show modal before firing a proven-weak ability
    | "shadow_replay"          // replay a specific past bad trade with coaching overlay
    | "generate_mission"       // seed a new mission targeting a demonstrated weakness
    | "confidence_meter";      // show/hide edge-meter for current setup
  scope: { profile_id?: string; session_window_min?: number };
  payload: Record<string, unknown>;
  expires_at: number;
}
```

**`LearningUpdate`** — parameterizes the active `Profile`. Changes what the game *does* — risk curve, ability roster, cooldowns, mission difficulty. **Requires user approval in Live-Mode; applies silently in Game-Mode** (because Game-Mode is paper-trading, same authorization principle as a video game re-balance).

```ts
interface LearningUpdate {
  id: string;
  target: "profile" | "mission_generator" | "shadow_mirror";
  patch: {
    risk_curve?: Partial<Profile["risk_curve"]>;
    abilities_whitelist?: AbilityId[];
    abilities_cooldown_ms?: { [ability_id: string]: number };
    shadow_mirror_seed?: { source: "random" | "player_history"; window_days?: number };
    mission_weakness_bias?: { [area: string]: number };       // 0..1 weights
  };
  justification: string;                                       // human-readable, from ThesisEngine
  requires_user_approval: boolean;                             // true in Live-Mode, false in Game-Mode
  applied_at?: number;
  reverted_at?: number;
}
```

### Seven concrete learning primitives (what the player actually feels)

1. **Session-bias dimming.** `PlayerModel.session_bias.london < -0.3R mean` → `CoachingDirective.dim_session` reduces chart contrast during London; an in-game banner reads *"historically -0.3R avg in London — consider observing, not firing."*
2. **Ability-edge surfacing.** `ability_edges.bracket.r_mean = +2.1` but `ability_edges.oco.r_mean = -0.8` → topbar shows `2` (Bracket) prominent, `3` (OCO) moves behind a warning tooltip. The player's own history reshapes the ability roster.
3. **Adaptive kelly.** `variance_footprint` rising → `LearningUpdate` nudges `risk_curve.kelly_mult` down by 0.05. Falling variance → nudges up. Hard clamp at `[0.1, 0.5]`.
4. **Shadow Mirror, personalized.** Today the Shadow Mirror ghost is random (30% reject rate, random reason). After this channel ships: ghost shows the player's **own** recent rejected trades with real outcomes. "You were blocked on this BTC short last Tuesday — here's what happened to price after. You would have made +$124."
5. **Generated missions.** `mission_weakness_bias = { trail_stop: 0.8 }` → next mission the generator spawns is a trail-stop mission. Missions stop being author-written and start being player-shaped.
6. **Revisit-mode (replay trade).** ThesisEngine tags a specific bad trade: "here's where you held too long." `shadow_replay` directive opens a game session replaying exactly that candle window with a coaching overlay at the optimal exit — player can fire the ideal ability and feel the alternate outcome.
7. **Confidence meter.** A small HUD element in the corner showing "how much edge you have on this setup right now" — composed from `ability_edges` × `session_bias` × `regime_fit` for the current context. Grey = no data, green = strong edge, amber = thin edge, red = negative edge.

### Safety — what makes this channel not dangerous

Four hard rules keep the Teacher from becoming a Puppeteer:

1. **L3 never directly executes.** Directives and updates apply to `Profile` / overlays / missions. Execution still flows Mandate → Agent → Signal-Bus → `hl_bot`. The channel cannot bypass risk guards.
2. **LearningUpdate has hard clamps.** `kelly_mult` locked to `[0.1, 0.5]`. `max_consecutive_losses` locked to `[2, 6]`. `abilities_whitelist` cannot *add* abilities outside the Profile's declared set — only *remove* or *reorder*. All clamps enforced in `L2/profiles/Profile.apply()`, not trusted from L3.
3. **Live-Mode approval gate.** Any `LearningUpdate` in Live-Mode shows a modal with the justification string and a diff of what's changing. User clicks Accept or Decline. In Game-Mode (paper) updates apply silently, same way a game patch would.
4. **Revertible.** Every `LearningUpdate` is stored with `applied_at` + `reverted_at`. User can open *"Coach history"* in L3 and one-click revert any update. The system stays legible.

### CoachChannel API — the wire

```ts
// L3 side (inside @chartrunner/terminal)
import { CoachChannel } from "@chartrunner/terminal";
const coach = CoachChannel.attach({ targets: [ sessionId ] });
coach.publishDirective(directive);
coach.publishLearningUpdate(update);
coach.on("applied", (id) => ...);       // L2 confirms
coach.on("declined", (id, why) => ...); // user declined in Live-Mode

// L2 side (inside the embedded chart)
import { subscribeCoach } from "@chartrunner/chart";
subscribeCoach({
  onDirective: (d) => profile.applyDirective(d),
  onLearningUpdate: async (u) => {
    if (u.requires_user_approval) return await ui.confirmUpdate(u);
    return profile.applyUpdate(u);
  },
});
```

Transport: WebSocket over Tailscale (same pipe as the existing Phase 1 server). One additional `op` namespace: `coach.directive`, `coach.update`, `coach.applied`, `coach.declined`. Wire-compatible — zero changes to existing ops.

### Mapping — what in the stack already produces the raw material

| L3 input | Stack module | Role |
|---|---|---|
| ability fire/close events | `sdk/replay.py` (Phase 1 M4) | per-ability R outcomes → `ability_edges` |
| shadow-portfolio outcomes | `hl/gate_logic.record_shadow_rejection` + `shadow_portfolio` | what-if PnL for Shadow-Mirror personalization |
| regime classification | `shared/intelligence.get_regime_label` (existing) | `regime_fit` breakdown |
| session windows | constant per `CLAUDE.md` (NY + Asia preferred) | `session_bias` bucketing |
| variance history | computed in L3 from receipt stream | `variance_footprint` |
| drift-score | receipt.payload.reason vs mandate.trigger | `drift_from_mandate` |

No new stack modules. Every ingredient already exists. The CoachChannel just assembles them and pushes them *down*.

---

## L3 → L1 Agent-Tuning Channel — how the agent evolves from behavior

The symmetric bone. Without it, an agent is frozen at grant-time; the mandate the user signed on day 1 stays static while the user, the market, and the regime all change around it. With it, **the agent proactively suggests its own evolution** — hardening when variance rises, consolidating when mandates overlap, retuning triggers when backtest says a threshold has drifted. The user still holds the signing pen; L3 just hands over increasingly well-formed drafts.

### Data flow

```
AgentReceipts + Mandate history  →  AgentModel  →  TuneChannel.publish()  →  L1.AgentWallet.apply()
  (raw L1 events)                   (per-mandate   (two outbound types:       (PersonaDirective
                                     stats,         PersonaDirective +         applies silently;
                                     fire-cadence,  MandateSuggestion)         MandateSuggestion
                                     drift, overlap)                           queues for signing)
```

**AgentModel** — per-agent fingerprint. Rolls over last-N days of receipts.

```ts
interface AgentModel {
  agent_id: string;
  updated_at: number;
  mandate_fire_rates: {
    [mandate_id: string]: { fires_per_day: number; last_fire_at: number; n: number };
  };
  mandate_pnl_edges: {
    [mandate_id: string]: { r_mean: number; r_stdev: number; n: number };
  };
  mandate_drift: {                              // execution vs. intent
    [mandate_id: string]: number;               // 0 disciplined, 1 feral
  };
  dead_mandates: string[];                      // fires_per_day < 0.05 for 30d
  overlapping_mandates: string[][];             // scope-diff clusters
  chat_style_signal: {                          // learned from user reactions
    verbosity_preferred: "terse" | "full" | null;      // null on cold start (no reactions observed yet)
    tone_preferred: "warm" | "neutral" | "cold" | null;
    warning_escalation_needed: number | null;   // 0..1 ignored-warning rate; null on cold start
  };
}
```

### Two outbound types

The split mirrors the L2 channel but with stricter semantics on the high-authority side.

**`PersonaDirective`** — pure text/UI tuning on the agent's communication surface. No execution implications. Applies silently in every mode.

```ts
interface PersonaDirective {
  id: string;
  kind:
    | "set_verbosity"             // terse receipts vs full gate breakdowns
    | "set_tone"                  // warm / neutral / cold chat persona
    | "escalate_warnings"         // elevate specific warning types to modal
    | "flag_dead_mandate"         // surface a dead mandate in the chat panel
    | "highlight_overlap";        // visualize scope overlap between mandates
  scope: { agent_id: string };
  payload: Record<string, unknown>;
  expires_at: number;
}
```

**`MandateSuggestion`** — proactively proposes a new mandate, an edit, or a revoke. **Always requires L1 signature. No silent-apply path, even in Game-Mode.** That asymmetry vs. `LearningUpdate` (which silently applies in Game-Mode) is deliberate: mandates are the *authorization boundary* of an agent with custody. A paper agent's mandate determines what a future live-promotion would authorize. Signing IS the product contract — auto-applying would break it.

```ts
interface MandateSuggestion {
  id: string;
  kind: "grant" | "edit" | "revoke";
  agent_id: string;
  draft: Partial<AgentMandate>;               // full mandate on "grant", patch on "edit", id-only on "revoke"
  based_on_mandate_id?: string;
  justification: string;                      // ThesisEngine, human-readable
  backtest_delta?: {                          // optional — attached when suggestion is numeric
    r_multiple_now: number;
    r_multiple_proposed: number;
    window_days: number;
  };
  requires_user_approval: true;               // constant — always true, in all modes
  expires_at: number;                         // suggestion goes stale after N days
}
```

### Seven concrete tuning primitives (what the user actually sees)

1. **Mandate-hardness auto-calibration.** `mandate_pnl_edges.r_stdev` rising 40%+ over 14 days → `MandateSuggestion.edit` with lower `sizing.kelly_mult`. Chat message: *"Your funding-shorts mandate has gotten noisier — variance up 42% over 14 days. Proposing kelly_mult 0.35 → 0.25. Accept?"*
2. **Dead-mandate consolidation.** `dead_mandates` contains 2+ mandates unused for 30+ days → `MandateSuggestion.revoke` for each, with `justification` showing last fire date and expected trigger rate. Avoids mandate clutter.
3. **Trigger tuning via backtest.** L3 replays last 90 days of funding history against current `trigger.funding_bps.gte = 8` → finds optimal at 9 → `MandateSuggestion.edit` with `backtest_delta: { r_multiple_now: 1.2, r_multiple_proposed: 1.7, window_days: 90 }`. User sees the delta, decides.
4. **Scope tightening on drift.** `mandate_drift[id] > 0.5` → `MandateSuggestion.edit` narrowing scope (e.g., remove `short` from `sideAllowed`, or narrow coin list). Chat: *"funding-shorts has drifted — 60% of fires went against mandate intent last 20 fires. Proposing to remove ETH from scope."*
5. **Persona evolution.** `chat_style_signal.verbosity_preferred = "terse"` after user dismissed last 10 full receipts without reading → `PersonaDirective.set_verbosity` flips chat output to one-sentence summaries. Silent; the agent just gets quieter.
6. **Warning escalation style.** User clicked through 5 consecutive regime-change warnings without pausing → `PersonaDirective.escalate_warnings { kind: "regime_change", force_modal: true }`. Future regime warnings become a hard modal until the user acknowledges. Also silent.
7. **Cross-mandate merger.** `overlapping_mandates` contains `[mandateA, mandateB]` with 80%+ scope overlap → `MandateSuggestion.grant` for a unified mandate + `MandateSuggestion.revoke` for the two originals, bundled so the user decides once.

### Safety — four hard rules (mirroring the L3→L2 rules)

1. **L3 NEVER signs mandates.** `MandateSuggestion` always queues for user signature through the existing `MandateEditor` flow. The only thing new is L3 *proposes proactively* now, rather than waiting for the user to open `MandateEditor`.
2. **`PersonaDirective` cannot touch execution.** The payload shape is whitelist-only: verbosity, tone, warning escalation, UI flags. `payload` fields that name `abilities`, `sizing`, `scope`, `trigger`, `exits`, or any execution-determining mandate field are rejected by `AgentWallet.applyPersona()` at the boundary — not trusted from L3.
3. **`MandateSuggestion` never auto-applies — even in Game-Mode.** Unlike `LearningUpdate`, there is no `requires_user_approval: false` branch. The type literally has `requires_user_approval: true` as a constant. Any implementation that ignores this breaks the authorization contract.
4. **Revertible.** Every accepted `MandateSuggestion` preserves the signed predecessor mandate in L1's `MandateLedger`. User can open "Agent history" in L3's BotBoard and one-click revert to any previous mandate version — each revert is itself a new signature.

### TuneChannel API — the wire

```ts
// L3 side (inside @chartrunner/terminal)
import { TuneChannel } from "@chartrunner/terminal";
const tune = TuneChannel.attach({ agents: [ agentHL.id, agentSol.id ] });
tune.publishDirective(directive);
tune.publishSuggestion(suggestion);
tune.on("applied",  (id) => ...);           // PersonaDirective applied
tune.on("signed",   (id, sig) => ...);      // user signed a MandateSuggestion
tune.on("declined", (id, why) => ...);      // user declined
tune.on("expired",  (id) => ...);           // user never acted; suggestion went stale

// L1 side (inside @chartrunner/agent)
import { subscribeTune } from "@chartrunner/agent";
subscribeTune({
  onDirective: (d) => agent.applyPersona(d),
  onSuggestion: async (s) => {
    const decision = await ui.showMandateSuggestion(s);     // chat modal w/ justification + diff
    if (decision === "sign") return await agent.signAndApply(s);
    return { declined: decision };
  },
});
```

Transport: same WebSocket pipe as the L3→L2 CoachChannel. Four new ops: `tune.directive`, `tune.suggestion`, `tune.signed`, `tune.declined`. Existing ops untouched.

### Mapping — what in the stack produces the raw material

| AgentModel input | Source | Role |
|---|---|---|
| receipt stream | `AgentReceipt` payload (M5 deliverable) | per-mandate PnL → `mandate_pnl_edges` |
| mandate history | `AgentMandate` + `sdk/replay.py` (Phase 1 M4) | fire-rate + dead-mandate flag |
| drift score | `AgentReceipt.payload.reason` vs `AgentMandate.trigger` | `mandate_drift` |
| chat style signal | User reactions to `AgentChat` outputs (accept/dismiss rates) | `chat_style_signal` |
| overlap detection | Pure `AgentMandate.scope` diff across same agent | `overlapping_mandates` |
| gate breakdown | `hl/gate_logic.ollama_pre_trade_gate` result attached to receipt | adjusts `mandate_drift` + edge estimates |

No new stack modules. Every ingredient is already defined by Phase 1 + M5 deliverables. The TuneChannel just assembles them and pushes *up*.

### How L3→L1 and L3→L2 compose

The two channels cover non-overlapping surfaces but share infrastructure. `CoachChannel` publishes `Profile`-level changes (what the *player* sees and feels in the game). `TuneChannel` publishes `Agent`-level changes (what the *agent* does, says, and is authorized to do). One WebSocket transport, one Ollama instance, one event schema, two downstream consumers. The L3 `ThesisEngine` tags each insight with its target layer — some insights fire a `CoachingDirective` (e.g. "you overtrade London"), some fire a `MandateSuggestion` (e.g. "your funding-shorts mandate needs hardening"), some fire both ("overtrade London" → dim L2's session + scope-tighten the London-firing mandate).

**Coordination rule — avoid contradicting yourself.** The two channels can accidentally disagree. The canonical failure case: CoachChannel issues `surface_ability { id: "funding-compass" }` (L2 surfaces the ability because `ability_edges.funding-compass.r_mean > +1.5`) while TuneChannel simultaneously proposes `MandateSuggestion.revoke` on the *only* mandate whose trigger authorizes that ability's execution. Result: the player sees a promoted ability with no authorized path from intent to fill. Rule: before `TuneChannel` publishes `MandateSuggestion.revoke` or `MandateSuggestion.edit` that *narrows* a mandate's scope, it must query `CoachChannel` for active `surface_ability` or `confidence_meter` directives keyed to any ability whose only authorization path runs through the mandate being touched. If a match exists, the two channels **bundle into a single user-facing decision** (modal shows both the ability-demotion and the mandate-revoke as linked consequences) or the weaker directive is withdrawn. Enforced at `ThesisEngine.publish()`, not trusted from either channel. Same check applies symmetrically in the other direction: before `CoachChannel` publishes `warn_before_fire` on an ability, TuneChannel must not simultaneously be proposing to *loosen* the mandate that authorizes it — mixed signals confuse the player.

---

## Competitive primitives (the social layer)

Five formats, shipping progressively. They all share one rule: **competition rides L2, prize escrow rides L1, spectation rides L3.**

### 1. 5-min Paper-PnL-Race (same candle-seed)

- Two or more players hit "Start" simultaneously. Server picks a seed from `mulberry32` and a 5-minute HL candle window.
- Every player's `ChartHost` replays the same candles at 30× speed. Same seeds for particles/RNG → bit-for-bit fair.
- `BrokerAdapter.name === "paper"`. No money moves. Winner = highest realized PnL at t=5min.
- Ships first — zero on-chain needed.

### 2. 24h Real-Money-Bracket (position-limited)

- Each entrant funds an `AgentWallet` with $X (capped, e.g. $100).
- Agent mandate is auto-set to: single bracket open at a time, max leverage 5x, TP/SL enforced.
- At t=24h agent snapshots equity. Highest equity wins escrow.
- Requires L1 + escrow contract. Sponsored variant sends prize to winner's wallet.

### 3. ELO Season Leaderboard

- Every Paper-Race and Real-Bracket result feeds an ELO table keyed by wallet.
- Profile-aware: separate ELO for `solana-degen` and `hl-perp` tracks.
- Season = quarterly. Top-K qualifiers get auto-entry to sponsored finals.

### 4. Sponsored Prize-Pool Event

- Sponsor (protocol, DEX, L1) escrows prize in an `events/sponsored.py`-deployed contract.
- Entry = mandate-signed stake (refundable at end) + opt-in to sponsor-branded skin.
- Format overlay: any of the above competitive primitives + branded profile.

### 5. Format overlays — 5v5 and 1vAll

- **5v5** — two teams of five play the same Paper-Race or 24h-Bracket. Team score = sum of individual scores.
- **1vAll** — one "house" player (often a live bot from the trading-stack, or a known pro) plays the same seed as N challengers. Challengers only need to beat the house, not each other.

### Anti-cheat (shared across all formats)

- Paper-Race: server re-runs the same seed + same ability-fire timestamps → must reproduce the claimed PnL. `sdk/replay.py` (Phase 1 M4) stores the signed run; Phase 2 verifies.
- Real-Bracket: on-chain receipts are ground truth. The `AgentReceipt` signature makes the claim non-repudiable.

---

## Milestones — M5 through M8

Phase 1 ends at M4 (`signed-testnet` + `live` gating shipped). Phase 2 picks up from there.

**M5 — L1 Agent-Wallet on HL (3 weeks).** Ship `@chartrunner/agent` with HL-EVM AA adapter only. Integrate with existing `hl_bot` via `signal_bus`: agent emits signed mandates, `sdk/risk_guard.py` validates, `hl_bot` executes. Demo: user grants "funding-shorts" mandate from a web page, sees first fill in chat. Solana adapter stubbed.

**M6 — L2 Chart-Embed + Dual-Profile + Game/Live split (3 weeks).** Ship `@chartrunner/chart`, `@chartrunner/profiles` (both profiles), `@chartrunner/modes` (both modes). Reference-App (`ChartRunner_Prototype.html`) gets the profile picker and mode toggle in the menu drawer. Five external embed demos working: a personal blog, a DEX site (DexScreener embed), a Discord dashboard, a Twitch overlay, a hackathon landing page. Solana-Degen profile wired to a Jupiter-paper adapter for validation before M7 adds Solana-live.

**M7 — L3 Terminal MVP + both Learning Channels + L1 Solana adapter (6 weeks, +2 from original estimate).** Ship `terminal/` as Tauri binary (smaller than Electron). Includes BotBoard + BehaviorTape + ThesisEngine. **Ships both feedback channels: L3→L2 (`CoachChannel` + `PlayerModel`) and L3→L1 (`TuneChannel` + `AgentModel`).** They share 80% of infrastructure (one WS transport, one Ollama, one event schema) so the +2 weeks vs original estimate is only the L1-side work — not double-cost. CoachChannel covers all 7 L2 primitives; TuneChannel covers all 7 L1 primitives. Game-Mode applies CoachChannel updates silently; Live-Mode opens a confirm modal. **MandateSuggestion always requires user signature in all modes** — no silent path. Finish `@chartrunner/agent` Solana PDA-session adapter — session key signs trades within mandate-scope, expires with mandate. First live Solana-degen mandate execution. Terminal watches both HL and Solana agents side-by-side. Two regressions: (a) 20-session playtest where PlayerModel measurably converges (variance_footprint stdev drops by ≥15% over sessions 10–20); (b) 30-day shadow-run where AgentModel proposes ≥5 MandateSuggestions, with ≥80% rated "useful" by Julian in a manual review pass.

**M8 — Tournament-SDK + first sponsored event (4 weeks).** Ship `@chartrunner/tournament` with the five formats. Deploy `events/sponsored.py` escrow on HL-EVM + Solana. Hold the first 5-min Paper-PnL-Race hackathon on Twitch — 64-player single-elim bracket, same-seed each round. Use the event to bug-hunt the anti-cheat replay pipeline. **Both CoachChannel and TuneChannel stay off during tournaments** — same-seed races must be identical across players, and agents in Real-Money-Brackets must run the exact mandate they were entered with (no mid-race mandate suggestion). Force-disabled in `@chartrunner/tournament`, not a trusted flag.

Total Phase 2 timeline: ~16 weeks after Phase 1 M4. First sponsored event is the validation gate.

---

## Open decisions that Phase 2 defers

- **Mobile / touch controls.** Still deferred (Phase 1 deferred it too). PWA wrap is a candidate for Phase 3.
- **Per-profile marketplace.** Third-party authored profiles (e.g. a Pendle-yield profile) could be a later addition — need a signing + review story first.
- **L3 multi-tenant.** The terminal stays single-user/local-first through M8. A team/desk shared terminal is future work.
- **Cross-venue portfolio.** Each agent in M5–M7 is single-venue. A "cross-venue" agent that re-allocates between HL and Solana based on regime is deferred.
- **KYC / geofencing.** Sponsored-event escrow will likely require it; holding until M8 forces the design decision.

---

## Mapping — how Phase 1 modules become Phase 2 product surface

Phase 1 extracted five interfaces. Every one of them shows up in Phase 2 with a consumer-facing wrapper:

| Phase 1 interface (M1 shipped) | Phase 2 consumer surface | Role |
|---|---|---|
| `ChartHost` | `@chartrunner/chart` embed, `<chartrunner-embed>` web component | host-agnostic chart on any site |
| `AbilityRegistry` | `@chartrunner/profiles` selects a subset per profile | ability catalogue per persona |
| `BrokerAdapter` | `@chartrunner/agent` with `AgentWallet` wrapping a live `BrokerAdapter` | mandate-scoped custody in front of Phase 1 execution |
| `SignalFeed` | L3 `BehaviorTape` + `ThesisEngine` consume same WS feed | signals become thesis input |
| `RiskManager` | Phase 2 `Profile.risk_curve` parameterizes per-persona | risk is personality-scoped |
| `sdk/server.py` (M3) | Multi-agent bridge — one WS per `AgentWallet`, not one per browser | server scales to event loads |
| `sdk/risk_guard.py` (M4) | Enforces `AgentMandate` as well as `hl_bot` policy | mandate = runtime constraint |
| `sdk/replay.py` (M4) | Tournament anti-cheat verifier + L3 `PlayerModel` + `AgentModel` event source | replays same seeds; feeds both learning loops |
| `hl/gate_logic.record_shadow_rejection` | Shadow-Mirror personalization source in `CoachingDirective.shadow_replay` | rejected-trade ghosts = real what-ifs |
| `shared/intelligence.get_regime_label` | `PlayerModel.regime_fit` bucket | session/regime breakdown for the learning loop |
| M5 `AgentReceipt` stream | `AgentModel.mandate_pnl_edges` + `mandate_drift` | L3→L1 TuneChannel's primary input |
| M5 `AgentMandate` history | `AgentModel.mandate_fire_rates` + `dead_mandates` + `overlapping_mandates` | mandate-lifecycle analysis |

The consumer product doesn't add a single new invariant to Phase 1. It just exposes the Phase 1 surfaces to a second audience (end-users) in addition to the first (stack developers). **The two new primitives are the L3→L2 CoachChannel and the L3→L1 TuneChannel**, and even they are assembled from existing stack signals + M5 deliverables — not new data sources.

---

## Verification checklist for this doc

Before starting M5, a subagent should verify:

1. `trading-stack/sdk/web/core/` exports the five interfaces named above (`ChartHost`, `AbilityRegistry`, `BrokerAdapter`, `SignalFeed`, `RiskManager`) and they are stable.
2. `shared/signal_bus.py::emit_signal` accepts a `source="chartrunner-agent"` value without any stack-side change (Phase 1 already accepts `source="chartrunner"`).
3. `hl/gate_logic.py::ollama_pre_trade_gate` is callable from a per-mandate context — i.e. takes coin + side + metadata, not a stack-global implicit state.
4. Ollama `qwen2.5:14b` on Umbrel (`CLAUDE.md` §Ollama Integration) is reachable from a desktop Tauri app over Tailscale (same access model as the existing stack).
5. `sdk/replay.py` schema accommodates per-round seeds and per-ability fire timestamps, not just per-run summaries.
6. HL-EVM AA support on Hyperliquid's current mainnet config (Hyperliquid ships HL-EVM as of 2025 — verify block-height and current Account-Abstraction bundler availability before committing M5 timeline).
7. The dual-profile `AbilityRegistry` doesn't break Phase 0 hard-rule #6 ("topbar holds at most five elements"). If the profile picker enters the topbar it must push something into the menu drawer.
8. The `L3 → L2 Learning Channel` section does not let L3 bypass any Phase 1 risk primitive. Specifically: (a) `LearningUpdate` patch fields are a strict subset of `Profile` non-identity fields, (b) all `LearningUpdate` changes funnel through a single `Profile.applyUpdate()` method that enforces the four hard clamps (`kelly_mult ∈ [0.1, 0.5]`, `max_consecutive_losses ∈ [2, 6]`, ability whitelist can remove-or-reorder only, mandates are untouched).
9. `CoachingDirective.shadow_replay` pulls from the *actual* `shadow_portfolio` (via `hl/gate_logic.record_shadow_rejection`), not a fabricated ghost. The personalized Shadow Mirror must reference real historical rejections with real outcomes, or the learning loop is lying to the player.
10. During tournament play (M8), the `CoachChannel` is force-disabled per-session so same-seed races stay fair. This should be a hard check in `@chartrunner/tournament` — not a trusted caller flag.
11. The L3→L1 `TuneChannel` preserves Phase 1's mandate-signing invariant: `MandateSuggestion` always carries `requires_user_approval: true` as a *constant* (not a field), and `AgentWallet.applyMandate` rejects any suggestion that arrives without a fresh user signature. No "paper-mode shortcut" exists. Search the final implementation for any branch that skips signing and flag it.
12. `PersonaDirective.payload` shape is whitelist-enforced at `AgentWallet.applyPersona()`. Any payload field naming `abilities`, `sizing`, `scope`, `trigger`, or `exits` is rejected at the L1 boundary — not trusted from L3. Verify the boundary check exists and is tested with 10+ adversarial payloads before M7 ships.
13. During tournament play (M8), *both* `CoachChannel` and `TuneChannel` are force-disabled. A mid-race MandateSuggestion changing an agent's kelly_mult during a Real-Money-Bracket would violate entry-terms — the tournament contract specifies the mandate at entry and it must not change mid-race.
14. The two channels do not contradict each other on the same session. Before `TuneChannel` publishes a `MandateSuggestion.revoke` or scope-narrowing `MandateSuggestion.edit`, `ThesisEngine.publish()` must verify no active `CoachChannel` directive (`surface_ability` or `confidence_meter`) depends on the mandate being touched. If dependency exists, the two actions bundle into a single user-facing decision modal or the weaker directive is withdrawn. Test with 5+ scripted contradiction scenarios before M7 ships — a promoted ability with no authorized execution path is a product bug, not a feature.

A verification subagent should also read the Phase 1 SDK doc and this doc side-by-side and flag any naming collisions or semantic drift between `BrokerAdapter` (Phase 1) and `AgentWallet` (Phase 2). They are related — `AgentWallet` *wraps* a `BrokerAdapter` internally (it owns one as a private field and exposes a narrower, mandate-scoped surface) — and the code must make that composition explicit rather than reshaping the Phase 1 contract.

Also: Phase 1 M3 and M4 are prerequisites for Phase 2 M5. Before starting M5, confirm `sdk/server.py`, `sdk/signal_adapter.py`, `sdk/risk_guard.py`, and `sdk/replay.py` have all shipped. If Phase 1 M3/M4 slip, M5's timeline slides with them — the `AgentWallet → signal_bus` path depends on the bridge and the guard both being in place.

---

*End. Next step after approval: decide which layer to build first. Recommendation: **start M5 (L1 Agent-Wallet on HL)** because it reuses the most Phase 1 infrastructure (HL + `hl_bot` + `signal_bus`) and produces the most leverage — without L1 there's nothing for L2 to embed or L3 to watch. L2 chart-embed and L3 terminal both depend on L1 receipts as their data source.*
