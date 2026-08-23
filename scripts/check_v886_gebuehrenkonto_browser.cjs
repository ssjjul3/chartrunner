/* Smoke-Verifikation fuer v1.0.886 — „Gebuehrenkonto anlegen" in der tx-Probe.
 *
 * Der Endpunkt kann VIER Dinge antworten, nicht zwei. Die zweite ist die, die
 * leicht falsch wird: `already_exists: true` ist beim zweiten Tap der
 * Normalfall und eine AUSKUNFT — es als Panne zu rendern hiesse, dieselbe
 * Verwechslung zu bauen wie „lamports: 0" gleich „kein Guthaben abrufbar".
 * Die vierte ebenso: ein 502 ist keine Aussage ueber das Konto.
 *
 * Und die wichtigste Zeile hier prueft eine HERKUNFT, keinen Text: Eigner und
 * Gebuehrenkonto muessen aus der ANTWORT kommen. Der Worker rechnet die ATA
 * bei jedem Start nach; eine zweite Ableitung im Client waere eine Fassung,
 * die wegdriftet, sobald jemand den Eigner aendert. Deshalb nennt der Mock
 * absichtlich Adressen, die niemand raten kann.
 *
 * Aufruf:  npm i playwright && node scripts/check_v886_gebuehrenkonto_browser.cjs
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

/* Die Adressen im Mock sind ABSICHTLICH nicht die echten. Wer sie aus einer
 * Client-Konstanten nimmt statt aus der Antwort, kann diesen Test nicht
 * bestehen — genau das ist der Sinn. */
const M_OWNER = 'MockOwner1111111111111111111111111111111111';
const M_KONTO = 'MockFeeAcct22222222222222222222222222222222';

function mockWallet(){
  const acct = { address: 'CRtestWa11etAddre55111111111111111111111111',
                 chains: ['solana:mainnet'], features: [] };
  window.__setWalletNetwork = n => { acct.chains = [n]; };
  window.__signCalls = [];
  const w = {
    name: 'MockPhantom', version: '1.0.0', icon: '',
    chains: ['solana:devnet', 'solana:mainnet'], accounts: [acct],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
      'solana:signAndSendTransaction': { version: '1.0.0',
        signAndSendTransaction: async (input) => {
          window.__signCalls.push({ chain: input.chain, len: (input.transaction || []).length });
          if(window.__signMode === 'reject') throw new Error('User rejected the request.');
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

  let ataMode = 'ok', stMode = 'ok';
  const txCalls = [];
  await page.route('**chartrunner-tx.jsg-951.workers.dev/**', async route => {
    const req = route.request();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch(_){}
    txCalls.push({ url: req.url(), method: req.method(), body });
    const J = (status, obj) => route.fulfill({ status, contentType: 'application/json',
      body: JSON.stringify(obj) });

    if(/\/v1\/rpc\/balance/.test(req.url()))
      return J(200, { ok: true, lamports: '90000000', cluster: 'mainnet' });

    if(/\/v1\/tx\/status/.test(req.url())){
      if(stMode === 'failed') return J(200, { confirmationStatus: 'confirmed',
        err: { InstructionError: [0, 'Custom'] } });
      return J(200, { confirmationStatus: 'confirmed', confirmations: 31 });
    }

    if(/\/v1\/tx\/ata/.test(req.url())){
      // Der Worker meldet 503 mit eigenem Fehlernamen, wenn die Gebuehr nicht
      // scharf ist — der Endpunkt existiert nur mit konfigurierter Gebuehr.
      if(ataMode === 'fee')     return J(503, { ok: false, error: 'fee-not-configured',
        note: 'FEE_ACCOUNT ist im Worker nicht gesetzt.' });
      // Ein Rand-502 ohne verwertbaren Koerper: der Ausfall-Fall.
      if(ataMode === 'down')    return J(502, { ok: false });
      if(ataMode === 'gone')    return J(404, {});
      if(ataMode === 'dead')    return route.abort('failed');
      if(ataMode === 'exists')  return J(200, { ok: true, already_exists: true,
        owner: M_OWNER, fee_account: M_KONTO, mint: 'So11111111111111111111111111111111111111112' });
      // 200, aber die Antwort nennt nicht, worum es geht.
      if(ataMode === 'anon')    return J(200, { ok: true, transaction: btoa('\x01\x02\x03\x04') });
      // 200 mit Adressen, aber ohne Transaktion.
      if(ataMode === 'notx')    return J(200, { ok: true, owner: M_OWNER, fee_account: M_KONTO });
      // Eine Adresse mit Markup darin — sie muss als TEXT erscheinen.
      if(ataMode === 'markup')  return J(200, { ok: true, transaction: btoa('\x01\x02\x03\x04'),
        owner: M_OWNER, fee_account: '<b>BOOM</b>', expires_in_s: 75 });
      return J(200, { ok: true, transaction: btoa('\x01\x02\x03\x04'),
        owner: M_OWNER, fee_account: M_KONTO, expires_in_s: 75,
        note: 'Unsigniert. Signiert wird ausschliesslich in der Wallet des Nutzers.' });
    }
    return J(200, { ok: true });
  });

  await page.addInitScript(mockWallet);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const openPicker = () => page.evaluate(() => { crWallet.openWalletPicker(); });
  const probeText  = () => page.evaluate(() => {
    const p = document.getElementById('crWalletPickerProbe'); return p ? p.textContent : ''; });
  const probeHtml  = () => page.evaluate(() => {
    const p = document.getElementById('crWalletPickerProbe'); return p ? p.innerHTML : ''; });
  const probeErrFarbe = () => page.evaluate(() => {
    const p = document.getElementById('crWalletPickerProbe');
    return !!(p && p.classList.contains('wpErr')); });
  const signBtn = () => page.evaluate(() => !!document.querySelector('[data-cr-wallet-choice="ata-sign"]'));
  const tap = (choice) => page.evaluate(c => {
    const b = document.querySelector('[data-cr-wallet-choice="' + c + '"]');
    if(!b) throw new Error('kein Knopf ' + c);
    b.click(); }, choice);
  const signCount = () => page.evaluate(() => window.__signCalls.length);
  const ataCalls = () => txCalls.filter(c => /\/v1\/tx\/ata/.test(c.url));

  const TERMINAL = /gibt es schon|Das wird gleich signiert|nicht abrufbar|nicht scharf|Konnte nicht gebaut|keine Transaktion|nennt nicht, worum es geht|Bestaetigt ·|FEHLGESCHLAGEN|nichts gesendet|Nichts vorbereitet|Zu lange gewartet|Nicht signiert|Wallet steht auf|keine Signatur|nicht abfragen|noch nicht bestaetigt/;
  const settle = async (ms = 40000) => {
    const t0 = Date.now();
    for(;;){
      const t = await probeText();
      if(TERMINAL.test(t)) return t;
      if(Date.now() - t0 > ms) return t;
      await page.waitForTimeout(200);
    }
  };

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.886',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 886)))),
    banner.slice(0, 70));
  check('crTxApi.ata existiert', await page.evaluate(() => !!(window.crTxApi && crTxApi.ata)));

  console.log('\n-- Sichtbarkeit: dieselbe Grenze wie die Devnet-Probe --');
  await openPicker(); await page.waitForTimeout(250);
  check('vor dem Verbinden verborgen',
    await page.evaluate(() => document.getElementById('crWpAtaBtn').style.display === 'none'));
  check('und zwar genauso wie die Devnet-Probe — keine zweite Grenze',
    await page.evaluate(() => document.getElementById('crWpAtaBtn').style.display
      === document.getElementById('crWpDevnetBtn').style.display));

  await tap('bridge'); await page.waitForTimeout(600);
  await openPicker(); await page.waitForTimeout(250);
  check('nach dem Verbinden sichtbar',
    await page.evaluate(() => document.getElementById('crWpAtaBtn').style.display !== 'none'));
  check('dieselbe Grenze auch im sichtbaren Zustand',
    await page.evaluate(() => document.getElementById('crWpAtaBtn').style.display
      === document.getElementById('crWpDevnetBtn').style.display));

  console.log('\n-- Tap 1: bauen und zeigen --');
  const signs0 = await signCount();
  ataMode = 'ok';
  await tap('ata'); let t = await settle();

  check('Eigner kommt AUS DER ANTWORT', t.includes(M_OWNER), t.slice(0, 160));
  check('Gebuehrenkonto kommt AUS DER ANTWORT', t.includes(M_KONTO), t.slice(0, 160));
  check('und es steht dabei, dass der Worker die Autoritaet dafuer ist',
    /Autoritaet/.test(t), t.slice(0, 200));
  check('die Kontomiete wird in Lamports genannt', /2\.039\.280 Lamports/.test(t), t);
  check('und derselbe Betrag in SOL, deutsch formatiert', /0,0020 SOL/.test(t), t);
  check('mit dem Satz, dass sie beim Schliessen zurueckkommt',
    /beim Schliessen des Kontos zurueck/.test(t), t);
  check('der Zahler wird genannt — die verbundene Wallet, nicht der Eigner',
    /CRtestWa11et/.test(t) && /nicht der Eigner/.test(t), t);
  check('ein Signieren-Knopf steht bereit', await signBtn());
  check('Tap 1 signiert NICHTS', (await signCount()) === signs0);
  check('Tap 1 traegt keine Fehlerfarbe', (await probeErrFarbe()) === false);

  const c1 = ataCalls()[ataCalls().length - 1];
  check('die Anfrage ging an /v1/tx/ata per POST', c1.method === 'POST', c1.url);
  check('payer ist die verbundene Adresse', /^CRtestWa11et/.test(c1.body.payer || ''), c1.body);
  check('cluster wird mitgeschickt, nie stillschweigend angenommen',
    c1.body.cluster === 'mainnet', c1.body);

  console.log('\n-- Escaping: Markup aus dem Worker bleibt Text --');
  ataMode = 'markup';
  await tap('ata'); await settle();
  check('die Adresse erscheint als Text', (await probeText()).includes('<b>BOOM</b>'), await probeText());
  check('und NICHT als Markup', (await probeHtml()).includes('&lt;b&gt;BOOM&lt;/b&gt;'));
  check('kein eingeschleustes Element mit dem Inhalt BOOM',
    await page.evaluate(() => !Array.from(
      document.querySelectorAll('#crWalletPickerProbe *')).some(e => e.textContent === 'BOOM')));

  console.log('\n-- already_exists: eine Auskunft, kein Fehler --');
  ataMode = 'exists';
  await tap('ata'); t = await settle();
  check('sagt „Das Konto gibt es schon."', /Das Konto gibt es schon\./.test(t), t);
  check('KEIN Signieren-Knopf', (await signBtn()) === false);
  check('KEINE Fehlerfarbe', (await probeErrFarbe()) === false);
  check('nennt trotzdem Eigner und Konto', t.includes(M_OWNER) && t.includes(M_KONTO), t);
  check('behauptet nicht, es sei etwas schiefgegangen',
    !/Konnte nicht|nicht abrufbar|Fehler/.test(t), t);

  console.log('\n-- Gebuehr nicht konfiguriert: eigene Zeile --');
  ataMode = 'fee';
  await tap('ata'); t = await settle();
  check('nennt genau das — die Gebuehr ist nicht scharf', /nicht scharf/.test(t), t);
  check('und reicht die Notiz des Workers durch', /FEE_ACCOUNT/.test(t), t);
  check('kein Signieren-Knopf', (await signBtn()) === false);
  check('wird NICHT als Ausfall ausgegeben', !/nicht abrufbar/.test(t), t);

  console.log('\n-- 502: ein Ausfall ist keine Aussage ueber das Konto --');
  ataMode = 'down';
  await tap('ata'); t = await settle();
  check('sagt „nicht abrufbar"', /nicht abrufbar/.test(t), t);
  check('nennt die Statusnummer', /http-502/.test(t), t);
  check('sagt ausdruecklich, dass ueber das Konto nichts bekannt ist',
    /weiterhin unbekannt/.test(t), t);
  // Die Zeile darf ueber das Konto GAR NICHTS behaupten — weder dass es fehlt
  // noch dass es da ist. Deshalb faengt das Muster jede Form davon ab.
  check('behauptet NICHT, das Konto fehle',
    !/[Kk]onto fehlt|fehlt noch|noch nicht angelegt|gibt es noch nicht/.test(t), t);
  check('kein Signieren-Knopf', (await signBtn()) === false);

  console.log('\n-- 404 und Netzausfall --');
  ataMode = 'gone';
  await tap('ata'); t = await settle();
  check('404 → nicht abrufbar, ausdruecklich nicht „Konto fehlt"',
    /nicht abrufbar/i.test(t) && /nicht „Konto fehlt"/.test(t), t);
  ataMode = 'dead';
  await tap('ata'); t = await settle();
  check('Netzfehler → Worker nicht erreichbar, nicht abrufbar',
    /nicht erreichbar/.test(t) && /nicht abrufbar/.test(t), t);
  check('sagt dazu, dass das nichts ueber das Konto aussagt',
    /sagt nichts darueber/.test(t), t);

  console.log('\n-- 200, aber die Antwort nennt die Adressen nicht --');
  ataMode = 'anon';
  await tap('ata'); t = await settle();
  check('es wird nichts zum Signieren angeboten', (await signBtn()) === false);
  check('und der Grund steht da', /nennt nicht, worum es geht/.test(t), t);
  check('die Adresse wird NICHT selbst ausgerechnet', /wegdriftet/.test(t), t);

  console.log('\n-- 200 mit Adressen, aber ohne Transaktion --');
  ataMode = 'notx';
  await tap('ata'); t = await settle();
  check('leere Antwort wird benannt, nicht an die Wallet weitergereicht',
    /keine Transaktion/.test(t), t);
  check('kein Signieren-Knopf', (await signBtn()) === false);

  console.log('\n-- Tap 2 ohne Tap 1 --');
  check('der Signieren-Knopf ist weg', (await signBtn()) === false);
  // Der Weg dorthin muss trotzdem dicht sein: ein „ata-sign" ohne
  // vorbereitete Transaktion darf nicht in die Wallet laufen.
  const signsNix = await signCount();
  const tNix = await page.evaluate(() => {
    const card = document.querySelector('#crWalletPickerModal .wpCard');
    const b = document.createElement('button');
    b.setAttribute('data-cr-wallet-choice', 'ata-sign');
    card.appendChild(b); b.click(); b.remove();
    return document.getElementById('crWalletPickerProbe').textContent;
  });
  check('ohne Tap 1 wird nichts signiert', (await signCount()) === signsNix);
  check('und es steht da, was fehlt', /Nichts vorbereitet/.test(tNix), tNix);

  console.log('\n-- Tap 2: signieren, dann die KETTE fragen --');
  ataMode = 'ok'; stMode = 'ok';
  await tap('ata'); await settle();
  const signsBefore = await signCount();
  await tap('ata-sign'); t = await settle();
  check('genau einmal signiert', (await signCount()) === signsBefore + 1);
  const sent = await page.evaluate(() => window.__signCalls.slice(-1)[0]);
  check('an die Wallet ging solana:mainnet', sent.chain === 'solana:mainnet', sent);
  check('die gebauten Bytes kamen an', sent.len === 4, sent);
  check('meldet „bestaetigt" mit Anzahl, nicht nur „gesendet"',
    /Bestaetigt · 31 Bestaetigungen/.test(t), t);

  const href = await page.evaluate(() => {
    const a = document.querySelector('#crWalletPickerProbe a'); return a ? a.getAttribute('href') : ''; });
  check('Explorer-Link traegt die Signatur',
    /explorer\.solana\.com\/tx\/[1-9A-HJ-NP-Za-km-z]{20,}/.test(href), href);
  check('Mainnet-Link traegt KEINEN cluster-Parameter', !/cluster=/.test(href), href);
  // v1.0.874 ist genau hier schon einmal haengengeblieben: ein zweiter,
  // hartcodierter Link liess die gruene Suite gruen, obwohl die eine
  // Implementierung kaputt war. Deshalb Zeichen fuer Zeichen gegen sie.
  const linkGleich = await page.evaluate(() => {
    const a = document.querySelector('#crWalletPickerProbe a');
    if(!a) return false;
    const sig = decodeURIComponent((a.getAttribute('href') || '').split('/tx/')[1] || '').split('?')[0];
    return document.getElementById('crWalletPickerProbe').innerHTML
      .includes(crWallet.explorerLink(sig, 'mainnet'));
  });
  check('der Link ist Zeichen fuer Zeichen der von crWallet.explorerLink', linkGleich);

  console.log('\n-- Gelandet UND gescheitert --');
  stMode = 'failed';
  await tap('ata'); await settle();
  await tap('ata-sign'); t = await settle();
  check('ein Fehlschlag auf der Kette gilt NICHT als Erfolg',
    /FEHLGESCHLAGEN/.test(t) && !/Bestaetigt/.test(t), t);
  check('der Grund von der Kette steht dabei', /InstructionError/.test(t), t);
  check('der Explorer-Link steht trotzdem bereit',
    await page.evaluate(() => !!document.querySelector('#crWalletPickerProbe a')));
  stMode = 'ok';

  console.log('\n-- Abbruch in der Wallet --');
  await tap('ata'); await settle();
  await page.evaluate(() => { window.__signMode = 'reject'; });
  await tap('ata-sign'); t = await settle();
  check('Abbruch: „es wurde nichts gesendet"', /nichts gesendet/.test(t), t);
  await page.evaluate(() => { window.__signMode = null; });

  console.log('\n-- Wallet steht auf dem falschen Netz --');
  const bauten = ataCalls().length, signs2 = await signCount();
  await page.evaluate(() => window.__setWalletNetwork('solana:devnet'));
  await tap('ata'); await page.waitForTimeout(600);
  t = await probeText();
  check('falsches Netz wird VOR dem Bauen erkannt',
    /Wallet steht auf/.test(t) && /mainnet/.test(t), t);
  check('es wurde nichts gebaut', ataCalls().length === bauten, { bauten, jetzt: ataCalls().length });
  check('und nichts signiert', (await signCount()) === signs2);
  await page.evaluate(() => window.__setWalletNetwork('solana:mainnet'));

  console.log('\n-- kein Hintergrundbetrieb --');
  const n0 = txCalls.length;
  await page.waitForTimeout(3000);
  check('der ata-Endpunkt wird nicht von selbst angerufen',
    txCalls.filter(c => /\/v1\/tx\/ata/.test(c.url)).length
      === ataCalls().length, { n0, now: txCalls.length });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
