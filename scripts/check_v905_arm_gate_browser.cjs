/* Smoke-Verifikation v1.0.905 — S5a.4: ARM NUR SICHTBAR BEI ANMELDUNG ODER
 * WALLET-VERBINDUNG.
 *
 * Reines UI-Sichtbarkeits-Gate. Der Trade-Pfad ist NICHT angefasst — die Weiche
 * (crWeiche) liest weiter dasselbe eine Bit cr_arm_v1 und erzwingt wallet.canSign()
 * selbst; dieses Gate ist nur die visuelle Entsprechung.
 *
 * Scharf geprueft wird, was Wahrheit oder Geld kostet, wenn es fehlt:
 *   1. GAST versteckt: weder angemeldet noch Wallet → #crCCArmSection hidden,
 *      Hinweiszeile sichtbar. Gegenprobe: NUR der Gast-Runner-Name gesetzt
 *      (cr_profile_name_v1) → weiterhin versteckt (der Name zaehlt NICHT).
 *      Und: cr_stealth_auth_v1='1' allein (steht fuer JEDEN Gast) → versteckt.
 *   2. WALLET verbunden (cr_wallet gesetzt) → Sektion gerendert, Hinweis weg.
 *   3. ANGEMELDET, keine Wallet (crAccount.isSignedIn=true) → Sektion gerendert.
 *   4. LIVE-UEBERGANG ohne Reload ueber crApplyAccessGates (die eine Stelle,
 *      an der crWallet.on/crAccount._gatesSync ohnehin laufen): verbinden →
 *      erscheint; beide Signale weg → verschwindet.
 *   5. SICHERHEITS-DEFAULT: Schalter LIVE, dann beide Signale verloren → der
 *      MODUS faellt auf SIM (crArm.on()===false) und bleibt es auch nach einem
 *      Reconnect (kein heimliches Auto-Re-Arm). cr_arm_v1 bleibt unberuehrt.
 *   6. WEICHE UNBERUEHRT (Spion): alle Tore an + Market → der Real-Adapter
 *      feuert genau EINMAL, wie vor dem PR (das Gate aendert die Trefferbedingung
 *      nicht).
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die
 * Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v905_arm_gate_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); }
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

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    if(route.request().resourceType() === 'script')
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    const J = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if(/\/v1\/quote/.test(url))
      return J({ ok:true,
        quote:{ in_raw:'100000000', out_raw:'284742418', min_out_raw:'282000000', slippage_bps:50 },
        platform_fee:{ bps:50, amount_raw:'500000' }, route:{ hops:2, venues:['Whirlpool'] } });
    if(/\/v1\/tx\/swap/.test(url))
      return J({ transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'100000000', out_raw:'284742418', min_out_raw:'282000000', slippage_bps:50 },
        cap:{ state:'none' }, fee:{ base_lamports:5000, priority_lamports:null },
        route:{ platform_fee_bps:50, hops:2, venues:['Whirlpool'] } });
    if(/\/v1\/tx\/status/.test(url)) return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    if(/\/v1\/token\/safety/.test(url)) return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/health/.test(url)) return J({ ok:true, version:'tx v1.19', signs:false });
    return J({ ok:true, prices:{}, mints:{}, holdings:[], candles:[] });
  });

  // Wallet Standard registrieren (fuer den Weiche-Spion in Test 6) — aber
  // cr_wallet wird NICHT beim Boot gesetzt, damit der Gast-Zustand echt ist.
  const initWallet = ([a]) => {
    window.__signs = [];
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async () => { window.__signs.push(1);
              const s = new Uint8Array(64); s[0] = 9; return [{ signature:s }]; } } } });
    });
  };
  await page.addInitScript(initWallet, [ADDR]);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Helfer im Seitenkontext: sauberer Gast-Ausgangszustand (kein Signal).
  const RESET_GUEST = () => {
    try { localStorage.removeItem('cr_wallet'); } catch(_){}
    try { localStorage.removeItem('cr_arm_v1'); } catch(_){}
    try { if(window.crSigner && crSigner.disconnect) crSigner.disconnect(); } catch(_){}
    try { if(window.crArm && crArm.set) crArm.set(false); } catch(_){}
    try { if(window.crAccount) crAccount.isSignedIn = () => false; } catch(_){}
    try { _crCCRenderArm(); } catch(_){}
  };

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.905',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 905)))), bv);

  console.log('\n-- 1 · Gast: keine Wallet, nicht angemeldet → versteckt --');
  const g1 = await page.evaluate((reset) => {
    eval('(' + reset + ')')();
    const sec  = document.getElementById('crCCArmSection');
    const hint = document.getElementById('crCCArmGateHint');
    return { avail: _crCCArmAvailable(), secHidden: !!sec.hidden, hintHidden: !!hint.hidden,
             signedIn: _crCCArmSignedIn(), wallet: _crCCArmWalletConnected() };
  }, RESET_GUEST.toString());
  check('Gast: armAvailable === false', g1.avail === false, g1);
  check('Gast: ARM-Sektion versteckt (#crCCArmSection hidden)', g1.secHidden === true, g1);
  check('Gast: Hinweiszeile sichtbar (#crCCArmGateHint nicht hidden)', g1.hintHidden === false, g1);

  // Gegenprobe A: nur der Gast-Runner-Name gesetzt → weiterhin versteckt.
  const g1b = await page.evaluate(() => {
    localStorage.setItem('cr_profile_name_v1', 'guest-mezu');
    _crCCRenderArm();
    const sec = document.getElementById('crCCArmSection');
    return { avail: _crCCArmAvailable(), secHidden: !!sec.hidden };
  });
  check('nur Gast-Runner-Name → weiterhin versteckt (Name zaehlt NICHT)',
    g1b.avail === false && g1b.secHidden === true, g1b);

  // Gegenprobe B: cr_stealth_auth_v1='1' (steht fuer JEDEN Gast) → versteckt.
  const g1c = await page.evaluate(() => {
    localStorage.setItem('cr_stealth_auth_v1', '1');
    _crCCRenderArm();
    const sec = document.getElementById('crCCArmSection');
    return { avail: _crCCArmAvailable(), secHidden: !!sec.hidden,
             stealth: localStorage.getItem('cr_stealth_auth_v1') };
  });
  check('cr_stealth_auth_v1=1 allein → weiterhin versteckt (Auto-Guest-Bit zaehlt NICHT)',
    g1c.stealth === '1' && g1c.avail === false && g1c.secHidden === true, g1c);

  console.log('\n-- 2 · Wallet verbunden (cr_wallet) → sichtbar --');
  const w2 = await page.evaluate((a) => {
    localStorage.setItem('cr_wallet', a);
    _crCCRenderArm();
    const sec = document.getElementById('crCCArmSection');
    const hint = document.getElementById('crCCArmGateHint');
    return { avail: _crCCArmAvailable(), wallet: _crCCArmWalletConnected(),
             secHidden: !!sec.hidden, hintHidden: !!hint.hidden };
  }, ADDR);
  check('cr_wallet gesetzt → walletConnected() true', w2.wallet === true, w2);
  check('Wallet verbunden → ARM-Sektion gerendert (nicht hidden)', w2.secHidden === false, w2);
  check('Wallet verbunden → Hinweiszeile weg (hidden)', w2.hintHidden === true, w2);

  console.log('\n-- 3 · Angemeldet, keine Wallet → sichtbar --');
  const s3 = await page.evaluate((reset) => {
    eval('(' + reset + ')')();                 // erst wieder Gast (kein Wallet)
    crAccount.isSignedIn = () => true;         // dann: angemeldet, aber keine Wallet
    _crCCRenderArm();
    const sec = document.getElementById('crCCArmSection');
    return { avail: _crCCArmAvailable(), signedIn: _crCCArmSignedIn(),
             wallet: _crCCArmWalletConnected(), secHidden: !!sec.hidden };
  }, RESET_GUEST.toString());
  check('angemeldet, keine Wallet → signedIn() true, walletConnected() false',
    s3.signedIn === true && s3.wallet === false, s3);
  check('angemeldet → ARM-Sektion gerendert (nicht hidden)', s3.secHidden === false, s3);

  console.log('\n-- 4 · Live-Uebergang ohne Reload (ueber crApplyAccessGates) --');
  const t4a = await page.evaluate((reset) => {
    eval('(' + reset + ')')();
    return { hidden0: !!document.getElementById('crCCArmSection').hidden };
  }, RESET_GUEST.toString());
  check('Ausgangszustand Gast: versteckt', t4a.hidden0 === true, t4a);
  const t4b = await page.evaluate((a) => {
    localStorage.setItem('cr_wallet', a);
    crApplyAccessGates();                       // die reale Reaktions-Stelle (crWallet.on)
    return { hidden: !!document.getElementById('crCCArmSection').hidden };
  }, ADDR);
  check('Wallet verbinden → crApplyAccessGates zeigt die Sektion ohne Reload', t4b.hidden === false, t4b);
  const t4c = await page.evaluate(() => {
    localStorage.removeItem('cr_wallet');
    try { crSigner.disconnect(); } catch(_){}
    crAccount.isSignedIn = () => false;
    crApplyAccessGates();
    return { hidden: !!document.getElementById('crCCArmSection').hidden,
             hintHidden: !!document.getElementById('crCCArmGateHint').hidden };
  });
  check('beide Signale weg → crApplyAccessGates versteckt die Sektion wieder',
    t4c.hidden === true && t4c.hintHidden === false, t4c);

  console.log('\n-- 5 · Sicherheits-Default: LIVE → SIM bei Verlust beider Signale --');
  // Chart handelbar machen (Wallet + Mint + Live-Kurve) — nur so kann crArm scharf werden.
  await page.evaluate(([mint, a]) => {
    localStorage.setItem('cr_wallet', a);
    const asset = crEnsureCustomSolanaToken(mint);
    currentAsset = asset.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    window.crChartLive = true;
  }, [BONK, ADDR]);
  const t5a = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    const setOk = crArm.set(true);              // Schalter LIVE (nur wenn eligible)
    _crCCRenderArm();
    return { setOk, armOn: crArm.on(), avail: _crCCArmAvailable() };
  });
  check('Vorbedingung: crArm bei Wallet+Mint+Live-Kurve auf LIVE', t5a.setOk === true && t5a.armOn === true, t5a);
  const t5b = await page.evaluate(() => {
    // beide Signale verlieren, waehrend der Schalter LIVE stand
    localStorage.removeItem('cr_wallet');
    try { crSigner.disconnect(); } catch(_){}
    crAccount.isSignedIn = () => false;
    crApplyAccessGates();                       // faehrt das Gate + den Sicherheits-Default
    return { avail: _crCCArmAvailable(), armOn: crArm.on(),
             armBit: localStorage.getItem('cr_arm_v1'),
             hidden: !!document.getElementById('crCCArmSection').hidden };
  });
  check('beide Signale weg → armAvailable false, Sektion versteckt', t5b.avail === false && t5b.hidden === true, t5b);
  check('Sicherheits-Default: Modus faellt auf SIM (crArm.on()===false)', t5b.armOn === false, t5b);
  check('cr_arm_v1 bleibt unberuehrt (nur der Modus fiel, nicht das Bit)', t5b.armBit === '1', t5b);
  // Gegenprobe: Reconnect darf den Modus NICHT heimlich wieder auf LIVE ziehen.
  const t5c = await page.evaluate((a) => {
    localStorage.setItem('cr_wallet', a);       // Wallet zurueck, Chart weiter handelbar
    _crCCRenderArm();
    return { avail: _crCCArmAvailable(), armOn: crArm.on() };
  }, ADDR);
  check('Reconnect → Sektion wieder da, ABER Modus bleibt SIM (kein Auto-Re-Arm)',
    t5c.avail === true && t5c.armOn === false, t5c);

  console.log('\n-- 6 · Weiche unberuehrt (Spion) --');
  await page.evaluate(() => {
    window.__renderPanel = function(id){
      const host = document.createElement('div');
      document.body.appendChild(host);
      const section = renderBlueRouteInputs(host, { kind:'hline', id:id, py:100 }, {});
      return window.__p = {
        section,
        armed: section.querySelector('input[type=checkbox]'),
        size: Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox'),
        btn: (l) => Array.from(section.querySelectorAll('button')).find(b => b.textContent === l),
      };
    };
  });
  const spy1 = await page.evaluate(async (a) => {
    window.__calls = 0;
    localStorage.setItem('cr_wallet', a);        // Gate offen; die Weiche ignoriert es ohnehin
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    ChartRunner.sdk.setRealSDK({ marketSwap: p => { window.__calls++;
      return Promise.resolve({ sig:'GSIG', inAmount:String(p.amountRaw), outAmount:'7', feeRaw:'1' }); } });
    const p = window.__renderPanel(9101);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
    return true;
  }, ADDR);
  await page.waitForTimeout(900);
  const spy1c = await page.evaluate(() => window.__calls);
  check('alle Tore an + Market → der Real-Adapter feuert genau EINMAL (Pfad intakt)', spy1c === 1, { calls: spy1c });
  const spy2 = await page.evaluate(async () => {
    window.__calls = 0;
    localStorage.removeItem('cr_arm_v1');        // global aus = Paper
    const p = window.__renderPanel(9102);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
    return true;
  });
  await page.waitForTimeout(700);
  const spy2c = await page.evaluate(() => window.__calls);
  check('global aus (Paper) → KEIN Aufruf des Real-Adapters', spy2c === 0, { calls: spy2c });

  console.log('\n== v905 ARM-GATE: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
