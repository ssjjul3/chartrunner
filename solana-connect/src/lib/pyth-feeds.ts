/**
 * ChartRunner × Pyth Core — verifiable price-feed adapter
 * ========================================================
 *
 * Pyth fills the one slot the rest of the partner stack doesn't cover:
 * a verifiable, on-chain source of truth for price. Today, ChartRunner
 * fetches candles from Binance REST and trusts the client's score in
 * `chartrunner_registry::record_run`. With Pyth, score-grading and
 * match settlement happen against a Pyth Core price update — and a
 * forged score now requires forging Pyth's signed VAA, which can't be
 * done.
 *
 * SOURCE OF TRUTH:
 *   docs.pyth.network/price-feeds/use-real-time-data/solana
 *   github.com/pyth-network/pyth-crosschain
 *
 * STATUS:
 *   v0.9.11 — call signatures land per the docs surface. Stubs throw at
 *   runtime so the rest of the React app keeps type-checking; flip to
 *   the real Pyth client by uncommenting the imports below after the
 *   relevant npm packages are installed. Same documentation-as-code
 *   pattern as phoenix-rise.ts, magicblock-ephemeral.ts, and
 *   honeycomb-economy.ts.
 *
 * USAGE FROM THE GAME:
 *   The HTML prototype hits /solana-connect/?action=pyth-* with the
 *   feed and the action encoded in the URL. The React action handler
 *   in App.tsx parses, calls a function from this file, asks the wallet
 *   adapter to sign-and-send, and bounces back to /play/?pythAction=ok
 *   &sig=<tx>. Same redirect-and-return pattern as the other adapters.
 *
 * INSTALL:
 *   npm install @pythnetwork/hermes-client \
 *               @pythnetwork/pyth-solana-receiver
 *
 * THE FOUR SHAPES:
 *   1. Live chart   → streamPyth(feedId)               — Hermes WS
 *   2. Snapshot     → fetchLatestPrice(feedId)         — Hermes REST
 *   3. Verify       → postPriceUpdateAndVerify(feed)   — on-chain
 *   4. Read cert    → readPriceCertificate(payer,feed) — on-chain account
 */

import {
  type Connection,
  type PublicKey,
  type Transaction,
  type TransactionInstruction,
} from '@solana/web3.js';

// Real imports — uncomment after the npm install lands.
//
// import { HermesClient, PriceUpdate } from '@pythnetwork/hermes-client';
// import {
//   PythSolanaReceiver,
//   InstructionWithEphemeralSigners,
// } from '@pythnetwork/pyth-solana-receiver';

// ─── Configuration ─────────────────────────────────────────────────────────

/** Hermes — Pyth's hosted off-chain price service. */
export const HERMES_HTTP_URL = 'https://hermes.pyth.network';
export const HERMES_WS_URL   = 'wss://hermes.pyth.network/ws';

/** Pyth solana-receiver program — same on devnet and mainnet. */
export const PYTH_RECEIVER_PROGRAM_ID =
  'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ';

/** Wormhole core bridge program (devnet shown — switch for mainnet). */
export const WORMHOLE_DEVNET_CORE  = '3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5';
export const WORMHOLE_MAINNET_CORE = 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth';

/** chartrunner_oracle program — placeholder until first deploy. */
export const CHARTRUNNER_ORACLE_PROGRAM_ID_PLACEHOLDER =
  'OraclePLACEHOLDER111111111111111111111111111';

/**
 * Canonical feed IDs used by the game. Same 32-byte hex strings as the
 * Anchor program's FEED_*_USD constants — keep in sync. Source:
 * pyth.network/developers/price-feed-ids
 */
export const PYTH_FEED_IDS = {
  BTC_USD: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH_USD: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL_USD: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
} as const;

export type PythFeedSymbol = keyof typeof PYTH_FEED_IDS;

/** Canonical feed shape after we normalize Hermes responses. */
export type PythPrice = {
  /** Feed ID (without the leading 0x). */
  feedId:       string;
  /** Raw integer price; apply `exponent` to recover the float. */
  price:        bigint;
  /** Confidence interval (raw integer, same exponent). */
  conf:         bigint;
  /** Base-10 exponent. real = Number(price) * 10**exponent. */
  exponent:     number;
  /** Unix seconds when Pyth signed this update. */
  publishTime:  number;
};

/** Convenience: turn a Pyth raw price into a plain JS number. */
export function pythPriceToFloat(p: PythPrice): number {
  return Number(p.price) * Math.pow(10, p.exponent);
}

// ─── Hermes — REST snapshot ───────────────────────────────────────────────

/**
 * Fetch the most recent price for one or more feeds. Cheap; no wallet
 * needed. Use this for the in-game "live" tape and detector inputs.
 *
 * Real call (after install):
 *   const hermes = new HermesClient(HERMES_HTTP_URL);
 *   const updates = await hermes.getLatestPriceUpdates(feedIds);
 *
 * Hermes returns the price update encoded as a base64 VAA plus a parsed
 * `parsed` field containing the (price, conf, expo, publish_time) tuple.
 * For the live tape we only need `parsed`; for on-chain verify we need
 * the VAA bytes (see postPriceUpdateAndVerify below).
 */
export async function fetchLatestPrices(feedIds: string[]): Promise<PythPrice[]> {
  if (feedIds.length === 0) return [];
  // Real:
  //   const hermes  = new HermesClient(HERMES_HTTP_URL);
  //   const updates = await hermes.getLatestPriceUpdates(feedIds);
  //   return updates.parsed.map(u => ({
  //     feedId:      u.id,
  //     price:       BigInt(u.price.price),
  //     conf:        BigInt(u.price.conf),
  //     exponent:    u.price.expo,
  //     publishTime: u.price.publish_time,
  //   }));
  throw new Error('install @pythnetwork/hermes-client to enable Pyth feeds');
}

/**
 * REST helper: pull historical candles from Hermes' benchmark endpoint
 * for replay / backtest mode. ChartRunner uses this to seed the game
 * with the same chart data Pyth's verify path validates against — so
 * "replay" and "live" share a price source for the first time.
 *
 * Endpoint: GET {HERMES_HTTP_URL}/v2/updates/price/{publishTimeSec}?ids[]=...
 * Returns a parsed array identical to fetchLatestPrices.
 */
export async function fetchHistoricalPriceAt(
  feedIds: string[],
  publishTimeSec: number,
): Promise<PythPrice[]> {
  void feedIds; void publishTimeSec;
  throw new Error('install @pythnetwork/hermes-client to enable historical Pyth reads');
}

// ─── Hermes — WebSocket stream ─────────────────────────────────────────────

/**
 * Subscribe to Hermes' price-update stream over WebSocket. Pushes a
 * normalized PythPrice on every Pyth update for the requested feeds.
 * ~400 ms cadence per feed.
 *
 * Returns a disposer; call it to close the WS.
 *
 *   const dispose = streamPyth([PYTH_FEED_IDS.BTC_USD], (p) => {
 *     console.log('BTC tick', pythPriceToFloat(p));
 *   });
 *   // …later…
 *   dispose();
 */
export function streamPyth(
  feedIds: string[],
  onPrice: (p: PythPrice) => void,
  onError?: (err: unknown) => void,
): () => void {
  void feedIds; void onPrice; void onError;
  // Real:
  //   const hermes  = new HermesClient(HERMES_HTTP_URL);
  //   const stream  = await hermes.getPriceUpdatesStream(feedIds);
  //   stream.onmessage = (e) => onPrice(normalize(JSON.parse(e.data)));
  //   stream.onerror   = (e) => onError?.(e);
  //   return () => stream.close();
  throw new Error('install @pythnetwork/hermes-client to enable Pyth streaming');
}

// ─── On-chain verify path ──────────────────────────────────────────────────

/**
 * Post a fresh Pyth update to a PriceUpdateV2 account on Solana, then
 * call chartrunner_oracle::verify_price to write a PriceCertificate
 * PDA the trader's record_run / tick_player can cite.
 *
 * Two-step under the hood:
 *   1. Pyth solana-receiver builds N "post-update" instructions that
 *      write the VAA to an ephemeral PriceUpdateV2 account.
 *   2. We append our own verify_price ix that reads from that account
 *      and writes the certificate PDA.
 *
 * Built atomically as a single TransactionMessage so a partial failure
 * doesn't leave a half-written PriceUpdateV2 account hanging around.
 *
 *   const tx = await postPriceUpdateAndVerify({
 *     conn, payer: wallet.publicKey, feedSymbol: 'BTC_USD',
 *   });
 *   const sig = await wallet.sendTransaction(tx, conn);
 */
export async function postPriceUpdateAndVerify(args: {
  conn: Connection;
  payer: PublicKey;
  feedSymbol: PythFeedSymbol;
  /** Override the freshness gate; defaults to chartrunner_oracle's MAX_PRICE_AGE_SEC. */
  maxAgeSec?: number;
}): Promise<Transaction> {
  void args;
  // Real (sketch):
  //   const hermes   = new HermesClient(HERMES_HTTP_URL);
  //   const update   = await hermes.getLatestPriceUpdates([PYTH_FEED_IDS[args.feedSymbol]]);
  //   const vaa      = update.binary.data[0]; // base64 VAA bytes
  //   const receiver = new PythSolanaReceiver({
  //     connection: args.conn,
  //     wallet:     /* AnchorProvider wallet */,
  //   });
  //   const txBuilder = receiver.newTransactionBuilder({ closeUpdateAccounts: true });
  //   await txBuilder.addPostPriceUpdates([vaa]);
  //   await txBuilder.addPriceConsumerInstructions(async (priceUpdates) => {
  //     return [{
  //       instruction: await buildVerifyPriceIx({
  //         payer:        args.payer,
  //         priceUpdate:  priceUpdates[PYTH_FEED_IDS[args.feedSymbol]].address,
  //         feedIdHex:    PYTH_FEED_IDS[args.feedSymbol],
  //         maxAgeSec:    args.maxAgeSec,
  //       }),
  //       signers: [],
  //     }];
  //   });
  //   const txs = await txBuilder.buildVersionedTransactions({ computeUnitPriceMicroLamports: 50_000 });
  //   return txs[0].tx; // single tx in the common case
  throw new Error('install @pythnetwork/pyth-solana-receiver to enable on-chain Pyth verify');
}

/**
 * Build the chartrunner_oracle::verify_price instruction. Returned
 * stand-alone so callers can compose it into their own bundles
 * (e.g. record_run-with-price-citation or tick_player-with-snapshot).
 */
export async function buildVerifyPriceIx(_args: {
  payer: PublicKey;
  priceUpdate: PublicKey;
  feedIdHex: string;
  maxAgeSec?: number;
}): Promise<TransactionInstruction> {
  // Real:
  //   import { Program, AnchorProvider } from '@coral-xyz/anchor';
  //   import idl from '../idl/chartrunner_oracle.json';
  //   const program = new Program(idl, CHARTRUNNER_ORACLE_PROGRAM_ID, provider);
  //   return program.methods
  //     .verifyPrice(_args.feedIdHex, _args.maxAgeSec ?? null)
  //     .accounts({
  //       payer:       _args.payer,
  //       priceUpdate: _args.priceUpdate,
  //       certificate: derivePriceCertPda(_args.payer, _args.feedIdHex),
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .instruction();
  throw new Error('install @coral-xyz/anchor + chartrunner_oracle IDL to build verify_price ix');
}

/**
 * Derive the PriceCertificate PDA seeded by (payer, feed_id_hex). Same
 * seeds as chartrunner_oracle's #[account(seeds = [...])] declaration.
 */
export function derivePriceCertPda(_payer: PublicKey, _feedIdHex: string): PublicKey {
  // Real:
  //   const [pda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from('cert'), _payer.toBuffer(), Buffer.from(_feedIdHex)],
  //     new PublicKey(CHARTRUNNER_ORACLE_PROGRAM_ID),
  //   );
  //   return pda;
  throw new Error('derivePriceCertPda needs @solana/web3.js fully wired + program ID rotated');
}

/**
 * Read a PriceCertificate PDA back from chain. Used by the game's HUD
 * + the registry program when it wants to cite the trader's last
 * verified price for record_run.
 */
export async function readPriceCertificate(_args: {
  conn: Connection;
  payer: PublicKey;
  feedIdHex: string;
}): Promise<PythPrice> {
  // Real:
  //   const pda  = derivePriceCertPda(_args.payer, _args.feedIdHex);
  //   const data = await _args.conn.getAccountInfo(pda);
  //   if (!data) throw new Error('certificate not found — call postPriceUpdateAndVerify first');
  //   const parsed = await program.account.priceCertificate.fetch(pda);
  //   return {
  //     feedId:      _args.feedIdHex,
  //     price:       BigInt(parsed.price.toString()),
  //     conf:        BigInt(parsed.conf.toString()),
  //     exponent:    parsed.exponent,
  //     publishTime: Number(parsed.publishTime),
  //   };
  throw new Error('install chartrunner_oracle IDL + rotate program ID to read certificates');
}

// ─── End ──────────────────────────────────────────────────────────────────
