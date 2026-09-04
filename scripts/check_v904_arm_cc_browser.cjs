/* Smoke-Verifikation v1.0.904 — S5a.3: ARM-SCHALTER & LIVE-BAND INS CONTROL CENTER.
 *
 * Das Prinzip in einem Satz: die Steuerung wandert vollstaendig ins Control
 * Center, das schwebende Live-Band verschwindet von der Stage, und die neue
 * CC-Zustandszeile ist EHRLICH ZU BEIDEN Echtgeld-Toren. Der Trade-Pfad
 * (crWeiche → Adapter) bleibt Bit fuer Bit; das beweist der Spion.
 *
 * Der Kern-Fix und seine bewusste Abweichung von der Spec:
 * im Code sind #crArmSwitch (crArm — Chart-Tap oeffnet ein echtes Swap-Blatt)
 * und cr_arm_v1 (crWeiche/Activation-Panel — echter Fill) ZWEI getrennte
 * Echtgeld-Tore. Die Spec (Test 3) verlangte „LIVE nur wenn cr_arm_v1 ∧
 * crArmSwitch=LIVE" (AND). Das haette „SIM · kein echtes Geld" gezeigt,
 * waehrend ueber das jeweils andere Tor ALLEIN ein echter Fill moeglich
 * bleibt — genau die Unehrlichkeit, die S5a.3 beseitigen soll. Julians
 * Entscheidung (diese Session): OR. Die Zeile steht auf LIVE, sobald EIN Tor
 * scharf ist (crArm.on() ODER crWeiche.flagOn()); sie kann so nie SIM sagen,
 * waehrend echtes Geld fliessen kann.
 *
 * Geprueft (jede scharfe Zeile mit ROT/CRASH/GRUEN-Gegenprobe in der
 * Commit-Message):
 *   1. Stage frei: #crLiveBand wird NICHT in #stage gerendert, auch nach
 *      crArmGrammar.sync bei cr_arm_v1='1'. Kein Ersatz-Signal aussen.
 *   2. CC beherbergt beides: #crArmSwitch + Limit/Wallet sind Nachfahren von
 *      #crCCPop; #crArmBox ist NICHT mehr Nachfahre von .header-picks/.header.
 *   3. Modus-Wahrheit (OR): die volle Wahrheitstabelle beider Tore.
 *   4. Weiche unberuehrt (Spion): alle vier Tore offen → GENAU EIN Aufruf;
 *      cr_arm_v1 aus → kein Aufruf; und der Header-Schalter (crArm SIM/LIVE)
 *      aendert die Trefferbedingung NICHT (Verlagerung hat ihn nicht in die
 *      Weiche verdrahtet).
 *   5. Limit-Persistenz: Limit im CC aendern → cr_arm_limit_v1 aktualisiert.
 *   6. Topbar: #crArmBox aus dem Header raus → header-picks ≤ 5 Elemente.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v904_arm_cc_browser.cjs
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
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if(/\/v1\/token\/safety/.test(url))
      return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/quote/.test(url))
      return J({ ok:true,
        quote:{ in_raw:'50000000', out_raw:'284742418', min_out_raw:'282000000',
                slippage_bps:50, price_impact_pct:'0.0004' },
        platform_fee:{ bps:50, amount_raw:'250000' },
        route:{ hops:2, venues:['Whirlpool','Meteora'] } });
    if(/\/v1\/tx\/swap/.test(url))
      return J({ transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'50000000', out_raw:'284742418', min_out_raw:'282000000',
                slippage_bps:50, price_impact_pct:'0.0004' },
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
    try { localStorage.setItem('cr_broker_v1', JSON.stringify({ name:'Jupiter', type:'dex' })); } catch(_){}
    try { localStorage.removeItem('cr_arm_v1'); } catch(_){}
    window.__signs = [];
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async () => {
              window.__signs.push(1);
              const s = new Uint8Array(64); s[0] = 7; return [{ signature:s }]; } } } });
    });
  };
  await page.addInitScript(initWallet, [ADDR]);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const bv = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())){ const m = /CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/.exec(n.nodeValue); if(m) return [+m[1],+m[2],+m[3]]; }
    return [];
  });
  check('Banner meldet mindestens v1.0.904',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 904)))), bv);

  /* Werkbank: Chart auf einen handelbaren Mint mit echter Kurve stellen, damit
   * crArm.eligible() ueberhaupt LIVE zulaesst; Trust-Badge frisch (Weiche-Tor);
   * dazu das ECHTE renderBlueRouteInputs + ein Adapter-Spion wie in v897/v901. */
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    window.crChartLive = true;                 // echte Kerzen — crArm darf scharf werden
    window._crMintMeta = window._crMintMeta || {};
    window._crMintMeta[mint] = { symbol:'BONK', decimals:5 };
    window.__renderPanel = function(overlay){
      const host = document.createElement('div');
      document.body.appendChild(host);
      overlay = overlay || { kind:'hline', id: Math.floor(Math.random() * 1e6), py:100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const sels = section.querySelectorAll('select');
      const p = { section,
        route: sels[0], side: sels[1],
        size: Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox'),
        armed: section.querySelector('input[type=checkbox]'),
        btn: (label) => Array.from(section.querySelectorAll('button')).find(b => b.textContent === label) };
      window.__panel = p;
      return p;
    };
    window.__installSpy = function(){
      window.__spy = [];
      ChartRunner.sdk.setRealSDK({ marketSwap: function(pp){
        window.__spy.push(JSON.parse(JSON.stringify(pp)));
        return Promise.resolve({ sig:'ARMCC904', inAmount:String(pp.amountRaw), outAmount:'284742418', feeRaw:'250000' });
      }});
    };
  }, [BONK]);

  console.log('\n-- 1 · Stage frei: kein Live-Band --');
  const band = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    try { if(window.crArmGrammar) crArmGrammar.sync(); } catch(_){}
    try { if(window.crPanelKlar && crPanelKlar.syncBand) crPanelKlar.syncBand(true); } catch(_){}
    const b = document.getElementById('crLiveBand');
    const stage = document.getElementById('stage');
    return { band: !!b, inStage: !!(b && b.closest('#stage')),
             stageHtml: stage ? /crLiveBand/.test(stage.innerHTML) : false };
  });
  check('#crLiveBand existiert nicht, auch bei cr_arm_v1=1 nach sync', !band.band, band);
  check('… und ist nirgends Nachfahre von #stage', !band.inStage && !band.stageHtml, band);
  await page.evaluate(() => { try { localStorage.removeItem('cr_arm_v1'); crArmGrammar.sync(); } catch(_){} });

  console.log('\n-- 2 · CC beherbergt Schalter, Limit, Wallet; Header ist frei --');
  const dom = await page.evaluate(() => {
    const inPop = id => { const el = document.getElementById(id); const pop = document.getElementById('crCCPop');
      return !!(el && pop && pop.contains(el)); };
    const box = document.getElementById('crArmBox');
    const hp = document.querySelector('.header-picks');
    const hdr = document.querySelector('.header');
    return { switchInPop: inPop('crArmSwitch'), boxInPop: inPop('crArmBox'),
             limitInPop: inPop('crCCArmLimit'), walletInPop: inPop('crCCArmWallet'),
             stateInPop: inPop('crCCArmState'),
             boxInHeaderPicks: !!(box && hp && hp.contains(box)),
             boxInHeader: !!(box && hdr && hdr.contains(box)) };
  });
  check('#crArmSwitch ist Nachfahre von #crCCPop', dom.switchInPop, dom);
  check('#crArmBox ist Nachfahre von #crCCPop', dom.boxInPop, dom);
  check('Limit-, Wallet- und Zustandsfeld sind Nachfahren von #crCCPop',
    dom.limitInPop && dom.walletInPop && dom.stateInPop, dom);
  check('#crArmBox ist NICHT mehr Nachfahre von .header-picks', !dom.boxInHeaderPicks, dom);
  check('… und nicht Nachfahre von .header', !dom.boxInHeader, dom);

  console.log('\n-- 3 · Modus-Wahrheit (OR: ehrlich zu beiden Toren) --');
  async function armState(flag, mode){
    return page.evaluate(([flag, mode]) => {
      if(flag) localStorage.setItem('cr_arm_v1', '1'); else localStorage.removeItem('cr_arm_v1');
      try { crArm.set(!!mode); } catch(_){}
      try { _crCCRenderArm(); } catch(_){}
      const el = document.getElementById('crCCArmState');
      return { live: !!(el && el.classList.contains('live')), txt: el ? el.textContent : '',
               armOn: (function(){ try { return !!crArm.on(); } catch(_){ return false; } })(),
               flagOn: (function(){ try { return !!crWeiche.flagOn(); } catch(_){ return false; } })() };
    }, [flag, mode]);
  }
  const s00 = await armState(false, false);
  check('kein Tor scharf → Zeile SIM (kein .live)', !s00.live && /SIM/.test(s00.txt) && /kein echtes Geld/.test(s00.txt), s00);
  const s10 = await armState(true, false);
  check('nur cr_arm_v1 scharf (Header SIM) → Zeile LIVE (der ehrliche OR-Fall)',
    s10.flagOn && !s10.armOn && s10.live && /ECHTES GELD/.test(s10.txt), s10);
  const s01 = await armState(false, true);
  check('nur crArm.on() scharf (cr_arm_v1 aus) → Zeile LIVE',
    s01.armOn && !s01.flagOn && s01.live && /ECHTES GELD/.test(s01.txt), s01);
  const s11 = await armState(true, true);
  check('beide Tore scharf → Zeile LIVE, mit LIMIT und Wallet',
    s11.live && /ECHTES GELD/.test(s11.txt) && /LIMIT/.test(s11.txt) && /Wallet/.test(s11.txt), s11);
  await page.evaluate(() => { try { crArm.set(false); localStorage.removeItem('cr_arm_v1'); _crCCRenderArm(); } catch(_){} });

  console.log('\n-- 4 · Weiche unberuehrt (Spion) --');
  // Alle vier Tore offen, Header-Schalter auf SIM: die Weiche darf trotzdem
  // GENAU EINMAL feuern — der Header-Schalter ist kein Weiche-Tor.
  const spyAllOpenSim = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    try { crArm.set(false); } catch(_){}      // Header-Schalter SIM
    window.__installSpy();
    const p = window.__renderPanel();
    p.size.value = '0,05'; p.size.dispatchEvent(new Event('change'));
    p.armed.checked = true; p.armed.dispatchEvent(new Event('change'));
    p.btn('Arm / Update').click();
    return true;
  });
  await page.waitForTimeout(1200);
  const spy1 = await page.evaluate(() => (window.__spy || []).length);
  check('alle vier Tore offen (Header SIM) → GENAU EIN Adapter-Aufruf', spy1 === 1, { spy1 });

  // cr_arm_v1 aus → kein Aufruf.
  const spyFlagOff = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    window.__installSpy();
    const p = window.__renderPanel();
    p.size.value = '0,05'; p.size.dispatchEvent(new Event('change'));
    p.armed.checked = true; p.armed.dispatchEvent(new Event('change'));
    p.btn('Arm / Update').click();
    return true;
  });
  await page.waitForTimeout(900);
  const spy0 = await page.evaluate(() => (window.__spy || []).length);
  check('cr_arm_v1 aus → KEIN Adapter-Aufruf (Weiche-Tor 1 zu)', spy0 === 0, { spy0 });

  console.log('\n-- 5 · Limit-Persistenz aus dem CC --');
  const lim = await page.evaluate(() => {
    const el = document.getElementById('crCCArmLimit');
    el.value = '0,25';
    el.dispatchEvent(new Event('change'));
    return { stored: localStorage.getItem('cr_arm_limit_v1'),
             weiche: (function(){ try { return String(crWeiche.limitLamports()); } catch(_){ return ''; } })() };
  });
  check('Limit 0,25 SOL im CB → cr_arm_limit_v1 = 250000000 Lamports', lim.stored === '250000000', lim);
  check('… und die Weiche liest genau diesen Wert', lim.weiche === '250000000', lim);

  console.log('\n-- 6 · Topbar: Header sinkt auf ≤ 5 Elemente --');
  const topbar = await page.evaluate(() => {
    const hp = document.querySelector('.header-picks');
    return { children: hp ? hp.children.length : -1,
             hasArmbox: !!(hp && hp.querySelector('#crArmBox')) };
  });
  check('header-picks hat hoechstens 5 Elemente', topbar.children >= 0 && topbar.children <= 5, topbar);
  check('… und enthaelt kein #crArmBox mehr', !topbar.hasArmbox, topbar);

  console.log('\n-- 7 · Buy/Sell-Blatt verdeckt das Popover nicht (z-index-Regression) --');
  // Der Schalter wohnt jetzt IM Popover (z-index 99999); das Handels-Blatt
  // (#crArmSheet, z-index 60) wuerde sonst DAHINTER aufgehen. _crArmOpenSheet
  // muss das Popover schliessen. Wallet+Mint+echte Kurve stehen aus der
  // Werkbank, also laesst crArm sich scharf schalten.
  const sheet = await page.evaluate(() => {
    const pop = document.getElementById('crCCPop');
    if(pop) pop.classList.add('on');                 // Popover offen
    localStorage.removeItem('cr_arm_v1');
    try { crArm.set(true); } catch(_){}
    const armed = (function(){ try { return !!crArm.on(); } catch(_){ return false; } })();
    try { _crArmOpenSheet('kauf'); } catch(e){ return { err: String((e && e.message) || e) }; }
    const sh = document.getElementById('crArmSheet');
    return { armed, sheetOpen: !!(sh && sh.classList.contains('on')),
             popStillOpen: !!(pop && pop.classList.contains('on')) };
  });
  check('crArm scharf → Handels-Blatt oeffnet', sheet.armed && sheet.sheetOpen, sheet);
  check('… und das Control-Center-Popover ist danach geschlossen (kein Verdecken)', !sheet.popStillOpen, sheet);
  await page.evaluate(() => { try { crArm.set(false); if(window._crArmCloseSheet) _crArmCloseSheet(); } catch(_){} });

  console.log('\n== ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
