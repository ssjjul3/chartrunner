/* Smoke-Verifikation v1.0.943 — PRO-ZAHLWEG: KONTO ODER WALLET.
 *
 * BEFUND, den diese Datei absichert (gemessen am Stand auf `main` vor diesem
 * Patch, v1.0.942):
 * Beide SOL-Dialoge — `_crCryptoPayOpen` im Spiel und der auf `pricing.html` —
 * verlangten eine Supabase-Sitzung. Ohne sie stand dort "Sign in first",
 * WAEHREND DIE WALLET DES NUTZERS OBEN RECHTS STAND. Sie ist es, die signiert
 * und bezahlt. Entscheidung vom 20.09.2026: fuer den Pro-Kauf gilt
 * Wallet = Konto.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM, an den zwei Stellen, an denen die Frage
 * entschieden wird: AM DOM DES DIALOGS und AN DER ANFRAGE, die rausgeht. Nicht
 * an einer Absicht und nicht an einem Aufruf — ein Nutzer tippt auf das, was
 * dasteht, und der Worker schaltet frei, was ankommt.
 *
 * Die Doppel sitzen an den ECHTEN Naehten, nicht an eigens eingezogenen
 * Testvariablen:
 *   · pricing.html — supabase-js (jsdelivr) wird ersetzt, `window.solana` wird
 *     als Anbieter gestellt (mit `connect({onlyIfTrusted:true})`, genau dem
 *     Aufruf, den die Seite macht), und fetch wird abgefangen.
 *   · ChartRunner_Prototype.html — `crAccount.token` und `crWallet.isConnected`
 *     /`get` werden NACH dem Laden ueberschrieben. Das sind die Funktionen, die
 *     der Dialog wirklich fragt.
 *   · *.workers.dev ist aus dieser Sandbox ohnehin nicht erreichbar; ein Test,
 *     der davon abhinge, waere gruen aus dem falschen Grund.
 *
 * P1  pricing.html · weder Konto noch Wallet — kein `solana:`, keine Adresse,
 *     kein Intent-Abruf; der Text sagt, dass eine WALLET GENUEGT, und sagt
 *     NICHT MEHR "Sign in first".
 * P2  pricing.html · nur Wallet — der Intent geht OHNE Authorization raus und
 *     TRAEGT die Adresse; Adresse, Betrag und Referenz erscheinen.
 * P3  pricing.html · Konto + Wallet — das KONTO fuehrt: Authorization ist
 *     gesetzt, die Wallet faehrt als Zahler mit.
 * P4  pricing.html · 401 auf einen WALLET-Vorgang — der benannte Zustand
 *     ("kennt diese Wallet nicht"), nicht die allgemeine Fehlermeldung.
 * P5  pricing.html · 401 auf einen KONTO-Vorgang — die allgemeine Meldung;
 *     die Wallet-Meldung waere dort eine Erfindung.
 * P6  pricing.html · keine Wallet-Erweiterung — kein Verbinden-Knopf, und der
 *     Text sagt WARUM.
 * G1  Spiel · weder Konto noch Wallet — derselbe Text, zwei Wege raus.
 * G2  Spiel · nur Wallet — Intent ohne Authorization, MIT Adresse.
 * G3  Spiel · Konto + Wallet — das Konto fuehrt.
 * G4  Spiel · 401 je nach Identitaet — benannt bzw. allgemein.
 * P7  pricing.html · die Wallet liefert etwas, das keine Adresse ist — keine
 *     Identitaet, keine Zahlung.
 * G5  Spiel · crTier fragt mit ?wallet=, wenn kein Konto da ist.
 * G6  Spiel · dasselbe: verbunden, aber keine Adresse — keine Identitaet.
 * Q1  Quelltext beider Dateien — kein leerer Bearer, keine zweite
 *     Adress-Auslegung, keine Verknuepfungs-Zeremonie im Client.
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet (CLAUDE.md · ROT/CRASH/GRUEN). Jede
 * Mutation wurde EINZELN eingebaut, die Suite lief vollstaendig, danach wurde
 * der Quelltext AUS DEM SPEICHER wiederhergestellt. KEINE war CRASH: jeder
 * Lauf ging durch und R1 ("keine harten Page-Errors") blieb jedes Mal gruen —
 * rot wurde nur, was die jeweilige Zeile behauptet. Gruen gebliebene
 * Nachbarzeilen sind mitprotokolliert: sie sagen, WELCHE Wache eine Zeile
 * tatsaechlich misst.
 *
 *   M1  pricing `_identity()`: die Wallet-Zeile gestrichen — der alte Zustand,
 *       Konto oder nichts.
 *       ROT: P2a, P2b, P2c, P2d, P4a  (38 von 43 gruen)
 *       P1 bleibt gruen und MUSS es: der Text steht ja weiterhin da — er
 *       stimmt nur nicht mehr. Genau deshalb misst P2 die ANFRAGE und nicht
 *       den Text. P4b bleibt ebenfalls gruen, weil ohne Wallet-Identitaet gar
 *       kein 401-Fall entsteht: gezeigt wird die Absage, nicht die allgemeine
 *       Fehlermeldung. P4a und P4b messen also zwei verschiedene Dinge.
 *   M2  pricing `_identity()`: Reihenfolge gedreht, die Wallet fuehrt auch bei
 *       vorhandenem Konto.
 *       ROT: P3a  (42 von 43 gruen)
 *       P3b bleibt gruen, und das ist kein Mangel: `body.wallet` steht in
 *       BEIDEN Faellen drin. Woran der Unterschied haengt, ist allein die
 *       Authorization-Kopfzeile — deshalb traegt P3a diesen Fall.
 *   M3  pricing `startIntent()`: bedingungsloser `Authorization`-Kopf (der
 *       leere Bearer).
 *       ROT: P2a, Q1a  (41 von 43 gruen)
 *       Der Worker lehnt einen vorhandenen, ungueltigen Bearer ab, statt still
 *       auf die Wallet auszuweichen; der Kauf scheiterte also, ohne dass an
 *       der Oberflaeche etwas nach einem Fehler aussaehe.
 *   M4  pricing `failAuth()`: `id.kind === 'wallet'` auf `false` gesetzt.
 *       ROT: P4a, P4b  (41 von 43 gruen)
 *       P5 bleibt gruen — der Konto-Fall SOLL die allgemeine Meldung zeigen.
 *       Dass P5 bei dieser Mutation gruen bleibt, ist der Beleg, dass P4 und
 *       P5 zwei Wege messen und nicht einen doppelt.
 *   M5  Spiel `_identity()`: die Wallet-Zeile gestrichen.
 *       ROT: G2a, G2b, G2c, G4a  (39 von 43 gruen)
 *   M6  Spiel `_wallet()`: `crWallet.isConnected()` aus der Kette genommen.
 *       ROT: G1a, G1b, G1c, G1e  (39 von 43 gruen)
 *       Eine Adresse aus einer NICHT verbundenen Wallet wurde damit zur
 *       Identitaet — der Dialog bot einen Kauf an, der jemand anderem
 *       gutgeschrieben wuerde.
 *   M7  Spiel `crTier.refresh()`: `if(!tok && !w)` zurueck auf `if(!tok)`.
 *       ROT: G5a, G5b  (41 von 43 gruen)
 *       "Kein Konto = FREE" — auch fuer jemanden, der mit genau dieser Wallet
 *       Pro gekauft hat.
 *   M8  Spiel `_isAddr`: auf `String(a||'').length > 0` gelockert.
 *       ROT: G6a, G6b  (41 von 43 gruen)
 *       DIESE MUTATION KAM IM ERSTEN LAUF GRUEN DURCH. Die Formpruefung war
 *       unbewacht: in jedem anderen Fall ist die Adresse ohnehin gueltig, eine
 *       gelockerte Pruefung faellt dort nicht auf. G6 ist deshalb NACHTRAEGLICH
 *       dazugekommen — eine Zeile, die bei der Mutation gruen bleibt, prueft
 *       nichts (CLAUDE.md: "schaerfen, dann erst zaehlt sie").
 *   M9  pricing `_isAddr`: dieselbe Lockerung auf der anderen Oberflaeche.
 *       ROT: P7a, P7b, Q1b  (40 von 43 gruen)
 *       P7 ist aus demselben Grund nachtraeglich dazugekommen wie G6.
 *  M10  Spiel `boot()`: `_identity()` zurueck auf `_tok()` — die Wallet wird
 *       beim Start gar nicht erst gefragt.
 *       ROT: G2a, G2b, G2c, G4a  (39 von 43 gruen)
 *       Dieselben vier wie M5, und das ist die Auskunft: startIntent() und
 *       boot() fragen dieselbe Stelle, es gibt keinen zweiten Weg hinein.
 *
 * Lauf:  npm i playwright --no-save && node scripts/check_v943_pay_identity_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const PRICING = path.resolve(__dirname, '..', 'chartrunner-prototype', 'pricing.html');
const GAME = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
const PRICING_HTML = fs.readFileSync(PRICING, 'utf8');
// Kommentare raus, bevor nach CODE gefragt wird: die Kopfkommentare ZITIEREN
// den alten Zustand ("Sign in first") und muessen das auch.
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRICING_CODE = strip(PRICING_HTML);

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

// Eine echte Base58-Adresse (44 Zeichen). Sie steht hier, damit sich am DOM
// unterscheiden laesst, WELCHE Adresse angezeigt wird.
const WALLET = '7Nw66LmJB6YzHsgEGQ8oDSSsJ4YzUkEVAvysQuQw7tC4';
const TREASURY = 'WkR943TreasuryFromWorkerZZZZZZZZZZZZZZZZZZZZ';
const OK_BODY = { reference: 'V943REF', usdc: 9.99, sol: 0.066, treasury: TREASURY, owner_kind: 'wallet', owner_id: WALLET };

const errs = [];

/* ══════════════════════════════════════════════════════════════════════════
 * TEIL 1 — pricing.html
 * ════════════════════════════════════════════════════════════════════════ */
async function pricingPart(browser){
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    if(/supabase-js/.test(url)){
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: `
        window.supabase = { createClient: function(){ return { auth: {
          getSession: function(){ return Promise.resolve({ data: { session: window.__v943.session } }); },
          onAuthStateChange: function(cb){ window.__v943.authCbs.push(cb); }
        } }; } };
      ` });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Das Wallet-Doppel sitzt auf `window.solana` und beantwortet GENAU den
  // Aufruf, den die Seite macht: connect({onlyIfTrusted:true}). `trusted`
  // schaltet zwischen "schon vertraut" und "da, aber nicht vertraut".
  /* Das Szenario faehrt im URL-Hash mit. Grund: dieses addInitScript laeuft
   * bei JEDER Navigation neu und wuerde ein vorher gesetztes `__v943`
   * ueberschreiben — die Seite liest Sitzung und Wallet aber genau EINMAL beim
   * Start, also muss fuer jeden Fall neu geladen werden. Der Hash ist fuer die
   * Seite selbst tot; sie liest ihn nirgends. */
  await page.addInitScript(() => {
    var cfg = {};
    try { cfg = JSON.parse(decodeURIComponent((location.hash || '').replace(/^#v943=/, '')) || '{}'); } catch(_){}
    window.__v943 = { session: cfg.tok ? { access_token: cfg.tok } : null, authCbs: [],
                      trusted: !!cfg.trusted, provider: cfg.provider !== false,
                      intentStatus: cfg.status || 200, body: cfg.body || null, badKey: !!cfg.badKey,
                      calls: [], lastInit: null };
    Object.defineProperty(window, 'solana', {
      configurable: true,
      get: function(){
        if(!window.__v943.provider) return undefined;
        return {
          publicKey: null,
          connect: function(opts){
            if(opts && opts.onlyIfTrusted && !window.__v943.trusted){
              return Promise.reject(new Error('not trusted'));
            }
            const k = window.__v943.badKey ? 'nicht-base58!' : '7Nw66LmJB6YzHsgEGQ8oDSSsJ4YzUkEVAvysQuQw7tC4';
            this.publicKey = { toString: function(){ return k; } };
            window.__v943._pk = this.publicKey;
            return Promise.resolve({ publicKey: this.publicKey });
          },
          on: function(){},
        };
      },
    });
    const real = window.fetch;
    window.fetch = function(input, init){
      const u = String((input && input.url) ? input.url : input);
      const json = (o, st) => Promise.resolve(new Response(JSON.stringify(o), {
        status: st || 200, headers: { 'Content-Type': 'application/json' } }));
      if(/\/v1\/pay\/sol\/intent/.test(u)){
        window.__v943.calls.push(u);
        window.__v943.lastInit = { headers: (init && init.headers) || {}, body: (init && init.body) || '' };
        if(window.__v943.intentStatus !== 200) return Promise.resolve(new Response('', { status: window.__v943.intentStatus }));
        return json(window.__v943.body || {});
      }
      if(/\/v1\/pay\/sol\/status/.test(u)) return json({ status: 'pending' });
      /* Seit v1.0.945 fragen BEIDE Dialoge zuerst, ob eine Freischaltung
       * ueberhaupt erteilt werden kann (GET /health, features.pay_identity).
       * Ohne diese Antwort landet jeder Zustand unten im neuen 'blocked', und
       * diese Datei wuerde das Tor messen statt der Identitaetslogik. Die
       * Vorgabe ist deshalb ein Worker, der erteilen KANN. */
      if(/\/health(\?|$)/.test(u)) return json({ ok: true, status: 'ok', features: { pay_identity: { ok: true, status: 'ok' } } });
      return real.apply(this, arguments);
    };
  });

  await page.goto(pathToFileURL(PRICING).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    window.__v943.dom = () => { const o = document.querySelector('.pay-overlay'); return o ? o.outerHTML : null; };
    window.__v943.closeAll = () => document.querySelectorAll('.pay-overlay').forEach(d => d.remove());
  });

  // Die Seite liest Sitzung und Wallet EINMAL beim Start. Fuer jeden Fall wird
  // deshalb neu geladen — eine nachtraeglich gesetzte Variable waere ein
  // anderer Weg als der, den ein Besucher nimmt.
  const scenario = async (o) => {
    await page.goto(pathToFileURL(PRICING).href + '#v943=' + encodeURIComponent(JSON.stringify(o)),
      { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      window.__v943.dom = () => { const d = document.querySelector('.pay-overlay'); return d ? d.outerHTML : null; };
    });
    await page.evaluate(() => document.querySelector('[data-sol]').click());
    await page.waitForTimeout(700);
  };
  const dom = () => page.evaluate(() => window.__v943.dom());
  const lastInit = () => page.evaluate(() => window.__v943.lastInit);
  const intentCalls = () => page.evaluate(() => window.__v943.calls.filter(u => /\/intent/.test(u)).length);

  console.log('\n-- P1 · pricing.html: weder Konto noch Wallet --');
  await scenario({ trusted: false, body: OK_BODY });
  {
    const d = await dom();
    check('P1a keine Zahlung: kein `solana:`, keine Adresse, kein Betrag',
      !!d && d.indexOf('solana:') < 0 && d.indexOf(TREASURY) < 0 && d.indexOf('9.99') < 0, d ? d.slice(0, 300) : d);
    check('P1b der Intent wurde gar nicht erst geholt', (await intentCalls()) === 0);
    check('P1c der Text sagt, dass eine VERBUNDENE WALLET GENUEGT',
      !!d && /connected wallet is enough/i.test(d), d ? d.slice(0, 600) : d);
    check('P1d und er sagt NICHT MEHR "Sign in first"',
      !!d && !/Sign in first/i.test(d), d ? d.slice(0, 600) : d);
    check('P1e der Grund bleibt stehen: ohne beides koennte niemand gutgeschrieben werden',
      !!d && /nobody to credit the payment to/i.test(d), d ? d.slice(0, 600) : d);
    check('P1f mit vorhandener Erweiterung steht ein Verbinden-Knopf da',
      !!d && /pmConnect/.test(d), d ? d.slice(0, 600) : d);
  }

  console.log('\n-- P2 · pricing.html: NUR Wallet --');
  await scenario({ trusted: true, body: OK_BODY });
  {
    const d = await dom();
    const init = await lastInit();
    const hdr = init ? (init.headers || {}) : {};
    const body = init ? JSON.parse(init.body || '{}') : {};
    check('P2a der Intent geht OHNE Authorization-Kopfzeile raus (kein leerer Bearer)',
      (await intentCalls()) === 1 && !('Authorization' in hdr), { hdr, calls: await intentCalls() });
    check('P2b und er TRAEGT die Wallet-Adresse', body.wallet === WALLET, body);
    check('P2c die Zahltafel steht: Adresse aus der Antwort, Betrag, Referenz',
      !!d && d.indexOf(TREASURY) >= 0 && /V943REF/.test(d), d ? d.slice(0, 500) : d);
    check('P2d und ein ausfuehrbarer `solana:`-Link mit der Referenz',
      !!d && /solana:/.test(d) && /reference=V943REF/.test(d), d ? d.slice(0, 700) : d);
  }

  console.log('\n-- P3 · pricing.html: Konto UND Wallet -> das Konto fuehrt --');
  await scenario({ tok: 'tok-943', trusted: true, body: OK_BODY });
  {
    const init = await lastInit();
    const hdr = init ? (init.headers || {}) : {};
    const body = init ? JSON.parse(init.body || '{}') : {};
    check('P3a die Authorization-Kopfzeile ist gesetzt — das Konto fuehrt',
      hdr.Authorization === 'Bearer tok-943', hdr);
    check('P3b die Wallet faehrt als Zahler mit, sie ERSETZT das Konto nicht',
      body.wallet === WALLET, body);
  }

  console.log('\n-- P4 · pricing.html: 401 auf einen WALLET-Vorgang --');
  await scenario({ trusted: true, status: 401 });
  {
    const d = await dom();
    check('P4a der Grund wird BENANNT (der Server kennt diese Wallet nicht)',
      !!d && /did not accept this wallet as a payer/i.test(d), d ? d.slice(0, 600) : d);
    check('P4b und NICHT als allgemeine "keine Zahlungsdetails"-Meldung gezeigt',
      !!d && !/did not issue payment details/i.test(d), d ? d.slice(0, 600) : d);
    check('P4c trotzdem keine Zahlung: kein `solana:`, keine Adresse',
      !!d && d.indexOf('solana:') < 0 && d.indexOf(TREASURY) < 0, d ? d.slice(0, 400) : d);
  }

  console.log('\n-- P5 · pricing.html: 401 auf einen KONTO-Vorgang --');
  await scenario({ tok: 'tok-943', trusted: false, status: 401 });
  {
    const d = await dom();
    check('P5a hier die allgemeine Meldung — die Wallet-Meldung waere eine Erfindung',
      !!d && /did not issue payment details/i.test(d) && !/accept this wallet/i.test(d), d ? d.slice(0, 600) : d);
  }

  console.log('\n-- P6 · pricing.html: keine Wallet-Erweiterung --');
  await scenario({ provider: false, body: OK_BODY });
  {
    const d = await dom();
    check('P6a kein Verbinden-Knopf, wenn es nichts zu verbinden gibt',
      !!d && d.indexOf('pmConnect') < 0, d ? d.slice(0, 600) : d);
    check('P6b und der Text sagt WARUM, statt es zu verschweigen',
      !!d && /No Solana wallet extension found/i.test(d), d ? d.slice(0, 600) : d);
  }

  /* Die Formpruefung muss eine SEIN. Ohne diesen Fall bliebe sie unbewacht:
   * in allen Faellen oben ist die Adresse ohnehin gueltig, eine gelockerte
   * Pruefung faellt dort nicht auf. Genau das hat der erste Gegenproben-Lauf
   * gezeigt (M9 kam GRUEN durch), und eine Zeile, die bei der Mutation gruen
   * bleibt, prueft nichts. */
  console.log('\n-- P7 · pricing.html: die Wallet liefert etwas, das keine Adresse ist --');
  await scenario({ trusted: true, badKey: true, body: OK_BODY });
  {
    const d = await dom();
    check('P7a keine Identitaet aus einer Zeichenkette, die keine Adresse ist',
      (await intentCalls()) === 0, { calls: await intentCalls() });
    check('P7b und damit keine Zahlung: der Dialog bleibt bei der Absage',
      !!d && /connected wallet is enough/i.test(d) && d.indexOf(TREASURY) < 0, d ? d.slice(0, 400) : d);
  }

  await page.close();
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEIL 2 — ChartRunner_Prototype.html
 * ════════════════════════════════════════════════════════════════════════ */
async function gamePart(browser){
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => {
    window.__v943 = { intentStatus: 200, calls: [], lastInit: null, statusCalls: [], body: null };
    const real = window.fetch;
    window.fetch = function(input, init){
      const u = String((input && input.url) ? input.url : input);
      const json = (o, st) => Promise.resolve(new Response(JSON.stringify(o), {
        status: st || 200, headers: { 'Content-Type': 'application/json' } }));
      if(/\/v1\/pay\/sol\/intent/.test(u)){
        window.__v943.calls.push(u);
        window.__v943.lastInit = { headers: (init && init.headers) || {}, body: (init && init.body) || '' };
        if(window.__v943.intentStatus !== 200) return Promise.resolve(new Response('', { status: window.__v943.intentStatus }));
        return json(window.__v943.body || {});
      }
      if(/\/v1\/billing\/status/.test(u)){ window.__v943.statusCalls.push(u); return json({ tier: 'RUNNER_PRO', limits: {} }); }
      if(/\/v1\/pay\/sol\/status/.test(u)) return json({ status: 'pending' });
      /* Seit v1.0.945 fragen BEIDE Dialoge zuerst, ob eine Freischaltung
       * ueberhaupt erteilt werden kann (GET /health, features.pay_identity).
       * Ohne diese Antwort landet jeder Zustand unten im neuen 'blocked', und
       * diese Datei wuerde das Tor messen statt der Identitaetslogik. Die
       * Vorgabe ist deshalb ein Worker, der erteilen KANN. */
      if(/\/health(\?|$)/.test(u)) return json({ ok: true, status: 'ok', features: { pay_identity: { ok: true, status: 'ok' } } });
      return real.apply(this, arguments);
    };
  });
  await page.goto(pathToFileURL(GAME).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);

  // Die Doppel sitzen auf den Funktionen, die der Dialog WIRKLICH fragt.
  const setIdentity = (o) => page.evaluate(s => {
    window.crAccount.token = function(){ return s.tok || ''; };
    window.crWallet.isConnected = function(){ return !!s.connected; };
    window.crWallet.get = function(){ return s.addr || ''; };
    window.__v943.intentStatus = s.status || 200;
    window.__v943.body = s.body || null;
    window.__v943.calls.length = 0;
    window.__v943.statusCalls.length = 0;
    /* SCHLIESSEN, nicht entfernen. Ein aus dem DOM genommener Dialog laeuft
     * weiter: sein tokWatch-Intervall prueft alle 700 ms auf eine Identitaet
     * und holt beim naechsten Szenario einen ZWEITEN Intent. Der Klick auf das
     * X ruft close(), und close() raeumt die Intervalle ab — dieselbe Naht,
     * die auch ein Nutzer benutzt. */
    document.querySelectorAll('[data-v943ov]').forEach(d => {
      const x = d.querySelector('.crPayX');
      if(x) x.click(); else d.remove();
    });
  }, o);
  // Ein laufendes Intervall feuert noch bis zu 700 ms nach — abwarten, bevor
  // die Zaehler als "seit diesem Szenario" gelten.
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__v943.calls.length = 0; window.__v943.statusCalls.length = 0; });
  const openPay = async () => {
    await page.evaluate(() => {
      const before = new Set(Array.from(document.body.children));
      window._crCryptoPayOpen('RUNNER_PRO', 'monthly');
      Array.from(document.body.children).forEach(c => { if(!before.has(c)) c.setAttribute('data-v943ov', '1'); });
    });
    await page.waitForTimeout(600);
  };
  const dom = () => page.evaluate(() => {
    const d = document.querySelector('[data-v943ov]');
    return d ? d.outerHTML : null;
  });
  const lastInit = () => page.evaluate(() => window.__v943.lastInit);
  const intentCalls = () => page.evaluate(() => window.__v943.calls.length);

  console.log('\n-- G1 · Spiel: weder Konto noch Wallet --');
  // Eine Adresse, die da ist, deren Wallet aber NICHT verbunden ist: sie darf
  // keine Identitaet sein.
  await setIdentity({ connected: false, addr: WALLET, body: OK_BODY });
  await openPay();
  {
    const d = await dom();
    check('G1a eine NICHT verbundene Wallet ist keine Identitaet — kein Intent',
      (await intentCalls()) === 0, { calls: await intentCalls() });
    check('G1b und keine Zahlung im DOM', !!d && d.indexOf(TREASURY) < 0 && d.indexOf('solana:') < 0, d ? d.slice(0, 300) : d);
    check('G1c der Text sagt, dass eine verbundene Wallet genuegt',
      !!d && /connected wallet is enough/i.test(d), d ? d.slice(0, 600) : d);
    check('G1d und sagt nicht mehr "Sign in first"', !!d && !/Sign in first/i.test(d), d ? d.slice(0, 600) : d);
    check('G1e zwei Wege raus: verbinden ODER anmelden',
      !!d && /crPayConnect/.test(d) && /crPaySignin/.test(d), d ? d.slice(0, 700) : d);
  }

  console.log('\n-- G2 · Spiel: NUR Wallet --');
  await setIdentity({ connected: true, addr: WALLET, body: OK_BODY });
  await openPay();
  {
    const d = await dom();
    const init = await lastInit();
    const hdr = init ? (init.headers || {}) : {};
    const body = init ? JSON.parse(init.body || '{}') : {};
    check('G2a der Intent geht OHNE Authorization raus', (await intentCalls()) === 1 && !('Authorization' in hdr), hdr);
    check('G2b und TRAEGT die Wallet-Adresse', body.wallet === WALLET, body);
    check('G2c die Zahltafel steht: Adresse aus der Antwort und die Referenz',
      !!d && d.indexOf(TREASURY) >= 0 && /V943REF/.test(d), d ? d.slice(0, 500) : d);
  }

  console.log('\n-- G3 · Spiel: Konto UND Wallet -> das Konto fuehrt --');
  await setIdentity({ tok: 'gtok-943', connected: true, addr: WALLET, body: OK_BODY });
  await openPay();
  {
    const init = await lastInit();
    const hdr = init ? (init.headers || {}) : {};
    const body = init ? JSON.parse(init.body || '{}') : {};
    check('G3a Authorization ist gesetzt — das Konto fuehrt', hdr.Authorization === 'Bearer gtok-943', hdr);
    check('G3b die Wallet faehrt als Zahler mit', body.wallet === WALLET, body);
  }

  console.log('\n-- G4 · Spiel: 401 je nach Identitaet --');
  await setIdentity({ connected: true, addr: WALLET, status: 401 });
  await openPay();
  {
    const d = await dom();
    check('G4a Wallet-Vorgang: der Grund wird BENANNT',
      !!d && /did not accept this wallet as a payer/i.test(d), d ? d.slice(0, 600) : d);
  }
  await setIdentity({ tok: 'gtok-943', connected: false, status: 401 });
  await openPay();
  {
    const d = await dom();
    check('G4b Konto-Vorgang: die allgemeine Meldung, nicht die Wallet-Meldung',
      !!d && !/accept this wallet/i.test(d) && /did not issue payment details/i.test(d), d ? d.slice(0, 600) : d);
  }

  /* Dieselbe Luecke wie P7, auf der Spielseite — und sie ist hier teurer: der
   * Dialog wuerde eine Zahlungsaufforderung bauen, die der Worker hinterher
   * ablehnt, weil er dieselbe Form strenger liest. */
  console.log('\n-- G6 · Spiel: verbundene Wallet, aber keine Adresse --');
  await setIdentity({ connected: true, addr: 'nicht-base58!', body: OK_BODY });
  await openPay();
  {
    const d = await dom();
    check('G6a keine Identitaet aus einer Zeichenkette, die keine Adresse ist',
      (await intentCalls()) === 0, { calls: await intentCalls() });
    check('G6b und der Dialog bleibt bei der Absage',
      !!d && /connected wallet is enough/i.test(d) && d.indexOf(TREASURY) < 0, d ? d.slice(0, 400) : d);
  }

  console.log('\n-- G5 · Spiel: crTier folgt der Identitaet --');
  await setIdentity({ connected: true, addr: WALLET });
  {
    await page.evaluate(() => window.crTier.refresh(true));
    await page.waitForTimeout(400);
    const calls = await page.evaluate(() => window.__v943.statusCalls.slice());
    check('G5a ohne Konto, mit Wallet: die Stufe wird FUER DIE WALLET erfragt',
      calls.length === 1 && calls[0].indexOf('wallet=' + WALLET) >= 0, calls);
    check('G5b und sie wird uebernommen statt auf FREE zu bleiben',
      (await page.evaluate(() => window.crTier.tier())) === 'RUNNER_PRO');
  }
  await setIdentity({ connected: false, addr: '' });
  {
    await page.evaluate(() => window.crTier.refresh(true));
    await page.waitForTimeout(400);
    const calls = await page.evaluate(() => window.__v943.statusCalls.slice());
    check('G5c weder Konto noch Wallet: gar keine Abfrage, FREE ist hier eine Auskunft',
      calls.length === 0 && (await page.evaluate(() => window.crTier.tier())) === 'FREE', calls);
  }

  await page.close();
}

/* ══════════════════════════════════════════════════════════════════════════ */
(async () => {
  const browser = await chromium.launch(launchOptions());
  await pricingPart(browser);
  await gamePart(browser);

  console.log('\n-- Q1 · Quelltext --');
  {
    const GAME_CODE = strip(fs.readFileSync(GAME, 'utf8'));
    check('Q1a kein bedingungsloser Authorization-Kopf mehr (beide Dateien)',
      /if\(id\.tok\) headers\['Authorization'\]/.test(PRICING_CODE) &&
      /if\(id\.tok\) headers\['Authorization'\]/.test(GAME_CODE), 'CODE');
    check('Q1b beide Dateien pruefen die Adresse in DERSELBEN Form wie der Worker',
      (PRICING_CODE.match(/\[1-9A-HJ-NP-Za-km-z\]\{32,44\}/g) || []).length >= 1 &&
      (GAME_CODE.match(/\[1-9A-HJ-NP-Za-km-z\]\{32,44\}/g) || []).length >= 2, 'CODE');
    /* Die Verknuepfungs-Zeremonie gehoert in den Ownership-Worker. Baute der
     * Client eine zweite Fassung, liefen zwei Auslegungen derselben Regel
     * auseinander — bei einer Regel, an der bezahltes Pro haengt. */
    check('Q1c der Zahl-Dialog baut KEINE zweite Verknuepfungs-Zeremonie',
      !/signMessage/.test(PRICING_CODE) && PRICING_CODE.indexOf('link-wallet') < 0, 'CODE');
    check('Q1d pricing.html laedt weiterhin KEINEN Wallet-Adapter (Single-File-Regel)',
      !/wallet-adapter|@solana\/web3/.test(PRICING_HTML), 'HTML');
    check('Q1e die Version steht sichtbar und ist dieselbe wie im Spiel-Banner',
      (function(){
        const m = /CURRENT VERSION:\s*(v[\d.]+)/.exec(fs.readFileSync(GAME, 'utf8').slice(0, 20000));
        return !!m && PRICING_HTML.indexOf('Pricing page build <b>' + m[1] + '</b>') >= 0;
      })(), 'HTML');
  }

  console.log('\n-- Regression --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|not trusted|v943/i.test(m));
    check('R1 keine harten Page-Errors ueber den ganzen Lauf', hard.length === 0, hard.slice(0, 3));
  }

  await browser.close();
  console.log(`\nv943 Pro-Zahlweg Konto ODER Wallet: ${pass}/${pass + fail} checks passed, ${fail} UNGETESTET/rot`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
