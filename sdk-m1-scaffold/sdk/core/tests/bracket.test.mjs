// M2.5 — bracket() regression test
//
// Verifies the ported bracket() ability in src/ChartRunnerSDK.ts matches
// the inline implementation at ChartRunner_Prototype.html line 11830.
//
// Run after `npm run build`:
//     node tests/bracket.test.mjs
//
// Exits 0 on pass, 1 on any failure. No test runner needed — stdlib-only.

import { ChartRunnerSDK } from '../dist/index.js';

let failed = 0;
function check(name, cond, detail = '') {
  const status = cond ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!cond) failed++;
}

// ── Case 1: default buy bracket (matches inline defaults) ────────────────
{
  const sdk = new ChartRunnerSDK();
  let emitted = null;
  sdk.on('order', (p) => { emitted = p; });

  const pkg = sdk.bracket({ side: 'buy', price: 100 });

  // Inline body (line 11830): defaults risk=20, rr=2.0, slDistance=60
  //   size = max(1, 20/60*100) = 33.333...
  //   tp   = 100 + 2.0*60      = 220
  //   sl   = 100 - 60          = 40
  check('buy.id',          pkg.id === 1);
  check('buy.type',        pkg.type === 'bracket');
  check('buy.side',        pkg.side === 'buy');
  check('buy.entry',       pkg.entry === 100);
  check('buy.tp',          pkg.tp === 220);
  check('buy.sl',          pkg.sl === 40);
  check('buy.size',        Math.abs(pkg.size - (20 / 60) * 100) < 1e-9);
  check('buy.status',      pkg.status === 'open');
  check('buy.pnl',         pkg.pnl === 0);
  check('buy.openedAt',    typeof pkg.openedAt === 'number' && pkg.openedAt > 0);
  check('buy.risk',        pkg.risk === 20);
  check('buy.rr',          pkg.rr === 2);
  check('buy.slDistance',  pkg.slDistance === 60);

  check('buy.openOrders',  sdk.openOrders.length === 1 && sdk.openOrders[0] === pkg);
  check('buy.event',       emitted?.kind === 'bracket' && emitted.order === pkg);
}

// ── Case 2: sell side with custom params ──────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const pkg = sdk.bracket({ side: 'sell', price: 100, slDistance: 50, rr: 3, risk: 100 });
  // size = max(1, 100/50*100) = 200
  // tp   = 100 - 3*50         = -50
  // sl   = 100 + 50           = 150
  check('sell.tp',    pkg.tp === -50);
  check('sell.sl',    pkg.sl === 150);
  check('sell.size',  Math.abs(pkg.size - 200) < 1e-9);
}

// ── Case 3: degenerate slDistance=0 falls back to safety floor ───────────
{
  const sdk = new ChartRunnerSDK();
  const pkg = sdk.bracket({ side: 'buy', price: 100, slDistance: 0, risk: 1 });
  // Inline: `risk / Math.max(0.001, slDistance) * 100`
  //   size = max(1, 1 / 0.001 * 100) = max(1, 100000) = 100000
  //   tp   = 100 + 2.0*0 = 100
  //   sl   = 100 - 0     = 100  (no risk, but contract preserved)
  check('zero-sl.size', pkg.size === 100000);
  check('zero-sl.tp',   pkg.tp === 100);
  check('zero-sl.sl',   pkg.sl === 100);
}

// ── Case 4: size floor (risk=0 hits the Math.max(1, …) clamp) ─────────────
{
  const sdk = new ChartRunnerSDK();
  const pkg = sdk.bracket({ side: 'buy', price: 100, risk: 0 });
  check('zero-risk.size-floor', pkg.size === 1);  // max(1, 0)
}

// ── Case 5: id increments across calls ────────────────────────────────────
{
  const sdk = new ChartRunnerSDK();
  const a = sdk.bracket({ side: 'buy', price: 100 });
  const b = sdk.bracket({ side: 'sell', price: 200 });
  check('id-increments', a.id === 1 && b.id === 2);
  check('openOrders-grows', sdk.openOrders.length === 2);
}

console.log();
if (failed === 0) {
  console.log('SUITE: PASS');
  process.exit(0);
} else {
  console.log(`SUITE: FAIL (${failed} check(s) failed)`);
  process.exit(1);
}
