/* Smoke-Verifikation fuer v1.0.885 — die Zahl, die zaehlt, lesbar machen.
 *
 * Gemessen am Telefon, BONK, Einsatz 0,05 SOL:
 *
 *   Erwartet     142.371.209.424
 *   Mindestens   141.659.353.377
 *
 * Keine Einheit, und es sind Roheinheiten. Der Spieler bekommt 1,4 Millionen
 * BONK und liest 142 Milliarden.
 *
 * Die scharfe Zeile unten ist NICHT die huebsche Umrechnung — die ist leicht.
 * Es ist der Fall mit UNBEKANNTER Stellenzahl: dort darf nichts geraten
 * werden. Ein Standardwert sieht immer plausibel aus, ist bei jedem zweiten
 * Token um Groessenordnungen daneben, und er sieht nirgends nach einem Fehler
 * aus. Lieber eine unhandliche Zahl, die als unhandlich beschriftet ist.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v885_menge_browser.cjs
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
// Die echten Zahlen aus der Telefon-Messung.
const OUT  = '142371209424';
const MIN  = '141659353377';

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
      const quote = Object.assign({ in_raw: String(CAP), out_raw: OUT, min_out_raw: MIN,
                                    slippage_bps: 50 }, (st && st.quote) || {});
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
        quote: quote,
        cap:  { max_in_lamports: CAP, output_allowlist: [BONK] },
        fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
        checked: { instructions_match_request: true, level: 'form+amount' },
      }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(([addr]) => {
    try { localStorage.setItem('cr_wallet', addr); } catch(_){}
    try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){} // v890: Tafel-Labels sind i18n
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
  check('Banner meldet mindestens v1.0.885',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 885)))),
    banner.slice(0, 60));

  console.log('\n-- Der Formatierer allein --');
  const fmt = (raw, dec, sym) => page.evaluate(([r, d, s]) => _crFmtMenge(r, d, s), [raw, dec, sym]);
  /* Zwei Nachkommastellen ab 1000 — dieselbe Staffelung wie _crFmtSol, und
   * genau die Schreibweise, die der Auftrag als Sollbild nennt. */
  check('bekannte Stellenzahl → umgerechnet MIT Symbol',
    await fmt(OUT, 5, 'BONK') === '1.423.712,09 BONK', await fmt(OUT, 5, 'BONK'));
  /* Die Groessenordnung ist der ganze Punkt: 1,4 Millionen, nicht 142 Milliarden. */
  check('und die Groessenordnung stimmt (Millionen, nicht Milliarden)',
    /^1\.423\.712/.test(await fmt(OUT, 5, 'BONK')));
  check('UNBEKANNTE Stellenzahl → Roheinheiten, Zahl unveraendert',
    await fmt(OUT, undefined, 'BONK') === '142.371.209.424 Roheinheiten', await fmt(OUT, undefined, 'BONK'));
  check('kein Symbol → ebenfalls Roheinheiten, nichts geraten',
    await fmt(OUT, 5, undefined) === '142.371.209.424 Roheinheiten', await fmt(OUT, 5, undefined));
  check('null als Stellenzahl ist NICHT 0 Stellen',
    await fmt(OUT, null, 'BONK') === '142.371.209.424 Roheinheiten', await fmt(OUT, null, 'BONK'));
  check('0 Stellen ist eine gueltige Angabe, kein Fehlen',
    await fmt('42', 0, 'FOO') === '42,0000 FOO', await fmt('42', 0, 'FOO'));
  check('unlesbarer Wert → null, damit die Zeile wegfallen kann',
    await fmt('keine-zahl', 5, 'BONK') === null, await fmt('keine-zahl', 5, 'BONK'));

  console.log('\n-- Die Preisauswirkung, drei Zustaende --');
  const imp = (raw) => page.evaluate((r) => _crFmtImpact(_crImpactPct(r)), raw);
  check('"0" → 0,000 % (eine Auskunft)', await imp('0') === '0,000 %', await imp('0'));
  check('unter der Anzeigegenauigkeit → < 0,001 %',
    await imp('0.000005') === '< 0,001 %', await imp('0.000005'));
  check('fehlt → nicht bekannt, KEIN 0,000 %',
    await imp(null) === 'nicht bekannt', await imp(null));
  check('leerer String → nicht bekannt', await imp('') === 'nicht bekannt', await imp(''));
  check('unlesbar → nicht bekannt', await imp('abc') === 'nicht bekannt', await imp('abc'));
  /* Der Wert kommt als BRUCH und wird mit 100 zu Prozent — so rechnet die Datei
   * seit v1.0.866. Diese Zeile haelt die Einheitenkonvention fest, damit ein
   * spaeterer Umbau sie nicht stillschweigend um Faktor 100 verschiebt. */
  check('"0.0004" ist ein Bruch → 0,04 %', await imp('0.0004') === '0,04 %', await imp('0.0004'));
  /* Die Staffelung der Anzeigegenauigkeit bleibt wie vor v885 (drei Stellen
   * unter 0,01 %, sonst zwei) — geaendert wurde der Trenner und der Umgang mit
   * „fehlt", nicht die Praezision. */
  check('unter 0,01 % bleiben es drei Stellen', await imp('0.00005') === '0,005 %', await imp('0.00005'));

  console.log('\n-- Ein Zahlformat fuer die ganze Tafel --');
  check('_crFmtSol schreibt deutsch (Komma)',
    await page.evaluate(() => _crFmtSol(50000000)) === '0,0500 SOL',
    await page.evaluate(() => _crFmtSol(50000000)));
  check('und rundet wie vorher',
    await page.evaluate(() => _crFmtSol(16108190)) === '0,0161 SOL',
    await page.evaluate(() => _crFmtSol(16108190)));

  const run = async (q, meta) => {
    await page.evaluate(([qq, mm]) => {
      window.__q = { quote: qq };
      window._crMintMeta = mm || {};
      for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k];
    }, [q, meta]);
    return page.evaluate((mint) => new Promise((resolve) => {
      const host = document.createElement('div');
      /* v1.0.888 — die Ansicht ist ein Formular: der Klickpfad braucht die
       * Betragseingabe (0,05 SOL, wie der alte Festbetrag). */
      host.innerHTML = '<input data-cr-swap-betrag value="0,05">'
                     + '<button data-cr-swap="' + mint + '">g</button>'
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

  console.log('\n-- In der Tafel: BONK mit bekannter Stellenzahl --');
  const metaBonk = {}; metaBonk[BONK] = { decimals: 5, symbol: 'BONK' };
  let r = await run({ price_impact_pct: '0.0004' }, metaBonk);
  check('Angebot steht', /Bevor du signierst/.test(r.text), r.text.slice(0, 80));
  check('Erwartet traegt BONK', r.text.indexOf('1.423.712,09 BONK') !== -1, r.text.slice(0, 240));
  check('Mindestens traegt BONK', r.text.indexOf('1.416.593,53 BONK') !== -1, r.text.slice(0, 240));
  /* Die eigentliche Zusicherung: die alte nackte Milliardenzahl steht nirgends
   * mehr — weder bei Erwartet noch bei Mindestens. */
  check('die nackten Roheinheiten stehen NICHT mehr da',
    r.text.indexOf('142.371.209.424') === -1 && r.text.indexOf('141.659.353.377') === -1,
    r.text.slice(0, 240));
  check('beide Mengenzeilen tragen eine Einheit',
    (r.text.match(/BONK/g) || []).length >= 2, (r.text.match(/BONK/g) || []).length);
  check('kein Punkt-als-Dezimaltrenner mehr beim Einsatz',
    r.text.indexOf('0,0500 SOL') !== -1 && r.text.indexOf('0.0500 SOL') === -1, r.text.slice(0, 160));

  console.log('\n-- In der Tafel: Stellenzahl UNBEKANNT --');
  r = await run({ price_impact_pct: '0.0004' }, {});
  check('Erwartet sagt Roheinheiten', r.text.indexOf('142.371.209.424 Roheinheiten') !== -1,
    r.text.slice(0, 240));
  check('Mindestens sagt Roheinheiten', r.text.indexOf('141.659.353.377 Roheinheiten') !== -1,
    r.text.slice(0, 240));
  check('und es wurde NICHT geraten (kein Symbol erfunden)',
    !/\d\s(BONK|SPL|TOKEN)\b/.test(r.text), r.text.slice(0, 240));

  /* Der realistische Fall, und der gefaehrlichste: das SYMBOL ist bekannt, die
   * Stellenzahl nicht. Genau hier ist die Versuchung am groessten, einen
   * Standardwert einzusetzen — die Zeile saehe dann fertig aus („1.423,71
   * BONK" bei angenommenen 8 Stellen) und waere um Groessenordnungen falsch.
   * Ohne diesen Fall faellt eine solche Mutation nur im Unit-Test auf, nicht
   * in der Tafel. */
  const metaOhneDec = {}; metaOhneDec[BONK] = { symbol: 'BONK' };
  r = await run({ price_impact_pct: '0.0004' }, metaOhneDec);
  check('Symbol bekannt, Stellenzahl nicht → trotzdem Roheinheiten',
    r.text.indexOf('142.371.209.424 Roheinheiten') !== -1, r.text.slice(0, 240));
  check('und die Tafel behauptet keine BONK-Menge',
    !/\d\sBONK\b/.test(r.text), r.text.slice(0, 240));

  console.log('\n-- In der Tafel: die drei Zustaende der Auswirkung --');
  r = await run({ price_impact_pct: '0' }, metaBonk);
  check('0 steht als 0,000 % da', r.text.indexOf('0,000 %') !== -1, r.text.slice(0, 200));
  r = await run({ price_impact_pct: '0.000005' }, metaBonk);
  check('winzig steht als < 0,001 %', r.text.indexOf('< 0,001 %') !== -1, r.text.slice(0, 200));
  r = await run({ price_impact_pct: null }, metaBonk);
  check('fehlend steht als „nicht bekannt"',
    r.text.indexOf('nicht bekannt') !== -1 && r.text.indexOf('0,000 %') === -1, r.text.slice(0, 200));

  console.log('\n-- Die Zweige aus v878/v882/v883 bleiben --');
  r = await run({ price_impact_pct: '0' }, metaBonk);
  check('Deckung: Guthaben steht mit Zahl da', /0,9000 SOL/.test(r.text), r.text.slice(0, 240));
  check('Pruefzeile aus v882 steht weiter', r.html.indexOf('>Geprüft<') !== -1);
  check('CPI-Vorbehalt steht weiter', /CPI/.test(r.text));

  console.log('\n-- Ein Begriff, eine Implementierung --');
  const src = fs.readFileSync(FILE, 'utf8');
  for(const fn of ['_crFmtMenge', '_crSwapMengeRow', '_crImpactPct', '_crImpactCol', '_crFmtImpact', '_crTokMeta']){
    const n = (src.match(new RegExp('function\\s+' + fn + '\\s*\\(', 'g')) || []).length;
    check(fn + ' ist genau einmal deklariert', n === 1, n);
  }
  /* `Number(x) || 0` auf der Preisauswirkung war die Stelle, an der ein
   * fehlendes Feld zu einer gemessenen Null wurde. Sie darf nicht
   * zurueckkommen — auch nicht in der Handelbarkeits-Zeile. */
  check('kein `|| 0` mehr auf einer Preisauswirkung',
    (src.match(/[Pp]rice_?[Ii]mpact[_A-Za-z]*\s*\)\s*\|\|\s*0/g) || []).length === 0,
    (src.match(/[Pp]rice_?[Ii]mpact[_A-Za-z]*\s*\)\s*\|\|\s*0/g) || []).slice(0, 3));
  check('kein toFixed mehr in der Handels-Tafel-Auswirkung',
    (src.match(/imp\.toFixed/g) || []).length === 0);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
