/* Smoke-Verifikation v1.0.935 — SCHLIESSEN-KNOPF DER FENSTER.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI. Ein grep auf "44px"
 * bewiese genau das, woran der Befund haengt: dass eine Zahl dasteht. Der
 * Befund war ja gerade, dass eine Regel (.splash .os-wbar .dot{14px}) da
 * stand und ein spaeterer !important-Block sie auf 9 px gedrueckt hat, ohne
 * dass irgendwer es bemerkt haette. Deshalb misst dieser Test
 *
 *   - die TREFFERFLAECHE ueber document.elementFromPoint auf einem Raster,
 *     also das, was ein Daumen wirklich trifft (inkl. overflow:hidden-
 *     Beschneidung am Fensterrand und inkl. allem, was darueber liegt),
 *   - das ZEICHEN ueber seinen gerenderten Kasten und seinen gemessenen
 *     Kontrast gegen den Grund, auf dem es steht,
 *   - das SCHLIESSEN ueber einen echten Tap, nicht ueber .click().
 *
 * Jede Gegenprobe MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Telefon, JEDES Fenster des Desktops: >= 44 x 44 zusammenhaengende
 *      CSS-Pixel treffen den Schliesser. Gemessen als groesstes achsen-
 *      paralleles Rechteck aus Rasterpunkten, an denen elementFromPoint den
 *      Schliesser liefert.  (Mutation: ::after-Zone auf 30px -> T1 rot.)
 *  T2  Der SICHTBARE Kasten ist mitgewachsen: >= 13 px (v934: 9 px) und
 *      < 24 px — groesser heisst groesser, nicht ein Klotz.
 *      (Mutation: dot-Breite zurueck auf 9px -> T2 rot.)
 *  T3  Das Zeichen steht im RUHEZUSTAND da (kein :hover), misst >= 6 px in
 *      jeder Kante und hebt sich mit >= 3:1 vom Grund ab, in JEDEM Theme.
 *      (Mutation: opacity:1 aus der ::before-Regel -> T3 rot.
 *       Mutation: mono/bw-Tinte entfernen -> T3 rot, nur in mono/bw.)
 *  T4  Die Zone liegt VOLLSTAENDIG im Fenster — .os-window ist
 *      overflow:hidden, eine mittige Zone am linken Rand waere beschnitten.
 *      (Mutation: padding-left der Leiste zurueck auf 8px -> T4 rot.)
 *  T5  KEINE FEHLAUSLOESER: in der Zone liegt kein zweites bedienbares
 *      Element, und bis zum naechsten ist >= 8 px Luft.
 *      (Mutation: die gelben/gruenen Punkte sichtbar schalten -> T5 rot.)
 *  T6  ES SCHLIESST, und zwar beim ERSTEN Tap und ohne Zielen: getippt wird
 *      auf die Ecke der Zone, nicht auf die Mitte. Und ein Tap 12 px neben
 *      der Zone schliesst NICHT.
 *      (Mutation: pointer-events:none auf dem ::after -> T6 rot, weil die
 *       Ecke dann den Titel trifft.)
 *  T7  Die beiden anderen Fensterkoepfe: #win-l3coach (eigener ✕) und die
 *      schwebenden Profil-/Terminal-Fenster (✕ + drei Punkte). ✕ >= 44 x 44,
 *      Punkte mitgewachsen, ✕ und Punkte >= 8 px auseinander.
 *      (Mutation: den C-Block loeschen -> T7 rot.)
 *  T8  DESKTOP UNVERAENDERT, und zwar bewiesen statt behauptet: dieselbe
 *      Datei ein zweites Mal geladen, mit dem v935-Styleblock MECHANISCH
 *      herausgeschnitten, bei 1280 px und feinem Zeiger. Jede berechnete
 *      Eigenschaft von Leiste, Kasten und Zeichen muss Zeichen fuer Zeichen
 *      gleich sein.
 *      (Mutation: die @media-Bedingung auf `all` aendern -> T8 rot.)
 *  T9  Regression: Versionsbanner >= v1.0.935, der Apple-Toast nennt den
 *      Build, 7 Skriptbloecke, kein statisches <script src>, keine harten
 *      Seitenfehler.
 *
 * Aufruf:  node scripts/check_v935_schliessknopf_browser.cjs
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const FILE = 'ChartRunner_Prototype.html';
const THEMES = ['platinum', 'mono', 'bw', 'ascii', 'frontier'];
let pass = 0, fail = 0, skipped = 0;
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

/* Die Messfunktionen laufen IM Browser. Sie sind absichtlich dumm: sie lesen
 * Rechtecke und Farben, sie kennen keine Sollwerte. */
const PROBE = `(() => {
  const R = el => { const b = el.getBoundingClientRect();
    return { x:+b.x.toFixed(2), y:+b.y.toFixed(2), w:+b.width.toFixed(2), h:+b.height.toFixed(2),
             l:+b.left.toFixed(2), t:+b.top.toFixed(2), r:+b.right.toFixed(2), b:+b.bottom.toFixed(2) }; };
  const visible = el => { if(!el) return false; const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .01 && b.width > 0 && b.height > 0; };
  /* Bedienbar = Knopf, Link, oder etwas, das cursor:pointer traegt bzw. als
     .dot gebaut ist. pointer-events:none zaehlt nicht mit. */
  const interactive = bar => {
    const out = [];
    bar.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if(!visible(el) || cs.pointerEvents === 'none') return;
      const tag = el.tagName.toLowerCase();
      if(tag === 'button' || tag === 'a' || cs.cursor === 'pointer' || el.classList.contains('dot'))
        out.push({ tag, cls: String(el.className || ''), rect: R(el), el });
    });
    return out;
  };
  /* Der gerenderte Kasten des ::before — bei clip-path ist die Flaeche das
     Elementrechteck, bei einer Glyphe ihre Zeilenbox. Beides ueber die
     berechneten Laengen, in px aufgeloest durch einen Messknoten. */
  const markBox = dot => {
    const cs = getComputedStyle(dot, '::before');
    const dr = dot.getBoundingClientRect();
    const px = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
    if(cs.position === 'absolute'){
      const t = px(cs.top), l = px(cs.left), r = px(cs.right), b = px(cs.bottom);
      const bw = parseFloat(getComputedStyle(dot).borderTopWidth) || 0;
      const inner = { w: dr.width - 2*bw, h: dr.height - 2*bw };
      if(t !== null && b !== null && l !== null && r !== null)
        return { w:+(inner.w - l - r).toFixed(2), h:+(inner.h - t - b).toFixed(2), kind:'clip' };
    }
    const w = px(cs.width), h = px(cs.height), fs = px(cs.fontSize);
    if(w !== null && h !== null && w > 0 && h > 0) return { w:+w.toFixed(2), h:+h.toFixed(2), kind:'glyph' };
    return { w: fs || 0, h: fs || 0, kind:'glyph' };
  };
  const lum = c => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if(!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s));
    if(p.length > 3 && p[3] < .05) return null;
    const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
    return .2126*f(p[0]) + .7152*f(p[1]) + .0722*f(p[2]); };
  /* Effektiver Grund, auf dem das Zeichen steht. Ein Verlauf ist kein
     einzelner Wert — deshalb kommen ALLE Farbstopps zurueck, und der Kontrast
     wird gegen den unguenstigsten gerechnet. (Der Platinum-Kasten ist genau
     so gebaut: linear-gradient(#f4f4ee,#c8c8be).) */
  const groundsOf = el => { let n = el;
    while(n && n !== document.documentElement){
      const cs = getComputedStyle(n);
      const bi = cs.backgroundImage;
      if(bi && bi !== 'none'){ const stops = bi.match(/rgba?\\([^)]+\\)/g); if(stops && stops.length) return stops; }
      const m = /rgba?\\(([^)]+)\\)/.exec(cs.backgroundColor);
      if(m){ const p = m[1].split(',').map(parseFloat); if(p.length < 4 || p[3] > .6) return [cs.backgroundColor]; }
      n = n.parentElement; }
    return ['rgb(0, 0, 0)']; };
  const contrast = (a, b) => { const la = lum(a), lb = lum(b); if(la === null || lb === null) return null;
    return +(((Math.max(la,lb) + .05) / (Math.min(la,lb) + .05))).toFixed(2); };
  const contrastWorst = (ink, grounds) => {
    const vals = grounds.map(g => contrast(ink, g)).filter(v => v !== null);
    return vals.length ? Math.min.apply(null, vals) : null; };
  /* Die wirkliche Trefferflaeche: vom Mittelpunkt aus in alle vier Richtungen
     tasten, bis elementFromPoint den Knopf NICHT mehr liefert. Danach die
     vier Ecken gegenpruefen und notfalls schrumpfen — gemessen wird also ein
     Rechteck, das komplett trifft, nicht nur ein Kreuz.
     Raster 0.5 px. Ein 44 px breites Element deckt [l, l+44) ab; der Punkt
     genau auf l+44 gehoert schon zum Nachbarn. Punktweises Messen kann
     deshalb hoechstens 43.5 zeigen — die Schwelle unten traegt das. */
  const STEP = .5;
  const hitRect = (el, cx, cy) => {
    const hits = (x, y) => { const t = document.elementFromPoint(x, y);
      return !!(t && (t === el || el.contains(t))); };
    if(!hits(cx, cy)) return { w:0, h:0, step:STEP };
    const scan = (dx, dy) => { let d = 0;
      while(d < 90){ const nd = d + STEP; if(!hits(cx + dx*nd, cy + dy*nd)) break; d = nd; } return d; };
    let L = scan(-1,0), Rr = scan(1,0), T = scan(0,-1), B = scan(0,1);
    /* w/h sind die vollen Ausdehnungen durch die Mitte — das ist die Groesse
       des Ziels. Zusaetzlich das groesste Rechteck, dessen VIER ECKEN auch
       treffen: bei einem Knopf mit border-radius faellt es kleiner aus, weil
       elementFromPoint die abgerundete Ecke respektiert. Das ist kein Mangel
       der Zone, sondern die Form des Knopfes — deshalb steht es als eigene
       Zahl da, statt die Messung der Kanten zu verkleinern. */
    let l = L, r = Rr, t = T, b = B, guard = 0;
    const cornersOk = () => hits(cx-l, cy-t) && hits(cx+r, cy-t) && hits(cx-l, cy+b) && hits(cx+r, cy+b);
    while(!cornersOk() && guard++ < 200 && (l > 0 || r > 0 || t > 0 || b > 0)){
      l = Math.max(0, l - STEP); r = Math.max(0, r - STEP);
      t = Math.max(0, t - STEP); b = Math.max(0, b - STEP);
    }
    return { w:+(L + Rr).toFixed(2), h:+(T + B).toFixed(2),
             sqW:+(l + r).toFixed(2), sqH:+(t + b).toFixed(2), step:STEP };
  };
  window.__crProbe = { R, visible, interactive, markBox, contrast, contrastWorst, groundsOf, hitRect };
})()`;

async function newPage(browser, vp, file){
  const ctx = await browser.newContext({ viewport:{ width:vp.w, height:vp.h }, hasTouch: !!vp.touch, isMobile: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message || String(e)));
  /* Die Erstnutzer-Tour schliesst beim Start jedes offene Fenster — sie
     wuerde die Messung uebernehmen. Cookie-gegatet, „schon gelaufen". */
  await page.addInitScript(() => { try { localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done:true })); } catch(_){} });
  await page.goto('file://' + path.resolve(file), { waitUntil:'load', timeout:60000 });
  await page.waitForSelector('#win-run', { state:'attached', timeout:20000 });
  await page.waitForFunction(() => typeof window.osOpenWindowMulti === 'function', { timeout:20000 });
  await page.evaluate(PROBE);
  return { ctx, page, errors };
}

async function setTheme(page, theme){
  await page.evaluate(async (theme) => {
    try { if(window.crApplyTheme) window.crApplyTheme(theme); } catch(_){}
    const sp = document.getElementById('splash'); if(sp) sp.setAttribute('data-theme', theme);
    document.body.setAttribute('data-os-theme', theme);
    await new Promise(r => setTimeout(r, 60));
  }, theme);
}

/* ── A · Desktop-Fenster, Telefon ───────────────────────────────────────── */
async function measureDesktopWindows(page){
  return page.evaluate(() => {
    const P = window.__crProbe;
    const out = [];
    document.querySelectorAll('#splash .os-window').forEach(w => {
      const bar = w.querySelector('.os-wbar'); if(!bar) return;
      const was = w.classList.contains('on');
      w.classList.add('on');
      // Nur DIESES Fenster darf oben liegen, sonst misst elementFromPoint
      // den Nachbarn. raiseWindow macht genau das im Produktivpfad.
      document.querySelectorAll('#splash .os-window.on').forEach(o => { if(o !== w) o.classList.remove('on'); });
      const dot = bar.querySelector('.dot.red');
      const wclose = bar.querySelector('.wclose');
      const closer = (dot && P.visible(dot)) ? dot : ((wclose && P.visible(wclose)) ? wclose : null);
      if(!closer){ out.push({ id:w.id, closer:null }); if(!was) w.classList.remove('on'); return; }
      const cr = P.R(closer), wr = P.R(w), br = P.R(bar);
      const cx = cr.l + cr.w/2, cy = cr.t + cr.h/2;
      const hit = P.hitRect(closer, cx, cy);
      const side = Math.min(hit.w, hit.h);
      const zone = { l: cx - hit.w/2, t: cy - hit.h/2, r: cx + hit.w/2, b: cy + hit.h/2 };
      const inWindow = zone.l >= wr.l - .5 && zone.r <= wr.r + .5 && zone.t >= wr.t - .5 && zone.b <= wr.b + .5;
      const others = P.interactive(bar).filter(i => i.el !== closer && !closer.contains(i.el));
      const gap = others.length ? Math.min(...others.map(i => {
        const o = i.rect;
        const dx = Math.max(zone.l - o.r, o.l - zone.r, 0);
        const dy = Math.max(zone.t - o.b, o.t - zone.b, 0);
        return Math.max(dx, dy);
      })) : Infinity;
      const mark = closer === dot ? P.markBox(dot) : null;
      const markCs = closer === dot ? getComputedStyle(dot, '::before') : null;
      out.push({
        id: w.id, barH: br.h, closerKind: closer === dot ? 'dot' : 'wclose',
        box: { w: cr.w, h: cr.h }, hitSide: side, hit, inWindow,
        zoneCss: closer === dot ? (() => { const cs = getComputedStyle(dot, '::after');
          return { w: cs.width, h: cs.height, content: cs.content }; })() : null,
        others: others.map(o => ({ cls:o.cls, rect:o.rect })), gap: gap === Infinity ? null : +gap.toFixed(2),
        mark, markOpacity: markCs ? +markCs.opacity : null,
        markContrast: markCs ? P.contrastWorst(
          markCs.content && markCs.content !== 'none' && markCs.content !== '""' ? markCs.color : markCs.backgroundColor,
          P.groundsOf(closer)) : null,
        markGround: closer === dot ? P.groundsOf(dot) : null
      });
      if(!was) w.classList.remove('on');
    });
    return out;
  });
}

/* ── Voller Stil-Abzug fuer T8 ──────────────────────────────────────────── */
const SNAP_PROPS = ['minHeight','height','padding','gap','width','marginRight','borderRadius',
                    'backgroundColor','backgroundImage','borderTopWidth','borderTopColor','boxShadow',
                    'fontSize','lineHeight','display','position','opacity','color','cursor'];
async function styleSnapshot(page){
  return page.evaluate((props) => {
    const snap = {};
    const take = (key, el, pseudo) => {
      if(!el) { snap[key] = null; return; }
      const cs = getComputedStyle(el, pseudo || undefined);
      const o = {}; props.forEach(p => o[p] = cs[p]);
      if(pseudo){ o.content = cs.content; o.top = cs.top; o.left = cs.left; o.right = cs.right; o.bottom = cs.bottom; }
      const b = el.getBoundingClientRect();
      o.__rect = pseudo ? null : [+b.width.toFixed(2), +b.height.toFixed(2)];
      snap[key] = o;
    };
    document.querySelectorAll('#splash .os-window').forEach(w => {
      w.classList.add('on');
      const bar = w.querySelector('.os-wbar'); if(!bar) return;
      take(w.id + '|bar', bar);
      take(w.id + '|dot', bar.querySelector('.dot.red'));
      take(w.id + '|mark', bar.querySelector('.dot.red'), '::before');
      take(w.id + '|zone', bar.querySelector('.dot.red'), '::after');
      take(w.id + '|wclose', bar.querySelector('.wclose'));
      take(w.id + '|ttl', bar.querySelector('.ttl'));
      w.classList.remove('on');
    });
    return snap;
  }, SNAP_PROPS);
}

(async () => {
  const browser = await chromium.launch(launchOptions());

  /* ══ Telefon ══════════════════════════════════════════════════════════ */
  const phone = await newPage(browser, { w:390, h:844, touch:true }, FILE);
  const coarse = await phone.page.evaluate(() => {
    try { return !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches); } catch(_){ return false; }
  });
  console.log('\n── Telefon 390x844 · pointer:coarse = ' + coarse + ' (die max-width-Haelfte der Bedingung traegt so oder so)');

  const perTheme = {};
  for(const theme of THEMES){
    await setTheme(phone.page, theme);
    perTheme[theme] = await measureDesktopWindows(phone.page);
  }

  console.log('\nT1 · Trefferflaeche >= 44 x 44, jedes Fenster, jedes Theme');
  {
    /* 43.5 statt 44: das Raster ist 0.5 px, und ein 44 px breites Element
       deckt [l, l+44) ab — der Punkt auf der rechten Kante gehoert schon zum
       Nachbarn. 43.5 gemessen heisst also „44 px belegt". Damit die Schwelle
       nicht zur Hintertuer wird, prueft T1c zusaetzlich die deklarierte
       Kantenlaenge der Zone. */
    const MIN = 43.5;
    const bad = [];
    let n = 0;
    for(const theme of THEMES) for(const r of perTheme[theme]){
      n++;
      if(r.closerKind === undefined){ bad.push({ theme, id:r.id, why:'kein sichtbarer Schliesser' }); continue; }
      if(r.hitSide < MIN) bad.push({ theme, id:r.id, hit:r.hit });
    }
    check('T1a jedes Fenster/Theme hat eine 44er Zone (' + n + ' Messungen)', bad.length === 0, bad.slice(0, 6));
    const worst = Math.min(...THEMES.flatMap(t => perTheme[t].map(r => r.hitSide || 0)));
    check('T1b kleinste gemessene Zone >= ' + MIN + ' (ist ' + worst + ')', worst >= MIN);
    const zones = THEMES.flatMap(t => perTheme[t].filter(r => r.closerKind === 'dot').map(r => r.zoneCss));
    check('T1c die Zone ist als 44 x 44 deklariert, nicht nur gemessen',
          zones.length > 0 && zones.every(z => z && z.w === '44px' && z.h === '44px' && z.content !== 'none'),
          zones[0]);
  }

  console.log('\nT2 · sichtbarer Kasten mitgewachsen (v934: 9 x 9)');
  {
    const boxes = THEMES.flatMap(t => perTheme[t].filter(r => r.closerKind === 'dot').map(r => r.box.w));
    const min = Math.min(...boxes), max = Math.max(...boxes);
    check('T2a Kasten >= 13 px (v934: 9 px, Faktor >= 1.44) — gemessen ' + min, min >= 13);
    check('T2b Kasten < 24 px (kein Klotz) — gemessen ' + max, max < 24);
  }

  console.log('\nT3 · das Zeichen steht im Ruhezustand da und ist lesbar');
  {
    const badOp = [], badSize = [], badContrast = [];
    for(const theme of THEMES) for(const r of perTheme[theme]){
      if(r.closerKind !== 'dot') continue;
      if(!(r.markOpacity >= .99)) badOp.push({ theme, id:r.id, opacity:r.markOpacity });
      if(!(r.mark && r.mark.w >= 6 && r.mark.h >= 6)) badSize.push({ theme, id:r.id, mark:r.mark });
      if(!(r.markContrast !== null && r.markContrast >= 3)) badContrast.push({ theme, id:r.id, c:r.markContrast, ground:r.markGround });
    }
    check('T3a sichtbar ohne :hover (opacity 1)', badOp.length === 0, badOp.slice(0, 5));
    check('T3b Zeichen >= 6 x 6 px (v934 gemessen: 1 x 1)', badSize.length === 0, badSize.slice(0, 5));
    check('T3c Kontrast Zeichen/Grund >= 3:1 in jedem Theme', badContrast.length === 0, badContrast.slice(0, 5));
  }

  console.log('\nT4 · die Zone liegt ganz im Fenster (overflow:hidden schneidet sonst)');
  {
    const bad = THEMES.flatMap(t => perTheme[t].filter(r => r.closerKind && !r.inWindow).map(r => ({ theme:t, id:r.id })));
    check('T4a keine beschnittene Zone', bad.length === 0, bad.slice(0, 5));
  }

  console.log('\nT5 · keine Fehlausloeser');
  {
    const inZone = THEMES.flatMap(t => perTheme[t].filter(r => r.gap !== null && r.gap < 8).map(r => ({ theme:t, id:r.id, gap:r.gap, others:r.others })));
    check('T5a >= 8 px bis zum naechsten bedienbaren Element (oder es gibt keines)', inZone.length === 0, inZone.slice(0, 5));
    const counts = {}; THEMES.forEach(t => perTheme[t].forEach(r => { counts[r.others.length] = (counts[r.others.length]||0)+1; }));
    check('T5b in keiner Leiste liegt ein zweiter Knopf neben dem Schliesser', Object.keys(counts).every(k => k === '0'), counts);
  }

  console.log('\nT6 · ein Tap ohne Zielen schliesst — und daneben schliesst nicht');
  {
    await setTheme(phone.page, 'platinum');
    for(const id of ['win-run', 'win-settings', 'win-terminal']){
      const geo = await phone.page.evaluate((id) => {
        const P = window.__crProbe;
        document.querySelectorAll('#splash .os-window.on').forEach(o => o.classList.remove('on'));
        const w = document.getElementById(id); w.classList.add('on');
        const dot = w.querySelector('.os-wbar .dot.red');
        const cr = P.R(dot); const cx = cr.l + cr.w/2, cy = cr.t + cr.h/2;
        const hit = P.hitRect(dot, cx, cy);
        return { cx, cy, side: Math.min(hit.w, hit.h) };
      }, id);
      // Ecke der Zone, 2 px vom Rand — das ist „nicht zielen".
      const ex = geo.cx - geo.side/2 + 2, ey = geo.cy - geo.side/2 + 2;
      await phone.page.mouse.click(ex, ey);
      const closed = await phone.page.evaluate(id => !document.getElementById(id).classList.contains('on'), id);
      check('T6a ' + id + ': Tap auf die Zonen-ECKE (' + ex.toFixed(0) + ',' + ey.toFixed(0) + ') schliesst beim ersten Versuch', closed);

      // Wieder auf, dann 12 px RECHTS neben der Zone tippen.
      const nx = geo.cx + geo.side/2 + 12, ny = geo.cy;
      await phone.page.evaluate(id => { document.getElementById(id).classList.add('on'); }, id);
      await phone.page.mouse.click(nx, ny);
      const stillOpen = await phone.page.evaluate(id => document.getElementById(id).classList.contains('on'), id);
      check('T6b ' + id + ': Tap 12 px NEBEN der Zone schliesst nicht', stillOpen);
      await phone.page.evaluate(id => { document.getElementById(id).classList.remove('on'); }, id);
    }
  }

  console.log('\nT7 · die beiden anderen Fensterkoepfe');
  {
    // B — COACH-Fenster: eigener Kopf, ✕ statt Punkt.
    const coach = await phone.page.evaluate(() => {
      const P = window.__crProbe;
      document.querySelectorAll('#splash .os-window.on').forEach(o => o.classList.remove('on'));
      const w = document.getElementById('win-l3coach'); if(!w) return null;
      w.classList.add('on');
      const bar = w.querySelector('.os-wbar');
      const x = bar.querySelector('.wclose');
      const dotsVisible = Array.from(bar.querySelectorAll('.dot')).some(d => P.visible(d));
      const r = P.R(x); const hit = P.hitRect(x, r.l + r.w/2, r.t + r.h/2);
      const side = Math.min(hit.w, hit.h);
      const others = P.interactive(bar).filter(i => i.el !== x);
      const res = { barH: P.R(bar).h, box:{ w:r.w, h:r.h }, hitSide: side, hit, dotsVisible,
                    font: parseFloat(getComputedStyle(x).fontSize), others: others.map(o => o.cls) };
      w.classList.remove('on');
      return res;
    });
    check('T7a #win-l3coach: ✕ >= 44 x 44 (v934: 16 x 16)', !!coach && coach.hitSide >= 43.5 && coach.box.w >= 44 && coach.box.h >= 44, coach);
    check('T7b #win-l3coach: Glyphe mitgewachsen (>= 15 px, v934: 11 px)', !!coach && coach.font >= 15, coach && coach.font);
    check('T7c #win-l3coach: kein zweiter Knopf in der Leiste', !!coach && coach.others.length === 0, coach && coach.others);

    // C — schwebende Fenster: aus #splash in den Body umgehaengt.
    const floats = await phone.page.evaluate(async () => {
      const P = window.__crProbe;
      const out = [];
      for(const id of ['win-terminal', 'win-wallet']){
        const w = document.getElementById(id); if(!w) continue;
        document.body.appendChild(w);              // das tut _toggleFloatingWindow
        w.classList.add('cr-floating', 'on');
        w.style.left = '20px'; w.style.top = '60px'; w.style.width = '340px';
        w.style.height = '320px'; w.style.maxHeight = 'none';
        await new Promise(r => setTimeout(r, 40));
        const bar = w.querySelector('.os-wbar');
        const x = bar.querySelector('.wclose');
        const dots = Array.from(bar.querySelectorAll('.dot')).filter(d => P.visible(d)).map(d => P.R(d));
        const xr = P.R(x);
        const hit = P.hitRect(x, xr.l + xr.w/2, xr.t + xr.h/2);
        const side = Math.min(hit.w, hit.h);
        const gapToDots = dots.length ? Math.min(...dots.map(d => Math.max(xr.l - d.r, d.l - xr.r, 0))) : null;
        const dotGaps = [];
        for(let i = 1; i < dots.length; i++) dotGaps.push(+(dots[i].l - dots[i-1].r).toFixed(2));
        out.push({ id, parent: w.parentNode === document.body ? 'body' : 'splash',
                   barH: P.R(bar).h, xBox:{ w:xr.w, h:xr.h }, hitSide: side, hit,
                   xFont: parseFloat(getComputedStyle(x).fontSize),
                   dotW: dots.length ? dots[0].w : null, dotGaps, gapToDots });
        w.classList.remove('on', 'cr-floating');
      }
      return out;
    });
    const badFloat = floats.filter(f => !(f.hitSide >= 43.5 && f.xBox.w >= 44 && f.xBox.h >= 44));
    check('T7d schwebend: ✕ >= 44 x 44 (v934: 31.6 x 23)', badFloat.length === 0, floats);
    check('T7e schwebend: Punkte mitgewachsen (>= 13 px, v934: 10)', floats.every(f => f.dotW >= 13), floats.map(f => f.dotW));
    check('T7f schwebend: >= 8 px zwischen den Punkten', floats.every(f => f.dotGaps.every(g => g >= 8)), floats.map(f => f.dotGaps));
    check('T7g schwebend: >= 8 px zwischen ✕ und Punkten', floats.every(f => f.gapToDots === null || f.gapToDots >= 8), floats.map(f => f.gapToDots));
    check('T7h schwebend: die Fenster haengen wirklich im Body (sonst misst C nichts)', floats.length > 0 && floats.every(f => f.parent === 'body'), floats.map(f => f.parent));
  }

  console.log('\nT9 · Regression');
  {
    const html = fs.readFileSync(FILE, 'utf8');
    const m = /CURRENT VERSION:\s*v1\.0\.(\d+)/.exec(html);
    check('T9a Versionsbanner >= v1.0.935', !!m && +m[1] >= 935, m && m[0]);
    let blocks = 0; const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g; let mm;
    while((mm = re.exec(html))) blocks++;
    check('T9b weiterhin 7 Skriptbloecke', blocks === 7, blocks);
    check('T9c kein statisches <script src>', !/<script[^>]*\bsrc=/i.test(html));
    const about = await phone.page.evaluate(() => {
      try { return window._crOSAbout ? window._crOSAbout() : null; } catch(_){ return 'THREW'; }
    });
    check('T9d der Apple-Toast nennt den Build', typeof about === 'string' && /v1\.0\.9\d\d/.test(about), about);
    check('T9e keine harten Seitenfehler am Telefon', phone.errors.length === 0, phone.errors.slice(0, 3));
  }

  /* ══ T8 · Maus-Desktop: gegen dieselbe Datei OHNE den Block ═══════════ */
  console.log('\nT8 · Desktop (1280 px, feiner Zeiger) Zeichen fuer Zeichen unveraendert');
  {
    const html = fs.readFileSync(FILE, 'utf8');
    const start = html.indexOf('<style id="cr-win-close-touch-v935">');
    const end = start >= 0 ? html.indexOf('</style>', start) : -1;
    if(start < 0 || end < 0){
      skipped++;
      console.log('  UNGETESTET T8 — der v935-Styleblock ist nicht auffindbar (Id umbenannt?)');
    } else {
      const cut = html.slice(0, start) + html.slice(end + '</style>'.length);
      const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cr935-')), 'ohne-block.html');
      fs.writeFileSync(tmp, cut, 'utf8');

      const withBlock = await newPage(browser, { w:1280, h:900, touch:false }, FILE);
      const without   = await newPage(browser, { w:1280, h:900, touch:false }, tmp);
      const fine = await withBlock.page.evaluate(() => window.matchMedia('(pointer:fine)').matches);
      check('T8a der Messplatz hat wirklich einen feinen Zeiger', fine === true, fine);

      const diffs = [];
      for(const theme of THEMES){
        await setTheme(withBlock.page, theme);
        await setTheme(without.page, theme);
        const a = await styleSnapshot(withBlock.page);
        const b = await styleSnapshot(without.page);
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for(const k of keys){
          const sa = JSON.stringify(a[k]), sb = JSON.stringify(b[k]);
          if(sa !== sb) diffs.push({ theme, key:k, mit: sa && sa.slice(0, 220), ohne: sb && sb.slice(0, 220) });
        }
      }
      check('T8b kein einziger Unterschied in Leiste/Kasten/Zeichen/Zone (' + THEMES.length + ' Themes x 16 Fenster x 6 Knoten)',
            diffs.length === 0, diffs.slice(0, 3));
      check('T8c der Vergleich hat wirklich gemessen (Abzug nicht leer)',
            Object.keys(await styleSnapshot(withBlock.page)).length >= 16 * 6 - 6);
      await withBlock.ctx.close(); await without.ctx.close();
      try { fs.rmSync(path.dirname(tmp), { recursive:true, force:true }); } catch(_){}
    }
  }

  await phone.ctx.close();
  await browser.close();
  console.log('\n' + pass + ' gruen, ' + fail + ' rot, ' + skipped + ' UNGETESTET');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
