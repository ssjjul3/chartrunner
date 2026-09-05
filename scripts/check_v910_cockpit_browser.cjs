/* Smoke-Verifikation v1.0.910 — M0.2: MOBILE-STEUERUNG v2 (Zwei-Daumen-Cockpit).
 *
 * Konsolidiert die M0.1-Ziele MIT den Handy-Test-Entscheidungen. Geaendert wird
 * NUR, wie man am Touch steuert und was sichtbar ist — Aktionen/Trade-Pfad/
 * Weiche/Desktop bleiben unberuehrt. Jede scharfe Zeile hat eine Gegenprobe
 * (ROT/CRASH/GRUEN, CLAUDE.md); die Mutationen + Ergebnis stehen in der Commit-
 * Message.
 *
 *   1. AUTO-RUN ENTFERNT: kein #crTouchAuto, kein autoRun/autoMoveAxis/setStick/
 *      stickEnabled im Modul; moveAxis liefert 0 ohne Stick (der Runner steht).
 *   2. STICK IMMER AN: #crTouchStick im Chart sichtbar, KEIN Toggle-Chip; ein
 *      _stickDir≠0 bewegt den Runner, _stickDir===0 bewegt ihn NICHT (kein Auto-Run).
 *   3. ORDER-GATE: Gast → #crTouchOrder NICHT im DOM (hidden); verbunden → sichtbar.
 *   4. CHART-ONLY: nur bei game.running && !crSplashUp sichtbar.
 *   5. SAFE-AREA + TREFFERFLAECHE: unterer Anker env(safe-area-inset-bottom)+Min;
 *      Hub, Order, Stick je ≥44px; nichts unter der sichtbaren Flaeche.
 *   6. RADIAL-PARITAET: Flick je Winkel ruft dieselbe Funktion wie die Taste
 *      (oben=HK1/rechts=HK2/unten=HK3/links=HK4); Mitte = Abbruch (null);
 *      Order oeffnet NUR die Ansicht; KEIN Touch-Element feuert einen Trade.
 *   7. DESKTOP UNBERUEHRT: kein Layer, moveAxis()===0, update() bewegt nicht.
 *   8. REDUCED-MOTION / TOPBAR ≤5 / KEIN CANVAS-DIREKTZUGRIFF.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v910_cockpit_browser.cjs
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
  console.log('\n-- 0 · Quell-Scan: Modul, Auto-Run-Reste, Safe-Area --');
  const src = fs.readFileSync(FILE, 'utf8');
  const mStart = src.indexOf('window.crTouch = (function(){');
  const mEnd = src.indexOf('\n})();', mStart);
  const mod = (mStart >= 0 && mEnd > mStart) ? src.slice(mStart, mEnd) : '';
  check('crTouch-Modul im Quelltext gefunden', mod.length > 500, { len: mod.length });
  check('Modul enthaelt KEIN marketSwap/limitVault/triggerCreate/quote (kein Trade-Code)',
    mod.length > 500 && !/marketSwap|limitVault|triggerCreate|\bquote\b/i.test(mod));
  // Auto-Run restlos entfernt (Toggle + Logik + Wortmarke).
  check('Kein Auto-Run mehr im Modul (Wortmarke)', mod.length > 500 && !/auto[\s\-_]?run/i.test(mod), { has: /auto[\s\-_]?run/i.test(mod) });
  check('Kein autoRun/autoMoveAxis/stickEnabled/setStick/STICK_KEY mehr',
    mod.length > 500 && !/\bautoRun\b|autoMoveAxis|stickEnabled|setStick|STICK_KEY/.test(mod));
  check('moveAxis (Stick-Achse) im Modul vorhanden', /API\.moveAxis\s*=/.test(mod));
  check('Radial vorhanden (flick + radialSlot + Hub)', /API\.flick\s*=/.test(mod) && /API\.radialSlot\s*=/.test(mod) && /crTouchRadial/.test(mod));
  // Safe-Area / svh / reduced-motion (aus M0.1 uebernommen).
  check('CSS: unterer Anker nutzt env(safe-area-inset-bottom)', /env\(safe-area-inset-bottom/.test(mod));
  check('CSS: Hoehe ueber svh (nicht nur vh)', /height:100svh/.test(mod));
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
  check('Banner meldet mindestens v1.0.910',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 910)))), bv);

  // ── 1 · AUTO-RUN ENTFERNT (DOM + API) ──────────────────────────────────────
  console.log('\n-- 1 · Auto-Run entfernt (kein Element, keine Logik) --');
  await enterChart(T.page);
  const ar = await T.page.evaluate(() => {
    return {
      autoEl: !!document.getElementById('crTouchAuto'),
      dockEl: !!document.getElementById('crTouchDock'),
      chipEl: !!document.getElementById('crTouchStickChip'),
      autoMoveAxisFn: typeof (window.crTouch && crTouch.autoMoveAxis),
      moveAxisFn: typeof (window.crTouch && crTouch.moveAxis),
      setStickFn: typeof (window.crTouch && crTouch.setStick),
      hasAutoRunProp: !!(window.crTouch && 'autoRun' in crTouch),
      hasStickEnabled: !!(window.crTouch && 'stickEnabled' in crTouch)
    };
  });
  check('Kein #crTouchAuto (AUTO-RUN-Element) im DOM', ar.autoEl === false, ar);
  check('Kein altes #crTouchDock/#crTouchStickChip mehr', ar.dockEl === false && ar.chipEl === false, ar);
  check('crTouch.autoMoveAxis existiert NICHT mehr', ar.autoMoveAxisFn === 'undefined', ar);
  check('crTouch.moveAxis ist die neue Bewegungs-API', ar.moveAxisFn === 'function', ar);
  check('Kein setStick/autoRun/stickEnabled auf der API', ar.setStickFn === 'undefined' && ar.hasAutoRunProp === false && ar.hasStickEnabled === false, ar);

  // ── 2 · STICK IMMER AN (sichtbar, kein Toggle, bewegt den Runner) ───────────
  console.log('\n-- 2 · Stick immer an: bewegt den Runner, kein Auto-Run --');
  const stick = await T.page.evaluate(() => {
    const s = document.getElementById('crTouchStick');
    const visible = !!(s && s.offsetParent !== null);
    // (a) ohne Stick-Eingabe steht der Runner (kein Auto-Run).
    crTouch._stickDir = 0;
    try { restart(); } catch(_){}
    let x0 = player.wx; for(let i=0;i<40;i++) update(0.016); const movedIdle = player.wx - x0;
    // (b) Stick nach rechts → Runner bewegt sich.
    crTouch._stickDir = 1;
    x0 = player.wx; for(let i=0;i<40;i++) update(0.016); const movedStick = player.wx - x0;
    crTouch._stickDir = 0;
    return { visible, movedIdle: Math.round(movedIdle), movedStick: Math.round(movedStick),
             axisIdle: (crTouch.moveAxis.call(Object.assign({}, crTouch, { _stickDir:0 }))) };
  });
  check('Stick #crTouchStick im Chart sichtbar', stick.visible === true, stick);
  check('Ohne Stick-Eingabe steht der Runner (kein Auto-Run)', stick.movedIdle === 0, stick);
  check('Stick bewegt den Runner (_stickDir=1 → wx steigt)', stick.movedStick > 0, stick);

  // ── 3 · ORDER-GATE (Gast vs. verbunden) ────────────────────────────────────
  console.log('\n-- 3 · Order gast-gesperrt --');
  const gate = await T.page.evaluate(() => {
    // Gast:
    window.crGuest = () => true; try { crTouch.syncGates(); } catch(_){}
    const o = () => document.getElementById('crTouchOrder');
    const guestHidden = !!(o() && o().hidden) || !o();
    const guestVisible = !!(o() && o().offsetParent !== null);
    // Verbunden:
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    const connVisible = !!(o() && !o().hidden);
    return { guestHidden, guestVisible, connVisible };
  });
  check('Gast: Order-Button NICHT sichtbar (hidden)', gate.guestHidden === true && gate.guestVisible === false, gate);
  check('Verbunden: Order-Button sichtbar', gate.connVisible === true, gate);

  // ── 4 · CHART-ONLY ─────────────────────────────────────────────────────────
  console.log('\n-- 4 · Chart-only --');
  const co = await T.page.evaluate(() => {
    const l = () => document.getElementById('crTouchLayer');
    try { if(typeof game !== 'undefined') game.running = false; } catch(_){}
    try { document.body.classList.remove('crSplashUp'); } catch(_){}
    try { crTouch.refresh(); } catch(_){}
    const hiddenDesktop = !!(l() && l().hidden);
    try { document.body.classList.remove('crSplashUp'); restart(); crTouch.refresh(); } catch(_){}
    const visibleChart = !!(l() && !l().hidden);
    try { document.body.classList.add('crSplashUp'); crTouch.refresh(); } catch(_){}
    const hiddenSplash = !!(l() && l().hidden);
    try { document.body.classList.remove('crSplashUp'); crTouch.refresh(); } catch(_){}
    return { hiddenDesktop, visibleChart, hiddenSplash, active: !!(window.crTouch && crTouch.active) };
  });
  check('Touch: crTouch.active === true', co.active === true, co);
  check('Chart-only: OS-Desktop (kein Run) → Layer versteckt', co.hiddenDesktop === true, co);
  check('Chart-only: im Chart → Layer sichtbar', co.visibleChart === true, co);
  check('Chart-only: Splash ueber Run → Layer versteckt', co.hiddenSplash === true, co);

  // ── 5 · SAFE-AREA + TREFFERFLAECHE ─────────────────────────────────────────
  console.log('\n-- 5 · Safe-Area + Trefferflaeche ≥44px --');
  await enterChart(T.page);
  const sa = await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}   // Order sichtbar fuer die Messung
    const move = document.getElementById('crTouchMove');
    const right = document.getElementById('crTouchRight');
    const layer = document.getElementById('crTouchLayer');
    const moveBottomPx = parseFloat(getComputedStyle(move).bottom) || 0;
    const rightBottomPx = parseFloat(getComputedStyle(right).bottom) || 0;
    const lift = getComputedStyle(layer).getPropertyValue('--cr-tl-lift').trim();
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const hits = {};
    for(const s of ['.hub','#crTouchOrder','#crTouchStick']){
      const el = document.querySelector(s);
      const r = el ? el.getBoundingClientRect() : null;
      hits[s] = r ? { w: Math.round(r.width), h: Math.round(r.height), bottom: r.bottom } : { missing:true };
    }
    return { moveBottomPx, rightBottomPx, lift, vh, hits };
  });
  check('Safe-Area: Move-Bottom ≥ Mindestabstand (16px)', sa.moveBottomPx >= 16, sa);
  check('Safe-Area: Right-Bottom ≥ Mindestabstand (16px)', sa.rightBottomPx >= 16, sa);
  check('Safe-Area: --cr-tl-lift definiert (env + Mindestwert)', /env\(safe-area-inset-bottom|calc\(|\dpx/.test(sa.lift) && sa.lift.length > 0, sa);
  for(const s of ['.hub','#crTouchOrder','#crTouchStick']){
    const c = sa.hits[s];
    check('≥44px effektiv: ' + s, !c.missing && c.w >= 44 && c.h >= 44, c);
    check('unter der sichtbaren Flaeche NICHT: ' + s, !c.missing && c.bottom <= sa.vh + 0.5, { bottom: c.bottom, vh: sa.vh });
  }

  // ── 6 · RADIAL-PARITAET ────────────────────────────────────────────────────
  console.log('\n-- 6 · Radial-Paritaet (Flick je Winkel == Taste; Trade-Spion=0) --');
  // Slot-Zuordnung (rein rechnerisch, ohne DOM): Winkel → Hotkey.
  const slots = await T.page.evaluate(() => ({
    up:    crTouch.radialSlot(0, -50),
    right: crTouch.radialSlot(50, 0),
    down:  crTouch.radialSlot(0, 50),
    left:  crTouch.radialSlot(-50, 0),
    center0: crTouch.radialSlot(0, 0),
    centerSmall: crTouch.radialSlot(6, 6)
  }));
  check('Flick oben → HK1', slots.up === '1', slots);
  check('Flick rechts → HK2', slots.right === '2', slots);
  check('Flick unten → HK3', slots.down === '3', slots);
  check('Flick links → HK4', slots.left === '4', slots);
  check('Mitte (0,0) → Abbruch (null)', slots.center0 === null, slots);
  check('Nahe Mitte (<FLICK_MIN) → Abbruch (null)', slots.centerSmall === null, slots);

  // Paritaet: Taste vs. Flick rufen dieselbe Funktion (HK1 toggleVehicle, HK2 useAbility(2)).
  await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    window.__ua = []; const o = window.useAbility;
    window.useAbility = function(n){ window.__ua.push(n); return o && o.apply(this, arguments); };
    window.__tv = 0; const t = window.toggleVehicle;
    window.toggleVehicle = function(){ window.__tv++; return t && t.apply(this, arguments); };
  });
  await T.page.keyboard.press('1');
  const kbd1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  const flick1 = await T.page.evaluate(() => { crTouch.flick(0, -50); const v = window.__tv; window.__tv = 0; return v; });
  check('HK1: Taste ruft toggleVehicle', kbd1 === 1, { kbd1 });
  check('HK1: Flick-oben ruft dieselbe Funktion (toggleVehicle)', flick1 === 1, { flick1 });
  await T.page.keyboard.press('2');
  const kbd2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  const flick2 = await T.page.evaluate(() => { crTouch.flick(50, 0); const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK2: Taste ruft useAbility(2)', kbd2.length === 1 && kbd2[0] === 2, { kbd2 });
  check('HK2: Flick-rechts ruft dieselbe Funktion mit demselben Argument (2)', flick2.length === 1 && flick2[0] === 2, { flick2 });
  const flick3 = await T.page.evaluate(() => { crTouch.flick(0, 50); const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK3: Flick-unten ruft useAbility(3)', flick3.length === 1 && flick3[0] === 3, { flick3 });

  // Order oeffnet NUR die Ansicht; KEIN Touch-Element feuert einen Trade.
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
    // alle vier Flicks + Mitte-Abbruch feuern nur die Ability-Handler, nie einen Trade.
    crTouch.flick(0,-50); crTouch.flick(50,0); crTouch.flick(0,50); crTouch.flick(-50,0); crTouch.flick(0,0);
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Order-Button oeffnet NUR die Ansicht (Activation-Panel)',
    spy.opened === true && spy.dlg0 === false && spy.dlg1 === true, spy);
  check('KEIN Touch-Element feuert einen Trade (Real-Adapter-Spion === 0)', spy.calls === 0, spy);

  // ── 8 · CANVAS/TOPBAR ──────────────────────────────────────────────────────
  console.log('\n-- 8 · Kein Canvas-Direktzugriff / Topbar unberuehrt --');
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
  await T.page.close();

  // ── 7 · DESKTOP UNBERUEHRT (Nicht-Touch) ───────────────────────────────────
  console.log('\n-- 7 · Desktop unberuehrt (Nicht-Touch) --');
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
  check('Desktop: moveAxis() === 0 (kein Stick, kein Auto-Run)', desk.axis === 0, desk);
  check('Desktop: update()-Lauf ohne Eingabe bewegt den Runner NICHT', desk.moved === 0, desk);
  await D.page.close();

  console.log('\n== v910 COCKPIT: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
