/* Smoke-Verifikation v1.0.899 — S5a PR 3: GLOBALES ARM IM WALLET-MODAL
 * + ZUSTANDS-GRAMMATIK.
 *
 * Das Prinzip in einem Satz: der SCHARFE Zustand ist unuebersehbar, und
 * Paper sieht Pixel fuer Pixel aus wie heute. Der Schalter traegt
 * cr_arm_v1 — DASSELBE eine Bit, das die v897-Weiche liest; es gibt keine
 * zweite Wahrheitsquelle.
 *
 * Scharf geprueft wird, was Geld oder Wahrheit kostet, wenn es fehlt:
 *   · Der Modal-Schalter setzt/loescht GENAU cr_arm_v1, und die Weiche
 *     folgt ihm (flagOn).
 *   · Das Session-Limit wird float-frei geparst (0.05 SOL → 50000000
 *     Lamports unter cr_arm_limit_v1) und die Weiche rechnet damit;
 *     Unsinn-Eingabe aendert NICHTS und sagt das.
 *   · Die Warnung steht in Klartext (echter Swap · Wallet fragt · Worker
 *     signiert nie), die aktive Wallet steht daneben.
 *   · Zweistufigkeit sichtbar: ARMED-Haken ohne globales ARM traegt den
 *     Tooltip „global nicht scharf"; mit globalem ARM ist er weg.
 *   · Grammatik NUR scharf: body.cr-arm-live + Badge-Goldrand-Regel ·
 *     Runner-Aura zeichnet mit Stub-Context nur bei flagOn (Verhaltens-
 *     test, nicht Prosa) und haengt im echten drawPlayer-Pass (Live-Code-
 *     Messung) · 2-s-Puls am Status-Chip nur bei scharfer ARMED-Quelle ·
 *     Live-Fill wirft die schwebende Zahl (.crArmPnl) · Clear einer
 *     scharfen Quelle zerfaellt in Partikel (.crArmDot).
 *   · Paper-Nullprobe: ARM aus → keine Klasse, kein Puls, keine Aura,
 *     kein Element — heutiges Bild.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v899_arm_modal_browser.cjs
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
    /* Ein <script src> (Supabase-CDN beim Boot) bekommt leeres JS — JSON
     * mit mehr als einem Schluessel parst als Skript nicht ('{a:1,b:2}'
     * ist ein Block mit zwei Labels) und wuerde einen falschen
     * Page-Error stiften. */
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
  check('Banner meldet mindestens v1.0.899',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 899)))), bv);

  console.log('\n-- CC: der ARM-Abschnitt (v1.0.904: aus dem Wallet-Modal ins Control Center verlagert) --');
  const m1 = await page.evaluate(() => {
    crSigner.active();
    // v1.0.904 (S5a.3): die ARM-Sektion wohnt jetzt im Control Center
    // (#crCCArmSection unter #crCCPop), nicht mehr im Wallet-Modal.
    // _crCCRenderArm stellt Feld + Info auf den echten Zustand.
    _crCCRenderArm();
    const sec = document.getElementById('crCCArmSection');
    const tgl = document.getElementById('crArmGlobalToggle');
    const warn = document.getElementById('crArmWarn');
    const lim = document.getElementById('crArmLimitInput');
    const info = document.getElementById('crArmInfo');
    return { has: !!(sec && tgl && warn && lim && info),
             checked: tgl && tgl.checked, warn: warn && warn.textContent,
             limVal: lim && lim.value, info: info && info.textContent };
  });
  check('Abschnitt existiert (Schalter, Warnung, Limit, Info)', m1.has, m1);
  check('Anfangszustand: Schalter AUS (Paper)', m1.checked === false, m1.checked);
  check('Warnung in Klartext: echter Swap · Wallet fragt · Worker signiert nie',
    /echter Swap/.test(m1.warn || '') && /Wallet fragt/.test(m1.warn || '') && /Worker signiert nie/.test(m1.warn || ''), m1.warn);
  check('Limit-Feld zeigt den Default 0,1 SOL', m1.limVal === '0,1', m1.limVal);
  check('Info nennt die aktive Wallet', /CRte…1111/.test(m1.info || ''), m1.info);

  console.log('\n-- Schalter = das eine Bit (cr_arm_v1) --');
  const m2 = await page.evaluate(() => {
    const tgl = document.getElementById('crArmGlobalToggle');
    tgl.checked = true;
    tgl.dispatchEvent(new Event('change'));
    return { ls: localStorage.getItem('cr_arm_v1'), flag: crWeiche.flagOn(),
             body: document.body.classList.contains('cr-arm-live'),
             info: document.getElementById('crArmInfo').textContent };
  });
  check('Schalter an → cr_arm_v1 = 1 und die Weiche folgt', m2.ls === '1' && m2.flag === true, m2);
  check('body.cr-arm-live steht (Grammatik-Anker)', m2.body === true, m2.body);
  check('Info sagt SCHARF', /SCHARF/.test(m2.info), m2.info);
  const m3 = await page.evaluate(() => {
    const tgl = document.getElementById('crArmGlobalToggle');
    tgl.checked = false;
    tgl.dispatchEvent(new Event('change'));
    return { ls: localStorage.getItem('cr_arm_v1'), flag: crWeiche.flagOn(),
             body: document.body.classList.contains('cr-arm-live') };
  });
  check('Schalter aus → Bit weg, Weiche paper, Klasse weg',
    m3.ls === null && m3.flag === false && m3.body === false, m3);

  console.log('\n-- Session-Limit: SOL rein, Lamports raus --');
  const m4 = await page.evaluate(() => {
    const lim = document.getElementById('crArmLimitInput');
    lim.value = '0.05';
    lim.dispatchEvent(new Event('change'));
    return { ls: localStorage.getItem('cr_arm_limit_v1'), weiche: crWeiche.limitLamports(),
             shown: lim.value };
  });
  check('0.05 SOL → 50000000 Lamports, Weiche rechnet damit',
    m4.ls === '50000000' && m4.weiche === 50000000, m4);
  const m5 = await page.evaluate(() => {
    const lim = document.getElementById('crArmLimitInput');
    lim.value = 'quatsch';
    lim.dispatchEvent(new Event('change'));
    return { ls: localStorage.getItem('cr_arm_limit_v1'),
             info: document.getElementById('crArmInfo').textContent };
  });
  check('Unsinn-Eingabe aendert NICHTS und sagt das',
    m5.ls === '50000000' && /Limit:/.test(m5.info), m5);
  await page.evaluate(() => {
    const lim = document.getElementById('crArmLimitInput');
    lim.value = '10';
    lim.dispatchEvent(new Event('change'));
    // v1.0.904: ARM-Sektion ist im CC, kein Wallet-Modal mehr offen zu schliessen.
    const m = document.getElementById('crWalletPickerModal'); if(m) m.classList.remove('on');
  });

  console.log('\n-- Zweistufigkeit: der Tooltip sagt warum --');
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    window.__renderPanel = function(id){
      const host = document.createElement('div');
      document.body.appendChild(host);
      const section = renderBlueRouteInputs(host, { kind:'hline', id:id, py:100 }, {});
      const spans = Array.from(section.querySelectorAll('span'));
      return window.__p = {
        section,
        armed: section.querySelector('input[type=checkbox]'),
        armedLabel: section.querySelector('input[type=checkbox]').parentNode,
        // v1.0.901 (S5a.2·A3) — der Status-Chip traegt jetzt die Zustands-
        // Kopfzeile (ENTWURF/SCHARF); die alten Texte bleiben als Fallback.
        statusChip: spans.find(s => /^(Armed|Draft)$|ENTWURF|SCHARF/.test(s.textContent || '')),
        size: Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox'),
        btn: (l) => Array.from(section.querySelectorAll('button')).find(b => b.textContent === l),
      };
    };
  }, [BONK]);
  const z1 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const p = window.__renderPanel(7001);
    p.armed.checked = true;
    p.armed.dispatchEvent(new Event('change'));
    return { title: p.armedLabel.title, pulse: p.statusChip.classList.contains('cr-armed-pulse'),
             body: document.body.classList.contains('cr-arm-live') };
  });
  check('ARMED ohne globales ARM → Tooltip „global nicht scharf", kein Puls, keine Klasse',
    /global nicht scharf/.test(z1.title) && z1.pulse === false && z1.body === false, z1);
  const z2 = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    const p = window.__p;
    p.armed.dispatchEvent(new Event('change'));
    return { title: p.armedLabel.title, pulse: p.statusChip.classList.contains('cr-armed-pulse'),
             body: document.body.classList.contains('cr-arm-live') };
  });
  check('mit globalem ARM → Tooltip weg, Status-Chip pulsiert, Klasse steht',
    z2.title === '' && z2.pulse === true && z2.body === true, z2);

  console.log('\n-- Grammatik: Badge-Regel + Aura (Verhalten, nicht Prosa) --');
  const g1 = await page.evaluate(() => {
    const css = document.getElementById('crArmGrammarCss');
    return { hasCss: !!css, badgeRule: !!(css && /body\.cr-arm-live #crTrustBadge/.test(css.textContent)) };
  });
  check('Grammatik-CSS injiziert, Badge-Goldrand haengt an body.cr-arm-live', g1.hasCss && g1.badgeRule, g1);
  const g2 = await page.evaluate(() => {
    const mk = () => { const calls = { arc:0, grad:0 };
      return { calls,
        ctx: { save(){}, restore(){}, beginPath(){}, fill(){}, stroke(){},
               arc(){ calls.arc++; }, set fillStyle(v){}, set strokeStyle(v){}, set lineWidth(v){},
               createRadialGradient(){ calls.grad++; return { addColorStop(){} }; } } };
    };
    localStorage.setItem('cr_arm_v1', '1');
    const on = mk(); const rOn = crArmGrammar.drawAura(on.ctx, 100, 100);
    localStorage.removeItem('cr_arm_v1');
    const off = mk(); const rOff = crArmGrammar.drawAura(off.ctx, 100, 100);
    return { rOn, onArcs: on.calls.arc, rOff, offArcs: off.calls.arc };
  });
  check('Aura zeichnet bei ARM (2 Boegen), auf Paper KEINEN einzigen Pfad',
    g2.rOn === true && g2.onArcs === 2 && g2.rOff === false && g2.offArcs === 0, g2);
  const src = fs.readFileSync(FILE, 'utf8');
  const live = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ').replace(/<!--[\s\S]*?-->/g, ' ');
  check('drawAura haengt im echten drawPlayer-Pass (Live-Code)',
    /crArmGrammar\.drawAura\(ctx, sx, sy\)/.test(live));

  console.log('\n-- Live-Fill → schwebende Zahl · Clear → Partikel --');
  await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    ChartRunner.sdk.setRealSDK({ marketSwap: p => Promise.resolve({ sig:'GSIG', inAmount:String(p.amountRaw), outAmount:'7', feeRaw:'1' }) });
    const p = window.__renderPanel(7002);
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
  });
  await page.waitForTimeout(900);
  const j1 = await page.evaluate(() => ({
    pnl: document.querySelectorAll('.crArmPnl').length,
    loading: window.__p.section.classList.contains('cr-arm-loading') }));
  check('Live-Fill wirft die schwebende Zahl (.crArmPnl)', j1.pnl >= 1, j1);
  check('Ladeanimation ist nach dem Urteil wieder weg', j1.loading === false, j1);
  const j2 = await page.evaluate(() => {
    window.__p.btn('Clear').click();
    return { dots: document.querySelectorAll('.crArmDot').length };
  });
  check('Clear einer scharfen Quelle zerfaellt in Partikel (.crArmDot)', j2.dots >= 8, j2);

  console.log('\n-- Paper-Nullprobe: heutiges Bild --');
  const n1 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    crArmGrammar.sync();
    const p = window.__renderPanel(7003);
    return { body: document.body.classList.contains('cr-arm-live'),
             pulse: p.statusChip.classList.contains('cr-armed-pulse'),
             title: p.armedLabel.title,
             pnl: 0 };
  });
  check('ARM aus → keine Klasse, kein Puls, kein Tooltip ohne Haken',
    n1.body === false && n1.pulse === false && n1.title === '', n1);

  console.log('\n== v899 ARM-Modal: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
