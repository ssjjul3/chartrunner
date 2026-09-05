/* Smoke-Verifikation v1.0.907 — P3.1: EINE RUHENDE LIMIT-ORDER UEBER DEN VAULT.
 *
 * Das Prinzip in einem Satz: die ruhende Order bekommt EINEN additiven
 * route==='Limit'-Zweig an derselben Weiche wie der Market-Swap — dieselben
 * vier Tore, Market Bit fuer Bit unberuehrt. Scharf geprueft wird, was Geld
 * (oder eine Anmeldung) kostet, wenn es schiefgeht. Vier Gegenproben MUESSEN
 * ROT koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   1. SPION: real.limitVault wird ueber die GANZE Ability-Matrix NIE gerufen,
 *      wenn ein Tor fehlt ODER route!=='Limit'; alles offen + Limit → GENAU EIN
 *      Aufruf. (Mutation: Tor in decide() streichen → rot.)
 *   2. JWT-NUR-MEMORY: nach ensureAuth traegt crVaultApi.token() den JWT, aber
 *      KEIN localStorage-Schluessel/-Wert enthaelt ihn. (Mutation:
 *      localStorage.setItem('cr_jwt', token) in ensureAuth → rot.)
 *   3. VAULT-KLARTEXT + GEBUEHR: das Panel zeigt im st-live den Pflichttext
 *      „⚡ RUHENDE ORDER …" + die 50-bps-Gebuehr aus dem deposit/craft-Echo;
 *      ohne Fee im Echo verweigert commit ('fee-missing', KEINE Signatur).
 *      (Mutation: RESTING_TEXT entfernen → rot; fee-Guard in commit entfernen → rot.)
 *   4. MARKET UNBERUEHRT: der marketSwap-Spion feuert weiter nur bei Market +
 *      allen Toren; limitVault feuert dort nie, und umgekehrt.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v907_vault_limit_browser.cjs
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
const SOL  = 'So11111111111111111111111111111111111111112';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-907';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  const seen = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

    /* ---- V2-Vault-Endpunkte (P3.1) ---- */
    if(/\/v1\/auth\/challenge/.test(url)) return J({ ok:true, challenge:'CR-CHALLENGE-907-abc', expires_in_s:120 });
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok:true, registered:true });
    if(/\/v1\/deposit\/craft/.test(url))  return J({ ok:true, transaction:'AQIDBAU=', expires_in_s:40,
      fee:{ bps:50, amount_raw:'5000' }, deposit:{ amount_raw:'1000000' }, cluster:'mainnet' });
    if(/\/v1\/orders\/price/.test(url))   return J({ ok:true, orderPubkey:'ORDERKEY907', status:'Open',
      fee:{ bps:50, amount_raw:'5000' } });
    if(/\/v1\/orders\/active/.test(url))  return J({ ok:true, orders:[{ orderKey:'ORDERKEY907', status:'Open' }] });

    /* ---- Market-Endpunkte (unveraendert, fuer „Market unberuehrt") ---- */
    if(/\/v1\/token\/safety/.test(url))
      return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/quote/.test(url))
      return J({ ok:true, quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377', slippage_bps:50 },
        platform_fee:{ bps:50, amount_raw:'5000' }, route:{ hops:1, venues:['Whirlpool'] } });
    if(/\/v1\/tx\/swap/.test(url))
      return J({ transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377', slippage_bps:50 },
        route:{ platform_fee_bps:50 } });
    if(/\/v1\/tx\/status/.test(url))     return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/health/.test(url)) return J({ ok:true, version:'tx v1.19', signs:false, kill:false });
    return J({});
  });

  /* Wallet-Mock mit signMessage (fuer auth/challenge) UND signAndSendTransaction. */
  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = [];       // signAndSend (finanzwirksam)
    window.__msgs  = [];       // signMessage (freie Challenge)
    window.__rejectSign = false;
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signMessage':{ version:'1.0.0',
            signMessage: async (i) => { window.__msgs.push(i && i.message ? i.message.length : 0);
              const s = new Uint8Array(64); s[0] = 7; return [{ signature:s }]; } },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async (i) => {
              if(window.__rejectSign) throw new Error('User rejected the request.');
              window.__signs.push({ chain: i && i.chain });
              const s = new Uint8Array(64); s[0] = 9; return [{ signature:s }]; } } } });
    });
  };
  await page.addInitScript(initWallet, [ADDR]);
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
  check('Banner meldet mindestens v1.0.907',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 907)))), bv);

  const seam = await page.evaluate(() => ({
    isAdapter: !!(window.ChartRunner && ChartRunner.sdk && ChartRunner.sdk.real === window.crRealAdapter),
    hasSwap: !!(window.ChartRunner && ChartRunner.sdk && ChartRunner.sdk.real
                && typeof ChartRunner.sdk.real.marketSwap === 'function'),
    hasVault: !!(window.ChartRunner && ChartRunner.sdk && ChartRunner.sdk.real
                && typeof ChartRunner.sdk.real.limitVault === 'function'),
    api: !!(window.crVaultApi && typeof crVaultApi.ensureAuth === 'function'),
    flow: !!(window.crVaultLimit && typeof crVaultLimit.prepare === 'function' && typeof crVaultLimit.commit === 'function'),
    sign: !!(window.crSigner && typeof crSigner.signMessage === 'function'),
  }));
  check('Adapter traegt marketSwap NEBEN limitVault', seam.hasSwap && seam.hasVault, seam);
  check('crVaultApi + crVaultLimit exponiert', seam.api && seam.flow, seam);
  check('crSigner.signMessage vorhanden', seam.sign, seam);

  console.log('\n-- Aufbau: Sol-Chart, frische Jupiter-Referenz, Wallet --');
  const setup = await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    const m = crStoreMint(currentAssetObj());
    crTrustBadge.note(m, { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window._crMintMeta = window._crMintMeta || {};
    window._crMintMeta[mint] = { symbol:'BONK', decimals:5 };
    return { mint:m, ready: !!(crSigner.info() && crSigner.info().ready), badge: crWeiche.badgeGate() };
  }, [BONK]);
  check('Sol-Asset aktiv, badgeGate offen', setup.mint === BONK && setup.badge && setup.badge.ok === true, setup);
  check('Wallet signierfaehig', setup.ready === true, setup);

  /* ---- Spione fuer BEIDE Wege ---- */
  await page.evaluate(() => {
    window.__spyM = []; window.__spyL = [];
    ChartRunner.sdk.setRealSDK({
      marketSwap: function(p){ window.__spyM.push(JSON.parse(JSON.stringify(p)));
        return Promise.resolve({ sig:'SPYSWAP', inAmount:String(p.amountRaw), outAmount:'42', feeRaw:'5' }); },
      limitVault: function(p){ window.__spyL.push(JSON.parse(JSON.stringify(p)));
        return Promise.resolve({ orderPubkey:'SPYORDER', sig:'SPYDEP', feeRaw:'5000', feeBps:50, confirmed:true }); }
    });
    window.__cM = () => window.__spyM.length;
    window.__cL = () => window.__spyL.length;
    /* Die ganze Ability-Matrix in einem Ruf; Limit traegt Trigger-Preis. */
    window.__fireMatrix = function(source){
      const here = 100, s = source ? Object.assign({}, source) : undefined;
      try { sdk.market({ side:'buy',  size:1, price:here, source:s }); } catch(_){}
      try { sdk.market({ side:'sell', size:1, price:here, source:s }); } catch(_){}
      try { sdk.bracket({ risk:20, rr:2, side:'buy', price:here, slDistance:60, source:s }); } catch(_){}
      try { sdk.ladder({ side:'buy', rungs:5, spacing:30, size:4, price:here, source:s }); } catch(_){}
      try { sdk.oco({ upper:80, lower:-80, size:6, price:here, source:s }); } catch(_){}
      try { sdk.twap({ side:'buy', totalSize:10, slices:2, intervalSecs:9999, price:here, source:s }); } catch(_){}
      try { sdk.limit({ side:'buy', price:here, size:1, source:s }); } catch(_){}
    };
  });

  console.log('\n-- Spion (1): je ein geschlossenes Tor → 0 Aufrufe (beide Wege) --');
  const armedSrc = { armed:true, amountRaw:'1000000', triggerPrice:'0.00001' };

  /* Tor 2 zu: kein source.armed (global steht). */
  let g2 = await page.evaluate(() => { window.__fireMatrix(undefined); return { m:window.__cM(), l:window.__cL() }; });
  check('source.armed fehlt → 0 Market UND 0 Limit', g2.m === 0 && g2.l === 0, g2);

  /* Tor 1 zu: global aus. */
  let g1 = await page.evaluate((src) => {
    localStorage.removeItem('cr_arm_v1');
    window.__fireMatrix(src);
    const r = { m:window.__cM(), l:window.__cL() };
    localStorage.setItem('cr_arm_v1', '1');
    return r;
  }, armedSrc);
  check('global aus → 0 Market UND 0 Limit', g1.m === 0 && g1.l === 0, g1);

  /* Tor 3 zu: Referenz median. */
  let g3 = await page.evaluate(([m, src]) => {
    crTrustBadge.note(m, { source:'median', age_s:2 }, 0);
    window.__fireMatrix(src);
    const r = { m:window.__cM(), l:window.__cL() };
    crTrustBadge.note(m, { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    return r;
  }, [BONK, armedSrc]);
  check('Badge median → 0 Market UND 0 Limit', g3.m === 0 && g3.l === 0, g3);

  /* Tor 4 zu: Wallet nicht signierfaehig. */
  let g4 = await page.evaluate((src) => {
    const orig = crSigner.info; crSigner.info = () => ({ ready:false });
    try { window.__fireMatrix(src); } finally { crSigner.info = orig; }
    return { m:window.__cM(), l:window.__cL() };
  }, armedSrc);
  check('Wallet nicht signierfaehig → 0 Market UND 0 Limit', g4.m === 0 && g4.l === 0, g4);

  console.log('\n-- Spion (2): alles offen → GENAU EIN limitVault (nur via sdk.limit) --');
  const openMatrix = await page.evaluate((src) => {
    const bm = window.__cM(), bl = window.__cL();
    window.__fireMatrix(src);
    return { dM: window.__cM() - bm, dL: window.__cL() - bl, callL: window.__spyL[window.__spyL.length - 1] };
  }, armedSrc);
  check('alles offen: genau 1 marketSwap (buy; sell zaehlt separat) und genau 1 limitVault',
    openMatrix.dM === 2 && openMatrix.dL === 1, openMatrix);
  check('limitVault-Aufruf traegt Mints, Betrag, Trigger und side',
    openMatrix.callL && openMatrix.callL.inputMint === SOL && openMatrix.callL.outputMint === BONK
    && openMatrix.callL.amountRaw === '1000000' && openMatrix.callL.side === 'buy'
    && String(openMatrix.callL.triggerPrice) === '0.00001', openMatrix.callL);

  console.log('\n-- Spion (3): Session-Limit bucht den Deposit --');
  const vol = await page.evaluate(async (src) => {
    const before = crWeiche.sessionLamports();
    const res = await sdk.limit({ side:'buy', price:100, size:1, source:src });
    return { before, after: crWeiche.sessionLamports(), order: res && res.orderPubkey };
  }, armedSrc);
  check('erfolgreiche Limit bucht den Deposit (1000000 Lamports)',
    vol.after === vol.before + 1000000 && vol.order === 'SPYORDER', vol);

  console.log('\n-- Route-Trennung: nur sdk.limit erreicht limitVault --');
  const sep = await page.evaluate(async (src) => {
    const bm = window.__cM(), bl = window.__cL();
    await sdk.market({ side:'buy', size:1, price:100, source:src });      // nur marketSwap
    const midM = window.__cM() - bm, midL = window.__cL() - bl;
    await sdk.limit({ side:'buy', price:100, size:1, source:src });        // nur limitVault
    return { marketOnlyM: midM, marketOnlyL: midL,
             limitOnlyM: window.__cM() - bm - midM, limitOnlyL: window.__cL() - bl - midL };
  }, armedSrc);
  check('sdk.market → nur marketSwap (0 limitVault)', sep.marketOnlyM === 1 && sep.marketOnlyL === 0, sep);
  check('sdk.limit → nur limitVault (0 marketSwap)', sep.limitOnlyM === 0 && sep.limitOnlyL === 1, sep);

  console.log('\n-- JWT-nur-Memory: gegen die ECHTEN Vault-Endpunkte --');
  const jwt = await page.evaluate(async () => {
    crVaultApi.clear();
    const au = await crVaultApi.ensureAuth(crSigner.active().address, m => crSigner.signMessage(m));
    const tok = crVaultApi.token();
    let inLS = false, lsKeys = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i); lsKeys.push(k);
      const v = localStorage.getItem(k) || '';
      if((tok && (v.indexOf(tok) >= 0 || k.indexOf(tok) >= 0)) || /jwt|bearer/i.test(k)) inLS = true;
    }
    return { ok: !!(au && au.ok), tok, inLS, msgs: window.__msgs.length, lsKeys };
  });
  check('ensureAuth erfolgreich (challenge → signMessage → verify)', jwt.ok && jwt.msgs >= 1, jwt);
  check('crVaultApi.token() traegt den JWT im Speicher', jwt.tok === JWT, jwt.tok);
  check('KEIN localStorage-Schluessel/-Wert traegt den JWT (nie persistiert)', jwt.inLS === false, jwt.lsKeys);

  console.log('\n-- Vault-Klartext + Gebuehr aus dem Echo --');
  /* Der echte Adapter zurueck, damit prepare gegen die gemockten Endpunkte laeuft. */
  await page.evaluate(() => { ChartRunner.sdk.setRealSDK(window.crRealAdapter); });
  const feeq = await page.evaluate(async () => {
    const pr = await crVaultLimit.prepare({ inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side:'buy',
      amountRaw:'1000000', slippageBps:50, triggerPrice:'0.00001' });
    return { feeBps: pr.feeBps, feeRaw: pr.feeRaw, hasHandle: !!(pr.handle && pr.handle.transaction), err: pr.error };
  });
  check('prepare holt die 50-bps-Gebuehr aus dem deposit/craft-Echo',
    feeq.feeBps === 50 && feeq.feeRaw === '5000' && feeq.hasHandle, feeq);
  const noFee = await page.evaluate(async () => {
    const before = window.__signs.length;
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction:'AQIDBAU=',
      feeRaw:null, feeBps:null, opts:{ inputMint:'So11111111111111111111111111111111111111112',
        outputMint:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side:'buy', amountRaw:'1000000' } });
    return { err: r && r.error, signed: window.__signs.length - before };
  });
  check('ohne ausgewiesene Gebuehr: commit verweigert, KEINE Signatur',
    noFee.err === 'fee-missing' && noFee.signed === 0, noFee);

  console.log('\n-- Panel: Pflichttext im st-live-Gold --');
  const paneltxt = await page.evaluate(([mint]) => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const overlay = { kind:'hline', id: Math.floor(Math.random() * 1e6), py:100 };
    const section = renderBlueRouteInputs(host, overlay, {});
    const route = section.querySelectorAll('select')[0];
    const armed = section.querySelector('input[type=checkbox]');
    route.value = 'limit'; route.dispatchEvent(new Event('change'));
    armed.checked = true; armed.dispatchEvent(new Event('change'));
    const klar = section.querySelector('[data-cr-panel-klar]');
    return { st: crPanelKlar.state(true, 'limit'), live: section.classList.contains('st-live'),
             klar: (klar && klar.textContent) || '', restingConst: crPanelKlar.restingText() };
  }, [BONK]);
  check('crPanelKlar.state(limit) = live bei offenen Toren', paneltxt.st === 'live', paneltxt);
  check('Panel-Sektion traegt st-live (Gold) fuer Limit', paneltxt.live === true, paneltxt);
  check('Pflichttext „⚡ RUHENDE ORDER · Guthaben geht in den Jupiter-Vault · füllt später ohne dich" steht im Panel',
    paneltxt.klar.indexOf('RUHENDE ORDER · Guthaben geht in den Jupiter-Vault · füllt später ohne dich') >= 0, paneltxt.klar);
  check('… und stimmt mit der Konstante crPanelKlar.restingText() ueberein',
    paneltxt.restingConst === '⚡ RUHENDE ORDER · Guthaben geht in den Jupiter-Vault · füllt später ohne dich', paneltxt.restingConst);

  console.log('\n-- Journal: Erstellung open mit orderPubkey, OHNE JWT --');
  const jrn = await page.evaluate(async () => {
    const before = _crJrnLoad().manual.length;
    await crVaultLimit.commit({ addr: crSigner.active().address, transaction:'AQIDBAU=',
      feeRaw:'5000', feeBps:50, depositRaw:'1000000',
      opts:{ inputMint:'So11111111111111111111111111111111111111112',
        outputMint:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side:'buy',
        amountRaw:'1000000', triggerPrice:'0.00001' } });
    const rows = _crJrnLoad().manual;
    const row = rows[rows.length - 1];
    const tok = crVaultApi.token();
    const blob = JSON.stringify(row);
    return { grew: rows.length === before + 1, result: row && row.result, order: row && row.orderPubkey,
             kind: row && row.kind, source: row && row.source, tokenLeak: !!(tok && blob.indexOf(tok) >= 0) };
  });
  check('Journal-Zeile: open, kind limit, source live, mit orderPubkey',
    jrn.grew && jrn.result === 'open' && jrn.kind === 'limit' && jrn.source === 'live' && jrn.order === 'ORDERKEY907', jrn);
  check('Journal-Zeile traegt NIE den JWT', jrn.tokenLeak === false, jrn);

  console.log('\n-- Market unberuehrt: Ende-zu-Ende quote→swap, genau eine Signatur --');
  const seenBefore = seen.length;
  const e2e = await page.evaluate(async () => {
    const res = await sdk.market({ side:'buy', size:1, price:100,
      source:{ armed:true, amountRaw:'50000000' } });
    return { res, signs: window.__signs.length };
  });
  const tail = seen.slice(seenBefore);
  const iQuote = tail.findIndex(u => /\/v1\/quote/.test(u));
  const iSwap  = tail.findIndex(u => /\/v1\/tx\/swap/.test(u));
  check('Market: /v1/quote VOR /v1/tx/swap', iQuote >= 0 && iSwap > iQuote, tail.filter(u => /\/v1\//.test(u)));
  check('Market: Ergebnis traegt sig + Zahlen aus dem Swap-Echo',
    !!(e2e.res && e2e.res.sig && e2e.res.inAmount === '50000000' && e2e.res.outAmount === '142371209424'), e2e.res);

  console.log('\n== v907 Vault-Limit: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
