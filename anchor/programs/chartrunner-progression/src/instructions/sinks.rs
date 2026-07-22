//! $RUN sinks (spec: docs/TOKENOMICS-PAPER-v0.5.md §Sinks). Each of these
//! removes $RUN from circulation (burn) and/or routes it to the treasury. Every
//! split computes one leg with `bps_of` and derives the remainder by
//! subtraction, so no base unit is ever lost to rounding.
//!
//! All value-moving sinks respect the S5 circuit breaker.

use crate::constants::*;
use crate::errors::ProgError;
use crate::math;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

/// NFT / cosmetic mint: pay `price` $RUN → 50% burned, 50% to treasury.
pub fn mint_cosmetic(ctx: Context<CosmeticSink>, price: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(price > 0, ProgError::AmountZero);

    let burned = math::bps_of(price, COSMETIC_BURN_BPS)?;
    let to_treasury = price.checked_sub(burned).ok_or(ProgError::MathOverflow)?; // COSMETIC_TREASURY_BPS

    burn_from_payer(&ctx.accounts.token_program, &ctx.accounts.run_mint, &ctx.accounts.payer_run_ata, &ctx.accounts.payer, burned)?;
    transfer_from_payer(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.treasury_ata, &ctx.accounts.payer, to_treasury)?;

    emit!(CosmeticMinted { payer: ctx.accounts.payer.key(), price, burned, to_treasury });
    Ok(())
}

/// Tournament entry: pay `entry` $RUN → 90% to the winners pool, 7% treasury,
/// 3% burned. Winner payout from the pool is a separate (later) instruction.
pub fn tournament_entry(ctx: Context<TournamentSink>, entry: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(entry > 0, ProgError::AmountZero);

    let to_treasury = math::bps_of(entry, TOURNAMENT_TREASURY_BPS)?;
    let burned = math::bps_of(entry, TOURNAMENT_BURN_BPS)?;
    let to_pool = entry
        .checked_sub(to_treasury).ok_or(ProgError::MathOverflow)?
        .checked_sub(burned).ok_or(ProgError::MathOverflow)?; // ≈ TOURNAMENT_WINNERS_BPS

    transfer_from_payer(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.pool_ata, &ctx.accounts.payer, to_pool)?;
    transfer_from_payer(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.treasury_ata, &ctx.accounts.payer, to_treasury)?;
    burn_from_payer(&ctx.accounts.token_program, &ctx.accounts.run_mint, &ctx.accounts.payer_run_ata, &ctx.accounts.payer, burned)?;

    emit!(TournamentEntryPaid { payer: ctx.accounts.payer.key(), entry, to_pool, to_treasury, burned });
    Ok(())
}

/// $RUN marketplace sale: buyer pays `price` $RUN → 2% burned, remainder to the
/// seller. (Item-ownership bookkeeping lives in chartrunner_registry / off-chain;
/// this instruction only moves value with the burn.)
pub fn marketplace_sale(ctx: Context<MarketplaceSink>, price: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(price > 0, ProgError::AmountZero);

    let burned = math::bps_of(price, MARKETPLACE_BURN_BPS)?;
    let to_seller = price.checked_sub(burned).ok_or(ProgError::MathOverflow)?;

    transfer_from_payer(&ctx.accounts.token_program, &ctx.accounts.buyer_run_ata, &ctx.accounts.seller_run_ata, &ctx.accounts.buyer, to_seller)?;
    burn_from_payer(&ctx.accounts.token_program, &ctx.accounts.run_mint, &ctx.accounts.buyer_run_ata, &ctx.accounts.buyer, burned)?;

    emit!(MarketplaceSale { buyer: ctx.accounts.buyer.key(), seller: ctx.accounts.seller_run_ata.owner, price, burned });
    Ok(())
}

/// $SOL P2P transfer with a 2.5% protocol fee (in lamports) to the treasury.
/// This is the one sink denominated in SOL, not $RUN.
pub fn sol_p2p_transfer(ctx: Context<SolP2PSink>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(amount > 0, ProgError::AmountZero);

    let fee = math::bps_of(amount, SOL_P2P_FEE_BPS)?;
    let payout = amount.checked_sub(fee).ok_or(ProgError::MathOverflow)?;

    // Sender → recipient (payout).
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer { from: ctx.accounts.sender.to_account_info(), to: ctx.accounts.recipient.to_account_info() },
        ),
        payout,
    )?;
    // Sender → treasury (fee). Skipped when zero.
    if fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer { from: ctx.accounts.sender.to_account_info(), to: ctx.accounts.treasury.to_account_info() },
            ),
            fee,
        )?;
    }

    emit!(SolP2PTransfer { from: ctx.accounts.sender.key(), to: ctx.accounts.recipient.key(), amount, fee });
    Ok(())
}

// ─── Shared CPI helpers ─────────────────────────────────────────────────────
// AUDITED 2026-07-15: these helpers move value on behalf of a *user signer*, not
// a PDA. The `authority` parameter is typed `&Signer<'info>`, and every CPI here
// uses `CpiContext::new` (NO signer seeds), so there is no PDA-seed escalation
// path — the transfer/burn can only succeed if the token account's SPL authority
// actually signed the transaction. Verified call sites: mint_cosmetic (payer),
// tournament_entry (payer), marketplace_sale (buyer) — each passes the struct's
// `Signer`, which Anchor has already verified signed the tx. Anchor's
// TokenAccount CPI additionally requires the SPL owner to match the signer, so a
// signer cannot spend an account they don't own.

fn burn_from_payer<'info>(
    token_program: &Program<'info, Token>,
    mint: &Account<'info, Mint>,
    from: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 { return Ok(()); }
    token::burn(
        CpiContext::new(
            token_program.to_account_info(),
            Burn { mint: mint.to_account_info(), from: from.to_account_info(), authority: authority.to_account_info() },
        ),
        amount,
    )
}

fn transfer_from_payer<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 { return Ok(()); }
    token::transfer(
        CpiContext::new(
            token_program.to_account_info(),
            Transfer { from: from.to_account_info(), to: to.to_account_info(), authority: authority.to_account_info() },
        ),
        amount,
    )
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CosmeticSink<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub run_mint: Account<'info, Mint>,
    #[account(mut, constraint = payer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = payer_run_ata.owner == payer.key() @ ProgError::WrongTokenOwner)]
    pub payer_run_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = treasury_ata.owner == config.treasury @ ProgError::WrongTokenOwner)]
    pub treasury_ata: Account<'info, TokenAccount>,
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TournamentSink<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub run_mint: Account<'info, Mint>,
    #[account(mut, constraint = payer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = payer_run_ata.owner == payer.key() @ ProgError::WrongTokenOwner)]
    pub payer_run_ata: Account<'info, TokenAccount>,
    /// The winners pool vault. AUDITED 2026-07-15: its SPL authority is now pinned
    /// to `config.admin` (the Squads V4 multisig), NOT arbitrary client input, so
    /// pooled entries sit under the same 2-of-3 multisig as governance and cannot
    /// be rugged by an EOA before payout. This is the strict interim binding.
    /// AUDIT (external): if/when a dedicated escrow-PDA + on-chain payout
    /// instruction is built, rebind `pool_ata.owner` to that PDA and add the
    /// payout path; the multisig binding here is the conservative stand-in until
    /// then (code cannot pin an authority that does not yet exist in config).
    #[account(
        mut,
        constraint = pool_ata.mint == run_mint.key() @ ProgError::MintMismatch,
        constraint = pool_ata.owner == config.admin @ ProgError::WrongTokenOwner,
    )]
    pub pool_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = treasury_ata.owner == config.treasury @ ProgError::WrongTokenOwner)]
    pub treasury_ata: Account<'info, TokenAccount>,
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MarketplaceSink<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub run_mint: Account<'info, Mint>,
    #[account(mut, constraint = buyer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = buyer_run_ata.owner == buyer.key() @ ProgError::WrongTokenOwner)]
    pub buyer_run_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = seller_run_ata.mint == run_mint.key() @ ProgError::MintMismatch)]
    pub seller_run_ata: Account<'info, TokenAccount>,
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SolP2PSink<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: SOL recipient; receives lamports only.
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    /// CHECK: protocol treasury (lamport fee sink); pinned to config.treasury.
    #[account(mut, address = config.treasury)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
