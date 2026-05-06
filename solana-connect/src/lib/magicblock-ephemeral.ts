/**
 * ChartRunner × MagicBlock Ephemeral Rollups — client adapter
 * ============================================================
 *
 * Wraps `@magicblock-labs/ephemeral-rollups-sdk` so the ChartRunner game
 * can route per-tick match updates through MagicBlock's Ephemeral Rollup
 * (sub-millisecond, zero-fee) instead of the base Solana layer.
 *
 * Pairs with the on-chain side: `anchor/programs/chartrunner-match` —
 * see that program's lib.rs for the matching instruction surface.
 *
 * SOURCE OF TRUTH:
 *   github.com/magicblock-labs/magicblock-engine-examples/tree/main/anchor-counter
 *   github.com/magicblock-labs/ephemeral-counter-ui
 *   docs.magicblock.gg
 *
 * STATUS:
 *   v0.9.9 scaffold — call shapes are derived from the public counter
 *   example. The npm package `@magicblock-labs/ephemeral-rollups-sdk@^0.0.4`
 *   IS published (verified — different from the @ellipsis-labs/rise package
 *   which is not yet on public npm). When you're ready to wire this in:
 *     1. cd solana-connect && npm install @magicblock-labs/ephemeral-rollups-sdk
 *     2. Uncomment the real imports below + remove the local stubs
 *     3. Add the action handlers to App.tsx (phoenix-place-* style)
 *
 * LIFECYCLE OVERVIEW:
 *   Base layer (Solana devnet)             Ephemeral Rollup (MagicBlock)
 *   --------------------------             -----------------------------
 *   1. init_match (host)             ─→
 *   2. join_match (each player)      ─→
 *   3. delegate_match (host)         ─→ ──┐
 *                                         │  4. tick_player × N (any player, sub-ms)
 *                                         │  5. tick_player × N
 *                                         │  ...
 *   6. commit_match                  ←── ─┘  (state pushed back, delegation kept)
 *                                         ┌─ (more ticks continue)
 *   7. commit_and_finish             ←── ─┘  (final commit + undelegate)
 *   8. registry::record_run (each)         (bonus: anchor on leaderboard)
 */

import {
  type Connection,
  type Transaction,
  PublicKey,
} from '@solana/web3.js';

// Real imports — uncomment after `npm install @magicblock-labs/ephemeral-rollups-sdk`.
// Verified on 2026-05-06 that v0.0.4 is published to public npm
// (different from @ellipsis-labs/rise which isn't yet).
//
// import {
//   GetCommitmentSignature,
//   createUndelegateInstruction,
// } from '@magicblock-labs/ephemeral-rollups-sdk';

// Local stubs — keep this file type-checking until the real package is
// installed. Replace these two declarations with the real imports above.
async function GetCommitmentSignature(_txHash: string, _conn: Connection): Promise<string> {
  throw new Error('install @magicblock-labs/ephemeral-rollups-sdk');
}
function createUndelegateInstruction(_p: any): any {
  throw new Error('install @magicblock-labs/ephemeral-rollups-sdk');
}

// ─── Configuration ─────────────────────────────────────────────────────────

/** MagicBlock Ephemeral Rollup endpoint — devnet. The PDA must be delegated
 *  to the corresponding validator (see VALIDATOR_PUBKEY below) before any
 *  transactions sent here will land. Trailing slash matters in some clients;
 *  we strip it in createEphemeralConnection() to be safe. */
export const MAGICBLOCK_DEVNET_HTTP = 'https://devnet-as.magicblock.app/';
export const MAGICBLOCK_DEVNET_WS   = 'wss://devnet-as.magicblock.app/';

/** Alternative endpoint exposed by the MagicBlock front-end (see ui_Wallet.tsx
 *  in the reference UI). Functionally equivalent for read traffic; both
 *  validators commit back to the same Solana base layer. */
export const MAGICBLOCK_DEVNET_RPC_ALT = 'https://rpc.magicblock.app/devnet';

/** Devnet validator pubkey — pass this as the first remaining-account on the
 *  `delegate_match` ix so the program pins delegation to a specific
 *  validator. Different from the localnet pubkey (mAGicPQ...). */
export const MAGICBLOCK_DEVNET_VALIDATOR =
  new PublicKey('MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57');

/** Localnet validator pubkey — used by the test harness when running an
 *  integration test against `solana-test-validator` with the MagicBlock
 *  ephemeral validator process attached. Probably never used in the live
 *  game; keep here for completeness. */
export const MAGICBLOCK_LOCALNET_VALIDATOR =
  new PublicKey('mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev');

/** chartrunner_match program ID — placeholder until the program is deployed
 *  via Solana Playground (same flow as chartrunner_maps + chartrunner_
 *  registry). When you deploy:
 *    1. Paste lib.rs + Cargo.toml into Playground
 *    2. Click Build → Deploy
 *    3. Copy the printed program ID into this constant + into the program's
 *       declare_id! macro */
export const CHARTRUNNER_MATCH_PROGRAM = new PublicKey(
  'MatchPLACEHOLDER1111111111111111111111111111'
);

// ─── Connection helpers ────────────────────────────────────────────────────

/**
 * Build a `Connection` pointed at MagicBlock's ER endpoint. After a PDA is
 * delegated, transactions for that PDA must be sent here, NOT to the base
 * `https://api.devnet.solana.com` connection.
 *
 * The reference UI (ephemeral-counter-ui/src/App.tsx) keeps the ER and base
 * connections in parallel (`connection` for base, `ephemeralConnection` for
 * ER) and routes per-tx based on whether the relevant PDA is delegated.
 * ChartRunner should follow the same pattern — see the in-game `crChartHost`
 * for where to wire this.
 */
export function createEphemeralConnection(): Connection {
  // The Solana web3.js Connection class is loaded via the import at the top
  // of this file. We construct it inline to keep the helper one-line.
  const { Connection: Conn } = require('@solana/web3.js');
  return new Conn(MAGICBLOCK_DEVNET_HTTP.replace(/\/$/, ''), {
    wsEndpoint: MAGICBLOCK_DEVNET_WS,
    commitment: 'confirmed',
  });
}

// ─── Lifecycle helpers ─────────────────────────────────────────────────────

/**
 * After a `delegate_match` tx lands on the base layer, MagicBlock takes a
 * few hundred ms to propagate the delegation to its validators. Race
 * conditions if you send tick_player too soon → tx errors with "account not
 * delegated." The reference test waits 3 seconds; we do the same.
 */
export async function waitForDelegationPropagation(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}

/**
 * After sending a `commit` or `commit_and_finish` tx to the ER, this helper
 * waits for the *base layer* signature confirming the commit landed there.
 * Useful for the host UI to display "✓ checkpoint anchored at slot X" after
 * a periodic commit.
 *
 * Wraps the Magic SDK's GetCommitmentSignature(...) helper.
 */
export async function awaitCommitmentOnBaseLayer(
  erTxHash: string,
  ephemeralConnection: Connection,
): Promise<string> {
  return await GetCommitmentSignature(erTxHash, ephemeralConnection);
}

/**
 * Build a manual undelegate instruction. Useful as an escape hatch if
 * commit_and_finish isn't viable (e.g., the ER validator is degraded and
 * the host wants to forcibly return the PDA to base-layer ownership).
 *
 * Wraps the Magic SDK's createUndelegateInstruction(...) helper.
 */
export function buildManualUndelegateIx(args: {
  payer: PublicKey;
  delegatedAccount: PublicKey;
  reimbursement: PublicKey;
}): any {
  return createUndelegateInstruction({
    payer:           args.payer,
    delegatedAccount: args.delegatedAccount,
    ownerProgram:    CHARTRUNNER_MATCH_PROGRAM,
    reimbursement:   args.reimbursement,
  });
}

// ─── Action handlers (called from solana-connect/src/App.tsx) ──────────────

/**
 * Submit a transaction that should run on the ER.
 *
 * The pattern from the reference UI's `submitTransaction(...)`:
 *   1. Get latest blockhash from the EPHEMERAL connection (NOT base)
 *   2. Set fee payer + blockhash
 *   3. Sign with the wallet
 *   4. sendRawTransaction({ skipPreflight: true }) on the EPHEMERAL conn
 *   5. confirmTransaction on the EPHEMERAL conn
 *
 * Critical: skipPreflight: true is required because the ER doesn't run
 * preflight simulation against the base-layer state — it would fail
 * spuriously for delegated accounts.
 */
export async function submitErTransaction(
  tx: Transaction,
  ephemeralConnection: Connection,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  feePayer: PublicKey,
): Promise<string> {
  const { context, value } = await ephemeralConnection.getLatestBlockhashAndContext();
  if (!tx.recentBlockhash) tx.recentBlockhash = value.blockhash;
  if (!tx.feePayer)        tx.feePayer        = feePayer;
  const signed = await signTransaction(tx);
  const signature = await ephemeralConnection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    minContextSlot: context.slot,
  });
  await ephemeralConnection.confirmTransaction(
    { blockhash: value.blockhash, lastValidBlockHeight: value.lastValidBlockHeight, signature },
    'confirmed',
  );
  return signature;
}

// ─── Notes for game-side wiring ────────────────────────────────────────────
//
// 1. WHERE THIS FILE GETS WIRED IN (App.tsx)
//    Add new action cases:
//      'mb-delegate-match'      → calls chartrunner_match::delegate_match (BASE)
//      'mb-tick-player'         → tick_player on the ER
//      'mb-commit-match'        → commit_match on the ER (state → base)
//      'mb-commit-and-finish'   → commit_and_finish (commit + undelegate)
//      'mb-undelegate-manual'   → buildManualUndelegateIx (escape hatch)
//
// 2. GAME-SIDE WIRING (ChartRunner_Prototype.html)
//    The crChartHost IIFE manages the connection used for chart data. When a
//    match starts, the host should:
//      - Send delegate_match via /solana-connect/?action=mb-delegate-match
//      - On return, switch crChartHost.connection to createEphemeralConnection()
//      - Per-tick, build a tick_player tx and submit via submitErTransaction
//      - Every COMMIT_INTERVAL_MS (30s), send commit_match for verifiability
//      - On match end, commit_and_finish → switch back to base connection
//      - Pipe each player's final score into chartrunner_registry::record_run
//
// 3. FEE-PAYER STRATEGY (TEMP KEYPAIR PATTERN)
//    The reference UI uses a "temp keypair" derived from the wallet's pubkey
//    via `Keypair.fromSeed(publicKey.toBytes())`. Players get auto-funded
//    0.1 SOL into this keypair, then it pays for ER txs without prompting
//    Phantom/Backpack on every tick.
//    For ChartRunner's match flow, this is the right pattern — without it,
//    players would see a wallet popup every frame they move. NOT SECURE for
//    real money (the temp keypair is deterministic from the public key, so
//    it's not a secret), but fine for ER fees because ER fees are ~zero.
//    DO NOT use the temp keypair to authorize anything mainnet/financial.
//
// 4. SUBSCRIBE TO ACCOUNT CHANGES FOR LIVE OPPONENTS
//    `ephemeralConnection.onAccountChange(matchPda, callback, 'confirmed')`
//    fires on every committed update to the MatchState PDA. The reference UI
//    uses this to render "the other counter changed" in real time.
//    For ChartRunner: subscribe in-match, decode each opponent's position +
//    score, render their runner avatar in the upper world overlay.
//
// 5. ENDPOINT FALLBACKS
//    If MAGICBLOCK_DEVNET_HTTP returns 503 / connection refused, MagicBlock
//    sometimes routes traffic via MAGICBLOCK_DEVNET_RPC_ALT. The reference
//    UI defaults to a custom env var (REACT_APP_MAGICBLOCK_URL) — we should
//    expose VITE_MAGICBLOCK_URL in solana-connect for parity.
//
// 6. TEMP / DEFERRED
//    - Match recovery flow if the ER goes down mid-match (orphaned PDAs)
//    - Privacy: the public-counter is fully public; the PRIVATE-counter
//      variant in the same example uses the Private Ephemeral Rollup (PER)
//      product. Worth evaluating if ChartRunner ever needs hidden state
//      (e.g., bracket prices that aren't visible to opponents until commit).
//    - Match dispute resolution / oracle integration with chartrunner_oracle
