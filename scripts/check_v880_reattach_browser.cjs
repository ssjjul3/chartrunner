/* Smoke-Verifikation fuer v1.0.880 — Wiederanknuepfen an eine verbundene Wallet.
 *
 * Live gefunden: in der Topbar stand die Wallet als verbunden, und beide
 * Handels-Schaltflaechen antworteten „Erst eine Wallet verbinden — Topbar →
 * Connect". Der Spieler sieht oben seinen Namen und unten die Aufforderung,
 * sich zu verbinden.
 *
 * Ursache: crWallet merkt sich die Adresse in localStorage, crSigner nicht.
 * Nach einem Seitenaufruf sind das zwei Meinungen ueber dieselbe Frage.
 *
 * Der entscheidende Test unten ist NICHT, dass es irgendwie funktioniert,
 * sondern dass es OHNE connect() funktioniert: eine Wallet, die diese Seite
 * schon autorisiert hat, legt ihre Konten von sich aus offen. Wer hier ein
 * Popup ausloest, hat es falsch geloest — deshalb wird connect() gezaehlt.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v880_reattach_browser.cjs
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

/* Die Wallet legt ihre Konten von SELBST offen — so verhaelt sich eine
 * Wallet Standard-Wallet, die diese Seite schon autorisiert hat. connect()
 * existiert, wird aber gezaehlt: es darf in diesem Fall NICHT gerufen werden. */
function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__connects = 0;
  window.__signs = [];
  window.__hideAccounts = false;          // simuliert eine nicht-autorisierte Wallet
  const w = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet'],
    get accounts(){ return window.__hideAccounts ? [] : [acct]; },
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => {
        window.__connects++;
        if(window.__connectMode === 'reject') throw new Error('User rejected the request.');
        window.__hideAccounts = false;
        return { accounts: [acct] };
      } },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (i) => { window.__signs.push({ chain: i.chain });
          const s = new Uint8Array(64); s[0] = 5; return [{ signature: s }]; } },
    },
  };
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

  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    // v1.0.883 — Guthaben kommt per GET vom eigenen Worker, nicht mehr per
    // JSON-RPC-POST. `lamports` ist ein String, wie in der echten Antwort.
    if(/\/v1\/rpc\/balance/.test(req.url())) return route.fulfill({ status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, lamports: '200000000', cluster: 'mainnet' }) });
    if(/\/v1\/tx\/swap/.test(req.url())){
      let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch(_){}
      if(Number(body.amount_raw) > CAP) return route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ ok:false, error:'over-cap', given:String(body.amount_raw), cap:{ max_in_lamports:CAP } }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quote()) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // DAS ist der Ausgangszustand des Fehlers: crWallet kennt die Adresse aus
  // einem frueheren Besuch, crSigner weiss von nichts.
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
  check('Banner meldet mindestens v1.0.880',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 880)))),
    banner.slice(0, 60));
  check('crWallet kennt die Adresse', await page.evaluate(() => crWallet.get()) === ADDR);
  check('crSigner hat NICHT verbunden', await page.evaluate(() => window.__connects) === 0);

  console.log('\n-- Anknuepfen, ohne zu fragen --');
  const a = await page.evaluate(() => crSigner.active());
  check('active() findet das Konto', !!(a && a.address), a);
  check('und zwar das richtige', a && a.address === ADDR, a && a.address);
  check('OHNE connect() — kein Popup', await page.evaluate(() => window.__connects) === 0);
  check('mit den Netzen des Kontos',
    !!(a && a.accountChains && a.accountChains.indexOf('solana:mainnet') !== -1), a && a.accountChains);
  check('chainReady sagt mainnet ok',
    await page.evaluate(() => crSigner.chainReady('solana:mainnet').ok === true));

  const build = () => page.evaluate((mint) => {
    const host = document.createElement('div');
    host.innerHTML = '<button data-cr-swap="' + mint + '">g</button>'
                   + '<button data-cr-cap-probe="' + mint + '">p</button>'
                   + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
    document.body.appendChild(host); _crWireSwap(host, mint); window.__host = host; return true;
  }, BONK);
  const tap   = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap]').click());
  const probe = () => page.evaluate(() => window.__host.querySelector('[data-cr-cap-probe]').click());
  const panel = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap-panel]').textContent);
  const settle = async (re, ms = 12000) => { const t0 = Date.now();
    for(;;){ const t = await panel(); if(re.test(t)) return t;
      if(Date.now() - t0 > ms) return t; await page.waitForTimeout(150); } };

  console.log('\n-- Der gemeldete Fehler --');
  await build(); await tap();
  let t = await settle(/Bevor du signierst|Wallet verbinden/);
  check('HANDELN läuft, statt „Wallet verbinden" zu sagen',
    /Bevor du signierst/.test(t) && !/Erst eine Wallet verbinden/.test(t), t.slice(0, 130));
  await build(); await probe();
  t = await settle(/Deckel hält|Wallet verbinden/);
  check('DECKEL PRÜFEN läuft ebenfalls',
    /Deckel hält/.test(t) && !/Erst eine Wallet verbinden/.test(t), t.slice(0, 130));
  check('immer noch kein Popup', await page.evaluate(() => window.__connects) === 0);

  /* Zweiter Fall: die Wallet legt ihre Konten NICHT offen. Dann ist ein
   * ausdrueckliches Verbinden richtig — aber es muss passieren, nicht in einer
   * Sackgasse enden. */
  console.log('\n-- Konten nicht offengelegt: ausdruecklich verbinden --');
  await page.evaluate(() => { window.__hideAccounts = true; crSigner.disconnect();
    localStorage.setItem('cr_wallet', 'CRtestWa11etAddre55111111111111111111111111'); });
  check('active() ist jetzt leer', await page.evaluate(() => crSigner.active()) === null);
  await build(); await tap();
  t = await settle(/Bevor du signierst|verbinden/);
  check('es wird verbunden statt abgewiesen',
    await page.evaluate(() => window.__connects) === 1, await page.evaluate(() => window.__connects));
  check('und der Handel läuft danach', /Bevor du signierst/.test(t), t.slice(0, 130));

  console.log('\n-- Abbruch beim Wiederverbinden --');
  await page.evaluate(() => { window.__hideAccounts = true; window.__connectMode = 'reject';
    crSigner.disconnect(); localStorage.setItem('cr_wallet', 'CRtestWa11etAddre55111111111111111111111111'); });
  await build(); await tap();
  t = await settle(/Abgebrochen|Bevor du signierst/);
  check('Abbruch ist kein technischer Fehler', /Abgebrochen/.test(t), t.slice(0, 130));
  check('nichts signiert', await page.evaluate(() => window.__signs.length) === 0);
  await page.evaluate(() => { window.__connectMode = null; });

  /* Dritter Fall: gar keine Adresse bekannt. DANN stimmt die Aufforderung. */
  console.log('\n-- Wirklich nichts verbunden --');
  await page.evaluate(() => { window.__hideAccounts = true; crSigner.disconnect();
    localStorage.removeItem('cr_wallet'); });
  const before = await page.evaluate(() => window.__connects);
  await build(); await tap(); await page.waitForTimeout(400);
  t = await panel();
  check('jetzt ist „Erst eine Wallet verbinden" richtig', /Erst eine Wallet verbinden/.test(t), t.slice(0, 110));
  check('und es wird nicht ungefragt verbunden',
    await page.evaluate(() => window.__connects) === before);

  console.log('\n-- Ein Weg, nicht zwei --');
  /* Gezaehlt wird der VOLLE Satz, wie er in der Oberflaeche steht. Der erste
   * Wurf suchte nach „Erst eine Wallet verbinden" und fand fuenf Treffer:
   * Banner, zwei Kommentare, und eine ANDERE Meldung aus dem Wallet-Picker
   * („…, die signieren kann"). Ein Test, der Prosa mitzaehlt, misst die
   * Dokumentation statt den Code — derselbe Fehler wie beim v877-Check. */
  const src = fs.readFileSync(FILE, 'utf8');
  // `>` davor heisst: zwischen HTML-Tags, also wirklich Oberflaeche. Der
  // Kommentar zitiert denselben Satz in Anfuehrungszeichen und faellt raus.
  const satz = />Erst eine Wallet verbinden — Topbar → Connect\./g;
  check('die Aufforderung steht genau EINMAL als Oberflaechentext',
    (src.match(satz) || []).length === 1,
    (src.match(satz) || []).length);
  check('die Netz-Warnung steht genau EINMAL in der Datei',
    (src.match(/Ein echter Handel braucht/g) || []).length === 1,
    (src.match(/Ein echter Handel braucht/g) || []).length);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
