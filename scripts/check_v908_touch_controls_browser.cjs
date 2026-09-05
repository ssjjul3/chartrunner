/* Smoke-Verifikation v1.0.908 — M0: TOUCH-STEUERUNGSSCHICHT (Mobile-Grundzugriff).
 *
 * Streng additiv. KEIN neuer Trade-Pfad, KEINE neue Weiche: die On-Screen-
 * Elemente loesen exakt dieselben Aktionen aus wie die Tastatur (zweiter
 * Ausloeser ueber die vorhandene Eingabe-Sequenz, keydown+keyup). Geprueft wird,
 * was Wahrheit oder Geld kostet, wenn es fehlt — jede scharfe Zeile hat eine
 * Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); Mutationen + Ergebnis in der
 * Commit-Message.
 *
 *   1. PARITAET (Touch, Fixture je HK1–HK4): Taste vs. On-Screen-Button rufen
 *      dieselbe Funktion mit demselben Argument (HK1 toggleVehicle, HK2/HK3
 *      useAbility(n)) bzw. liefern denselben key '4' am Fenster (HK4).
 *   2. DESKTOP UNBERUEHRT: auf Nicht-Touch existiert KEIN Layer, autoMoveAxis()
 *      liefert 0, und ein update()-Lauf ohne Eingabe bewegt den Runner NICHT.
 *   3. GATING wie ARM-Gate: Gast versteckt HK3 (Aktivierungs-Laser) + HK4
 *      (Alarm-Laser); verbunden (crGuest=false) zeigt sie.
 *   4. TRADE-PFAD/WEICHE UNBERUEHRT: der Real-Adapter-Spion feuert bei KEINEM
 *      Touch-Element (HK1–HK4, Order-Button, Auto-Run, Stick) — Order oeffnet
 *      nur die Ansicht. Plus Quell-Scan: das crTouch-Modul enthaelt kein
 *      marketSwap/limitVault/triggerCreate/quote.
 *   5. AUTO-RUN: Touch, ohne Eingabe → der Runner bewegt sich; Stick setzt die
 *      Richtung zusaetzlich — beides ohne einen Trade auszuloesen.
 *   6. KEIN CANVAS-DIREKTZUGRIFF / TOPBAR: der Layer ist ein body-Kind (nicht im
 *      Canvas), und kein Touch-Bedienelement sitzt in der Topbar (#crOSBar).
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v908_touch_controls_browser.cjs
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
  // Onboarding-Tour aus (ihr Overlay faengt sonst die echten Klicks ab).
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

(async () => {
  const browser = await chromium.launch(launchOptions());

  // ── Quell-Scan (statisch): das Touch-Modul fasst den Trade-Pfad nicht an. ──
  console.log('\n-- 0 · Quell-Scan: crTouch-Modul beruehrt den Trade-Pfad nicht --');
  const src = fs.readFileSync(FILE, 'utf8');
  const mStart = src.indexOf('window.crTouch = (function(){');
  const mEnd = src.indexOf('\n})();', mStart);
  const mod = (mStart >= 0 && mEnd > mStart) ? src.slice(mStart, mEnd) : '';
  check('crTouch-Modul im Quelltext gefunden', mod.length > 500, { len: mod.length });
  check('Modul enthaelt KEIN marketSwap/limitVault/triggerCreate/quote (kein Trade-Code)',
    mod.length > 500 && !/marketSwap|limitVault|triggerCreate|\bquote\b/i.test(mod), {
      marketSwap: /marketSwap/.test(mod), limitVault: /limitVault/.test(mod),
      triggerCreate: /triggerCreate/.test(mod), quote: /\bquote\b/i.test(mod) });

  // ── Boot-Meldung + Banner (Touch-Kontext) ─────────────────────────────────
  const T = await boot(browser, { viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  console.log('\n-- Boot (Touch) --');
  const hard = T.errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await T.page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.908',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 908)))), bv);
  // v1.0.909 (M0.1): der Layer rendert jetzt CHART-ONLY — nach Boot (OS-Desktop,
  // kein Run) ist er bewusst versteckt; im Chart (game.running) sichtbar.
  check('Touch-Kontext: crTouch.active === true und Layer im Chart sichtbar', await T.page.evaluate(() => {
    try { restart(); } catch(_){}
    try { crTouch.refresh(); } catch(_){}
    const l = document.getElementById('crTouchLayer');
    return !!(window.crTouch && crTouch.active && l && !l.hidden);
  }));

  // Auto-Run ZUERST auf sauberem Zustand (vor den HK1-Vehikel-Umschaltungen, die
  // sonst _vehicleSkipGravity setzen und den Lauf-Physik-Zweig ueberspringen).
  console.log('\n-- 5 · Auto-Run bewegt den Runner; Stick zusaetzlich --');
  const auto = await T.page.evaluate(() => {
    crTouch.setStick(false); crTouch._stickDir = 0;
    try { restart(); } catch(e){ return { err:'restart ' + e.message }; }
    const x0 = player.wx; for(let i=0;i<40;i++) update(0.016); const dRun = player.wx - x0;
    // Stick nach links ueberschreibt die Richtung.
    crTouch.setStick(true); crTouch._stickDir = -1;
    const xL0 = player.wx; for(let i=0;i<20;i++) update(0.016); const dLeft = player.wx - xL0;
    crTouch.setStick(false); crTouch._stickDir = 0;
    return { dRun, dLeft, axisRun: (crTouch.autoMoveAxis()) };
  });
  check('Auto-Run: Runner bewegt sich nach rechts ohne Eingabe', auto.dRun > 0, auto);
  check('Stick: Richtung links bewegt den Runner nach links (zusaetzlich)', auto.dLeft < 0, auto);

  // Gate oeffnen (verbunden), damit HK3/HK4 klickbar sind; Spies installieren.
  await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    window.__ua = []; const o = window.useAbility;
    window.useAbility = function(n, e){ window.__ua.push(n); return o && o.apply(this, arguments); };
    window.__tv = 0; const t = window.toggleVehicle;
    window.toggleVehicle = function(){ window.__tv++; return t && t.apply(this, arguments); };
    window.__k4 = []; window.addEventListener('keydown', e => { if(e.key === '4') window.__k4.push(e.isTrusted); }, true);
  });

  console.log('\n-- 1 · Paritaet je HK1–HK4 (Taste vs. On-Screen-Button) --');
  // HK1 — toggleVehicle
  await T.page.keyboard.press('1');
  const kbd1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  await T.page.click('[data-cr-hk="1"]');
  const btn1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  check('HK1: Taste ruft toggleVehicle', kbd1 === 1, { kbd1 });
  check('HK1: Button ruft dieselbe Funktion (toggleVehicle)', btn1 === 1, { btn1 });
  // HK2 — useAbility(2)
  await T.page.keyboard.press('2');
  const kbd2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  await T.page.click('[data-cr-hk="2"]');
  const btn2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK2: Taste ruft useAbility(2)', kbd2.length === 1 && kbd2[0] === 2, { kbd2 });
  check('HK2: Button ruft dieselbe Funktion mit demselben Argument (2)', btn2.length === 1 && btn2[0] === 2, { btn2 });
  // HK3 — useAbility(3)
  await T.page.keyboard.press('3');
  const kbd3 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  await T.page.click('[data-cr-hk="3"]');
  const btn3 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK3: Taste ruft useAbility(3)', kbd3.length === 1 && kbd3[0] === 3, { kbd3 });
  check('HK3: Button ruft dieselbe Funktion mit demselben Argument (3)', btn3.length === 1 && btn3[0] === 3, { btn3 });
  // HK4 — Alarm-Laser (crAlarm im IIFE, nicht global): beide liefern key '4' am Fenster
  await T.page.keyboard.press('4');
  const kbd4 = await T.page.evaluate(() => { const v = window.__k4.slice(); window.__k4 = []; return v; });
  await T.page.click('[data-cr-hk="4"]');
  const btn4 = await T.page.evaluate(() => { const v = window.__k4.slice(); window.__k4 = []; return v; });
  check('HK4: Taste liefert genau ein keydown key "4" (echt)', kbd4.length === 1 && kbd4[0] === true, { kbd4 });
  check('HK4: Button liefert dieselbe Aktion — keydown key "4"', btn4.length === 1, { btn4 });

  console.log('\n-- 3 · Gating gestuft wie das ARM-Gate --');
  const gate = await T.page.evaluate(() => {
    window.crGuest = () => true; crTouch.syncGates();
    const g = { h1: document.querySelector('[data-cr-hk="1"]').hidden, h2: document.querySelector('[data-cr-hk="2"]').hidden,
                h3: document.querySelector('[data-cr-hk="3"]').hidden, h4: document.querySelector('[data-cr-hk="4"]').hidden,
                tier: document.getElementById('crTouchLayer').getAttribute('data-cr-tier') };
    window.crGuest = () => false; crTouch.syncGates();
    const c = { h3: document.querySelector('[data-cr-hk="3"]').hidden, h4: document.querySelector('[data-cr-hk="4"]').hidden,
                tier: document.getElementById('crTouchLayer').getAttribute('data-cr-tier') };
    return { g, c };
  });
  check('Gast: Basis (HK1/HK2) sichtbar', gate.g.h1 === false && gate.g.h2 === false, gate.g);
  check('Gast: HK3 (Aktivierungs-Laser) + HK4 (Alarm) versteckt', gate.g.h3 === true && gate.g.h4 === true, gate.g);
  check('Gast: Tier === "guest"', gate.g.tier === 'guest', gate.g);
  check('Verbunden: HK3 + HK4 sichtbar (ohne Reload, ueber syncGates)', gate.c.h3 === false && gate.c.h4 === false, gate.c);

  console.log('\n-- 4 · Trade-Pfad/Weiche unberuehrt (Spion) --');
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
    window.crGuest = () => false; crTouch.syncGates();
    const dlg0 = !!document.getElementById('tvSettingsOverlay');
    const opened = crTouch.openActivationPanel();      // oeffnet NUR die Ansicht
    const dlg1 = !!document.getElementById('tvSettingsOverlay');
    crTouch.fireHotkey(1); crTouch.fireHotkey(2); crTouch.fireHotkey(3); crTouch.fireHotkey(4);
    crTouch.setStick(true); crTouch._stickDir = 1;
    try { restart(); } catch(_){}
    for(let i=0;i<40;i++) update(0.016);               // Auto-Run + Stick
    crTouch.setStick(false);
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Spion installiert (ChartRunner.sdk.setRealSDK)', spy.installed === true, spy);
  check('Order-Button oeffnet das bestehende Activation-Panel (nur die Ansicht)',
    spy.opened === true && spy.dlg0 === false && spy.dlg1 === true, spy);
  check('KEIN Touch-Element feuert einen Trade (Real-Adapter-Spion === 0)', spy.calls === 0, spy);

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
  // Kein doppeltes Cockpit: der alte Move-Pad (v1.0.430) ist abgeloest, solange
  // die neue Schicht aktiv ist (waehrend eines Runs — game.running).
  const legacy = await T.page.evaluate(() => {
    try { restart(); } catch(_){}
    const pad = document.getElementById('crTouchPad');
    const cs = pad ? getComputedStyle(pad).display : 'none';
    return { present: !!pad, display: cs, bodyOn: document.body.classList.contains('cr-touch-on') };
  });
  check('Alter #crTouchPad abgeloest (display:none bei aktiver crTouch-Schicht)',
    legacy.bodyOn === true && legacy.display === 'none', legacy);

  await T.page.close();

  // ── Desktop-Kontext (Nicht-Touch): die Schicht bleibt aus. ────────────────
  console.log('\n-- 2 · Desktop unberuehrt (Nicht-Touch) --');
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

  console.log('\n== v908 TOUCH-CONTROLS: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
