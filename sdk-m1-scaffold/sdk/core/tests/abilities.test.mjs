// M2.5 — 12-ability batch regression test (2026-05-29 M1.4a)
//
// Verifies ladder/fibLadder/oco/trailStop/inverseBracket/market/limit/
// stopLoss/takeProfit/ocoBracket/cancelOrder/editOrder match the inline
// implementations at ChartRunner_Prototype.html lines 11805-13219.
//
// Run after `npm run build`:
//     node tests/abilities.test.mjs
//
// Exits 0 on pass, 1 on any failure.

import { ChartRunnerSDK } from '../dist/index.js';

let failed = 0;
function check(name, cond, detail = '') {
  const status = cond ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!cond) failed++;
}

// ── ladder ─────────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  let evt = null;
  sdk.on('order', p => { evt = p; });
  const orders = sdk.ladder({ side: 'buy', rungs: 3, spacing: 10, size: 2, price: 100 });
  // buy: offsets are negative, so prices descend below entry
  // i=1: 100 - 10 = 90 ; i=2: 100 - 20 = 80 ; i=3: 100 - 30 = 70
  check('ladder.length',    orders.length === 3);
  check('ladder.prices',    orders[0].price === 90 && orders[1].price === 80 && orders[2].price === 70);
  check('ladder.size',      orders.every(o => o.size === 2));
  check('ladder.type',      orders.every(o => o.type === 'ladder'));
  check('ladder.side',      orders.every(o => o.side === 'buy'));
  check('ladder.openOrders', sdk.openOrders.length === 3);
  check('ladder.event',     evt && evt.kind === 'ladder' && evt.orders.length === 3);

  // sell side: positive offsets (above entry)
  const sdk2 = new ChartRunnerSDK();
  const sellOrders = sdk2.ladder({ side: 'sell', rungs: 2, spacing: 5, size: 1, price: 50 });
  check('ladder.sell.prices', sellOrders[0].price === 55 && sellOrders[1].price === 60);
}

// ── fibLadder ──────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const orders = sdk.fibLadder({ side: 'buy', size: 4, price: 100, base: 100 });
  // levels = [0.236, 0.382, 0.5, 0.618, 0.786], dir = -1 (buy)
  // prices = 100 - 100*0.236, etc.
  check('fibLadder.length', orders.length === 5);
  check('fibLadder.level1', Math.abs(orders[0].price - (100 - 100 * 0.236)) < 1e-9);
  check('fibLadder.level5', Math.abs(orders[4].price - (100 - 100 * 0.786)) < 1e-9);
  check('fibLadder.type',   orders.every(o => o.type === 'ladder'));   // tagged ladder, not fib
  check('fibLadder.size',   orders.every(o => o.size === 4));
}

// ── oco ────────────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  let evt = null;
  sdk.on('order', p => { evt = p; });
  const [a, b] = sdk.oco({ upper: 50, lower: -50, size: 3, price: 100 });
  check('oco.sell.price', a.side === 'sell' && a.price === 150);
  check('oco.buy.price',  b.side === 'buy'  && b.price === 50);
  check('oco.pair',       a.pair === b.id && b.pair === a.id);
  check('oco.openOrders', sdk.openOrders.length === 2);
  check('oco.event',      evt && evt.kind === 'oco' && evt.orders.length === 2);
}

// ── trailStop ──────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const br = sdk.bracket({ side: 'buy', price: 100, slDistance: 30 });
  // Arming without distance: defaults to bracket's slDistance (30)
  let evt = null;
  sdk.on('trail', p => { evt = p; });
  const armed = sdk.trailStop({ id: br.id });
  check('trailStop.return',       armed === br);
  check('trailStop.armed.active', br.trailing.active === true);
  check('trailStop.distance',     br.trailing.distance === 30);
  check('trailStop.event',        evt && evt.order === br);

  // Returns null for non-existent id
  check('trailStop.null-on-missing', sdk.trailStop({ id: 9999 }) === null);

  // Custom distance overrides bracket's slDistance
  const br2 = sdk.bracket({ side: 'buy', price: 100, slDistance: 30 });
  sdk.trailStop({ id: br2.id, distance: 7 });
  check('trailStop.custom-distance', br2.trailing.distance === 7);
}

// ── inverseBracket ─────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const opp = sdk.inverseBracket({ side: 'buy', price: 100 });
  // Defaults: opp='sell', risk=20, rr=1.0, slDistance=40
  // size = max(1, 20/40*100) = 50
  // sell: tp = 100 - 1*40 = 60, sl = 100 + 40 = 140
  check('inverseBracket.side',  opp.side === 'sell');
  check('inverseBracket.tp',    opp.tp === 60);
  check('inverseBracket.sl',    opp.sl === 140);
  check('inverseBracket.size',  Math.abs(opp.size - 50) < 1e-9);
  // sell side flips → 'buy' opposite
  const opp2 = sdk.inverseBracket({ side: 'sell', price: 100 });
  check('inverseBracket.flip-sell', opp2.side === 'buy');
}

// ── market ─────────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  let orderEvt = null, fillEvt = null;
  sdk.on('order', p => { orderEvt = p; });
  sdk.on('fill',  p => { fillEvt = p; });
  const o = sdk.market({ side: 'buy', size: 3, price: 100 });
  check('market.type',    o.type === 'market');
  check('market.entry',   o.entry === 100);
  check('market.status',  o.status === 'open');
  check('market.pnl',     o.pnl === 0);
  check('market.filledAt', typeof o.filledAt === 'number');
  check('market.event.order', orderEvt && orderEvt.kind === 'market');
  check('market.event.fill',  fillEvt && fillEvt.order === o && fillEvt.price === 100);

  // price null → returns null
  check('market.null-price', sdk.market({ side: 'buy', price: null }) === null);
}

// ── limit ──────────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const o = sdk.limit({ side: 'sell', price: 50, size: 2 });
  check('limit.type',     o.type === 'limit');
  check('limit.price',    o.price === 50);
  check('limit.status',   o.status === 'pending');
  check('limit.null-price', sdk.limit({ side: 'buy', price: null }) === null);
}

// ── stopLoss ───────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const br = sdk.bracket({ side: 'buy', price: 100, slDistance: 60 });
  let evt = null;
  sdk.on('modify', p => { evt = p; });
  const patched = sdk.stopLoss({ id: br.id, price: 50 });
  check('stopLoss.return',     patched === br);
  check('stopLoss.sl',         br.sl === 50);
  check('stopLoss.slDistance', br.slDistance === 50);          // recomputed: |100-50|
  check('stopLoss.event',      evt && evt.field === 'sl' && evt.price === 50);

  // null id, null price → null
  check('stopLoss.null-id',    sdk.stopLoss({ id: 9999, price: 30 }) === null);
  check('stopLoss.null-price', sdk.stopLoss({ id: br.id, price: null }) === null);
}

// ── takeProfit ─────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const br = sdk.bracket({ side: 'buy', price: 100 });
  let evt = null;
  sdk.on('modify', p => { evt = p; });
  const patched = sdk.takeProfit({ id: br.id, price: 999 });
  check('takeProfit.return', patched === br);
  check('takeProfit.tp',     br.tp === 999);
  check('takeProfit.event',  evt && evt.field === 'tp' && evt.price === 999);
}

// ── ocoBracket ─────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  let evt = null;
  sdk.on('order', p => { if (p.kind === 'ocoBracket') evt = p; });
  const r = sdk.ocoBracket({ upper: 110, lower: 90 });
  check('ocoBracket.shape',    r && r.up && r.down);
  check('ocoBracket.up.price', r.up.entry === 110);
  check('ocoBracket.down.price', r.down.entry === 90);
  check('ocoBracket.status',   r.up.status === 'pending' && r.down.status === 'pending');
  check('ocoBracket.pair',     r.up.ocoPair === r.down.id && r.down.ocoPair === r.up.id);
  check('ocoBracket.event',    evt && evt.orders.length === 2);

  // null upper/lower → null
  check('ocoBracket.null', sdk.ocoBracket({ upper: null, lower: 90 }) === null);
}

// ── cancelOrder ────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const br = sdk.bracket({ side: 'buy', price: 100 });
  let evt = null;
  sdk.on('cancel', p => { evt = p; });
  const ok = sdk.cancelOrder(br.id);
  check('cancelOrder.ok',         ok === true);
  check('cancelOrder.flag',       br.cancelled === true);
  check('cancelOrder.removed',    sdk.openOrders.length === 0);
  check('cancelOrder.event',      evt && evt.order === br);
  check('cancelOrder.missing',    sdk.cancelOrder(9999) === false);
}

// ── editOrder ──────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const br = sdk.bracket({ side: 'buy', price: 100, slDistance: 60 });
  // Original: tp=220, sl=40, slDistance=60, rr=2
  let evt = null;
  sdk.on('edit', p => { evt = p; });
  const ok = sdk.editOrder(br.id, { tp: 300, sl: 50 });
  check('editOrder.ok',         ok === true);
  check('editOrder.tp',         br.tp === 300);
  check('editOrder.sl',         br.sl === 50);
  check('editOrder.slDistance', br.slDistance === 50);  // |100-50|
  check('editOrder.rr',         br.rr === 4);            // |300-100| / 50
  check('editOrder.event',      evt && evt.order === br);

  // Closed bracket → immutable
  br.status = 'closed';
  check('editOrder.closed',     sdk.editOrder(br.id, { tp: 999 }) === false);

  // Ladder: only price patch
  const ladders = sdk.ladder({ side: 'buy', rungs: 1, price: 100 });
  sdk.editOrder(ladders[0].id, { price: 77 });
  check('editOrder.ladder',     ladders[0].price === 77);

  // Missing id
  check('editOrder.missing',    sdk.editOrder(9999, { tp: 1 }) === false);
}

console.log();
if (failed === 0) {
  console.log('SUITE: PASS');
  process.exit(0);
} else {
  console.log(`SUITE: FAIL (${failed} check(s) failed)`);
  process.exit(1);
}
