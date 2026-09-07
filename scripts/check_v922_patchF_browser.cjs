/* Smoke-Verifikation v1.0.922 — Patch F (CLIENT): Wallet-Guard ehrlich anzeigen,
 * Limit-Pfad nicht ins Leere laufen lassen.
 *
 * Befund (Handy, 06.09. 14:52 Phantom · 15:41 Solflare, Worker v1.25 mit
 * deposit_diff): beide Wallets haengen beim Sign-only der Jupiter-Einzahlung
 * Lighthouse-Guard-Instruktionen an (accounts_added L2TE…3S95, instructions
 * #8/#9). signature_valid_for_crafted_message=false → Jupiter Trigger V2
 * verwirft („Transaction accounts modified"). Nicht reparierbar; nur ehrlich
 * anzeigen und beim naechsten Mal VOR der Signatur sagen.
 *
 * Geprueft wird, was die Seite VERLAESST (Spion im page.route-Handler), was
 * die Wallet GEFRAGT wird (Spion je Feature) und was der Nutzer SIEHT (Panel-
 * Zeile, HUD, Toast, Diagnose-Block). Jede Gegenprobe MUSS ROT koennen
 * (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   F1  Fixture deposit_diff mit Lighthouse unter accounts_added → commit
 *       { error:'wallet-guard' }; Panel/HUD/Toast tragen den Klartext mit
 *       „Nichts bewegt"; der Rohdiff (Programm-ID) steht NUR im Diagnose-
 *       Block, nie in der Hauptzeile; sessionStorage cr_wallet_guard_v1 =
 *       Wallet-Name, localStorage traegt NICHTS.
 *       (Mutation: in crWalletGuard.detect `acc.indexOf(LIGHTHOUSE)` gegen
 *        `false` tauschen → F1 rot; `crVaultFlight.note` in commit entfernen
 *        → „Rohdiff im Diagnose-Block" rot.)
 *   F1b Lighthouse NUR unter instructions_added, Diff unter detail → ebenfalls
 *       wallet-guard (die zweite Erkennungsregel).
 *   F2  Fixture ohne Lighthouse (nur blockhash_changed) → weiterhin der
 *       generische Text mit Worker-Code + detail, KEIN Merker gesetzt.
 *       (Mutation: detect gibt immer hit:true → F2 rot.)
 *   F3  cr_wallet_guard_v1 gesetzt, Trigger V1 NICHT live → Hinweis VOR Auth/
 *       Signatur: 0 signMessage, 0 signTransaction, KEIN auth/challenge-
 *       Request, kein Journal. (Mutation: den Guard-Block in _armVaultLimit
 *       entfernen → F3 rot.)
 *   F3b Trigger V1 live (/health fuehrt /v1/orders/trigger) → Textvariante
 *       „On-Chain-Route (Trigger V1)"; mit Merker laeuft der Flow weiter
 *       (Hinweis im Toast, Order liegt).
 *   F4  Spur als Gruppe: depositSign/ordersPrice/ordersActive tragen depth 1
 *       unter commit; Diagnose-Block rueckt sie mit „↳" ein, nummeriert nur
 *       Tiefe 0. (Mutation: in crVaultFlight.step `parent` auf null zwingen
 *       → F4 rot.)
 *   F5  Guide-Absatz „Ruhende Orders & Wallet-Schutz" NUR auf Route Limit;
 *       Renten-Zeile (~0,004 SOL) nur bei V2-Pfad (kein Merker), mit Merker
 *       ohne V1 → Pfad none, keine Renten-Zeile, Wortlaut = crWalletGuard.text.
 *   F6  Market-Pfad unveraendert: genau 1 signAndSendTransaction, 0
 *       signTransaction, quote VOR swap.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v922_patchF_browser.cjs
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
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-922';
const LIGHTHOUSE = 'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95';
const VAULT_PATHS = ['/v1/auth/challenge','/v1/auth/verify','/v1/vault/register',
  '/v1/deposit/craft','/v1/orders/price','/v1/orders/active'];
const SIGNED_BYTES = [1, 2, 3, 4, 5, 0xAA];

/* Der Befund vom Handy, als Fixture: so legt Worker v1.25 den Diff bei. */
const DIFF_PHANTOM = {
  accounts_added: [LIGHTHOUSE, 'GuardAcc0unt111111111111111111111111111111111'],
  instructions_added: [{ index: 8, program: LIGHTHOUSE, name: 'Lighthouse: AssertAccountDelta' },
                       { index: 9, program: LIGHTHOUSE, name: 'Lighthouse: AssertTokenAccount' }],
  blockhash_changed: false,
  signature_valid_for_crafted_message: false
};
const DIFF_SOLFLARE_IX_ONLY = {   // Programm nur im Instruktions-Namen, accounts_added fremd
  accounts_added: ['ComputeBudget111111111111111111111111111111'],
  instructions_added: ['#0 ComputeBudget SetComputeUnitLimit (replaced)', '#8 Lighthouse AssertAccountDelta', '#9 Lighthouse AssertTokenAccount'],
  blockhash_changed: false,
  signature_valid_for_crafted_message: false
};
const DIFF_BLOCKHASH_ONLY = {
  accounts_added: [], instructions_added: [],
  blockhash_changed: true, signature_valid_for_crafted_message: false
};

/* Fixture-Schalter, node-seitig zwischen den Schritten umstellbar. */
const cfg = { priceMode: 'ok', v1Live: false };

/* Spion: jeder Body, der einen Vault-Pfad erreicht. */
const seen = { challenge: [], deposit: [], price: [], swap: [], quote: [] };
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
      const eps = ['/v1/quote','/v1/tx/swap','/v1/tx/status','/v1/rpc/balance'].concat(VAULT_PATHS.map(p => 'POST ' + p));
      if(cfg.v1Live) eps.push('POST /v1/orders/trigger');
      return J({ ok:true, version:'tx v1.25', signs:false, kill:false, endpoints: eps });
    }
    if(/\/v1\/auth\/challenge/.test(url)){ seen.challenge.push(Date.now()); return J({ ok:true, challenge:'CR-CHALLENGE-922-abc', expires_in_s:120 }); }
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok:true, registered:true });
    if(/\/v1\/deposit\/craft/.test(url)){
      const b = bodyOf(req); seen.deposit.push(b);
      return J({ ok:true, transaction:'AQIDBAU=', expires_in_s:40, deposit:{ amount_raw:String(b.amount_raw) }, fee:{ bps:50 }, request_id:'REQ922' });
    }
    if(/\/v1\/orders\/price/.test(url)){
      const b = bodyOf(req); seen.price.push(b);
      if(!b || !b.deposit_signed_tx || !b.deposit_request_id)
        return J({ ok:false, error:'vault-contract-invalid', note:'orders/price braucht deposit_signed_tx und deposit_request_id' }, 400);
      /* Worker v1.25: Jupiter verwirft die veraenderte Einzahlung; deposit_diff liegt bei. */
      if(cfg.priceMode === 'guard-accounts')
        return J({ ok:false, error:'jupiter-rejected', note:'Transaction accounts modified', deposit_diff: DIFF_PHANTOM }, 422);
      if(cfg.priceMode === 'guard-ix-detail')
        return J({ ok:false, error:'jupiter-rejected', detail: { message:'Transaction accounts modified', deposit_diff: DIFF_SOLFLARE_IX_ONLY } }, 422);
      if(cfg.priceMode === 'blockhash')
        return J({ ok:false, error:'jupiter-rejected', note:'Transaction blockhash expired', deposit_diff: DIFF_BLOCKHASH_ONLY }, 422);
      return J({ ok:true, id:'ORDER922', txSignature:'TXSIG922', depositConfirmed:true, status:'Open', fee:{ bps:50 } });
    }
    if(/\/v1\/orders\/active/.test(url))  return J({ ok:true, orders: [{ id:'ORDER922', status:'Open' }] });

    /* Market-Endpunkte (F6) */
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
    window.__signs = [];   // { mode:'send' | 'sign' }
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
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.922',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 922)))), bv);
  const seam = await page.evaluate(() => ({
    guard: !!(window.crWalletGuard && typeof crWalletGuard.classify === 'function' && crWalletGuard.LIGHTHOUSE === 'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95'),
    v1: !!(window.crVaultApi && typeof crVaultApi.triggerV1Live === 'function'),
    note: !!(window.crVaultFlight && typeof crVaultFlight.note === 'function' && typeof crVaultFlight.linesTree === 'function'),
    key: window.crWalletGuard && crWalletGuard.KEY }));
  check('Naehte: crWalletGuard (Lighthouse-ID), crVaultApi.triggerV1Live, crVaultFlight.note/linesTree, Key cr_wallet_guard_v1',
    seam.guard && seam.v1 && seam.note && seam.key === 'cr_wallet_guard_v1', seam);

  console.log('\n-- Aufbau: Sol-Chart, Jupiter-Referenz, Wallet, globales ARM, JWT --');
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
    try { sessionStorage.removeItem('cr_wallet_guard_v1'); } catch(_){}
    crVaultApi._pfReset(); crVaultApi.clear();
    const au = await crVaultApi.ensureAuth(crSigner.active().address, msg => crSigner.signMessage(msg));
    return { mint:m, ready: !!(crSigner.info() && crSigner.info().ready), badge: crWeiche.badgeGate(),
             auth: !!(au && !au.error), tok: crVaultApi.token(), wname: crSigner.active().wallet };
  }, [BONK]);
  check('Sol-Asset aktiv, badgeGate offen, Wallet „M" signierfaehig, JWT im Speicher',
    setup.mint === BONK && setup.badge && setup.badge.ok === true && setup.ready === true && setup.auth && setup.tok === JWT && setup.wname === 'M', setup);

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
        return { display: g.style.display, path: g.getAttribute('data-cr-guide-path'), guard: p1 ? p1.textContent : '', fee: p2 ? p2.textContent : '',
                 summary: (g.querySelector('summary') || {}).textContent || '' };
      };
      return { host, section, route, armed, size, msgOf, diagOf, guideOf,
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
    window.__runPanel = async function(){
      crVaultApi._pfReset(); window.__freshRef();
      const s0 = window.__signs.length, m0 = window.__msgs.length, j0 = _crJrnLoad().manual.length;
      const P = window.__mkPanel();
      window.__toasts.length = 0;
      P.setRoute('limit'); P.setPrice('0.0001');
      P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
      P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
      P.arm();
      await new Promise(r => setTimeout(r, 1300));
      const mine = window.__signs.slice(s0);
      const out = { msg: P.msgOf(), hud: (window.crLoud && crLoud.last().text) || '', toasts: window.__toasts.slice(),
                    lines: crVaultFlight.lines(), tree: crVaultFlight.linesTree(), state: crVaultFlight.state(), busy: crVaultFlight.busy(),
                    diag: P.diagOf(),
                    signs: mine.filter(x => x.mode === 'sign').length,
                    sends: mine.filter(x => x.mode === 'send').length,
                    msgs: window.__msgs.length - m0,
                    journalGrew: _crJrnLoad().manual.length - j0,
                    flagged: crWalletGuard.flagged(), ls: localStorage.getItem('cr_wallet_guard_v1') };
      P.host.remove();
      return out;
    };
  });

  const HEAD = /Deine Wallet hat die Einzahlung mit Schutz-Instruktionen verändert \(Lighthouse-Guard\)\. Jupiter nimmt nur die unveränderte Einzahlung an\. Nichts bewegt\./;
  const TAIL_NONE = /Ruhende Orders sind mit dieser Wallet derzeit nicht möglich\./;
  const TAIL_V1 = /Ruhende Orders laufen deshalb derzeit über die On-Chain-Route \(Trigger V1\)\./;

  /* ===================== F1 — Lighthouse unter accounts_added → wallet-guard ===================== */
  console.log('\n-- F1: deposit_diff mit Lighthouse → wallet-guard, „Nichts bewegt", Rohdiff nur im Diagnose-Block --');
  cfg.priceMode = 'guard-accounts';
  let p0 = seen.price.length;
  const f1 = await page.evaluate(async ([sol, bonk]) => {
    crWalletGuard.forget();
    const s0 = window.__signs.length;
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ922',
      opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const direct = { r, signs: window.__signs.slice(s0).filter(x => x.mode === 'sign').length,
                     flagged: crWalletGuard.flagged(), ls: localStorage.getItem('cr_wallet_guard_v1'),
                     weiche: crPanelLive._msgForLimitError(r) };
    crWalletGuard.forget();                                  // damit das Panel den VOLLEN Weg geht (erster Treffer)
    const panel = await window.__runPanel();
    return { direct, panel };
  }, [SOL, BONK]);
  check('commit direkt: { error:"wallet-guard" }, depositDiff mit Lighthouse, Upstream-Code bleibt lesbar',
    f1.direct.r && f1.direct.r.error === 'wallet-guard' && f1.direct.r.depositDiff && JSON.stringify(f1.direct.r.depositDiff.accounts_added).indexOf(LIGHTHOUSE) >= 0
      && f1.direct.r.upstreamError === 'jupiter-rejected' && f1.direct.signs === 1, f1.direct.r);
  check('Merker: sessionStorage cr_wallet_guard_v1 = „M" (Wallet-Name), localStorage traegt NICHTS',
    f1.direct.flagged === 'M' && f1.direct.ls === null, { flagged: f1.direct.flagged, ls: f1.direct.ls });
  check('_msgForLimitError(wallet-guard): Klartext + „Nichts bewegt" + „derzeit nicht möglich" (V1 nicht live)',
    HEAD.test(f1.direct.weiche) && TAIL_NONE.test(f1.direct.weiche) && !TAIL_V1.test(f1.direct.weiche), f1.direct.weiche);
  check('Panel-Meldung: derselbe Klartext, kein Rohfehler (kein jupiter-rejected, keine Programm-ID, kein accounts_added)',
    HEAD.test(f1.panel.msg) && TAIL_NONE.test(f1.panel.msg) && !/jupiter-rejected|accounts_added|L2TE/.test(f1.panel.msg), f1.panel.msg);
  check('HUD (crLoud) traegt denselben Text, ohne Rohdiff', HEAD.test(f1.panel.hud) && !/L2TE|accounts_added/.test(f1.panel.hud), f1.panel.hud);
  check('Toast traegt den Text; NIRGENDS „Live swap failed"',
    f1.panel.toasts.some(t => HEAD.test(t)) && !f1.panel.toasts.some(t => /Live (swap|limit) failed/.test(t)), f1.panel.toasts);
  check('Rohdiff NUR im Diagnose-Block: Notiz deposit_diff mit der Lighthouse-ID; in keiner Schritt-Zeile',
    f1.panel.diag.notes.some(n => n.label === 'deposit_diff' && n.text.indexOf(LIGHTHOUSE) >= 0)
      && !f1.panel.diag.rows.some(r => r.text.indexOf(LIGHTHOUSE) >= 0), f1.panel.diag);
  check('Spur: commit … wallet-guard; ordersPrice … jupiter-rejected (Upstream-Code bleibt in der Spur)',
    f1.panel.lines.some(l => /^commit \d+ ms · wallet-guard$/.test(l)) && f1.panel.lines.some(l => /^ordersPrice \d+ ms · jupiter-rejected$/.test(l)), f1.panel.lines);
  check('Erster Treffer ueber das Panel: 1 Signatur, 0 Sends, KEIN Journal, busy zurueck, Merker gesetzt',
    f1.panel.signs === 1 && f1.panel.sends === 0 && f1.panel.journalGrew === 0 && f1.panel.busy === false && f1.panel.flagged === 'M' && f1.panel.ls === null, f1.panel);
  check('genau 2 orders/price-Requests (direkt + Panel)', seen.price.length === p0 + 2, seen.price.length - p0);

  console.log('\n-- F1b: Lighthouse NUR unter instructions_added, Diff unter detail → wallet-guard --');
  cfg.priceMode = 'guard-ix-detail';
  const f1b = await page.evaluate(async ([sol, bonk]) => {
    crWalletGuard.forget();
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ922',
      opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const det = crWalletGuard.detect({ detail: { deposit_diff: { accounts_added: [], instructions_added: ['#8 Lighthouse AssertAccountDelta'] } } });
    const detStr = crWalletGuard.detect({ detail: JSON.stringify({ deposit_diff: { accounts_added: ['L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95'] } }) });
    return { r, flagged: crWalletGuard.flagged(), det, detStr };
  }, [SOL, BONK]);
  check('commit: wallet-guard ueber die Instruktions-Regel; Merker gesetzt',
    f1b.r && f1b.r.error === 'wallet-guard' && /instructions_added/.test(f1b.r.detail) && f1b.flagged === 'M', f1b.r);
  check('detect liest den Diff auch unter detail-Objekt und aus einem JSON-String',
    f1b.det.hit === true && f1b.detStr.hit === true, { det: f1b.det, detStr: f1b.detStr });

  /* ===================== F2 — ohne Lighthouse bleibt es der generische Fehler ===================== */
  console.log('\n-- F2: nur blockhash_changed → generischer Text mit Worker-Code + detail, KEIN Merker --');
  cfg.priceMode = 'blockhash';
  const f2 = await page.evaluate(async ([sol, bonk]) => {
    crWalletGuard.forget();
    const r = await crVaultLimit.commit({ addr: crSigner.active().address, transaction: 'AQIDBAU=', feeBps: 50, depositRequestId: 'REQ922',
      opts: { inputMint: sol, outputMint: bonk, side: 'buy', amountRaw: '1000000', triggerPrice: '0.0001' } });
    const panel = await window.__runPanel();
    return { r, panel, det: crWalletGuard.detect(r) };
  }, [SOL, BONK]);
  check('commit: { error:"jupiter-rejected", detail:"Transaction blockhash expired" } — NICHT wallet-guard',
    f2.r && f2.r.error === 'jupiter-rejected' && f2.r.detail === 'Transaction blockhash expired' && f2.det.hit === false, f2.r);
  check('Panel: „Ruhende Order: jupiter-rejected — Transaction blockhash expired", kein Guard-Text',
    /Ruhende Order: jupiter-rejected — Transaction blockhash expired/.test(f2.panel.msg) && !HEAD.test(f2.panel.msg), f2.panel.msg);
  check('KEIN Merker gesetzt, kein Journal, 0 Sends', f2.panel.flagged === '' && f2.panel.journalGrew === 0 && f2.panel.sends === 0, f2.panel);

  /* ===================== F3 — Merker gesetzt: Hinweis VOR Auth/Signatur ===================== */
  console.log('\n-- F3: cr_wallet_guard_v1 gesetzt, V1 nicht live → Hinweis vor Auth/Signatur, Spion = 0 --');
  cfg.priceMode = 'ok';
  const c0 = seen.challenge.length; p0 = seen.price.length;
  const f3 = await page.evaluate(async () => {
    crWalletGuard.remember('Phantom');
    crVaultApi.clear();                  // JWT weg → ein normaler Arm MUESSTE jetzt signMessage + auth/challenge laufen
    const panel = await window.__runPanel();
    return { panel, hasTok: !!crVaultApi.token() };
  });
  check('Panel: „Bekannt aus dieser Sitzung (Phantom): …" + Klartext + „nicht möglich" — VOR jeder Signatur',
    /^Bekannt aus dieser Sitzung \(Phantom\): /.test(f3.panel.msg) && HEAD.test(f3.panel.msg) && TAIL_NONE.test(f3.panel.msg), f3.panel.msg);
  check('HUD + Toast tragen den Hinweis', HEAD.test(f3.panel.hud) && f3.panel.toasts.some(t => HEAD.test(t)), { hud: f3.panel.hud, toasts: f3.panel.toasts });
  check('Spion: 0 signMessage, 0 signTransaction, 0 Sends, KEIN auth/challenge-Request, KEIN orders/price, kein JWT, kein Journal',
    f3.panel.msgs === 0 && f3.panel.signs === 0 && f3.panel.sends === 0 && seen.challenge.length === c0 && seen.price.length === p0
      && f3.hasTok === false && f3.panel.journalGrew === 0, { panel: f3.panel, ch: seen.challenge.length - c0, pr: seen.price.length - p0 });
  check('Spur: preflight ok → walletGuard … gemerkt (Phantom); kein challenge/signMessage/depositSign',
    f3.panel.lines.some(l => /^preflight \d+ ms · ok$/.test(l)) && f3.panel.lines.some(l => /^walletGuard \d+ ms · gemerkt \(Phantom\)$/.test(l))
      && !f3.panel.lines.some(l => /^(challenge|signMessage|depositSign)/.test(l)), f3.panel.lines);
  check('busy zurueckgesetzt', f3.panel.busy === false, f3.panel.busy);

  console.log('\n-- F3b: Trigger V1 live (/health fuehrt /v1/orders/trigger) → Textvariante; mit Merker laeuft der Flow weiter --');
  cfg.v1Live = true;
  const f3b = await page.evaluate(async () => {
    crVaultApi._pfReset();
    await crVaultApi.preflight();
    const live = crVaultApi.triggerV1Live();
    const txt = crWalletGuard.text(crWalletGuard.v1Live());
    const panel = await window.__runPanel();          // Merker „Phantom" steht noch; JWT wird neu geholt
    return { live, txt, panel };
  });
  check('triggerV1Live() misst den Marker aus /health; text() nennt die On-Chain-Route (Trigger V1)',
    f3b.live === true && HEAD.test(f3b.txt) && TAIL_V1.test(f3b.txt) && !TAIL_NONE.test(f3b.txt), { live: f3b.live, txt: f3b.txt });
  check('Mit Merker + V1 live: Hinweis im Toast, Flow laeuft weiter → Order liegt (1 Signatur, 1 signMessage)',
    f3b.panel.toasts.some(t => /Wallet-Schutz bekannt \(Phantom\)/.test(t) && TAIL_V1.test(t)) && /RUHENDE ORDER liegt · ORDER922/.test(f3b.panel.msg)
      && f3b.panel.signs === 1 && f3b.panel.msgs === 1 && f3b.panel.journalGrew === 1, f3b.panel);
  check('Spur: walletGuard … gemerkt (Phantom) · Trigger V1 live', f3b.panel.lines.some(l => /^walletGuard \d+ ms · gemerkt \(Phantom\) · Trigger V1 live$/.test(l)), f3b.panel.lines);
  cfg.priceMode = 'guard-accounts';
  const f3c = await page.evaluate(async () => {
    crWalletGuard.forget();
    const panel = await window.__runPanel();
    return panel;
  });
  check('Guard-Treffer bei V1 live: Panel-Text endet mit der Trigger-V1-Variante',
    HEAD.test(f3c.msg) && TAIL_V1.test(f3c.msg) && !TAIL_NONE.test(f3c.msg) && f3c.flagged === 'M', f3c.msg);
  cfg.v1Live = false; cfg.priceMode = 'ok';

  /* ===================== F4 — Spur als Gruppe ===================== */
  console.log('\n-- F4: commit gruppiert depositSign → ordersPrice → ordersActive (depth 1, „↳" im Diagnose-Block) --');
  const f4 = await page.evaluate(async () => {
    crWalletGuard.forget(); crVaultApi._pfReset();
    const panel = await window.__runPanel();
    /* Ein NEUER Abschnitt spiegelt den beendeten Flight (endedAt < 120 s) samt Diagnose. */
    const P = window.__mkPanel();
    await new Promise(r => setTimeout(r, 50));
    const diag = P.diagOf();
    P.host.remove();
    const tr = panel.state.trace;
    const byName = n => tr.find(x => x.name === n);
    return { ok: /RUHENDE ORDER liegt/.test(panel.msg), tr, tree: panel.tree, diag, flat: panel.lines,
             commit: byName('commit'), ds: byName('depositSign'), op: byName('ordersPrice'), oa: byName('ordersActive'), dc: byName('depositCraft') };
  });
  check('Erfolgslauf; commit depth 0, depositSign/ordersPrice/ordersActive depth 1 mit parent commit; depositCraft depth 0',
    f4.ok && f4.commit && f4.commit.depth === 0 && ['ds','op','oa'].every(k => f4[k] && f4[k].depth === 1 && f4[k].parent === 'commit') && f4.dc && f4.dc.depth === 0, f4.tr);
  check('Reihenfolge in der Spur: commit VOR depositSign VOR ordersPrice VOR ordersActive',
    (() => { const i = n => f4.tr.findIndex(x => x.name === n); return i('commit') < i('depositSign') && i('depositSign') < i('ordersPrice') && i('ordersPrice') < i('ordersActive'); })(), f4.tr.map(x => x.name));
  check('linesTree rueckt Kinder mit „↳" ein; lines() bleibt flach (^depositSign …)',
    f4.tree.some(l => /^\s+↳ depositSign \d+ ms · ok$/.test(l)) && f4.flat.some(l => /^depositSign \d+ ms · ok$/.test(l)), { tree: f4.tree, flat: f4.flat });
  check('Diagnose-Block: Kinder tragen depth=1 + „↳", nur Tiefe 0 ist nummeriert (n. …), commit ist die letzte Nummer',
    (() => {
      const rows = f4.diag.rows;
      const kids = rows.filter(r => r.depth === '1');
      const tops = rows.filter(r => r.depth === '0');
      const numbered = tops.every((r, i) => r.text.indexOf((i + 1) + '. ') === 0);
      const last = tops[tops.length - 1];
      return kids.length === 3 && kids.every(r => /^↳ /.test(r.text)) && numbered && last && /^\d+\. commit /.test(last.text);
    })(), f4.diag.rows);
  check('commit-Gruppe: Ergebnis ok, Dauer ≥ Summe der Kinder (die Gruppe schliesst NACH den Kindern)',
    f4.commit.result === 'ok' && f4.commit.ms >= f4.ds.ms && f4.commit.ms >= f4.op.ms, { commit: f4.commit, ds: f4.ds, op: f4.op });

  /* ===================== F5 — Guide-Absatz + Gebuehren-Blatt ===================== */
  console.log('\n-- F5: „Ruhende Orders & Wallet-Schutz" nur auf Route Limit; Renten-Zeile nur bei V2-Pfad --');
  const f5 = await page.evaluate(async () => {
    crWalletGuard.forget(); crVaultApi._pfReset();
    const P = window.__mkPanel();
    P.setRoute('market'); await new Promise(r => setTimeout(r, 30));
    const onMarket = P.guideOf();
    P.setRoute('limit'); await new Promise(r => setTimeout(r, 30));
    const v2 = P.guideOf();
    crWalletGuard.remember('Phantom');
    P.setRoute('market'); await new Promise(r => setTimeout(r, 30));
    P.setRoute('limit'); await new Promise(r => setTimeout(r, 30));
    const none = P.guideOf();
    crWalletGuard.forget();
    P.host.remove();
    return { onMarket, v2, none, txt: crWalletGuard.text(false) };
  });
  check('Route Market: Guide unsichtbar', f5.onMarket && f5.onMarket.display === 'none', f5.onMarket);
  check('Route Limit ohne Merker: Guide sichtbar, Pfad v2, Absatz traegt den Klartext, Renten-Zeile ~0,004 SOL',
    f5.v2 && f5.v2.display === '' && f5.v2.path === 'v2' && f5.v2.summary === 'Ruhende Orders & Wallet-Schutz'
      && f5.v2.guard.indexOf(f5.txt) >= 0 && /Vault-Rente ~0,004 SOL/.test(f5.v2.fee) && /deposit\/craft-Echo/.test(f5.v2.fee), f5.v2);
  check('Route Limit mit Merker (V1 nicht live): Pfad none, „Bekannt aus dieser Sitzung (Phantom)", KEINE Renten-Zeile',
    f5.none && f5.none.path === 'none' && /^Bekannt aus dieser Sitzung \(Phantom\): /.test(f5.none.guard) && f5.none.guard.indexOf(f5.txt) >= 0
      && !/Vault-Rente/.test(f5.none.fee), f5.none);

  /* ===================== F6 — Market unveraendert ===================== */
  console.log('\n-- F6: Market-Pfad Bit fuer Bit: signAndSend, quote vor swap, 0 signTransaction --');
  seen.quote.length = 0; seen.swap.length = 0;
  const f6 = await page.evaluate(async () => {
    window.__freshRef();
    const s0 = window.__signs.length;
    const res = await sdk.market({ side:'buy', size:1, price:100, source:{ armed:true, amountRaw:'50000000' } });
    const mine = window.__signs.slice(s0);
    return { res, sends: mine.filter(x => x.mode === 'send').length, signs: mine.filter(x => x.mode === 'sign').length, flagged: crWalletGuard.flagged() };
  });
  check('Market: genau 1 signAndSendTransaction, 0 signTransaction, Merker unberuehrt', f6.sends === 1 && f6.signs === 0 && f6.flagged === '', f6);
  check('Market: /v1/quote VOR /v1/tx/swap, Ergebnis traegt sig + Mengen',
    seen.quote.length === 1 && seen.swap.length === 1 && seen.quote[0] <= seen.swap[0]
      && !!(f6.res && f6.res.sig && f6.res.inAmount === '50000000' && f6.res.outAmount === '142371209424'), { q: seen.quote, s: seen.swap, res: f6.res });

  console.log('\n== v922 Patch F: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
