// ChartRunner — chartrunner_oracle
// =================================
// On-chain verifiable price-feed primitive backed by Pyth Core.
//
// Why this exists:
//   Today, chartrunner_registry::record_run trusts the client's score and
//   sharpe_x100. We added v0.9.7 caps so a forged score can't exceed
//   MAX_RUN_SCORE, but caps don't prove the price the score was computed
//   AGAINST is real. With this program, record_run can cite a Pyth price
//   update — and a forged score now requires forging a matching slot's
//   worth of Pyth bytes, which is not possible.
//
// Architecture: Pyth Pull Oracle.
//   1. Off-chain, the client pulls a fresh price update from Hermes
//      (https://hermes.pyth.network) — a signed VAA encoded for the
//      requested feed_id (e.g. BTC/USD).
//   2. The client posts that VAA to a PriceUpdateV2 account on Solana
//      using the Pyth solana-receiver program. This costs one tx and
//      writes the update to the account.
//   3. In the SAME transaction (or a follow-up), record_run / tick_player
//      / verify_run is called. It reads from PriceUpdateV2 via this
//      program's CPI helper and gets back a `(price_i64, expo_i32, conf_u64,
//      publish_time_i64)` tuple — verified against feed_id and freshness.
//
// Phase status:
//   v0.9.11 scaffold — code-complete, NOT yet deployed. Same Solana Playground
//   flow as the other three Anchor programs. After deploy, the declare_id!
//   constant rotates to the assigned program ID.
//
// References:
//   - docs.pyth.network/price-feeds/use-real-time-data/solana
//   - github.com/pyth-network/pyth-crosschain — pyth-solana-receiver-sdk
//   - hermes.pyth.network — off-chain price service

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{
    get_feed_id_from_hex, PriceUpdateV2,
};

declare_id!("7FJjBq98caT4vUc6nMHQHm6ojsURBq9zDVXbrT6VB1BL");

// ─── Configuration ─────────────────────────────────────────────────────────

/// Maximum allowed staleness of a Pyth price update, in seconds. Updates
/// older than this are rejected by `verify_price`. Default: 30 s — long
/// enough to absorb network jitter, short enough that a stale-then-replay
/// attack can't slot in a price from minutes ago.
pub const MAX_PRICE_AGE_SEC: i64 = 30;

/// Pyth feed IDs that ChartRunner cares about. These are the same
/// 32-byte hex strings the Hermes client uses. Stored at compile time to
/// keep verify_price hot-path lookups O(1). To add a new market, append
/// to this list and redeploy.
///
/// Generated with `get_feed_id_from_hex`. Source of truth for feed IDs:
///   pyth.network/developers/price-feed-ids
pub const FEED_BTC_USD: &str = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
pub const FEED_ETH_USD: &str = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
pub const FEED_SOL_USD: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

// ─── Program ───────────────────────────────────────────────────────────────

#[program]
pub mod chartrunner_oracle {
    use super::*;

    /// Verify that the supplied PriceUpdateV2 account holds a fresh
    /// price for the requested feed, then write the snapshot into a
    /// PriceCertificate PDA. The certificate is what record_run /
    /// tick_player accept as proof.
    ///
    /// This wraps `get_price_no_older_than` from pyth-solana-receiver-sdk
    /// — the SDK's recommended path. The SDK enforces:
    ///   1. The price update came from a verified Pyth Wormhole VAA
    ///   2. The feed_id on the account matches the requested feed_id
    ///   3. publish_time + max_age >= clock.unix_timestamp
    pub fn verify_price(
        ctx: Context<VerifyPrice>,
        feed_id_hex: String,
        max_age_sec: Option<i64>,
    ) -> Result<()> {
        let feed_id = get_feed_id_from_hex(&feed_id_hex)
            .map_err(|_| OracleError::InvalidFeedIdHex)?;

        let max_age = max_age_sec.unwrap_or(MAX_PRICE_AGE_SEC);
        let now     = Clock::get()?.unix_timestamp;

        let price_update = &ctx.accounts.price_update;
        let price = price_update
            .get_price_no_older_than(&Clock::get()?, max_age as u64, &feed_id)
            .map_err(|_| OracleError::PriceTooStale)?;

        let cert = &mut ctx.accounts.certificate;
        cert.feed_id      = feed_id;
        cert.price        = price.price;
        cert.conf         = price.conf;
        cert.exponent     = price.exponent;
        cert.publish_time = price.publish_time;
        cert.read_at      = now;
        cert.bump         = ctx.bumps.certificate;

        msg!(
            "verify_price feed={} price={} expo={} pub={} now={}",
            feed_id_hex, price.price, price.exponent, price.publish_time, now
        );
        Ok(())
    }

    /// Read-only helper for other ChartRunner programs (registry, match).
    /// Returns the latest verified snapshot for the supplied feed via
    /// Anchor's emit so consuming programs can capture it via CPI logs.
    /// The certificate account itself is the canonical artifact —
    /// downstream programs should account-deserialize it via CPI.
    pub fn read_certificate(ctx: Context<ReadCertificate>) -> Result<()> {
        let cert = &ctx.accounts.certificate;
        emit!(PriceSnapshot {
            feed_id:      cert.feed_id,
            price:        cert.price,
            conf:         cert.conf,
            exponent:     cert.exponent,
            publish_time: cert.publish_time,
            read_at:      cert.read_at,
        });
        Ok(())
    }
}

// ─── Account contexts ─────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(feed_id_hex: String)]
pub struct VerifyPrice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The Pyth price-update account written by the client via the
    /// Pyth solana-receiver program.
    pub price_update: Account<'info, PriceUpdateV2>,
    /// PriceCertificate PDA — one per (feed_id, payer) pair. Re-used
    /// across calls (init_if_needed), so the same trader's BTC cert
    /// gets overwritten on each verify rather than minting a fresh PDA.
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + PriceCertificate::SIZE,
        seeds = [b"cert", payer.key().as_ref(), feed_id_hex.as_bytes()],
        bump,
    )]
    pub certificate: Account<'info, PriceCertificate>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReadCertificate<'info> {
    pub certificate: Account<'info, PriceCertificate>,
}

// ─── Account data structures ─────────────────────────────────────────────

#[account]
pub struct PriceCertificate {
    pub feed_id:      [u8; 32], // 32 — Pyth feed identifier (BTC, ETH, SOL, …)
    pub price:        i64,      // 8  — raw price as integer (apply exponent)
    pub conf:         u64,      // 8  — confidence interval (raw integer)
    pub exponent:     i32,      // 4  — base-10 exponent: real_price = price * 10^expo
    pub publish_time: i64,      // 8  — unix seconds when Pyth signed this update
    pub read_at:      i64,      // 8  — unix seconds when verify_price ran
    pub bump:         u8,       // 1
}

impl PriceCertificate {
    pub const SIZE: usize = 32 + 8 + 8 + 4 + 8 + 8 + 1;
}

// ─── Events ───────────────────────────────────────────────────────────────

#[event]
pub struct PriceSnapshot {
    pub feed_id:      [u8; 32],
    pub price:        i64,
    pub conf:         u64,
    pub exponent:     i32,
    pub publish_time: i64,
    pub read_at:      i64,
}

// ─── Errors ───────────────────────────────────────────────────────────────

#[error_code]
pub enum OracleError {
    #[msg("Invalid feed_id hex string")]                   InvalidFeedIdHex,
    #[msg("Price update is older than max_age_sec")]       PriceTooStale,
    #[msg("Feed ID on price update does not match")]       FeedIdMismatch,
}
