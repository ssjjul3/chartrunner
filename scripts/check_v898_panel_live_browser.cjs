/* Smoke-Verifikation v1.0.898 — S5a PR 2: ACTIVATION-PANEL → ECHTER CONNECTOR.
 *
 * Das Prinzip in einem Satz: DIE VORHANDENE UI WIRD VERDRAHTET, NICHT
 * ERSETZT — und die RUN-Zeile sagt die Wahrheit. Geprueft wird das ECHTE
 * Panel (renderBlueRouteInputs, direkt gerendert und bedient), nicht ein
 * Nachbau.
 *
 * Scharf geprueft wird, was Geld oder Wahrheit kostet, wenn es fehlt:
 *   · RUN-Zeile: ohne globales ARM exakt der Paper-Text (paper connector);
 *     mit ARM + Market + Checkbox → JUPITER LIVE mit GEBUEHR aus dem
 *     platform_fee-Echo des Quotes — VOR dem Klick sichtbar.
 *   · Fehlt platform_fee trotz Live → „GEBUEHR NICHT AUSGEWIESEN" und der
 *     Arm-Klick fuehrt NICHTS aus.
 *   · Arm/Update (alles offen) → GENAU EIN Adapter-Aufruf mit dem rohen
 *     SOL-Betrag aus SIZE und den bps aus SLIPPAGE GUARD % — und ein
 *     Journal-Eintrag im VORHANDENEN Journal: Quelle 'live', sig, Gebuehr.
 *   · Close trade → Gegen-Swap ueber denselben Pfad: Mints getauscht,
 *     Menge = outAmount des Fills.
 *   · Wallet-Reject → Meldung, KEIN Journal-Eintrag.
 *   · safety-blocked → der GRUND aus der Worker-Antwort steht in der
 *     Meldung (der Adapter dampft ihn nicht mehr zu swap-failed ein).
 *   · Route != Market bei Live-Absicht → P3-Meldung, kein Aufruf.
 *   · Ohne globales ARM ist der Arm-Klick das heutige Verhalten: Route-
 *     Metadaten, kein Trade, kein Journal-Eintrag, keine Panel-Meldung.
 *   · Ende-zu-Ende einmal mit dem ECHTEN Adapter gegen gemockte Worker:
 *     genau eine Wallet-Signatur, Journal traegt sig + fee.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v898_panel_live_browser.cjs
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
    const cfg = await page.evaluate(() => window.__v898 || {}).catch(() => ({}));

    if(/\/v1\/token\/safety/.test(url))
      return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/quote/.test(url))
      return J(cfg.quote || { ok:true,
        quote:{ in_raw:'100000000', out_raw:'284742418', min_out_raw:'282000000',
                slippage_bps:75, price_impact_pct:'0.0004' },
        platform_fee:{ bps:50, amount_raw:'500000' },
        route:{ hops:2, venues:['Whirlpool','Meteora'] } });
    if(/\/v1\/tx\/swap/.test(url))
      return J(cfg.swap || { transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'100000000', out_raw:'284742418', min_out_raw:'282000000',
                slippage_bps:75, price_impact_pct:'0.0004' },
        cap:{ state:'none' }, fee:{ base_lamports:5000, priority_lamports:null },
        route:{ platform_fee_bps:50, hops:2, venues:['Whirlpool','Meteora'] },
        checked:{ instructions_match_request:true, level:'form+amount' } });
    if(/\/v1\/tx\/status/.test(url))     return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/ohlc/.test(url))           return J({ ok:true, candles:[], ref:null, gated:0 });
    if(/\/v1\/rpc\/balance/.test(url))   return J({ ok:true, lamports:'900000000', cluster:'mainnet' });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true,
      holdings:[{ mint:BONK, symbol:'BONK', decimals:5, amount_raw:'123456789', spendable_amount_raw:'123456789' }] });
    if(/\/health/.test(url)) return J({ ok:true, version:'tx v1.19', signs:false, kill:false,
      swap:{ cap:{ state:'none' } }, token_safety:{ stage:2, gates_swap:true, gate:{ kill:false } },
      platform_fee:{ accounts:[{ symbol:'WSOL', state:'exists' }] } });
    return J({});
  });

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    window.__signs = [];
    window.__rejectSign = false;
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async (i) => {
              if(window.__rejectSign) throw new Error('User rejected the request.');
              window.__signs.push({ chain: i && i.chain });
              const s = new Uint8Array(64); s[0] = 7; return [{ signature:s }]; } } } });
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
  check('Banner meldet mindestens v1.0.898',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 898)))), bv);

  /* Panel-Werkbank: rendert das ECHTE renderBlueRouteInputs in einen
   * frischen Container und liefert Griffe auf seine Controls. */
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    window.__panel = null;
    window.__renderPanel = function(overlayId){
      const host = document.createElement('div');
      document.body.appendChild(host);
      const overlay = { kind:'hline', id: overlayId, py:100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const sels = section.querySelectorAll('select');
      const p = {
        section, overlay,
        route: sels[0], side: sels[1],
        size: Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox'),
        armed: section.querySelector('input[type=checkbox]'),
        slip: Array.from(section.querySelectorAll('input')).find(i => i.placeholder === 'optional') || null,
        ctx: Array.from(section.querySelectorAll('div')).find(d => /^Run: /.test(d.textContent || '')),
        msg: section.querySelector('[data-cr-panel-msg]'),
        btn: (label) => Array.from(section.querySelectorAll('button')).find(b => b.textContent === label),
      };
      window.__panel = p;
      return { hasAll: !!(p.route && p.side && p.size && p.armed && p.ctx && p.msg && p.btn('Arm / Update') && p.btn('Close trade')) };
    };
    window.__jrnCount = () => _crJrnLoad().manual.length;
    window.__spy = [];
    window.__installSpy = function(result){
      ChartRunner.sdk.setRealSDK({ marketSwap: function(pp){
        window.__spy.push(JSON.parse(JSON.stringify(pp)));
        return Promise.resolve(result || { sig:'PANELSIG', inAmount:String(pp.amountRaw), outAmount:'42000', feeRaw:'5' });
      }});
    };
  }, [BONK]);

  console.log('\n-- RUN-Zeile: Paper bleibt Paper --');
  let r0 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const ok = window.__renderPanel(9001).hasAll;
    const p = window.__panel;
    p.armed.checked = true;
    p.armed.dispatchEvent(new Event('change'));
    return { ok, ctx: p.ctx.textContent };
  });
  check('Panel gerendert (alle Controls gefunden)', r0.ok, r0);
  check('ohne globales ARM: RUN-Zeile zeigt paper connector', /paper connector/i.test(r0.ctx), r0.ctx);

  console.log('\n-- RUN-Zeile: JUPITER LIVE mit Gebuehr VOR dem Klick --');
  let r1 = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window.__renderPanel(9002);
    const p = window.__panel;
    p.size.value = '0.1';
    if(p.slip){ p.slip.value = '0.75'; p.slip.dispatchEvent(new Event('input')); }
    p.armed.checked = true;
    p.armed.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(600);
  r1 = await page.evaluate(() => ({ ctx: window.__panel.ctx.textContent, msg: window.__panel.msg.textContent }));
  check('RUN-Zeile zeigt JUPITER LIVE', /JUPITER LIVE/.test(r1.ctx), r1.ctx);
  check('… mit GEBUEHR 0,5 % aus dem platform_fee-Echo', /GEBUEHR 0,5 %/.test(r1.ctx), r1.ctx);
  check('… und dem Betrag in SOL (500000 Lamports)', /SOL\)/.test(r1.ctx), r1.ctx);

  console.log('\n-- Gebuehr nicht ausgewiesen → Arm verweigert --');
  await page.evaluate(() => {
    window.__v898 = { quote: { ok:true,
      quote:{ in_raw:'100000000', out_raw:'284742418', min_out_raw:'282000000', slippage_bps:75 },
      route:{ hops:2, venues:['Whirlpool'] } } };
    window.__installSpy();
    const p = window.__panel;
    p.armed.dispatchEvent(new Event('change'));       // Re-Quote ohne platform_fee
  });
  await page.waitForTimeout(600);
  let r2 = await page.evaluate(() => {
    const p = window.__panel;
    const before = window.__spy.length;
    p.btn('Arm / Update').click();
    return { ctx: p.ctx.textContent, before };
  });
  await page.waitForTimeout(600);
  r2 = Object.assign(r2, await page.evaluate(() => ({
    after: window.__spy.length, msg: window.__panel.msg.textContent, jrn: window.__jrnCount() })));
  check('RUN-Zeile sagt GEBUEHR NICHT AUSGEWIESEN', /GEBUEHR NICHT AUSGEWIESEN/.test(r2.ctx), r2.ctx);
  check('Arm-Klick fuehrt NICHTS aus (kein Adapter-Aufruf)', r2.after === r2.before, r2);
  check('… mit Verweigerungs-Meldung', /refused|verweigert/i.test(r2.msg), r2.msg);

  console.log('\n-- Arm/Update: alles offen → genau EIN Aufruf + Journal live --');
  const jrnBefore = await page.evaluate(() => { window.__v898 = {}; return window.__jrnCount(); });
  await page.evaluate(() => { window.__panel.btn('Arm / Update').click(); });
  await page.waitForTimeout(900);
  const r3 = await page.evaluate(() => {
    const rows = _crJrnLoad().manual;
    const last = rows[rows.length - 1] || null;
    return { calls: window.__spy.length, call: window.__spy[0] || null,
             jrn: rows.length, last, msg: window.__panel.msg.textContent };
  });
  check('genau EIN Adapter-Aufruf', r3.calls === 1, r3.calls);
  check('Aufruf traegt SOL→Mint, 0.1 SOL roh, 75 bps aus SLIPPAGE GUARD %',
    r3.call && r3.call.inputMint === SOL && r3.call.outputMint === BONK
    && r3.call.amountRaw === '100000000' && r3.call.slippageBps === 75, r3.call);
  check('Journal +1 im VORHANDENEN Store', r3.jrn === jrnBefore + 1, { before: jrnBefore, after: r3.jrn });
  check('Eintrag: Quelle live, sig, Gebuehr',
    r3.last && r3.last.source === 'live' && r3.last.sig === 'PANELSIG' && r3.last.feeRaw === '5'
    && r3.last.auto === true && /LIVE · sig PANELSIG/.test(r3.last.notes || ''), r3.last);
  check('Panel meldet den Fill mit sig', /sig PANELSIG/.test(r3.msg), r3.msg);

  console.log('\n-- Close trade: Gegen-Swap mit getauschten Mints --');
  await page.evaluate(() => { window.__panel.btn('Close trade').click(); });
  await page.waitForTimeout(900);
  const r4 = await page.evaluate(() => ({ calls: window.__spy.length, call: window.__spy[1] || null,
    msg: window.__panel.msg.textContent, jrn: window.__jrnCount() }));
  check('Gegen-Swap = zweiter Adapter-Aufruf', r4.calls === 2, r4.calls);
  check('… Mints getauscht, Menge = outAmount des Fills (42000)',
    r4.call && r4.call.inputMint === BONK && r4.call.outputMint === SOL
    && r4.call.amountRaw === '42000' && r4.call.slippageBps === 75, r4.call);
  check('Gegen-Swap landet ebenfalls im Journal', r4.jrn === jrnBefore + 2, r4.jrn);

  console.log('\n-- Wallet-Reject: Meldung, KEIN Journal-Eintrag --');
  const r5 = await page.evaluate(() => {
    window.__installSpy({ error:'rejected' });
    const before = window.__jrnCount();
    window.__panel.btn('Arm / Update').click();
    return { before };
  });
  await page.waitForTimeout(900);
  const r5b = await page.evaluate(() => ({ jrn: window.__jrnCount(), msg: window.__panel.msg.textContent }));
  check('Reject → Meldung (nichts gesendet)', /wallet/i.test(r5b.msg) && /nothing|nichts/i.test(r5b.msg), r5b.msg);
  check('Reject → KEIN Journal-Eintrag', r5b.jrn === r5.before, { before: r5.before, after: r5b.jrn });

  console.log('\n-- safety-blocked: der Grund aus der Worker-Antwort --');
  await page.evaluate(() => {
    window.__installSpy({ error:'safety-blocked', detail:'freeze authority active',
      safety:{ checked:{ verdict:'deny' } } });
    window.__panel.btn('Arm / Update').click();
  });
  await page.waitForTimeout(900);
  const r6 = await page.evaluate(() => window.__panel.msg.textContent);
  check('safety-blocked-Meldung traegt den Grund und die Exit-Zusage',
    /freeze authority active/.test(r6) && /exit/i.test(r6), r6);

  console.log('\n-- Route != Market bei Live-Absicht → P3-Meldung, kein Aufruf --');
  const r7 = await page.evaluate(() => {
    const p = window.__panel;
    const before = window.__spy.length;
    p.route.value = 'bracket';
    p.route.dispatchEvent(new Event('change'));
    p.btn('Arm / Update').click();
    return { before, msg: p.msg.textContent, calls: window.__spy.length };
  });
  check('kein Adapter-Aufruf', r7.calls === r7.before, r7);
  check('P3-Meldung im Panel', /P3/.test(r7.msg), r7.msg);

  console.log('\n-- Ohne globales ARM: der Arm-Klick ist das heutige Verhalten --');
  const r8 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    window.__renderPanel(9003);
    const p = window.__panel;
    p.size.value = '0.1';
    p.armed.checked = true;
    const spyBefore = window.__spy.length, jrn = window.__jrnCount();
    p.btn('Arm / Update').click();
    const st = (typeof crRouteStateForObject === 'function') ? crRouteStateForObject(p.overlay) : null;
    return { spyBefore, jrn, armedState: !!(st && st.active), msgShown: p.msg.style.display !== 'none' };
  });
  await page.waitForTimeout(500);
  const r8b = await page.evaluate(() => ({ spy: window.__spy.length, jrn: window.__jrnCount() }));
  check('Route-Metadaten wie bisher gearmt', r8.armedState === true, r8);
  check('kein Trade, kein Journal-Eintrag, keine Panel-Meldung',
    r8b.spy === r8.spyBefore && r8b.jrn === r8.jrn && r8.msgShown === false, { r8, r8b });

  console.log('\n-- Ende-zu-Ende: echter Adapter, eine Wallet-Signatur --');
  const r9 = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    ChartRunner.sdk.setRealSDK(window.crRealAdapter);
    window.__renderPanel(9004);
    const p = window.__panel;
    p.size.value = '0.05';
    p.armed.checked = true;
    const signs = window.__signs.length, jrn = window.__jrnCount();
    p.btn('Arm / Update').click();
    return { signs, jrn };
  });
  await page.waitForTimeout(1200);
  const r9b = await page.evaluate(() => {
    const rows = _crJrnLoad().manual;
    const last = rows[rows.length - 1] || null;
    return { signs: window.__signs.length, jrn: rows.length, last, msg: window.__panel.msg.textContent };
  });
  check('genau EINE Wallet-Signatur', r9b.signs === r9.signs + 1, { before: r9.signs, after: r9b.signs });
  check('Journal-Eintrag mit echtem sig + Gebuehr aus dem Quote-Echo',
    r9b.last && r9b.last.source === 'live' && typeof r9b.last.sig === 'string' && r9b.last.sig.length > 20
    && r9b.last.feeRaw === '500000', r9b.last);

  console.log('\n-- Slippage-Mapping (Einheit: % → bps) --');
  const r10 = await page.evaluate(() => [crPanelLive.slipBps('0.75'), crPanelLive.slipBps(''), crPanelLive.slipBps('x'), crPanelLive.slipBps('1,5')]);
  check('0.75 % → 75 bps · leer → 50 · Unsinn → null · 1,5 % → 150',
    r10[0] === 75 && r10[1] === 50 && r10[2] === null && r10[3] === 150, r10);

  console.log('\n== v898 Panel-Live: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
