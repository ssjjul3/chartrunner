/* Smoke-Verifikation v1.0.939 — DER CLIENT FRAGT DEN SERVER, STATT UEBER IHN
 * ZU BEHAUPTEN.
 *
 * BEFUND, den diese Datei absichert (gemessen am Quelltext v1.0.938): der
 * Boost-Dialog zeigte bei JEDEM Fehlschlag von POST /v1/boost/intent denselben
 * Satz — „Der Boost-Checkout ist serverseitig noch nicht freigeschaltet." —
 * und NANNTE damit eine Ursache, die der Client nie geprueft hatte.
 * paintUnavailable() ist der else-/catch-Zweig von startIntent(); er greift
 * genauso, wenn der Checkout laengst scharf ist und nur der Kursabruf haengt.
 * Zusaetzlich warf `r.ok ? r.json() : null` den Grund weg, den der Worker seit
 * PR #90 als 503 { error, reason } mitschickt.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, an der einzigen Stelle,
 * an der die Frage entschieden wird: AM DOM. Nicht an einer Absicht, nicht an
 * einem Aufruf — ein Nutzer tippt auf das, was dasteht.
 *
 * Die beiden Endpunkte werden ueber ein fetch-Doppel gesteuert
 * (window.__v939.health / .intent). Das Doppel steht VOR jedem Skript der
 * Seite; *.workers.dev ist aus dieser Sandbox ohnehin nicht erreichbar, ein
 * Test, der davon abhinge, waere gruen aus dem falschen Grund.
 *
 * T1  /health sagt ok — vier Karten, Preise AUS DER ANTWORT (nicht aus der
 *     Client-Ratecard), Kaufknoepfe da.
 * T2  /health sagt ok:false — KEIN Kaufknopf, und der Grund des SERVERS steht
 *     woertlich da.
 * T3  /health nicht erreichbar — KEIN Kaufknopf, und der Text sagt
 *     ausdruecklich, dass das keine Aussage ueber die Freischaltung ist.
 * T4  /health antwortet ohne `features` — zaehlt als „nicht gefragt", nicht
 *     als „freigeschaltet".
 * T5  eine Stufe in `unavailable` — sie wird BENANNT (mit Grund) und hat
 *     keinen Knopf; die anderen bleiben verkaeuflich.
 * T6  Dialog, Intent kommt — Adresse, Betrag UND die Referenz stehen da, alle
 *     aus der Antwort.
 * T7  Dialog, Worker lehnt mit 503 + reason ab — der Grund steht da, es gibt
 *     kein `solana:` und keinen Betrag.
 * T8  Quelltext — kein $RUN-Preis mehr an der Boost-Tafel, und die Tafel liest
 *     keine Preise mehr aus crEntitlement.
 * T9  Regressionen — keine harten Page-Errors, Handelsstrecke unberuehrt.
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet (CLAUDE.md · ROT/CRASH/GRUEN). Jede
 * Mutation wurde EINZELN in ChartRunner_Prototype.html eingebaut, die Suite
 * lief vollstaendig, danach wurde die Datei wiederhergestellt. KEINE davon war
 * CRASH: jeder Lauf ging durch, T9a („keine harten Page-Errors") blieb jedes
 * Mal gruen — rot wurde nur, was die jeweilige Zeile behauptet. Kontrolllauf
 * ohne Mutation: 41/41 gruen.
 *
 *   M1  `noanswer` faellt auf die Client-Ratecard zurueck (die Bauform von
 *       v938: keine Antwort => trotzdem Karten mit 49/149/399/999).
 *       ROT: T3 (throw ×3), T3 (http500 ×3), T4a
 *
 *   M2  Eine Antwort OHNE `features` zaehlt als freigeschaltet
 *       (`state: 'ok'` fest, Fruehausstieg gestrichen).
 *       ROT: T2b
 *       T4a bleibt gruen und das ist KEINE Luecke, sondern eine Ablesung: ohne
 *       den Fruehausstieg wirft `f.ok` auf einem featurelosen Koerper, der
 *       catch macht daraus `noanswer`, und der Endzustand ist wieder
 *       knopflos — derselbe sichere Ausgang auf einem anderen Weg. Gemessen
 *       wird das von T2b, weil dort ein GUELTIGER Koerper vorliegt und die
 *       Mutation `ok:false` in `ok` umdeutet.
 *
 *   M3  Eine Stufe ohne Serverpreis wird aus der Ratecard aufgefuellt — der
 *       Rueckfall, der wie ein Preis aussieht und keiner ist.
 *       ROT: T1b, T1c, T1d, T5d
 *
 *   M4  Die Referenz steht wieder nur im `solana:`-Link (refHTML liefert '').
 *       ROT: T6b
 *       T6d/T6e bleiben gruen und MUESSEN es: der Link traegt sie ja weiter —
 *       genau das war der alte Zustand, in dem niemand sie ablesen konnte.
 *
 *   M5  Der Grund aus dem 503 wird wieder weggeworfen (`r.ok ? r.json() : null`).
 *       ROT: T7a, T8d
 *
 *   M6  paintUnavailable sagt wieder den festen Satz auf und zeigt keinen Grund.
 *       ROT: T7a, T7d
 *
 *   M7  Der Zustand `off` malt trotzdem Kaufknoepfe.
 *       ROT: T2a, T2b, T4b
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
const HTML = fs.readFileSync(FILE, 'utf8');
// Der Versions-Banner ist ein HTML-Kommentar und ZITIERT die alte Sperrmeldung
// woertlich — er muss das, sonst steht im Banner nicht, was der Patch behebt.
// T8 fragt nach CODE, also wird der Kommentar vorher entfernt.
const CODE = HTML.replace(/<!--[\s\S]*?-->/g, '');

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

/* Die Preise im Test sind ABSICHTLICH andere als die der Client-Ratecard
 * (49/149/399/999). Nur so ist unterscheidbar, woher eine angezeigte Zahl
 * stammt — mit denselben Zahlen waere ein Rueckfall auf die Client-Kopie von
 * einem korrekten Lesen des Servers nicht zu trennen. */
const SRV_TIERS = [
  { id: 'spark',     usd: 77,  hours: 9 },
  { id: 'blaze',     usd: 188, hours: 26 },
  { id: 'inferno',   usd: 411, hours: 71 },
  { id: 'supernova', usd: 909, hours: 170 }
];
const CLIENT_PRICES = ['49', '149', '399', '999'];
/* 20.09.2026 — die Begruendung, die der Worker heute schickt. Sie lautete bis
 * zur Pyth-Entfernung „Preisquelle (Pyth/Hermes) hat nicht geantwortet“. Der
 * Test prueft unveraendert, dass der Client den Grund des SERVERS zeigt und
 * keinen eigenen erfindet — nur die Zeichenkette ist die heutige. */
const OFF_REASON = 'price_feed: Keine Kursquelle konfiguriert';
const TIER_REASON = 'BOOST_HOURS_INFERNO ist nicht gesetzt - diese Stufe wird nicht angeboten.';
const WORKER_TREASURY = 'WkR939TreasuryFromWorkerZZZZZZZZZZZZZZZZZZZZ';
const REF = 'Ref939VisibleOnScreenZZZZZZZZZZZZZZZZZZZZZZZ';
const TEST_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const INTENT_REASON = 'BOOST_PRICE_SPARK ist nicht gesetzt - diese Stufe wird nicht angeboten.';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if(/dexscreener/.test(url)) return J({ pairs: [] });
    return J({});
  });

  await page.addInitScript(() => {
    window.__v939 = { health: null, healthMode: 'ok', intent: null, intentStatus: 200, calls: [] };
    const real = window.fetch;
    window.fetch = function(input){
      const u = String((input && input.url) ? input.url : input);
      window.__v939.calls.push(u);
      const json = (o, st) => Promise.resolve(new Response(JSON.stringify(o), {
        status: st || 200, headers: { 'Content-Type': 'application/json' } }));
      if(/\/health$/.test(u)){
        const m = window.__v939.healthMode;
        if(m === 'throw') return Promise.reject(new TypeError('v939: Failed to fetch'));
        if(m === 'http500') return Promise.resolve(new Response('', { status: 500 }));
        return json(window.__v939.health || {});
      }
      if(/\/v1\/boost\/intent$/.test(u)) return json(window.__v939.intent || {}, window.__v939.intentStatus);
      if(/\/v1\/boost\/status/.test(u)) return json({ status: 'pending' });
      if(/\/v1\/boosts$/.test(u)) return json({ boosts: [] });
      return real.apply(this, arguments);
    };
    // Eine frische Tafel pro Test, damit kein Zustand von vorhin mitmisst.
    window.__v939.panel = function(){
      let el = document.getElementById('crTokBoostPanel');
      if(!el){ el = document.createElement('div'); el.id = 'crTokBoostPanel'; document.body.appendChild(el); }
      return el;
    };
    window.__v939.closeAll = function(){
      Array.prototype.slice.call(document.querySelectorAll('body > div'))
        .forEach(d => { if(d.querySelector('.crBoostX')) d.remove(); });
    };
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const healthBody = (over) => Object.assign({
    ok: true, name: 'chartrunner-worker', git_sha: 'abc1234', signs: false,
    chain: 'mainnet', treasury: WORKER_TREASURY,
    features: { boost_checkout: { ok: true, checks: {}, tiers: SRV_TIERS, unavailable: [] } }
  }, over || {});

  /** Setzt /health, leert den Cache und malt die Tafel neu. Gibt das DOM zurueck. */
  const paint = async (mode, body) => page.evaluate(async (o) => {
    window.__v939.healthMode = o.mode;
    window.__v939.health = o.body;
    window.__v939.closeAll();
    const el = window.__v939.panel();
    await window.crBoostHealth(true);          // force: TTL ueberspringen
    window._tokRepaintBoostPanel();
    return { html: el.innerHTML, text: el.innerText, buttons: el.querySelectorAll('.cr-tokBoostBuy').length };
  }, { mode, body: body || null });

  const openBoost = async (tierId) => {
    await page.evaluate(m => { window.__v939.closeAll(); window.crBoostCheckout(m.tier, m.mint); }, { tier: tierId, mint: TEST_MINT });
    await page.waitForTimeout(120);
    await page.evaluate(() => { const b = document.querySelector('.crBoostNext'); if(b) b.click(); });
    await page.waitForTimeout(320);
    return page.evaluate(() => {
      const ov = Array.prototype.slice.call(document.querySelectorAll('body > div')).filter(d => d.querySelector('.crBoostX')).pop();
      if(!ov) return { html: '', text: '', links: 0 };
      return { html: ov.innerHTML, text: ov.innerText, links: ov.querySelectorAll('a[href^="solana:"]').length };
    });
  };

  console.log('\n-- Boot --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|v939/i.test(m));
    check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
    check('das fetch-Doppel steht (sonst misst hier nichts etwas)',
      await page.evaluate(() => typeof window.__v939 === 'object' && Array.isArray(window.__v939.calls)));
    check('crBoostHealth, crBoostCheckout und die Tafel sind erreichbar',
      await page.evaluate(() => typeof window.crBoostHealth === 'function'
        && typeof window.crBoostCheckout === 'function'
        && typeof window._tokRepaintBoostPanel === 'function'));
  }

  /* ═══ T1 — /health sagt ok ═══════════════════════════════════════════════ */
  console.log('\n-- T1 · /health sagt ok --');
  {
    const d = await paint('ok', healthBody());
    check('T1a vier Kaufknoepfe', d.buttons === 4, { buttons: d.buttons });
    check('T1b die Preise stammen aus der ANTWORT', SRV_TIERS.every(t => d.text.indexOf('$' + t.usd) >= 0), d.text.slice(0, 300));
    check('T1c KEIN Preis aus der Client-Ratecard', CLIENT_PRICES.every(p => d.text.indexOf('$' + p) < 0), d.text.slice(0, 300));
    check('T1d die Laufzeiten stammen aus der ANTWORT (9h, 26h, 71h, 170h)',
      ['9h', '26h', '71h', '170h'].every(h => d.text.indexOf(h) >= 0), d.text.slice(0, 300));
    check('T1e KEIN $RUN-Preis neben dem Kaufknopf', d.html.indexOf('$RUN') < 0);
    check('T1f /health wurde wirklich gefragt',
      await page.evaluate(() => window.__v939.calls.some(u => /\/health$/.test(u))));
  }

  /* ═══ T2 — /health sagt ok:false ═════════════════════════════════════════ */
  console.log('\n-- T2 · /health sagt ok:false --');
  {
    const d = await paint('ok', healthBody({ ok: false, features: { boost_checkout: {
      ok: false, reason: OFF_REASON, checks: {}, tiers: [], unavailable: [] } } }));
    check('T2a KEIN Kaufknopf', d.buttons === 0, { buttons: d.buttons });
    check('T2b der Grund des SERVERS steht woertlich da', d.text.indexOf(OFF_REASON) >= 0, d.text.slice(0, 400));
    check('T2c die alte Behauptung steht NICHT da', d.text.indexOf('noch nicht freigeschaltet') < 0, d.text.slice(0, 400));
  }

  /* ═══ T3 — /health nicht erreichbar ══════════════════════════════════════ */
  console.log('\n-- T3 · /health nicht erreichbar --');
  for(const mode of ['throw', 'http500']){
    const d = await paint(mode, null);
    check('T3 (' + mode + ') KEIN Kaufknopf', d.buttons === 0, { buttons: d.buttons });
    check('T3 (' + mode + ') der Text sagt, dass NICHT GEFRAGT werden konnte',
      /did not answer|nicht geantwortet|no respondió|没有响应/.test(d.text), d.text.slice(0, 400));
    check('T3 (' + mode + ') und er behauptet NICHT, der Checkout sei nicht freigeschaltet',
      d.text.indexOf('noch nicht freigeschaltet') < 0);
  }

  /* ═══ T4 — Antwort ohne features ═════════════════════════════════════════ */
  console.log('\n-- T4 · /health ohne features --');
  {
    const d = await paint('ok', { ok: true, name: 'chartrunner-worker', git_sha: 'abc1234' });
    check('T4a KEIN Kaufknopf — eine Antwort ohne features ist keine Zusage', d.buttons === 0, { buttons: d.buttons });
    const d2 = await paint('ok', healthBody({ features: { boost_checkout: { ok: true, checks: {}, tiers: [], unavailable: [] } } }));
    check('T4b ok:true OHNE Stufen ergibt auch keinen Knopf', d2.buttons === 0, { buttons: d2.buttons });
  }

  /* ═══ T5 — eine Stufe ist nicht konfiguriert ═════════════════════════════ */
  console.log('\n-- T5 · eine Stufe faellt weg --');
  {
    const d = await paint('ok', healthBody({ features: { boost_checkout: {
      ok: true, checks: {},
      tiers: SRV_TIERS.filter(t => t.id !== 'inferno'),
      unavailable: [{ id: 'inferno', reason: TIER_REASON }] } } }));
    check('T5a nur noch drei Kaufknoepfe', d.buttons === 3, { buttons: d.buttons });
    check('T5b die weggefallene Stufe wird BENANNT', /Inferno/i.test(d.text), d.text.slice(0, 400));
    check('T5c mit ihrem Grund', d.text.indexOf(TIER_REASON) >= 0, d.text.slice(0, 500));
    check('T5d die anderen Preise stehen weiter da', d.text.indexOf('$77') >= 0 && d.text.indexOf('$909') >= 0);
  }

  /* ═══ T6 — Dialog, Intent kommt ══════════════════════════════════════════ */
  console.log('\n-- T6 · Dialog, Intent kommt --');
  {
    await paint('ok', healthBody());
    await page.evaluate((o) => { window.__v939.intentStatus = 200; window.__v939.intent = o; },
      { reference: REF, usdc: 77, sol: 0.41, hours: 9, treasury: WORKER_TREASURY, chain: 'mainnet' });
    const d = await openBoost('spark');
    check('T6a die Zieladresse aus der Antwort steht da', d.text.indexOf(WORKER_TREASURY) >= 0, d.text.slice(0, 500));
    check('T6b DIE REFERENZ steht SICHTBAR da (nicht nur im Link)',
      d.text.indexOf(REF) >= 0, d.text.slice(0, 600));
    check('T6c der Betrag stammt aus der Antwort', d.text.indexOf('77.00') >= 0, d.text.slice(0, 300));
    check('T6d es gibt genau einen ausfuehrbaren solana:-Link', d.links === 1, { links: d.links });
    check('T6e der Link traegt die Referenz', /reference=Ref939VisibleOnScreen/.test(d.html));
  }

  /* ═══ T7 — Dialog, Worker lehnt ab ═══════════════════════════════════════ */
  console.log('\n-- T7 · Dialog, Worker lehnt mit 503 ab --');
  {
    await page.evaluate((o) => { window.__v939.intentStatus = 503; window.__v939.intent = o; },
      { error: INTENT_REASON, reason: 'tier_unconfigured', available: false });
    const d = await openBoost('spark');
    check('T7a der Grund des Workers steht woertlich da', d.text.indexOf(INTENT_REASON) >= 0, d.text.slice(0, 500));
    check('T7b KEIN ausfuehrbarer solana:-Link', d.links === 0 && d.html.indexOf('solana:') < 0);
    check('T7c kein Betrag und keine Adresse', d.text.indexOf(WORKER_TREASURY) < 0 && !/\d+\.\d\d\s*(USDC|SOL)/.test(d.text), d.text.slice(0, 400));
    check('T7d die alte Behauptung steht NICHT da', d.text.indexOf('noch nicht freigeschaltet') < 0, d.text.slice(0, 400));
  }

  /* ═══ T8 — Quelltext ═════════════════════════════════════════════════════ */
  console.log('\n-- T8 · Quelltext --');
  {
    check('T8a der Schluessel tok.hot.inRun kommt NULL mal vor', CODE.indexOf('tok.hot.inRun') < 0);
    check('T8b kein "$RUN saves" und kein "sparst du" mehr an der Boost-Tafel',
      CODE.indexOf('$RUN saves') < 0 && CODE.indexOf('mit $RUN sparst du') < 0);
    // Die Tafel darf keine Preise mehr aus der Ratecard ziehen: `usd` kommt
    // ausschliesslich aus den /health-Stufen. Ein `t.usd` neben einem
    // crEntitlement-Leser waere genau der Rueckfall.
    check('T8c _tokBoostLabel liest aus crEntitlement NUR das Label',
      /function _tokBoostLabel[\s\S]{0,420}?hit\.label/.test(CODE) && !/function _tokBoostLabel[\s\S]{0,420}?hit\.usd/.test(CODE));
    check('T8d der Intent-Fehlerzweig LIEST den Koerper (r.json auch bei !r.ok)',
      /return r\.json\(\)\.then\(function\(j\)\{ return \{ ok: r\.ok, j: j \}/.test(CODE));
    check('T8e die Referenz wird gemalt, nicht nur verlinkt', /function refHTML\(\)/.test(CODE));
  }

  /* ═══ T9 — Regressionen ══════════════════════════════════════════════════ */
  console.log('\n-- T9 · Regressionen --');
  {
    const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|v939/i.test(m));
    check('T9a keine harten Page-Errors ueber den ganzen Lauf', hard.length === 0, hard.slice(0, 3));
    const trade = await page.evaluate(() => ({
      arm: typeof window.crArm === 'object' && typeof crArm.on === 'function',
      vault: typeof window.crVaultLimit === 'object',
      onchain: typeof window.crOnchainLimit === 'object',
      swap: typeof window.crSwap === 'object' || typeof window.crTxApi === 'object',
      ent: typeof window.crEntitlement === 'object' && typeof crEntitlement.boosts === 'function'
    }));
    check('T9b die Handelsstrecke ist unberuehrt', trade.arm && trade.vault && trade.onchain && trade.swap, trade);
    check('T9c crEntitlement.boosts() lebt weiter (Ratecard, jetzt ohne Preis-Leser an der Tafel)', trade.ent);
  }

  await browser.close();
  console.log('\nv939 Boost-Health: ' + pass + '/' + (pass + fail) + ' checks passed, ' + fail + ' rot');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
