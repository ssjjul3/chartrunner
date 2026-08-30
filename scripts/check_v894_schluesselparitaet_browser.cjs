/* Smoke-Verifikation v1.0.894 — EIN SCHLUESSEL FUER BEIDE APPS.
 *
 * Das Prinzip in einem Satz, und jede scharfe Zeile hier prueft genau ihn:
 * WAS EINE APP TRACKT, MUSS DIE ANDERE LESEN KOENNEN.
 *
 * Run und Token Terminal treffen denselben OHLC-Store. Loesen sie die Adresse
 * getrennt auf, traegt die eine Kerzen unter Schluessel A ein und die andere
 * liest unter Schluessel B — beide Charts melden „live", beide bleiben leer,
 * und NICHTS schlaegt an. Ein Test, der nur den Quelltext liest, sieht das
 * nicht: dort stehen zwei plausible Zeilen. Deshalb misst diese Datei die
 * URLS, die das Spiel wirklich stellt, und vergleicht Track gegen Lesen.
 *
 * Scharf geprueft wird, was Wahrheit oder Kurve kostet, wenn es fehlt:
 *   · crStoreMint ist EINE Aufloesung mit fester Rangfolge — und sie raet
 *     nicht: ein Eintrag ohne Antwort und ohne Adresse ergibt LEER, nicht
 *     einen Mint, der zum Ticker passt.
 *   · Ein STORE-SCHLUESSEL IST KEINE HANDELSERLAUBNIS: sagt der Worker „kein
 *     verifizierter Mint", bleibt _tokMintOf bei NEIN (kein Handel) — waehrend
 *     crStoreMint bis zum CoinGecko-Contract durchreicht (Kurve ja). Die
 *     beiden Zeilen sind ein Paar; einzeln beweist keine von beiden etwas.
 *   · RUN-PARITAET an den echten URLs: /v1/track/sol/<X> und /v1/ohlc/<Y>
 *     tragen dieselbe Adresse.
 *   · Die VERIFIZIERTE Worker-Antwort erreicht jetzt auch den TERMINAL-
 *     LESEPFAD (ownAddr) — vorher endete sie am Handelsmodul.
 *   · Der TERMINAL-TRACK nimmt def.mint, nicht den CoinGecko-Contract: genau
 *     die Divergenz, die es vorher gab.
 *   · Die LISTE waermt den Store, gedeckelt auf 20 ECHTE Pings je Render, und
 *     der zweite Render kommt tiefer (das Budget zaehlt Pings, keine Zeilen).
 *   · Keine EVM-Adresse unter chain 'sol'.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * NICHT geprueft, ausdruecklich: ob der ausgerollte Worker /v1/tracked und
 * /v1/ohlc so beantwortet. Diese Sandbox erreicht *.workers.dev nicht. Hier
 * steht der CLIENT auf dem Pruefstand; die Worker-Seite misst Julians Telefon
 * nach den Schritten im PR.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v894_schluesselparitaet_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); }
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

/* Echte Mints — eine erfundene Zeichenkette faellt durch crIsSolanaMintAddress
 * und wuerde die Listen-Zeilen still ueberspringen (GRUEN aus dem falschen
 * Grund). */
const BONK  = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const WIF   = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
const JUPM  = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
const USDC  = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const EVM   = '0x' + 'a'.repeat(40);

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  const seen = [];                          // jede Anfrage, die das Spiel stellt
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    const cfg = await page.evaluate(() => window.__v894 || {}).catch(() => ({}));

    if(/\/v1\/track\//.test(url))        return J({ ok: true });
    if(/\/v1\/ohlc\//.test(url))         return J(cfg.ohlc || { ok: true, candles: [] });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok: true, mints: (cfg.mints || {}) });
    if(/\/v1\/price/.test(url))          return J({ ok: true, prices: {} });
    if(/\/coins\//.test(url))            return J(cfg.cg || {});
    if(/dexscreener/.test(url))          return J({ pairs: [] });
    if(/\/health/.test(url))             return J({ ok: true, version: 'tx v1.15' });
    return J({});
  });

  await page.addInitScript(() => { try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){} });
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Adressen aus den bisher gesehenen URLs ziehen; danach das Protokoll leeren,
  // damit jeder Abschnitt nur seine EIGENEN Anfragen sieht.
  const takeTracked = () => { const r = seen.filter(u => /\/v1\/track\//.test(u))
      .map(u => decodeURIComponent((u.match(/\/v1\/track\/[^/]+\/([^/?]+)/) || [])[1] || '')); seen.length = 0; return r; };
  const peekTracked = () => seen.filter(u => /\/v1\/track\//.test(u))
      .map(u => decodeURIComponent((u.match(/\/v1\/track\/[^/]+\/([^/?]+)/) || [])[1] || ''));
  const peekChains  = () => seen.filter(u => /\/v1\/track\//.test(u))
      .map(u => (u.match(/\/v1\/track\/([^/]+)\//) || [])[1] || '');
  const peekRead    = () => seen.filter(u => /\/v1\/ohlc\//.test(u))
      .map(u => decodeURIComponent((u.match(/\/v1\/ohlc\/([^/?]+)/) || [])[1] || ''));
  const clear = () => { seen.length = 0; };

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.894',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 894)))),
    banner.slice(0, 60));
  check('crStoreMint ist global erreichbar',
    await page.evaluate(() => typeof window.crStoreMint === 'function'));

  /* ═══ A — EINE AUFLOESUNG, FESTE RANGFOLGE, KEIN RATEN ════════════════ */
  console.log('\n-- A · crStoreMint: die Rangfolge --');

  check('A1 · Zeichenkette wird normalisiert (der Rand faellt weg)',
    await page.evaluate(m => crStoreMint('  ' + m + '  ') === m, BONK));

  check('A2 · def.mint gewinnt vor der Worker-Antwort (eine Eingabe ist keine Aufloesung)',
    await page.evaluate(async ([mine, theirs]) => {
      window.__v894 = { mints: { 'a2-coin': { mint: theirs, verified: true } } };
      await crMarkets.resolve(['a2-coin']);
      return crStoreMint({ id: 'a2-def', cgId: 'a2-coin', mint: mine });
    }, [BONK, WIF]) === BONK);

  check('A3 · die VERIFIZIERTE Worker-Antwort loest auf',
    await page.evaluate(async (w) => {
      window.__v894 = { mints: { 'a3-coin': { mint: w, verified: true } } };
      await crMarkets.resolve(['a3-coin']);
      return crStoreMint({ id: 'a3-def', cgId: 'a3-coin' });
    }, WIF) === WIF);

  /* Das Paar, auf das es ankommt. Derselbe def, zwei Fragen, zwei Antworten —
   * und genau so ist es gemeint: der Worker sagt „nicht verifiziert", also
   * KEIN Handel; eine Kurve unter der CoinGecko-Adresse kostet aber niemanden
   * Geld und ist besser als gar keine. */
  const paar = await page.evaluate(async (c) => {
    window.__v894 = { mints: { 'a4-coin': { mint: null, verified: false, reason: 'nicht verifiziert' } } };
    await crMarkets.resolve(['a4-coin']);
    window._tokMeta = window._tokMeta || {};
    window._tokMeta['a4-def'] = { contract: c };
    const def = { id: 'a4-def', cgId: 'a4-coin', tag: 'A4' };
    return { handel: _tokMintOf(def), kurve: crStoreMint(def) };
  }, USDC);
  check('A4a · _tokMintOf bleibt bei NEIN — kein Handel ohne verifizierten Mint',
    paar.handel === '', paar);
  check('A4b · crStoreMint reicht bis zum Contract durch — ein Schluessel ist keine Erlaubnis',
    paar.kurve === USDC, paar);

  check('A5 · ein rohes Meta-Objekt traegt seinen Contract selbst',
    await page.evaluate(c => crStoreMint({ contract: c }), BONK) === BONK);

  check('A6 · KEIN RATEN: kein Ticker-Match, keine eigene Liste',
    await page.evaluate(() => crStoreMint({ id: 'a6-def', tag: 'PENGU', nm: 'Pudgy Penguins' }) === ''));

  /* ═══ B — RUN: GETRACKT IST GELESEN ═══════════════════════════════════ */
  console.log('\n-- B · Run: /v1/track und /v1/ohlc tragen dieselbe Adresse --');

  /* Der Rand am Mint ist kein Kunstgriff, sondern genau die Divergenz, die es
   * gab: crOhlcTrack machte String(addr) und normalisierte NICHT, waehrend
   * _crRunOhlcCandles normalisierte. Zwei Zeilen, ein Schluessel — solange
   * niemand ein Leerzeichen mitbringt. */
  clear();
  await page.evaluate(async (m) => {
    const a = crEnsureCustomSolanaToken(m);
    a.mint = ' ' + m + ' ';                     // der Rand kommt von aussen
    await switchAsset(a.id);
  }, BONK).catch(() => {});
  await page.waitForTimeout(1200);
  const runTrack = peekTracked(), runRead = peekRead();
  check('B1 · der Run trackt ueberhaupt', runTrack.length > 0, runTrack);
  check('B2 · der Run liest ueberhaupt', runRead.length > 0, runRead);
  check('B3 · TRACK-Schluessel == LESE-Schluessel == der reine Mint',
    runTrack.length > 0 && runRead.length > 0
    && runTrack.every(x => x === BONK) && runRead.every(x => x === BONK),
    { runTrack, runRead });

  /* ═══ C — TERMINAL-LESEPFAD: DIE ANTWORT KOMMT AN ═════════════════════ */
  console.log('\n-- C · Terminal liest unter dem verifizierten Mint --');

  clear();
  const cRead = await page.evaluate(async (w) => {
    window.__v894 = { mints: { 'c-coin': { mint: w, verified: true } },
                      ohlc: { ok: true, candles: [] } };
    await crMarkets.resolve(['c-coin']);
    // Kein def.mint, kein Birdeye-Eintrag, kein _tokMeta-Contract: die
    // verifizierte Antwort ist die EINZIGE Quelle, die diesen Eintrag deckt.
    TOK_LIST.push({ id: 'c-def', cgId: 'c-coin', tag: 'CDEF', nm: 'C', chain: 'sol', seed: 3 });
    _tokFetchLive('c-def', '1h');
    await new Promise(r => setTimeout(r, 900));
    return true;
  }, WIF);
  check('C1 · der Terminal-Abruf geht unter dem verifizierten Mint raus',
    peekRead().indexOf(WIF) >= 0, { read: peekRead(), cRead });

  /* ═══ D — TERMINAL-TRACK: def.mint SCHLAEGT DEN CG-CONTRACT ═══════════ */
  console.log('\n-- D · Terminal-Track nimmt den Schluessel, den er auch liest --');

  clear();
  /* USDC statt BONK: BONK ist in Abschnitt B bereits getrackt worden, und die
   * 10-Minuten-Drossel haette den Ping hier verschluckt — der Test waere an
   * seiner eigenen Vorgeschichte gescheitert, nicht am Code. */
  await page.evaluate(async ([mine, cgContract]) => {
    window.__v894 = { mints: {}, cg: {
      links: { homepage: ['https://example.invalid'] },
      genesis_date: '2024-01-01',
      community_data: {}, developer_data: {},
      platforms: { solana: cgContract } } };
    const def = { id: 'd-def', cgId: 'd-coin', tag: 'DDEF', nm: 'D', chain: 'sol', mint: mine, seed: 3 };
    TOK_LIST.push(def);
    await _tokFetchMeta(def);
  }, [USDC, JUPM]);
  await page.waitForTimeout(600);
  const dTrack = peekTracked();
  check('D1 · getrackt wird def.mint', dTrack.indexOf(USDC) >= 0, dTrack);
  check('D2 · NICHT der abweichende CoinGecko-Contract', dTrack.indexOf(JUPM) < 0, dTrack);

  /* ═══ E — DIE LISTE WAERMT DEN STORE (DECKEL + NACHRUECKEN) ══════════ */
  console.log('\n-- E · Listen-Tracking: Deckel und Nachruecken --');

  /* 25 frische Mints + eine EVM-Adresse. Der Deckel steht bei 20 ECHTEN
   * Pings; die zweite Runde muss die restlichen finden, sonst zaehlt das
   * Budget Zeilen statt Pings und die Liste kommt nie tiefer als Platz 20. */
  const AB58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const mkMints = (n) => {
    /* Jedes Zeichen MUSS aus dem base58-Alphabet stammen. Erste Fassung
     * dieser Zeile schob eine fuehrende Null aus padStart hinein — '0' gibt
     * es in base58 nicht, zwoelf der 25 Adressen fielen still durch
     * crIsSolanaMintAddress, und der Deckel-Test mass 13 statt 20. Genau die
     * Sorte Testfehler, die wie ein Codefehler aussieht. */
    const out = [];
    for(let i = 0; i < n; i++){
      let s = 'E' + AB58[i % AB58.length] + AB58[(i * 3 + 11) % AB58.length];
      while(s.length < 43) s += AB58[(i * 7 + s.length) % AB58.length];
      out.push(s);
    }
    return out;
  };
  const mints = mkMints(25);

  /* Ein Deckel „je Render" laesst sich nur an EINEM Render messen. Der
   * ALL-Tab stoesst beim ersten Zeichnen die CoinGecko-Top-500 an, und deren
   * Antwort zeichnet ein zweites Mal — die erste Fassung dieses Abschnitts
   * mass deshalb 25 statt 20 und haette den Deckel fuer kaputt erklaert.
   * Also: einmal LEER zeichnen, damit dieser Ladeversuch stattfindet und die
   * 15-Sekunden-Drossel des Spiels danach greift. Nichts gestubbt — es ist
   * die App, die sich hier selbst beruhigt. */
  await page.evaluate(() => {
    window.__renders = 0;
    const orig = _tokRenderList;
    window._tokRenderList = function(){ window.__renders++; return orig.apply(this, arguments); };
    TOK_LIST.length = 0;
    _tokState.activeTab = 'all'; _tokState.filter = '';
    _tokRenderList();
  });
  await page.waitForTimeout(1200);

  clear();
  await page.evaluate((ms) => {
    window.__renders = 0;
    window._tokMeta = window._tokMeta || {};
    TOK_LIST.length = 0;
    ms.forEach((m, i) => TOK_LIST.push({ id: 'e' + i, tag: 'E' + i, nm: 'E' + i, chain: 'sol', mint: m, seed: 2 + i }));
    _tokRenderList();
  }, mints);
  await page.waitForTimeout(600);
  const e1 = peekTracked();
  check('E0 · gemessen wurde GENAU EIN Render', await page.evaluate(() => window.__renders) === 1);
  check('E1 · ein Render trackt genau 20 neue Mints (Deckel greift)',
    e1.length === 20, { n: e1.length });
  check('E2 · alle 20 stammen aus der Liste und sind verschieden',
    new Set(e1).size === e1.length && e1.every(x => mints.indexOf(x) >= 0), e1.slice(0, 3));

  clear();
  await page.evaluate(() => { window.__renders = 0; _tokRenderList(); });
  await page.waitForTimeout(500);
  const e2 = peekTracked();
  check('E4 · der zweite Render rueckt nach (das Budget zaehlt Pings, keine Zeilen)',
    e2.length === 5 && e2.every(x => e1.indexOf(x) < 0), { n: e2.length, e2 });
  check('E4b · … und das waren alle 25', new Set(e1.concat(e2)).size === 25);

  clear();
  await page.evaluate(() => _tokRenderList());
  await page.waitForTimeout(500);
  check('E5 · der dritte Render ist still — die 10-Minuten-Drossel haelt',
    peekTracked().length === 0, peekTracked());

  /* ═══ F — KEINE EVM-ADRESSE UNTER chain 'sol' ════════════════════════ */
  console.log('\n-- F · die EVM-Zeile faellt durch das Alphabet, nicht durch den Deckel --');

  /* Eigene, KURZE Liste. Erste Fassung haengte die EVM-Zeile an die 25 Mints
   * aus E an — das Terminal sortiert seine Liste aber selbst, die Zeile lag
   * ausserhalb der ersten zwanzig, und die Pruefung blieb auch dann gruen,
   * wenn man crIsSolanaMintAddress aus dem Code strich. Sie prueft nur etwas,
   * wenn sie sicher IM Fenster liegt: drei Zeilen, Deckel 20, kein Gedraenge.
   * Dass crStoreMint die Adresse SEHR WOHL aufloest, steht daneben — sonst
   * bewiese das Ausbleiben des Pings nur, dass gar nichts da war. */
  const fMints = mkMints(2).map(x => 'F' + x.slice(1));
  clear();
  await page.evaluate(([ms, evm]) => {
    TOK_LIST.length = 0;
    window._tokMeta = window._tokMeta || {};
    TOK_LIST.push({ id: 'f-evm', tag: 'FEVM', nm: 'EVM', chain: 'evm', seed: 9 });
    window._tokMeta['f-evm'] = { contract: evm };
    ms.forEach((m, i) => TOK_LIST.push({ id: 'f' + i, tag: 'F' + i, nm: 'F' + i, chain: 'sol', mint: m, seed: 2 + i }));
    _tokRenderList();
  }, [fMints, EVM]);
  await page.waitForTimeout(600);
  const f1 = peekTracked(), fChains = peekChains();
  check('F1 · crStoreMint LOEST die EVM-Zeile auf (sonst bewiese F2 nichts)',
    await page.evaluate(e => crStoreMint({ id: 'f-evm' }) === e, EVM));
  check('F2 · beide Solana-Zeilen sind getrackt — das Fenster war gross genug',
    fMints.every(m => f1.indexOf(m) >= 0), { f1, fMints });
  check('F3 · die EVM-Adresse ist NICHT dabei, und keine Anfrage lief unter einer anderen Chain',
    f1.indexOf(EVM) < 0 && f1.length === 2 && fChains.every(c => c === 'sol'),
    { f1, chains: [...new Set(fChains)] });

  console.log('\n' + (fail === 0 ? 'ALLES GRUEN' : 'ROT') + ' — ' + pass + ' ok, ' + fail + ' fail');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
