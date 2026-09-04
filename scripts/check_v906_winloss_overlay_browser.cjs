/* Smoke-Verifikation v1.0.906 — S5a.2 · Block C+D FEINSCHLIFF.
 *
 * v903 lieferte Win/Loss-FX, liess aber drei Spec-Punkte offen. Dieser Test
 * prueft die drei geschlossenen Luecken gegen das ECHTE Modul + den ECHTEN
 * Renderer, nicht gegen einen Nachbau:
 *   · C2/C3 TP-HAEKCHEN: winTP UND winBig stempeln fxTpCheck auf das
 *     uebergebene Visual-Bracket (Overlay-Request). SL stempelt es NICHT.
 *     Das Haekchen ist INFORMATION → es wird auch unter reduced-motion
 *     gestempelt und persistiert (der Renderer loescht es nie).
 *   · C4 SL-BLITZ: lossSL stempelt fxSlFlash (Overlay-Request). Reine
 *     Bewegung → unter reduced-motion wird NICHT gestempelt. TP stempelt es
 *     nicht. Der Renderer (drawVisualOverlays) loescht fxSlFlash nach Ablauf
 *     der Dauer — die SL-Linie selbst bleibt (no-fade-Direktive).
 *   · C4 COACHING: coachLine liest den letzten geschlossenen Trade des
 *     hereingereichten Journals (setup/rr/conf/result) und baut einen
 *     konkreten Satz; ohne Journal faellt es bitgleich auf die v903-Aggregate.
 *   · Hard Rule 4: weiterhin kein `ctx.` im crWinLossFx-Modul (Quelltext-Grep).
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die
 * Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v906_winloss_overlay_browser.cjs
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
  check('Banner meldet mindestens v1.0.906',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 906)))), bv);

  console.log('\n-- C2/C3 · TP-Haekchen: winTP UND winBig stempeln fxTpCheck, SL nicht --');
  let tp = await page.evaluate(() => {
    const bTP = {}, bBIG = {}, bSL = {};
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:120, pct:2,  sx:300, sy:300, live:false, bracket:bTP });
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:9000, pct:30, sx:300, sy:300, live:false, bracket:bBIG });
    crWinLossFx.onBracketClose({ outcome:'sl', pnl:-80, pct:-1, sx:300, sy:300, live:false, bracket:bSL });
    return {
      tpStamp:  !!(bTP.fxTpCheck && typeof bTP.fxTpCheck.start === 'number' && bTP.fxTpCheck.dur > 0),
      bigStamp: !!(bBIG.fxTpCheck && typeof bBIG.fxTpCheck.start === 'number'),
      tpNoFlash: bTP.fxSlFlash === undefined,
      slNoCheck: bSL.fxTpCheck === undefined,
    };
  });
  check('TP-Fill stempelt fxTpCheck (Overlay-Request)', tp.tpStamp, tp);
  check('BIG-WIN-Fill stempelt ebenfalls fxTpCheck (BIG WIN = TP-Treffer)', tp.bigStamp, tp);
  check('TP-Fill stempelt KEINEN SL-Blitz', tp.tpNoFlash, tp);
  check('SL-Fill stempelt KEIN TP-Haekchen', tp.slNoCheck, tp);
  await page.waitForTimeout(1400);   // Budget-Schlange leeren

  console.log('\n-- C4 · SL-Blitz: lossSL stempelt fxSlFlash, TP nicht --');
  let sl = await page.evaluate(() => {
    const bSL = {}, bTP = {};
    crWinLossFx.lossSL(300, 300, -80, bSL);
    crWinLossFx.winTP(300, 300, 120, false, bTP);
    return {
      slStamp: !!(bSL.fxSlFlash && typeof bSL.fxSlFlash.start === 'number' && bSL.fxSlFlash.dur > 0),
      tpNoFlash: bTP.fxSlFlash === undefined,
    };
  });
  check('SL-Fill stempelt fxSlFlash (Overlay-Request)', sl.slStamp, sl);
  check('TP-Fill stempelt KEINEN SL-Blitz', sl.tpNoFlash, sl);
  await page.waitForTimeout(1400);

  console.log('\n-- Renderer: SL-Blitz klingt ab (wird geloescht), TP-Haekchen bleibt --');
  let rend = await page.evaluate(() => {
    const b = { id:'__v906test', wx: player.wx, entry: player.py, tp: player.py*1.01, sl: player.py*0.99,
                outcome: 'sl', fxSlFlash: { start: performance.now() - 2000, dur: 520 } };
    const bTP = { id:'__v906test2', wx: player.wx, entry: player.py, tp: player.py*1.01, sl: player.py*0.99,
                  outcome: 'tp', fxTpCheck: { start: performance.now(), dur: 900 } };
    game.visualBrackets.push(b, bTP);
    let threw = false;
    try { drawVisualOverlays(); } catch(e){ threw = String(e && e.message || e); }
    const slCleared = (b.fxSlFlash === undefined || b.fxSlFlash === null);
    const tpKept = !!bTP.fxTpCheck;
    // Aufraeumen: die Test-Brackets wieder entfernen.
    game.visualBrackets = game.visualBrackets.filter(x => x !== b && x !== bTP);
    return { threw, slCleared, tpKept };
  });
  check('drawVisualOverlays wirft nicht auf den Overlay-Feldern', rend.threw === false, rend);
  check('SL-Blitz nach Ablauf der Dauer geloescht (kein Dauer-Glimmen)', rend.slCleared, rend);
  check('TP-Haekchen bleibt stehen (Information, kein Auto-Loeschen)', rend.tpKept, rend);

  console.log('\n-- C4 · Coaching liest setup/rr/conf des letzten geschlossenen Trades --');
  let coach = await page.evaluate(() => ({
    loss: crWinLossFx.coachLine({ pnlPct:-3, brackets:2, journal:[{ result:'loss', setup:'bumpAndRun', rr:1.2, conf:4 }] }),
    win:  crWinLossFx.coachLine({ pnlPct: 5, brackets:2, journal:[{ result:'win',  setup:'ccv', rr:3.5, conf:8 }] }),
    // Der letzte GESCHLOSSENE Trade zaehlt — offene Zeilen dahinter zaehlen nicht.
    pick: crWinLossFx.coachLine({ pnlPct:0, brackets:1, journal:[
            { result:'open' }, { result:'win', setup:'CHAMPION', rr:2.0, conf:7 }, { result:'open' } ] }),
    // Ohne Journal: bitgleich v903-Aggregatwortlaut.
    fallbackNone: crWinLossFx.coachLine({ pnlPct:3, brackets:0 }),
    fallbackJEmpty: crWinLossFx.coachLine({ pnlPct:3, brackets:0, journal:[] }),
  }));
  check('Verlust nennt Setup-Name + knappe RR ("bumpAndRun … 1.2R … knapp")',
    /bumpAndRun/.test(coach.loss) && /1\.2R/.test(coach.loss) && /knapp/.test(coach.loss), coach.loss);
  check('Gewinner nennt Setup-Name + sauberen RR-Lauf',
    /ccv/.test(coach.win) && /sauber/.test(coach.win), coach.win);
  check('letzter GESCHLOSSENER Trade wird gewaehlt (nicht die offene Zeile danach)',
    /CHAMPION/.test(coach.pick), coach.pick);
  check('ohne Journal → v903-Fallback (nennt fehlenden Stop)',
    /Bracket/.test(coach.fallbackNone) && /Stop/.test(coach.fallbackNone)
    && coach.fallbackJEmpty === coach.fallbackNone, coach);

  console.log('\n-- Abschluss (normaler Modus) --');
  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('weiterhin keine harten Page-Errors', hard2.length === 0, hard2.slice(0, 3));

  console.log('\n-- reduced-motion: TP-Haekchen bleibt (Info), SL-Blitz aus (Bewegung) --');
  const calmBoot = await bootPage(browser, { reduced: true });
  const cp = calmBoot.page;
  let calm = await cp.evaluate(() => {
    const bTP = {}, bSL = {};
    crWinLossFx.onBracketClose({ outcome:'tp', pnl:120, pct:2,  sx:300, sy:300, live:false, bracket:bTP });
    crWinLossFx.onBracketClose({ outcome:'sl', pnl:-80, pct:-1, sx:300, sy:300, live:false, bracket:bSL });
    return { calm: crWinLossFx.calm(), tpStamp: !!bTP.fxTpCheck, slStamp: bSL.fxSlFlash !== undefined };
  });
  check('calm erkannt', calm.calm === true, calm);
  check('TP-Haekchen wird auch unter reduced-motion gestempelt (Information)', calm.tpStamp, calm);
  check('SL-Blitz wird unter reduced-motion NICHT gestempelt (reine Bewegung)', calm.slStamp === false, calm);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
