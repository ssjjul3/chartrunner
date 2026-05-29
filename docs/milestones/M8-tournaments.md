# M8 — Token launch tournaments

**Status:** 🔵 QUEUED (capstone of the social + on-chain gaming arc)
**Theme:** 1v1 / 2v2 / NvN player token launches. Each player controls a token's supply, fights on the chart, wins opponent supply as reward. Entry + payouts in CASH (Phantom-backed stablecoin, Frontier-recommended). World ID proof-of-human gate against bot farms.

## Completion condition (all required)

- [ ] Token launch primitive on-chain (new instruction in `chartrunner_registry` or a dedicated tournament program)
- [ ] Tournament matchmaking (1v1, 2v2, royal rumble, last-man-standing, on-time, full tournament bracket)
- [ ] CASH stablecoin entry fee + payout (escrow on-chain)
- [ ] World ID proof-of-human gate before match start
- [ ] Live spectator mode (stream the match — depends on M7)
- [ ] Match settlement: winner takes opponent supply on-chain (via MagicBlock ER for realtime, settled to base layer via M5/M0.5)

## Imminent-solvables

### Ready bucket

> **Brainstorm-linkage note (2026-05-28):** M8 is the **centerpiece of the founding Sep 11 GDD's Game-Theory Backbone** — closed PvP arenas with synthetic seeds, escrow on both sides, payouts on objective measures (PnL ratio, mission criteria, time-to-objective), Sharpe-ELO matchmaking. The `chartrunner_match` on-chain primitive is already deployed (memory: `chartrunner_anchor_deploys`, 2026-05-20). The remaining gap = matchmaking server + closed-arena seed feeder + Sharpe-ELO calc + UI surface, all of which are already enumerated in the Blocked bucket below. Cross-ref: [`BRAINSTORM_VS_SHIP_2026-05-28.md`](../../BRAINSTORM_VS_SHIP_2026-05-28.md) §"Top 3 founding-doc priorities still on the table" item 1.

> **OpenClaw data-infra crossmap (2026-05-28):** the **closed-arena seed feeder** in the Blocked bucket can pull deterministic seeds from the 79 GB Umbrel corpus (`/opt/data/chartrunner/`, 381M rows across 7 exchanges; Bybit / OKX / Binance most candle-complete). Combined with `coin_profiles/` regime tags (bull / bear / crab / altseason + volatility band), the seed feeder can serve **regime-balanced match seeds** for fair Sharpe-ELO matchmaking — the GDD §3 "deterministic leaderboards" idea, but realised over real-but-fixed candle windows rather than the GDD's "synthetic processes per VRF-seed." Also enables **`tick_player` anti-cheat baseline** (the MagicBlock audit's open issue): if the seed is a known historical window, max-attainable PnL is computable in advance and out-of-band scores can be flagged. Cross-ref: [`MILESTONE_AUDIT.md` 2026-05-28 addendum](../../MILESTONE_AUDIT.md).

> **All 4 Ready-bucket items done 2026-05-20** (auto-resolve sweep).

- [x] 2026-05-20 — `[D]` World ID research — `docs/architecture/M8-world-id.md`. Viable on Solana in 2026 via Wormhole's `solana-world-id-program`; recommend off-chain verify + server-signed seat for v1.
- [x] 2026-05-20 — `[D]` CASH stablecoin docs — `docs/architecture/M8-cash.md`. CASH is a plain SPL token (Phantom, USD 1:1 via Bridge); mint/burn is issuer-side, ChartRunner only escrows. Full escrow PDA design (Tournament/Vault/Seat) + invariant checklist; recommended mint-agnostic.
- [x] 2026-05-20 — `[D]` Bracket UX research — `docs/architecture/M8-bracket-ux.md`. chess.com / BLAST / Magic Eden patterns mapped to ChartRunner's 1v1 / royal-rumble / bracket modes.
- [x] 2026-05-20 — `[O]` MagicBlock audit — `docs/architecture/M8-magicblock-audit.md`. `chartrunner_match` is a complete realtime PvP scoreboard (init/join → delegate → `tick_player` → `commit_and_finish`). M8 still needs a token-launch primitive, the CASH escrow, a World ID gate before `join_match`, and **anti-cheat on `tick_player`** (scores are self-reported/unbounded) before money rides on it. Source auditable now; deploy gated on Rust 1.85.

### Blocked bucket

- [ ] `[D]` Token launch primitive design — **BLOCKED:** existing launchpad research + audit firm decision (M0.5).
- [ ] `[D]` Tournament matchmaking server (centralized v1) — **BLOCKED:** primitive designed.
- [ ] `[D]` CASH escrow contract — **BLOCKED:** CASH docs + M0.5 audit slot.
- [ ] `[D]` World ID gate wired into match start — **BLOCKED:** research done + bracket UI.
- [ ] `[D]` Match settlement on-chain — **BLOCKED:** `chartrunner_match` deployed (M0.5).
- [ ] `[D]` Live spectator mode — **BLOCKED:** M7 streaming connectors live.
- [ ] `[O]` Tournament simulation — 100 synthetic 1v1 matches, capture settlement edge cases — **BLOCKED:** settlement live.

### Done bucket

(none yet)

## State

- Progress: 4/11 done — all 4 Ready-bucket items written 2026-05-20. Remaining 7 are the Blocked-bucket build chain (token-launch primitive, matchmaking, CASH escrow, World ID gate, settlement, spectator, sim), gated on M0.5 deploy/audit + M5/M7.
- Blockers active: 7
- Scheduled today: 0

## Notes

- M8 is the social + on-chain gaming endgame — fixes the M0.9 vs M8 chasm.
- Hard dependency on M0.5 (audited programs + match/oracle deployed), M5 (Helius RPC for production reads), M7 (streaming for spectators).
- The Arena sub-mode picker in current `ChartRunner_Prototype.html` is already scaffolded — UI ground is partly there. v0.8k#24mz code review pending.

### Ecosystem scan 2026-05-14
- **MagicBlock** ER SDK unchanged today; devnet stack stable. M8 realtime token-launch matches still gated behind the M0.5 `chartrunner_match` deploy (which itself waits on the Anchor/Rust-1.85 unblock). No new ER mainnet signal. Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-14`.
