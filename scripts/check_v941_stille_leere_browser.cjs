/* Smoke-Verifikation v1.0.941 — "nichts laeuft mehr still leer".
 *
 * Geprueft werden die vier Flaechen, die nach dem Wegfall der Birdeye-
 * Gegenstelle STILL leer liefen (Zustand C aus dem Auftrag):
 *   1. Token-Fenster: Marktkapitalisierung / FDV / 24h-Volumen zeigen einen
 *      Strich statt gesaetem Zufall — und eine ECHTE DexScreener-Zahl wird
 *      dadurch NICHT versteckt (die Gegenrichtung ist Teil der Pruefung).
 *   2. Gesamt-Score sagt "teilweise geschaetzt", wenn er auf erfundenen
 *      Eingaben steht — und sagt es NICHT, wenn alle drei gemessen sind.
 *   3. Terminal: die Live-Daten-Flaechen tragen keinen erfundenen Koerper
 *      mehr, verschwinden bei Ausfall nicht, sondern sagen "no source".
 *      Die strukturell privaten Flaechen blenden unveraendert aus.
 *   4. Alarme: eine Sicherheits-Regel ohne Verdikt sagt das, statt auf
 *      "noch nicht geprueft" stehenzubleiben — und feuert NICHT.
 *
 * Alle Netzabrufe werden auf {} gestubbt: genau die Lage nach dem Wegfall
 * der Gegenstelle (Antwort da, Nutzlast leer).
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(n, c, x){ if(c){ pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } }
function launchOptions(){
  const o = { headless: true };
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-')) o.executablePath = path.join(root, d, 'chrome-linux', 'chrome'); } catch(_){}
  return o;
}
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.addInitScript((mint) => {
    /* v1.0.941 — ein Testschluessel fuer die on-chain-Quelle. Ohne ihn ist
     * solHolders schon VOR dem Abruf als privat archiviert, der Refresher
     * laeuft nie, und die Zeile "blendet unveraendert aus" war damit wahr,
     * egal was _crTermArchiveProviderFailure tut — sie prueft dann nichts.
     * Mit Schluessel laeuft der Abruf, scheitert an der leeren Antwort und
     * geht durch genau die Stelle, deren Enge hier belegt werden soll. */
    try { localStorage.setItem('cr_goldrush_key_v1', 'test-key-fuer-die-gegenprobe'); } catch(_){}
    try {
      localStorage.setItem('cr_alert_rules_v1', JSON.stringify([{
        id: 't1', tokenId: 'bonk', symbol: 'BONK', mint: mint,
        type: 'safety', threshold: 0, channels: { app: true }, recurring: false,
        status: 'armed', createdAt: Date.now(), lastChecked: 0, lastValue: null,
        lastFiredAt: 0, mapId: '', mapName: '',
      }]));
    } catch(_){}
  }, BONK);
  // Jede Fremdantwort ist leer — die Lage nach dem Wegfall der Gegenstelle.
  await page.route('**://**', r => r.request().url().startsWith('file:')
    ? r.continue()
    : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // ── 1+2. Token-Fenster: ohne Quelle Striche, mit Quelle Zahlen ──────────
  const tok = await page.evaluate(() => {
    const read = () => (document.getElementById('crTokProfile').innerText || '').replace(/\s+/g, ' ');
    const grid = (t) => {
      const m = t.match(/Market cap(.*?)Liquidity/);
      return m ? m[1] : '';
    };
    const out = {};
    _tokState.selectedId = 'bonk';
    for(const k in _tokLiveCache) delete _tokLiveCache[k];
    window._tokMeta = {};
    _tokRenderProfile();
    const dry = read();
    out.dryGrid = grid(dry);
    out.dryEst = /partly estimated/.test(dry);
    // Gegenrichtung: echte DexScreener-Werte duerfen NICHT versteckt werden.
    window._tokMeta = { bonk: { mcDex: 1.6e9, fdvDex: 1.9e9, volDex: 3.2e8, liqDex: 4.4e7 } };
    _tokRenderProfile();
    const wet = read();
    out.wetGrid = grid(wet);
    out.wetEst = /partly estimated/.test(wet);
    return out;
  });
  console.log('Token-Fenster');
  check('Marktkapitalisierung / FDV / 24h-Volumen ohne Quelle: drei Striche, keine Zahl',
    !/\$/.test(tok.dryGrid) && (tok.dryGrid.match(/—/g) || []).length >= 3, tok.dryGrid);
  check('Gesamt-Score nennt sich ohne Quelle teilweise geschaetzt', tok.dryEst === true);
  check('echte DexScreener-Zahlen werden NICHT versteckt', /\$1\.60B/.test(tok.wetGrid) && /\$1\.90B/.test(tok.wetGrid) && /\$320\.00M/.test(tok.wetGrid), tok.wetGrid);
  check('mit allen drei Quellen faellt der Geschaetzt-Hinweis weg', tok.wetEst === false);

  // ── 3. Terminal ────────────────────────────────────────────────────────
  const staticBodies = await page.evaluate(() => {
    const o = {};
    ['solPrice', 'solTopTokens', 'solTrending'].forEach(id => {
      const pane = document.querySelector('.crTerm-pane[data-pane-id="' + id + '"]');
      o[id] = pane ? (pane.querySelector('.crTerm-paneBd').textContent || '') : null;
    });
    return o;
  });
  console.log('Terminal — Ausgangskoerper');
  check('solPrice traegt keinen erfundenen Kurs', !/\$\d/.test(staticBodies.solPrice), staticBodies.solPrice);
  check('solTopTokens traegt keine erfundene Tabelle', !/\$\d/.test(staticBodies.solTopTokens), staticBodies.solTopTokens);
  check('solTrending traegt keine erfundene Tabelle', !/%/.test(staticBodies.solTrending), staticBodies.solTrending);

  await page.evaluate(() => {
    const w = document.getElementById('win-terminal'); w.classList.add('on'); w.style.display = 'block';
    document.getElementById('crTermViewSolana').classList.remove('hidden');
    window.crTermForceTick();
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.crTermForceTick());
  await page.waitForTimeout(3000);
  const panes = await page.evaluate(() => {
    const o = {};
    ['solPrice', 'solTopTokens', 'solTrending', 'solHolders', 'solPumpfun'].forEach(id => {
      const pane = document.querySelector('.crTerm-pane[data-pane-id="' + id + '"]');
      o[id] = pane ? {
        disp: pane.style.display,
        tag: (pane.querySelector('.hd-tag') || {}).textContent,
        bd: (pane.querySelector('.crTerm-paneBd').textContent || '').replace(/\s+/g, ' ').trim(),
      } : null;
    });
    return o;
  });
  console.log('Terminal — nach dem Ausfall');
  ['solPrice', 'solTopTokens', 'solTrending'].forEach(id => {
    check(id + ' bleibt sichtbar (verschwindet nicht)', panes[id] && panes[id].disp !== 'none', panes[id]);
    check(id + ' sagt "no source"', panes[id] && panes[id].tag === 'no source', panes[id] && panes[id].tag);
    check(id + ' sagt im Koerper, dass die Quelle weg ist', panes[id] && /retired|abgeschaltet|retirada|停用/.test(panes[id].bd), panes[id] && panes[id].bd);
  });
  /* Regressionszeilen, und nicht mehr als das: sie belegen, dass die
   * strukturell privaten Flaechen weiter ausblenden. Sie belegen NICHT die
   * Enge des neuen Zweigs (provider === 'live data' && !onFailure) — die
   * Gegenprobe hat gezeigt, dass eine Mutation dieser Bedingung hier GRUEN
   * bleibt. Grund: solHolders & Co. werden schon VOR dem Abruf archiviert
   * (_crTermPrivateOpsReason vergleicht provider === 'on-chain', die Karte
   * sagt aber 'on-chain data' — ein eigener Befund, siehe BACKLOG), also
   * erreicht keine Nicht-Live-Daten-Flaeche den neuen Zweig ueberhaupt. */
  check('Regression: strukturell private Flaeche bleibt ausgeblendet (solHolders)', panes.solHolders && panes.solHolders.disp === 'none', panes.solHolders);
  check('Regression: strukturell private Flaeche bleibt ausgeblendet (solPumpfun)', panes.solPumpfun && panes.solPumpfun.disp === 'none', panes.solPumpfun);

  // ── 4. Alarme ──────────────────────────────────────────────────────────
  const al = await page.evaluate(async () => {
    const o = {};
    o.before = crAlertEngine.list().map(r => r.lastValue);
    await crAlertEngine.checkNow();
    const r = crAlertEngine.list()[0] || {};
    o.lastValue = r.lastValue; o.status = r.status; o.fired = !!r.lastFiredAt;
    try { crAlertEngine.render(); } catch(_){}
    const v = document.getElementById('crDocsViewAlerts');
    o.html = v ? v.innerHTML : '';
    return o;
  });
  console.log('Alarme');
  check('Sicherheits-Regel bleibt nicht auf null stehen', al.lastValue && al.lastValue !== null, al.lastValue);
  check('Sicherheits-Regel benennt den Ausfall', /unavailable|nicht verfügbar|no disponible|不可用/.test(String(al.lastValue || '')), al.lastValue);
  check('Sicherheits-Regel feuert NICHT (fehlendes Verdikt ist kein Befund)', al.fired === false && al.status === 'armed', { fired: al.fired, status: al.status });
  check('die Zeile zeigt den Ausfall in Bernstein', /#ffd166[^>]*>— [^<]*(unavailable|nicht verfügbar|no disponible|不可用)/.test(al.html));

  check('keine Seitenfehler', errs.length === 0, errs.slice(0, 3));
  console.log('\n' + pass + ' ok, ' + fail + ' FAIL');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
