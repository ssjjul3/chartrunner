/* Smoke-Verifikation fuer v1.0.887 — Simulation sagt, dass sie Simulation ist.
 *
 * Handoff G1, Quelltext-Messung am Stand b6c15a3: sdk.bracket/ladder/oco
 * schreiben nur in openOrders — kein Netz, keine Wallet, kein prepareSwap.
 * Einen Keeper gibt es nicht; ein Stop aus diesen Primitives loest nie aus.
 * Am Ort der Nutzung stand davon nichts, das Primitives-Menue sagte sogar
 * "live bracket".
 *
 * Die scharfen Zeilen hier suchen MARKUP, nicht Prosa: die Klasse
 * .crNotifyMsg.sim und das Attribut data-cr-sim. Eine fruehere Testzeile in
 * diesem Projekt suchte einen Satz und fand ihn fuenfmal — im Banner, in
 * Kommentaren und in einer anderen Meldung.
 *
 * Dazu: die Handelsgebuehr steht als eigene Zeile in der Tafel "Bevor du
 * signierst" — der Wert kommt aus der Antwort (route.platform_fee_bps),
 * fehlt das Feld, faellt die Zeile weg. Und das doppelte Prozentzeichen der
 * deutschen Handelbarkeits-Zeile ist weg: die Einheit gehoert dem
 * Formatierer, nicht dem Template.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v887_sim_und_gebuehr_browser.cjs
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

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    if(/\/v1\/rpc\/balance/.test(req.url())) return route.fulfill({ status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, lamports: '900000000', cluster: 'mainnet' }) });
    if(/\/v1\/tx\/swap/.test(req.url())){
      const st = await page.evaluate(() => window.__q).catch(() => null);
      const body = {
        transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
        quote: Object.assign({ in_raw: String(CAP), out_raw: '142371209424',
                               min_out_raw: '141659353377', slippage_bps: 50,
                               price_impact_pct: '0.0004' }, (st && st.quote) || {}),
        cap:  { max_in_lamports: CAP, output_allowlist: [BONK] },
        fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
        checked: { instructions_match_request: true, level: 'form+amount' },
      };
      /* route wird NUR mitgeschickt, wenn der Testfall sie setzt — der
       * Ohne-route-Fall ist die scharfe Zeile: nichts erfinden. */
      if(st && st.route) body.route = st.route;
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(body) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(([addr]) => {
    try { localStorage.setItem('cr_wallet', addr); } catch(_){}
    try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){}
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
  check('Banner meldet mindestens v1.0.887',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 887)))),
    banner.slice(0, 60));

  console.log('\n-- G1: jede Order-Primitive meldet SIM, als Markup --');
  /* Je Ability eine Zeile (Handoff G1): feuern und im DOM nach der KLASSE
   * suchen, nicht nach einem Satz. Der Horchpunkt sitzt an der Order-Grenze
   * (sdk 'order'-Event) — deshalb reicht das SDK, kein UI-Gefummel noetig. */
  const fireAndFind = (js, kind) => page.evaluate(([code, k]) => {
    const before = document.querySelectorAll('.crNotifyMsg.sim').length;
    (0, eval)(code);
    const lines = Array.from(document.querySelectorAll('.crNotifyMsg.sim'));
    const mine = lines.slice(before).map(el => el.textContent || '');
    return { grew: lines.length > before, texts: mine, hit: mine.some(t => t.indexOf(k) !== -1) };
  }, [js, kind]);

  let r = await fireAndFind("sdk.bracket({ side:'buy', price: 100 })", 'bracket');
  check('bracket → eine .crNotifyMsg.sim-Zeile', r.grew, r.texts);
  check('… und sie benennt bracket', r.hit, r.texts);
  r = await fireAndFind("sdk.oco({ price: 100 })", 'oco');
  check('oco → eine .crNotifyMsg.sim-Zeile', r.grew, r.texts);
  check('… und sie benennt oco', r.hit, r.texts);
  r = await fireAndFind("sdk.ladder({ side:'buy', price: 100 })", 'ladder');
  check('ladder → eine .crNotifyMsg.sim-Zeile', r.grew, r.texts);
  check('… und sie benennt ladder', r.hit, r.texts);
  /* Der Horchpunkt haengt am Event, nicht an drei Funktionsnamen — ein
   * viertes Primitive ist automatisch mitgekennzeichnet. Eine Stichprobe: */
  r = await fireAndFind("sdk.market({ side:'buy', size: 1, price: 100 })", 'market');
  check('auch market (Stichprobe: der Horchpunkt gilt fuer ALLE Primitives)', r.grew && r.hit, r.texts);

  check('die P&L-Pill traegt data-cr-sim',
    await page.evaluate(() => !!document.querySelector('#pnlPill[data-cr-sim]')));

  console.log('\n-- Die Tafel: Handelsgebuehr aus der ANTWORT --');
  const run = async (q, rt) => {
    await page.evaluate(([qq, rr]) => {
      window.__q = { quote: qq || {}, route: rr || null };
      for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
    }, [q, rt]);
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
          return resolve({ text: t, html: p.innerHTML });
        setTimeout(poll, 120);
      })();
    }), BONK);
  };

  let t = await run({}, { platform_fee_bps: 50 });
  check('Angebot steht', /Bevor du signierst/.test(t.text), t.text.slice(0, 80));
  check('die Gebuehren-Zeile steht da', t.text.indexOf('Handelsgebühr') !== -1, t.text.slice(0, 300));
  check('… mit dem Wert aus der Antwort (50 bps)',
    t.text.indexOf('50 bps an ChartRunner') !== -1, t.text.slice(0, 300));
  check('… und dem Satz, dass sie im Einsatz steckt',
    t.text.indexOf('steckt im Einsatz') !== -1, t.text.slice(0, 400));

  /* Die scharfe Zeile: FEHLT das Feld, wird keine Zahl erfunden — die Zeile
   * faellt weg. Eine Konstante im Client wuerde diesen Fall gruen halten und
   * genau damit auffliegen. */
  t = await run({}, null);
  check('ohne route.platform_fee_bps steht KEINE Gebuehren-Zeile',
    t.text.indexOf('Handelsgebühr') === -1, t.text.slice(0, 300));
  /* Ein Wert von 0 bps waere eine AUSKUNFT, kein Fehlen (dieselbe
   * Unterscheidung wie lamports "0" in v883). */
  t = await run({}, { platform_fee_bps: 0 });
  check('0 bps ist eine Auskunft und steht da',
    t.text.indexOf('Handelsgebühr') !== -1 && t.text.indexOf('0 bps an ChartRunner') !== -1,
    t.text.slice(0, 300));

  console.log('\n-- Das doppelte Prozentzeichen --');
  /* Sprache steht per initScript auf de — der Template-Text kommt also aus
   * dem DICT, nicht aus dem englischen Default. */
  const imp = await page.evaluate(() =>
    _tokT('tok.tradeImpact', '{p} Preisauswirkung bei 1 SOL',
      { p: _crFmtImpact(_crImpactPct('0.00005')) }));
  check('deutsche Handelbarkeits-Zeile traegt genau EIN %',
    (imp.match(/%/g) || []).length === 1, imp);
  check('… und kein %%', imp.indexOf('%%') === -1 && !/%\s*%/.test(imp), imp);

  console.log('\n-- Ein Begriff, eine Implementierung --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('der SIM-Horchpunkt existiert genau einmal',
    (src.match(/'SIM · '/g) || []).length === 1, (src.match(/'SIM · '/g) || []).length);
  check('data-cr-sim="1" steht genau zweimal (Pill + Menue-Badge)',
    (src.match(/data-cr-sim="1"/g) || []).length === 2,
    (src.match(/data-cr-sim="1"/g) || []).length);
  /* Gesucht wird die CODE-Form (String-Konkatenation), nicht die Phrase —
   * das Banner zitiert die alte Formulierung als Prosa und darf das. */
  check('"live bracket: #" ist aus dem Menue-Code verschwunden',
    src.indexOf("'live bracket: #' + liveBracket") === -1);
  check('kein tok.tradeImpact-Template haengt noch ein % an',
    !/tok\.tradeImpact':'\{p\}%/.test(src));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
