/* Smoke-Verifikation v1.0.948 — UI v2 IM DESKTOP: LEISTE, KACHELN, TAB-LEISTE.
 * (Nachfolger von check_v947_ui_v2_browser.cjs: dessen T3 „Rubrik als
 *  Vollbild-Seite" ist mit v1.0.948 bewusst weggefallen — Julian: die
 *  Desktop-Ansicht bleibt. Alle anderen Pruefungen sind uebernommen.)
 *
 * GEMESSEN IM ECHTEN CHROMIUM GEGEN DIE DATEI (1600x900, Desktop). Die
 * Datenquellen (GeckoTerminal, DexScreener) sind aus der Sandbox gesperrt;
 * sie werden per page.route mit Antworten in der Form beantwortet, die der
 * vorhandene Parser liest. Das beweist, was die Oberflaeche aus einer
 * Antwort macht — NICHT, dass die echte API so antwortet.
 *
 *  T1  OHNE SCHALTER AENDERT SICH NICHTS.
 *  T2  LEISTE: genau 5 Eintraege oben, alle Rubriken + Kacheln in den Menues.
 *  T3  DESKTOP BLEIBT: Icons als Spalte links, Kacheln stehen; Fenster
 *      SCHWEBEN (nicht Vollbild), liegen unter der Leiste und UEBER den
 *      Kacheln; Home legt Fenster in die Tabs; Tab-Klick holt/minimiert;
 *      Tab-✕ schliesst.
 *  T4  GAST-SPERRE GREIFT UNVERAENDERT.
 *  T5  TOP COINS aus der Antwort; Ausfall → Grund statt Tabelle.
 *  T6  KAUFWEG IN DREI KLICKS ueber das BESTEHENDE Activation-Panel.
 *  T7  CHART-TAB UEBERLEBT DEN WEG ZURUECK.
 *  T8  PULSE als Kachel: Migriert nur PumpSwap/Raydium.
 *  T10 KACHELN: ziehen (8-px-Raster), Groesse aendern, minimieren in die
 *      Tab-Leiste und zurueck, schliessen und ueber das Menue wieder oeffnen,
 *      einklappen per Doppelklick, Anordnung ueberlebt ein Neuladen,
 *      „Kacheln zuruecksetzen" stellt die Standard-Anordnung her.
 *  T9  Regression: Banner v1.0.948, 7 Skriptbloecke, Aktivierungszeile fuer
 *      /play-v2/ genau einmal, keine Seitenfehler aus dem v2-Block.
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
  await ctx.addInitScript(() => { try { localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done: true })); } catch(_){} });
  await mock(ctx, opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 200)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(opts.settle || 4500);
  // Einfuehrungs-Overlays, die sonst Klicks abfangen
  await page.evaluate(() => { ['crFrMask','crFrPop'].forEach(id => { const e = document.getElementById(id); if(e) e.classList.remove('on'); }); });
  page._crErrs = errs; page._ctx = ctx;
  return page;
}
const fileUrl = p => 'file://' + path.resolve(p);
const VIS = `el => { if(!el) return false; const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0; }`;

(async () => {
  const root = path.resolve(__dirname, '..');
  const selfPath = path.join(root, FILE);
  const src = fs.readFileSync(selfPath, 'utf8');
  const browser = await chromium.launch(launchOptions());

  // ── T1 ────────────────────────────────────────────────────────────────
  console.log('\nT1 · ohne Schalter aendert sich nichts');
  {
    const page = await boot(browser, fileUrl(selfPath) + '?ui=v1');
    const r = await page.evaluate(`(() => { const vis = ${VIS};
      return { cr2: document.body.classList.contains('cr2'), nav: !!document.getElementById('cr2Nav'),
        home: !!document.getElementById('cr2Tiles'), active: !!(window.crUiV2 && window.crUiV2.active),
        grid: vis(document.getElementById('osGrid')), style: !!document.getElementById('cr-ui-v2') }; })()`);
    check('T1a kein body.cr2 / #cr2Nav / #cr2Tiles / Stil', !r.cr2 && !r.nav && !r.home && !r.style, r);
    check('T1b crUiV2.active === false', r.active === false, r);
    check('T1c Desktop-Icons sichtbar wie bisher', r.grid === true, r);
    await page._ctx.close();
  }

  // ── T2..T6 in einem Lauf mit Schalter ─────────────────────────────────
  const page = await boot(browser, fileUrl(selfPath) + '?ui=v2');
  console.log('\nT2 · Leiste: 5 Eintraege, alle Rubriken in den Menues');
  {
    const r = await page.evaluate(`(() => {
      const nav = document.getElementById('cr2Nav');
      const tops = nav ? Array.from(nav.querySelectorAll(':scope > .cr2-top, :scope > .cr2-grp > .cr2-top')).map(b => b.getAttribute('data-cr2-top')) : [];
      const progs = nav ? Array.from(nav.querySelectorAll('[data-cr2-prog]')).map(b => b.getAttribute('data-cr2-prog')) : [];
      const acts = nav ? Array.from(nav.querySelectorAll('[data-cr2-act]')).map(b => b.getAttribute('data-cr2-act')) : [];
      const tiles = nav ? Array.from(nav.querySelectorAll('[data-cr2-tile]')).map(b => b.getAttribute('data-cr2-tile')) : [];
      const bar = document.querySelector('#splash .os-menubar'); const br = bar.getBoundingClientRect();
      return { tops, progs, acts, tiles, active: window.crUiV2 && window.crUiV2.active, barH: br.height, barTop: br.top,
        connect: !!document.getElementById('crMenuConnect') && getComputedStyle(document.getElementById('crMenuConnect')).display !== 'none' };
    })()`);
    check('T2a v2 aktiv', r.active === true, r);
    check('T2b genau 5 Eintraege oben', r.tops.length === 5, r.tops);
    const need = ['terminal','tokenterm','chartrunner','arena','walletapp','wallet','walletintel','bot','display','settings'];
    check('T2f Kacheln im Menue: Top Coins, Pulse, Live, Arcade', ['coins','pulse','feed','arcade'].every(x => r.tiles.indexOf(x) >= 0), r.tiles);
    check('T2g Kacheln zuruecksetzen im Menue', r.acts.indexOf('reset') >= 0, r.acts);
    check('T2c alle Rubriken in den Menues', need.every(p => r.progs.indexOf(p) >= 0), { fehlt: need.filter(p => r.progs.indexOf(p) < 0) });
    check('T2d Rooms + Chart als Aktion', r.acts.indexOf('rooms') >= 0 && r.acts.indexOf('chart') >= 0, r.acts);
    check('T2e Leiste oben, 48 px, Connect bleibt', r.barTop === 0 && Math.round(r.barH) === 48 && r.connect, r);
  }

  const TABS = `Array.from(document.querySelectorAll('#cr2Tabs [data-cr2-tab]')).map(x => x.getAttribute('data-cr2-tab'))`;
  console.log('\nT3 · Desktop bleibt: Icons, Kacheln, schwebende Fenster, Tabs');
  {
    const a0 = await page.evaluate(`(() => { const vis = ${VIS}; const g = document.getElementById('osGrid').getBoundingClientRect();
      const t = id => vis(document.getElementById('cr2T-' + id));
      return { grid: vis(document.getElementById('osGrid')), gl: g.left, gw: g.width, gt: Math.round(g.top),
        arcade: t('arcade'), coins: t('coins'), feed: t('feed'), pulse: t('pulse'), tabs: ${TABS} }; })()`);
    check('T3a Desktop-Icons stehen als Spalte links unter Leiste+Tabs', a0.grid && a0.gl === 0 && a0.gw <= 110 && a0.gt >= 78, a0);
    check('T3b Kacheln Arcade, Top Coins, Live offen; Pulse zu', a0.arcade && a0.coins && a0.feed && !a0.pulse, a0);
    check('T3c Kacheln stehen als Tabs', ['t:arcade','t:coins','t:feed'].every(k => a0.tabs.indexOf(k) >= 0) && a0.tabs.indexOf('t:pulse') < 0, a0.tabs);

    await page.click('#cr2Nav [data-cr2-top="trade"]');
    await page.click('#cr2Nav [data-cr2-prog="terminal"]');
    await page.waitForTimeout(600);
    const a = await page.evaluate(`(() => { const vis = ${VIS}; const w = document.getElementById('win-terminal'); const b = w.getBoundingClientRect();
      const tz = Math.max.apply(0, Array.from(document.querySelectorAll('.cr2-tile')).map(x => +getComputedStyle(x).zIndex || 0));
      const lz = +getComputedStyle(document.getElementById('cr2Tiles')).zIndex;
      return { on: w.classList.contains('on'), vis: vis(w), l: b.left, t: Math.round(b.top), w: b.width, h: Math.round(b.height),
        wz: +getComputedStyle(w).zIndex, lz, tz, focus: w.classList.contains('focus'), tabs: ${TABS},
        tabFocus: !!document.querySelector('#cr2Tabs [data-cr2-tab="terminal"].cr2-focus'),
        tilesVis: vis(document.getElementById('cr2T-coins')) }; })()`);
    check('T3d Terminal offen und sichtbar', a.on && a.vis, a);
    check('T3e … schwebt (nicht Vollbild) und liegt unter Leiste+Tabs', a.w < 1600 && a.t >= 78, a);
    check('T3f … liegt ueber der Kachel-Ebene; Kacheln bleiben sichtbar', a.wz > a.lz && a.tilesVis, a);
    check('T3g Tab „terminal" steht und ist markiert', a.tabs.indexOf('terminal') >= 0 && a.tabFocus, a);

    await page.click('#cr2Nav [data-cr2-top="home"]');
    await page.waitForTimeout(300);
    const b = await page.evaluate(`(() => { const vis = ${VIS}; const w = document.getElementById('win-terminal');
      return { on: w.classList.contains('on'), vis: vis(w), coins: vis(document.getElementById('cr2T-coins')), tabs: ${TABS} }; })()`);
    check('T3h Home: Terminal bleibt offen, liegt aber in den Tabs', b.on && !b.vis && b.coins && b.tabs.indexOf('terminal') >= 0, b);
    if(b.vis) await page.evaluate(() => document.getElementById('win-terminal').classList.add('cr2-min'));   // Folgeschritte entkoppeln

    await page.click('#cr2Tabs [data-cr2-tabgo="terminal"]');
    await page.waitForTimeout(300);
    const c = await page.evaluate(`(() => { const vis = ${VIS}; return vis(document.getElementById('win-terminal')); })()`);
    check('T3i Tab-Klick holt das Terminal zurueck', c === true, c);
    await page.click('#cr2Tabs [data-cr2-tabgo="terminal"]');
    await page.waitForTimeout(300);
    const c2 = await page.evaluate(`(() => { const vis = ${VIS}; const w = document.getElementById('win-terminal'); return { vis: vis(w), on: w.classList.contains('on') }; })()`);
    check('T3j zweiter Tab-Klick minimiert (Fenster bleibt offen)', !c2.vis && c2.on, c2);

    await page.click('#cr2Nav [data-cr2-top="trade"]');
    await page.click('#cr2Nav [data-cr2-prog="tokenterm"]');
    await page.waitForTimeout(500);
    await page.click('#cr2Tabs [data-cr2-tabx="tokenterm"]');
    await page.waitForTimeout(300);
    const e = await page.evaluate(`(() => ({ on: document.getElementById('win-tokenterm').classList.contains('on'), tabs: ${TABS} }))()`);
    check('T3k Tab-✕ schliesst Fenster und Tab', !e.on && e.tabs.indexOf('tokenterm') < 0 && e.tabs.indexOf('terminal') >= 0, e);
  }

  console.log('\nT4 · Gast-Sperre greift unveraendert');
  {
    const r0 = await page.evaluate(() => ({ guest: typeof crGuest === 'function' && crGuest(),
      locked: document.querySelector('#cr2Nav [data-cr2-prog="walletapp"]').classList.contains('cr2-locked') }));
    await page.click('#cr2Nav [data-cr2-top="portfolio"]');
    await page.click('#cr2Nav [data-cr2-prog="walletapp"]');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ on: document.getElementById('win-walletapp').classList.contains('on'),
      tabs: Array.from(document.querySelectorAll('#cr2Tabs [data-cr2-tab]')).map(x => x.getAttribute('data-cr2-tab')) }));
    const picker = await page.evaluate(() => { const m = document.getElementById('crWalletPickerModal'); const on = !!(m && m.classList.contains('on')); if(m) m.classList.remove('on'); return on; });
    check('T4a Gast: Wallet traegt das Schloss', r0.guest === true && r0.locked === true, r0);
    check('T4b Gast: Klick oeffnet kein Fenster und keinen Tab', !r.on && r.tabs.indexOf('walletapp') < 0, r);
    check('T4c … sondern die Wallet-Auswahl (vorhandener Weg)', picker === true, picker);
  }

  console.log('\nT5 · Top Coins aus der Antwort');
  {
    await page.click('#cr2Nav [data-cr2-top="home"]');
    await page.evaluate(() => window.crUiV2.poll(true));
    await page.evaluate(() => document.querySelectorAll('#splash .os-window.on').forEach(w => w.classList.add('cr2-min')));   // Folgeschritte entkoppeln (T3h prueft Home selbst)
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#cr2Coins tr'));
      return { n: rows.length, syms: rows.map(tr => tr.querySelector('b') && tr.querySelector('b').textContent),
        tbl: !document.getElementById('cr2CoinsTbl').hidden,
        popMc: rows[2] ? rows[2].children[3].textContent : null,
        feed: Array.from(document.querySelectorAll('#cr2Feed li .cr2-tag')).map(x => x.textContent) };
    });
    check('T5a drei Zeilen in Antwort-Reihenfolge', r.tbl && r.n === 3 && r.syms.join() === 'WIF,BONK,POPCAT', r);
    check('T5b MC fehlt → FDV als Ersatz, nie $0', r.popMc === '$6.00M', r);
    check('T5c Live-Feed: NEU, MIGR und HOT aus der Antwort', ['NEU','MIGR','HOT'].every(t => r.feed.indexOf(t) >= 0), r.feed);
  }

  console.log('\nT6 · Kaufweg in drei Klicks');
  {
    await page.click('#cr2Coins tr:nth-child(1) td:nth-child(2)');          // Klick 1: Coin
    const pop = await page.evaluate(`(() => { const vis = ${VIS}; const p = document.getElementById('cr2Pop');
      return { vis: vis(p), buy: !!p.querySelector('[data-cr2-side="BUY"]'), sell: !!p.querySelector('[data-cr2-side="SELL"]'), sym: (p.querySelector('b')||{}).textContent }; })()`);
    check('T6a Klick 1 → Activation-Popover mit BUY und SELL', pop.vis && pop.buy && pop.sell && pop.sym === 'WIF', pop);
    await page.click('#cr2Pop [data-cr2-side="BUY"]');                      // Klick 2: Buy
    await page.waitForTimeout(9500);
    const r = await page.evaluate(() => {
      const sec = document.querySelector('[data-blue-route-inputs]');
      const sels = sec ? Array.from(sec.querySelectorAll('select')).map(s => s.value) : [];
      const arm = sec ? Array.from(sec.querySelectorAll('button')).find(b => /Arm/.test(b.textContent)) : null;
      return { splash: document.getElementById('splash').style.display, panel: !!sec, sels,
        arm: !!arm && !arm.disabled, asset: typeof currentAssetObj === 'function' ? currentAssetObj().mint : null };
    });
    check('T6b Klick 2 → Chart (Desktop weg), Token gewechselt', r.splash === 'none' && r.asset === MINTS.WIF, r);
    check('T6c bestehendes Activation-Panel offen, Seite BUY', r.panel && r.sels.indexOf('BUY') >= 0 && r.sels.indexOf('SELL') < 0, r);
    check('T6d Klick 3 moeglich: Arm/Update steht bedienbar da', r.arm, r);

    // SELL: Panel schliessen, zurueck, zweite Zeile verkaufen
    await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} });
    await page.evaluate(() => { try { showSplash(); } catch(_){} });
    await page.waitForTimeout(600);
    await page.click('#cr2Coins tr:nth-child(2) td:nth-child(2)');
    await page.click('#cr2Pop [data-cr2-side="SELL"]');
    await page.waitForTimeout(9500);
    const s = await page.evaluate(() => {
      const secs = Array.from(document.querySelectorAll('[data-blue-route-inputs]'));
      const sec = secs[secs.length - 1];
      return { sels: sec ? Array.from(sec.querySelectorAll('select')).map(x => x.value) : [], asset: currentAssetObj().mint };
    });
    check('T6e SELL → Panel mit Seite SELL, Token BONK', s.sels.indexOf('SELL') >= 0 && s.asset === MINTS.BONK, s);
  }

  console.log('\nT7 · Chart-Tab ueberlebt den Weg zurueck');
  {
    await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} });
    await page.evaluate(() => { try { showSplash(); } catch(_){} });
    await page.waitForTimeout(600);
    const r = await page.evaluate(`(() => { const vis = ${VIS};
      const tabs = Array.from(document.querySelectorAll('#cr2Tabs [data-cr2-tab]'));
      return { tabs: tabs.map(x => x.getAttribute('data-cr2-tab')), lbl: (tabs.find(x => x.getAttribute('data-cr2-tab') === 'chart') || {}).textContent,
        home: vis(document.getElementById('cr2T-coins')), term: document.getElementById('win-terminal').classList.contains('on') }; })()`);
    check('T7a zurueck auf Home: Tabs „terminal" und „chart" stehen', r.home && r.tabs.indexOf('chart') >= 0 && r.tabs.indexOf('terminal') >= 0, r);
    check('T7b Chart-Tab nennt das Symbol', /BONK/.test(r.lbl || ''), r);
    const hasChart = await page.evaluate(() => !!document.querySelector('#cr2Tabs [data-cr2-tabgo="chart"]'));
    if(hasChart){ await page.click('#cr2Tabs [data-cr2-tabgo="chart"]'); await page.waitForTimeout(500); }
    const c = hasChart ? await page.evaluate(() => document.getElementById('splash').style.display) : 'kein Tab';
    check('T7c Klick auf den Chart-Tab → wieder im Chart', c === 'none', c);
    await page.evaluate(() => { try { showSplash(); } catch(_){} });
    await page.waitForTimeout(400);
    const hasTab = await page.evaluate(() => !!document.querySelector('#cr2Tabs [data-cr2-tabgo="terminal"]'));
    if(hasTab){ await page.click('#cr2Tabs [data-cr2-tabgo="terminal"]'); await page.waitForTimeout(500); }
    const t = hasTab && await page.evaluate(`(() => { const vis = ${VIS}; return vis(document.getElementById('win-terminal')); })()`);
    check('T7d Tab eines beim Chartwechsel geschlossenen Fensters oeffnet es wieder', t === true, t);
  }

  console.log('\nT8 · Pulse als Kachel');
  {
    await page.click('#cr2Nav [data-cr2-top="trade"]');
    await page.click('#cr2Nav [data-cr2-tile="pulse"]');
    await page.waitForTimeout(600);
    const r = await page.evaluate(`(() => { const vis = ${VIS}; const names = id => Array.from(document.querySelectorAll('#' + id + ' .cr2-l1 b')).map(b => b.textContent);
      return { vis: vis(document.getElementById('cr2T-pulse')), tab: ${TABS}.indexOf('t:pulse') >= 0,
        neu: names('cr2PNew'), hot: names('cr2PHot'), mig: names('cr2PMig') }; })()`);
    check('T8a Pulse-Kachel offen, mit Tab', r.vis && r.tab, r);
    check('T8b Migriert = nur PumpSwap/Raydium', r.mig.join() === 'MIGA,MIGB', r);
    check('T8c Neu enthaelt keinen migrierten Pool', r.neu.join() === 'NEWX', r);
    check('T8d Hot = Solana-Boosts (kein Ethereum)', r.hot.join() === 'WIF', r);
  }

  console.log('\nT10 · Kacheln: ziehen, Groesse, minimieren, schliessen, einklappen, merken');
  {
    const box = id => page.evaluate(i => { const e = document.getElementById('cr2T-' + i); const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), hidden: e.hidden, col: e.classList.contains('cr2-col') }; }, id);
    await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} window.crUiV2.desktop(); document.querySelectorAll('#splash .os-window.on').forEach(w => w.classList.add('cr2-min')); window.crUiV2.openTile('coins'); });
    const b0 = await box('coins');
    const cover = await page.evaluate(() => { const g = document.querySelector('#cr2T-coins .cr2-grip').getBoundingClientRect(); const e = document.elementFromPoint(g.left + 4, g.top + 4); return !!(e && e.closest('#cr2T-coins')); });
    check('T10z nach der Menue-Auswahl verdeckt das Aufklapp-Menue die Kachel nicht', cover === true, cover);
    const hd = await page.evaluate(() => { const g = document.querySelector('#cr2T-coins .cr2-grip').getBoundingClientRect(); return { x: g.left + 4, y: g.top + 4 }; });
    await page.mouse.move(hd.x, hd.y); await page.mouse.down(); await page.mouse.move(hd.x + 20, hd.y + 10); await page.mouse.move(hd.x + 37, hd.y + 21); await page.mouse.up();
    const b1 = await box('coins');
    check('T10a Ziehen verschiebt die Kachel', Math.abs(b1.x - b0.x - 37) <= 4 && Math.abs(b1.y - b0.y - 21) <= 4, { b0, b1 });
    check('T10b … im 8-px-Raster', b1.x % 8 === 0 && b1.y % 8 === 0, b1);
    const rz = await page.evaluate(() => { const g = document.querySelector('#cr2T-coins .cr2-rz').getBoundingClientRect(); return { x: g.left + 9, y: g.top + 9 }; });
    await page.mouse.move(rz.x, rz.y); await page.mouse.down(); await page.mouse.move(rz.x - 40, rz.y - 30); await page.mouse.move(rz.x - 80, rz.y - 64); await page.mouse.up();
    const b2 = await box('coins');
    check('T10c Ecke unten rechts aendert die Groesse (Raster)', Math.abs(b2.w - (b1.w - 80)) <= 8 && Math.abs(b2.h - (b1.h - 64)) <= 8 && b2.x === b1.x && b2.y === b1.y, { b1, b2 });

    await page.click('#cr2T-coins [data-cr2-tmin="coins"]');
    const m = await page.evaluate(`(() => ({ hidden: document.getElementById('cr2T-coins').hidden, tab: !!document.querySelector('#cr2Tabs [data-cr2-tab="t:coins"]'), on: !!document.querySelector('#cr2Tabs [data-cr2-tab="t:coins"].cr2-on') }))()`);
    check('T10d ▁ minimiert: Kachel weg, Tab bleibt (nicht aktiv)', m.hidden && m.tab && !m.on, m);
    if(m.tab) await page.click('#cr2Tabs [data-cr2-tabgo="t:coins"]');
    else await page.evaluate(() => window.crUiV2.openTile('coins'));   // sonst liefe der Rest ins Leere
    const b3 = await box('coins');
    check('T10e Tab-Klick holt sie an dieselbe Stelle zurueck', !b3.hidden && b3.x === b2.x && b3.w === b2.w, { b2, b3 });

    await page.click('#cr2T-feed [data-cr2-tclose="feed"]');
    const cl = await page.evaluate(`(() => ({ hidden: document.getElementById('cr2T-feed').hidden, tab: ${TABS}.indexOf('t:feed') >= 0 }))()`);
    check('T10f ✕ schliesst: Kachel und Tab weg', cl.hidden && !cl.tab, cl);
    await page.click('#cr2Nav [data-cr2-top="trade"]');
    await page.click('#cr2Nav [data-cr2-tile="feed"]');
    const re = await page.evaluate(`(() => ({ hidden: document.getElementById('cr2T-feed').hidden, tab: ${TABS}.indexOf('t:feed') >= 0 }))()`);
    check('T10g … und kommt ueber das Menue wieder', !re.hidden && re.tab, re);

    await page.dblclick('#cr2T-arcade .cr2-th h2');
    const c1 = await box('arcade');
    check('T10h Doppelklick klappt ein (nur der Kopf bleibt)', c1.col && c1.h <= 40, c1);
    await page.dblclick('#cr2T-arcade .cr2-th h2');
    const c2 = await box('arcade');
    check('T10i … und wieder aus', !c2.col && c2.h > 150, c2);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(4500);
    await page.evaluate(() => { ['crFrMask','crFrPop'].forEach(id => { const e = document.getElementById(id); if(e) e.classList.remove('on'); }); });
    const b4 = await box('coins');
    check('T10j Anordnung ueberlebt das Neuladen', b4.x === b3.x && b4.y === b3.y && b4.w === b3.w && b4.h === b3.h, { b3, b4 });
    await page.click('#cr2Nav [data-cr2-top="more"]');
    await page.click('#cr2Nav [data-cr2-act="reset"]');
    const b5 = await box('coins');
    const def = await page.evaluate(() => 116 + 270 + 12);
    check('T10k „Kacheln zuruecksetzen" stellt die Standard-Anordnung her', b5.x === def && b5.y === 90, b5);
  }
  const errs = page._crErrs.filter(e => /cr2|crUiV2|cr-ui-v2/.test(e));
  await page._ctx.close();

  // ── T5-Ausfall: Quelle weg → Grund, keine Tabelle ─────────────────────
  console.log('\nT5 · Ausfall ist keine Auskunft');
  {
    const p2 = await boot(browser, fileUrl(selfPath) + '?ui=v2', { gtDown: true });
    await p2.evaluate(() => window.crUiV2.poll(true));
    await p2.waitForTimeout(800);
    const r = await p2.evaluate(() => ({ tblHidden: document.getElementById('cr2CoinsTbl').hidden, rows: document.querySelectorAll('#cr2Coins tr').length,
      msg: document.getElementById('cr2CoinsMsg').textContent, msgHidden: document.getElementById('cr2CoinsMsg').hidden }));
    check('T5d Quelle 503 → keine Tabelle, keine Zeile', r.tblHidden && r.rows === 0, r);
    check('T5e … und der Grund steht da', !r.msgHidden && /nicht abrufbar/.test(r.msg) && /503/.test(r.msg), r);
    await p2._ctx.close();
  }

  console.log('\nT9 · Regression');
  {
    const ver = (src.match(/CURRENT VERSION:\s*v1\.0\.(\d+)/) || [])[1];
    check('T9a Banner >= v1.0.948', Number(ver) >= 948, ver);
    check('T9d Aktivierungszeile fuer /play-v2/ genau einmal', src.split('\n  if(!_want()) return;\n').length === 2);
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g; let n = 0; while(re.exec(src)) n++;
    check('T9b 7 Skriptbloecke', n === 7, n);
    check('T9c keine Seitenfehler aus dem v2-Block', errs.length === 0, errs);
  }

  await browser.close();
  console.log('\n' + pass + ' ok · ' + fail + ' FAIL · 0 UNGETESTET');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
