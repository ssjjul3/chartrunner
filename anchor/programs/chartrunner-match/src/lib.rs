// ChartRunner — chartrunner_match
// =================================
// On-chain match-state primitive for realtime multiplayer ChartRunner runs.
//
// Modeled directly on the magicblock-engine-examples / anchor-counter pattern,
// using ephemeral_rollups_sdk v0.11.1 + Anchor 0.32.1.
//
// Design:
//   1. A Match PDA stores the shared state for one ChartRunner session — the
//      asset, timeframe, the participants, their live positions, and the
//      commit interval. The PDA is seeded by (host_authority, nonce) so each
//      match gets its own account.
//
//   2. host_authority calls `init_match` on the base layer (Solana devnet/
//      mainnet) to create the PDA. Then `delegate_match` transfers the PDA
//      to the MagicBlock delegation program — after which all `tick_player`
//      and `commit_match` calls route through the Ephemeral Rollup at
//      https://devnet-as.magicblock.app/ instead of the base layer.
//
//   3. While the PDA is delegated, every player can submit `tick_player`
//      instructions at sub-millisecond latency, zero fee. The ER batches
//      and orders them.
//
//   4. Periodically (or at match end), `commit_match` pushes the latest
//      Match state from the ER back to the base layer. `commit_and_finish`
//      does the same plus undelegates the PDA so the host_authority owns it
//      again — this is the natural pair to a chartrunner_registry::record_run
//      finalization to anchor the run on the leaderboard.
//
// Phase status:
//   v0.9.9 scaffold — code-complete, NOT yet deployed. Same Solana Playground
//   flow as chartrunner_maps + chartrunner_registry. After deploy, the
//   declare_id! constant rotates to the assigned program ID.
//
// References:
//   - magicblock-engine-examples/anchor-counter/programs/public-counter
//   - docs.magicblock.gg/Ephemeral_Rollup
//   - https://github.com/magicblock-labs/ephemeral-rollups-sdk

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("3mzEAWZVtTV7sjqkRrPAbB3tT7bA3vVx5wyYQZvfp5zu");

pub const MATCH_SEED:    &[u8] = b"match";
pub const MAX_PLAYERS:   usize = 8;
pub const COMMIT_INTERVAL_MS: u32 = 30_000;   // 30s — matches the SDK example
pub const MAX_LIFETIME:  u64 = 0;              // 0 = no auto-undelegate; host controls

#[ephemeral]
#[program]
pub mod chartrunner_match {
    use super::*;

    /// Create a new MatchState PDA on the base layer. Called by the host
    /// (the player who clicks "Start Match" in the lobby UI). Seeds:
    ///   [b"match", host.key(), nonce.to_le_bytes()]
    pub fn init_match(
        ctx: Context<InitMatch>,
        nonce: u64,
        asset: [u8; 16],
        timeframe: [u8; 8],
        max_players: u8,
    ) -> Result<()> {
        require!((max_players as usize) <= MAX_PLAYERS, MatchError::TooManyPlayers);
        let m = &mut ctx.accounts.match_state;
        m.host          = ctx.accounts.host.key();
        m.nonce         = nonce;
        m.asset         = asset;
        m.timeframe     = timeframe;
        m.max_players   = max_players;
        m.player_count  = 1;
        m.players[0]    = ctx.accounts.host.key();
        m.scores        = [0; MAX_PLAYERS];
        m.positions_x   = [0; MAX_PLAYERS];
        m.positions_y   = [0; MAX_PLAYERS];
        m.started_at    = Clock::get()?.unix_timestamp;
        m.is_finished   = false;
        m.bump          = ctx.bumps.match_state;
        Ok(())
    }

    /// Add a player to an existing match (must be called BEFORE delegate so
    /// it's a base-layer write). Match-join after delegate would need to be
    /// done as an ER-side instruction with a different access pattern.
    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let m = &mut ctx.accounts.match_state;
        require!(!m.is_finished,                          MatchError::MatchFinished);
        require!(m.player_count < m.max_players,          MatchError::MatchFull);
        // Reject duplicate joins.
        let joiner = ctx.accounts.player.key();
        for i in 0..m.player_count as usize {
            require!(m.players[i] != joiner, MatchError::AlreadyJoined);
        }
        m.players[m.player_count as usize] = joiner;
        m.player_count += 1;
        Ok(())
    }

    /// Transfer the MatchState PDA to the MagicBlock delegation program.
    /// After this lands, all subsequent tick_player / commit_match calls
    /// must go to the ER endpoint (https://devnet-as.magicblock.app/) and
    /// not the base layer.
    pub fn delegate_match(ctx: Context<DelegateMatchInput>, nonce: u64) -> Result<()> {
        let host_key = ctx.accounts.host.key();
        ctx.accounts.delegate_match_state(
            &ctx.accounts.host,
            &[MATCH_SEED, host_key.as_ref(), &nonce.to_le_bytes()],
            DelegateConfig {
                // Pin to the MagicBlock devnet validator. Pass the localnet
                // pubkey via remaining_accounts when running an integration
                // test against `mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev`.
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                commit_frequency_ms: COMMIT_INTERVAL_MS,
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// One game tick from one player — runs on the ER at sub-millisecond
    /// latency. Players send these every frame they want recorded.
    /// Validates the player is in the match's roster, then writes their
    /// position + score deltas.
    pub fn tick_player(
        ctx: Context<TickPlayer>,
        x: i32,
        y: i32,
        score_delta: u64,
    ) -> Result<()> {
        let m = &mut ctx.accounts.match_state;
        require!(!m.is_finished, MatchError::MatchFinished);
        let signer = ctx.accounts.player.key();
        let mut idx: Option<usize> = None;
        for i in 0..m.player_count as usize {
            if m.players[i] == signer {
                idx = Some(i);
                break;
            }
        }
        let idx = idx.ok_or(MatchError::NotInMatch)?;
        m.positions_x[idx]  = x;
        m.positions_y[idx]  = y;
        m.scores[idx]       = m.scores[idx].saturating_add(score_delta);
        Ok(())
    }

    /// Push the current MatchState from the ER back to the base layer
    /// without releasing the delegation. Call every COMMIT_INTERVAL_MS for
    /// verifiability, or on demand if the host wants a checkpoint.
    pub fn commit_match(ctx: Context<CommitMatch>) -> Result<()> {
        // Serialize current Anchor state before the commit CPI so the bytes
        // pushed to the base layer reflect the latest in-program changes.
        ctx.accounts.match_state.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[ctx.accounts.match_state.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    /// Match-end finalization: mark finished, commit final state, and
    /// undelegate the PDA so it lives on the base layer again.
    pub fn commit_and_finish(ctx: Context<CommitMatch>) -> Result<()> {
        let m = &mut ctx.accounts.match_state;
        m.is_finished = true;
        m.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.match_state.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

// ─── Account contexts ─────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct InitMatch<'info> {
    #[account(
        init,
        payer = host,
        space = 8 + MatchState::SIZE,
        seeds = [MATCH_SEED, host.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub match_state: Account<'info, MatchState>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub match_state: Account<'info, MatchState>,
    pub player: Signer<'info>,
}

/// Inputs for the delegate CPI. The `pda` field must use `mut, del` so the
/// delegation SDK can transfer ownership.
#[delegate]
#[derive(Accounts)]
pub struct DelegateMatchInput<'info> {
    pub host: Signer<'info>,
    /// CHECK The PDA being delegated.
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TickPlayer<'info> {
    #[account(mut)]
    pub match_state: Account<'info, MatchState>,
    pub player: Signer<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitMatch<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub match_state: Account<'info, MatchState>,
}

// ─── Account data structures ─────────────────────────────────────────────

#[account]
pub struct MatchState {
    pub host:           Pubkey,                    // 32
    pub nonce:          u64,                       // 8
    pub asset:          [u8; 16],                  // 16
    pub timeframe:      [u8; 8],                   // 8
    pub max_players:    u8,                        // 1
    pub player_count:   u8,                        // 1
    pub players:        [Pubkey; MAX_PLAYERS],     // 256
    pub scores:         [u64;    MAX_PLAYERS],     // 64
    pub positions_x:    [i32;    MAX_PLAYERS],     // 32
    pub positions_y:    [i32;    MAX_PLAYERS],     // 32
    pub started_at:     i64,                       // 8
    pub is_finished:    bool,                      // 1
    pub bump:           u8,                        // 1
}

impl MatchState {
    // 32 + 8 + 16 + 8 + 1 + 1 + 256 + 64 + 32 + 32 + 8 + 1 + 1 = 460
    pub const SIZE: usize = 32 + 8 + 16 + 8 + 1 + 1
                          + (32 * MAX_PLAYERS)
                          + (8  * MAX_PLAYERS)
                          + (4  * MAX_PLAYERS)
                          + (4  * MAX_PLAYERS)
                          + 8 + 1 + 1;
}

// ─── Errors ───────────────────────────────────────────────────────────────

#[error_code]
pub enum MatchError {
    #[msg("Match has already finished")]                MatchFinished,
    #[msg("Match is full")]                             MatchFull,
    #[msg("Player has already joined this match")]      AlreadyJoined,
    #[msg("Player is not part of this match's roster")] NotInMatch,
    #[msg("max_players exceeds MAX_PLAYERS limit (8)")] TooManyPlayers,
}
