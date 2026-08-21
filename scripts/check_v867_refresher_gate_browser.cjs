/* Smoke-Verifikation fuer v1.0.867 (Sichtbarkeits-Gate, Negativ-Cache, Pyth).
 *
 * Laeuft headless gegen die Einzeldatei, jeder Netzabruf wird abgefangen —
 * es geht nichts nach draussen. Der Kern ist kein Unit-Test, sondern eine
 * MESSUNG: es wird gezaehlt, wie viele Abrufe ein Tab erzeugt, der offen
 * steht, ohne dass jemand das Terminal geoeffnet hat.
 *
 * Aufruf:  npm i playwright && node scripts/check_v867_refresher_gate_browser.cjs
 * Bewusst nicht in ci.yml — der CI-Job hat keinen Browser.
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

const CF_HOSTS = [
  'chartrunner-data-proxy.jsg-951.workers.dev',
  'chartrunner-ohlc-store.jsg-951.workers.dev',
  'chartrunner-worker.jsg-951.workers.dev',
];

function launchOptions(){
  const opts = { headless: true };
  const candidates = [process.env.CR_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for(const d of fs.readdirSync(root)){
      if(d.startsWith('chromium-')) candidates.push(path.join(root, d, 'chrome-linux', 'chrome'));
    }
  } catch(_){}
  for(const c of candidates){ if(c && fs.existsSync(c)){ opts.executablePath = c; break; } }
  return opts;
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String((e && e.message) || e)));

  let hits = {};
  const hermesHits = [];
  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    let h = '?';
    try { h = new URL(url).host; } catch(_){}
    hits[h] = (hits[h] || 0) + 1;
    if(/\/hermes\/|hermes\.pyth\.network/.test(url)) hermesHits.push(url);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  console.log('\n-- Boot --');
  const hard = pageErrors.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors beim Boot', hard.length === 0, hard.slice(0, 3));
  // Bewusst gegen die BANNER-Zeile, nicht gegen irgendein Vorkommen im
  // Dokument: sonst wuerde schon ein Codekommentar mit der Versionsnummer
  // den Test gruen faerben, ohne dass die Version wirklich hochgezogen ist.
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())){ if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue; }
    return '';
  });
  check('Banner meldet CURRENT VERSION: v1.0.867', /CURRENT VERSION:\s*v1\.0\.867/.test(banner),
    banner.slice(0, 80));

  console.log('\n-- Sichtbarkeits-Gate --');
  // Boot-Welle abwarten und verwerfen, dann die Dauerlast messen.
  await page.waitForTimeout(12000);
  hits = {};
  const WIN_S = 45;
  await page.waitForTimeout(WIN_S * 1000);
  const cfTotal = CF_HOSTS.reduce((a, h) => a + (hits[h] || 0), 0);
  const perDay = Math.round(cfTotal / WIN_S * 86400);
  console.log('       gemessen: ' + cfTotal + ' Worker-Abrufe in ' + WIN_S + 's  →  ' + perDay + '/Tag');
  // Vor v1.0.867: ~171.000/Tag (data-proxy inkl. Verdopplung + ohlc-store).
  // Danach gemessen: ~11.000/Tag, Rest sind Poller ausserhalb des crTerm-
  // Herzschlags (crLive-Whales 90s, LP-Balance 180s, Watchlist-Painter).
  // Die Schwelle ist bewusst grob: sie soll einen Rueckfall fangen, nicht
  // eine Zahl zementieren.
  check('geschlossenes Terminal bleibt unter 25.000 Worker-Abrufen/Tag', perDay < 25000, { perDay });

  const diag = await page.evaluate(() => {
    try { window.crTermForceTick(); } catch(_){}
    return JSON.parse(JSON.stringify(window._crTermDiag && window._crTermDiag.lastForceTick || {}));
  });
  check('Force-Tick feuert bei geschlossenem Terminal keinen Refresher', diag.fired === 0, diag);
  check('Force-Tick zaehlt die uebersprungenen Panes', (diag.noBody || 0) > 10, diag);

  console.log('\n-- Sichtbarkeit kehrt zurueck --');
  // Panes sichtbar machen und pruefen, dass wieder geladen wird. Ohne diesen
  // Test waere „null Abrufe" trivial erfuellbar — durch ein kaputtes Gate.
  const fired = await page.evaluate(async () => {
    const w = document.getElementById('win-terminal');
    if(w){ w.classList.add('on'); w.style.display = 'block'; w.style.visibility = 'visible'; w.style.opacity = '1'; }
    try { if(window.crTermTagPanes) window.crTermTagPanes(); } catch(_){}
    await new Promise(r => setTimeout(r, 300));
    try { window.crTermForceTick(); } catch(_){}
    await new Promise(r => setTimeout(r, 400));
    return JSON.parse(JSON.stringify(window._crTermDiag && window._crTermDiag.lastForceTick || {}));
  });
  check('sichtbares Terminal feuert wieder Refresher', (fired.fired || 0) > 0, fired);

  console.log('\n-- Negativ-Cache (_tokFetchLive) --');
  const miss = await page.evaluate(async () => {
    const before = window.__cnt || 0;
    // Zwei Aufrufe kurz hintereinander auf einen Token ohne Daten: der zweite
    // darf keinen neuen Fan-out ausloesen.
    const id = (typeof TOK_LIST !== 'undefined' && TOK_LIST.find(t => t.chain === 'sol')) ? TOK_LIST.find(t => t.chain === 'sol').id : 'sol';
    await _tokFetchLive(id, '1h');
    await new Promise(r => setTimeout(r, 250));
    const marker = (typeof _tokLiveMiss !== 'undefined') ? Object.keys(_tokLiveMiss).length : -1;
    const second = await _tokFetchLive(id, '1h');
    return { marker, second: second === null || second === undefined, before };
  });
  check('leere Antwort wird als Fehlschlag gemerkt', miss.marker > 0, miss);
  check('zweiter Aufruf innerhalb der Sperre liefert null statt neuem Fan-out', miss.second, miss);

  console.log('\n-- Pyth / Hermes --');
  const pyth = await page.evaluate(() => {
    const out = { threw: false, kind: typeof _tokPythInflight, ttl: (typeof _TOK_PYTH_TTL_MS !== 'undefined') ? _TOK_PYTH_TTL_MS : null };
    try { _tokFetchPyth(['sol']); } catch(e){ out.threw = true; out.msg = String(e && e.message || e); }
    return out;
  });
  check('_tokFetchPyth wirft nicht mehr (const → let)', pyth.threw === false, pyth);
  check('TTL auf 30s angehoben', pyth.ttl === 30000, pyth);
  await page.waitForTimeout(600);
  check('Hermes wird tatsaechlich abgerufen', hermesHits.length > 0, { hermesHits: hermesHits.length });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
