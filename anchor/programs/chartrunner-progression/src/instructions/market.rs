//! The licensed-agent-market — the T5 anti-sybil sink.
//!
//! Thesis (docs/TOKENOMICS-PAPER-v0.5.md §T5): "$CHART = internal labor;
//! $RUN = economic permission." Bots can grind $CHART for free, but every
//! PERMISSION — licensing a map, reading a live signal, copytrading a strategy,
//! wearing a "certified" trait, or holding an active agent licence — is priced
//! in $RUN. This is the strongest non-staking $RUN sink; the model moves bot
//! spend to ~46.6% of gross and protocol fees to ~25.3% of minted $RUN.
//!
//! All fees are paid by a USER SIGNER (human OR bot wallet) — the authority on
//! every token move here is the signing payer, never a PDA.

use crate::constants::*;
use crate::errors::ProgError;
use crate::math;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

pub const MAX_ROYALTY_BPS: u16 = 5_000; // 50% cap (matches the registry)

/// A creator lists a Chart Map for licensing. License PDA: [b"license", creator,
/// map_hash]. `init` makes the (creator, map_hash) listing unique.
pub fn register_map_license(
    ctx: Context<RegisterMapLicense>,
    map_hash: [u8; 32],
    price_run: u64,
    royalty_bps: u16,
) -> Result<()> {
    require!(price_run > 0, ProgError::PriceZero);
    require!(royalty_bps <= MAX_ROYALTY_BPS, ProgError::RoyaltyTooHigh);

    let l = &mut ctx.accounts.license;
    l.creator = ctx.accounts.creator.key();
    l.map_hash = map_hash;
    l.price_run = price_run;
    l.royalty_bps = royalty_bps;
    l.total_sales = 0;
    l.total_reads = 0;
    l.created_at = Clock::get()?.unix_timestamp;
    l.bump = ctx.bumps.license;

    emit!(MapLicenseRegistered { creator: l.creator, map_hash, price_run, royalty_bps });
    Ok(())
}

/// A consumer (human OR bot) buys a map licence for `license.price_run` $RUN.
/// Split (spec §T5):
///   protocol_fee = price * config.protocol_fee_bps / 10000  → treasury
///   royalty      = price * license.royalty_bps    / 10000   → original creator
///   payout       = price - protocol_fee - royalty           → current seller
/// On a FIRST sale the seller IS the creator, so the client passes the creator's
/// ATA for both `seller_run_ata` and `creator_run_ata`. A LicensePurchase PDA is
/// minted as proof + a double-buy guard.
///
/// AUDITED 2026-07-15: seller vs. creator. Since there is no on-chain licence
/// TRANSFER path yet, there is no trustworthy way to prove a `seller ≠ creator`
/// actually holds the licence — so this instruction is now hardened to
/// FIRST-SALE-ONLY: the Accounts struct constrains `seller_run_ata.owner ==
/// license.creator`, meaning payout can ONLY go to the creator. A client cannot
/// redirect payout to an arbitrary "seller" while resale ownership is untracked.
/// AUDIT (external): enabling genuine resale (seller ≠ creator) requires building
/// the licence-ownership/transfer bookkeeping first; an auditor must sign off on
/// that model before the `seller_run_ata.owner == creator` pin is relaxed.
pub fn buy_license(ctx: Context<BuyLicense>, _map_hash: [u8; 32]) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    let price = ctx.accounts.license.price_run;
    require!(price > 0, ProgError::PriceZero);

    // AUDITED 2026-07-17: rate = P3/MK3. Creator Vault take-rates wired from the
    // validated P3 research (constants::CREATOR_VAULT_TAKE_BPS / ROYALTY_*_BPS).
    //   • PRIMARY sale (seller == creator, enforced by the Accounts struct today):
    //     platform take = CREATOR_VAULT_TAKE_BPS (10%) of the BASE price → treasury;
    //     NO royalty (the creator IS the seller). Creator nets base − take (− the
    //     separate protocol fee, which is 0 at MK1) → the 90/10 split of P3.
    //   • RESALE (seller != creator, reachable only once the resale-bookkeeping
    //     AUDIT below is discharged): the original creator additionally earns the
    //     license royalty (royalty_bps, defaulting to ROYALTY_DEFAULT_BPS = 5% when
    //     unset). The platform take is on the BASE ONLY, never on the royalty (P3).
    // `protocol_fee_bps` is a SEPARATE, independently-tuned lever (general
    // marketplace fee, MK1) — it stacks as a distinct treasury line item and is
    // NOT the creator-vault take. Rounding is via math::bps_of (rounds down).
    let base = price; // platform take + royalty are both computed on the base only
    let is_primary = ctx.accounts.seller_run_ata.owner == ctx.accounts.license.creator;

    let creator_vault_take = math::bps_of(base, CREATOR_VAULT_TAKE_BPS as u64)?; // → treasury (MK3)
    let protocol_fee = math::bps_of(base, ctx.accounts.config.protocol_fee_bps as u64)?; // separate MK1 lever
    let royalty = if is_primary {
        0
    } else {
        let bps = if ctx.accounts.license.royalty_bps == 0 {
            ROYALTY_DEFAULT_BPS
        } else {
            ctx.accounts.license.royalty_bps
        };
        math::bps_of(base, bps as u64)?
    };

    // Both treasury-bound cuts are collected in a single move; keep them summed
    // with checked math so an out-of-band constant edit can never underflow payout.
    let treasury_cut = creator_vault_take
        .checked_add(protocol_fee).ok_or(ProgError::MathOverflow)?;
    let payout = base
        .checked_sub(treasury_cut).ok_or(ProgError::MathOverflow)?
        .checked_sub(royalty).ok_or(ProgError::MathOverflow)?;

    // Buyer → seller (payout)
    move_run(&ctx.accounts.token_program, &ctx.accounts.buyer_run_ata, &ctx.accounts.seller_run_ata, &ctx.accounts.buyer, payout)?;
    // Buyer → original creator (resale royalty; 0 on a primary sale)
    move_run(&ctx.accounts.token_program, &ctx.accounts.buyer_run_ata, &ctx.accounts.creator_run_ata, &ctx.accounts.buyer, royalty)?;
    // Buyer → treasury (creator-vault take + separate protocol fee)
    move_run(&ctx.accounts.token_program, &ctx.accounts.buyer_run_ata, &ctx.accounts.treasury_ata, &ctx.accounts.buyer, treasury_cut)?;

    let l = &mut ctx.accounts.license;
    l.total_sales = l.total_sales.checked_add(1).ok_or(ProgError::MathOverflow)?;

    let p = &mut ctx.accounts.purchase;
    p.buyer = ctx.accounts.buyer.key();
    p.map_hash = l.map_hash;
    p.price_paid = price;
    p.bought_at = Clock::get()?.unix_timestamp;
    p.bump = ctx.bumps.purchase;

    emit!(LicenseBought {
        buyer: ctx.accounts.buyer.key(), creator: l.creator, map_hash: l.map_hash,
        price, protocol_fee, royalty, platform_take: creator_vault_take,
    });
    Ok(())
}

/// Metered per-read micro-fee: a bot consuming a licensed map's live signal pays
/// `reads * READ_FEE_MICRO_BASE` $RUN. Split protocol_fee→treasury,
/// remainder→creator. This monetises the exact behaviour bots do most (reading
/// signals) — the load-bearing metered sink.
pub fn pay_bot_read_fee(ctx: Context<PayBotReadFee>, _map_hash: [u8; 32], reads: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(reads > 0, ProgError::ZeroReads);

    // fee = reads * READ_FEE_MICRO_BASE (checked; u64 * u64 could overflow for an
    // absurd `reads`, so guard it).
    let fee = (reads as u128)
        .checked_mul(READ_FEE_MICRO_BASE as u128).ok_or(ProgError::MathOverflow)?;
    let fee = u64::try_from(fee).map_err(|_| ProgError::MathOverflow)?;
    require!(fee > 0, ProgError::AmountZero);

    let protocol_fee = math::bps_of(fee, ctx.accounts.config.protocol_fee_bps as u64)?;
    let to_creator = fee.checked_sub(protocol_fee).ok_or(ProgError::MathOverflow)?;

    move_run(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.creator_run_ata, &ctx.accounts.payer, to_creator)?;
    move_run(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.treasury_ata, &ctx.accounts.payer, protocol_fee)?;

    let l = &mut ctx.accounts.license;
    l.total_reads = l.total_reads.checked_add(reads).ok_or(ProgError::MathOverflow)?;

    emit!(BotReadFeePaid { payer: ctx.accounts.payer.key(), map_hash: l.map_hash, reads, fee });
    Ok(())
}

/// Copytrade permission fee: pay `notional * COPYTRADE_FEE_BPS / 10000` $RUN to
/// copytrade a strategy. Split protocol_fee→treasury, remainder→strategy owner.
pub fn copytrade_fee(ctx: Context<CopytradeFee>, strategy_hash: [u8; 32], notional: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(notional > 0, ProgError::ZeroNotional);

    let fee = math::bps_of(notional, COPYTRADE_FEE_BPS)?;
    require!(fee > 0, ProgError::AmountZero);
    let protocol_fee = math::bps_of(fee, ctx.accounts.config.protocol_fee_bps as u64)?;
    let to_owner = fee.checked_sub(protocol_fee).ok_or(ProgError::MathOverflow)?;

    move_run(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.strategy_owner_ata, &ctx.accounts.payer, to_owner)?;
    move_run(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.treasury_ata, &ctx.accounts.payer, protocol_fee)?;

    emit!(CopytradeFeePaid { payer: ctx.accounts.payer.key(), strategy_hash, notional, fee });
    Ok(())
}

/// Pay a one-time certification fee to mint a non-transferable "certified" trait
/// for `agent_hash`. Bots CAN be certified — they just pay for it; humans earn
/// credentials. The trait is a PDA record (structurally non-transferable). The
/// fee routes to the treasury. `init` prevents re-certifying the same agent.
pub fn certify_agent(ctx: Context<CertifyAgent>, agent_hash: [u8; 32]) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);

    move_run(&ctx.accounts.token_program, &ctx.accounts.payer_run_ata, &ctx.accounts.treasury_ata, &ctx.accounts.payer, CERT_FEE_RUN_BASE)?;

    let c = &mut ctx.accounts.certified;
    c.owner = ctx.accounts.payer.key();
    c.agent_hash = agent_hash;
    c.fee_paid = CERT_FEE_RUN_BASE;
    c.certified_at = Clock::get()?.unix_timestamp;
    c.bump = ctx.bumps.certified;

    emit!(AgentCertified { owner: c.owner, agent_hash, fee: CERT_FEE_RUN_BASE });
    Ok(())
}

/// The 10 $RUN/month agent licence — BURNED (not routed anywhere). Extends the
/// caller's AgentLicense.paid_until by one 30-day period.
/// AUDITED 2026-07-15: the lapsed-licence period math is correct. New coverage is
/// computed from `base = max(now, paid_until)` then `paid_until = base + 30d`
/// (checked_add): while a licence is still active it stacks from `paid_until`
/// (no lost time); once it has LAPSED (`paid_until < now`) it restarts from `now`,
/// so a gap grants zero retroactive coverage and can't be back-dated. `months_paid`
/// is a checked lifetime counter. The burn debits the caller's own ATA (user
/// Signer authority), so no PDA escalation.
pub fn agent_monthly_licence(ctx: Context<AgentMonthlyLicence>) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);

    // Burn 10 $RUN from the caller.
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.run_mint.to_account_info(),
                from: ctx.accounts.payer_run_ata.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        AGENT_LICENCE_RUN_BASE,
    )?;

    let now = Clock::get()?.unix_timestamp;
    let lic = &mut ctx.accounts.agent_license;
    if lic.owner == Pubkey::default() {
        lic.owner = ctx.accounts.payer.key();
        lic.bump = ctx.bumps.agent_license;
        lic.paid_until = now;
        lic.months_paid = 0;
    }
    // Extend from whichever is later — no retroactive coverage on a lapse.
    let base = core::cmp::max(now, lic.paid_until);
    lic.paid_until = base.checked_add(AGENT_LICENCE_PERIOD_SECS).ok_or(ProgError::MathOverflow)?;
    lic.last_payment = now;
    lic.months_paid = lic.months_paid.checked_add(1).ok_or(ProgError::MathOverflow)?;

    emit!(AgentMonthlyLicencePaid { owner: lic.owner, burned: AGENT_LICENCE_RUN_BASE, paid_until: lic.paid_until });
    Ok(())
}

// ─── Shared CPI helper (user-signed $RUN transfer) ──────────────────────────
fn move_run<'info>(
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
#[instruction(map_hash: [u8; 32])]
pub struct RegisterMapLicense<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + MapLicense::SIZE,
        seeds = [b"license", creator.key().as_ref(), map_hash.as_ref()],
        bump,
    )]
    pub license: Account<'info, MapLicense>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(map_hash: [u8; 32])]
pub struct BuyLicense<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    pub run_mint: Account<'info, Mint>,
    // The license being bought. Seeds bind it to (creator, map_hash).
    #[account(
        mut,
        seeds = [b"license", license.creator.as_ref(), map_hash.as_ref()],
        bump = license.bump,
    )]
    pub license: Account<'info, MapLicense>,
    // Proof-of-purchase; `init` blocks a wallet buying the same map twice.
    #[account(
        init,
        payer = buyer,
        space = 8 + LicensePurchase::SIZE,
        seeds = [b"licpurchase", buyer.key().as_ref(), map_hash.as_ref()],
        bump,
    )]
    pub purchase: Account<'info, LicensePurchase>,
    #[account(mut, constraint = buyer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = buyer_run_ata.owner == buyer.key() @ ProgError::WrongTokenOwner)]
    pub buyer_run_ata: Account<'info, TokenAccount>,
    // First-sale-only until on-chain resale bookkeeping exists: the seller MUST be
    // the creator, so payout cannot be redirected to an unproven "seller".
    #[account(
        mut,
        constraint = seller_run_ata.mint == run_mint.key() @ ProgError::MintMismatch,
        constraint = seller_run_ata.owner == license.creator @ ProgError::WrongTokenOwner,
    )]
    pub seller_run_ata: Account<'info, TokenAccount>,
    // Original creator's ATA — royalty sink. Pinned to license.creator.
    #[account(mut, constraint = creator_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = creator_run_ata.owner == license.creator @ ProgError::WrongTokenOwner)]
    pub creator_run_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = treasury_ata.owner == config.treasury @ ProgError::WrongTokenOwner)]
    pub treasury_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(map_hash: [u8; 32])]
pub struct PayBotReadFee<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    pub run_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"license", license.creator.as_ref(), map_hash.as_ref()],
        bump = license.bump,
    )]
    pub license: Account<'info, MapLicense>,
    #[account(mut, constraint = payer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = payer_run_ata.owner == payer.key() @ ProgError::WrongTokenOwner)]
    pub payer_run_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = creator_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = creator_run_ata.owner == license.creator @ ProgError::WrongTokenOwner)]
    pub creator_run_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = treasury_ata.owner == config.treasury @ ProgError::WrongTokenOwner)]
    pub treasury_ata: Account<'info, TokenAccount>,
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CopytradeFee<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    pub run_mint: Account<'info, Mint>,
    #[account(mut, constraint = payer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = payer_run_ata.owner == payer.key() @ ProgError::WrongTokenOwner)]
    pub payer_run_ata: Account<'info, TokenAccount>,
    /// Strategy owner's ATA — receives the copytrade fee minus protocol cut.
    /// AUDITED 2026-07-15: hardened as far as this program can. A cheap self-deal
    /// guard now forbids `strategy_owner_ata.owner == payer` (a payer can't route
    /// the fee back to themselves), and mint is pinned to $RUN.
    /// AUDIT (external): the strategy_hash → owner binding genuinely lives in
    /// ANOTHER program (chartrunner_registry's EntityRecord) and cannot be proven
    /// in-program here. Before copytrade goes live, an auditor must require this
    /// account be bound to that on-chain strategy-ownership record; until that
    /// cross-program account is wired in, the payee is trusted client input beyond
    /// the self-deal guard.
    #[account(
        mut,
        constraint = strategy_owner_ata.mint == run_mint.key() @ ProgError::MintMismatch,
        constraint = strategy_owner_ata.owner != payer.key() @ ProgError::WrongTokenOwner,
    )]
    pub strategy_owner_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = treasury_ata.owner == config.treasury @ ProgError::WrongTokenOwner)]
    pub treasury_ata: Account<'info, TokenAccount>,
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(agent_hash: [u8; 32])]
pub struct CertifyAgent<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    pub run_mint: Account<'info, Mint>,
    // Non-transferable certified trait. `init` prevents re-certification.
    #[account(
        init,
        payer = payer,
        space = 8 + CertifiedAgent::SIZE,
        seeds = [b"certified", agent_hash.as_ref()],
        bump,
    )]
    pub certified: Account<'info, CertifiedAgent>,
    #[account(mut, constraint = payer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = payer_run_ata.owner == payer.key() @ ProgError::WrongTokenOwner)]
    pub payer_run_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = treasury_ata.owner == config.treasury @ ProgError::WrongTokenOwner)]
    pub treasury_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AgentMonthlyLicence<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = run_mint)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub run_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + AgentLicense::SIZE,
        seeds = [b"agentlic", payer.key().as_ref()],
        bump,
    )]
    pub agent_license: Account<'info, AgentLicense>,
    #[account(mut, constraint = payer_run_ata.mint == run_mint.key() @ ProgError::MintMismatch, constraint = payer_run_ata.owner == payer.key() @ ProgError::WrongTokenOwner)]
    pub payer_run_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
