//! Genesis $RUN mint (exactly once) + the TGE mint-authority handoff.
//!
//! $RUN is fixed-supply: `init_run_mint` mints the full 100,000,000 into the six
//! genesis allocation accounts and flips `config.minted = true` so it can never
//! run again. The conversion valve does NOT mint — it transfers from the reserve
//! token account — so total supply only ever decreases (via burns) after this.

use crate::constants::*;
use crate::errors::ProgError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount};
use anchor_spl::token::spl_token::instruction::AuthorityType;

/// Mint the fixed 100M supply into the genesis allocation token accounts, in one
/// shot. The mint authority is the config PDA during genesis so the program can
/// sign the mints; after this the authority is transferred to the Squads vault
/// (see `transfer_mint_authority`) and post-distribution nothing mints again.
///
/// AUDITED 2026-07-15: authority + destination checks.
///   (a) SEED collision — the mint PDA seed is [b"run_mint"], a domain-separator
///       prefix unique among this program's families (b"config", b"daily",
///       b"conv", b"run_mint", b"license", b"licpurchase", b"certified",
///       b"agentlic"); with no trailing variable fields it addresses exactly one
///       account and cannot collide.
///   (b) AUTHORITY — gated by `has_one = admin` (@ NotAdmin) with `admin: Signer`,
///       so ONLY the Squads multisig can trigger genesis; the `minted` flag makes
///       it one-shot. The allocation SUM is asserted == RUN_TOTAL_SUPPLY on-chain.
///   (c) The RESERVE destination is bound to `owner == config` (see below). The
///       other five destinations are genesis-distribution treasuries whose
///       intended owners are not held in config; because this instruction is
///       one-shot and executable ONLY by the Squads multisig, the multisig's own
///       signature attests to those five destinations. That trust is bounded to
///       the multisig and acceptable for a one-time genesis mint.
pub fn init_run_mint(ctx: Context<InitRunMint>) -> Result<()> {
    require!(!ctx.accounts.config.minted, ProgError::AlreadyMinted);

    // Belt-and-braces: the six allocations must sum to the fixed supply.
    let sum = ALLOC_RESERVE
        .checked_add(ALLOC_CAMPAIGN).ok_or(ProgError::MathOverflow)?
        .checked_add(ALLOC_LIQUIDITY).ok_or(ProgError::MathOverflow)?
        .checked_add(ALLOC_TEAM).ok_or(ProgError::MathOverflow)?
        .checked_add(ALLOC_ECOSYSTEM).ok_or(ProgError::MathOverflow)?
        .checked_add(ALLOC_COMMUNITY).ok_or(ProgError::MathOverflow)?;
    require!(sum == RUN_TOTAL_SUPPLY, ProgError::AllocationMismatch);

    // Config PDA signer seeds. `bump` is copied out (u8) so `signer` does not
    // borrow `config` — leaving `config` free to be mutated after the mints.
    let bump = ctx.accounts.config.bump;
    let seeds: &[&[u8]] = &[b"config", &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    // Mint each genesis allocation. Each call takes only SHARED borrows of the
    // relevant accounts (mint, one destination, config-as-authority, token prog),
    // so there is no borrow conflict, and the mutable write to `config` happens
    // only after all six complete.
    let tp = &ctx.accounts.token_program;
    let mint = &ctx.accounts.run_mint;
    let auth = &ctx.accounts.config;
    mint_alloc(tp, mint, &ctx.accounts.reserve_vault, auth, signer, ALLOC_RESERVE)?;
    mint_alloc(tp, mint, &ctx.accounts.campaign_vault, auth, signer, ALLOC_CAMPAIGN)?;
    mint_alloc(tp, mint, &ctx.accounts.liquidity_vault, auth, signer, ALLOC_LIQUIDITY)?;
    mint_alloc(tp, mint, &ctx.accounts.team_vault, auth, signer, ALLOC_TEAM)?;
    mint_alloc(tp, mint, &ctx.accounts.ecosystem_vault, auth, signer, ALLOC_ECOSYSTEM)?;
    mint_alloc(tp, mint, &ctx.accounts.community_vault, auth, signer, ALLOC_COMMUNITY)?;

    let run_mint_key = ctx.accounts.run_mint.key();
    let reserve_key = ctx.accounts.reserve_vault.key();
    let c = &mut ctx.accounts.config;
    c.run_mint = run_mint_key;
    c.reserve_vault = reserve_key;
    c.reserve_initial = ALLOC_RESERVE;
    c.reserve_remaining = ALLOC_RESERVE;
    c.minted = true;

    emit!(RunMintInitialized {
        mint: run_mint_key,
        total_supply: RUN_TOTAL_SUPPLY,
        reserve: ALLOC_RESERVE,
    });
    Ok(())
}

/// One CPI mint from the config-PDA authority to a destination token account.
fn mint_alloc<'info>(
    token_program: &Program<'info, Token>,
    mint: &Account<'info, Mint>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, crate::state::ProtocolConfig>,
    signer: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    token::mint_to(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            MintTo {
                mint: mint.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
            },
            signer,
        ),
        amount,
    )
}

/// TGE: transfer mint authority to the Squads vault. After genesis distribution
/// the program never needs to mint again, so authority moves to the multisig.
/// We do NOT hard-revoke (set to None) — governance keeps the option to disable
/// minting explicitly later if desired. // TGE: transfer mint authority to Squads vault.
///
/// AUDITED 2026-07-15: authority handoff. The new mint authority is hard-pinned
/// to `squads_vault()` (not caller input). After this runs, the config PDA is no
/// longer the mint authority, so no path re-points the program as authority:
/// `init_run_mint` both requires `mint::authority = config` (which would now fail)
/// AND is blocked by the `minted` flag, and no other instruction calls
/// SetAuthority. The handoff is admin-gated (`has_one = admin`) and `has_one =
/// run_mint`-bound.
/// AUDIT (external): whether to later perform a full `SetAuthority(None)` hard
/// revoke (permanently disabling minting) is a GOVERNANCE decision for the Squads
/// signers — deliberately left to the multisig, not forced in code, so the option
/// to disable is retained.
pub fn transfer_mint_authority(ctx: Context<TransferMintAuthority>) -> Result<()> {
    let bump = ctx.accounts.config.bump;
    let seeds: &[&[u8]] = &[b"config", &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];
    token::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.config.to_account_info(),
                account_or_mint: ctx.accounts.run_mint.to_account_info(),
            },
            signer,
        ),
        AuthorityType::MintTokens,
        Some(squads_vault()),
    )?;
    emit!(MintAuthorityTransferred {
        mint: ctx.accounts.run_mint.key(),
        new_authority: squads_vault(),
    });
    Ok(())
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitRunMint<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ ProgError::NotAdmin,
    )]
    pub config: Account<'info, ProtocolConfig>,
    pub admin: Signer<'info>,

    // The $RUN mint. Created here as a PDA mint with the config PDA as authority
    // and 6 decimals. AUDITED 2026-07-15: the PDA mint is a DELIBERATE design
    // choice — the mint address is deterministic from the program id (no mint
    // keypair to generate, safeguard, or leak), and the mint authority is the
    // program-derived config PDA during genesis so no external key holds mint
    // power before the TGE handoff. This is preferred over a pre-generated keypair
    // mint precisely because it removes a private-key custody risk.
    #[account(
        init,
        payer = payer,
        seeds = [b"run_mint"],
        bump,
        mint::decimals = 6,
        mint::authority = config,
    )]
    pub run_mint: Account<'info, Mint>,

    // Six genesis allocation token accounts (must be $RUN accounts). The client
    // supplies them; token::mint_to enforces the mint match at CPI time.
    //
    // The RESERVE vault is special: it MUST be owned (SPL authority) by the
    // config PDA, because convert_chart transfers out of it signed by that PDA.
    // AUDITED 2026-07-15: the constraint is airtight. `reserve_vault.owner`
    // (the SPL token-account authority field, deserialized and checked by Anchor)
    // is bound `== config.key()` @ WrongTokenOwner, so genesis can only mint the
    // 70M reserve into a vault the config PDA controls. convert_chart re-checks the
    // SAME `reserve_vault.owner == config` constraint, so the release authority and
    // the genesis-funded vault are provably the same account across both
    // instructions — no other authority can ever hold or drain the reserve.
    #[account(
        mut,
        constraint = reserve_vault.mint == run_mint.key() @ ProgError::MintMismatch,
        constraint = reserve_vault.owner == config.key() @ ProgError::WrongTokenOwner,
    )]
    pub reserve_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = campaign_vault.mint == run_mint.key())]
    pub campaign_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = liquidity_vault.mint == run_mint.key())]
    pub liquidity_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = team_vault.mint == run_mint.key())]
    pub team_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = ecosystem_vault.mint == run_mint.key())]
    pub ecosystem_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = community_vault.mint == run_mint.key())]
    pub community_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferMintAuthority<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ ProgError::NotAdmin,
        has_one = run_mint,
    )]
    pub config: Account<'info, ProtocolConfig>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub run_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
