//! Committed economic constants for chartrunner_progression.
//!
//! Every number here is a COMMITTED value from `docs/TOKENOMICS-PAPER-v0.5.md`
//! (2026-07-15). Do not tune these casually — a change here is an economic
//! policy change and must be re-modelled + re-audited. Values marked TODO(v0.5)
//! are NOT pinned by the paper and are placeholder defaults for the audit pass.

use anchor_lang::prelude::*;

// ─── $RUN token shape ───────────────────────────────────────────────────────
/// $RUN uses 6 decimals (matches USDC-style granularity). One whole $RUN token
/// therefore equals 10^6 base units.
pub const RUN_DECIMALS: u8 = 6;
/// Base units per whole $RUN token (10^RUN_DECIMALS).
pub const RUN_BASE_PER_TOKEN: u64 = 1_000_000;

/// FIXED total supply: 100,000,000 $RUN. No inflation — minted exactly once by
/// `init_run_mint`, then the mint authority is handed to the Squads vault at TGE
/// and (post-distribution) never mints again. All later scarcity comes from the
/// burn sinks below, so effective supply only ever DECREASES.
///   100_000_000 * 10^6 = 100_000_000_000_000 base units.
pub const RUN_TOTAL_SUPPLY: u64 = 100_000_000 * RUN_BASE_PER_TOKEN;

// ─── Genesis allocation (minted once at init, in base units) ────────────────
// Sums to exactly 100_000_000 $RUN. init_run_mint asserts this invariant.
pub const ALLOC_RESERVE: u64 = 70_000_000 * RUN_BASE_PER_TOKEN; // conversion-valve backing
pub const ALLOC_CAMPAIGN: u64 = 7_000_000 * RUN_BASE_PER_TOKEN;
pub const ALLOC_LIQUIDITY: u64 = 7_000_000 * RUN_BASE_PER_TOKEN;
pub const ALLOC_TEAM: u64 = 8_000_000 * RUN_BASE_PER_TOKEN;
pub const ALLOC_ECOSYSTEM: u64 = 5_000_000 * RUN_BASE_PER_TOKEN;
pub const ALLOC_COMMUNITY: u64 = 3_000_000 * RUN_BASE_PER_TOKEN;

/// R0 — the reserve size at genesis. Anchors the reserve-level float
/// (see math::reserve_multiplier_x1000). Equal to ALLOC_RESERVE by definition.
pub const RESERVE_INITIAL: u64 = ALLOC_RESERVE;

// ─── Conversion valve ($CHART is OFF-CHAIN; program receives a signed claim) ─
/// Base rate: 100 $CHART → 1 $RUN, at a full reserve. `$CHART` is a whole-unit
/// off-chain integer (no on-chain decimals), so this is 100 CHART tokens per
/// 1.000000 $RUN.
pub const BASE_RATE_CHART_PER_RUN: u64 = 100;
/// 2% tax on the $CHART side, burned (i.e. it reduces the credited $RUN). Since
/// $CHART lives off-chain, the "burn" is realised by simply crediting less $RUN.
pub const CONVERSION_TAX_BPS: u64 = 200; // 2.00%
/// Daily mint cap: 50 $RUN per wallet per UTC day (base units). Tracked in a
/// per-wallet PDA with a day-index reset (see state::WalletDailyMint).
pub const DAILY_CAP_RUN_BASE: u64 = 50 * RUN_BASE_PER_TOKEN;
/// Per-run ceiling: at most 600 $CHART may be attributed to a single run
/// (= 6 $RUN of convertible value at base rate). Enforced at the claim boundary.
pub const PER_RUN_CHART_CEILING: u64 = 600;
/// UTC day length, for the daily-cap day index (unix_ts / SECONDS_PER_DAY).
pub const SECONDS_PER_DAY: i64 = 86_400;

// ─── $RUN sinks ─────────────────────────────────────────────────────────────
// NFT / cosmetic mint: 50% burned, 50% to treasury.
pub const COSMETIC_BURN_BPS: u64 = 5_000;
pub const COSMETIC_TREASURY_BPS: u64 = 5_000;
// Tournament entry pool: 90% winners pool / 7% treasury / 3% burn.
pub const TOURNAMENT_WINNERS_BPS: u64 = 9_000;
pub const TOURNAMENT_TREASURY_BPS: u64 = 700;
pub const TOURNAMENT_BURN_BPS: u64 = 300;
// Marketplace ($RUN) sale: 2% burned, remainder to seller.
pub const MARKETPLACE_BURN_BPS: u64 = 200;
// $SOL P2P transfer fee: 2.5% (lamports), to treasury.
pub const SOL_P2P_FEE_BPS: u64 = 250;

// Agent monthly licence: 10 $RUN / month, BURNED.
pub const AGENT_LICENCE_RUN_BASE: u64 = 10 * RUN_BASE_PER_TOKEN;
/// One licence period = 30 days.
pub const AGENT_LICENCE_PERIOD_SECS: i64 = 30 * SECONDS_PER_DAY;

// ─── Licensed-agent-market defaults ─────────────────────────────────────────
// TODO(v0.5): the paper pins the SINK STRUCTURE (that bots pay $RUN for
// permissions) but not these exact prices. These are placeholder defaults for
// the audit / economic-review pass — MK-review must confirm or replace them.
/// Per-read micro-fee a bot pays to consume a licensed map's live signal.
/// 0.001 $RUN per read (1_000 base units). // TODO(v0.5): confirm micro-fee.
pub const READ_FEE_MICRO_BASE: u64 = 1_000;
/// Copytrade permission fee, in bps of the notional (paid in $RUN base units).
/// 1.00%. // TODO(v0.5): confirm copytrade rate.
pub const COPYTRADE_FEE_BPS: u64 = 100;
/// One-time agent certification fee (burned-to-treasury). 25 $RUN.
/// // TODO(v0.5): confirm certification price.
pub const CERT_FEE_RUN_BASE: u64 = 25 * RUN_BASE_PER_TOKEN;

// ─── Creator Vault take-rates (P3 → MK3) ────────────────────────────────────
// Research-validated in `ChartRunner-Brain/raw/perplexity/2026-07-17-P3-creator-
// take-rates.md` (P3): a 10% platform take is LOW vs. comps — Roblox / Unity /
// Steam / TradingView cluster at 25–50% platform share — so it reads as
// "defensible and generous". These are the Creator Vault levers (MK3) and are
// DELIBERATELY SEPARATE from `protocol_fee_bps` below (the general-marketplace
// fee, MK1): different sinks, different owners, tuned independently. Rule from
// P3: the platform take applies to the BASE price ONLY, never to the royalty.
//
/// Creator Vault platform take on PRIMARY sales: 10% (1000 bps) → treasury.
/// Creator-friendly by design (P3/MK3). On a 10-$RUN map this is 1 to the
/// platform, 9 to the creator. Governance may layer a promotional override on
/// top (e.g. "Season 0: 5%") and carve a sponsor-prize-pool share out of this
/// take — reserve that capability at the config/governance layer, not here.
pub const CREATOR_VAULT_TAKE_BPS: u16 = 1_000; // 10% — P3/MK3 primary platform take
/// Secondary-sale royalty DEFAULT paid to the creator-defined split: 5% (500 bps).
/// Paid to the CREATOR (never the platform) on resale, on the base price only.
pub const ROYALTY_DEFAULT_BPS: u16 = 500; // 5% — P3 secondary royalty default
/// Secondary-sale royalty for PREMIUM / co-authored maps: 10% (1000 bps).
/// Still paid to the creator split; a creator may set `MapLicense.royalty_bps`
/// anywhere up to MAX_ROYALTY_BPS (50%), with this as the recommended premium tier.
pub const ROYALTY_PREMIUM_BPS: u16 = 1_000; // 10% — P3 secondary royalty (premium)

// ─── Governance ─────────────────────────────────────────────────────────────
/// Live protocol fee starts at 0 (MK1). Admin may later set it, but only within
/// [MIN_ACTIVE_FEE_BPS, MAX_PROTOCOL_FEE_BPS] (or back to 0 to disable). The
/// hard ceiling is a trust commitment that survives a key compromise: even a
/// hijacked admin cannot impose a predatory fee.
/// NOTE: this is the GENERAL-marketplace fee (MK1) — a SEPARATE lever from the
/// Creator Vault take (CREATOR_VAULT_TAKE_BPS, MK3) above. They can both apply to
/// a creator-vault sale as distinct line items; do not conflate or collapse them.
pub const PROTOCOL_FEE_BPS_INIT: u16 = 0;
pub const MIN_ACTIVE_FEE_BPS: u16 = 200; // 2%  (per MK1: settable 200–500 bps)
pub const MAX_PROTOCOL_FEE_BPS: u16 = 500; // 5%  hard ceiling

/// Squads V4 2-of-3 multisig vault. At TGE the mint authority + protocol admin
/// are transferred here. // TGE: transfer mint authority to Squads vault.
pub fn squads_vault() -> Pubkey {
    anchor_lang::solana_program::pubkey!("fK1J2TLk2qLy3cjtiSYDSuCnWuxezphBcdqNGZEpVsp")
}
