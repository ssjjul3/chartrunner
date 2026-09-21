/* Smoke-Verifikation v1.0.945 — DAS TOR VOR DEM PRO-KAUF.
 *
 * BEFUND, den diese Datei absichert (Stand auf `main` vor diesem Patch):
 * beide Bezahldialoge — `_crCryptoPayOpen` im Spiel und `solanaPay` in
 * `chartrunner-prototype/pricing.html` — boten eine Zahlung an, sobald ein
 * INTENT zu bekommen war. Ein Intent ist aber der ANFANG des Wegs
 * („Zahlung entstehen lassen -> zuordnen -> on-chain bestaetigen ->
 * FREISCHALTUNG erteilen"), nicht sein Ende. Ob am Ende ueberhaupt jemand
 * etwas gutschreiben kann, hat nie jemand nachgesehen — und wer bezahlt hat,
 * hat bezahlt: einen Erstattungspfad gibt es in diesem Repo nicht
 * (`grep -i refund` findet einen Kommentar, keinen Code).
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM, AM DOM UND AN DEN RAUSGEHENDEN ANFRAGEN.
 * Nicht an einer Absicht und nicht an einem Aufruf: ein Nutzer tippt auf das,
 * was dasteht. *.workers.dev ist aus dieser Sandbox ohnehin nicht erreichbar;
 * ein Test, der davon abhinge, waere gruen aus dem falschen Grund.
 *
 * Gestellt wird GENAU EINE Naht: die Antwort von `GET /health` des
 * Geld-Workers. Alles andere (Intent, Status, Stripe) antwortet wie im
 * gesunden Fall — sonst waere nicht unterscheidbar, ob das Tor schliesst oder
 * einfach nichts funktioniert.
 *
 *  T1  Gesund (features.pay_identity.ok = true): der Weg ist offen wie bisher.
 *  T2  `ok:false` mit Grund: KEINE Zahlung — und der Grund steht so da, wie
 *      der WORKER ihn nennt, nicht in einer zweiten Fassung des Clients.
 *  T3  Kein `features.pay_identity` in der Antwort: das ist NICHT „in
 *      Ordnung" — fail-closed.
 *  T4  /health nicht erreichbar (Wurf / HTTP 500): fail-closed. Ein Ausfall
 *      ist keine Auskunft.
 *  T5  /health haengt: nach der Zeitgrenze fail-closed (gestellte Uhr).
 *  T6  Die Reihenfolge: FAEHIGKEIT VOR IDENTITAET. Abgemeldet UND gesperrt
 *      zeigt die Sperre, nicht „bitte anmelden" — sonst verlangt der Dialog
 *      eine Anmeldung fuer eine Zahlung, die niemand gutschreiben koennte.
 *  T7  Der KARTENWEG ist unberuehrt: er ist waehrend der Sperre anklickbar
 *      und navigiert auf den echten Stripe-Link.
 *  T8  Dasselbe Tor im SPIEL (_crCryptoPayOpen).
 *  T9  Quelltext: der Client liest `features.pay_identity` und erfindet
 *      keinen Grund; der Ownership-Worker wird NICHT gefragt.
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet (ROT/CRASH/GRUEN). Jede Mutation
 * wurde EINZELN eingebaut, die Suite lief vollstaendig, danach wurde die
 * Datei woertlich wiederhergestellt. KEINE war CRASH: jeder Lauf ging durch
 * und R1 blieb jedes Mal gruen — rot wurde nur, was die jeweilige Zeile
 * behauptet. Gruen gebliebene Nachbarn sind mitprotokolliert: sie sagen,
 * WELCHE Wache eine Zeile tatsaechlich misst.
 *
 *   M1  pricing.html `payCapability`, .catch-Zweig -> `fin({ok:true})`
 *       („wird schon gehen" statt fail-closed bei einem Netzfehler).
 *       ROT: T4a[throw] T4b
 *       T4a[http500] bleibt gruen und MUSS es: ein 500 laeuft ueber `r.ok`
 *       und nicht ueber .catch — zwei Zweige, zwei Wachen.
 *   M2  pricing.html `boot()`: der `if(!cap.ok)`-Zweig ausgehebelt.
 *       ROT: T2a T2c T2g T6a
 *       T2b/T2d bleiben gruen: ohne Identitaet holt der Dialog ohnehin keinen
 *       Intent. T3/T4/T5 bleiben gruen, weil dort das Tor AN DER KARTE
 *       greift — genau der Unterschied zwischen den beiden Toren.
 *   M3  pricing.html `gateSolButtons`: Rumpf durch `return;` ersetzt.
 *       ROT: T2e T2f T3a T3b T3c T4a[throw] T4b T4a[http500] T5a
 *       T2a–T2d bleiben gruen: der Dialog hat sein eigenes Tor. Diese beiden
 *       Zeilen zusammen sind der Beleg, dass es WIRKLICH zwei sind.
 *   M4  pricing.html `paintBlocked`: der Grund wird nicht mehr ausgegeben.
 *       ROT: T2c
 *       T2a/T2b bleiben gruen: es wird weiter nichts angeboten — gesagt wird
 *       nur nicht mehr, warum.
 *   M5  ChartRunner_Prototype.html `boot()`: derselbe Zweig ausgehebelt.
 *       ROT: T8a T8c T6b T8d T8g
 *   M7  pricing.html: die Wache `typeof f.ok !== 'boolean'` entfernt.
 *       ROT: T3b T3c
 *       T3a bleibt gruen — und das ist eine ABLESUNG, keine Nachlaessigkeit:
 *       ohne die Wache wirft `f.ok` bei fehlendem Feld, das .catch faengt es,
 *       und gesperrt wird trotzdem. Gesperrt aus dem falschen Grund ist aber
 *       genau das, was die Wache verhindert — deshalb messen T3b/T3c den
 *       GRUND und nicht nur die Sperre.
 *   M8  ChartRunner_Prototype.html: dieselbe Wache entfernt.
 *       ROT: T8g
 *       DIESE ZEILE GAB ES ERST NACH DER GEGENPROBE. Im ersten Anlauf blieb
 *       M8 VOLLSTAENDIG GRUEN: keine einzige Pruefung erreichte die Wache im
 *       Spiel. T8g (pay_identity vorhanden, `ok` kein Boolean) ist die Zeile,
 *       die daraufhin dazukam — ohne die Gegenprobe stuende hier ein Pruefer,
 *       den nie jemand beim Pruefen gesehen hat.
 *   M9  pricing.html: der Zeitgrenzen-Zweig -> `{ok:true}`.
 *       ROT: T5a
 *
 * EINE MUTATION IST BEHAUPTUNGSLOS GEBLIEBEN, und das steht hier, statt sie
 * wegzulassen:
 *   M6  ChartRunner_Prototype.html: `f.ok === true` -> `f.ok !== false`.
 *       ROT: nur T9c (eine Quelltext-Pruefung), keine einzige Verhaltenszeile.
 *       Gemessen und nicht geschaetzt: die beiden Fassungen sind hinter der
 *       typeof-Wache VERHALTENSGLEICH — dort kommen nur noch Booleans an, und
 *       fuer die stimmen beide ueberein. `=== true` bleibt trotzdem stehen
 *       (die Wache und der Vergleich sollen nicht voneinander abhaengen), aber
 *       es waere falsch zu sagen, ein Test belege ihn. Was die Arbeit tut, ist
 *       die typeof-Wache — und die belegen M7 und M8.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const PRICING = path.resolve(__dirname, '..', 'chartrunner-prototype', 'pricing.html');
const GAME = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
const PRICING_SRC = fs.readFileSync(PRICING, 'utf8');
const GAME_SRC = fs.readFileSync(GAME, 'utf8');

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

// Der Grund, den der WORKER nennt. Absichtlich ein Satz, den der Client
// nirgends kennt: nur so ist unterscheidbar, ob er GELESEN oder ERFUNDEN wird.
const WORKER_REASON = 'pay_intents: Der Vorgangsspeicher V945SENTINEL war nicht lesbar';
const INTENT_BODY = { reference: 'V945REF', usdc: 9.99, sol: 0.055, treasury: 'WkR945TreasuryFromWorkerZZZZZZZZZZZZZZZZZZZ' };

/** Eine Seite mit gestelltem Netz. `health` steuert GENAU die eine Naht. */
async function makePage(browser, opts){
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  page.errs = errs;

  // Auffangnetz fuer alles echte Netz (supabase-js, Stripe, Fonts).
  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    if(/supabase/.test(url) && /\.js/.test(url)){
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: `
        window.supabase = { createClient: function(){ return { auth: {
          getSession: function(){ return Promise.resolve({ data: { session: null } }); },
          onAuthStateChange: function(){}
        } }; } };` });
    }
    if(/buy\.stripe\.com/.test(url)){
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stripe stub</title>' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(o => {
    window.__v945 = { health: o.health, intent: o.intent, calls: [] };
    const real = window.fetch;
    window.fetch = function(input, init){
      const u = String((input && input.url) ? input.url : input);
      window.__v945.calls.push(u);
      const json = (x, st) => Promise.resolve(new Response(JSON.stringify(x), {
        status: st || 200, headers: { 'Content-Type': 'application/json' } }));
      if(/\/health(\?|$)/.test(u)){
        const h = window.__v945.health;
        if(h.mode === 'throw')   return Promise.reject(new TypeError('v945: Failed to fetch'));
        if(h.mode === 'hang')    return new Promise(function(){});
        if(h.mode === 'http500') return Promise.resolve(new Response('', { status: 500 }));
        return json(h.body);
      }
      if(/\/v1\/pay\/sol\/intent/.test(u)) return json(window.__v945.intent);
      if(/\/v1\/pay\/sol\/status/.test(u)) return json({ status: 'pending' });
      if(/\/v1\/billing\/status/.test(u)) return json({ tier: 'FREE', limits: {} });
      return real.apply(this, arguments);
    };
  }, { health: opts.health, intent: INTENT_BODY });
  return page;
}

const healthy   = { mode: 'ok', body: { ok: true,  status: 'ok',      features: { pay_identity: { ok: true,  status: 'ok' } } } };
const blocked   = { mode: 'ok', body: { ok: false, status: 'pending', features: { pay_identity: { ok: false, status: 'pending', reason: WORKER_REASON } } } };
const noFeature = { mode: 'ok', body: { ok: true,  status: 'ok', features: { boost_checkout: { ok: true } } } };
/* features.pay_identity IST da — aber `ok` ist kein Boolean. Das ist der Fall,
 * den die Gegenprobe zuerst gar nicht erreicht hat: ohne die typeof-Wache
 * blieb im SPIEL die ganze Suite gruen, weil `f` dort im anderen Fall
 * ohnehin wirft und im catch landet. Hier wirft nichts — die Wache ist die
 * einzige Stelle, die diesen Stand beim Namen nennt, statt ihn wie eine
 * gewoehnliche Absage aussehen zu lassen. */
const oddOkField = { mode: 'ok', body: { ok: true, status: 'ok', features: { pay_identity: { status: 'ok', ok: 'yes' } } } };

const solDom = p => p.evaluate(() => { const o = document.querySelector('.pay-overlay'); return o ? o.outerHTML : null; });
const gridHtml = p => p.evaluate(() => { const g = document.getElementById('priceGrid'); return g ? g.innerHTML : ''; });
const intentCalls = p => p.evaluate(() => window.__v945.calls.filter(u => /\/intent/.test(u)).length);
/** Nichts davon darf in einem gesperrten Zustand vorkommen. */
function offersPayment(html){
  return /solana:/.test(html || '') || /WkR945Treasury/.test(html || '') || /V945REF/.test(html || '');
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const allErrs = [];

  /* ═══ pricing.html ═══════════════════════════════════════════════════════ */
  console.log('\n-- T1 · pricing.html, gesunder Worker: der Weg ist offen --');
  {
    const p = await makePage(browser, { health: healthy });
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);
    const grid = await gridHtml(p);
    check('T1a der SOL-Knopf ist NICHT gesperrt', !/SOL \/ USDC unavailable/.test(grid), grid.slice(0, 300));
    check('T1b kein Sperrhinweis an der Karte', !/pay-blocked/.test(grid));
    await p.evaluate(() => document.querySelector('[data-sol]').click());
    await p.waitForTimeout(900);
    const d = await solDom(p);
    check('T1c der Dialog erreicht die Zahltafel (oder die Identitaetsabfrage), nicht die Sperre',
      !!d && !/switched off right now/i.test(d), (d || '').slice(0, 400));
    allErrs.push(...p.errs); await p.close();
  }

  console.log('\n-- T2 · pricing.html, der Worker kann NICHT erteilen --');
  {
    const p = await makePage(browser, { health: blocked });
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);
    const grid = await gridHtml(p);
    check('T2e das Tor sitzt AN DER KARTE: der SOL-Knopf ist gesperrt',
      /SOL \/ USDC unavailable/.test(grid), grid.slice(0, 400));
    check('T2f und der Grund des WORKERS steht dort, nicht eine eigene Fassung',
      grid.indexOf('V945SENTINEL') >= 0, grid.slice(0, 600));

    // Auch WER trotzdem im Dialog landet (zweites Tor), bekommt keine Zahlung.
    await p.evaluate(() => { const b = document.querySelector('[data-sol]'); if(b){ b.disabled = false; b.click(); } });
    await p.waitForTimeout(900);
    const d = await solDom(p);
    check('T2a der Dialog sagt, dass die Zahlung abgeschaltet ist',
      !!d && /switched off right now/i.test(d), (d || '').slice(0, 500));
    check('T2b KEINE Zahlung: kein `solana:`, keine Adresse, keine Referenz',
      !offersPayment(d), (d || '').slice(0, 500));
    check('T2c der Grund steht WOERTLICH so da, wie der Worker ihn nennt',
      (d || '').indexOf('V945SENTINEL') >= 0, (d || '').slice(0, 600));
    check('T2d der Intent wurde GAR NICHT ERST geholt', (await intentCalls(p)) === 0);
    check('T2g der Dialog sagt ausdruecklich, dass nichts abgebucht wurde',
      /Nothing was charged/i.test(d || ''), (d || '').slice(0, 500));

    // T7 — der Kartenweg ist unberuehrt. Gemessen an der URL, zu der der
    // Browser TATSAECHLICH navigiert, nicht an einem Klick-Handler.
    await p.evaluate(() => { const o = document.querySelector('.pay-overlay'); if(o) o.remove(); });
    const nav = p.waitForURL(/buy\.stripe\.com/, { timeout: 8000 }).then(() => true).catch(() => false);
    await p.evaluate(() => document.querySelector('[data-stripe]').click());
    check('T7a der Kartenweg funktioniert waehrend der Sperre unveraendert', await nav);
    allErrs.push(...p.errs); await p.close();
  }

  console.log('\n-- T3 · pricing.html, /health OHNE features.pay_identity --');
  {
    const p = await makePage(browser, { health: noFeature });
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);
    const grid = await gridHtml(p);
    check('T3a ein fehlendes Feld ist NICHT „in Ordnung" — der Knopf ist gesperrt',
      /SOL \/ USDC unavailable/.test(grid), grid.slice(0, 400));
    check('T3b und der Grund sagt, dass dieser Server-Stand die Frage nicht beantwortet',
      /does not report/i.test(grid), grid.slice(0, 600));
    allErrs.push(...p.errs); await p.close();
  }
  {
    const p = await makePage(browser, { health: oddOkField });
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);
    const grid = await gridHtml(p);
    check('T3c pay_identity ohne boolesches `ok` wird BEIM NAMEN genannt, nicht als Ausfall getarnt',
      /SOL \/ USDC unavailable/.test(grid) && /does not report/i.test(grid), grid.slice(0, 600));
    allErrs.push(...p.errs); await p.close();
  }

  console.log('\n-- T4 · pricing.html, /health nicht erreichbar --');
  for(const mode of ['throw', 'http500']){
    const p = await makePage(browser, { health: { mode, body: {} } });
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);
    const grid = await gridHtml(p);
    check('T4a[' + mode + '] ein Ausfall ist keine Auskunft: der Knopf ist gesperrt',
      /SOL \/ USDC unavailable/.test(grid), grid.slice(0, 400));
    if(mode === 'throw'){
      check('T4b der Grund nennt die Unerreichbarkeit, statt sie zu verschweigen',
        /could not be reached/i.test(grid), grid.slice(0, 600));
      await p.evaluate(() => { const b = document.querySelector('[data-sol]'); if(b){ b.disabled = false; b.click(); } });
      await p.waitForTimeout(700);
      check('T4c auch im Dialog keine Zahlung', !offersPayment(await solDom(p)));
    }
    allErrs.push(...p.errs); await p.close();
  }

  console.log('\n-- T5 · pricing.html, /health haengt (gestellte Uhr) --');
  {
    const p = await makePage(browser, { health: { mode: 'hang', body: {} } });
    await p.clock.install();
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.clock.runFor(1500);
    // Die Zeitgrenze liegt bei 8 s; davor darf nichts angeboten werden, danach
    // steht die Sperre.
    const before = await gridHtml(p);
    check('T5b vor der Zeitgrenze wird nichts angeboten und nichts behauptet',
      !/SOL \/ USDC unavailable/.test(before) && !offersPayment(before));
    await p.clock.runFor(10000);
    await p.waitForTimeout(200);
    const after = await gridHtml(p);
    check('T5a nach der Zeitgrenze: gesperrt, mit Grund',
      /SOL \/ USDC unavailable/.test(after) && /did not answer in time/i.test(after), after.slice(0, 600));
    allErrs.push(...p.errs); await p.close();
  }

  console.log('\n-- T6 · die Reihenfolge: Faehigkeit VOR Identitaet --');
  {
    const p = await makePage(browser, { health: blocked });
    await p.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);
    await p.evaluate(() => { const b = document.querySelector('[data-sol]'); if(b){ b.disabled = false; b.click(); } });
    await p.waitForTimeout(900);
    const d = await solDom(p);
    // Niemand ist angemeldet. Trotzdem darf hier NICHT „bitte anmelden"
    // stehen: eine Anmeldung zu verlangen fuer eine Zahlung, die niemand
    // gutschreiben koennte, ist zwei Schritte zu spaet.
    check('T6a abgemeldet UND gesperrt zeigt die SPERRE, nicht die Anmeldung',
      /switched off right now/i.test(d || '') && !/A connected wallet is enough/i.test(d || ''),
      (d || '').slice(0, 500));
    allErrs.push(...p.errs); await p.close();
  }

  /* ═══ ChartRunner_Prototype.html ═════════════════════════════════════════ */
  console.log('\n-- T8 · dasselbe Tor im Spiel (_crCryptoPayOpen) --');
  {
    const openDialog = async (p) => {
      await p.evaluate(() => window._crCryptoPayOpen('RUNNER_PRO', 'monthly'));
      await p.waitForTimeout(900);
      return p.evaluate(() => {
        const o = document.querySelector('div[style*="100310"]');
        return o ? o.outerHTML : null;
      });
    };
    {
      const p = await makePage(browser, { health: blocked });
      await p.goto(pathToFileURL(GAME).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForTimeout(2500);
      const d = await openDialog(p);
      check('T8a der Spiel-Dialog sagt, dass die Zahlung abgeschaltet ist',
        !!d && /switched off right now/i.test(d), (d || '').slice(0, 500));
      check('T8b KEINE Zahlung: kein `solana:`, keine Adresse, keine Referenz', !offersPayment(d), (d || '').slice(0, 500));
      check('T8c der Grund kommt vom Worker', (d || '').indexOf('V945SENTINEL') >= 0, (d || '').slice(0, 600));
      check('T6b abgemeldet UND gesperrt zeigt auch hier die SPERRE',
        !/A connected wallet is enough/i.test(d || ''), (d || '').slice(0, 400));
      check('T8e der Intent wurde gar nicht erst geholt', (await intentCalls(p)) === 0);
      allErrs.push(...p.errs); await p.close();
    }
    {
      const p = await makePage(browser, { health: noFeature });
      await p.goto(pathToFileURL(GAME).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForTimeout(2500);
      const d = await openDialog(p);
      check('T8d ein fehlendes features.pay_identity sperrt auch im Spiel',
        /switched off right now/i.test(d || '') && !offersPayment(d), (d || '').slice(0, 500));
      allErrs.push(...p.errs); await p.close();
    }
    {
      const p = await makePage(browser, { health: oddOkField });
      await p.goto(pathToFileURL(GAME).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForTimeout(2500);
      const d = await openDialog(p);
      check('T8g im Spiel ebenso: ein nicht-boolesches `ok` wird beim Namen genannt',
        /switched off right now/i.test(d || '') && /does not report/i.test(d || '') && !offersPayment(d),
        (d || '').slice(0, 600));
      allErrs.push(...p.errs); await p.close();
    }
    {
      const p = await makePage(browser, { health: healthy });
      await p.goto(pathToFileURL(GAME).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForTimeout(2500);
      const d = await openDialog(p);
      check('T8f gesunder Worker: der Dialog laeuft weiter wie bisher',
        !!d && !/switched off right now/i.test(d), (d || '').slice(0, 400));
      allErrs.push(...p.errs); await p.close();
    }
  }

  /* ═══ T9 · Quelltext ═════════════════════════════════════════════════════ */
  console.log('\n-- T9 · Quelltext --');
  {
    for(const [name, src] of [['pricing.html', PRICING_SRC], ['ChartRunner_Prototype.html', GAME_SRC]]){
      const code = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      check('T9a[' + name + '] das Tor liest features.pay_identity',
        /features\s*&&\s*\w+\.features\.pay_identity/.test(code) || /\.features\.pay_identity/.test(code));
      // Der Ownership-Worker ist der FALSCHE Wegweiser fuer diesen Kaufweg.
      check('T9b[' + name + '] der Ownership-Worker wird NICHT gefragt',
        !/ownership\/health/.test(code) && !/OWNERSHIP_CATALOG/.test(code));
      check('T9c[' + name + '] der Erfolgszweig verlangt ausdruecklich `true`',
        /ok\s*===\s*true/.test(code), code.length);
    }
  }

  /* ═══ REGRESSION ═════════════════════════════════════════════════════════ */
  console.log('\n-- Regression --');
  {
    const hard = allErrs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|v945/i.test(m));
    check('R1 keine harten Page-Errors ueber den ganzen Lauf', hard.length === 0, hard.slice(0, 3));
  }

  await browser.close();
  console.log('\nv945 Tor vor dem Pro-Kauf: ' + pass + '/' + (pass + fail) + ' checks passed, ' + fail + ' UNGETESTET/rot');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
