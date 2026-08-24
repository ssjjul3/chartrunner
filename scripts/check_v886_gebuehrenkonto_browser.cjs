/* Smoke-Verifikation fuer v1.0.886 — NEUGEFASST in v1.0.888.
 *
 * Der urspruengliche Pruefgegenstand — der Gebuehrenkonto-Knopf in der
 * Wallet-Auswahl samt Devnet-Proben-Sichtbarkeitsgrenze — wurde in v1.0.888
 * auf Julians Vorgabe ENTFERNT: obsolete Werkzeuge verschwinden, sobald sie
 * nicht mehr gebraucht werden. Das Anlegen sitzt jetzt am Fehler selbst in
 * der Handels-Tafel; DIESEN Flow prueft check_v888 (Knopf am
 * fee-account-missing, Tap 1 mit Adressen/Miete aus der Antwort, mint in der
 * Anfrage, already_exists als Auskunft).
 *
 * Hier bleibt, was v886 ueber den Knopf hinaus festgeschrieben hat:
 *   - crTxApi.ata existiert und nimmt payer (+ seit v888: mint);
 *   - die Gebuehren-Lage wird am EXAKTEN Fehlercode erkannt, nicht per
 *     Textsuche ueber error/note (der 103f504-Fix);
 *   - der alte Pruefgegenstand ist nachweislich weg.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v886_gebuehrenkonto_browser.cjs
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
  const cands = [process.env.CR_CHROME_PATH].filter(Boolean);
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-'))
    cands.push(path.join(root, d, 'chrome-linux', 'chrome')); } catch(_){}
  for(const c of cands) if(c && fs.existsSync(c)){ opts.executablePath = c; break; }
  return opts;
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  const ataBodies = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.route('**://**', async route => {
    const req = route.request();
    if(req.url().startsWith('file:')) return route.continue();
    if(/\/v1\/tx\/ata/.test(req.url())){
      try { ataBodies.push(JSON.parse(req.postData() || '{}')); } catch(_){ ataBodies.push({}); }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, already_exists: true }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2200);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  check('crTxApi.ata existiert', await page.evaluate(() => !!(window.crTxApi && crTxApi.ata)));

  console.log('\n-- Der ata-Vertrag --');
  await page.evaluate(() => crTxApi.ata('CRtestWa11etAddre55111111111111111111111111'));
  await page.waitForTimeout(300);
  let b = ataBodies[ataBodies.length - 1] || {};
  check('payer und cluster werden mitgeschickt',
    /^CRtestWa11et/.test(b.payer || '') && b.cluster === 'mainnet', b);
  check('ohne mint KEIN mint-Feld — die Anker-Vorgabe trifft der Worker',
    !('mint' in b), b);
  await page.evaluate(() => crTxApi.ata('CRtestWa11etAddre55111111111111111111111111',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'));
  await page.waitForTimeout(300);
  b = ataBodies[ataBodies.length - 1] || {};
  check('mit mint traegt die Anfrage den Mint (v888: je Eingabe-Asset ein Konto)',
    b.mint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', b);

  console.log('\n-- Der 103f504-Kern: Exakt-Code statt Textsuche --');
  const src = fs.readFileSync(FILE, 'utf8');
  check('_ATA_FEE_CODES existiert als exakte Liste',
    /_ATA_FEE_CODES\s*=\s*\[/.test(src));
  check('die Fee-Lage wird per Exakt-Vergleich erkannt',
    /_ATA_FEE_CODES\.indexOf\(code\)\s*!==\s*-1/.test(src));
  check('KEINE Textsuche /fee|gebuehr/ mehr ueber error und note',
    !/\/fee\|gebuehr\|geb/.test(src));

  console.log('\n-- Der alte Pruefgegenstand ist wirklich weg (v888) --');
  check('kein Gebuehrenkonto-Knopf in der Wallet-Auswahl',
    src.indexOf('id="crWpAtaBtn"') === -1);
  check('keine Devnet-Probe in der Wallet-Auswahl',
    src.indexOf('id="crWpDevnetBtn"') === -1);

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
