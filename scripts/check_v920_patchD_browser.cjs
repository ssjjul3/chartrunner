/* Smoke-Verifikation v1.0.920 — Patch D (CLIENT): output_mint am deposit/craft.
 *
 * Ein-Feld-Fix in genau zwei Funktionen, KEIN Trade-Pfad-Change. Befund
 * (Handy, Diagnose-Spur 06.09. 00:01): Schritte 1–7 ok (preflight, resolveTrade,
 * decide, challenge, signMessage, verify, register), Schritt 8 depositCraft →
 * vault-contract-invalid. Der Worker (Patch C) verlangt am Deposit wallet,
 * input_mint, output_mint (base58) und amount_raw; order_sub_type optional;
 * cluster faehrt nicht mit. Bis v919 fehlte output_mint im Body.
 *
 * Geprueft wird der Body, der die Seite tatsaechlich VERLAESST (Spion im
 * page.route-Handler auf req.postDataJSON()), nicht was der Client meint zu
 * senden. Die Gegenproben MUESSEN ROT koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   D1  depositCraft ohne outputMint / gleiche Mints → { error:'no-mint' },
 *       KEIN Request. (Mutation: Mint-Gate zurueck auf `!opts.inputMint` → rot.)
 *   D2  depositCraft-Body traegt output_mint + order_sub_type, KEIN cluster.
 *       (Mutation: `output_mint:` aus dem Body entfernen → rot; `cluster:` wieder
 *       hinein → rot.)
 *   D3  crVaultLimit.prepare reicht opts.outputMint an depositCraft durch;
 *       handle.opts behaelt ihn. (Mutation: `outputMint: opts.outputMint` im
 *       prepare-Aufruf entfernen → D3 rot, weil D1 dann no-mint liefert.)
 *   D4  commit → orders/price nennt DENSELBEN output_mint wie der Deposit.
 *       (Mutation: in ordersPrice output_mint: opts.inputMint → rot.)
 *   D5  Panel-Flow (Limit-HLine, Arm) sendet output_mint = aktuelle Mint,
 *       Gebuehr „0,5 %", genau EINE Deposit-Signatur — die Strecke aus dem
 *       Handy-Befund, diesmal bis Schritt 8 durch.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v920_patchD_browser.cjs
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
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-920';
const VAULT_PATHS = ['/v1/auth/challenge','/v1/auth/verify','/v1/vault/register',
  '/v1/deposit/craft','/v1/orders/price','/v1/orders/active'];

/* Der Spion: jeder Body, der deposit/craft bzw. orders/price erreicht —
 * Node-seitig, also das, was wirklich ueber die Leitung geht. */
const seen = { deposit: [], price: [] };
const lastDep   = () => seen.deposit[seen.deposit.length - 1] || null;
const lastPrice = () => seen.price[seen.price.length - 1] || null;
function bodyOf(req){ try { return req.postDataJSON(); } catch(_){ return { __unparsable: req.postData() }; } }

/* Der Worker-Vertrag aus Patch C — als Fixture NACHGEBAUT, damit die Fixture
 * genau das ablehnt, was der echte Worker am 06.09. abgelehnt hat. Das ist
 * eine Nachbildung, keine Messung: der echte Vertrag steht im Worker. */
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function depositContract(b){
  if(!b || typeof b !== 'object') return 'vault-contract-invalid';
  if(!b.wallet || !b.input_mint || !b.output_mint || !b.amount_raw) return 'vault-contract-invalid';
  if(!B58.test(String(b.input_mint)) || !B58.test(String(b.output_mint))) return 'vault-contract-invalid';
  if(b.input_mint === b.output_mint) return 'vault-contract-invalid';
  if(!/^[1-9][0-9]*$/.test(String(b.amount_raw))) return 'vault-contract-invalid';
  if(b.order_sub_type != null && !/^(single|oco|otoco)$/.test(String(b.order_sub_type))) return 'vault-contract-invalid';
  return null;
}

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
      return J({ ok:true, version:'tx v1.22', signs:false, kill:false,
        endpoints: ['/v1/quote','/v1/tx/swap','/v1/tx/status','/v1/rpc/balance'].concat(VAULT_PATHS.map(p => 'POST ' + p)) });
    }
    if(/\/v1\/auth\/challenge/.test(url)) return J({ ok:true, challenge:'CR-CHALLENGE-920-abc', expires_in_s:120 });
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok:true, registered:true });
    if(/\/v1\/deposit\/craft/.test(url)){
      const b = bodyOf(req); seen.deposit.push(b);
      const bad = depositContract(b);
      if(bad) return J({ ok:false, error:bad, note:'deposit/craft braucht wallet, input_mint, output_mint (base58) und amount_raw; order_sub_type optional single|oco|otoco' }, 400);
      return J({ ok:true, transaction:'AQIDBAU=', expires_in_s:40, deposit:{ amount_raw:String(b.amount_raw) }, fee:{ bps:50 } });
    }
    if(/\/v1\/orders\/price/.test(url)){
      const b = bodyOf(req); seen.price.push(b);
      return J({ ok:true, orderPubkey:'ORDER920', status:'Open', fee:{ bps:50 } });
    }
    if(/\/v1\/orders\/active/.test(url))  return J({ ok:true, orders:[{ orderKey:'ORDER920', status:'Open' }] });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/v1\/token\/safety/.test(url))  return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    return J({});
  });

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = []; window.__msgs = [];
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
  check('Banner meldet mindestens v1.0.920',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 920)))), bv);

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
    crVaultApi._pfReset(); crVaultApi.clear();
    const au = await crVaultApi.ensureAuth(crSigner.active().address, msg => crSigner.signMessage(msg));
    return { mint:m, ready: !!(crSigner.info() && crSigner.info().ready), badge: crWeiche.badgeGate(),
             auth: !!(au && !au.error), tok: crVaultApi.token() };
  }, [BONK]);
  check('Sol-Asset aktiv, badgeGate offen', setup.mint === BONK && setup.badge && setup.badge.ok === true, setup);
  check('Wallet signierfaehig, JWT im Speicher', setup.ready === true && setup.auth && setup.tok === JWT, setup);

  /* ===================== D1 — Mint-Gate: kein Request ohne outputMint ===================== */
  console.log('\n-- D1: depositCraft ohne outputMint / gleiche Mints → no-mint, KEIN Request --');
  let n0 = seen.deposit.length;
  const d1 = await page.evaluate(async ([sol]) => {
    const a = await crVaultApi.depositCraft({ wallet: crSigner.active().address, inputMint: sol, amountRaw: '1000000' });
    const b = await crVaultApi.depositCraft({ wallet: crSigner.active().address, inputMint: sol, outputMint: sol, amountRaw: '1000000' });
    const c = await crVaultApi.depositCraft({ wallet: crSigner.active().address, outputMint: sol, amountRaw: '1000000' });
    return { a, b, c };
  }, [SOL]);
  check('ohne outputMint → { error:"no-mint" }', d1.a && d1.a.error === 'no-mint', d1.a);
  check('inputMint === outputMint → { error:"no-mint" }', d1.b && d1.b.error === 'no-mint', d1.b);
  check('ohne inputMint → { error:"no-mint" }', d1.c && d1.c.error === 'no-mint', d1.c);
  check('… und KEIN deposit/craft-Request verliess die Seite', seen.deposit.length === n0, seen.deposit.length - n0);

  /* ===================== D2 — der Body ===================== */
  console.log('\n-- D2: depositCraft-Body traegt output_mint + order_sub_type, KEIN cluster --');
  n0 = seen.deposit.length;
  const d2 = await page.evaluate(async ([sol, bonk]) => {
    const r = await crVaultApi.depositCraft({ wallet: crSigner.active().address, inputMint: sol, outputMint: bonk, amountRaw: '1000000' });
    return r;
  }, [SOL, BONK]);
  const d2b = lastDep();
  check('genau EIN Request', seen.deposit.length === n0 + 1, seen.deposit.length - n0);
  check('Fixture-Vertrag (Patch C) akzeptiert den Body → transaction im Echo',
    d2 && !d2.error && d2.transaction === 'AQIDBAU=', d2);
  check('Body: wallet, input_mint, output_mint, amount_raw als Strings',
    d2b && d2b.wallet === ADDR && d2b.input_mint === SOL && d2b.output_mint === BONK && d2b.amount_raw === '1000000', d2b);
  check('Body: order_sub_type Default "single"', d2b && d2b.order_sub_type === 'single', d2b);
  check('Body: KEIN cluster-Feld mehr', d2b && !('cluster' in d2b), d2b);
  check('Body: keine unerwarteten Schluessel',
    d2b && Object.keys(d2b).sort().join(',') === 'amount_raw,input_mint,order_sub_type,output_mint,wallet', d2b && Object.keys(d2b));
  const d2oco = await page.evaluate(async ([sol, bonk]) =>
    crVaultApi.depositCraft({ wallet: crSigner.active().address, inputMint: sol, outputMint: bonk, amountRaw: '1000000', orderSubType: 'oco' }), [SOL, BONK]);
  check('orderSubType "oco" wird durchgereicht', d2oco && !d2oco.error && lastDep() && lastDep().order_sub_type === 'oco', lastDep());

  /* ===================== D3 — prepare reicht outputMint durch ===================== */
  console.log('\n-- D3: crVaultLimit.prepare → deposit/craft nennt opts.outputMint --');
  n0 = seen.deposit.length;
  const d3 = await page.evaluate(async ([sol, bonk]) => {
    window.__pr = await crVaultLimit.prepare({ inputMint: sol, outputMint: bonk, amountRaw: '1000000',
      side: 'buy', triggerPrice: '0.0001', slippageBps: 50 });
    const pr = window.__pr;
    return { ok: !!(pr && pr.ok), error: pr && pr.error, detail: pr && pr.detail, feeBps: pr && pr.feeBps,
             hOut: pr && pr.handle && pr.handle.opts && pr.handle.opts.outputMint,
             hIn:  pr && pr.handle && pr.handle.opts && pr.handle.opts.inputMint,
             hSub: pr && pr.handle && pr.handle.opts && pr.handle.opts.orderSubType };
  }, [SOL, BONK]);
  const d3b = lastDep();
  check('prepare laeuft bis zum Gebuehren-Echo (ok, feeBps 50)', d3.ok && d3.feeBps === 50, d3);
  check('genau EIN deposit/craft-Request aus prepare', seen.deposit.length === n0 + 1, seen.deposit.length - n0);
  check('deposit/craft-Body aus prepare: output_mint === opts.outputMint',
    d3b && d3b.output_mint === BONK && d3b.input_mint === SOL, d3b);
  check('deposit/craft-Body aus prepare: order_sub_type "single", kein cluster',
    d3b && d3b.order_sub_type === 'single' && !('cluster' in d3b), d3b);
  check('handle.opts behaelt outputMint (fuer commit → ordersPrice)', d3.hOut === BONK && d3.hIn === SOL, d3);

  /* ===================== D4 — commit nennt denselben Mint ===================== */
  console.log('\n-- D4: commit → orders/price nennt DENSELBEN output_mint wie der Deposit --');
  const p0 = seen.price.length;
  const d4 = await page.evaluate(async () => {
    const s0 = window.__signs.length;
    const r = await crVaultLimit.commit(window.__pr.handle);
    return { ok: !!(r && r.ok), error: r && r.error, orderPubkey: r && r.orderPubkey, dSigns: window.__signs.length - s0 };
  });
  const d4p = lastPrice();
  check('commit ok, genau EINE Deposit-Signatur', d4.ok && d4.dSigns === 1 && d4.orderPubkey === 'ORDER920', d4);
  check('genau EIN orders/price-Request', seen.price.length === p0 + 1, seen.price.length - p0);
  check('orders/price: output_mint === deposit/craft output_mint',
    d4p && d3b && d4p.output_mint === d3b.output_mint && d4p.output_mint === BONK, { price: d4p, deposit: d3b });
  check('orders/price: input_mint === deposit/craft input_mint',
    d4p && d3b && d4p.input_mint === d3b.input_mint && d4p.input_mint === SOL, { price: d4p, deposit: d3b });

  /* ===================== D5 — Panel-Flow (die Handy-Strecke) ===================== */
  console.log('\n-- D5: Limit-HLine → Arm → Trace bis Schritt 8 durch, output_mint = aktuelle Mint --');
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
      const msg  = section.querySelector('[data-cr-panel-msg]');
      const klar = section.querySelector('[data-cr-panel-klar]');
      return { host, section, route, armed, size, msg, klar,
               setRoute(v){ route.value = v; route.dispatchEvent(new Event('change')); },
               setPrice(p){ let inp = null;
                 section.querySelectorAll('label').forEach(l => { const s=l.querySelector('span'); if(s && /^price$/i.test((s.textContent||'').trim())) inp = l.querySelector('input'); });
                 if(inp){ inp.value = p; inp.dispatchEvent(new Event('input')); return true; }
                 return false; },
               arm(){ let b = null; section.querySelectorAll('button').forEach(x => { if(/arm/i.test(x.textContent||'')) b = x; }); if(b) b.click(); } };
    };
  });
  n0 = seen.deposit.length; const p1 = seen.price.length;
  const d5 = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    const sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.setRoute('limit'); P.setPrice('0.0001');
    P.size.value = '0,05'; P.size.dispatchEvent(new Event('change'));
    P.armed.checked = true; P.armed.dispatchEvent(new Event('change'));
    P.arm();
    await new Promise(r => setTimeout(r, 1300));
    const out = { msg: P.msg.textContent, klar: P.klar.textContent, dSigns: window.__signs.length - sS,
                  toasts: window.__toasts.slice(-4) };
    P.host.remove();
    return out;
  });
  const d5b = lastDep(), d5p = lastPrice();
  check('Panel: genau EIN deposit/craft-Request, genau EIN orders/price-Request',
    seen.deposit.length === n0 + 1 && seen.price.length === p1 + 1, { dep: seen.deposit.length - n0, price: seen.price.length - p1 });
  check('Panel: deposit/craft-Body nennt output_mint = aktuelle Mint (BONK), input_mint = SOL',
    d5b && d5b.output_mint === BONK && d5b.input_mint === SOL && !('cluster' in d5b), d5b);
  check('Panel: Gebuehr „0,5 %" steht, KEIN vault-contract-invalid, KEIN deposit-craft-failed',
    /Gebühr 0,5 %/.test(d5.klar) && !/vault-contract-invalid|deposit-craft-failed/.test(d5.msg + ' ' + d5.toasts.join(' ')), d5);
  check('Panel: genau EINE Deposit-Signatur (Schritt 8 durch, Weiche unveraendert)', d5.dSigns === 1, d5);
  check('Panel: orders/price nennt denselben output_mint wie der Deposit',
    d5p && d5b && d5p.output_mint === d5b.output_mint, { price: d5p, deposit: d5b });

  console.log('\n== v920 Patch D: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
