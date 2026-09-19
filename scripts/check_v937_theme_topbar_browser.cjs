/* Smoke-Verifikation v1.0.937 — „THEME" AUS DER TOPBAR ENTFERNT.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, und an zwei Staenden
 * gleichzeitig: die heutige Datei UND der gemergte Stand v1.0.936, aus
 * `git show origin/main:ChartRunner_Prototype.html` in eine Nachbardatei
 * geschrieben. Ein grep auf „crBarTheme ist weg" bewiese nur, dass ein
 * Name fehlt. Die Zusagen dieses Patches sind aber Aussagen ueber die
 * OBERFLAECHE — „keine Luecke", „kein anderer Eintrag aendert sich", „die
 * Theme-Logik laeuft weiter" —, und die lassen sich nur als Differenz
 * zweier gerenderter Leisten messen.
 *
 * WAS GEPRUEFT WIRD:
 *
 *  T1  Der Eintrag ist WEG — im Lauf, auf dem Desktop, in jedem Theme; und
 *      im Quelltext existiert kein lebender Verweis mehr auf ihn.
 *  T2  KEINE LUECKE: der Abstand zwischen „Home" und dem naechsten
 *      sichtbaren Element ist derselbe, den zwei beliebige andere
 *      Nachbarn der Leiste haben — gemessen an Kanten, nicht an einer
 *      CSS-Regel. Und kein verwaister Trenner: der .cr-bar-sep steht da,
 *      wo er stand, naemlich zwischen Menues und Aktionsknoepfen.
 *  T3  KEIN ANDERER EINTRAG AENDERT SICH, bewiesen statt behauptet: gegen
 *      v1.0.936 verglichen, muss die Differenz der Leiste GENAU aus dem
 *      fehlenden Theme-Eintrag und dem Nachruecken der Geschwister
 *      bestehen — gleiche Reihenfolge, gleiche Groesse, gleiche
 *      berechneten Eigenschaften, gleiche y-Lage.
 *  T4  DIE THEME-LOGIK IST VOLLSTAENDIG: crApplyTheme/crCycleTheme sind da
 *      und wirken, applyTheme setzt beide Attribute, cr_os_theme wird
 *      geschrieben, und ein NEULADEN bringt das Theme zurueck.
 *  T5  DAS TOR AUS B1: die Chips des Control Centers sind ZEICHENGLEICH
 *      die Themeliste der Live-Flaeche — es gibt also nichts, was nur der
 *      entfernte Ringschalter erreicht haette.
 *  T6  DIE BENANNTE FOLGE, als Messung statt als Prosa: das Control Center
 *      ist auf dem DESKTOP bedienbar und IM LAUF nicht. Diese Zeile darf
 *      rot werden, wenn jemand das aendert — dann stimmt der PR-Text nicht
 *      mehr.
 *  T7  Regression: Versionsbanner >= v1.0.937, 7 Skriptbloecke, kein
 *      statisches <script src>, keine harten Seitenfehler, und die
 *      Settings-Chips (.crSetThemeChip) stehen unveraendert da.
 *
 * ── GEGENPROBE (CLAUDE.md · ROT/CRASH/GRUEN) ───────────────────────────────
 *
 * 10 Mutationen, jede EINZELN in ChartRunner_Prototype.html eingebaut, Suite
 * gelaufen, danach wiederhergestellt. Ergebnis: 10x ROT, 0 GRUEN, 0 CRASH.
 * Der unveraenderte Quelltext ist gruen (45/0/0) — die Messung faellt also
 * nicht von allein, und keine Mutation hat die Suite bloss zum Absturz
 * gebracht (ein CRASH haette geheissen: die Zeile prueft etwas anderes).
 *
 * Gelaufen ist das in einer ISOLIERTEN KOPIE des Arbeitsbaums (das Repo
 * bleibt sauber; ein Abbruch mitten in einer Mutation kann sonst eine
 * kaputte Zeile im Baum zuruecklassen — genau das ist in dieser Session
 * einmal passiert und fiel nur durch eine Integritaetspruefung vor dem
 * Commit auf). Der Vergleichsstand kommt per GIT_DIR aus dem echten
 * Objektspeicher, lesend.
 *
 *  M1  der Eintrag kehrt in die Leiste zurueck            12 rot  T1a/T1c/T1d
 *  M2  er wird zur Laufzeit wieder eingehaengt
 *      (die alte Wiederbelebungszeile)                    12 rot  T1a/T1c/T1d
 *  M3  crApplyTheme wird nicht mehr exportiert             1 rot  T4a
 *  M4  crCycleTheme wird nicht mehr exportiert             1 rot  T4b
 *  M5  applyTheme setzt das splash-Attribut nicht mehr     7 rot  T4c/T4d/T4e
 *  M6  der Observer schreibt cr_os_theme nicht mehr        3 rot  T4h/T4i/T4j
 *  M7  das gespeicherte Theme wird beim Laden nicht
 *      angewandt                                           1 rot  T4i
 *  M8  ein Chip faellt aus dem Control Center              7 rot  T4f/T4g/T4h
 *  M9  ein LOCH statt Entfernen: der Eintrag wird nur
 *      unsichtbar gemacht                                 14 rot  T1a/T1c/T1d
 *  M10 das Control Center ist IM LAUF bedienbar           3 rot  T3b/T6a/T6b
 *
 * M9 und M10 sind die beiden, auf die es ankommt. M9 ist der naheliegende
 * Pfusch (display/visibility statt Entfernen) — er faellt durch, weil T1
 * am DOM misst, nicht am Bild. M10 mutiert nicht den Patch, sondern die
 * BEHAUPTUNG des PR-Textes ueber die Folge: macht man das Control Center
 * im Lauf bedienbar, wird T6b rot. Die Zeile im PR ist damit an eine
 * Messung gebunden und nicht an meine Beschreibung.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const FILE = 'ChartRunner_Prototype.html';
const THEMES = ['platinum', 'mono', 'bw', 'ascii', 'frontier'];
let pass = 0, fail = 0, skipped = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; const d = x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 700);
         console.log('  FAIL ' + n + d); }
}
function untested(n, why){ skipped++; console.log('  ??   ' + n + ' :: UNGETESTET — ' + why); }
function launchOptions(){
  const o = { headless: true };
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const cands = [process.env.CR_CHROME_PATH].filter(Boolean);
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ o.executablePath = c; break; }
  return o;
}

/* Liest die Leiste #crOSBar so aus, wie sie GERENDERT ist. Kennt keine
 * Sollwerte — nur Kanten, Reihenfolge und berechnete Eigenschaften. */
const BAR_PROBE = `(() => {
  const bar = document.getElementById('crOSBar');
  if(!bar) return { missing: true };
  const vis = el => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .01 && b.width > 0 && b.height > 0; };
  const PROPS = ['display','fontSize','fontWeight','color','padding','margin','lineHeight','letterSpacing'];
  const kids = Array.from(bar.children).map(el => {
    const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
    const css = {}; PROPS.forEach(p => css[p] = cs[p]);
    return { id: el.id || '', cls: String(el.className || ''),
             txt: (el.textContent || '').trim().replace(/\\s+/g,' ').slice(0, 20),
             visible: vis(el),
             w: +b.width.toFixed(2), h: +b.height.toFixed(2),
             l: +b.left.toFixed(2), r: +b.right.toFixed(2), t: +b.top.toFixed(2),
             css };
  });
  return { missing: false, barRect: (() => { const b = bar.getBoundingClientRect();
             return { w:+b.width.toFixed(2), h:+b.height.toFixed(2), t:+b.top.toFixed(2) }; })(),
           kids };
})()`;

async function boot(browser, url, opts){
  opts = opts || {};
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 390, height: 844 },
    hasTouch: opts.hasTouch !== false,
    isMobile: false,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 160)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(opts.settle || 3000);
  page._crErrs = errs;
  return page;
}
const fileUrl = p => 'file://' + path.resolve(p);

(async () => {
  const root = path.resolve(__dirname, '..');
  const selfPath = path.join(root, FILE);
  const src = fs.readFileSync(selfPath, 'utf8');

  /* Der Vergleichsstand: v1.0.936, wie er in main liegt. Er wird NEBEN die
   * Datei geschrieben, damit relative Pfade (Fonts, Assets) identisch
   * aufloesen — in /tmp saehe die Leiste womoeglich anders aus, und der
   * Vergleich haette gemessen, wo die Datei liegt, nicht was sie tut. */
  let refPath = null;
  try {
    const ref = execFileSync('git', ['show', 'origin/main:' + FILE], { cwd: root, maxBuffer: 1 << 30 });
    refPath = path.join(root, '.cr_v936_ref.html');
    fs.writeFileSync(refPath, ref);
  } catch(e){ refPath = null; }

  const browser = await chromium.launch(launchOptions());
  const LIVE = '?crLiveGame=1';

  // ── T1 · der Eintrag ist weg ────────────────────────────────────────────
  console.log('\nT1 · der Eintrag ist weg');
  {
    const page = await boot(browser, fileUrl(selfPath) + LIVE);
    const onDesktop = await page.evaluate(() => !!document.getElementById('crBarTheme'));
    check('T1a Desktop: kein #crBarTheme im DOM', onDesktop === false, { onDesktop });

    // in den Lauf und dort erneut sehen
    await page.evaluate(() => { try { hideSplash(); } catch(_){} });
    await page.waitForTimeout(1200);
    const inRun = await page.evaluate(() => ({
      el: !!document.getElementById('crBarTheme'),
      barVisible: (() => { const b = document.getElementById('crOSBar');
        if(!b) return false; const r = b.getBoundingClientRect();
        return getComputedStyle(b).display !== 'none' && r.width > 0; })(),
      themeText: Array.from(document.querySelectorAll('#crOSBar .menu'))
        .filter(e => getComputedStyle(e).display !== 'none')
        .map(e => (e.textContent || '').trim()),
    }));
    check('T1b im Lauf ist die Leiste ueberhaupt sichtbar (sonst misst T1c nichts)',
      inRun.barVisible === true, inRun);
    check('T1c im Lauf: kein #crBarTheme im DOM', inRun.el === false, inRun);
    check('T1d im Lauf: kein sichtbarer Eintrag heisst "Theme"',
      !inRun.themeText.some(t => /^theme$/i.test(t)), inRun.themeText);

    // in jedem Theme — eine Theme-Regel koennte ihn theoretisch wieder einblenden
    for(const th of THEMES){
      const r = await page.evaluate(t => {
        const sp = document.getElementById('splash');
        if(sp){ if(t === 'platinum') sp.removeAttribute('data-theme'); else sp.setAttribute('data-theme', t); }
        return !!document.getElementById('crBarTheme');
      }, th);
      check('T1e ' + th + ': kein #crBarTheme', r === false, { th, r });
    }
    await page.context().close();
  }
  {
    // Quelltext: kein LEBENDER Verweis mehr. Kommentare duerfen ihn nennen.
    const stripped = src
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const hits = (stripped.match(/crBarTheme/g) || []).length;
    check('T1f kein lebender Verweis auf crBarTheme im Quelltext (nur Kommentare)',
      hits === 0, { hits });
    const raw = (src.match(/crBarTheme/g) || []).length;
    check('T1g die Messung hat wirklich etwas abgezogen (Kommentare nennen ihn)',
      raw > 0, { raw, hits });
  }

  // ── T2 · keine Luecke, kein verwaister Trenner ──────────────────────────
  console.log('\nT2 · keine Luecke, kein verwaister Trenner');
  {
    const page = await boot(browser, fileUrl(selfPath) + LIVE);
    await page.evaluate(() => { try { hideSplash(); } catch(_){} });
    await page.waitForTimeout(1200);
    const bar = await page.evaluate(BAR_PROBE);
    const vis = bar.kids.filter(k => k.visible);
    const gaps = [];
    for(let i = 0; i + 1 < vis.length; i++) gaps.push(+(vis[i+1].l - vis[i].r).toFixed(2));

    const iHome = vis.findIndex(k => k.id === 'crBarFile');
    check('T2a "Home" ist sichtbar (sonst misst T2b nichts)', iHome >= 0, vis.map(k => k.id));
    const gapAfterHome = iHome >= 0 && iHome + 1 < vis.length ? gaps[iHome] : null;
    // Referenz: der haeufigste Abstand der Leiste. Eine Luecke waere ein
    // Ausreisser nach oben, kein „anderer, aber ueblicher" Wert.
    const tally = {}; gaps.forEach(g => tally[g] = (tally[g] || 0) + 1);
    const typical = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    check('T2b der Abstand hinter "Home" ist der uebliche der Leiste, keine Luecke',
      gapAfterHome !== null && Math.abs(gapAfterHome - parseFloat(typical)) <= 1.5,
      { gapAfterHome, typical, gaps, ids: vis.map(k => k.id || k.cls) });
    check('T2c kein Abstand der Leiste ist ein Loch (<= ueblicher + 12 px)',
      gaps.every(g => g <= parseFloat(typical) + 12), { gaps, typical });

    const sep = bar.kids.find(k => /cr-bar-sep/.test(k.cls));
    check('T2d der Trenner steht noch da', !!sep && sep.visible, sep);
    if(sep){
      const idxSep = bar.kids.indexOf(sep);
      const before = bar.kids.slice(0, idxSep).filter(k => k.visible);
      const after  = bar.kids.slice(idxSep + 1).filter(k => k.visible);
      check('T2e der Trenner trennt weiterhin Menues von Aktionsknoepfen (auf beiden Seiten steht etwas)',
        before.length > 0 && after.length > 0,
        { before: before.map(k => k.id), after: after.map(k => k.id) });
      check('T2f kein verwaister Trenner: er steht nicht am Rand der sichtbaren Leiste',
        before.length > 0 && after.length > 0);
    }
    await page.context().close();
  }

  // ── T3 · kein anderer Eintrag aendert sich (gegen v1.0.936) ─────────────
  console.log('\nT3 · gegen v1.0.936: genau EIN Unterschied');
  if(!refPath){
    untested('T3a Vergleich gegen v1.0.936', 'origin/main:' + FILE + ' nicht lesbar (kein git-Objekt)');
  } else {
    const a = await boot(browser, fileUrl(selfPath) + LIVE);
    const b = await boot(browser, fileUrl(refPath) + LIVE);
    for(const p of [a, b]){ await p.evaluate(() => { try { hideSplash(); } catch(_){} }); }
    await a.waitForTimeout(1200); await b.waitForTimeout(1200);
    const now = await a.evaluate(BAR_PROBE);
    const was = await b.evaluate(BAR_PROBE);

    const wasHadTheme = was.kids.some(k => k.id === 'crBarTheme' && k.visible);
    check('T3a der Vergleichsstand TRAEGT den Eintrag noch (sonst misst der Vergleich nichts)',
      wasHadTheme === true, { ids: was.kids.filter(k => k.visible).map(k => k.id) });

    const nowIds = now.kids.filter(k => k.visible).map(k => k.id || k.cls);
    const wasIds = was.kids.filter(k => k.visible).map(k => k.id || k.cls);
    check('T3b die Reihenfolge der uebrigen Eintraege ist unveraendert',
      JSON.stringify(nowIds) === JSON.stringify(wasIds.filter(i => i !== 'crBarTheme')),
      { nowIds, wasIds });

    // Jedes ueberlebende Element: gleiche Groesse, gleiche y-Lage, gleiche
    // berechneten Eigenschaften. Nur die x-Lage darf sich aendern (Nachruecken).
    const byId = {}; was.kids.forEach(k => { if(k.id) byId[k.id] = k; });
    const diffs = [];
    now.kids.forEach(k => {
      const o = k.id ? byId[k.id] : null;
      if(!o) return;
      if(k.visible !== o.visible) diffs.push([k.id, 'visible', o.visible, k.visible]);
      if(Math.abs(k.w - o.w) > 0.51) diffs.push([k.id, 'w', o.w, k.w]);
      if(Math.abs(k.h - o.h) > 0.51) diffs.push([k.id, 'h', o.h, k.h]);
      if(Math.abs(k.t - o.t) > 0.51) diffs.push([k.id, 't', o.t, k.t]);
      Object.keys(k.css).forEach(p => { if(k.css[p] !== o.css[p]) diffs.push([k.id, p, o.css[p], k.css[p]]); });
    });
    check('T3c kein ueberlebender Eintrag hat Groesse, Hoehenlage oder Stil geaendert',
      diffs.length === 0, diffs.slice(0, 12));
    check('T3d der Vergleich hat wirklich gemessen (Abzug nicht leer)',
      now.kids.length > 3 && was.kids.length > 3, { now: now.kids.length, was: was.kids.length });
    check('T3e die Leiste selbst ist gleich hoch geblieben',
      Math.abs(now.barRect.h - was.barRect.h) <= 0.51, { now: now.barRect, was: was.barRect });

    // Die Geschwister ruecken wirklich NACH (sonst bliebe ein Loch).
    const nowVis = now.kids.filter(k => k.visible);
    const wasVis = was.kids.filter(k => k.visible);
    const wasTheme = wasVis.find(k => k.id === 'crBarTheme');
    const idxWas = wasVis.indexOf(wasTheme);
    const nextId = idxWas >= 0 && idxWas + 1 < wasVis.length ? wasVis[idxWas + 1].id || wasVis[idxWas + 1].cls : null;
    const nowNext = nowVis.find(k => (k.id || k.cls) === nextId);
    const wasNext = wasVis.find(k => (k.id || k.cls) === nextId);
    check('T3f das Element hinter dem entfernten Eintrag ist wirklich nachgerueckt',
      !!nowNext && !!wasNext && nowNext.l < wasNext.l - 1,
      { nextId, now: nowNext && nowNext.l, was: wasNext && wasNext.l });

    await a.context().close(); await b.context().close();
  }

  // ── T4 · die Theme-Logik ist vollstaendig erhalten ──────────────────────
  console.log('\nT4 · die Theme-Logik laeuft unveraendert weiter');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(fileUrl(selfPath) + LIVE, { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const api = await page.evaluate(() => ({
      apply: typeof window.crApplyTheme,
      cycle: typeof window.crCycleTheme,
      list:  typeof window.crThemeAvailableThemes === 'function' ? window.crThemeAvailableThemes() : null,
    }));
    check('T4a window.crApplyTheme ist da', api.apply === 'function', api);
    check('T4b window.crCycleTheme ist da (haengt nicht am entfernten Knopf)', api.cycle === 'function', api);

    await page.evaluate(() => window.crApplyTheme('bw'));
    await page.waitForTimeout(250);   /* body[data-os-theme] und cr_os_theme
       schreibt ein MutationObserver auf #splash[data-theme] — also NACH dem
       Setzen des Attributs. Synchron danach zu lesen maesse die Reihenfolge
       dieses Tests, nicht das Verhalten der Seite. */
    const applied = await page.evaluate(() => (
      { splash: document.getElementById('splash').getAttribute('data-theme'),
        body: document.body.getAttribute('data-os-theme') }));
    check('T4c crApplyTheme setzt #splash[data-theme]', applied.splash === 'bw', applied);
    check('T4d crApplyTheme setzt body[data-os-theme]', applied.body === 'bw', applied);

    const cycled = await page.evaluate(() => {
      const before = document.getElementById('splash').getAttribute('data-theme');
      const ret = window.crCycleTheme();
      return { before, ret, after: document.getElementById('splash').getAttribute('data-theme') };
    });
    check('T4e crCycleTheme schaltet wirklich weiter', cycled.after !== cycled.before, cycled);

    // Der Weg, der ab jetzt der einzige ist: das Control Center.
    const viaCC = await page.evaluate(() => {
      window.crApplyTheme('mono');
      const btn = document.getElementById('crMenuCC'); if(!btn) return { err: 'no crMenuCC' };
      btn.click();
      const chip = document.querySelector('.crCCThemeChip[data-theme-pick="bw"]');
      if(!chip) return { err: 'no bw chip' };
      const r = chip.getBoundingClientRect();
      if(!(r.width > 0 && r.height > 0)) return { err: 'chip hat kein Rechteck' };
      chip.click();
      return { box: [r.width, r.height] };
    });
    await page.waitForTimeout(250);   /* wie oben: der Observer schreibt nach. */
    if(!viaCC.err) Object.assign(viaCC, await page.evaluate(() => (
      { splash: document.getElementById('splash').getAttribute('data-theme'),
        body: document.body.getAttribute('data-os-theme'),
        ls: localStorage.getItem('cr_os_theme') })));
    check('T4f der Control-Center-Chip ist wirklich anklickbar', !viaCC.err, viaCC);
    check('T4g ein Chip-Klick setzt das Theme', viaCC.splash === 'bw' && viaCC.body === 'bw', viaCC);
    check('T4h ... und schreibt cr_os_theme', viaCC.ls === 'bw', viaCC);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => ({
      splash: document.getElementById('splash').getAttribute('data-theme'),
      body: document.body.getAttribute('data-os-theme'),
      ls: localStorage.getItem('cr_os_theme'),
    }));
    check('T4i NEULADEN: das gewaehlte Theme ist noch da', after.splash === 'bw' && after.body === 'bw', after);
    check('T4j ... und der Speicher auch', after.ls === 'bw', after);
    await ctx.close();
  }

  // ── T5 · das Tor aus B1 ─────────────────────────────────────────────────
  console.log('\nT5 · das Control Center bietet die Einstellung VOLLSTAENDIG an');
  {
    const page = await boot(browser, fileUrl(selfPath) + LIVE);
    const r = await page.evaluate(() => ({
      live: !!(window.cr && window.cr.isLiveGameSurface),
      list: window.crThemeAvailableThemes ? window.crThemeAvailableThemes().slice().sort() : null,
      chips: Array.from(document.querySelectorAll('.crCCThemeChip'))
        .filter(c => getComputedStyle(c).display !== 'none')
        .map(c => c.dataset.themePick).sort(),
    }));
    check('T5a die Messung laeuft wirklich auf der LIVE-Flaeche', r.live === true, r);
    check('T5b die Chips des Control Centers sind ZEICHENGLEICH die Themeliste der Live-Flaeche',
      JSON.stringify(r.list) === JSON.stringify(r.chips), r);
    check('T5c es ist mehr als ein Theme (sonst waere die Gleichheit trivial)',
      (r.chips || []).length >= 2, r);
    await page.context().close();
  }

  // ── T6 · die BENANNTE FOLGE, als Messung ────────────────────────────────
  console.log('\nT6 · die benannte Folge: das Control Center ist eine DESKTOP-Flaeche');
  {
    const page = await boot(browser, fileUrl(selfPath) + LIVE);
    const operable = () => page.evaluate(() => {
      const el = document.getElementById('crMenuCC');
      if(!el) return { exists: false };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ok = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      const hit = ok ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { exists: true, ok, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               hit: hit ? (hit.id || String(hit.className) || hit.tagName) : null };
    });
    const onDesk = await operable();
    check('T6a auf dem DESKTOP ist das Control Center bedienbar', onDesk.ok === true, onDesk);
    await page.evaluate(() => { try { hideSplash(); } catch(_){} });
    await page.waitForTimeout(1200);
    const inRun = await operable();
    check('T6b IM LAUF ist es das nicht — genau die Folge, die der PR benennt',
      inRun.ok === false, inRun);
    await page.context().close();
  }

  // ── T7 · Regression ─────────────────────────────────────────────────────
  console.log('\nT7 · Regression');
  {
    const m = /CURRENT VERSION:\s*v1\.0\.(\d+)/.exec(src);
    check('T7a Versionsbanner >= v1.0.937', !!m && +m[1] >= 937, m && m[0]);
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
    let i = 0, mm, bad = null;
    while((mm = re.exec(src))){ i++; try { new Function(mm[2]); } catch(e){ bad = i + ': ' + e.message; break; } }
    check('T7b weiterhin 7 Skriptbloecke, alle parsen', i === 7 && !bad, { i, bad });
    check('T7c kein statisches <script src>', !/<script[^>]*\bsrc=/.test(src));

    const SURFACES = `(() => ({
      ccChips:   document.querySelectorAll('.crCCThemeChip').length,
      setChips:  document.querySelectorAll('.crSetThemeChip').length,
      wbCards:   document.querySelectorAll('#wbThemePresets .wbThemeCard').length,
      barTheme:  document.getElementById('crBarTheme') ? 1 : 0,
      menuTheme: document.getElementById('crMenuTheme') ? 1 : 0,
    }))()`;
    const page = await boot(browser, fileUrl(selfPath) + LIVE);
    const set = await page.evaluate(SURFACES);
    check('T7d die Control-Center-Chips stehen da — sie sind ab jetzt der Weg', set.ccChips > 0, set);
    /* BEFUND, NICHT BEHAUPTUNG: .crSetThemeChip traegt KEIN Element. Die
     * Klasse existiert nur in zwei querySelectorAll — die Settings-Chips
     * sind toter Code, und zwar schon in v1.0.936. Diese Zeile haelt den
     * Befund fest, statt ihn zu beschoenigen. */
    check('T7e .crSetThemeChip ist unbesetzt (toter Handler, VORBESTEHEND)', set.setChips === 0, set);
    if(refPath){
      const ref = await boot(browser, fileUrl(refPath) + LIVE);
      const was = await ref.evaluate(SURFACES);
      check('T7g gegen v1.0.936: an den Theme-Flaechen aendert sich GENAU der entfernte Eintrag',
        was.barTheme === 1 && set.barTheme === 0 &&
        was.ccChips === set.ccChips && was.setChips === set.setChips &&
        was.wbCards === set.wbCards && was.menuTheme === set.menuTheme,
        { was, now: set });
      await ref.context().close();
    } else {
      untested('T7g Vergleich der Theme-Flaechen gegen v1.0.936', 'kein git-Objekt');
    }
    await page.evaluate(() => { try { hideSplash(); } catch(_){} });
    await page.waitForTimeout(1500);
    const hard = page._crErrs.filter(e => !/ResizeObserver|Failed to fetch|NetworkError|net::|AbortError/i.test(e));
    check('T7f keine harten Seitenfehler', hard.length === 0, hard.slice(0, 5));
    await page.context().close();
  }

  await browser.close();
  if(refPath) { try { fs.unlinkSync(refPath); } catch(_){} }
  console.log('\n' + pass + ' gruen, ' + fail + ' rot, ' + skipped + ' UNGETESTET');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
