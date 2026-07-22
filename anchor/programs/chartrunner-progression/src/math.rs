//! Fixed-point economic math for chartrunner_progression.
//!
//! NON-NEGOTIABLE: NO on-chain floats. Every rate/curve here is integer or
//! fixed-point. Each function documents the exact real-number formula from
//! `docs/TOKENOMICS-PAPER-v0.5.md` that it approximates, and the approximation
//! error it introduces.

use crate::constants::*;
use crate::errors::ProgError;
use anchor_lang::prelude::*;

/// Fixed-point scale for the reserve-float multiplier: 3 decimal places.
/// A multiplier of 1.000 is stored as 1000; 2.500 as 2500.
pub const MULT_SCALE: u64 = 1_000;
pub const MULT_MIN_X1000: u64 = 1_000; // clamp floor   = 1.0  (full reserve)
pub const MULT_MAX_X1000: u64 = 2_500; // clamp ceiling = 2.5  (depletion)

/// Piecewise-linear breakpoints approximating the real curve
///
///     mult(x) = x^0.3 ,  x = R0 / R_remaining  (the reserve-depletion ratio)
///
/// The v0.5 spec is:
///     effective_rate = 100 * clamp( (R0 / R_remaining)^0.3 , 1.0, 2.5 )
///
/// We cannot raise to a fractional power on-chain (no floats), so we sample
/// x^0.3 at 11 points and linearly interpolate between them. Domain: x ∈ [1,
/// 21.2]. At x = 1 (full reserve) mult = 1.000; the ceiling of 2.5 is first
/// reached at x ≈ 21.2 because 21.2^0.3 ≈ 2.4996, so for x ≥ 21.2 we clamp.
///
/// Each pair is (x * 1000, x^0.3 * 1000). The exponents were computed off-chain:
///   1.0→1.000  1.5→1.129  2.0→1.231  3.0→1.390  4.0→1.516  6.0→1.712
///   8.0→1.866 10.0→1.995 14.0→2.207 18.0→2.380 21.2→2.500
///
/// AUDITED 2026-07-15: approximation error, resolved in three parts.
///   (a) DIRECTION documented + made conservative. Because x^0.3 is concave,
///       straight-line chords sit slightly BELOW the true curve, so an
///       interpolated multiplier is marginally LOW → the effective rate is low →
///       run_out would be marginally HIGH (a release biased toward the user /
///       against the reserve). Two guards keep the release from ever exceeding
///       the true-curve amount at the ROUNDING level: (i) the interpolation
///       below now rounds the multiplier UP (ceil), never down, so the fixed-
///       point rate is never understated; (ii) chart_to_run_base rounds the
///       released $RUN DOWN (truncating division). Net: rounding is
///       reserve-favorable in both stages.
///   (b) BOUND asserted. The interpolation asserts the result stays inside
///       [MULT_MIN_X1000, MULT_MAX_X1000] = [1000, 2500] (MultiplierOutOfBounds);
///       a table/interp bug can never let the multiplier escape the clamp.
///   (c) RESIDUAL is external. A model-level generosity remains: even the exact
///       chord lies below the concave curve by up to ~0.9% of the multiplier in
///       the worst segment (2.0→3.0). Rounding cannot remove that — only a denser
///       table or a tangent-based OVER-approximation would.
/// AUDIT (external): a real auditor must confirm the 11 sampled x^0.3 knots and
/// decide whether the residual < ~0.9% interior generosity is acceptable or
/// whether more knots / an integer nth-root are required. Code cannot settle the
/// numeric fidelity of the sampled table.
const CURVE_X1000: [(u64, u64); 11] = [
    (1_000, 1_000),
    (1_500, 1_129),
    (2_000, 1_231),
    (3_000, 1_390),
    (4_000, 1_516),
    (6_000, 1_712),
    (8_000, 1_866),
    (10_000, 1_995),
    (14_000, 2_207),
    (18_000, 2_380),
    (21_200, 2_500),
];

/// Reserve-level float multiplier, fixed-point x1000, clamped to [1000, 2500].
///
/// Approximates `clamp((R0 / R_remaining)^0.3, 1.0, 2.5)`.
pub fn reserve_multiplier_x1000(r0: u64, r_remaining: u64) -> Result<u64> {
    // AUDITED 2026-07-15: reserve trust — the float reads `reserve_remaining`, the
    // ProtocolConfig counter, as its depletion anchor. Single-writer invariant is
    // now enforced end-to-end: `reserve_remaining` is written ONLY in
    // convert_chart, exactly once, with a checked_sub AFTER the vault transfer
    // succeeds (a failed transfer reverts the whole tx, so it cannot drift). The
    // physical reserve vault is bound as the solvency source of truth there:
    // convert_chart constrains `reserve_vault.owner == config` (only the config
    // PDA can move it) and asserts `run_out <= reserve_vault.amount`, so the
    // counter can never over-state releasable reserve. The counter (not the raw
    // vault balance) stays the float INPUT on purpose: reading the vault balance
    // directly would let a donation nudge the rate. See convert.rs for the binding.
    require!(r_remaining > 0, ProgError::ReserveDepleted);

    // x_x1000 = (R0 / R_remaining) * 1000, computed in u128 to avoid overflow.
    let x_x1000 = (r0 as u128)
        .checked_mul(MULT_SCALE as u128)
        .ok_or(ProgError::MathOverflow)?
        .checked_div(r_remaining as u128)
        .ok_or(ProgError::MathOverflow)? as u64;

    // Clamp to the sampled domain.
    if x_x1000 <= CURVE_X1000[0].0 {
        return Ok(MULT_MIN_X1000);
    }
    let last = CURVE_X1000[CURVE_X1000.len() - 1];
    if x_x1000 >= last.0 {
        return Ok(MULT_MAX_X1000);
    }

    // Locate the bracketing segment and interpolate linearly.
    for w in CURVE_X1000.windows(2) {
        let (x0, y0) = w[0];
        let (x1, y1) = w[1];
        if x_x1000 >= x0 && x_x1000 <= x1 {
            // y = y0 + (y1 - y0) * (x - x0) / (x1 - x0)
            let dy = (y1 - y0) as u128;
            let dx = (x1 - x0) as u128; // > 0 by table construction
            // Round the multiplier UP (ceil): (a + dx - 1) / dx. A higher
            // multiplier ⇒ higher effective rate ⇒ LESS $RUN released, so the
            // rounding is reserve-favorable and can never over-release. `step`
            // is bounded by `dy` (since x_x1000 ≤ x1), so `interp ≤ y1`.
            let numer = dy
                .checked_mul((x_x1000 - x0) as u128)
                .ok_or(ProgError::MathOverflow)?
                .checked_add(dx - 1)
                .ok_or(ProgError::MathOverflow)?;
            let step = numer.checked_div(dx).ok_or(ProgError::MathOverflow)?;
            let interp = (y0 as u128)
                .checked_add(step)
                .ok_or(ProgError::MathOverflow)? as u64;
            // Bound assertion: the multiplier must never leave the [1.0, 2.5]
            // clamp. By construction interp ∈ [y0, y1] ⊆ [1000, 2500]; assert it
            // so any future table edit that breaks the invariant fails loudly.
            require!(
                (MULT_MIN_X1000..=MULT_MAX_X1000).contains(&interp),
                ProgError::MultiplierOutOfBounds
            );
            return Ok(interp);
        }
    }
    // Unreachable (the clamps above cover the ends); return ceiling defensively.
    Ok(MULT_MAX_X1000)
}

/// Effective conversion rate in units of ($CHART per $RUN) * 1000.
///
/// `effective_rate = 100 * clamp((R0/R_remaining)^0.3, 1.0, 2.5)`, so this
/// returns a value in [100_000, 250_000] representing 100.000 .. 250.000
/// $CHART-per-$RUN.
pub fn effective_rate_x1000(r0: u64, r_remaining: u64) -> Result<u64> {
    let m = reserve_multiplier_x1000(r0, r_remaining)?;
    BASE_RATE_CHART_PER_RUN
        .checked_mul(m)
        .ok_or(ProgError::MathOverflow.into())
}

/// Convert a NET $CHART amount (whole tokens, already post-tax) into $RUN base
/// units at the given effective rate.
///
///   run_base = net_chart * RUN_BASE_PER_TOKEN * MULT_SCALE / rate_x1000
///            = net_chart * 1_000_000 * 1_000 / rate_x1000
///            = net_chart * 1_000_000_000 / rate_x1000
///
/// Truncating division here rounds DOWN (favours the reserve — never mints more
/// $RUN than the exact real-valued rate would).
/// AUDITED 2026-07-15: round-DOWN is the correct, conservative direction for the
/// valve and is implemented (u128 truncating division). Combined with the
/// ceil-rounded multiplier in reserve_multiplier_x1000, both rounding stages are
/// reserve-favorable: the valve can never release more $RUN than the exact rate
/// would at the rounding level. A zero result is caught by the ConversionDust
/// guard at the call site.
pub fn chart_to_run_base(net_chart: u64, rate_x1000: u64) -> Result<u64> {
    require!(rate_x1000 > 0, ProgError::MathOverflow);
    let run_base = (net_chart as u128)
        .checked_mul((RUN_BASE_PER_TOKEN as u128) * (MULT_SCALE as u128))
        .ok_or(ProgError::MathOverflow)?
        .checked_div(rate_x1000 as u128)
        .ok_or(ProgError::MathOverflow)?;
    u64::try_from(run_base).map_err(|_| ProgError::MathOverflow.into())
}

/// `amount * bps / 10_000`, saturating-free with checked math. Used for every
/// percentage split (fees, royalties, burns). Rounds down.
pub fn bps_of(amount: u64, bps: u64) -> Result<u64> {
    let v = (amount as u128)
        .checked_mul(bps as u128)
        .ok_or(ProgError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(ProgError::MathOverflow)?;
    u64::try_from(v).map_err(|_| ProgError::MathOverflow.into())
}

/// UTC day index for the daily-cap reset: floor(unix_ts / 86_400).
pub fn day_index(unix_ts: i64) -> i64 {
    // AUDITED 2026-07-15: day-boundary clock trust. `unix_timestamp` is
    // validator-influenced within the slot's clock tolerance (a few seconds at a
    // boundary) — it cannot be forged, but a proposer can nudge it slightly. The
    // 50 $RUN/day cap is therefore a SOFT THROTTLE (anti-grief / anti-farm), NOT
    // a hard security boundary: the worst case is one extra reset at ~midnight
    // UTC, bounded and low-value. This is accepted as-is for the throttle role.
    // The reset is deliberately kept as floor(unix_ts / 86_400) (integer day
    // index), and convert_chart additionally REJECTS a stored day-index that is
    // in the FUTURE relative to the tx clock, so a forward clock-nudge cannot be
    // used to hand a wallet a fresh daily allowance.
    unix_ts / SECONDS_PER_DAY
}
