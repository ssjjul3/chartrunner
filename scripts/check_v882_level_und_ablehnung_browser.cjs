/* Smoke-Verifikation fuer v1.0.882 — Pruefgrad, `note` statt `reason`,
 * und die Ablehnung als eigener Zweig.
 *
 * Drei Behauptungen werden hier festgehalten, und alle drei sind Korrekturen
 * an v1.0.881:
 *
 *  - LEVEL. v881 sicherte immer auch Betraege zu. Bei level "form" hat der
 *    Worker die Betraege NICHT gelesen. Eine Zeile, die sie trotzdem nennt,
 *    behauptet einen Vergleich, den niemand angestellt hat — an der Stelle,
 *    an der der Spieler unterschreibt.
 *
 *  - NOTE, NICHT REASON. reason ist ein Maschinen-Token. v881 zeigte es an,
 *    ein Spieler haette woertlich „alt-unresolved" gelesen. Unten wird
 *    ausdruecklich geprueft, dass das Token NICHT in der Oberflaeche steht.
 *
 *  - DER FUND. `tx-`-Codes sind kein Fehler, sondern das Greifen der Pruefung.
 *    Erkannt per startsWith, nicht includes. Der Unterschied laesst sich mit
 *    over-cap NICHT zeigen — der String traegt gar kein „tx-", die Mutation
 *    bliebe gruen. Es braucht einen Code, der es in der MITTE traegt
 *    (jupiter-tx-timeout weiter unten). Sonst pruefte die Zusicherung den
 *    heutigen Zufall statt das Verhalten.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v882_level_und_ablehnung_browser.cjs
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
    // v1.0.883 — Guthaben kommt per GET vom eigenen Worker, nicht mehr per
    // JSON-RPC-POST. `lamports` ist ein String, wie in der echten Antwort.
    if(/\/v1\/rpc\/balance/.test(req.url())) return route.fulfill({ status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, lamports: '200000000', cluster: 'mainnet' }) });
    if(/\/v1\/tx\/swap/.test(req.url())){
      const st = await page.evaluate(() => ({ chk: window.__chk, err: window.__err }))
        .catch(() => ({}));
      if(st && st.err) return route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify(st.err) });
      const body = {
        transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
        quote: { in_raw: String(CAP), out_raw: '142592458608', min_out_raw: '141879496315',
                 price_impact_pct: 0, slippage_bps: 50 },
        cap:  { max_in_lamports: CAP, output_allowlist: [BONK] },
        fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
      };
      if(st && st.chk !== undefined && st.chk !== null) body.checked = st.chk;
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
  check('Banner meldet mindestens v1.0.882',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 882)))),
    banner.slice(0, 60));

  /* Ein Ablauf fuer alle Faelle: `chk` steuert die Antwort, `err` erzwingt eine
   * Ablehnung. hasGo faellt mit ab — „kein Signieren-Knopf" ist eine Aussage
   * ueber das DOM, nicht ueber den Text. */
  const run = async (chk, err) => {
    await page.evaluate(([c, e]) => { window.__chk = c; window.__err = e; }, [chk, err]);
    return page.evaluate((mint) => new Promise((resolve) => {
      const host = document.createElement('div');
      host.innerHTML = '<button data-cr-swap="' + mint + '">g</button>'
                     + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
      document.body.appendChild(host); _crWireSwap(host, mint);
      host.querySelector('[data-cr-swap]').click();
      const p = host.querySelector('[data-cr-swap-panel]');
      const t0 = Date.now();
      (function poll(){
        const t = p.textContent || '';
        if((t && !/Angebot wird geholt/.test(t)) || Date.now() - t0 > 12000)
          return resolve({ text: t, html: p.innerHTML,
                           hasGo: !!p.querySelector('[data-cr-swap-go]') });
        setTimeout(poll, 120);
      })();
    }), BONK);
  };

  console.log('\n-- level "form+amount": der Normalfall nennt die Betraege --');
  let r = await run({ instructions_match_request: true, level: 'form+amount' });
  check('Angebot steht', /Bevor du signierst/.test(r.text), r.text.slice(0, 90));
  check('sagt „Geprüft"', r.html.indexOf('>Geprüft<') !== -1);
  check('nennt die Beträge als geprüft', /<b>Beträge<\/b> und Programme/.test(r.html), r.text.slice(-260));
  check('CPI-Vorbehalt steht dabei', /CPI/.test(r.text));
  check('nicht „Teilweise geprüft"', r.html.indexOf('>Teilweise geprüft<') === -1);
  const voll = r.text;

  console.log('\n-- level "form": Betraege ausdruecklich AUSGENOMMEN --');
  r = await run({ instructions_match_request: true, level: 'form' });
  check('sagt „Teilweise geprüft"', r.html.indexOf('>Teilweise geprüft<') !== -1, r.text.slice(-260));
  check('nimmt die Beträge ausdrücklich aus', /die <b>Beträge nicht<\/b>/.test(r.html), r.text.slice(-260));
  /* Die Nuance, die den Fall erst brauchbar macht: nach oben begrenzt,
   * nach unten offen. Beide Haelften werden einzeln festgehalten. */
  check('sagt trotzdem, dass der EINSATZ gedeckelt ist',
    /Einsatz ist trotzdem gedeckelt/.test(r.text), r.text.slice(-260));
  check('und dass die Mindestausgabe NICHT geprüft ist',
    /mindestens zurückbekommst, ist hier/.test(r.text), r.text.slice(-260));
  check('CPI-Vorbehalt steht auch hier', /CPI/.test(r.text));
  check('behauptet NICHT den vollen Umfang', r.html.indexOf('<b>Beträge</b> und Programme') === -1);
  check('und ist nicht derselbe Text wie form+amount', r.text !== voll);

  console.log('\n-- unbekannter Grad: in keinen der beiden Zweige --');
  r = await run({ instructions_match_request: true, level: 'form+amount+irgendwas' });
  check('sagt weder „Geprüft" noch „Teilweise geprüft" als Zusicherung',
    r.html.indexOf('>Geprüft<') === -1 && r.html.indexOf('>Teilweise geprüft<') === -1, r.text.slice(-240));
  check('sagt, dass der Umfang nicht in der Antwort steht',
    /Umfang steht nicht in der Antwort/.test(r.text), r.text.slice(-240));
  check('behauptet keine geprüften Beträge',
    r.html.indexOf('<b>Beträge</b> und Programme') === -1);

  console.log('\n-- false: `note` steht da, `reason` NICHT --');
  const NOTE = 'Lookup Table 7xKX…gAsU nicht abrufbar <b>rpc</b> — Instruktionen nicht auflösbar.';
  r = await run({ instructions_match_request: false, level: null, reason: 'alt-unresolved', note: NOTE });
  check('sagt „konnte nicht laufen"', /konnte nicht laufen/.test(r.text), r.text.slice(-240));
  check('die note steht im Klartext da',
    r.text.indexOf('Lookup Table 7xKX…gAsU nicht abrufbar') !== -1, r.text.slice(-240));
  check('das Maschinen-Token steht NIRGENDS in der Oberfläche',
    r.text.indexOf('alt-unresolved') === -1, r.text.slice(-240));
  check('kein level-Text, keine Beträge-Behauptung',
    r.html.indexOf('>Geprüft<') === -1 && r.html.indexOf('>Teilweise geprüft<') === -1
      && !/Umfang steht nicht in der Antwort/.test(r.text), r.text.slice(-240));
  check('die note ist escaped, nicht als Markup gerendert',
    r.html.indexOf('&lt;b&gt;rpc&lt;/b&gt;') !== -1 && r.text.indexOf('<b>rpc</b>') !== -1);
  check('bei alt-unresolved der Hinweis, dass es vorübergehend ist',
    /vorübergehend/.test(r.text));

  console.log('\n-- false ohne note: die Leerstelle wird benannt --');
  r = await run({ instructions_match_request: false, level: null, reason: 'verify-error' });
  check('sagt, dass der Grund fehlt', /nicht mitgeliefert/.test(r.text), r.text.slice(-200));
  check('und erfindet keinen Vorübergehend-Hinweis', !/vorübergehend/.test(r.text));

  console.log('\n-- Feld fehlt ganz (v881-Regression) --');
  r = await run(undefined);
  check('faellt weiterhin nicht in den geprüft-Zweig',
    r.html.indexOf('>Geprüft<') === -1 && /sagt nicht, ob die Instruktionen geprüft wurden/.test(r.text),
    r.text.slice(-200));

  console.log('\n-- tx-Praefix: geprueft und abgelehnt ist ein FUND --');
  const FNOTE = 'Instruktion 3 ist ein <b>Approve</b> an ein fremdes Konto.';
  r = await run(undefined, { ok: false, error: 'tx-approve', note: FNOTE, given: 'idx <3>',
    programs: ['ComputeBudget', 'Token<2022>'], instructions: ['Approve', 'Transfer<x>'] });
  check('eigener Zweig statt „Kein Angebot"',
    /Abgelehnt — und das ist gut so/.test(r.text) && !/Kein Angebot/.test(r.text), r.text.slice(0, 200));
  check('die note ist sichtbar', r.text.indexOf('Instruktion 3 ist ein') !== -1, r.text.slice(0, 200));
  check('sagt, dass nichts zum Signieren angeboten wurde',
    /nicht<\/b> zum Signieren angeboten/.test(r.html));
  check('KEIN Signieren-Knopf im DOM', r.hasGo === false);
  check('nichts signiert', await page.evaluate(() => window.__signs.length) === 0);
  check('der beanstandete Wert steht da', /Beanstandet/.test(r.text) && r.text.indexOf('idx <3>') !== -1);
  check('die gesehenen Programme stehen da', r.text.indexOf('Token<2022>') !== -1, r.text.slice(0, 240));
  check('die gesehenen Instruktionen stehen da', r.text.indexOf('Transfer<x>') !== -1);
  /* Alle drei Worker-Felder landen in innerHTML — alle drei einzeln geprueft. */
  check('note escaped',         r.html.indexOf('&lt;b&gt;Approve&lt;/b&gt;') !== -1);
  check('programs escaped',     r.html.indexOf('Token&lt;2022&gt;') !== -1);
  check('instructions escaped', r.html.indexOf('Transfer&lt;x&gt;') !== -1);
  check('given escaped',        r.html.indexOf('idx &lt;3&gt;') !== -1);

  console.log('\n-- over-cap ist KEIN Fund --');
  r = await run(undefined, { ok: false, error: 'over-cap', given: '60000000',
    cap: { max_in_lamports: CAP } });
  check('landet nicht im Fund-Zweig', !/Abgelehnt — und das ist gut so/.test(r.text), r.text.slice(0, 160));
  check('sondern bei der Deckel-Meldung', /Der Deckel hat gehalten/.test(r.text), r.text.slice(0, 160));

  /* Die Zusicherung ist startsWith, nicht includes — und over-cap kann das
   * nicht zeigen: der String traegt gar kein „tx-". Ohne einen Code, der es in
   * der MITTE traegt, waere die Praefix-Regel ununterscheidbar von includes und
   * die Gegenprobe dazu bliebe gruen. Genau das prueft dieser Fall. */
  console.log('\n-- „tx-" in der Mitte ist KEIN Fund --');
  r = await run(undefined, { ok: false, error: 'jupiter-tx-timeout', note: 'Jupiter antwortet nicht.' });
  check('landet nicht im Fund-Zweig', !/Abgelehnt — und das ist gut so/.test(r.text), r.text.slice(0, 160));
  check('sondern im Auffangzweig', /Kein Angebot/.test(r.text), r.text.slice(0, 160));

  console.log('\n-- Ein Begriff, eine Implementierung --');
  const src = fs.readFileSync(FILE, 'utf8');
  for(const fn of ['_crSwapPruefzeile', '_crSwapPruefLevel', '_crSwapIstFund', '_crSwapFundHtml']){
    const n = (src.match(new RegExp('function\\s+' + fn + '\\s*\\(', 'g')) || []).length;
    check(fn + ' ist genau einmal deklariert', n === 1, n);
  }
  /* Die Codeliste gehoert in /health, nicht als zweite Kopie hierher. Der
   * Praefix-Test ist der ganze Vertrag; eine Aufzaehlung waere die naechste
   * Fassung, die wegdriftet. */
  check('keine duplizierte reject_codes-Liste im Client',
    (src.match(/'tx-[a-z-]+'/g) || []).length === 0,
    (src.match(/'tx-[a-z-]+'/g) || []).slice(0, 5));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
