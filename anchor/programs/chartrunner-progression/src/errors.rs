//! Error codes for chartrunner_progression. Every economic guard maps to a
//! distinct, human-readable error so the client and auditors can tell exactly
//! which invariant tripped.

use anchor_lang::prelude::*;

#[error_code]
pub enum ProgError {
    // ── Math / bounds ────────────────────────────────────────────────────────
    #[msg("Checked math overflow/underflow")] MathOverflow,
    #[msg("Amount must be greater than zero")] AmountZero,
    #[msg("Reserve multiplier left the [1.000, 2.500] clamp — curve/table bug")] MultiplierOutOfBounds,
    #[msg("Stored daily day-index is in the future relative to the tx clock")] DayIndexInFuture,

    // ── Governance / circuit breaker ─────────────────────────────────────────
    #[msg("Protocol is paused (S5 circuit breaker)")] ProtocolPaused,
    #[msg("Protocol fee out of allowed range (0, or 200–500 bps)")] FeeOutOfRange,
    #[msg("Signer is not the protocol admin")] NotAdmin,

    // ── Mint / genesis ───────────────────────────────────────────────────────
    #[msg("Genesis mint already executed — supply is fixed, no re-mint")] AlreadyMinted,
    #[msg("Genesis allocation does not sum to the fixed 100M supply")] AllocationMismatch,

    // ── Conversion valve ─────────────────────────────────────────────────────
    #[msg("Reserve is depleted — no $RUN left to back conversions")] ReserveDepleted,
    #[msg("Reserve has insufficient $RUN to satisfy this conversion")] InsufficientReserve,
    #[msg("Conversion claim exceeds the 600 $CHART per-run ceiling")] PerRunCeilingExceeded,
    #[msg("Conversion would exceed the 50 $RUN per-wallet daily cap")] DailyCapExceeded,
    #[msg("Conversion produced zero $RUN (dust after tax/rate)")] ConversionDust,
    #[msg("Signer is not the authorized off-chain $CHART conversion authority")] NotConversionAuthority,
    #[msg("Token account has the wrong mint")] MintMismatch,
    #[msg("Token account has the wrong owner")] WrongTokenOwner,

    // ── Licensed-agent-market ────────────────────────────────────────────────
    #[msg("Royalty exceeds the 50% cap (5000 bps)")] RoyaltyTooHigh,
    #[msg("Price must be greater than zero")] PriceZero,
    #[msg("License map_hash does not match the provided license account")] LicenseMismatch,
    #[msg("Read count must be greater than zero")] ZeroReads,
    #[msg("Notional must be greater than zero")] ZeroNotional,
    #[msg("Agent is already certified")] AlreadyCertified,
}
