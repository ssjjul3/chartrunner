/* Smoke-Verifikation v1.0.924 — Patch H (CLIENT): ruhende Orders ueber die
 * ON-CHAIN-Route (Jupiter Trigger V1) und der Cancel-Pfad.
 *
 * Befund (06.–08.09.2026): Phantom und Solflare haengen beim Sign-only
 * Lighthouse-Guard-Instruktionen an die V2-Einzahlung; Jupiter Trigger V2
 * verlangt die Tx bytegenau -> dauerhaft 400. Und V2 nimmt derzeit keine
 * Integrator-Gebuehr. Die On-Chain-Route sendet die Order-Tx so, wie sie
 * signiert wurde, und traegt die 50-bps-Referral-Gebuehr.
 *
 * Geprueft wird, was die Seite VERLAESST (Spion im page.route-Handler), was
 * die Wallet GEFRAGT wird und was der Nutzer SIEHT. Jede Gegenprobe MUSS ROT
 * koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   H1  commit ruft orders/onchain/execute mit signed_tx + request_id +
 *       making_amount; Spion: signAndSend/sendTransaction = 0 Aufrufe.
 *       (Mutation: in crOnchainLimit.commit makingAmount weglassen -> rot.)
 *   H2  Cancel: orders/onchain/cancel -> signTransaction -> execute OHNE
 *       making_amount; Journal status 'cancelled' + sig; eine V2-Order zeigt
 *       im Terminal „Cancel über jup.ag" statt eines Knopfes.
 *       (Mutation: making_amount im Cancel mitsenden -> rot.)
 *   H3  taking_amount BUY und SELL, Decimals 6 und 9; fehlender SOL-Preis
 *       -> KEIN Signieren, ehrliche Meldung.
 *       (Mutation: bei fehlendem Preis 1 annehmen -> rot.)
 *   H4  Routing: /health trigger.resting_default 'v1' -> On-Chain,
 *       'v2' -> Vault; cr_wallet_guard_v1 erzwingt V1.
 *   H5  Fee-Text je Venue; „bei der Einzahlung gebunden" kommt im BUILD
 *       nicht mehr vor (grep-Test ueber die Datei).
 *   H6  Abgleich nimmt On-Chain-Orders auf, ohne bekannte zu duplizieren.
 *   H7  Market-Pfad unveraendert: 1 signAndSend, 0 signTransaction, quote
 *       vor swap.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v924_patchH_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = process.env.CR_HTML ? path.resolve(process.env.CR_HTML)
                                 : path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
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

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';   // Fixture-Decimals 6
const JTO  = 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL';    // Fixture-Decimals 9
const SOL  = 'So11111111111111111111111111111111111111112';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const OTHER = 'OTHERwa11etAddre5522222222222222222222222222';
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-924';
const SIGNED_BYTES = [1, 2, 3, 4, 5, 0xAA];
const SOL_USD = 200;
const DEC = { [BONK]: 6, [JTO]: 9 };
const ONCHAIN = ['/v1/orders/onchain/create', '/v1/orders/onchain/execute',
                 '/v1/orders/onchain/cancel', '/v1/orders/onchain/active'];
const VAULT   = ['/v1/auth/challenge', '/v1/auth/verify', '/v1/vault/register',
                 '/v1/deposit/craft', '/v1/orders/price', '/v1/orders/active', '/v1/orders/history'];

/* Fixture-Schalter, node-seitig zwischen den Schritten umstellbar. */
const cfg = { resting: 'v1', listOnchain: true, listVault: true, price: true, decimals: true,
              createMode: 'ok', executeMode: 'ok', onchainOrders: [], expiry: null };

const seen = { create: [], execute: [], cancel: [], ocActive: [], active: [], history: [],
               price: [], mints: [], quote: [], swap: [] };
function bodyOf(req){ try { return req.postDataJSON(); } catch(_){ return { __unparsable: req.postData() }; } }

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) }).catch(() => {});

    if(/\/health/.test(url)){
      const eps = ['/v1/quote', '/v1/tx/swap', '/v1/tx/status', '/v1/price', '/v1/mints/resolve']
        .concat(cfg.listVault ? VAULT.map(p => 'POST ' + p) : [])
        .concat(cfg.listOnchain ? ONCHAIN.map(p => 'POST ' + p) : []);
      const h = { ok: true, version: 'tx v1.26', signs: false, kill: false, endpoints: eps };
      h.trigger = { resting_default: cfg.resting };
      if(cfg.listOnchain) h.trigger.onchain = { create: '/v1/orders/onchain/create', venue: 'jupiter-v1', fee_bps: 50 };
      return J(h);
    }
    /* ---- On-Chain (V1), OHNE JWT ---------------------------------------- */
    if(/\/v1\/orders\/onchain\/create/.test(url)){
      const b = bodyOf(req); seen.create.push({ body: b, auth: req.headers()['authorization'] || null });
      if(cfg.createMode === 'otx')
        return J({ ok: false, error: 'onchain-tx-unexpected', code: 'otx-arg-layout-3',
                   detail: 'initialize_order: erwartet 3 Argumente, gebaut wurden 4.' }, 502);
      if(cfg.createMode === 'fee-missing')
        return J({ ok: true, order: 'ORDER924', transaction: 'AQIDBAU=', request_id: 'REQ924',
                   making_amount: String(b.making_amount), taking_amount: String(b.taking_amount), venue: 'jupiter-v1' });
      if(cfg.createMode === 'contract')
        return J({ ok: false, error: 'onchain-contract-invalid', missing: ['taking_amount'], detail: 'taking_amount fehlt.' }, 400);
      return J({ ok: true, order: 'ORDER924', transaction: 'AQIDBAU=', request_id: 'REQ924',
                 platform_fee: { bps: 50, account: 'FEEacct11111111111111111111111111111111111', mint: b.input_mint },
                 making_amount: String(b.making_amount), taking_amount: String(b.taking_amount),
                 verify: { jupiter: { making_amount_seen: String(b.making_amount), fee_bps_seen: 50 } },
                 venue: 'jupiter-v1' });
    }
    if(/\/v1\/orders\/onchain\/execute/.test(url)){
      const b = bodyOf(req); seen.execute.push({ body: b, auth: req.headers()['authorization'] || null });
      if(cfg.executeMode === 'failed')
        return J({ ok: false, error: 'onchain-execute-failed', signature: 'TXFAIL924', detail: 'Kette meldet InstructionError.' }, 502);
      return J({ ok: true, signature: 'TXSIG924', status: 'Success', verify: { landed: true } });
    }
    if(/\/v1\/orders\/onchain\/cancel/.test(url)){
      const b = bodyOf(req); seen.cancel.push({ body: b, auth: req.headers()['authorization'] || null });
      return J({ ok: true, transaction: 'BQQDAgE=', request_id: 'REQCANCEL924' });
    }
    if(/\/v1\/orders\/onchain\/active/.test(url)){
      seen.ocActive.push({ url, auth: req.headers()['authorization'] || null });
      return J({ ok: true, state: 'active', venue: 'jupiter-v1', orders: cfg.onchainOrders });
    }
    /* ---- Vault (V2) ------------------------------------------------------ */
    if(/\/v1\/auth\/challenge/.test(url)) return J({ ok: true, challenge: 'CR-CHALLENGE-924', expires_in_s: 120 });
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok: true, token: JWT, expires_in_s: 600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok: true, registered: true });
    if(/\/v1\/deposit\/craft/.test(url)){
      const b = bodyOf(req);
      return J({ ok: true, transaction: 'AQIDBAU=', expires_in_s: 40, deposit: { amount_raw: String(b.amount_raw) }, fee: { bps: 50 }, request_id: 'REQV2' });
    }
    if(/\/v1\/orders\/price/.test(url))   return J({ ok: true, id: 'ORDERV2', txSignature: 'TXV2', depositConfirmed: true, status: 'Open', fee: { bps: 50 } });
    if(/\/v1\/orders\/active/.test(url)){ seen.active.push(url); return J({ ok: true, orders: [] }); }
    if(/\/v1\/orders\/history/.test(url)){ seen.history.push(url); return J({ ok: true, orders: [] }); }
    /* ---- Daten ----------------------------------------------------------- */
    if(/\/v1\/price/.test(url)){
      seen.price.push(url);
      if(!cfg.price) return J({ ok: true, prices: {} });
      return J({ ok: true, prices: { [SOL]: { usd: SOL_USD, age_s: 2 } } });
    }
    if(/\/v1\/mints\/resolve/.test(url)){
      seen.mints.push(url);
      const ids = decodeURIComponent((url.split('ids=')[1] || '').split('&')[0]).split(',');
      const out = {};
      ids.forEach(id => {
        out[id] = cfg.decimals ? { mint: id, verified: true, decimals: DEC[id] != null ? DEC[id] : 9 }
                               : { mint: id, verified: true };
      });
      return J({ ok: true, mints: out });
    }
    if(/\/v1\/token\/safety/.test(url))  return J({ ok: true, checked: { read: true, verdict: 'clean', decision: 'allow', findings: [] } });
    if(/\/v1\/quote/.test(url)){ seen.quote.push(Date.now());
      return J({ ok: true, quote: { in_raw: '50000000', out_raw: '142371209424', min_out_raw: '141659353377', slippage_bps: 50 },
        platform_fee: { bps: 50, amount_raw: '5000' }, route: { hops: 1, venues: ['Whirlpool'] } }); }
    if(/\/v1\/tx\/swap/.test(url)){ seen.swap.push(Date.now());
      return J({ transaction: 'AQIDBAU=', expires_in_s: 40, cluster: 'mainnet',
        quote: { in_raw: '50000000', out_raw: '142371209424', min_out_raw: '141659353377', slippage_bps: 50 }, route: { platform_fee_bps: 50 } }); }
    if(/\/v1\/tx\/status/.test(url))     return J({ confirmationStatus: 'confirmed', confirmations: 1, err: null });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok: true, read: true, holdings: [{ mint: BONK, decimals: 6, amount_raw: '5000000000', symbol: 'BONK' }] });
    return J({});
  });

  const initWallet = ([a, signedBytes]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = [];
    window.__msgs = [];
    const acct = { address: a, chains: ['solana:mainnet'], features: [] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      const feats = {
        'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [acct] }) },
        'solana:signMessage': { version: '1.0.0',
          signMessage: async (i) => { window.__msgs.push(i && i.message ? i.message.length : 0);
            const s = new Uint8Array(64); s[0] = 7; return [{ signature: s }]; } },
        'solana:signAndSendTransaction': { version: '1.0.0',
          signAndSendTransaction: async (i) => { window.__signs.push({ mode: 'send', chain: i && i.chain });
            const s = new Uint8Array(64); s[0] = 9; return [{ signature: s }]; } },
        'solana:signTransaction': { version: '1.0.0',
          signTransaction: async (i) => {
            window.__signs.push({ mode: 'sign', chain: i && i.chain, bytes: i && i.transaction ? i.transaction.length : 0 });
            return [{ signedTransaction: new Uint8Array(signedBytes) }]; } } };
      const w = { name: 'M', version: '1', icon: '', chains: ['solana:mainnet'], get accounts(){ return [acct]; }, features: feats };
      window.__mockWallet = w;
      (typeof r === 'function' ? r : r.register)(w);
    });
  };
  await page.addInitScript(initWallet, [ADDR, SIGNED_BYTES]);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2600);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.924',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 924)))), bv);
  const seam = await page.evaluate(() => ({
    api: !!(window.crVaultApi && ['onchainCreate','onchainExecute','onchainCancel','onchainActive','restingDefault','onchainLive'].every(k => typeof crVaultApi[k] === 'function')),
    paths: window.crVaultApi && crVaultApi.PATHS_ONCHAIN && crVaultApi.PATHS_ONCHAIN.onchainCreate === '/v1/orders/onchain/create'
        && crVaultApi.PATHS_ONCHAIN.onchainCancel === '/v1/orders/onchain/cancel',
    route: !!(window.crRestingRoute && typeof crRestingRoute.routeVenue === 'function' && typeof crRestingRoute.feeText === 'function'),
    limit: !!(window.crOnchainLimit && ['prepare','commit','execute','cancel','takingFor'].every(k => typeof crOnchainLimit[k] === 'function')),
    adapter: !!(window.crRealAdapter && typeof crRealAdapter.limitOnchain === 'function' && typeof crRealAdapter.limitVault === 'function'
             && typeof crRealAdapter.marketSwap === 'function') }));
  check('Naehte: crVaultApi.onchain*, PATHS_ONCHAIN, crRestingRoute, crOnchainLimit, Adapter traegt limitOnchain NEBEN limitVault + marketSwap',
    seam.api && seam.paths && seam.route && seam.limit && seam.adapter, seam);

  /* ===================== Aufbau ===================== */
  const setup = await page.evaluate(async ([mint, jto]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    const m = crStoreMint(currentAssetObj());
    crTrustBadge.note(m, { source: 'jupiter', usd: 1, age_s: 2, block_id: 1 }, 0);
    crSigner.active();
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window._crMintMeta = window._crMintMeta || {};
    window._crMintMeta[mint] = { symbol: 'BONK', decimals: 6 };
    window._crMintMeta[jto]  = { symbol: 'JTO', decimals: 9 };
    try { sessionStorage.removeItem('cr_wallet_guard_v1'); } catch(_){}
    crVaultApi._pfReset(); crVaultApi.clear(); crOrderReconcile._reset();
    return { mint: m, ready: !!(crSigner.info() && crSigner.info().ready), badge: crWeiche.badgeGate() };
  }, [BONK, JTO]);
  check('Sol-Asset aktiv, badgeGate offen, Wallet „M" signierfaehig',
    setup.mint === BONK && setup.badge && setup.badge.ok === true && setup.ready === true, setup);

  /* ===================== H4 — Routing ===================== */
  console.log('\n-- H4: Routing nach /health trigger.resting_default und nach cr_wallet_guard_v1 --');
  const h4 = await page.evaluate(async () => {
    const out = {};
    const probe = async () => { crVaultApi._pfReset(); await crVaultApi.preflight('health'); return crRestingRoute.routeVenue(); };
    out.v1 = await probe();
    out.restingSeen = crVaultApi.restingDefault();
    out.onchainLive = crVaultApi.onchainLive();
    return out;
  });
  check('resting_default „v1" → routeVenue jupiter-v1 (gemessen, nicht geraten)',
    h4.v1 === 'jupiter-v1' && h4.restingSeen === 'v1' && h4.onchainLive === true, h4);
  cfg.resting = 'v2';
  const h4b = await page.evaluate(async () => {
    crVaultApi._pfReset(); await crVaultApi.preflight('health');
    const v2 = crRestingRoute.routeVenue();
    sessionStorage.setItem('cr_wallet_guard_v1', 'Phantom');
    const forced = crRestingRoute.routeVenue();
    const guardForced = crRestingRoute.guardForced();
    sessionStorage.removeItem('cr_wallet_guard_v1');
    return { v2, forced, guardForced };
  });
  check('resting_default „v2" → routeVenue jupiter-v2; ein gesetztes cr_wallet_guard_v1 erzwingt trotzdem jupiter-v1',
    h4b.v2 === 'jupiter-v2' && h4b.forced === 'jupiter-v1' && h4b.guardForced === true, h4b);
  cfg.listOnchain = false;
  const h4c = await page.evaluate(async () => {
    crVaultApi._pfReset(); await crVaultApi.preflight('health');
    sessionStorage.setItem('cr_wallet_guard_v1', 'Phantom');
    const forced = crRestingRoute.routeVenue();
    sessionStorage.removeItem('cr_wallet_guard_v1');
    const pf1 = await crVaultApi.preflight('v1');
    return { forced, pf1, live: crVaultApi.onchainLive() };
  });
  check('On-Chain-Endpunkte NICHT in /health: der Merker erzwingt NICHTS (die Route gibt es nicht), preflight(v1) nennt die fehlenden Pfade',
    h4c.forced === 'jupiter-v2' && h4c.live === false && h4c.pf1 && h4c.pf1.error === 'onchain-endpoints-missing'
      && (h4c.pf1.missing || []).length === 2, h4c);
  cfg.listOnchain = true; cfg.resting = 'v1';

  /* ===================== H3 — taking_amount ===================== */
  console.log('\n-- H3: taking_amount BUY/SELL, Decimals 6 und 9; ohne SOL-Preis wird NICHT signiert --');
  const h3 = await page.evaluate(async ([sol, bonk, jto]) => {
    const buy6  = await crOnchainLimit.takingFor({ side: 'buy',  inputMint: sol, outputMint: bonk, amountRaw: '100000000', triggerPrice: 0.5 });
    const buy9  = await crOnchainLimit.takingFor({ side: 'buy',  inputMint: sol, outputMint: jto,  amountRaw: '100000000', triggerPrice: 2 });
    const sell6 = await crOnchainLimit.takingFor({ side: 'sell', inputMint: bonk, outputMint: sol, amountRaw: '1000000000', triggerPrice: 0.5 });
    return { buy6, buy9, sell6 };
  }, [SOL, BONK, JTO]);
  /* 0,1 SOL · SOL 200 $ = 20 $ ; Trigger 0,50 $ → 40 BONK → 40 * 10^6 */
  check('BUY, Token-Decimals 6: 0,1 SOL @ SOL 200 $ / Trigger 0,50 $ → 40 000 000 Roheinheiten',
    h3.buy6 && h3.buy6.ok === true && h3.buy6.takingRaw === '40000000' && h3.buy6.tokenDecimals === 6 && h3.buy6.solUsd === 200, h3.buy6);
  /* 20 $ / 2 $ = 10 JTO → 10 * 10^9 */
  check('BUY, Token-Decimals 9: 0,1 SOL / Trigger 2 $ → 10 000 000 000 Roheinheiten',
    h3.buy9 && h3.buy9.ok === true && h3.buy9.takingRaw === '10000000000' && h3.buy9.tokenDecimals === 9, h3.buy9);
  /* 1000 BONK (dec 6) @ 0,50 $ = 500 $ / 200 $ = 2,5 SOL → 2 500 000 000 Lamports */
  check('SELL, Token-Decimals 6: 1000 BONK @ 0,50 $ → 2 500 000 000 Lamports (Ziel ist SOL, 9 Decimals)',
    h3.sell6 && h3.sell6.ok === true && h3.sell6.takingRaw === '2500000000' && h3.sell6.takingDecimals === 9 && h3.sell6.sell === true, h3.sell6);
  cfg.price = false;
  const h3b = await page.evaluate(async ([sol, bonk]) => {
    if(window.crMarkets && crMarkets._reset) crMarkets._reset();
    const s0 = window.__signs.length;
    const tk = await crOnchainLimit.takingFor({ side: 'buy', inputMint: sol, outputMint: bonk, amountRaw: '100000000', triggerPrice: 0.5 });
    const pr = await crOnchainLimit.prepare({ side: 'buy', inputMint: sol, outputMint: bonk, amountRaw: '100000000', triggerPrice: 0.5 });
    return { tk, pr, signs: window.__signs.length - s0, txt: crOnchainLimit.errorText(pr) };
  }, [SOL, BONK]);
  const c0 = seen.create.length;
  check('Ohne SOL-Preis: takingFor → sol-price-missing; prepare bricht ab, 0 Signaturen, KEIN create-Request, ehrliche Meldung (kein geschaetzter Wert)',
    h3b.tk && h3b.tk.error === 'sol-price-missing' && h3b.pr && h3b.pr.error === 'sol-price-missing' && h3b.signs === 0
      && /SOL-Preis nicht abrufbar/.test(h3b.txt) && /Nichts signiert/.test(h3b.txt), h3b);
  cfg.decimals = false; cfg.price = true;
  const h3c = await page.evaluate(async ([sol, jto]) => {
    const s0 = window.__signs.length;
    const tk = await crOnchainLimit.takingFor({ side: 'buy', inputMint: sol, outputMint: jto, amountRaw: '100000000', triggerPrice: 2 });
    return { tk, signs: window.__signs.length - s0, txt: crOnchainLimit.errorText(tk) };
  }, [SOL, JTO]);
  check('Ohne Decimals aus /v1/mints/resolve: decimals-unknown, 0 Signaturen, „wäre geraten"',
    h3c.tk && h3c.tk.error === 'decimals-unknown' && h3c.signs === 0 && /geraten/.test(h3c.txt), h3c);
  cfg.decimals = true;

  /* ===================== H1 — commit → execute ===================== */
  console.log('\n-- H1: prepare zeigt Gebuehr/Mengen/Ablauf; commit → execute mit signed_tx + request_id + making_amount, 0 Sends --');
  const e0 = seen.execute.length;
  const h1 = await page.evaluate(async ([sol, jto]) => {
    const s0 = window.__signs.length, j0 = _crJrnLoad().manual.length;
    const pr = await crOnchainLimit.prepare({ side: 'buy', inputMint: sol, outputMint: jto,
      amountRaw: '100000000', triggerPrice: 2, slippageBps: 50 });
    const res = await crOnchainLimit.commit(pr.handle);
    const mine = window.__signs.slice(s0);
    const rows = _crLiveJournalRows();
    return { pr: { ok: pr.ok, feeBps: pr.feeBps, feeText: pr.feeText, amountText: pr.amountText, expiryText: pr.expiryText,
                   requestId: pr.requestId, order: pr.order, verify: pr.verify, taking: pr.takingAmount },
             res, signs: mine.filter(x => x.mode === 'sign').length, sends: mine.filter(x => x.mode === 'send').length,
             grew: _crJrnLoad().manual.length - j0, row: rows.find(r => r.vaultOrderId === 'ORDER924'),
             notes: crVaultFlight.state().notes };
  }, [SOL, JTO]);
  check('prepare: Gebuehrentext „Gebühr 0,5 % bei Ausführung (Referral)", Mengen im Klartext („0,1 SOL → mind. 10 JTO"), Ablaufdatum, request_id',
    h1.pr.ok === true && h1.pr.feeBps === 50 && h1.pr.feeText === 'Gebühr 0,5 % bei Ausführung (Referral)'
      && /→ mind\./.test(h1.pr.amountText) && /SOL/.test(h1.pr.amountText) && /JTO/.test(h1.pr.amountText)
      && /^Ablauf \d/.test(h1.pr.expiryText) && h1.pr.requestId === 'REQ924' && h1.pr.taking === '10000000000', h1.pr);
  const cLast = seen.create[seen.create.length - 1] || { body: {} };
  check('create-Body: wallet, input/output_mint, making_amount, taking_amount, expired_at in SEKUNDEN, slippage_bps — und KEIN Authorization-Header (V1 ist zustandslos)',
    cLast.body.wallet === ADDR && cLast.body.input_mint === SOL && cLast.body.output_mint === JTO
      && cLast.body.making_amount === '100000000' && cLast.body.taking_amount === '10000000000'
      && Number.isInteger(cLast.body.expired_at) && cLast.body.expired_at < 1e11 && cLast.body.expired_at > Date.now() / 1000
      && cLast.body.slippage_bps === 50 && cLast.auth === null, cLast);
  const xLast = seen.execute[seen.execute.length - 1] || { body: {} };
  check('execute-Body: signed_tx + request_id + making_amount (PFLICHT, die Tx legt eine Order an); kein Authorization-Header',
    seen.execute.length === e0 + 1 && typeof xLast.body.signed_tx === 'string' && xLast.body.signed_tx.length > 0
      && xLast.body.request_id === 'REQ924' && xLast.body.making_amount === '100000000' && xLast.auth === null, xLast);
  check('SPION: genau EINE Signatur, und zwar NUR-SIGNIEREN — 0 signAndSend, 0 sendTransaction',
    h1.signs === 1 && h1.sends === 0, { signs: h1.signs, sends: h1.sends });
  check('Ergebnis + Journal: order ORDER924, signature TXSIG924, venue jupiter-v1, status open, Fee-Text ohne „bei der Einzahlung gebunden"',
    h1.res && h1.res.ok === true && h1.res.order === 'ORDER924' && h1.res.signature === 'TXSIG924' && h1.res.venue === 'jupiter-v1'
      && h1.grew === 1 && h1.row && h1.row.venue === 'jupiter-v1' && h1.row.result === 'open' && h1.row.sig === 'TXSIG924'
      && /Gebühr 0,5 % bei Ausführung \(Referral\)/.test(h1.row.notes) && !/bei der Einzahlung gebunden/.test(h1.row.notes), { res: h1.res, row: h1.row });
  check('Diagnose: verify.jupiter der create-Antwort kommt am Ergebnis mit (making_amount_seen, fee_bps_seen)',
    h1.pr.verify && h1.pr.verify.making_amount_seen === '100000000' && h1.pr.verify.fee_bps_seen === 50, h1.pr.verify);

  console.log('\n-- H1b: Fehlwege — otx-Code woertlich, contract-invalid mit missing[], fee-missing → keine Signatur --');
  cfg.createMode = 'otx';
  const h1b = await page.evaluate(async ([sol, jto]) => {
    const s0 = window.__signs.length;
    const pr = await crOnchainLimit.prepare({ side: 'buy', inputMint: sol, outputMint: jto, amountRaw: '100000000', triggerPrice: 2 });
    return { pr, txt: crOnchainLimit.errorText(pr), signs: window.__signs.length - s0 };
  }, [SOL, JTO]);
  check('onchain-tx-unexpected: der Code otx-… steht WOERTLICH in der Meldung, 0 Signaturen',
    h1b.pr && h1b.pr.error === 'onchain-tx-unexpected' && h1b.pr.code === 'otx-arg-layout-3'
      && /otx-arg-layout-3/.test(h1b.txt) && /Nichts signiert/.test(h1b.txt) && h1b.signs === 0, h1b);
  cfg.createMode = 'contract';
  const h1c = await page.evaluate(async ([sol, jto]) => {
    const s0 = window.__signs.length;
    const pr = await crOnchainLimit.prepare({ side: 'buy', inputMint: sol, outputMint: jto, amountRaw: '100000000', triggerPrice: 2 });
    return { pr, txt: crOnchainLimit.errorText(pr), signs: window.__signs.length - s0 };
  }, [SOL, JTO]);
  check('onchain-contract-invalid: missing[] kommt durch (Whitelist-Falle), Meldung nennt das fehlende Feld, 0 Signaturen',
    h1c.pr && h1c.pr.error === 'onchain-contract-invalid' && JSON.stringify(h1c.pr.missing) === '["taking_amount"]'
      && /taking_amount/.test(h1c.txt) && h1c.signs === 0, h1c);
  cfg.createMode = 'fee-missing';
  const h1d = await page.evaluate(async ([sol, jto]) => {
    const s0 = window.__signs.length;
    const pr = await crOnchainLimit.prepare({ side: 'buy', inputMint: sol, outputMint: jto, amountRaw: '100000000', triggerPrice: 2 });
    const cm = await crOnchainLimit.commit(pr.handle);
    return { feeBps: pr.feeBps, cm, signs: window.__signs.length - s0 };
  }, [SOL, JTO]);
  check('create OHNE platform_fee: commit verweigert (fee-missing) — KEINE Signatur, dieselbe Philosophie wie am Market-Arm',
    h1d.feeBps === null && h1d.cm && h1d.cm.error === 'fee-missing' && h1d.signs === 0, h1d);
  cfg.createMode = 'ok';
  cfg.executeMode = 'failed';
  const h1e = await page.evaluate(async ([sol, jto]) => {
    const j0 = _crJrnLoad().manual.length;
    const pr = await crOnchainLimit.prepare({ side: 'buy', inputMint: sol, outputMint: jto, amountRaw: '100000000', triggerPrice: 2 });
    const cm = await crOnchainLimit.commit(pr.handle);
    return { cm, txt: crOnchainLimit.errorText(cm), grew: _crJrnLoad().manual.length - j0 };
  }, [SOL, JTO]);
  check('onchain-execute-failed: die signature kommt durch und steht in der Meldung („im Explorer prüfen"), KEIN Journal-Eintrag',
    h1e.cm && h1e.cm.error === 'onchain-execute-failed' && h1e.cm.signature === 'TXFAIL924'
      && /TXFAIL924/.test(h1e.txt) && /Explorer/.test(h1e.txt) && h1e.grew === 0, h1e);
  cfg.executeMode = 'ok';

  /* ===================== H2 — Cancel ===================== */
  console.log('\n-- H2: Cancel → cancel → signTransaction → execute OHNE making_amount; V2-Order zeigt den jup.ag-Hinweis --');
  const x1 = seen.execute.length, k0 = seen.cancel.length;
  const h2 = await page.evaluate(async () => {
    const s0 = window.__signs.length;
    const r = await crOnchainLimit.cancel({ order: 'ORDER924' });
    const mine = window.__signs.slice(s0);
    const row = _crLiveJournalRows().find(x => x.vaultOrderId === 'ORDER924');
    const pos = _crLivePositions().filter(p => p.vaultOrderId === 'ORDER924');
    return { r, signs: mine.filter(x => x.mode === 'sign').length, sends: mine.filter(x => x.mode === 'send').length, row, pos };
  });
  const kLast = seen.cancel[seen.cancel.length - 1] || { body: {} };
  const xCancel = seen.execute[seen.execute.length - 1] || { body: {} };
  check('cancel-Body: { wallet, order }, kein Authorization-Header',
    seen.cancel.length === k0 + 1 && kLast.body.wallet === ADDR && kLast.body.order === 'ORDER924' && kLast.auth === null, kLast);
  check('execute nach dem Cancel: signed_tx + request_id, aber KEIN making_amount (die Tx legt keine Order an)',
    seen.execute.length === x1 + 1 && xCancel.body.request_id === 'REQCANCEL924' && typeof xCancel.body.signed_tx === 'string'
      && !('making_amount' in xCancel.body), xCancel.body);
  check('Cancel: genau EINE Signatur (nur-signieren), 0 Sends; Journal-Zeile bleibt stehen und wechselt auf cancelled + cancelSig',
    h2.signs === 1 && h2.sends === 0 && h2.r && h2.r.ok === true && h2.row && h2.row.status === 'cancelled'
      && h2.row.result === 'cancelled' && h2.row.cancelSig === 'TXSIG924' && /CANCEL tx TXSIG924/.test(h2.row.notes), h2);
  check('Die aufgeloeste Order verschwindet aus den OFFENEN POSITIONEN (nichts geloescht, nur nicht mehr offen)',
    h2.pos.length === 0, h2.pos);

  const h2b = await page.evaluate(async () => {
    /* Zwei Zeilen ins Journal: eine V1- und eine V2-Order, beide offen. */
    const d = _crJrnLoad();
    const base = (id, venue) => ({ id: 'limit_' + id, orderId: 'live:limit:' + id, ts: Date.now(), dateStr: '',
      asset: 'JTO', tf: '', side: 'buy', setup: 'limit', entry: 2, result: 'open', pnl: 0, notes: 'x',
      auto: true, kind: 'limit', source: 'live', venue: venue, sig: 'S' + id, txSignature: 'S' + id,
      orderPubkey: id, vaultOrderId: id, status: 'open', amountInRaw: '100000000', amountOutRaw: '' });
    d.manual.push(base('ORDERV1ROW', 'jupiter-v1'));
    d.manual.push(base('ORDERV2ROW', 'jupiter-v2'));
    _crJrnSave(d);
    try { osOpenWindow('terminal'); } catch(_){}
    await new Promise(r => setTimeout(r, 800));
    const host = document.getElementById('crTermOpenList');
    const r1 = host ? host.querySelector('.crTerm-tblRow[data-cr-order-id="ORDERV1ROW"]') : null;
    const r2 = host ? host.querySelector('.crTerm-tblRow[data-cr-order-id="ORDERV2ROW"]') : null;
    return { v1: r1 ? { html: r1.innerHTML, btn: !!r1.querySelector('[data-cr-cancel-order="ORDERV1ROW"]'), hint: !!r1.querySelector('[data-cr-cancel-hint]') } : null,
             v2: r2 ? { text: r2.textContent, btn: !!r2.querySelector('[data-cr-cancel-order]'), hint: !!r2.querySelector('[data-cr-cancel-hint="jupiter-v2"]') } : null };
  });
  check('Terminal: die V1-Zeile traegt einen CANCEL-Knopf, die V2-Zeile stattdessen „Cancel über jup.ag" (kein Knopf)',
    h2b.v1 && h2b.v1.btn === true && h2b.v1.hint === false
      && h2b.v2 && h2b.v2.btn === false && h2b.v2.hint === true && /Cancel über jup\.ag/.test(h2b.v2.text), h2b);

  /* ===================== H6 — Abgleich ===================== */
  console.log('\n-- H6: Abgleich nimmt On-Chain-Orders auf (ohne JWT), ohne bekannte zu duplizieren; fremde Wallet nie --');
  cfg.onchainOrders = [
    { orderKey: 'ORDERONCHAIN1', userPubkey: ADDR, inputMint: SOL, outputMint: JTO, rawMakingAmount: '120000000',
      rawTakingAmount: '10000000000', status: 'Open', openTx: 'TXOC1', expiredAt: new Date(Date.now() + 30 * 86400000).toISOString() },
    { orderKey: 'ORDERV1ROW', userPubkey: ADDR, inputMint: SOL, outputMint: JTO, rawMakingAmount: '100000000', status: 'Open', openTx: 'SORDERV1ROW' },
    { orderKey: 'ORDERFOREIGN', userPubkey: OTHER, inputMint: SOL, outputMint: JTO, rawMakingAmount: '1', status: 'Open', openTx: 'TXF' }
  ];
  const oc0 = seen.ocActive.length, a0 = seen.active.length;
  const h6 = await page.evaluate(async () => {
    crOrderReconcile._reset(); crVaultApi.clear();
    const j0 = _crJrnLoad().manual.length;
    const r = await crOrderReconcile.runOnchain({ quiet: true });
    const rows = _crLiveJournalRows();
    return { r: { ok: r.ok, error: r.error, added: (r.added || []).map(x => x.id), found: (r.found || []).length },
             grew: _crJrnLoad().manual.length - j0,
             fresh: rows.find(x => x.vaultOrderId === 'ORDERONCHAIN1'),
             dupe: rows.filter(x => x.vaultOrderId === 'ORDERV1ROW').length,
             foreign: rows.filter(x => x.vaultOrderId === 'ORDERFOREIGN').length,
             tok: crVaultApi.token() };
  });
  check('runOnchain OHNE JWT: genau EIN orders/onchain/active-Aufruf, KEIN orders/active, kein Token angefordert',
    seen.ocActive.length === oc0 + 1 && seen.active.length === a0 && h6.tok === null
      && seen.ocActive[seen.ocActive.length - 1].auth === null, { oc: seen.ocActive.length - oc0, a: seen.active.length - a0, tok: h6.tok });
  check('Die unbekannte On-Chain-Order landet im Journal (venue jupiter-v1, reconciled, Ablauf); die bekannte wird NICHT dupliziert; die fremde Wallet nie',
    h6.grew === 1 && h6.r.ok === true && JSON.stringify(h6.r.added) === '["ORDERONCHAIN1"]'
      && h6.fresh && h6.fresh.venue === 'jupiter-v1' && h6.fresh.reconciled === true && h6.fresh.expiresAt > Date.now()
      && h6.dupe === 1 && h6.foreign === 0, h6);
  const oc1 = seen.ocActive.length, a1 = seen.active.length, hh1 = seen.history.length;
  const h6b = await page.evaluate(async () => {
    crOrderReconcile._reset();
    const au = await crVaultApi.ensureAuth(crSigner.active().address, msg => crSigner.signMessage(msg));
    await new Promise(r => setTimeout(r, 700));
    return { auth: !!(au && !au.error), last: crOrderReconcile.last(), trace: crVaultFlight.state().trace.map(x => x.name) };
  });
  check('Der volle Abgleich (mit JWT) ruft alle DREI Listen: orders/active, orders/history UND orders/onchain/active — nur ergaenzt, nichts ersetzt',
    h6b.auth === true && seen.active.length === a1 + 1 && seen.history.length === hh1 + 1 && seen.ocActive.length === oc1 + 1, 
    { a: seen.active.length - a1, h: seen.history.length - hh1, oc: seen.ocActive.length - oc1 });

  /* ===================== H5 — Fee-Texte ===================== */
  console.log('\n-- H5: Fee-Text je Venue; „bei der Einzahlung gebunden" kommt im Build nicht mehr vor --');
  const h5 = await page.evaluate(() => ({
    v1: crRestingRoute.feeText('jupiter-v1', 50),
    v1c: crRestingRoute.FEE_V1,
    v2: crRestingRoute.feeText('jupiter-v2', 50),
    v2c: crRestingRoute.FEE_V2,
    legacy: crVaultLimit.feeText({ feeBps: 50, feeBoundAt: 'craft' }),
    onchain: crOnchainLimit.feeText({ feeBps: 50 }),
    label: crRestingRoute.label('jupiter-v1'),
    normalizeEmpty: crRestingRoute.normalize('') }));
  check('jupiter-v1 → „Gebühr 0,5 % bei Ausführung (Referral)"; jupiter-v2 → „Keine ChartRunner-Gebühr (Jupiter V2 unterstützt derzeit keine Integrator-Gebühr)"',
    h5.v1 === 'Gebühr 0,5 % bei Ausführung (Referral)' && h5.v1c === h5.v1 && h5.onchain === h5.v1
      && h5.v2 === 'Keine ChartRunner-Gebühr (Jupiter V2 unterstützt derzeit keine Integrator-Gebühr)' && h5.v2c === h5.v2, h5);
  check('crVaultLimit.feeText liefert auch mit fee.bound_at „craft" den V2-Satz (die Bindung gibt es nicht mehr); eine Zeile ohne venue gilt als V2',
    h5.legacy === h5.v2 && h5.normalizeEmpty === 'jupiter-v2' && h5.label === 'ON-CHAIN-LIMIT · RUHENDE ORDER', h5);
  /* Gegrept wird der NUTZERTEXT, nicht die Chronik: Banner und Kommentare
   * duerfen (und sollen) benennen, dass es den Satz gab und warum er falsch
   * war — kein Nutzer sieht sie. Deshalb erst HTML- und Blockkommentare raus,
   * dann suchen. */
  const src = fs.readFileSync(FILE, 'utf8');
  const codeOnly = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  check('grep über den BUILD (ohne Kommentare/Banner): „bei der Einzahlung gebunden" erreicht keinen Nutzer mehr',
    codeOnly.indexOf('bei der Einzahlung gebunden') < 0, codeOnly.indexOf('bei der Einzahlung gebunden'));
  check('grep über den BUILD (ohne Kommentare/Banner): „mit dieser Wallet derzeit nicht möglich" ist ebenfalls weg',
    codeOnly.indexOf('mit dieser Wallet derzeit nicht möglich') < 0, codeOnly.indexOf('mit dieser Wallet derzeit nicht möglich'));
  check('…und „Gebührenstand: siehe Einzahlung" (der zweite v923-Satz derselben falschen Bindung) ebenso',
    codeOnly.indexOf('Gebührenstand: siehe Einzahlung') < 0, codeOnly.indexOf('Gebührenstand: siehe Einzahlung'));

  /* ===================== Panel — die Handy-Strecke ===================== */
  console.log('\n-- H8: Panel-Strecke (Limit-HLine → Arm) auf der On-Chain-Route --');
  await page.evaluate(() => {
    window.__toasts = [];
    const _orig = window.toast;
    window.toast = function(m){ try { window.__toasts.push(String(m)); } catch(_){} return _orig ? _orig(m) : undefined; };
    window.__runPanel = async function(waitMs){
      crVaultApi._pfReset();
      try { crTrustBadge.note(crStoreMint(currentAssetObj()), { source: 'jupiter', usd: 1, age_s: 2, block_id: 1 }, 0); } catch(_){}
      const s0 = window.__signs.length, m0 = window.__msgs.length, j0 = _crJrnLoad().manual.length;
      const host = document.createElement('div'); document.body.appendChild(host);
      const overlay = { kind: 'hline', id: Math.floor(Math.random() * 1e6), py: 100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const sels = section.querySelectorAll('select');
      const route = sels[0];
      const armed = section.querySelector('input[type=checkbox]');
      const size = Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox');
      window.__toasts.length = 0;
      route.value = 'limit'; route.dispatchEvent(new Event('change'));
      let inp = null;
      section.querySelectorAll('label').forEach(l => { const s = l.querySelector('span'); if(s && /^price$/i.test((s.textContent || '').trim())) inp = l.querySelector('input'); });
      if(inp){ inp.value = '2'; inp.dispatchEvent(new Event('input')); }
      size.value = '0,1'; size.dispatchEvent(new Event('change'));
      armed.checked = true; armed.dispatchEvent(new Event('change'));
      let b = null; section.querySelectorAll('button').forEach(x => { if(/arm/i.test(x.textContent || '')) b = x; });
      if(b) b.click();
      await new Promise(r => setTimeout(r, waitMs || 1800));
      const mine = window.__signs.slice(s0);
      const msg = section.querySelector('[data-cr-panel-msg]');
      const klar = section.querySelector('[data-cr-panel-klar]');
      const ctx = Array.from(section.querySelectorAll('div')).map(d => d.textContent).filter(t => /^RUN: |^Run: /.test(t));
      const g = section.querySelector('[data-cr-panel-guide]');
      const out = { msg: msg ? msg.textContent : '', klar: klar ? klar.textContent : '', ctx: ctx,
                    guide: g ? { path: g.getAttribute('data-cr-guide-path'),
                                 fee1: (g.querySelector('[data-cr-guide-fee-v1]') || {}).textContent || '',
                                 fee2: (g.querySelector('[data-cr-guide-fee-v2]') || {}).textContent || '' } : null,
                    lines: crVaultFlight.lines(), notes: crVaultFlight.state().notes,
                    signs: mine.filter(x => x.mode === 'sign').length,
                    sends: mine.filter(x => x.mode === 'send').length,
                    msgs: window.__msgs.length - m0,
                    journalGrew: _crJrnLoad().manual.length - j0 };
      host.remove();
      return out;
    };
  });
  const p1 = await page.evaluate(() => window.__runPanel(2200));
  check('Panel-Arm auf der On-Chain-Route: genau EINE Signatur (nur-signieren), 0 Sends, 0 signMessage (V1 kennt keine Anmeldung)',
    p1.signs === 1 && p1.sends === 0 && p1.msgs === 0, { signs: p1.signs, sends: p1.sends, msgs: p1.msgs });
  check('Panel zeigt VOR der Signatur Gebuehr + Mengen + Ablauf; RUN-Zeile „RUN: … · ON-CHAIN-LIMIT · RUHENDE ORDER"',
    /Gebühr 0,5 % bei Ausführung \(Referral\)/.test(p1.klar) && /→ mind\./.test(p1.klar) && /Ablauf \d/.test(p1.klar)
      && p1.ctx.some(t => /^RUN: .* · ON-CHAIN-LIMIT · RUHENDE ORDER$/.test(t)), { klar: p1.klar, ctx: p1.ctx });
  check('Panel meldet den Erfolg: „RUHENDE ORDER liegt (on-chain) · order ORDER924 · tx TXSIG924 · Success"; Journal +1',
    /RUHENDE ORDER liegt \(on-chain\)/.test(p1.msg) && /ORDER924/.test(p1.msg) && /TXSIG924/.test(p1.msg)
      && /Success/.test(p1.msg) && p1.journalGrew === 1, { msg: p1.msg, grew: p1.journalGrew });
  check('Spur: routeVenue jupiter-v1 → onchainCreate → commit → orderSign → onchainExecute (kein challenge, kein depositCraft)',
    p1.lines.some(l => /^routeVenue \d+ ms · jupiter-v1/.test(l)) && p1.lines.some(l => /^onchainCreate \d+ ms · ok$/.test(l))
      && p1.lines.some(l => /^orderSign \d+ ms · ok$/.test(l)) && p1.lines.some(l => /^onchainExecute \d+ ms · ok$/.test(l))
      && !p1.lines.some(l => /^challenge/.test(l)) && !p1.lines.some(l => /^depositCraft/.test(l)), p1.lines);
  check('Diagnose-Block des Flights: verify.jupiter als Notiz (making_amount_seen)',
    (p1.notes || []).some(n => n.label === 'verify.jupiter' && /making_amount_seen/.test(n.text)), p1.notes);
  check('Gebuehren-Blatt: zwei Zeilen, die aktive (V1) markiert; kein „bei der Einzahlung gebunden"',
    p1.guide && p1.guide.path === 'v1' && /^▸ On-Chain \(Trigger V1\): Gebühr 0,5 % bei Ausführung \(Referral\)/.test(p1.guide.fee1)
      && /^· Vault \(Trigger V2\): Keine ChartRunner-Gebühr/.test(p1.guide.fee2), p1.guide);

  /* ===================== H7 — Market unveraendert ===================== */
  console.log('\n-- H7: Market-Pfad Bit fuer Bit: signAndSend, quote vor swap, 0 signTransaction --');
  const q0 = seen.quote.length, w0 = seen.swap.length;
  const h7 = await page.evaluate(async ([sol, jto]) => {
    const s0 = window.__signs.length;
    const r = await ChartRunner.sdk.real.marketSwap({ inputMint: sol, outputMint: jto, amountRaw: '50000000', slippageBps: 50 });
    const mine = window.__signs.slice(s0);
    return { r, sends: mine.filter(x => x.mode === 'send').length, signs: mine.filter(x => x.mode === 'sign').length };
  }, [SOL, JTO]);
  check('Market: genau 1 signAndSendTransaction, 0 signTransaction, /v1/quote VOR /v1/tx/swap, Ergebnis traegt sig + Mengen',
    h7.sends === 1 && h7.signs === 0 && seen.quote.length === q0 + 1 && seen.swap.length === w0 + 1
      && h7.r && h7.r.sig && h7.r.inAmount === '50000000', h7);
  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors waehrend der Pruefung', hard2.length === 0, hard2.slice(0, 3));

  await browser.close();
  console.log('\n== v924 Patch H: ' + pass + ' ok, ' + fail + ' fail ==');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
