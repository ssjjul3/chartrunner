/* Smoke-Verifikation fuer v1.0.878 — Deckung vor dem Signieren.
 *
 * Anlass ist der erste echte Handel auf Mainnet. Er ist gelandet und
 * gescheitert, Signatur fk3gh6YE…, Slot 440.991.238:
 *
 *   #4 System Instruction
 *   > Transfer: insufficient lamports 16108190, need 50000000
 *
 * In der Tafel stand jede Zahl richtig — Einsatz, Mindestens,
 * Preisauswirkung, Deckel. Die eine, die entschieden hat, kam nicht vor.
 * Kosten: 0,00351 SOL Gebuehr fuer eine Transaktion, die nichts bewegt hat.
 *
 * Der Hauptfall unten benutzt GENAU diese Zahlen: 16108190 vorhanden,
 * 50000000 gebraucht. Kein ausgedachtes Beispiel — der echte Vorfall.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v878_deckung_browser.cjs
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

const BONK   = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const CAP    = 50000000;
const RENT   = 2039280;
const ECHT   = 16108190;      // sein Guthaben, aus dem Kettenprotokoll

function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__signs = [];
  const w = { name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet'], accounts: [acct],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (i) => { window.__signs.push({ chain: i.chain });
          const s = new Uint8Array(64); s[0] = 5; return [{ signature: s }]; } } } };
  window.addEventListener('wallet-standard:app-ready', e => {
    const a = e.detail; (typeof a === 'function' ? a : a.register)(w);
  });
}

const quote = () => ({
  transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
  quote: { in_raw: String(CAP), out_raw: '142592458608', min_out_raw: '141879496315',
           price_impact_pct: 0, slippage_bps: 50 },
  cap:  { max_in_lamports: CAP, output_allowlist: [BONK] },
  fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
  checked: { instructions_match_request: false },
});

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  let balance = ECHT;            // in Lamports, oder null = nicht abrufbar
  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    const post = req.postData() || '';
    if(/getBalance/.test(post)){
      if(balance === null) return route.fulfill({ status: 500, body: 'nope' });
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: { value: balance } }) });
    }
    if(/\/v1\/tx\/swap/.test(req.url()))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quote()) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
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
  check('Banner meldet mindestens v1.0.878',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 878)))),
    banner.slice(0, 60));

  console.log('\n-- Die Rechnung selbst --');
  const d = (bal) => page.evaluate(([b, e]) => _crSwapDeckung(b, e), [bal, CAP]);
  const echt = await d(ECHT);
  check('der echte Fall wird abgelehnt', echt.ok === false, echt.ok);
  check('nennt das vorhandene Guthaben', /0\.0161/.test(echt.html), echt.html.slice(0, 200));
  check('nennt, was fehlt', /fehlen mindestens/.test(echt.html), echt.html.slice(0, 260));
  check('nennt die Konto-Miete als eigenen Posten', /Miete/.test(echt.html));
  check('genau auf der Kante reicht nicht', (await d(CAP)).ok === false);
  check('Einsatz + Miete exakt → erlaubt, aber knapp',
    (await d(CAP + RENT)).ok === true && /Knapp/.test((await d(CAP + RENT)).html));
  check('mit Puffer → keine Warnung',
    (await d(CAP + RENT + 20000000)).ok === true && (await d(CAP + RENT + 20000000)).html === '');
  const unk = await d(null);
  check('nicht abrufbar blockiert NICHT', unk.ok === true);
  check('nicht abrufbar wird als das benannt', /nicht abfragen/.test(unk.html), unk.html.slice(0, 160));

  /* Zwischen den Faellen den Guthaben-Cache leeren. In der Wirklichkeit sind
   * das verschiedene Momente; im Test sind es Millisekunden, und der Cache
   * wuerde ueberall den ersten Stand zeigen. (Genau daran sind hier zuerst
   * sechs Zeilen rot geworden — am Cache, nicht an der Rechnung.) */
  const freshBalance = () => page.evaluate(() => {
    for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
  });

  const build = () => page.evaluate((mint) => {
    const host = document.createElement('div');
    host.innerHTML = '<button data-cr-swap="' + mint + '">g</button>'
                   + '<button data-cr-cap-probe="' + mint + '">p</button>'
                   + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
    document.body.appendChild(host); _crWireSwap(host, mint); window.__host = host; return true;
  }, BONK);
  const tap   = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap]').click());
  const panel = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap-panel]').textContent);
  const goBtn = () => page.evaluate(() => !!window.__host.querySelector('[data-cr-swap-go]'));
  const settle = async (re, ms = 12000) => { const t0 = Date.now();
    for(;;){ const t = await panel(); if(re.test(t)) return t;
      if(Date.now() - t0 > ms) return t; await page.waitForTimeout(150); } };

  await page.evaluate(() => crSigner.connect());
  await page.waitForTimeout(400);

  console.log('\n-- In der Tafel: der echte Vorfall --');
  balance = ECHT;
  await freshBalance(); await build(); await tap(); let t = await settle(/reicht nicht|Signieren/);
  check('Guthaben steht in der Tafel', /Dein Guthaben/.test(t), t.slice(0, 200));
  check('sagt „Das reicht nicht"', /Das reicht nicht/.test(t), t.slice(0, 240));
  check('KEIN Signieren-Knopf', (await goBtn()) === false);
  check('und nichts signiert', await page.evaluate(() => window.__signs.length === 0));

  console.log('\n-- Genug Guthaben --');
  balance = 200000000;                    // 0,2 SOL
  await freshBalance(); await build(); await tap(); t = await settle(/Signieren und senden/);
  check('Signieren-Knopf ist da', (await goBtn()) === true, t.slice(0, 160));
  check('keine Warnung', !/reicht nicht/.test(t) && !/Knapp/.test(t));
  check('Guthaben wird trotzdem gezeigt', /Dein Guthaben/.test(t));

  console.log('\n-- Knapp, aber erlaubt --');
  balance = CAP + RENT + 3000000;         // deckt Einsatz+Miete, wenig Gebuehr
  await freshBalance(); await build(); await tap(); t = await settle(/Signieren und senden/);
  check('darf signieren', (await goBtn()) === true);
  check('wird aber als knapp benannt', /Knapp/.test(t), t.slice(-260));
  check('nennt die Wallet als Instanz für die Gebühr', /in der Wallet/.test(t));

  console.log('\n-- Guthaben nicht abrufbar --');
  balance = null;
  await freshBalance(); await build(); await tap(); t = await settle(/Signieren und senden|reicht nicht/);
  check('blockiert nicht', (await goBtn()) === true, t.slice(0, 160));
  check('sagt, dass es ungeprüft ist', /nicht abfragen/.test(t), t.slice(-220));

  console.log('\n-- Die Gebühr gibt sich nicht als die ganze aus --');
  balance = 200000000;
  await freshBalance(); await build(); await tap(); t = await settle(/Signieren und senden/);
  check('Zeile heißt „Gebühr (Basis)"', /Gebühr \(Basis\)/.test(t), t.slice(0, 220));
  check('sagt, dass die Wallet obendrauf legt', /Prioritätsgebühr/.test(t));
  check('sagt, dass es ein Vielfaches sein kann', /Vielfaches/.test(t));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
