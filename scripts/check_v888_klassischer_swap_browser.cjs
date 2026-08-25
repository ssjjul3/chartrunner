/* Smoke-Verifikation fuer v1.0.888 — die klassische Swap-Ansicht.
 *
 * Die schaerfste Zeile ist die ANFRAGE, nicht die Anzeige: was der Worker
 * bekommt (input_mint, output_mint, amount_raw) wird hier woertlich gegen
 * das gehalten, was im Formular stand — je Richtung. Grosse Betraege muessen
 * EXAKT ankommen (ueber 2^53; ein Float-Weg wuerde still runden, und der
 * Test hier wuerde rot).
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v888_klassischer_swap_browser.cjs
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
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
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
  const swapReqs = [];   // node-seitig: was der Worker WIRKLICH bekaeme
  const ataReqs  = [];

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
    if(/\/v1\/tx\/ata/.test(req.url())){
      try { ataReqs.push(JSON.parse(req.postData() || '{}')); } catch(_){ ataReqs.push({ unparsbar: true }); }
      const st = await page.evaluate(() => window.__ata).catch(() => null);
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(st || { ok: true, transaction: 'AQIDBAU=', owner: 'HiToxOwner1111111111111111111111111111111111',
          fee_account: 'FeeKonto111111111111111111111111111111111111', rent_lamports: 2039280 }) });
    }
    if(/\/health/.test(req.url())){
      const st = await page.evaluate(() => window.__h).catch(() => null);
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(st || {}) });
    }
    if(/\/v1\/tx\/swap/.test(req.url())){
      try { swapReqs.push(JSON.parse(req.postData() || '{}')); } catch(_){ swapReqs.push({ unparsbar: true }); }
      const st = await page.evaluate(() => window.__q).catch(() => null);
      if(st && st.fehler) return route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify(st.fehler) });
      const body = {
        transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
        quote: Object.assign({ in_raw: '50000000', out_raw: '148979256884',
                               min_out_raw: '148234360600', slippage_bps: 50,
                               price_impact_pct: '0.0029' }, (st && st.quote) || {}),
        fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
        checked: { instructions_match_request: true, level: 'form+amount' },
        route: { platform_fee_bps: 50 },
      };
      if(st && st.cap) body.cap = st.cap;   // NUR der Alt-Worker fuehrt einen Deckel
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

  console.log('\n-- Der Parser: Betrag ohne Float --');
  const pr = await page.evaluate(() => ({
    a: _crParseBetrag('0,05', 9), b: _crParseBetrag('0.05', 9),
    c: _crParseBetrag('92233720368547758079', 0), d: _crParseBetrag('1,2345678901', 9),
    e: _crParseBetrag('1.489.792,56884', 5), f: _crParseBetrag('', 9),
    g: _crRawToUi('50000000', 9), h: _crRawToUi('148979256884', 5),
  }));
  check('"0,05" · 9 → 50000000', pr.a.raw === '50000000', pr.a);
  check('"0.05" · 9 → 50000000 (einzelner Punkt = Dezimal)', pr.b.raw === '50000000', pr.b);
  check('grosse Roheinheiten EXAKT (ueber 2^53)', pr.c.raw === '92233720368547758079', pr.c);
  check('zu viele Nachkommastellen → Fehler, kein Abschneiden', !!pr.d.error, pr.d);
  check('de-DE mit Tausenderpunkten', pr.e.raw === '148979256884', pr.e);
  check('leer → Fehler', !!pr.f.error, pr.f);
  check('_crRawToUi Gegenrichtung', pr.g === '0,05' && pr.h === '1489792,56884', [pr.g, pr.h]);

  /* Ein Formular-Wirt wie im Produkt: Richtung, Betrag, Waehrung, Menue. */
  const run = async (opts) => {
    return page.evaluate(([mint, o]) => new Promise((resolve) => {
      window.__q = o.q || null; window.__tok = o.tok || null; window.__h = o.h || null;
      window._crSwapHealthCache = null;
      for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
      for(const k of Object.keys(_crSwapTokCache)) delete _crSwapTokCache[k];
      const host = document.createElement('div');
      host.innerHTML = '<button data-cr-swap-dir="kauf">k</button><button data-cr-swap-dir="verkauf">v</button>'
        + '<input data-cr-swap-betrag value="' + (o.betrag || '0,05') + '">'
        + '<button data-cr-swap-max>m</button><button data-cr-swap-cur>c</button>'
        + '<div data-cr-swap-menu style="display:none"></div><div data-cr-swap-erhalt></div>'
        + '<span data-cr-swap-bestand></span>'
        + '<button data-cr-swap="' + mint + '">g</button>'
        + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
      document.body.appendChild(host); _crWireSwap(host, mint);
      if(o.richtung === 'verkauf')
        host.querySelector('[data-cr-swap-dir="verkauf"]').click();
      if(o.nurMenu){
        host.querySelector('[data-cr-swap-cur]').click();
        return setTimeout(() => resolve({ menu: host.querySelector('[data-cr-swap-menu]').textContent }), 900);
      }
      host.querySelector('[data-cr-swap]').click();
      const p = host.querySelector('[data-cr-swap-panel]');
      const t0 = Date.now();
      (function poll(){
        const t = p.textContent || '';
        if((t && !/Angebot wird geholt/.test(t)) || Date.now() - t0 > 12000)
          return resolve({ text: t, html: p.innerHTML });
        setTimeout(poll, 120);
      })();
    }), [BONK, opts]);
  };

  console.log('\n-- KAUF: die Anfrage traegt, was im Formular stand --');
  let t = await run({ betrag: '0,05', q: { cap: { max_in_lamports: 50000000 } } });
  let rq = swapReqs[swapReqs.length - 1] || {};
  check('input_mint = WSOL', rq.input_mint === WSOL, rq);
  check('output_mint = Token', rq.output_mint === BONK, rq);
  check('amount_raw = 50000000', rq.amount_raw === '50000000', rq);
  check('Tafel steht', /Bevor du signierst/.test(t.text), t.text.slice(0, 60));
  check('Alt-Worker MIT cap → Deckel-Zeile da', t.text.indexOf('Deckel') !== -1, t.text.slice(0, 300));
  check('Aufklapp-Menue existiert und ist zu',
    await page.evaluate(() => {
      const d = document.querySelector('details[data-cr-swap-erklaerung]');
      return !!d && !d.open && /Mindestens/.test(d.textContent);
    }));

  t = await run({ betrag: '0,05' });   // neuer Worker: KEIN cap-Block
  check('cap: none → KEINE Deckel-Zeile', t.text.indexOf('Deckel') === -1, t.text.slice(0, 300));
  check('Handelsgebühr-Zeile (aus der Antwort) steht',
    t.text.indexOf('50 bps an ChartRunner') !== -1, t.text.slice(0, 300));

  console.log('\n-- VERKAUF: Richtung gekippt, Bestand statt Guthaben --');
    /* decimals: 0 — seit v889 deutet der Client getippte Ziffern in EINHEITEN
   * des Assets; bei einem Ganzzahl-Token sind Einheiten und Roheinheiten
   * identisch, und diese Zeile prueft weiterhin die WOERTLICHE Ankunft. */
  const bestand = { ok: true, read: true, holdings: [{ mint: BONK, amount_raw: '100000000000000000000',
    spendable_amount_raw: '100000000000000000000', decimals: 0, frozen: false, symbol: 'BONK' }] };
  t = await run({ richtung: 'verkauf', betrag: '92233720368547758079',
    tok: bestand, q: { quote: { in_raw: '92233720368547758079', out_raw: '49200000', min_out_raw: '48900000' } } });
  rq = swapReqs[swapReqs.length - 1] || {};
  check('input_mint = Token', rq.input_mint === BONK, rq);
  check('output_mint = WSOL', rq.output_mint === WSOL, rq);
  check('grosser Betrag kommt EXAKT an (ueber 2^53)', rq.amount_raw === '92233720368547758079', rq);
  check('"Dein Bestand" statt SOL-Guthaben', t.text.indexOf('Dein Bestand') !== -1, t.text.slice(0, 350));
  check('Signieren-Knopf steht (Deckung reicht)', t.html.indexOf('data-cr-swap-go') !== -1);

  const eingefroren = JSON.parse(JSON.stringify(bestand));
  eingefroren.holdings[0].frozen = true;
  t = await run({ richtung: 'verkauf', betrag: '148979256884', tok: eingefroren,
    q: { quote: { in_raw: '148979256884' } } });
  check('eingefroren → rote Box VOR dem Signieren',
    t.text.indexOf('Konto eingefroren') !== -1, t.text.slice(0, 300));
  check('… und KEIN Signieren-Knopf', t.html.indexOf('data-cr-swap-go') === -1);

  const zuWenig = JSON.parse(JSON.stringify(bestand));
  zuWenig.holdings[0].spendable_amount_raw = '1000';
  zuWenig.holdings[0].amount_raw = '1000';
  t = await run({ richtung: 'verkauf', betrag: '148979256884', tok: zuWenig,
    q: { quote: { in_raw: '148979256884' } } });
  check('Bestand reicht nicht → kein Knopf',
    t.text.indexOf('Das reicht nicht') !== -1 && t.html.indexOf('data-cr-swap-go') === -1,
    t.text.slice(0, 300));

  console.log('\n-- Alt-Worker lehnt ab, die Tafel zeigt es (kein Client-Schalter) --');
  t = await run({ richtung: 'verkauf', betrag: '148979256884', tok: bestand,
    q: { fehler: { error: 'input-must-be-wsol' } } });
  check('input-must-be-wsol wird ehrlich angezeigt',
    t.text.indexOf('nur Käufe möglich') !== -1, t.text.slice(0, 200));

  console.log('\n-- fee-account-missing: der Anlege-Knopf steht in der Tafel --');
  t = await run({ richtung: 'verkauf', betrag: '92233720368547758079', tok: bestand,
    q: { fehler: { error: 'fee-account-missing', fee_mint: WSOL, fee_side: 'output' } } });
  check('der Fehler wird erklaert (Eingabe-Seite, je Asset ein Konto)',
    t.text.indexOf('Gebührenkonto') !== -1 && t.text.indexOf('Eingabe-Seite') !== -1, t.text.slice(0, 250));
  let bauen = await page.evaluate(() => {
    const b = document.querySelector('[data-cr-ata-bauen]');
    if(!b) return { da: false };
    b.click();
    return new Promise(res => setTimeout(() => {
      const go = document.querySelector('[data-cr-ata-go]');
      /* b ist nach say() detached; document.textContent ist per Spez null —
       * also das JUENGSTE Panel lesen. */
      const ps = document.querySelectorAll('[data-cr-swap-panel]');
      res({ da: true, tafel: (ps[ps.length - 1].textContent || ''), go: !!go });
    }, 700));
  });
  check('Tap 1 baut und zeigt Eigner/Konto/Miete aus der Antwort',
    bauen.da && /Eigner/.test(bauen.tafel) && /Kontomiete/.test(bauen.tafel) && /2\.039\.280/.test(bauen.tafel),
    bauen.tafel && bauen.tafel.slice(0, 200));
  check('Signieren-Knopf steht (Tap 2)', bauen.go === true);
  let arq = ataReqs[ataReqs.length - 1] || {};
  /* Quote-Regel: die Gebuehr liegt beim Verkauf auf der AUSGABE (fee_mint =
   * WSOL). Ein Rueckfall auf den Eingabe-Mint (BONK) waere das FALSCHE Konto
   * — diese Zeile wird rot, wenn jemand den Rueckfall wieder einbaut. */
  check('die ata-Anfrage traegt fee_mint aus dem Fehler (WSOL, NICHT die Eingabe)',
    arq.mint === WSOL && arq.mint !== BONK, arq);
  check('… und den payer', arq.payer === ADDR, arq);
  /* already_exists ist eine Auskunft, kein Fehler und kein Knopf. */
  t = await run({ richtung: 'verkauf', betrag: '92233720368547758079', tok: bestand,
    q: { fehler: { error: 'fee-account-missing', fee_mint: WSOL, fee_side: 'output' } } });
  await page.evaluate(() => { window.__ata = { ok: true, already_exists: true }; });
  bauen = await page.evaluate(() => {
    const bs = document.querySelectorAll('[data-cr-ata-bauen]');
    const b = bs[bs.length - 1]; if(!b) return { da: false };
    b.click();
    return new Promise(res => setTimeout(() => {
      const ps = document.querySelectorAll('[data-cr-swap-panel]');
      const p2 = ps[ps.length - 1];
      res({ da: true, tafel: p2.textContent || '', go: !!p2.querySelector('[data-cr-ata-go]') });
    }, 700));
  });
  check('already_exists ist eine Auskunft ohne Signieren-Knopf',
    bauen.da && /existiert bereits/.test(bauen.tafel) && bauen.go === false, bauen.tafel && bauen.tafel.slice(0,150));
  await page.evaluate(() => { window.__ata = null; });
  /* Ohne Mint in der Antwort wird NICHT geraten: kein Anlege-Knopf. */
  t = await run({ richtung: 'verkauf', betrag: '92233720368547758079', tok: bestand,
    q: { fehler: { error: 'fee-account-missing' } } });
  check('ohne fee_mint/mint KEIN Anlege-Knopf — es wird nicht geraten',
    t.html.indexOf('data-cr-ata-bauen') === -1 && t.text.indexOf('nennt den Mint nicht') !== -1,
    t.text.slice(0, 200));

  console.log('\n-- Das Menue kommt aus /health, nicht aus Konstanten --');
  /* Feldname wie am LIVE-/health v1.13 abgelesen: swap.quote_currencies,
   * inkl. pending-Slot (RUN, mint: null). */
  let m = await run({ nurMenu: true,
    h: { swap: { quote_currencies: [
      { symbol: 'USDC', mint: USDC, decimals: 6, pending: false },
      { symbol: 'RUN', mint: null, decimals: null, pending: true } ] } } });
  check('SOL steht immer drin', /SOL/.test(m.menu), m.menu);
  check('USDC erscheint, WEIL /health es fuehrt', /USDC/.test(m.menu), m.menu);
  check('RUN (pending aus /health, mint: null) sichtbar gesperrt — kein geratener Mint',
    /RUN/.test(m.menu) && /Token-Launch/.test(m.menu), m.menu);
  /* Die Gegenrichtung des Feldnamens: ein FALSCHER Name (quote_mints) darf
   * nichts freischalten — der Client liest nur das echte Worker-Feld. */
  m = await run({ nurMenu: true, h: { quote_mints: [{ symbol: 'USDC', mint: USDC, decimals: 6 }] } });
  check('falscher Feldname schaltet nichts frei', !/USDC/.test(m.menu), m.menu);
  m = await run({ nurMenu: true, h: {} });
  check('ohne quote_currencies KEIN USDC — nichts erfunden', !/USDC/.test(m.menu), m.menu);

  console.log('\n-- Quelle: der alte Festpfad ist wirklich weg --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('kein "Echt handeln — 0,05 SOL" mehr', src.indexOf('Echt handeln — 0,05 SOL') === -1);
  /* Die CODE-Form zaehlen (Markup mit schliessendem Tag) — das Banner
   * zitiert die Knopf-Beschriftung als Prosa und darf das (v887-Lektion). */
  /* v890: der Knopf ist uebersetzt — gezaehlt wird die i18n-Code-Form. */
  check('der PREIS-ANSEHEN-Knopf existiert genau einmal',
    (src.match(/_tokT\('tok\.swapQuoteBtn'/g) || []).length === 1 /* die eine Markup-Stelle; Dicts tragen den Schluessel, nicht den Aufruf */
    && src.indexOf('ANGEBOT HOLEN — ES WIRD NICHTS SIGNIERT</button>') === -1);
  check('kein data-cr-cap-probe-Knopf mehr im Markup',
    (src.match(/data-cr-cap-probe="/g) || []).length === 0);
  check('prepareSwap wird nicht mehr mit CR_SWAP_TEST_LAMPORTS gefuettert',
    !/amountRaw:\s*String\(CR_SWAP_TEST_LAMPORTS\)/.test(src));
  check('Devnet-Probe-Knopf ist aus der Wallet-Auswahl raus',
    src.indexOf('id="crWpDevnetBtn"') === -1);
  check('v886-Gebuehrenkonto-Knopf ist raus (Anlegen sitzt in der Tafel)',
    src.indexOf('id="crWpAtaBtn"') === -1);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
