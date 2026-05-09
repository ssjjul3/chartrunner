/* ────────────────────────────────────────────────────────────────────────
 *  Phoenix broker — Solana CLOB via @ellipsis-labs/phoenix-sdk
 * ────────────────────────────────────────────────────────────────────────
 *  M3 driver. Routes orders to the Phoenix Rise on-chain orderbook on
 *  Solana. This is the "real" venue — every armed tool from the Blue
 *  Laser becomes a real Phoenix order, settled on chain, recorded in
 *  chartrunner_registry.
 *
 *  STATUS: BLOCKED on npm publish.
 *  ─────────────────────────────────────────────────────────────────
 *    @ellipsis-labs/phoenix-sdk has not yet published the version
 *    that exposes the post-only / IOC / GTC + atomic-cancel flow we
 *    need for the Blue Laser routes (TWAP / Ladder / OCO mapping).
 *
 *    The SDK has the on-chain primitives — it's the JS client wrapper
 *    we're waiting on. We track the publish at:
 *      https://www.npmjs.com/package/@ellipsis-labs/phoenix-sdk
 *
 *    Once the publish lands, swap the throw in submit() for:
 *      const { Client, Side, ... } = await import('@ellipsis-labs/phoenix-sdk');
 *      const client = await Client.create(connection);
 *      const market = await client.getMarket(MARKET_ADDR);
 *      const ix = market.placeLimitOrderIx({ side, price, size, type });
 *      ... build tx, sign, send via the connected wallet.
 *  ─────────────────────────────────────────────────────────────────
 *
 *  Settlement: every fill posts a record_run instruction to
 *  chartrunner_registry (program ID ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn,
 *  live on devnet). That's Shift 3 from the Chapter 39 capstone.
 * ──────────────────────────────────────────────────────────────────────── */

export const phoenixBroker = {
  key:   'phoenix',
  label: 'Phoenix · Solana CLOB',
  state: 'pending',           // flips to 'live' once the npm publish lands
  venue: 'phoenix-solana',

  async submit(order){
    throw new Error(
      'phoenix broker awaiting @ellipsis-labs/phoenix-sdk npm publish. ' +
      'Track: https://www.npmjs.com/package/@ellipsis-labs/phoenix-sdk · ' +
      'Use mock or binance-paper in the meantime.'
    );
  },

  async cancel(id){
    throw new Error('phoenix broker awaiting npm publish.');
  },

  async balance(){
    return null;
  },

  // Documents the eventual wire-up so M3 implementer has the contract.
  _plannedShape: {
    npm:        '@ellipsis-labs/phoenix-sdk',
    market:     'BTC-USDC perp (devnet, then mainnet at M10)',
    settlement: 'chartrunner_registry · record_run instruction',
    programId:  'ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn',
  },
};
