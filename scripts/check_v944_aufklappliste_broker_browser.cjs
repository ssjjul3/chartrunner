/* Smoke-Verifikation v1.0.944 — UI-LESBARKEIT: AUFKLAPP-LISTEN UND BROKER-KARTEN.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, in den drei Themes, die
 * auf der Live-Flaeche ueberhaupt waehlbar sind: platinum ("Platinum"),
 * bw ("White") und mono ("Black"). Ein grep auf eine CSS-Zeile bewiese nur,
 * dass eine Regel dasteht. Die Zusagen dieses Patches sind aber Aussagen
 * ueber GERECHNETE Werte — Deckung, Farbe, Rundung, Stapelung, Kanten —, und
 * die gibt es erst, wenn ein Browser die Datei gemalt hat.
 *
 * WAS GEPRUEFT WIRD:
 *
 *  A1  Die Asset-Aufklapp-Liste ist DECKEND. Vor diesem Patch rechnete sie in
 *      Platinum und White zu rgba(127,127,127,0.06) ohne Hintergrundbild —
 *      praktisch durchsichtig, der Text darunter schlug durch.
 *  A2  Dasselbe fuer die Timeframe-Liste. Die war schon vorher deckend, aber
 *      in jedem Theme im Dunkel-Navy; sie teilt sich jetzt den Baustein.
 *  A3  Die Liste liegt UEBER "Start Run": elementFromPoint am Ueberschnitt
 *      darf nicht den Knopf treffen.
 *  A4  Die Liste bleibt im SICHTBAREN Fensterkoerper. Vor dem Patch reichte
 *      sie bis y=407, waehrend das overflow:auto der .os-wbody bei y=341
 *      endete — 66 px hinter der Kante, von aussen unerreichbar.
 *  A5  Die Liste scrollt IN SICH (overflow-y auto/scroll).
 *  A6  Im style-Attribut der Liste steht kein Hintergrund/Rahmen/Schatten
 *      mehr. Genau diese Zeichenkette war die Ursache von A1: sie liess die
 *      Liste in den Licht-Theme-Fang :is(div,details)[style*="border:1px"]
 *      laufen. Steht sie wieder drin, ist der Fehler wieder da.
 *  B1  Die Broker-Karte hat DENSELBEN gerechneten Grund wie die Ping-Class-
 *      Zeile in NOTIFICATIONS — nicht "aehnlich", denselben.
 *  B2  Gleiche Rundung und gleiche Abstaende wie diese Zeile.
 *  B3  Die GEROUTETE Karte hebt sich ab, und zwar gegen die neutrale UND
 *      gegen die nur verbundene. Die erste Fassung dieser Zeile verglich nur
 *      gegen die neutrale und blieb bei der Gegenprobe gruen — die verbundene
 *      Toenung sprang ein. Sie prueft jetzt beides.
 *  B4  Die Kennzeichnung "Routing" steht weiter da.
 *  B5  Der DISCONNECT-Knopf steht weiter da.
 *  B6  Die Kopfkarte ACTIVE ROUTE traegt dieselbe Flaeche wie die Karten.
 *  B7  Verbunden-aber-nicht-geroutet ist als verbunden erkennbar.
 *  B8  Der Chip "1 connected" nimmt in den hellen Themes den hellen Akzent
 *      (--cros-accent) statt des Dunkel-Theme-Gruens.
 *
 * AUSFUEHREN:  node scripts/check_v944_aufklappliste_broker_browser.cjs
 *              (optional: erster Parameter = Pfad zu einer anderen Fassung
 *              der Datei, z. B. fuer eine Gegenprobe)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'ChartRunner_Prototype.html'));
const THEMES = ['platinum', 'bw', 'mono'];
let pass = 0, fail = 0;

function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 500))); }
}
function launchOptions(){
  const o = { headless: true };
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const cands = [process.env.CR_CHROME_PATH].filter(Boolean);
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ o.executablePath = c; break; }
  return o;
}
/* Deckend heisst: ein Hintergrundbild (Verlauf) ODER eine Farbe mit >= 90 %
 * Alpha. 6 % Grau ist beides nicht. */
function deckend(bg, bgImg){
  if(bgImg && bgImg !== 'none') return true;
  const m = /rgba?\(([^)]+)\)/.exec(bg || '');
  if(!m) return false;
  const p = m[1].split(',').map(s => parseFloat(s));
  return p.length < 4 || p[3] >= 0.9;
}

const PROBE = `(async (theme) => {
  const o = {};
  try { window.crApplyTheme(theme); } catch(e){ o.themeErr = String(e); }
  await new Promise(s => setTimeout(s, 180));
  o.themeAttr = document.body.getAttribute('data-os-theme');

  /* ---- Run-Dialog: die beiden "More ▾" ---- */
  try { osOpenWindowMulti('chartrunner'); } catch(e){}
  await new Promise(s => setTimeout(s, 500));
  const tab = document.querySelector('#win-run [data-cat="regular"]'); if(tab) tab.click();
  await new Promise(s => setTimeout(s, 500));
  const mb = document.querySelector('#osAssetBox .os-more-btn'); if(mb) mb.click();
  await new Promise(s => setTimeout(s, 700));
  const pop = document.querySelector('.os-more-pop');
  if(pop){
    const cs = getComputedStyle(pop), rc = pop.getBoundingClientRect();
    o.assetPop = { bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 60), z: cs.zIndex,
                   color: cs.color, inlineStyle: pop.getAttribute('style'),
                   hasClass: pop.classList.contains('cr-pop-surface') };
    const st = document.getElementById('crCfgStart'), sr = st.getBoundingClientRect();
    const px = Math.max(sr.left, rc.left) + 6, py = Math.max(sr.top, rc.top) + 6;
    const el = document.elementFromPoint(px, py);
    o.topAtOverlap = el ? (el.id || el.tagName + ':' + (el.textContent || '').trim().slice(0, 14)) : '(none)';
    let sc = pop.parentElement;
    while(sc && sc !== document.body && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    o.clipBottom = (sc && sc !== document.body) ? Math.round(sc.getBoundingClientRect().bottom) : null;
    o.popBottom = Math.round(pop.getBoundingClientRect().bottom);
    const list = pop.children[1];
    o.listMax = list ? getComputedStyle(list).maxHeight : null;
    o.listScrolls = list ? getComputedStyle(list).overflowY : null;
  }
  const tfb = document.querySelector('#osTfBox .cfg-tf-more'); if(tfb) tfb.click();
  await new Promise(s => setTimeout(s, 300));
  const tp = document.querySelector('.cfg-tf-pop');
  if(tp){ const cs = getComputedStyle(tp);
    o.tfPop = { bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 60),
                z: cs.zIndex, hasClass: tp.classList.contains('cr-pop-surface') }; }

  /* ---- Settings: BROKERS gegen NOTIFICATIONS ---- */
  /* Settings ist kontogebunden (CR_CONNECT_EXCLUSIVE, v1.0.930) — als Gast
     oeffnet osOpenWindowMulti es NICHT. Fuer die Messung wird das Fenster
     deshalb direkt sichtbar geschaltet; gemessen werden gerechnete Farben und
     Groessen, nicht die Gast-Sperre. */
  try { osOpenWindowMulti('settings'); } catch(e){}
  try { document.getElementById('win-settings').classList.add('on'); } catch(e){}
  await new Promise(s => setTimeout(s, 450));
  o.settingsVisible = (document.getElementById('win-settings').getBoundingClientRect().width > 0);
  const bt = document.querySelector('#win-settings [data-setview="brokers"]');
  const nt = document.querySelector('#win-settings [data-setview="notif"]');
  if(bt) bt.click();
  await new Promise(s => setTimeout(s, 400));
  /* Einer verbunden UND geroutet (wie Binance heute), einer nur verbunden —
     sonst gaebe es die beiden gruenen Zustaende gar nicht zu messen. */
  try {
    localStorage.setItem('cr_broker_connection_v1', JSON.stringify({
      'cex:Binance': { status:'connected', mode:'paper' },
      'dex:Orca':    { status:'connected', mode:'paper' } }));
    localStorage.setItem('cr_broker_v1', JSON.stringify({ type:'cex', name:'Binance' }));
  } catch(e){}
  if(nt) nt.click(); await new Promise(s => setTimeout(s, 200));
  if(bt) bt.click(); await new Promise(s => setTimeout(s, 500));
  const g = (sel, keys) => { const e = document.querySelector(sel); if(!e) return null;
    const c = getComputedStyle(e), r = {}; keys.forEach(k => r[k] = c[k]); return r; };
  o.brokerRowPlain  = g('.crBrokerRow:not(.connected)', ['backgroundColor','borderTopColor','borderTopLeftRadius','padding','color']);
  o.brokerRowRouted = g('.crBrokerRow.routed', ['backgroundColor','borderTopColor']);
  o.brokerRowConn   = g('.crBrokerRow.connected:not(.routed)', ['backgroundColor','borderTopColor']);
  o.brokerHead      = g('.crBrokerHead', ['backgroundColor','borderTopColor','borderTopLeftRadius']);
  o.brokerBadge     = g('.crBrokerBadge', ['color','backgroundColor']);
  o.routingText     = (document.querySelector('.crBrokerRoutePill') || {}).textContent || '';
  o.disconnect      = !!Array.from(document.querySelectorAll('.crBrokerMini')).find(x => /Disconnect/i.test(x.textContent));
  if(nt) nt.click(); await new Promise(s => setTimeout(s, 450));
  o.pingRow = g('.crPingRow', ['backgroundColor','borderTopColor','borderTopLeftRadius','padding','color']);
  return o;
})`;

(async () => {
  console.log('v1.0.944 — Aufklapp-Listen und Broker-Karten · ' + FILE);
  const browser = await chromium.launch(launchOptions());
  const errors = [];
  for(const th of THEMES){
    console.log('\n-- Theme ' + th);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(th + ': ' + e.message));
    await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    const r = await page.evaluate(PROBE + '(' + JSON.stringify(th) + ')');
    const A = r.assetPop || {}, T = r.tfPop || {};
    check('A1 Asset-Liste deckend', deckend(A.bg, A.bgImg), { bg: A.bg, bgImg: A.bgImg });
    check('A2 Timeframe-Liste deckend', deckend(T.bg, T.bgImg), { bg: T.bg, bgImg: T.bgImg });
    check('A3 Liste liegt ueber Start Run', r.topAtOverlap !== 'crCfgStart', r.topAtOverlap);
    check('A4 Liste bleibt im sichtbaren Fensterkoerper', r.popBottom <= r.clipBottom + 1,
          { popBottom: r.popBottom, clip: r.clipBottom, listMax: r.listMax });
    check('A5 Liste scrollt in sich', r.listScrolls === 'auto' || r.listScrolls === 'scroll', r.listScrolls);
    check('A6 kein Hintergrund/Rahmen mehr im style-Attribut',
          !/background|box-shadow|border:/.test(A.inlineStyle || ''), A.inlineStyle);
    check('B0 Settings-Fenster ist beim Messen wirklich sichtbar', r.settingsVisible === true, r.settingsVisible);
    check('B1 Broker-Karte hat den Grund der Ping-Zeile',
          !!r.brokerRowPlain && !!r.pingRow && r.brokerRowPlain.backgroundColor === r.pingRow.backgroundColor,
          { broker: r.brokerRowPlain && r.brokerRowPlain.backgroundColor, ping: r.pingRow && r.pingRow.backgroundColor });
    check('B2 gleiche Rundung und Abstaende',
          !!r.brokerRowPlain && !!r.pingRow
            && r.brokerRowPlain.borderTopLeftRadius === r.pingRow.borderTopLeftRadius
            && r.brokerRowPlain.padding === r.pingRow.padding,
          { broker: r.brokerRowPlain, ping: r.pingRow });
    check('B3 geroutete Karte hebt sich ab (gegen neutral UND gegen verbunden)',
          !!r.brokerRowRouted
            && r.brokerRowRouted.backgroundColor !== (r.brokerRowPlain || {}).backgroundColor
            && r.brokerRowRouted.backgroundColor !== (r.brokerRowConn || {}).backgroundColor,
          { routed: r.brokerRowRouted, conn: r.brokerRowConn, plain: r.brokerRowPlain && r.brokerRowPlain.backgroundColor });
    check('B4 "Routing" steht da', /Routing/.test(r.routingText), r.routingText);
    check('B5 DISCONNECT steht da', r.disconnect === true);
    check('B6 ACTIVE ROUTE traegt dieselbe Flaeche',
          !!r.brokerHead && !!r.pingRow && r.brokerHead.backgroundColor === r.pingRow.backgroundColor,
          { head: r.brokerHead, ping: r.pingRow });
    check('B7 verbunden-nicht-geroutet ist erkennbar',
          !!r.brokerRowConn && r.brokerRowConn.backgroundColor !== (r.brokerRowPlain || {}).backgroundColor,
          r.brokerRowConn);
    check('B8 Chip "1 connected" nimmt den hellen Akzent',
          th === 'mono' || (!!r.brokerBadge && r.brokerBadge.color === 'rgb(23, 184, 119)'), r.brokerBadge);
    await ctx.close();
  }
  await browser.close();
  if(errors.length){ fail++; console.log('\n  FAIL Seitenfehler :: ' + errors.slice(0, 3).join(' | ').slice(0, 400)); }
  console.log('\n' + pass + ' gruen / ' + fail + ' rot');
  process.exit(fail ? 1 : 0);
})();
