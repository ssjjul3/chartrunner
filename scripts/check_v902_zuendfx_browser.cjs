/* Smoke-Verifikation v1.0.902 — S5a.2 · Block B: ZUEND-FX FUER HOTKEY 2 & 3.
 *
 * Das Prinzip in einem Satz: DIE FX RUFEN NUR DIE SECHS HELFER UND STEMPELN
 * OVERLAY-FELDER — die Leinwand zeichnet der Chart. Geprueft wird gegen die
 * ECHTEN Commit-Wege (commitLaserSingleClick / commitLaserTwoAnchor) und den
 * ECHTEN Renderer (drawAnchorLines), nicht gegen einen Nachbau.
 *
 * Scharf geprueft wird, was den Chart unlesbar oder die Regel kaputt macht:
 *   · B1: Zuenden → Linie faehrt aus (fxBorn/extendP), rastet mit hitStop
 *     ein (Spion zaehlt), Lade-Ring-Partikel am Runner.
 *   · B2: TWAP-Paar faehrt NACHEINANDER aus (Stagger), ARMED-Banner NUR
 *     fuer Order-Linien und gedrosselt; Zone/Sweep liefern Renderer-Werte.
 *   · Kreuzer: Preis wechselt die Seite → Funken + BLAUER Flash; die
 *     Drossel (2 s je Linie) verhindert Spam.
 *   · Re-Route → Partikel + „→ aktualisiert"-Float; Cancel → Zerfall.
 *   · reduced-motion (emuliert): keine Ausfahrt, kein Snap-hitStop, keine
 *     Partikel/Flashes aus dem Modul, Zone statisch ohne Sweep.
 *   · Hard Rule 4: das FX-Modul enthaelt KEIN `ctx.` (Quelltext-Grep).
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v902_zuendfx_browser.cjs
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

async function bootPage(browser, opts){
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  if(opts && opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  /* Spione auf die Helfer, die Block B ruft — die ECHTEN laufen weiter. */
  await page.evaluate(() => {
    window.__hs = 0;
    const oldHS = hitStop;
    hitStop = (ms) => { window.__hs++; return oldHS(ms); };
    window.__notes = [];
    const oldN = crNotify;
    crNotify = (m, k) => { try { window.__notes.push(String(m)); } catch(_){} return oldN(m, k); };
    window.__pc = () => game.particles.length;
    window.__fc = () => game.floats.length;
  });
  return { page, errs };
}

(async () => {
  console.log('\n-- Hard Rule 4: FX-Modul fasst die Leinwand nie an --');
  const html = fs.readFileSync(FILE, 'utf8');
  const mStart = html.indexOf('window.crZuendFx = (function(){');
  const mEnd = html.indexOf('})();', mStart);
  const modSrc = (mStart >= 0 && mEnd > mStart) ? html.slice(mStart, mEnd) : '';
  check('crZuendFx-Modul gefunden', modSrc.length > 500, mStart);
  check('kein ctx./getContext/fillRect/beginPath im FX-Modul',
    !/\bctx\.|getContext|fillRect|beginPath/.test(modSrc));

  const browser = await chromium.launch(launchOptions());
  const { page, errs } = await bootPage(browser, {});

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.902',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 902)))), bv);

  console.log('\n-- B1 · Zuenden: Ausfahren + Einrasten (echter Commit-Weg) --');
  let b1 = await page.evaluate(() => {
    game.anchorLines = [];
    game.particles.length = 0;
    const hs0 = window.__hs;
    const price = currentPrice();
    commitLaserSingleClick('hline', 200, 200, player.wx, price * 1.02, false, () => {});
    const l = game.anchorLines[game.anchorLines.length - 1];
    return { born: l ? l.fxBorn : null, p: l ? crZuendFx.extendP(l) : null,
             particles: game.particles.length, hs0, hs1: window.__hs };
  });
  check('frische Linie traegt fxBorn und faehrt aus (extendP < 1)',
    b1.born > 0 && b1.p !== null && b1.p < 1, b1);
  check('Zuenden spawnt Partikel (Klick-Burst + Lade-Ring am Runner)', b1.particles > 0, b1);
  check('Klick-hitStop gezaehlt', b1.hs1 > b1.hs0, b1);
  await page.waitForTimeout(500);
  b1 = await page.evaluate(() => {
    const l = game.anchorLines[game.anchorLines.length - 1];
    return { p: crZuendFx.extendP(l), hs: window.__hs };
  });
  check('nach ~500 ms: Linie fertig ausgefahren (extendP = 1)', b1.p === 1, b1);
  check('Einrasten am Ausfahr-Ende: ZWEITER hitStop gezaehlt', b1.hs >= 2, b1);

  console.log('\n-- B2 · ARMED-Banner nur fuer Order-Linien, gedrosselt --');
  let b2 = await page.evaluate(() => {
    const before = window.__notes.filter(m => /ARMED/.test(m)).length;
    // Plain HLine (eben committet) hat KEIN ARMED ausgeloest:
    const price = currentPrice();
    commitLaserSingleClick('limit', 200, 220, player.wx, price * 0.97, false, () => {});
    const after = window.__notes.filter(m => /ARMED/.test(m)).length;
    // Drossel: sofort noch eine Order-Linie → kein zweites Banner
    commitLaserSingleClick('limit', 200, 222, player.wx, price * 0.96, false, () => {});
    const after2 = window.__notes.filter(m => /ARMED/.test(m)).length;
    const l = game.anchorLines[game.anchorLines.length - 1];
    return { before, after, after2, kind: l && l.tradeKind };
  });
  check('plain HLine → kein ARMED; Order-Linie (limit) → ARMED', b2.before === 0 && b2.after === 1, b2);
  check('Banner gedrosselt (zweite Order sofort → kein zweites ARMED)', b2.after2 === 1, b2);
  check('Order-Linie traegt tradeKind limit', b2.kind === 'limit', b2);

  console.log('\n-- B2 · TWAP-Paar: nacheinander ausfahren + Zone --');
  let tw = await page.evaluate(() => {
    const price = currentPrice();
    commitLaserTwoAnchor('twap',
      { wx: player.wx,      price: price * 1.01, sx: 300, sy: 200 },
      { wx: player.wx + 60, price: price * 0.99, sx: 360, sy: 260 });
    const pair = game.anchorLines.filter(l => l.tradeKind === 'twap');
    const zp = crZuendFx.zonePhase();
    return { n: pair.length, born1: pair[0] && pair[0].fxBorn, born2: pair[1] && pair[1].fxBorn,
             group: pair[0] && pair[1] && pair[0].tradeGroup === pair[1].tradeGroup,
             zAlpha: zp.alpha, zSweep: zp.sweep };
  });
  check('zwei Gruppen-Linien, zweite faehrt SPAETER aus (Stagger)',
    tw.n === 2 && tw.group && tw.born2 > tw.born1, tw);
  check('Zone atmet (Alpha) und der Sweep laeuft', tw.zAlpha > 0.02 && tw.zSweep != null, tw);

  console.log('\n-- B1 · Kreuzer: Funken + BLAUER Flash + Drossel --');
  await page.waitForTimeout(700);   // alle Linien fertig ausgefahren
  let cr = await page.evaluate(() => {
    // Frische Linie knapp UEBER dem Preis; _fxSide setzen, dann Preis drueber.
    game.anchorLines = [];
    game.particles.length = 0;
    const p0 = currentPrice();
    game.anchorLines.push({ id: game.anchorNextId++, wx: player.wx, py: p0 * 1.001, t: 0 });
    const oldCP = currentPrice;
    drawAnchorLines();                    // Seite: Preis UNTER der Linie
    currentPrice = () => p0 * 1.002;      // Preis kreuzt nach OBEN
    drawAnchorLines();
    const flashBlue = document.getElementById('hitflash').classList.contains('blue');
    const parts1 = game.particles.length;
    currentPrice = () => p0 * 1.0;        // sofort zurueckkreuzen → Drossel
    drawAnchorLines();
    const parts2 = game.particles.length;
    currentPrice = oldCP;
    return { flashBlue, parts1, parts2 };
  });
  check('Kreuzung → Funken-Partikel + blauer screenFlash', cr.parts1 > 0 && cr.flashBlue, cr);
  check('Drossel: sofortiges Zurueckkreuzen spawnt NICHT erneut', cr.parts2 === cr.parts1, cr);

  console.log('\n-- B2 · Re-Route + Cancel --');
  let rr = await page.evaluate(() => {
    const p0 = game.particles.length, f0 = game.floats.length;
    crZuendFx.reRoute(300, 300, 'limit');
    const p1 = game.particles.length, f1 = game.floats.length;
    const txt = game.floats.length ? game.floats[game.floats.length - 1].text : '';
    crZuendFx.decay(300, 300, 'stopLossAt');
    const p2 = game.particles.length;
    return { dp: p1 - p0, df: f1 - f0, txt, dp2: p2 - p1 };
  });
  check('Re-Route: Partikel-Schweif + „→ aktualisiert"-Float',
    rr.dp > 0 && rr.df === 1 && rr.txt === '→ aktualisiert', rr);
  check('Cancel: kleiner Partikel-Zerfall', rr.dp2 > 0, rr);

  console.log('\n-- reduced-motion (emuliert): FX gedaempft/aus, Bild lesbar --');
  const calmBoot = await bootPage(browser, { reduced: true });
  const cp = calmBoot.page;
  let calm = await cp.evaluate(() => {
    game.anchorLines = [];
    game.particles.length = 0;
    const hs0 = window.__hs;
    const price = currentPrice();
    const p0 = game.particles.length;
    commitLaserSingleClick('hline', 200, 200, player.wx, price * 1.02, false, () => {});
    const l = game.anchorLines[game.anchorLines.length - 1];
    const zp = crZuendFx.zonePhase();
    return { calm: crZuendFx.calm(), born: l ? l.fxBorn : null,
             p: l ? crZuendFx.extendP(l) : null,
             pulse: crZuendFx.labelPulse(l, price),
             cross: crZuendFx.priceCross(l, 100, 100),
             decay: crZuendFx.decay(100, 100, null),
             zSweep: zp.sweep, hs0, hs1: window.__hs };
  });
  check('calm erkannt (matchMedia reduce)', calm.calm === true, calm);
  check('keine Ausfahrt (fxBorn 0, extendP 1) — Bild sofort vollstaendig',
    calm.born === 0 && calm.p === 1, calm);
  check('Label statisch (a=1, dy=0), Kreuzer/Zerfall no-op, kein Sweep',
    calm.pulse.a === 1 && calm.pulse.dy === 0 && calm.cross === false
    && calm.decay === false && calm.zSweep === null, calm);
  await cp.waitForTimeout(500);
  calm = await cp.evaluate(() => ({ hs: window.__hs, hs0: 0 }));
  check('kein Snap-hitStop unter reduced-motion (nur der Klick-hitStop)', calm.hs <= 1, calm);

  console.log('\n-- Abschluss --');
  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('weiterhin keine harten Page-Errors', hard2.length === 0, hard2.slice(0, 3));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
