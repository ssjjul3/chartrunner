/* Smoke-Verifikation fuer v1.0.869 (Devnet-Probe im Wallet-Picker).
 *
 * Der Worker ist eine Attrappe — er ist zum Testzeitpunkt live noch nicht
 * einsatzbereit (sein RPC antwortet mit 403). Genau deshalb wird der Fall
 * „Worker meldet sich als nicht bereit" hier mitgeprueft: er ist gerade der
 * WAHRSCHEINLICHSTE, nicht der exotische.
 *
 * Aufruf:  npm i playwright && node scripts/check_v869_devnet_probe_browser.cjs
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

function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:devnet'], features: [] };
  window.__signCalls = [];
  const w = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:devnet'], accounts: [acct],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (input) => {
          window.__signCalls.push({ chain: input.chain, len: (input.transaction || []).length });
          if(window.__signMode === 'reject') throw new Error('User rejected the request.');
          if(window.__signMode === 'stale')  throw new Error('Blockhash not found');
          const sig = new Uint8Array(64); sig[0] = 9; sig[63] = 7;
          return [{ signature: sig }];
        } },
    },
  };
  window.addEventListener('wallet-standard:app-ready', e => {
    const api = e.detail; (typeof api === 'function' ? api : api.register)(w);
  });
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', r => r.request().url().startsWith('file:')
    ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  let txMode = 'ok';
  const txCalls = [];
  await page.route('**chartrunner-tx.jsg-951.workers.dev/**', async route => {
    const req = route.request();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch(_){}
    txCalls.push({ url: req.url(), method: req.method(), body });
    if(txMode === 'rpc')  return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ ok: false, rpc_ok: false, rpc_note: 'RPC antwortete mit HTTP 403' }) });
    if(txMode === 'gone') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if(txMode === 'dead') return route.abort('failed');
    if(txMode === 'empty') return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, cluster: 'devnet' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, transaction: btoa('\x01\x02\x03\x04'), cluster: 'devnet',
      blockhash: 'FakeB1ockhash', expires_in_s: 75,
      note: 'Unsigniert. Signiert wird ausschliesslich in der Wallet des Nutzers.' }) });
  });
  await page.addInitScript(mockWallet);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const openPicker = () => page.evaluate(() => { crWallet.openWalletPicker(); });
  const probeText  = () => page.evaluate(() => {
    const p = document.getElementById('crWalletPickerProbe'); return p ? p.textContent : ''; });
  const tap = (choice) => page.evaluate(c => {
    document.querySelector('[data-cr-wallet-choice="' + c + '"]').click(); }, choice);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  check('Banner meldet mindestens v1.0.869',
    (() => { const v = (banner.match(/v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
      return v.length === 3 && (v[0] > 1 || v[1] > 0 || v[2] >= 869); })(), banner.slice(0, 70));
  check('window.crTxApi existiert', await page.evaluate(() => !!(window.crTxApi && crTxApi.memo)));

  console.log('\n-- Picker vor dem Verbinden --');
  await openPicker(); await page.waitForTimeout(250);
  check('Devnet-Probe ist verborgen, solange nichts verbunden ist',
    await page.evaluate(() => document.getElementById('crWpDevnetBtn').style.display === 'none'));
  check('„More wallets" nennt die hier gefundene Wallet',
    /MockPhantom/.test(await page.evaluate(() => document.getElementById('crWpBridgeSub').textContent)),
    await page.evaluate(() => document.getElementById('crWpBridgeSub').textContent));

  console.log('\n-- Verbinden in der Seite (kein Sprung nach /solana-connect/) --');
  const urlBefore = page.url();
  await tap('bridge'); await page.waitForTimeout(600);
  check('die Seite wurde NICHT verlassen', page.url() === urlBefore, page.url());
  check('Rueckmeldung nennt die verbundene Wallet', /MockPhantom/.test(await probeText()), await probeText());
  check('crWallet kennt jetzt dieselbe Adresse',
    /^CRtestWa11et/.test(await page.evaluate(() => crWallet.get() || '')));

  await openPicker(); await page.waitForTimeout(250);
  check('Devnet-Probe erscheint jetzt',
    await page.evaluate(() => document.getElementById('crWpDevnetBtn').style.display !== 'none'));
  check('Picker startet ohne alte Rueckmeldung', (await probeText()) === '', await probeText());

  console.log('\n-- Worker nicht einsatzbereit (der aktuelle Live-Zustand) --');
  txMode = 'rpc';
  await tap('devnet'); await page.waitForTimeout(700);
  let t = await probeText();
  check('sagt, dass es am Server liegt, nicht am Nutzer', /Serverproblem, nicht deines/.test(t), t);
  check('nennt den RPC-Grund im Klartext', /403/.test(t), t);
  check('es wurde NICHT zum Signieren aufgefordert',
    await page.evaluate(() => window.__signCalls.length === 0));

  console.log('\n-- Worker fehlt / offline --');
  txMode = 'gone';
  await tap('devnet'); await page.waitForTimeout(700);
  check('404 → Hinweis auf fehlendes Deploy', /deployt/.test(await probeText()), await probeText());
  txMode = 'dead';
  await tap('devnet'); await page.waitForTimeout(700);
  check('Netzfehler → offline, nicht „unbekannt"', /nicht erreichbar/.test(await probeText()), await probeText());

  console.log('\n-- 200 ohne Transaktion --');
  // Beim Testschreiben aufgefallen: ohne Pruefung ginge `undefined` an die
  // Wallet und der Nutzer saehe „bad-tx" statt der Wahrheit.
  txMode = 'empty';
  await tap('devnet'); await page.waitForTimeout(700);
  check('leere Antwort wird benannt, nicht an die Wallet weitergereicht',
    /keine Transaktion/.test(await probeText()), await probeText());

  console.log('\n-- Der gute Fall --');
  txMode = 'ok';
  await tap('devnet'); await page.waitForTimeout(900);
  t = await probeText();
  check('meldet signiert und gesendet', /Signiert und gesendet/.test(t), t);
  const link = await page.evaluate(() => {
    const a = document.querySelector('#crWalletPickerProbe a'); return a ? a.getAttribute('href') : ''; });
  check('Explorer-Link zeigt auf DEVNET', /cluster=devnet/.test(link), link);
  check('Explorer-Link traegt die Signatur', /explorer\.solana\.com\/tx\/[1-9A-HJ-NP-Za-km-z]{20,}/.test(link), link);

  const sent = await page.evaluate(() => window.__signCalls.slice(-1)[0]);
  check('an die Wallet ging solana:devnet', sent.chain === 'solana:devnet', sent);
  check('die vier gebauten Bytes kamen an', sent.len === 4, sent);

  const body = txCalls[txCalls.length - 1].body;
  check('cluster wird mitgeschickt, nie stillschweigend angenommen', body.cluster === 'devnet', body);
  check('payer ist die verbundene Adresse', /^CRtestWa11et/.test(body.payer || ''), body.payer);
  check('POST, nicht GET', txCalls[txCalls.length - 1].method === 'POST');

  console.log('\n-- Abbruch und Ablauf --');
  await page.evaluate(() => { window.__signMode = 'reject'; });
  await tap('devnet'); await page.waitForTimeout(900);
  check('Abbruch: „es wurde nichts gesendet"', /nichts gesendet/.test(await probeText()), await probeText());
  await page.evaluate(() => { window.__signMode = null; });

  console.log('\n-- kein Hintergrundbetrieb --');
  const n0 = txCalls.length;
  await page.waitForTimeout(3000);
  check('der Worker wird nicht von selbst angerufen', txCalls.length === n0, { n0, now: txCalls.length });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
