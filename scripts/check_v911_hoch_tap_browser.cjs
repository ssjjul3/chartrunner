/* Smoke-Verifikation v1.0.911 — M0.3: CONTROLS HÖHER + TAP-TO-FIRE.
 *
 * Zwei fokussierte Fixes an der M0.2-Touch-Steuerung. KEINE Logik-Aenderung an
 * Aktionen/Trade-Pfad/Weiche/Desktop — nur Position + eine zusaetzliche Geste.
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die
 * Mutationen + Ergebnis stehen in der Commit-Message.
 *
 *   1. HOEHER (visualViewport): mit gestubbter kleinerer visualViewport.height
 *      liegt die Unterkante von Stick, AKTIV-Slot (HK3) und Order ≥ Mindestabstand
 *      UEBER der sichtbaren Viewport-Unterkante; kein Control ragt darunter. Die
 *      Layer-Hoehe folgt der gestubbten vv.height (nicht dem Layout-Viewport).
 *   2. TAP-TO-FIRE: ein Antippen jedes Slots (oben/rechts/unten/links) ruft
 *      denselben fireHotkey → ChartRunner.control.tap wie die Taste; Paritaet
 *      Tap == Flick == Taste (Handler-Spion). Slots ≥44px, im offenen Rad
 *      pointer-events:auto (im Ruhezustand none).
 *   3. FLICK-REGRESSION: press-and-flick feuert weiterhin korrekt je Winkel.
 *   4. WEICHE/SPION: weder Tap noch Order feuern einen Trade (Real-Adapter=0);
 *      Order oeffnet NUR die Ansicht.
 *   5. DESKTOP UNBERUEHRT: kein Layer, moveAxis()===0, update() bewegt nicht.
 *   6. REDUCED-MOTION / TOPBAR ≤5 / KEIN CANVAS-DIREKTZUGRIFF.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v911_hoch_tap_browser.cjs
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

  // ── 0 · Quell-Scan (statisch) ──────────────────────────────────────────────
  console.log('\n-- 0 · Quell-Scan: Modul, visualViewport-Anker, Tap-to-fire --');
  const src = fs.readFileSync(FILE, 'utf8');
  const mStart = src.indexOf('window.crTouch = (function(){');
  const mEnd = src.indexOf('\n})();', mStart);
  const mod = (mStart >= 0 && mEnd > mStart) ? src.slice(mStart, mEnd) : '';
  check('crTouch-Modul im Quelltext gefunden', mod.length > 500, { len: mod.length });
  check('Modul enthaelt KEIN marketSwap/limitVault/triggerCreate/quote (kein Trade-Code)',
    mod.length > 500 && !/marketSwap|limitVault|triggerCreate|\bquote\b/i.test(mod));
  check('VERSION auf 1.0.911 gesetzt', /var VERSION = '1\.0\.911'/.test(mod), { has: /var VERSION = '([^']+)'/.exec(mod) && RegExp.$1 });
  // Fix 1: visualViewport-Anker + groesserer Mindestabstand.
  check('Fix1: _syncViewport bindet an window.visualViewport (height/top)', /window\.visualViewport/.test(mod) && /style\.height\s*=\s*Math\.round\(vv\.height\)/.test(mod));
  check('Fix1: API.syncViewport-Seam vorhanden', /API\.syncViewport\s*=\s*_syncViewport/.test(mod));
  check('Fix1: Mindestabstand 30px (Spec 24–32)', /env\(safe-area-inset-bottom, 0px\) \+ 30px/.test(mod), { hasOld20: /\+ 20px\)/.test(mod) });
  // Fix 2: Tap-to-fire.
  check('Fix2: _radCollapse vorhanden', /function _radCollapse\(/.test(mod));
  check('Fix2: Slot-Tap ruft API.fireHotkey', /addEventListener\('click', function\(e\)\{[\s\S]*?API\.fireHotkey\(item\.hk\)/.test(mod));
  check('Fix2: offenes Rad macht Slots antippbar (pointer-events:auto)', /\.armed \.slot,#crTouchRadial\.labels \.slot\{[^}]*pointer-events:auto/.test(mod));
  check('Fix2: Slots ≥44px (min-width/height)', /#crTouchRadial \.slot\{[\s\S]*?min-width:44px;min-height:44px/.test(mod));

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
  check('Banner meldet mindestens v1.0.911',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 911)))), bv);

  await enterChart(T.page);

  // ── 1 · HOEHER: an der sichtbaren Viewport-Unterkante ───────────────────────
  console.log('\n-- 1 · Hoeher: mit kleinerer visualViewport.height ≥ Mindestabstand ueber der Unterkante --');
  const MINGAP = 24;
  await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}   // Order sichtbar fuer die Messung
    document.getElementById('crTouchRadial').classList.add('labels');       // Rad offen: Slots einblenden
  });
  await T.page.waitForTimeout(250);   // Einblend-Transition (scale .6 → 1) settlen: echte Unterkante messen
  const pos = await T.page.evaluate(() => {
    const radial = document.getElementById('crTouchRadial');
    // Simuliert die In-App-Browserleiste, die ~220px der sichtbaren Flaeche wegnimmt.
    const fakeH = Math.max(300, window.innerHeight - 220);
    const fake = { height: fakeH, offsetTop: 0, offsetLeft: 0, width: window.innerWidth,
                   addEventListener(){}, removeEventListener(){} };
    const realVV = window.visualViewport;
    let stubbed = false;
    try { Object.defineProperty(window, 'visualViewport', { configurable:true, value: fake }); stubbed = (window.visualViewport === fake); } catch(_){}
    try { crTouch.syncViewport(); } catch(_){}
    const visibleBottom = fake.offsetTop + fake.height;
    function rect(sel){ const el = document.querySelector(sel); const r = el ? el.getBoundingClientRect() : null;
      return r ? { bottom: r.bottom, w: Math.round(r.width), h: Math.round(r.height) } : { missing:true }; }
    const out = {
      stubbed, visibleBottom, innerHeight: window.innerHeight,
      layerH: parseFloat((document.getElementById('crTouchLayer').style.height) || '0') || 0,
      stick: rect('#crTouchStick'),
      aktiv: rect('#crTouchRadial .slot[data-cr-hk="3"]'),
      order: rect('#crTouchOrder')
    };
    // Wiederherstellen.
    try { Object.defineProperty(window, 'visualViewport', { configurable:true, value: realVV }); } catch(_){}
    try { crTouch.syncViewport(); } catch(_){}
    radial.classList.remove('labels');
    return out;
  });
  check('Position: visualViewport-Stub griff', pos.stubbed === true, pos);
  check('Position: Layer-Hoehe folgt der gestubbten visualViewport.height (nicht dem Layout-Viewport)',
    Math.abs(pos.layerH - pos.visibleBottom) <= 2, { layerH: pos.layerH, visibleBottom: pos.visibleBottom, innerHeight: pos.innerHeight });
  for(const [name, key] of [['Stick','stick'], ['AKTIV-Slot','aktiv'], ['Order','order']]){
    const c = pos[key];
    check('Position: ' + name + ' Unterkante ≥ ' + MINGAP + 'px ueber der sichtbaren Unterkante',
      !c.missing && (pos.visibleBottom - c.bottom) >= MINGAP, { name, bottom: c && c.bottom, gap: c && (pos.visibleBottom - c.bottom) });
    check('Position: ' + name + ' NICHT unter der sichtbaren Flaeche',
      !c.missing && c.bottom <= pos.visibleBottom + 0.5, { name, bottom: c && c.bottom, visibleBottom: pos.visibleBottom });
  }

  // ── 2 · TAP-TO-FIRE + Paritaet (Tap == Flick == Taste) ──────────────────────
  console.log('\n-- 2 · Tap-to-fire: jeder Slot feuert beim Antippen, Paritaet zu Flick/Taste --');
  // (a) Slot ≥44px + pointer-events-Gating (Ruhe: none, offen: auto).
  await T.page.evaluate(() => { document.getElementById('crTouchRadial').classList.add('labels'); });
  await T.page.waitForTimeout(250);   // Einblend-Transition (scale .6 → 1) settlen lassen
  const geom = await T.page.evaluate(() => {
    const radial = document.getElementById('crTouchRadial');
    const s3 = document.querySelector('#crTouchRadial .slot[data-cr-hk="3"]');
    const openPE = getComputedStyle(s3).pointerEvents;
    const r = s3.getBoundingClientRect();                     // sichtbare Trefferflaeche (scale 1)
    const box = { w: s3.offsetWidth, h: s3.offsetHeight };    // Layout-Box (transform-unabhaengig)
    radial.classList.remove('labels', 'armed');
    const restPE = getComputedStyle(s3).pointerEvents;
    return { restPE, openPE, w: Math.round(r.width), h: Math.round(r.height), boxW: box.w, boxH: box.h };
  });
  check('Tap: Slot ≥44px effektiv (sichtbare Trefferflaeche, scale 1)', geom.w >= 44 && geom.h >= 44, geom);
  check('Tap: Slot-Layoutbox ≥44px (min-width/height)', geom.boxW >= 44 && geom.boxH >= 44, geom);
  check('Tap: Slot im Ruhezustand pointer-events:none', geom.restPE === 'none', geom);
  check('Tap: Slot im offenen Rad pointer-events:auto', geom.openPE === 'auto', geom);

  // (b) Per-Slot: Tap ruft API.fireHotkey mit demselben Argument (der eine, mit
  //     Flick geteilte Auslöse-Pfad → ChartRunner.control.tap bzw. Key-Fallback).
  const tapArgs = await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    const radial = document.getElementById('crTouchRadial');
    const orig = crTouch.fireHotkey;
    const out = {};
    for(const hk of ['1','2','3','4']){
      radial.classList.add('labels');   // Slots antippbar
      window.__fh = [];
      crTouch.fireHotkey = function(n){ window.__fh.push(String(n)); return orig.apply(this, arguments); };
      const el = document.querySelector('#crTouchRadial .slot[data-cr-hk="' + hk + '"]');
      el.click();
      crTouch.fireHotkey = orig;
      out[hk] = { calls: window.__fh.slice(), collapsed: !radial.classList.contains('labels') };
    }
    return out;
  });
  check('Tap oben (HK1) → fireHotkey("1")',   tapArgs['1'].calls.length === 1 && tapArgs['1'].calls[0] === '1', tapArgs['1']);
  check('Tap rechts (HK2) → fireHotkey("2")',  tapArgs['2'].calls.length === 1 && tapArgs['2'].calls[0] === '2', tapArgs['2']);
  check('Tap unten (HK3) → fireHotkey("3")',   tapArgs['3'].calls.length === 1 && tapArgs['3'].calls[0] === '3', tapArgs['3']);
  check('Tap links (HK4) → fireHotkey("4")',   tapArgs['4'].calls.length === 1 && tapArgs['4'].calls[0] === '4', tapArgs['4']);
  check('Tap: nach dem Antippen klappt das Rad ein (Collapse)',
    tapArgs['1'].collapsed && tapArgs['2'].collapsed && tapArgs['3'].collapsed && tapArgs['4'].collapsed, tapArgs);

  // (c) Handler-Paritaet: Tap == Taste == Flick landen im selben Handler.
  await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    window.__ua = []; const o = window.useAbility;
    window.useAbility = function(n){ window.__ua.push(n); return o && o.apply(this, arguments); };
    window.__tv = 0; const t = window.toggleVehicle;
    window.toggleVehicle = function(){ window.__tv++; return t && t.apply(this, arguments); };
    document.getElementById('crTouchRadial').classList.add('labels');
  });
  // HK1 → toggleVehicle
  await T.page.keyboard.press('1');
  const k1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  const f1 = await T.page.evaluate(() => { crTouch.flick(0, -50); const v = window.__tv; window.__tv = 0; return v; });
  const p1 = await T.page.evaluate(() => { document.getElementById('crTouchRadial').classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="1"]').click(); const v = window.__tv; window.__tv = 0; return v; });
  check('HK1-Paritaet: Taste==Flick==Tap → toggleVehicle je 1×', k1 === 1 && f1 === 1 && p1 === 1, { k1, f1, p1 });
  // HK2 → useAbility(2)
  await T.page.keyboard.press('2');
  const k2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  const f2 = await T.page.evaluate(() => { crTouch.flick(50, 0); const v = window.__ua.slice(); window.__ua = []; return v; });
  const p2 = await T.page.evaluate(() => { document.getElementById('crTouchRadial').classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="2"]').click(); const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK2-Paritaet: Taste==Flick==Tap → useAbility(2) je 1×',
    k2.length === 1 && k2[0] === 2 && f2.length === 1 && f2[0] === 2 && p2.length === 1 && p2[0] === 2, { k2, f2, p2 });
  // HK3 → useAbility(3)
  const f3 = await T.page.evaluate(() => { crTouch.flick(0, 50); const v = window.__ua.slice(); window.__ua = []; return v; });
  const p3 = await T.page.evaluate(() => { document.getElementById('crTouchRadial').classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="3"]').click(); const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK3-Paritaet: Flick==Tap → useAbility(3) je 1×', f3.length === 1 && f3[0] === 3 && p3.length === 1 && p3[0] === 3, { f3, p3 });

  // ── 3 · FLICK-REGRESSION (Winkel → Slot unveraendert) ───────────────────────
  console.log('\n-- 3 · Flick-Regression: press-and-flick feuert weiter korrekt --');
  const slots = await T.page.evaluate(() => ({
    up: crTouch.radialSlot(0, -50), right: crTouch.radialSlot(50, 0),
    down: crTouch.radialSlot(0, 50), left: crTouch.radialSlot(-50, 0),
    center0: crTouch.radialSlot(0, 0), centerSmall: crTouch.radialSlot(6, 6)
  }));
  check('Flick oben → HK1', slots.up === '1', slots);
  check('Flick rechts → HK2', slots.right === '2', slots);
  check('Flick unten → HK3', slots.down === '3', slots);
  check('Flick links → HK4', slots.left === '4', slots);
  check('Flick Mitte (0,0) → Abbruch (null)', slots.center0 === null, slots);
  check('Flick nahe Mitte (<FLICK_MIN) → Abbruch (null)', slots.centerSmall === null, slots);

  // ── 4 · WEICHE/SPION: kein Touch-Element feuert einen Trade ──────────────────
  console.log('\n-- 4 · Weiche/Spion: Tap/Order feuern keinen Trade --');
  const spy = await T.page.evaluate(() => {
    window.__calls = 0; let installed = false;
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
    // Alle vier Slot-Taps + alle vier Flicks + Mitte feuern nur Ability-Handler, nie einen Trade.
    const radial = document.getElementById('crTouchRadial');
    for(const hk of ['1','2','3','4']){ radial.classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="' + hk + '"]').click(); }
    crTouch.flick(0,-50); crTouch.flick(50,0); crTouch.flick(0,50); crTouch.flick(-50,0); crTouch.flick(0,0);
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Order-Button oeffnet NUR die Ansicht (Activation-Panel)',
    spy.opened === true && spy.dlg0 === false && spy.dlg1 === true, spy);
  check('KEIN Touch-Element feuert einen Trade (Real-Adapter-Spion === 0)', spy.calls === 0, spy);

  // ── 6 · CANVAS/TOPBAR/REDUCED-MOTION ────────────────────────────────────────
  console.log('\n-- 6 · Kein Canvas-Direktzugriff / Topbar / reduced-motion --');
  const dom = await T.page.evaluate(() => {
    const l = document.getElementById('crTouchLayer');
    const parentTag = l && l.parentElement ? l.parentElement.tagName.toLowerCase() : '';
    const inCanvas = !!(l && l.closest && l.closest('canvas'));
    const bar = document.getElementById('crOSBar');
    const ctrlInBar = !!(bar && bar.querySelector('[data-cr-radial-hub], #crTouchOrder, #crTouchStick'));
    const barBtns = bar ? bar.querySelectorAll('.cr-bar-btn').length : -1;
    return { parentTag, inCanvas, ctrlInBar, barBtns };
  });
  check('Layer haengt am body (nicht im Canvas)', dom.parentTag === 'body' && dom.inCanvas === false, dom);
  check('Kein Touch-Bedienelement in der Topbar (#crOSBar)', dom.ctrlInBar === false, dom);
  check('Topbar bleibt bei ≤5 Kommandos', dom.barBtns <= 5, dom);
  const rm = await T.page.evaluate(() => {
    const css = document.getElementById('crTouchCss');
    return { hasGuard: !!(css && /@media \(prefers-reduced-motion: no-preference\)/.test(css.textContent)) };
  });
  check('reduced-motion-Guard im injizierten CSS', rm.hasGuard === true, rm);
  await T.page.close();

  // ── 5 · DESKTOP UNBERUEHRT (Nicht-Touch) ────────────────────────────────────
  console.log('\n-- 5 · Desktop unberuehrt (Nicht-Touch) --');
  const D = await boot(browser, { viewport:{ width:1280, height:900 } });
  const desk = await D.page.evaluate(() => {
    const layer = document.getElementById('crTouchLayer');
    try { restart(); } catch(_){}
    const x0 = player.wx; for(let i=0;i<60;i++) update(0.016); const moved = player.wx - x0;
    return { active: !!(window.crTouch && crTouch.active), layer: !!layer,
             axis: window.crTouch ? crTouch.moveAxis() : 'no', moved };
  });
  check('Desktop: crTouch.active === false', desk.active === false, desk);
  check('Desktop: KEIN Layer im DOM (nur auf Touch gebaut)', desk.layer === false, desk);
  check('Desktop: moveAxis() === 0 (kein Stick)', desk.axis === 0, desk);
  check('Desktop: update()-Lauf ohne Eingabe bewegt den Runner NICHT', desk.moved === 0, desk);
  await D.page.close();

  console.log('\n== v911 HOCH+TAP: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
