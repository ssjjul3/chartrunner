/* Smoke-Verifikation v1.0.950 — UI v2: FUEHRUNG OHNE COACH.
 *
 * Aus dem Investor-Call mit Fabian Salomon (ChartRunner_Investor_Call_Tips_and_Milestones.md):
 * #2 200ms-Test, #3 fragen statt aufdraengen (Willkommen mit „Nicht mehr zeigen"
 * und dauerhaftem Wiederoeffnen), #1 Gesperrtes zeigen + wie man es freischaltet,
 * #8 Wallet nicht im ersten Weg. Julian: den Nutzer ohne Coach durch alles fuehren.
 *
 * GEMESSEN IM ECHTEN CHROMIUM GEGEN DIE DATEI (1600x900). Datenquellen wie in
 * check_v949 per page.route beantwortet.
 *
 *  G1  200ms: Marke + Satz „was ist das" in der Kopfleiste; Toolbar-Beschriftung
 *      lesbar (>= 9 px); jede Funktion sagt im Flyout, wofuer sie ist.
 *  G2  WILLKOMMEN beim ersten Besuch: sagt in einem Satz, was das ist, dass keine
 *      Wallet noetig ist, bietet Tour ODER selbst erkunden; „Selbst erkunden"
 *      ohne Haken → beim naechsten Besuch wieder da; mit Haken → nie wieder.
 *  G3  TOUR: jeder Schritt setzt den Scheinwerfer auf sein Ziel (Ring deckt das
 *      Element), Schritt „Unterpunkte" oeffnet das Flyout wirklich, Weiter/
 *      Zurueck/Pfeiltasten, Esc beendet und merkt es; der Knopf „Tour" oben
 *      startet sie jederzeit; der COACH-Tutorial-Weg (crFirstRun.reset) fuehrt
 *      in DIESE Tour.
 *  G4  ERKLAERUNG BEIM UEBERFAHREN: Toolbar-Unterpunkte, Fuss-Knoepfe, Modul-
 *      Ampel, Fenster-Ampel, Tabs, Connect — nach kurzer Verzoegerung, neben
 *      dem Element, verschwindet beim Wegfahren und beim Klicken; gesperrte
 *      Unterpunkte sagen, wie man sie freischaltet; Tastatur-Fokus zeigt sie auch.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const FILE = 'ChartRunner_Prototype.html';
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; const d = x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 700);
         console.log('  FAIL ' + n + d); }
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

/* ── Antworten in der Form, die der vorhandene Parser liest ──────────────── */
const MINTS = {
  WIF:  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  POP:  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  NEW1: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
  MIG1: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump',
  MIG2: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump'
};
function pool(i, sym, mint, dex, o){
  o = o || {};
  return {
    data: { id: 'solana_p' + i, type: 'pool', attributes: {
      name: sym + ' / SOL', base_token_price_usd: String(o.px || 1.5),
      market_cap_usd: o.mc === undefined ? String(1e6 * (i + 1)) : o.mc,
      fdv_usd: String(2e6 * (i + 1)), reserve_in_usd: String(5e4 * (i + 1)),
      pool_created_at: new Date(Date.now() - (i + 1) * 3600e3).toISOString(),
      price_change_percentage: { m5: '0.5', h1: String(o.h1 != null ? o.h1 : i - 2), h6: '3', h24: String(o.h24 != null ? o.h24 : 10 - i) },
      volume_usd: { m5: '100', h1: String(1000 * (i + 1)), h6: '9000', h24: '50000' },
      transactions: { m5: { buys: 1, sells: 1 }, h1: { buys: 10 + i, sells: 5 }, h6: { buys: 50, sells: 40 }, h24: { buys: 300, sells: 200 } }
    }, relationships: { base_token: { data: { id: 'solana_' + mint, type: 'token' } }, dex: { data: { id: dex, type: 'dex' } } } },
    inc: [{ id: 'solana_' + mint, type: 'token', attributes: { address: mint, symbol: sym, name: sym + ' Coin' } },
          { id: dex, type: 'dex', attributes: { name: dex === 'pumpswap' ? 'PumpSwap' : dex === 'raydium' ? 'Raydium' : 'Orca' } }]
  };
}
function gtBody(list){
  const inc = [], seen = {};
  list.forEach(p => p.inc.forEach(x => { const k = x.type + x.id; if(!seen[k]){ seen[k] = 1; inc.push(x); } }));
  return JSON.stringify({ data: list.map(p => p.data), included: inc });
}
const TRENDING = gtBody([pool(0, 'WIF', MINTS.WIF, 'orca', { px: 2.41 }), pool(1, 'BONK', MINTS.BONK, 'raydium'), pool(2, 'POPCAT', MINTS.POP, 'orca', { mc: null })]);
const NEWPOOLS = gtBody([pool(0, 'NEWX', MINTS.NEW1, 'orca'), pool(1, 'MIGA', MINTS.MIG1, 'pumpswap'), pool(2, 'MIGB', MINTS.MIG2, 'raydium')]);
const BOOSTS = JSON.stringify([{ chainId: 'solana', tokenAddress: MINTS.WIF, totalAmount: 500 }, { chainId: 'ethereum', tokenAddress: '0xabc', totalAmount: 9 }]);
const PAIRS = JSON.stringify([{ baseToken: { address: MINTS.WIF, symbol: 'WIF', name: 'dogwifhat' }, priceUsd: '2.41', dexId: 'orca', liquidity: { usd: 3e7 }, marketCap: 2.4e9, volume: { h24: 4e8 }, priceChange: { h24: 6.4 } }]);

async function mock(ctx, opts){
  opts = opts || {};
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
  await ctx.route(/api\.geckoterminal\.com/, route => {
    const u = route.request().url();
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if(opts.gtDown) return route.fulfill({ status: 503, headers: cors, body: 'down' });
    if(/trending_pools/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: TRENDING });
    if(/new_pools/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: NEWPOOLS });
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
  await ctx.route(/api\.dexscreener\.com/, route => {
    const u = route.request().url();
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if(/token-boosts/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: BOOSTS });
    if(/tokens\/v1\/solana/.test(u)) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors), body: PAIRS });
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
}


async function boot(browser, url, opts){
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.addInitScript((fresh) => { try {
    localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done: true }));
    if(!fresh) localStorage.setItem('cr_ui_v2_welcome_v1', JSON.stringify({ done: true }));
  } catch(_){} }, !!opts.fresh);
  await mock(ctx, opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 200)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(opts.settle || 4500);
  await page.evaluate(() => { ['crFrMask','crFrPop'].forEach(id => { const e = document.getElementById(id); if(e) e.classList.remove('on'); }); });
  page._crErrs = errs; page._ctx = ctx;
  return page;
}
const fileUrl = p => 'file://' + path.resolve(p);
const VIS = `el => { if(!el) return false; const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0; }`;
const RING_COVERS = `sel => { const e = document.querySelector(sel), r = document.getElementById('cr2TourRing');
  if(!e || !r || r.hidden) return false; const a = e.getBoundingClientRect(), b = r.getBoundingClientRect();
  return a.width > 0 && b.left <= a.left + 1 && b.top <= a.top + 1 && b.right >= a.right - 1 && b.bottom >= a.bottom - 1; }`;

(async () => {
  const root = path.resolve(__dirname, '..');
  const selfPath = path.join(root, FILE);
  const url = fileUrl(selfPath) + '?ui=v2';
  const browser = await chromium.launch(launchOptions());
  const allErrs = [];

  console.log('\nG2 · Willkommen beim ersten Besuch');
  {
    const page = await boot(browser, url, { fresh: true });
    const w = await page.evaluate(`(() => { const vis = ${VIS}; const e = document.getElementById('cr2Welcome');
      return { vis: vis(e), txt: e.innerText, tour: !!e.querySelector('[data-cr2-w="tour"]'), exp: !!e.querySelector('[data-cr2-w="explore"]'),
        never: !!e.querySelector('#cr2WNever'), focus: document.activeElement && document.activeElement.getAttribute('data-cr2-w') }; })()`);
    check('G2a erster Besuch: Willkommen steht da', w.vis, w);
    check('G2b sagt in einem Satz, was das ist', /Desktop fuer Krypto/.test(w.txt) && /Token finden/.test(w.txt), w.txt.slice(0, 200));
    check('G2c sagt, dass keine Wallet noetig ist', /keine Wallet/.test(w.txt), w.txt.slice(0, 300));
    check('G2d fragt statt aufzudraengen: Tour ODER selbst erkunden, mit „Nicht mehr zeigen"', w.tour && w.exp && w.never, w);
    check('G2e Fokus liegt auf „Tour" (Enter startet sie)', w.focus === 'tour', w.focus);
    await page.click('[data-cr2-w="explore"]');
    const g = await page.evaluate(`(() => { const vis = ${VIS}; return { vis: vis(document.getElementById('cr2Welcome')), tour: !document.getElementById('cr2TourMask').hidden }; })()`);
    check('G2f „Selbst erkunden" schliesst ohne Tour', !g.vis && !g.tour, g);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(4500);
    const again = await page.evaluate(`(() => { const vis = ${VIS}; return vis(document.getElementById('cr2Welcome')); })()`);
    check('G2g ohne Haken: beim naechsten Besuch wieder da', again === true, again);
    await page.check('#cr2WNever'); await page.click('[data-cr2-w="explore"]');
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(4500);
    const never = await page.evaluate(`(() => { const vis = ${VIS}; return vis(document.getElementById('cr2Welcome')); })()`);
    check('G2h mit „Nicht mehr zeigen": nie wieder', never === false, never);
    allErrs.push(...page._crErrs);
    await page._ctx.close();
  }

  const page = await boot(browser, url);
  console.log('\nG1 · 200ms: was ist das, was klicke ich');
  {
    const r = await page.evaluate(`(() => { const vis = ${VIS}; const tag = document.getElementById('cr2Tag');
      const labs = Array.from(document.querySelectorAll('#cr2Rail .cr2-rgrp .cr2-rbtn span')).map(s => ({ t: s.textContent, fs: parseFloat(getComputedStyle(s).fontSize), vis: vis(s) }));
      const desc = Array.from(document.querySelectorAll('#cr2Rail .cr2-flyhd p')).map(p => p.textContent);
      return { brand: vis(document.getElementById('cr2Brand')), tag: vis(tag) && tag.textContent, labs, desc,
        help: vis(document.getElementById('cr2Help')), welcome: vis(document.getElementById('cr2Welcome')) }; })()`);
    check('G1a Kopfleiste: Marke + Satz, was das ist', r.brand && /finden/.test(r.tag || '') && /handeln/.test(r.tag || ''), r.tag);
    check('G1b Toolbar-Beschriftung sichtbar und >= 9 px', r.labs.length === 5 && r.labs.every(l => l.vis && l.fs >= 9), r.labs);
    check('G1c jede der 5 Funktionen sagt im Flyout, wofuer sie ist', r.desc.length === 5 && r.desc.every(d => d.length > 25), r.desc);
    check('G1d „Tour" steht dauerhaft in der Kopfleiste', r.help, r);
    check('G1e wer „Nicht mehr zeigen" gewaehlt hat, sieht kein Willkommen', r.welcome === false, r);
  }

  console.log('\nG3 · Tour ohne Coach');
  {
    await page.click('#cr2Help');
    await page.waitForTimeout(400);
    const n = await page.evaluate(() => ({ step: window.crUiV2.tourStep(), card: document.getElementById('cr2TourCard').innerText }));
    const total = +((n.card.match(/1 \/ (\d+)/) || [])[1] || 0);
    check('G3a „Tour" oben startet bei Schritt 1', n.step === 0 && total >= 8, n);
    check('G3b Schritt 1 sagt, was ChartRunner ist', /Desktop fuer Krypto/.test(n.card), n.card.slice(0, 160));
    const expect = [null, '#cr2Rail', '#cr2Rail .cr2-rgrp[data-cr2-g="swap"] .cr2-fly', '#cr2T-coins', '#cr2T-arcade', '#cr2T-coins .cr2-th', '#cr2Tabs', '#crMenuConnect', '#cr2Help'];
    const seen = [];
    for(let i = 1; i < expect.length; i++){
      await page.click('[data-cr2-tour="next"]');
      await page.waitForTimeout(420);
      const ok = await page.evaluate(`(${RING_COVERS})(${JSON.stringify(expect[i])})`);
      const st = await page.evaluate(() => window.crUiV2.tourStep());
      seen.push({ i, st, ok });
    }
    check('G3c jeder Schritt setzt den Scheinwerfer auf sein Ziel', seen.every(x => x.ok && x.st === x.i), seen);
    await page.click('[data-cr2-tour="back"]'); await page.waitForTimeout(300);
    const back = await page.evaluate(() => window.crUiV2.tourStep());
    check('G3d Zurueck geht einen Schritt zurueck', back === expect.length - 2, back);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    const arr = await page.evaluate(() => window.crUiV2.tourStep());
    check('G3e Pfeiltaste rechts = Weiter', arr === expect.length - 1, arr);
    await page.evaluate(() => window.crUiV2.tour(2)); await page.waitForTimeout(420);
    const fly = await page.evaluate(`(() => { const vis = ${VIS}; return vis(document.querySelector('#cr2Rail .cr2-rgrp[data-cr2-g="swap"] .cr2-fly')); })()`);
    check('G3f Schritt „Unterpunkte" oeffnet das Flyout wirklich', fly === true, fly);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const end = await page.evaluate(`(() => { const vis = ${VIS}; return { mask: vis(document.getElementById('cr2TourMask')), step: window.crUiV2.tourStep(),
      done: JSON.parse(localStorage.getItem('cr_ui_v2_tour_v1') || 'null') }; })()`);
    check('G3g Esc beendet die Tour und merkt es', !end.mask && end.step === -1 && end.done && end.done.done === true, end);
    await page.evaluate(() => { try { window.crFirstRun.reset(); } catch(_){} }); await page.waitForTimeout(300);
    const coach = await page.evaluate(`(() => { const vis = ${VIS}; return { step: window.crUiV2.tourStep(), mask: vis(document.getElementById('cr2TourMask')), old: document.getElementById('crFrPop') && document.getElementById('crFrPop').classList.contains('on') }; })()`);
    check('G3h COACH-Tutorial-Weg (crFirstRun.reset) fuehrt in diese Tour, nicht in die alte', coach.step === 0 && coach.mask && !coach.old, coach);
    for(let i = 0; i < 12; i++){ const s = await page.evaluate(() => window.crUiV2.tourStep()); if(s < 0) break; await page.click('[data-cr2-tour="next"]'); await page.waitForTimeout(120); }
    const fin = await page.evaluate(() => ({ step: window.crUiV2.tourStep(), done: JSON.parse(localStorage.getItem('cr_ui_v2_tour_v1') || 'null') }));
    check('G3i bis zum Ende durchgeklickt: „Fertig" schliesst und merkt „completed"', fin.step === -1 && fin.done && fin.done.completed === true, fin);
  }

  console.log('\nG4 · Erklaerung beim Ueberfahren');
  {
    await page.mouse.move(800, 700);
    const tipAt = async (sel, pre) => {
      if(pre) await pre();
      await page.hover(sel);
      await page.waitForTimeout(80);
      const early = await page.evaluate(() => !document.getElementById('cr2Tip').hidden);
      await page.waitForTimeout(450);
      return page.evaluate(`(() => { const t = document.getElementById('cr2Tip'); const e = document.querySelector(${JSON.stringify(sel)});
        const a = t.getBoundingClientRect(), b = e.getBoundingClientRect();
        return { early: ${'${early}'}, vis: !t.hidden, txt: t.innerText, near: Math.abs(a.left - b.right) < 40 || Math.abs(a.top - b.bottom) < 40 || Math.abs(b.top - a.bottom) < 40 }; })()`.replace('${early}', String(early)));
    };
    const openFly = g => async () => { await page.hover('#cr2Rail [data-cr2-rail="' + g + '"]'); await page.waitForTimeout(200); };
    const a = await tipAt('#cr2Rail [data-cr2-g="swap"] [data-cr2-tile="coins"]', openFly('swap'));
    check('G4a Unterpunkt: Erklaerung erscheint (nicht sofort, kurz danach) und steht daneben', !a.early && a.vis && a.near && /BUY/.test(a.txt), a);
    const lk = await tipAt('#cr2Rail [data-cr2-g="play"] [data-cr2-prog="arena"]', openFly('play'));
    check('G4b gesperrter Unterpunkt sagt, wie man ihn freischaltet', lk.vis && /Wallet/.test(lk.txt) && /Connect/.test(lk.txt), lk);
    await page.mouse.move(800, 700); await page.waitForTimeout(250);
    const gone = await page.evaluate(() => document.getElementById('cr2Tip').hidden);
    check('G4c Wegfahren blendet sie aus', gone === true, gone);
    const f = await tipAt('#cr2Rail .cr2-foot[data-cr2-act="reset"]');
    check('G4d Fuss-Knopf erklaert sich', f.vis && /Standard/.test(f.txt), f);
    const l = await tipAt('#cr2T-coins .cr2-lg');
    check('G4e Modul-Ampel gruen: „Maximieren"', l.vis && /Maximieren/.test(l.txt), l);
    const tb = await tipAt('#cr2Tabs [data-cr2-tabgo="t:coins"]');
    check('G4f Tab erklaert Klick und ✕', tb.vis && /Klick/.test(tb.txt) && /schliesst/.test(tb.txt), tb);
    const cn = await tipAt('#crMenuConnect');
    check('G4g Connect: optional, zum Ueben nicht noetig', cn.vis && /Optional/.test(cn.txt), cn);
    await page.evaluate(() => window.crUiV2.open('terminal')); await page.waitForTimeout(500);
    const wy = await tipAt('#win-terminal .os-wbar .dot.yel');
    check('G4h Fenster-Ampel gelb: „Minimieren"', wy.vis && /Minimieren/.test(wy.txt), wy);
    // Klick auf ein Element, das STEHEN bleibt (Modul-Kopf) — sonst verschwaende die Erklaerung
    // schon, weil das Element weg ist, und die Zeile pruefte nichts (Gegenprobe Q8 blieb gruen)
    const hh = await tipAt('#cr2T-feed .cr2-th h2');
    await page.mouse.down(); await page.waitForTimeout(60);
    const click = await page.evaluate(() => document.getElementById('cr2Tip').hidden);
    await page.mouse.up();
    check('G4i Klicken blendet sie aus', hh.vis === true && click === true, { hh, click });
    await page.focus('#cr2Help'); await page.waitForTimeout(100);
    const kb = await page.evaluate(() => ({ vis: !document.getElementById('cr2Tip').hidden, txt: document.getElementById('cr2Tip').innerText }));
    check('G4j Tastatur-Fokus zeigt die Erklaerung auch', kb.vis && /Tour/.test(kb.txt), kb);
    const nat = await page.evaluate(() => Array.from(document.querySelectorAll('#cr2Rail [title], .cr2-th[title], #cr2Tabs [title]')).length);
    check('G4k keine doppelten Browser-Tooltips (title) an Toolbar, Modulen, Tabs', nat === 0, nat);
  }
  allErrs.push(...page._crErrs);
  await page._ctx.close();

  console.log('\nG9 · Regression');
  {
    const src = fs.readFileSync(selfPath, 'utf8');
    const ver = (src.match(/CURRENT VERSION:\s*v1\.0\.(\d+)/) || [])[1];
    check('G9a Banner >= v1.0.950', Number(ver) >= 950, ver);
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g; let n = 0; while(re.exec(src)) n++;
    check('G9b 7 Skriptbloecke', n === 7, n);
    check('G9c Aktivierungszeile fuer /play-v2/ genau einmal', src.split('\n  if(!_want()) return;\n').length === 2);
    const e2 = allErrs.filter(e => /cr2|crUiV2|cr-ui-v2/.test(e));
    check('G9d keine Seitenfehler aus dem v2-Block', e2.length === 0, e2);
  }

  await browser.close();
  console.log('\n' + pass + ' ok · ' + fail + ' FAIL · 0 UNGETESTET');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
