/* Smoke-Verifikation v1.0.930 — ABMELDEN SCHLIESST DIE KONTOGEBUNDENEN FENSTER.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, nicht im Quelltext
 * gesucht. Ein grep auf `CR_CONNECT_EXCLUSIVE` bewiese genau das, woran der
 * Befund haengt: dass ein Name dasteht. Der Befund war ja gerade, dass drei
 * Mechanismen existierten und trotzdem keiner den Uebergang abfing.
 *
 * An-/Abmelden wird ueber crAccount.isSignedIn gestellt — das ist die
 * Bedingung, die crConnected() liest, und crApplyAccessGates() ist die
 * Funktion, die crAccount._gatesSync bei JEDEM echten Sitzungswechsel ruft
 * (Reload, onAuthStateChange, signUp/signIn, signOut). Es wird also der echte
 * Pfad gemessen, nur ohne Netz.
 *
 * Jede Gegenprobe MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Angemeldet, Bot-Terminal offen -> abmelden: #win-bot traegt kein .on
 *      mehr UND ist wirklich unsichtbar (computed display), und
 *      #crBotChatLog / #crBotChatMsgs / #crBotAgents sind leer.
 *      (Mutation: den clear-Eintrag der bot-Zeile entfernen -> T1 rot.)
 *  T2  Dasselbe fuer JEDES weitere Fenster der Liste — die Liste wird zur
 *      Laufzeit gelesen, nicht im Test wiederholt. Ein spaeter ergaenztes
 *      Fenster wird dadurch automatisch mitgeprueft.
 *      (Mutation: eine Zeile aus CR_CONNECT_EXCLUSIVE loeschen -> T2 rot.)
 *  T3  Kein Takt dieses Fensters laeuft weiter: Spion auf setInterval /
 *      clearInterval. Jedes Intervall, das WAEHREND der angemeldeten Phase
 *      entsteht, muss nach dem Abmelden geloescht sein.
 *      (Mutation: den stop-Eintrag der bot-Zeile entfernen -> T3 rot.)
 *  T4  Gast-Fenster bleiben offen: Play/Run, Terminal, Token, Profil stehen
 *      nach dem Abmelden weiter offen, und der Laufzustand (body.cr-in-run)
 *      wird nicht angefasst.
 *      (Mutation: 'run' in die Liste aufnehmen -> T4 rot.)
 *  T5  Umgekehrte Richtung: Anmelden oeffnet KEIN Fenster von selbst, und die
 *      Dock-Knoepfe der Liste kommen zurueck (computed display != none).
 *      (Mutation: die erzeugte body.cr-guest-Regel ohne den Gast-Scope
 *       schreiben -> T5 rot.)
 *  T6  DIE LISTE IST DAS, WAS ARBEITET. Zweiter Durchlauf, identisch, nur mit
 *      geleerter CR_CONNECT_EXCLUSIVE: dann bleibt #win-bot offen. Wer das
 *      Schliessen an der Liste vorbei verdrahtet, macht T6 rot — und genau so
 *      rutscht sonst ein spaeter hinzugefuegtes Fenster wieder durch.
 *  T7  Oeffnen-Sperre + Regression: als Gast oeffnet osOpenWindowMulti kein
 *      Fenster der Liste (auch nicht ueber die bot->Profile-Umleitung), das
 *      Banner meldet mindestens v1.0.930, die vier Tore / der Spion / der
 *      Market-Pfad stehen unveraendert im Quelltext, single-file, kein neuer
 *      <script src>.
 *
 * Aufruf:  node scripts/check_v930_gast_fenster_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const FILE = 'ChartRunner_Prototype.html';
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; const d = x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600);
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

/* Ein Durchlauf: booten, anmelden, alle Fenster der Liste oeffnen, abmelden.
 * emptyList=true leert CR_CONNECT_EXCLUSIVE unmittelbar VOR dem Abmelden —
 * das ist die Gegenprobe T6. */
async function run(browser, emptyList){
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message || String(e)));
  /* Die Erstnutzer-Tour schliesst beim Start JEDES offene Fenster
     (_frOpenStepApp) — sie wuerde die Messung uebernehmen und den Befund
     verdecken. Sie ist cookie-gegatet; „schon gelaufen" schaltet sie ab. */
  await page.addInitScript(() => {
    try { localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done: true })); } catch (_) {}
  });
  await page.goto('file://' + path.resolve(FILE), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#win-bot', { state: 'attached', timeout: 20000 });
  await page.waitForFunction(() => typeof window.crApplyAccessGates === 'function'
    && Array.isArray(window.CR_CONNECT_EXCLUSIVE), { timeout: 20000 });
  // Die Bot-Oberflaeche zeichnet spaet (eigene IIFE weit hinten in der Datei).
  await page.waitForFunction(() => typeof window.__crRenderBotAgents === 'function', { timeout: 20000 });

  return { page, errors, out: await page.evaluate(async (opts) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const vis = el => { if(!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    const dsp = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el).display : null; };
    const txt = id => { const el = document.getElementById(id); return el ? (el.innerHTML || '').trim() : null; };

    /* ── Spion auf die Takte. Muss VOR dem Anmelden stehen, damit jedes
       Intervall der angemeldeten Phase erfasst wird. ─────────────────── */
    const liveIntervals = new Map();   // id -> Herkunft (Stack), damit ein Leck benennbar ist
    const _si = window.setInterval, _ci = window.clearInterval;
    window.setInterval = function(){
      const id = _si.apply(window, arguments);
      let where = ''; try { where = (new Error()).stack.split('\n').slice(1, 4).join(' | '); } catch(_){}
      liveIntervals.set(id, where);
      return id;
    };
    window.clearInterval = function(id){ liveIntervals.delete(id); return _ci.call(window, id); };

    /* ── Anmelden: genau das Bit, das crConnected() liest. ────────────── */
    const acct = window.crAccount || (window.crAccount = {});
    let signedIn = false;
    acct.isSignedIn = function(){ return signedIn; };
    signedIn = true;
    try { if(window.crBotGate && window.crBotGate.check) window.crBotGate.check(); } catch(_){}
    window.crApplyAccessGates();
    await sleep(50);

    const list = (window.CR_CONNECT_EXCLUSIVE || []).map(e => ({ id:e.id, win:e.win, progs:e.progs||[], label:e.label||e.id }));

    /* Guthaben an offenen Gast-Fenstern, die NICHT angefasst werden duerfen. */
    const GUEST_WINS = ['run','terminal','tokenterm','wallet'];
    GUEST_WINS.forEach(p => { try { window.osOpenWindowMulti(p); } catch(_){} });
    document.body.classList.add('cr-in-run');   // Laufzustand-Marke

    /* Alle Fenster der Liste oeffnen — ueber den KANONISCHEN Opener bzw. das
       eigene open() der selbst-injizierten Apps. */
    for(const e of list){
      try {
        if(e.id === 'arena' && window.crArena) window.crArena.open();
        else if(e.id === 'walletintel' && window.crWalletIntel) window.crWalletIntel.open();
        else window.osOpenWindowMulti(e.progs[0] || e.id);
      } catch(_){}
    }
    await sleep(120);
    try { window.__crRenderBotAgents(); } catch(_){}
    await sleep(60);

    /* Ein echter Takt des Bot-Terminals, ueber seine oeffentliche API. */
    let agentPollStarted = false;
    try { if(window.crAgentEvents && window.crAgentEvents.start){ window.crAgentEvents.start(3000); agentPollStarted = true; } } catch(_){}
    const intervalsWhileSignedIn = new Map(liveIntervals);

    const onWinsBeforeOut = () => Array.from(document.querySelectorAll('.os-window.on')).map(w => w.id).sort();
    const openedIn = {};
    list.forEach(e => { const el = document.getElementById(e.win); openedIn[e.id] = !!(el && el.classList.contains('on')); });
    const botFilledIn = {
      crBotAgents: (txt('crBotAgents') || '').length,
      crBotChatMsgs: (txt('crBotChatMsgs') || '').length,
      crBotChatLog: (txt('crBotChatLog') || '').length
    };
    const dockWhileSignedIn = {};
    list.forEach(e => (e.progs || []).forEach(p => {
      dockWhileSignedIn[p] = dsp('.dockBtn[data-prog="' + p + '"]');
    }));
    const openBeforeOut = onWinsBeforeOut();

    /* ── T6-Gegenprobe: die Liste leeren, sonst nichts aendern. ───────── */
    if(opts.emptyList){ try { window.CR_CONNECT_EXCLUSIVE.length = 0; } catch(_){} }

    /* ── Abmelden. Derselbe Aufruf, den crAccount._gatesSync macht. ───── */
    signedIn = false;
    window.crApplyAccessGates();
    /* 1.4 s statt 150 ms, und das ist kein Zufallswert: die Live-Rooms-Direktory
       von Docs haengt an einem 1-s-Waechter, der seinen 60-s-Kindtakt erst beim
       naechsten Tick nach dem Schliessen loescht. Der Takt haelt also von selbst
       an — gemessen wird der eingeschwungene Zustand, nicht ein Schnappschuss
       mitten im Ausklingen. Der Takt des Bot-Terminals (crAgentEvents, 3 s)
       loescht sich NIE von selbst; wer den stop-Eintrag entfernt, wird auch nach
       jeder Wartezeit rot. */
    await sleep(1400);

    const afterOut = {};
    list.forEach(e => {
      const el = document.getElementById(e.win);
      afterOut[e.id] = { present: !!el, on: !!(el && el.classList.contains('on')),
                         focus: !!(el && el.classList.contains('focus')), visible: vis(el) };
    });
    const botCleared = {
      crBotAgents: txt('crBotAgents'),
      crBotChatMsgs: txt('crBotChatMsgs'),
      crBotChatLog: txt('crBotChatLog'),
      crBotChatSessionSel: txt('crBotChatSessionSel'),
      crBotChatInput: (document.getElementById('crBotChatInput') || {}).value
    };
    const openAfterOut = Array.from(document.querySelectorAll('.os-window.on')).map(w => w.id).sort();
    const guestWinsAfterOut = {};
    GUEST_WINS.forEach(p => { const el = document.getElementById('win-' + p); guestWinsAfterOut[p] = !!(el && el.classList.contains('on')); });

    /* Intervalle, die WAEHREND der angemeldeten Phase entstanden und noch leben. */
    const leaked = [];
    intervalsWhileSignedIn.forEach((where, id) => { if(liveIntervals.has(id)) leaked.push({ id, where }); });
    const agentPollStopped = !!(window.crAgentEvents && window.crAgentEvents.getLastStatus
      && /stopped/i.test(window.crAgentEvents.getLastStatus().error || ''));

    /* ── Oeffnen-Sperre als Gast (T7). ───────────────────────────────── */
    const blockedAsGuest = {};
    for(const e of list){
      try { window.osOpenWindowMulti(e.progs[0] || e.id); } catch(_){}
      const el = document.getElementById(e.win);
      blockedAsGuest[e.id] = !!(el && el.classList.contains('on'));
    }
    // Die bot->Profile-Umleitung darf die Sperre nicht unterlaufen.
    try { document.querySelectorAll('.os-window.on').forEach(w => w.classList.remove('on')); } catch(_){}
    try { window.CR_BOTTERM_TO_COACH = true; window.osOpenWindowMulti('bot'); } catch(_){}
    await sleep(30);
    const botRedirectLeak = !!(document.getElementById('win-wallet') || {}).classList
      && document.getElementById('win-wallet').classList.contains('on');
    const dockAsGuest = {};
    list.forEach(e => (e.progs || []).forEach(p => {
      dockAsGuest[p] = dsp('.dockBtn[data-prog="' + p + '"]');
    }));

    /* ── Wieder anmelden (T5). ───────────────────────────────────────── */
    try { document.querySelectorAll('.os-window.on').forEach(w => w.classList.remove('on')); } catch(_){}
    window.CR_BOTTERM_TO_COACH = false;
    signedIn = true;
    try { if(window.crBotGate && window.crBotGate.check) window.crBotGate.check(); } catch(_){}
    window.crApplyAccessGates();
    await sleep(120);
    const openAfterSignInAgain = Array.from(document.querySelectorAll('.os-window.on')).map(w => w.id);
    const dockAfterSignIn = {};
    list.forEach(e => (e.progs || []).forEach(p => {
      dockAfterSignIn[p] = dsp('.dockBtn[data-prog="' + p + '"]');
    }));
    // Nach erneutem Oeffnen muss das Terminal wieder Inhalt haben (kein
    // Kollateralschaden des Leerens).
    try { window.osOpenWindowMulti('bot'); } catch(_){}
    await sleep(120);
    const botRefilled = (txt('crBotAgents') || '').length;

    window.setInterval = _si; window.clearInterval = _ci;
    return { list, openedIn, botFilledIn, dockWhileSignedIn, openBeforeOut, openAfterOut,
             afterOut, botCleared, guestWinsAfterOut,
             leaked, agentPollStarted, agentPollStopped, blockedAsGuest, botRedirectLeak,
             dockAsGuest, openAfterSignInAgain, dockAfterSignIn, botRefilled };
  }, { emptyList: !!emptyList }) };
}

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const browser = await chromium.launch(launchOptions());

  console.log('\n── Hauptlauf (Liste aktiv) ──────────────────────────────────');
  const main = await run(browser, false);
  const r = main.out;
  console.log('  Liste: ' + r.list.map(e => e.id + '→#' + e.win).join(' · '));

  // ── T1 ──────────────────────────────────────────────────────────────
  check('T1a Bot-Terminal war angemeldet offen und gefuellt',
    r.openedIn.bot === true && r.botFilledIn.crBotAgents > 0,
    { openedIn: r.openedIn.bot, filled: r.botFilledIn });
  check('T1b #win-bot ist nach dem Abmelden GESCHLOSSEN (kein .on, kein .focus)',
    r.afterOut.bot && r.afterOut.bot.on === false && r.afterOut.bot.focus === false, r.afterOut.bot);
  check('T1c #win-bot ist wirklich unsichtbar, nicht nur entklassifiziert',
    r.afterOut.bot && r.afterOut.bot.visible === false, r.afterOut.bot);
  check('T1d Chatverlauf / Nachrichten / Agenten sind leer',
    r.botCleared.crBotAgents === '' && r.botCleared.crBotChatMsgs === '' && r.botCleared.crBotChatLog === '',
    r.botCleared);
  check('T1e Sitzungsauswahl und Eingabe sind leer',
    r.botCleared.crBotChatSessionSel === '' && !r.botCleared.crBotChatInput, r.botCleared);

  // ── T2 ──────────────────────────────────────────────────────────────
  const others = r.list.filter(e => e.id !== 'bot');
  check('T2a jedes weitere Fenster der Liste war angemeldet offen',
    others.every(e => r.openedIn[e.id] === true),
    others.map(e => [e.id, r.openedIn[e.id]]));
  check('T2b jedes weitere Fenster der Liste ist nach dem Abmelden geschlossen',
    others.every(e => r.afterOut[e.id] && r.afterOut[e.id].on === false && r.afterOut[e.id].visible === false),
    others.map(e => [e.id, r.afterOut[e.id]]));
  /* T2a/T2b lesen die Liste zur Laufzeit — ein SPAETER ERGAENZTES Fenster wird
     dadurch automatisch mitgeprueft. Genau deshalb koennen sie eine ENTFERNTE
     Zeile nicht sehen: die Menge schrumpft mit. Gegengewicht ist dieser eine
     festgeschriebene Satz — der, den Julian im PR bestaetigt hat. Wer eine
     Zeile herausnimmt, wird hier rot. */
  const BESTAETIGT = ['win-bot','win-walletapp','win-settings','win-display','crArenaWin','crWalletIntelWin'];
  check('T2c die Liste enthaelt mindestens die bestaetigten Fenster',
    BESTAETIGT.every(w => r.list.some(e => e.win === w)),
    { erwartet: BESTAETIGT, ist: r.list.map(e => e.win) });

  // ── T3 ──────────────────────────────────────────────────────────────
  check('T3a der Takt des Bot-Terminals lief waehrend der Anmeldung', r.agentPollStarted === true);
  check('T3b kein Intervall der angemeldeten Phase laeuft nach dem Abmelden weiter',
    r.leaked.length === 0, r.leaked);
  check('T3c der Ereignis-Poller meldet sich selbst als gestoppt', r.agentPollStopped === true);

  // ── T4 ──────────────────────────────────────────────────────────────
  check('T4a Gast-Fenster (Play/Run, Terminal, Token, Profil) bleiben offen',
    Object.values(r.guestWinsAfterOut).every(Boolean), r.guestWinsAfterOut);
  // Was das Abmelden geschlossen hat, muss GENAU die Liste sein — kein Fenster
  // mehr, keines weniger. Nimmt man 'run' in die Liste auf, wird das rot.
  {
    const closed = r.openBeforeOut.filter(id => r.openAfterOut.indexOf(id) < 0).sort();
    const expect = r.list.map(e => e.win).filter(w => r.openBeforeOut.indexOf(w) >= 0).sort();
    check('T4b geschlossen wurde GENAU die Liste, kein Fenster darueber hinaus',
      closed.length > 0 && JSON.stringify(closed) === JSON.stringify(expect),
      { geschlossen: closed, erwartet: expect, vorher: r.openBeforeOut });
  }

  // ── T5 ──────────────────────────────────────────────────────────────
  check('T5a Anmelden oeffnet kein Fenster von selbst',
    r.openAfterSignInAgain.length === 0, r.openAfterSignInAgain);
  /* Gemessen wird nur an den Knoepfen, die angemeldet UEBERHAUPT sichtbar sind —
     maps/journal sind seit v1.0.661 fuer alle zurueckgezogen und beweisen nichts. */
  const dockProgs = Object.keys(r.dockWhileSignedIn)
    .filter(p => r.dockWhileSignedIn[p] && r.dockWhileSignedIn[p] !== 'none');
  check('T5b als Gast ist KEIN Dock-Knopf der Liste sichtbar',
    dockProgs.length > 0 && dockProgs.every(p => r.dockAsGuest[p] === 'none'),
    { geprueft: dockProgs, gast: r.dockAsGuest });
  check('T5c nach dem Anmelden sind dieselben Dock-Knoepfe zurueck',
    dockProgs.length > 0 && dockProgs.every(p => r.dockAfterSignIn[p] !== 'none'),
    { geprueft: dockProgs, nachher: r.dockAfterSignIn });
  check('T5d das wieder geoeffnete Terminal ist nicht dauerhaft leer',
    r.botRefilled > 0, r.botRefilled);

  // ── T7 (Oeffnen-Sperre) ─────────────────────────────────────────────
  check('T7a als Gast oeffnet kein Fenster der Liste',
    Object.values(r.blockedAsGuest).every(v => v === false), r.blockedAsGuest);
  check('T7b die bot→Profile-Umleitung unterlaeuft die Sperre nicht',
    r.botRedirectLeak === false);
  check('T7c keine Seitenfehler im Hauptlauf', main.errors.length === 0, main.errors);
  await main.page.close();

  // ── T6: derselbe Lauf mit geleerter Liste ───────────────────────────
  console.log('\n── Gegenprobe (Liste geleert) ───────────────────────────────');
  const mut = await run(browser, true);
  check('T6 mit geleerter CR_CONNECT_EXCLUSIVE bleibt #win-bot offen — die Liste ist das, was arbeitet',
    mut.out.afterOut && Object.keys(mut.out.afterOut).length > 0
      && mut.out.afterOut.bot && mut.out.afterOut.bot.on === true,
    mut.out.afterOut && mut.out.afterOut.bot);
  await mut.page.close();
  await browser.close();

  // ── T7 Regression im Quelltext ──────────────────────────────────────
  console.log('\n── Regression ───────────────────────────────────────────────');
  const bv = (html.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('T7d Banner meldet mindestens v1.0.930',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || bv[2] >= 930))), bv);
  ['armedGlobal','source.armed','badgeGate','walletCanSign'].forEach(g =>
    check('T7e Tor „' + g + '" steht weiter im Quelltext', html.indexOf(g) >= 0));
  check('T7f crVaultLimit / crOnchainLimit und die beiden ARM-Speicher unveraendert',
    /crVaultLimit/.test(html) && /crOnchainLimit/.test(html)
    && /'cr_arm_v1'/.test(html) && /'cr_arm_limit_v1'/.test(html));
  check('T7g single-file: kein statisches <script src="http…">',
    (html.match(/<script[^>]*\bsrc="https?:/gi) || []).length === 0);

  console.log('\n' + (fail === 0 ? 'ALLE ' + pass + ' PRUEFUNGEN GRUEN' : fail + ' FEHLGESCHLAGEN, ' + pass + ' gruen'));
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error(err && err.stack ? err.stack : err); process.exit(1); });
