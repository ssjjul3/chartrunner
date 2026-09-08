/* Smoke-Verifikation v1.0.927 — IN-GAME-UI-PASS.
 *
 * Sieben Oberflaechen-Aenderungen, KEINE Handelslogik. Was dieser Test deshalb
 * ausdruecklich MITPRUEFT, ist das Nicht-Geschehene: dass der ARM-Umzug die
 * beiden Speicher (cr_arm_v1 / cr_arm_limit_v1) unveraendert liest und schreibt
 * und kein zusaetzliches Tor eingezogen hat.
 *
 * Jede Gegenprobe MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Frischer Browser OHNE cr_os_theme -> mono, und zwar OHNE Platinum-Blitz.
 *      Gemessen wird die BOOT-REIHENFOLGE, nicht der Endzustand: ein
 *      MutationObserver ab document-start haelt den ALLERERSTEN Wert fest, den
 *      #splash[data-theme] und body[data-os-theme] je getragen haben.
 *      (Mutation: data-theme="mono" aus dem #splash-Markup entfernen und nur
 *       _crThemeFallback() auf mono lassen -> T1 rot, obwohl der Endzustand
 *       stimmt. Genau der Fall, den ein Endzustands-Test durchgehen liesse.)
 *  T2  Gespeichertes Theme ueberlebt: 'bw' bleibt 'bw', 'platinum' bleibt die
 *      attributlose Vorgabe.
 *      (Mutation: im Persistenz-Block den else-Zweig entfernen -> T2 rot.)
 *  T3  ARM-Widget. (a) Die Bedien-IDs gibt es GENAU EINMAL im Dokument.
 *      (b) Control Center und Settings tragen KEINEN Schalter und KEIN
 *      Limit-Feld mehr, nur je eine Statuszeile. (c) Das Widget haengt den
 *      IDENTISCHEN Knoten um, es klont nicht — sonst waeren die Boot-Bindungen
 *      still weg. (d) Schalter und Feld schreiben cr_arm_v1 / cr_arm_limit_v1
 *      und sonst NICHTS: der localStorage-Spion vergleicht die Menge der
 *      geschriebenen Schluessel. (e) Kein neues Tor: crWeiche.flagOn /
 *      limitLamports / sessionLamports werden mit denselben Argumenten
 *      aufgerufen wie zuvor, und der Widget-Pfad ruft keine Handels-Funktion.
 *      (Mutation a: das ARM-Markup zusaetzlich in Settings stehen lassen -> T3a rot.
 *       Mutation c: in _crArmWidgetMount cloneNode(true) statt appendChild -> T3c rot.
 *       Mutation d: im Limit-Handler zusaetzlich localStorage.setItem('cr_arm_tok_v1',…)
 *       -> T3d rot.)
 *  T4  Tab-Leiste: kein Minigame-Knopf, Reihenfolge Regular · Rooms · Campaign ·
 *      PVP, die drei Minigame-Karten stehen weiter im DOM und tauchen unter
 *      KEINEM Tab auf, und ?mg=snake erreicht weiterhin crLaunchMinigameRandom.
 *      (Mutation: den Minigame-Knopf wieder einsetzen -> T4 rot.)
 *  T5  Logo-Kette mit Fixtures fuer TIA · BONK · WIF · JTO · OP. Jede Stufe
 *      wird EINZELN belegt, damit „es kommt ein Bild" nicht aus Versehen immer
 *      aus derselben Quelle stammt; JTO bekommt bewusst NICHTS und muss den
 *      Platzhalter zeigen (nie eine leere Flaeche). Eine tote URL faellt per
 *      onerror auf denselben Platzhalter.
 *      (Mutation: _tokLogoUrl auf `return def.cgImg||null` zuruecksetzen
 *       -> TIA/OP/BONK rot. Mutation: im else-Zweig von _tokFillLogoEl
 *       el.textContent='' statt des Platzhalters -> JTO rot.)
 *  T6  Intel steht vor den Einstellungen in BEIDEN Anordnungen: Desktop-Grid
 *      (CSS order) UND App-Dock (DOM-Reihenfolge in #osGrid, die
 *      _crBuildAppDock liest).
 *      (Mutation: nur die CSS-order tauschen, insertBefore zuruecknehmen
 *       -> T6-Dock rot. Genau der halbe Tausch, den v1.0.895 schon einmal
 *       gekostet hat.)
 *  T7  Docs: die fuenf Ansichten (Alarms · Paper · P&L · Journal · Sessions)
 *      tragen dieselben Struktur-Klassen, und in JEDEM der fuenf Themes messen
 *      ihre Karten/Listen dieselbe Geometrie (Rand, Radius, Grund).
 *      (Mutation: in .crDocs-scroll den border-radius auf 6px setzen
 *       -> T7 rot, weil .crDocs-card bei 10px bleibt.)
 *  T8  Regression: Banner meldet mindestens v1.0.927; die vier Tore, der Spion
 *      und der Market-/Limit-Pfad stehen unveraendert im Quelltext.
 *
 * Aufruf:  node scripts/check_v927_ingame_ui_browser.cjs
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
function serve(file){
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = (req.url || '').split('?')[0];
      if(p === '/play/'){
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(file));
        return;
      }
      res.writeHead(404); res.end('');
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/* Der ALLERERSTE Wert, den die beiden Theme-Attribute je getragen haben.
 * Laeuft vor jedem Skript der Seite. Ein spaeter nachgeschobenes Attribut
 * kaeme hier als zweiter Eintrag an — der Blitz waere also sichtbar. */
const THEME_BOOT_SPY = `
window.__crThemeBoot = { splash: [], body: [] };
(function(){
  function note(){
    try {
      var sp = document.getElementById('splash');
      if(sp){
        var v = sp.getAttribute('data-theme');
        var arr = window.__crThemeBoot.splash;
        if(!arr.length || arr[arr.length-1] !== v) arr.push(v);
      }
      if(document.body){
        var b = document.body.getAttribute('data-os-theme');
        var ba = window.__crThemeBoot.body;
        if(!ba.length || ba[ba.length-1] !== b) ba.push(b);
      }
    } catch(_){}
  }
  // Beobachtet wird document selbst: zum Zeitpunkt dieses Skripts gibt es
  // documentElement noch nicht, und ein Observer auf null waere still tot —
  // der Test saehe dann einen leeren Verlauf und haette nichts gemessen.
  new MutationObserver(note).observe(document,
    { childList:true, subtree:true, attributes:true, attributeFilter:['data-theme','data-os-theme'] });
  note();
  document.addEventListener('DOMContentLoaded', note);
})();`;

/* Jeder localStorage-Schreibzugriff wird mitgeschrieben. Der Widget-Pfad darf
 * GENAU zwei Schluessel anfassen; ein dritter waere ein neues Bit, und ein
 * neues Bit ist eine Logikaenderung. */
const LS_SPY = `
window.__crLsWrites = [];
(function(){
  var proto = Storage.prototype;
  var set = proto.setItem, rem = proto.removeItem;
  proto.setItem = function(k, v){ try { window.__crLsWrites.push(['set', String(k)]); } catch(_){} return set.apply(this, arguments); };
  proto.removeItem = function(k){ try { window.__crLsWrites.push(['rm', String(k)]); } catch(_){} return rem.apply(this, arguments); };
})();`;

async function newPage(browser, port, opts){
  opts = opts || {};
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.addInitScript(THEME_BOOT_SPY);
  await pg.addInitScript(LS_SPY);
  if(opts.seed) await pg.addInitScript(opts.seed);
  // Alles ausser der Datei selbst wird abgefangen: der Test misst UI, nicht Netz.
  await pg.route('**/*', r => {
    const u = r.request().url();
    if(u.startsWith('http://127.0.0.1:' + port + '/play/')) return r.continue();
    if(/\/__dead__\//.test(u)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await pg.goto('http://127.0.0.1:' + port + '/play/' + (opts.query || ''), { waitUntil: opts.waitUntil || 'domcontentloaded' });
  if(opts.afterLoad) await pg.evaluate(opts.afterLoad);
  await pg.waitForTimeout(opts.settle == null ? 2200 : opts.settle);
  return { ctx, pg };
}

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const { srv, port } = await serve(FILE);
  const browser = await chromium.launch(launchOptions());

  // ── T1 · Vorgabe-Theme mono, ohne Blitz ─────────────────────────────────
  console.log('\nT1 · Vorgabe-Theme Black (mono), Boot-Reihenfolge');
  {
    const { ctx, pg } = await newPage(browser, port);
    const boot = await pg.evaluate(() => window.__crThemeBoot);
    const now = await pg.evaluate(() => ({
      splash: document.getElementById('splash') && document.getElementById('splash').getAttribute('data-theme'),
      body: document.body.getAttribute('data-os-theme'),
      stored: (() => { try { return localStorage.getItem('cr_os_theme'); } catch(_){ return 'ERR'; } })(),
    }));
    check('kein gespeichertes Theme', now.stored === null, now.stored);
    check('Endzustand: splash+body auf mono', now.splash === 'mono' && now.body === 'mono', now);
    check('ERSTER je gesehener splash-Wert ist mono (kein Platinum-Blitz)',
      boot.splash.length > 0 && boot.splash[0] === 'mono', boot.splash);
    check('ERSTER je gesehener body-Wert ist mono (kein Platinum-Blitz)',
      boot.body.length > 0 && boot.body[0] === 'mono', boot.body);
    check('splash hat NIE einen anderen Wert getragen',
      boot.splash.every(v => v === 'mono'), boot.splash);
    await ctx.close();
  }

  // ── T2 · gespeichertes Theme ueberlebt ──────────────────────────────────
  console.log('\nT2 · gespeichertes Theme bleibt');
  for(const [stored, wantSplash, wantBody] of [['bw','bw','bw'], ['platinum', null, null], ['ascii','ascii','ascii']]){
    const { ctx, pg } = await newPage(browser, port, {
      seed: "try{localStorage.setItem('cr_os_theme'," + JSON.stringify(stored) + ");}catch(_){}",
    });
    const got = await pg.evaluate(() => ({
      splash: document.getElementById('splash').getAttribute('data-theme'),
      body: document.body.getAttribute('data-os-theme'),
    }));
    check('gespeichert ' + stored + ' -> splash ' + String(wantSplash), got.splash === wantSplash, got);
    check('gespeichert ' + stored + ' -> body ' + String(wantBody), got.body === wantBody, got);
    await ctx.close();
  }

  // ── T3 · ARM-Widget ─────────────────────────────────────────────────────
  console.log('\nT3 · ARM · Echtgeld als Chart-Widget');
  {
    const { ctx, pg } = await newPage(browser, port);
    // Das Gast-Gate oeffnen: eine verbundene Wallet reicht fuer die SICHTBARKEIT.
    await pg.evaluate(() => { window.crWalletConnected = () => true; });

    const ids = await pg.evaluate(() => ['crArmGlobalToggle','crArmLimitInput','crArmSwitch','crArmBox',
      'crArmBuy','crArmSell','crArmCfg','crCCArmSection','crCCArmGateHint','crCCArmState']
      .map(id => [id, document.querySelectorAll('#' + id).length]));
    check('T3a jede ARM-Bedien-ID existiert GENAU EINMAL',
      ids.every(([, n]) => n === 1), ids.filter(([, n]) => n !== 1));

    const surfaces = await pg.evaluate(() => {
      const cc  = document.getElementById('crCCPop');
      const set = document.getElementById('crArmHome');
      const q = (root, sel) => root ? root.querySelectorAll(sel).length : -1;
      return {
        ccInputs:  q(cc, 'input, select, .cr-armSwitch'),
        ccStatus:  q(cc, '#crCCArmStatus'),
        setInputs: q(set, 'input, select, .cr-armSwitch'),
        setStatus: q(set, '#crSetArmStatus'),
        ccGoLabel: (document.getElementById('crCCArmGoSettings') || {}).textContent,
      };
    });
    check('T3b Settings: eine ARM-Statuszeile, KEIN Schalter, KEIN Limit-Feld',
      surfaces.setStatus === 1 && surfaces.setInputs === 0, surfaces);
    check('T3b Control Center: ARM-Statuszeile vorhanden und verweist aufs Terminal',
      surfaces.ccStatus === 1 && /Terminal/.test(String(surfaces.ccGoLabel || '')), surfaces);

    // Knotenidentitaet: derselbe Knoten wandert, er wird nicht geklont.
    const mounted = await pg.evaluate(() => {
      const before = document.getElementById('crArmWidgetBlock');
      before.__crMark = 'marker-927';
      window.crArmOpenWidget();
      const after = document.getElementById('crArmWidgetBlock');
      return {
        same: before === after,
        markSurvived: after && after.__crMark === 'marker-927',
        inWidget: !!(after && after.closest && after.closest('#crChartWidgetLayer .cr-widget')),
        copies: document.querySelectorAll('#crArmSwitch').length,
        title: (() => { const w = after && after.closest('.cr-widget'); const n = w && w.querySelector('.wTitle .nm'); return n ? n.textContent : ''; })(),
        hasSwitch: !!(after && after.querySelector('#crArmSwitch')),
        hasLimit:  !!(after && after.querySelector('#crArmLimitInput')),
        hasState:  !!(after && after.querySelector('#crCCArmState')),
        detailsHasGlobal: !!(after && after.querySelector('details #crArmGlobalToggle')),
        detailsHasTaps:   !!(after && after.querySelector('details #crArmBuy') && after.querySelector('details #crArmSell')),
      };
    });
    check('T3c Widget haengt den IDENTISCHEN Knoten um (kein Klon)',
      mounted.same && mounted.markSurvived && mounted.copies === 1, mounted);
    check('T3c Block sitzt in einem Widget der Chart-Ebene', mounted.inWidget, mounted);
    check('T3c Widget-Titel nennt ARM und den Token', /^ARM · Echtgeld · \S+/.test(mounted.title), mounted.title);
    check('T3c EIN Schalter, EIN Limit-Feld, EINE Statuszeile im Widget',
      mounted.hasSwitch && mounted.hasLimit && mounted.hasState, mounted);
    check('T3c Nebenschalter + globales Bit liegen eine Ebene tiefer (Aufklapp)',
      mounted.detailsHasGlobal && mounted.detailsHasTaps, mounted);

    // Die Statuszeile nennt den gecharteten Token.
    const line = await pg.evaluate(() => {
      const el = document.getElementById('crCCArmState');
      const sym = (typeof _crActiveTokenSym === 'function') ? _crActiveTokenSym() : '';
      return { txt: el ? el.textContent : '', sym };
    });
    check('T3c Statuszeile nennt den gecharteten Token',
      !!line.sym && line.txt.indexOf(line.sym) >= 0, line);

    // Speicher: genau zwei Schluessel, und zwar die bekannten.
    const store = await pg.evaluate(() => {
      window.__crLsWrites.length = 0;
      window.__crLsT0 = Date.now();
      const t = document.getElementById('crArmGlobalToggle');
      t.checked = true; t.dispatchEvent(new Event('change', { bubbles:true }));
      const flagOn = (() => { try { return localStorage.getItem('cr_arm_v1'); } catch(_){ return 'ERR'; } })();
      const lim = document.getElementById('crArmLimitInput');
      lim.value = '0,25'; lim.dispatchEvent(new Event('change', { bubbles:true }));
      const limRaw = (() => { try { return localStorage.getItem('cr_arm_limit_v1'); } catch(_){ return 'ERR'; } })();
      t.checked = false; t.dispatchEvent(new Event('change', { bubbles:true }));
      const flagOff = (() => { try { return localStorage.getItem('cr_arm_v1'); } catch(_){ return 'ERR'; } })();
      const keys = Array.from(new Set(window.__crLsWrites.map(w => w[1]))).sort();
      return { flagOn, limRaw, flagOff, keys };
    });
    check('T3d Schalter setzt/loescht GENAU cr_arm_v1',
      store.flagOn === '1' && store.flagOff === null, store);
    check('T3d Limit-Feld schreibt cr_arm_limit_v1 float-frei (0,25 SOL = 250000000)',
      store.limRaw === '250000000', store);
    /* Der interessante Teil ist nicht „wie viele Schluessel", sondern „gibt es
     * ein NEUES Scharf-Bit". Mitgeschrieben werden alle Schreibzugriffe im
     * Fenster; gefiltert wird auf alles, was nach Scharfschaltung aussieht.
     * (cr_ingame_terminal_session_v1 faellt hier ebenfalls an — das ist die
     * Ereignis-Tafel des In-Game-Terminals, die JEDE Meldung mitschreibt, und
     * sie existierte vor dieser Nummer genauso. Sie ist kein Bit, an dem ein
     * Tor haengt, und wird deshalb benannt statt stillschweigend geduldet.) */
    const armKeys = store.keys.filter(k => /arm|scharf|live|token|mint/i.test(k));
    check('T3d GENAU die zwei bekannten ARM-Speicher, kein drittes Scharf-Bit',
      armKeys.length === 2 && armKeys.indexOf('cr_arm_v1') >= 0 && armKeys.indexOf('cr_arm_limit_v1') >= 0,
      { armKeys, all: store.keys });
    check('T3d ausser den beiden nur bekannte, nicht-tornahe Schluessel',
      store.keys.every(k => ['cr_arm_v1','cr_arm_limit_v1','cr_ingame_terminal_session_v1','cr_notif_log_v1'].indexOf(k) >= 0),
      store.keys);

    // Spion: der Widget-Pfad ruft KEINE Handels-Funktion.
    const spy = await pg.evaluate(() => {
      const calls = [];
      const wrap = (obj, name, tag) => {
        if(!obj || typeof obj[name] !== 'function') return;
        const o = obj[name];
        obj[name] = function(){ calls.push(tag + '.' + name); return o.apply(this, arguments); };
      };
      ['quote','swap','send','sign','signAndSend'].forEach(n => wrap(window.crTxApi, n, 'crTxApi'));
      ['fire','execute','trade','market','limit'].forEach(n => wrap(window.crWeiche, n, 'crWeiche'));
      ['placeOrder','market','limit'].forEach(n => wrap(window.ChartRunnerSDK, n, 'sdk'));
      const t = document.getElementById('crArmGlobalToggle');
      t.checked = true; t.dispatchEvent(new Event('change', { bubbles:true }));
      const lim = document.getElementById('crArmLimitInput');
      lim.value = '0,1'; lim.dispatchEvent(new Event('change', { bubbles:true }));
      document.getElementById('crArmSwitch').click();
      t.checked = false; t.dispatchEvent(new Event('change', { bubbles:true }));
      return calls;
    });
    check('T3e Spion: der Widget-Pfad ruft keine Handels-/Signier-Funktion', spy.length === 0, spy);
    await ctx.close();
  }

  // ── T4 · Tab-Leiste ─────────────────────────────────────────────────────
  console.log('\nT4 · Tab-Leiste: Minigame archiviert, Rooms vor Campaign');
  {
    const { ctx, pg } = await newPage(browser, port);
    const tabs = await pg.evaluate(() => ({
      cats: [...document.querySelectorAll('#crModeTabs button')].map(b => b.getAttribute('data-cat')),
      cards: [...document.querySelectorAll('#crModeGrid [data-cat="minigame"]')].map(c => c.id || c.getAttribute('data-mode')),
      modes: [...document.querySelectorAll('#crModeGrid [data-cat="minigame"]')].map(c => c.getAttribute('data-mode')),
    }));
    check('T4 kein Minigame-Knopf mehr', tabs.cats.indexOf('minigame') < 0, tabs.cats);
    check('T4 Reihenfolge Regular · Rooms · Campaign · PVP',
      JSON.stringify(tabs.cats) === JSON.stringify(['regular','rooms','campaign','pvp']), tabs.cats);
    check('T4 die Minigame-Karten stehen weiter im DOM (archiviert, nicht geloescht)',
      tabs.cards.length === 3, tabs.cards);
    check('T4 ihre data-mode-Ziele sind unveraendert',
      ['racing','monster','snake'].every(m => tabs.modes.indexOf(m) >= 0), tabs.modes);

    /* Unter KEINEM Tab darf eine Minigame-Karte sichtbar werden — und JEDER Tab
     * muss etwas zeigen.
     *
     * GEKLICKT WIRD MIT ECHTEN KOORDINATEN, und das ist kein Detail: ein
     * synthetisches element.click() traegt clientX/clientY = 0. Sobald der
     * Regular-Tab das Configure-Run einbettet (#win-configs bekommt .on),
     * ist wireConfigControlHitboxes (v1.0.202-local) dokumentweit scharf —
     * ein Capture-Handler, der einen Klick auf die naechstgelegene
     * Config-Schaltflaeche UMLENKT und stopPropagation() ruft. Bei (0,0)
     * schluckt er jeden Folgeklick, und die Messung haette einen Fehler
     * gesehen, den ein echter Finger nie ausloest. Geklickt wird deshalb auf
     * die Elementmitte, mit genau den clientX/clientY, die dieser Handler
     * liest — derselbe Weg wie Julians Daumen. */
    const perTab = await pg.evaluate(() => {
      // Das Play-Fenster oeffnen, so wie ein Spieler es tut — ohne sichtbares
      // Fenster hat die Tab-Leiste kein Rechteck und damit keine Mitte.
      try { if(typeof osOpenWindowMulti === 'function') osOpenWindowMulti('run'); } catch(_){}
      const tap = (el) => {
        const r = el.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(type => {
          const Ctor = /pointer/.test(type) ? (window.PointerEvent || MouseEvent) : MouseEvent;
          el.dispatchEvent(new Ctor(type, { bubbles:true, cancelable:true, view:window, clientX:x, clientY:y, button:0 }));
        });
      };
      const cats = [...document.querySelectorAll('#crModeTabs button')].map(b => b.getAttribute('data-cat'));
      const out = {};
      cats.forEach(cat => {
        tap(document.querySelector('#crModeTabs button[data-cat="regular"]'));
        tap(document.querySelector('#crModeTabs button[data-cat="' + cat + '"]'));
        const vis = sel => [...document.querySelectorAll('#crModeGrid ' + sel)]
          .filter(x => !x.classList.contains('modeCatHidden')).length;
        const on = document.querySelector('#crModeTabs button.on');
        out[cat] = {
          on: on ? on.getAttribute('data-cat') : null,
          minigameVisible: vis('[data-cat="minigame"]'),
          ownVisible: vis('[data-cat="' + cat + '"]'),
          cfgEmbedded: !!document.querySelector('#crRegularCfgHost.on'),
        };
      });
      return out;
    });
    check('T4 jeder Tab wird beim Antippen wirklich aktiv',
      Object.entries(perTab).every(([cat, v]) => v.on === cat), perTab);
    check('T4 keine Minigame-Karte taucht unter einem anderen Tab auf',
      Object.values(perTab).every(v => v.minigameVisible === 0), perTab);
    check('T4 kein Filter laeuft ins Leere: jeder Tab zeigt eigene Karten oder das eingebettete Configure Run',
      Object.entries(perTab).every(([cat, v]) => v.ownVisible > 0 || (cat === 'regular' && v.cfgEmbedded)), perTab);
    await ctx.close();
  }
  {
    /* Deep-Link ?mg=snake erreicht weiterhin den Startpfad. Der Spion kann NICHT
     * per addInitScript gesetzt werden: crLaunchMinigameRandom ist eine
     * Funktionsdeklaration auf oberster Skript-Ebene und ueberschreibt jede
     * vorher gesetzte Eigenschaft desselben Namens. Er wird deshalb im Fenster
     * zwischen `load` und dem 1200-ms-Timer der Deep-Link-IIFE gesetzt — der
     * Aufruf im Startpfad ist ein blosser Bezeichner und loest ueber genau
     * dieselbe globale Eigenschaft auf. */
    const { ctx, pg } = await newPage(browser, port, {
      query: '?mg=snake',
      waitUntil: 'load',
      afterLoad: "window.__crMg=[];window.crLaunchMinigameRandom=function(m){window.__crMg.push(m);};",
      settle: 4500,
    });
    const got = await pg.evaluate(() => window.__crMg || []);
    check('T4 ?mg=snake erreicht crLaunchMinigameRandom("snake")', got.indexOf('snake') >= 0, got);
    await ctx.close();
  }

  // ── T5 · Logo-Kette ─────────────────────────────────────────────────────
  console.log('\nT5 · Logo-Kette (TIA · BONK · WIF · JTO · OP)');
  {
    const { ctx, pg } = await newPage(browser, port, {
      // Stufe 3: die CoinGecko-Marktliste traegt TIA und OP — Nicht-Solana-Token,
      // fuer die es bei Birdeye NIE ein Logo geben kann.
      seed: "try{localStorage.setItem('cr_cg_markets_v3', JSON.stringify({ts:Date.now(),rows:[" +
            "{sym:'TIA',img:'https://cg.test/tia.png'},{sym:'OP',img:'https://cg.test/op.png'}]}));}catch(_){}",
    });
    const res = await pg.evaluate(() => {
      // Stufe 1: Birdeye legt sein logoURI am Live-Eintrag ab (pro Zeitrahmen).
      try { _tokLiveCache['bonk|15m'] = { t:Date.now(), px:1, logoURI:'https://birdeye.test/bonk.png' }; } catch(_){}
      // Stufe 4: die verifizierte Liste des Workers, ueber crMarkets.
      try { window.crMarkets._logo['jup-mkt-none'] = ''; } catch(_){}
      const mk = (def) => {
        const el = document.createElement('div');
        el.style.cssText = 'width:34px;height:34px;background:#ffffff;color:#0c1115;overflow:hidden';
        document.body.appendChild(el);
        window._tokFillLogoEl(el, def);
        const img = el.querySelector('img');
        const cs = getComputedStyle(el);
        return {
          tag: def.tag,
          src: img ? img.getAttribute('src') : null,
          text: el.textContent,
          bg: cs.backgroundColor,
          marker: el.getAttribute('data-cr-logo'),
          empty: !img && !el.textContent.trim(),
        };
      };
      return {
        tia:  mk({ id:'tia',  tag:'TIA'  }),
        bonk: mk({ id:'bonk', tag:'BONK' }),
        wif:  mk({ id:'wif',  tag:'WIF', cgImg:'https://cg.test/wif.png' }),
        jto:  mk({ id:'jto',  tag:'JTO'  }),
        op:   mk({ id:'op',   tag:'OP'   }),
      };
    });
    check('T5 BONK: Stufe 1 (Birdeye logoURI) wird WIRKLICH gelesen',
      res.bonk.src === 'https://birdeye.test/bonk.png', res.bonk);
    check('T5 WIF: Stufe 2 (def.cgImg)', res.wif.src === 'https://cg.test/wif.png', res.wif);
    check('T5 TIA: Stufe 3 (cr_cg_markets_v3) — kein Solana-Mint, trotzdem ein Bild',
      res.tia.src === 'https://cg.test/tia.png', res.tia);
    check('T5 OP: Stufe 3 (cr_cg_markets_v3)', res.op.src === 'https://cg.test/op.png', res.op);
    check('T5 JTO: keine Quelle -> Platzhalter mit Buchstabe, NIE eine leere Flaeche',
      !res.jto.empty && res.jto.text === 'J' && res.jto.marker === 'ph:JTO', res.jto);
    check('T5 Platzhalter-Farbe kommt aus dem Symbol (nicht weiss, nicht transparent)',
      /^rgba?\(/.test(res.jto.bg) && res.jto.bg !== 'rgba(0, 0, 0, 0)' && res.jto.bg !== 'rgb(255, 255, 255)', res.jto.bg);
    check('T5 alle fuenf Token liefern Bild ODER Platzhalter, keiner eine leere Flaeche',
      ['tia','bonk','wif','jto','op'].every(k => !res[k].empty), res);

    // Tote URL -> Platzhalter.
    const dead = await pg.evaluate(async () => {
      const el = document.createElement('div');
      el.style.cssText = 'width:34px;height:34px;background:#ffffff;overflow:hidden';
      document.body.appendChild(el);
      window._tokFillLogoEl(el, { id:'dead', tag:'DED', cgImg: location.origin + '/__dead__/nope.png' });
      await new Promise(r => setTimeout(r, 900));
      return { text: el.textContent, img: !!el.querySelector('img'), marker: el.getAttribute('data-cr-logo') };
    });
    check('T5 tote URL faellt per onerror auf den Platzhalter (kein kaputtes <img>)',
      !dead.img && dead.text === 'D' && dead.marker === 'ph:DED', dead);
    await ctx.close();
  }

  // ── T6 · Intel vor Einstellungen, in BEIDEN Anordnungen ─────────────────
  console.log('\nT6 · Intel und Einstellungen tauschen die Plaetze');
  {
    const { ctx, pg } = await newPage(browser, port, { settle: 3200 });
    const ord = await pg.evaluate(() => {
      const grid = document.getElementById('osGrid');
      const intel = document.getElementById('osIconWalletIntel');
      const set = grid && grid.querySelector('.os-icon[data-prog="settings"]');
      if(!intel || !set) return { missing: { intel: !!intel, set: !!set } };
      const dom = [...grid.querySelectorAll('.os-icon')];
      return {
        cssIntel: Number(getComputedStyle(intel).order),
        cssSet:   Number(getComputedStyle(set).order),
        domIntel: dom.indexOf(intel),
        domSet:   dom.indexOf(set),
      };
    });
    check('T6 Desktop-Grid (CSS order): Intel vor Einstellungen',
      ord.cssIntel < ord.cssSet, ord);
    check('T6 App-Dock (DOM-Reihenfolge in #osGrid, die _crBuildAppDock liest): Intel vor Einstellungen',
      ord.domIntel >= 0 && ord.domIntel < ord.domSet, ord);
    await ctx.close();
  }

  // ── T7 · Docs: fuenf Ansichten, eine Geometrie, in jedem Theme ──────────
  console.log('\nT7 · Docs-Ansichten teilen Struktur und Geometrie');
  {
    const { ctx, pg } = await newPage(browser, port);
    const VIEWS = ['alerts','paper','pnl','journal','sessions'];
    const heads = await pg.evaluate((views) => {
      const out = {};
      const win = document.getElementById('win-display');
      if(win) win.classList.add('on');
      views.forEach(v => {
        const nav = document.querySelector('.crDocsNavItem[data-docsview="' + v + '"]');
        if(nav) nav.click();
        const panel = document.querySelector('.crDocsView:not(.hidden)');
        const scope = (v === 'paper')   ? document.getElementById('crJournalViewPaper')
                    : (v === 'pnl')     ? document.getElementById('crJournalViewPnl')
                    : (v === 'journal') ? document.getElementById('crJournalViewManual')
                    : panel;
        out[v] = {
          panel: panel ? panel.id : null,
          heads: scope ? scope.querySelectorAll('.crDocs-head').length : -1,
          boxes: scope ? scope.querySelectorAll('.crDocs-card, .crDocs-scroll').length : -1,
        };
      });
      return out;
    }, VIEWS);
    VIEWS.forEach(v => {
      check('T7 ' + v + ': gemeinsamer Kopfbereich (.crDocs-head)', heads[v].heads >= 1, heads[v]);
      check('T7 ' + v + ': gemeinsame Karten-/Listen-Klasse', heads[v].boxes >= 1, heads[v]);
    });

    /* Geometrie pro Theme. Verglichen wird INNERHALB einer Rolle ueber die
     * Ansichten hinweg — also: messen alle .crDocs-head derselben fuenf
     * Ansichten dasselbe, alle .crDocs-card dasselbe, alle .crDocs-scroll
     * dasselbe. Das ist die Aussage des Auftrags („pro Theme darf es anders
     * aussehen, aber innerhalb eines Themes muessen die fuenf Ansichten gleich
     * aussehen"), und nur so ist sie falsifizierbar: Karte und Scrollliste
     * unterscheiden sich absichtlich im Innenabstand, ein Vergleich ueber
     * beide Rollen hinweg haette also entweder immer gemeckert oder — wie die
     * erste Fassung dieser Zeile — nur das gemessen, was eine !important-
     * Themenregel ohnehin gleichschaltet. Genau das ist bei der Gegenprobe
     * aufgefallen: die Zeile blieb GRUEN, obwohl der Radius einer Rolle
     * veraendert war, weil die Themenregel ihn ueberschreibt. Gemessen wird
     * deshalb ein breiterer Satz Eigenschaften, darunter die NICHT
     * ueberschriebenen Abstaende. */
    const THEMES = ['platinum','ascii','frontier','bw','mono'];
    const ROLES = ['crDocs-head','crDocs-cardHead','crDocs-card','crDocs-scroll','crDocs-secTitle'];
    /* Bei randlosen, grundlosen Rollen (Kopfzeilen, Abschnittstitel) wird die
     * geerbte Textfarbe NICHT verglichen: sie haengt daran, in welcher Tafel
     * das Element sitzt, ist dort aber unsichtbar — die sichtbare Farbe setzt
     * .crDocs-headTitle selbst. Verglichen wird, was man sieht: Kasten-Geometrie. */
    const COLORLESS = new Set(['crDocs-head','crDocs-cardHead','crDocs-secTitle']);
    for(const th of THEMES){
      const geo = await pg.evaluate(async ({ th, views, roles, colorless }) => {
        try { if(window.crApplyTheme) window.crApplyTheme(th); } catch(_){}
        await new Promise(r => setTimeout(r, 80));
        const out = {};
        roles.forEach(r => { out[r] = {}; });
        views.forEach(v => {
          const nav = document.querySelector('.crDocsNavItem[data-docsview="' + v + '"]');
          if(nav) nav.click();
          const scope = (v === 'paper')   ? document.getElementById('crJournalViewPaper')
                      : (v === 'pnl')     ? document.getElementById('crJournalViewPnl')
                      : (v === 'journal') ? document.getElementById('crJournalViewManual')
                      : document.querySelector('.crDocsView:not(.hidden)');
          if(!scope) return;
          roles.forEach(role => {
            scope.querySelectorAll('.' + role).forEach(el => {
              const cs = getComputedStyle(el);
              const box = [cs.borderTopWidth, cs.borderTopStyle, cs.borderTopLeftRadius,
                           cs.paddingTop, cs.paddingLeft, cs.paddingBottom,
                           cs.marginTop, cs.marginBottom, cs.display];
              const k = (colorless.indexOf(role) >= 0 ? box : box.concat([cs.backgroundColor, cs.borderTopColor])).join('|');
              (out[role][k] = out[role][k] || []).push(v);
            });
          });
        });
        return out;
      }, { th, views: VIEWS, roles: ROLES, colorless: [...COLORLESS] });
      ROLES.forEach(role => {
        const variants = Object.keys(geo[role] || {});
        const n = Object.values(geo[role] || {}).reduce((a, b) => a + b.length, 0);
        check('T7 Theme ' + th + ' · .' + role + ': in allen Ansichten dieselbe Geometrie',
          n > 0 && variants.length === 1, { n, variants: variants.length, byVariant: geo[role] });
      });
    }
    await ctx.close();
  }

  // ── T8 · Regression + Version ───────────────────────────────────────────
  console.log('\nT8 · Regression: Handelspfade unberuehrt, Version');
  {
    const bv = (html.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
    check('T8 Banner meldet mindestens v1.0.927',
      bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || bv[2] >= 927))), bv);

    // Die vier Tore stehen unveraendert im Quelltext.
    const GATES = ['armedGlobal', 'source.armed', 'badgeGate', 'walletCanSign'];
    GATES.forEach(g => check('T8 Tor „' + g + '" steht weiter im Quelltext', html.indexOf(g) >= 0));
    check('T8 crVaultLimit unveraendert vorhanden', /crVaultLimit/.test(html));
    check('T8 crOnchainLimit unveraendert vorhanden', /crOnchainLimit/.test(html));
    check('T8 die beiden ARM-Speicher heissen weiter cr_arm_v1 / cr_arm_limit_v1',
      /'cr_arm_v1'/.test(html) && /'cr_arm_limit_v1'/.test(html));
    check('T8 KEIN Scharf-Bit pro Token eingefuehrt',
      !/cr_arm_[a-z_]*tok[a-z_]*_v\d/.test(html) && !/armedForToken/.test(html));
    check('T8 kein neues statisches <script src>',
      (html.match(/<script[^>]*\bsrc="https?:/gi) || []).length === 0);
  }

  await browser.close();
  srv.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
