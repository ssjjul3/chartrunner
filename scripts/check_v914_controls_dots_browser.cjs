/* Smoke-Verifikation v1.0.914 — M0.5: STEUERUNG AUF 3/4 HOEHE + HINTERGRUND-PUNKTE WEG.
 *
 * Zwei kleine visuelle Fixes am Chart-/Play-View. KEINE Logik-Aenderung an
 * Aktionen/Trade-Pfad/Vier-Tore-Weiche/Desktop. Jede scharfe Zeile hat eine
 * Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die Mutationen + Ergebnis stehen in
 * der Commit-Message.
 *
 *   1. POSITION 3/4: bei simuliert KLEINER UND GROSSER visualViewport-Hoehe liegt
 *      die MITTE beider Cluster (#crTouchMove links, #crTouchRight rechts) bei
 *      ~75% der SICHTBAREN Hoehe (top:75% + translateY(-50%)) — NICHT bei 50%,
 *      NICHT in der unteren Chrome-Zone. Die Layer-Hoehe folgt der gestubbten
 *      vv.height (visualViewport-Anker M0.3/M0.4).
 *   2. SEITLICH & SAFE-INSET: Stick am linken, Radial+Order am rechten Rand;
 *      left/right beziehen env(safe-area-inset-left/right) ein (+Komfort-Abstand).
 *   3. PUNKTE WEG: drawBgDefault() rendert kein Background-Dot-/Sternfeld mehr
 *      (statisch: kein Stern-Loop; Laufzeit: drawBackground() zeichnet KEINE
 *      winzigen 1x1-fillRects, nur den grossen Verlauf). Gitter/Achsen-Pfad
 *      (drawPriceAxis) unveraendert vorhanden.
 *   4. TAP-TO-FIRE + Paritaet: Tap je Slot == Flick == Taste (Handler-Spion).
 *   5. WEICHE/SPION: weder Tap noch Order feuern einen Trade; Order oeffnet NUR
 *      die Ansicht. ORDER-GATE (Gast versteckt / verbunden sichtbar).
 *   6. DESKTOP UNBERUEHRT: kein Layer, moveAxis()===0, update() bewegt nicht.
 *   7. REDUCED-MOTION / TOPBAR ≤5 / KEIN CANVAS-DIREKTZUGRIFF.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v914_controls_dots_browser.cjs
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

// Misst die Cluster-Zentren bei einer GESTUBBTEN visualViewport-Hoehe. Gibt fuer
// beide Docks (links=move, rechts=right) center/left/right/top/bottom relativ zur
// sichtbaren Flaeche zurueck, plus die uebernommene Layer-Hoehe.
async function measureAt(page, cutTop, cutBottom){
  return page.evaluate(({ cutTop, cutBottom }) => {
    const iw = window.innerWidth, ih = window.innerHeight;
    const fakeH = Math.max(300, ih - cutTop - cutBottom);
    const fake = { height: fakeH, offsetTop: cutTop, offsetLeft: 0, width: iw,
                   addEventListener(){}, removeEventListener(){} };
    const realVV = window.visualViewport;
    let stubbed = false;
    try { Object.defineProperty(window, 'visualViewport', { configurable:true, value: fake }); stubbed = (window.visualViewport === fake); } catch(_){}
    try { crTouch.syncViewport(); } catch(_){}
    function box(sel){ const el = document.querySelector(sel); const r = el ? el.getBoundingClientRect() : null;
      return r ? { left:r.left, right:r.right, top:r.top, bottom:r.bottom, cx:(r.left+r.right)/2, cy:(r.top+r.bottom)/2 } : { missing:true }; }
    const out = {
      stubbed, iw, ih,
      visTop: fake.offsetTop, visH: fakeH, visBottom: fake.offsetTop + fakeH,
      visCenter: fake.offsetTop + fakeH/2, vis75: fake.offsetTop + fakeH*0.75,
      layerH: parseFloat((document.getElementById('crTouchLayer').style.height) || '0') || 0,
      move:  box('#crTouchMove'),   // Stick-Cluster (links)
      right: box('#crTouchRight'),  // Radial+Order-Cluster (rechts)
    };
    try { Object.defineProperty(window, 'visualViewport', { configurable:true, value: realVV }); } catch(_){}
    try { crTouch.syncViewport(); } catch(_){}
    return out;
  }, { cutTop, cutBottom });
}

// Prueft eine Messung: beide Cluster-MITTEN auf ~75% der sichtbaren Hoehe (NICHT
// 50%, NICHT in der unteren Chrome-Zone), Layer-Hoehe folgt vv, Stick links /
// Radial rechts.
function assertAt75(label, m){
  check(label + ': visualViewport-Stub griff', m.stubbed === true, m);
  check(label + ': Layer-Hoehe folgt der gestubbten visualViewport.height',
    Math.abs(m.layerH - m.visH) <= 2, { layerH: m.layerH, visH: m.visH });
  const tol = Math.max(10, m.visH * 0.07);   // ~7% der sichtbaren Hoehe
  for(const [name, key] of [['Stick-Cluster','move'], ['Radial-Cluster','right']]){
    const c = m[key];
    check(label + ': ' + name + ' Mitte ~75% der sichtbaren Hoehe',
      !c.missing && Math.abs(c.cy - m.vis75) <= tol, { name, cy: c && c.cy, vis75: m.vis75, tol });
    // Scharfmacher: die Mitte ist DEUTLICH tiefer als 50% (Fix wirkt) —
    //   RED, sobald jemand top:75% auf top:50% zuruecksetzt.
    check(label + ': ' + name + ' Mitte klar UNTER 50% (nicht mehr mittig)',
      !c.missing && (c.cy - m.visCenter) >= m.visH * 0.12, { name, cy: c && c.cy, visCenter: m.visCenter });
    // NICHT in der unteren Chrome-Zone: der Cluster bleibt komplett INNERHALB
    //   der sichtbaren Flaeche (Unterkante ueber visBottom).
    check(label + ': ' + name + ' Unterkante ueber der unteren Leiste (in sichtbarer Flaeche)',
      !c.missing && c.bottom <= m.visBottom + 1, { name, bottom: c && c.bottom, visBottom: m.visBottom });
  }
  // Seitlich: Stick links, Radial rechts.
  check(label + ': Stick-Cluster in der linken Bildhaelfte, am linken Rand',
    !m.move.missing && m.move.right < m.iw/2 && m.move.left <= 48, { left: m.move.left, right: m.move.right, iw: m.iw });
  check(label + ': Radial-Cluster in der rechten Bildhaelfte, am rechten Rand',
    !m.right.missing && m.right.left > m.iw/2 && (m.iw - m.right.right) <= 48, { left: m.right.left, right: m.right.right, iw: m.iw });
}

(async () => {
  const browser = await chromium.launch(launchOptions());

  // ── 0 · Quell-Scan (statisch) ──────────────────────────────────────────────
  console.log('\n-- 0 · Quell-Scan: Modul-Version, top:75%, Safe-Insets, Punkte weg --');
  const src = fs.readFileSync(FILE, 'utf8');
  const mStart = src.indexOf('window.crTouch = (function(){');
  const mEnd = src.indexOf('\n})();', mStart);
  const mod = (mStart >= 0 && mEnd > mStart) ? src.slice(mStart, mEnd) : '';
  check('crTouch-Modul im Quelltext gefunden', mod.length > 500, { len: mod.length });
  check('Modul enthaelt KEIN marketSwap/limitVault/triggerCreate/quote (kein Trade-Code)',
    mod.length > 500 && !/marketSwap|limitVault|triggerCreate|\bquote\b/i.test(mod));
  check('crTouch VERSION auf 1.0.914 gesetzt', /var VERSION = '1\.0\.914'/.test(mod),
    { has: /var VERSION = '([^']+)'/.exec(mod) && RegExp.$1 });
  // Fix 1: top:75% + translateY(-50%) an beiden Docks.
  check('Rechtes Cluster: top:75% + translateY(-50%)',
    /#crTouchRight\{[\s\S]*?top:75%;transform:translateY\(-50%\)/.test(mod));
  check('Linkes Cluster: top:75% + translateY(-50%)',
    /#crTouchMove\{[\s\S]*?top:75%;transform:translateY\(-50%\)/.test(mod));
  check('Kein top:50% mehr an den zwei Cluster-Docks',
    !/#crTouchRight\{[\s\S]*?top:50%;transform:translateY\(-50%\)/.test(mod) &&
    !/#crTouchMove\{[\s\S]*?top:50%;transform:translateY\(-50%\)/.test(mod));
  check('Rechtes Cluster: env(safe-area-inset-right) beachtet',
    /#crTouchRight\{[\s\S]*?env\(safe-area-inset-right/.test(mod));
  check('Linkes Cluster: env(safe-area-inset-left) beachtet',
    /#crTouchMove\{[\s\S]*?env\(safe-area-inset-left/.test(mod));

  // Fix 2: drawBgDefault ohne Stern-/Punktfeld, Verlauf bleibt; Gitter-Pfad da.
  const bgStart = src.indexOf('function drawBgDefault(){');
  const bgEnd = src.indexOf('function drawPriceAxis(', bgStart);
  const bg = (bgStart >= 0 && bgEnd > bgStart) ? src.slice(bgStart, bgEnd) : '';
  check('drawBgDefault im Quelltext gefunden', bg.length > 40, { len: bg.length });
  check('drawBgDefault: Verlauf bleibt (createLinearGradient + fillRect(0,0,W,H))',
    /createLinearGradient/.test(bg) && /fillRect\(0,0,W,H\)/.test(bg));
  // Kommentare (//… und /*…*/) strippen, damit die Erklaerung „Sternfeld entfernt"
  // im Kommentar den Test nicht faelschlich rot macht — geprueft wird der CODE.
  const bgCode = bg.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  check('drawBgDefault: KEIN Stern-/Punkt-Loop mehr im CODE (kein for / mulberry32 / 1x1-fillRect)',
    !/for\s*\(/.test(bgCode) && !/mulberry32/.test(bgCode) &&
    !/\.fillRect\([^)]*,\s*1\s*,\s*1\s*\)/.test(bgCode), { bgCode: bgCode.slice(0, 400) });
  check('Gitter-/Achsen-Pfad unveraendert vorhanden (drawPriceAxis mit ctx.stroke)',
    /function drawPriceAxis\(\)\{[\s\S]*?ctx\.stroke\(\)/.test(src));
  // Der Idle-Ambient-Twinkle-Overlay ist bereits ein No-op (kein zweites Sternfeld).
  check('drawAmbient() ist ein No-op (kein zweites Sternfeld)',
    /function drawAmbient\(\)\{[\s\S]{0,220}?return;/.test(src));

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
  check('Banner meldet mindestens v1.0.914',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 914)))), bv);

  await enterChart(T.page);
  // Order sichtbar machen, damit das rechte Cluster seine volle Hoehe hat.
  await T.page.evaluate(() => { window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){} });

  // ── 1 · POSITION 3/4 bei KLEINER UND GROSSER Viewport-Hoehe ─────────────────
  console.log('\n-- 1 · Position 3/4: kleine (−400) UND grosse (voll) Viewport-Hoehe --');
  const small = await measureAt(T.page, 60, 340);   // grosse untere + kleine obere Leiste → kleine sichtbare Hoehe
  assertAt75('KLEIN', small);
  const large = await measureAt(T.page, 0, 0);       // keine Leiste → volle Hoehe
  assertAt75('GROSS', large);
  // Die 75%-Mitte liegt bei kleiner vs. grosser Hoehe an VERSCHIEDENEN Bildschirm-Y
  // — beweist, dass sie der sichtbaren Flaeche folgt (nicht fix am Boden/Layout-VP).
  check('Mitte folgt der sichtbaren Flaeche (klein ≠ gross)',
    Math.abs(small.move.cy - large.move.cy) > 20, { smallCy: small.move.cy, largeCy: large.move.cy });

  // ── 2 · PUNKTE WEG (Laufzeit-Canvas-Assertion) ──────────────────────────────
  console.log('\n-- 2 · Punkte weg: drawBackground() zeichnet keine winzigen 1x1-Punkte --');
  const dots = await T.page.evaluate(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const orig = proto.fillRect;
    const calls = [];
    proto.fillRect = function(x, y, w, h){ calls.push([w, h]); return orig.apply(this, arguments); };
    let threw = false;
    try { drawBackground(); } catch(e){ threw = String((e && e.message) || e); }
    proto.fillRect = orig;
    const tiny = calls.filter(a => a[0] <= 2 && a[1] <= 2).length;
    const big  = calls.filter(a => a[0] > 50 && a[1] > 50).length;   // der Verlaufs-Fill (W×H)
    return { total: calls.length, tiny, big, threw };
  });
  check('drawBackground() lief ohne Fehler', dots.threw === false, dots);
  check('drawBackground() fuellt weiter den Verlauf (mind. ein grosser fillRect)', dots.big >= 1, dots);
  check('drawBackground() zeichnet KEINE winzigen 1x1-Punkte mehr (Sternfeld weg)',
    dots.tiny === 0, dots);

  // ── 3 · TAP-TO-FIRE + Paritaet (Tap == Flick == Taste) ──────────────────────
  console.log('\n-- 3 · Tap-to-fire: jeder Slot feuert beim Antippen, Paritaet zu Flick/Taste --');
  const tapArgs = await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    const radial = document.getElementById('crTouchRadial');
    const orig = crTouch.fireHotkey;
    const out = {};
    for(const hk of ['1','2','3','4']){
      radial.classList.add('labels');
      window.__fh = [];
      crTouch.fireHotkey = function(n){ window.__fh.push(String(n)); return orig.apply(this, arguments); };
      const el = document.querySelector('#crTouchRadial .slot[data-cr-hk="' + hk + '"]');
      el.click();
      crTouch.fireHotkey = orig;
      out[hk] = { calls: window.__fh.slice(), collapsed: !radial.classList.contains('labels') };
    }
    return out;
  });
  check('Tap oben (HK1) → fireHotkey("1")',  tapArgs['1'].calls.length === 1 && tapArgs['1'].calls[0] === '1', tapArgs['1']);
  check('Tap rechts (HK2) → fireHotkey("2")', tapArgs['2'].calls.length === 1 && tapArgs['2'].calls[0] === '2', tapArgs['2']);
  check('Tap unten (HK3) → fireHotkey("3")',  tapArgs['3'].calls.length === 1 && tapArgs['3'].calls[0] === '3', tapArgs['3']);
  check('Tap links (HK4) → fireHotkey("4")',  tapArgs['4'].calls.length === 1 && tapArgs['4'].calls[0] === '4', tapArgs['4']);
  check('Tap: nach dem Antippen klappt das Rad ein (Collapse)',
    tapArgs['1'].collapsed && tapArgs['2'].collapsed && tapArgs['3'].collapsed && tapArgs['4'].collapsed, tapArgs);

  // Handler-Paritaet: Tap == Taste == Flick landen im selben Handler.
  await T.page.evaluate(() => {
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    window.__ua = []; const o = window.useAbility;
    window.useAbility = function(n){ window.__ua.push(n); return o && o.apply(this, arguments); };
    window.__tv = 0; const t = window.toggleVehicle;
    window.toggleVehicle = function(){ window.__tv++; return t && t.apply(this, arguments); };
    document.getElementById('crTouchRadial').classList.add('labels');
  });
  await T.page.keyboard.press('1');
  const k1 = await T.page.evaluate(() => { const v = window.__tv; window.__tv = 0; return v; });
  const f1 = await T.page.evaluate(() => { crTouch.flick(0, -50); const v = window.__tv; window.__tv = 0; return v; });
  const p1 = await T.page.evaluate(() => { document.getElementById('crTouchRadial').classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="1"]').click(); const v = window.__tv; window.__tv = 0; return v; });
  check('HK1-Paritaet: Taste==Flick==Tap → toggleVehicle je 1×', k1 === 1 && f1 === 1 && p1 === 1, { k1, f1, p1 });
  await T.page.keyboard.press('2');
  const k2 = await T.page.evaluate(() => { const v = window.__ua.slice(); window.__ua = []; return v; });
  const f2 = await T.page.evaluate(() => { crTouch.flick(50, 0); const v = window.__ua.slice(); window.__ua = []; return v; });
  const p2 = await T.page.evaluate(() => { document.getElementById('crTouchRadial').classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="2"]').click(); const v = window.__ua.slice(); window.__ua = []; return v; });
  check('HK2-Paritaet: Taste==Flick==Tap → useAbility(2) je 1×',
    k2.length === 1 && k2[0] === 2 && f2.length === 1 && f2[0] === 2 && p2.length === 1 && p2[0] === 2, { k2, f2, p2 });

  // ── 4 · FLICK-REGRESSION (Winkel → Slot unveraendert) ───────────────────────
  console.log('\n-- 4 · Flick-Regression: press-and-flick feuert weiter korrekt --');
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

  // ── 5 · WEICHE/SPION + ORDER-GATE ───────────────────────────────────────────
  console.log('\n-- 5 · Weiche/Spion: Tap/Order feuern keinen Trade; Order-Gate --');
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
    const radial = document.getElementById('crTouchRadial');
    for(const hk of ['1','2','3','4']){ radial.classList.add('labels'); document.querySelector('#crTouchRadial .slot[data-cr-hk="' + hk + '"]').click(); }
    crTouch.flick(0,-50); crTouch.flick(50,0); crTouch.flick(0,50); crTouch.flick(-50,0); crTouch.flick(0,0);
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Order-Button oeffnet NUR die Ansicht (Activation-Panel)',
    spy.opened === true && spy.dlg0 === false && spy.dlg1 === true, spy);
  check('KEIN Touch-Element feuert einen Trade (Real-Adapter-Spion === 0)', spy.calls === 0, spy);
  const gate = await T.page.evaluate(() => {
    window.crGuest = () => true;  try { crTouch.syncGates(); } catch(_){}
    const guestHidden = document.getElementById('crTouchOrder').hidden === true;
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    const connShown = document.getElementById('crTouchOrder').hidden === false;
    return { guestHidden, connShown };
  });
  check('Order als Gast versteckt (hidden)', gate.guestHidden === true, gate);
  check('Order verbunden sichtbar', gate.connShown === true, gate);

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

  // ── 7 · DESKTOP UNBERUEHRT (Nicht-Touch) ────────────────────────────────────
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
  check('Desktop: moveAxis() === 0 (kein Stick)', desk.axis === 0, desk);
  check('Desktop: update()-Lauf ohne Eingabe bewegt den Runner NICHT', desk.moved === 0, desk);
  await D.page.close();

  console.log('\n== v914 CONTROLS+DOTS: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
