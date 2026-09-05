/* Smoke-Verifikation v1.0.915 — M0.6: EIN-BUTTON-SELEKTOR + SHOOT AM TOUCH + SUPPORT MOBIL.
 *
 * Ersetzt die rechte Steuer-Seite durch EINEN transparenten Selektor-Button:
 * Tippen (kurz) oeffnet den Icon-Faecher, Tippen auf ein Icon waehlt, Gedrueckt-
 * Halten fuehrt die gewaehlte Funktion aus (Paritaet zur Taste/HK). Neu: Shoot
 * am Touch (Ziel = Stick-Neigung). Support-Overlay mobil gefixt. Aktionen/Trade-
 * Pfad/Weiche/Desktop bit-fuer-bit unberuehrt.
 *
 *   1. EIN BUTTON: rechts genau EIN Selektor-Control im Ruhezustand (Faecher zu);
 *      kein Radial (#crTouchRadial), kein separater Order-Button (#crTouchOrder),
 *      kein sichtbarer FIRE-/Ability-Knopf.
 *   2. TIPPEN→FAECHER→WAEHLEN: Tap oeffnet den Faecher; Tap auf Icon N setzt die
 *      Auswahl, schliesst den Faecher, der Button zeigt Icon N.
 *   3. HALTEN→AUSFUEHREN mit Paritaet: Halten ruft fuer die gewaehlte Funktion
 *      EXAKT denselben key wie die Taste (control.hold): Shoot=' ', HK1='1' … HK4='4';
 *      Order-Halten oeffnet NUR das Panel (kein key). Loslassen stoppt (keyup).
 *   4. SHOOT-ZIEL = STICK-NEIGUNG: crTouch.aimVec folgt _stickVec; shoot() feuert
 *      entlang der Neigung (Vorzeichen vx/vy); neutral → aimVec null (Fallback).
 *   5. ORDER-GATE/WEICHE: Order oeffnet nur die Ansicht; KEIN Touch-Element feuert
 *      einen Trade (Real-Adapter-Spion === 0).
 *   6. GAST-GATE: Gast → HK3/HK4 NICHT im Faecher; verbunden → sichtbar (live via
 *      syncGates). Shoot/HK1/HK2/Order Basis fuer alle.
 *   7. SUPPORT MOBIL: drawSetupGuide-Karte ≤ sichtbare Viewport-Breite, links nicht
 *      abgeschnitten (x ≥ Safe-Inset+Rand), bei kleiner UND grosser Viewport-Breite,
 *      frei von den 3/4-Controls.
 *   8. DESKTOP UNBERUEHRT / reduced-motion / Topbar ≤5 / kein Canvas-Direktzugriff.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v915_selektor_browser.cjs
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

// Deterministisch ins Chart-View + Touch-Schicht erzwingen (Selektor gebaut).
async function enterChart(page){
  await page.evaluate(() => {
    try { document.body.classList.remove('crSplashUp'); } catch(_){}
    try { restart(); } catch(_){}
    try { window.crGuest = () => false; } catch(_){}
    try { crTouch.setActive(true); } catch(_){}   // baut die Schicht + syncGates
    try { crTouch.refresh(); } catch(_){}
  });
}

// Selektiert eine Funktion (oeffnet Faecher, tippt Icon) und HAELT den Button
// > HOLD_MS, misst die dispatchten control.hold-Keys + Panel-Oeffnungen.
async function holdFunction(page, fnId){
  await page.evaluate((id) => {
    // Spion direkt auf crTouch.holdKey (den Aufruf, den der Selektor macht) —
    // pfadunabhaengig (control.hold ist nur auf localhost da, sonst KeyboardEvent).
    if(!window.__origHold){ window.__origHold = crTouch.holdKey; }
    if(!window.__origPanel){ window.__origPanel = crTouch.openActivationPanel; }
    window.__hold = []; window.__panel = 0;
    crTouch.holdKey = function(k, on){ window.__hold.push([k, on === false ? false : true]); return window.__origHold.call(crTouch, k, on); };
    crTouch.openActivationPanel = function(){ window.__panel++; return true; /* Ansicht-Spion, kein echter Open im Parity-Test */ };
    // Faecher oeffnen (Tap) + Icon waehlen.
    const b = document.getElementById('crSelBtn');
    b.dispatchEvent(new PointerEvent('pointerdown', { pointerId:1, bubbles:true, cancelable:true }));
    b.dispatchEvent(new PointerEvent('pointerup',   { pointerId:1, bubbles:true, cancelable:true }));
    const item = document.querySelector('#crSelFan .fanItem[data-fn="' + id + '"]');
    if(item) item.click();
    // Halten starten.
    b.dispatchEvent(new PointerEvent('pointerdown', { pointerId:2, bubbles:true, cancelable:true }));
  }, fnId);
  await page.waitForTimeout(230);   // > HOLD_MS (160)
  const during = await page.evaluate(() => ({ hold: window.__hold.slice(), panel: window.__panel,
    exec: !!document.getElementById('crSelBtn').classList.contains('exec') }));
  await page.evaluate(() => {
    document.getElementById('crSelBtn').dispatchEvent(new PointerEvent('pointerup', { pointerId:2, bubbles:true, cancelable:true }));
  });
  const after = await page.evaluate(() => {
    const r = { hold: window.__hold.slice(), panel: window.__panel,
      exec: !!document.getElementById('crSelBtn').classList.contains('exec') };
    // Originale wiederherstellen fuer den naechsten Fall.
    try { crTouch.holdKey = window.__origHold; } catch(_){}
    try { crTouch.openActivationPanel = window.__origPanel; } catch(_){}
    return r;
  });
  return { during, after };
}

(async () => {
  const browser = await chromium.launch(launchOptions());

  // ── 0 · Quell-Scan (statisch) ──────────────────────────────────────────────
  console.log('\n-- 0 · Quell-Scan: Version, Ein-Button-Selektor, keine Radial-Reste --');
  const src = fs.readFileSync(FILE, 'utf8');
  const mStart = src.indexOf('window.crTouch = (function(){');
  const mEnd = src.indexOf('\n})();', mStart);
  const mod = (mStart >= 0 && mEnd > mStart) ? src.slice(mStart, mEnd) : '';
  check('crTouch-Modul gefunden', mod.length > 500, { len: mod.length });
  check('crTouch VERSION auf 1.0.915', /var VERSION = '1\.0\.915'/.test(mod),
    { has: /var VERSION = '([^']+)'/.exec(mod) && RegExp.$1 });
  check('Modul enthaelt KEIN marketSwap/limitVault/triggerCreate/quote (kein Trade-Code)',
    mod.length > 500 && !/marketSwap|limitVault|triggerCreate|\bquote\b/i.test(mod));
  check('Selektor-Button #crSelBtn im Modul', /#crSelBtn/.test(mod) && /id = 'crSelBtn'/.test(mod));
  check('Icon-Faecher #crSelFan im Modul', /#crSelFan/.test(mod) && /id = 'crSelFan'/.test(mod));
  check('KEIN altes Radial/Order mehr (#crTouchRadial/#crTouchOrder aus dem Modul raus)',
    !/crTouchRadial/.test(mod) && !/crTouchOrder/.test(mod));
  check('Rechtes Cluster: top:75% (3/4 Hoehe) + env(safe-area-inset-right)',
    /#crTouchRight\{[\s\S]*?top:75%/.test(mod) && /#crTouchRight\{[\s\S]*?env\(safe-area-inset-right/.test(mod));
  check('holdKey ueber control.hold (Paritaet: keydown/keyup)',
    /API\.holdKey/.test(mod) && /ChartRunner\.control\.hold/.test(mod));
  check('aimVec (Zielen = Stick-Neigung)', /API\.aimVec/.test(mod));
  check('reduced-motion-Guard im injizierten CSS',
    /@media \(prefers-reduced-motion: no-preference\)/.test(mod));
  // shoot() liest die Stick-Neigung nur auf der Touch-Schicht.
  const shStart = src.indexOf('function shoot(){');
  const shEnd = src.indexOf('\nfunction ', shStart + 10);
  const sh = (shStart >= 0 && shEnd > shStart) ? src.slice(shStart, shEnd) : '';
  check('shoot() nimmt crTouch.aimVec NUR auf crTouch.active (Desktop unberuehrt)',
    /crTouch\.active/.test(sh) && /crTouch\.aimVec/.test(sh), { len: sh.length });

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
  check('Banner meldet mindestens v1.0.915',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 915)))), bv);

  await enterChart(T.page);

  // ── 1 · EIN BUTTON im Ruhezustand ───────────────────────────────────────────
  console.log('\n-- 1 · Ein Selektor-Control, kein Radial/Order/FIRE --');
  const rest = await T.page.evaluate(() => {
    const right = document.getElementById('crTouchRight');
    const fan = document.getElementById('crSelFan');
    const btns = right ? right.querySelectorAll('button').length : -1;
    // Sichtbare (nicht display:none) Tap-Ziele im rechten Cluster:
    const visible = right ? [...right.querySelectorAll('button, [role="button"]')]
      .filter(el => el.offsetParent !== null).length : -1;
    return {
      hasSel: !!document.getElementById('crSelBtn'),
      fanHidden: !!(fan && fan.hidden),
      buttons: btns,
      visibleTargets: visible,
      radial: !!document.getElementById('crTouchRadial'),
      order:  !!document.getElementById('crTouchOrder'),
    };
  });
  check('#crSelBtn existiert', rest.hasSel === true, rest);
  check('Faecher im Ruhezustand ZU (hidden)', rest.fanHidden === true, rest);
  check('rechtes Cluster: genau EIN <button> (der Selektor)', rest.buttons === 1, rest);
  check('rechtes Cluster: genau EIN sichtbares Tap-Ziel im Ruhezustand', rest.visibleTargets === 1, rest);
  check('kein altes Radial (#crTouchRadial) im DOM', rest.radial === false, rest);
  check('kein separater Order-Button (#crTouchOrder) im DOM', rest.order === false, rest);

  // ── 2 · TIPPEN → FAECHER → WAEHLEN ──────────────────────────────────────────
  console.log('\n-- 2 · Tippen oeffnet den Faecher, Tippen auf ein Icon waehlt --');
  const tap = await T.page.evaluate(() => {
    const b = document.getElementById('crSelBtn');
    b.dispatchEvent(new PointerEvent('pointerdown', { pointerId:1, bubbles:true, cancelable:true }));
    b.dispatchEvent(new PointerEvent('pointerup',   { pointerId:1, bubbles:true, cancelable:true }));
    const openHidden = document.getElementById('crSelFan').hidden;
    const items = [...document.querySelectorAll('#crSelFan .fanItem')].map(el => el.getAttribute('data-fn'));
    // Icon '2' (Ausricht) waehlen.
    document.querySelector('#crSelFan .fanItem[data-fn="2"]').click();
    const closedHidden = document.getElementById('crSelFan').hidden;
    const btnIc = document.querySelector('#crSelBtn .ic').textContent;
    return { openHidden, items, closedHidden, btnIc };
  });
  check('Tap oeffnet den Faecher (nicht hidden)', tap.openHidden === false, tap);
  check('Faecher enthaelt die sechs Funktionen (verbunden)',
    tap.items.length === 6 && tap.items.join(',') === 'shoot,1,2,3,4,order', tap);
  check('Tap auf Icon "2" schliesst den Faecher', tap.closedHidden === true, tap);
  check('Button zeigt danach das Icon der Funktion 2 (📏)', tap.btnIc === '📏', tap);

  // ── 3 · HALTEN → AUSFUEHREN mit Paritaet (Shoot/HK1–HK4/Order) ──────────────
  console.log('\n-- 3 · Halten fuehrt aus: control.hold(key) je Funktion, Loslassen stoppt --');
  const EXPECT = { shoot:' ', '1':'1', '2':'2', '3':'3', '4':'4' };
  for(const id of ['shoot','1','2','3','4']){
    const r = await holdFunction(T.page, id);
    const k = EXPECT[id];
    const downOk = r.during.hold.some(h => h[0] === k && h[1] === true);
    const upOk   = r.after.hold.some(h => h[0] === k && h[1] === false);
    check('Halten ' + id + ' → keydown "' + (k === ' ' ? 'Space' : k) + '" (Sweep laeuft)',
      downOk && r.during.exec === true, r.during);
    check('Loslassen ' + id + ' → keyup "' + (k === ' ' ? 'Space' : k) + '" (Sweep aus)',
      upOk && r.after.exec === false, r.after);
    check('Halten ' + id + ' → KEIN Panel-Open (nur Order oeffnet das Panel)', r.after.panel === 0, r.after);
  }
  const ord = await holdFunction(T.page, 'order');
  check('Halten Order → Activation-Panel geoeffnet (genau 1×)', ord.during.panel === 1, ord.during);
  check('Halten Order → KEIN Tasten-key gehalten (nur Panel)', ord.after.hold.length === 0, ord.after);

  // ── 4 · SHOOT-ZIEL = STICK-NEIGUNG ──────────────────────────────────────────
  console.log('\n-- 4 · Shoot zielt entlang der Stick-Neigung; neutral → Fallback --');
  const aim = await T.page.evaluate(() => {
    function fire(vec){
      crTouch._stickVec = vec ? { x:vec.x, y:vec.y } : null;
      crTouch._lastAim  = vec ? { x:vec.x, y:vec.y } : null;
      const a = crTouch.aimVec();
      try { player.shootCooldown = 0; } catch(_){}
      try { game.bullets.length = 0; } catch(_){}
      let threw = false; try { shoot(); } catch(e){ threw = String(e); }
      const b = (game.bullets && game.bullets.length) ? game.bullets[game.bullets.length - 1] : null;
      return { a, threw, vx: b ? b.vxPx : null, vy: b ? b.vyPx : null };
    }
    const up    = fire({ x:0, y:-1 });   // Stick nach oben  → Schuss nach oben (vy < 0)
    const right = fire({ x:1, y:0 });    // Stick nach rechts → Schuss nach rechts (vx > 0)
    const down  = fire({ x:0, y:1 });    // Stick nach unten → Schuss nach unten (vy > 0)
    // neutral: kein Vektor, keine letzte Richtung → aimVec null (Fallback greift)
    crTouch._stickVec = null; crTouch._lastAim = null;
    const neutral = crTouch.aimVec();
    return { up, right, down, neutral };
  });
  check('aimVec folgt der Neigung (oben ≈ {0,-1})',
    aim.up.a && Math.abs(aim.up.a.x) < 0.01 && aim.up.a.y < -0.99, aim.up.a);
  check('Shoot nach OBEN: dominante vy < 0', aim.up.threw === false && aim.up.vy < 0 && Math.abs(aim.up.vy) >= Math.abs(aim.up.vx), aim.up);
  check('Shoot nach RECHTS: dominante vx > 0', aim.right.vx > 0 && Math.abs(aim.right.vx) >= Math.abs(aim.right.vy), aim.right);
  check('Shoot nach UNTEN: dominante vy > 0', aim.down.vy > 0 && Math.abs(aim.down.vy) >= Math.abs(aim.down.vx), aim.down);
  check('Neutraler Stick → aimVec null (Fallback Lauf-/Blickrichtung)', aim.neutral === null, { neutral: aim.neutral });

  // ── 5 · ORDER-GATE / WEICHE: kein Trade durch ein Touch-Element ─────────────
  console.log('\n-- 5 · Order oeffnet nur die Ansicht; kein Touch-Element feuert einen Trade --');
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
    // Alle HK-Halten (echte Ausfuehrung) einmal durchspielen — keine darf traden.
    for(const k of [' ', '1', '2', '3', '4']){ try { crTouch.holdKey(k, true); crTouch.holdKey(k, false); } catch(_){} }
    return { installed, opened, dlg0, dlg1, calls: window.__calls };
  });
  check('Order-Halten/openActivationPanel oeffnet NUR die Ansicht (Activation-Panel)',
    spy.opened === true && spy.dlg0 === false && spy.dlg1 === true, spy);
  check('KEIN Touch-Element feuert einen Trade (Real-Adapter-Spion === 0)', spy.calls === 0, spy);

  // ── 6 · GAST-GATE: HK3/HK4 nicht im Faecher ─────────────────────────────────
  console.log('\n-- 6 · Gast → HK3/HK4 nicht im Faecher; verbunden → sichtbar --');
  const gate = await T.page.evaluate(() => {
    window.crGuest = () => true;  try { crTouch.syncGates(); } catch(_){}
    const guestFns = [...document.querySelectorAll('#crSelFan .fanItem')].map(el => el.getAttribute('data-fn'));
    window.crGuest = () => false; try { crTouch.syncGates(); } catch(_){}
    const connFns = [...document.querySelectorAll('#crSelFan .fanItem')].map(el => el.getAttribute('data-fn'));
    return { guestFns, connFns };
  });
  check('Gast-Faecher OHNE HK3/HK4', !gate.guestFns.includes('3') && !gate.guestFns.includes('4'), gate.guestFns);
  check('Gast-Faecher MIT Basis (shoot/HK1/HK2/order)',
    ['shoot','1','2','order'].every(id => gate.guestFns.includes(id)), gate.guestFns);
  check('Verbunden-Faecher MIT HK3 + HK4', gate.connFns.includes('3') && gate.connFns.includes('4'), gate.connFns);

  // ── 7 · SUPPORT MOBIL: Karte im Bild bei kleiner UND grosser Breite ─────────
  console.log('\n-- 7 · Support-Overlay: Karte ≤ Viewport-Breite, links nicht abgeschnitten --');
  for(const w of [360, 1280]){
    await T.page.setViewportSize({ width: w, height: 780 });
    const card = await T.page.evaluate(() => {
      try { game.campaignChapter = 0; } catch(_){}
      try { game.supportEnabled = true; } catch(_){}
      try { game.laserAiming = true; game.laserTool = 'ladder'; game.laserPhase = 'anchor1'; } catch(_){}
      try { resize(); } catch(_){}
      let threw = false; try { drawSetupGuide(); } catch(e){ threw = String(e); }
      return { threw, card: game._setupGuideCard || null };
    });
    const c = card.card;
    check('Support @' + w + ': drawSetupGuide lief ohne Fehler', card.threw === false && !!c, card);
    check('Support @' + w + ': Karten-Breite ≤ sichtbare Viewport-Breite',
      !!c && c.w <= c.viewW && c.w <= w, c);
    check('Support @' + w + ': linke Kante NICHT abgeschnitten (x ≥ Safe-Inset+Rand)',
      !!c && c.x >= (c.leftInset - 0.5), c);
    check('Support @' + w + ': rechte Kante im Bild (x+w ≤ Viewport − Safe-Inset)',
      !!c && (c.x + c.w) <= (c.viewW - c.rightInset + 0.5), c);
    if(w === 360) check('Support @360: Karte schrumpft unter die 480px-Vollbreite',
      !!c && c.w < 480, c);
  }
  await T.page.setViewportSize({ width: 390, height: 844 });

  // ── 8 · CANVAS/TOPBAR/reduced-motion ────────────────────────────────────────
  console.log('\n-- 8 · Kein Canvas-Direktzugriff / Topbar ≤5 / reduced-motion --');
  const dom = await T.page.evaluate(() => {
    const l = document.getElementById('crTouchLayer');
    const parentTag = l && l.parentElement ? l.parentElement.tagName.toLowerCase() : '';
    const inCanvas = !!(l && l.closest && l.closest('canvas'));
    const bar = document.getElementById('crOSBar');
    const ctrlInBar = !!(bar && bar.querySelector('#crSelBtn, #crSelFan, #crTouchStick'));
    const barBtns = bar ? bar.querySelectorAll('.cr-bar-btn').length : -1;
    const css = document.getElementById('crTouchCss');
    return { parentTag, inCanvas, ctrlInBar, barBtns,
      rmGuard: !!(css && /@media \(prefers-reduced-motion: no-preference\)/.test(css.textContent)) };
  });
  check('Layer haengt am body (nicht im Canvas)', dom.parentTag === 'body' && dom.inCanvas === false, dom);
  check('Kein Touch-Bedienelement in der Topbar (#crOSBar)', dom.ctrlInBar === false, dom);
  check('Topbar bleibt bei ≤5 Kommandos', dom.barBtns <= 5, dom);
  check('reduced-motion-Guard im injizierten CSS (Laufzeit)', dom.rmGuard === true, dom);
  await T.page.close();

  // ── 9 · DESKTOP UNBERUEHRT (Nicht-Touch) ────────────────────────────────────
  console.log('\n-- 9 · Desktop unberuehrt (Nicht-Touch) --');
  const D = await boot(browser, { viewport:{ width:1280, height:900 } });
  const desk = await D.page.evaluate(() => {
    const layer = document.getElementById('crTouchLayer');
    try { restart(); } catch(_){}
    const x0 = player.wx; for(let i=0;i<60;i++) update(0.016); const moved = player.wx - x0;
    // Selbst wenn jemand einen Stick-Vektor setzt: am Desktop ist crTouch.active
    // false → shoot() nimmt weiter die Maus (der aimVec-Zweig wird nie betreten).
    let aimUsed = false;
    try { crTouch._stickVec = { x:0, y:-1 }; aimUsed = !!(crTouch.active); } catch(_){}
    return { active: !!(window.crTouch && crTouch.active), layer: !!layer,
             axis: window.crTouch ? crTouch.moveAxis() : 'no', moved, aimUsed };
  });
  check('Desktop: crTouch.active === false', desk.active === false, desk);
  check('Desktop: KEIN Layer im DOM (nur auf Touch gebaut)', desk.layer === false, desk);
  check('Desktop: moveAxis() === 0 (kein Stick)', desk.axis === 0, desk);
  check('Desktop: update()-Lauf ohne Eingabe bewegt den Runner NICHT', desk.moved === 0, desk);
  check('Desktop: Shoot-Aim-Zweig inaktiv (crTouch.active false)', desk.aimUsed === false, desk);
  await D.page.close();

  console.log('\n== v915 SELEKTOR: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
