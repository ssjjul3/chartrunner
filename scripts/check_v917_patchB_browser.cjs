/* Smoke-Verifikation v1.0.917 — Patch B: LIMIT-FEHLER LAUT + /health-PREFLIGHT +
 * DEX-JUPITER-VENUE + ARM-HINWEIS + FEE-ECHO bps-only.
 *
 * Rein Anzeige/Preflight/Bindung — KEIN neuer Trade-Pfad. Scharf geprueft wird,
 * was heute STILL schiefging (das Panel schloss, verschluckte den Grund) und
 * was den Flow trotz Worker-Fix abbrach (der bps-only-Gate). Die Gegenproben
 * MUESSEN ROT koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   B1  sayLoud statt sayPanel: ein prepare-Fehler zeigt den EXAKTEN Grund im
 *       Panel UND toastet ihn. (Mutation: sayLoud→sayPanel in _armVaultLimit →
 *       Toast-Assertion rot.)
 *   B2  Preflight: /health OHNE Vault-Endpunkte → Abbruch VOR jeder Signatur.
 *       (Mutation: preflight-Gate entfernen → 0-Signaturen-Assertion rot.)
 *   B3  routeVenue an die Solana-Mint gebunden → „DEX - Jupiter", nie „CEX".
 *       (Mutation: den B3-Zweig in routeVenue entfernen → rot.)
 *   B4  ARM aus → Hinweis statt Stille. (Mutation: sayLoud-Zeile → `return` → rot.)
 *   B5  bps-only-Echo → Flow laeuft weiter (Deposit-Signatur), Gebuehr „0,5 %"
 *       ohne SOL. (Mutation: Gate zurueck auf feeRaw==null||feeBps==null → rot.)
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v917_patchB_browser.cjs
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
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-917';

/* Node-seitige, zwischen den Schritten umschaltbare Netz-Konfiguration.
 * Der page.route-Handler schliesst darueber — Aendern in Node wirkt auf die
 * naechsten fetch()-Aufrufe der Seite. */
const cfg = {
  healthEndpoints: true,   // /health fuehrt die 6 Vault-Endpunkte unter `endpoints`
  registerOk: true,        // /v1/vault/register antwortet ok
  depositOk: true,         // /v1/deposit/craft baut die Tx
  feeShape: 'both'         // 'both' | 'bpsOnly' | 'none'
};

const VAULT_PATHS = ['/v1/auth/challenge','/v1/auth/verify','/v1/vault/register',
  '/v1/deposit/craft','/v1/orders/price','/v1/orders/active'];

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
      const base = { ok:true, version:'tx v1.21', signs:false, kill:false };
      base.endpoints = ['/v1/quote','/v1/tx/swap','/v1/tx/status','/v1/rpc/balance']
        .concat(cfg.healthEndpoints ? VAULT_PATHS.map(p => 'POST ' + p) : []);
      return J(base);
    }

    /* ---- V2-Vault-Endpunkte ---- */
    if(/\/v1\/auth\/challenge/.test(url)) return J({ ok:true, challenge:'CR-CHALLENGE-917-abc', expires_in_s:120 });
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)){
      return cfg.registerOk ? J({ ok:true, registered:true })
                            : J({ ok:false, error:'register-denied', note:'vault busy' }, 400);
    }
    if(/\/v1\/deposit\/craft/.test(url)){
      if(!cfg.depositOk) return J({ ok:false, error:'deposit-denied', note:'insufficient' }, 400);
      const body = { ok:true, transaction:'AQIDBAU=', expires_in_s:40,
                     deposit:{ amount_raw:'1000000' }, cluster:'mainnet' };
      if(cfg.feeShape === 'both')    body.fee = { bps:50, amount_raw:'5000' };
      else if(cfg.feeShape === 'bpsOnly') body.fee = { bps:50 };            // amount_raw FEHLT (Worker v1.21)
      /* 'none' → gar kein fee-Feld */
      return J(body);
    }
    if(/\/v1\/orders\/price/.test(url))   return J({ ok:true, orderPubkey:'ORDER917', status:'Open', fee:{ bps:50 } });
    if(/\/v1\/orders\/active/.test(url))  return J({ ok:true, orders:[{ orderKey:'ORDER917', status:'Open' }] });

    /* ---- Daten-/Market-Endpunkte (unauffaellig) ---- */
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/v1\/token\/safety/.test(url))  return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    return J({});
  });

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = [];       // signAndSend (finanzwirksam)
    window.__msgs  = [];       // signMessage (freie Challenge)
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signMessage':{ version:'1.0.0',
            signMessage: async (i) => { window.__msgs.push(i && i.message ? i.message.length : 0);
              const s = new Uint8Array(64); s[0] = 7; return [{ signature:s }]; } },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async (i) => { window.__signs.push({ chain: i && i.chain });
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
  check('Banner meldet mindestens v1.0.917',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 917)))), bv);
  check('crVaultApi.preflight ist eine Funktion',
    await page.evaluate(() => !!(window.crVaultApi && typeof crVaultApi.preflight === 'function')));

  console.log('\n-- Aufbau: Sol-Chart, frische Jupiter-Referenz, Wallet, globales ARM --');
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

  /* Toast-Recorder + Panel-Fabrik in die Seite. */
  await page.evaluate(() => {
    window.__toasts = [];
    const _orig = window.toast;
    window.toast = function(m){ try { window.__toasts.push(String(m)); } catch(_){} return _orig ? _orig(m) : undefined; };
    window.__mkPanel = function(){
      const host = document.createElement('div'); document.body.appendChild(host);
      const overlay = { kind:'hline', id: Math.floor(Math.random()*1e6), py:100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const sels = section.querySelectorAll('select');
      const route = sels[0], side = sels[1];
      const armed = section.querySelector('input[type=checkbox]');
      const size = Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox');
      const msg  = section.querySelector('[data-cr-panel-msg]');
      const klar = section.querySelector('[data-cr-panel-klar]');
      const ctx  = section.querySelector('div'); // erste div = contextLine? -> stattdessen gezielt
      return { host, section, route, side, armed, size, msg, klar,
               ctxText(){ // die RUN-Zeile: die div mit textContent, die mit 'Run:' beginnt
                 const ds = section.querySelectorAll('div');
                 for(const d of ds) if(/^Run:/.test(d.textContent||'')) return d.textContent;
                 return ''; },
               setRoute(v){ route.value = v; route.dispatchEvent(new Event('change')); },
               setPrice(p){ const blk = section.querySelectorAll('input');
                 // Preis-Feld liegt im Route-Block (limit-Schema: ein 'price'-Feld)
                 const priceInp = Array.from(blk).find(i => (i.previousSibling && /price/i.test(i.previousSibling.textContent||'')) )
                   || Array.from(section.querySelectorAll('label')).map(l=>l.querySelector('input')).find(Boolean);
                 // robust: das erste input im Route-Block
                 const rb = section.querySelector('div[style*="dashed"]');
                 let inp = null;
                 section.querySelectorAll('label').forEach(l => { const s=l.querySelector('span'); if(s && /^price$/i.test((s.textContent||'').trim())) inp = l.querySelector('input'); });
                 inp = inp || priceInp;
                 if(inp){ inp.value = p; inp.dispatchEvent(new Event('input')); return true; }
                 return false; },
               arm(){ armBtnClick(section); } };
    };
    // Helfer: den Arm/Update-Button der Sektion klicken
    window.armBtnClick = function(section){
      const btns = section.querySelectorAll('button');
      let b = null; btns.forEach(x => { if(/arm/i.test(x.textContent||'')) b = x; });
      if(b) b.click();
    };
  });

  /* ===================== B3 — Venue an die Mint gebunden ===================== */
  console.log('\n-- B3: RUN-Venue = DEX - Jupiter fuer eine Solana-Mint --');
  const b3sol = await page.evaluate(() => {
    const P = window.__mkPanel();
    const paper = P.ctxText();
    P.setRoute('limit');
    P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
    const live = P.ctxText();
    const st = crPanelKlar.state(true, 'limit');
    P.host.remove();
    return { paper, live, st };
  });
  check('Solana-Token: RUN-Zeile nennt „DEX - Jupiter" (kein „CEX")',
    /DEX - Jupiter/.test(b3sol.paper) && !/CEX/i.test(b3sol.paper), b3sol);
  check('Solana-Token + Limit + live: RUN-Zeile „VAULT-LIMIT"',
    b3sol.st === 'live' && /DEX - Jupiter/.test(b3sol.live) && /VAULT-LIMIT/.test(b3sol.live), b3sol);

  const b3cex = await page.evaluate(() => {
    const prev = currentAsset;
    currentAsset = ASSETS[0].id;               // BTC — keine Solana-Mint
    const P = window.__mkPanel();
    const paper = P.ctxText();
    P.host.remove();
    currentAsset = prev;
    return { paper, cexAsset: ASSETS[0].id, sol: !!(ASSETS[0].solanaToken) };
  });
  check('CEX-Asset (kein solanaToken): RUN-Zeile bleibt „CEX - Binance"',
    b3cex.sol === false && /CEX - Binance/.test(b3cex.paper) && !/DEX - Jupiter/.test(b3cex.paper), b3cex);

  /* ===================== B4 — ARM aus → Hinweis ===================== */
  console.log('\n-- B4: globales ARM aus → sichtbarer Hinweis (Market & Limit) --');
  const b4 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const out = {};
    for(const r of ['market','limit']){
      const P = window.__mkPanel();
      window.__toasts.length = 0;
      P.setRoute(r);
      P.arm();
      out[r] = { msg: P.msg.textContent, toast: window.__toasts.slice() };
      P.host.remove();
    }
    localStorage.setItem('cr_arm_v1', '1');    // wiederherstellen
    return out;
  });
  check('ARM aus · Market: Panel-Hinweis „Globales ARM ist aus"',
    /Globales ARM ist aus/.test(b4.market.msg), b4.market);
  check('ARM aus · Limit: Panel-Hinweis „Globales ARM ist aus"',
    /Globales ARM ist aus/.test(b4.limit.msg), b4.limit);
  check('ARM aus: der Hinweis wird auch getoastet (ueberlebt Panel-Schliessen)',
    b4.market.toast.some(t => /Globales ARM ist aus/.test(t)), b4.market.toast);

  /* ===================== B2 — Preflight (Modul) ===================== */
  console.log('\n-- B2: crVaultApi.preflight gegen /health --');
  cfg.healthEndpoints = false;
  const pfMissing = await page.evaluate(async () => { crVaultApi._pfReset(); return crVaultApi.preflight(); });
  check('/health ohne Vault-Endpunkte → { error:"vault-endpoints-missing" }',
    pfMissing && pfMissing.error === 'vault-endpoints-missing' && Array.isArray(pfMissing.missing) && pfMissing.missing.length === 6, pfMissing);
  cfg.healthEndpoints = true;
  const pfOk = await page.evaluate(async () => { crVaultApi._pfReset(); return crVaultApi.preflight(); });
  check('/health mit allen Vault-Endpunkten → { ok:true }', pfOk && pfOk.ok === true, pfOk);

  /* ===================== B2 — Preflight (Panel, VOR jeder Signatur) ===================== */
  console.log('\n-- B2: Panel bricht ohne Vault-Endpunkte VOR jeder Signatur ab --');
  cfg.healthEndpoints = false;
  const b2panel = await page.evaluate(async () => {
    crVaultApi._pfReset();
    const sM = window.__msgs.length, sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.setRoute('limit'); P.setPrice('0.0001');
    P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
    P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
    P.arm();
    await new Promise(r => setTimeout(r, 700));
    const out = { msg: P.msg.textContent, toast: window.__toasts.slice(),
                  dMsgs: window.__msgs.length - sM, dSigns: window.__signs.length - sS };
    P.host.remove();
    return out;
  });
  check('ohne Vault-Endpunkte: KEINE Nachrichten-Signatur, KEINE Deposit-Signatur',
    b2panel.dMsgs === 0 && b2panel.dSigns === 0, b2panel);
  check('ohne Vault-Endpunkte: ehrliche Meldung „Vault-Endpunkte fehlen"',
    /Vault-Endpunkte fehlen/.test(b2panel.msg), b2panel);
  cfg.healthEndpoints = true;

  /* ===================== B1 — prepare-Fehler LAUT ===================== */
  console.log('\n-- B1: register-failed → exakter Grund im Panel UND Toast, keine Deposit-Signatur --');
  cfg.registerOk = false;
  const b1reg = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    const sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.setRoute('limit'); P.setPrice('0.0001');
    P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
    P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
    P.arm();
    await new Promise(r => setTimeout(r, 900));
    const out = { msg: P.msg.textContent, toast: window.__toasts.slice(),
                  dSigns: window.__signs.length - sS };
    P.host.remove();
    return out;
  });
  check('register-failed: Panel nennt den Grund (Registrierung/register)',
    /[Rr]egistrierung|register/.test(b1reg.msg), b1reg);
  check('register-failed: derselbe Grund wird getoastet (nicht verschluckt)',
    b1reg.toast.some(t => /[Rr]egistrierung|register/.test(t)), b1reg.toast);
  check('register-failed: KEINE Deposit-Signatur (Abbruch vor dem Geld)', b1reg.dSigns === 0, b1reg);
  cfg.registerOk = true;

  console.log('\n-- B1: deposit-craft-failed → exakter Grund im Panel UND Toast --');
  cfg.depositOk = false;
  const b1dep = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    const sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.setRoute('limit'); P.setPrice('0.0001');
    P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
    P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
    P.arm();
    await new Promise(r => setTimeout(r, 900));
    const out = { msg: P.msg.textContent, toast: window.__toasts.slice(),
                  dSigns: window.__signs.length - sS };
    P.host.remove();
    return out;
  });
  check('deposit-craft-failed: Panel nennt den Grund (Einzahlung/deposit)',
    /Einzahlung|deposit/.test(b1dep.msg), b1dep);
  check('deposit-craft-failed: derselbe Grund wird getoastet',
    b1dep.toast.some(t => /Einzahlung|deposit/.test(t)), b1dep.toast);
  check('deposit-craft-failed: KEINE Deposit-Signatur', b1dep.dSigns === 0, b1dep);
  cfg.depositOk = true;

  /* ===================== B5 — Fee-Echo bps-only ===================== */
  const armFull = async () => page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    const sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.setRoute('limit'); P.setPrice('0.0001');
    P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
    P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
    P.arm();
    await new Promise(r => setTimeout(r, 1100));
    const out = { msg: P.msg.textContent, klar: P.klar.textContent, ctx: P.ctxText(),
                  dSigns: window.__signs.length - sS };
    P.host.remove();
    return out;
  });

  console.log('\n-- B5: deposit/craft bps OHNE amount_raw → Flow laeuft weiter, Gebuehr „0,5 %" ohne SOL --');
  cfg.feeShape = 'bpsOnly';
  const b5bps = await armFull();
  check('bps-only: Flow signiert die Einzahlung (kein „Gebühr nicht ausgewiesen"-Abbruch)',
    b5bps.dSigns === 1 && !/nicht ausgewiesen/.test(b5bps.msg), b5bps);
  check('bps-only: Gebuehrenzeile zeigt „0,5 %" OHNE SOL-Betrag',
    /Gebühr 0,5 %/.test(b5bps.klar) && !/SOL/.test(b5bps.klar) && !/\(/.test(b5bps.klar.split('·').pop()||''), b5bps);
  check('bps-only: RUN-Zeile „GEBUEHR 0,5 %"', /GEBUEHR 0,5 %/.test(b5bps.ctx), b5bps.ctx);

  console.log('\n-- B5: deposit/craft mit amount_raw → weiter „0,5 % (… SOL)" --');
  cfg.feeShape = 'both';
  const b5both = await armFull();
  check('both: Flow signiert die Einzahlung', b5both.dSigns === 1, b5both);
  check('both: Gebuehrenzeile zeigt „0,5 %" MIT SOL-Betrag in Klammern',
    /Gebühr 0,5 % \(/.test(b5both.klar) && /SOL\)/.test(b5both.klar), b5both);

  console.log('\n-- B5: deposit/craft OHNE fee (kein feeBps) → weiterhin ehrlicher Abbruch --');
  cfg.feeShape = 'none';
  const b5none = await armFull();
  check('kein feeBps: Abbruch „Gebühr nicht ausgewiesen", KEINE Deposit-Signatur',
    /nicht ausgewiesen/.test(b5none.msg) && b5none.dSigns === 0, b5none);
  cfg.feeShape = 'both';

  console.log('\n== v917 Patch B: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
