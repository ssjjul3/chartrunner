/* Smoke-Verifikation v1.0.913 — M0.5: ROUTE-/ORDER-SETTINGS ALS MOBILES BOTTOM-SHEET.
 *
 * Reine Praesentation: der TV-Settings-Dialog (#tvSettingsOverlay) — die EINE
 * Order-/Aktivierungs-Oberflaeche, die der M0-Order-Button ueber die Blue-Laser-
 * Route oeffnet — ist inline-gestylt mit min-width:540px und ragt auf einem
 * 390px-Viewport ueber beide Raender. Ein media-query-gegateter Style-Block
 * (#cr-mobile-route-sheet-v1) macht ihn <=560px zu einem randlosen Bottom-Sheet.
 * KEINE Logik-/DOM-Aenderung; Fire-Pfad (crWeiche/_fireLive) unberuehrt. Jede
 * scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die Mutation
 * + Ergebnis stehen in der Commit-Message.
 *
 *   1. MOBIL (390px): die Dialog-Karte liegt VOLLSTAENDIG im Viewport (kein
 *      Ueberlauf links/rechts), Breite <= Viewport, sitzt als Bottom-Sheet am
 *      unteren Rand (Backdrop align-items:flex-end), min-width auf 0 gesetzt.
 *   2. DESKTOP (1280px): unveraendert zentriert (align-items:center), min-width
 *      540px, NICHT volle Breite — die Media-Query greift nicht (Desktop unberuehrt).
 *   3. ORDER oeffnet NUR die Ansicht (Trade-Spion=0).
 *   4. TOPBAR <=5 / KEIN CANVAS-DIREKTZUGRIFF.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v913_route_sheet_browser.cjs
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

async function boot(browser, ctxOpts){
  const page = await browser.newPage(ctxOpts);
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.addInitScript(() => { try { localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done:true })); } catch(_){} });
  await page.route('**://**', route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    if(route.request().resourceType() === 'script')
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok:true, prices:{}, mints:{}, holdings:[], candles:[] }) });
  });
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    try { if(typeof hideSplash === 'function') hideSplash(); } catch(_){}
    try { const fr = document.getElementById('crFrPop'); if(fr) fr.classList.remove('on'); } catch(_){}
  });
  return { page, errs };
}

async function enterChart(page){
  await page.evaluate(() => {
    try { document.body.classList.remove('crSplashUp'); } catch(_){}
    try { restart(); } catch(_){}
    try { if(window.crTouch) crTouch.refresh(); } catch(_){}
  });
}

// Oeffnet die Route-/Order-Settings-Ansicht (dieselbe, die der Order-Button
// oeffnet) und misst die Dialog-Karte + Backdrop.
async function openAndMeasure(page){
  return page.evaluate(() => {
    try { closeTvSettingsDialog(); } catch(_){}
    window.crGuest = () => false;
    try {
      const price = (typeof currentPrice === 'function' && isFinite(currentPrice())) ? currentPrice() : 1;
      const overlay = { id: (Date.now()&0xffff), kind:'hline', py:price, wx:0, t:0, mobileOrder:true };
      const hit = { kind:'hline', overlay };
      if(window.cr && cr.blueLaser && typeof cr.blueLaser.openRouteSettings === 'function') cr.blueLaser.openRouteSettings(hit);
      else openTvSettingsDialog(overlay, { activeTab:'Inputs', blueRouteSettings:true, hit });
    } catch(_){}
    const bd = document.getElementById('tvSettingsOverlay');
    if(!bd) return { has:false };
    const card = bd.firstElementChild;
    const r = card.getBoundingClientRect();
    const bcs = getComputedStyle(bd), ccs = getComputedStyle(card);
    return {
      has:true, iw:window.innerWidth, ih:window.innerHeight,
      left:r.left, right:r.right, top:r.top, bottom:r.bottom, w:Math.round(r.width),
      align:bcs.alignItems, minW:ccs.minWidth, maxW:ccs.maxWidth
    };
  });
}

(async () => {
  const browser = await chromium.launch(launchOptions());

  // ── 0 · Quell-Scan (statisch) ──────────────────────────────────────────────
  console.log('\n-- 0 · Quell-Scan: Style-Block + Media-Query + Kernregeln --');
  const src = fs.readFileSync(FILE, 'utf8');
  const bStart = src.indexOf('<style id="cr-mobile-route-sheet-v1">');
  const bEnd = src.indexOf('</style>', bStart);
  const blk = (bStart >= 0 && bEnd > bStart) ? src.slice(bStart, bEnd) : '';
  check('Style-Block #cr-mobile-route-sheet-v1 vorhanden', blk.length > 200, { len: blk.length });
  check('Media-Query max-width:560px', /@media\s*\(max-width:\s*560px\)/.test(blk));
  check('Backdrop → Bottom-Sheet (align-items:flex-end)', /#tvSettingsOverlay\{[^}]*align-items:flex-end/.test(blk));
  check('Karte: min-width:0 + width:100% (kein 540er-Boden)',
    /#tvSettingsOverlay > div\{[\s\S]*?min-width:0[\s\S]*?width:100%/.test(blk));
  check('Karte: Bottom-Sheet-Radius + Safe-Area unten',
    /border-radius:14px 14px 0 0/.test(blk) && /padding-bottom:env\(safe-area-inset-bottom/.test(blk));
  check('Zwei-Spalten-Raster → eine Spalte',
    /\[style\*="repeat\(2,minmax\(0,1fr\)"\]\{ ?grid-template-columns:1fr/.test(blk));
  check('Banner meldet v1.0.913',
    /CURRENT VERSION: v1\.0\.913/.test(src));

  // ── 1 · MOBIL: Karte vollstaendig im Viewport, Bottom-Sheet ─────────────────
  console.log('\n-- 1 · Mobil (390px): Karte im Viewport, Bottom-Sheet --');
  const M = await boot(browser, { viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  const hardM = M.errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors (mobil)', hardM.length === 0, hardM.slice(0,3));
  await enterChart(M.page);
  const m = await openAndMeasure(M.page);
  check('Dialog geoeffnet (#tvSettingsOverlay im DOM)', m.has === true, m);
  check('Mobil: Karte NICHT links abgeschnitten (left ≥ 0)', m.has && m.left >= -0.5, m);
  check('Mobil: Karte NICHT rechts abgeschnitten (right ≤ Viewport-Breite)', m.has && m.right <= m.iw + 0.5, m);
  check('Mobil: Karten-Breite ≤ Viewport (kein Ueberlauf)', m.has && m.w <= m.iw + 0.5, m);
  check('Mobil: Bottom-Sheet — Backdrop align-items:flex-end', m.has && m.align === 'flex-end', m);
  check('Mobil: Karte sitzt am unteren Rand (bottom ≈ Viewport-Hoehe)', m.has && m.bottom >= m.ih - 4, m);
  check('Mobil: min-width auf 0 ueberschrieben (kein 540er-Boden)', m.has && parseFloat(m.minW) === 0, m);
  await M.page.close();

  // ── 2 · DESKTOP: unveraendert zentriert, min-width 540 (Media-Query greift nicht) ─
  console.log('\n-- 2 · Desktop (1280px): unveraendert zentriert, min-width 540 --');
  const D = await boot(browser, { viewport:{ width:1280, height:900 } });
  await enterChart(D.page);
  const d = await openAndMeasure(D.page);
  check('Dialog geoeffnet (Desktop)', d.has === true, d);
  check('Desktop: zentriert (align-items:center) — unberuehrt', d.has && d.align === 'center', d);
  check('Desktop: min-width bleibt 540px', d.has && parseFloat(d.minW) === 540, d);
  check('Desktop: NICHT volle Breite (Media-Query greift nicht)', d.has && d.w >= 540 && d.w < d.iw, d);

  // ── 3 · ORDER oeffnet NUR die Ansicht (kein Trade) ──────────────────────────
  console.log('\n-- 3 · Order oeffnet nur die Ansicht (Trade-Spion=0) --');
  const spy = await D.page.evaluate(() => {
    window.__calls = 0; let installed = false;
    try {
      ChartRunner.sdk.setRealSDK({
        marketSwap: () => { window.__calls++; return Promise.resolve({ sig:'X' }); },
        limitVault: () => { window.__calls++; return Promise.resolve({ orderPubkey:'Y' }); },
      });
      installed = true;
    } catch(_){}
    try { closeTvSettingsDialog(); } catch(_){}
    const price = (typeof currentPrice === 'function' && isFinite(currentPrice())) ? currentPrice() : 1;
    const overlay = { id:1, kind:'hline', py:price, wx:0, t:0, mobileOrder:true };
    const hit = { kind:'hline', overlay };
    const dlg0 = !!document.getElementById('tvSettingsOverlay');
    let opened = false;
    try { opened = !!cr.blueLaser.openRouteSettings(hit); } catch(_){ }
    const dlg1 = !!document.getElementById('tvSettingsOverlay');
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Route-Settings oeffnen legt NUR die Ansicht an (kein Trade)',
    spy.dlg0 === false && spy.dlg1 === true && spy.calls === 0, spy);

  // ── 4 · TOPBAR / CANVAS ─────────────────────────────────────────────────────
  console.log('\n-- 4 · Topbar / kein Canvas-Direktzugriff --');
  const dom = await D.page.evaluate(() => {
    const bd = document.getElementById('tvSettingsOverlay');
    const inCanvas = !!(bd && bd.closest && bd.closest('canvas'));
    const bar = document.getElementById('crOSBar');
    const barBtns = bar ? bar.querySelectorAll('.cr-bar-btn').length : -1;
    return { inCanvas, barBtns };
  });
  check('Dialog nicht im Canvas', dom.inCanvas === false, dom);
  check('Topbar bleibt bei ≤5 Kommandos', dom.barBtns <= 5, dom);
  await D.page.close();

  console.log('\n== v913 ROUTE-SHEET: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
