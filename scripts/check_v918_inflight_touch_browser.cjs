/* Smoke-Verifikation v1.0.918 — Spec B6 + M1-lite: IN-FLIGHT SICHTBAR +
 * VAULT-TIMEOUT + TOUCH-GRIFF FUER CHART-OBJEKTE.
 *
 * Rein Anzeige/Zustand/Touch-Ziele — KEIN Trade-Pfad-Change. Geprueft wird,
 * was am Handy STILL schiefging (keine Meldung, kein Timeout, Panel weg,
 * Linie nicht antippbar). Die Gegenproben MUESSEN ROT koennen
 * (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   B6.1  Haengender auth/challenge-Fetch → nach der Frist { error:'timeout' },
 *         sayLoud nennt den haengenden Schritt, busy=false, ein zweiter Arm
 *         laeuft wieder. (Mutation: Promise.race in _timed → nur req → rot.)
 *   B6.1b Haengender /health → 'abgelaufen (preflight)', 0 Signaturen.
 *         (Mutation: pfTo aus dem race nehmen → rot.)
 *   B6.2  Zwischenschritte erzeugen Toast + Status-Chip + HUD.
 *         (Mutation: sayLoud→sayPanel bei „Vault-Anmeldung" → Toast-Zeile rot.)
 *   B6.3  Der Dialog bleibt bei Route Limit in Flight OFFEN und zeigt den
 *         Status; Diagnose-Zeilen sichtbar. (Mutation: _deferRefresh=false →
 *         der Abschnitt haengt ab → Status-/Diagnose-Assertion rot.)
 *   B6.4  no-feature (Wallet ohne signMessage) → Klartext „Phantom-Browser".
 *   M1.1  Tap 20 px neben der HLine oeffnet das Panel (coarse); die Maus tut
 *         das nicht. (Mutation: SLOP=6 → rot.)
 *   M1.2  Pille auf der Preis-Achse: Tap oeffnet, Ziehen verschiebt den Preis,
 *         ohne den Chart zu pannen. (Mutation: Guard im Gesten-Modul weg →
 *         camera.wx-Assertion rot.)
 *   M1.3  Order-Liste → Zeile → Panel; Terminal-Zeile → Panel.
 *   S     Real-Adapter-Spion = 0 fuer alle Touch-Wege; reduced-motion-Guards;
 *         Topbar ≤5; HUD nicht in der Topbar.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v918_inflight_touch_browser.cjs
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const JWT  = 'HEAD.PAYLOAD.SIG-TESTONLY-918';

/* Node-seitige, zwischen den Schritten umschaltbare Netz-Konfiguration. */
const cfg = {
  hangChallenge: false,   // /v1/auth/challenge antwortet NIE (Fixture: haengender Fetch)
  hangHealth: false,      // /health antwortet NIE
  depositDelay: 0         // /v1/deposit/craft antwortet erst nach N ms (In-Flight sichtbar machen)
};
const VAULT_PATHS = ['/v1/auth/challenge','/v1/auth/verify','/v1/vault/register',
  '/v1/deposit/craft','/v1/orders/price','/v1/orders/active'];

(async () => {
  const browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    if(req.resourceType() === 'script')
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

    if(/\/health/.test(url)){
      if(cfg.hangHealth) return;                       // haengt — nie erfuellt
      const base = { ok:true, version:'tx v1.22', signs:false, kill:false };
      base.endpoints = ['/v1/quote','/v1/tx/swap','/v1/tx/status','/v1/rpc/balance']
        .concat(VAULT_PATHS.map(p => 'POST ' + p));
      return J(base);
    }
    if(/\/v1\/auth\/challenge/.test(url)){
      if(cfg.hangChallenge) return;                    // haengt — nie erfuellt
      return J({ ok:true, challenge:'CR-CHALLENGE-918-abc', expires_in_s:120 });
    }
    if(/\/v1\/auth\/verify/.test(url))    return J({ ok:true, token:JWT, expires_in_s:600 });
    if(/\/v1\/vault\/register/.test(url)) return J({ ok:true, registered:true });
    if(/\/v1\/deposit\/craft/.test(url)){
      if(cfg.depositDelay) await sleep(cfg.depositDelay);
      return J({ ok:true, transaction:'AQIDBAU=', expires_in_s:40, deposit:{ amount_raw:'1000000' },
                 fee:{ bps:50 }, cluster:'mainnet' });
    }
    if(/\/v1\/orders\/price/.test(url))   return J({ ok:true, orderPubkey:'ORDER918', status:'Open', fee:{ bps:50 } });
    if(/\/v1\/orders\/active/.test(url))  return J({ ok:true, orders:[{ orderKey:'ORDER918', status:'Open' }] });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/v1\/token\/safety/.test(url))  return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    return J({ ok:true, prices:{}, mints:{}, holdings:[], candles:[] });
  });

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    try { localStorage.setItem('cr_onboarding_v1', JSON.stringify({ done:true })); } catch(_){}
    try { localStorage.setItem('cr_touch_force_v1', 'on'); } catch(_){}
    window.__signs = [];       // signAndSend (finanzwirksam)
    window.__msgs  = [];       // signMessage (freie Challenge)
    window.__noSignMsg = false; // B6.4: Wallet OHNE signMessage-Feature simulieren
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      const feats = {
        'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
        'solana:signMessage':{ version:'1.0.0',
          signMessage: async (i) => { window.__msgs.push(i && i.message ? i.message.length : 0);
            const s = new Uint8Array(64); s[0] = 7; return [{ signature:s }]; } },
        'solana:signAndSendTransaction':{ version:'1.0.0',
          signAndSendTransaction: async (i) => { window.__signs.push({ chain: i && i.chain });
            const s = new Uint8Array(64); s[0] = 9; return [{ signature:s }]; } } };
      const w = { name:'M', version:'1', icon:'', chains:['solana:mainnet'], get accounts(){ return [acct]; }, features: feats };
      window.__mockWallet = w;
      (typeof r === 'function' ? r : r.register)(w);
    });
  };
  await page.addInitScript(initWallet, [ADDR]);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|aborted/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.918',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 918)))), bv);
  const mods = await page.evaluate(() => ({
    flight: !!(window.crVaultFlight && typeof crVaultFlight.step === 'function'),
    loud: !!(window.crLoud && typeof crLoud.show === 'function'),
    grip: !!(window.crTouchGrip && typeof crTouchGrip.pickNear === 'function'),
    to: window.crVaultApi && crVaultApi.timeouts ? crVaultApi.timeouts() : null }));
  check('Module da: crVaultFlight, crLoud, crTouchGrip', mods.flight && mods.loud && mods.grip, mods);
  check('Default-Fristen: Vault-Call 15 s, /health-Preflight 8 s',
    mods.to && mods.to.post === 15000 && mods.to.preflight === 8000, mods.to);

  console.log('\n-- Aufbau: Sol-Chart, Jupiter-Referenz, Wallet, globales ARM --');
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
  check('Sol-Asset aktiv, badgeGate offen, Wallet signierfaehig',
    setup.mint === BONK && setup.badge && setup.badge.ok === true && setup.ready === true, setup);

  /* Toast-Recorder + Panel-Fabrik in die Seite. */
  await page.evaluate(() => {
    window.__toasts = [];
    const _orig = window.toast;
    window.toast = function(m){ try { window.__toasts.push(String(m)); } catch(_){} return _orig ? _orig(m) : undefined; };
    // CC-Notifications (crNotify) mitschneiden — die Diagnose geht dort direkt hin, nicht ueber toast().
    window.__cc = [];
    const _origN = window.crNotify;
    window.crNotify = function(m, k){ try { window.__cc.push(String(m)); } catch(_){} return _origN ? _origN(m, k) : undefined; };
    window.__wrapSection = function(section){
      const sels = section.querySelectorAll('select');
      const route = sels[0], side = sels[1];
      const armed = section.querySelector('input[type=checkbox]');
      const size = Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox');
      const msg  = section.querySelector('[data-cr-panel-msg]');
      const diag = section.querySelector('[data-cr-panel-diag]');
      return { section, route, side, armed, size, msg, diag,
        msgText(){ return msg ? msg.textContent : ''; },
        diagLines(){ const l = section.querySelector('[data-cr-panel-diag-list]'); return l ? Array.from(l.children).map(d => d.textContent) : []; },
        diagVisible(){ return !!(diag && diag.style.display !== 'none'); },
        setRoute(v){ route.value = v; route.dispatchEvent(new Event('change')); },
        setPrice(p){ let inp = null;
          section.querySelectorAll('label').forEach(l => { const s=l.querySelector('span'); if(s && /^price$/i.test((s.textContent||'').trim())) inp = l.querySelector('input'); });
          if(inp){ inp.value = p; inp.dispatchEvent(new Event('input')); return true; } return false; },
        armLimit(p){ this.setRoute('limit'); this.setPrice(p || '0.0001');
          size.value = '0,05'; size.dispatchEvent(new Event('change'));
          armed.checked = true; armed.dispatchEvent(new Event('change'));
          let b = null; section.querySelectorAll('button').forEach(x => { if(/arm/i.test(x.textContent||'')) b = x; });
          if(b) b.click(); return !!b; } };
    };
    window.__mkPanel = function(){
      const host = document.createElement('div'); document.body.appendChild(host);
      const overlay = { kind:'hline', id: Math.floor(Math.random()*1e6), py:100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const P = window.__wrapSection(section); P.host = host; P.overlay = overlay; return P;
    };
  });

  /* ===================== B6.1 — haengender challenge → timeout ===================== */
  console.log('\n-- B6.1: haengender auth/challenge → timeout nennt den Schritt, busy=false, zweiter Arm laeuft --');
  cfg.hangChallenge = true;
  const b61 = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    crVaultApi._setTimeouts({ post: 600 });         // Frist verkuerzt — der Mechanismus ist derselbe
    const sM = window.__msgs.length, sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.armLimit();
    await new Promise(r => setTimeout(r, 250));
    const during = { busy: crVaultFlight.busy(), chip: (window.crTouch && crTouch.statusChip) ? crTouch.statusChip() : '',
                     hanging: crVaultFlight.hanging(), msg: P.msgText() };
    // Zweiter Arm WAEHREND der laufenden Anfrage: kein zweiter Flow.
    P.armLimit();
    const secondMsg = P.msgText();
    await new Promise(r => setTimeout(r, 900));
    const after = { busy: crVaultFlight.busy(), msg: P.msgText(), toasts: window.__toasts.slice(), cc: window.__cc.slice(),
                    hud: crLoud.last().text, lines: crVaultFlight.lines(),
                    dMsgs: window.__msgs.length - sM, dSigns: window.__signs.length - sS,
                    chip: (window.crTouch && crTouch.statusChip) ? crTouch.statusChip() : '' };
    P.host.remove();
    return { during, secondMsg, after };
  });
  check('waehrend des Haengers: busy=true, haengender Schritt = challenge, Chip zeigt „Vault …"',
    b61.during.busy === true && b61.during.hanging === 'challenge' && /Vault/.test(b61.during.chip), b61.during);
  check('zweiter Arm waehrend der Anfrage: „in flight" + haengender Schritt, kein zweiter Flow',
    /in flight/i.test(b61.secondMsg) && /challenge/.test(b61.secondMsg), b61.secondMsg);
  check('nach der Frist: Meldung „abgelaufen (challenge)" im Panel',
    /abgelaufen/.test(b61.after.msg) && /challenge/.test(b61.after.msg), b61.after.msg);
  check('…dieselbe Meldung als Toast (CC-Verlauf) und im Top-HUD',
    b61.after.toasts.some(t => /abgelaufen/.test(t) && /challenge/.test(t)) && /abgelaufen/.test(b61.after.hud), { toasts: b61.after.toasts, hud: b61.after.hud });
  check('busy wurde zurueckgesetzt; keine Signatur (weder Nachricht noch Deposit)',
    b61.after.busy === false && b61.after.dMsgs === 0 && b61.after.dSigns === 0, b61.after);
  check('Diagnose-Spur nennt preflight und challenge mit Ergebnis timeout',
    b61.after.lines.some(l => /^preflight/.test(l)) && b61.after.lines.some(l => /^challenge .*timeout/.test(l)), b61.after.lines);
  check('Vault-Diagnose als CC-Notification (crNotify) mit dem haengenden Schritt',
    b61.after.cc.some(t => /Vault-Diagnose/.test(t) && /abgebrochen bei challenge/.test(t)), b61.after.cc);
  cfg.hangChallenge = false;

  const b61b = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    const sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.armLimit();
    await new Promise(r => setTimeout(r, 1200));
    const out = { msg: P.msgText(), dSigns: window.__signs.length - sS, busy: crVaultFlight.busy() };
    P.host.remove();
    return out;
  });
  check('zweiter Arm nach dem Timeout laeuft wieder: RUHENDE ORDER liegt, 1 Deposit-Signatur',
    /RUHENDE ORDER liegt/.test(b61b.msg) && b61b.dSigns === 1 && b61b.busy === false, b61b);

  /* ===================== B6.1b — haengender /health → preflight-timeout ===================== */
  console.log('\n-- B6.1b: haengender /health → „abgelaufen (preflight)", nichts signiert --');
  cfg.hangHealth = true;
  const b61h = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    crVaultApi._setTimeouts({ preflight: 400 });
    const sM = window.__msgs.length, sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.armLimit();
    await new Promise(r => setTimeout(r, 900));
    const out = { msg: P.msgText(), busy: crVaultFlight.busy(),
                  dMsgs: window.__msgs.length - sM, dSigns: window.__signs.length - sS };
    P.host.remove();
    crVaultApi._pfReset();
    return out;
  });
  check('/health haengt: „abgelaufen (preflight)", busy=false, 0 Signaturen',
    /abgelaufen \(preflight\)/.test(b61h.msg) && b61h.busy === false && b61h.dMsgs === 0 && b61h.dSigns === 0, b61h);
  cfg.hangHealth = false;

  /* ===================== B6.2 + B6.3 — In-Flight laut, Dialog bleibt offen ===================== */
  console.log('\n-- B6.2/B6.3: echter Dialog, langsamer deposit/craft → Status im offenen Dialog, Chip, Toasts, Diagnose --');
  cfg.depositDelay = 900;
  await page.evaluate(() => {
    crVaultApi._pfReset(); crVaultApi.clear(); crVaultApi._setTimeouts({ post: 15000, preflight: 8000 });
    try { document.body.classList.remove('crSplashUp'); } catch(_){}
    try { if(typeof hideSplash === 'function') hideSplash(); } catch(_){}
    try { restart(); } catch(_){}
    try { window.crGuest = () => false; } catch(_){}
    try { crTouch.setActive(true); crTouch.refresh(); } catch(_){}
    window.__toasts.length = 0;
    const price = currentPrice();
    const ov = { id: game.anchorNextId++, kind:'hline', py: price * 1.01, wx: player.wx, t:0 };
    game.anchorLines.push(ov);
    window.__ov = ov;
    cr.blueLaser.openRouteSettings({ kind:'hline', overlay: ov });
    const section = document.querySelector('#tvSettingsOverlay [data-blue-route-inputs]');
    const P = window.__wrapSection(section);
    window.__P = P;
    P.armLimit(String((price * 1.01).toFixed(6)));
  });
  await sleep(450);
  const b62 = await page.evaluate(() => {
    const dlg = document.getElementById('tvSettingsOverlay');
    const sec = dlg ? dlg.querySelector('[data-blue-route-inputs]') : null;
    const P = sec ? window.__wrapSection(sec) : null;
    return { dialogOpen: !!dlg, sameSection: !!(sec && sec === window.__P.section),
             msg: P ? P.msgText() : '', diagVisible: P ? P.diagVisible() : false, lines: P ? P.diagLines() : [],
             chip: crTouch.statusChip(), chipEl: (() => { const c = document.getElementById('crSelChip'); return c ? { hidden: c.hidden, text: c.textContent } : null; })(),
             hud: crLoud.text(), busy: crVaultFlight.busy(), toasts: window.__toasts.slice() };
  });
  check('Dialog ist waehrend der Anfrage OFFEN und derselbe Abschnitt haengt noch drin (kein Auto-Close/Neu-Render)',
    b62.dialogOpen && b62.sameSection, b62);
  check('Status im Dialog: Zwischenschritt sichtbar (Vault-Anmeldung/Vorbereitung)',
    /Vault/.test(b62.msg), b62.msg);
  check('Diagnose-Block sichtbar mit Schritten (preflight, resolveTrade, decide, challenge …)',
    b62.diagVisible && b62.lines.some(l => /preflight/.test(l)) && b62.lines.some(l => /decide/.test(l)) && b62.lines.some(l => /challenge/.test(l)), b62.lines);
  check('Status-Chip am Selektor zeigt „⏳ Vault …" / „✍️ Wallet …" (sichtbar)',
    /Vault|Wallet/.test(b62.chip) && b62.chipEl && b62.chipEl.hidden === false && /Vault|Wallet/.test(b62.chipEl.text), b62);
  check('Top-HUD traegt Text waehrend der Anfrage', b62.hud.length > 0 && b62.busy === true, b62.hud);
  check('Zwischenschritte als Toast: „Preflight" und „Vault-Anmeldung"',
    b62.toasts.some(t => /Preflight/.test(t)) && b62.toasts.some(t => /Vault-Anmeldung/.test(t)), b62.toasts);
  await sleep(1600);
  const b63 = await page.evaluate(() => {
    const dlg = document.getElementById('tvSettingsOverlay');
    const sec = dlg ? dlg.querySelector('[data-blue-route-inputs]') : null;
    const P = sec ? window.__wrapSection(sec) : null;
    const out = { dialogOpen: !!dlg, msg: P ? P.msgText() : '', lines: P ? P.diagLines() : [], busy: crVaultFlight.busy(),
                  toasts: window.__toasts.slice(), chip: crTouch.statusChip(), signs: window.__signs.length };
    return out;
  });
  check('Verdikt: RUHENDE ORDER liegt — im (weiter offenen, neu gerenderten) Dialog sichtbar',
    b63.dialogOpen && /RUHENDE ORDER liegt/.test(b63.msg) && b63.busy === false, b63);
  check('Diagnose nach dem Verdikt: signMessage, depositCraft, commit, depositSign, ordersPrice, ordersActive je mit Dauer',
    ['signMessage','depositCraft','commit','depositSign','ordersPrice','ordersActive'].every(k => b63.lines.some(l => new RegExp('^\\d+\\. ' + k + ' \\d+ ms').test(l))), b63.lines);
  check('Zwischenschritt „Gebühr oben" + Verdikt als Toast; Chip zeigt das Ergebnis',
    b63.toasts.some(t => /Gebühr oben/.test(t)) && b63.toasts.some(t => /RUHENDE ORDER liegt/.test(t)) && /✅/.test(b63.chip), { toasts: b63.toasts, chip: b63.chip });
  cfg.depositDelay = 0;
  await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} });

  /* ===================== B6.4 — kein Signer → Klartext ===================== */
  console.log('\n-- B6.4: Wallet ohne signMessage → „im Phantom-Browser öffnen oder Wallet neu verbinden" --');
  const b64 = await page.evaluate(async () => {
    crVaultApi._pfReset(); crVaultApi.clear();
    const w = window.__mockWallet; const saved = w.features['solana:signMessage'];
    delete w.features['solana:signMessage'];
    const sS = window.__signs.length;
    const P = window.__mkPanel();
    window.__toasts.length = 0;
    P.armLimit();
    await new Promise(r => setTimeout(r, 900));
    const out = { msg: P.msgText(), busy: crVaultFlight.busy(), dSigns: window.__signs.length - sS };
    w.features['solana:signMessage'] = saved;
    P.host.remove();
    return out;
  });
  check('no-feature: Klartext mit Phantom-Browser-Hinweis, busy=false, 0 Deposit-Signaturen',
    /Phantom-Browser/.test(b64.msg) && /Wallet neu verbinden/.test(b64.msg) && b64.busy === false && b64.dSigns === 0, b64);

  /* ===================== Real-Adapter-Spion fuer die Touch-Wege ===================== */
  await page.evaluate(() => {
    window.__calls = 0;
    try { ChartRunner.sdk.setRealSDK({
      marketSwap: () => { window.__calls++; return Promise.resolve({ sig:'X' }); },
      limitVault: () => { window.__calls++; return Promise.resolve({ orderPubkey:'Y' }); } }); } catch(_){}
    try { closeTvSettingsDialog(); } catch(_){}
    try { crTouchGrip._log.length = 0; } catch(_){}
    // Das „Claim your runner name"-Modal (#crNameModal) legt sich nach dem Wallet-Connect
    // ueber den Chart und wuerde einen echten Tap abfangen — im Test weg.
    try { const nm = document.getElementById('crNameModal'); if(nm) nm.classList.remove('on'); } catch(_){}
  });

  /* ===================== M1.1 — Hit-Slop am Touch ===================== */
  console.log('\n-- M1.1: Tap 20 px neben der HLine oeffnet das Panel (coarse); Maus nicht --');
  const geo = await page.evaluate(() => {
    const r = cv.getBoundingClientRect();
    const ov = window.__ov;
    ov.py = yToPrice(H * 0.4);          // sichtbar im Bild (die B6-Linie lag bei Kurs*1,01 ausserhalb)
    const y = priceToY(ov.py);
    return { left: r.left, top: r.top, w: W, h: H, y, running: game.running, laser: !!game.laserAiming,
             enabled: crTouchGrip.enabled(), coarse: crTouchGrip.coarse(), candles: candles.length,
             pickAt0: !!crTouchGrip.pickNear(W * 0.4, y), pickAt20: !!crTouchGrip.pickNear(W * 0.4, y + 20), pickAt30: !!crTouchGrip.pickNear(W * 0.4, y + 30),
             mouseAt20: !!hitOverlay(W * 0.4, y + 20),
             elAt: (() => { const el = document.elementFromPoint(r.left + W * 0.4, r.top + y + 20); return el ? (el.tagName + '#' + el.id + '.' + el.className) : null; })(),
             cvRect: { w: r.width, h: r.height }, dpr: window.devicePixelRatio };
  });
  check('Fixture: Run laeuft, Touch-Griff aktiv (coarse), Linie im Bild', geo.running && geo.enabled && geo.coarse && geo.y > 20 && geo.y < geo.h - 20, geo);
  check('pickNear: Treffer bei 0 px und 20 px, keiner bei 30 px (44-px-Zone); hitOverlay (Maus) bei 20 px = kein Treffer',
    geo.pickAt0 && geo.pickAt20 && !geo.pickAt30 && !geo.mouseAt20, geo);
  // Touch-Fixture: echte TouchEvents, im selben Tick wie die Messung (der Run laeuft,
  // die y-Skala driftet zwischen zwei CDP-Roundtrips um einige Pixel).
  await page.evaluate(() => {
    window.__touchTap = async function(sx, sy){
      const r = cv.getBoundingClientRect();
      const mk = (type) => {
        const t = new Touch({ identifier: 7, target: cv, clientX: r.left + sx, clientY: r.top + sy, pageX: r.left + sx, pageY: r.top + sy });
        return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t], bubbles: true, cancelable: true });
      };
      cv.dispatchEvent(mk('touchstart'));
      const te = mk('touchend'); cv.dispatchEvent(te);
      await new Promise(r2 => setTimeout(r2, 250));
      return { dlg: !!document.getElementById('tvSettingsOverlay'), log: crTouchGrip._log.slice(), prevented: te.defaultPrevented };
    };
  });
  const m11 = await page.evaluate(async () => { crTouchGrip._log.length = 0; return window.__touchTap(W * 0.4, priceToY(window.__ov.py) + 20); });
  check('Touch-Tap 20 px neben der Linie: Objekt-Panel oeffnet (Route-Einstellungen der Linie), synthetische Maus-Events unterdrueckt',
    m11.dlg && m11.log.some(l => /route:hline/.test(l)) && m11.prevented === true, m11);
  await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} crTouchGrip._log.length = 0; });
  const m11n = await page.evaluate(async () => { crTouchGrip._log.length = 0; return window.__touchTap(W * 0.4, priceToY(window.__ov.py) + 30); });
  check('Touch-Tap 30 px neben der Linie (ausserhalb der 44-px-Zone): KEIN Panel', !m11n.dlg && m11n.log.length === 0, m11n);
  // Echter Playwright-Tap (CDP-Touch) auf die Linienmitte: der reale Ereignispfad.
  const yNow = await page.evaluate(() => { window.__teProbe = null; window.__docTe = null; document.addEventListener('touchend', function h2(e){ document.removeEventListener('touchend', h2, true); const el = e.target; window.__docTe = el.tagName + '#' + el.id + '.' + el.className; }, true); const r0 = cv.getBoundingClientRect(); const e0 = document.elementFromPoint(r0.left + W * 0.4, r0.top + priceToY(window.__ov.py)); window.__elAt = e0 ? (e0.tagName + '#' + e0.id + '.' + e0.className + ' z=' + getComputedStyle(e0).zIndex) : null; cv.addEventListener('touchend', function h(e){ cv.removeEventListener('touchend', h); const t = e.changedTouches[0]; const r = cv.getBoundingClientRect(); window.__teProbe = { sy: t.clientY - r.top, lineY: priceToY(window.__ov.py), enabled: crTouchGrip.enabled(), pick: !!crTouchGrip.pickNear(t.clientX - r.left, t.clientY - r.top), dragging: crTouchGrip.dragging() }; }); return priceToY(window.__ov.py); });
  await page.touchscreen.tap(geo.left + geo.w * 0.4, geo.top + yNow);
  await sleep(350);
  const m11r = await page.evaluate(() => ({ dlg: !!document.getElementById('tvSettingsOverlay'), log: crTouchGrip._log.slice(), calls: window.__calls, probe: window.__teProbe, docTe: window.__docTe, elAt: window.__elAt, yNow: null }));
  m11r.yNow = yNow;
  check('Echter Touch-Tap (CDP) auf die Linie oeffnet das Panel', m11r.dlg && m11r.log.some(l => /route:hline/.test(l)), m11r);
  await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} crTouchGrip._log.length = 0; });
  await page.mouse.click(geo.left + geo.w * 0.4, geo.top + geo.y + 20);
  await sleep(300);
  const m11m = await page.evaluate(() => ({ dlg: !!document.getElementById('tvSettingsOverlay'), log: crTouchGrip._log.slice() }));
  check('Maus-Klick 20 px neben der Linie: KEIN Panel (Desktop unveraendert)', !m11m.dlg && m11m.log.length === 0, m11m);
  const fine = await page.evaluate(() => { crTouchGrip._force(false); const r = { p20: !!crTouchGrip.pickNear(W * 0.4, priceToY(window.__ov.py) + 20), coarse: crTouchGrip.coarse() }; crTouchGrip._force(null); return r; });
  check('Ohne groben Zeiger: pickNear = genau EINE Probe (20 px daneben = kein Treffer)', fine.coarse === false && fine.p20 === false, fine);

  /* ===================== M1.2 — Pille: Tap oeffnet, Ziehen verschiebt ===================== */
  console.log('\n-- M1.2: Pille auf der Preis-Achse — Tap oeffnet, Ziehen verschiebt den Preis ohne Pan --');
  const pill = await page.evaluate(() => { const y = priceToY(window.__ov.py); return { y, hit: !!crTouchGrip.pillAt(W - 30, y + 12), miss: !!crTouchGrip.pillAt(W - 200, y) }; });
  check('pillAt: Treffer auf der Achse (±22 px), kein Treffer links davon', pill.hit && !pill.miss, pill);
  const m12t = await page.evaluate(async () => { crTouchGrip._log.length = 0; return window.__touchTap(W - 30, priceToY(window.__ov.py) + 12); });
  check('Tap auf die Pille (12 px neben der Linienmitte, auf der Achse) oeffnet das Panel', m12t.dlg && m12t.log.some(l => /route:hline/.test(l)), m12t);
  await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} });
  const drag = await page.evaluate(async () => {
    const ov = window.__ov;
    const y0 = priceToY(ov.py), x = W - 30, y1 = y0 - 60;
    const r = cv.getBoundingClientRect();
    const mk = (type, cx, cy) => {
      const t = new Touch({ identifier: 1, target: cv, clientX: r.left + cx, clientY: r.top + cy, pageX: r.left + cx, pageY: r.top + cy });
      return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t], bubbles: true, cancelable: true });
    };
    const wx0 = camera.wx, panY0 = camera.panY || 0, py0 = ov.py;
    cv.dispatchEvent(mk('touchstart', x, y0));
    const draggingAfterStart = crTouchGrip.dragging();
    const gripOn = !!(ov._grip && ov._grip.active);
    cv.dispatchEvent(mk('touchmove', x, y0 - 20));
    cv.dispatchEvent(mk('touchmove', x, y1));
    await new Promise(r2 => setTimeout(r2, 30));
    const expect = yToPrice(y1);
    const pyMid = ov.py;
    cv.dispatchEvent(mk('touchend', x, y1));
    await new Promise(r2 => setTimeout(r2, 250));
    return { draggingAfterStart, gripOn, py0, pyMid, pyEnd: ov.py, expect, cur: currentPrice(),
             wxSame: camera.wx === wx0, panYSame: (camera.panY || 0) === panY0, dlg: !!document.getElementById('tvSettingsOverlay'),
             gripOff: !(ov._grip && ov._grip.active), dragging: crTouchGrip.dragging() };
  });
  const near = (a, b) => Math.abs(a - b) <= Math.abs(b) * 0.002;
  check('Ziehen der Pille: Griff aktiv (Loupe), Preis folgt dem Daumen (oder Magnet auf den Kurs)',
    drag.draggingAfterStart && drag.gripOn && drag.pyEnd !== drag.py0 && (near(drag.pyEnd, drag.expect) || near(drag.pyEnd, drag.cur)), drag);
  check('…dabei KEIN Chart-Pan (camera.wx/panY unveraendert), kein Panel, Griff nach dem Loslassen aus',
    drag.wxSame && drag.panYSame && !drag.dlg && drag.gripOff && !drag.dragging, drag);

  /* ===================== M1.3 — Order-Liste + Terminal-Zeile ===================== */
  console.log('\n-- M1.3: Order-Scheibe → Liste (LIVE-getaggt) → Panel; Terminal OFFENE POSITIONEN → Panel --');
  const list = await page.evaluate(([mint]) => {
    const ov = window.__ov;
    // frische Jupiter-Referenz (die Badge-Frist ist kurz; der Test laeuft laenger als sie)
    try { crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0); } catch(_){}
    const items = crTouch.orderItems();
    const opened = crTouch.openOrderList();
    const sheet = document.getElementById('crOrderList');
    const rows = sheet ? Array.from(sheet.querySelectorAll('.row')).map(r => ({ kind: r.getAttribute('data-cr-kind'), id: r.getAttribute('data-cr-id'), tag: r.querySelector('.tg').textContent, lb: r.querySelector('.lb').textContent })) : [];
    return { n: items.length, opened, sheet: !!sheet, rows, ovId: String(ov.id),
             tag: items.filter(i => i.overlay === ov).map(i => i.tag)[0], klar: crPanelKlar.state(true, 'limit'), badge: crWeiche.badgeGate() };
  }, [BONK]);
  check('Order-Liste oeffnet mit „Neue Order" + der Linie; die ruhende Limit-Order ist LIVE-getaggt',
    list.opened && list.sheet && list.rows.length >= 2 && list.rows.some(r => r.kind === 'hline' && r.id === list.ovId) && list.tag === 'LIVE', list);
  await page.evaluate(() => { crTouchGrip._log.length = 0; const row = document.querySelector('#crOrderList .row[data-cr-kind="hline"]'); row.click(); });
  await sleep(300);
  const m13 = await page.evaluate(() => ({ dlg: !!document.getElementById('tvSettingsOverlay'), sheet: !!document.getElementById('crOrderList'), log: crTouchGrip._log.slice() }));
  check('Tap auf die Zeile: Liste zu, Panel der Linie offen', m13.dlg && !m13.sheet && m13.log.some(l => /route:hline/.test(l)), m13);
  await page.evaluate(() => { try { closeTvSettingsDialog(); } catch(_){} });
  const emptyList = await page.evaluate(() => {
    const saved = game.anchorLines.slice(); game.anchorLines.length = 0;
    let panel = 0; const orig = crTouch.openActivationPanel; crTouch.openActivationPanel = () => { panel++; return true; };
    const r = crTouch.openOrderList();
    crTouch.openActivationPanel = orig; game.anchorLines.push(...saved);
    return { r, panel, sheet: !!document.getElementById('crOrderList') };
  });
  check('Ohne Chart-Objekte: Order-Scheibe geht direkt ins Activation-Panel (bisheriges Verhalten)', emptyList.panel === 1 && !emptyList.sheet, emptyList);

  const term = await page.evaluate(async () => {
    game.visualBrackets = game.visualBrackets || [];
    const b = { wx: player.wx, entry: currentPrice(), tp: currentPrice() * 1.02, sl: currentPrice() * 0.98, side: 'long', id: 'brk-918' };
    game.visualBrackets.push(b);
    try { osOpenWindow('terminal'); } catch(_){}
    await new Promise(r => setTimeout(r, 700));
    const host = document.getElementById('crTermOpenList');
    const row = host ? host.querySelector('.crTerm-tblRow[data-cr-ov="bracket:' + (game.visualBrackets.length - 1) + '"]') : null;
    if(row) row.click();
    await new Promise(r => setTimeout(r, 300));
    const out = { host: !!host, row: !!row, dlg: !!document.getElementById('tvSettingsOverlay') };
    try { closeTvSettingsDialog(); } catch(_){}
    game.visualBrackets.pop();
    return out;
  });
  check('Terminal OFFENE POSITIONEN: Zeile traegt die Objekt-Referenz, Klick oeffnet das Panel', term.host && term.row && term.dlg, term);

  /* ===================== S — Spion / reduced-motion / Topbar ===================== */
  console.log('\n-- S: Real-Adapter-Spion, reduced-motion, Topbar ≤5, HUD ausserhalb der Topbar --');
  const s = await page.evaluate(() => {
    const bar = document.getElementById('crOSBar');
    const loudCss = document.getElementById('crLoudCss'), touchCss = document.getElementById('crTouchCss918');
    const hud = document.getElementById('crLoudHud');
    return { calls: window.__calls,
             rmLoud: !!(loudCss && /prefers-reduced-motion: no-preference/.test(loudCss.textContent)),
             rmTouch: !!(touchCss && /prefers-reduced-motion: no-preference/.test(touchCss.textContent)),
             barBtns: bar ? bar.querySelectorAll('.cr-bar-btn').length : -1,
             hudInBar: !!(bar && hud && bar.contains(hud)), hudOnBody: !!(hud && hud.parentElement === document.body),
             chipInBar: !!(bar && bar.querySelector('#crSelChip')) };
  });
  check('KEIN Touch-/Listen-/Terminal-Weg feuert einen Trade (Real-Adapter-Spion === 0)', s.calls === 0, s);
  check('reduced-motion-Guards im HUD- und im Chip/Listen-CSS', s.rmLoud && s.rmTouch, s);
  check('Topbar bleibt bei ≤5; HUD und Chip haengen NICHT in der Topbar', s.barBtns <= 5 && !s.hudInBar && s.hudOnBody && !s.chipInBar, s);
  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::|aborted/i.test(m));
  check('keine harten Page-Errors waehrend der Pruefung', hard2.length === 0, hard2.slice(0, 3));

  await browser.close();
  console.log('\n' + pass + ' ok · ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
