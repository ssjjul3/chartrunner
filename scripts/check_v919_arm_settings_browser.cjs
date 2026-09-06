/* Smoke-Verifikation v1.0.919 — UI · ARM NACH SETTINGS + EINE HANDELSFLAECHE.
 *
 * Reine UI-Verlagerung/Entfernung. Der Trade-Pfad ist NICHT angefasst: ARM-Bit
 * (cr_arm_v1), Session-Limit-Rechnung (cr_arm_limit_v1), vier Tore, Spion,
 * Market-/Limit-Pfad Bit fuer Bit gleich. Geaendert sind nur der Mount-Punkt
 * des ARM-Blocks (Control Center → Settings-App, #crArmHome) und ein entfernter
 * Einstieg (das Bottom-Sheet „Handeln vom Chart" hinter CR_CHART_SHEET, Default aus).
 *
 * Scharf geprueft wird, was Wahrheit oder Geld kostet, wenn es fehlt:
 *   1. ARM-UI genau EINMAL im DOM, unter #win-settings/#crArmHome, ganz oben;
 *      im Control Center KEIN Schalter/Checkbox/Limit-Feld — nur Statuszeile
 *      (#crCCArmStatus) + Link (#crCCArmGoSettings).
 *   2. Alle ARM-Handler feuern aus Settings wie zuvor: Checkbox → cr_arm_v1,
 *      Modus-Schalter → crArm.on(), Limit → cr_arm_limit_v1; die Weiche-Gates
 *      (crWeiche.flagOn / limitLamports) lesen dieselben Werte; die CC-Statuszeile
 *      spiegelt den WAHREN Modus (SIM trotz Bit, LIVE nur bei Bit UND Schalter).
 *   3. Gast → kein ARM-Abschnitt (Hinweis, Link versteckt); verbunden → sichtbar —
 *      live-reaktiv ueber crApplyAccessGates.
 *   4. „Handeln vom Chart" nicht mehr erreichbar (Flag aus): ein Kauf-/Verkaufs-
 *      Tap bei SCHARF oeffnet das Activation-Panel (#tvSettingsOverlay), das
 *      Sheet (#crArmSheet) wird nie gebaut. Gegenprobe: mit CR_CHART_SHEET=1
 *      kommt das Sheet — das Flag ist also wirklich das Tor.
 *   5. Weiche/Spion unberuehrt (Real-Adapter feuert genau EINMAL bei allen Toren,
 *      NIE bei global aus); Topbar ≤5; keine Animation ohne reduced-motion-Guard.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v919_arm_settings_browser.cjs
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

  // Wallet verbunden beim Boot (cr_wallet) + Wallet Standard fuer den Weiche-Spion.
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
  check('Banner meldet mindestens v1.0.919',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 919)))), bv);

  /* ===================== 1 — Genau EIN ARM-UI, unter Settings ===================== */
  console.log('\n-- 1 · ARM-UI genau EINMAL, unter #win-settings; CC nur Status + Link --');
  const s1 = await page.evaluate(() => {
    const q = id => document.getElementById(id);
    const set = q('win-settings'), home = q('crArmHome'), cc = q('crCCPop');
    const inSet = el => !!(set && el && set.contains(el));
    const inHome = el => !!(home && el && home.contains(el));
    const inCC = el => !!(cc && el && cc.contains(el));
    const body = set && set.querySelector('.os-wbody');
    const first = body && body.firstElementChild;
    const tabs = set && set.querySelector('.crTerm-tabs');
    return {
      homeInSet: inSet(home),
      tglInHome: inHome(q('crArmGlobalToggle')), swInHome: inHome(q('crArmSwitch')),
      boxInHome: inHome(q('crArmBox')), limInHome: inHome(q('crArmLimitInput')),
      stateInHome: inHome(q('crCCArmState')), secInHome: inHome(q('crCCArmSection')),
      hintInHome: inHome(q('crCCArmGateHint')), warnInHome: inHome(q('crArmWarn')), infoInHome: inHome(q('crArmInfo')),
      // ganz oben: erstes Element im Settings-Body, VOR der Tab-Leiste
      homeIsFirst: !!(first && first === home),
      homeBeforeTabs: !!(home && tabs && (home.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING)),
      title: home ? (home.querySelector('h4') || {}).textContent : '',
      // CC: kein Schalter, kein Limit-Feld, keine Checkbox
      ccSwitch: !!(cc && cc.querySelector('#crArmSwitch, .cr-armSwitch, #crArmBox')),
      ccToggle: !!(cc && cc.querySelector('#crArmGlobalToggle, .crCCArmToggle, input[type="checkbox"]')),
      ccLimit: !!(cc && cc.querySelector('#crArmLimitInput, .crCCArmLimit')),
      ccSection: !!(cc && cc.querySelector('#crCCArmSection, #crCCArmGateHint, #crCCArmState')),
      ccStatus: inCC(q('crCCArmStatus')), ccStatusTxt: inCC(q('crCCArmStatusTxt')), ccGo: inCC(q('crCCArmGoSettings')),
      ccGoIsButton: !!(q('crCCArmGoSettings') && q('crCCArmGoSettings').tagName === 'BUTTON'),
      ccGoTxt: q('crCCArmGoSettings') ? q('crCCArmGoSettings').textContent : '',
      // Kein doppeltes ARM-UI
      switches: document.querySelectorAll('#crArmSwitch, [data-cr-arm-switch]').length,
      toggles:  document.querySelectorAll('#crArmGlobalToggle').length,
      boxes:    document.querySelectorAll('#crArmBox').length,
      limits:   document.querySelectorAll('#crArmLimitInput').length,
      states:   document.querySelectorAll('#crCCArmState').length,
      homes:    document.querySelectorAll('#crArmHome').length,
      // Alte Behausungen bleiben leer
      boxInHeader: !!document.querySelector('.header-picks #crArmBox'),
      liveBand: !!document.getElementById('crLiveBand'),
      // CC behaelt Theme/Sprache/Apps/Notifications
      ccKeeps: !!(cc && cc.querySelector('#crCCThemeChips') && cc.querySelector('#crCCLang') && cc.querySelector('#crCCAppsLocSw') && cc.querySelector('#crCCNotifList')),
      hexBadge: !!document.getElementById('crCCBadge'),
      // Mobile: Zahlen-Tastatur
      limInputMode: q('crArmLimitInput') ? q('crArmLimitInput').getAttribute('inputmode') : '',
    };
  });
  check('#crArmHome ist Nachfahre von #win-settings', s1.homeInSet === true, s1);
  check('Checkbox, Modus-Schalter, ▲/▼-Box, Limit-Feld, Zustandszeile, Sektion, Gate-Hinweis, Erklaertext, Info-Zeile: alle unter #crArmHome',
    s1.tglInHome && s1.swInHome && s1.boxInHome && s1.limInHome && s1.stateInHome && s1.secInHome && s1.hintInHome && s1.warnInHome && s1.infoInHome, s1);
  check('ARM-Abschnitt steht GANZ OBEN (erstes Element im Settings-Body, vor der Tab-Leiste)', s1.homeIsFirst && s1.homeBeforeTabs, s1);
  check('Abschnitts-Titel „ARM · Echtgeld"', /ARM · Echtgeld/.test(s1.title), s1);
  check('Control Center: KEIN Schalter, KEINE Checkbox, KEIN Limit-Feld, KEINE Sektion/Zustandszeile',
    !s1.ccSwitch && !s1.ccToggle && !s1.ccLimit && !s1.ccSection, s1);
  check('Control Center: Statuszeile + Link „→ Einstellungen" (Button)',
    s1.ccStatus && s1.ccStatusTxt && s1.ccGo && s1.ccGoIsButton && /Einstellungen/.test(s1.ccGoTxt), s1);
  check('kein doppeltes ARM-UI (genau 1x Switch, Toggle, Box, Limit, Zustandszeile, Home)',
    s1.switches === 1 && s1.toggles === 1 && s1.boxes === 1 && s1.limits === 1 && s1.states === 1 && s1.homes === 1, s1);
  check('alte Behausungen leer: nicht in .header-picks, kein #crLiveBand', !s1.boxInHeader && !s1.liveBand, s1);
  check('CC behaelt Theme/Sprache/Apps/Notifications; Hex-Badge bleibt', s1.ccKeeps && s1.hexBadge, s1);
  check('Session-Limit-Feld mit Zahlen-Tastatur (inputmode=decimal)', s1.limInputMode === 'decimal', s1);

  /* ===================== 2 — Handler feuern aus Settings ===================== */
  console.log('\n-- 2 · ARM-Handler aus Settings: Bit, Modus, Limit → crArm-Zustand + Weiche-Gates --');
  const o2 = await page.evaluate(() => {
    // Das Bit direkt im Storage setzen, OHNE Render — nur der Oeffnungs-Hook
    // (osRefreshSettings → _crCCRenderArm) kann die Checkbox darauf bringen.
    try { localStorage.setItem('cr_arm_v1', '1'); } catch(_){}
    const before = document.getElementById('crArmGlobalToggle').checked;
    window.osOpenWindowMulti('settings');
    const w = document.getElementById('win-settings');
    return { before, on: !!(w && w.classList.contains('on')),
             secHidden: !!document.getElementById('crCCArmSection').hidden,
             hintHidden: !!document.getElementById('crCCArmGateHint').hidden,
             tgl: document.getElementById('crArmGlobalToggle').checked };
  });
  check('Settings oeffnet (osOpenWindowMulti) und der Oeffnungs-Hook rendert den ARM-Block (Sektion sichtbar, Checkbox = Bit aus dem Storage)',
    o2.before === false && o2.on && o2.secHidden === false && o2.hintHidden === true && o2.tgl === true, o2);

  const b2 = await page.evaluate(() => {
    const tgl = document.getElementById('crArmGlobalToggle');
    tgl.checked = true; tgl.dispatchEvent(new Event('change'));
    const onBit = localStorage.getItem('cr_arm_v1'), onFlag = crWeiche.flagOn();
    const stOn = document.getElementById('crCCArmStatus').getAttribute('data-cr-arm-state');
    const ccOn = document.getElementById('crCCArmStatusTxt').textContent;
    const lineOn = document.getElementById('crCCArmState').textContent;
    tgl.checked = false; tgl.dispatchEvent(new Event('change'));
    return { onBit, onFlag, stOn, ccOn, lineOn, offBit: localStorage.getItem('cr_arm_v1'), offFlag: crWeiche.flagOn() };
  });
  check('Checkbox in Settings an → cr_arm_v1=1, crWeiche.flagOn() true; aus → Bit weg, flagOn false',
    b2.onBit === '1' && b2.onFlag === true && b2.offBit === null && b2.offFlag === false, b2);
  check('Modus-Wahrheit: Bit an, Schalter SIM → Zustandszeile UND CC-Status sagen SIM (nicht LIVE)',
    b2.stOn === 'sim' && /SIM/.test(b2.ccOn) && !/LIVE/.test(b2.ccOn) && /SIM/.test(b2.lineOn), b2);

  // Chart handelbar machen (Wallet + Mint + Live-Kurve) — nur so kann crArm scharf werden.
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    window.crChartLive = true;
    _crArmPaint();
  }, [BONK]);
  const m2 = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1'); _crCCRenderArm();
    const sw = document.getElementById('crArmSwitch');
    const before = { disabled: sw.disabled, on: crArm.on() };
    sw.click();
    const st = document.getElementById('crCCArmStatus').getAttribute('data-cr-arm-state');
    const cc = document.getElementById('crCCArmStatusTxt').textContent;
    const line = document.getElementById('crCCArmState');
    const go = document.getElementById('crCCArmGoSettings');
    const r = { before, on: crArm.on(), swTxt: sw.textContent, swState: sw.getAttribute('data-cr-arm-state'),
                lineState: line.getAttribute('data-cr-arm-state'), lineTxt: line.textContent, st, cc, goHidden: !!go.hidden,
                buyOn: !document.getElementById('crArmBuy').disabled, sellOn: !document.getElementById('crArmSell').disabled };
    return r;
  });
  check('Modus-Schalter in Settings: SIM → SCHARF (crArm.on() true, Schalter sagt SCHARF, ▲/▼ frei)',
    m2.before.disabled === false && m2.before.on === false && m2.on === true && m2.swTxt === 'SCHARF' && m2.swState === 'scharf' && m2.buyOn && m2.sellOn, m2);
  check('Bit an ∧ Modus LIVE → Gold-Band „⚡ LIVE · ECHTES GELD · LIMIT …" in Settings',
    m2.lineState === 'live' && /LIVE · ECHTES GELD/.test(m2.lineTxt) && /LIMIT/.test(m2.lineTxt), m2);
  check('CC-Status spiegelt: „⚡ LIVE · Limit x SOL", Link sichtbar',
    m2.st === 'live' && /⚡ LIVE/.test(m2.cc) && /Limit/.test(m2.cc) && /SOL/.test(m2.cc) && m2.goHidden === false, m2);

  const l2 = await page.evaluate(() => {
    const lim = document.getElementById('crArmLimitInput');
    lim.value = '0.05'; lim.dispatchEvent(new Event('change'));
    const ok = { ls: localStorage.getItem('cr_arm_limit_v1'), weiche: crWeiche.limitLamports(),
                 cc: document.getElementById('crCCArmStatusTxt').textContent,
                 line: document.getElementById('crCCArmState').textContent };
    lim.value = 'quatsch'; lim.dispatchEvent(new Event('change'));
    const bad = { ls: localStorage.getItem('cr_arm_limit_v1'), info: document.getElementById('crArmInfo').textContent };
    return { ok, bad };
  });
  check('Limit 0.05 in Settings → cr_arm_limit_v1=50000000, die Weiche rechnet damit; Band + CC-Status zeigen 0,05 SOL',
    l2.ok.ls === '50000000' && l2.ok.weiche === 50000000 && /0,05/.test(l2.ok.line) && /0,05/.test(l2.ok.cc), l2);
  check('Unsinn-Eingabe aendert NICHTS und sagt das', l2.bad.ls === '50000000' && /Limit:/.test(l2.bad.info), l2);

  const back2 = await page.evaluate(() => {
    document.getElementById('crArmSwitch').click();       // SCHARF → SIM
    return { on: crArm.on(), st: document.getElementById('crCCArmStatus').getAttribute('data-cr-arm-state'),
             cc: document.getElementById('crCCArmStatusTxt').textContent };
  });
  check('Schalter zurueck auf SIM → crArm.on() false, CC-Status „◇ SIM" (Bit bleibt, Modus-Wahrheit)',
    back2.on === false && back2.st === 'sim' && /◇ SIM/.test(back2.cc), back2);

  // Der Link aus dem CC oeffnet Settings.
  const link2 = await page.evaluate(() => {
    const w = document.getElementById('win-settings');
    w.classList.remove('on');
    document.getElementById('crMenuCC').click();
    const popOpen = document.getElementById('crCCPop').classList.contains('on');
    document.getElementById('crCCArmGoSettings').click();
    return { popOpen, popClosed: !document.getElementById('crCCPop').classList.contains('on'),
             setOpen: w.classList.contains('on') };
  });
  check('CC „→ Einstellungen" schliesst das Popover und oeffnet Settings', link2.popOpen && link2.popClosed && link2.setOpen, link2);

  /* ===================== 3 — Gast-Gate ===================== */
  console.log('\n-- 3 · Gast → kein ARM-Abschnitt; verbunden → sichtbar (live via crApplyAccessGates) --');
  const g3 = await page.evaluate(() => {
    localStorage.removeItem('cr_wallet');
    try { crSigner.disconnect(); } catch(_){}
    crAccount.isSignedIn = () => false;
    crApplyAccessGates();
    return { avail: _crCCArmAvailable(),
             secHidden: !!document.getElementById('crCCArmSection').hidden,
             hintHidden: !!document.getElementById('crCCArmGateHint').hidden,
             cc: document.getElementById('crCCArmStatusTxt').textContent,
             st: document.getElementById('crCCArmStatus').getAttribute('data-cr-arm-state'),
             goHidden: !!document.getElementById('crCCArmGoSettings').hidden,
             armOn: crArm.on() };
  });
  check('Gast: ARM-Sektion in Settings versteckt, Hinweis sichtbar', g3.avail === false && g3.secHidden && !g3.hintHidden, g3);
  check('Gast: CC-Status „◇ SIM · …Anmeldung/Wallet", Link versteckt, Modus SIM',
    g3.st === 'sim' && /SIM/.test(g3.cc) && /Anmeldung/.test(g3.cc) && g3.goHidden === true && g3.armOn === false, g3);
  const c3 = await page.evaluate((a) => {
    localStorage.setItem('cr_wallet', a);
    crApplyAccessGates();
    return { secHidden: !!document.getElementById('crCCArmSection').hidden,
             hintHidden: !!document.getElementById('crCCArmGateHint').hidden,
             goHidden: !!document.getElementById('crCCArmGoSettings').hidden,
             cc: document.getElementById('crCCArmStatusTxt').textContent };
  }, ADDR);
  check('Wallet verbunden → Sektion sichtbar, Hinweis weg, CC-Link sichtbar, Status „◇ SIM"',
    c3.secHidden === false && c3.hintHidden === true && c3.goHidden === false && /◇ SIM/.test(c3.cc) && !/Anmeldung/.test(c3.cc), c3);

  /* ===================== 4 — EINE Handelsflaeche ===================== */
  console.log('\n-- 4 · „Handeln vom Chart" unerreichbar (Flag aus); Tap bei SCHARF → Activation-Panel --');
  const f4 = await page.evaluate(() => ({ flag: window.CR_CHART_SHEET, on: _crChartSheetOn() }));
  check('CR_CHART_SHEET ist per Default AUS', f4.flag === undefined && f4.on === false, f4);
  // Kurs bereitstellen, falls ohne Run keiner da ist (das Panel braucht einen).
  await page.evaluate(() => {
    let p = NaN; try { p = currentPrice(); } catch(_){}
    if(!(typeof p === 'number' && isFinite(p))) window.currentPrice = () => 100;
    localStorage.setItem('cr_arm_v1', '1');
    window.crChartLive = true;
    crArm.set(true); _crArmPaint(); _crCCRenderArm();
  });
  const t4 = await page.evaluate(() => {
    const before = { sheet: !!document.getElementById('crArmSheet'), tv: !!document.getElementById('tvSettingsOverlay'), on: crArm.on() };
    const ret = _crArmOpenSheet('kauf');
    const sheet = document.getElementById('crArmSheet');
    const tv = document.getElementById('tvSettingsOverlay');
    const r = { before, ret, sheetBuilt: !!sheet, sheetOn: !!(sheet && sheet.classList.contains('on')),
                tv: !!tv, tvShown: !!(tv && getComputedStyle(tv).display !== 'none'),
                tvTitle: tv ? ((tv.querySelector('[data-cr-tv-settings-title]') || {}).textContent || '') : '' };
    try { closeTvSettingsDialog(); } catch(_){}
    return r;
  });
  check('Vorbedingung: Chart SCHARF, kein Sheet, kein Panel', t4.before.on === true && !t4.before.sheet && !t4.before.tv, t4);
  check('Kauf-Tap bei SCHARF → Activation-Panel (#tvSettingsOverlay) offen, Rueckgabe „behandelt" (kein Paper-Market)',
    t4.ret === true && t4.tv && t4.tvShown, t4);
  check('Das Sheet „Handeln vom Chart" wird NICHT gebaut (#crArmSheet fehlt)', t4.sheetBuilt === false && t4.sheetOn === false, t4);
  const t4b = await page.evaluate(() => {
    const ret = _crArmOpenSheet('verkauf');
    const tv = document.getElementById('tvSettingsOverlay');
    const r = { ret, tv: !!tv, sheet: !!document.getElementById('crArmSheet') };
    try { closeTvSettingsDialog(); } catch(_){}
    return r;
  });
  check('Verkaufs-Tap ebenso → Panel, kein Sheet', t4b.ret === true && t4b.tv && !t4b.sheet, t4b);
  // ▲ am Modus-Schalter (der zweite fruehere Ausloeser) — derselbe Weg.
  const t4c = await page.evaluate(() => {
    document.getElementById('crArmBuy').click();
    const tv = document.getElementById('tvSettingsOverlay');
    const r = { tv: !!tv, sheet: !!document.getElementById('crArmSheet') };
    try { closeTvSettingsDialog(); } catch(_){}
    return r;
  });
  check('▲ am Modus-Schalter → Activation-Panel, kein Sheet', t4c.tv && !t4c.sheet, t4c);
  // Gegenprobe: mit Flag kommt das Sheet — das Flag ist wirklich das Tor.
  const t4d = await page.evaluate(() => {
    window.CR_CHART_SHEET = 1;
    const ret = _crArmOpenSheet('kauf');
    const sheet = document.getElementById('crArmSheet');
    const r = { flagOn: _crChartSheetOn(), hostReturned: !!(ret && ret.nodeType === 1),
                sheetOn: !!(sheet && sheet.classList.contains('on')), tv: !!document.getElementById('tvSettingsOverlay') };
    try { _crArmCloseSheet(); } catch(_){}
    delete window.CR_CHART_SHEET;
    return r;
  });
  check('Gegenprobe: CR_CHART_SHEET=1 → das alte Sheet kommt (Flag ist das Tor), kein Panel',
    t4d.flagOn && t4d.hostReturned && t4d.sheetOn && !t4d.tv, t4d);
  const t4e = await page.evaluate(() => {
    // Live-Tooltips im scharfen Zustand (aus _crArmPaint) + die deutsche Tabelle.
    crArm.set(true); _crArmPaint();
    const sw = document.getElementById('crArmSwitch').title || '';
    const buy = document.getElementById('crArmBuy').title || '';
    const sell = document.getElementById('crArmSell').title || '';
    const badge = document.getElementById('crArmBadge').getAttribute('title') || '';
    let de = '', prev = 'en';
    try { prev = crI18n.lang(); crI18n.setLang('de'); de = _crT('arm.toastOn', ''); } catch(_){}
    try { crI18n.setLang(prev); } catch(_){}
    return { on: crArm.on(), sw, buy, sell, badge, de };
  });
  check('Tooltips (SCHARF) + Toast (de) nennen das Activation-Panel, nicht mehr die Handels-Tafel',
    t4e.on && /Activation/.test(t4e.sw) && /Activation/.test(t4e.buy) && /Activation/.test(t4e.sell) && /Activation/.test(t4e.badge)
    && /Activation-Panel/.test(t4e.de) && !/Handels-Tafel/.test(t4e.de) && !/trade sheet/i.test(t4e.sw + t4e.buy + t4e.sell + t4e.badge), t4e);
  const t4f = await page.evaluate(() => {
    const src = document.documentElement.innerHTML;
    const grab = (lang) => { const m = src.match(new RegExp("'arm\\.toastOn':'([^']*)'", 'g')) || []; return m; };
    return { all: grab() };
  });
  check('arm.toastOn in allen Sprachtabellen (de/es/zh) auf Activation-Panel umgestellt',
    t4f.all.length >= 3 && t4f.all.every(s => /Activation/.test(s)), t4f);

  /* ===================== 5 — Weiche/Spion, Topbar, reduced-motion ===================== */
  console.log('\n-- 5 · Weiche unberuehrt (Spion), Topbar ≤5, reduced-motion --');
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
  await page.evaluate(async () => {
    window.__calls = 0;
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    ChartRunner.sdk.setRealSDK({ marketSwap: p => { window.__calls++;
      return Promise.resolve({ sig:'GSIG', inAmount:String(p.amountRaw), outAmount:'7', feeRaw:'1' }); } });
    const p = window.__renderPanel(9001);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
  });
  await page.waitForTimeout(900);
  const w1c = await page.evaluate(() => window.__calls);
  check('alle Tore an + Market → der Real-Adapter feuert genau EINMAL', w1c === 1, { calls: w1c });
  await page.evaluate(async () => {
    window.__calls = 0;
    localStorage.removeItem('cr_arm_v1');
    const p = window.__renderPanel(9002);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
  });
  await page.waitForTimeout(700);
  const w2c = await page.evaluate(() => window.__calls);
  check('global aus (Paper) → KEIN Aufruf des Real-Adapters', w2c === 0, { calls: w2c });

  const s5 = await page.evaluate(() => {
    const bar = document.getElementById('crOSBar');
    const tb = document.querySelector('.topbar');
    const row = document.getElementById('crCCArmStatus');
    const home = document.getElementById('crArmHome');
    const anim = el => el ? getComputedStyle(el).animationName : 'none';
    return { barBtns: bar ? bar.querySelectorAll('.cr-bar-btn').length : -1,
             topbar: tb ? tb.children.length : -1,
             animRow: anim(row), animHome: anim(home),
             armInBar: !!(bar && bar.querySelector('#crArmBox, #crCCArmStatus')) };
  });
  check('Topbar bleibt bei ≤5; kein ARM-Element in der Topbar', s5.barBtns <= 5 && (s5.topbar === -1 || s5.topbar <= 5) && !s5.armInBar, s5);
  check('reduced-motion: keine Animation an Statuszeile/ARM-Abschnitt', s5.animRow === 'none' && s5.animHome === 'none', s5);

  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|aborted/i.test(m));
  check('keine harten Page-Errors waehrend der Pruefung', hard2.length === 0, hard2.slice(0, 3));

  console.log('\n== v919 ARM→Settings + EINE Handelsflaeche: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
