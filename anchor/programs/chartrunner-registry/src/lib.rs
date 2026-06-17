// ChartRunner — multi-entity on-chain registry + marketplace.
//
// Phase 0.9.6: One program, two responsibilities:
//   1. REGISTRY — stores a SHA-256 hash + name + saved_at + royalty for each
//      player-created artifact, partitioned by entity type. Supersedes the
//      one-trick chartrunner_maps program (which only knew about maps); this
//      one knows about all 9 entity types the in-game Workbench can produce.
//   2. MARKETPLACE — players list their owned entities for SOL, other
//      players buy them. Buyer gets a License PDA pointing at the original
//      content_hash; seller keeps creator royalty rights for resales.
//
// Entity-type discriminator (u8):
//   0 = Map         — saved chart setup (asset, TF, indicators, overlays, destruction state)
//   1 = Strategy    — Pine strategy (entries/exits/sizing)
//   2 = Bot         — Pine scout/sniper/arb/risk-manager that flies as orbital orb
//   3 = Indicator   — Pine overlay/badge/panel
//   4 = Backtest    — Sharpe/WR/MaxDD result tied to a parent strategy hash
//   5 = App         — HTML widget that installs as a desktop OS icon + window
//   6 = TokenProfile — token research dashboard card
//   7 = Widget      — terminal pane composition (rows, indicators, badges)
//   8 = Tool        — laser-placed primitive (HLine/VWAP/Trendline preset)
//
// Account layout (rent ≈ 0.0011 SOL per entity):
//   discriminator (8B) + EntityRecord (164B) → ~172B total
//
// PDA derivation: [b"entity", entity_type (1B), owner (32B), name (≤64B)]
//   Same name allowed across different types.
//   Same name within same type by different owners is also fine (PDAs differ).
//
// Marketplace listing PDA: [b"listing", entity_pda (32B)]
//   Storing price + seller; the entity itself stays in registry land.
//
// License PDA (proof of purchase): [b"license", buyer (32B), entity_pda (32B)]
//   Holds buyer pubkey + entity_pda + paid price + bought_at.
//   Game reads license PDAs to populate "Owned" tab in marketplace.
//
// Why "license" model instead of NFT-style ownership transfer?
//   - Ownership transfer of a PDA in Anchor requires close-and-recreate
//     (expensive + breaks references).
//   - License model lets the seller keep monetizing a viral artifact while
//     buyers still get verifiable proof they paid for it.
//   - Royalties on resale are mechanical: when a buyer becomes a seller,
//     they list the LICENSE (not the entity); the registry program checks
//     royalty_bps on the entity and routes that share back to creator.
//     (Resale logic deferred to v1; v0.9.6 ships first-sale only.)

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn");

pub const MAX_NAME_LEN: usize = 64;
pub const MAX_ROYALTY_BPS: u16 = 5000;       // 50% cap to prevent abuse
// Fee still 0 on devnet (nothing is charged). v0.9.8 fixed the underlying
// treasury (now the Squads vault — see protocol_treasury below), so the
// restored-fee path no longer reverts: flipping this to 500 (5%) is now safe.
// Left at 0 until we decide to monetize.
pub const PROTOCOL_FEE_BPS: u16 = 0;
// v0.9.x — governance guardrail. The live fee now lives in the Config PDA
// (admin-settable), but even the admin cannot exceed this hard ceiling — a
// trust commitment that survives a key compromise: a hijacked admin can't set
// a 100% fee. 1000 bps = 10%.
pub const MAX_PROTOCOL_FEE_BPS: u16 = 1000;
// Score / sharpe sanity caps for record_run. Without these any wallet can
// submit u64::MAX score and pollute the leaderboard. Caps chosen as plausible
// game maxima — far above any honest run, far below int max.
pub const MAX_RUN_SCORE:    u64 = 1_000_000;       // 1 M score cap
pub const MAX_SHARPE_X100:  i32 = 10_000;          // sharpe ≤ 100.00
pub const MAX_DURATION_SEC: u32 = 24 * 60 * 60;    // 24 h cap
pub const ENTITY_TYPE_COUNT: u8 = 9;
pub const PDA_BOT_RUN: &[u8] = b"bot_run";
pub const MAX_BOT_BACKTEST_SCORE: u64 = 1_000_000;
pub const MAX_BOT_BACKTEST_TX_COUNT: u32 = 100_000;
pub const MAX_BOT_BACKTEST_DURATION_SEC: i64 = 30 * 24 * 60 * 60;
pub const MAX_NET_PNL_BPS: i32 = 100_000;           // ±1000%
pub const MAX_DRAWDOWN_BPS: u32 = 10_000;           // 100%
// v0.9.x — runner-name (handle) register. Handle PDA is seeded by the handle
// ONLY (no owner), so the handle is globally unique across all wallets.
pub const MAX_HANDLE_LEN: usize = 32;

// v0.9.8 — protocol treasury is now the Squads 2-of-3 multisig vault. Fees
// accrue there; withdrawal requires a multisig proposal. Replaces the old
// `crate::ID` sink, which was the program account (BPF-loader-owned, NOT
// System) and would have reverted every fee transfer with InvalidAccountOwner
// the moment a non-zero fee was restored (M05-self-audit.md finding).
pub fn protocol_treasury() -> Pubkey {
    anchor_lang::solana_program::pubkey!("fK1J2TLk2qLy3cjtiSYDSuCnWuxezphBcdqNGZEpVsp")
}

/// Handle charset gate for the name register: lowercase ASCII letters, digits,
/// and underscore only. Mixed-case is rejected so the same handle can't be
/// claimed twice under different casing — the client lowercases the user's
/// input before deriving the PDA AND before calling claim_name.
pub fn is_valid_handle(s: &str) -> bool {
    s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

// ─── Oracle binding (record_run cites a Pyth PriceCertificate) ──────────────
// The cert is written by chartrunner_oracle::verify_price (a Pyth pull-oracle).
// record_run reads it READ-ONLY (no CPI): owner + Anchor discriminator prove it's
// a genuine oracle cert; feed_id must match the run's asset; publish_time must be
// fresh. We DON'T re-derive the cert PDA (that would need the exact feed_id_hex
// string as a new arg → breaking) — and we don't need to: the threat is a *forged
// price*, which any genuine fresh Pyth cert for the right feed defeats, no matter
// who minted it. Citing is OPTIONAL (cert via remaining_accounts) so the existing
// client keeps working; a cited run gets `verified = true` + the proven price.
pub const ORACLE_PROGRAM_ID: Pubkey =
    anchor_lang::solana_program::pubkey!("4vfZVDfDzhR79qdaUdPAzRwUHYB5qbgNwTGBwfy6i5wH");
pub const MAX_CERT_AGE_SEC: i64 = 60;
// sha256("account:PriceCertificate")[0..8] — the oracle's PriceCertificate disc.
pub const CERT_DISCRIMINATOR: [u8; 8] = [87, 116, 200, 95, 74, 157, 178, 112];
// Pyth feed ids (32-byte) for the markets ChartRunner grades. Mirror of the
// chartrunner_oracle FEED_* hex constants, decoded to bytes.
pub const FEED_BTC: [u8; 32] = [230,45,246,200,180,168,95,225,166,125,180,77,193,45,229,219,51,15,122,198,107,114,220,101,138,254,223,15,74,65,91,67];
pub const FEED_ETH: [u8; 32] = [255,97,73,26,147,17,18,221,241,189,129,71,205,27,100,19,117,247,159,88,37,18,109,102,84,128,135,70,52,253,10,206];
pub const FEED_SOL: [u8; 32] = [239,13,139,111,218,44,235,164,29,161,93,64,149,209,218,57,42,13,47,142,208,198,199,188,15,76,250,200,194,128,181,109];

/// Map a run asset ([u8;16], e.g. "BTCUSDT" null-padded) to its Pyth feed id.
/// Prefix match keeps it cheap + tolerant of the quote currency (USDT/USD/PERP).
pub fn feed_id_for(asset: &[u8; 16]) -> Option<[u8; 32]> {
    // Fixed [u8;3] (no heap) so the byte-string patterns match a `&[u8; 3]`.
    let p: [u8; 3] = [
        asset[0].to_ascii_uppercase(),
        asset[1].to_ascii_uppercase(),
        asset[2].to_ascii_uppercase(),
    ];
    match &p {
        b"BTC" => Some(FEED_BTC),
        b"ETH" => Some(FEED_ETH),
        b"SOL" => Some(FEED_SOL),
        _ => None,
    }
}

/// Read-only mirror of chartrunner_oracle::PriceCertificate (same field order),
/// so the registry can Borsh-deserialize the cert bytes after the owner +
/// discriminator gate proves they're authentic.
#[derive(AnchorDeserialize)]
pub struct PriceCertificateView {
    pub feed_id:      [u8; 32],
    pub price:        i64,
    pub conf:         u64,
    pub exponent:     i32,
    pub publish_time: i64,
    pub read_at:      i64,
    pub bump:         u8,
}

#[program]
pub mod chartrunner_registry {
    use super::*;

    // ── REGISTRY ───────────────────────────────────────────────────────────

    /// Create or overwrite the registry entry for `(owner, entity_type, name)`.
    /// `royalty_bps` (0–5000 = 0–50%) is what the buyer of any future resale
    /// of a derived license will route back to this creator.
    pub fn save_entity(
        ctx: Context<SaveEntity>,
        entity_type: u8,
        name: String,
        content_hash: [u8; 32],
        royalty_bps: u16,
    ) -> Result<()> {
        require!(entity_type < ENTITY_TYPE_COUNT, CrError::InvalidEntityType);
        require!(!name.is_empty(),                CrError::EmptyName);
        require!(name.as_bytes().len() <= MAX_NAME_LEN, CrError::NameTooLong);
        require!(royalty_bps <= MAX_ROYALTY_BPS,  CrError::RoyaltyTooHigh);

        let e = &mut ctx.accounts.entity;
        e.owner        = ctx.accounts.owner.key();
        e.entity_type  = entity_type;
        e.name         = name.clone();
        e.content_hash = content_hash;
        e.royalty_bps  = royalty_bps;
        e.saved_at     = Clock::get()?.unix_timestamp;
        e.bump         = ctx.bumps.entity;

        emit!(EntitySaved {
            owner: e.owner,
            entity_type,
            name: name.clone(),
            content_hash,
            royalty_bps,
            saved_at: e.saved_at,
        });

        msg!("registry: saved type={} name='{}' for {}", entity_type, name, e.owner);
        Ok(())
    }

    /// Owner-only delete. Refunds rent to owner.
    pub fn delete_entity(
        _ctx: Context<DeleteEntity>,
        _entity_type: u8,
        _name: String,
    ) -> Result<()> {
        // Anchor's `close = owner` on the account constraint handles the
        // lamport refund + zero-out. No body work needed.
        Ok(())
    }

    // ── MARKETPLACE ────────────────────────────────────────────────────────

    /// List an owned entity for sale at `price_lamports`. Creates a Listing
    /// PDA tied to the entity. The entity itself remains owned by the seller.
    pub fn list_entity(
        ctx: Context<ListEntity>,
        _entity_type: u8,
        _name: String,
        price_lamports: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, CrError::ProtocolPaused);
        require!(price_lamports > 0, CrError::PriceMustBePositive);

        // Verify the entity actually exists + is owned by the lister.
        // (Anchor's `has_one = owner` on the entity constraint enforces this.)

        let l = &mut ctx.accounts.listing;
        l.entity     = ctx.accounts.entity.key();
        l.seller     = ctx.accounts.owner.key();
        l.price      = price_lamports;
        l.listed_at  = Clock::get()?.unix_timestamp;
        l.bump       = ctx.bumps.listing;

        emit!(EntityListed {
            entity: l.entity,
            seller: l.seller,
            price: price_lamports,
        });
        Ok(())
    }

    /// Buy an active listing. Transfers `price` lamports from buyer to seller
    /// (minus protocol fee), then mints a License PDA recording the purchase.
    /// The Listing account is closed (one-shot first-sale).
    pub fn buy_entity(
        ctx: Context<BuyEntity>,
        _entity_type: u8,
        _name: String,
        max_price: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, CrError::ProtocolPaused);
        let listing  = &ctx.accounts.listing;
        let price    = listing.price;
        // v0.9.8 — buyer slippage guard: reject if the listing price moved above
        // what the buyer agreed to pay. Defense-in-depth alongside the `init`
        // change on list_entity.
        require!(price <= max_price, CrError::PriceExceedsMax);
        let fee      = (price as u128)
            .checked_mul(ctx.accounts.config.protocol_fee_bps as u128).ok_or(CrError::MathOverflow)?
            .checked_div(10_000).ok_or(CrError::MathOverflow)? as u64;
        let payout   = price.checked_sub(fee).ok_or(CrError::MathOverflow)?;

        // Buyer → seller (payout)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to:   ctx.accounts.seller.to_account_info(),
                },
            ),
            payout,
        )?;
        // Buyer → treasury (fee). Skipped if treasury == seller (self-deal).
        if fee > 0 && ctx.accounts.treasury.key() != ctx.accounts.seller.key() {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to:   ctx.accounts.treasury.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Mint license PDA recording the purchase. Buyer pays rent.
        let lic = &mut ctx.accounts.license;
        lic.buyer       = ctx.accounts.buyer.key();
        lic.entity      = ctx.accounts.entity.key();
        lic.price_paid  = price;
        lic.bought_at   = Clock::get()?.unix_timestamp;
        lic.bump        = ctx.bumps.license;

        emit!(EntityBought {
            entity: ctx.accounts.entity.key(),
            seller: ctx.accounts.seller.key(),
            buyer:  ctx.accounts.buyer.key(),
            price,
            fee,
        });
        Ok(())
    }

    /// Seller cancels their own listing. Refunds rent on the Listing PDA.
    pub fn cancel_listing(
        _ctx: Context<CancelListing>,
        _entity_type: u8,
        _name: String,
    ) -> Result<()> {
        // close = seller on the listing account handles refund.
        Ok(())
    }

    // ── PROOF-OF-RUN (read-only on-chain leaderboard substrate) ───────────

    /// Anchor a completed game run for off-chain leaderboards. No SOL moves;
    /// the player just pays rent on a PDA recording (asset, tf, score, sharpe,
    /// duration, content_hash of the map). Future async-multiplayer reads
    /// these to render ghost-runs of top scorers as overlays.
    pub fn record_run(
        ctx: Context<RecordRun>,
        nonce: u64,
        asset: [u8; 16],
        timeframe: [u8; 8],
        score: u64,
        sharpe_x100: i32,
        duration_secs: u32,
        map_hash: [u8; 32],
    ) -> Result<()> {
        // v0.9.7 — sanity caps. Without these any wallet can mint a RunRecord
        // with u64::MAX score and pollute every player's leaderboard.
        require!(score <= MAX_RUN_SCORE,                     CrError::ScoreTooHigh);
        // v0.9.8 — unsigned_abs() (was .abs()): i32::MIN.abs() overflow-wraps to
        // a negative in a release build and slipped past this cap. unsigned_abs
        // returns u32 and never wraps.
        require!(sharpe_x100.unsigned_abs() <= MAX_SHARPE_X100 as u32, CrError::SharpeOutOfRange);
        require!(duration_secs <= MAX_DURATION_SEC,          CrError::DurationTooLong);

        let r = &mut ctx.accounts.run;
        r.player        = ctx.accounts.player.key();
        r.nonce         = nonce;
        r.asset         = asset;
        r.timeframe     = timeframe;
        r.score         = score;
        r.sharpe_x100   = sharpe_x100;
        r.duration_secs = duration_secs;
        r.map_hash      = map_hash;
        r.recorded_at   = Clock::get()?.unix_timestamp;
        r.bump          = ctx.bumps.run;

        // v0.9.x — OPTIONAL Pyth price proof. If the client supplies a
        // PriceCertificate as the first remaining account, verify + bind it.
        r.verified      = false;
        r.feed_id       = [0u8; 32];
        r.price         = 0;
        r.price_expo    = 0;
        r.price_publish = 0;
        if let Some(cert_ai) = ctx.remaining_accounts.first() {
            // (1) owner must be the oracle program.
            require_keys_eq!(*cert_ai.owner, ORACLE_PROGRAM_ID, CrError::CertWrongOwner);
            let data = cert_ai.try_borrow_data()?;
            // (2) discriminator must be PriceCertificate (8 disc + 69 data).
            require!(data.len() >= 8 + 69, CrError::CertMalformed);
            require!(data[..8] == CERT_DISCRIMINATOR, CrError::CertBadDiscriminator);
            let cert = PriceCertificateView::try_from_slice(&data[8..8 + 69])
                .map_err(|_| CrError::CertMalformed)?;
            // (3) feed must match the run's asset.
            let want = feed_id_for(&asset).ok_or(CrError::AssetHasNoFeed)?;
            require!(cert.feed_id == want, CrError::CertFeedMismatch);
            // (4) freshness — the Pyth update must be recent relative to now.
            require!(
                r.recorded_at.saturating_sub(cert.publish_time) <= MAX_CERT_AGE_SEC,
                CrError::CertStale
            );
            r.verified      = true;
            r.feed_id       = cert.feed_id;
            r.price         = cert.price;
            r.price_expo    = cert.exponent;
            r.price_publish = cert.publish_time;
        }

        emit!(RunRecorded {
            player: r.player,
            nonce,
            asset,
            timeframe,
            score,
            sharpe_x100,
            duration_secs,
            map_hash,
        });
        Ok(())
    }

    /// Anchor a bot/headless backtest with compact on-chain provenance. The
    /// heavy transcript, SDK call log, and candle tape live off-chain; this PDA
    /// stores their deterministic hashes plus run metrics so buyers and
    /// leaderboards can verify claims without trusting a local screenshot.
    pub fn record_bot_backtest(
        ctx: Context<RecordBotBacktest>,
        nonce: u64,
        bot_id_hash: [u8; 32],
        strategy_hash: [u8; 32],
        session_hash: [u8; 32],
        call_log_hash: [u8; 32],
        candle_hash: [u8; 32],
        asset: [u8; 16],
        timeframe: [u8; 8],
        start_ts: i64,
        end_ts: i64,
        tx_count: u32,
        net_pnl_bps: i32,
        sharpe_x100: i32,
        score: u64,
        max_drawdown_bps: u32,
    ) -> Result<()> {
        require!(end_ts >= start_ts, CrError::BotBacktestInvalidTimeRange);
        require!(
            end_ts.saturating_sub(start_ts) <= MAX_BOT_BACKTEST_DURATION_SEC,
            CrError::BotBacktestDurationTooLong
        );
        require!(tx_count <= MAX_BOT_BACKTEST_TX_COUNT, CrError::BotBacktestTooManyTx);
        require!(score <= MAX_BOT_BACKTEST_SCORE, CrError::ScoreTooHigh);
        require!(sharpe_x100.unsigned_abs() <= MAX_SHARPE_X100 as u32, CrError::SharpeOutOfRange);
        require!(net_pnl_bps.unsigned_abs() <= MAX_NET_PNL_BPS as u32, CrError::BotBacktestPnlOutOfRange);
        require!(max_drawdown_bps <= MAX_DRAWDOWN_BPS, CrError::BotBacktestDrawdownOutOfRange);

        let r = &mut ctx.accounts.bot_backtest;
        r.bot_owner        = ctx.accounts.bot_owner.key();
        r.nonce            = nonce;
        r.bot_id_hash      = bot_id_hash;
        r.strategy_hash    = strategy_hash;
        r.session_hash     = session_hash;
        r.call_log_hash    = call_log_hash;
        r.candle_hash      = candle_hash;
        r.asset            = asset;
        r.timeframe        = timeframe;
        r.start_ts         = start_ts;
        r.end_ts           = end_ts;
        r.tx_count         = tx_count;
        r.net_pnl_bps      = net_pnl_bps;
        r.sharpe_x100      = sharpe_x100;
        r.score            = score;
        r.max_drawdown_bps = max_drawdown_bps;
        r.recorded_at      = Clock::get()?.unix_timestamp;
        r.bump             = ctx.bumps.bot_backtest;
        r.verified         = false;
        r.oracle_cert      = Pubkey::default();
        r.feed_id          = [0u8; 32];
        r.price            = 0;
        r.price_expo       = 0;
        r.price_publish    = 0;

        if let Some(cert_ai) = ctx.remaining_accounts.first() {
            require_keys_eq!(*cert_ai.owner, ORACLE_PROGRAM_ID, CrError::CertWrongOwner);
            let data = cert_ai.try_borrow_data()?;
            require!(data.len() >= 8 + 69, CrError::CertMalformed);
            require!(data[..8] == CERT_DISCRIMINATOR, CrError::CertBadDiscriminator);
            let cert = PriceCertificateView::try_from_slice(&data[8..8 + 69])
                .map_err(|_| CrError::CertMalformed)?;
            let want = feed_id_for(&asset).ok_or(CrError::AssetHasNoFeed)?;
            require!(cert.feed_id == want, CrError::CertFeedMismatch);
            require!(
                r.recorded_at.saturating_sub(cert.publish_time) <= MAX_CERT_AGE_SEC,
                CrError::CertStale
            );
            r.verified      = true;
            r.oracle_cert   = cert_ai.key();
            r.feed_id       = cert.feed_id;
            r.price         = cert.price;
            r.price_expo    = cert.exponent;
            r.price_publish = cert.publish_time;
        }

        emit!(BotBacktestRecorded {
            bot_owner: r.bot_owner,
            nonce,
            bot_id_hash,
            asset,
            timeframe,
            score,
            net_pnl_bps,
            tx_count,
            session_hash,
            call_log_hash,
            candle_hash,
        });
        Ok(())
    }

    // ── NAME REGISTER (globally-unique runner handles) ───────────────────────

    /// Claim a globally-unique runner name (handle). The PDA is seeded by the
    /// handle ONLY (no owner), so Solana's "account already in use" failure on
    /// `init` IS the uniqueness enforcer — the second wallet to try a taken
    /// handle reverts. `name` must be lowercase `[a-z0-9_]`, 1..=32 bytes; the
    /// client lowercases the user's input before deriving the PDA + calling here.
    pub fn claim_name(ctx: Context<ClaimName>, name: String) -> Result<()> {
        require!(!name.is_empty(),                        CrError::EmptyName);
        require!(name.as_bytes().len() <= MAX_HANDLE_LEN, CrError::HandleTooLong);
        require!(is_valid_handle(&name),                  CrError::InvalidHandle);

        let n = &mut ctx.accounts.name_claim;
        n.owner      = ctx.accounts.owner.key();
        n.name       = name.clone();
        n.claimed_at = Clock::get()?.unix_timestamp;
        n.bump       = ctx.bumps.name_claim;

        emit!(NameClaimed { owner: n.owner, name, claimed_at: n.claimed_at });
        Ok(())
    }

    /// Release a handle the caller owns (closes the PDA, refunds rent), freeing
    /// it for anyone to re-claim. Owner-only — `has_one = owner` on the account.
    pub fn release_name(_ctx: Context<ReleaseName>, _name: String) -> Result<()> {
        // close = owner on the account constraint handles the refund + zero-out.
        Ok(())
    }

    // ── RESALE / ROYALTY (License resale: list → buy → re-mint) ──────────────

    /// List a License the caller owns for resale at `price_lamports`. Creates a
    /// LicenseListing PDA tied to the license; the license stays the seller's
    /// until bought. `init` (not init_if_needed) prevents silent re-pricing —
    /// same front-run defense as list_entity (re-price = cancel then re-list).
    pub fn list_license(ctx: Context<ListLicense>, price_lamports: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, CrError::ProtocolPaused);
        require!(price_lamports > 0, CrError::PriceMustBePositive);
        let ll = &mut ctx.accounts.license_listing;
        ll.license   = ctx.accounts.license.key();
        ll.seller    = ctx.accounts.seller.key();
        ll.entity    = ctx.accounts.license.entity;
        ll.price     = price_lamports;
        ll.listed_at = Clock::get()?.unix_timestamp;
        ll.bump      = ctx.bumps.license_listing;
        emit!(LicenseListed {
            license: ll.license, seller: ll.seller, entity: ll.entity, price: price_lamports,
        });
        Ok(())
    }

    /// Cancel a resale listing. Refunds the LicenseListing rent to the seller.
    pub fn cancel_license_listing(_ctx: Context<CancelLicenseListing>) -> Result<()> {
        // close = seller on the listing account handles the refund.
        Ok(())
    }

    /// Buy a resale-listed License. Splits `price` three ways:
    ///   royalty = price * entity.royalty_bps / 10000  → original creator (entity.owner)
    ///   fee     = price * PROTOCOL_FEE_BPS  / 10000    → protocol treasury (vault)
    ///   payout  = price - royalty - fee                → current holder (seller)
    /// Mints a fresh License PDA for the buyer, then closes the seller's old
    /// License + the LicenseListing (rent → seller). `max_price` is the buyer's
    /// slippage guard.
    pub fn buy_license(ctx: Context<BuyLicense>, max_price: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, CrError::ProtocolPaused);
        let price = ctx.accounts.license_listing.price;
        require!(price <= max_price, CrError::PriceExceedsMax);

        let royalty = (price as u128)
            .checked_mul(ctx.accounts.entity.royalty_bps as u128).ok_or(CrError::MathOverflow)?
            .checked_div(10_000).ok_or(CrError::MathOverflow)? as u64;
        let fee = (price as u128)
            .checked_mul(ctx.accounts.config.protocol_fee_bps as u128).ok_or(CrError::MathOverflow)?
            .checked_div(10_000).ok_or(CrError::MathOverflow)? as u64;
        let payout = price
            .checked_sub(royalty).ok_or(CrError::MathOverflow)?
            .checked_sub(fee).ok_or(CrError::MathOverflow)?;

        // Buyer → creator (royalty). Skipped on self-pay.
        if royalty > 0 && ctx.accounts.creator.key() != ctx.accounts.buyer.key() {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to:   ctx.accounts.creator.to_account_info(),
                    },
                ),
                royalty,
            )?;
        }
        // Buyer → treasury (fee). Skipped if treasury == seller.
        if fee > 0 && ctx.accounts.treasury.key() != ctx.accounts.seller.key() {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to:   ctx.accounts.treasury.to_account_info(),
                    },
                ),
                fee,
            )?;
        }
        // Buyer → seller (payout).
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to:   ctx.accounts.seller.to_account_info(),
                },
            ),
            payout,
        )?;

        // Mint the buyer's new License (buyer pays rent).
        let nl = &mut ctx.accounts.new_license;
        nl.buyer      = ctx.accounts.buyer.key();
        nl.entity     = ctx.accounts.entity.key();
        nl.price_paid = price;
        nl.bought_at  = Clock::get()?.unix_timestamp;
        nl.bump       = ctx.bumps.new_license;

        emit!(LicenseResold {
            entity:  ctx.accounts.entity.key(),
            seller:  ctx.accounts.seller.key(),
            buyer:   ctx.accounts.buyer.key(),
            creator: ctx.accounts.creator.key(),
            price, royalty, fee,
        });
        Ok(())
    }

    // ── GOVERNANCE / CIRCUIT BREAKER (Config PDA) ────────────────────────────

    /// Bootstrap the singleton Config PDA. Front-run-safe by construction:
    /// the outcome is FIXED regardless of who calls it — `admin` and `treasury`
    /// are both pinned to `protocol_treasury()` (the Squads vault), and the fee
    /// starts at the historical default. So an attacker racing to call this
    /// first only does our job for us; they cannot install themselves as admin.
    /// `init` makes it callable exactly once.
    ///
    /// MUST be called immediately after the program upgrade that introduces
    /// Config — the marketplace list/buy paths require it to exist (see the
    /// upgrade-ordering note in DEPLOY/handoff).
    pub fn init_config(ctx: Context<InitConfig>) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.admin            = protocol_treasury();
        c.treasury         = protocol_treasury();
        c.protocol_fee_bps = PROTOCOL_FEE_BPS;
        c.paused           = false;
        c.bump             = ctx.bumps.config;
        emit!(ConfigUpdated {
            admin: c.admin, treasury: c.treasury,
            protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
        });
        Ok(())
    }

    /// Admin-only: arm/disarm the marketplace circuit breaker. While paused,
    /// list_entity / buy_entity / list_license / buy_license revert with
    /// ProtocolPaused. Cancels, deletes, records, and name ops stay live so
    /// users can always exit positions and the game keeps functioning.
    pub fn set_paused(ctx: Context<AdminConfig>, paused: bool) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.paused = paused;
        emit!(ConfigUpdated {
            admin: c.admin, treasury: c.treasury,
            protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
        });
        Ok(())
    }

    /// Admin-only: set the live protocol fee. Hard-capped at MAX_PROTOCOL_FEE_BPS
    /// so even a compromised admin can't impose a predatory fee.
    pub fn set_fee(ctx: Context<AdminConfig>, protocol_fee_bps: u16) -> Result<()> {
        require!(protocol_fee_bps <= MAX_PROTOCOL_FEE_BPS, CrError::FeeTooHigh);
        let c = &mut ctx.accounts.config;
        c.protocol_fee_bps = protocol_fee_bps;
        emit!(ConfigUpdated {
            admin: c.admin, treasury: c.treasury,
            protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
        });
        Ok(())
    }

    /// Admin-only: rotate the fee sink.
    pub fn set_treasury(ctx: Context<AdminConfig>, new_treasury: Pubkey) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.treasury = new_treasury;
        emit!(ConfigUpdated {
            admin: c.admin, treasury: c.treasury,
            protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
        });
        Ok(())
    }

    /// Admin-only: rotate governance authority (e.g. migrate to a new multisig).
    pub fn set_admin(ctx: Context<AdminConfig>, new_admin: Pubkey) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.admin = new_admin;
        emit!(ConfigUpdated {
            admin: c.admin, treasury: c.treasury,
            protocol_fee_bps: c.protocol_fee_bps, paused: c.paused,
        });
        Ok(())
    }
}

// ─── Account contexts ─────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Config::SIZE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Shared context for all admin-only config mutations. `has_one = admin`
/// binds the signer to the stored governance authority.
#[derive(Accounts)]
pub struct AdminConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin,
    )]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String, content_hash: [u8; 32], royalty_bps: u16)]
pub struct SaveEntity<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + EntityRecord::SIZE,
        seeds = [b"entity".as_ref(), &[entity_type], owner.key().as_ref(), name.as_bytes()],
        bump,
    )]
    pub entity: Account<'info, EntityRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String)]
pub struct DeleteEntity<'info> {
    #[account(
        mut,
        close = owner,
        has_one = owner,
        seeds = [b"entity".as_ref(), &[entity_type], owner.key().as_ref(), name.as_bytes()],
        bump = entity.bump,
    )]
    pub entity: Account<'info, EntityRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String, price_lamports: u64)]
pub struct ListEntity<'info> {
    #[account(
        seeds = [b"entity".as_ref(), &[entity_type], owner.key().as_ref(), name.as_bytes()],
        bump = entity.bump,
        has_one = owner,
    )]
    pub entity: Account<'info, EntityRecord>,
    // v0.9.8 — `init` (was `init_if_needed`): a seller can no longer silently
    // overwrite an active listing's price (the front-run in M05-self-audit.md).
    // Re-pricing now requires cancel_listing (which closes the PDA) first, so a
    // pending buy either hits the original price or fails cleanly — never a
    // surprise price.
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::SIZE,
        seeds = [b"listing", entity.key().as_ref()],
        bump,
    )]
    pub listing: Account<'info, Listing>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String)]
pub struct BuyEntity<'info> {
    #[account(
        seeds = [b"entity".as_ref(), &[entity_type], seller.key().as_ref(), name.as_bytes()],
        bump = entity.bump,
    )]
    pub entity: Account<'info, EntityRecord>,
    #[account(
        mut,
        close = seller,
        seeds = [b"listing", entity.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        constraint = listing.entity == entity.key() @ CrError::ListingMismatch,
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = buyer,
        space = 8 + License::SIZE,
        seeds = [b"license", buyer.key().as_ref(), entity.key().as_ref()],
        bump,
    )]
    pub license: Account<'info, License>,
    /// CHECK: receives lamports; verified by listing.has_one above.
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    // v0.9.8 — block self-purchase (wash-trading / fake volume).
    #[account(mut, constraint = buyer.key() != seller.key() @ CrError::SelfPurchase)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: protocol treasury (fee sink). Pinned to `config.treasury` so the
    /// caller can't swap in their own address, and so governance can rotate the
    /// sink without a program upgrade.
    #[account(mut, address = config.treasury)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String)]
pub struct CancelListing<'info> {
    #[account(
        seeds = [b"entity".as_ref(), &[entity_type], seller.key().as_ref(), name.as_bytes()],
        bump = entity.bump,
    )]
    pub entity: Account<'info, EntityRecord>,
    #[account(
        mut,
        close = seller,
        seeds = [b"listing", entity.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct RecordRun<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + RunRecord::SIZE,
        seeds = [b"run", player.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub run: Account<'info, RunRecord>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64, bot_id_hash: [u8; 32])]
pub struct RecordBotBacktest<'info> {
    #[account(
        init,
        payer = bot_owner,
        space = 8 + BotBacktestRecord::SIZE,
        seeds = [PDA_BOT_RUN, bot_owner.key().as_ref(), bot_id_hash.as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub bot_backtest: Account<'info, BotBacktestRecord>,
    #[account(mut)]
    pub bot_owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct ClaimName<'info> {
    // PDA seeded by the handle ONLY → globally unique. `init` (not
    // init_if_needed) is the uniqueness gate: a second claim on a taken handle
    // fails with "account already in use".
    #[account(
        init,
        payer = owner,
        space = 8 + NameClaim::SIZE,
        seeds = [b"name", name.as_bytes()],
        bump,
    )]
    pub name_claim: Account<'info, NameClaim>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct ReleaseName<'info> {
    #[account(
        mut,
        close = owner,
        has_one = owner,
        seeds = [b"name", name.as_bytes()],
        bump = name_claim.bump,
    )]
    pub name_claim: Account<'info, NameClaim>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(price_lamports: u64)]
pub struct ListLicense<'info> {
    // The license being resold; the seeds bind it to (seller, its entity), and
    // the constraint confirms the signer is the holder.
    #[account(
        seeds = [b"license", seller.key().as_ref(), license.entity.as_ref()],
        bump = license.bump,
        constraint = license.buyer == seller.key() @ CrError::NotLicenseHolder,
    )]
    pub license: Account<'info, License>,
    #[account(
        init,
        payer = seller,
        space = 8 + LicenseListing::SIZE,
        seeds = [b"liclisting", license.key().as_ref()],
        bump,
    )]
    pub license_listing: Account<'info, LicenseListing>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelLicenseListing<'info> {
    #[account(
        seeds = [b"license", seller.key().as_ref(), license.entity.as_ref()],
        bump = license.bump,
    )]
    pub license: Account<'info, License>,
    #[account(
        mut,
        close = seller,
        seeds = [b"liclisting", license.key().as_ref()],
        bump = license_listing.bump,
        has_one = seller,
    )]
    pub license_listing: Account<'info, LicenseListing>,
    #[account(mut)]
    pub seller: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(max_price: u64)]
pub struct BuyLicense<'info> {
    // Entity — source of royalty_bps + creator (entity.owner). Bound via the
    // old_license seeds (which include entity.key()).
    pub entity: Account<'info, EntityRecord>,
    // Seller's existing license — closed on sale (rent → seller). The seeds
    // bind `seller` to the genuine holder (a wrong seller → nonexistent PDA).
    #[account(
        mut,
        close = seller,
        seeds = [b"license", seller.key().as_ref(), entity.key().as_ref()],
        bump = old_license.bump,
    )]
    pub old_license: Account<'info, License>,
    // The active resale listing — closed on sale (rent → seller).
    #[account(
        mut,
        close = seller,
        seeds = [b"liclisting", old_license.key().as_ref()],
        bump = license_listing.bump,
        has_one = seller,
        constraint = license_listing.license == old_license.key() @ CrError::ListingMismatch,
    )]
    pub license_listing: Account<'info, LicenseListing>,
    // Buyer's new license — minted (fails if the buyer already owns one).
    #[account(
        init,
        payer = buyer,
        space = 8 + License::SIZE,
        seeds = [b"license", buyer.key().as_ref(), entity.key().as_ref()],
        bump,
    )]
    pub new_license: Account<'info, License>,
    /// CHECK: original creator (royalty recipient); pinned to entity.owner.
    #[account(mut, address = entity.owner)]
    pub creator: AccountInfo<'info>,
    /// CHECK: current holder; receives payout + listing/license rent refunds.
    /// Bound by the old_license seeds + the listing's has_one.
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    #[account(mut, constraint = buyer.key() != seller.key() @ CrError::SelfPurchase)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: protocol treasury (fee sink); pinned to `config.treasury`.
    #[account(mut, address = config.treasury)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

// ─── Account data structures ──────────────────────────────────────────────

/// Singleton protocol config — the governance + circuit-breaker root.
/// PDA seeded by [b"config"] (exactly one per program).
///
/// Replaces the former compile-time `protocol_treasury()` / `PROTOCOL_FEE_BPS`
/// constants so treasury + fee can be changed by governance without a program
/// upgrade, and adds `paused` — a kill-switch for the value-moving marketplace
/// paths (list/buy). `admin` is the Squads multisig vault (same authority that
/// controls program upgrades); see `init_config` for the front-run-safe
/// bootstrap.
#[account]
pub struct Config {
    pub admin:            Pubkey,   // 32 — governance authority (Squads vault)
    pub treasury:         Pubkey,   // 32 — fee sink
    pub protocol_fee_bps: u16,      // 2  — live fee (≤ MAX_PROTOCOL_FEE_BPS)
    pub paused:           bool,     // 1  — marketplace circuit breaker
    pub bump:             u8,       // 1
}
impl Config {
    pub const SIZE: usize = 32 + 32 + 2 + 1 + 1;  // 68
}

#[account]
pub struct EntityRecord {
    pub owner:        Pubkey,         // 32
    pub entity_type:  u8,             // 1
    pub name:         String,         // 4 + MAX_NAME_LEN
    pub content_hash: [u8; 32],       // 32
    pub royalty_bps:  u16,            // 2
    pub saved_at:     i64,            // 8
    pub bump:         u8,             // 1
}
impl EntityRecord {
    pub const SIZE: usize = 32 + 1 + (4 + MAX_NAME_LEN) + 32 + 2 + 8 + 1;  // 144
}

#[account]
pub struct Listing {
    pub entity:    Pubkey,    // 32
    pub seller:    Pubkey,    // 32
    pub price:     u64,       // 8 (lamports)
    pub listed_at: i64,       // 8
    pub bump:      u8,        // 1
}
impl Listing {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1;  // 81
}

#[account]
pub struct License {
    pub buyer:      Pubkey,   // 32
    pub entity:     Pubkey,   // 32
    pub price_paid: u64,      // 8
    pub bought_at:  i64,      // 8
    pub bump:       u8,       // 1
}
impl License {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1;  // 81
}

#[account]
pub struct RunRecord {
    pub player:        Pubkey,    // 32
    pub nonce:         u64,       // 8
    pub asset:         [u8; 16],  // 16  ("BTCUSDT" padded)
    pub timeframe:     [u8; 8],   // 8   ("15m" padded)
    pub score:         u64,       // 8
    pub sharpe_x100:   i32,       // 4   (sharpe * 100, signed; 247 = 2.47)
    pub duration_secs: u32,       // 4
    pub map_hash:      [u8; 32],  // 32
    pub recorded_at:   i64,       // 8
    pub bump:          u8,        // 1
    // ── v0.9.x oracle binding (APPENDED — old PDAs keep the 121-byte layout;
    //    these are zero/false for any pre-upgrade record) ──
    pub verified:      bool,      // 1   — a valid Pyth PriceCertificate was cited
    pub feed_id:       [u8; 32],  // 32  — Pyth feed id (zeroed when unverified)
    pub price:         i64,       // 8   — proven price (apply price_expo)
    pub price_expo:    i32,       // 4
    pub price_publish: i64,       // 8   — Pyth signing time
}
impl RunRecord {
    // v0.9.x — +53 bytes for the appended oracle-proof fields (121 → 174).
    pub const SIZE: usize = 32 + 8 + 16 + 8 + 8 + 4 + 4 + 32 + 8 + 1
                          + 1 + 32 + 8 + 4 + 8;  // 174
}

#[account]
pub struct BotBacktestRecord {
    pub bot_owner:        Pubkey,    // 32
    pub nonce:            u64,       // 8
    pub bot_id_hash:      [u8; 32],  // 32
    pub strategy_hash:    [u8; 32],  // 32
    pub session_hash:     [u8; 32],  // 32
    pub call_log_hash:    [u8; 32],  // 32
    pub candle_hash:      [u8; 32],  // 32
    pub asset:            [u8; 16],  // 16
    pub timeframe:        [u8; 8],   // 8
    pub start_ts:         i64,       // 8
    pub end_ts:           i64,       // 8
    pub tx_count:         u32,       // 4
    pub net_pnl_bps:      i32,       // 4
    pub sharpe_x100:      i32,       // 4
    pub score:            u64,       // 8
    pub max_drawdown_bps: u32,       // 4
    pub recorded_at:      i64,       // 8
    pub bump:             u8,        // 1
    pub verified:         bool,      // 1
    pub oracle_cert:      Pubkey,    // 32
    pub feed_id:          [u8; 32],  // 32
    pub price:            i64,       // 8
    pub price_expo:       i32,       // 4
    pub price_publish:    i64,       // 8
}
impl BotBacktestRecord {
    pub const SIZE: usize = 32 + 8 + 32 + 32 + 32 + 32 + 32 + 16 + 8
                          + 8 + 8 + 4 + 4 + 4 + 8 + 4 + 8 + 1
                          + 1 + 32 + 32 + 8 + 4 + 8;  // 358
}

#[account]
pub struct NameClaim {
    pub owner:      Pubkey,    // 32
    pub name:       String,    // 4 + MAX_HANDLE_LEN
    pub claimed_at: i64,       // 8
    pub bump:       u8,        // 1
}
impl NameClaim {
    pub const SIZE: usize = 32 + (4 + MAX_HANDLE_LEN) + 8 + 1;  // 77
}

#[account]
pub struct LicenseListing {
    pub license:   Pubkey,   // 32  — the License PDA being resold
    pub seller:    Pubkey,   // 32  — current holder
    pub entity:    Pubkey,   // 32  — for royalty lookup (copy of license.entity)
    pub price:     u64,      // 8   (lamports)
    pub listed_at: i64,      // 8
    pub bump:      u8,        // 1
}
impl LicenseListing {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 1;  // 113
}

// ─── Events ───────────────────────────────────────────────────────────────

#[event] pub struct EntitySaved {
    pub owner: Pubkey, pub entity_type: u8, pub name: String,
    pub content_hash: [u8; 32], pub royalty_bps: u16, pub saved_at: i64,
}
#[event] pub struct EntityListed {
    pub entity: Pubkey, pub seller: Pubkey, pub price: u64,
}
#[event] pub struct EntityBought {
    pub entity: Pubkey, pub seller: Pubkey, pub buyer: Pubkey,
    pub price: u64, pub fee: u64,
}
#[event] pub struct RunRecorded {
    pub player: Pubkey, pub nonce: u64,
    pub asset: [u8; 16], pub timeframe: [u8; 8],
    pub score: u64, pub sharpe_x100: i32, pub duration_secs: u32,
    pub map_hash: [u8; 32],
}
#[event] pub struct BotBacktestRecorded {
    pub bot_owner: Pubkey, pub nonce: u64, pub bot_id_hash: [u8; 32],
    pub asset: [u8; 16], pub timeframe: [u8; 8],
    pub score: u64, pub net_pnl_bps: i32, pub tx_count: u32,
    pub session_hash: [u8; 32], pub call_log_hash: [u8; 32], pub candle_hash: [u8; 32],
}
#[event] pub struct NameClaimed {
    pub owner: Pubkey, pub name: String, pub claimed_at: i64,
}
#[event] pub struct LicenseListed {
    pub license: Pubkey, pub seller: Pubkey, pub entity: Pubkey, pub price: u64,
}
#[event] pub struct LicenseResold {
    pub entity: Pubkey, pub seller: Pubkey, pub buyer: Pubkey, pub creator: Pubkey,
    pub price: u64, pub royalty: u64, pub fee: u64,
}
#[event] pub struct ConfigUpdated {
    pub admin: Pubkey, pub treasury: Pubkey, pub protocol_fee_bps: u16, pub paused: bool,
}

// ─── Errors ───────────────────────────────────────────────────────────────

#[error_code]
pub enum CrError {
    #[msg("Map name cannot be empty")]                EmptyName,
    #[msg("Map name exceeds 64 bytes")]               NameTooLong,
    #[msg("Entity type out of range (0..9)")]         InvalidEntityType,
    #[msg("Royalty exceeds 50% cap (5000 bps)")]      RoyaltyTooHigh,
    #[msg("Listing price must be > 0")]               PriceMustBePositive,
    #[msg("Math overflow in fee calculation")]        MathOverflow,
    #[msg("Listing does not match entity PDA")]       ListingMismatch,
    #[msg("Run score exceeds 1,000,000 cap")]         ScoreTooHigh,
    #[msg("Run sharpe out of plausible range (±100)")] SharpeOutOfRange,
    #[msg("Run duration exceeds 24h cap")]            DurationTooLong,
    #[msg("Listing price exceeds buyer's max_price")] PriceExceedsMax,
    #[msg("Cannot buy your own listing")]             SelfPurchase,
    #[msg("Handle exceeds 32 bytes")]                 HandleTooLong,
    #[msg("Handle must be lowercase [a-z0-9_]")]      InvalidHandle,
    #[msg("Caller does not hold this license")]       NotLicenseHolder,
    #[msg("Price certificate is not owned by the oracle program")] CertWrongOwner,
    #[msg("Price certificate account is malformed")]  CertMalformed,
    #[msg("Price certificate has the wrong discriminator")] CertBadDiscriminator,
    #[msg("Certificate feed does not match the run asset")] CertFeedMismatch,
    #[msg("Price certificate is stale (>60s old)")]   CertStale,
    #[msg("No Pyth feed mapped for this asset")]      AssetHasNoFeed,
    #[msg("Bot backtest end_ts must be >= start_ts")] BotBacktestInvalidTimeRange,
    #[msg("Bot backtest duration exceeds cap")]       BotBacktestDurationTooLong,
    #[msg("Bot backtest tx_count exceeds cap")]       BotBacktestTooManyTx,
    #[msg("Bot backtest net PnL is out of range")]    BotBacktestPnlOutOfRange,
    #[msg("Bot backtest drawdown is out of range")]   BotBacktestDrawdownOutOfRange,
    #[msg("Marketplace is paused")]                    ProtocolPaused,
    #[msg("Fee exceeds the 10% governance cap")]       FeeTooHigh,
}
