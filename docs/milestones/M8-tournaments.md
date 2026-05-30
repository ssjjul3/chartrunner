# M8 — Battle Token launch tournaments

**Status:** 🔵 QUEUED (capstone of the social + on-chain gaming arc)
**Theme:** 1v1 / 2v2 / NvN Battle Token launches. A tournament creates or binds a new token, locks a modular share of supply into arena vaults, streams the whole event on RUN-tube, and distributes claimable supply after the final match/map record settles on-chain. Entry + payouts can use CASH/RUN/accepted SPL mints. World ID gates human lanes; explicit paid bot lanes keep agents welcome but fee-bearing.

## Completion condition (all required)

- [ ] Battle Token launch primitive on-chain (prefer dedicated `chartrunner_battle` program)
- [ ] Modular supply vaults (arena, creator, community, protocol, liquidity, burn)
- [ ] Tournament matchmaking (1v1, 2v2, royal rumble, last-man-standing, on-time, full tournament bracket)
- [ ] CASH stablecoin entry fee + payout (escrow on-chain)
- [ ] World ID proof-of-human gate before match start
- [ ] Explicit bot lanes with paid entry, map licensing, and certified bot identity
- [ ] Live spectator mode (stream the match — depends on M7)
- [ ] Match settlement: final `chartrunner_match` result binds to battle distribution
- [ ] Execution receipt binding for Blue Laser trades that affect event settlement
- [ ] Map + RUN-tube record binding (final replay hash + stream/VOD manifest hash)
- [ ] Claim/distribution flow for winners, teams, creators, viewers, and community allocations

## Imminent-solvables

### Ready bucket

> **Brainstorm-linkage note (2026-05-28):** M8 is the **centerpiece of the founding Sep 11 GDD's Game-Theory Backbone** — closed PvP arenas with synthetic seeds, escrow on both sides, payouts on objective measures (PnL ratio, mission criteria, time-to-objective), Sharpe-ELO matchmaking. The `chartrunner_match` on-chain primitive is already deployed (memory: `chartrunner_anchor_deploys`, 2026-05-20). The remaining gap = matchmaking server + closed-arena seed feeder + Sharpe-ELO calc + UI surface, all of which are already enumerated in the Blocked bucket below. Cross-ref: [`BRAINSTORM_VS_SHIP_2026-05-28.md`](../../BRAINSTORM_VS_SHIP_2026-05-28.md) §"Top 3 founding-doc priorities still on the table" item 1.

> **OpenClaw data-infra crossmap (2026-05-28):** the **closed-arena seed feeder** in the Blocked bucket can pull deterministic seeds from the 79 GB Umbrel corpus (`/opt/data/chartrunner/`, 381M rows across 7 exchanges; Bybit / OKX / Binance most candle-complete). Combined with `coin_profiles/` regime tags (bull / bear / crab / altseason + volatility band), the seed feeder can serve **regime-balanced match seeds** for fair Sharpe-ELO matchmaking — the GDD §3 "deterministic leaderboards" idea, but realised over real-but-fixed candle windows rather than the GDD's "synthetic processes per VRF-seed." Also enables **`tick_player` anti-cheat baseline** (the MagicBlock audit's open issue): if the seed is a known historical window, max-attainable PnL is computable in advance and out-of-band scores can be flagged. Cross-ref: [`MILESTONE_AUDIT.md` 2026-05-28 addendum](../../MILESTONE_AUDIT.md).

> **Initial 4 Ready-bucket items done 2026-05-20** (auto-resolve sweep). The 2026-05-29 Battle Token addendum extends M8 from generic token launches into a standardized launch-arena contract path.

- [x] 2026-05-20 — `[D]` World ID research — `docs/architecture/M8-world-id.md`. Viable on Solana in 2026 via Wormhole's `solana-world-id-program`; recommend off-chain verify + server-signed seat for v1.
- [x] 2026-05-20 — `[D]` CASH stablecoin docs — `docs/architecture/M8-cash.md`. CASH is a plain SPL token (Phantom, USD 1:1 via Bridge); mint/burn is issuer-side, ChartRunner only escrows. Full escrow PDA design (Tournament/Vault/Seat) + invariant checklist; recommended mint-agnostic.
- [x] 2026-05-20 — `[D]` Bracket UX research — `docs/architecture/M8-bracket-ux.md`. chess.com / BLAST / Magic Eden patterns mapped to ChartRunner's 1v1 / royal-rumble / bracket modes.
- [x] 2026-05-20 — `[O]` MagicBlock audit — `docs/architecture/M8-magicblock-audit.md`. `chartrunner_match` is a complete realtime PvP scoreboard (init/join → delegate → `tick_player` → `commit_and_finish`). M8 still needs a token-launch primitive, the CASH escrow, a World ID gate before `join_match`, and **anti-cheat on `tick_player`** (scores are self-reported/unbounded) before money rides on it. Source auditable now; deploy gated on Rust 1.85.
- [x] 2026-05-29 — `[D]` Battle Token Launch Arena standard — `docs/architecture/M8-battle-token-launch-arena.md`. Defines the tournament-created token envelope: fixed supply, modular vaults, arena reserve, creator/community/protocol/liquidity/burn allocations, bot lanes, RUN-tube binding, map records, claim flow, and milestone plan. This turns the old "token launch primitive" blocker into an implementable `chartrunner_battle` program path.
- [x] 2026-05-30 — `[D/O]` Battle Token economy runthroughs — `docs/architecture/M8-battle-token-economic-runthroughs.md` + `docs/architecture/M8-sim/battle_token_event_model.py`. Tests sealed/private, allowlist, fixed-price sale, public CPMM, dynamic-fee launch pool, delayed public handoff, and chaos/bot arena models. Recommends **private match, public token**: score the tournament on a canonical map/virtual AMM, then open public CPMM after settlement.
- [x] 2026-05-30 — `[D]` Battle Token event scaffolds — `docs/architecture/M8-events/`. Adds schema, fillable event templates, operations plan, event catalog, and `chartrunner_battle` contract scaffold for Human Fair Launch, Creator Allowlist Duel, Sponsored Creator Launch, Bot League Launch, Community Fixed-Price Sale, and Public Chaos Arena.
- [x] 2026-05-30 — `[D]` On-chain execution plan — `docs/architecture/M8-onchain-execution-plan.md` + `docs/architecture/M8-events/plans/onchain-execution-runbook.md`. Defines Blue Laser execution as `TradeIntent -> broker transaction -> ExecutionReceipt`, with maps attached only for recorded runs, tournaments, Battle Tokens, copytrade, and replay/leaderboard contexts.

### Blocked bucket

- [ ] `[O]` Battle Token program implementation — **BLOCKED:** needs config-schema simulator, contract scaffold, and M0.5 audit slot.
- [ ] `[D]` Tournament matchmaking server (centralized v1) — **BLOCKED:** primitive designed.
- [ ] `[D]` CASH escrow contract — **BLOCKED:** CASH docs + M0.5 audit slot.
- [ ] `[D]` World ID gate wired into match start — **BLOCKED:** research done + bracket UI.
- [ ] `[D]` Match settlement on-chain — **BLOCKED:** `chartrunner_match` exists, but Battle Token settlement integration and anti-cheat hardening are pending.
- [ ] `[D]` Execution receipt program/design integration — **BLOCKED:** needs decision between temporary registry-style records and dedicated `chartrunner_execution`.
- [ ] `[D]` Live spectator mode — **BLOCKED:** M7 streaming connectors live.
- [ ] `[O]` Tournament simulation — 100 synthetic 1v1 matches, capture settlement edge cases — **BLOCKED:** settlement live.
- [ ] `[O]` Battle Token adversarial simulation — deeper follow-up for collusion rings, no-shows, coordinated outside buys, claim timing, and bot-lane fee elasticity — **BLOCKED:** contract schema + settlement path.

### Done bucket

- [x] 2026-05-29 — Battle Token Launch Arena concept and milestone map preserved in `docs/architecture/M8-battle-token-launch-arena.md`.
- [x] 2026-05-30 — Battle Token market-access and AMM runthroughs preserved in `docs/architecture/M8-battle-token-economic-runthroughs.md`.
- [x] 2026-05-30 — Event scaffolds and operational plans preserved in `docs/architecture/M8-events/`.
- [x] 2026-05-30 — Blue Laser on-chain execution and map policy preserved in `docs/architecture/M8-onchain-execution-plan.md`.

## State

- Progress: 8 design/research items done. Remaining build chain: Battle Token program, matchmaking, CASH/RUN escrow, World ID gate, match settlement, execution receipt integration, spectator/RUN-tube binding, tournament sim, and deeper adversarial Battle Token sim.
- Blockers active: 9
- Scheduled today: 0

## Notes

- M8 is the social + on-chain gaming endgame — fixes the M0.9 vs M8 chasm.
- Hard dependency on M0.5 (audited programs + match/oracle deployed), M5 (Helius RPC for production reads), M7 (streaming for spectators).
- The Arena sub-mode picker in current `ChartRunner_Prototype.html` is already scaffolded — UI ground is partly there. v0.8k#24mz code review pending.

### Ecosystem scan 2026-05-14
- **MagicBlock** ER SDK unchanged today; devnet stack stable. M8 realtime token-launch matches still gated behind the M0.5 `chartrunner_match` deploy (which itself waits on the Anchor/Rust-1.85 unblock). No new ER mainnet signal. Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-14`.
