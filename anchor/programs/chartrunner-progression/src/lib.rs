//! chartrunner_progression — in-house $RUN mint + conversion valve + licensed-agent-market. SCAFFOLD, NOT AUDITED, NOT FOR DEPLOY. Spec: docs/TOKENOMICS-PAPER-v0.5.md (2026-07-15). Audit-gated (M0.5), mainnet-gated (M10).
//!
//! What this program is (three responsibilities):
//!   1. $RUN MINT — a fixed-supply (100,000,000, 6 decimals) in-house SPL token,
//!      minted exactly once into six genesis allocations. No inflation; effective
//!      supply only ever falls via the burn sinks.
//!   2. CONVERSION VALVE — releases $RUN from a 70M reserve in exchange for a
//!      signed off-chain $CHART claim, at a reserve-level float rate
//!      (100→250 $CHART per $RUN as the reserve depletes), with a 2% burn tax,
//!      a 50 $RUN/wallet/day cap, and a 600 $CHART/run ceiling.
//!   3. LICENSED-AGENT-MARKET — the T5 anti-sybil sink: bots grind $CHART free
//!      but must spend $RUN for every permission (map licences, bot read fees,
//!      copytrade fees, agent certification, monthly agent licence).
//!
//! Governance: a ProtocolConfig PDA holds the admin (Squads V4 2-of-3 multisig),
//! treasury, off-chain conversion authority, live protocol fee (init 0), the S5
//! circuit-breaker `paused` flag, and the reserve accounting the float reads.
//!
//! ⚠️ This is money-minting code. It is AUDIT-GATED and TOOLCHAIN-BLOCKED: do NOT
//!    deploy, do NOT `anchor build`/`cargo build`, do NOT commit. A human + an
//!    auditor finish it. See the program README for the finish-checklist.
//!
//! STATUS 2026-07-15: a source-only SAFETY-HARDENING pass resolved all 19
//!    `// AUDIT:` markers (see the per-marker `// AUDITED 2026-07-15:` notes).
//!    Economic constants in constants.rs are UNCHANGED. This is STILL
//!    PRE-EXTERNAL-AUDIT: several markers left a shortened `// AUDIT (external):`
//!    note flagging exactly what a human/external auditor must still decide
//!    (off-chain claim key custody, copytrade↔registry binding, resale
//!    bookkeeping, the reserve-curve table fidelity, the mint hard-revoke call).

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod math;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

// PLACEHOLDER program id. A real keypair is generated at deploy time
// (`solana-keygen new -o target/deploy/chartrunner_progression-keypair.json`),
// its pubkey pasted here AND into Anchor.toml. The all-ones-ish placeholder
// below is intentionally NOT a real, fundable address.
declare_id!("3jESG5WzfKsGze1rYeRpBq6FznakSfULUJkCtDjkjdu5");

#[program]
pub mod chartrunner_progression {
    use super::*;

    // ── Governance / circuit breaker (S5) ────────────────────────────────────
    pub fn init_config(ctx: Context<InitConfig>) -> Result<()> {
        instructions::config::init_config(ctx)
    }
    pub fn set_protocol_fee_bps(ctx: Context<AdminOnly>, bps: u16) -> Result<()> {
        instructions::config::set_protocol_fee_bps(ctx, bps)
    }
    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        instructions::config::pause(ctx)
    }
    pub fn unpause(ctx: Context<AdminOnly>) -> Result<()> {
        instructions::config::unpause(ctx)
    }
    pub fn set_treasury(ctx: Context<AdminOnly>, new_treasury: Pubkey) -> Result<()> {
        instructions::config::set_treasury(ctx, new_treasury)
    }
    pub fn set_conversion_authority(ctx: Context<AdminOnly>, new_authority: Pubkey) -> Result<()> {
        instructions::config::set_conversion_authority(ctx, new_authority)
    }
    pub fn set_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        instructions::config::set_admin(ctx, new_admin)
    }

    // ── Genesis mint + TGE authority handoff ─────────────────────────────────
    pub fn init_run_mint(ctx: Context<InitRunMint>) -> Result<()> {
        instructions::mint::init_run_mint(ctx)
    }
    pub fn transfer_mint_authority(ctx: Context<TransferMintAuthority>) -> Result<()> {
        instructions::mint::transfer_mint_authority(ctx)
    }

    // ── Conversion valve ─────────────────────────────────────────────────────
    pub fn convert_chart(ctx: Context<ConvertChart>, run_id: u64, chart_gross: u64) -> Result<()> {
        instructions::convert::convert_chart(ctx, run_id, chart_gross)
    }

    // ── $RUN sinks ───────────────────────────────────────────────────────────
    pub fn mint_cosmetic(ctx: Context<CosmeticSink>, price: u64) -> Result<()> {
        instructions::sinks::mint_cosmetic(ctx, price)
    }
    pub fn tournament_entry(ctx: Context<TournamentSink>, entry: u64) -> Result<()> {
        instructions::sinks::tournament_entry(ctx, entry)
    }
    pub fn marketplace_sale(ctx: Context<MarketplaceSink>, price: u64) -> Result<()> {
        instructions::sinks::marketplace_sale(ctx, price)
    }
    pub fn sol_p2p_transfer(ctx: Context<SolP2PSink>, amount: u64) -> Result<()> {
        instructions::sinks::sol_p2p_transfer(ctx, amount)
    }

    // ── Licensed-agent-market (T5 anti-sybil) ────────────────────────────────
    pub fn register_map_license(ctx: Context<RegisterMapLicense>, map_hash: [u8; 32], price_run: u64, royalty_bps: u16) -> Result<()> {
        instructions::market::register_map_license(ctx, map_hash, price_run, royalty_bps)
    }
    pub fn buy_license(ctx: Context<BuyLicense>, map_hash: [u8; 32]) -> Result<()> {
        instructions::market::buy_license(ctx, map_hash)
    }
    pub fn pay_bot_read_fee(ctx: Context<PayBotReadFee>, map_hash: [u8; 32], reads: u64) -> Result<()> {
        instructions::market::pay_bot_read_fee(ctx, map_hash, reads)
    }
    pub fn copytrade_fee(ctx: Context<CopytradeFee>, strategy_hash: [u8; 32], notional: u64) -> Result<()> {
        instructions::market::copytrade_fee(ctx, strategy_hash, notional)
    }
    pub fn certify_agent(ctx: Context<CertifyAgent>, agent_hash: [u8; 32]) -> Result<()> {
        instructions::market::certify_agent(ctx, agent_hash)
    }
    pub fn agent_monthly_licence(ctx: Context<AgentMonthlyLicence>) -> Result<()> {
        instructions::market::agent_monthly_licence(ctx)
    }
}
