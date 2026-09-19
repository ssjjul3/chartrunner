/* Smoke-Verifikation v1.0.937 — pricing.html AUF DEM INTENT-PFAD.
 *
 * BEFUND, den diese Datei absichert (gemessen am Quelltext v1.0.936):
 * `chartrunner-prototype/pricing.html` trug mit `MERCHANT_SOL` eine fest
 * verdrahtete Zahladresse und baute den SOL-Betrag im Browser aus einem
 * Coingecko-Kurs. Die so entstandene Zahlung trug KEINE `reference` — der
 * Verifizierer im Worker kann sie niemandem zuordnen, einen Erstattungspfad
 * gibt es in diesem Repo nicht. Fehlte der Kurs, entstand sogar ein Link mit
 * `amount=0`. v1.0.934 hat denselben Fehler in den beiden Spiel-Dialogen
 * behoben und diese Seite ausdruecklich offen gelassen.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, an der Stelle, an der die
 * Frage entschieden wird: AM DOM DES DIALOGS. Nicht an einer Absicht, nicht an
 * einem Aufruf — ein Nutzer tippt auf das, was dasteht.
 *
 * Zwei Doppel, beide VOR jedem Skript der Seite:
 *   · supabase-js (jsdelivr) wird durch einen Stub ersetzt, der die Sitzung aus
 *     `window.__v937.session` liefert und `onAuthStateChange`-Rueckrufe
 *     sammelt. Damit wird die ECHTE Naht gemessen, an der die Seite die
 *     Anmeldung abliest, keine eigens eingezogene Testvariable.
 *   · fetch fuer /v1/pay/sol/intent und /status (window.__v937.mode:
 *     'ok' | 'throw' | 'hang' | 'http500'). *.workers.dev ist aus dieser
 *     Sandbox ohnehin nicht erreichbar; ein Test, der davon abhinge, waere
 *     gruen aus dem falschen Grund.
 *
 * T1  Die Seite sagt die Bedingung VORHER (Weg A) — an der Karte, vor dem Klick.
 * T2  Abgemeldet — kein `solana:`, keine Adresse, kein Betrag, kein Intent-Abruf;
 *     und DERSELBE offene Dialog schaltet um, sobald eine Anmeldung eintrifft.
 * T3  Intent scheitert (Wurf / HTTP 500) — ehrliche Meldung, KEIN Rueckfall.
 * T4  Intent haengt — deaktivierter <button>, kein <a href>, nur Platzhalter.
 * T5  Intent kommt — Adresse, Betrag und `reference` stammen ALLE aus der
 *     Antwort; eine Antwort ohne `treasury` fuehrt in den Fehlerzustand, eine
 *     ohne Betrag zu einer Adresse OHNE ausfuehrbaren Link.
 * T6  Cluster — 'devnet' erzeugt den Testzahlungs-Hinweis, 'mainnet-beta' nicht,
 *     ein fehlendes Feld aendert nichts.
 * T7  Polling — die Status-Abfrage traegt die `reference`; 'confirmed' zeigt die
 *     Freischaltung an, ohne dass jemand etwas anklicken muss.
 * T8  Quelltext — keine Adresse, keine Client-Konstante, kein Kursabruf, keine
 *     `indexOf('REPLACE')`-Wache; der Link wird aus GENAU EINER Quelle gebaut.
 * T9  Texte — keine simulierten Trades mehr, kein behaupteter Umbau der
 *     Kartenlinks, die Version steht sichtbar auf der Seite.
 * T10 Der Kartenweg funktioniert unveraendert UND gaesteoffen: ein Klick ohne
 *     Anmeldung landet auf dem echten Stripe-Link (gemessen an der URL, zu der
 *     der Browser tatsaechlich navigiert).
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet (CLAUDE.md · ROT/CRASH/GRUEN). Jede
 * Mutation wurde EINZELN in chartrunner-prototype/pricing.html eingebaut, die
 * Suite lief vollstaendig, danach hat `git checkout` wiederhergestellt. KEINE
 * davon war CRASH: jeder Lauf ging durch und R1 ("keine harten Page-Errors")
 * blieb jedes Mal gruen — rot wurde nur, was die jeweilige Zeile behauptet.
 * Gruen gebliebene Nachbarzeilen sind mitprotokolliert: sie sagen, WELCHE
 * Wache eine Zeile tatsaechlich misst.
 *
 *   M1  `uri()`: beide Wachen gestrichen und der v936-Rueckfall wieder
 *       eingesetzt — Adresse als Literal, Betrag zurueck auf die Ratecard.
 *       ROT: T4a, T4b, T5h, T8a, T8d  (44 gruen)
 *       T2 und T3 bleiben gruen und MUESSEN es: der abgemeldete Zustand und
 *       der Fehlerzustand malen paintPay() nie, der Rueckfall ist dort gar
 *       nicht erreichbar. T5g bleibt gruen, weil die ZWEITE Wache in
 *       startIntent (j.treasury) noch steht — T4/T5h messen die Wache in
 *       uri(), T5g die in startIntent.
 *   M2  `boot()`: `phase = _authSettled ? 'signedout' : 'auth'` durch
 *       `phase = 'ready'` ersetzt.
 *       ROT: T2b, T2c, T2e  (46 gruen)
 *       T2a bleibt gruen — ohne Intent malt paintPay() nur Platzhalter, es
 *       entsteht KEINE Adresse und kein `solana:`. Kaputt ist damit nicht das
 *       Zahlungsziel, sondern die Unterscheidbarkeit des abgemeldeten
 *       Zustands: der Nutzer sieht eine Zahltafel, die nie eine werden kann.
 *       T2d bleibt gruen, weil startIntent ohne Token weiterhin abbricht.
 *   M3  `startIntent()`: `.catch(fail)` zurueck auf `.catch(function(){})`.
 *       ROT: T3a, T3c  (47 gruen)
 *       T3b bleibt gruen (es wird ja nichts gemalt — genau das ist der alte
 *       Fehler: der Dialog bleibt still im Wartezustand stehen). T3d bleibt
 *       gruen, weil HTTP 500 ueber den then-Zweig (r.ok false -> null) laeuft
 *       und nicht ueber catch — die beiden Zeilen pruefen wirklich zwei Wege.
 *   M4  `startIntent()`: `j.reference && j.treasury` auf `j.reference`
 *       verkuerzt (Antwort ohne treasury wird akzeptiert).
 *       ROT: T5g  (48 gruen)
 *       T5h bleibt gruen: ohne Rueckfall entsteht keine FALSCHE Adresse, nur
 *       ein leeres Feld. Deshalb pruefen T5g und T5h getrennt.
 *   M5  `paintPay()`: der disabled-Zweig durch den <a href>-Zweig ersetzt.
 *       ROT: T4a  (48 gruen)
 *       T4b bleibt gruen — uri() gibt weiter '' zurueck, der Link ist leer.
 *       Der Knopf war also wieder klickbar, ohne Ziel: eine Sackgasse, aber
 *       keine falsche Zahlung. Genau dafuer steht T4a getrennt da.
 *   M6  `clusterIsMain`: 'devnet' zusaetzlich als mainnet gefuehrt.
 *       ROT: T6a  (48 gruen) — die Testzahlung sah aus wie eine echte.
 *   M7  die `.pay-req`-Zeile an der Pro-Karte gestrichen (Weg A wird erst im
 *       Dialog angesagt, nicht mehr davor).
 *       ROT: T1a, T1b, T1c  (46 gruen)
 *       T2b bleibt gruen: der Dialog sagt es weiterhin — nur eben zu spaet.
 *       Das ist der Unterschied, den T1 misst.
 *   M8  `startPoll()`: die `reference` aus der Status-URL entfernt.
 *       ROT: T7a  (48 gruen)
 *       T7c bleibt gruen, weil das Doppel auch ohne Parameter 'confirmed'
 *       liefert: eine Freischaltung, die nicht mehr an DIESE Zahlung gebunden
 *       ist. Genau deshalb prueft T7a die URL und nicht nur das Ergebnis.
 *   M9  die alte Coach-Note ("In-game trades are simulated") wieder eingesetzt.
 *       ROT: T9a, T9b  (47 gruen)
 *       T9c bleibt gruen — die Fussnote ist eine zweite Stelle mit derselben
 *       Behauptung und wird getrennt geprueft.
 *  M10  die `indexOf('REPLACE')`-Wachen im Stripe-Zweig wieder eingesetzt.
 *       ROT: T8e  (48 gruen)
 *       T10a/T10b bleiben gruen — und das ist der Befund, nicht ein Mangel:
 *       die Bedingung war TOT. Mit echten Links aendert sie am Verhalten
 *       nichts, sie tut nur so, als warne sie. Deshalb misst T8e den Quelltext
 *       und T10 das Verhalten; nur beide zusammen sagen das Richtige.
 *  M11  der sichtbare Versionsstempel entfernt.
 *       ROT: T9f  (48 gruen)
 *  M12  die Konten-Schicht liefert auch ohne Sitzung ein Token ('anon') — der
 *       Fall "abgemeldet" verschwindet.
 *       ROT: T2a, T2b, T2c, T2d  (45 gruen)
 *       Hier wird `solana:` samt Adresse und Betrag fuer jemanden gebaut, dem
 *       der Worker nichts gutschreiben koennte. T1 bleibt gruen: die Ansage an
 *       der Karte steht noch da, sie stimmt nur nicht mehr.
 *
 * Aufruf:  node scripts/check_v937_pricing_intent_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'chartrunner-prototype', 'pricing.html');
const HTML = fs.readFileSync(FILE, 'utf8');
// Der Kopfkommentar ZITIERT den alten Zustand woertlich (`MERCHANT_SOL`,
// `amount=0`) — er muss das, sonst steht dort nicht, was der Patch behebt.
// T8 fragt nach CODE, also fallen Kommentare vorher weg. Die ADRESSE selbst
// wird gegen die ganze Datei geprueft: die darf auch in Prosa nicht vorkommen.
const CODE = HTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x).slice(0, 700) : '')); }
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

// Die alte Client-Adresse. Steht NUR hier, damit T8 nach ihr suchen kann.
const OLD_TREASURY = 'F4XgsVpo3DQv7SiHA2yhqVY2uepb49p2WPKQWPMqWvnm';
// Die Adresse, die im Test der Worker liefert — absichtlich NICHT die alte:
// nur so ist unterscheidbar, woher die angezeigte Adresse stammt.
const WORKER_TREASURY = 'WkR937TreasuryFromWorkerZZZZZZZZZZZZZZZZZZZZ';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  // supabase-js-Doppel + Auffangnetz fuer alles andere Netz.
  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    if(/supabase-js/.test(url)){
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: `
        window.supabase = { createClient: function(){ return { auth: {
          getSession: function(){ return Promise.resolve({ data: { session: window.__v937.session } }); },
          onAuthStateChange: function(cb){ window.__v937.authCbs.push(cb); }
        } }; } };
      ` });
    }
    if(/buy\.stripe\.com/.test(url)){
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stripe stub</title>' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    window.__v937 = { mode: 'ok', body: null, status: 'pending', session: null, authCbs: [], calls: [] };
    const real = window.fetch;
    window.fetch = function(input){
      const u = String((input && input.url) ? input.url : input);
      window.__v937.calls.push(u);
      const json = (o, st) => Promise.resolve(new Response(JSON.stringify(o), {
        status: st || 200, headers: { 'Content-Type': 'application/json' } }));
      if(/\/v1\/pay\/sol\/intent/.test(u)){
        const m = window.__v937.mode;
        if(m === 'throw')   return Promise.reject(new TypeError('v937: Failed to fetch'));
        if(m === 'hang')    return new Promise(function(){});
        if(m === 'http500') return Promise.resolve(new Response('', { status: 500 }));
        return json(window.__v937.body || {});
      }
      if(/\/v1\/pay\/sol\/status/.test(u)) return json({ status: window.__v937.status });
      return real.apply(this, arguments);
    };
  });

  const URL0 = pathToFileURL(FILE).href;
  await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    window.__v937.dom = function(){
      const o = document.querySelector('.pay-overlay');
      return o ? o.outerHTML : null;
    };
    window.__v937.closeAll = function(){
      document.querySelectorAll('.pay-overlay').forEach(d => d.remove());
    };
    window.__v937.signIn = function(tok){
      window.__v937.session = { access_token: tok };
      window.__v937.authCbs.forEach(cb => { try { cb('SIGNED_IN', { access_token: tok }); } catch(_){} });
    };
  });

  const setMode = (mode, body) => page.evaluate(o => {
    window.__v937.mode = o.mode;
    window.__v937.body = o.body || null;
    window.__v937.calls.length = 0;
    window.__v937.closeAll();
  }, { mode, body: body || null });
  const openSol = async (ms) => {
    await page.evaluate(() => document.querySelector('[data-sol]').click());
    await page.waitForTimeout(ms || 320);
  };
  const dom = () => page.evaluate(() => window.__v937.dom());

  const OK_BODY = { reference: 'V937REF', usdc: 12.34, sol: 0.077, treasury: WORKER_TREASURY };

  console.log('\n-- Boot --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|v937/i.test(m));
    check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
    check('das fetch-Doppel steht (sonst misst nichts hier etwas)',
      await page.evaluate(() => typeof window.__v937 === 'object' && Array.isArray(window.__v937.calls)));
    check('die Karten sind gerendert (Pro-Karte mit beiden Zahlknoepfen)',
      await page.evaluate(() => !!document.querySelector('[data-sol]') && !!document.querySelector('[data-stripe]')));
  }

  /* ═══ T1 — DIE BEDINGUNG STEHT VOR DEM KLICK (Weg A) ═════════════════════ */
  console.log('\n-- T1 · Weg A wird vorher angesagt --');
  {
    const req = await page.evaluate(() => {
      const e = document.querySelector('.pay-req');
      return e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
    });
    check('T1a an der Pro-Karte steht eine Bedingung, BEVOR jemand klickt', !!req, req);
    check('T1b sie nennt die Anmeldung fuer den On-chain-Weg',
      !!req && /signed-in|sign(ed)? in/i.test(req) && /on-chain/i.test(req), req);
    check('T1c sie sagt zugleich, dass der Kartenweg ohne Konto geht',
      !!req && /without an account|with or without/i.test(req), req);
  }

  /* ═══ T2 — ABGEMELDET ════════════════════════════════════════════════════ */
  console.log('\n-- T2 · abgemeldet --');
  await setMode('ok', OK_BODY);
  await openSol(900);
  {
    const d = await dom();
    check('T2a abgemeldet: KEIN `solana:` und KEINE alte Client-Adresse im DOM',
      !!d && d.indexOf('solana:') < 0 && d.indexOf('F4Xgs') < 0, d ? d.slice(0, 400) : d);
    check('T2b abgemeldet: kein Wallet-Knopf, sondern die Aufforderung zum Anmelden',
      !!d && /Sign in on \/play/.test(d) && d.indexOf('pmOpen') < 0, d ? d.slice(0, 500) : d);
    check('T2c abgemeldet: kein Betrag, keine Waehrungswahl',
      !!d && d.indexOf('paySeg') < 0 && d.indexOf('12.34') < 0, d ? d.slice(0, 400) : d);
    check('T2d abgemeldet: der Intent wurde gar nicht erst geholt',
      (await page.evaluate(() => window.__v937.calls.filter(u => /\/intent/.test(u)).length)) === 0);
  }
  {
    await page.evaluate(() => window.__v937.signIn('V937TOK'));
    await page.waitForTimeout(1300);
    const d = await dom();
    check('T2e Anmeldung waehrend der Dialog offen ist -> er schaltet auf die Zahltafel um',
      !!d && d.indexOf('Sign in on /play') < 0 && d.indexOf(WORKER_TREASURY) >= 0, d ? d.slice(0, 500) : d);
  }

  /* ═══ T3 — INTENT SCHEITERT ══════════════════════════════════════════════ */
  console.log('\n-- T3 · Intent scheitert --');
  await setMode('throw');
  await openSol();
  {
    const d = await dom();
    check('T3a fetch wirft: sichtbare Fehlermeldung statt stillem Wartezustand',
      !!d && d.indexOf('pmRetry') >= 0, d ? d.slice(0, 500) : d);
    check('T3b fetch wirft: kein `solana:`, keine Adresse, kein Betrag',
      !!d && d.indexOf('solana:') < 0 && d.indexOf('F4Xgs') < 0 && d.indexOf(WORKER_TREASURY) < 0 && d.indexOf('12.34') < 0,
      d ? d.slice(0, 500) : d);
    check('T3c fetch wirft: KEIN Wallet-Knopf, auch kein Rest der Zahltafel',
      !!d && d.indexOf('pmOpen') < 0 && d.indexOf('paySeg') < 0, d ? d.slice(0, 500) : d);
  }
  await setMode('http500');
  await openSol();
  {
    const d = await dom();
    check('T3d HTTP 500 ist derselbe Fall wie ein Wurf (r.ok false -> null -> Fehler)',
      !!d && d.indexOf('pmRetry') >= 0 && d.indexOf('solana:') < 0, d ? d.slice(0, 500) : d);
  }

  /* ═══ T4 — INTENT HAENGT ═════════════════════════════════════════════════ */
  console.log('\n-- T4 · Intent haengt --');
  await setMode('hang');
  await openSol(450);
  {
    const d = await dom();
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.pmOpen');
      return b ? { tag: b.tagName, disabled: !!b.disabled, href: b.getAttribute('href') } : null;
    });
    check('T4a der Wallet-Knopf ist ein deaktivierter <button>, kein <a href>',
      !!btn && btn.tag === 'BUTTON' && btn.disabled === true && btn.href === null, btn);
    check('T4b Wartezustand: kein `solana:`, keine Adresse, kein Betrag — Platzhalter',
      !!d && d.indexOf('solana:') < 0 && d.indexOf('F4Xgs') < 0 && d.indexOf(WORKER_TREASURY) < 0 && d.indexOf('12.34') < 0,
      d ? d.slice(0, 500) : d);
    check('T4c der Wartezustand ist SICHTBAR (die Tafel steht, nur ohne Ziel)',
      !!d && d.indexOf('paySeg') >= 0, d ? d.slice(0, 500) : d);
  }

  /* ═══ T5 — INTENT KOMMT ══════════════════════════════════════════════════ */
  console.log('\n-- T5 · Intent kommt --');
  await setMode('ok', OK_BODY);
  await openSol();
  {
    const d = await dom();
    const href = await page.evaluate(() => { const a = document.querySelector('.pmOpen'); return a ? a.getAttribute('href') : null; });
    check('T5a die angezeigte Adresse ist die des Workers', !!d && d.indexOf(WORKER_TREASURY) >= 0, d ? d.slice(0, 500) : d);
    check('T5b der angezeigte Betrag stammt aus der Antwort (12.34), nicht aus der Ratecard (9.99)',
      !!d && d.indexOf('12.34') >= 0 && !/>9\.99 <small>USDC/.test(d), d ? d.slice(0, 600) : d);
    check('T5c der Link traegt Adresse, Betrag UND reference — alle drei aus der Antwort',
      !!href && href.indexOf('solana:' + WORKER_TREASURY) === 0 && /amount=12\.34/.test(href) && /reference=V937REF/.test(href), href);
    check('T5d nie `amount=0`', !!href && !/amount=0(&|$)/.test(href), href);
    check('T5e nirgends im DOM die alte Client-Adresse', !!d && d.indexOf('F4Xgs') < 0);
  }
  // SOL-Seite: der Betrag kommt auch hier aus der Antwort, nicht aus einem Kurs.
  {
    await page.evaluate(() => document.querySelector('#paySeg button[data-cur="SOL"]').click());
    await page.waitForTimeout(200);
    const href = await page.evaluate(() => { const a = document.querySelector('.pmOpen'); return a ? a.getAttribute('href') : null; });
    check('T5f SOL: Betrag aus der Antwort (0.077), mit reference, ohne spl-token',
      !!href && /amount=0\.077/.test(href) && /reference=V937REF/.test(href) && href.indexOf('spl-token') < 0, href);
  }
  await setMode('ok', { reference: 'V937REF', usdc: 12.34, sol: 0.077 });
  await openSol();
  {
    const d = await dom();
    check('T5g Antwort ohne `treasury` -> Fehlerzustand, KEINE Adresse aus dem Client',
      !!d && d.indexOf('F4Xgs') < 0 && d.indexOf('solana:') < 0 && d.indexOf('pmRetry') >= 0, d ? d.slice(0, 500) : d);
  }
  await setMode('ok', { reference: 'V937REF', treasury: WORKER_TREASURY });
  await openSol();
  {
    const d = await dom();
    check('T5h Antwort ohne Betrag -> Adresse steht, aber KEIN ausfuehrbarer Link',
      !!d && d.indexOf(WORKER_TREASURY) >= 0 && d.indexOf('solana:') < 0, d ? d.slice(0, 500) : d);
  }

  /* ═══ T6 — CLUSTER ═══════════════════════════════════════════════════════ */
  console.log('\n-- T6 · Cluster --');
  await setMode('ok', Object.assign({}, OK_BODY, { chain: 'devnet' }));
  await openSol();
  {
    const d = await dom();
    check('T6a chain:"devnet" -> deutlicher Testzahlungs-Hinweis, Cluster genannt',
      !!d && /TEST PAYMENT/i.test(d) && d.indexOf('devnet') >= 0, d ? d.slice(0, 600) : d);
  }
  await setMode('ok', Object.assign({}, OK_BODY, { chain: 'mainnet-beta' }));
  await openSol();
  {
    const d = await dom();
    check('T6b chain:"mainnet-beta" -> kein Warnhinweis, Cluster wird nur genannt',
      !!d && !/TEST PAYMENT/i.test(d) && d.indexOf('mainnet-beta') >= 0, d ? d.slice(0, 600) : d);
  }
  await setMode('ok', OK_BODY);
  await openSol();
  {
    const d = await dom();
    check('T6c fehlt das Feld, wird nichts geraten (kein Cluster, kein Hinweis)',
      !!d && !/TEST PAYMENT/i.test(d) && d.indexOf('mainnet') < 0, d ? d.slice(0, 600) : d);
  }

  /* ═══ T7 — POLLING UND FREISCHALTUNG ═════════════════════════════════════ */
  console.log('\n-- T7 · Polling --');
  {
    await page.waitForTimeout(4400);
    const st = await page.evaluate(() => window.__v937.calls.filter(u => /\/status/.test(u)));
    check('T7a die Status-Abfrage laeuft und traegt die `reference` aus der Antwort',
      st.length > 0 && /reference=V937REF/.test(st[0]), st.slice(0, 2));
    const d = await dom();
    check('T7b solange offen: sichtbarer Wartezustand, kein manueller Schritt verlangt',
      !!d && /Waiting for your payment/i.test(d), d ? d.slice(0, 600) : d);
  }
  {
    await page.evaluate(() => { window.__v937.status = 'confirmed'; });
    await page.waitForTimeout(4400);
    const d = await dom();
    check('T7c `confirmed` -> die Freischaltung wird angezeigt, ohne Zutun',
      !!d && /Payment confirmed/i.test(d) && /Runner Pro is active/i.test(d), d ? d.slice(0, 600) : d);
    const n1 = await page.evaluate(() => window.__v937.calls.filter(u => /\/status/.test(u)).length);
    await page.waitForTimeout(4400);
    const n2 = await page.evaluate(() => window.__v937.calls.filter(u => /\/status/.test(u)).length);
    check('T7d nach `confirmed` hoert das Polling auf', n1 === n2, { n1, n2 });
    await page.evaluate(() => { window.__v937.status = 'pending'; window.__v937.closeAll(); });
  }

  /* ═══ T8 — QUELLTEXT ═════════════════════════════════════════════════════ */
  console.log('\n-- T8 · Quelltext --');
  {
    const hits = (HTML.match(/F4XgsVpo3DQv7SiHA2yhqVY2uepb49p2WPKQWPMqWvnm/g) || []).length;
    check('T8a die Adresskonstante kommt NULL mal in der Datei vor (auch nicht in Prosa)', hits === 0, { hits });
    check('T8b keine Client-Konstante fuer die Zahladresse mehr (MERCHANT_SOL ist raus)',
      CODE.indexOf('MERCHANT_SOL') < 0);
    check('T8c kein Kursabruf im Browser (kein Coingecko, kein solPrice)',
      CODE.indexOf('coingecko') < 0 && CODE.indexOf('solPrice') < 0);
    // Jede Stelle, die einen `solana:`-Link baut, wird aufgezaehlt und ihre
    // Quelle benannt. Es darf genau eine geben, und sie muss intent.treasury
    // sein — ein Literal oder eine zweite Variable faellt hier auf.
    const srcs = [];
    CODE.replace(/'solana:'\s*\+\s*([A-Za-z_$][\w$.]*|'[^']*')/g, (_m, g) => { srcs.push(g); return _m; });
    check('T8d der Link wird an GENAU EINER Stelle und NUR aus intent.treasury gebaut',
      srcs.length === 1 && srcs[0] === 'intent.treasury', srcs);
    check('T8e die toten `indexOf(\'REPLACE\')`-Wachen sind raus',
      (CODE.match(/indexOf\('REPLACE'\)/g) || []).length === 0);
    check('T8f der Betrag wird nie aus der Ratecard in einen Link gesetzt (amtFor liest nur den Intent)',
      /function amtFor\(c\)\{\s*if\(!intent\) return null;/.test(CODE.replace(/\s*\n\s*/g, ' ').replace(/function amtFor\(c\)\s*\{\s*/, 'function amtFor(c){')),
      (CODE.match(/function amtFor[\s\S]{0,160}/) || [''])[0]);
  }

  /* ═══ T9 — TEXTE ═════════════════════════════════════════════════════════ */
  console.log('\n-- T9 · Texte --');
  {
    const band = await page.evaluate(() => (document.querySelector('.legal-band') || {}).textContent || '');
    const foot = await page.evaluate(() => (document.querySelector('.fine-print') || {}).textContent || '');
    const fine = await page.evaluate(() => (document.querySelector('.price-fine') || {}).textContent || '');
    check('T9a die Coach-Note spricht nicht mehr von simulierten Trades',
      band.length > 0 && !/simulated/i.test(band), band.slice(0, 260));
    check('T9b die Coach-Note sagt stattdessen, dass auf Mainnet gehandelt wird',
      /mainnet/i.test(band) && /not a simulation|are real/i.test(band), band.slice(0, 260));
    check('T9c auch die Fussnote behauptet keine simulierten Trades mehr',
      foot.length > 0 && !/simulated/i.test(foot), foot.slice(0, 260));
    check('T9d kein behaupteter Umbau der anonymen Kartenlinks mehr',
      !/being reconfigured|being set up for the new prices/i.test(HTML), 'HTML');
    check('T9e kein "Phase 2"-Versprechen fuer die On-chain-Freischaltung mehr',
      !/Phase 2/.test(HTML) && !/the grant is manual/i.test(HTML), 'HTML');
    check('T9f die Seite nennt die Version sichtbar', /v1\.0\.937/.test(foot), foot.slice(-120));
    check('T9g die Erklaerzeile sagt, dass die Seite Adresse und Betrag NICHT baut',
      /builds none of them/i.test(fine), fine.slice(0, 400));
  }

  /* ═══ T10 — DER KARTENWEG, UNVERAENDERT UND GAESTEOFFEN ══════════════════ */
  console.log('\n-- T10 · Kartenweg --');
  {
    // Abgemeldet: die Seite frisch laden, damit keine Sitzung mehr steht.
    await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('[data-stripe]').click());
    await page.waitForTimeout(900);
    const u = page.url();
    check('T10a ohne Anmeldung fuehrt der Kartenknopf auf den echten Stripe-Link',
      /^https:\/\/buy\.stripe\.com\//.test(u), u);
    check('T10b und zwar auf den Monats-Link, der auf main steht',
      u === 'https://buy.stripe.com/6oU4gA1b2chK3cJa7LgMw06', u);
  }

  /* ═══ REGRESSION ═════════════════════════════════════════════════════════ */
  console.log('\n-- Regression --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|v937/i.test(m));
    check('R1 keine harten Page-Errors ueber den ganzen Lauf', hard.length === 0, hard.slice(0, 3));
  }

  await browser.close();
  console.log('\nv937 pricing.html auf dem Intent-Pfad: ' + pass + '/' + (pass + fail) + ' checks passed, ' + fail + ' UNGETESTET/rot');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
