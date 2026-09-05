/* Smoke-Verifikation v1.0.909 — M0.1: TOUCH-CONTROLS FEINSCHLIFF.
 *
 * Reiner Polish an der in M0 gebauten Touch-Steuerungsschicht — NUR Sichtbar-
 * keit/Position/Optik. KEINE Logik-Aenderung: die Buttons loesen exakt dieselben
 * Aktionen aus wie vor M0.1. Geprueft wird, was Wahrheit kostet, wenn es fehlt;
 * jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md) — die
 * Mutationen + Ergebnis stehen in der Commit-Message.
 *
 *   1. CHART-ONLY: die Schicht ist NUR im Chart-View (game.running) sichtbar;
 *      auf der OS-Oberflaeche (kein Run ⇒ Home/Profil/Terminal/Token) und auf
 *      dem Splash (crSplashUp) versteckt.
 *   2. SAFE-AREA: der untere Anker enthaelt env(safe-area-inset-bottom) + einen
 *      komfortablen Mindestabstand; kein Control ragt unter die sichtbare
 *      Flaeche; Hoehe ueber svh.
 *   3. TREFFERFLAECHE: jedes Aktions-Control (HK1–HK4, Order, Stick-Chip) ist
 *      effektiv ≥ 44 px.
 *   4. PARITAET UNVERAENDERT: Taste vs. On-Screen-Button rufen dieselbe Funktion
 *      mit demselben Argument; der Real-Adapter-Spion feuert bei KEINEM Element.
 *   5. DESKTOP UNBERUEHRT: auf Nicht-Touch existiert kein Layer, autoMoveAxis()
 *      liefert 0, ein update()-Lauf ohne Eingabe bewegt den Runner NICHT.
 *   6. REDUCED-MOTION / TOPBAR ≤5 / KEIN CANVAS-DIREKTZUGRIFF.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v909_touch_polish_browser.cjs
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

// Bringt die Seite deterministisch ins Chart-View (Run laeuft, kein Splash).
async function enterChart(page){
  await page.evaluate(() => {
    try { document.body.classList.remove('crSplashUp'); } catch(_){}
    try { restart(); } catch(_){}
    try { crTouch.refresh(); } catch(_){}
  });
}

(async () => {
  const browser = await chromium.launch(launchOptions());

  // ── Quell-Scan (statisch): der Polish fasst den Trade-Pfad nicht an. ───────
  console.log('\n-- 0 · Quell-Scan: crTouch-Modul beruehrt den Trade-Pfad nicht --');
  const src = fs.readFileSync(FILE, 'utf8');
  const mStart = src.indexOf('window.crTouch = (function(){');
  const mEnd = src.indexOf('\n})();', mStart);
  const mod = (mStart >= 0 && mEnd > mStart) ? src.slice(mStart, mEnd) : '';
  check('crTouch-Modul im Quelltext gefunden', mod.length > 500, { len: mod.length });
  check('Modul enthaelt KEIN marketSwap/limitVault/triggerCreate/quote (kein Trade-Code)',
    mod.length > 500 && !/marketSwap|limitVault|triggerCreate|\bquote\b/i.test(mod));
  // Safe-Area + svh sind im injizierten CSS verankert (Quell-Scan, geht ROT wenn entfernt).
  check('CSS: unterer Anker nutzt env(safe-area-inset-bottom)', /env\(safe-area-inset-bottom/.test(mod), { has: /env\(safe-area-inset-bottom/.test(mod) });
  check('CSS: Hoehe ueber svh (nicht nur vh)', /height:100svh/.test(mod), { has: /height:100svh/.test(mod) });
  check('CSS: reduced-motion-Guard vorhanden', /@media \(prefers-reduced-motion: no-preference\)/.test(mod));

  // ── Touch-Kontext ─────────────────────────────────────────────────────────
  const T = await boot(browser, { viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  console.log('\n-- Boot (Touch) --');
  const hard = T.errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await T.page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.909',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 909)))), bv);

  // ── 1 · CHART-ONLY ─────────────────────────────────────────────────────────
  console.log('\n-- 1 · Chart-only: nur im Chart sichtbar --');
  const co = await T.page.evaluate(() => {
    const l = () => document.getElementById('crTouchLayer');
    // (a) Boot-Zustand: kein Run (OS-Desktop) → versteckt.
    try { if(typeof game !== 'undefined') game.running = false; } catch(_){}
    try { document.body.classList.remove('crSplashUp'); } catch(_){}
    try { crTouch.refresh(); } catch(_){}
    const built = !!l();
    const hiddenDesktop = !!(l() && l().hidden);
    // (b) im Chart (game.running) → sichtbar.
    try { document.body.classList.remove('crSplashUp'); restart(); crTouch.refresh(); } catch(_){}
    const visibleChart = !!(l() && !l().hidden);
    // (c) Splash über dem laufenden Run → versteckt.
    try { document.body.classList.add('crSplashUp'); crTouch.refresh(); } catch(_){}
    const hiddenSplash = !!(l() && l().hidden);
    // (d) zurück in den Run für die folgenden Layout-Messungen.
    try { document.body.classList.remove('crSplashUp'); crTouch.refresh(); } catch(_){}
    return { built, hiddenDesktop, visibleChart, hiddenSplash, active: !!(window.crTouch && crTouch.active) };
  });
  check('Touch: crTouch.active === true', co.active === true, co);
  check('Chart-only: OS-Desktop (kein Run) → Layer versteckt', co.hiddenDesktop === true, co);
  check('Chart-only: im Chart (game.running) → Layer sichtbar', co.visibleChart === true, co);
  check('Chart-only: Splash über laufendem Run → Layer versteckt', co.hiddenSplash === true, co);

  // ── 2 · SAFE-AREA ──────────────────────────────────────────────────────────
  console.log('\n-- 2 · Safe-Area: unterste Reihe ueber der System-Leiste --');
  await enterChart(T.page);
  const sa = await T.page.evaluate(() => {
    const dock = document.getElementById('crTouchDock');
    const move = document.getElementById('crTouchMove');
    const order = document.getElementById('crTouchOrder');
    const layer = document.getElementById('crTouchLayer');
    const csDock = getComputedStyle(dock).bottom;
    const csMove = getComputedStyle(move).bottom;
    const dockBottomPx = parseFloat(csDock) || 0;
    const moveBottomPx = parseFloat(csMove) || 0;
    const lift = getComputedStyle(layer).getPropertyValue('--cr-tl-lift').trim();
    const orderRect = order.getBoundingClientRect();
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    return { csDock, csMove, dockBottomPx, moveBottomPx, lift,
             orderBottom: orderRect.bottom, vh };
  });
  // env(safe-area-inset-bottom) ist headless 0 → Anker == Mindestabstand (20px).
  check('Safe-Area: Dock-Bottom ≥ Mindestabstand (16px)', sa.dockBottomPx >= 16, sa);
  check('Safe-Area: Move-Bottom ≥ Mindestabstand (16px)', sa.moveBottomPx >= 16, sa);
  check('Safe-Area: --cr-tl-lift definiert (env + Mindestwert)', /env\(safe-area-inset-bottom|calc\(|\dpx/.test(sa.lift) && sa.lift.length > 0, sa);
  check('Safe-Area: unterster Button (Order) ragt NICHT unter die sichtbare Flaeche',
    sa.orderBottom <= sa.vh + 0.5, sa);

  // ── 3 · TREFFERFLAECHE ─────────────────────────────────────────────────────
  console.log('\n-- 3 · Trefferflaeche jedes Controls ≥ 44px --');
  const hit = await T.page.evaluate(() => {
    // verbunden, damit HK3/HK4 sichtbar sind; Stick AN, damit der Chip da ist.
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    const sel = ['[data-cr-hk="1"]','[data-cr-hk="2"]','[data-cr-hk="3"]','[data-cr-hk="4"]','#crTouchOrder','#crTouchStickChip'];
    const out = [];
    for(const s of sel){
      const el = document.querySelector(s);
      if(!el){ out.push({ s, missing:true }); continue; }
      const r = el.getBoundingClientRect();
      out.push({ s, w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
  for(const c of hit){
    check('≥44px effektiv: ' + c.s, !c.missing && c.w >= 44 && c.h >= 44, c);
  }

  // ── 4 · PARITAET UNVERAENDERT ──────────────────────────────────────────────
  console.log('\n-- 4 · Paritaet unveraendert (Taste vs. Button; Trade-Spion=0) --');
  await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    window.__ua = []; const o = window.useAbility;
    window.useAbility = function(n){ window.__ua.push(n); return o && o.apply(this, arguments); };
    window.__tv = 0; const t = window.toggleVehicle;
    window.toggleVehicle = function(){ window.__tv++; return t && t.apply(this, arguments); };
  });
  await T.page.keyboard.press('1');
  const kbd1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  await T.page.click('[data-cr-hk="1"]');
  const btn1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  check('HK1: Taste ruft toggleVehicle', kbd1 === 1, { kbd1 });
  check('HK1: Button ruft dieselbe Funktion (toggleVehicle)', btn1 === 1, { btn1 });
  await T.page.keyboard.press('2');
  const kbd2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  await T.page.click('[data-cr-hk="2"]');
  const btn2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK2: Taste ruft useAbility(2)', kbd2.length === 1 && kbd2[0] === 2, { kbd2 });
  check('HK2: Button ruft dieselbe Funktion mit demselben Argument (2)', btn2.length === 1 && btn2[0] === 2, { btn2 });

  const spy = await T.page.evaluate(() => {
    window.__calls = 0;
    let installed = false;
    try {
      ChartRunner.sdk.setRealSDK({
        marketSwap: () => { window.__calls++; return Promise.resolve({ sig:'X' }); },
        limitVault: () => { window.__calls++; return Promise.resolve({ orderPubkey:'Y' }); },
      });
      installed = true;
    } catch(_){}
    const dlg0 = !!document.getElementById('tvSettingsOverlay');
    const opened = crTouch.openActivationPanel();
    const dlg1 = !!document.getElementById('tvSettingsOverlay');
    crTouch.fireHotkey(1); crTouch.fireHotkey(2); crTouch.fireHotkey(3); crTouch.fireHotkey(4);
    crTouch.setStick(true); crTouch._stickDir = 1;
    try { restart(); } catch(_){}
    for(let i=0;i<40;i++) update(0.016);
    crTouch.setStick(false);
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Order-Button oeffnet NUR die Ansicht (Activation-Panel)',
    spy.opened === true && spy.dlg0 === false && spy.dlg1 === true, spy);
  check('KEIN Touch-Element feuert einen Trade (Real-Adapter-Spion === 0)', spy.calls === 0, spy);

  // ── 6 · CANVAS/TOPBAR ──────────────────────────────────────────────────────
  console.log('\n-- 6 · Kein Canvas-Direktzugriff / Topbar unberuehrt --');
  const dom = await T.page.evaluate(() => {
    const l = document.getElementById('crTouchLayer');
    const parentTag = l && l.parentElement ? l.parentElement.tagName.toLowerCase() : '';
    const inCanvas = !!(l && l.closest && l.closest('canvas'));
    const bar = document.getElementById('crOSBar');
    const ctrlInBar = !!(bar && bar.querySelector('[data-cr-hk], #crTouchOrder'));
    const barBtns = bar ? bar.querySelectorAll('.cr-bar-btn').length : -1;
    return { parentTag, inCanvas, ctrlInBar, barBtns };
  });
  check('Layer haengt am body (nicht im Canvas)', dom.parentTag === 'body' && dom.inCanvas === false, dom);
  check('Kein Touch-Bedienelement in der Topbar (#crOSBar)', dom.ctrlInBar === false, dom);
  check('Topbar bleibt bei ≤5 Kommandos', dom.barBtns <= 5, dom);
  await T.page.close();

  // ── 5 · DESKTOP UNBERUEHRT (Nicht-Touch) ───────────────────────────────────
  console.log('\n-- 5 · Desktop unberuehrt (Nicht-Touch) --');
  const D = await boot(browser, { viewport:{ width:1280, height:900 } });
  const desk = await D.page.evaluate(() => {
    const layer = document.getElementById('crTouchLayer');
    try { restart(); } catch(_){}
    const x0 = player.wx; for(let i=0;i<60;i++) update(0.016); const moved = player.wx - x0;
    return { active: !!(window.crTouch && crTouch.active), layer: !!layer,
             axis: window.crTouch ? crTouch.autoMoveAxis() : 'no', moved };
  });
  check('Desktop: crTouch.active === false', desk.active === false, desk);
  check('Desktop: KEIN Layer im DOM (nur auf Touch gebaut)', desk.layer === false, desk);
  check('Desktop: autoMoveAxis() === 0 (kein Auto-Run)', desk.axis === 0, desk);
  check('Desktop: update()-Lauf ohne Eingabe bewegt den Runner NICHT', desk.moved === 0, desk);
  await D.page.close();

  console.log('\n== v909 TOUCH-POLISH: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
