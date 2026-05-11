# ChartRunner — Security Posture & Audit Request
**Submission target:** Adevar Labs · $50k Security Audit Credits — Frontier Hackathon Track
**Date:** 2026-05-11
**Project:** ChartRunner — gamified Solana trading SDK
**Frontier submission:** filed, Germany-region team

---

## 1 · Why we want an audit

ChartRunner runs two Anchor programs live on Solana devnet today (`chartrunner_maps`, `chartrunner_registry`) and ships two more once the Anchor 0.32.1 / Rust 1.85 toolchain unblocks (`chartrunner_match`, `chartrunner_oracle`). The registry program in particular holds escrow logic for on-chain entity sales (bots / strategies / indicators / maps / tools) with a protocol fee. Any flaw in the buy/sell/fee math is a direct revenue leak for both creators and the protocol.

We are not security professionals. We are a small team that built ChartRunner as a Frontier submission and want the on-chain primitives audited before we ask players to trust them with real value at mainnet.

Adevar Labs' Frontier audit-credit program is the right fit: we already submitted to Frontier (Germany region), we're in the DeFi / Consumer Apps category by the bounty's criteria, and the credit applies against the actual audit cost.

## 2 · Programs in scope

### 2.1 — `chartrunner_maps` · LIVE on devnet
**Program ID:** `DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH`
**Source:** `anchor/programs/chartrunner-maps/src/lib.rs`
**Surface:** one instruction (`save_map`).
**PDA:** `["map", owner, name]`, `init_if_needed`, `space = 8 + 32 + (4+64) + 32 + 8 + 1`.
**Risk surface:**
- Re-save with the same name overwrites hash + timestamp. PDA seeds make hijack impossible across wallets, but worth confirming the upgrade-safety of `init_if_needed` under Anchor's current security advisories.
- No delete instruction; map PDAs are effectively immutable rent-locked. By design, but auditors should confirm rent calc is correct.

### 2.2 — `chartrunner_registry` · LIVE on devnet
**Program ID:** `ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn`
**Source:** `anchor/programs/chartrunner-registry/src/lib.rs`
**Surface:** 6 instructions — `save_entity`, `delete_entity`, `list_entity`, `buy_entity`, `cancel_listing`, `record_run`.
**Risk surface — primary concern:**
- `buy_entity` does the heaviest math: `fee = (price * PROTOCOL_FEE_BPS) / 10000`, then transfers `price - fee` from buyer to seller and `fee` to treasury, creates a `License` PDA. We use `checked_mul` and `checked_sub`. Want auditors to confirm no edge case where the License is minted but the fee transfer underflows or vice versa.
- `record_run` enforces caps (`MAX_RUN_SCORE = 1_000_000`, `MAX_SHARPE_X100 = 10_000`, `MAX_DURATION_SEC = 86_400`) — verify the clamps work as intended on the wire.
- `cancel_listing` closes the Listing PDA to seller; verify no race with `buy_entity`.
- Anchor's `close = owner` on `delete_entity` — confirm rent refund target is correct.

### 2.3 — `chartrunner_match` · SCAFFOLDED, blocked on toolchain
**Source:** `anchor/programs/chartrunner-match/src/lib.rs`
**Target:** MagicBlock ephemeral rollups for 1v1 / NvN match state.
**Blocker:** `block-buffer 0.12` needs Rust 1.85+; platform-tools v1.51 ships 1.84. Waiting on Anza release.

### 2.4 — `chartrunner_oracle` · SCAFFOLDED, blocked on toolchain
**Source:** `anchor/programs/chartrunner-oracle/src/lib.rs`
**Target:** price oracle for in-game candles vs. real Binance data attestation.
**Blocker:** same as match.

## 3 · Off-chain security posture

### Client-side
- `ChartRunner_Prototype.html` is a 2 MB single-file canvas game. All state in localStorage; no server-side backend.
- Wallet integration via Phantom direct (no third-party wallet adapter on the hot path since v1.0.18).
- v1.0.47 ships direct in-page `phantom.signAndSendTransaction` for `save_map`, bypassing the legacy `/solana-connect/` React-app bounce. The bounce remains as a fallback if Phantom isn't injected.
- localStorage is namespaced per wallet (`cr_<key>_v1::<pubkey>`) via a `Storage.prototype` shim — see `v0.9.3` notes. Avoids cross-wallet data leak.

### Network
- Static GitHub Pages deploy at `chartrunner.xyz/play/`. No backend except the public devnet RPC.
- Email destinations gated: `whitelist@chartrunner.xyz` for waitlist form only, `info@chartrunner.xyz` for everything else.

### Wallet
- Boot login: direct Phantom `connect()` only, no `signMessage` since v1.0.18 (was creating Arc-browser full-page modal issues).
- Whitelist check is client-side; we are NOT relying on this for security — anyone can read it. The check exists for the demo-flow experience only.

## 4 · Upgrade-authority posture (M0.5)

Both LIVE programs currently have a single-key upgrade authority. The post-Frontier M0.5 milestone moves both to a Squads multisig before mainnet. We will transfer authority via `solana program set-upgrade-authority` to a 2-of-3 Squads vault (same vault used by Helius / Jito / Kamino / Jupiter).

For the audit, we'd prefer auditors review the programs **at current authority** (single key, easy redeploys for fixes) and we move to multisig **after** the audit fixes land.

## 5 · What we'd use the credits for

| Item | Estimated value |
|---|---|
| `chartrunner_registry` full audit (heaviest, escrow + fee math) | ~$8k |
| `chartrunner_maps` audit (smaller program) | ~$3k |
| Re-audit pass after fix landing | ~$2k |
| Optional: pre-deploy review of `chartrunner_match` + `chartrunner_oracle` when toolchain unblocks | TBD |

If we win Tier 5 ($10k credit), the credit covers ~50% of the registry audit per the track's stated cap — we'd cover the rest from operating budget.

## 6 · Open questions for the audit

We'd specifically like answers to:

1. Is `init_if_needed` on `chartrunner_maps.save_map` exposed to any of the known reinitialization attack patterns Anchor flagged in 0.30.x advisories?
2. Does `chartrunner_registry.buy_entity` have any state where the License PDA is created but the fee transfer fails (or vice versa) such that the buyer pays but doesn't receive the License? We use Anchor's `init` + `Transfer` ordering — want to confirm.
3. Is our `Clock::get()?.unix_timestamp` usage in `saved_at` / `listed_at` / `boughtAt` / `recordedAt` safe under clock manipulation? We don't gate any logic on these timestamps but they're written into PDAs.
4. Are there any rent-exemption edge cases on `close = owner` for `delete_entity` that could leave the account in a partially-closed state?
5. General: any high-severity issues we should fix before considering mainnet deploy?

## 7 · Contact

- **Project:** chartrunner.xyz
- **Frontier submission:** filed (Germany)
- **Repo:** github.com/<owner>/chartrunner (public)
- **Contact email:** info@chartrunner.xyz
- **Audit lead:** Julian (founder)
- **Preferred timeline:** post-Frontier-results announcement → 2-week scoping → audit kickoff

We commit to landing audit-suggested fixes within 14 days of report delivery, including a re-audit pass.

---

*ChartRunner is a German-built Solana trading game with two LIVE Anchor programs on devnet (~$0.0009 rent per anchored map). Our pitch + demo video are at chartrunner.xyz. We treat security as a load-bearing concern, not a launch-day afterthought — that's why we're applying before mainnet, not after.*
