/* Smoke-Verifikation fuer v1.0.881 — die Pruefzeile im Handel.
 *
 * Bis tx v1.3 stand in der Tafel, der Worker pruefe die Instruktionen NICHT.
 * Seit tx v1.4 tut er es. Die Warnung war ab da eine Aussage ueber eine
 * Fassung, die nicht mehr laeuft.
 *
 * Der entscheidende Test unten ist NICHT der true-Fall — der ist leicht.
 * Es sind die beiden anderen:
 *
 *  - false heisst „die Pruefung konnte nicht laufen", nicht „die Instruktionen
 *    passen nicht". Laut /health fuehrt ein echter Treffer zur ABLEHNUNG ohne
 *    transaction-Feld; er kommt in dieser Tafel nie an. Wer hier „passen nicht"
 *    schreibt, meldet einen Befund, den niemand erhoben hat.
 *
 *  - FEHLT das Feld, darf die Zeile nicht „geprueft" sagen. Das ist der Fall,
 *    den ein Test mit nur gueltigen Eingaben nie sieht — und genau die Sorte
 *    Fehler, die diese Codebasis schon zweimal bezahlt hat.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v881_pruefzeile_browser.cjs
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
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const CAP  = 50000000;

/* Eine Wallet, die diese Seite schon autorisiert hat — wie in v880. */
function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__signs = [];
  const w = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet'],
    get accounts(){ return [acct]; },
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (i) => { window.__signs.push({ chain: i.chain });
          const s = new Uint8Array(64); s[0] = 5; return [{ signature: s }]; } },
    },
  };
  window.addEventListener('wallet-standard:app-ready', e => {
    const a = e.detail; (typeof a === 'function' ? a : a.register)(w);
  });
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    const post = req.postData() || '';
    if(/getBalance/.test(post)) return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: { value: 200000000 } }) });
    if(/\/v1\/tx\/swap/.test(req.url())){
      // Das `checked`-Objekt kommt aus der Seite — so laesst sich EIN Flow
      // gegen alle drei Faelle fahren, ohne drei Mocks zu pflegen.
      const chk = await page.evaluate(() => window.__chk).catch(() => undefined);
      const body = {
        transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
        quote: { in_raw: String(CAP), out_raw: '142592458608', min_out_raw: '141879496315',
                 price_impact_pct: 0, slippage_bps: 50 },
        cap:  { max_in_lamports: CAP, output_allowlist: [BONK] },
        fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
      };
      if(chk !== undefined && chk !== null) body.checked = chk;   // undefined = Feld fehlt ganz
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
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
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.881',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 881)))),
    banner.slice(0, 60));

  const run = async (chk) => {
    await page.evaluate((c) => { window.__chk = c; }, chk);
    return page.evaluate((mint) => new Promise((resolve) => {
      const host = document.createElement('div');
      host.innerHTML = '<button data-cr-swap="' + mint + '">g</button>'
                     + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
      document.body.appendChild(host); _crWireSwap(host, mint);
      host.querySelector('[data-cr-swap]').click();
      const p = host.querySelector('[data-cr-swap-panel]');
      const t0 = Date.now();
      (function poll(){
        if(/Bevor du signierst/.test(p.textContent) || Date.now() - t0 > 12000)
          return resolve({ text: p.textContent, html: p.innerHTML });
        setTimeout(poll, 120);
      })();
    }), BONK);
  };

  console.log('\n-- true: was geprueft WURDE --');
  let r = await run({ instructions_match_request: true });
  check('Angebot steht überhaupt', /Bevor du signierst/.test(r.text), r.text.slice(0, 90));
  /* Auf den BEJAHENDEN Marker festgenagelt, nicht auf die Teilzeichenkette:
   * der fehlend-Fall enthaelt „…ob die Instruktionen geprüft wurden" und wuerde
   * ein /Instruktionen geprüft/ klaglos bestehen. Der erste Wurf dieses Tests
   * tat genau das — eine Pruefung, die im falschen Fall gruen wird, ist keine. */
  check('sagt „Instruktionen geprüft"', r.html.indexOf('>Instruktionen geprüft<') !== -1);
  check('nennt die Grenze der Zusicherung (CPI)', /CPI/.test(r.text));
  check('die alte Lücken-Warnung ist WEG',
    !/prüft Beträge und Mints/.test(r.text), r.text.slice(0, 120));
  check('kein Wort von „konnte nicht laufen"', !/konnte nicht laufen/.test(r.text));
  const trueText = r.text;

  console.log('\n-- false MIT Grund: nicht gelaufen, nicht „passt nicht" --');
  const GRUND = 'Lookup Table 9xQeW… nicht abrufbar <b>rpc timeout</b>';
  r = await run({ instructions_match_request: false, reason: GRUND });
  check('sagt „konnte nicht laufen"', /konnte nicht laufen/.test(r.text), r.text.slice(0, 120));
  check('der Grund steht im Klartext da', r.text.indexOf('Lookup Table 9xQeW… nicht abrufbar') !== -1,
    r.text.slice(0, 160));
  check('behauptet NICHT, die Instruktionen passten nicht',
    !/passen nicht|stimmen nicht/.test(r.text) && r.html.indexOf('>Instruktionen geprüft<') === -1,
    r.text.slice(0, 160));
  /* Der Grund kommt vom Worker und landet in innerHTML. Escaped heisst: als
   * Text sichtbar, nicht als Markup wirksam. */
  check('der Grund ist escaped, nicht als Markup gerendert',
    r.html.indexOf('&lt;b&gt;rpc timeout&lt;/b&gt;') !== -1 && r.text.indexOf('<b>rpc timeout</b>') !== -1,
    r.html.slice(Math.max(0, r.html.indexOf('konnte nicht laufen')), r.html.indexOf('konnte nicht laufen') + 220));

  console.log('\n-- false OHNE Grund: die Leerstelle wird benannt --');
  r = await run({ instructions_match_request: false });
  check('sagt immer noch „konnte nicht laufen"', /konnte nicht laufen/.test(r.text));
  check('und sagt, dass der Grund fehlt', /nicht mitgeliefert/.test(r.text), r.text.slice(0, 160));
  const falseNoReason = r.text;

  console.log('\n-- Feld fehlt ganz: NICHT in den true-Zweig --');
  r = await run(undefined);
  check('sagt NICHT „Instruktionen geprüft"',
    r.html.indexOf('>Instruktionen geprüft<') === -1 && !/Lookup Tables aufgelöst/.test(r.text),
    r.text.slice(0, 160));
  check('sagt, dass die Antwort dazu nichts sagt',
    /sagt nicht, ob die Instruktionen geprüft wurden/.test(r.text), r.text.slice(0, 160));
  check('und ist nicht mit dem false-Text identisch', r.text !== falseNoReason);
  const missingText = r.text;

  console.log('\n-- Drei Faelle, drei Auskuenfte --');
  check('true, false und fehlend sagen drei verschiedene Dinge',
    new Set([trueText, falseNoReason, missingText]).size === 3);

  console.log('\n-- Ein Begriff, eine Implementierung --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('_crSwapPruefzeile ist genau EINMAL deklariert',
    (src.match(/function\s+_crSwapPruefzeile\s*\(/g) || []).length === 1,
    (src.match(/function\s+_crSwapPruefzeile\s*\(/g) || []).length);
  // `>` davor heisst: zwischen HTML-Tags, also Oberflaechentext. Der Kommentar
  // zitiert denselben Begriff und faellt damit raus — derselbe Griff wie in v880.
  check('die alte Lücken-Warnung steht nirgends mehr als Oberflächentext',
    (src.match(/>Der Worker prüft Beträge und Mints/g) || []).length === 0);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
