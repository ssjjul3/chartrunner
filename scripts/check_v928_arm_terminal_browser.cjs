/* Smoke-Verifikation v1.0.928 — ARM · ECHTGELD: EINE FLAECHE, IM TERMINAL.
 *
 * v1.0.927 hatte ARM als schwebendes Chart-Widget eingefuehrt und Settings
 * sowie Control Center je eine Statuszeile gelassen — drei Flaechen fuer
 * dieselbe Sache, und das freie Widget lief am Telefon rechts aus dem Bild.
 * Diese Nummer legt ARM als regulaeren Terminal-Pane ganz oben ins Chart/Run-
 * Terminal und raeumt die beiden anderen Flaechen ab. KEINE Logikaenderung —
 * was dieser Test deshalb ausdruecklich MITPRUEFT, ist das Nicht-Geschehene:
 * dieselben zwei Speicher, dieselben Handler, kein zusaetzliches Tor.
 *
 * Jede Gegenprobe MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  A1  KNOTEN-IDENTITAET. Der Block im Terminal-Pane ist `===` derselbe
 *      DOM-Knoten wie der aus #crArmWidgetHome, und die vor dem Umzug auf ihn
 *      gelegte Markierung ueberlebt. Das ist die wichtigste Zeile: die
 *      Verdrahtung bindet beim Boot per getElementById; ein NACHGEBAUTES
 *      Markup verloere sie lautlos — der Schalter waere da und taete nichts.
 *      (Mutation: in _crArmPaneMount host.appendChild(blk.cloneNode(true))
 *       statt host.appendChild(blk) -> A1 rot.)
 *  A2  Schalter und Limit schreiben nach dem Umzug GENAU cr_arm_v1 und
 *      cr_arm_limit_v1 — der localStorage-Spion vergleicht die Menge der
 *      geschriebenen Schluessel — und der Bedienpfad ruft KEINE Handels-/
 *      Signier-Funktion.
 *      (Mutation: im Limit-Handler zusaetzlich
 *       localStorage.setItem('cr_arm_tok_v1',…) -> A2 rot.)
 *  A3  Terminal schliessen und wieder oeffnen: der Block haengt GENAU EINMAL,
 *      und die Handler wirken weiterhin (der Schalter schreibt danach immer
 *      noch cr_arm_v1). Geparkt wird in #crArmWidgetHome.
 *      (Mutation: in _crApplyTerminalSurfaceMode den Park-Zweig streichen
 *       -> A3 rot, der Block bliebe im Pane haengen.)
 *  A4  Settings, Control Center und die Chart-Widget-Auswahl tragen NICHTS
 *      mehr zu ARM: die IDs sind weg, der Widget-Typ 'arm' ist weg, der Pack
 *      armLive und sein Knopf sind weg.
 *      (Mutation: die Settings-Statuszeile wieder einsetzen -> A4 rot.)
 *  A5  Reihenfolge im Chart/Run-Terminal: ARM steht in seiner Spalte GANZ
 *      OBEN, also vor ON-CHAIN.
 *      (Mutation: den Pane hinter onchainWhales schieben -> A5 rot.)
 *  A6  Kein horizontaler Ueberlauf am Telefon (390×844), in ALLEN FUENF
 *      Themes. GEMESSEN WIRD GEOMETRIE, NICHT SCROLLBARKEIT, und das ist eine
 *      Korrektur an der ersten Fassung dieser Zeile: sie verglich
 *      scrollWidth/clientWidth und blieb bei einem 520px breiten Inhalt GRUEN,
 *      weil overflow-x:hidden ihn CLIPPT statt scrollen zu lassen — die Zeile
 *      haette den Fehler also nie gesehen, den sie behauptet zu pruefen.
 *      Verglichen werden jetzt Kanten: kein Element des Panels ragt ueber den
 *      rechten Pane-Rand oder aus dem Bild.
 *      (Mutation: in .crTerm-pane[data-pane-id="arm"] .crArmW den Deckel
 *       max-width:100% durch max-width:none;width:520px ersetzen -> A6 rot,
 *       alle drei Zeilen, in allen fuenf Themes.
 *       NICHT rot, und deshalb NICHT behauptet: .crArmW-host min-width:0
 *       zuruecknehmen — dieser Wert ist ein Schutz, nicht die Ursache; die
 *       Breite kommt strukturell vom .crTerm-pane.)
 *  A7  #crArmBadge bleibt das Zustandslicht: unsichtbar im SIM-Fall, sichtbar
 *      im scharfen — und ein Klick oeffnet das Chart/Run-Terminal mit dem
 *      ARM-Panel im Blick.
 *      (Mutation: den Klick-Handler entfernen -> A7 rot.)
 *  A8  Regression: Banner meldet mindestens v1.0.928; die vier Tore, der
 *      Spion, crVaultLimit/crOnchainLimit und die beiden Speicher stehen
 *      unveraendert im Quelltext, es gibt kein Scharf-Bit pro Token.
 *
 * Aufruf:  node scripts/check_v928_arm_terminal_browser.cjs
 *          (playwright liegt global: NODE_PATH=/opt/node22/lib/node_modules)
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

/* Jeder localStorage-Schreibzugriff wird mitgeschrieben. Der ARM-Pfad darf
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
  const ctx = await browser.newContext(opts.viewport ? { viewport: opts.viewport } : undefined);
  const pg = await ctx.newPage();
  await pg.addInitScript(LS_SPY);
  if(opts.seed) await pg.addInitScript(opts.seed);
  await pg.route('**/*', r => {
    const u = r.request().url();
    if(u.startsWith('http://127.0.0.1:' + port + '/play/')) return r.continue();
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await pg.goto('http://127.0.0.1:' + port + '/play/', { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(opts.settle == null ? 2200 : opts.settle);
  // Das Gast-Gate oeffnen: eine verbundene Wallet reicht fuer die SICHTBARKEIT
  // der Sektion (v1.0.905). Damit misst der Test die Bedienflaeche, nicht den
  // Hinweiskasten, der an ihrer Stelle steht.
  await pg.evaluate(() => { window.crWalletConnected = () => true; });
  return { ctx, pg };
}

/* Die eine Stelle, an der die Flaeche entschieden wird. Der Test benutzt
 * bewusst sie und nicht einen eigenen Nachbau — sonst pruefte er seinen
 * eigenen Aufruf statt des Produktionswegs. */
const OPEN_CHART_TERMINAL = () => {
  const win = document.getElementById('win-terminal');
  win.classList.add('on'); win.classList.add('cr-floating');
  _crApplyTerminalSurfaceMode(win, 'chart');
};
const CLOSE_CHART_TERMINAL = () => {
  const win = document.getElementById('win-terminal');
  _crApplyTerminalSurfaceMode(win, 'desktop');
  win.classList.remove('on'); win.classList.remove('cr-floating');
};

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const { srv, port } = await serve(FILE);
  const browser = await chromium.launch(launchOptions());

  // ── A1 · Knoten-Identitaet ──────────────────────────────────────────────
  console.log('\nA1 · Umhaengen, nicht neu bauen');
  {
    const { ctx, pg } = await newPage(browser, port);
    const r = await pg.evaluate((open) => {
      const before = document.getElementById('crArmWidgetBlock');
      before.__crMark = 'marker-928';
      const homeBefore = before.parentNode && before.parentNode.id;
      eval('(' + open + ')()');
      const after = document.getElementById('crArmWidgetBlock');
      const pane = after && after.closest && after.closest('.crTerm-pane[data-pane-id="arm"]');
      return {
        homeBefore,
        same: before === after,
        markSurvived: !!(after && after.__crMark === 'marker-928'),
        inPane: !!pane,
        inTerminal: !!(pane && pane.closest('#win-terminal')),
        copies: document.querySelectorAll('#crArmSwitch').length,
        hasSwitch: !!(after && after.querySelector('#crArmSwitch')),
        hasLimit:  !!(after && after.querySelector('#crArmLimitInput')),
        hasState:  !!(after && after.querySelector('#crCCArmState')),
        detailsHasGlobal: !!(after && after.querySelector('details #crArmGlobalToggle')),
        detailsHasTaps: !!(after && after.querySelector('details #crArmBuy') && after.querySelector('details #crArmSell')),
        gateHint: !!(after && after.querySelector('#crCCArmGateHint')),
      };
    }, OPEN_CHART_TERMINAL.toString());
    check('A1 der Block parkt vor dem Umzug in #crArmWidgetHome', r.homeBefore === 'crArmWidgetHome', r);
    check('A1 IDENTISCHER Knoten im Terminal-Pane (kein Klon, keine Kopie)',
      r.same && r.markSurvived && r.copies === 1, r);
    check('A1 der Pane sitzt im Terminalfenster', r.inPane && r.inTerminal, r);
    check('A1 EIN Schalter, EIN Limit-Feld, EINE Statuszeile',
      r.hasSwitch && r.hasLimit && r.hasState, r);
    check('A1 Nebenschalter + globales Bit liegen hinter dem Aufklapp',
      r.detailsHasGlobal && r.detailsHasTaps, r);
    check('A1 der Gast-Hinweis ist unveraendert mitgewandert', r.gateHint, r);

    // Die Statuszeile nennt den gecharteten Token.
    const line = await pg.evaluate(() => {
      const el = document.getElementById('crCCArmState');
      const sym = (typeof _crActiveTokenSym === 'function') ? _crActiveTokenSym() : '';
      const tag = document.getElementById('crArmPaneTag');
      return { txt: el ? el.textContent : '', sym, tag: tag ? tag.textContent : '' };
    });
    check('A1 Statuszeile nennt den gecharteten Token',
      !!line.sym && line.txt.indexOf(line.sym) >= 0, line);
    check('A1 die Datenmarke des Panes nennt denselben Token',
      !!line.sym && line.tag.indexOf(line.sym) >= 0, line);
    await ctx.close();
  }

  // ── A2 · Speicher und Spion ─────────────────────────────────────────────
  console.log('\nA2 · dieselben zwei Speicher, kein Handelsaufruf');
  {
    const { ctx, pg } = await newPage(browser, port);
    await pg.evaluate((open) => eval('(' + open + ')()'), OPEN_CHART_TERMINAL.toString());
    const store = await pg.evaluate(() => {
      window.__crLsWrites.length = 0;
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
    check('A2 Schalter setzt/loescht GENAU cr_arm_v1',
      store.flagOn === '1' && store.flagOff === null, store);
    check('A2 Limit-Feld schreibt cr_arm_limit_v1 float-frei (0,25 SOL = 250000000)',
      store.limRaw === '250000000', store);
    /* Nicht „wie viele Schluessel", sondern „gibt es ein NEUES Scharf-Bit".
     * cr_ingame_terminal_session_v1 / cr_notif_log_v1 fallen als Ereignis-
     * Tafeln ohnehin an und haengen an keinem Tor — sie werden benannt statt
     * stillschweigend geduldet. */
    const armKeys = store.keys.filter(k => /arm|scharf|live|token|mint/i.test(k));
    check('A2 GENAU die zwei bekannten ARM-Speicher, kein drittes Scharf-Bit',
      armKeys.length === 2 && armKeys.indexOf('cr_arm_v1') >= 0 && armKeys.indexOf('cr_arm_limit_v1') >= 0,
      { armKeys, all: store.keys });
    check('A2 ausser den beiden nur bekannte, nicht-tornahe Schluessel',
      store.keys.every(k => ['cr_arm_v1','cr_arm_limit_v1','cr_ingame_terminal_session_v1','cr_notif_log_v1'].indexOf(k) >= 0),
      store.keys);

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
    check('A2 Spion: der Bedienpfad ruft keine Handels-/Signier-Funktion', spy.length === 0, spy);
    await ctx.close();
  }

  // ── A3 · Schliessen und wieder oeffnen ──────────────────────────────────
  console.log('\nA3 · zu und wieder auf: genau einmal, Handler wirken weiter');
  {
    const { ctx, pg } = await newPage(browser, port);
    const r = await pg.evaluate(({ open, close }) => {
      const O = () => eval('(' + open + ')()');
      const C = () => eval('(' + close + ')()');
      const node0 = document.getElementById('crArmWidgetBlock');
      O();
      const inPane1 = !!document.querySelector('.crTerm-pane[data-pane-id="arm"] #crArmSwitch');
      C();
      const parkedId = (() => { const b = document.getElementById('crArmWidgetBlock'); return b && b.parentNode && b.parentNode.id; })();
      const inPaneAfterClose = !!document.querySelector('.crTerm-pane[data-pane-id="arm"] #crArmSwitch');
      O(); O();   // zweimal oeffnen: der Block darf danach GENAU EINMAL haengen
      const node1 = document.getElementById('crArmWidgetBlock');
      // Wirken die Handler noch? Der Schalter ist der Beweis, nicht die Optik.
      try { localStorage.removeItem('cr_arm_v1'); } catch(_){}
      const t = document.getElementById('crArmGlobalToggle');
      t.checked = true; t.dispatchEvent(new Event('change', { bubbles:true }));
      return {
        inPane1,
        parkedId,
        inPaneAfterClose,
        sameNode: node0 === node1,
        switches: document.querySelectorAll('#crArmSwitch').length,
        blocksInPane: document.querySelectorAll('.crTerm-pane[data-pane-id="arm"] #crArmWidgetBlock').length,
        hostChildren: (() => { const h = document.querySelector('.crTerm-pane[data-pane-id="arm"] [data-cr-arm-host]'); return h ? h.children.length : -1; })(),
        flag: (() => { try { return localStorage.getItem('cr_arm_v1'); } catch(_){ return 'ERR'; } })(),
      };
    }, { open: OPEN_CHART_TERMINAL.toString(), close: CLOSE_CHART_TERMINAL.toString() });
    check('A3 offen: der Block haengt im Pane', r.inPane1, r);
    check('A3 zu: der Block parkt wieder in #crArmWidgetHome',
      r.parkedId === 'crArmWidgetHome' && !r.inPaneAfterClose, r);
    check('A3 wieder auf: derselbe Knoten, GENAU EINMAL',
      r.sameNode && r.switches === 1 && r.blocksInPane === 1 && r.hostChildren === 1, r);
    check('A3 die Handler wirken nach dem Hin und Her weiter (cr_arm_v1 wird gesetzt)',
      r.flag === '1', r);
    await ctx.close();
  }

  // ── A4 · Die zwei anderen Flaechen sind weg ─────────────────────────────
  console.log('\nA4 · Settings, Control Center und Widget-Auswahl ohne ARM');
  {
    const { ctx, pg } = await newPage(browser, port);
    const dom = await pg.evaluate(() => {
      const gone = ['crArmHome','crSetArmStatus','crSetArmStatusTxt','crSetArmGoTerminal',
                    'crCCArmStatus','crCCArmStatusTxt','crCCArmGoSettings']
        .map(id => [id, document.querySelectorAll('#' + id).length]);
      const cc  = document.getElementById('crCCPop');
      const set = document.getElementById('win-settings');
      const armish = root => root ? [...root.querySelectorAll('*')]
        .filter(el => /crArm|crCCArm|crSetArm/.test(el.id || '') || /crCCArm|crArmW/.test(el.className && el.className.baseVal !== undefined ? '' : String(el.className || ''))).length : -1;
      return {
        gone,
        ccArm: armish(cc),
        setArm: armish(set),
        packBtn: document.querySelectorAll('[data-cr-term-pack="armLive"]').length,
        // Die Bedien-IDs gibt es weiterhin GENAU EINMAL — im verlagerten Block.
        once: ['crArmGlobalToggle','crArmLimitInput','crArmSwitch','crArmBox','crArmBuy',
               'crArmSell','crArmCfg','crCCArmSection','crCCArmGateHint','crCCArmState']
          .map(id => [id, document.querySelectorAll('#' + id).length]),
      };
    });
    check('A4 die sieben Settings-/CC-ARM-IDs gibt es NICHT mehr',
      dom.gone.every(([, n]) => n === 0), dom.gone.filter(([, n]) => n !== 0));
    check('A4 im Control Center steht kein ARM-Element mehr', dom.ccArm === 0, dom.ccArm);
    check('A4 in der Settings-App steht kein ARM-Element mehr', dom.setArm === 0, dom.setArm);
    check('A4 kein ⚡-ARM-Knopf in der Chart-Widget-Auswahl', dom.packBtn === 0, dom.packBtn);
    check('A4 jede ARM-Bedien-ID existiert weiterhin GENAU EINMAL',
      dom.once.every(([, n]) => n === 1), dom.once.filter(([, n]) => n !== 1));

    // Quelltext: der Widget-Typ und sein Pack sind wirklich raus, nicht nur
    // unsichtbar. Ein auskommentierter Rest waere die naechste Fassung, die
    // jemand aus Versehen wiederbelebt.
    check('A4 Quelltext: kein Pack armLive mehr', !/packId === 'armLive'/.test(html));
    check('A4 Quelltext: kein Widget-Typ \'arm\' mehr',
      !/w\.type === 'arm'/.test(html) && !/type === 'arm'\)? ?return \{ w:/.test(html));
    check('A4 Quelltext: kein _crArmWidgetMount/_crArmWidgetParkFrom mehr',
      !/_crArmWidgetMount|_crArmWidgetParkFrom|crArmOpenWidget/.test(html));
    /* Gesucht wird CODE, nicht das Wort: der Modulkopf NENNT die beiden
     * entfallenen Renderer, damit die naechste Session weiss, warum sie fehlen.
     * Ein Test auf den blossen Namen waere durch diese Erklaerung rot geworden
     * und haette dann dazu verfuehrt, die Erklaerung zu loeschen. */
    check('A4 Quelltext: die Statuszeilen-Renderer sind weder definiert noch gerufen',
      !/function _crArmRenderStatusRow|function _crCCRenderArmStatus|_crArmRenderStatusRow\(|_crCCRenderArmStatus\(/.test(html));
    await ctx.close();
  }

  // ── A5 · Reihenfolge ────────────────────────────────────────────────────
  console.log('\nA5 · ARM steht ganz oben, vor ON-CHAIN');
  {
    const { ctx, pg } = await newPage(browser, port);
    await pg.evaluate((open) => eval('(' + open + ')()'), OPEN_CHART_TERMINAL.toString());
    const ord = await pg.evaluate(() => {
      const pane = document.querySelector('#win-terminal .crTerm-pane[data-pane-id="arm"]');
      if(!pane) return { err:'kein ARM-Pane' };
      const col = pane.parentNode;
      const ids = [...col.children].filter(el => el.classList.contains('crTerm-pane'))
        .map(el => el.getAttribute('data-pane-id'));
      // Sichtbare Reihenfolge auf der Chart-Flaeche (desktop-only-Panes sind aus).
      const vis = [...col.children].filter(el => el.classList.contains('crTerm-pane') && el.offsetParent !== null)
        .map(el => el.getAttribute('data-pane-id'));
      return { ids, vis, first: ids[0], armIdx: ids.indexOf('arm'), onchainIdx: ids.indexOf('onchainWhales'),
               visFirst: vis[0], chartTag: pane.getAttribute('data-cr-chart-pane') };
    });
    check('A5 ARM ist der erste Pane seiner Spalte', ord.first === 'arm', ord);
    check('A5 ARM steht vor ON-CHAIN', ord.armIdx >= 0 && ord.armIdx < ord.onchainIdx, ord);
    check('A5 ARM ist auf der Chart-Flaeche sichtbar und der erste sichtbare Pane',
      ord.chartTag === '1' && ord.visFirst === 'arm', ord);

    // Desktop-Flaeche: dort hat die Echtgeld-Bedienung nichts zu suchen.
    const onDesktop = await pg.evaluate((close) => {
      eval('(' + close + ')()');
      const pane = document.querySelector('#win-terminal .crTerm-pane[data-pane-id="arm"]');
      return { visible: !!(pane && pane.offsetParent !== null),
               blockParked: (document.getElementById('crArmWidgetBlock').parentNode || {}).id };
    }, CLOSE_CHART_TERMINAL.toString());
    check('A5 auf der Desktop-Flaeche ist der ARM-Pane unsichtbar und der Block geparkt',
      onDesktop.visible === false && onDesktop.blockParked === 'crArmWidgetHome', onDesktop);
    await ctx.close();
  }

  // ── A6 · Kein horizontaler Ueberlauf am Telefon, in allen fuenf Themes ──
  console.log('\nA6 · Telefon 390×844: nichts laeuft aus dem Bild');
  {
    const { ctx, pg } = await newPage(browser, port, { viewport: { width: 390, height: 844 } });
    await pg.evaluate((open) => eval('(' + open + ')()'), OPEN_CHART_TERMINAL.toString());
    for(const th of ['platinum','ascii','frontier','bw','mono']){
      const m = await pg.evaluate(async (th) => {
        try { if(window.crApplyTheme) window.crApplyTheme(th); } catch(_){}
        await new Promise(r => setTimeout(r, 90));
        const pane = document.querySelector('#win-terminal .crTerm-pane[data-pane-id="arm"]');
        const win  = document.getElementById('win-terminal');
        const lim  = document.getElementById('crArmLimitInput');
        const sw   = document.getElementById('crArmSwitch');
        const blk  = document.getElementById('crArmWidgetBlock');
        const pr = pane.getBoundingClientRect(), lr = lim.getBoundingClientRect(), sr = sw.getBoundingClientRect();
        // Der rechte Rand des INHALTSKASTENS des Panes (ohne Rahmen/Polster).
        const cs = getComputedStyle(pane);
        const innerRight = pr.right - parseFloat(cs.paddingRight || 0) - parseFloat(cs.borderRightWidth || 0);
        let maxRight = 0, worst = '';
        blk.querySelectorAll('*').forEach(el => {
          if(!el.getClientRects().length) return;
          const r = el.getBoundingClientRect();
          if(r.right > maxRight){ maxRight = r.right; worst = el.id || el.className || el.tagName; }
        });
        return {
          blockOver: Math.round(blk.scrollWidth - pane.clientWidth),
          maxRight: Math.round(maxRight), worst, innerRight: Math.round(innerRight),
          paneRight: Math.round(pr.right), limRight: Math.round(lr.right), swLeft: Math.round(sr.left),
          vw: window.innerWidth, paneW: Math.round(pr.width),
        };
      }, th);
      check('A6 ' + th + ': der Pane ist ueberhaupt gemessen worden (Breite > 0)', m.paneW > 100, m);
      check('A6 ' + th + ': kein Element des Panels ragt ueber den rechten Pane-Rand',
        m.maxRight <= m.innerRight + 1, m);
      check('A6 ' + th + ': der Block ist nicht breiter als sein Kasten', m.blockOver <= 1, m);
      check('A6 ' + th + ': Limit-Feld und Schalter liegen vollstaendig im Bild',
        m.limRight <= m.vw && m.limRight <= m.paneRight + 1 && m.swLeft >= 0, m);
    }
    await ctx.close();
  }

  // ── A7 · Das Badge: Zustandslicht und Weg ins Terminal ──────────────────
  console.log('\nA7 · #crArmBadge zeigt den Zustand und oeffnet das Terminal');
  {
    const { ctx, pg } = await newPage(browser, port);
    const st = await pg.evaluate(() => {
      const b = document.getElementById('crArmBadge');
      const simHidden = getComputedStyle(b).display === 'none';
      // scharf schalten heisst ZWEI Bits (cr_arm_v1 UND der Modus) — genau die
      // Rechnung, die _crArmPaint anstellt. Der Test faelscht sie nicht nach,
      // er setzt beide Bits und laesst die Datei rechnen.
      try { localStorage.setItem('cr_arm_v1', '1'); } catch(_){}
      let armed = false;
      try { if(window.crArm && crArm.set){ crArm.set(true); armed = crArm.on(); } } catch(_){}
      try { if(typeof _crArmPaint === 'function') _crArmPaint(); } catch(_){}
      const liveShown = getComputedStyle(b).display !== 'none';
      return { simHidden, armed, liveShown, role: b.getAttribute('role') };
    });
    check('A7 SIM: das Badge ist unsichtbar', st.simHidden, st);
    check('A7 scharf: das Badge ist sichtbar', !st.armed || st.liveShown, st);
    check('A7 das Badge ist als Schaltflaeche ausgewiesen (role=button)', st.role === 'button', st);

    const opened = await pg.evaluate(async () => {
      document.getElementById('crArmBadge').click();
      await new Promise(r => setTimeout(r, 250));
      const win = document.getElementById('win-terminal');
      const pane = document.querySelector('#win-terminal .crTerm-pane[data-pane-id="arm"]');
      return {
        surface: win && win.getAttribute('data-cr-terminal-surface'),
        on: !!(win && win.classList.contains('on')),
        blockInPane: !!(pane && pane.querySelector('#crArmWidgetBlock')),
      };
    });
    check('A7 ein Klick oeffnet das Chart/Run-Terminal',
      opened.on && opened.surface === 'chart', opened);
    check('A7 und das ARM-Panel haengt darin', opened.blockInPane, opened);
    await ctx.close();
  }

  // ── A8 · Regression ─────────────────────────────────────────────────────
  console.log('\nA8 · Regression: Handelspfade unberuehrt, Version');
  {
    const bv = (html.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
    check('A8 Banner meldet mindestens v1.0.928',
      bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || bv[2] >= 928))), bv);
    ['armedGlobal','source.armed','badgeGate','walletCanSign'].forEach(g => {
      check('A8 Tor „' + g + '" steht weiter im Quelltext', html.indexOf(g) >= 0);
    });
    check('A8 crVaultLimit unveraendert vorhanden', /crVaultLimit/.test(html));
    check('A8 crOnchainLimit unveraendert vorhanden', /crOnchainLimit/.test(html));
    check('A8 die beiden ARM-Speicher heissen weiter cr_arm_v1 / cr_arm_limit_v1',
      /cr_arm_v1/.test(html) && /cr_arm_limit_v1/.test(html));
    check('A8 KEIN Scharf-Bit pro Token eingefuehrt', !/cr_arm_tok|cr_arm_[a-z]*_mint|cr_arm_per_token/.test(html));
    check('A8 kein neues statisches <script src>', (html.match(/<script[^>]+\bsrc=/g) || []).length === 0);
  }

  await browser.close();
  srv.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})();
