//! Instruction handlers + their Anchor Accounts contexts, grouped by concern:
//!   config  — governance root, circuit breaker, authority rotation
//!   mint    — genesis $RUN mint (once) + TGE authority handoff
//!   convert — the $CHART → $RUN conversion valve (reserve-backed)
//!   sinks   — $RUN burn/treasury sinks (cosmetics, tournaments, marketplace, SOL P2P)
//!   market  — the licensed-agent-market (the T5 anti-sybil $RUN sink)

pub mod config;
pub mod convert;
pub mod market;
pub mod mint;
pub mod sinks;

pub use config::*;
pub use convert::*;
pub use market::*;
pub use mint::*;
pub use sinks::*;
