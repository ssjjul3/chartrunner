/* Smoke-Verifikation fuer v1.0.883 — das Guthaben wirklich lesen.
 *
 * Die Deckungspruefung aus v1.0.878 hat bisher nichts geschuetzt: in der Tafel
 * stand dauerhaft „nicht abrufbar", weil die oeffentliche RPC Browser-Anfragen
 * abweist. Ab v883 kommt die Zahl vom eigenen Worker.
 *
 * Die beiden ersten Faelle unten sind der ganze Kern, und sie sind das
 * Gegenteil voneinander:
 *
 *   Ausfall  → die Antwort traegt KEIN `lamports`. Daraus eine 0 zu machen
 *              hiesse „zu wenig SOL" bei jemandem, der genug hat.
 *   "0"      → ein LEERES KONTO. Das ist eine Auskunft, kein Ausfall, und
 *              muss zu „Das reicht nicht" fuehren.
 *
 * Wer die beiden verwechselt, merkt es an keiner Zeile Code — nur hier.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v883_guthaben_browser.cjs
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
const RENT = 2039280;

function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__signs = [];
  const w = { name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet'],
    get accounts(){ return [acct]; },
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
  checked: { instructions_match_request: true, level: 'form+amount' },
});

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  const balCalls = [];
  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    if(/\/v1\/rpc\/balance/.test(req.url())){
      balCalls.push({ url: req.url(), method: req.method() });
      const resp = await page.evaluate(() => window.__bal).catch(() => null);
      return route.fulfill({ status: (resp && resp.__status) || 200,
        contentType: 'application/json', body: JSON.stringify((resp && resp.body) || {}) });
    }
    if(/\/v1\/tx\/swap/.test(req.url()))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quote()) });
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
  check('Banner meldet mindestens v1.0.883',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 883)))),
    banner.slice(0, 60));

  /* Der Cache muss zwischen den Faellen weg — sonst zeigt ueberall der erste
   * Stand. Genau daran sind in check_v878 zuerst sechs Zeilen rot geworden. */
  const fetchBal = async (body, status) => {
    await page.evaluate(([b, st]) => {
      window.__bal = { body: b, __status: st };
      for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
    }, [body, status || 200]);
    return page.evaluate((a) => _crFetchSolBalance(a, 0), ADDR);
  };

  console.log('\n-- Der Kern: Ausfall ist KEINE Null --');
  let r = await fetchBal({ ok: false, error: 'rpc-unavailable' }, 502);
  check('502 ohne lamports → null', r === null, r);
  check('und ausdruecklich NICHT 0',
    !(r && typeof r === 'object' && r.lamports === 0), r);

  console.log('\n-- Der Gegenpol: ein leeres Konto ist eine Auskunft --');
  r = await fetchBal({ ok: true, lamports: '0', cluster: 'mainnet' });
  check('lamports "0" → 0, nicht null', r !== null && r.lamports === 0, r);
  /* Der Unterschied wird erst hier sichtbar: die Tafel muss ablehnen, nicht
   * achselzucken. `!"0"` ist false, `!0` ist true — wer wandelt und dann auf
   * Wahrheit prueft, macht aus dem leeren Konto einen Ausfall. */
  const leer = await page.evaluate((e) => _crSwapDeckung(0, e), CAP);
  check('und die Tafel sagt „Das reicht nicht"',
    leer.ok === false && /Das reicht nicht/.test(leer.html), leer.html.slice(0, 120));
  /* Dieselbe Frage noch einmal, mit einer ECHTEN Null statt der Zeichenkette.
   *
   * Der Auftrag nennt als Gegenprobe „`== null` → `!j.lamports`". Wörtlich
   * angewandt bleibt die gruen: `lamports` kommt als String, und `!"0"` ist
   * false — die Mutation greift gar nicht. Gefaehrlich wird Wahrheitspruefung
   * erst NACH der Umwandlung (`!lam`), oder wenn der Worker die Null je als
   * Zahl schickt. Beide Wege fangen erst diese Zeile und die naechste ab; ohne
   * sie pruefte die Zusicherung, dass heute zufaellig ein String kommt. */
  r = await fetchBal({ ok: true, lamports: 0, cluster: 'mainnet' });
  check('auch eine echte 0 ist eine Auskunft, kein Ausfall',
    r !== null && r.lamports === 0, r);

  console.log('\n-- Die Form der Antwort --');
  r = await fetchBal({ ok: true, lamports: '52039280', cluster: 'mainnet' });
  check('String wird zur Zahl', r !== null && r.lamports === 52039280 && typeof r.lamports === 'number', r);
  r = await fetchBal({ ok: false, lamports: '99999999', cluster: 'mainnet' }, 200);
  check('ok:false gewinnt gegen gesetztes lamports', r === null, r);
  r = await fetchBal({ ok: true, lamports: 'keine-zahl', cluster: 'mainnet' });
  check('unlesbares lamports → null, kein NaN', r === null, r);
  r = await fetchBal({ ok: true, cluster: 'mainnet' });
  check('ok:true ohne lamports → null', r === null, r);

  console.log('\n-- Wohin die Abfrage geht --');
  check('an /v1/rpc/balance, nicht an eine oeffentliche RPC',
    balCalls.length > 0 && balCalls.every(c => /\/v1\/rpc\/balance/.test(c.url)), balCalls.length);
  check('keine Anfrage an api.mainnet-beta.solana.com',
    balCalls.every(c => !/api\.mainnet-beta\.solana\.com/.test(c.url)));
  check('cluster=mainnet steht in der URL',
    balCalls.every(c => /[?&]cluster=mainnet(&|$)/.test(c.url)), balCalls[0] && balCalls[0].url);
  check('die Adresse steht in der URL',
    balCalls.every(c => c.url.indexOf('address=' + ADDR) !== -1), balCalls[0] && balCalls[0].url);
  check('es ist ein GET', balCalls.every(c => c.method === 'GET'), balCalls[0] && balCalls[0].method);

  console.log('\n-- In der Tafel: eine Zahl, und der Knopf entscheidet sich --');
  const build = () => page.evaluate((mint) => {
    const host = document.createElement('div');
    host.innerHTML = '<button data-cr-swap="' + mint + '">g</button>'
                   + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
    document.body.appendChild(host); _crWireSwap(host, mint); window.__host = host; return true;
  }, BONK);
  const run = async (body, status) => {
    await page.evaluate(([b, st]) => {
      window.__bal = { body: b, __status: st };
      for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
    }, [body, status || 200]);
    await build();
    await page.evaluate(() => window.__host.querySelector('[data-cr-swap]').click());
    const t0 = Date.now();
    for(;;){
      const st = await page.evaluate(() => {
        const p = window.__host.querySelector('[data-cr-swap-panel]');
        return { text: p.textContent || '', html: p.innerHTML,
                 hasGo: !!p.querySelector('[data-cr-swap-go]') };
      });
      if(/Bevor du signierst|Das reicht nicht/.test(st.text) || Date.now() - t0 > 12000) return st;
      await page.waitForTimeout(120);
    }
  };

  // Genug: Einsatz + Miete + Puffer.
  /* Die Antwort traegt `sol` mit — vorformatiert, deutsch. Der Client hat
   * _crFmtSol und benutzt es; das Feld bleibt liegen. Sonst stuenden zwei
   * Schreibweisen derselben Zahl in derselben Tafel. */
  let st = await run({ ok: true, lamports: String(CAP + RENT + 20000000),
                       sol: 'SOL-AUS-DEM-WORKER', cluster: 'mainnet' });
  check('mit Deckung steht eine Zahl statt „nicht abrufbar"',
    !/nicht abrufbar/.test(st.text), st.text.slice(0, 200));
  check('und der Signieren-Knopf ist da', st.hasGo === true);
  /* Der Client formatiert selbst. Das Feld `sol` der Antwort ist bewusst
   * unbenutzt — sonst stuenden zwei Schreibweisen in derselben Tafel. */
  /* v1.0.885 — der Client formatiert seit v885 ebenfalls deutsch, damit in der
   * Tafel ein Format gilt. Die Unterscheidung „wer hat formatiert" laesst sich
   * also nicht mehr am Trennzeichen festmachen — sie haette nur noch an einer
   * Nachkommastelle gehangen, und das ist kein Test, das ist ein Zufall.
   * Der Mock schickt deshalb eine Zeichenkette, die der Client unmoeglich
   * selbst erzeugt haben kann. */
  check('die Zahl steht in _crFmtSol-Schreibweise (0,0720 SOL)',
    st.text.indexOf('0,0720 SOL') !== -1, st.text.slice(0, 240));
  check('und das `sol`-Feld des Workers wird nirgends durchgereicht',
    st.text.indexOf('SOL-AUS-DEM-WORKER') === -1, st.text.slice(0, 240));

  // DER eigentliche Beweis: zu wenig SOL → kein Knopf.
  st = await run({ ok: true, lamports: '16108190', cluster: 'mainnet' });
  check('mit zu wenig SOL sagt die Tafel „Das reicht nicht"',
    /Das reicht nicht/.test(st.text), st.text.slice(0, 200));
  check('und der Signieren-Knopf ist WEG', st.hasGo === false);
  check('nichts signiert', await page.evaluate(() => window.__signs.length) === 0);

  // Ausfall: ehrlich degradieren, aber nicht blockieren (Zweig seit v878).
  st = await run({ ok: false, error: 'rpc-unavailable' }, 502);
  check('im Ausfall steht „nicht abrufbar"', /nicht abrufbar/.test(st.text), st.text.slice(0, 200));
  check('und der Ausfall blockiert NICHT', st.hasGo === true);

  console.log('\n-- Ein Begriff, eine Implementierung --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('_crFetchSolBalance ist genau EINMAL deklariert',
    (src.match(/function\s+_crFetchSolBalance\s*\(/g) || []).length === 1);
  /* Gemessen wird der GUTHABEN-PFAD, nicht die ganze Datei. Der erste Wurf
   * dieser beiden Zeilen suchte global — und fand den eigenen Banner-Text, eine
   * Panel-Notiz und den phxStatus-Terminal, der zu Recht seine eigene RPC
   * ruft. Ein Test, der fremde Features und die eigene Prosa mitzaehlt, misst
   * die Dokumentation statt den Code; derselbe Fehler wie beim v877- und beim
   * v880-Check. Der Funktionsrumpf ist die Aussage, die hier gilt. */
  const rumpf = (function(){
    const i = src.indexOf('function _crFetchSolBalance');
    return i === -1 ? '' : src.slice(i, src.indexOf('\n}', i));
  })();
  check('der Rumpf wurde gefunden', rumpf.length > 0);
  check('der Guthaben-Pfad ruft keine oeffentliche RPC mehr',
    rumpf.indexOf('api.mainnet-beta.solana.com') === -1);
  /* _CR_WAL_RPC war der alte Weg. Eine Fassung, die keiner mehr ruft, ist die
   * naechste, die jemand wieder ruft — sie ist deshalb ganz raus, nicht nur
   * unbenutzt. */
  check('der alte _CR_WAL_RPC ist ganz weg, nicht nur unbenutzt',
    src.indexOf('_CR_WAL_RPC') === -1);
  check('das vorformatierte Feld `sol` der Antwort wird nicht gelesen',
    (rumpf.match(/\bj\.sol\b/g) || []).length === 0);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
