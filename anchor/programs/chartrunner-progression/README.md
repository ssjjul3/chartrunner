# chartrunner-progression

In-house **$RUN** mint + **$CHART → $RUN** conversion valve + **licensed-agent-market**.

> ## ⛔ NOT AUDITED — NOT DEPLOYED — DO NOT BUILD/COMMIT
> This is money-minting code. It is a **SCAFFOLD** for a human + auditor to finish.
> - **Audit-gated (M0.5)** and **mainnet-gated (M10)**.
> - The toolchain is known-broken here: do **not** `anchor build` / `cargo build`.
> - `declare_id!` and the `Anchor.toml` entries are **placeholders** (`Prog11111…`).
> - Spec of record: `docs/TOKENOMICS-PAPER-v0.5.md` (2026-07-15). Every economic
>   constant/formula in the source cites it.

## What it is

Three responsibilities in one program, governed by a single `ProtocolConfig` PDA:

1. **$RUN mint** — a fixed-supply in-house SPL token. 100,000,000 total, 6 decimals,
   minted **exactly once** into six genesis allocations. No inflation; effective
   supply only ever falls via burn sinks.
2. **Conversion valve** — releases $RUN from a 70M reserve against a *signed
   off-chain $CHART claim*, at a reserve-level float rate, with a burn tax, a
   daily cap, and a per-run ceiling. It **transfers** from the reserve (never
   mints), so supply stays fixed.
3. **Licensed-agent-market** — the **T5 anti-sybil sink**. Bots grind $CHART for
   free but must spend $RUN for every *permission*: map licences, bot read fees,
   copytrade fees, agent certification, and the monthly agent licence.
   Thesis: *"$CHART = internal labor; $RUN = economic permission."*

## File tree

```
programs/chartrunner-progression/
├── Cargo.toml                 # anchor-lang 0.30.1 + anchor-spl 0.30.1, solana-program =1.18.17
├── README.md                  # this file
└── src/
    ├── lib.rs                 # banner, declare_id!(placeholder), #[program] (thin delegators)
    ├── constants.rs           # committed economic constants (v0.5)
    ├── errors.rs              # #[error_code] ProgError
    ├── math.rs               # fixed-point: reserve float, chart→run, bps, day index
    ├── state.rs              # #[account] structs + #[event]s
    └── instructions/
        ├── mod.rs
        ├── config.rs         # governance + S5 circuit breaker
        ├── mint.rs           # genesis mint + TGE authority handoff
        ├── convert.rs        # the conversion valve
        ├── sinks.rs          # cosmetic / tournament / marketplace / SOL-P2P sinks
        └── market.rs         # the licensed-agent-market
```

## Instructions

**Governance / circuit breaker (S5)**
- `init_config` — bootstrap the singleton ProtocolConfig (admin/treasury pinned to the Squads vault; fee 0).
- `set_protocol_fee_bps` — admin sets the live fee: 0, or the MK1 band 200–500 bps (hard-capped at 500).
- `pause` / `unpause` — arm/disarm the S5 kill-switch over all value-moving paths.
- `set_treasury` / `set_conversion_authority` / `set_admin` — admin authority rotation.

**Genesis mint**
- `init_run_mint` — mint the fixed 100M into the six allocation vaults, once; asserts the allocation sum.
- `transfer_mint_authority` — TGE: hand mint authority to the Squads vault.

**Conversion valve**
- `convert_chart(run_id, chart_gross)` — release $RUN for a co-signed $CHART claim (tax, float, daily cap, per-run ceiling, replay guard).

**$RUN sinks**
- `mint_cosmetic(price)` — 50% burn / 50% treasury.
- `tournament_entry(entry)` — 90% winners pool / 7% treasury / 3% burn.
- `marketplace_sale(price)` — 2% burn, remainder to seller.
- `sol_p2p_transfer(amount)` — SOL transfer with a 2.5% treasury fee.

**Licensed-agent-market (T5 anti-sybil)**
- `register_map_license(map_hash, price_run, royalty_bps)` — a creator lists a Chart Map for licensing.
- `buy_license(map_hash)` — a consumer (human OR bot) buys: creator payout / protocol fee / creator royalty.
- `pay_bot_read_fee(map_hash, reads)` — metered per-read micro-fee for consuming a map's live signal.
- `copytrade_fee(strategy_hash, notional)` — a copytrade permission fee proportional to notional.
- `certify_agent(agent_hash)` — one-time fee → a non-transferable "certified" PDA trait.
- `agent_monthly_licence()` — the 10 $RUN/mo **burned** agent fee.

## Economic constants (committed, v0.5)

| Constant | Value |
|---|---|
| $RUN total supply | 100,000,000 (fixed, 6 decimals) → `100_000_000_000_000` base units |
| Allocations | reserve 70M · campaign 7M · liquidity 7M · team 8M · ecosystem 5M · community 3M |
| Base conversion rate | 100 $CHART → 1 $RUN |
| Reserve-level float | `rate = 100 · clamp((R0 / R_remaining)^0.3, 1.0, 2.5)` → 100:1 full … 250:1 depleted |
| Conversion tax | 2% on the $CHART side, burned |
| Daily cap | 50 $RUN / wallet / UTC day |
| Per-run ceiling | 600 $CHART / run (= 6 $RUN of convertible value) |
| Cosmetic sink | 50% burn / 50% treasury |
| Agent licence | 10 $RUN / month, burned |
| Tournament entry | 90% winners / 7% treasury / 3% burn |
| Marketplace sale | 2% burned |
| $SOL P2P | 2.5% fee |
| Protocol fee | init 0; admin-settable 200–500 bps; hard cap 500 bps |
| Mint / admin authority | Squads V4 2-of-3 vault `fK1J2TLk2qLy3cjtiSYDSuCnWuxezphBcdqNGZEpVsp` |

Values marked `TODO(v0.5)` in `constants.rs` (per-read micro-fee, copytrade bps,
certification fee) are **not pinned by the paper** — placeholders for the review pass.

### Reserve float in integer math (no on-chain floats)

`(R0 / R_remaining)^0.3` is approximated by an **11-point piecewise-linear table**
in `math.rs` (`CURVE_X1000`), sampled from the true curve and linearly
interpolated in fixed-point (×1000). Because `x^0.3` is concave, straight segments
sit slightly **below** the true curve, so the valve is marginally *generous*
(credits fractionally more $RUN) inside a segment — worst case < ~0.9% of the
multiplier, always inside the [1.0, 2.5] clamp, and always biased toward the user
rather than over-restricting. The auditor must accept this band or require more
knots / an integer nth-root.

## Finish-checklist (human + auditor)

- [ ] **Generate a real program keypair** (`solana-keygen new -o target/deploy/chartrunner_progression-keypair.json`); paste its pubkey into `src/lib.rs` `declare_id!` **and** both `Anchor.toml` blocks.
- [ ] **Resolve every `// AUDIT:` marker** in the source (reserve accounting, authority checks, PDA seed collisions, the float approximation error, day-boundary clock trust, claim signature scope).
- [ ] **Confirm/replace the `TODO(v0.5)` prices** (read micro-fee, copytrade bps, cert fee) against the finalized economic model.
- [ ] **Review the fixed-point math** (float table error, rounding direction, overflow bounds) with the modeller.
- [ ] **Confirm the off-chain $CHART conversion-claim signing scheme** (what the authority signs over; replay/redirect resistance).
- [ ] **Wire the reserve vault as a config-PDA-owned token account** and verify the SPL-owner constraint at genesis.
- [ ] **Full external audit** (M0.5 gate).
- [ ] **Transfer mint + admin authority to the Squads vault** at TGE.
- [ ] **Mainnet gate (M10)** before any mainnet deploy.
