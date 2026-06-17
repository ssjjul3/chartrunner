// ⚠ DEPRECATED 2026-06-16 — REFERENCE ONLY, NOT THE CANONICAL SOURCE.
// =====================================================================
// This is the no-SDK stub that was deployed via Solana Playground because
// Playground can't host pyth-solana-receiver-sdk. We have since moved the oracle
// to a LOCAL build: the canonical program is `lib.rs` (real Pyth SDK), pinned to
// Anchor 0.30.1 + pyth-solana-receiver-sdk 0.4.0. Keep this file only as a record
// of what is *currently deployed* on devnet until the real lib.rs is built
// locally and upgraded in place. Do NOT extend this; see BUILD_LOCAL.md.
// (Cargo builds src/lib.rs by default — this file is not compiled.)
//
// ChartRunner — chartrunner_oracle (Playground variant)
// ======================================================
// Re-implements verify_price WITHOUT pyth-solana-receiver-sdk so it can be
// built in Solana Playground (whose crate allowlist doesn't include that SDK).
//
// The trick: re-declare the PriceUpdateV2 / PriceFeedMessage / VerificationLevel
// structs locally with the SAME field order + types Pyth uses. Anchor's
// AnchorDeserialize derives match on byte layout, so as long as the layout
// matches Pyth's, we get the same typed read the SDK provides — minus the
// VAA-verification glue that's already done off-chain when the price-update
// account was written by the pyth-solana-receiver program.
//
// What this DOES check (and is sufficient because the price-update account
// was already written by a verified VAA by the time we read it):
//   1. The 8-byte Anchor discriminator equals PriceUpdateV2's discriminator.
//   2. The feed_id stored in the account matches what the caller requested.
//   3. The publish_time is within max_age_sec of clock.unix_timestamp.
//
// What this does NOT do (compared to the SDK's get_price_no_older_than):
//   - VAA freshness re-check beyond publish_time staleness (the SDK doesn't
//     re-verify the VAA either; that happens when the account is written).
//
// Risk: if Pyth bumps the struct layout in a future PriceUpdateV2 version,
// the deserialize will be wrong. Mitigation: pin to the discriminator
// (which Pyth would have to bump if they change the struct).
//
// Discriminator value (computed via sha256("account:PriceUpdateV2")[0..8]):
//   0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd
//
// References:
//   - github.com/pyth-network/pyth-crosschain/blob/main/target_chains/solana/pyth_solana_receiver_sdk/src/price_update.rs

use anchor_lang::prelude::*;

declare_id!("4vfZVDfDzhR79qdaUdPAzRwUHYB5qbgNwTGBwfy6i5wH");

// ─── Configuration ─────────────────────────────────────────────────────────

pub const MAX_PRICE_AGE_SEC: i64 = 30;

pub const FEED_BTC_USD: &str = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
pub const FEED_ETH_USD: &str = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
pub const FEED_SOL_USD: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

/// v0.9.13 — Pyth Solana Receiver program. The ONLY legitimate owner of a
/// PriceUpdateV2 account (same address on devnet + mainnet). Without binding
/// price_update.owner to this, the PriceUpdateV2 discriminator — published in
/// this very source — is forgeable: an attacker passes a self-owned account
/// with the right first 8 bytes + chosen price/feed/publish_time and every
/// check below passes. The owner constraint closes that hole.
pub const PYTH_RECEIVER_PROGRAM_ID: Pubkey =
    anchor_lang::solana_program::pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

// ─── Local mirror of Pyth's PriceUpdateV2 ─────────────────────────────────

/// Mirror of `pyth_solana_receiver_sdk::price_update::PriceUpdateV2`. Field
/// order and types must match exactly — Anchor's borsh serialization is
/// position-dependent.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PriceUpdateV2Mirror {
    pub write_authority: Pubkey,
    pub verification_level: VerificationLevelMirror,
    pub price_message: PriceFeedMessageMirror,
    pub posted_slot: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum VerificationLevelMirror {
    Partial { num_signatures: u8 },
    Full,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PriceFeedMessageMirror {
    pub feed_id: [u8; 32],
    pub price: i64,
    pub conf: u64,
    pub exponent: i32,
    pub publish_time: i64,
    pub prev_publish_time: i64,
    pub ema_price: i64,
    pub ema_conf: u64,
}

/// PriceUpdateV2 Anchor discriminator: sha256("account:PriceUpdateV2")[..8]
pub const PRICE_UPDATE_V2_DISCRIMINATOR: [u8; 8] =
    [0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd];

// ─── Helpers ───────────────────────────────────────────────────────────────

fn hex_to_feed_id(s: &str) -> Result<[u8; 32]> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    if s.len() != 64 {
        return err!(OracleError::InvalidFeedIdHex);
    }
    let mut out = [0u8; 32];
    for i in 0..32 {
        out[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16)
            .map_err(|_| error!(OracleError::InvalidFeedIdHex))?;
    }
    Ok(out)
}

fn read_price_update_v2(data: &[u8]) -> Result<PriceUpdateV2Mirror> {
    require!(data.len() >= 8, OracleError::InvalidAccountData);
    require!(
        &data[..8] == PRICE_UPDATE_V2_DISCRIMINATOR,
        OracleError::InvalidAccountData
    );
    let mut slice: &[u8] = &data[8..];
    PriceUpdateV2Mirror::deserialize(&mut slice)
        .map_err(|_| error!(OracleError::InvalidAccountData))
}

// ─── Program ───────────────────────────────────────────────────────────────

#[program]
pub mod chartrunner_oracle {
    use super::*;

    pub fn verify_price(
        ctx: Context<VerifyPrice>,
        feed_id_hex: String,
        max_age_sec: Option<i64>,
    ) -> Result<()> {
        let requested_feed_id = hex_to_feed_id(&feed_id_hex)?;

        // v0.9.13 — clamp caller-supplied max_age to [0, MAX_PRICE_AGE_SEC].
        // It was unbounded: a caller could pass i64::MAX and disable staleness
        // entirely. Now a caller may request a TIGHTER window but never a looser
        // one than the program's hard ceiling.
        let max_age = max_age_sec
            .unwrap_or(MAX_PRICE_AGE_SEC)
            .clamp(0, MAX_PRICE_AGE_SEC);
        let now = Clock::get()?.unix_timestamp;

        let data = ctx.accounts.price_update.try_borrow_data()?;
        let update = read_price_update_v2(&data)?;

        require!(
            update.price_message.feed_id == requested_feed_id,
            OracleError::FeedIdMismatch
        );

        let publish_time = update.price_message.publish_time;
        // v0.9.13 — reject a future publish_time. Previously `now - publish_time`
        // saturated to 0 for a future timestamp and ALWAYS passed the staleness
        // gate. Allow a small skew for Pyth/validator clock drift.
        const FUTURE_SKEW_SEC: i64 = 10;
        require!(
            publish_time <= now.saturating_add(FUTURE_SKEW_SEC),
            OracleError::PriceTooStale
        );
        require!(
            now.saturating_sub(publish_time) <= max_age,
            OracleError::PriceTooStale
        );

        let cert = &mut ctx.accounts.certificate;
        cert.feed_id      = requested_feed_id;
        cert.price        = update.price_message.price;
        cert.conf         = update.price_message.conf;
        cert.exponent     = update.price_message.exponent;
        cert.publish_time = publish_time;
        cert.read_at      = now;
        cert.bump         = ctx.bumps.certificate;

        msg!(
            "verify_price feed={} price={} expo={} pub={} now={}",
            feed_id_hex,
            update.price_message.price,
            update.price_message.exponent,
            publish_time,
            now
        );
        Ok(())
    }

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
    /// CHECK: owner-constrained to the Pyth receiver (so the account can only
    /// have been written by Pyth's verified-VAA path); we additionally validate
    /// the discriminator + parse the data ourselves via the mirror structs.
    /// v0.9.13 — the `owner =` constraint is the fix for the forgeable-price
    /// finding in M05-self-audit.md (raw AccountInfo + public discriminator was
    /// spoofable without it).
    #[account(owner = PYTH_RECEIVER_PROGRAM_ID)]
    pub price_update: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + PriceCertificate::SIZE,
        // v0.9.12 — keccak-hash the hex string to a fixed 32 bytes. A raw Pyth
        // feed_id_hex is 64 chars (66 with 0x), which exceeds Solana's 32-byte
        // per-seed limit and made every verify_price call fail at runtime with
        // MaxSeedLengthExceeded. The hash is deterministic, so one cert PDA per
        // (payer, feed) pair still holds — the client derives the same seed.
        seeds = [
            b"cert",
            payer.key().as_ref(),
            &anchor_lang::solana_program::keccak::hash(feed_id_hex.as_bytes()).to_bytes(),
        ],
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
    pub feed_id:      [u8; 32],
    pub price:        i64,
    pub conf:         u64,
    pub exponent:     i32,
    pub publish_time: i64,
    pub read_at:      i64,
    pub bump:         u8,
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
    #[msg("Invalid feed_id hex string")]                InvalidFeedIdHex,
    #[msg("Price update is older than max_age_sec")]    PriceTooStale,
    #[msg("Feed ID on price update does not match")]    FeedIdMismatch,
    #[msg("PriceUpdateV2 account data is invalid")]     InvalidAccountData,
}
