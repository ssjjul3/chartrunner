/* Smoke-Verifikation fuer v1.0.866 (P2.0 crQuote, P2.1 crPositions, SDK-Weg).
 * Laeuft headless gegen die Einzeldatei, alle Netzabrufe werden abgefangen. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + JSON.stringify(extra) : '')); }
}

/* Browser-Binary: lokal (macOS Chrome) oder Playwright-Cache, sonst der
 * Playwright-Default. Der Check laeuft ueberall, wo `playwright` installiert
 * ist — er ist bewusst NICHT Teil von ci.yml (kein Browser im CI-Job). */
function launchOptions() {
  const opts = { headless: true };
  const candidates = [
    process.env.CR_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const pwRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(pwRoot)) {
      if (d.startsWith('chromium-')) candidates.push(path.join(pwRoot, d, 'chrome-linux', 'chrome'));
    }
  } catch (_) {}
  for (const c of candidates) { if (c && fs.existsSync(c)) { opts.executablePath = c; break; } }
  return opts;
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));

  // Alles uebrige Netz stilllegen, damit der Boot nicht nach draussen greift.
  await page.route('**://**', route => (route.request().url().startsWith('file:') ? route.continue() : route.abort('failed')));

  const jupHits = [];
  /* v1.0.877 — Muster auf die Host-FAMILIE, nicht auf einen einzelnen Host.
   * Vorher stand hier '**quote-api.jup.ag/**'. Als der Client auf lite-api
   * umzog, traf das Muster nicht mehr, der Catch-all brach die Anfrage ab und
   * crQuote meldete korrekt 'offline' — vier Zeilen wurden rot, ohne dass am
   * Verhalten von crQuote irgendetwas falsch war. Ein Test soll pruefen, WAS
   * herauskommt, nicht WO es herkommt. */
  await page.route('**jup.ag/**', async route => {
    const url = route.request().url();
    jupHits.push(url);
    if (url.includes('MOCK429')) return route.fulfill({ status: 429, contentType: 'application/json', body: '{}' });
    if (url.includes('MOCKDEAD')) return route.abort('failed');
    if (url.includes('MOCKNOROUTE')) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'No route found' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      inAmount: '1000000000', outAmount: '4242424242', priceImpactPct: '0.0231',
      routePlan: [{ swapInfo: { label: 'Orca' } }, { swapInfo: { label: 'Raydium' } }],
    }) });
  });

  await page.route('**/v1/wallet/**', async route => {
    const url = route.request().url();
    if (url.includes('4nDXbNoWaLLeTuNkNoWnAAAAAAAAAAAAAAAAAAAAAAA')) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      buys: 9, sells: 4, buy_usd: 1000, sell_usd: 400, tokens: 3,
      coverage: 'nur getrackte Mints, ab Index-Start',
      top_tokens: [
        { mint: 'MintHeldWithPrice1111111111111111111111111', buys: 3, sells: 1, buy_usd: 500, sell_usd: 200, net_base: 100 },
        { mint: 'MintHeldNoPrice22222222222222222222222222', buys: 3, sells: 1, buy_usd: 300, sell_usd: 100, net_base: 50 },
        { mint: 'MintFullyExited333333333333333333333333333', buys: 3, sells: 2, buy_usd: 200, sell_usd: 100, net_base: 0 },
      ],
    }) });
  });

  await page.route('**api.dexscreener.com/tokens/v1/solana/**', async route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ baseToken: { address: 'MintHeldWithPrice1111111111111111111111111' }, priceUsd: '2' }]),
  }));
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hardErrors = pageErrors.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors beim Boot', hardErrors.length === 0, hardErrors.slice(0, 3));
  check('Versionsstring v1.0.866 im Dokument', await page.evaluate(() => document.documentElement.innerHTML.includes('v1.0.866')));

  console.log('\n-- P2.0 crQuote --');
  check('window.crQuote existiert', await page.evaluate(() => !!(window.crQuote && typeof crQuote.quote === 'function')));
  check('ChartRunnerSDK.prototype.quote existiert', await page.evaluate(() => typeof ChartRunnerSDK.prototype.quote === 'function'));

  const badArgs = await page.evaluate(() => crQuote.quote({ inMint: 'A', outMint: 'B', amountRaw: 0 }));
  check('Betrag 0 wird gar nicht erst gefragt (bad-args)', badArgs.error === 'bad-args', badArgs);
  const sameMint = await page.evaluate(() => crQuote.quote({ inMint: 'A', outMint: 'A', amountRaw: 100 }));
  check('gleicher Mint wird abgelehnt (same-mint)', sameMint.error === 'same-mint', sameMint);
  check('unsinnige Anfragen erzeugen keinen Netzabruf', jupHits.length === 0, jupHits);

  const ok = await page.evaluate(() => crQuote.quote({ inMint: 'So11111111111111111111111111111111111111112', outMint: 'MOCKOK1111111111111111111111111111111111111', amountRaw: 1e9, slippageBps: 50 }));
  check('Quote normalisiert (outAmountRaw)', ok.outAmountRaw === '4242424242', ok);
  check('Preisauswirkung als Zahl', ok.priceImpactPct === 0.0231, ok);
  check('Route-Hops + Labels', ok.hops === 2 && ok.labels.join(',') === 'Orca,Raydium', ok);
  check('executable:false + Klartext-Hinweis', ok.executable === false && /nichts signiert/.test(ok.note || ''), ok);
  check('Betrag und Slippage stehen in der Anfrage', jupHits[0].includes('amount=1000000000') && jupHits[0].includes('slippageBps=50'), jupHits[0]);

  const cached = await page.evaluate(() => crQuote.quote({ inMint: 'So11111111111111111111111111111111111111112', outMint: 'MOCKOK1111111111111111111111111111111111111', amountRaw: 1e9, slippageBps: 50 }));
  check('Cache-Treffer ohne zweiten Netzabruf', cached.cached === true && jupHits.length === 1, { cached, hits: jupHits.length });

  const rl = await page.evaluate(() => crQuote.quote({ inMint: 'So11111111111111111111111111111111111111112', outMint: 'MOCK429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', amountRaw: 1e9 }));
  check('429 → rate-limited', rl.error === 'rate-limited', rl);
  const off = await page.evaluate(() => crQuote.quote({ inMint: 'So11111111111111111111111111111111111111112', outMint: 'MOCKDEADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', amountRaw: 1e9 }));
  check('Netzfehler → offline', off.error === 'offline', off);
  const nr = await page.evaluate(() => crQuote.quote({ inMint: 'So11111111111111111111111111111111111111112', outMint: 'MOCKNOROUTEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', amountRaw: 1e9 }));
  check('keine Route → no-route (nicht "0")', nr.error === 'no-route', nr);

  const viaSdk = await page.evaluate(() => ChartRunnerSDK.prototype.quote.call({}, { inMint: 'So11111111111111111111111111111111111111112', outMint: 'MOCKOK1111111111111111111111111111111111111', amountRaw: 1e9, slippageBps: 50 }));
  check('SDK-Weg liefert dasselbe Ergebnis', viaSdk.outAmountRaw === '4242424242' && viaSdk.executable === false, viaSdk);

  console.log('\n-- P2.1 crPositions --');
  check('window.crPositions existiert', await page.evaluate(() => !!(window.crPositions && typeof crPositions.full === 'function')));
  const badAddr = await page.evaluate(() => crPositions.load('nope'));
  check('unsinnige Adresse → bad-addr', badAddr.error === 'bad-addr', badAddr);
  const unknown = await page.evaluate(() => crPositions.full('4nDXbNoWaLLeTuNkNoWnAAAAAAAAAAAAAAAAAAAAAAA'));
  check('unbekannte Wallet → indexed:false statt Nullzeilen', unknown.indexed === false && !!unknown.note, unknown);

  const p = await page.evaluate(() => crPositions.full('5vJRzKtcp4fJxqmR2qZ5nY8Wc3TLd6ZQb7hGmXaPqEuV'));
  const byMint = {}; (p.rows || []).forEach(r => byMint[r.mint.slice(0, 9)] = r);
  const held = byMint['MintHeldW'], noPx = byMint['MintHeldN'], exited = byMint['MintFully'];
  check('Fluss getrennt ausgewiesen (verkauft − gekauft)', held.cash_flow_usd === -300, held);
  check('Ergebnis = Fluss + Restbestand × Preis', held.holding_usd === 200 && held.result_usd === -100, held);
  check('ohne Preis bleibt das Ergebnis unbekannt (null), nie 0', noPx.result_usd === null && noPx.holding_usd === null, noPx);
  check('geschlossene Position: Fluss IST das Ergebnis, ohne Preis', exited.result_usd === -100 && exited.holding_usd === 0, exited);
  check('Teilsumme benennt die Luecke (result_of / result_total_rows)', p.result_of === 2 && p.result_total_rows === 3, { of: p.result_of, total: p.result_total_rows });
  check('Summe rechnet nur Bekanntes', p.result_usd === -200, p.result_usd);
  check('Coverage-Grenze wird mitgeliefert', typeof p.coverage === 'string' && p.coverage.length > 0, p.coverage);

  console.log('\n-- Track D (Agent-Bridge) --');
  const tools = await page.evaluate(() => {
    const src = document.documentElement.innerHTML;
    return {
      hasPositions: /get_positions/.test(src),
      hasPnl: /get_pnl/.test(src),
      hasQuote: /get_quote/.test(src),
      sizeRawRequired: /size_raw/.test(src),
    };
  });
  check('get_positions / get_pnl / get_quote verdrahtet', tools.hasPositions && tools.hasPnl && tools.hasQuote, tools);
  check('Verkaufs-Quote verlangt size_raw', tools.sizeRawRequired, tools);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
