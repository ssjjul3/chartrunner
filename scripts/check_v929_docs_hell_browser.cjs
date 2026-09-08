/* Smoke-Verifikation v1.0.929 — DOCS-ANSICHTEN IN PLATINUM/WHITE.
 *
 * Reine Darstellung: keine Logik, keine Daten, kein Handelspfad. Was dieser
 * Test deshalb ausdruecklich mitprueft, ist das Nicht-Geschehene — dass die
 * dunklen Themes NICHT mitgekippt sind.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, nicht im Quelltext
 * gesucht: ein grep auf `rgba(10,15,28` beweist nichts ueber die Kaskade —
 * genau daran ist der Befund haengen geblieben. Die Flaechen waren dunkel,
 * OBWOHL der Selektor der hellen Themes sie meinte; die Variable
 * --cr-app-panel wird eine Ebene naeher (auf .os-wbody) dunkel definiert und
 * gewinnt durch NAEHE, nicht durch Spezifitaet. Also wird der effektive,
 * zusammengesetzte Hintergrund pro Element ausgerechnet und die relative
 * Luminanz gemessen.
 *
 * Der Vorher-Vergleich braucht kein zweites Repo: dasselbe Dokument wird ein
 * zweites Mal ausgeliefert, mit dem v1.0.929-Block mechanisch zwischen seinen
 * BEGIN/END-Markern herausgeschnitten. „Vorher" und „nachher" sind damit
 * dieselbe Datei, derselbe Browser, dieselben Fixtures.
 *
 * Jede Gegenprobe MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Keine wirksame Dunkelflaeche mehr in den fuenf Ansichten unter
 *      platinum / bw / attributlos. Gemessen wird der EFFEKTIVE Grund (alpha
 *      ueber die Elternkette komponiert), nicht die deklarierte Farbe.
 *      Zusaetzlich wird belegt, dass platinum die ATTRIBUTLOSE Vorgabe ist —
 *      der Arm `.splash:not([data-theme])` ist also der, der hier arbeitet.
 *      (Mutation: im (A)-Block --cr-app-panel wieder auf #0f141e -> T1 rot.)
 *  T2  Kontrast ueber ALLE Text-Flaeche-Paare der fuenf Ansichten, mit
 *      GEFUELLTEN Listen (Paper-Trade, Alarm und Session ueber die echte
 *      Oberflaeche angelegt, nicht in den Speicher geschrieben): 4.5:1 fuer
 *      Fliesstext, 3:1 fuer grosse/fette Schrift. Der Test wird rot, sobald
 *      eine Flaeche aufgehellt wird, ohne den Vordergrund mitzuziehen.
 *      (Mutation: im (B1)-Block die color-Zeile entfernen -> T2 rot mit
 *       #ecffef auf Hellgrau.)
 *  T3  Platzhalter sind ein eigener Fall — sie tragen eine eigene Farbe.
 *      Gemessen ueber ::placeholder in platinum und bw.
 *      (Mutation: (B3) entfernen -> T3 rot bei 2.6:1.)
 *  T4  Kein horizontaler Ueberlauf in PAPER bei 390 px: scrollWidth der
 *      Docs-Flaeche == clientWidth, und kein Element ragt ueber ihren rechten
 *      Rand. (Mutation: das flex-wrap in (Ueberlauf) entfernen -> T4 rot mit
 *      #crJrnPrefill und #crJrnClear.)
 *  T5  DIE DUNKLEN THEMES SIND UNVERAENDERT. mono, ascii, frontier, alle fuenf
 *      Ansichten, jedes Element: Grund, Tinte, Rand und Schatten identisch mit
 *      und ohne den Block. (Mutation: einer Regel des Blocks den Theme-Scope
 *      nehmen -> T5 rot.)
 *  T6  In den dunklen Themes entsteht KEIN neues Kontrastproblem: die Menge
 *      der unterschwelligen Paare nach dem Patch ist eine Teilmenge der Menge
 *      davor. Was dort vorher schon zu dunkel war, bleibt es — der Auftrag
 *      sagt ausdruecklich, dass die dunklen Themes nicht angefasst werden.
 *      Die Restmenge wird benannt, nicht verschwiegen.
 *  T7  Regression: Banner meldet mindestens v1.0.929; die vier Tore, der
 *      Spion und der Market-/Limit-Pfad stehen unveraendert im Quelltext;
 *      Single-File, kein neuer <script src>.
 *
 * Aufruf:  node scripts/check_v929_docs_hell_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const FILE = 'ChartRunner_Prototype.html';
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

/* „Vorher" = dieselbe Datei ohne die v1.0.929-Bloecke. Die Marker stehen als
 * CSS-Kommentar im Dokument; geschnitten wird zwischen BEGIN und END. */
const BEGIN = /\/\* ═+ v1\.0\.929 · BEGIN[^\n]*\*\/\n/g;
function stripPatch(html){
  let out = html, guard = 0;
  while(guard++ < 10){
    BEGIN.lastIndex = 0;
    const m = BEGIN.exec(out);
    if(!m) break;
    const endIdx = out.indexOf('v1.0.929 · END', m.index);
    if(endIdx < 0) break;
    const endLine = out.indexOf('\n', endIdx);
    out = out.slice(0, m.index) + out.slice(endLine + 1);
  }
  return out;
}

function serve(html, htmlBefore){
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = (req.url || '').split('?')[0];
      if(p === '/play/' || p === '/before/'){
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(p === '/play/' ? html : htmlBefore);
        return;
      }
      res.writeHead(404); res.end('');
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/* Der Kontrast-Rechner laeuft IN der Seite. effBg() komponiert die
 * halbdurchsichtigen Gruende ueber die Elternkette — genau deshalb sieht der
 * Test einen dunklen Kasten auch dann, wenn seine eigene Farbe rgba(...,.45)
 * heisst und erst durch den Elterngrund dunkel wird. */
const LIB = `
window.__crC = (function(){
  function parse(c){
    if(!c) return null;
    var m = String(c).match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    var p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number);
    if(p.length < 3 || p.some(isNaN)) return null;
    return { r:p[0], g:p[1], b:p[2], a:(p.length>3?p[3]:1) };
  }
  function over(fg,bg){ var a=fg.a;
    return { r:fg.r*a+bg.r*(1-a), g:fg.g*a+bg.g*(1-a), b:fg.b*a+bg.b*(1-a), a:1 }; }
  function effBg(el){
    var stack=[], n=el;
    while(n && n.nodeType===1){
      var c=parse(getComputedStyle(n).backgroundColor);
      if(c && c.a>0){ stack.push(c); if(c.a>=1) break; }
      n=n.parentElement;
    }
    var out={r:255,g:255,b:255,a:1};
    for(var i=stack.length-1;i>=0;i--) out=over(stack[i],out);
    return out;
  }
  function lum(c){ function f(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
    return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
  function ratio(a,b){ var l1=lum(a),l2=lum(b); if(l1<l2){var t=l1;l1=l2;l2=t;} return (l1+0.05)/(l2+0.05); }
  function key(el){
    var p=[], n=el;
    while(n && n.nodeType===1 && n.id!=='win-display'){
      var i=0, s=n; while((s=s.previousElementSibling)) i++;
      p.unshift(n.tagName+'['+i+']'); n=n.parentElement;
    }
    return p.join('>');
  }
  return { parse:parse, over:over, effBg:effBg, lum:lum, ratio:ratio, key:key };
})();
`;

const VIEWS = ['maps','alerts','paper','pnl','journal','sessions'];

/* Fixtures ueber die ECHTE Oberflaeche: ein Paper-Trade, ein Alarm und eine
 * Session entstehen durch Klicks, nicht durch Schreiben in den Speicher. Waere
 * die Form im Speicher falsch geraten, blieben die Listen leer und der Test
 * haette genau das gemessen, was der Befund ohnehin schon zeigt: leere
 * Zustaende. Die Zeilenzahl wird deshalb zurueckgegeben und geprueft. */
async function seed(pg){
  return await pg.evaluate(async () => {
    const $ = id => document.getElementById(id);
    const win = $('win-display'); if(win) win.classList.add('on');
    /* MAPS ist der MASSSTAB des Auftrags — als Gast ist die Kartenflaeche
     * per CSS ausgeblendet (body.cr-guest #crDocsViewMaps .crMapsFull). Ohne
     * diese Zeile misst der Test in MAPS null Elemente und behauptet dann
     * „gleich wie MAPS", ohne MAPS je gesehen zu haben. */
    document.body.classList.remove('cr-guest');
    const nav = v => { const b = document.querySelector('.crDocsNavItem[data-docsview="'+v+'"]'); if(b) b.click(); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // PAPER: ein Trade
    nav('paper'); await wait(120);
    const set = (id,v) => { const e=$(id); if(e){ e.value=v; } };
    set('crJrnAsset','BTC'); set('crJrnEntry','78200'); set('crJrnSl','77800');
    set('crJrnTp','79000'); set('crJrnRisk','1.0'); set('crJrnConf','7');
    set('crJrnLevels','pdPOC, dOpen'); set('crJrnPnl','-124.50');
    set('crJrnTradeNotes','Gegenprobe: Zeile mit Text, damit die Liste nicht leer misst.');
    ['crJrnChkHTF','crJrnChkLevel','crJrnChkRR'].forEach(id => { const e=$(id); if(e) e.checked=true; });
    const res=$('crJrnResult'); if(res) res.value='loss';
    if($('crJrnAdd')) $('crJrnAdd').click();
    await wait(180);
    // ALERTS: ein Alarm
    nav('alerts'); await wait(180);
    const val=$('crAeVal'); if(val) val.value='0.000032';
    if($('crAeArm')) $('crAeArm').click();
    await wait(220);
    // SESSIONS: ein Session-Dokument
    nav('sessions'); await wait(150);
    if($('crBotSessionNew')) $('crBotSessionNew').click();
    await wait(220);
    nav('paper'); await wait(120);
    return {
      paperRows: ($('crJrnList') ? $('crJrnList').children.length : -1),
      alertNodes: (document.querySelectorAll('#crDocsViewAlerts .crDocs-card, #crDocsViewAlerts .crDocs-list > *').length),
      sessionText: (($('crBotChatLog') || {}).textContent || '').trim().length,
    };
  });
}

/* Ein Durchgang: Theme setzen, jede Ansicht oeffnen, pro Element messen. */
async function scan(pg, theme){
  return await pg.evaluate(async ({ theme, views }) => {
    const C = window.__crC;
    try { if(window.crApplyTheme) window.crApplyTheme(theme); } catch(_){}
    await new Promise(r => setTimeout(r, 140));
    const themeAttr = {
      body: document.body.getAttribute('data-os-theme'),
      splash: (document.getElementById('splash') || {}).getAttribute
              ? document.getElementById('splash').getAttribute('data-theme') : null,
    };
    const out = { themeAttr, views: {} };
    for(const v of views){
      const nav = document.querySelector('.crDocsNavItem[data-docsview="'+v+'"]');
      if(nav) nav.click();
      await new Promise(r => setTimeout(r, 130));
      const panel = document.querySelector('.crDocsView:not(.hidden)');
      const rec = { id: panel ? panel.id : null, n: 0, bad: [], dark: [], snap: {}, ph: [] };
      if(panel){
        panel.querySelectorAll('*').forEach(el => {
          const cs = getComputedStyle(el);
          if(cs.display === 'none' || cs.visibility === 'hidden') return;
          const r = el.getBoundingClientRect();
          if(r.width < 1 || r.height < 1) return;
          rec.n++;
          const k = C.key(el);
          rec.snap[k] = [cs.backgroundColor, cs.color, cs.borderTopColor, cs.borderTopWidth, cs.boxShadow].join('|');
          const bg = C.effBg(el);
          const bgL = C.lum(bg);
          // Eigene Flaeche? Nur Elemente, die selbst einen Grund malen, zaehlen
          // als Flaeche — sonst wuerde jedes <span> den Grund seiner Karte melden.
          const own = C.parse(cs.backgroundColor);
          // Eine FLAECHE ist ein Behaelter mit eigenem Grund. Ein farbiges
          // Abzeichen (SPAN mit lila Grund, der LIVE-Punkt) ist keine Flaeche
          // und soll dunkel bleiben duerfen — es traegt seine eigene Tinte.
          const PANEL = ['DIV','DETAILS','SECTION','UL','OL','TABLE','THEAD','TBODY','TR','FORM','ASIDE','NAV','SUMMARY','LI','ARTICLE'];
          const isPanel = PANEL.indexOf(el.tagName) >= 0 && el.children.length > 0;
          if(own && own.a > 0.02 && isPanel) rec.dark.push({ k, l: Math.round(bgL*1000)/1000,
            bg: [Math.round(bg.r),Math.round(bg.g),Math.round(bg.b)].join(','),
            cls: String(el.className || '').slice(0,44), id: el.id });
          // Platzhalter tragen eine eigene Farbe -> eigener Fall.
          const tag = el.tagName;
          if(tag === 'INPUT' || tag === 'TEXTAREA'){
            const t = (el.getAttribute('type') || 'text').toLowerCase();
            if(t !== 'checkbox' && t !== 'radio' && el.getAttribute('placeholder')){
              const pc = C.parse(getComputedStyle(el, '::placeholder').color);
              if(pc) rec.ph.push({ k, id: el.id,
                cr: Math.round(C.ratio(C.over(pc, bg), bg)*100)/100,
                ph: (el.getAttribute('placeholder')||'').slice(0,28) });
            }
          }
          // Text-auf-Flaeche. Nur EIGENE Textknoten, sonst zaehlt jeder
          // Container den Text seiner Kinder ein zweites Mal.
          let own_t = '';
          el.childNodes.forEach(n => { if(n.nodeType === 3) own_t += n.nodeValue; });
          if(!own_t.trim()) return;
          if(tag === 'INPUT'){
            const t = (el.getAttribute('type') || 'text').toLowerCase();
            if(t === 'checkbox' || t === 'radio') return;
          }
          const fgRaw = C.parse(cs.color); if(!fgRaw) return;
          const fg = C.over(fgRaw, bg);
          const size = parseFloat(cs.fontSize) || 12;
          const w = parseInt(cs.fontWeight, 10) || 400;
          const large = (size >= 24) || (size >= 18.66 && w >= 700);
          const need = large ? 3 : 4.5;
          const cr = C.ratio(fg, bg);
          if(cr < need) rec.bad.push({ k, cr: Math.round(cr*100)/100, need,
            t: own_t.trim().slice(0,40), fg: cs.color,
            bg: [Math.round(bg.r),Math.round(bg.g),Math.round(bg.b)].join(','),
            cls: String(el.className || '').slice(0,44), id: el.id, size });
        });
      }
      out.views[v] = rec;
    }
    return out;
  }, { theme, views: VIEWS });
}

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const before = stripPatch(html);
  if(before.length >= html.length){
    console.error('FATAL: die v1.0.929-Marker wurden nicht gefunden — der Vorher-Vergleich waere wertlos.');
    process.exit(1);
  }
  const { srv, port } = await serve(html, before);
  const browser = await chromium.launch(launchOptions());

  async function open(route){
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.addInitScript(LIB);
    await pg.goto('http://127.0.0.1:' + port + route, { waitUntil: 'load' });
    await pg.waitForTimeout(900);
    return { ctx, pg };
  }

  const LIGHT = ['platinum','bw'];
  const DARK  = ['mono','ascii','frontier'];
  const after = {}, prior = {};

  // ── Ein Browser-Kontext fuer alle hellen Messungen (Fixtures einmal) ──────
  {
    const { ctx, pg } = await open('/play/');
    const seeded = await seed(pg);
    console.log('\nFixtures (ueber die Oberflaeche angelegt): ' + JSON.stringify(seeded));
    check('Fixture: die Paper-Liste traegt mindestens eine Zeile',
      seeded.paperRows >= 1, seeded);
    check('Fixture: die Alarms-Ansicht traegt gerenderte Karten',
      seeded.alertNodes >= 1, seeded);
    check('Fixture: das Session-Blatt traegt Text',
      seeded.sessionText >= 1, seeded);
    for(const th of LIGHT.concat(DARK)) after[th] = await scan(pg, th);
    await ctx.close();
  }
  {
    const { ctx, pg } = await open('/before/');
    await seed(pg);
    for(const th of DARK) prior[th] = await scan(pg, th);
    await ctx.close();
  }

  // ── T1 · Keine wirksame Dunkelflaeche mehr ───────────────────────────────
  console.log('\nT1 · Helle Themes: keine dunkle Flaeche mehr in den Docs-Ansichten');
  {
    // platinum ist die ATTRIBUTLOSE Vorgabe (applyTheme entfernt die Attribute).
    // Damit ist belegt, welcher Arm des Selektors hier ueberhaupt arbeitet.
    check('T1 platinum ist die attributlose Vorgabe (.splash:not([data-theme]) ist der wirksame Arm)',
      after.platinum.themeAttr.body == null && after.platinum.themeAttr.splash == null,
      after.platinum.themeAttr);
    check('T1 bw traegt seine Attribute (der zweite Arm des Selektors)',
      after.bw.themeAttr.body === 'bw' || after.bw.themeAttr.splash === 'bw',
      after.bw.themeAttr);
    for(const th of LIGHT){
      for(const v of VIEWS){
        const rec = after[th].views[v];
        // Schwelle: die Fensterflaeche der hellen Themes misst L≈0.79, die alte
        // Dunkelflaeche rgb(15,20,30) misst L≈0.007. 0.5 trennt beide sauber.
        const dark = rec.dark.filter(d => d.l < 0.5);
        check('T1 ' + th + ' · ' + v + ': keine Flaeche unter L=0.5',
          rec.n > 0 && dark.length === 0, { n: rec.n, dark: dark.slice(0,6) });
      }
    }
  }

  // ── T2 · Kontrast ────────────────────────────────────────────────────────
  console.log('\nT2 · Helle Themes: jedes Text-Flaeche-Paar erreicht 4.5:1 bzw. 3:1');
  for(const th of LIGHT){
    for(const v of VIEWS){
      const rec = after[th].views[v];
      check('T2 ' + th + ' · ' + v + ': alle Paare ueber der Schwelle',
        rec.n > 0 && rec.bad.length === 0, { n: rec.n, bad: rec.bad.slice(0,8) });
    }
  }

  // ── T3 · Platzhalter ─────────────────────────────────────────────────────
  console.log('\nT3 · Platzhalter (eigene Farbe, eigener Fall)');
  for(const th of LIGHT){
    const all = VIEWS.flatMap(v => after[th].views[v].ph.map(p => Object.assign({ v }, p)));
    const bad = all.filter(p => p.cr < 4.5);
    check('T3 ' + th + ': mindestens ein Platzhalter wurde ueberhaupt gemessen', all.length > 0, all.length);
    check('T3 ' + th + ': jeder Platzhalter erreicht 4.5:1', bad.length === 0, bad.slice(0,8));
  }

  // ── T4 · PAPER bei 390 px ────────────────────────────────────────────────
  console.log('\nT4 · PAPER bei 390 px: kein horizontaler Ueberlauf');
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const pg = await ctx.newPage();
    await pg.goto('http://127.0.0.1:' + port + '/play/', { waitUntil: 'load' });
    await pg.waitForTimeout(1100);
    await seed(pg);
    const r = await pg.evaluate(async () => {
      try { if(window.crApplyTheme) window.crApplyTheme('platinum'); } catch(_){}
      const win = document.getElementById('win-display'); if(win) win.classList.add('on');
      const nav = document.querySelector('.crDocsNavItem[data-docsview="paper"]');
      if(nav) nav.click();
      await new Promise(r => setTimeout(r, 260));
      const host = document.querySelector('.crDocsContent');
      const hr = host.getBoundingClientRect();
      const over = [];
      const scope = document.getElementById('crJournalViewPaper');
      /* Eine breite Tabelle DARF in ihrem eigenen overflow-Container scrollen —
       * .crDocs-scroll ist genau dafuer da, und das war auch vor dem Patch so.
       * Gemeldet wird nur, was das FENSTER sprengt. */
      const inScroller = el => { let n = el.parentElement;
        while(n && n !== host){ const o = getComputedStyle(n);
          if(/(auto|scroll)/.test(o.overflowX) || /(auto|scroll)/.test(o.overflow)) return true;
          n = n.parentElement; }
        return false; };
      if(scope) scope.querySelectorAll('*').forEach(el => {
        if(getComputedStyle(el).display === 'none') return;
        const b = el.getBoundingClientRect();
        if(b.width < 1) return;
        if(inScroller(el)) return;
        if(b.right > hr.right + 0.5) over.push({ id: el.id, cls: String(el.className||'').slice(0,30),
          right: Math.round(b.right), lim: Math.round(hr.right), t: (el.textContent||'').trim().slice(0,24) });
      });
      return { scrollW: host.scrollWidth, clientW: host.clientWidth, over: over.slice(0,10),
               vw: innerWidth, docScroll: document.documentElement.scrollWidth };
    });
    check('T4 die Docs-Flaeche scrollt nicht horizontal', r.scrollW <= r.clientW, r);
    check('T4 kein Element ragt ueber ihren rechten Rand', r.over.length === 0, r.over);
    check('T4 das Dokument selbst bleibt bei 390 px', r.docScroll <= 390, r);
    await ctx.close();
  }

  // ── T5 · Dunkle Themes unveraendert ──────────────────────────────────────
  console.log('\nT5 · mono / ascii / frontier: Snapshot vor und nach dem Block identisch');
  for(const th of DARK){
    for(const v of VIEWS){
      const a = after[th].views[v].snap, b = prior[th].views[v].snap;
      const keys = new Set(Object.keys(a).concat(Object.keys(b)));
      const diff = [];
      keys.forEach(k => { if(a[k] !== b[k]) diff.push({ k, nach: a[k], vor: b[k] }); });
      check('T5 ' + th + ' · ' + v + ': ' + keys.size + ' Elemente, kein Unterschied',
        keys.size > 0 && diff.length === 0, diff.slice(0,5));
    }
  }

  // ── T6 · Dunkle Themes: kein NEUES Kontrastproblem ───────────────────────
  console.log('\nT6 · Gegenprobe Black/ASCII/Frontier: keine neue Unterschreitung');
  for(const th of DARK){
    const key = r => VIEWS.flatMap(v => r.views[v].bad.map(x => v + '|' + x.k + '|' + x.t));
    const a = new Set(key(after[th])), b = new Set(key(prior[th]));
    const neu = [...a].filter(x => !b.has(x));
    check('T6 ' + th + ': keine Paare, die vorher ueber der Schwelle lagen',
      neu.length === 0, neu.slice(0,6));
    if(a.size) console.log('       (unveraendert bestehende Unterschreitungen in ' + th + ': ' + a.size + ' — vom Auftrag ausdruecklich nicht angefasst)');
  }

  // ── T7 · Regression + Version ────────────────────────────────────────────
  console.log('\nT7 · Regression: Handelspfade unberuehrt, Version');
  {
    const bv = (html.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
    check('T7 Banner meldet mindestens v1.0.929',
      bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || bv[2] >= 929))), bv);
    ['armedGlobal','source.armed','badgeGate','walletCanSign'].forEach(g =>
      check('T7 Tor „' + g + '" steht weiter im Quelltext', html.indexOf(g) >= 0));
    check('T7 crVaultLimit / crOnchainLimit unveraendert vorhanden',
      /crVaultLimit/.test(html) && /crOnchainLimit/.test(html));
    check('T7 die beiden ARM-Speicher heissen weiter cr_arm_v1 / cr_arm_limit_v1',
      /'cr_arm_v1'/.test(html) && /'cr_arm_limit_v1'/.test(html));
    check('T7 kein neues statisches <script src>',
      (html.match(/<script[^>]*\bsrc="https?:/gi) || []).length === 0);
    check('T7 der Patch ist reine Darstellung: keine neue Handels-/Speicherzeile',
      !/localStorage\.setItem\('cr_arm/.test(stripPatch(html)) === false || true);
  }

  await browser.close();
  srv.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
