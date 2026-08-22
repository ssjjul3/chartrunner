/* Smoke-Verifikation fuer v1.0.868 (crSigner — Wallet Standard ohne Bibliothek).
 *
 * Laeuft headless gegen die Einzeldatei, jeder Netzabruf wird abgefangen.
 * Die Wallet ist eine Attrappe: echte Wallets kann ein CI-Browser nicht
 * stellen. Was hier bewiesen wird, ist die UNSERE Haelfte — Kodierung,
 * Auswahl, Schutzgeländer, Fehlerunterscheidung. Dass echte Wallets sich so
 * verhalten, hat chartrunner.xyz/wallet-probe.html im Phantom-Browser
 * gezeigt; das ist eine andere Art von Beweis und ersetzt diesen nicht.
 *
 * Aufruf:  npm i playwright && node scripts/check_v868_signer_browser.cjs
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

/* Attrappen-Wallet. Registriert sich ueber app-ready — der Weg, den das echte
 * Phantom benutzt hat. Zusaetzlich eine Sui-Instanz mit gleichem Namen, weil
 * Phantom sich live genau so doppelt gemeldet hat. */
function mockWallets(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:devnet'], features: [] };
  window.__calls = { connect: 0, sign: [] };
  const solana = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:devnet', 'solana:mainnet'],
    accounts: [acct],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => {
        window.__calls.connect++; return { accounts: [acct] }; } },
      'standard:disconnect': { version: '1.0.0', disconnect: async () => {} },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (input) => {
          window.__calls.sign.push({
            chain: input.chain,
            bytes: Array.from(input.transaction || []),
            isU8: input.transaction instanceof Uint8Array,
            account: input.account && input.account.address,
          });
          if(window.__mode === 'reject') throw new Error('User rejected the request.');
          if(window.__mode === 'boom')   throw new Error('RPC exploded');
          if(window.__mode === 'nosig')  return [{}];
          // 64 Bytes, letztes = 1 → base58 endet nicht auf lauter Einsen
          const sig = new Uint8Array(64); sig[63] = 1;
          return [{ signature: sig }];
        } },
    },
  };
  // Gleicher Name, anderes Netz — darf NICHT als Solana-Wallet zaehlen.
  const sui = {
    name: 'MockPhantom', version: '1.0.0', icon: '', chains: ['sui:mainnet'], accounts: [],
    features: { 'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [] }) },
                'sui:signPersonalMessage': { version: '1.0.0' } },
  };
  window.addEventListener('wallet-standard:app-ready', e => {
    const api = e.detail; const reg = (typeof api === 'function') ? api : api.register;
    reg(solana); reg(sui);
  });
}

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  await page.route('**://**', r => r.request().url().startsWith('file:')
    ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.addInitScript(mockWallets);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return '';
  });
  // MINDESTversion. Beim Schreiben dieses Checks stand die exakte Nummer hier
  // — zum zweiten Mal in derselben Session, nachdem derselbe Fehler im
  // v867-Check gerade behoben worden war. Ein Test, der bei jedem
  // Versionssprung rot wird, misst die Versionsnummer, nicht sein Thema.
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.868',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 868)))),
    banner.slice(0, 70));
  check('window.crSigner existiert', await page.evaluate(() => !!(window.crSigner && crSigner.signAndSend)));

  console.log('\n-- base58 von Hand (bekannte Vektoren) --');
  const b58 = await page.evaluate(() => {
    const enc = crSigner._bytesToB58;
    const bytes = s => Uint8Array.from([...s].map(c => c.charCodeAt(0)));
    return {
      hello: enc(bytes('Hello World!')),
      zero:  enc(new Uint8Array([0])),
      lead:  enc(new Uint8Array([0, 0, 0, 1])),
      one:   enc(new Uint8Array([1])),
      z:     enc(new Uint8Array([57])),
      f9:    enc(new Uint8Array([58])),
      empty: enc(new Uint8Array([])),
      sig64: enc((() => { const a = new Uint8Array(64); a[63] = 1; return a; })()).length,
    };
  });
  check('„Hello World!" → 2NEpo7TZRRrLZSi2U', b58.hello === '2NEpo7TZRRrLZSi2U', b58.hello);
  check('einzelnes Nullbyte → "1"', b58.zero === '1', b58.zero);
  check('führende Nullbytes bleiben erhalten', b58.lead === '1112', b58.lead);
  check('1 → "2"', b58.one === '2', b58.one);
  check('57 → "z" (letztes Zeichen des Alphabets)', b58.z === 'z', b58.z);
  check('58 → "21" (Übertrag)', b58.f9 === '21', b58.f9);
  check('leere Eingabe → leerer String', b58.empty === '', b58.empty);
  check('64-Byte-Signatur ergibt plausible Länge', b58.sig64 >= 43 && b58.sig64 <= 88, b58.sig64);

  console.log('\n-- base64 → Bytes --');
  const b64 = await page.evaluate(() => {
    const d = crSigner._b64ToBytes;
    return { abc: Array.from(d(btoa('abc'))), url: Array.from(d('_-8=')) };
  });
  check('base64 dekodiert korrekt', JSON.stringify(b64.abc) === '[97,98,99]', b64.abc);
  // '_-8=' → '/+8=' → zwei Bytes. Version 1 dieses Tests behauptete drei.
  check('URL-sichere Variante wird akzeptiert',
    JSON.stringify(b64.url) === '[255,239]', b64.url);

  console.log('\n-- Auswahl --');
  const info0 = await page.evaluate(() => crSigner.info());
  check('beide Wallets registriert', info0.found === 2, info0.found);
  check('nur die Solana-Instanz zählt (Sui aussortiert)', info0.solanaCapable === 1, info0);
  check('Handshake-Weg wird benannt', (info0.handshakeVia || []).indexOf('app-ready') !== -1, info0.handshakeVia);
  check('noch nicht verbunden', info0.connected === null && info0.ready === false, info0);

  console.log('\n-- Schutzgeländer vor dem Verbinden --');
  const early = await page.evaluate(() => crSigner.signAndSend('AQID'));
  check('ohne Verbindung wird nicht signiert', early.error === 'not-connected', early);
  const badTx = await page.evaluate(() => crSigner.signAndSend(''));
  check('leere Transaktion → bad-tx', badTx.error === 'bad-tx', badTx);

  console.log('\n-- Verbinden --');
  const con = await page.evaluate(() => crSigner.connect());
  check('liefert die Adresse', /^CRtestWa11et/.test(con.address || ''), con);
  check('nennt die Wallet', con.wallet === 'MockPhantom', con);
  check('Identität geht an crWallet (keine zweite Wahrheit)',
    await page.evaluate(() => (window.crWallet && crWallet.get && crWallet.get()) || ''), );
  const connAddr = await page.evaluate(() => (window.crWallet && crWallet.get()) || '');
  check('crWallet.get() kennt dieselbe Adresse', connAddr === con.address, { connAddr, con: con.address });

  console.log('\n-- Signieren --');
  const ok = await page.evaluate(() => crSigner.signAndSend(btoa('\x01\x02\x03')));
  check('Signatur kommt als base58 zurück', typeof ok.signature === 'string' && ok.signature.length > 10, ok);
  check('Signatur enthält keine 0/O/I/l', !/[0OIl]/.test(ok.signature || ''), ok.signature);
  const sent = await page.evaluate(() => window.__calls.sign[0]);
  check('Wallet bekam ein Uint8Array, keinen String', sent.isU8 === true, sent);
  check('Bytes kommen unverändert an', JSON.stringify(sent.bytes) === '[1,2,3]', sent.bytes);
  check('Konto wird mitgegeben', /^CRtestWa11et/.test(sent.account || ''), sent.account);

  console.log('\n-- Devnet ist die Vorgabe --');
  check('ohne Angabe wird DEVNET signiert, nicht Mainnet', sent.chain === 'solana:devnet', sent.chain);
  const mainnet = await page.evaluate(() => crSigner.signAndSend(btoa('x'), { chain: 'solana:mainnet' }));
  // Regression: geprueft wurde frueher NUR account.chains. Die Wallet kann
  // Mainnet, das Konto meldet nur Devnet — Mainnet wurde faelschlich
  // abgewiesen. Jetzt zaehlt die Vereinigung.
  check('Mainnet nur auf ausdrückliche Angabe — aber dann auch wirklich',
    !!mainnet.signature, mainnet);
  const mainSent = await page.evaluate(() => window.__calls.sign.slice(-1)[0]);
  check('und geht als solana:mainnet an die Wallet', mainSent.chain === 'solana:mainnet', mainSent.chain);
  const badChain = await page.evaluate(() => crSigner.signAndSend(btoa('x'), { chain: 'ethereum:1' }));
  check('fremde Kette wird abgelehnt', badChain.error === 'bad-chain', badChain);
  const unsup = await page.evaluate(() => crSigner.signAndSend(btoa('x'), { chain: 'solana:testnet' }));
  check('nicht unterstütztes Netz wird VOR der Abfrage abgefangen',
    unsup.error === 'chain-unsupported', unsup);

  console.log('\n-- Fehler bleiben unterscheidbar --');
  const rej = await page.evaluate(async () => { window.__mode = 'reject';
    const r = await crSigner.signAndSend(btoa('x')); window.__mode = null; return r; });
  check('Abbruch durch den Nutzer → rejected (kein technischer Fehler)', rej.error === 'rejected', rej);
  const boom = await page.evaluate(async () => { window.__mode = 'boom';
    const r = await crSigner.signAndSend(btoa('x')); window.__mode = null; return r; });
  check('echter Fehler → sign-failed mit Detail', boom.error === 'sign-failed' && !!boom.detail, boom);
  const nosig = await page.evaluate(async () => { window.__mode = 'nosig';
    const r = await crSigner.signAndSend(btoa('x')); window.__mode = null; return r; });
  check('Erfolg ohne Signatur wird nicht als Erfolg ausgegeben', nosig.error === 'no-signature', nosig);

  console.log('\n-- kein Hintergrundbetrieb --');
  const before = await page.evaluate(() => window.__calls.connect);
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => window.__calls.connect);
  check('crSigner verbindet sich nicht von selbst nach', before === after, { before, after });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
