// ChartRunner — on-chain map index.
//
// Phase 0.9.4: First real on-chain primitive shipped from inside the game.
// When a player clicks Save in the topbar, the map JSON (asset, timeframe,
// indicators, tools, strategy markers, destruction state, thumbnail) stays
// in localStorage — but a SHA-256 of that JSON gets written here, on-chain,
// keyed by the player's wallet + the chosen map name.
//
// Why a hash, not the full payload:
// - Map JSON is ~5–15 KB. Storing it on-chain would cost ~$0.10–$0.30 of
//   rent per save on mainnet — death by a thousand cuts.
// - Hash + timestamp is enough to PROVE a player had this exact strategy
//   at this exact wallclock — that's the gameable property.
// - The local copy plus the on-chain hash is a verifiable pair: anyone
//   can re-hash the JSON and compare.
//
// Account model:
// - One PDA per (wallet, map_name) pair, derived from
//   [b"map", owner.key().as_ref(), name.as_bytes()].
// - Re-saving the same name overwrites the hash + timestamp (no extra rent).
// - Two players can use the same map name; PDAs are namespaced by wallet.
//
// Phase 1+ extension targets:
// - record_run(map_pda, score, sharpe) → on-chain leaderboard tied to a map
// - list_strategy(map_pda, price_lamports) → marketplace listing tx that
//   escrows the asking price. Requires real escrow logic; out of scope here.

use anchor_lang::prelude::*;

declare_id!("ChMapsdLcj4N4ek3uW3RZE3pWYuKSTrgVLWeKQrU3yVz");

#[program]
pub mod chartrunner_maps {
    use super::*;

    /// Write or overwrite the on-chain entry for `(owner, name)`.
    ///
    /// `name` ≤ 64 bytes (UTF-8). `content_hash` is a 32-byte digest of the
    /// canonical map JSON — by convention the SHA-256 of `JSON.stringify(map)`
    /// with sorted keys, but the program treats it as opaque bytes.
    pub fn save_map(
        ctx: Context<SaveMap>,
        name: String,
        content_hash: [u8; 32],
    ) -> Result<()> {
        require!(!name.is_empty(), CrError::EmptyName);
        require!(name.as_bytes().len() <= MAX_NAME_LEN, CrError::NameTooLong);

        let map = &mut ctx.accounts.map;
        map.owner = ctx.accounts.owner.key();
        // Always rewrite name so re-saves with the same PDA (different
        // capitalization edge-case impossible here since name is in seeds,
        // but cheap to keep correct) match the hash they're paired with.
        map.name = name.clone();
        map.content_hash = content_hash;
        map.saved_at = Clock::get()?.unix_timestamp;
        map.bump = ctx.bumps.map;

        emit!(MapSaved {
            owner: map.owner,
            name: name.clone(),
            content_hash,
            saved_at: map.saved_at,
        });

        msg!("ChartRunner: saved map '{}' for {}", name, map.owner);
        Ok(())
    }
}

pub const MAX_NAME_LEN: usize = 64;

#[derive(Accounts)]
#[instruction(name: String, content_hash: [u8; 32])]
pub struct SaveMap<'info> {
    /// PDA per (owner, name). `init_if_needed` so re-saves with the same name
    /// reuse the existing account and only update the hash + timestamp.
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + MapEntry::SIZE,
        seeds = [b"map", owner.key().as_ref(), name.as_bytes()],
        bump,
    )]
    pub map: Account<'info, MapEntry>,

    /// The wallet that owns this map. Pays rent on first save.
    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct MapEntry {
    pub owner: Pubkey,            // 32
    pub name: String,             // 4 + MAX_NAME_LEN
    pub content_hash: [u8; 32],   // 32
    pub saved_at: i64,            // 8
    pub bump: u8,                 // 1
}

impl MapEntry {
    // Borsh layout: discriminator (8) is added separately in the `space` calc.
    pub const SIZE: usize = 32 + (4 + MAX_NAME_LEN) + 32 + 8 + 1;
}

#[event]
pub struct MapSaved {
    pub owner: Pubkey,
    pub name: String,
    pub content_hash: [u8; 32],
    pub saved_at: i64,
}

#[error_code]
pub enum CrError {
    #[msg("Map name cannot be empty")]
    EmptyName,
    #[msg("Map name exceeds 64 bytes")]
    NameTooLong,
}
