/* Smoke-Verifikation fuer v1.0.876 — die Vorschau ist nicht der Handel.
 *
 * Anlass ist ein Live-Befund: im Token-Profil stand „Kursabfrage nicht
 * erreichbar", und der Handel-Knopf war weg. Nicht weil mit dem Handel etwas
 * war — crQuote zeigt auf quote-api.jup.ag/v6, einen Host, den Jupiter
 * abgeschaltet hat. Der Knopf wurde nur im Erfolgszweig gezeichnet, also hat
 * eine kaputte Auskunft eine funktionierende Kette versteckt.
 *
 * Der Test RUFT die Funktion auf, statt ihr Markup zu lesen. Beim Bauen war
 * _tokEscA ein const INNERHALB von _tokRenderProfile — der Aufruf haette einen
 * ReferenceError geworfen, den weder Parse-Check noch Kollisions-Check sehen.
 * Ein Test, der nur nach Zeichenketten sucht, haette ihn ebenfalls nicht
 * gesehen.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v876_tradeability_browser.cjs
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

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.route('**://**', r => r.request().url().startsWith('file:')
    ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
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
  check('Banner meldet mindestens v1.0.876',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 876)))),
    banner.slice(0, 60));

  /* AUFRUFEN, nicht Markup lesen. Ein ReferenceError faellt nur hier auf. */
  const render = (q) => page.evaluate(([q, mint]) => {
    try { return { html: _crTradeabilityHtml(q, mint) }; }
    catch(e){ return { err: String((e && e.message) || e) }; }
  }, [q, BONK]);

  console.log('\n-- Die Funktion laeuft ueberhaupt --');
  const okCase = await render({ priceImpactPct: 0.0023, hops: 1, labels: ['Orca'] });
  check('Erfolgsfall wirft nicht', !okCase.err, okCase.err);
  const offCase = await render({ error: 'offline' });
  check('Ausfall wirft nicht', !offCase.err, offCase.err);
  const nullCase = await render(null);
  check('null wirft nicht', !nullCase.err, nullCase.err);

  console.log('\n-- Der Handel haengt nicht an der Vorschau --');
  for(const [name, q] of [['Ausfall', { error: 'offline' }],
                          ['keine Route', { error: 'no-route' }],
                          ['ausgelastet', { error: 'rate-limited' }],
                          ['gar keine Antwort', null]]){
    const r = await render(q);
    const h = r.html || '';
    check(name + ' → Handel-Knopf ist da', /data-cr-swap="/.test(h), r.err || h.slice(0, 80));
    check(name + ' → Deckel-Probe ist da', /data-cr-cap-probe="/.test(h));
    check(name + ' → Tafel ist da', /data-cr-swap-panel="/.test(h));
  }

  console.log('\n-- Und die Vorschau sagt, was ihr fehlt --');
  const off = (await render({ error: 'offline' })).html || '';
  check('nennt den Ausfall', /Kursabfrage nicht erreichbar/.test(off), off.slice(0, 120));
  check('sagt, dass NUR die Vorschau fehlt', /Nur die Vorschau fehlt/.test(off));
  check('sagt, dass der Handel seine Zahlen selbst holt', /Zahlen selbst/.test(off));
  const noRoute = (await render({ error: 'no-route' })).html || '';
  check('unterscheidet „keine Route" vom Ausfall',
    /keine Handelsroute/.test(noRoute) && !/nicht erreichbar/.test(noRoute), noRoute.slice(0, 120));

  console.log('\n-- Erfolgsfall unveraendert --');
  const ok = (await render({ priceImpactPct: 0.0512, hops: 2, labels: ['Orca', 'Raydium'] })).html || '';
  /* v1.0.885 — dieselbe Aussage, deutsches Format: die Zeile benutzt jetzt
   * _crFmtImpact, damit hier und in der Handels-Tafel nicht zwei
   * Prozent-Formatierer nebeneinander stehen. */
  check('Preisauswirkung steht da', /5,12\s%/.test(ok), ok.slice(0, 160));
  /* Und der Zustand, den es vor v885 nicht gab: fehlt das Feld, wird daraus
   * keine gemessene Null mehr. */
  const ohneImp = (await render({ hops: 1, labels: ['Orca'] })).html || '';
  check('fehlende Preisauswirkung sagt „nicht bekannt", nicht 0',
    /nicht bekannt/.test(ohneImp) && !/0,000\s%/.test(ohneImp), ohneImp.slice(0, 200));
  check('Route steht da', /Orca, Raydium/.test(ok));
  check('kein Ausfall-Hinweis im Erfolgsfall', !/Nur die Vorschau fehlt/.test(ok));
  check('auch hier die Knoepfe', /data-cr-swap="/.test(ok) && /data-cr-cap-probe="/.test(ok));

  console.log('\n-- Escaping wirkt wirklich --');
  const evil = await page.evaluate(() =>
    _crTradeabilityHtml({ error: 'offline' }, '"><img src=x onerror=alert(1)>'));
  check('Anfuehrungszeichen im Mint werden entschaerft',
    !/<img/.test(evil) && /&quot;/.test(evil), evil.slice(0, 200));

  console.log('\n-- Eine Quelle fuer das Markup --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('data-cr-swap= steht genau EINMAL in der Datei',
    (src.match(/data-cr-swap="/g) || []).length === 1,
    (src.match(/data-cr-swap="/g) || []).length);
  check('_tokEscA ist genau EINMAL definiert',
    (src.match(/(function|const|let|var)\s+_tokEscA\b/g) || []).length === 1,
    (src.match(/(function|const|let|var)\s+_tokEscA\b/g) || []));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
