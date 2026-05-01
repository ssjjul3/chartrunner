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

declare_id!("ChRegSdLcj4N4ek3uW3RZE3pWYuKSTrgVLWeKQrU3yVz");

pub const MAX_NAME_LEN: usize = 64;
pub const MAX_ROYALTY_BPS: u16 = 5000;       // 50% cap to prevent abuse
pub const PROTOCOL_FEE_BPS: u16 = 500;       // 5% to protocol (treasury)
pub const ENTITY_TYPE_COUNT: u8 = 9;

// Hardcoded protocol treasury for the marketplace cut. In prod this would be
// a multisig; for v0.9.6 it's a constant the seed of which is the program ID.
// Replace with the real treasury address before mainnet.
pub fn protocol_treasury() -> Pubkey {
    // Same as program ID for now → fees burn back into program data account.
    // Anyone deploying their own copy gets their own ID and thus their own
    // fee sink. Swap for a real treasury before going to mainnet.
    crate::ID
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
    ) -> Result<()> {
        let listing  = &ctx.accounts.listing;
        let price    = listing.price;
        let fee      = (price as u128)
            .checked_mul(PROTOCOL_FEE_BPS as u128).ok_or(CrError::MathOverflow)?
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
}

// ─── Account contexts ─────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String, content_hash: [u8; 32], royalty_bps: u16)]
pub struct SaveEntity<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + EntityRecord::SIZE,
        seeds = [b"entity", &[entity_type], owner.key().as_ref(), name.as_bytes()],
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
        seeds = [b"entity", &[entity_type], owner.key().as_ref(), name.as_bytes()],
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
        seeds = [b"entity", &[entity_type], owner.key().as_ref(), name.as_bytes()],
        bump = entity.bump,
        has_one = owner,
    )]
    pub entity: Account<'info, EntityRecord>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + Listing::SIZE,
        seeds = [b"listing", entity.key().as_ref()],
        bump,
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String)]
pub struct BuyEntity<'info> {
    #[account(
        seeds = [b"entity", &[entity_type], seller.key().as_ref(), name.as_bytes()],
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
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: protocol treasury (fee sink). Constrained to the value of
    /// `protocol_treasury()` to prevent caller swapping in their own address.
    #[account(mut, address = protocol_treasury())]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(entity_type: u8, name: String)]
pub struct CancelListing<'info> {
    #[account(
        seeds = [b"entity", &[entity_type], seller.key().as_ref(), name.as_bytes()],
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

// ─── Account data structures ──────────────────────────────────────────────

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
}
impl RunRecord {
    pub const SIZE: usize = 32 + 8 + 16 + 8 + 8 + 4 + 4 + 32 + 8 + 1;  // 121
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
}
