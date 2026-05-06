/**
 * ChartRunner × Phoenix Rise — broker adapter
 * ============================================
 *
 * Wraps the Rise SDK so ChartRunner's in-game primitives (bracket, OCO,
 * limit, market, stop-loss) route to live Phoenix perpetual orders on
 * Solana mainnet. Every order is wrapped with the Flight builder layer
 * so ChartRunner accrues fee_bps on every routed instruction.
 *
 * SOURCE OF TRUTH:
 *   docs.phoenix.trade — the Rise SDK page
 *   github.com/Ellipsis-Labs/rise-public/blob/master/ts/examples/
 *
 * STATUS:
 *   v0.9.7 — call signatures land per the docs surface. The TS bracket
 *   path is composed from market + stop-loss + take-profit limit because
 *   the public docs only show place_position_bracket_order in Rust;
 *   verify against ts/examples/ before mainnet deploy.
 *
 * USAGE FROM THE GAME:
 *   The HTML prototype hits /solana-connect/?action=phoenix-place-bracket
 *   (or similar) with the bracket params encoded in the URL. The React
 *   action handler in App.tsx parses, calls the function in this file,
 *   builds the ix, asks the wallet adapter to sign and send. On success
 *   it bounces back to /play/?phxAction=ok&sig=<tx>. Same redirect-and-
 *   return pattern as crRegistry's record_run flow.
 *
 * INSTALL:
 *   npm install @ellipsis-labs/rise
 */

import { Transaction, type TransactionInstruction } from '@solana/web3.js';

// Real imports — uncomment after `npm install @ellipsis-labs/rise` succeeds.
// As of 2026-05-06 the public npm registry does NOT serve a published version
// matching `^0.1.0` (verified via `npm view @ellipsis-labs/rise`). Until the
// Rise team publishes (or we get a private registry / GitHub-tarball install
// path), this file is documentation-as-code: the call shapes are correct per
// docs.phoenix.trade, but the imports are stubs and runtime calls throw.
//
// import {
//   Direction,
//   MarginType,
//   Side,
//   StopLossOrderKind,
//   createPhoenixClient,
//   flight,
//   PhoenixHttpClient,
// } from '@ellipsis-labs/rise';

// Local enum stubs that mirror the public Rise types — keep this file
// type-checking until the real import is enabled. Replace with the real
// imports above once the package is installable.
const Side             = { Bid: 'Bid' as const,            Ask: 'Ask' as const };
const Direction        = { LessThan: 'LessThan' as const,  GreaterThan: 'GreaterThan' as const };
const StopLossOrderKind = { IOC: 'IOC' as const,           FoK: 'FoK' as const };
const MarginType       = { Cross: 'Cross' as const,        Isolated: 'Isolated' as const };
function createPhoenixClient(_: any): any { throw new Error('install @ellipsis-labs/rise'); }
class PhoenixHttpClient {
  constructor(_: any) { throw new Error('install @ellipsis-labs/rise'); }
  invite(): any        { throw new Error('install @ellipsis-labs/rise'); }
}
const flight = {
  buildRegisterBuilderIx: (_: any): Promise<any> => { throw new Error('install @ellipsis-labs/rise'); },
};

// ─── Configuration ─────────────────────────────────────────────────────────
// All endpoints from docs.phoenix.trade.
export const PHOENIX_API_URL = 'https://perp-api.phoenix.trade';
export const PHOENIX_RPC_URL = 'https://api.mainnet-beta.solana.com';

// The Flight builder identity — replace with the actual ChartRunner builder
// authority once Phoenix issues us a builder slot. Until then this is a
// placeholder; orders won't accrue fees to ChartRunner.
//
// To register the slot:
//   1. Run registerChartRunnerAsFlightBuilder() (below) ONCE with this
//      authority's wallet signing.
//   2. The trader account becomes the fee collector.
//   3. Withdrawable fees show up on phoenix.trade frontend under that wallet.
//
// PROD: rotate this to a multisig-controlled builder authority before mainnet.
export const CHARTRUNNER_BUILDER_AUTHORITY =
  'PDi6BNFCbGE9H72zxCMNWpDfWo5Rp3gvdhCyfpfcAWM'; // Julian's deployer wallet — placeholder

export const CHARTRUNNER_BUILDER_PDA_INDEX = 0;
export const CHARTRUNNER_BUILDER_SUBACCOUNT_INDEX = 0;
export const CHARTRUNNER_FLIGHT_FEE_BPS = 25n; // 0.25% builder fee

// ─── Types — stable surface for the rest of solana-connect ────────────────
// If Rise renames things internally, only this file changes.
export type PhoenixSide = 'bid' | 'ask';

export interface PhoenixOrderBase {
  authority: string;            // signer pubkey
  symbol: string;               // e.g. "SOL-PERP"
  side: PhoenixSide;
}

export interface PhoenixLimitOrder extends PhoenixOrderBase {
  type: 'limit';
  priceUsd: string;             // Rise takes USD as a string for precision
  baseUnits: string;            // "0.25" of base asset
}

export interface PhoenixMarketOrder extends PhoenixOrderBase {
  type: 'market';
  baseUnits: string;
}

export interface PhoenixStopLoss extends PhoenixOrderBase {
  type: 'stopLoss';
  triggerPrice: bigint;         // Rise takes ticks; convert from USD via market metadata
  executionDirection: 'less' | 'greater';
  orderKind: 'IOC' | 'FoK';
}

export interface PhoenixBracket extends PhoenixOrderBase {
  type: 'bracket';
  baseUnits: string;
  takeProfitUsd?: string;       // optional TP leg
  stopLossUsd?: string;         // optional SL leg
}

export type PhoenixOrder =
  | PhoenixLimitOrder
  | PhoenixMarketOrder
  | PhoenixStopLoss
  | PhoenixBracket;

// ─── Internal helpers ──────────────────────────────────────────────────────
function sideToRise(s: PhoenixSide) {
  return s === 'bid' ? Side.Bid : Side.Ask;
}

// ─── Client construction ───────────────────────────────────────────────────
// Build a Rise client wired to the Flight builder layer. Reusable across
// every place* helper in this file.
//
// Call once per request — the React App.tsx action handler is short-lived
// (one redirect cycle), so caching across requests isn't needed.
export function createChartRunnerPhoenixClient() {
  return createPhoenixClient({
    apiUrl:  PHOENIX_API_URL,
    rpcUrl:  PHOENIX_RPC_URL,
    ws:      false,                     // streams come from streamL2Book(...)
    exchangeMetadata: { stream: false },
    flight: {
      builderAuthority:       CHARTRUNNER_BUILDER_AUTHORITY,
      builderPdaIndex:        CHARTRUNNER_BUILDER_PDA_INDEX,
      builderSubaccountIndex: CHARTRUNNER_BUILDER_SUBACCOUNT_INDEX,
    },
  });
}

// ─── Order placement helpers ───────────────────────────────────────────────

export async function buildLimitOrderTx(o: PhoenixLimitOrder): Promise<Transaction> {
  const client = createChartRunnerPhoenixClient();
  const packet = await client.orderPackets.buildLimitOrderPacket({
    symbol:    o.symbol,
    side:      sideToRise(o.side),
    priceUsd:  o.priceUsd,
    baseUnits: o.baseUnits,
  });
  const ix = await client.ixs.placeLimitOrder({
    authority:   o.authority,
    symbol:      o.symbol,
    orderPacket: packet,
  });
  // Flight wrapping happens automatically because the client was built
  // with `flight: { builderAuthority, … }`.
  return new Transaction().add(ix as TransactionInstruction);
}

export async function buildMarketOrderTx(o: PhoenixMarketOrder): Promise<Transaction> {
  const client = createChartRunnerPhoenixClient();
  const packet = await client.orderPackets.buildMarketOrderPacket({
    symbol:    o.symbol,
    side:      sideToRise(o.side),
    baseUnits: o.baseUnits,
  });
  const ix = await client.ixs.placeMarketOrder({
    authority:   o.authority,
    symbol:      o.symbol,
    orderPacket: packet,
  });
  return new Transaction().add(ix as TransactionInstruction);
}

export async function buildStopLossTx(o: PhoenixStopLoss): Promise<Transaction> {
  const client = createChartRunnerPhoenixClient();
  const ix = await client.ixs.buildPlaceStopLoss({
    authority:           o.authority,
    symbol:              o.symbol,
    tradeSide:           sideToRise(o.side),
    executionDirection:  o.executionDirection === 'less'
                           ? Direction.LessThan
                           : Direction.GreaterThan,
    orderKind:           o.orderKind === 'IOC'
                           ? StopLossOrderKind.IOC
                           : StopLossOrderKind.FoK,
    triggerPrice:        o.triggerPrice,
  });
  return new Transaction().add(ix as TransactionInstruction);
}

/**
 * Compose a bracket as: market entry + (optional) stop-loss + (optional)
 * take-profit limit. The Rust SDK exposes a single `place_position_bracket_
 * order` ix; the public TS surface in the docs paste does not, so we
 * compose manually. **Verify against ts/examples/ before mainnet** — Rise
 * may expose a single bracket ix in TS that's not yet in the docs.
 */
export async function buildBracketTx(o: PhoenixBracket): Promise<Transaction> {
  const client = createChartRunnerPhoenixClient();
  const tx = new Transaction();

  // 1) Entry — market order
  const entryPacket = await client.orderPackets.buildMarketOrderPacket({
    symbol:    o.symbol,
    side:      sideToRise(o.side),
    baseUnits: o.baseUnits,
  });
  const entryIx = await client.ixs.placeMarketOrder({
    authority:   o.authority,
    symbol:      o.symbol,
    orderPacket: entryPacket,
  });
  tx.add(entryIx as TransactionInstruction);

  // 2) Stop loss — opposite side, triggers when price moves against entry
  if (o.stopLossUsd) {
    // Convert USD → tick units via market metadata. We fetch the market
    // once per bracket (acceptable: one extra REST call per order).
    const market = await client.exchange().getMarket(o.symbol);
    const tickSize = (market as { tickSize?: number }).tickSize ?? 1;
    const triggerTicks = BigInt(Math.round(parseFloat(o.stopLossUsd) / tickSize));

    const slIx = await client.ixs.buildPlaceStopLoss({
      authority:           o.authority,
      symbol:              o.symbol,
      // SL trade-side is opposite of entry: bid entry → ask SL, vice versa.
      tradeSide:           o.side === 'bid' ? Side.Ask : Side.Bid,
      executionDirection:  o.side === 'bid' ? Direction.LessThan : Direction.GreaterThan,
      orderKind:           StopLossOrderKind.IOC,
      triggerPrice:        triggerTicks,
    });
    tx.add(slIx as TransactionInstruction);
  }

  // 3) Take profit — opposite-side limit at the TP price
  if (o.takeProfitUsd) {
    const tpPacket = await client.orderPackets.buildLimitOrderPacket({
      symbol:    o.symbol,
      side:      o.side === 'bid' ? Side.Ask : Side.Bid,
      priceUsd:  o.takeProfitUsd,
      baseUnits: o.baseUnits,
    });
    const tpIx = await client.ixs.placeLimitOrder({
      authority:   o.authority,
      symbol:      o.symbol,
      orderPacket: tpPacket,
    });
    tx.add(tpIx as TransactionInstruction);
  }

  return tx;
}

export async function buildCancelAllTx(authority: string, symbol: string): Promise<Transaction> {
  const client = createChartRunnerPhoenixClient();
  const ix = await client.ixs.buildCancelAll({ authority, symbol });
  return new Transaction().add(ix as TransactionInstruction);
}

// ─── HUD live ticker (WebSocket) ────────────────────────────────────────────
// Used by the in-game topbar to show live mid-price + bid/ask spread for the
// current asset. Returns an async iterable of L2 book snapshots.
//
// Game-side wiring: `crChartHost` should call this when the player switches
// asset to a *-PERP symbol, then pipe each tick into the existing crCandles
// rendering pipeline.
export async function* streamL2Book(symbol: string) {
  const client = createPhoenixClient({
    apiUrl: PHOENIX_API_URL,
    ws:     { connectMode: 'eager' },
  });
  if (!client.streams) throw new Error('Rise client has no streams; check ws config.');
  for await (const update of client.streams.l2Book(symbol)) {
    yield update;
  }
}

// ─── Onboarding (one-shot, before any order placement) ─────────────────────
// Phoenix Rise gates account creation behind invite codes. Two endpoints:
//   - POST /v1/invite/activate              (access codes / allowlist)
//   - POST /v1/invite/activate-with-referral (referral codes)
export async function activatePhoenixInvite(opts: {
  authority: string;
  code: string;
  isReferral?: boolean;
}) {
  const httpClient = new PhoenixHttpClient({ apiUrl: PHOENIX_API_URL });
  if (opts.isReferral) {
    return await httpClient.invite().activateInviteWithReferral({
      authority:     opts.authority,
      referral_code: opts.code,
    });
  }
  return await httpClient.invite().activateInvite({
    authority: opts.authority,
    code:      opts.code,
  });
}

// ─── Flight builder registration (run ONCE by the ChartRunner team) ────────
// This is run ONCE by the ChartRunner team to register CHARTRUNNER_BUILDER_
// AUTHORITY as a Flight builder. After this lands on chain, every order
// routed through createChartRunnerPhoenixClient(...) accrues fee_bps to the
// builder trader account.
//
// Returns an array of instructions — bundle them in one transaction, sign
// with the BUILDER wallet (CHARTRUNNER_BUILDER_AUTHORITY), and submit.
export async function buildFlightBuilderRegistrationIxs(): Promise<TransactionInstruction[]> {
  const client = createChartRunnerPhoenixClient();
  const registerTraderIx = await client.ixs.buildRegisterTrader({
    authority:  CHARTRUNNER_BUILDER_AUTHORITY,
    marginType: MarginType.Cross,
  });
  const registerBuilderIx = await flight.buildRegisterBuilderIx({
    traderAuthority:        CHARTRUNNER_BUILDER_AUTHORITY,
    traderPdaIndex:         CHARTRUNNER_BUILDER_PDA_INDEX,
    traderSubaccountIndex:  CHARTRUNNER_BUILDER_SUBACCOUNT_INDEX,
    feeBps:                 CHARTRUNNER_FLIGHT_FEE_BPS,
  });
  return [
    registerTraderIx as TransactionInstruction,
    registerBuilderIx as TransactionInstruction,
  ];
}

// ─── Notes for integration ─────────────────────────────────────────────────
//
// 1. WHERE THIS FILE GETS WIRED IN (App.tsx)
//    Add new action cases:
//      'phoenix-place-limit'   → buildLimitOrderTx(...)
//      'phoenix-place-market'  → buildMarketOrderTx(...)
//      'phoenix-place-stop'    → buildStopLossTx(...)
//      'phoenix-place-bracket' → buildBracketTx(...)
//      'phoenix-cancel-all'    → buildCancelAllTx(...)
//    On submit success, redirect to /play/ with the tx signature.
//
// 2. GAME-SIDE WIRING
//    ChartRunner_Prototype.html has a `crSDK` IIFE with bracket/oco/limit/
//    market entry points that today route to SandboxBroker. Add a parallel
//    PhoenixBroker that builds the same payload but redirects to
//    /solana-connect/?action=phoenix-place-* via window.location.href.
//    The user picks SANDBOX vs PHOENIX in the menubar; the SDK dispatches.
//
// 3. TICK PRICES vs USD PRICES
//    buildPlaceStopLoss takes triggerPrice as a bigint of ticks, NOT USD.
//    This file's buildBracketTx fetches market metadata once and converts
//    the user's USD-denominated stop into ticks. Verify the tickSize key
//    on the market object — it may be named differently in Rise types.
//
// 4. TESTING WITHOUT MAINNET MONEY
//    Rise has runnable examples under github.com/Ellipsis-Labs/rise-public:
//      - rust/sdk/examples/register_trader.rs  (one-shot account setup)
//      - rust/sdk/examples/send_limit_order.rs (single-tx test)
//    Run those against a test wallet with a small mainnet position before
//    pointing the live game at this adapter.
//
// 5. FLIGHT IS BETA
//    Rise docs ship Flight with a <Warning>: "currently beta and should
//    not yet be treated as a stable production surface." Plan accordingly
//    — until Flight is GA, the fee accrual revenue model has a ceiling
//    on production confidence. Have a fallback path that places orders
//    without Flight (drop the `flight: {}` config in the client).
