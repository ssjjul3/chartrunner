/* Smoke-Verifikation fuer v1.0.877 — der Quote-Host steht an EINER Stelle.
 *
 * v1.0.891 NACHGEZOGEN. Die Absicht dieses Tests ist unveraendert und weiter
 * gueltig: EINE Stelle nennt den Host, die Parameter gehen unveraendert
 * hinaus, die Antwort wird richtig gelesen, und die Tafel zeigt sie. Was sich
 * geaendert hat, ist der Host — v891 hat die Abfrage hinter den eigenen
 * Worker gezogen (GET /v1/quote), weil lite-api von Jupiter selbst abgeloest
 * wurde und als Fremdquelle im Browser lief. Der Test prueft dieselbe Sache
 * am neuen Ort; ohne diese Nachfuehrung wuerde er die alte Welt einfordern
 * und rot bleiben, obwohl nichts kaputt ist.
 *
 * ZUR HERKUNFT DER ZAHLEN, weil dieser Test genau darauf besteht: die
 * Betraege, Labels und Hops unten sind WEITER die echte Messung vom
 * 22.08.2026 (1 SOL → BONK). Was NICHT gemessen ist, ist die FORM, in der
 * unser Worker sie ausliefert — beide Sandboxes erreichen *.workers.dev
 * nicht (403 auf CONNECT). Die Form ist der Vertrag aus dem Auftrag, und sie
 * ist als solche gekennzeichnet, nicht als Messwert.
 *
 * Vorgeschichte: der Client nannte ZWEI Hosts fuer denselben Zweck — crQuote
 * quote-api.jup.ag/v6, die Terminal-Sonde lite-api. Einer zog um, der andere
 * blieb stehen und starb, und im Profil stand nur „Kursabfrage nicht
 * erreichbar".
 *
 * Gemessen am 22.08.2026 aus einem echten Netz (Telefon, Brave):
 *   quote-api.jup.ag → ERR_NAME_NOT_RESOLVED
 *   lite-api.jup.ag  → 200 mit vollstaendiger Antwort
 *
 * WICHTIG: das Fixture unten ist die ECHTE gemessene Antwort, Wort fuer Wort
 * aus dem Browser uebernommen — keine nachgebaute. Genau daran ist diese Woche
 * schon einmal ein gruener Test ueber einem echten Bug gestanden: ein Mock,
 * gebaut nach der Annahme seines Autors. Ein Fixture, das aus der Wirklichkeit
 * kommt, kann diesen Fehler nicht machen.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v877_jupiter_host_browser.cjs
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

const SOL  = 'So11111111111111111111111111111111111111112';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

/* ── Die Messung vom 22.08.2026 (1 SOL → BONK, slippageBps=50), gereicht in
 * der FORM, die unser Worker laut Vertrag liefert.
 *
 * Zahlen = gemessen. Feldnamen = Vertrag (tx v1.15), nicht gemessen — siehe
 * Kopfkommentar. Die Trennung steht hier ausdruecklich, damit niemand die
 * eine Haelfte fuer die andere haelt: genau dieser Test ist aus dem Aerger
 * darueber entstanden, dass ein nachgebauter Mock ueber einem echten Bug
 * gruen stand. */
const REAL = {
  ok: true,
  quote: {
    in_raw: '1000000000', out_raw: '2854700000000', min_out_raw: '2840426500000',
    slippage_bps: 50, price_impact_pct: '0',
  },
  route: { hops: 2, labels: ['BisonFi', 'Scorch'] },
};

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  const seen = [];
  await page.route('**://**', route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    if(/\/v1\/quote\?/.test(url) && /input_mint=/.test(url))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REAL) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

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
  check('Banner meldet mindestens v1.0.877',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 877)))),
    banner.slice(0, 60));

  console.log('\n-- Der tote Host ist weg --');
  /* Gesucht wird der Host IN ANFUEHRUNGSZEICHEN — also als String-Literal, das
   * wirklich aufgerufen wird. Prosa in Kommentaren und im Banner nennt ihn
   * weiterhin, und das soll sie auch: dort steht, warum er weg ist.
   * (Erster Versuch war ein <!--[\s\S]*?--> ueber 6,2 MB. Das lief minutenlang
   * und hat den Test aufgehaengt, nicht die Datei.) */
  const src = fs.readFileSync(FILE, 'utf8');
  const lit = (host) => (src.match(new RegExp("['\"]https://" + host.replace(/\./g, '\\.'), 'g')) || []).length;
  check('quote-api.jup.ag wird nirgends mehr aufgerufen', lit('quote-api.jup.ag') === 0, lit('quote-api.jup.ag'));
  /* v1.0.891 — auch lite-api ist jetzt weg, nicht nur sein Vorgaenger. Der
   * Quote-Host ist der eigene Worker, und ER steht genau einmal als Literal. */
  check('lite-api.jup.ag wird nirgends mehr aufgerufen', lit('lite-api.jup.ag') === 0, lit('lite-api.jup.ag'));
  check('der Quote-Host steht GENAU EINMAL als Literal',
    lit('chartrunner-tx.jsg-951.workers.dev') === 1, lit('chartrunner-tx.jsg-951.workers.dev'));
  check('CR_TX_API ist zur Laufzeit da',
    await page.evaluate(() => typeof CR_TX_API === 'string' && /chartrunner-tx/.test(CR_TX_API)));
  check('CR_JUP_BASE gibt es nicht mehr',
    await page.evaluate(() => typeof CR_JUP_BASE === 'undefined'));

  console.log('\n-- crQuote fragt den richtigen Host --');
  const before = seen.length;
  const res = await page.evaluate(([a, b]) =>
    crQuote.quote({ inMint: a, outMint: b, amountRaw: 1e9, slippageBps: 50 }), [SOL, BONK]);
  const q = seen.slice(before).filter(u => /\/v1\/quote\?/.test(u));
  check('genau eine Abfrage', q.length === 1, q);
  check('gegen den eigenen Worker', /chartrunner-tx\.jsg-951\.workers\.dev/.test(q[0] || ''), q[0]);
  check('auf dem Pfad /v1/quote', /\/v1\/quote\?/.test(q[0] || ''), q[0]);
  check('nichts ging an jup.ag — weder quote-api noch lite-api',
    !seen.some(u => /jup\.ag/.test(u)), seen.filter(u => /jup\.ag/.test(u)).slice(0, 3));
  check('Parameter unveraendert (nur die Schreibweise des Vertrags)',
    /input_mint=So111/.test(q[0] || '') && /amount_raw=1000000000/.test(q[0] || '')
      && /slippage_bps=50/.test(q[0] || ''), q[0]);

  console.log('\n-- Die echte Antwort wird richtig gelesen --');
  check('kein Fehler', !res.error, res.error);
  check('outAmount durchgereicht', res.outAmountRaw === '2854700000000', res.outAmountRaw);
  check('inAmount durchgereicht', res.inAmountRaw === '1000000000', res.inAmountRaw);
  check('Preisauswirkung ist eine Zahl', res.priceImpactPct === 0, res.priceImpactPct);
  check('Mindest-Erhalt durchgereicht (v891)', res.minOutRaw === '2840426500000', res.minOutRaw);
  check('zwei Hops erkannt', res.hops === 2, res.hops);
  check('Routen-Labels gelesen',
    Array.isArray(res.labels) && res.labels.join(',') === 'BisonFi,Scorch', res.labels);
  check('bleibt ausdruecklich nicht ausfuehrbar', res.executable === false);

  console.log('\n-- Und die Tafel zeigt es --');
  const html = await page.evaluate(([r, m]) => _crTradeabilityHtml(r, m), [res, BONK]);
  check('Preisauswirkung steht im Profil', /Preisauswirkung/.test(html), html.slice(0, 120));
  check('Route steht im Profil', /BisonFi, Scorch/.test(html));
  check('kein Ausfall-Hinweis', !/Nur die Vorschau fehlt/.test(html));
  check('Handel-Knopf ist da', /data-cr-swap="/.test(html));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
