/* Smoke-Verifikation fuer v1.0.875 — die Deckel-Probe.
 *
 * Der wichtigste Test hier ist NICHT „0,06 wird abgelehnt". Es ist die Grenze:
 * der Client schickt bei jedem Handel EXAKT max_in_lamports. Prueft der Worker
 * `>=` statt `>`, wird jeder Handel abgelehnt und das Feature ist tot — ohne
 * dass irgendeine Meldung das sagt. Beide Richtungen dieser Grenze werden hier
 * geprueft, und beide muessen ihre eigene, unverwechselbare Diagnose ergeben.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v875_cap_probe_browser.cjs
 * Bewusst nicht in ci.yml — der CI-Job hat keinen Browser.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(name, cond, extra){
  if(cond){ pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
function launchOptions(){
  const opts = { headless: true };
  const cands = [process.env.CR_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ opts.executablePath = c; break; }
  return opts;
}

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const CAP  = 50000000;

function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__setNet = n => { acct.chains = [n]; };
  window.__signs = [];
  const w = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:mainnet', 'solana:devnet'], accounts: [acct],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (input) => {
          window.__signs.push({ chain: input.chain });
          const sig = new Uint8Array(64); sig[0] = 5; sig[63] = 3;
          return [{ signature: sig }];
        } },
    },
  };
  window.addEventListener('wallet-standard:app-ready', e => {
    const api = e.detail; (typeof api === 'function' ? api : api.register)(w);
  });
}

const quote = (inRaw) => ({
  transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
  quote: { in_raw: String(inRaw), out_raw: '3520000000000', min_out_raw: '3502400000000',
           price_impact_pct: 0.0023, slippage_bps: 50 },
  cap:  { max_in_lamports: CAP, max_slippage_bps: 100, output_allowlist: [BONK] },
  fee:  { base_lamports: 5000, priority_lamports: null, set_by_worker: false },
  checked: { instructions_match_request: false },
});
const overCap = (given) => ({ ok: false, error: 'over-cap', given: String(given),
  cap: { max_in_lamports: CAP } });

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', r => r.request().url().startsWith('file:')
    ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  // 'gesund'   — Deckel haelt genau richtig
  // 'zu-eng'   — Worker lehnt schon den erlaubten Betrag ab  (>= statt >)
  // 'undicht'  — Worker laesst auch darueber durch
  let mode = 'gesund';
  const calls = [];
  await page.route('**chartrunner-tx.jsg-951.workers.dev/**', async route => {
    const req = route.request();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch(_){}
    calls.push({ url: req.url(), method: req.method(), body });
    const amt = Number(body.amount_raw);
    const json = (status, obj) => route.fulfill({ status, contentType: 'application/json',
      body: JSON.stringify(obj) });
    if(mode === 'zu-eng')  return json(400, overCap(amt));
    if(mode === 'undicht') return json(200, quote(amt));
    // Deterministisches Zeitfenster fuer den Zwischenzustand: die ZWEITE
    // Anfrage haengt, damit „waehrend die Probe laeuft" wirklich messbar ist
    // statt erhofft.
    if(mode === 'gesund-langsam' && amt > CAP) await new Promise(r => setTimeout(r, 2500));
    return amt > CAP ? json(400, overCap(amt)) : json(200, quote(amt));
  });

  await page.addInitScript(mockWallet);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.875',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 875)))),
    banner.slice(0, 60));
  check('_crProbeCap existiert', await page.evaluate(() => typeof _crProbeCap === 'function'));

  const build = () => page.evaluate((mint) => {
    const host = document.createElement('div');
    host.innerHTML = '<button type="button" data-cr-swap="' + mint + '">go</button>'
                   + '<button type="button" data-cr-cap-probe="' + mint + '">probe</button>'
                   + '<div data-cr-swap-panel="' + mint + '" style="display:none"></div>';
    document.body.appendChild(host);
    _crWireSwap(host, mint);
    window.__host = host;
    return true;
  }, BONK);
  const probe = () => page.evaluate(() => window.__host.querySelector('[data-cr-cap-probe]').click());
  const trade = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap]').click());
  const panel = () => page.evaluate(() => window.__host.querySelector('[data-cr-swap-panel]').textContent);
  const settle = async (re, ms = 15000) => {
    const t0 = Date.now();
    for(;;){ const t = await panel(); if(re.test(t)) return t;
      if(Date.now() - t0 > ms) return t; await page.waitForTimeout(150); }
  };
  const swapsSince = m => calls.slice(m).filter(c => /\/v1\/tx\/swap/.test(c.url)).length;

  console.log('\n-- Ohne Wallet --');
  let mark = calls.length;
  await build(); await probe(); await page.waitForTimeout(300);
  check('ohne Verbindung wird nichts gefragt', /Wallet verbinden/.test(await panel()), await panel());
  check('und nichts geschickt', swapsSince(mark) === 0, swapsSince(mark));

  await page.evaluate(() => crSigner.connect());
  await page.waitForTimeout(400);

  console.log('\n-- Falsches Netz --');
  await page.evaluate(() => window.__setNet('solana:devnet'));
  mark = calls.length;
  await build(); await probe(); await page.waitForTimeout(400);
  let t = await panel();
  check('Wallet auf devnet → Warnung statt Probe', /braucht/.test(t) && /mainnet/.test(t), t.slice(0, 80));
  check('nichts geschickt', swapsSince(mark) === 0, swapsSince(mark));
  await page.evaluate(() => window.__setNet('solana:mainnet'));

  console.log('\n-- Gesunder Deckel --');
  mode = 'gesund';
  mark = calls.length;
  await build(); await probe(); t = await settle(/hält|verhält/);
  check('der erlaubte Betrag geht durch', /Der erlaubte Betrag geht durch/.test(t), t.slice(0, 200));
  check('ein Lamport darüber wird abgelehnt', /Der Deckel hat gehalten/.test(t), t.slice(0, 300));
  check('Gesamturteil ist positiv',
    /Der Deckel hält, und er sperrt nicht zu früh/.test(t), t.slice(-160));
  check('es wurde NICHT signiert', await page.evaluate(() => window.__signs.length === 0));
  check('sagt ausdrücklich, dass nichts gesendet wurde', /nie signiert/.test(t), t.slice(-140));

  const sent = calls.slice(mark).filter(c => /\/v1\/tx\/swap/.test(c.url));
  check('genau zwei Anfragen', sent.length === 2, sent.length);
  check('erste Anfrage ist der Betrag eines echten Handels',
    sent[0] && sent[0].body.amount_raw === String(CAP), sent[0] && sent[0].body.amount_raw);
  check('zweite Anfrage ist GENAU ein Lamport darüber',
    sent[1] && sent[1].body.amount_raw === String(CAP + 1), sent[1] && sent[1].body.amount_raw);
  check('die Grenze kam aus der Antwort, nicht aus dem Client',
    sent[1] && Number(sent[1].body.amount_raw) - Number(sent[0].body.amount_raw) === 1);
  check('beide mit cluster mainnet', sent.every(c => c.body.cluster === 'mainnet'));
  check('POST, nicht GET', sent.every(c => c.method === 'POST'));

  /* Der Fall, der das Feature still toetet: der Worker lehnt den Betrag ab,
   * den das Spiel selbst schickt. Das darf nicht als „Deckel haelt" durchgehen —
   * es ist das genaue Gegenteil. */
  console.log('\n-- Deckel sperrt zu frueh (>= statt >) --');
  mode = 'zu-eng';
  mark = calls.length;
  await build(); await probe(); t = await settle(/falsch herum|Nicht handeln/);
  check('wird als Fehler benannt, nicht als Erfolg', !/Der Deckel hat gehalten/.test(t), t.slice(0, 240));
  check('nennt den Vergleich als Ursache', /falsch herum/.test(t), t.slice(0, 300));
  check('sagt, dass so kein Handel zustande kommt', /kein Handel zustande/.test(t), t.slice(0, 320));
  check('rät ausdrücklich ab', /Nicht handeln/.test(t), t.slice(-120));
  check('bricht ab statt weiterzufragen', swapsSince(mark) === 1, swapsSince(mark));

  console.log('\n-- Deckel ist undicht --');
  mode = 'undicht';
  mark = calls.length;
  await build(); await probe(); t = await settle(/DURCHGELASSEN|verhält/);
  check('durchgelassener Betrag wird als Fehlschlag gemeldet', /DURCHGELASSEN/.test(t), t.slice(0, 300));
  check('Gesamturteil ist negativ',
    /verhält sich nicht wie angegeben/.test(t) && !/Der Deckel hält/.test(t), t.slice(-180));
  check('immer noch nichts signiert', await page.evaluate(() => window.__signs.length === 0));

  /* Eine Tafel, ein Zustand: waehrend die Probe laeuft, darf der Handel-Knopf
   * nicht dazwischenschreiben. Derselbe Fehler wie in v1.0.874, andere Tuer. */
  console.log('\n-- Probe und Handel teilen sich die Tafel --');
  mode = 'gesund-langsam';
  await build();
  await probe();
  await settle(/Lamport darüber …/);          // Probe haengt jetzt in Anfrage 2
  await trade(); await page.waitForTimeout(400);
  const mid = await panel();
  // Gemessen wird die Tafel, nicht der Anfragezaehler: die Probe schickt ihre
  // eigenen zwei Anfragen, ein Zaehler kann die nicht vom Handel trennen.
  check('waehrend der Probe uebernimmt der Handel die Tafel nicht',
    !/Bevor du signierst/.test(mid) && /Deckel-Probe/.test(mid), mid.slice(0, 110));
  check('und hat nichts signiert', await page.evaluate(() => window.__signs.length === 0));
  await settle(/hält|verhält/);
  mode = 'gesund';
  mark = calls.length;
  await trade(); await settle(/Mindestens/, 6000);
  check('nach der Probe ist die Tafel wieder frei', swapsSince(mark) === 1, swapsSince(mark));

  console.log('\n-- kein Hintergrundbetrieb --');
  const n0 = calls.length;
  await page.waitForTimeout(3000);
  check('der Worker wird nicht von selbst angerufen', calls.length === n0, { n0, now: calls.length });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
