//! Governance: bootstrap the ProtocolConfig, drive the S5 circuit breaker, and
//! rotate the fee / treasury / conversion / admin authorities.
//!
//! Every mutation except `init_config` is admin-gated via `has_one = admin`,
//! where `admin` is the Squads multisig vault.
//! AUDITED 2026-07-15: `has_one = admin` + `admin: Signer` IS sufficient and
//! complete authority proof, nothing missing. `has_one = admin` asserts the
//! passed `admin` account == the stored `config.admin`; `admin: Signer` proves
//! that same account signed the tx. Together: only the key stored as
//! `config.admin` can act. Post-TGE that key is the Squads vault
//! (`squads_vault()`), set at `init_config` and only ever rotatable via the
//! admin-gated `set_admin`, so no other key can satisfy it. No program PDA can
//! escalate: the config PDA signs with seeds [b"config"], which is NOT
//! `config.admin`, so a PDA can never satisfy the `admin: Signer` requirement.
//! The config account itself is pinned by seeds = [b"config"], bump = config.bump.

use crate::constants::*;
use crate::errors::ProgError;
use crate::state::*;
use anchor_lang::prelude::*;

/// Bootstrap the singleton ProtocolConfig. Front-run-safe by construction: the
/// outcome is fixed regardless of caller — `admin`, `treasury`, and the initial
/// `conversion_authority` are all pinned to the Squads vault, and the fee starts
/// at PROTOCOL_FEE_BPS_INIT (0). Racing to call this first only does our setup.
/// `init` makes it callable exactly once.
///
/// Note: `run_mint` / `reserve_vault` / reserve figures are left zeroed here and
/// populated by `init_run_mint` (which must run before the valve is usable).
pub fn init_config(ctx: Context<InitConfig>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    c.admin = squads_vault();
    c.treasury = squads_vault();
    c.conversion_authority = squads_vault(); // rotated to the backend signer post-init
    c.run_mint = Pubkey::default();
    c.reserve_vault = Pubkey::default();
    c.reserve_initial = 0;
    c.reserve_remaining = 0;
    c.protocol_fee_bps = PROTOCOL_FEE_BPS_INIT;
    c.paused = false;
    c.minted = false;
    c.bump = ctx.bumps.config;
    emit!(ConfigUpdated {
        admin: c.admin, treasury: c.treasury,
        protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
    });
    Ok(())
}

/// Admin-only: set the live protocol fee. Allowed values are 0 (disabled) or the
/// MK1 band [MIN_ACTIVE_FEE_BPS, MAX_PROTOCOL_FEE_BPS] = 200..=500 bps. The hard
/// ceiling holds even against a compromised admin.
pub fn set_protocol_fee_bps(ctx: Context<AdminOnly>, bps: u16) -> Result<()> {
    require!(
        bps == 0 || (bps >= MIN_ACTIVE_FEE_BPS && bps <= MAX_PROTOCOL_FEE_BPS),
        ProgError::FeeOutOfRange
    );
    let c = &mut ctx.accounts.config;
    c.protocol_fee_bps = bps;
    emit!(ConfigUpdated {
        admin: c.admin, treasury: c.treasury,
        protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
    });
    Ok(())
}

/// Admin-only: arm the S5 circuit breaker. While paused, every value-moving path
/// (convert + all sinks + market buys) reverts with ProtocolPaused.
pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
    ctx.accounts.config.paused = true;
    let c = &ctx.accounts.config;
    emit!(ConfigUpdated { admin: c.admin, treasury: c.treasury, protocol_fee_bps: c.protocol_fee_bps, paused: c.paused });
    Ok(())
}

/// Admin-only: disarm the S5 circuit breaker.
pub fn unpause(ctx: Context<AdminOnly>) -> Result<()> {
    ctx.accounts.config.paused = false;
    let c = &ctx.accounts.config;
    emit!(ConfigUpdated { admin: c.admin, treasury: c.treasury, protocol_fee_bps: c.protocol_fee_bps, paused: c.paused });
    Ok(())
}

/// Admin-only: rotate the treasury (fee sink).
pub fn set_treasury(ctx: Context<AdminOnly>, new_treasury: Pubkey) -> Result<()> {
    let c = &mut ctx.accounts.config;
    c.treasury = new_treasury;
    emit!(ConfigUpdated { admin: c.admin, treasury: c.treasury, protocol_fee_bps: c.protocol_fee_bps, paused: c.paused });
    Ok(())
}

/// Admin-only: rotate the off-chain $CHART conversion authority (the backend key
/// that signs conversion claims).
/// AUDITED 2026-07-15: this is a working incident-response kill-switch and takes
/// effect atomically. convert_chart pins `conversion_authority` via
/// `#[account(address = config.conversion_authority)]`, read fresh from the config
/// PDA on every call, so the NEXT conversion after this rotation lands rejects the
/// old signer with NotConversionAuthority — no in-flight window.
/// RUNBOOK: on a suspected backend compromise, (1) `pause()` to halt ALL
/// conversions immediately (S5 breaker), (2) `set_conversion_authority(new_key)`
/// to rotate the off-chain claim signer, (3) `unpause()` to resume on the new key.
pub fn set_conversion_authority(ctx: Context<AdminOnly>, new_authority: Pubkey) -> Result<()> {
    ctx.accounts.config.conversion_authority = new_authority;
    Ok(())
}

/// Admin-only: rotate the governance admin itself (e.g. migrate multisigs).
pub fn set_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
    let c = &mut ctx.accounts.config;
    c.admin = new_admin;
    emit!(ConfigUpdated { admin: c.admin, treasury: c.treasury, protocol_fee_bps: c.protocol_fee_bps, paused: c.paused });
    Ok(())
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ProtocolConfig::SIZE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Shared context for all admin-only config mutations. `has_one = admin` binds
/// the signer to the stored Squads governance authority.
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ ProgError::NotAdmin,
    )]
    pub config: Account<'info, ProtocolConfig>,
    pub admin: Signer<'info>,
}
