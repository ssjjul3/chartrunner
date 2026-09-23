/* Smoke-Verifikation v1.0.951 — UI v2: CHART-FENSTER (beliebig oft), TERMINAL-ANSICHTEN
 * ALS EIGENE FENSTER, RUNNER-SCHALTER, CHART-ETIKETT, EINE STAPELORDNUNG.
 *
 * Julian, 23.09.2026: mehrere Terminals/Tracker gleichzeitig; der Chart-Tab blieb
 * „BTC", obwohl im Chart ein anderer Coin gewaehlt war; Spiel-Chart vom normalen
 * Chart entkoppeln — modulares Chart-Fenster, „Runner" oeffnet das Spiel wie gewohnt.
 *
 * GEMESSEN IM ECHTEN CHROMIUM GEGEN DIE DATEI (1600x900). Binance-Klines und die
 * Listen-Quellen per page.route beantwortet; der OHLC-Store (Solana-Mints) wird ueber
 * window._crRunOhlcCandles ersetzt — beweist die Oberflaeche, nicht die Quellen.
 *
 *  C1  Chart-Fenster aus Trade oeffnen: eigenes Canvas, Kerzen aus der Antwort, Quelle
 *      steht da; der Spiel-Chart (currentAsset) wird dabei NICHT umgestellt.
 *  C2  Zweites Fenster, anderer Coin/Zeitrahmen: nur dieses laedt neu (Anfrage mit
 *      symbol/interval), das erste bleibt; Coin-Suche + Mint einfuegen.
 *  C3  Ausfall: Quelle 500 → Grund steht da, KEINE Kerzen (keine Ersatzkerzen).
 *  C4  Zoom (Rad) und Verschieben (Ziehen) aendern nur die Ansicht dieses Fensters.
 *  C5  Neuladen: beide Fenster kommen mit Coin und Zeitrahmen wieder; ein neues
 *      Fenster startet mit dem zuletzt gewaehlten Coin (nicht immer BTC).
 *  C6  „▶ Runner": Spiel-Chart steht danach auf Coin + Zeitrahmen des Fensters, „Run
 *      starten" ist offen; das Chart-Fenster bleibt unveraendert.
 *  C7  Buy im Chart-Fenster → bestehendes Activation-Panel, Seite BUY, richtiger Coin.
 *  C8  Chart-Tab-Etikett folgt dem Coin im Spiel-Chart (vorher: blieb „BTC").
 *  C9  Solanatracker/CEXtracker als eigene Fenster: DIESELBEN Knoten (umgehaengt),
 *      Terminal gleichzeitig offen; ein Tab-Wechsel im Terminal versteckt sie nicht;
 *      Klick auf ihren Tab im Terminal holt das Fenster; Schliessen haengt sie zurueck.
 *  C10 Eine Stapelordnung: Modul ueber Fenster, wenn zuletzt angefasst — und umgekehrt;
 *      Tab-Klick auf ein verdecktes Modul holt es nach vorn statt es zu minimieren.
 *  C9x Regression: Banner >= v1.0.951, 7 Skriptbloecke, Aktivierungszeile, keine
 *      Seitenfehler aus dem v2-Block.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const FILE = 'ChartRunner_Prototype.html';
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; const d = x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 700);
         console.log('  FAIL ' + n + d); }
}
function launchOptions(){
  const o = { headless: true };
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const cands = [process.env.CR_CHROME_PATH].filter(Boolean);
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ o.executablePath = c; break; }
  return o;
}

/* ── Antworten in der Form, die der vorhandene Parser liest ──────────────── */
const MINTS = {
  WIF:  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  POP:  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  NEW1: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
  MIG1: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump',
  MIG2: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump'
};
function pool(i, sym, mint, dex, o){
  o = o || {};
  return {
    data: { id: 'solana_p' + i, type: 'pool', attributes: {
      name: sym + ' / SOL', base_token_price_usd: String(o.px || 1.5),
      market_cap_usd: o.mc === undefined ? String(1e6 * (i + 1)) : o.mc,
      fdv_usd: String(2e6 * (i + 1)), reserve_in_usd: String(5e4 * (i + 1)),
      pool_created_at: new Date(Date.now() - (i + 1) * 3600e3).toISOString(),
      price_change_percentage: { m5: '0.5', h1: String(o.h1 != null ? o.h1 : i - 2), h6: '3', h24: String(o.h24 != null ? o.h24 : 10 - i) },
      volume_usd: { m5: '100', h1: String(1000 * (i + 1)), h6: '9000', h24: '50000' },
      transactions: { m5: { buys: 1, sells: 1 }, h1: { buys: 10 + i, sells: 5 }, h6: { buys: 50, sells: 40 }, h24: { buys: 300, sells: 200 } }
    }, relationships: { base_token: { data: { id: 'solana_' + mint, type: 'token' } }, dex: { data: { id: dex, type: 'dex' } } } },
    inc: [{ id: 'solana_' + mint, type: 'token', attributes: { address: mint, symbol: sym, name: sym + ' Coin' } },
          { id: dex, type: 'dex', attributes: { name: dex === 'pumpswap' ? 'PumpSwap' : dex === 'raydium' ? 'Raydium' : 'Orca' } }]
  };
}
function gtBody(list){
  const inc = [], seen = {};
  list.forEach(p => p.inc.forEach(x => { const k = x.type + x.id; if(!seen[k]){ seen[k] = 1; inc.push(x); } }));
  return JSON.stringify({ data: list.map(p => p.data), included: inc });
}
const TRENDING = gtBody([pool(0, 'WIF', MINTS.WIF, 'orca', { px: 2.41 }), pool(1, 'BONK', MINTS.BONK, 'raydium'), pool(2, 'POPCAT', MINTS.POP, 'orca', { mc: null })]);
const NEWPOOLS = gtBody([pool(0, 'NEWX', MINTS.NEW1, 'orca'), pool(1, 'MIGA', MINTS.MIG1, 'pumpswap'), pool(2, 'MIGB', MINTS.MIG2, 'raydium')]);
const BOOSTS = JSON.stringify([{ chainId: 'solana', tokenAddress: MINTS.WIF, totalAmount: 500 }, { chainId: 'ethereum', tokenAddress: '0xabc', totalAmount: 9 }]);
const PAIRS = JSON.stringify([{ baseToken: { address: MINTS.WIF, symbol: 'WIF', name: 'dogwifhat' }, priceUsd: '2.41', dexId: 'orca', liquidity: { usd: 3e7 }, marketCap: 2.4e9, volume: { h24: 4e8 }, priceChange: { h24: 6.4 } }]);

async function mock(ctx, opts){
  opts = opts || {};
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
  await ctx.route(/api\.geckoterminal\.com/, route => {
    const u = route.request().url();
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if(opts.gtDown) return route.fulfill({ status: 503, headers: cors, body: 'down' });
    if(/trending_pools/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: TRENDING });
    if(/new_pools/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: NEWPOOLS });
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
  await ctx.route(/api\.dexscreener\.com/, route => {
    const u = route.request().url();
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if(/token-boosts/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: BOOSTS });
    if(/tokens\/v1\/solana/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: PAIRS });
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
}


function klines(seed, n){ let p = seed, out = [], t = Date.UTC(2026, 8, 1); for(let i = 0; i < n; i++){ const o = p, c = o * (1 + Math.sin(i * .37 + seed % 7) * .012); out.push([t + i * 3600e3, String(o), String(Math.max(o, c) * 1.004), String(Math.min(o, c) * .996), String(c), String(100 + i % 50)]); p = c; } return JSON.stringify(out); }
async function boot(browser, url, opts){
  opts = opts || {};
  const ctx = opts.ctx || await browser.newContext({ viewport: { width: 1600, height: 900 } });
  if(!opts.ctx){
    await ctx.addInitScript(() => { try { localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done: true })); localStorage.setItem('cr_ui_v2_welcome_v1', JSON.stringify({ done: true })); } catch(_){} });
    await mock(ctx, opts);
    ctx._kl = [];
    await ctx.route(/api\.binance\.com\/api\/v3\/klines/, route => {
      const u = new URL(route.request().url()); ctx._kl.push(u.searchParams.get('symbol') + ':' + u.searchParams.get('interval'));
      if(ctx._binanceDown) return route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: 'down' });
      const sym = u.searchParams.get('symbol');
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: klines(sym === 'ETHUSDT' ? 2600 : sym === 'SOLUSDT' ? 150 : 65000, 300) });
    });
  }
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 200)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(opts.settle || 4500);
  await page.evaluate(() => { ['crFrMask','crFrPop'].forEach(id => { const e = document.getElementById(id); if(e) e.classList.remove('on'); }); window.crUiV2.desktop(); });
  page._crErrs = errs; page._ctx = ctx;
  return page;
}
const fileUrl = p => 'file://' + path.resolve(p);
const VIS = `el => { if(!el) return false; const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0; }`;

(async () => {
  const root = path.resolve(__dirname, '..');
  const selfPath = path.join(root, FILE);
  const url = fileUrl(selfPath) + '?ui=v2';
  const browser = await chromium.launch(launchOptions());
  let page = await boot(browser, url);
  const charts = () => page.evaluate(() => window.crUiV2.charts());
  const pick = async (grp, sel) => { await page.click('#cr2Rail [data-cr2-rail="' + grp + '"]'); await page.click('#cr2Rail [data-cr2-g="' + grp + '"] ' + sel); };
  const allErrs = [];

  console.log('\nC1 · Chart-Fenster oeffnen');
  {
    const before = await page.evaluate(() => currentAssetObj().id);
    await pick('trade', '[data-cr2-chartwin]');
    await page.waitForTimeout(900);
    const c = await charts();
    const r = await page.evaluate(`(() => { const vis = ${VIS}; const e = document.getElementById('cr2T-chart-1'); const cv = e && e.querySelector('canvas');
      let ink = 0; if(cv){ const g = cv.getContext('2d'); const d = g.getImageData(0, 0, cv.width, cv.height).data; for(let i = 3; i < d.length; i += 4 * 97) if(d[i] > 0) ink++; }
      return { vis: vis(e), ink, st: e && e.querySelector('.cr2-cst').textContent, ttl: e && e.querySelector('.cr2-th h2').textContent, asset: currentAssetObj().id }; })()`);
    check('C1a Chart-Fenster offen, mit eigenem Canvas', r.vis && c.length === 1, { r, c });
    check('C1b Kerzen aus der Antwort, gezeichnet', c[0] && c[0].rows === 300 && r.ink > 50, { c, ink: r.ink });
    check('C1c Quelle steht da', /Binance/.test(r.st) && /300 Kerzen/.test(r.st), r.st);
    check('C1d Spiel-Chart unberuehrt (entkoppelt)', r.asset === before, { before, now: r.asset });
  }

  console.log('\nC2 · zweites Fenster, eigener Coin und Zeitrahmen');
  {
    await pick('trade', '[data-cr2-chartwin]');
    await page.waitForTimeout(600);
    page._ctx._kl.length = 0;
    await page.click('#cr2T-chart-2 [data-cr2-coinbtn]');
    await page.fill('#cr2T-chart-2 .cr2-csearch', 'eth');
    await page.waitForTimeout(150);
    const opts = await page.evaluate(() => Array.from(document.querySelectorAll('#cr2T-chart-2 .cr2-clist [data-cr2-cref] b')).map(b => b.textContent));
    await page.press('#cr2T-chart-2 .cr2-csearch', 'Enter');
    await page.waitForTimeout(500);
    await page.click('#cr2T-chart-2 [data-cr2-ctf="15m"]');
    await page.waitForTimeout(600);
    const c = await charts();
    check('C2a Suche findet ETH', opts.indexOf('ETH') >= 0, opts);
    check('C2b zweites Fenster: ETH · 15m, eigene Kerzen', c.length === 2 && c[1].ref.sym === 'ETH' && c[1].tf === '15m' && c[1].rows === 300, c);
    check('C2c erstes Fenster bleibt BTC · 1h', c[0].ref.bsym === 'BTCUSDT' && c[0].tf === '1h' && c[0].rows === 300, c[0]);
    check('C2d nur das zweite hat neu geladen (ETHUSDT:1h, dann ETHUSDT:15m)', page._ctx._kl.join() === 'ETHUSDT:1h,ETHUSDT:15m', page._ctx._kl);
    const ttl = await page.evaluate(() => document.querySelector('#cr2Tabs [data-cr2-tab="t:chart-2"]').textContent);
    check('C2e Tab nennt Coin und Zeitrahmen', /ETH/.test(ttl) && /15m/.test(ttl), ttl);
    await page.evaluate(() => { window._crRunOhlcCandles = async function(m, tf){ window._ohlcAsk = m + ':' + tf; return [{ t: 1, o: 1, h: 2, l: .5, c: 1.5, v: 9 }, { t: 2, o: 1.5, h: 2.2, l: 1.2, c: 2, v: 7 }, { t: 3, o: 2, h: 2.4, l: 1.9, c: 2.3, v: 5 }]; }; });
    const mint = 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC';
    await page.click('#cr2T-chart-2 [data-cr2-coinbtn]');
    await page.fill('#cr2T-chart-2 .cr2-csearch', mint);
    await page.waitForTimeout(150);
    const mb = await page.evaluate(() => !!Array.from(document.querySelectorAll('#cr2T-chart-2 .cr2-clist b')).find(b => /Mint verwenden/.test(b.textContent)));
    await page.press('#cr2T-chart-2 .cr2-csearch', 'Enter');
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({ c: window.crUiV2.charts()[1], ask: window._ohlcAsk }));
    check('C2f Mint einfuegen → Solana-Chart aus dem OHLC-Store', mb && m.c.ref.mint === mint && m.c.rows === 3 && m.ask === mint + ':15m' && /OHLC/.test(m.c.src), m);
    await page.click('#cr2T-chart-2 [data-cr2-coinbtn]');
    await page.fill('#cr2T-chart-2 .cr2-csearch', 'eth'); await page.waitForTimeout(100);
    await page.press('#cr2T-chart-2 .cr2-csearch', 'Enter'); await page.waitForTimeout(500);
  }

  console.log('\nC3 · Ausfall ist keine Auskunft');
  {
    page._ctx._binanceDown = true;
    await page.click('#cr2Tabs [data-cr2-tabgo="t:chart-1"]');   // verdeckt vom zweiten → nach vorn holen
    await page.waitForTimeout(150);
    await page.click('#cr2T-chart-1 [data-cr2-ctf="4h"]');
    await page.waitForTimeout(700);
    const c = (await charts())[0];
    const st = await page.evaluate(() => document.querySelector('#cr2T-chart-1 .cr2-cst').textContent);
    check('C3a Quelle 500 → keine Kerzen, Grund steht da', c.rows === 0 && /500/.test(c.err) && /nicht abrufbar/.test(st), { c, st });
    page._ctx._binanceDown = false;
    await page.click('#cr2T-chart-1 [data-cr2-ctf="1h"]');
    await page.waitForTimeout(600);
  }

  console.log('\nC4 · Zoom und Verschieben');
  {
    await page.click('#cr2Tabs [data-cr2-tabgo="t:chart-2"]'); await page.waitForTimeout(150);
    const bb = await page.locator('#cr2T-chart-2 canvas').boundingBox();
    const view = id => page.evaluate(i => window.crUiV2.chartView(i), id);
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    const v0 = await view('chart-2'), o0 = await view('chart-1');
    await page.mouse.wheel(0, -600); await page.waitForTimeout(150);
    const v1 = await view('chart-2');
    await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 200, bb.y + bb.height / 2, { steps: 5 }); await page.mouse.up();
    const v2 = await view('chart-2'), o1 = await view('chart-1');
    const rd = await page.evaluate(() => document.querySelector('#cr2T-chart-2 .cr2-cread').textContent);
    check('C4a Rad zoomt hinein (weniger Kerzen sichtbar)', v1.span < v0.span, { v0, v1 });
    check('C4b Ziehen nach rechts schiebt in die Vergangenheit', v2.off > v1.off + 5, { v1, v2 });
    check('C4c Fadenkreuz-Ablesung zeigt OHLC der Kerze unter der Maus', v2.hover && /^O .* H .* L .* C /.test(rd), { rd, hover: v2.hover });
    check('C4d das andere Fenster bleibt unberuehrt', o1.span === o0.span && o1.off === o0.off, { o0, o1 });
  }

  console.log('\nC7 · Buy im Chart-Fenster');
  {
    await page.click('#cr2T-chart-2 [data-cr2-cside="BUY"]');
    await page.waitForTimeout(9000);
    const r = await page.evaluate(() => { const sec = document.querySelector('[data-blue-route-inputs]'); return { splash: document.getElementById('splash').style.display,
      sels: sec ? Array.from(sec.querySelectorAll('select')).map(s => s.value) : [], asset: currentAssetObj().id }; });
    check('C7a Buy → Spiel-Chart ETH mit dem bestehenden Activation-Panel, Seite BUY', r.splash === 'none' && r.asset === 'eth' && r.sels.indexOf('BUY') >= 0, r);
    await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} });
  }

  console.log('\nC8 · Chart-Tab-Etikett folgt dem Coin');
  {
    const l0 = await page.evaluate(() => window.crUiV2.chartLabel());
    await page.evaluate(async () => { await switchAsset('sol'); });
    await page.waitForTimeout(600);
    await page.evaluate(() => showSplash());
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ lbl: window.crUiV2.chartLabel(), tab: (document.querySelector('#cr2Tabs [data-cr2-tab="chart"]') || {}).textContent || '' }));
    check('C8a Etikett war ETH (aus dem Buy)', /ETH/.test(l0), l0);
    check('C8b nach Coin-Wechsel im Chart: Tab sagt SOL, nicht mehr ETH/BTC', /SOL/.test(r.lbl) && /SOL/.test(r.tab) && !/ETH|BTC/.test(r.tab), r);
    await page.evaluate(() => window.crUiV2.desktop());
    // ohne Umweg ueber showSplash: der Wechsel selbst zieht das Etikett nach
    await page.evaluate(async () => { await switchAsset('btc'); });
    await page.waitForTimeout(300);
    const t2 = await page.evaluate(() => (document.querySelector('#cr2Tabs [data-cr2-tab="chart"]') || {}).textContent || '');
    check('C8c Coin-Wechsel auf dem Desktop: Tab sagt sofort BTC', /BTC/.test(t2) && !/SOL/.test(t2), t2);
  }

  console.log('\nC6 · Runner');
  {
    const before = (await charts())[1];
    // Spiel vorher bewusst auf einen ANDEREN Zeitrahmen, sonst waere C6a auch ohne Umstellung wahr
    await page.evaluate(async (tf) => { if(timeframe !== tf) return; await applyInterval(tf === '4h' ? '1d' : '4h'); }, before.tf);
    await page.evaluate(async () => { if(timeframe === '15m') await applyInterval('4h'); });
    const tf0 = await page.evaluate(() => timeframe);
    check('C6· Vorbedingung: Spiel-Zeitrahmen weicht vom Fenster ab', tf0 !== before.tf, { tf0, win: before.tf });
    await page.click('#cr2T-chart-2 [data-cr2-crun]');
    await page.waitForTimeout(9000);
    const r = await page.evaluate(() => ({ asset: currentAssetObj().id, tf: timeframe, run: document.getElementById('win-run').classList.contains('on') }));
    const after = (await charts())[1];
    check('C6a Spiel-Chart steht auf Coin + Zeitrahmen des Fensters', r.asset === 'eth' && r.tf === before.tf, { r, before });
    check('C6b „Run starten" ist offen (wie gewohnt)', r.run === true, r);
    check('C6c Chart-Fenster bleibt unveraendert', after.ref.sym === before.ref.sym && after.tf === before.tf && after.rows === before.rows, { before, after });
    await page.evaluate(() => { document.getElementById('win-run').classList.remove('on'); });
  }

  console.log('\nC9 · Terminal-Ansichten als eigene Fenster');
  {
    await pick('trade', '[data-cr2-prog="terminal"]'); await page.waitForTimeout(500);
    const node0 = await page.evaluate(() => { window._solNode = document.getElementById('crTermViewSolana'); return !!window._solNode; });
    await pick('trade', '[data-cr2-view="solana"]'); await page.waitForTimeout(400);
    await pick('trade', '[data-cr2-view="cex"]'); await page.waitForTimeout(400);
    const r = await page.evaluate(`(() => { const vis = ${VIS}; const sol = document.getElementById('crTermViewSolana');
      return { same: sol === window._solNode, inTile: !!sol.closest('#cr2T-view-solana'), solVis: vis(sol), cexIn: !!document.getElementById('crTermViewCex').closest('#cr2T-view-cex'),
        term: document.getElementById('win-terminal').classList.contains('on'), panes: sol.querySelectorAll('[data-pane-id]').length,
        popped: !!document.querySelector('#win-terminal .crTerm-tab.cr2-popped[data-termview="solana"]') }; })()`);
    check('C9a Solanatracker ist DERSELBE Knoten, jetzt im eigenen Fenster, sichtbar', node0 && r.same && r.inTile && r.solVis && r.panes > 0, r);
    check('C9b CEXtracker ebenso, Terminal gleichzeitig offen', r.cexIn && r.term, r);
    check('C9c Terminal-Tab zeigt „ausgelagert"', r.popped, r);
    await page.evaluate(() => window.crUiV2.open('terminal')); await page.waitForTimeout(200);
    await page.click('#win-terminal .crTerm-tab[data-termview="darkflow"]'); await page.waitForTimeout(200);
    const still = await page.evaluate(`(() => { const vis = ${VIS}; return vis(document.getElementById('crTermViewSolana')); })()`);
    check('C9d Tab-Wechsel im Terminal versteckt die ausgelagerte Ansicht nicht', still === true, still);
    await page.click('#win-terminal .crTerm-tab[data-termview="solana"]'); await page.waitForTimeout(200);
    const top = await page.evaluate(() => { const t = document.getElementById('cr2T-view-solana'); const w = document.getElementById('win-terminal'); return +t.style.zIndex > +w.style.zIndex; });
    check('C9e Klick auf ihren Tab im Terminal holt das eigene Fenster nach vorn', top === true, top);
    // kurzer Timeout: ist das Fenster verdeckt (C9e rot), soll C9f rot werden, nicht der Lauf abstuerzen
    await page.click('#cr2T-view-solana [data-cr2-tclose]', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200);
    const back = await page.evaluate(() => ({ parent: window.crUiV2.viewParent('solana'), inTerm: !!(document.getElementById('crTermViewSolana') || { closest: () => null }).closest('#win-terminal'), same: document.getElementById('crTermViewSolana') === window._solNode,
      popped: !!document.querySelector('#win-terminal .crTerm-tab.cr2-popped[data-termview="solana"]'), tile: !!document.getElementById('cr2T-view-solana') }));
    check('C9f Schliessen haengt sie ins Terminal zurueck (derselbe Knoten)', back.inTerm && back.same && !back.popped && !back.tile, back);
  }

  console.log('\nC10 · eine Stapelordnung');
  {
    await page.evaluate(() => window.crUiV2.open('terminal')); await page.waitForTimeout(300);
    const z = () => page.evaluate(() => ({ t: +document.getElementById('cr2T-chart-1').style.zIndex, w: +document.getElementById('win-terminal').style.zIndex }));
    const a = await z();
    check('C10a zuletzt geoeffnetes Fenster liegt ueber den Chart-Fenstern', a.w > a.t, a);
    await page.click('#cr2Tabs [data-cr2-tabgo="t:chart-1"]'); await page.waitForTimeout(200);
    const b = await z();
    const vis = await page.evaluate(() => !document.getElementById('cr2T-chart-1').hidden);
    check('C10b Tab-Klick auf verdecktes Modul holt es nach vorn (statt zu minimieren)', b.t > b.w && vis, { b, vis });
    const wb = await page.locator('#win-terminal .os-wbar').boundingBox();
    await page.mouse.click(wb.x + wb.width - 30, wb.y + wb.height / 2); await page.waitForTimeout(150);
    const c = await z();
    check('C10c Anfassen des Fensters holt es wieder ueber das Modul', c.w > c.t, c);
  }

  allErrs.push(...page._crErrs);
  console.log('\nC5 · Neuladen');
  {
    const before = await charts();
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(5000);
    const after = await charts();
    check('C5a beide Chart-Fenster kommen mit Coin und Zeitrahmen wieder', after.length === 2 && after.every((c, i) => c.ref.sym === before[i].ref.sym && c.tf === before[i].tf && c.rows > 0), { before, after });
    const id = await page.evaluate(() => window.crUiV2.openChart());
    await page.waitForTimeout(600);
    const n = (await charts()).find(c => c.id === id);
    check('C5b neues Fenster startet mit dem zuletzt gewaehlten Coin, nicht BTC', n && n.ref.sym === 'ETH', n);
    const sol = await page.evaluate(() => !document.getElementById('cr2T-view-solana'));
    check('C5c geschlossener Tracker bleibt zu', sol === true, sol);
    allErrs.push(...page._crErrs);
  }
  await page._ctx.close();

  console.log('\nC9x · Regression');
  {
    const src = fs.readFileSync(selfPath, 'utf8');
    const ver = (src.match(/CURRENT VERSION:\s*v1\.0\.(\d+)/) || [])[1];
    check('C9xa Banner >= v1.0.951', Number(ver) >= 951, ver);
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g; let n = 0; while(re.exec(src)) n++;
    check('C9xb 7 Skriptbloecke', n === 7, n);
    check('C9xc Aktivierungszeile fuer /play-v2/ genau einmal', src.split('\n  if(!_want()) return;\n').length === 2);
    const e2 = allErrs.filter(e => /cr2|crUiV2|cr-ui-v2/.test(e));
    check('C9xd keine Seitenfehler aus dem v2-Block', e2.length === 0, e2);
  }
  await browser.close();
  console.log('\n' + pass + ' ok · ' + fail + ' FAIL · 0 UNGETESTET');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
