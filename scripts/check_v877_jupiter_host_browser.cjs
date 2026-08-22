/* Smoke-Verifikation fuer v1.0.877 — der Jupiter-Host steht an EINER Stelle.
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

// ── Echte Messung, 22.08.2026, 1 SOL → BONK, slippageBps=50 ─────────────────
const REAL = {
  inputMint: SOL, inAmount: '1000000000', outputMint: BONK,
  outAmount: '2854700000000', otherAmountThreshold: '2840426500000',
  swapMode: 'ExactIn', slippageBps: 50, platformFee: null, priceImpactPct: '0',
  routePlan: [
    { swapInfo: { ammKey: '8FnX3xo2yYw3EUE6w3nQA4GfXGS9wpK6oj3veJpbFzLo', label: 'BisonFi',
      inputMint: SOL, outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      inAmount: '1000000000', outAmount: '94118746' }, percent: 100 },
    { swapInfo: { ammKey: '5ZWCKP2E8LqTUmo98xhq1YELjcqvxpNsv4xfzVbKGswc', label: 'Scorch',
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', outputMint: BONK,
      inAmount: '94118746', outAmount: '2854700000000' }, percent: 100 },
  ],
  contextSlot: 440983692, timeTaken: 0.008347043, swapUsdValue: '94.1150778961712',
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
    if(/\/quote\?/.test(url) && /inputMint=/.test(url))
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
  check('der Host steht GENAU EINMAL als Literal', lit('lite-api.jup.ag') === 1, lit('lite-api.jup.ag'));
  check('CR_JUP_BASE ist zur Laufzeit da',
    await page.evaluate(() => typeof CR_JUP_BASE === 'string' && /lite-api/.test(CR_JUP_BASE)));

  console.log('\n-- crQuote fragt den richtigen Host --');
  const before = seen.length;
  const res = await page.evaluate(([a, b]) =>
    crQuote.quote({ inMint: a, outMint: b, amountRaw: 1e9, slippageBps: 50 }), [SOL, BONK]);
  const q = seen.slice(before).filter(u => /\/quote\?/.test(u));
  check('genau eine Abfrage', q.length === 1, q);
  check('gegen lite-api', /lite-api\.jup\.ag/.test(q[0] || ''), q[0]);
  check('auf dem Pfad /swap/v1/quote', /\/swap\/v1\/quote\?/.test(q[0] || ''), q[0]);
  check('nichts ging an quote-api', !seen.some(u => /quote-api\.jup\.ag/.test(u)));
  check('Parameter unveraendert',
    /inputMint=So111/.test(q[0] || '') && /amount=1000000000/.test(q[0] || '')
      && /slippageBps=50/.test(q[0] || ''), q[0]);

  console.log('\n-- Die echte Antwort wird richtig gelesen --');
  check('kein Fehler', !res.error, res.error);
  check('outAmount durchgereicht', res.outAmountRaw === '2854700000000', res.outAmountRaw);
  check('inAmount durchgereicht', res.inAmountRaw === '1000000000', res.inAmountRaw);
  check('Preisauswirkung ist eine Zahl', res.priceImpactPct === 0, res.priceImpactPct);
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
