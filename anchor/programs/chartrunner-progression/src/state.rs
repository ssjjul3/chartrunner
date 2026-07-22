//! On-chain account layouts + events for chartrunner_progression.
//!
//! Every account carries an explicit `SIZE` (excluding Anchor's 8-byte
//! discriminator) so the Accounts structs can compute `space = 8 + T::SIZE`.
//! AUDITED 2026-07-15: every SIZE below was re-derived field-by-field against the
//! byte-widths (Pubkey/[u8;32]=32, i64/u64=8, u32=4, u16=2, u8/bool=1) and each
//! matches exactly — no under-allocation. Verified totals (excluding the 8-byte
//! discriminator, which every Accounts struct adds via `8 + SIZE`):
//!   ProtocolConfig   = 32·5 + 8·2 + 2 + 1·3            = 181  ✓
//!   WalletDailyMint  = 32 + 8·2 + 1                    = 49   ✓
//!   ConversionReceipt= 32 + 8·4 + 1                    = 65   ✓
//!   MapLicense       = 32·2 + 8 + 2 + 8·3 + 1          = 99   ✓
//!   LicensePurchase  = 32·2 + 8·2 + 1                  = 81   ✓
//!   CertifiedAgent   = 32·2 + 8·2 + 1                  = 81   ✓
//!   AgentLicense     = 32 + 8·2 + 4 + 1                = 53   ✓
//! All accounts are fixed-layout (no Vec/String), so SIZE is exact, not a lower
//! bound. If a field is ever added, its width MUST be added here in the same edit.

use anchor_lang::prelude::*;

/// Singleton protocol config — governance root, circuit breaker, and the
/// authoritative mirror of reserve state for the conversion float.
/// PDA: [b"config"].
#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,                // 32 — Squads multisig (governance authority)
    pub treasury: Pubkey,            // 32 — protocol fee / treasury sink
    pub conversion_authority: Pubkey, // 32 — off-chain $CHART ledger signer
    pub run_mint: Pubkey,            // 32 — the $RUN SPL mint
    pub reserve_vault: Pubkey,       // 32 — reserve $RUN token account (config-owned)
    pub reserve_initial: u64,        // 8  — R0 (float anchor)
    pub reserve_remaining: u64,      // 8  — R_remaining (decrements on conversion)
    pub protocol_fee_bps: u16,       // 2  — live fee (0, or 200..=500)
    pub paused: bool,                // 1  — S5 circuit breaker
    pub minted: bool,                // 1  — genesis-mint executed (no re-mint)
    pub bump: u8,                    // 1
}
impl ProtocolConfig {
    pub const SIZE: usize = 32 * 5 + 8 + 8 + 2 + 1 + 1 + 1; // 181
}

/// Per-wallet daily conversion tracker with a UTC day-index reset.
/// PDA: [b"daily", wallet].
#[account]
pub struct WalletDailyMint {
    pub wallet: Pubkey,     // 32
    pub day_index: i64,     // 8  — floor(unix_ts / 86_400) of the tracked day
    pub minted_today: u64,  // 8  — $RUN base units credited this day
    pub bump: u8,           // 1
}
impl WalletDailyMint {
    pub const SIZE: usize = 32 + 8 + 8 + 1; // 49
}

/// One-shot conversion receipt — replay guard keyed by (wallet, run_id). Its
/// `init` is the anti-replay: a second claim for the same run fails with
/// "account already in use". PDA: [b"conv", wallet, run_id_le].
#[account]
pub struct ConversionReceipt {
    pub wallet: Pubkey,      // 32
    pub run_id: u64,         // 8
    pub chart_in: u64,       // 8  — gross $CHART claimed
    pub run_out: u64,        // 8  — $RUN base units credited
    pub converted_at: i64,   // 8
    pub bump: u8,            // 1
}
impl ConversionReceipt {
    pub const SIZE: usize = 32 + 8 + 8 + 8 + 8 + 1; // 65
}

/// A creator listing a Chart Map for licensing. PDA: [b"license", creator,
/// map_hash]. This is the strongest non-staking $RUN sink (T5 anti-sybil).
#[account]
pub struct MapLicense {
    pub creator: Pubkey,     // 32 — original creator (royalty recipient on resale)
    pub map_hash: [u8; 32],  // 32 — SHA-256 of the licensed Chart Map
    pub price_run: u64,      // 8  — buy_license price in $RUN base units
    pub royalty_bps: u16,    // 2  — resale royalty to creator (≤ 5000)
    pub total_sales: u64,    // 8  — lifetime buy_license count
    pub total_reads: u64,    // 8  — lifetime metered bot reads
    pub created_at: i64,     // 8
    pub bump: u8,            // 1
}
impl MapLicense {
    pub const SIZE: usize = 32 + 32 + 8 + 2 + 8 + 8 + 8 + 1; // 99
}

/// Proof a consumer (human OR bot wallet) bought a map licence.
/// PDA: [b"licpurchase", buyer, map_hash].
#[account]
pub struct LicensePurchase {
    pub buyer: Pubkey,       // 32
    pub map_hash: [u8; 32],  // 32
    pub price_paid: u64,     // 8
    pub bought_at: i64,      // 8
    pub bump: u8,            // 1
}
impl LicensePurchase {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1; // 81
}

/// Non-transferable "certified" trait for an agent. It is a PDA RECORD, not a
/// token — non-transferability is structural (there is no owner-transfer path).
/// PDA: [b"certified", agent_hash].
#[account]
pub struct CertifiedAgent {
    pub owner: Pubkey,        // 32 — wallet that paid for + holds the credential
    pub agent_hash: [u8; 32], // 32 — identity of the certified agent
    pub fee_paid: u64,       // 8
    pub certified_at: i64,   // 8
    pub bump: u8,            // 1
}
impl CertifiedAgent {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1; // 81
}

/// A wallet's monthly agent licence (10 $RUN/mo, burned). PDA: [b"agentlic",
/// owner]. `paid_until` extends by one period per payment.
#[account]
pub struct AgentLicense {
    pub owner: Pubkey,       // 32
    pub paid_until: i64,     // 8  — unix ts the licence is valid through
    pub last_payment: i64,   // 8
    pub months_paid: u32,    // 4  — lifetime periods paid
    pub bump: u8,            // 1
}
impl AgentLicense {
    pub const SIZE: usize = 32 + 8 + 8 + 4 + 1; // 53
}

// ─── Events ───────────────────────────────────────────────────────────────
#[event] pub struct RunMintInitialized { pub mint: Pubkey, pub total_supply: u64, pub reserve: u64 }
#[event] pub struct MintAuthorityTransferred { pub mint: Pubkey, pub new_authority: Pubkey }
#[event] pub struct Converted {
    pub wallet: Pubkey, pub run_id: u64, pub chart_gross: u64, pub chart_tax: u64,
    pub rate_x1000: u64, pub run_out: u64, pub reserve_remaining: u64,
}
#[event] pub struct MapLicenseRegistered { pub creator: Pubkey, pub map_hash: [u8; 32], pub price_run: u64, pub royalty_bps: u16 }
// `platform_take` = the Creator Vault take (CREATOR_VAULT_TAKE_BPS, MK3), reported
// separately from `protocol_fee` (the general-marketplace MK1 lever). Both route to
// treasury but are distinct levers — see market::buy_license (AUDITED 2026-07-17).
#[event] pub struct LicenseBought { pub buyer: Pubkey, pub creator: Pubkey, pub map_hash: [u8; 32], pub price: u64, pub protocol_fee: u64, pub royalty: u64, pub platform_take: u64 }
#[event] pub struct BotReadFeePaid { pub payer: Pubkey, pub map_hash: [u8; 32], pub reads: u64, pub fee: u64 }
#[event] pub struct CopytradeFeePaid { pub payer: Pubkey, pub strategy_hash: [u8; 32], pub notional: u64, pub fee: u64 }
#[event] pub struct AgentCertified { pub owner: Pubkey, pub agent_hash: [u8; 32], pub fee: u64 }
#[event] pub struct AgentMonthlyLicencePaid { pub owner: Pubkey, pub burned: u64, pub paid_until: i64 }
#[event] pub struct CosmeticMinted { pub payer: Pubkey, pub price: u64, pub burned: u64, pub to_treasury: u64 }
#[event] pub struct TournamentEntryPaid { pub payer: Pubkey, pub entry: u64, pub to_pool: u64, pub to_treasury: u64, pub burned: u64 }
#[event] pub struct MarketplaceSale { pub buyer: Pubkey, pub seller: Pubkey, pub price: u64, pub burned: u64 }
#[event] pub struct SolP2PTransfer { pub from: Pubkey, pub to: Pubkey, pub amount: u64, pub fee: u64 }
#[event] pub struct ConfigUpdated { pub admin: Pubkey, pub treasury: Pubkey, pub protocol_fee_bps: u16, pub paused: bool }
