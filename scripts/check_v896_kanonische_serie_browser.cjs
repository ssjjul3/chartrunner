/* Smoke-Verifikation v1.0.896 (S3) — KANONISCHE SERIE + TRUST-BADGE + PREIS-TAG.
 *
 * Diese Sandbox erreicht *.workers.dev nicht — geprueft wird deshalb der
 * CLIENT gegen GEMOCKTE Worker-Antworten (Playwright-Routen), nach dem
 * Live-Vertrag vom 31.08. (Julians Messung): /v1/ohlc traegt seit Store v5.15
 * ref{source,usd,age_s,block_id} + gated, /v1/price liefert prices{} +
 * missing[]. Was hier NICHT belegt wird und es auch nicht behauptet: dass der
 * ausgerollte Worker diese Form wirklich spricht — das misst Julian nach dem
 * Merge mit der Extension (Schritte im PR).
 *
 * Vier Abschnitte:
 *   1. Die drei puren Modelle (Resolver, Badge-Mapping, Preis-Tag) direkt.
 *   2. Kanonische Serie: sol-Mint mit gefuelltem Store → Chart laeuft auf
 *      ohlc-store, Badge sichtbar, Preis-Tag = ROHER price-String, und KEINE
 *      Drittquellen-Kerzenanfrage (GT/Birdeye/DexScreener) — auch nicht beim
 *      erzwungenen Live-Tick in die LAUFENDE Serie.
 *   3. Leerer Store: ehrlicher seeded-Zustand MIT Quelle, Badge aus, Preis-Tag
 *      „—" fuer einen missing-Mint — und die Drittquelle, die als Koeder
 *      gueltige Kerzen anbietet, wird trotzdem NIE gefragt.
 *   4. CEX-Chart (BTC/Binance): unveraendert, KEIN Jupiter-Badge, Preis-Tag
 *      bleibt kerzen-abgeleitet.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die
 * Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v896_kanonische_serie_browser.cjs
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

/* Echte Mainnet-Mints — eine erfundene Zeichenkette fiele durch
 * crIsSolanaMintAddress und der Test bliebe GRUEN aus dem falschen Grund. */
const LIVE = 'So11111111111111111111111111111111111111112';   // Store gefuellt, ref jupiter
const MISS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';   // Store leer, /v1/price missing
const PRICE_STR = '0.19684321';   // absichtlich mehr Stellen, als fmtPrice zeigen wuerde
const BLOCK = 361998877;

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  /* Anfrage-Zaehler: DER Mechanismus-Beweis dieses Auftrags. „Keine
   * Drittquelle im Chart" ist keine Label-Frage, sondern eine Frage danach,
   * WEN der Client fragt. */
  const reqs = [];
  const thirdPartyCandleReqs = () => reqs.filter(u => /geckoterminal|birdeye|dexscreener/i.test(u));
  const storeOhlcReqs = () => reqs.filter(u => /chartrunner-ohlc-store[^ ]*\/v1\/ohlc\//i.test(u));

  const fresh = () => {
    const now = Math.floor(Date.now() / 1000);
    const rows = [];
    for(let i = 29; i >= 0; i--){
      const t = now - i * 60;
      rows.push([t, 0.19, 0.20, 0.18, 0.196, 1000]);
    }
    return rows;
  };

  // Reihenfolge: catch-all ZUERST registrieren, spezifische Routen danach —
  // Playwright matcht zuletzt registrierte zuerst.
  await page.route('**://**', route => {
    const u = route.request().url();
    if(u.startsWith('file:')) return route.continue();
    reqs.push(u);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // Drittquellen-KOEDER: GT antwortet mit etwas, das wie brauchbare Kerzen
  // aussieht. Ein Client, der noch einen GT-Fallback hat, wuerde zugreifen —
  // und der Zaehler oben wuerde ihn nennen.
  await page.route('**geckoterminal**', route => {
    reqs.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: { attributes: { ohlcv_list: fresh().map(c => [c[0], c[1], c[2], c[3], c[4], c[5]]) } } }) });
  });
  await page.route('**chartrunner-ohlc-store**', route => {
    const u = route.request().url();
    reqs.push(u);
    if(u.includes('/v1/ohlc/' + LIVE)){
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ addr: LIVE, tf: '15m', n: 30, candles: fresh(),
          ref: { source: 'jupiter', usd: 0.1968, age_s: 8, block_id: BLOCK }, gated: 40 }) });
    }
    if(u.includes('/v1/ohlc/' + MISS)){
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ addr: MISS, tf: '15m', n: 0, candles: [], ref: { source: 'none' }, gated: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**chartrunner-tx**', route => {
    const u = route.request().url();
    reqs.push(u);
    if(u.includes('/v1/price')){
      const prices = {};
      if(u.includes(LIVE)) prices[LIVE] = { price: PRICE_STR, currency: 'usd', source: 'jupiter-price', age_s: 8 };
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ prices, missing: u.includes(MISS) ? [MISS] : [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // Binance liefert echte Klines — der CEX-Pfad ist ausdruecklich NICHT Teil
  // des Umbaus und muss unveraendert 'live · Binance' erreichen.
  await page.route('**api.binance.com/api/v3/klines**', route => {
    reqs.push(route.request().url());
    const now = Date.now();
    const rows = [];
    for(let i = 59; i >= 0; i--){
      const t = now - i * 900000;
      rows.push([t, '65000', '65100', '64900', '65050', '10', t + 899999, '0', 1, '0', '0', '0']);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);

  // ── 1) Die puren Modelle ─────────────────────────────────────────────────
  console.log('\n1) Resolver, Badge-Mapping, Preis-Tag-Modell (pur)');
  const models = await page.evaluate(([live, priceStr, block]) => {
    const r1 = window.crSeriesResolver(live);
    const r2 = window.crSeriesResolver({ id: 'btc', nm: 'BTC', sym: 'BTCUSDT' });   // CEX: kein Mint
    const bJup = window.crTrustBadgeModel({ source: 'jupiter', usd: 0.1968, age_s: 8, block_id: block }, 0);
    const bJupG = window.crTrustBadgeModel({ source: 'jupiter', usd: 0.1968, age_s: 8, block_id: block }, 40);
    const bMed = window.crTrustBadgeModel({ source: 'median' }, 0);
    const bMedG = window.crTrustBadgeModel({ source: 'median' }, 3);
    const bNone = window.crTrustBadgeModel({ source: 'none' }, 0);
    const bMissing = window.crTrustBadgeModel(undefined, 0);
    const pHit = window.crPriceTagModel({ prices: { [live]: { price: priceStr, age_s: 8 } }, missing: [] }, live);
    const pMiss = window.crPriceTagModel({ prices: {}, missing: [live] }, live);
    const pErr = window.crPriceTagModel({ error: 'offline' }, live);
    return { r1, r2, bJup, bJupG, bMed, bMedG, bNone, bMissing, pHit, pMiss, pErr };
  }, [LIVE, PRICE_STR, BLOCK]);
  check('Resolver: sol-Mint → serie ohlc-store', !!models.r1 && models.r1.serie === 'ohlc-store', models.r1);
  check('Resolver: sol-Mint → preis tx', !!models.r1 && models.r1.preis === 'tx', models.r1);
  check('Resolver: CEX-Asset ohne Mint → null (eigener Pfad)', models.r2 === null, models.r2);
  check('Badge jupiter nennt Deckung UND block_id',
        !!models.bJup && /deckt sich mit Jupiter/.test(models.bJup.text) && models.bJup.text.includes('block ' + BLOCK), models.bJup);
  check('Badge jupiter-Tooltip traegt usd-Referenz + age_s',
        !!models.bJup && /0\.1968/.test(models.bJup.tip) && /8s/.test(models.bJup.tip), models.bJup);
  check('gated=0 erfindet KEINE Kappung im Tooltip', !!models.bJup && !/gekappt/.test(models.bJup.tip), models.bJup);
  check('gated=40 steht im Tooltip („40 Kerzen ans Band gekappt")',
        !!models.bJupG && /40 Kerzen ans Band gekappt/.test(models.bJupG.tip), models.bJupG);
  check('Badge median: „~ interner Median (Jupiter-Referenz veraltet/fehlt)"',
        !!models.bMed && models.bMed.text === '~ interner Median (Jupiter-Referenz veraltet/fehlt)', models.bMed);
  check('gated versteckt sich auch beim median nicht', !!models.bMedG && /3 Kerzen ans Band gekappt/.test(models.bMedG.tip), models.bMedG);
  check('Badge none: „unbestätigt"', !!models.bNone && models.bNone.text === 'unbestätigt', models.bNone);
  check('fehlendes ref (aelterer Worker) → ehrlich „unbestätigt"', !!models.bMissing && models.bMissing.text === 'unbestätigt', models.bMissing);
  // Null-fest formuliert (Gegenprobe der ersten Fassung endete in CRASH statt
  // ROT — eine Zeile, die beim mutierten Rueckgabewert wirft, prueft das
  // Falsche): ein Modell, das gar keine Aussage liefert, ist genauso ein
  // Fehler wie die falsche Aussage.
  check('Preis-Tag zeigt den ROHEN price-String ($' + PRICE_STR + ', keine Rundung)',
        !!models.pHit && models.pHit.text === '$' + PRICE_STR, models.pHit);
  check('missing-Mint → „—" mit Tooltip „keine Jupiter-Referenz"',
        !!models.pMiss && models.pMiss.text === '—' && /keine Jupiter-Referenz/.test(models.pMiss.tip), models.pMiss);
  check('Worker-Ausfall → „—", NIE ein alter Wert als aktuell',
        !!models.pErr && models.pErr.text === '—' && !/Jupiter-Referenz$/.test(models.pErr.tip), models.pErr);

  // ── 2) Kanonische Serie: Store gefuellt ──────────────────────────────────
  console.log('\n2) sol-Mint, Store gefuellt → ohlc-store ist DIE Serie');
  reqs.length = 0;
  await page.evaluate((m) => {
    const a = window.crEnsureCustomSolanaToken(m);
    return window.switchAsset(a.id);
  }, LIVE);
  await page.waitForTimeout(2500);
  const s2 = await page.evaluate(() => ({
    src: String(window.crMarketSource || ''),
    live: window.crChartLive,
    badge: (function(){ const b = document.getElementById('crTrustBadge');
      return b ? { shown: getComputedStyle(b).display !== 'none', text: b.textContent, tip: b.title } : null; })(),
    px: (document.getElementById('lastPx') || {}).textContent,
    pxTip: (document.getElementById('lastPx') || {}).title,
  }));
  check('Serie laeuft auf dem ohlc-store (live · ChartRunner OHLC)', /ChartRunner OHLC/.test(s2.src), s2);
  check('crChartLive ist true (SCHARF-Vorbedingung bleibt konsistent)', s2.live === true, s2);
  check('Badge sichtbar: „✓ deckt sich mit Jupiter · block …"',
        !!s2.badge && s2.badge.shown && /deckt sich mit Jupiter/.test(s2.badge.text)
        && s2.badge.text.includes('block ' + BLOCK), s2.badge);
  check('Badge-Tooltip nennt die gekappten Kerzen (gated=40)',
        !!s2.badge && /40 Kerzen ans Band gekappt/.test(s2.badge.tip), s2.badge);
  check('Preis-Tag = ROHER tx-price-String (nicht fmtPrice-gerundet)',
        s2.px === '$' + PRICE_STR, { px: s2.px, erwartet: '$' + PRICE_STR });
  check('KEINE Drittquellen-Kerzenanfrage waehrend des Ladens', thirdPartyCandleReqs().length === 0, thirdPartyCandleReqs());
  check('der Store WURDE gefragt (der Zaehler zaehlt wirklich)', storeOhlcReqs().length >= 1, storeOhlcReqs().length);

  // Live-Tick in die LAUFENDE Serie: nur dieselbe Quelle.
  reqs.length = 0;
  await page.evaluate(() => window.crLiveFeed.tick(true));
  await page.waitForTimeout(1200);
  check('Live-Tick fragt NUR den ohlc-store (laufende Serie bleibt sortenrein)',
        storeOhlcReqs().length >= 1 && thirdPartyCandleReqs().length === 0,
        { store: storeOhlcReqs().length, fremd: thirdPartyCandleReqs() });

  // ── 3) Leerer Store: ehrlich statt Ersatzquelle ──────────────────────────
  console.log('\n3) sol-Mint, Store leer → ehrlicher Zustand, kein GT-Einsprung');
  reqs.length = 0;
  await page.evaluate((m) => {
    const a = window.crEnsureCustomSolanaToken(m);
    return window.switchAsset(a.id);
  }, MISS);
  await page.waitForTimeout(2500);
  const s3 = await page.evaluate(() => ({
    src: String(window.crMarketSource || ''),
    live: window.crChartLive,
    badge: (function(){ const b = document.getElementById('crTrustBadge');
      return b ? getComputedStyle(b).display !== 'none' : null; })(),
    px: (document.getElementById('lastPx') || {}).textContent,
    pxTip: (document.getElementById('lastPx') || {}).title,
    n: (typeof candles !== 'undefined') ? candles.length : -1,
  }));
  check('Label benennt die kanonische Quelle UND den Zustand',
        /ohlc-store leer\/nicht erreichbar/.test(s3.src) && /seeded \(NOT LIVE\)/.test(s3.src), s3.src);
  check('crChartLive ist false (SCHARF bleibt zu)', s3.live === false, s3);
  check('kein Trust-Badge auf einer Serie ohne Store-Antwort', s3.badge === false, s3);
  check('Preis-Tag „—" fuer den missing-Mint (kein Stale-Wert)', s3.px === '—', s3.px);
  check('„—" traegt den Grund als Tooltip', /keine Jupiter-Referenz/.test(s3.pxTip || ''), s3.pxTip);
  check('die Koeder-Drittquelle wurde NIE gefragt (Fallback-Versuch laeuft ins Leere)',
        thirdPartyCandleReqs().length === 0, thirdPartyCandleReqs());
  check('der Chart zeigt trotzdem eine (ehrlich gelabelte) Kurve', s3.n > 10, s3.n);

  // ── 4) CEX-Chart: unveraendert, kein Jupiter-Badge ───────────────────────
  console.log('\n4) BTC/Binance — eigener Pfad, eigenes Label, KEIN Badge');
  reqs.length = 0;
  await page.evaluate(() => window.switchAsset('btc'));
  await page.waitForTimeout(2000);
  const s4 = await page.evaluate(() => ({
    src: String(window.crMarketSource || ''),
    live: window.crChartLive,
    badge: (function(){ const b = document.getElementById('crTrustBadge');
      return b ? getComputedStyle(b).display !== 'none' : null; })(),
    px: (document.getElementById('lastPx') || {}).textContent,
  }));
  check('Binance-Serie laedt unveraendert', /live · Binance/.test(s4.src), s4.src);
  check('KEIN Jupiter-Badge auf einer CEX-Serie', s4.badge === false, s4);
  check('CEX-Preis-Tag bleibt kerzen-abgeleitet (fmtPrice, kein „—")',
        typeof s4.px === 'string' && s4.px.startsWith('$') && s4.px !== '—' && s4.px !== '$' + PRICE_STR, s4.px);

  console.log('\nJS-Fehler auf der Seite: ' + (errs.length ? JSON.stringify(errs.slice(0, 4)) : 'keine'));
  check('keine JS-Fehler', errs.length === 0, errs.slice(0, 4));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
