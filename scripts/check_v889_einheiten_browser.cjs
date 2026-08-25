/* Smoke-Verifikation fuer v1.0.889 — die Einheit ist wieder EINE.
 *
 * Live-Messung 25.08.: der Parser las Roheinheiten (Client-Metadaten ohne
 * decimals), waehrend MAX und Bestand die decimals des Bestands-Endpunkts
 * kannten. Die scharfen Zeilen hier: dieselbe Eingabe, die ein Mensch in
 * TOKEN-Einheiten tippt, kommt als exakt die richtigen Roheinheiten beim
 * Worker an — und der MAX->Angebot-Rundlauf verkauft den Bestand BYTE-EXAKT.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v889_einheiten_browser.cjs
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
  const cands = [process.env.CR_CHROME_PATH].filter(Boolean);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ opts.executablePath = c; break; }
  return opts;
}
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const WSOL = 'So11111111111111111111111111111111111111112';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  const w = { name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet'],
    get accounts(){ return [acct]; },
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async () => { const s = new Uint8Array(64); s[0] = 5; return [{ signature: s }]; } } } };
  window.addEventListener('wallet-standard:app-ready', e => {
    const a = e.detail; (typeof a === 'function' ? a : a.register)(w);
  });
}
(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  const swapReqs = [];
  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    if(/\/v1\/rpc\/balance/.test(req.url())) return route.fulfill({ status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, lamports: '900000000', cluster: 'mainnet' }) });
    if(/\/v1\/rpc\/tokens/.test(req.url())){
      const st = await page.evaluate(() => window.__tok).catch(() => null);
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(st || { ok: true, read: true, holdings: [] }) });
    }
    if(/\/health/.test(req.url())) return route.fulfill({ status: 200,
      contentType: 'application/json', body: '{}' });
    if(/\/v1\/tx\/swap/.test(req.url())){
      try { swapReqs.push(JSON.parse(req.postData() || '{}')); } catch(_){ swapReqs.push({}); }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
          quote: { in_raw: (swapReqs[swapReqs.length-1].amount_raw || '0'), out_raw: '95',
                   min_out_raw: '95', slippage_bps: 50, price_impact_pct: '0.0077' },
          fee: { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
          checked: { instructions_match_request: true, level: 'form+amount' },
          route: { platform_fee_bps: 50 } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(([addr]) => {
    try { localStorage.setItem('cr_wallet', addr); } catch(_){}
  }, [ADDR]);
  await page.addInitScript(mockWallet);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));

  /* Der Bestand des Live-Falls: 293.833.028.940 Roh bei decimals 5. */
  const bestand = { ok: true, read: true, holdings: [{ mint: BONK,
    amount_raw: '293833028940', spendable_amount_raw: '293833028940',
    decimals: 5, frozen: false, symbol: 'BONK' }] };

  const run = (opts) => page.evaluate(([mint, o]) => new Promise((resolve) => {
    window.__tok = o.tok || null;
    for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
    for(const k of Object.keys(_crSwapTokCache)) delete _crSwapTokCache[k];
    const host = document.createElement('div');
    host.innerHTML = '<button data-cr-swap-dir="kauf">k</button><button data-cr-swap-dir="verkauf">v</button>'
      + '<input data-cr-swap-betrag value="' + (o.betrag || '') + '">'
      + '<button data-cr-swap-max>m</button><button data-cr-swap-cur>c</button>'
      + '<div data-cr-swap-menu style="display:none"></div><div data-cr-swap-erhalt></div>'
      + '<span data-cr-swap-bestand></span>'
      + '<button data-cr-swap="' + mint + '">g</button>'
      + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
    document.body.appendChild(host); _crWireSwap(host, mint);
    host.querySelector('[data-cr-swap-dir="verkauf"]').click();
    const weiter = () => {
      if(o.nurMax) return resolve({
        feld: host.querySelector('[data-cr-swap-betrag]').value,
        bestand: host.querySelector('[data-cr-swap-bestand]').textContent });
      host.querySelector('[data-cr-swap]').click();
      const p = host.querySelector('[data-cr-swap-panel]');
      const t0 = Date.now();
      (function poll(){
        const t = p.textContent || '';
        if((t && !/Angebot wird geholt/.test(t)) || Date.now() - t0 > 12000)
          return resolve({ text: t,
            feld: host.querySelector('[data-cr-swap-betrag]').value });
        setTimeout(poll, 120);
      })();
    };
    if(o.max){ host.querySelector('[data-cr-swap-max]').click(); setTimeout(weiter, 900); }
    else weiter();
  }), [BONK, opts]);

  console.log('\n-- Die Einheit des Live-Falls: Eingabe in BONK, Anfrage in Roh --');
  let r = await run({ betrag: '29,3833', tok: bestand });
  let rq = swapReqs[swapReqs.length - 1] || {};
  check('"29,3833" bei decimals 5 → amount_raw 2938330 (der 25.08.-Fall, richtig gedeutet)',
    rq.amount_raw === '2938330', rq);
  check('die Tafel nennt den Einsatz in EINHEITEN, nicht in Roheinheiten',
    r.text.indexOf('Roheinheiten') === -1 || /29,3833/.test(r.text), r.text.slice(0, 300));
  /* _crFmtMenge rundet hausueblich auf zwei Stellen — volle Praezision
   * gehoert ins FELD und in die ANFRAGE, nicht in die Anzeige. */
  check('der Bestand steht formatiert in der Tafel (BONK, nicht "Token")',
    /2\.938\.330,29\s*BONK/.test(r.text), r.text.slice(0, 400));

  console.log('\n-- MAX → Angebot: der Rundlauf verkauft BYTE-EXAKT den Bestand --');
  r = await run({ max: true, tok: bestand });
  rq = swapReqs[swapReqs.length - 1] || {};
  check('MAX fuellt das Feld in Einheiten', r.feld === '2938330,2894', r.feld);
  check('… und die Anfrage traegt exakt den vollen Bestand',
    rq.amount_raw === '293833028940', rq);
  r = await run({ nurMax: true, max: true, tok: bestand });
  check('die Bestand-Zeile spricht dieselbe Sprache wie das Feld (BONK)',
    /Bestand:/.test(r.bestand) && /BONK/.test(r.bestand), r.bestand);

  console.log('\n-- Unbekannte decimals bleiben Roheingabe, ausdruecklich benannt --');
  const ohneD = JSON.parse(JSON.stringify(bestand));
  delete ohneD.holdings[0].decimals;
  r = await run({ betrag: '29,3833', tok: ohneD });
  check('ohne decimals: Komma-Eingabe wird abgelehnt statt geraten',
    /Roheinheiten/.test(r.text) && /nicht bekannt/.test(r.text), r.text.slice(0, 220));

  console.log('\n-- Quelle --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('_crAssetDecimals existiert genau einmal (EINE Rangfolge)',
    (src.match(/function _crAssetDecimals/g) || []).length === 1);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
