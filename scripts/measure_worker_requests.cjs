/* Misst, wie viele Netzabrufe EIN offener ChartRunner-Tab erzeugt.
 *
 * Hintergrund (v1.0.867): Am 21.08.2026 meldete Cloudflare 90 % des
 * Tageslimits fuer Workers-Requests (100.000/Tag). Der Verdacht fiel zuerst
 * auf die Helius-Ingestion — falsch. Der Verursacher war das Spiel selbst:
 * der crTerm-Refresher-Herzschlag lief ueber alle 43 Panes, ohne zu pruefen,
 * ob ueberhaupt jemand hinschaut.
 *
 * Dieses Skript ersetzt Schaetzungen durch eine Messung. Jeder Abruf wird
 * abgefangen (es geht NICHTS nach draussen, kein fremdes Kontingent wird
 * verbrannt) und nach Host gezaehlt.
 *
 * Aufruf:
 *   npm i playwright
 *   node scripts/measure_worker_requests.cjs                  # 90s ab Boot
 *   WARM_S=90 WIN_S=180 node scripts/measure_worker_requests.cjs   # Dauerlast
 *
 * WARM_S verwirft die Boot-Welle und misst erst danach — das ist die Zahl,
 * die zaehlt, denn ein Tab steht stundenlang offen und bootet einmal.
 *
 * Wichtig zur Einordnung: die Mocks antworten mit leerem JSON. Fuer Tokens
 * ohne Daten war das vor v1.0.867 KEIN kuenstlicher Effekt, sondern genau der
 * Fehler (_tokFetchLive schrieb Fehlschlaege nicht in den Cache und feuerte
 * deshalb bei jedem Painter-Tick erneut). Seit v1.0.867 greift der
 * Negativ-Cache. Vergleiche daher immer VORHER/NACHHER mit demselben Aufbau,
 * statt die Absolutzahl fuer sich zu nehmen.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
const WINDOW_S = Number(process.env.WIN_S || 90);
const WARM_S = Number(process.env.WARM_S || 0);

/* Alles, was gegen unser Cloudflare-Request-Budget zaehlt. */
const CF_HOSTS = [
  'chartrunner-data-proxy.jsg-951.workers.dev',
  'chartrunner-ohlc-store.jsg-951.workers.dev',
  'chartrunner-worker.jsg-951.workers.dev',
  'chartrunner-trace.jsg-951.workers.dev',
  'chartrunner-agent-bridge.jsg-951.workers.dev',
];
/* Der data-proxy leitet Birdeye/CoinGecko an chartrunner-worker weiter —
 * jeder Client-Abruf kostet dort ZWEI Worker-Requests. */
const DOUBLE_BILLED = 'chartrunner-data-proxy.jsg-951.workers.dev';

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
  const byHost = {};

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    let h = '?';
    try { h = new URL(url).host; } catch(_){}
    byHost[h] = (byHost[h] || 0) + 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if(WARM_S){
    await page.waitForTimeout(WARM_S * 1000);
    for(const k of Object.keys(byHost)) delete byHost[k];
  }
  const t0 = Date.now();
  await page.waitForTimeout(WINDOW_S * 1000);
  const secs = (Date.now() - t0) / 1000;
  await browser.close();

  const perDay = n => Math.round(n / secs * 86400);
  console.log('Messfenster ' + secs.toFixed(0) + 's' + (WARM_S ? ' (nach ' + WARM_S + 's Warmlauf)' : ' ab Boot')
    + ' · Terminal nie geoeffnet · Tab im Vordergrund\n');

  let cf = 0;
  console.log('Cloudflare Workers (zaehlt gegen das Request-Budget):');
  CF_HOSTS.forEach(h => {
    const n = byHost[h] || 0;
    if(!n) return;
    const billed = (h === DOUBLE_BILLED) ? n * 2 : n;
    cf += billed;
    console.log('  ' + String(perDay(n)).padStart(8) + '/Tag  ' + h
      + (h === DOUBLE_BILLED ? '   (×2 durch Weiterleitung an chartrunner-worker)' : ''));
  });
  console.log('  ' + String(perDay(cf)).padStart(8) + '/Tag  SUMME abgerechnet\n');

  console.log('Fremde APIs (kein CF-Budget, aber eigene Rate-Limits):');
  Object.entries(byHost)
    .filter(([h]) => !CF_HOSTS.includes(h))
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([h, n]) => console.log('  ' + String(perDay(n)).padStart(8) + '/Tag  ' + h));

  const LIMIT = Number(process.env.CR_REQ_BUDGET || 0);
  if(LIMIT){
    const ok = perDay(cf) <= LIMIT;
    console.log('\nBudget ' + LIMIT.toLocaleString('de-DE') + '/Tag  →  ' + (ok ? 'OK' : 'UEBERSCHRITTEN'));
    process.exit(ok ? 0 : 1);
  }
})().catch(e => { console.error(e); process.exit(1); });
