/* Smoke-Verifikation v1.0.923 — Patch G · Teil B (CLIENT): Abgleich gegen
 * Jupiter, Bergung der offenen Order, TIF-Label, Backpack-Hinweis.
 *
 * Befund (Handy, 07.09. 19:48, Backpack): Backpack signiert ohne Lighthouse-
 * Guard → der V2-Fluss lief durch, Jupiter legte die Order an (SOL→JTO
 * 0,120 SOL, Limit <0,432, 30 d, 0,5 %). Der Worker (v1.25) hielt die Antwort
 * zurueck → Client: trigger-fee-echo-fehlt, kein Journal, Terminal leer. Der
 * Client konnte den Zustand bei Jupiter nicht sehen.
 *
 * Geprueft wird, was die Seite VERLAESST (Spion im page.route-Handler), was
 * die Wallet GEFRAGT wird und was der Nutzer SIEHT (Panel, HUD, CC, Terminal,
 * Journal). Jede Gegenprobe MUSS ROT koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   G2  Laden: Wallet verbunden, KEIN JWT → kein orders/active-, kein
 *       orders/history-Aufruf; Hinweis „Ruhende Orders: Abgleich wartet auf
 *       Wallet-Signatur" im CC und in Terminal → OFFENE POSITIONEN. Nach der
 *       ersten ensureAuth: GENAU EIN Abgleich (active + history je 1), die
 *       Fixture-Order (19:48) liegt mit reconciled:true im Journal und in
 *       den offenen Positionen; eine zweite (gecachte) Anmeldung und ein
 *       zweites onAuth loesen KEINEN zweiten Abgleich aus.
 *       (Mutation: in crOrderReconcile.onAuth sofort `return false` → rot.)
 *   G1  ordersPrice → Fehler (trigger-fee-echo-fehlt) → Abgleich: fremde
 *       Fixture-Order landet mit reconciled:true im Journal + Terminal;
 *       bekannte id wird NICHT dupliziert; Panel/HUD/Weiche nennen den Fund;
 *       Spur: reconcile als Kind von commit mit „N gefunden · M neu".
 *       Timeout (haengendes orders/price) → ebenfalls Abgleich.
 *       (Mutation: in commit `return _reconcileAfter(errRes)` durch
 *        `return errRes` ersetzen → rot; knownKeys() → {} → Dedup rot.)
 *   G3  Erfolg mit fee.bound_at:'craft' → Panel „Gebühr 0,5 % — bei der
 *       Einzahlung gebunden", Journal feeBoundAt, Gebuehren-Blatt; warnings[]
 *       als Hinweis, KEIN Abbruch; 'craft-cache-miss' → „Gebührenstand: siehe
 *       Einzahlung"; ok OHNE id → Abgleich per txSignature, EIN Eintrag.
 *       (Mutation: feeBoundOf gibt null → rot.)
 *   G4  TIF-Option GTC heisst „30 Tage (Jupiter)"; Guard-Text und Guide
 *       tragen den Backpack-Satz (v924: „… hängt keine Schutz-Instruktionen
 *       an"; der Halbsatz „mit dieser Wallet derzeit nicht möglich" ist weg).
 *   G5  Terminal-Knopf „Bei Jupiter nachsehen" → ensureAuth (1 signMessage,
 *       1 auth/challenge) → Abgleich → Journal; eigener Flight „reconcile";
 *       orders/history 404 → Abgleich laeuft mit active allein (not-deployed
 *       benannt); Order einer FREMDEN Wallet landet nie im Journal.
 *   G6  Market-Pfad unveraendert: 1 signAndSend, 0 signTransaction, quote vor
 *       swap; kein Abgleich am Market-Pfad.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v923_patchG_browser.cjs
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
const JTO  = 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL';
const SOL  = 'So11111111111111111111111111111111111111112';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const OTHER = 'OTHERwa11etAddre5522222222222222222222222222';
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-923';
const VAULT_PATHS = ['/v1/auth/challenge','/v1/auth/verify','/v1/vault/register',
  '/v1/deposit/craft','/v1/orders/price','/v1/orders/active','/v1/orders/history'];
const SIGNED_BYTES = [1, 2, 3, 4, 5, 0xAA];
const EXPIRY = new Date(Date.now() + 30 * 86400000).toISOString();

/* Die 19:48-Order, wie Jupiter sie fuehrt (Worker reicht sie durch). */
const ORDER_1948 = { orderKey: 'ORDER1948', userPubkey: ADDR, inputMint: SOL, outputMint: JTO, rawMakingAmount: '120000000',
                     rawTakingAmount: '277777777', status: 'Open', openTx: 'TXSIG1948', expiredAt: EXPIRY, createdAt: '2026-09-07T17:48:00.000Z' };
const HIST_OLD   = { id: 'ORDERHIST1', wallet: ADDR, input_mint: SOL, output_mint: BONK, making_amount: '50000000', status: 'Cancelled', tx_signature: 'TXHIST1' };

/* Fixture-Schalter, node-seitig zwischen den Schritten umstellbar. */
const cfg = { priceMode: 'ok', active: [ORDER_1948], history: [HIST_OLD], history404: false };

/* Spion: jeder Body/Aufruf, der einen Vault-Pfad erreicht. */
const seen = { challenge: [], price: [], active: [], history: [], swap: [], quote: [] };
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
      const eps = ['/v1/quote','/v1/tx/swap','/v1/tx/status','/v1/rpc/balance'].concat(VAULT_PATHS.filter(p => !(cfg.history404 && /history/.test(p))).map(p => 'POST ' + p));
      return J({ ok:true, version:'tx v1.26', signs:false, kill:false, endpoints: eps });
    }
    if(/\/v1\/auth\/challenge/.test(url)){ seen.challenge.push(Date.now()); return J({ ok:true, challenge:'CR-CHALLENGE-923-abc', expires_in_s:120 }); }
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok:true, registered:true });
    if(/\/v1\/deposit\/craft/.test(url)){
      const b = bodyOf(req);
      return J({ ok:true, transaction:'AQIDBAU=', expires_in_s:40, deposit:{ amount_raw:String(b.amount_raw) }, fee:{ bps:50 }, request_id:'REQ923' });
    }
    if(/\/v1\/orders\/price/.test(url)){
      const b = bodyOf(req); seen.price.push(b);
      if(!b || !b.deposit_signed_tx || !b.deposit_request_id)
        return J({ ok:false, error:'vault-contract-invalid', note:'orders/price braucht deposit_signed_tx und deposit_request_id' }, 400);
      if(cfg.priceMode === 'held')       // Worker v1.25: Jupiter hat die Order, der Worker haelt die Antwort zurueck
        return J({ ok:false, error:'trigger-fee-echo-fehlt', note:'fee echo missing in trigger response' }, 502);
      if(cfg.priceMode === 'hang'){ await new Promise(r => setTimeout(r, 2500)); return route.abort().catch(() => {}); }
      if(cfg.priceMode === 'ok-craft')
        return J({ ok:true, id:'ORDER923', txSignature:'TXSIG923', depositConfirmed:true, status:'Open', fee:{ bps:50, bound_at:'craft' },
                   warnings:['deposit confirmed after 2 retries'], expiredAt: EXPIRY });
      if(cfg.priceMode === 'ok-miss')
        return J({ ok:true, id:'ORDER923M', txSignature:'TXSIG923M', depositConfirmed:true, status:'Open', fee:{ bps:50, bound_at:'craft-cache-miss' } });
      if(cfg.priceMode === 'ok-noid')
        return J({ ok:true, txSignature:'TXSIGNOID', depositConfirmed:true, status:'Open', fee:{ bps:50 } });
      return J({ ok:true, id:'ORDER922', txSignature:'TXSIG922', depositConfirmed:true, status:'Open', fee:{ bps:50 } });
    }
    if(/\/v1\/orders\/active/.test(url)){ seen.active.push(url); return J({ ok:true, orders: cfg.active }); }
    if(/\/v1\/orders\/history/.test(url)){ seen.history.push(url); if(cfg.history404) return J({ error:'not found' }, 404); return J({ ok:true, orders: cfg.history }); }

    /* Market-Endpunkte (G6) */
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

  /* Wallet-Mock „M": signMessage (Auth), signAndSendTransaction (Market),
   * signTransaction (Deposit, nur signieren). Jeder Aufruf wird gezaehlt. */
  const initWallet = ([a, signedBytes]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = [];
    window.__msgs = [];
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
            window.__signs.push({ mode:'sign', chain: i && i.chain, bytes: i && i.transaction ? i.transaction.length : 0 });
            return [{ signedTransaction: new Uint8Array(signedBytes) }]; } } };
      const w = { name:'M', version:'1', icon:'', chains:['solana:mainnet'], get accounts(){ return [acct]; }, features: feats };
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
  check('Banner meldet mindestens v1.0.923',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 923)))), bv);
  const seam = await page.evaluate(() => ({
    rc: !!(window.crOrderReconcile && ['run','onAuth','onLoad','paneHTML','fromButton','normalize'].every(k => typeof crOrderReconcile[k] === 'function')),
    hist: !!(window.crVaultApi && typeof crVaultApi.ordersHistory === 'function' && crVaultApi.PATHS.ordersHistory === '/v1/orders/history'),
    fee: !!(window.crVaultLimit && typeof crVaultLimit.feeText === 'function' && typeof crVaultLimit.feeBoundOf === 'function'),
    btn: !!document.querySelector('#crTermReconcileBtn[data-cr-reconcile-btn]'),
    btnTxt: (document.getElementById('crTermReconcileBtn') || {}).textContent || '' }));
  check('Naehte: crOrderReconcile, crVaultApi.ordersHistory (/v1/orders/history), crVaultLimit.feeText, Terminal-Knopf „Bei Jupiter nachsehen"',
    seam.rc && seam.hist && seam.fee && seam.btn && /Bei Jupiter nachsehen/.test(seam.btnTxt), seam);

  /* ===================== G2 — Laden ohne JWT: Hinweis, kein Aufruf ===================== */
  console.log('\n-- G2: Laden mit Wallet, OHNE JWT → kein Abgleich, Hinweis im CC + Terminal --');
  const g2a = await page.evaluate(async () => {
    const wallet = crSigner.active() && crSigner.active().address;
    const tok = crVaultApi.token();
    const onLoad = crOrderReconcile.onLoad();
    const cc = Array.from(document.querySelectorAll('.crNotifyMsg')).map(e => e.textContent);
    try { osOpenWindow('terminal'); } catch(_){}
    await new Promise(r => setTimeout(r, 700));
    const host = document.getElementById('crTermOpenList');
    const line = host ? host.querySelector('[data-cr-reconcile-line]') : null;
    return { wallet, tok, onLoad, cc, calls: crOrderReconcile.calls(), line: line ? line.textContent : null, pane: crOrderReconcile.paneLine() };
  });
  check('Wallet verbunden, kein JWT, onLoad → „hint"; KEIN orders/active-, KEIN orders/history-Aufruf, 0 Signaturen',
    g2a.wallet === ADDR && g2a.tok === null && g2a.onLoad === 'hint' && seen.active.length === 0 && seen.history.length === 0 && g2a.calls === 0, g2a);
  check('Hinweis „Ruhende Orders: Abgleich wartet auf Wallet-Signatur" im CC (crNotify) und in Terminal → OFFENE POSITIONEN',
    g2a.cc.some(t => /Ruhende Orders: Abgleich wartet auf Wallet-Signatur/.test(t)) && /Ruhende Orders: Abgleich wartet auf Wallet-Signatur/.test(g2a.line || '')
      && g2a.pane.text === 'Ruhende Orders: Abgleich wartet auf Wallet-Signatur', { cc: g2a.cc, line: g2a.line, pane: g2a.pane });

  console.log('\n-- Aufbau: Sol-Chart, Jupiter-Referenz, Wallet, globales ARM, JWT (→ Lade-Abgleich GENAU EINMAL) --');
  const setup = await page.evaluate(async ([mint, jto]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    const m = crStoreMint(currentAssetObj());
    crTrustBadge.note(m, { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window._crMintMeta = window._crMintMeta || {};
    window._crMintMeta[mint] = { symbol:'BONK', decimals:5 };
    window._crMintMeta[jto]  = { symbol:'JTO', decimals:9 };
    try { sessionStorage.removeItem('cr_wallet_guard_v1'); } catch(_){}
    crVaultApi._pfReset(); crVaultApi.clear();
    const j0 = _crJrnLoad().manual.length;
    const au = await crVaultApi.ensureAuth(crSigner.active().address, msg => crSigner.signMessage(msg));
    await new Promise(r => setTimeout(r, 600));
    const rows = _crLiveJournalRows();
    const row = rows.find(r => r.vaultOrderId === 'ORDER1948');
    const hist = rows.find(r => r.vaultOrderId === 'ORDERHIST1');
    const pos = _crLivePositions().filter(p => p.vaultOrderId === 'ORDER1948');
    const au2 = await crVaultApi.ensureAuth(crSigner.active().address, msg => crSigner.signMessage(msg));
    const again = crOrderReconcile.onAuth(crSigner.active().address);
    await new Promise(r => setTimeout(r, 300));
    return { mint:m, ready: !!(crSigner.info() && crSigner.info().ready), badge: crWeiche.badgeGate(),
             auth: !!(au && !au.error), tok: crVaultApi.token(), wname: crSigner.active().wallet,
             grew: _crJrnLoad().manual.length - j0, row, hist, pos, calls: crOrderReconcile.calls(), last: crOrderReconcile.last(),
             cached: !!(au2 && au2.cached), again, done: crOrderReconcile.done(), msgs: window.__msgs.length,
             cc: Array.from(document.querySelectorAll('.crNotifyMsg')).map(e => e.textContent) };
  }, [BONK, JTO]);
  check('Sol-Asset aktiv, badgeGate offen, Wallet „M" signierfaehig, JWT im Speicher',
    setup.mint === BONK && setup.badge && setup.badge.ok === true && setup.ready === true && setup.auth && setup.tok === JWT && setup.wname === 'M', setup);
  check('Nach der ersten Anmeldung: GENAU EIN Abgleich (orders/active 1, orders/history 1, calls 1), done',
    seen.active.length === 1 && seen.history.length === 1 && setup.calls === 1 && setup.done === true, { a: seen.active.length, h: seen.history.length, calls: setup.calls, done: setup.done });
  check('Journal +2: die 19:48-Order (reconciled, open, 0,12 SOL, JTO, Ablauf) und die Verlaufs-Order (cancelled); JWT nirgends',
    setup.grew === 2 && setup.row && setup.row.reconciled === true && setup.row.result === 'open' && setup.row.status === 'open' && setup.row.kind === 'limit' && setup.row.source === 'live'
      && setup.row.amountInRaw === '120000000' && setup.row.asset === 'JTO' && setup.row.txSignature === 'TXSIG1948' && setup.row.sig === 'TXSIG1948' && setup.row.expiresAt > Date.now()
      && /Ablauf/.test(setup.row.notes) && setup.hist && setup.hist.reconciled === true && setup.hist.result === 'cancelled'
      && JSON.stringify([setup.row, setup.hist]).indexOf(JWT) < 0, { row: setup.row, hist: setup.hist, grew: setup.grew });
  check('OFFENE POSITIONEN fuehrt die 19:48-Order (LIM BUY, 0,120 SOL, id, Ablauf)',
    setup.pos.length === 1 && setup.pos[0].kind === 'limit' && setup.pos[0].side === 'BUY' && Math.abs(setup.pos[0].sol - 0.12) < 1e-9 && setup.pos[0].expiresAt > Date.now() && setup.pos[0].reconciled === true, setup.pos);
  check('Zweite (gecachte) Anmeldung + zweites onAuth → KEIN zweiter Abgleich; genau 1 signMessage',
    setup.cached === true && setup.again === false && seen.active.length === 1 && seen.history.length === 1 && setup.calls === 1 && setup.msgs === 1, { cached: setup.cached, again: setup.again, a: seen.active.length, calls: setup.calls, msgs: setup.msgs });
  check('CC nennt den Fund: „Order bei Jupiter gefunden und ins Journal übernommen (id ORDER1948)"',
    setup.cc.some(t => /Order bei Jupiter gefunden und ins Journal übernommen \(id ORDER1948\)/.test(t)) && setup.last && setup.last.ok && setup.last.added === 2 && setup.last.source === 'load', { cc: setup.cc, last: setup.last });
  const g2t = await page.evaluate(async () => {
    try { osOpenWindow('terminal'); } catch(_){}
    await new Promise(r => setTimeout(r, 600));
    const host = document.getElementById('crTermOpenList');
    const line = host ? host.querySelector('[data-cr-reconcile-line]') : null;
    const row = host ? host.querySelector('.crTerm-tblRow[data-cr-order-id="ORDER1948"][data-cr-reconciled="1"]') : null;
    return { line: line ? line.textContent : null, row: row ? row.textContent : null };
  });
  check('Terminal: Statuszeile nennt den Fund; LIM-Zeile ORDER1948 traegt id + „bis <Datum>" + 0.120◎',
    /Order bei Jupiter gefunden/.test(g2t.line || '') && g2t.row && /LIM B/.test(g2t.row) && /0\.120◎/.test(g2t.row) && /bis \d/.test(g2t.row) && /ORDER1948/.test(g2t.row), g2t);

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
      const diagOf = () => {
        const list = section.querySelector('[data-cr-panel-diag-list]');
        if(!list) return { rows: [], notes: [] };
        return { rows: Array.from(list.children).filter(d => !d.hasAttribute('data-cr-diag-note')).map(d => ({ depth: d.getAttribute('data-cr-diag-depth'), text: d.textContent })),
                 notes: Array.from(list.querySelectorAll('[data-cr-diag-note]')).map(d => ({ label: d.getAttribute('data-cr-diag-note'), text: d.textContent })) };
      };
      const guideOf = () => {
        const g = section.querySelector('[data-cr-panel-guide]');
        if(!g) return null;
        const p1 = g.querySelector('[data-cr-guide-guard]'), p2 = g.querySelector('[data-cr-guide-fee]');
        return { display: g.style.display, path: g.getAttribute('data-cr-guide-path'), guard: p1 ? p1.textContent : '', fee: p2 ? p2.textContent : '' };
      };
      const tifOf = () => {
        let out = null;
        section.querySelectorAll('label').forEach(l => { const s = l.querySelector('span'); if(s && /^tif$/i.test((s.textContent||'').trim())){ const sel = l.querySelector('select'); if(sel) out = Array.from(sel.options).map(o => ({ v: o.value, l: o.textContent })); } });
        return out;
      };
      return { host, section, route, armed, size, msgOf, diagOf, guideOf, tifOf,
               setRoute(v){ route.value = v; route.dispatchEvent(new Event('change')); },
               setPrice(p){ let inp = null;
                 section.querySelectorAll('label').forEach(l => { const s=l.querySelector('span'); if(s && /^price$/i.test((s.textContent||'').trim())) inp = l.querySelector('input'); });
                 if(inp){ inp.value = p; inp.dispatchEvent(new Event('input')); return true; }
                 return false; },
               arm(){ let b = null; section.querySelectorAll('button').forEach(x => { if(/arm/i.test(x.textContent||'')) b = x; }); if(b) b.click(); } };
    };
    window.__freshRef = function(){
      try { crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0); } catch(_){}
    };
    window.__runPanel = async function(waitMs){
      crVaultApi._pfReset(); window.__freshRef();
      const s0 = window.__signs.length, m0 = window.__msgs.length, j0 = _crJrnLoad().manual.length;
      const P = window.__mkPanel();
      window.__toasts.length = 0;
      P.setRoute('limit'); P.setPrice('0.0001');
      P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
      P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
      P.arm();
      await new Promise(r => setTimeout(r, waitMs || 1500));
      const mine = window.__signs.slice(s0);
      const out = { msg: P.msgOf(), hud: (window.crLoud && crLoud.last().text) || '', toasts: window.__toasts.slice(),
                    lines: crVaultFlight.lines(), tree: crVaultFlight.linesTree(), state: crVaultFlight.state(), busy: crVaultFlight.busy(),
                    diag: P.diagOf(), guide: P.guideOf(),
                    signs: mine.filter(x => x.mode === 'sign').length,
                    sends: mine.filter(x => x.mode === 'send').length,
                    msgs: window.__msgs.length - m0,
                    journalGrew: _crJrnLoad().manual.length - j0 };
      P.host.remove();
      return out;
    };
  });

  /* ===================== G1 — ordersPrice-Fehler → Abgleich ===================== */
  console.log('\n-- G1: orders/price → trigger-fee-echo-fehlt → Abgleich: fremde Order ins Journal, bekannte nicht doppelt --');
  cfg.priceMode = 'held';
  cfg.active = [ORDER_1948, { id:'ORDER1949', wallet: ADDR, inputMint: SOL, outputMint: BONK, makingAmount: '30000000', status: 'Open', txSignature: 'TXSIG1949', expiredAt: EXPIRY }];
  let a0 = seen.active.length, h0 = seen.history.length, p0 = seen.price.length;
  const g1 = await page.evaluate(async ([sol, bonk]) => {
    const j0 = _crJrnLoad().manual.length;
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ923',
      opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const rows = _crLiveJournalRows();
    return { r, grew: _crJrnLoad().manual.length - j0,
             n1948: rows.filter(x => x.vaultOrderId === 'ORDER1948').length, r1949: rows.find(x => x.vaultOrderId === 'ORDER1949'),
             weiche: crPanelLive._msgForLimitError(r), calls: crOrderReconcile.calls() };
  }, [SOL, BONK]);
  check('commit: Fehlercode bleibt trigger-fee-echo-fehlt; res.reconcile ok, 3 gefunden (2 active + 1 Verlauf), 1 neu; orders/active + orders/history je 1 (nach dem einen orders/price)',
    g1.r && g1.r.error === 'trigger-fee-echo-fehlt' && g1.r.reconcile && g1.r.reconcile.ok && g1.r.reconcile.found.length === 3 && g1.r.reconcile.added.length === 1
      && seen.active.length === a0 + 1 && seen.history.length === h0 + 1 && seen.price.length === p0 + 1, { r: g1.r, a: seen.active.length - a0, h: seen.history.length - h0 });
  check('Journal +1: ORDER1949 mit reconciled:true, open; ORDER1948 bleibt GENAU EINMAL (keine Dublette)',
    g1.grew === 1 && g1.r1949 && g1.r1949.reconciled === true && g1.r1949.result === 'open' && g1.r1949.amountInRaw === '30000000' && g1.n1948 === 1, { grew: g1.grew, n1948: g1.n1948, r1949: g1.r1949 });
  check('_msgForLimitError: Fehler + „Order bei Jupiter gefunden und ins Journal übernommen (id ORDER1949)"',
    /Ruhende Order: trigger-fee-echo-fehlt/.test(g1.weiche) && /Order bei Jupiter gefunden und ins Journal übernommen \(id ORDER1949\)/.test(g1.weiche), g1.weiche);

  cfg.active = [ORDER_1948, { id:'ORDER1949', wallet: ADDR, inputMint: SOL, outputMint: BONK, makingAmount: '30000000', status: 'Open', txSignature: 'TXSIG1949' },
                { orderKey:'ORDER1950', userPubkey: ADDR, inputMint: SOL, outputMint: BONK, rawMakingAmount: '50000000', status: 'Open', openTx: 'TXSIG1950', expiredAt: EXPIRY }];
  a0 = seen.active.length;
  const g1p = await page.evaluate(async () => {
    const panel = await window.__runPanel();
    const P = window.__mkPanel(); await new Promise(r => setTimeout(r, 50)); const diag = P.diagOf(); P.host.remove();
    try { osOpenWindow('terminal'); } catch(_){}
    await new Promise(r => setTimeout(r, 600));
    const host = document.getElementById('crTermOpenList');
    const row = host ? host.querySelector('.crTerm-tblRow[data-cr-order-id="ORDER1950"][data-cr-reconciled="1"]') : null;
    const tr = panel.state.trace;
    return { panel, diag, row: row ? row.textContent : null, rc: tr.find(x => x.name === 'reconcile'), cm: tr.find(x => x.name === 'commit'),
             cc: Array.from(document.querySelectorAll('.crNotifyMsg')).map(e => e.textContent) };
  });
  check('Panel: „Ruhende Order: trigger-fee-echo-fehlt …" + Fund (id ORDER1950); HUD + Toast tragen den Fund; Journal +1; 1 Signatur, 0 Sends',
    /Ruhende Order: trigger-fee-echo-fehlt/.test(g1p.panel.msg) && /Order bei Jupiter gefunden und ins Journal übernommen \(id ORDER1950\)/.test(g1p.panel.msg)
      && /id ORDER1950/.test(g1p.panel.hud) && g1p.panel.toasts.some(t => /id ORDER1950/.test(t))
      && g1p.panel.journalGrew === 1 && g1p.panel.signs === 1 && g1p.panel.sends === 0 && g1p.panel.busy === false, g1p.panel);
  check('Spur: reconcile als Kind von commit (depth 1), „ok · 4 gefunden · 1 neu"; commit endet trigger-fee-echo-fehlt',
    g1p.rc && g1p.rc.depth === 1 && g1p.rc.parent === 'commit' && /^ok · 4 gefunden · 1 neu$/.test(g1p.rc.result) && g1p.cm && g1p.cm.result === 'trigger-fee-echo-fehlt'
      && g1p.panel.lines.some(l => /^reconcile \d+ ms · ok · 4 gefunden · 1 neu$/.test(l)), { rc: g1p.rc, cm: g1p.cm, lines: g1p.panel.lines });
  check('Diagnose-Block: reconcile eingerueckt („↳") unter commit', g1p.diag.rows.some(r => r.depth === '1' && /^↳ reconcile /.test(r.text)), g1p.diag.rows);
  check('Terminal OFFENE POSITIONEN: ORDER1950 als LIM B 0.050◎, reconciled; CC nennt den Fund',
    g1p.row && /LIM B/.test(g1p.row) && /0\.050◎/.test(g1p.row) && g1p.cc.some(t => /id ORDER1950/.test(t)), { row: g1p.row });
  const g1d = await page.evaluate(async () => {
    const j0 = _crJrnLoad().manual.length;
    const panel = await window.__runPanel();
    return { grew: _crJrnLoad().manual.length - j0, msg: panel.msg, rc: panel.state.trace.find(x => x.name === 'reconcile') };
  });
  check('Wiederholung mit derselben Fixture: KEIN neuer Eintrag (4 bekannt), Text „keine offene Order … gefunden" bleibt ehrlich',
    g1d.grew === 0 && /Abgleich: keine offene Order bei Jupiter gefunden/.test(g1d.msg) && g1d.rc && /^ok · 4 gefunden · 0 neu$/.test(g1d.rc.result), g1d);

  console.log('\n-- G1b: orders/price haengt (Timeout) → ebenfalls Abgleich --');
  cfg.priceMode = 'hang';
  cfg.active = [ORDER_1948, { id:'ORDER1951', wallet: ADDR, inputMint: SOL, outputMint: BONK, makingAmount: '10000000', status: 'Open' }];
  h0 = seen.history.length;
  const g1b = await page.evaluate(async ([sol, bonk]) => {
    crVaultApi._setTimeouts({ post: 700 });
    const j0 = _crJrnLoad().manual.length;
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ923',
      opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    crVaultApi._setTimeouts({ post: 15000 });
    return { r, grew: _crJrnLoad().manual.length - j0 };
  }, [SOL, BONK]);
  check('Timeout: { error:"timeout" } + res.reconcile ok (ORDER1951 neu), orders/history +1, Journal +1',
    g1b.r && g1b.r.error === 'timeout' && g1b.r.reconcile && g1b.r.reconcile.ok && g1b.r.reconcile.added.length === 1 && g1b.r.reconcile.added[0].id === 'ORDER1951'
      && seen.history.length === h0 + 1 && g1b.grew === 1, { r: g1b.r, h: seen.history.length - h0, grew: g1b.grew });
  await page.waitForTimeout(2200);   // den haengenden Route-Handler auslaufen lassen
  cfg.active = [ORDER_1948]; cfg.priceMode = 'ok';

  /* ===================== G3 — Erfolg: fee.bound_at, warnings, expiry, ohne id ===================== */
  console.log('\n-- G3: Erfolg mit fee.bound_at:craft + warnings[] → Fee-Text, Hinweiszeile, KEIN Abbruch --');
  cfg.priceMode = 'ok-craft';
  h0 = seen.history.length;
  const g3 = await page.evaluate(async () => {
    const panel = await window.__runPanel();
    const row = _crLiveJournalRows().find(r => r.vaultOrderId === 'ORDER923');
    const P = window.__mkPanel(); P.setRoute('limit'); await new Promise(r => setTimeout(r, 50)); const guide = P.guideOf(); const diag = P.diagOf(); P.host.remove();
    return { panel, row, guide, diag, lastFee: crVaultLimit.lastFee(), feeTxt: crVaultLimit.feeText({ feeBps: 50, feeBoundAt: 'craft' }),
             cc: Array.from(document.querySelectorAll('.crNotifyMsg')).map(e => e.textContent) };
  });
  check('Panel (v924): „RUHENDE ORDER liegt · ORDER923 … Keine ChartRunner-Gebühr (Jupiter V2 …) · Ablauf … · Hinweis: deposit confirmed after 2 retries"',
    /RUHENDE ORDER liegt · ORDER923/.test(g3.panel.msg) && /Keine ChartRunner-Gebühr \(Jupiter V2 unterstützt derzeit keine Integrator-Gebühr\)/.test(g3.panel.msg) && /Ablauf \d/.test(g3.panel.msg)
      && /Hinweis: deposit confirmed after 2 retries/.test(g3.panel.msg) && g3.panel.journalGrew === 1 && g3.panel.signs === 1 && g3.panel.sends === 0, g3.panel.msg);
  check('warnings[] blockieren nicht: Ergebnis ok, Spur commit ok, Notiz „warnings" im Diagnose-Block, CC-Hinweis',
    g3.panel.state.ok === true && g3.panel.lines.some(l => /^commit \d+ ms · ok$/.test(l)) && g3.diag.notes.some(n => n.label === 'warnings' && /2 retries/.test(n.text))
      && g3.cc.some(t => /Ruhende Order · Hinweis: deposit confirmed after 2 retries/.test(t)), { notes: g3.diag.notes, lines: g3.panel.lines });
  check('Journal: feeBoundAt craft, feeBps 50, expiresAt, warnings, notes mit Fee-Text + Ablauf; txSignature TXSIG923',
    g3.row && g3.row.feeBoundAt === 'craft' && g3.row.feeBps === 50 && g3.row.expiresAt > Date.now() && Array.isArray(g3.row.warnings) && g3.row.warnings.length === 1
      && /Keine ChartRunner-Gebühr \(Jupiter V2/.test(g3.row.notes) && /Ablauf \d/.test(g3.row.notes) && g3.row.txSignature === 'TXSIG923' && g3.row.reconciled !== true
      && g3.row.venue === 'jupiter-v2', g3.row);
  check('Gebuehren-Blatt (Guide, v924): ZWEI Zeilen — V1 „0,5 % bei Ausführung (Referral)" und V2 „Keine ChartRunner-Gebühr"; kein Abgleich bei sauberem {id} (orders/history unveraendert)',
    g3.guide && /On-Chain \(Trigger V1\): Gebühr 0,5 % bei Ausführung \(Referral\)/.test(g3.guide.fee)
      && /Vault \(Trigger V2\): Keine ChartRunner-Gebühr/.test(g3.guide.fee)
      && !/bei der Einzahlung gebunden/.test(g3.guide.fee)
      && g3.lastFee && g3.lastFee.feeBoundAt === 'craft' && seen.history.length === h0, { guide: g3.guide, h: seen.history.length - h0 });

  cfg.priceMode = 'ok-miss';
  const g3m = await page.evaluate(async () => {
    const panel = await window.__runPanel();
    const row = _crLiveJournalRows().find(r => r.vaultOrderId === 'ORDER923M');
    return { msg: panel.msg, ok: panel.state.ok, row, txt: crVaultLimit.feeText({ feeBps: 50, feeBoundAt: 'craft-cache-miss' }), grew: panel.journalGrew };
  });
  check('craft-cache-miss: kein Fehler — „RUHENDE ORDER liegt · ORDER923M …"; der Fee-Text ist ab v924 der V2-Satz (bound_at bleibt im Journal)',
    /RUHENDE ORDER liegt · ORDER923M/.test(g3m.msg) && /Keine ChartRunner-Gebühr \(Jupiter V2/.test(g3m.msg) && g3m.ok === true && g3m.row && g3m.row.feeBoundAt === 'craft-cache-miss'
      && g3m.txt === 'Keine ChartRunner-Gebühr (Jupiter V2 unterstützt derzeit keine Integrator-Gebühr)' && g3m.grew === 1, g3m);

  console.log('\n-- G3b: ok OHNE id → Abgleich per txSignature, EIN Journal-Eintrag --');
  cfg.priceMode = 'ok-noid';
  cfg.active = [ORDER_1948, { orderKey:'ORDERNOID', userPubkey: ADDR, inputMint: SOL, outputMint: BONK, rawMakingAmount: '50000000', status: 'Open', openTx: 'TXSIGNOID' }];
  h0 = seen.history.length;
  const g3n = await page.evaluate(async ([sol, bonk]) => {
    const j0 = _crJrnLoad().manual.length;
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ923',
      opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '50000000', triggerPrice: '0.0001' } });
    const rows = _crLiveJournalRows().filter(x => x.txSignature === 'TXSIGNOID');
    return { r, grew: _crJrnLoad().manual.length - j0, rows };
  }, [SOL, BONK]);
  check('ok ohne id: Abgleich lief (history +1), res.id = ORDERNOID aus dem Fund, GENAU EIN Journal-Eintrag (reconciled) fuer TXSIGNOID',
    g3n.r && g3n.r.ok && g3n.r.id === 'ORDERNOID' && g3n.r.reconcile && g3n.r.reconcile.ok && seen.history.length === h0 + 1
      && g3n.grew === 1 && g3n.rows.length === 1 && g3n.rows[0].reconciled === true, { r: g3n.r, grew: g3n.grew, rows: g3n.rows });
  cfg.active = [ORDER_1948]; cfg.priceMode = 'ok';

  /* ===================== G4 — TIF-Label + Backpack-Satz ===================== */
  console.log('\n-- G4: TIF „30 Tage (Jupiter)"; Backpack-Satz im Guard-Text und im Guide --');
  const g4 = await page.evaluate(async () => {
    const P = window.__mkPanel(); P.setRoute('limit'); await new Promise(r => setTimeout(r, 50));
    const tif = P.tifOf(); const guide = P.guideOf(); P.host.remove();
    return { tif, guide, txt: crWalletGuard.text(false), txtV1: crWalletGuard.text(true), err: crPanelLive._msgForLimitError({ error: 'wallet-guard' }) };
  });
  check('TIF-Select: Option Wert GTC mit Label „30 Tage (Jupiter)", IOC bleibt',
    Array.isArray(g4.tif) && g4.tif.some(o => o.v === 'GTC' && o.l === '30 Tage (Jupiter)') && g4.tif.some(o => o.v === 'IOC') && !g4.tif.some(o => o.l === 'GTC'), g4.tif);
  check('Guard-Text (V1 nicht live, v924): „Mit Backpack funktioniert es (hängt keine Schutz-Instruktionen an)."; KEIN „derzeit nicht möglich" mehr; V1-Variante ohne Backpack-Satz',
    /Mit Backpack funktioniert es \(hängt keine Schutz-Instruktionen an\)\./.test(g4.txt) && !/derzeit nicht möglich/.test(g4.txt)
      && /Mit Backpack funktioniert es/.test(g4.err) && !/Backpack/.test(g4.txtV1), { txt: g4.txt, err: g4.err });
  check('Setup-Guide-Absatz traegt denselben Satz', g4.guide && /Mit Backpack funktioniert es \(hängt keine Schutz-Instruktionen an\)/.test(g4.guide.guard), g4.guide);

  /* ===================== G5 — Knopf „Bei Jupiter nachsehen" ===================== */
  console.log('\n-- G5: Terminal-Knopf → ensureAuth (1 signMessage) → Abgleich → Journal; eigener Flight; history 404; fremde Wallet --');
  cfg.active = [ORDER_1948, { id:'ORDER1952', wallet: ADDR, inputMint: SOL, outputMint: BONK, makingAmount: '20000000', status: 'Open' },
                { id:'ORDERFOREIGN', wallet: OTHER, inputMint: SOL, outputMint: BONK, makingAmount: '99000000', status: 'Open' }];
  const c0 = seen.challenge.length; a0 = seen.active.length; h0 = seen.history.length;
  const g5 = await page.evaluate(async () => {
    crVaultApi.clear();
    const m0 = window.__msgs.length, s0 = window.__signs.length, j0 = _crJrnLoad().manual.length;
    try { osOpenWindow('terminal'); } catch(_){}
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('crTermReconcileBtn').click();
    await new Promise(r => setTimeout(r, 900));
    const rows = _crLiveJournalRows();
    const host = document.getElementById('crTermOpenList');
    const line = host ? host.querySelector('[data-cr-reconcile-line]') : null;
    return { msgs: window.__msgs.length - m0, signs: window.__signs.length - s0, grew: _crJrnLoad().manual.length - j0,
             r1952: rows.find(x => x.vaultOrderId === 'ORDER1952'), foreign: rows.find(x => x.vaultOrderId === 'ORDERFOREIGN'),
             state: crVaultFlight.state(), busy: crVaultFlight.busy(), hud: crLoud.last().text, line: line ? line.textContent : null, tok: !!crVaultApi.token(), last: crOrderReconcile.last() };
  });
  check('Knopf: 1 signMessage, 1 auth/challenge, 0 signTransaction; active + history je 1; JWT danach im Speicher',
    g5.msgs === 1 && seen.challenge.length === c0 + 1 && g5.signs === 0 && seen.active.length === a0 + 1 && seen.history.length === h0 + 1 && g5.tok === true, { g5, ch: seen.challenge.length - c0, a: seen.active.length - a0 });
  check('Journal +1: ORDER1952 (reconciled); die FREMDE Wallet-Order ORDERFOREIGN landet NICHT',
    g5.grew === 1 && g5.r1952 && g5.r1952.reconciled === true && !g5.foreign, { grew: g5.grew, r1952: g5.r1952, foreign: g5.foreign });
  check('Eigener Flight „reconcile": Spur signMessage → reconcile „ok · 3 gefunden · 1 neu" (fremde Wallet nicht gezaehlt), ordersActive/ordersHistory als Kinder von reconcile, beendet ok; HUD + Terminal-Zeile nennen den Fund',
    g5.state.label === 'reconcile' && g5.state.ok === true && g5.busy === false && g5.state.lines.some(l => /^signMessage \d+ ms · ok$/.test(l))
      && g5.state.lines.some(l => /^reconcile \d+ ms · ok · 3 gefunden · 1 neu$/.test(l)) && g5.state.trace.filter(x => x.parent === 'reconcile' && x.depth === 1).map(x => x.name).join(',') === 'ordersActive,ordersHistory,onchainActive' && /id ORDER1952/.test(g5.hud) && /id ORDER1952/.test(g5.line || '')
      && g5.last && g5.last.source === 'button', { state: g5.state, hud: g5.hud, line: g5.line });

  cfg.history404 = true;
  cfg.active = [ORDER_1948, { id:'ORDER1953', wallet: ADDR, inputMint: SOL, outputMint: BONK, makingAmount: '20000000', status: 'Open' }];
  const g5h = await page.evaluate(async () => {
    const j0 = _crJrnLoad().manual.length;
    const r = await crOrderReconcile.run({ source: 'button' });
    return { r, grew: _crJrnLoad().manual.length - j0, rc: crVaultFlight.state().trace.find(x => x.name === 'reconcile') };
  });
  check('orders/history 404 (Worker < v1.26): Abgleich laeuft mit orders/active allein, historyError not-deployed benannt, ORDER1953 uebernommen',
    g5h.r && g5h.r.ok && g5h.r.historyError === 'not-deployed' && g5h.r.activeError === null && g5h.grew === 1 && g5h.r.added[0].id === 'ORDER1953'
      && g5h.rc && /^ok · 2 gefunden · 1 neu · history not-deployed$/.test(g5h.rc.result), g5h);
  cfg.history404 = false; cfg.active = [ORDER_1948];
  const g5e = await page.evaluate(async () => {
    /* Reject der Auth-Nachricht am Knopf → ehrliche Absage, nichts bewegt, kein Request. */
    crVaultApi.clear();
    const f = window.__mockWallet.features['solana:signMessage'].signMessage;
    window.__mockWallet.features['solana:signMessage'].signMessage = async () => { throw new Error('User rejected the request'); };
    const r = await crOrderReconcile.run({ auth: true, source: 'button' });
    window.__mockWallet.features['solana:signMessage'].signMessage = f;
    return { r, st: crVaultFlight.state() };
  });
  check('Auth am Knopf abgelehnt → { error:"rejected" }, Text „Nachricht nicht signiert … nichts bewegt", Flight endet err, KEIN orders/active',
    g5e.r && g5e.r.error === 'rejected' && /Nachricht nicht signiert \(rejected\) — nichts bewegt/.test(g5e.r.text) && g5e.st.ok === false && seen.active.length === a0 + 2, { r: g5e.r, a: seen.active.length - a0 });

  /* ===================== G6 — Market unveraendert ===================== */
  console.log('\n-- G6: Market-Pfad Bit fuer Bit: signAndSend, quote vor swap, 0 signTransaction, kein Abgleich --');
  seen.quote.length = 0; seen.swap.length = 0; h0 = seen.history.length;
  const g6 = await page.evaluate(async () => {
    window.__freshRef();
    const s0 = window.__signs.length, c0 = crOrderReconcile.calls();
    const res = await sdk.market({ side:'buy', size:1, price:100, source:{ armed:true, amountRaw:'50000000' } });
    const mine = window.__signs.slice(s0);
    return { res, sends: mine.filter(x => x.mode === 'send').length, signs: mine.filter(x => x.mode === 'sign').length, calls: crOrderReconcile.calls() - c0 };
  });
  check('Market: genau 1 signAndSendTransaction, 0 signTransaction, kein Abgleich', g6.sends === 1 && g6.signs === 0 && g6.calls === 0 && seen.history.length === h0, g6);
  check('Market: /v1/quote VOR /v1/tx/swap, Ergebnis traegt sig + Mengen',
    seen.quote.length === 1 && seen.swap.length === 1 && seen.quote[0] <= seen.swap[0]
      && !!(g6.res && g6.res.sig && g6.res.inAmount === '50000000' && g6.res.outAmount === '142371209424'), { q: seen.quote, s: seen.swap, res: g6.res });

  console.log('\n== v923 Patch G·B: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
