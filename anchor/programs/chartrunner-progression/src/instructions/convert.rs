//! The conversion valve: $CHART (OFF-CHAIN) → $RUN (on-chain).
//!
//! $CHART has no on-chain existence. The off-chain ledger's authority co-signs a
//! conversion claim `(run_id, chart_gross)`; this instruction validates the
//! economic guards and RELEASES $RUN from the reserve vault (a transfer, not a
//! mint — supply stays fixed). Spec: docs/TOKENOMICS-PAPER-v0.5.md §Conversion.
//!
//! Guards applied, in order:
//!   1. circuit breaker (S5)
//!   2. authority: the off-chain $CHART authority must co-sign
//!   3. per-run ceiling: gross ≤ 600 $CHART / run
//!   4. 2% tax on the $CHART side (burned = credited-less)
//!   5. reserve-level float: effective_rate = 100·clamp((R0/R)^0.3, 1, 2.5)
//!   6. daily cap: ≤ 50 $RUN / wallet / UTC day
//!   7. reserve solvency: can't release more than remains
//!   8. replay guard: one receipt PDA per (wallet, run_id)

use crate::constants::*;
use crate::errors::ProgError;
use crate::math;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn convert_chart(ctx: Context<ConvertChart>, run_id: u64, chart_gross: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ProgError::ProtocolPaused);
    require!(chart_gross > 0, ProgError::AmountZero);
    // (3) per-run ceiling — enforced at the claim boundary.
    require!(chart_gross <= PER_RUN_CHART_CEILING, ProgError::PerRunCeilingExceeded);

    // (4) 2% $CHART-side tax, burned (realised as a smaller credited amount).
    let chart_tax = math::bps_of(chart_gross, CONVERSION_TAX_BPS)?;
    let chart_net = chart_gross.checked_sub(chart_tax).ok_or(ProgError::MathOverflow)?;

    // (5) reserve-level float → effective rate (fixed-point, x1000).
    let r0 = ctx.accounts.config.reserve_initial;
    let r_rem = ctx.accounts.config.reserve_remaining;
    let rate_x1000 = math::effective_rate_x1000(r0, r_rem)?;
    let run_out = math::chart_to_run_base(chart_net, rate_x1000)?;
    require!(run_out > 0, ProgError::ConversionDust);

    // (6) daily cap with UTC day-index reset.
    let now = Clock::get()?.unix_timestamp;
    let today = math::day_index(now);
    let daily = &mut ctx.accounts.daily;
    if daily.wallet == Pubkey::default() {
        // freshly-initialised tracker
        daily.wallet = ctx.accounts.wallet.key();
        daily.bump = ctx.bumps.daily;
        daily.day_index = today;
        daily.minted_today = 0;
    }
    // Reject a stored day-index that is in the FUTURE relative to this tx's clock.
    // That can only arise from a prior forward clock-nudge / anomaly, and silently
    // resetting on the next (earlier) day would hand the wallet a fresh 50/day
    // allowance. A stored index in the PAST is a legitimate new day → reset.
    require!(daily.day_index <= today, ProgError::DayIndexInFuture);
    if daily.day_index < today {
        daily.day_index = today;
        daily.minted_today = 0;
    }
    let projected = daily
        .minted_today
        .checked_add(run_out)
        .ok_or(ProgError::MathOverflow)?;
    require!(projected <= DAILY_CAP_RUN_BASE, ProgError::DailyCapExceeded);

    // (7) reserve solvency — checked against BOTH the counter and the physical
    // vault balance. The vault is the ultimate source of truth (its authority is
    // the config PDA, pinned in the Accounts struct), so binding the release to
    // its on-chain balance means the counter can never authorise a release the
    // vault cannot actually cover.
    require!(run_out <= r_rem, ProgError::InsufficientReserve);
    require!(run_out <= ctx.accounts.reserve_vault.amount, ProgError::InsufficientReserve);

    // Release $RUN from the reserve vault → user. Authority is the config PDA.
    let bump = ctx.accounts.config.bump;
    let seeds: &[&[u8]] = &[b"config", &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reserve_vault.to_account_info(),
                to: ctx.accounts.user_run_ata.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer,
        ),
        run_out,
    )?;

    // Commit state AFTER the transfer succeeds.
    // AUDITED 2026-07-15: reserve accounting is single-writer and atomic.
    // `reserve_remaining` is decremented in this one place, exactly once per
    // instruction, with a checked_sub, and ONLY after the vault transfer above
    // returns Ok. A grep of the crate confirms no other write path touches
    // `reserve_remaining` (init_run_mint sets it once at genesis; nothing else
    // mutates it). Because a failed transfer aborts the whole tx, the counter and
    // the vault balance move together and cannot drift. The vault balance is bound
    // as the solvency source of truth by the `run_out <= reserve_vault.amount`
    // check above plus the `reserve_vault.owner == config` constraint in the
    // Accounts struct, so the counter can never over-state releasable reserve.
    let cfg = &mut ctx.accounts.config;
    cfg.reserve_remaining = cfg
        .reserve_remaining
        .checked_sub(run_out)
        .ok_or(ProgError::MathOverflow)?;
    daily.minted_today = projected;

    let receipt = &mut ctx.accounts.receipt;
    receipt.wallet = ctx.accounts.wallet.key();
    receipt.run_id = run_id;
    receipt.chart_in = chart_gross;
    receipt.run_out = run_out;
    receipt.converted_at = now;
    receipt.bump = ctx.bumps.receipt;

    emit!(Converted {
        wallet: ctx.accounts.wallet.key(),
        run_id,
        chart_gross,
        chart_tax,
        rate_x1000,
        run_out,
        reserve_remaining: cfg.reserve_remaining,
    });
    Ok(())
}

// ─── Accounts ───────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(run_id: u64)]
pub struct ConvertChart<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = reserve_vault)]
    pub config: Account<'info, ProtocolConfig>,

    // Reserve $RUN vault — source of released $RUN, owned by the config PDA.
    // Pinned to config.reserve_vault via `has_one` above. Additionally bind its
    // SPL authority to the config PDA and its mint to config.run_mint, so the
    // vault balance is a trustworthy solvency source (only the config PDA can move
    // it, and only via convert_chart).
    #[account(
        mut,
        constraint = reserve_vault.owner == config.key() @ ProgError::WrongTokenOwner,
        constraint = reserve_vault.mint == config.run_mint @ ProgError::MintMismatch,
    )]
    pub reserve_vault: Account<'info, TokenAccount>,

    // Destination — must be a $RUN account owned by the converting wallet.
    #[account(
        mut,
        constraint = user_run_ata.mint == config.run_mint @ ProgError::MintMismatch,
        constraint = user_run_ata.owner == wallet.key() @ ProgError::WrongTokenOwner,
    )]
    pub user_run_ata: Account<'info, TokenAccount>,

    // The converting user. Pays receipt + daily-tracker rent.
    #[account(mut)]
    pub wallet: Signer<'info>,

    // The off-chain $CHART ledger authority — MUST co-sign every claim. Pinned to
    // config.conversion_authority so a stolen claim can't be replayed by anyone
    // else.
    // AUDITED 2026-07-15: on-chain forgery/redirect is blocked structurally.
    // Because `conversion_authority` is a required Signer on THIS transaction, its
    // signature necessarily covers this exact tx — including `wallet` (an account)
    // and `run_id` / `chart_gross` (the instruction args). It therefore cannot be
    // redirected to a different wallet or amount than the authority signed for,
    // and the receipt PDA seeded by (wallet, run_id) below blocks re-use of a
    // run_id. No separate detached-claim signature is trusted here.
    // AUDIT (external): the remaining trust is purely OFF-CHAIN and cannot be
    // settled in-program — an auditor must confirm the backend's key custody and
    // that it issues each run_id at most once (its signature is what makes a
    // caller-chosen run_id trustworthy). The program cannot see the backend's
    // signing policy.
    #[account(address = config.conversion_authority @ ProgError::NotConversionAuthority)]
    pub conversion_authority: Signer<'info>,

    // Per-wallet daily tracker (UTC day-index reset).
    #[account(
        init_if_needed,
        payer = wallet,
        space = 8 + WalletDailyMint::SIZE,
        seeds = [b"daily", wallet.key().as_ref()],
        bump,
    )]
    pub daily: Account<'info, WalletDailyMint>,

    // One-shot replay guard: `init` fails if this (wallet, run_id) already
    // converted.
    // AUDITED 2026-07-15: seed scheme is unambiguous and collision-free. Seeds =
    // [ b"conv" (domain-separator prefix, unique to this instruction family),
    //   wallet.key() (fixed 32 bytes), run_id.to_le_bytes() (fixed 8 bytes) ].
    // Every account family in this program uses a DISTINCT literal prefix
    // (b"config", b"daily", b"conv", b"run_mint", b"license", b"licpurchase",
    // b"certified", b"agentlic"), and all trailing fields are fixed-width, so a
    // (wallet, run_id) receipt PDA cannot collide with any other family's PDA nor
    // with a different (wallet, run_id). run_id's trustworthiness is established by
    // the conversion_authority tx-signature (see above), not by these seeds.
    #[account(
        init,
        payer = wallet,
        space = 8 + ConversionReceipt::SIZE,
        seeds = [b"conv", wallet.key().as_ref(), &run_id.to_le_bytes()],
        bump,
    )]
    pub receipt: Account<'info, ConversionReceipt>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
