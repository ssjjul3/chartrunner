/* Smoke-Verifikation v1.0.904 — S5a.3: ARM-SCHALTER & LIVE-BAND INS
 * CONTROL CENTER.
 *
 * Reine UI-Verlagerung + eine Wahrheits-Korrektur. Der Trade-Pfad ist NICHT
 * angefasst — die Weiche (crWeiche) liest weiter dasselbe eine Bit cr_arm_v1,
 * nur wird es jetzt im Control Center gesetzt statt im Wallet-Fenster.
 *
 * Scharf geprueft wird, was Wahrheit oder Geld kostet, wenn es fehlt:
 *   1. STAGE FREI: #crLiveBand wird nicht in #stage gerendert (auch bei
 *      cr_arm_v1='1'), kein Ersatz-Signal aussen.
 *   2. CC IST DIE EINZIGE ARM-HEIMAT: Checkbox, #crArmSwitch, Limit- und
 *      Wallet-/Zustands-Feld sind Nachfahren von #crCCPop. Gegenprobe:
 *      die ARM-Sektion ist NICHT mehr Nachfahre von #win-walletapp, und
 *      #crArmBox ist NICHT mehr Nachfahre von .header-picks. Kein doppeltes
 *      ARM-UI im DOM.
 *   3. MODUS-WAHRHEIT (der Kern-Fix): die CC-Zeile zeigt „SIM", wenn der
 *      Schalter SIM steht — AUCH bei cr_arm_v1='1' (der alte Band-Fehler);
 *      „LIVE · ECHTES GELD" nur, wenn cr_arm_v1='1' UND crArm.on() (Modus
 *      LIVE). Fixture beide Faelle.
 *   4. WEICHE UNBERUEHRT (Spion): der Real-Adapter feuert genau dann wie vor
 *      dem PR — alle Tore an + Market → genau ein Aufruf; global aus (Paper)
 *      → kein Aufruf.
 *   5. LIMIT-PERSISTENZ: Limit im CC aendern → cr_arm_limit_v1 aktualisiert,
 *      die Weiche rechnet damit.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md); die
 * Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v904_cc_arm_browser.cjs
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

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
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

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.904',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 904)))), bv);

  console.log('\n-- 1 · Stage frei: kein Live-Band, kein Ersatz-Signal --');
  const s1 = await page.evaluate(() => {
    // global ARM an — genau der Zustand, der frueher das Band aufziehen liess
    localStorage.setItem('cr_arm_v1', '1');
    crArmGrammar.sync();               // zieht (frueher) das Band mit
    try { crPanelKlar.syncBand(); } catch(_){}
    const inStage = document.querySelector('#stage #crLiveBand');
    const anywhere = document.getElementById('crLiveBand');
    return { inStage: !!inStage, anywhere: !!anywhere, flag: crWeiche.flagOn() };
  });
  check('cr_arm_v1 = 1 steht (Vorbedingung: frueher zog das Band jetzt auf)', s1.flag === true, s1);
  check('#crLiveBand wird NICHT in #stage gerendert', s1.inStage === false, s1);
  check('#crLiveBand existiert nirgends im DOM (kein Ersatz-Band)', s1.anywhere === false, s1);
  const s1b = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1'); crArmGrammar.sync();
    // kein Glow/Punkt am CC-Badge als Ersatz-Signal
    const badge = document.getElementById('crCCBadge');
    return { badgeGlow: !!(badge && /crArm|live|glow/i.test(badge.className)) };
  });
  check('kein ARM-Glow/Punkt am #crCCBadge (kein Aussen-Signal)', s1b.badgeGlow === false, s1b);

  console.log('\n-- 2 · CC ist die einzige ARM-Heimat --');
  const s2 = await page.evaluate(() => {
    const cc = document.getElementById('crCCPop');
    const q = id => document.getElementById(id);
    const inCC = el => !!(cc && el && cc.contains(el));
    return {
      tglInCC:   inCC(q('crArmGlobalToggle')),
      swInCC:    inCC(q('crArmSwitch')),
      boxInCC:   inCC(q('crArmBox')),
      limInCC:   inCC(q('crArmLimitInput')),
      stateInCC: inCC(q('crCCArmState')),
      // Gegenprobe: NICHT mehr in den alten Behausungen
      boxInHeader: !!document.querySelector('.header-picks #crArmBox'),
      swInHeader:  !!document.querySelector('.header-picks #crArmSwitch'),
      // Kein doppeltes ARM-UI
      switches: document.querySelectorAll('#crArmSwitch').length,
      toggles:  document.querySelectorAll('#crArmGlobalToggle').length,
      boxes:    document.querySelectorAll('#crArmBox').length,
    };
  });
  check('Checkbox „ARM · echtes Geld" ist Nachfahre von #crCCPop', s2.tglInCC === true, s2);
  check('#crArmSwitch ist Nachfahre von #crCCPop', s2.swInCC === true, s2);
  check('#crArmBox ist Nachfahre von #crCCPop', s2.boxInCC === true, s2);
  check('Session-Limit-Feld ist Nachfahre von #crCCPop', s2.limInCC === true, s2);
  check('Zustandszeile ist Nachfahre von #crCCPop', s2.stateInCC === true, s2);
  check('#crArmBox ist NICHT mehr Nachfahre von .header-picks', s2.boxInHeader === false, s2);
  check('#crArmSwitch ist NICHT mehr in .header-picks', s2.swInHeader === false, s2);
  check('kein doppeltes ARM-UI (genau 1x Switch, Toggle, Box)',
    s2.switches === 1 && s2.toggles === 1 && s2.boxes === 1, s2);

  // Gegenprobe: die ARM-Sektion ist aus dem Wallet-Modal raus
  const s2b = await page.evaluate(() => {
    try { crSigner.active(); crWallet.openWalletPicker(); } catch(_){}
    const modal = document.getElementById('crWalletPickerModal');
    return {
      hasModal: !!modal,
      sectionGone: !document.getElementById('crArmSection'),
      toggleInModal: !!(modal && modal.querySelector('#crArmGlobalToggle')),
    };
  });
  check('Wallet-Modal existiert (Choose wallet)', s2b.hasModal === true, s2b);
  check('#crArmSection ist NICHT mehr im DOM (aus dem Wallet-Modal raus)', s2b.sectionGone === true, s2b);
  check('kein ARM-Schalter mehr im Wallet-Modal', s2b.toggleInModal === false, s2b);
  await page.evaluate(() => { const m = document.getElementById('crWalletPickerModal'); if(m) m.classList.remove('on'); });

  console.log('\n-- 3 · Modus-Wahrheit (der Kern-Fix) --');
  // Chart handelbar machen (Wallet + Mint + Live-Kurve) — nur so kann crArm scharf werden.
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    window.crChartLive = true;              // echte Kerzen — sonst ist SCHARF nicht waehlbar
  }, [BONK]);
  const t3a = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');   // global scharf
    crArm.set(false);                          // aber Schalter SIM
    _crCCRenderArm();
    const line = document.getElementById('crCCArmState');
    return { state: line.getAttribute('data-cr-arm-state'), text: line.textContent,
             flag: crWeiche.flagOn(), armOn: crArm.on() };
  });
  check('Schalter=SIM trotz cr_arm_v1=1 → Zeile zeigt SIM (der alte Band-Fehler ist weg)',
    t3a.flag === true && t3a.armOn === false && t3a.state === 'sim' && /SIM/.test(t3a.text) && !/ECHTES GELD/.test(t3a.text), t3a);
  const t3b = await page.evaluate(() => {
    const ok = crArm.set(true);                // Schalter LIVE (nur wenn eligible)
    _crCCRenderArm();
    const line = document.getElementById('crCCArmState');
    return { setOk: ok, armOn: crArm.on(), state: line.getAttribute('data-cr-arm-state'),
             text: line.textContent };
  });
  check('crArm ist bei Wallet+Mint+Live-Kurve scharf schaltbar', t3b.setOk === true && t3b.armOn === true, t3b);
  check('cr_arm_v1=1 ∧ Modus=LIVE → Zeile „⚡ LIVE · ECHTES GELD · LIMIT …"',
    t3b.state === 'live' && /LIVE · ECHTES GELD/.test(t3b.text) && /LIMIT/.test(t3b.text), t3b);

  console.log('\n-- 4 · Weiche unberuehrt (Spion) --');
  // Panel-Render-Helfer (wie v899): das Activation-Panel feuert den Real-Adapter.
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
  const w1 = await page.evaluate(async () => {
    window.__calls = 0;
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    ChartRunner.sdk.setRealSDK({ marketSwap: p => { window.__calls++;
      return Promise.resolve({ sig:'GSIG', inAmount:String(p.amountRaw), outAmount:'7', feeRaw:'1' }); } });
    const p = window.__renderPanel(9001);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
    return true;
  });
  await page.waitForTimeout(900);
  const w1c = await page.evaluate(() => window.__calls);
  check('alle Tore an + Market → der Real-Adapter feuert genau EINMAL', w1c === 1, { calls: w1c });
  const w2 = await page.evaluate(async () => {
    window.__calls = 0;
    localStorage.removeItem('cr_arm_v1');       // global aus = Paper
    const p = window.__renderPanel(9002);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
    return true;
  });
  await page.waitForTimeout(700);
  const w2c = await page.evaluate(() => window.__calls);
  check('global aus (Paper) → KEIN Aufruf des Real-Adapters', w2c === 0, { calls: w2c });

  console.log('\n-- 5 · Limit-Persistenz im CC --');
  const l1 = await page.evaluate(() => {
    const lim = document.getElementById('crArmLimitInput');
    lim.value = '0.05';
    lim.dispatchEvent(new Event('change'));
    return { ls: localStorage.getItem('cr_arm_limit_v1'), weiche: crWeiche.limitLamports() };
  });
  check('0.05 SOL im CC → cr_arm_limit_v1 = 50000000, die Weiche rechnet damit',
    l1.ls === '50000000' && l1.weiche === 50000000, l1);
  const l2 = await page.evaluate(() => {
    const lim = document.getElementById('crArmLimitInput');
    lim.value = 'quatsch';
    lim.dispatchEvent(new Event('change'));
    return { ls: localStorage.getItem('cr_arm_limit_v1'),
             info: document.getElementById('crArmInfo').textContent };
  });
  check('Unsinn-Eingabe aendert NICHTS und sagt das', l2.ls === '50000000' && /Limit:/.test(l2.info), l2);

  console.log('\n== v904 CC-ARM: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
