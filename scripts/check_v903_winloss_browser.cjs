/* Smoke-Verifikation v1.0.903 — S5a.2 · Block C+D: WIN/LOSS-FX + QUERSCHNITT.
 *
 * Das Prinzip in einem Satz: DIE WIN/LOSS-FX RUFEN NUR DIE SECHS HELFER UND
 * STEMPELN EIN RUNNER-BOB-FELD — die Physik bleibt unberuehrt, der Chart
 * zeichnet. Geprueft wird gegen den ECHTEN bracketClose-Verteiler und die
 * ECHTEN Helfer, nicht gegen einen Nachbau.
 *
 * Scharf geprueft wird, was den Chart unlesbar oder die Regel kaputt macht:
 *   · C2 TP → „TAKE PROFIT ✓"-Banner + hitStop.
 *   · C3 BIG ab Schwelle (CR_BIG_WIN_PCT) → Konfetti; unter der Schwelle NICHT.
 *   · C4 SL → roter Flash + „STOP LOSS", KEIN Shake.
 *   · C4 kleiner Verlust → rotes FALLENDES Float (vy>0) + Ducken, kein Shake.
 *   · C1 kleiner Win → gruenes STEIGENDES Float (vy<0) + Mini-Sprung.
 *   · Runner-Bob ist reiner Screen-Y-Versatz — player.py aendert sich nie.
 *   · D2 Budget: 5 gleichzeitige Fills → nie mehr als 1 aktives Ereignis-FX.
 *   · D3 reduced-motion: kein Bob/hitStop/Konfetti; Banner (Info) bleiben.
 *   · Coaching-Satz aus bestehenden Feldern (P&L%, Brackets).
 *   · Hard Rule 4: kein `ctx.` im crWinLossFx-Modul (Quelltext-Grep).
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v903_winloss_browser.cjs
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
  await page.evaluate(() => {
    window.__hs = 0;
    const oldHS = hitStop; hitStop = (ms) => { window.__hs++; return oldHS(ms); };
    window.__notes = [];
    const oldN = crNotify; crNotify = (m, k) => { try { window.__notes.push(String(m)); } catch(_){} return oldN(m, k); };
    window.__pc = () => game.particles.length;
    window.__lastFloat = () => game.floats.length ? game.floats[game.floats.length - 1] : null;
    window.__flashCls = () => { const el = document.getElementById('hitflash'); return el ? el.className : ''; };
  });
  return { page, errs };
}

(async () => {
  console.log('\n-- Hard Rule 4: FX-Modul fasst die Leinwand nie an --');
  const html = fs.readFileSync(FILE, 'utf8');
  const mStart = html.indexOf('window.crWinLossFx = (function(){');
  const mEnd = html.indexOf('})();', mStart);
  const modSrc = (mStart >= 0 && mEnd > mStart) ? html.slice(mStart, mEnd) : '';
  check('crWinLossFx-Modul gefunden', modSrc.length > 800, mStart);
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
  check('Banner meldet mindestens v1.0.903',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 903)))), bv);

  console.log('\n-- C1 · kleiner Win: gruenes STEIGENDES Float + Mini-Sprung --');
  let c1 = await page.evaluate(() => {
    game.floats.length = 0; game.particles.length = 0;
    crWinLossFx.winSmall(300, 300, '+$5', 10, false);
    const f = window.__lastFloat();
    return { text: f && f.text, vy: f && f.vy, col: f && f.color, bob: crWinLossFx.runnerBob() };
  });
  check('Float traegt das Label und STEIGT (vy<0)', c1.text === '+$5' && c1.vy < 0, c1);
  check('Float ist gruen (Paper-Farbe)', c1.col === '#3ddc97', c1);
  check('Runner-Mini-Sprung aktiv (runnerBob != 0, nach oben)', c1.bob < 0, c1);
  await page.waitForTimeout(300);

  console.log('\n-- C2 · TP getroffen: Banner + hitStop (echter Verteiler) --');
  let c2 = await page.evaluate(() => {
    const hs0 = window.__hs, n0 = window.__notes.length;
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:120, pct:2, sx:300, sy:300, live:false });
    return { hs0, hs1: window.__hs,
             tp: window.__notes.some(m => /TAKE PROFIT/.test(m)) };
  });
  check('TP → „TAKE PROFIT ✓"-Banner', c2.tp, c2);
  check('… + hitStop', c2.hs1 > c2.hs0, c2);
  await page.waitForTimeout(800);

  console.log('\n-- C3 · grosser Win ab Schwelle → Konfetti; darunter NICHT --');
  let c3 = await page.evaluate(() => {
    game.particles.length = 0;
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:9000, pct:30, sx:300, sy:300, live:false });
    return { big: window.__notes.some(m => /BIG WIN/.test(m)), parts: game.particles.length };
  });
  check('pct=30 (≥ Schwelle) → „BIG WIN" + Konfetti', c3.big && c3.parts >= 15, c3);
  await page.waitForTimeout(1300);
  let c3b = await page.evaluate(() => {
    const n0 = window.__notes.length;
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:100, pct:5, sx:300, sy:300, live:false });
    return { big: window.__notes.slice(n0).some(m => /BIG WIN/.test(m)),
             tp: window.__notes.slice(n0).some(m => /TAKE PROFIT/.test(m)) };
  });
  check('pct=5 (unter Schwelle) → KEIN BIG WIN, sondern TAKE PROFIT', !c3b.big && c3b.tp, c3b);
  await page.waitForTimeout(800);

  console.log('\n-- C4 · SL: roter Flash + Banner, KEIN Shake --');
  let c4 = await page.evaluate(() => {
    camera.shake = 0;
    const hs0 = window.__hs;
    crWinLossFx.onBracketClose({ outcome:'sl', pnl:-80, pct:-1.5, sx:300, sy:300, live:false });
    return { sl: window.__notes.some(m => /STOP LOSS/.test(m)),
             flash: window.__flashCls(), hs1: window.__hs, hs0, shake: camera.shake };
  });
  check('SL → „STOP LOSS"-Banner', c4.sl, c4);
  check('… roter screenFlash (redsoft)', /redsoft/.test(c4.flash), c4);
  check('… knapper hitStop, aber KEIN Shake', c4.hs1 > c4.hs0 && c4.shake === 0, c4);
  await page.waitForTimeout(700);

  console.log('\n-- C4 · kleiner Verlust: rotes FALLENDES Float + Ducken, kein Shake --');
  let c4b = await page.evaluate(() => {
    game.floats.length = 0; camera.shake = 0;
    crWinLossFx.lossSmall(300, 300, -12);
    const f = window.__lastFloat();
    return { vy: f && f.vy, col: f && f.color, bob: crWinLossFx.runnerBob(), shake: camera.shake };
  });
  check('Verlust-Float FAELLT (vy>0) und ist rot', c4b.vy > 0 && c4b.col === '#ff5b7f', c4b);
  check('Runner DUCKT sich (runnerBob > 0, nach unten) und KEIN Shake', c4b.bob > 0 && c4b.shake === 0, c4b);

  console.log('\n-- Runner-Bob ist reiner Screen-Y-Versatz (Physik unberuehrt) --');
  let bobT = await page.evaluate(() => {
    const py0 = player.py;
    crWinLossFx.bob(9);
    const during = crWinLossFx.runnerBob();
    try { drawPlayer(); } catch(_){}
    return { py0, py1: player.py, during };
  });
  check('player.py unveraendert durch Bob + drawPlayer', bobT.py0 === bobT.py1, bobT);
  check('runnerBob liefert einen Versatz (!= 0)', bobT.during !== 0, bobT);

  console.log('\n-- D2 · FX-Budget: 5 gleichzeitige Fills → nie mehr als 1 aktiv --');
  await page.waitForTimeout(1300);   // Schlange leeren
  let bud = await page.evaluate(() => {
    let maxActive = 0;
    for(let i = 0; i < 5; i++){
      crWinLossFx.onBracketClose({ outcome:'tp', pnl:120, pct:2, sx:300, sy:300, live:false });
      maxActive = Math.max(maxActive, crWinLossFx.activeEvents());
    }
    return { maxActive, queued: crWinLossFx.queueLen() };
  });
  check('nie mehr als 1 aktives Ereignis-FX (Zaehler-Assertion)', bud.maxActive <= 1, bud);
  check('Rest wurde gequeued (Budget greift)', bud.queued >= 1, bud);
  await page.waitForTimeout(1300);

  console.log('\n-- Coaching-Satz aus bestehenden Feldern --');
  let coach = await page.evaluate(() => ({
    none: crWinLossFx.coachLine({ pnlPct: 3, brackets: 0 }),
    big:  crWinLossFx.coachLine({ pnlPct: 25, brackets: 2 }),
    win:  crWinLossFx.coachLine({ pnlPct: 3, brackets: 2 }),
    loss: crWinLossFx.coachLine({ pnlPct: -4, brackets: 2 }),
  }));
  check('kein Bracket → Coaching nennt den fehlenden Stop', /Bracket/.test(coach.none) && /Stop/.test(coach.none), coach.none);
  check('grosser Win / Verlust / Plus liefern je einen Satz',
    coach.big.length > 10 && coach.loss.length > 10 && coach.win.length > 10 && coach.win !== coach.loss, coach);

  console.log('\n-- Abschluss (normaler Modus) --');
  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('weiterhin keine harten Page-Errors', hard2.length === 0, hard2.slice(0, 3));

  console.log('\n-- reduced-motion (emuliert): Bewegung aus, Banner bleiben --');
  const calmBoot = await bootPage(browser, { reduced: true });
  const cp = calmBoot.page;
  let calm = await cp.evaluate(() => {
    game.particles.length = 0;
    const hs0 = window.__hs;
    crWinLossFx.bob(9);
    const bob = crWinLossFx.runnerBob();
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:9000, pct:30, sx:300, sy:300, live:false });
    return { calm: crWinLossFx.calm(), bob, hs0, hs1: window.__hs,
             parts: game.particles.length, big: window.__notes.some(m => /BIG WIN/.test(m)) };
  });
  check('calm erkannt', calm.calm === true, calm);
  check('kein Bob unter reduced-motion (runnerBob = 0)', calm.bob === 0, calm);
  check('kein hitStop, kein Konfetti unter reduced-motion', calm.hs1 === calm.hs0 && calm.parts === 0, calm);
  check('… aber das informative Banner bleibt (BIG WIN)', calm.big === true, calm);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
