/* Smoke-Verifikation v1.0.895 — VIER UI-ANPASSUNGEN.
 *
 * Vier unabhaengige Aenderungen, vier Abschnitte. Was diese Datei von einem
 * Blick in den Quelltext unterscheidet, und warum es genau hier zaehlt:
 *
 *   · PLATZTAUSCH (1) laesst sich nicht am CSS ablesen. `order:7` beweist
 *     nichts, solange nicht feststeht, dass keine andere Regel gewinnt und
 *     dass das Icon ueberhaupt sichtbar ist. Geprueft wird deshalb die
 *     TATSAECHLICHE Bildschirmposition (getBoundingClientRect), nicht die
 *     deklarierte Zahl. Genau diese Falle steckte im Auftrag: `bot` hatte gar
 *     keine eigene order und lag im order:99-Eimer — wer nur `settings`
 *     verschoben haette, haette am Ende zwei Icons am Ende gehabt.
 *
 *   · LOESCHUNG (2) ist nur dann richtig, wenn sie GENAU EINE Instanz trifft.
 *     Es gibt vier <details class="cr-tok">, und eine davon (#crVaultPanel)
 *     ist gar kein Tokenomics-Block, sondern die Vault-Sync-Box — sie teilt
 *     sich nur die Klasse. Geprueft wird beides: die Wallet-App ist leer UND
 *     die drei anderen stehen noch.
 *
 *   · KONTRAST (3) ist der Grund, warum diese Datei ueberhaupt einen Browser
 *     startet. „Text ist unlesbar" ist keine Aussage ueber eine CSS-Zeile,
 *     sondern ueber zwei berechnete Farben und ihr Verhaeltnis. Gemessen wird
 *     pro Textknoten in ALLEN fuenf Themes: Vordergrund gegen den ersten
 *     wirklich deckenden Hintergrund darueber, WCAG-Kontrast. Die Schwelle
 *     4.5:1 ist die fuer Fliesstext. Vor dem Patch stand die .cr-tok-Chrome
 *     im Black-Theme bei 1.08:1 — dieselbe Farbe auf sich selbst.
 *
 *   · INTEL (4) ist ein Zustands-, kein Aussehensbefund: aus dem Profil
 *     zurueck in die Bestenliste, und die Liste muss beim OEFFNEN gefuellt
 *     sein statt erst beim Antippen von Profilen. Beides ist nur am laufenden
 *     Fenster zu sehen, also wird es geklickt.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die
 * Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * NICHT geprueft, ausdruecklich: nichts an dieser Nummer beruehrt einen
 * Worker-Endpunkt, es gibt hier also nichts, was ein /health belegen koennte.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v895_ui_browser.cjs
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

/* Zwei echte Mainnet-Adressen als Follow-Saat. Eine erfundene Zeichenkette
 * faellt durch isAddr() und die Bestenliste bliebe leer — GRUEN aus dem
 * falschen Grund. */
const WSOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const THEMES = ['platinum', 'bw', 'mono', 'ascii', 'frontier'];
const DARK   = ['mono', 'ascii'];          // Black-Theme heisst intern 'mono'

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  // Kein Netz: jede Fremdanfrage bekommt leeres JSON. Die vier Befunde sind
  // reine Client-Zustaende; ein haengender Abruf wuerde nur Zeit kosten.
  await page.route('**://**', route =>
    route.request().url().startsWith('file:') ? route.continue()
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  await page.addInitScript((seed) => {
    try { localStorage.setItem('cr_wl_intel_v1', JSON.stringify(seed)); } catch(_){}
  }, [{ addr: WSOL, name: 'alpha', at: Date.now(), watch: false },
      { addr: USDC, name: 'bravo', at: Date.now(), watch: false }]);

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);

  // Gast-Sperre loesen: Settings und Intel sind connect-exklusiv und waeren
  // sonst display:none — unsichtbare Icons haben keine Position.
  await page.evaluate(() => { document.body.classList.remove('cr-guest'); });
  // BEFUND, der beim Messen aufgefallen ist und im PR steht: das Bot-Icon ist
  // per DEFAULT versteckt. CR_BOTTERM_TO_COACH = true (Z. ~55796) setzt auf
  // Icon UND Dock-Knopf inline display:none; erst _reveal() (Z. ~104018, bei
  // verbundener Bot-Session) nimmt es zurueck. Der Platztausch ist also erst
  // im entfalteten Zustand SICHTBAR — die Position stimmt in beiden. Hier wird
  // genau der Weg gegangen, den die App selbst geht, statt einfach jedes Icon
  // sichtbar zu schalten: ein erzwungenes display:'' haette auch Icons
  // eingeblendet, die aus anderen Gruenden weg sind, und der Test haette eine
  // Reihenfolge geprueft, die es so nie gibt.
  await page.evaluate(() => {
    window.CR_BOTTERM_TO_COACH = false;
    document.querySelectorAll('.os-icon[data-prog="bot"], .dockBtn[data-prog="bot"]')
      .forEach(b => { if(b.style.display === 'none') b.style.display = ''; });
  });
  await page.waitForTimeout(300);

  // ── 1) Bot Terminal ↔ Einstellungen ─────────────────────────────────────
  console.log('\n1) Platztausch Bot Terminal / Einstellungen');
  const grid = await page.evaluate(() => [...document.querySelectorAll('#osGrid .os-icon')]
    .filter(e => getComputedStyle(e).display !== 'none')
    .map(e => ({ prog: e.getAttribute('data-prog'), t: e.getBoundingClientRect().top, l: e.getBoundingClientRect().left }))
    .sort((a, b) => (a.t - b.t) || (a.l - b.l))
    .map(e => e.prog));
  const iBot = grid.indexOf('bot'), iSet = grid.indexOf('settings'), iDis = grid.indexOf('display');
  check('Desktop: bot steht sichtbar im Raster', iBot >= 0, grid);
  check('Desktop: bot VOR settings',      iBot >= 0 && iSet >= 0 && iBot < iSet, grid);
  check('Desktop: bot direkt nach display', iDis >= 0 && iBot === iDis + 1, grid);
  check('Desktop: settings direkt nach bot', iSet === iBot + 1, grid);

  const dock = await page.evaluate(() => [...document.querySelectorAll('#crOSDockFixed .dockBtn')]
    .map(e => e.getAttribute('data-prog') || e.id));
  const dBot = dock.indexOf('bot'), dSet = dock.indexOf('settings'), dMaps = dock.indexOf('maps');
  check('Dock: settings sitzt auf dem alten bot-Platz (nach maps)', dSet === dMaps + 1, dock);
  check('Dock: bot sitzt auf dem alten settings-Platz (vor walletapp)',
        dBot >= 0 && dock[dBot + 1] === 'walletapp', dock);

  // ── 2) Tokenomics in der Wallet-App ─────────────────────────────────────
  console.log('\n2) Tokenomics-Aufklapp der Wallet-App');
  const tok = await page.evaluate(() => ({
    inWalletApp: document.querySelectorAll('#win-walletapp details.cr-tok').length,
    phone:  document.querySelectorAll('#crPhone details.cr-tok').length,
    vault:  !!document.getElementById('crVaultPanel'),
    total:  document.querySelectorAll('details.cr-tok').length,
  }));
  check('Wallet-App traegt KEINEN cr-tok-Block mehr', tok.inWalletApp === 0, tok);
  check('Phone-Wallet behaelt ihren Tokenomics-Block', tok.phone >= 1, tok);
  check('Vault-Sync-Box (gleiche Klasse, anderer Zweck) steht noch', tok.vault === true, tok);
  check('genau EINE Instanz entfernt (4 cr-tok bleiben)', tok.total === 4, tok);

  // ── 3) Sessions-App: Kontrast in allen Themes ───────────────────────────
  console.log('\n3) Sessions-App — gemessener Kontrast je Textknoten');
  const measure = () => page.evaluate(() => {
    const lin = v => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = c => { const m = c.match(/(\d+), ?(\d+), ?(\d+)/);
      return m ? 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]) : null; };
    // Der erste Vorfahr mit wirklich deckendem Grund — ein halbtransparenter
    // Kasten sagt nichts darueber, worauf der Text am Ende liegt.
    const bgOf = el => { while(el){ const c = getComputedStyle(el).backgroundColor;
      const m = c.match(/rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/);
      if(m && (m[4] === undefined || +m[4] > 0.4)) return c; el = el.parentElement; } return 'rgb(0, 0, 0)'; };
    const root = document.getElementById('crDocsViewSessions');
    if(!root) return null;
    const out = [];
    root.querySelectorAll('*').forEach(el => {
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).length;
      if(!own) return;
      const cs = getComputedStyle(el);
      if(cs.display === 'none' || cs.visibility === 'hidden') return;
      const a = L(cs.color), b = L(bgOf(el));
      if(a == null || b == null) return;
      out.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''),
                 r: +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)) });
    });
    return out;
  });

  page.on('dialog', d => d.accept('Probe'));
  for(const th of THEMES){
    await page.evaluate(t => { const s = document.getElementById('splash');
      if(t === 'platinum') s.removeAttribute('data-theme'); else s.setAttribute('data-theme', t); }, th);
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#osGrid .os-icon[data-prog="display"]')?.click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.crDocsNavItem[data-docsview="sessions"]')?.click());
    await page.waitForTimeout(400);
    // Ein Dokument anlegen: die Ueberschriften des gerenderten Markdown-Blattes
    // gibt es im Leerzustand gar nicht — und genau sie standen bei 1.20:1.
    await page.evaluate(() => document.getElementById('crBotSessionNew')?.click());
    await page.waitForTimeout(800);

    const rows = await measure();
    check(th + ': Sessions-Ansicht ist da', Array.isArray(rows) && rows.length > 5, rows && rows.length);
    const worst = (rows || []).reduce((w, x) => (!w || x.r < w.r) ? x : w, null);
    const under = (rows || []).filter(x => x.r < 4.5);
    if(DARK.includes(th)){
      // Scharf: im Black-/ASCII-Theme darf KEIN Textknoten mehr unter 4.5:1
      // liegen. Vor dem Patch waren es elf bei 1.08 bzw. 1.32.
      check(th + ': kein Textknoten unter 4.5:1 (schlechtester ' + (worst ? worst.r : '?') + ':1)',
            under.length === 0, under.slice(0, 6));
    } else {
      // Helle Themes: hier war die .cr-tok-Chrome nie das Problem (12–16:1).
      // Scharf bleibt das gerenderte Markdown-Blatt — es ist in JEDEM Theme
      // dunkel, und seine Ueberschriften standen ueberall bei 1.20:1.
      const doc = (rows || []).filter(x => /cr-session-rendered|^h[1-4]|^p$|^em$|^li$/.test(x.sel) || x.r < 2);
      check(th + ': Markdown-Blatt ueberall ueber 4.5:1 (schlechtester ' +
            (doc.length ? Math.min(...doc.map(d => d.r)) : 'n/a') + ':1)',
            doc.every(d => d.r >= 4.5), doc.filter(d => d.r < 4.5));
    }
  }
  // Zurueck auf Black — das Theme, in dem Julian den Befund gemacht hat.
  await page.evaluate(() => document.getElementById('splash').setAttribute('data-theme', 'mono'));

  // ── 4) Intel: Zurueck-Weg + Bestenliste beim Oeffnen ────────────────────
  console.log('\n4) Intel — Zurueck aus dem Profil, Bestenliste beim Oeffnen');
  const st = () => page.evaluate(() => {
    const w = document.getElementById('crWalletIntelWin');
    if(!w) return null;
    const act = [...w.querySelectorAll('[data-witab]')].find(b => b.classList.contains('active'));
    const back = w.querySelector('[data-wiback]');
    return { on: w.classList.contains('on'),
             tab: act ? act.getAttribute('data-witab') : '',
             back: back ? back.textContent.trim() : null,
             rows: w.querySelectorAll('[data-wiaddr]').length,
             lade: /loading|laedt|lädt|Loading/i.test((w.querySelector('#wiLbBody') || {}).textContent || '') };
  });
  /* Zaehler statt Augenschein. Erster Anlauf dieser Datei prueft "die Liste
   * steht, wenn ich den Tab oeffne" — und blieb bei entferntem _primeBoard
   * GRUEN: in dieser Sandbox ist jeder Abruf abgefangen und damit sofort da,
   * die Liste fuellt sich also auch ohne Vorwaermen innerhalb der Wartezeit.
   * Die Zeile prueft dann nichts (CLAUDE.md, ROT/CRASH/GRUEN). Gemessen wird
   * deshalb der MECHANISMUS: WANN wird geladen — beim Oeffnen der View oder
   * erst beim Zeichnen der Liste? */
  await page.evaluate(() => {
    window.__v895 = { pf: 0, ghost: 0 };
    const g = window.crGoldRush, gh = window.crGhost;
    if(g && g.portfolio){ const o = g.portfolio.bind(g); g.portfolio = function(){ window.__v895.pf++; return o.apply(null, arguments); }; }
    if(gh && gh.refresh){ const o = gh.refresh.bind(gh); gh.refresh = function(){ window.__v895.ghost++; return o.apply(null, arguments); }; }
  });
  await page.evaluate(() => window.crWalletIntel.open());
  await page.waitForTimeout(1500);
  const s0 = await st();
  const c0 = await page.evaluate(() => window.__v895);
  check('Intel-Fenster offen, Uebersicht ist die Landeansicht', !!s0 && s0.on && s0.tab === 'overview', s0);
  check('Uebersicht traegt KEIN Zurueck (es gibt kein Ziel)', !!s0 && s0.back === null, s0);
  // SCHARF: beide Ladewege laufen beim OEFFNEN — waehrend noch die Uebersicht
  // steht und niemand die Bestenliste angesehen oder ein Profil angetippt hat.
  check('Wallet-Werte werden beim Oeffnen der View geholt (' + c0.pf + ' Abrufe)',
        s0.tab === 'overview' && c0.pf >= 2, c0);
  check('Runs-Abruf wird beim Oeffnen der View angestossen (' + c0.ghost + 'x)',
        s0.tab === 'overview' && c0.ghost >= 1, c0);

  await page.evaluate(() => document.querySelector('#crWalletIntelWin [data-witab="board"]').click());
  await page.waitForTimeout(1200);
  const s1 = await st();
  const c1 = await page.evaluate(() => window.__v895);
  check('Bestenliste steht sofort mit beiden Wallets', !!s1 && s1.rows === 2, s1);
  check('Bestenliste haengt nicht mehr im Ladezustand', !!s1 && s1.lade === false, s1);
  // Die Werte lagen beim Zeichnen schon im 60s-Cache — die Liste wartet auf
  // nichts mehr. Waeren sie es nicht, stuende hier ein zweiter Abruf.
  check('Zeichnen der Bestenliste loest KEINEN neuen Wallet-Abruf aus',
        c1.pf === c0.pf, { vorher: c0.pf, nachher: c1.pf });

  // Und der Riegel gegen die Endlosschleife: das Zeichnen der Runs-Liste ruft
  // crGhost.refresh() NICHT mehr — sonst haette der crGhost:updated-Repaint
  // sich selbst nachgeladen, in Dauerschleife ueber echte RPC-Aufrufe.
  await page.evaluate(() => document.querySelector('#crWalletIntelWin [data-wilb="runs"]').click());
  await page.waitForTimeout(700);
  const c2 = await page.evaluate(() => window.__v895);
  check('Zeichnen der Runs-Liste ruft crGhost.refresh() NICHT (kein RPC-Kreis)',
        c2.ghost === c0.ghost, { beimOeffnen: c0.ghost, nachRunsRender: c2.ghost });
  await page.evaluate(() => document.querySelector('#crWalletIntelWin [data-wilb="wallets"]').click());
  await page.waitForTimeout(700);

  await page.evaluate(() => document.querySelector('#crWalletIntelWin [data-wiaddr]').click());
  await page.waitForTimeout(900);
  const s2 = await st();
  check('Profil-Drill-down landet in der Uebersicht', !!s2 && s2.tab === 'overview', s2);
  check('Profil traegt ein Zurueck-Control, das die Bestenliste NENNT',
        !!s2 && typeof s2.back === 'string' && /‹/.test(s2.back) &&
        /Bestenliste|Leaderboard|Clasificación|排行榜/.test(s2.back), s2);

  await page.evaluate(() => document.querySelector('#crWalletIntelWin [data-wiback]').click());
  await page.waitForTimeout(900);
  const s3 = await st();
  check('Zurueck fuehrt in die Bestenliste, nicht irgendwohin', !!s3 && s3.tab === 'board', s3);
  check('Bestenliste ist nach dem Zurueck wieder vollstaendig', !!s3 && s3.rows === 2, s3);

  // Und die Auswahl ist wirklich gefallen: sonst zeigte ein Klick auf
  // „Uebersicht" das alte Profil statt der Discover-Ansicht.
  await page.evaluate(() => document.querySelector('#crWalletIntelWin [data-witab="overview"]').click());
  await page.waitForTimeout(700);
  const s4 = await st();
  check('Uebersicht danach wieder ohne Profil (kein Zurueck)', !!s4 && s4.back === null, s4);

  console.log('\nJS-Fehler auf der Seite: ' + (errs.length ? JSON.stringify(errs.slice(0, 4)) : 'keine'));
  check('keine JS-Fehler', errs.length === 0, errs.slice(0, 4));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
