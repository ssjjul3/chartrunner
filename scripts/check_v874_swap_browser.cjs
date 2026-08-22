/* Smoke-Verifikation fuer v1.0.874 (P2·3 — echter Swap).
 *
 * Der wichtigste Test hier ist NICHT der gelungene Swap. Es sind die
 * Ablehnungen und die zwei Stufen: dass ein Tap allein nichts signiert, und
 * dass „Mindestens" dasteht, bevor jemand unterschreibt.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v874_swap_browser.cjs
 * Bewusst nicht in ci.yml — der CI-Job hat keinen Browser.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(name, cond, extra){
  if(cond){ pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
function launchOptions(){
  const opts = { headless: true };
  const cands = [process.env.CR_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ opts.executablePath = c; break; }
  return opts;
}

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__setNet = n => { acct.chains = [n]; };
  window.__signs = [];
  const w = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet', 'solana:devnet'], accounts: [acct],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (input) => {
          window.__signs.push({ chain: input.chain, len: (input.transaction || []).length });
          if(window.__signMode === 'reject') throw new Error('User rejected the request.');
          const sig = new Uint8Array(64); sig[0] = 5; sig[63] = 3;
          return [{ signature: sig }];
        } },
    },
  };
  window.addEventListener('wallet-standard:app-ready', e => {
    const api = e.detail; (typeof api === 'function' ? api : api.register)(w);
  });
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', r => r.request().url().startsWith('file:')
    ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  let swapMode = 'ok', stMode = 'ok';
  const calls = [];
  await page.route('**chartrunner-tx.jsg-951.workers.dev/**', async route => {
    const req = route.request();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch(_){}
    calls.push({ url: req.url(), method: req.method(), body });
    if(/\/v1\/tx\/status/.test(req.url())){
      if(stMode === 'fail') return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ confirmationStatus: 'confirmed', err: { InstructionError: [0, 'Custom'] } }) });
      // 'processed' ist KEIN Endzustand — die Bestaetigung laeuft weiter. Damit
      // laesst sich der Zwischenzustand testen, statt ihn nur zu behaupten.
      if(stMode === 'slow') return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ confirmationStatus: 'processed', err: null }) });
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ confirmationStatus: 'confirmed', confirmations: 7, err: null }) });
    }
    if(swapMode === 'over')  return route.fulfill({ status: 400, contentType: 'application/json',
      body: JSON.stringify({ ok:false, error:'over-cap', given:'60000000',
        cap:{ max_in_lamports:50000000 }, note:'0,06 SOL angefragt, erlaubt sind 0,05.' }) });
    if(swapMode === 'mint')  return route.fulfill({ status: 400, contentType: 'application/json',
      body: JSON.stringify({ ok:false, error:'mint-not-allowed', cap:{ output_allowlist:[BONK] } }) });
    if(swapMode === 'empty') return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ cluster:'mainnet' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      transaction: btoa('\x01\x02\x03\x04\x05'), expires_in_s: 40, cluster: 'mainnet',
      quote: { in_raw:'50000000', out_raw:'3520000000000', min_out_raw:'3502400000000',
               price_impact_pct: 0.0023, route:['Orca'], slippage_bps: 50 },
      cap:  { max_in_lamports: 50000000, max_slippage_bps: 100, output_allowlist:[BONK] },
      fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false, note:'…' },
      checked: { instructions_match_request: false },
    }) });
  });

  await page.addInitScript(mockWallet);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.874',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 874)))),
    banner.slice(0, 70));

  console.log('\n-- Die Naht --');
  check('ChartRunnerSDK.prototype.prepareSwap existiert',
    await page.evaluate(() => typeof ChartRunnerSDK.prototype.prepareSwap === 'function'));
  check('crTxApi.swap existiert', await page.evaluate(() => !!(window.crTxApi && crTxApi.swap)));
  check('prepareSwap SIGNIERT nicht — nur vorbereiten',
    await page.evaluate(async () => {
      await ChartRunnerSDK.prototype.prepareSwap({ payer:'x', outputMint:'y', amountRaw:'1' });
      return window.__signs.length === 0; }));

  /* Die Oberflaeche haengt an einem gerenderten Token-Profil. Statt das
   * nachzubauen, wird der Ablauf direkt gegen die Verdrahtung geprueft — es
   * geht um das VERHALTEN, nicht um die Pixel. */
  const build = () => page.evaluate((mint) => {
    const host = document.createElement('div');
    host.innerHTML = '<button type="button" data-cr-swap="' + mint + '">go</button>'
                   + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
    document.body.appendChild(host);
    _crWireSwap(host, mint);
    window.__host = host;
    return true;
  }, BONK);
  const tap   = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap]').click());
  const panel = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap-panel]').textContent);
  const settle = async (re, ms = 20000) => {
    const t0 = Date.now();
    for(;;){ const t = await panel(); if(re.test(t)) return t;
      if(Date.now() - t0 > ms) return t; await page.waitForTimeout(200); }
  };

  /* Ab hier zaehlt nur, was SEIT der jeweiligen Marke passiert ist. „Die Naht"
   * hat prepareSwap direkt aufgerufen und damit selbst einen Swap-Call erzeugt —
   * ein globaler Zaehler wuerde den den naechsten Abschnitten anlasten. */
  const swapsSince = m => calls.slice(m).filter(c => /\/v1\/tx\/swap/.test(c.url)).length;

  console.log('\n-- Ohne Wallet --');
  let mark = calls.length;
  await build(); await tap(); await page.waitForTimeout(300);
  check('ohne Verbindung wird nichts geholt', /Wallet verbinden/.test(await panel()), await panel());
  check('und nichts gebaut', swapsSince(mark) === 0, swapsSince(mark));

  await page.evaluate(() => crSigner.connect());
  await page.waitForTimeout(400);

  console.log('\n-- Falsches Netz --');
  await page.evaluate(() => window.__setNet('solana:devnet'));
  mark = calls.length;
  await build(); await tap(); await page.waitForTimeout(400);
  let t = await panel();
  check('Wallet auf devnet → Warnung statt Handel', /braucht/.test(t) && /mainnet/.test(t), t);
  check('kein Angebot geholt', swapsSince(mark) === 0, swapsSince(mark));
  await page.evaluate(() => window.__setNet('solana:mainnet'));

  console.log('\n-- Der Deckel haelt (die eigentliche Pruefung) --');
  swapMode = 'over';
  await build(); await tap(); t = await settle(/Deckel/);
  check('over-cap wird MIT Zahlen gezeigt', /0\.06|0,06|60000000|0\.0600/.test(t) || /Über dem Deckel/.test(t), t);
  check('sagt ausdrücklich, dass der Deckel gehalten hat', /Deckel hat gehalten/.test(t), t);
  check('es wurde NICHT signiert', await page.evaluate(() => window.__signs.length === 0));

  console.log('\n-- Token nicht freigegeben --');
  swapMode = 'mint';
  await build(); await tap(); t = await settle(/Testphase/);
  check('mint-not-allowed nennt die Testphase', /nicht freigegeben/.test(t), t);

  console.log('\n-- 200 ohne Transaktion --');
  swapMode = 'empty';
  await build(); await tap(); t = await settle(/keine Transaktion/);
  check('leere Antwort wird benannt, nicht weitergereicht', /keine Transaktion/.test(t), t);
  check('immer noch nichts signiert', await page.evaluate(() => window.__signs.length === 0));

  console.log('\n-- Zwei Stufen: erst lesen, dann signieren --');
  swapMode = 'ok';
  await build(); await tap(); t = await settle(/Mindestens/);
  check('„Mindestens" steht da, bevor signiert wird', /Mindestens/.test(t), t.slice(0, 120));
  check('und wird als die Zahl benannt, die zählt', /die Zahl, die zählt/.test(t), t.slice(0, 200));
  check('Deckel wird angezeigt', /Deckel/.test(t));
  check('Preisauswirkung wird angezeigt', /Preisauswirkung/.test(t));
  check('die Lücke des Workers wird weitergegeben',
    /nicht.*Instruktionen|Instruktionen.*nicht/i.test(t) && /lies es/.test(t), t.slice(-220));
  check('nach dem ERSTEN Tap ist nichts signiert',
    await page.evaluate(() => window.__signs.length === 0));

  console.log('\n-- Zweiter Tap: signieren --');
  await page.evaluate(() => window.__host.querySelector('[data-cr-swap-go]').click());
  t = await settle(/Gehandelt|FEHLGESCHLAGEN|nicht bestätigt/);
  check('meldet „Gehandelt" mit Bestätigungen', /Gehandelt/.test(t) && /7 Bestätigungen/.test(t), t);
  const sent = await page.evaluate(() => window.__signs.slice(-1)[0]);
  check('an die Wallet ging solana:MAINNET', sent.chain === 'solana:mainnet', sent);
  const stCall = calls.filter(c => /\/v1\/tx\/status/.test(c.url)).slice(-1)[0];
  check('Status wurde gegen MAINNET abgefragt', /cluster=mainnet/.test(stCall.url), stCall.url);
  check('Explorer-Link OHNE cluster-Parameter (Mainnet)',
    await page.evaluate(() => {
      const a = window.__host.querySelector('[data-cr-swap-panel] a');
      return !!a && !/cluster=/.test(a.getAttribute('href')); }));

  /* Zwei Schreiber auf einer Tafel. Waehrend die Bestaetigung laeuft, darf ein
   * erneuter Tap kein neues Angebot in dieselbe Tafel schreiben — sonst wechselt
   * die Anzeige zwischen zwei verschiedenen Trades hin und her und keiner weiss,
   * welcher gerade gemeint ist. Die Tafel bleibt belegt, bis die Kette
   * geantwortet hat. Danach ist sie wieder frei. */
  console.log('\n-- Die Tafel gehoert dem laufenden Handel --');
  {
    stMode = 'slow';                       // Bestaetigung bleibt in der Schwebe
    await build(); await tap(); await settle(/Mindestens/);
    await page.evaluate(() => window.__host.querySelector('[data-cr-swap-go]').click());
    await settle(/Warte auf Best/);
    let m2 = calls.length;
    await tap(); await page.waitForTimeout(500);
    const t2 = await panel();
    check('waehrend der Bestaetigung holt ein Tap kein neues Angebot',
      swapsSince(m2) === 0, swapsSince(m2));
    check('die Tafel zeigt weiter den laufenden Handel',
      /Warte auf Best/.test(t2) && !/Bevor du signierst/.test(t2), t2.slice(0, 90));
    stMode = 'ok';                         // Kette antwortet → Endzustand
    await settle(/Gehandelt/);
    m2 = calls.length;
    await tap(); await settle(/Mindestens/, 8000);
    check('nach dem Endzustand ist die Tafel wieder frei', swapsSince(m2) === 1, swapsSince(m2));
  }

  console.log('\n-- Gelandet UND gescheitert --');
  stMode = 'fail';
  await build(); await tap(); await settle(/Mindestens/);
  await page.evaluate(() => window.__host.querySelector('[data-cr-swap-go]').click());
  t = await settle(/FEHLGESCHLAGEN|Gehandelt/);
  check('ein Fehlschlag auf der Kette gilt NICHT als Handel',
    /FEHLGESCHLAGEN/.test(t) && !/Gehandelt/.test(t), t);
  stMode = 'ok';

  console.log('\n-- Anfrage an den Worker --');
  const sw = calls.filter(c => /\/v1\/tx\/swap/.test(c.url)).slice(-1)[0];
  check('cluster wird mitgeschickt', sw.body.cluster === 'mainnet', sw.body);
  check('Einsatz ist die Testgröße 0,05 SOL', sw.body.amount_raw === '50000000', sw.body.amount_raw);
  check('Eingabe ist WSOL', /^So111111/.test(sw.body.input_mint || ''), sw.body.input_mint);
  check('POST, nicht GET', sw.method === 'POST');

  console.log('\n-- kein Hintergrundbetrieb --');
  const n0 = calls.length;
  await page.waitForTimeout(3000);
  check('der Worker wird nicht von selbst angerufen', calls.length === n0, { n0, now: calls.length });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
