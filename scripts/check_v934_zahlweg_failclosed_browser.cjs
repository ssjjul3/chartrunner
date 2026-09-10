/* Smoke-Verifikation v1.0.934 — DER BEZAHLDIALOG MUSS VERWEIGERN KOENNEN.
 *
 * BEFUND, den diese Datei absichert (gemessen am Quelltext v1.0.932/933): beide
 * Bezahldialoge — `_crCryptoPayOpen` (Pro) und `crBoostCheckout` (Boost) —
 * fielen ueber `(intent && intent.treasury) || treasury` auf eine fest
 * verdrahtete Client-Adresse zurueck. Im Pro-Dialog lief `paint()` ausserdem
 * synchron VOR dem Intent-fetch, und bei abgemeldeten Nutzern wurde der Intent
 * nie geholt. Der USDC-Pfad erzeugte damit eine VOLLSTAENDIG AUSFUEHRBARE
 * Zahlung — Empfaenger, Betrag, Token — OHNE `reference`. Eine solche Zahlung
 * findet der Verifizierer im Worker nie, und einen Erstattungspfad gibt es in
 * diesem Repo nicht.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, an der einzigen Stelle, an
 * der die Frage entschieden wird: AM DOM DES DIALOGS. Nicht an einer Absicht,
 * nicht an einem Aufruf — ein Nutzer tippt auf das, was dasteht. Geprueft wird
 * deshalb woertlich, ob im gemalten Dialog
 *   · die Zeichenfolge `solana:` vorkommt (der ausfuehrbare Link),
 *   · die Zeichenfolge `F4Xgs` vorkommt (die alte Client-Adresse),
 *   · ein Betrag oder eine Adresse steht, die nicht aus der Antwort stammt.
 *
 * Der Intent-Abruf wird ueber ein fetch-Doppel gesteuert (window.__v934.mode):
 * 'ok' | 'noTreasury' | 'throw' | 'hang' | 'http500'. Das Doppel steht VOR
 * jedem Skript der Seite; *.workers.dev ist aus dieser Sandbox ohnehin nicht
 * erreichbar, ein Test, der davon abhinge, waere gruen aus dem falschen Grund.
 *
 * T1  Pro · abgemeldet  — kein `solana:`, kein `F4Xgs`, kein Betrag, kein
 *     Wallet-Knopf; stattdessen die Aufforderung zum Anmelden. Erscheint ein
 *     Token, schaltet DERSELBE offene Dialog um (der vierte Zustand ist nicht
 *     bloss eine Sackgasse).
 * T2  Pro · Intent scheitert (fetch wirft / HTTP 500) — kein `solana:`, kein
 *     Betrag, sichtbare Fehlermeldung, KEINE Adresse.
 * T3  Pro · Intent haengt — der Wallet-Knopf ist ein <button disabled>, kein
 *     <a href>; Betrag und Adresse sind Platzhalter.
 * T4  Pro · Intent kommt — Adresse, Betrag und `reference` stammen ALLE aus
 *     der Antwort. Eine Antwort OHNE `treasury` fuehrt NICHT zu einer
 *     Client-Adresse, sondern in den Fehlerzustand.
 * T5  Pro · Cluster (Teil 3) — `chain:'devnet'` erzeugt den Testzahlungs-
 *     Hinweis, `chain:'mainnet-beta'` nicht, fehlendes Feld aendert nichts.
 * T6  Boost · dieselben Fragen an der zweiten Kopie.
 * T7  Quelltext — die Adresskonstante kommt NULL mal vor, es gibt keinen
 *     `payTo`-Leser mehr und keinen `|| treasury`-Rueckfall.
 * T8  Regressionen — keine harten Page-Errors, und die Handelsstrecke ist
 *     unberuehrt (crArm, crVaultLimit, crOnchainLimit, crSwap stehen).
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet. Jede Mutation wurde einzeln in
 * ChartRunner_Prototype.html eingebaut, die Suite lief, danach hat
 * `git checkout` wiederhergestellt. Ergebnis je Mutation steht im Commit.
 *
 *   M1  `uri()` im Pro-Dialog: die Wache
 *       `if(!(intent && intent.treasury && intent.reference)) return '';`
 *       gestrichen und der v933-Rueckfall wieder eingesetzt
 *       (`var tre = (intent && intent.treasury) || CR_V934_OLD_TREASURY;`)
 *       ROT: T1a, T1b, T2b, T3b, T4d, T7b  — genau die Zeilen, die "kein
 *       Zahlungsziel ohne Worter-Antwort" behaupten.
 *   M2  `boot()`: `phase='signedout'` durch `phase='ready'` ersetzt
 *       ROT: T1a, T1c  — der abgemeldete Dialog malte wieder die Zahltafel.
 *   M3  `startIntent()`: `.catch(fail)` zurueck auf `.catch(function(){})`
 *       ROT: T2a, T2c  — der Fehlerzweig verschwand wieder still, der Dialog
 *       blieb im Wartezustand stehen.
 *   M4  `startIntent()`: `j.reference && j.treasury` auf `j.reference`
 *       verkuerzt (Antwort ohne treasury wird akzeptiert)
 *       ROT: T4e  — die Adresse fehlte, der Dialog behauptete trotzdem
 *       "bereit". T4d bleibt gruen: ohne Rueckfall entsteht keine falsche
 *       Adresse, nur ein leeres Feld — deshalb pruefen T4d und T4e getrennt.
 *   M5  `paintPay()`: der disabled-Zweig durch den <a href>-Zweig ersetzt
 *       ROT: T3a  (Betrag/Adresse bleiben Platzhalter, T3b gruen) — der Knopf
 *       war wieder klickbar, obwohl es kein Ziel gab.
 *   M6  `clusterIsMain`: 'devnet' zusaetzlich als mainnet gefuehrt
 *       ROT: T5a  — die Testzahlung sah aus wie eine echte.
 *   M7  Boost `uri()`: derselbe Rueckfall wie M1 wieder eingebaut
 *       ROT: T6b, T6d, T7b
 *   M8  Boost `startIntent()`: `paintWaiting()` gestrichen (v933-Zustand)
 *       ROT: T6c  — der Wartezustand war wieder unsichtbar.
 *
 * Aufruf:  node scripts/check_v934_zahlweg_failclosed_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
const HTML = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x).slice(0, 700) : '')); }
}
function launchOptions(){
  const o = { headless: true };
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const cands = [process.env.CR_CHROME_PATH].filter(Boolean);
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ o.executablePath = c; break; }
  return o;
}

// Die alte Client-Adresse. Steht NUR hier, damit T7 nach ihr suchen kann —
// die Spieldatei darf sie nicht mehr enthalten.
const OLD_TREASURY = 'F4XgsVpo3DQv7SiHA2yhqVY2uepb49p2WPKQWPMqWvnm';
// Die Adresse, die im Test der Worker liefert. Sie ist absichtlich NICHT die
// alte: nur so ist unterscheidbar, woher die angezeigte Adresse stammt.
const WORKER_TREASURY = 'WkR934TreasuryFromWorkerZZZZZZZZZZZZZZZZZZZZ';
const TEST_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if(/dexscreener/.test(url)) return J({ pairs: [] });
    return J({});
  });

  /* DAS FETCH-DOPPEL. Nur die beiden Intent-Endpunkte werden gesteuert; alles
   * andere laeuft weiter durch (und landet in page.route). */
  await page.addInitScript(() => {
    window.__v934 = { mode: 'ok', body: null, tok: '', calls: [] };
    const real = window.fetch;
    window.fetch = function(input, init){
      const u = String((input && input.url) ? input.url : input);
      window.__v934.calls.push(u);
      const json = (o, st) => Promise.resolve(new Response(JSON.stringify(o), {
        status: st || 200, headers: { 'Content-Type': 'application/json' } }));
      if(/\/v1\/(pay\/sol|boost)\/intent/.test(u)){
        const m = window.__v934.mode;
        if(m === 'throw')   return Promise.reject(new TypeError('v934: Failed to fetch'));
        if(m === 'hang')    return new Promise(function(){});
        if(m === 'http500') return Promise.resolve(new Response('', { status: 500 }));
        return json(window.__v934.body || {});
      }
      if(/\/v1\/(pay\/sol|boost)\/status/.test(u)) return json({ status: 'pending' });
      return real.apply(this, arguments);
    };
    window.__v934.reset = function(){ window.__v934.calls.length = 0; };
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // crAccount.token() ist die einzige Auskunft, an der die Dialoge "angemeldet"
  // festmachen. Sie wird gesteuert, nicht das Konto — der Test soll den
  // Bezahlweg messen, nicht die Anmeldung.
  await page.evaluate(() => {
    if(!window.crAccount) window.crAccount = {};
    window.crAccount.token = function(){ return window.__v934.tok; };
    window.__v934.dom = function(sel){
      const hits = Array.prototype.slice.call(document.querySelectorAll('body > div'))
        .filter(d => d.querySelector(sel));
      return hits.length ? hits[hits.length - 1].outerHTML : null;
    };
    window.__v934.payDom   = function(){ return window.__v934.dom('.crPayX'); };
    window.__v934.boostDom = function(){ return window.__v934.dom('.crBoostX'); };
    window.__v934.closeAll = function(){
      Array.prototype.slice.call(document.querySelectorAll('body > div'))
        .forEach(d => { if(d.querySelector('.crPayX') || d.querySelector('.crBoostX')) d.remove(); });
    };
  });

  const setMode = (mode, body, tok) => page.evaluate(o => {
    window.__v934.mode = o.mode;
    window.__v934.body = o.body || null;
    window.__v934.tok  = o.tok || '';
    window.__v934.closeAll();
  }, { mode, body: body || null, tok: tok || '' });

  const openPay = async () => { await page.evaluate(() => window._crCryptoPayOpen('RUNNER_PRO', 'monthly')); await page.waitForTimeout(260); };
  const payDom  = () => page.evaluate(() => window.__v934.payDom());

  const openBoost = async (mint) => {
    await page.evaluate(m => {
      window.crBoostCheckout('spark', m);
    }, mint);
    await page.waitForTimeout(120);
    await page.evaluate(() => { const b = document.querySelector('.crBoostNext'); if(b) b.click(); });
    await page.waitForTimeout(260);
  };
  const boostDom = () => page.evaluate(() => window.__v934.boostDom());

  const OK_BODY = { reference: 'V934REF', usdc: 12.34, sol: 0.077, treasury: WORKER_TREASURY };

  console.log('\n-- Boot --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
    check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
    check('das fetch-Doppel steht (sonst misst nichts hier etwas)',
      await page.evaluate(() => typeof window.__v934 === 'object' && Array.isArray(window.__v934.calls)));
    check('_crCryptoPayOpen und crBoostCheckout sind erreichbar',
      await page.evaluate(() => typeof window._crCryptoPayOpen === 'function' && typeof window.crBoostCheckout === 'function'));
  }

  /* ═══ T1 — PRO · ABGEMELDET ══════════════════════════════════════════════ */
  console.log('\n-- T1 · Pro, abgemeldet --');
  await setMode('ok', OK_BODY, '');
  await openPay();
  {
    const dom = await payDom();
    check('T1a abgemeldet: KEIN `solana:` und KEINE alte Client-Adresse im DOM',
      !!dom && dom.indexOf('solana:') < 0 && dom.indexOf('F4Xgs') < 0,
      dom ? dom.slice(0, 300) : dom);
    check('T1b abgemeldet: kein Wallet-Knopf, sondern die Aufforderung zum Anmelden',
      !!dom && dom.indexOf('crPaySignin') >= 0 && dom.indexOf('crPayOpen') < 0, dom ? dom.slice(0, 300) : dom);
    check('T1c abgemeldet: kein Betrag (kein USDC-/SOL-Feld gemalt)',
      !!dom && dom.indexOf('crPaySeg') < 0 && dom.indexOf('12.34') < 0, dom ? dom.slice(0, 300) : dom);
    check('T1d abgemeldet: der Intent wurde gar nicht erst geholt',
      (await page.evaluate(() => window.__v934.calls.filter(u => /\/intent/.test(u)).length)) === 0);
  }
  // … und DERSELBE offene Dialog schaltet um, sobald ein Token da ist.
  {
    await page.evaluate(() => { window.__v934.tok = 'V934TOK'; });
    await page.waitForTimeout(1400);
    const dom = await payDom();
    check('T1e Anmeldung waehrend der Dialog offen ist -> er schaltet auf die Zahltafel um',
      !!dom && dom.indexOf('crPaySignin') < 0 && dom.indexOf(WORKER_TREASURY) >= 0, dom ? dom.slice(0, 400) : dom);
  }

  /* ═══ T2 — PRO · INTENT SCHEITERT ════════════════════════════════════════ */
  console.log('\n-- T2 · Pro, Intent scheitert --');
  await setMode('throw', null, 'V934TOK');
  await openPay();
  await page.waitForTimeout(300);
  {
    const dom = await payDom();
    check('T2a fetch wirft: sichtbare Fehlermeldung statt Wartezustand',
      !!dom && dom.indexOf('crPayRetry') >= 0, dom ? dom.slice(0, 400) : dom);
    check('T2b fetch wirft: kein `solana:`, keine alte Adresse, kein Betrag',
      !!dom && dom.indexOf('solana:') < 0 && dom.indexOf('F4Xgs') < 0 && dom.indexOf('12.34') < 0,
      dom ? dom.slice(0, 400) : dom);
    check('T2c fetch wirft: KEIN Wallet-Knopf, auch kein deaktivierter Rest der Zahltafel',
      !!dom && dom.indexOf('crPayOpen') < 0 && dom.indexOf('crPaySeg') < 0, dom ? dom.slice(0, 400) : dom);
  }
  await setMode('http500', null, 'V934TOK');
  await openPay();
  await page.waitForTimeout(300);
  {
    const dom = await payDom();
    check('T2d HTTP 500 ist derselbe Fall wie ein Wurf (r.ok false -> null -> Fehler)',
      !!dom && dom.indexOf('crPayRetry') >= 0 && dom.indexOf('solana:') < 0, dom ? dom.slice(0, 400) : dom);
  }

  /* ═══ T3 — PRO · INTENT HAENGT ═══════════════════════════════════════════ */
  console.log('\n-- T3 · Pro, Intent haengt --');
  await setMode('hang', null, 'V934TOK');
  await openPay();
  await page.waitForTimeout(400);
  {
    const dom = await payDom();
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.crPayOpen');
      return b ? { tag: b.tagName, disabled: !!b.disabled, href: b.getAttribute('href') } : null;
    });
    check('T3a der Wallet-Knopf ist ein deaktivierter <button>, kein <a href>',
      !!btn && btn.tag === 'BUTTON' && btn.disabled === true && btn.href === null, btn);
    check('T3b Wartezustand: kein `solana:`, keine Adresse, kein Betrag — Platzhalter',
      !!dom && dom.indexOf('solana:') < 0 && dom.indexOf('F4Xgs') < 0 && dom.indexOf('12.34') < 0,
      dom ? dom.slice(0, 400) : dom);
    check('T3c Wartezustand ist SICHTBAR (die Zahltafel steht, nur ohne Ziel)',
      !!dom && dom.indexOf('crPaySeg') >= 0, dom ? dom.slice(0, 400) : dom);
  }

  /* ═══ T4 — PRO · INTENT KOMMT ════════════════════════════════════════════ */
  console.log('\n-- T4 · Pro, Intent kommt --');
  await setMode('ok', OK_BODY, 'V934TOK');
  await openPay();
  await page.waitForTimeout(320);
  {
    const dom = await payDom();
    const href = await page.evaluate(() => { const a = document.querySelector('.crPayOpen'); return a ? a.getAttribute('href') : null; });
    check('T4a die angezeigte Adresse ist die des Workers', !!dom && dom.indexOf(WORKER_TREASURY) >= 0, dom ? dom.slice(0, 400) : dom);
    check('T4b der angezeigte Betrag stammt aus der Antwort (12.34, nicht 9.99)',
      !!dom && dom.indexOf('12.34') >= 0 && dom.indexOf('9.99 <') < 0, dom ? dom.slice(0, 500) : dom);
    check('T4c der Link traegt Adresse, Betrag UND reference — alle drei aus der Antwort',
      !!href && href.indexOf('solana:' + WORKER_TREASURY) === 0 && /amount=12\.34/.test(href) && /reference=V934REF/.test(href), href);
    check('T4d nirgends im DOM die alte Client-Adresse', !!dom && dom.indexOf('F4Xgs') < 0);
  }
  // Antwort OHNE treasury: das ist der Fehlerfall, KEIN Anlass fuer eine
  // Client-Adresse.
  await setMode('ok', { reference: 'V934REF', usdc: 12.34, sol: 0.077 }, 'V934TOK');
  await openPay();
  await page.waitForTimeout(320);
  {
    const dom = await payDom();
    check('T4e Antwort ohne `treasury` -> Fehlerzustand, KEINE Adresse aus dem Client',
      !!dom && dom.indexOf('F4Xgs') < 0 && dom.indexOf('solana:') < 0 && dom.indexOf('crPayRetry') >= 0,
      dom ? dom.slice(0, 400) : dom);
  }
  // Antwort ohne Betrag fuer die gewaehlte Waehrung: Adresse ja, Link nein.
  await setMode('ok', { reference: 'V934REF', treasury: WORKER_TREASURY }, 'V934TOK');
  await openPay();
  await page.waitForTimeout(320);
  {
    const dom = await payDom();
    check('T4f Antwort ohne Betrag -> Adresse steht, aber KEIN ausfuehrbarer Link',
      !!dom && dom.indexOf(WORKER_TREASURY) >= 0 && dom.indexOf('solana:') < 0, dom ? dom.slice(0, 400) : dom);
  }

  /* ═══ T5 — PRO · CLUSTER (Teil 3) ════════════════════════════════════════ */
  console.log('\n-- T5 · Cluster --');
  await setMode('ok', Object.assign({}, OK_BODY, { chain: 'devnet' }), 'V934TOK');
  await openPay();
  await page.waitForTimeout(320);
  {
    const dom = await payDom();
    check('T5a chain:"devnet" -> deutlicher Testzahlungs-Hinweis, Cluster genannt',
      !!dom && /TESTZAHLUNG|TEST PAYMENT|PAGO DE PRUEBA/i.test(dom) && dom.indexOf('devnet') >= 0,
      dom ? dom.slice(0, 500) : dom);
  }
  await setMode('ok', Object.assign({}, OK_BODY, { chain: 'mainnet-beta' }), 'V934TOK');
  await openPay();
  await page.waitForTimeout(320);
  {
    const dom = await payDom();
    check('T5b chain:"mainnet-beta" -> kein Warnhinweis, Cluster wird nur genannt',
      !!dom && !/TESTZAHLUNG|TEST PAYMENT|PAGO DE PRUEBA/i.test(dom) && dom.indexOf('mainnet-beta') >= 0,
      dom ? dom.slice(0, 500) : dom);
  }
  await setMode('ok', OK_BODY, 'V934TOK');
  await openPay();
  await page.waitForTimeout(320);
  {
    const dom = await payDom();
    check('T5c fehlt das Feld, wird nichts geraten (kein Cluster, kein Hinweis)',
      !!dom && !/TESTZAHLUNG|TEST PAYMENT|PAGO DE PRUEBA/i.test(dom) && dom.indexOf('mainnet') < 0,
      dom ? dom.slice(0, 500) : dom);
  }

  /* ═══ T6 — BOOST · DIESELBEN FRAGEN ══════════════════════════════════════ */
  console.log('\n-- T6 · Boost-Checkout --');
  await setMode('throw', null, '');
  await openBoost(TEST_MINT);
  await page.waitForTimeout(300);
  {
    const dom = await boostDom();
    check('T6a Boost, Intent scheitert: ehrliche Meldung, kein `solana:`, keine Adresse',
      !!dom && dom.indexOf('solana:') < 0 && dom.indexOf('F4Xgs') < 0 && dom.indexOf(WORKER_TREASURY) < 0,
      dom ? dom.slice(0, 400) : dom);
  }
  await setMode('ok', { reference: 'V934BREF', usdc: 49 }, '');
  await openBoost(TEST_MINT);
  await page.waitForTimeout(300);
  {
    const dom = await boostDom();
    check('T6b Boost, Antwort ohne `treasury` -> KEINE Client-Adresse, kein Link',
      !!dom && dom.indexOf('solana:') < 0 && dom.indexOf('F4Xgs') < 0, dom ? dom.slice(0, 400) : dom);
  }
  await setMode('hang', null, '');
  await openBoost(TEST_MINT);
  await page.waitForTimeout(400);
  {
    const dom = await boostDom();
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.crBoostOpen');
      return b ? { tag: b.tagName, disabled: !!b.disabled, href: b.getAttribute('href') } : null;
    });
    check('T6c Boost, Intent haengt: SICHTBARER Wartezustand mit deaktiviertem Knopf',
      !!btn && btn.tag === 'BUTTON' && btn.disabled === true && btn.href === null, btn);
    check('T6d Boost, Wartezustand: kein `solana:`, keine Adresse',
      !!dom && dom.indexOf('solana:') < 0 && dom.indexOf('F4Xgs') < 0, dom ? dom.slice(0, 400) : dom);
  }
  await setMode('ok', { reference: 'V934BREF', usdc: 49, sol: 0.31, treasury: WORKER_TREASURY, chain: 'devnet' }, '');
  await openBoost(TEST_MINT);
  await page.waitForTimeout(320);
  {
    const dom = await boostDom();
    const href = await page.evaluate(() => { const a = document.querySelector('.crBoostOpen'); return a ? a.getAttribute('href') : null; });
    check('T6e Boost, Intent kommt: Adresse, Betrag und reference stammen aus der Antwort',
      !!href && href.indexOf('solana:' + WORKER_TREASURY) === 0 && /amount=49\.00/.test(href) && /reference=V934BREF/.test(href), href);
    check('T6f Boost: die alte Client-Adresse steht nirgends', !!dom && dom.indexOf('F4Xgs') < 0);
    check('T6g Boost: chain:"devnet" erzeugt denselben Testzahlungs-Hinweis',
      !!dom && /TESTZAHLUNG|TEST PAYMENT|PAGO DE PRUEBA/i.test(dom) && dom.indexOf('devnet') >= 0,
      dom ? dom.slice(0, 500) : dom);
  }
  // Die Boost-Karte im Hot-Tab hat die abgekuerzte Adresse eingeblendet.
  {
    const cardHtml = await page.evaluate(() => {
      try { return String(_tokRenderBoostPayHtml() || ''); } catch(e){ return 'THREW: ' + e.message; }
    });
    check('T6h die Boost-Karte zeigt keine Zahladresse mehr (auch nicht abgekuerzt/als title)',
      cardHtml.indexOf('THREW') !== 0 && cardHtml.length > 0
        && cardHtml.indexOf('F4Xg') < 0 && cardHtml.indexOf('WPMqWvnm') < 0, cardHtml.slice(0, 300));
  }

  /* ═══ T7 — QUELLTEXT ═════════════════════════════════════════════════════ */
  console.log('\n-- T7 · Quelltext --');
  {
    const hits = (HTML.match(/F4XgsVpo3DQv7SiHA2yhqVY2uepb49p2WPKQWPMqWvnm/g) || []).length;
    check('T7a die Adresskonstante kommt NULL mal in der Spieldatei vor', hits === 0, { hits });
    const fallback = (HTML.match(/\)\s*\|\|\s*treasury\b/g) || []).length;
    check('T7b kein `|| treasury`-Rueckfall mehr', fallback === 0, { fallback });
    const reader = (HTML.match(/\bpayTo\s*[:(]/g) || []).length;
    check('T7c kein payTo-Feld, -Zugriff und -Export mehr (nur noch der Kommentar, der sagt warum)',
      reader === 0, { reader });
    check('T7d die alte Behauptung "reaches the ChartRunner treasury on-chain" steht nirgends mehr',
      HTML.indexOf('reaches the ChartRunner treasury on-chain') < 0);
  }

  /* ═══ T8 — REGRESSIONEN ══════════════════════════════════════════════════ */
  console.log('\n-- T8 · Regressionen --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|v934/i.test(m));
    check('T8a keine harten Page-Errors ueber den ganzen Lauf', hard.length === 0, hard.slice(0, 3));
    const trade = await page.evaluate(() => ({
      arm: typeof window.crArm === 'object' && typeof crArm.on === 'function',
      vault: typeof window.crVaultLimit === 'object',
      onchain: typeof window.crOnchainLimit === 'object',
      swap: typeof window.crSwap === 'object' || typeof window.crTxApi === 'object',
      ent: typeof window.crEntitlement === 'object' && typeof crEntitlement.pricing === 'function'
    }));
    check('T8b die Handelsstrecke ist unberuehrt (Arm, Vault-/Onchain-Limit, Swap stehen)',
      trade.arm && trade.vault && trade.onchain && trade.swap, trade);
    check('T8c crEntitlement lebt weiter — nur payTo() ist weg',
      trade.ent && (await page.evaluate(() => typeof crEntitlement.payTo === 'undefined')));
  }

  await browser.close();
  console.log('\nv934 Zahlweg fail-closed: ' + pass + '/' + (pass + fail) + ' checks passed, ' + fail + ' UNGETESTET/rot');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
