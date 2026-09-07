/* Smoke-Verifikation v1.0.921 — Patch E · Teil B (CLIENT): Deposit NUR signieren,
 * signierte Tx in orders/price, ehrliche Fehler.
 *
 * Befund (Trace 00:46, v920): register ok · depositCraft ok · commit/depositSign
 * → sign-failed; Phantom liess „Bestaetigen" nie zu, keine Aktivitaet. Ursache:
 * commit rief crSigner.signAndSend — Phantom simuliert die Jupiter-Craft-Tx als
 * EIGENSTAENDIGEN Send, die allein nicht gueltig ist (Jupiter landet sie mit der
 * Order) → Simulation scheitert → Phantom blockiert → sign-failed.
 *
 * Geprueft wird, was die Seite tatsaechlich VERLAESST (Spion im page.route-
 * Handler auf req.postDataJSON()) und was die Wallet tatsaechlich GEFRAGT wird
 * (Spion auf jedem Wallet-Standard-Feature + injiziertem Provider). Jede
 * Gegenprobe MUSS ROT koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   E1  signTransaction sendet NICHT: im Limit-Commit 0 Aufrufe von
 *       signAndSendTransaction / provider.sendTransaction, genau 1 Aufruf von
 *       solana:signTransaction; Rueckgabe { signedTx } ist base64 der
 *       signierten Bytes. Ohne Feature (und ohne Provider) → no-signer.
 *       (Mutation: in commit signTransaction → signAndSend → E2 „0 Sends" rot,
 *        E3/E4 rot, weil der Mock-Send eine Signatur statt signierter Bytes
 *        liefert und commit → sign-failed endet.)
 *   E2  commit → orders/price traegt deposit_signed_tx + deposit_request_id,
 *       KEIN deposit_sig; ohne request_id (Craft-Echo ohne / Handle ohne)
 *       → deposit-request-id-missing, KEINE Signatur, KEIN Request.
 *       (Mutation: `if(!handle.depositRequestId)` in commit entfernen → rot;
 *        `deposit_request_id:` im Body umbenennen → rot.)
 *   E3  Fehlermapping: Provider-Reject → rejected + „nichts bewegt" (Panel +
 *       HUD + Toast, kein Request, kein Journal); Provider-Fehler → sign-failed
 *       + detail sichtbar in Panel, HUD und Diagnose-Spur. Nie „Live swap
 *       failed" im Limit-Pfad. (Mutation: detail in commit verwerfen → rot.)
 *   E4  Journal-Eintrag traegt txSignature + depositConfirmed, result open;
 *       T-Sync (_crLivePositions/_crLiveTxHTML) zeigt die Order LIVE · LIMIT.
 *       depositConfirmed:false + orders/active leer → result pending, NICHT in
 *       den offenen Positionen. (Mutation: `txSignature:` im Journal-Row
 *       entfernen → rot.)
 *   E5  Market-Pfad unveraendert: sdk.market → genau 1 signAndSendTransaction,
 *       0 signTransaction, quote VOR swap.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v921_patchE_browser.cjs
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

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const SOL  = 'So11111111111111111111111111111111111111112';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-921';
const VAULT_PATHS = ['/v1/auth/challenge','/v1/auth/verify','/v1/vault/register',
  '/v1/deposit/craft','/v1/orders/price','/v1/orders/active'];
/* Die „signierten" Bytes, die der Wallet-Mock zurueckgibt — base64 davon muss
 * Bit fuer Bit im orders/price-Body stehen. */
const SIGNED_BYTES = [1, 2, 3, 4, 5, 0xAA];
const SIGNED_B64 = Buffer.from(SIGNED_BYTES).toString('base64');

/* Fixture-Schalter, node-seitig zwischen den Schritten umstellbar. */
const cfg = { requestId: 'REQ921', depositConfirmed: true, activeHasOrder: true };

/* Spion: jeder Body, der deposit/craft bzw. orders/price erreicht. */
const seen = { deposit: [], price: [], swap: [], quote: [] };
const lastPrice = () => seen.price[seen.price.length - 1] || null;
function bodyOf(req){ try { return req.postDataJSON(); } catch(_){ return { __unparsable: req.postData() }; } }

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

    if(/\/health/.test(url)){
      return J({ ok:true, version:'tx v1.24', signs:false, kill:false,
        endpoints: ['/v1/quote','/v1/tx/swap','/v1/tx/status','/v1/rpc/balance'].concat(VAULT_PATHS.map(p => 'POST ' + p)) });
    }
    if(/\/v1\/auth\/challenge/.test(url)) return J({ ok:true, challenge:'CR-CHALLENGE-921-abc', expires_in_s:120 });
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok:true, registered:true });
    if(/\/v1\/deposit\/craft/.test(url)){
      const b = bodyOf(req); seen.deposit.push(b);
      const body = { ok:true, transaction:'AQIDBAU=', expires_in_s:40, deposit:{ amount_raw:String(b.amount_raw) }, fee:{ bps:50 } };
      if(cfg.requestId) body.request_id = cfg.requestId;     // Worker v1.24: request_id im Echo
      return J(body);
    }
    if(/\/v1\/orders\/price/.test(url)){
      const b = bodyOf(req); seen.price.push(b);
      /* Worker v1.24 (Patch E · Teil A): verlangt deposit_signed_tx + deposit_request_id. */
      if(!b || !b.deposit_signed_tx || !b.deposit_request_id)
        return J({ ok:false, error:'vault-contract-invalid', note:'orders/price braucht deposit_signed_tx und deposit_request_id' }, 400);
      return J({ ok:true, id:'ORDER921', txSignature:'TXSIG921', depositConfirmed: !!cfg.depositConfirmed, status:'Open', fee:{ bps:50 } });
    }
    if(/\/v1\/orders\/active/.test(url))  return J({ ok:true, orders: cfg.activeHasOrder ? [{ id:'ORDER921', status:'Open' }] : [] });

    /* Market-Endpunkte (E5) */
    if(/\/v1\/token\/safety/.test(url))  return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/quote/.test(url)){ seen.quote.push(Date.now());
      return J({ ok:true, quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377', slippage_bps:50 },
        platform_fee:{ bps:50, amount_raw:'5000' }, route:{ hops:1, venues:['Whirlpool'] } }); }
    if(/\/v1\/tx\/swap/.test(url)){ seen.swap.push(Date.now());
      return J({ transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377', slippage_bps:50 }, route:{ platform_fee_bps:50 } }); }
    if(/\/v1\/tx\/status/.test(url))     return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    return J({});
  });

  /* Wallet-Mock: signMessage (Auth), signAndSendTransaction (Market) UND
   * signTransaction (Deposit, nur signieren). Jeder Aufruf wird gezaehlt,
   * nach Modus getrennt — das ist der Spion fuer „sendet NICHT". */
  const initWallet = ([a, signedBytes]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = [];   // { mode:'send' | 'sign', chain }
    window.__msgs = [];
    window.__rejectSign = false;      // signTransaction wirft „User rejected"
    window.__failSign = '';           // signTransaction wirft diesen Fehlertext
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      const feats = {
        'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
        'solana:signMessage':{ version:'1.0.0',
          signMessage: async (i) => { window.__msgs.push(i && i.message ? i.message.length : 0);
            const s = new Uint8Array(64); s[0] = 7; return [{ signature:s }]; } },
        'solana:signAndSendTransaction':{ version:'1.0.0',
          signAndSendTransaction: async (i) => { window.__signs.push({ mode:'send', chain: i && i.chain });
            const s = new Uint8Array(64); s[0] = 9; return [{ signature:s }]; } },
        'solana:signTransaction':{ version:'1.0.0',
          signTransaction: async (i) => {
            if(window.__rejectSign) throw new Error('User rejected the request.');
            if(window.__failSign) throw new Error(window.__failSign);
            window.__signs.push({ mode:'sign', chain: i && i.chain, bytes: i && i.transaction ? i.transaction.length : 0 });
            return [{ signedTransaction: new Uint8Array(signedBytes) }]; } } };
      const w = { name:'M', version:'1', icon:'', chains:['solana:mainnet'], get accounts(){ return [acct]; }, features: feats };
      window.__mockWallet = w;
      (typeof r === 'function' ? r : r.register)(w);
    });
  };
  await page.addInitScript(initWallet, [ADDR, SIGNED_BYTES]);
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
  check('Banner meldet mindestens v1.0.921',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 921)))), bv);
  const seam = await page.evaluate(() => ({
    signTx: !!(window.crSigner && typeof crSigner.signTransaction === 'function'),
    signSend: !!(window.crSigner && typeof crSigner.signAndSend === 'function'),
    limitMsg: !!(window.crPanelLive && typeof crPanelLive._msgForLimitError === 'function') }));
  check('crSigner.signTransaction NEBEN signAndSend; crPanelLive._msgForLimitError', seam.signTx && seam.signSend && seam.limitMsg, seam);

  console.log('\n-- Aufbau: Sol-Chart, Jupiter-Referenz, Wallet, globales ARM, JWT, Provider-Spion --');
  const setup = await page.evaluate(async ([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    const m = crStoreMint(currentAssetObj());
    crTrustBadge.note(m, { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window._crMintMeta = window._crMintMeta || {};
    window._crMintMeta[mint] = { symbol:'BONK', decimals:5 };
    /* Provider-Spion NACH dem Boot (crWallet liest window.solana beim Verbinden
     * nicht mehr): zaehlt jeden sendTransaction/signAndSendTransaction-Aufruf.
     * ABSICHTLICH ohne signTransaction — dann greift kein Provider-Fallback,
     * und „kein Feature" heisst wirklich no-signer. */
    window.__prov = { send: 0 };
    window.solana = { isPhantom: true,
      sendTransaction: async () => { window.__prov.send++; return 'x'; },
      signAndSendTransaction: async () => { window.__prov.send++; return { signature:'x' }; } };
    crVaultApi._pfReset(); crVaultApi.clear();
    const au = await crVaultApi.ensureAuth(crSigner.active().address, msg => crSigner.signMessage(msg));
    return { mint:m, ready: !!(crSigner.info() && crSigner.info().ready), badge: crWeiche.badgeGate(),
             auth: !!(au && !au.error), tok: crVaultApi.token() };
  }, [BONK]);
  check('Sol-Asset aktiv, badgeGate offen', setup.mint === BONK && setup.badge && setup.badge.ok === true, setup);
  check('Wallet signierfaehig (Tor 4 unveraendert: signAndSendTransaction), JWT im Speicher',
    setup.ready === true && setup.auth && setup.tok === JWT, setup);

  /* ===================== E1 — signTransaction sendet NICHT ===================== */
  console.log('\n-- E1: signTransaction signiert nur — 0 Sends, base64 zurueck --');
  const e1 = await page.evaluate(async ([b64]) => {
    const s0 = window.__signs.length, p0 = window.__prov.send;
    const r = await crSigner.signTransaction('AQIDBAU=', { chain: 'solana:mainnet' });
    const mine = window.__signs.slice(s0);
    return { r, sends: mine.filter(x => x.mode === 'send').length + (window.__prov.send - p0),
             signs: mine.filter(x => x.mode === 'sign').length, bytesIn: mine[0] && mine[0].bytes,
             chain: mine[0] && mine[0].chain, roundtrip: crSigner._bytesToB64(crSigner._b64ToBytes(b64)) === b64 };
  }, [SIGNED_B64]);
  check('signTransaction → { signedTx } = base64 der signierten Bytes, via wallet-standard',
    e1.r && !e1.r.error && e1.r.signedTx === SIGNED_B64 && e1.r.via === 'wallet-standard', e1.r);
  check('genau 1 signTransaction-Aufruf, 0 Sends (signAndSendTransaction + provider.sendTransaction)',
    e1.signs === 1 && e1.sends === 0, e1);
  check('die unsignierten Bytes gingen an die Wallet (5 Bytes), chain solana:mainnet', e1.bytesIn === 5 && e1.chain === 'solana:mainnet', e1);
  check('bytesToB64 ∘ b64ToBytes ist Identitaet', e1.roundtrip === true, e1);
  const e1d = await page.evaluate(async () => {
    const dev = await crSigner.signTransaction('AQIDBAU=');                 // Vorgabe devnet → Wallet kann nur mainnet
    const bad = await crSigner.signTransaction('', { chain: 'solana:mainnet' });
    return { dev: dev && dev.error, bad: bad && bad.error };
  });
  check('Vorgabe bleibt devnet (chain-unsupported bei Mainnet-Wallet), leere Tx → bad-tx',
    e1d.dev === 'chain-unsupported' && e1d.bad === 'bad-tx', e1d);
  const e1n = await page.evaluate(async () => {
    const f = window.__mockWallet.features['solana:signTransaction'];
    delete window.__mockWallet.features['solana:signTransaction'];
    const s0 = window.__signs.length, p0 = window.__prov.send;
    const r = await crSigner.signTransaction('AQIDBAU=', { chain: 'solana:mainnet' });
    window.__mockWallet.features['solana:signTransaction'] = f;
    return { err: r && r.error, sends: window.__signs.slice(s0).filter(x => x.mode === 'send').length + (window.__prov.send - p0) };
  });
  check('ohne Feature und ohne Provider-signTransaction → no-signer, KEIN Send-Fallback', e1n.err === 'no-signer' && e1n.sends === 0, e1n);

  /* ===================== E2 — commit → orders/price mit signierter Tx + request_id ===================== */
  console.log('\n-- E2: commit → orders/price traegt deposit_signed_tx + deposit_request_id --');
  let p0 = seen.price.length;
  const e2 = await page.evaluate(async ([sol, bonk]) => {
    const s0 = window.__signs.length, p0 = window.__prov.send;
    const pr = await crVaultLimit.prepare({ inputMint: sol, outputMint: bonk, amountRaw: '1000000', side: 'buy', triggerPrice: '0.0001', slippageBps: 50 });
    const r = pr && pr.ok ? await crVaultLimit.commit(pr.handle) : { error: 'prepare:' + (pr && pr.error) };
    const mine = window.__signs.slice(s0);
    return { prReq: pr && pr.depositRequestId, hReq: pr && pr.handle && pr.handle.depositRequestId, r,
             sends: mine.filter(x => x.mode === 'send').length + (window.__prov.send - p0),
             signs: mine.filter(x => x.mode === 'sign').length };
  }, [SOL, BONK]);
  const e2b = lastPrice();
  check('prepare nimmt request_id aus dem Craft-Echo in handle.depositRequestId', e2.prReq === 'REQ921' && e2.hReq === 'REQ921', e2);
  check('commit ok: genau 1 signTransaction, 0 Sends', e2.r && e2.r.ok && e2.signs === 1 && e2.sends === 0, e2);
  check('genau EIN orders/price-Request', seen.price.length === p0 + 1, seen.price.length - p0);
  check('orders/price-Body: deposit_signed_tx === base64 der signierten Bytes', e2b && e2b.deposit_signed_tx === SIGNED_B64, e2b);
  check('orders/price-Body: deposit_request_id === request_id aus dem Craft-Echo', e2b && e2b.deposit_request_id === 'REQ921', e2b);
  check('orders/price-Body: KEIN deposit_sig mehr', e2b && !('deposit_sig' in e2b), e2b && Object.keys(e2b));
  check('orders/price-Body: Mints/Seite/Trigger wie der Deposit',
    e2b && e2b.input_mint === SOL && e2b.output_mint === BONK && e2b.side === 'buy' && e2b.trigger_price === '0.0001' && e2b.making_amount === '1000000', e2b);
  check('commit reicht { id, txSignature, depositConfirmed } durch (+ orderPubkey = id, sig = txSignature)',
    e2.r && e2.r.id === 'ORDER921' && e2.r.txSignature === 'TXSIG921' && e2.r.depositConfirmed === true
      && e2.r.orderPubkey === 'ORDER921' && e2.r.sig === 'TXSIG921' && e2.r.confirmed === true, e2.r);

  console.log('\n-- E2b: ohne request_id KEIN Signieren, KEIN Request --');
  cfg.requestId = '';
  p0 = seen.price.length;
  const e2n = await page.evaluate(async ([sol, bonk]) => {
    const s0 = window.__signs.length, p0 = window.__prov.send;
    const pr = await crVaultLimit.prepare({ inputMint: sol, outputMint: bonk, amountRaw: '1000000', side: 'buy', triggerPrice: '0.0001', slippageBps: 50 });
    const h = { addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, feeRaw: null, depositRaw: '1000000',
                opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } };
    const c = await crVaultLimit.commit(h);                                   // Handle OHNE depositRequestId
    const api = await crVaultApi.ordersPrice({ inputMint: sol, outputMint: bonk, depositSignedTx: 'AQ==' });   // ohne request_id
    const api2 = await crVaultApi.ordersPrice({ inputMint: sol, outputMint: bonk, depositRequestId: 'R' });    // ohne signierte Tx
    return { prErr: pr && pr.error, prHandle: !!(pr && pr.handle), cErr: c && c.error, apiErr: api && api.error, api2Err: api2 && api2.error,
             signs: window.__signs.slice(s0).length, sends: window.__prov.send - p0 };
  }, [SOL, BONK]);
  cfg.requestId = 'REQ921';
  check('Craft-Echo ohne request_id → prepare: deposit-request-id-missing, kein Handle', e2n.prErr === 'deposit-request-id-missing' && !e2n.prHandle, e2n);
  check('Handle ohne depositRequestId → commit: deposit-request-id-missing', e2n.cErr === 'deposit-request-id-missing', e2n);
  check('… KEINE Wallet-Anfrage (0 signTransaction, 0 Sends)', e2n.signs === 0 && e2n.sends === 0, e2n);
  check('crVaultApi.ordersPrice ohne request_id / ohne signierte Tx → benannter Fehler, KEIN Request',
    e2n.apiErr === 'deposit-request-id-missing' && e2n.api2Err === 'deposit-signed-tx-missing' && seen.price.length === p0, { e2n, req: seen.price.length - p0 });

  /* ===================== Panel-Helfer (die Handy-Strecke) ===================== */
  await page.evaluate(() => {
    window.__toasts = [];
    const _orig = window.toast;
    window.toast = function(m){ try { window.__toasts.push(String(m)); } catch(_){} return _orig ? _orig(m) : undefined; };
    window.__mkPanel = function(){
      const host = document.createElement('div'); document.body.appendChild(host);
      const overlay = { kind:'hline', id: Math.floor(Math.random()*1e6), py:100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const sels = section.querySelectorAll('select');
      const route = sels[0];
      const armed = section.querySelector('input[type=checkbox]');
      const size = Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox');
      const msgOf = () => { const m = section.querySelector('[data-cr-panel-msg]'); return m ? m.textContent : ''; };
      return { host, section, route, armed, size, msgOf,
               setRoute(v){ route.value = v; route.dispatchEvent(new Event('change')); },
               setPrice(p){ let inp = null;
                 section.querySelectorAll('label').forEach(l => { const s=l.querySelector('span'); if(s && /^price$/i.test((s.textContent||'').trim())) inp = l.querySelector('input'); });
                 if(inp){ inp.value = p; inp.dispatchEvent(new Event('input')); return true; }
                 return false; },
               arm(){ let b = null; section.querySelectorAll('button').forEach(x => { if(/arm/i.test(x.textContent||'')) b = x; }); if(b) b.click(); } };
    };
    /* Tor 3 (Badge) verlangt eine Referenz ≤ 120 s — bei langsamen/parallelen
     * Laeufen altert die Setup-Referenz darueber hinaus und die Weiche faellt
     * (korrekt) auf Paper. Vor jedem Weiche-Lauf frisch notieren. */
    window.__freshRef = function(){
      try { crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0); } catch(_){}
    };
    window.__runPanel = async function(){
      crVaultApi._pfReset(); window.__freshRef();
      const s0 = window.__signs.length, p0 = window.__prov.send, j0 = _crJrnLoad().manual.length;
      const P = window.__mkPanel();
      window.__toasts.length = 0;
      P.setRoute('limit'); P.setPrice('0.0001');
      P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
      P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
      P.arm();
      await new Promise(r => setTimeout(r, 1300));
      const mine = window.__signs.slice(s0);
      const out = { msg: P.msgOf(), hud: (window.crLoud && crLoud.last().text) || '', toasts: window.__toasts.slice(),
                    lines: crVaultFlight.lines(), busy: crVaultFlight.busy(),
                    signs: mine.filter(x => x.mode === 'sign').length,
                    sends: mine.filter(x => x.mode === 'send').length + (window.__prov.send - p0),
                    journalGrew: _crJrnLoad().manual.length - j0 };
      P.host.remove();
      return out;
    };
  });

  /* ===================== E3 — Fehler ehrlich ===================== */
  console.log('\n-- E3a: Reject in der Wallet → „nichts bewegt" in Panel + HUD + Toast, kein Request, kein Journal --');
  p0 = seen.price.length;
  const e3a = await page.evaluate(async () => {
    window.__rejectSign = true;
    const direct = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ921',
      opts: { inputMint: 'So11111111111111111111111111111111111111112', outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const panel = await window.__runPanel();
    window.__rejectSign = false;
    return { direct, panel, weicheMsg: crPanelLive._msgForLimitError({ error: 'rejected' }) };
  });
  const NOT_MOVED = /Einzahlung nicht signiert — nichts bewegt\./;
  check('commit direkt: { error:"rejected" }', e3a.direct && e3a.direct.error === 'rejected', e3a.direct);
  check('Panel-Meldung: „Einzahlung nicht signiert — nichts bewegt."', NOT_MOVED.test(e3a.panel.msg), e3a.panel.msg);
  check('HUD (crLoud) traegt denselben Text', NOT_MOVED.test(e3a.panel.hud), e3a.panel.hud);
  check('Toast traegt denselben Text; NIRGENDS „Live swap failed" / „Live limit failed"',
    e3a.panel.toasts.some(t => NOT_MOVED.test(t)) && !e3a.panel.toasts.some(t => /Live (swap|limit) failed/.test(t)), e3a.panel.toasts);
  check('Reject: KEIN orders/price-Request, KEIN Journal-Eintrag, 0 Sends, busy zurueckgesetzt',
    seen.price.length === p0 && e3a.panel.journalGrew === 0 && e3a.panel.sends === 0 && e3a.panel.busy === false, { req: seen.price.length - p0, panel: e3a.panel });
  check('Spur: depositSign … rejected', e3a.panel.lines.some(l => /^depositSign .*rejected/.test(l)), e3a.panel.lines);

  console.log('\n-- E3b: Wallet-Fehler → sign-failed + detail in Panel, HUD und Spur --');
  const DETAIL = 'Simulation failed: custom program error 0x1771';
  p0 = seen.price.length;
  const e3b = await page.evaluate(async ([d]) => {
    window.__failSign = d;
    const direct = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ921',
      opts: { inputMint: 'So11111111111111111111111111111111111111112', outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const panel = await window.__runPanel();
    window.__failSign = '';
    return { direct, panel };
  }, [DETAIL]);
  check('commit direkt: { error:"sign-failed", detail }', e3b.direct && e3b.direct.error === 'sign-failed' && e3b.direct.detail === DETAIL, e3b.direct);
  check('Panel-Meldung: „Wallet konnte nicht signieren: <detail>"', new RegExp('Wallet konnte nicht signieren: ' + DETAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(e3b.panel.msg), e3b.panel.msg);
  check('HUD traegt das detail', e3b.panel.hud.indexOf(DETAIL) >= 0, e3b.panel.hud);
  check('Diagnose-Spur: depositSign … sign-failed: <detail>', e3b.panel.lines.some(l => /^depositSign .*sign-failed: Simulation failed/.test(l)), e3b.panel.lines);
  check('sign-failed: KEIN orders/price-Request, KEIN Journal, 0 Sends, kein „Live swap failed"',
    seen.price.length === p0 && e3b.panel.journalGrew === 0 && e3b.panel.sends === 0 && !e3b.panel.toasts.some(t => /Live (swap|limit) failed/.test(t)), { req: seen.price.length - p0, panel: e3b.panel });
  const e3w = await page.evaluate(async () => {
    /* Die Weiche selbst (sdk.limit → _fireLive) meldet im Limit-Pfad „Ruhende Order: …" */
    window.__toasts.length = 0; window.__freshRef();
    const r = await sdk.limit({ side: 'buy', price: 0.0001, size: 1, source: { armed: true, amountRaw: '1000000',
      inputMint: 'So11111111111111111111111111111111111111112', outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', triggerPrice: '0.0001',
      vaultHandle: { addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, /* KEIN depositRequestId */
        opts: { inputMint: 'So11111111111111111111111111111111111111112', outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side: 'buy', amountRaw: '1000000' } } } });
    return { err: r && r.error, toasts: window.__toasts.slice() };
  });
  check('Weiche (Limit): „ARM · Ruhende Order: deposit-request-id-missing", nie „Live swap failed"',
    e3w.err === 'deposit-request-id-missing' && e3w.toasts.some(t => /ARM · Ruhende Order: deposit-request-id-missing/.test(t)) && !e3w.toasts.some(t => /Live (swap|limit) failed/.test(t)), e3w);

  /* ===================== E4 — Journal + T-Sync ===================== */
  console.log('\n-- E4: Erfolg → Journal mit txSignature/depositConfirmed, T-Sync zeigt LIVE · LIMIT --');
  p0 = seen.price.length;
  const e4 = await page.evaluate(async () => {
    const panel = await window.__runPanel();
    const rows = _crLiveJournalRows();
    const row = rows[0];
    const pos = _crLivePositions();
    const tx = _crLiveTxHTML();
    const tok = crVaultApi.token();
    return { panel, row, tokenLeak: !!(tok && JSON.stringify(row || null).indexOf(tok) >= 0),
             posLimit: pos.filter(p => p.kind === 'limit' && p.side === 'BUY').length, txHasLimit: /LIMIT/.test(tx), txHasSig: tx.indexOf('TXSIG921') >= 0,
             lim: crWeiche.sessionLamports() };
  });
  check('Panel: „RUHENDE ORDER liegt · ORDER921 · Einzahlung bestätigt · … · tx TXSIG921", 1 Signatur, 0 Sends',
    /RUHENDE ORDER liegt · ORDER921/.test(e4.panel.msg) && /Einzahlung bestätigt/.test(e4.panel.msg) && /tx TXSIG921/.test(e4.panel.msg)
      && e4.panel.signs === 1 && e4.panel.sends === 0, e4.panel);
  check('Spur: commit → depositSign ok → ordersPrice ok → ordersActive ok',
    ['depositSign', 'ordersPrice', 'ordersActive'].every(n => e4.panel.lines.some(l => new RegExp('^' + n + ' \\d+ ms · ok').test(l))), e4.panel.lines);
  check('Journal-Zeile: source live, kind limit, txSignature TXSIG921, sig = txSignature, depositConfirmed true, result open',
    e4.row && e4.row.source === 'live' && e4.row.kind === 'limit' && e4.row.txSignature === 'TXSIG921' && e4.row.sig === 'TXSIG921'
      && e4.row.depositConfirmed === true && e4.row.result === 'open' && e4.row.orderPubkey === 'ORDER921' && e4.panel.journalGrew === 1, e4.row);
  check('Journal-Zeile traegt NIE den JWT', e4.tokenLeak === false, e4);
  check('T-Sync: OFFENE POSITIONEN fuehrt die LIMIT-BUY-Zeile; RECENT TX zeigt LIMIT + Solscan TXSIG921',
    e4.posLimit >= 1 && e4.txHasLimit && e4.txHasSig, e4);
  check('Session-Limit zaehlt den Deposit (0,05 SOL = 50 000 000 Lamports) wie bisher', e4.lim >= 50000000, e4.lim);

  console.log('\n-- E4b: depositConfirmed:false + orders/active leer → pending, nicht offen --');
  cfg.depositConfirmed = false; cfg.activeHasOrder = false;
  const e4b = await page.evaluate(async () => {
    const n0 = _crLivePositions().length;
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ921',
      opts: { inputMint: 'So11111111111111111111111111111111111111112', outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const row = _crLiveJournalRows()[0];
    return { r, row, dPos: _crLivePositions().length - n0 };
  });
  cfg.depositConfirmed = true; cfg.activeHasOrder = true;
  check('commit ok, depositConfirmed false, confirmed false', e4b.r && e4b.r.ok && e4b.r.depositConfirmed === false && e4b.r.confirmed === false, e4b.r);
  check('Journal: result pending, depositConfirmed false; NICHT in den offenen Positionen',
    e4b.row && e4b.row.result === 'pending' && e4b.row.depositConfirmed === false && e4b.dPos === 0, e4b);

  /* ===================== E5 — Market unveraendert ===================== */
  console.log('\n-- E5: Market-Pfad Bit fuer Bit: signAndSend, quote vor swap, 0 signTransaction --');
  seen.quote.length = 0; seen.swap.length = 0;
  const e5 = await page.evaluate(async () => {
    window.__freshRef();
    const s0 = window.__signs.length;
    const res = await sdk.market({ side:'buy', size:1, price:100, source:{ armed:true, amountRaw:'50000000' } });
    const mine = window.__signs.slice(s0);
    return { res, sends: mine.filter(x => x.mode === 'send').length, signs: mine.filter(x => x.mode === 'sign').length };
  });
  check('Market: genau 1 signAndSendTransaction, 0 signTransaction', e5.sends === 1 && e5.signs === 0, e5);
  check('Market: /v1/quote VOR /v1/tx/swap, Ergebnis traegt sig + Mengen',
    seen.quote.length === 1 && seen.swap.length === 1 && seen.quote[0] <= seen.swap[0]
      && !!(e5.res && e5.res.sig && e5.res.inAmount === '50000000' && e5.res.outAmount === '142371209424'), { q: seen.quote, s: seen.swap, res: e5.res });

  console.log('\n== v921 Patch E · Teil B: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
