// M2.5 — Round 3 regression test (2026-05-29 M1.4a)
//
// Verifies the 5 newly-ported methods (closeAll/toggleIndicator/hedgeParachute/
// liquidityRadar/rescueDrone) match the inline implementations at
// ChartRunner_Prototype.html lines 11891-12012.
//
// These methods have TWO behavior paths each (hostMode='standalone' vs 'tv'),
// so the suite exercises both where applicable.
//
// Run: node tests/round3.test.mjs
// Exits 0 on pass, 1 on any failure.

import { ChartRunnerSDK } from '../dist/index.js';

let failed = 0;
function check(name, cond, detail = '') {
  const status = cond ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!cond) failed++;
}

// ── closeAll ───────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  // Open one of each type
  const br = sdk.bracket({ side: 'buy', price: 100 });
  const ladders = sdk.ladder({ side: 'buy', rungs: 2, price: 100, spacing: 10 });
  const ocoPair = sdk.oco({ price: 100 });
  // Track emitted events
  const closeAllEvents = [];
  const bracketCloseEvents = [];
  const cancelEvents = [];
  sdk.on('closeAll', p => { closeAllEvents.push(p); });
  sdk.on('bracketClose', p => { bracketCloseEvents.push(p); });
  sdk.on('cancel', p => { cancelEvents.push(p); });

  const result = sdk.closeAll();
  // Default types covers bracket+ladder+oco → all 5 orders closed
  check('closeAll.count',          result.count === 5);
  check('closeAll.ids.length',     result.ids.length === 5);
  check('closeAll.bracket.status', br.status === 'closed');
  check('closeAll.bracket.outcome', br.outcome === 'flatten');
  check('closeAll.bracket.pnl',    br.pnl === 0);
  check('closeAll.bracket.exitPrice', br.exitPrice === null);
  check('closeAll.ladder.cancelled', ladders.every(o => o.cancelled === true));
  check('closeAll.oco.cancelled',  ocoPair.every(o => o.cancelled === true));
  check('closeAll.bulk.event',     closeAllEvents.length === 1 && closeAllEvents[0].count === 5);
  check('closeAll.bracketClose.event', bracketCloseEvents.length === 1 && bracketCloseEvents[0].reason === 'flatten');
  check('closeAll.cancel.events', cancelEvents.length === 4); // 2 ladder + 2 oco

  // Re-running closeAll → no double-close
  const result2 = sdk.closeAll();
  check('closeAll.idempotent', result2.count === 0);

  // Custom types filter
  const sdk2 = new ChartRunnerSDK();
  sdk2.bracket({ side: 'buy', price: 100 });
  sdk2.ladder({ side: 'buy', rungs: 1, price: 100 });
  const r3 = sdk2.closeAll({ types: ['bracket'] }); // only brackets
  check('closeAll.types-filter', r3.count === 1);
  check('closeAll.types-filter.ladder-spared', sdk2.openOrders.find(o => o.type === 'ladder' && !o.cancelled));
}

// ── toggleIndicator ────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  let evt = null;
  sdk.on('effect', p => { if (p.kind === 'indicator') evt = p; });
  const e = sdk.toggleIndicator();
  // Defaults: name='VolumeProfileFixedRange', visible=true, duration=5
  check('toggleIndicator.type',     e.type === 'indicator');
  check('toggleIndicator.name',     e.name === 'VolumeProfileFixedRange');
  check('toggleIndicator.visible',  e.visible === true);
  check('toggleIndicator.until',    typeof e.until === 'number' && e.until > 0);
  check('toggleIndicator.activeEffects', sdk.activeEffects.length === 1);
  check('toggleIndicator.event',    evt && evt.effect === e);

  // duration=0 → until=null (don't auto-disable)
  const sdk2 = new ChartRunnerSDK();
  const e2 = sdk2.toggleIndicator({ duration: 0 });
  check('toggleIndicator.duration-zero', e2.until === null);
}

// ── hedgeParachute ─────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  // hostMode='standalone' default
  let effectEvt = null;
  sdk.on('effect', p => { if (p.kind === 'hedge') effectEvt = p; });
  const result = sdk.hedgeParachute({ side: 'buy', price: 100 });
  // Standalone + price given → real inverseBracket + buffer effect, returns real order
  check('hedgeParachute.standalone.returns-order', result && result.type === 'bracket');
  check('hedgeParachute.standalone.opposite-side', result.side === 'sell'); // inverse of 'buy'
  check('hedgeParachute.standalone.effect-pushed', sdk.activeEffects.length === 1);
  const buffer = sdk.activeEffects[0];
  check('hedgeParachute.standalone.buffer.type', buffer.type === 'hedge');
  check('hedgeParachute.standalone.buffer.orderId', buffer.orderId === result.id);
  check('hedgeParachute.standalone.effect-event', effectEvt && effectEvt.effect === buffer && effectEvt.order === result);

  // Standalone + no price → buffer-only, returns the effect
  const sdk2 = new ChartRunnerSDK();
  const e2 = sdk2.hedgeParachute({ side: 'buy' });
  check('hedgeParachute.standalone.no-price.returns-effect', e2.type === 'hedge');
  check('hedgeParachute.standalone.no-price.orderId-null', e2.orderId === null);
  check('hedgeParachute.standalone.no-price.openOrders-empty', sdk2.openOrders.length === 0);

  // TV mode + price → inverseBracket only, no buffer, emits reframe
  const sdk3 = new ChartRunnerSDK();
  sdk3.hostMode = 'tv';
  let reframeEvt = null;
  sdk3.on('reframe', p => { reframeEvt = p; });
  const r3 = sdk3.hedgeParachute({ side: 'buy', price: 100 });
  check('hedgeParachute.tv.returns-order', r3 && r3.type === 'bracket');
  check('hedgeParachute.tv.no-buffer', sdk3.activeEffects.length === 0);
  check('hedgeParachute.tv.reframe', reframeEvt && reframeEvt.to === 'inverseBracket');

  // TV mode + no price → null
  const sdk4 = new ChartRunnerSDK();
  sdk4.hostMode = 'tv';
  check('hedgeParachute.tv.no-price.null', sdk4.hedgeParachute({ side: 'buy' }) === null);
}

// ── liquidityRadar ─────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  let effectEvt = null;
  sdk.on('effect', p => { if (p.kind === 'radar') effectEvt = p; });
  // Standalone — no host INDICATOR_STATE in node ctx, falls through to effect-push
  const e = sdk.liquidityRadar({ range: 100 });
  check('liquidityRadar.standalone.type', e.type === 'radar');
  check('liquidityRadar.standalone.range', e.range === 100);
  check('liquidityRadar.standalone.until', typeof e.until === 'number' && e.until > 0);
  check('liquidityRadar.standalone.effect-event', effectEvt && effectEvt.effect === e);
  check('liquidityRadar.standalone.activeEffects', sdk.activeEffects.length === 1);

  // TV mode → aliases to toggleIndicator, emits reframe
  const sdk2 = new ChartRunnerSDK();
  sdk2.hostMode = 'tv';
  let reframeEvt = null;
  sdk2.on('reframe', p => { reframeEvt = p; });
  const r = sdk2.liquidityRadar();
  // toggleIndicator returns the indicator effect; check its shape
  check('liquidityRadar.tv.returns-indicator', r.type === 'indicator');
  check('liquidityRadar.tv.indicator-name', r.name === 'VolumeProfileFixedRange');
  check('liquidityRadar.tv.reframe', reframeEvt && reframeEvt.to === 'toggleIndicator');

  // With INDICATOR_STATE host global stubbed in: it should toggle vrvp
  const sdk3 = new ChartRunnerSDK();
  globalThis.INDICATOR_STATE = { active: new Set() };
  sdk3.liquidityRadar();
  check('liquidityRadar.standalone.host-stub.toggled', globalThis.INDICATOR_STATE.active.has('vrvp'));
  delete globalThis.INDICATOR_STATE; // cleanup
}

// ── rescueDrone ────────────────────────────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  // Pre-seed some open orders for closeAll to flatten
  sdk.bracket({ side: 'buy', price: 100 });
  sdk.ladder({ side: 'buy', rungs: 2, price: 100 });
  let effectEvt = null;
  sdk.on('effect', p => { if (p.kind === 'rescue') effectEvt = p; });

  // Standalone → closeAll() + arm immunity effect
  const e = sdk.rescueDrone();
  check('rescueDrone.standalone.type', e.type === 'rescue');
  check('rescueDrone.standalone.armed', e.armed === true);
  check('rescueDrone.standalone.flattenedCount', e.flattenedCount === 3); // 1 bracket + 2 ladders
  check('rescueDrone.standalone.activeEffects', sdk.activeEffects.length === 1);
  check('rescueDrone.standalone.effect-event', effectEvt && effectEvt.effect === e);
  check('rescueDrone.standalone.flattened-payload', effectEvt.flattened.count === 3);

  // TV mode → closeAll() only, no immunity effect, emits reframe
  const sdk2 = new ChartRunnerSDK();
  sdk2.hostMode = 'tv';
  sdk2.bracket({ side: 'buy', price: 100 });
  let reframeEvt = null;
  sdk2.on('reframe', p => { reframeEvt = p; });
  const r2 = sdk2.rescueDrone();
  check('rescueDrone.tv.returns-closeAll', r2 && typeof r2.count === 'number' && r2.count === 1);
  check('rescueDrone.tv.no-armed-effect', sdk2.activeEffects.length === 0);
  check('rescueDrone.tv.reframe', reframeEvt && reframeEvt.to === 'closeAll');

  // Standalone with no open orders → still emits effect, flattenedCount=0
  const sdk3 = new ChartRunnerSDK();
  const r3 = sdk3.rescueDrone();
  check('rescueDrone.standalone.empty.armed', r3.armed === true);
  check('rescueDrone.standalone.empty.count', r3.flattenedCount === 0);
}

console.log();
if (failed === 0) {
  console.log('SUITE: PASS');
  process.exit(0);
} else {
  console.log(`SUITE: FAIL (${failed} check(s) failed)`);
  process.exit(1);
}
