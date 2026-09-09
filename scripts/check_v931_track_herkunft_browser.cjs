/* Smoke-Verifikation v1.0.931 — HERKUNFT DES TRACK-PINGS ('seen' vs 'opened').
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI: der Spion sitzt auf dem
 * NETZ (page.route), nicht auf crOhlcTrack. Ein Spion auf der Funktion bewiese
 * nur, dass jemand sie mit dem richtigen dritten Argument ruft — der Worker
 * sieht aber die URL, und genau die ist der Vertrag mit „Helius B · WORKER":
 *
 *     GET /v1/track/<chain>/<addr>?src=seen        billig, DexScreener-Sampler
 *     GET /v1/track/<chain>/<addr>?src=opened      teuer, darf ein Abo ausloesen
 *
 * BEFUND, gegen den hier geprueft wird: die Warm-up-Schleife in _tokRenderList
 * meldet bis zu 20 Mints je Render, die Liste rendert bei jedem Preistick, und
 * damit war last_hit im Store bei zehn Mints dauerhaft sekundenaktuell — die
 * 900-Sekunden-Frist des Workers konnte nie ablaufen.
 *
 * Jede Pruefung MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Zehn Renders von _tokRenderList -> NULL Anfragen mit src=opened.
 *      Gegenzeuge in derselben Pruefung: es sind sehr wohl seen-Pings
 *      rausgegangen — sonst waere die Null nur die Abwesenheit von allem.
 *  T2  Chart laden -> GENAU EIN src=opened, und zwar fuer den geladenen Mint.
 *  T3  Token-Profil oeffnen -> genau ein src=opened fuer diesen Mint;
 *      eine Listenzeile bloss AUFLOESEN (_tokFetchMeta ohne Herkunft) ->
 *      kein opened, aber ein seen (sonst bewiese das Ausbleiben nichts).
 *  T4  Abwaertskompatibel: crOhlcTrack ohne drittes Argument traegt src=seen
 *      und faellt in DENSELBEN Drossel-Topf wie ein ausdrueckliches 'seen'
 *      (kein dritter, stiller Topf).
 *  T5  Ein seen unmittelbar VOR einem opened verhindert das opened nicht.
 *  T6  Die 10-Minuten-Drossel lebt weiter, je Herkunft: das zweite opened
 *      derselben Adresse geht NICHT raus. Plus Regression im Quelltext.
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet. Jede Mutation wurde einzeln in
 * ChartRunner_Prototype.html eingebaut, die Suite lief, danach hat
 * `git checkout` wiederhergestellt. Keine davon war CRASH: der Lauf ging
 * jedes Mal durch, „keine harten Page-Errors" blieb gruen, und rot wurde nur
 * das, was die Zeile behauptet.
 *
 *   M1  Warm-up-Schleife 'seen' -> 'opened'
 *       ROT: T1a, T1b, T1c, T1d  (21 gruen). Alle vier haengen an derselben
 *       Zeile: ohne seen-Pings ist auch der Gegenzeuge weg.
 *   M2  Chart-Stelle: drittes Argument gestrichen (wieder Zwei-Argument-Form)
 *       ROT: T2a  (24 gruen)
 *   M3  _tokFetchMeta reicht nicht durch, sondern sendet fest 'opened'
 *       ROT: T3c  (24 gruen) — T3a bleibt gruen, das Profil ist ja weiter
 *       richtig; rot wird genau die bloss aufgeloeste Zeile.
 *   M4  crOhlcTrack: Vorgabe ohne drittes Argument auf 'opened'
 *       ROT: T4a, T4b, T4c  (22 gruen). T4a faellt mit, weil dann ZWEI
 *       Anfragen zu derselben Adresse rausgehen statt einer.
 *   M5  Drossel-Schluessel ohne Herkunft (var tk = k)
 *       ROT: T5b  (24 gruen) — das opened 100 ms nach dem seen bleibt aus,
 *       also genau der Ping, auf den es ankommt.
 *
 * Aufruf:  node scripts/check_v931_track_herkunft_browser.cjs
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
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x).slice(0, 600) : '')); }
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

/* Echte base58-Adressen. Eine erfundene Zeichenkette mit '0' oder 'l' faellt
 * durch crIsSolanaMintAddress und wuerde die Listenzeilen still ueberspringen
 * — GRUEN aus dem falschen Grund (der Fehler ist v894 schon passiert). */
const AB58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function mkMints(n, tagChar){
  const out = [];
  for(let i = 0; i < n; i++){
    let s = (tagChar || 'A') + AB58[i % AB58.length] + AB58[(i * 3 + 11) % AB58.length];
    while(s.length < 43) s += AB58[(i * 7 + s.length) % AB58.length];
    out.push(s);
  }
  return out;
}
const LIST_MINTS = mkMints(25, 'L');     // T1 — die Liste
const CHART_MINT = mkMints(1, 'C')[0];   // T2 — der Chart
const PROF_MINT  = mkMints(1, 'P')[0];   // T3a — das geoeffnete Profil
const ROW_MINT   = mkMints(1, 'R')[0];   // T3b — die bloss aufgeloeste Zeile
const COMPAT     = mkMints(1, 'K')[0];   // T4 — Aufruf ohne drittes Argument
const ORDER      = mkMints(1, 'S')[0];   // T5 — seen vor opened

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
    const cfg = await page.evaluate(() => window.__v931 || {}).catch(() => ({}));
    if(/\/v1\/track\//.test(url))        return J({ ok: true });
    if(/\/v1\/ohlc\//.test(url))         return J({ ok: true, candles: [] });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok: true, mints: {} });
    if(/\/v1\/price/.test(url))          return J({ ok: true, prices: {} });
    if(/\/coins\//.test(url))            return J(cfg.cg || {});
    if(/dexscreener/.test(url))          return J({ pairs: [] });
    if(/\/health/.test(url))             return J({ ok: true, version: 'tx v1.15' });
    return J({});
  });

  await page.addInitScript(() => { try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){} });
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  /* DER SPION LIEST DIE URL, NICHT DEN AUFRUF. src wird ausdruecklich als
   * null gemeldet, wenn der Parameter FEHLT — „fehlt" und „steht auf seen"
   * duerfen sich hier nicht stillschweigend zu demselben Befund mischen. */
  const parse = (u) => ({
    chain: (u.match(/\/v1\/track\/([^/]+)\//) || [])[1] || '',
    addr: decodeURIComponent((u.match(/\/v1\/track\/[^/]+\/([^/?]+)/) || [])[1] || ''),
    src: (u.match(/[?&]src=([^&]*)/) || [])[1] || null,
    url: u
  });
  const peek = () => seen.filter(u => /\/v1\/track\//.test(u)).map(parse);
  const opened = () => peek().filter(t => t.src === 'opened');
  const seenPings = () => peek().filter(t => t.src === 'seen');
  const clear = () => { seen.length = 0; };

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  check('crOhlcTrack ist erreichbar',
    await page.evaluate(() => typeof crOhlcTrack === 'function'));
  check('der Store ist ueberhaupt eingeschaltet (sonst pingt nichts und alles waere gruen)',
    await page.evaluate(() => !!CR_OHLC_BASE));

  /* ═══ T4 — ABWAERTSKOMPATIBEL: OHNE ARGUMENT IST 'seen' ══════════════ */
  console.log('\n-- T4 · ohne drittes Argument gilt seen --');
  clear();
  const t4 = await page.evaluate(async (a) => {
    const first = crOhlcTrack('sol', a);                 // alter Aufruf, zwei Argumente
    await new Promise(r => setTimeout(r, 250));
    const again = crOhlcTrack('sol', a, 'seen');         // derselbe Topf?
    return { first, again };
  }, COMPAT);
  await page.waitForTimeout(300);
  const t4t = peek().filter(t => t.addr === COMPAT);
  check('T4a der alte Zwei-Argument-Aufruf geht ueberhaupt raus', t4.first === true && t4t.length === 1, { t4, t4t });
  check('T4b … und traegt src=seen', t4t.length === 1 && t4t[0].src === 'seen', t4t);
  check('T4c ein ausdrueckliches seen faellt in DENSELBEN Drossel-Topf (kein dritter, stiller Topf)',
    t4.again === false && peek().filter(t => t.addr === COMPAT).length === 1, { t4, n: peek().filter(t => t.addr === COMPAT).length });

  /* ═══ T5 — EIN seen DARF EIN opened NICHT WEGDROSSELN ════════════════ */
  console.log('\n-- T5 · seen unmittelbar vor opened --');
  clear();
  const t5 = await page.evaluate(async (a) => {
    const s = crOhlcTrack('sol', a, 'seen');
    await new Promise(r => setTimeout(r, 100));
    const o = crOhlcTrack('sol', a, 'opened');           // 100 ms spaeter, gleiche Adresse
    return { s, o };
  }, ORDER);
  await page.waitForTimeout(300);
  const t5t = peek().filter(t => t.addr === ORDER);
  check('T5a das seen geht raus', t5.s === true && t5t.some(t => t.src === 'seen'), t5t);
  check('T5b das opened 100 ms spaeter geht AUCH raus — die Drossel zaehlt je Herkunft',
    t5.o === true && t5t.filter(t => t.src === 'opened').length === 1, { t5, t5t });

  /* ═══ T6a — DIE DROSSEL LEBT (je Herkunft) ══════════════════════════ */
  console.log('\n-- T6a · die 10-Minuten-Drossel haelt je Herkunft --');
  clear();
  const t6 = await page.evaluate(a => crOhlcTrack('sol', a, 'opened'), ORDER);
  await page.waitForTimeout(250);
  check('T6a das ZWEITE opened derselben Adresse geht nicht raus',
    t6 === false && peek().length === 0, { t6, n: peek().length });

  /* ═══ T1 — ZEHN LISTEN-RENDERS, KEIN EINZIGES opened ════════════════ */
  console.log('\n-- T1 · zehn Renders der Token-Liste --');
  /* Der ALL-Tab stoesst beim ersten Zeichnen die CoinGecko-Top-500 an, und
   * deren Antwort zeichnet ein zweites Mal. Einmal LEER zeichnen, damit
   * dieser Ladeversuch stattfindet und die 15-Sekunden-Drossel greift —
   * sonst misst der Abschnitt fremde Renders mit. */
  await page.evaluate(() => {
    TOK_LIST.length = 0;
    _tokState.activeTab = 'all'; _tokState.filter = '';
    _tokState.selectedId = null;             // KEIN Profil offen: nur die Liste
    _tokRenderList();
  });
  await page.waitForTimeout(1200);
  clear();
  await page.evaluate(async (ms) => {
    TOK_LIST.length = 0;
    ms.forEach((m, i) => TOK_LIST.push({ id: 'l' + i, tag: 'L' + i, nm: 'L' + i, chain: 'sol', mint: m, seed: 2 + i }));
    for(let r = 0; r < 10; r++){ _tokRenderList(); await new Promise(x => setTimeout(x, 60)); }
  }, LIST_MINTS);
  await page.waitForTimeout(900);
  const listOpened = opened(), listSeen = seenPings();
  check('T1a die Liste hat ueberhaupt gepingt (sonst bewiese die Null nichts)',
    listSeen.length > 0 && listSeen.every(t => LIST_MINTS.indexOf(t.addr) >= 0),
    { n: listSeen.length });
  check('T1b … und zwar ALLE 25 Zeilen ueber die zehn Renders (der Deckel rueckt nach)',
    new Set(listSeen.map(t => t.addr)).size === 25, { verschieden: new Set(listSeen.map(t => t.addr)).size });
  check('T1c NULL Anfragen mit src=opened — eine gerenderte Zeile ist kein geoeffneter Token',
    listOpened.length === 0, listOpened.slice(0, 3));
  check('T1d jede Anfrage der Liste traegt eine Herkunft (keine ohne src)',
    peek().length > 0 && peek().every(t => t.src === 'seen'), peek().filter(t => t.src !== 'seen').slice(0, 3));

  /* ═══ T2 — CHART LADEN ══════════════════════════════════════════════ */
  console.log('\n-- T2 · Chart laden --');
  clear();
  await page.evaluate(async (m) => {
    const a = crEnsureCustomSolanaToken(m);
    await switchAsset(a.id);
  }, CHART_MINT).catch(() => {});
  await page.waitForTimeout(1500);
  const chartOpened = opened();
  check('T2a genau EIN src=opened, und zwar fuer den geladenen Mint',
    chartOpened.length === 1 && chartOpened[0].addr === CHART_MINT && chartOpened[0].chain === 'sol',
    chartOpened);

  /* ═══ T3 — PROFIL OEFFNEN vs. LISTENZEILE AUFLOESEN ═════════════════ */
  console.log('\n-- T3 · Profil oeffnen vs. Zeile aufloesen --');
  clear();
  await page.evaluate(async (m) => {
    window.__v931 = { cg: { links: { homepage: ['https://example.invalid'] },
                            genesis_date: '2024-01-01',
                            community_data: {}, developer_data: {}, platforms: {} } };
    TOK_LIST.length = 0;                      // die 25 Listen-Mints raus, sonst steuern
                                              // ihre Zeilen eigene seen-Pings bei
    TOK_LIST.push({ id: 'p-def', tag: 'PDEF', nm: 'P', chain: 'sol', mint: m, seed: 3 });
    _tokState.selectedId = 'p-def';
    _tokRenderProfile();                      // DAS ist „Profil geoeffnet"
  }, PROF_MINT);
  await page.waitForTimeout(1500);
  const profOpened = opened().filter(t => t.addr === PROF_MINT);
  check('T3a Profil oeffnen -> genau ein src=opened fuer diesen Mint',
    profOpened.length === 1, { profOpened, alle: opened() });

  clear();
  const t3b = await page.evaluate(async (m) => {
    const def = { id: 'r-def', tag: 'RDEF', nm: 'R', chain: 'sol', mint: m, seed: 4 };
    TOK_LIST.push(def);
    await _tokFetchMeta(def, m);              // Zeile AUFLOESEN, ohne Herkunft
    return true;
  }, ROW_MINT);
  await page.waitForTimeout(900);
  const rowTracks = peek().filter(t => t.addr === ROW_MINT);
  check('T3b die aufgeloeste Zeile pingt ueberhaupt (sonst bewiese T3c nichts)',
    rowTracks.length === 1, { rowTracks, t3b });
  check('T3c … und zwar als seen, NICHT als opened',
    rowTracks.length === 1 && rowTracks[0].src === 'seen', rowTracks);

  console.log('\n-- Regression --');
  check('T6b keine harten Page-Errors ueber den ganzen Lauf',
    errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m)).length === 0,
    errs.slice(0, 3));
  await browser.close();

  const bv = (HTML.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('T6c Banner meldet mindestens v1.0.931',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || bv[2] >= 931))), bv);
  ['armedGlobal','source.armed','badgeGate','walletCanSign'].forEach(g =>
    check('T6d Tor „' + g + '" steht weiter im Quelltext', HTML.indexOf(g) >= 0));
  check('T6e crVaultLimit / crOnchainLimit und die beiden ARM-Speicher unveraendert',
    /crVaultLimit/.test(HTML) && /crOnchainLimit/.test(HTML)
    && /'cr_arm_v1'/.test(HTML) && /'cr_arm_limit_v1'/.test(HTML));
  check('T6f single-file: kein statisches <script src="http…">',
    (HTML.match(/<script[^>]*\bsrc="https?:/gi) || []).length === 0);

  console.log('\n' + (fail === 0 ? 'ALLE ' + pass + ' PRUEFUNGEN GRUEN' : fail + ' FEHLGESCHLAGEN, ' + pass + ' gruen'));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e && e.stack ? e.stack : e); process.exit(2); });
