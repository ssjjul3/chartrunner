/* Smoke-Verifikation v1.0.892 — der SCHARF-Schalter und die fuenf Mitfahrer.
 *
 * Das Prinzip in einem Satz, und jede scharfe Zeile hier prueft genau ihn:
 * DER CHART WIRD EINGABEGERAET, DER GEPRUEFTE HANDELSWEG BLEIBT DERSELBE.
 * Kein zweiter Pfad, kein Auto-Fire, die Wallet signiert immer.
 *
 * Scharf geprueft wird, was Geld oder Wahrheit kostet, wenn es fehlt:
 *   · SIM ist der Anfangszustand — und zwar nach JEDEM Neustart. Ein
 *     Schalter, der sich merkt, dass er scharf war, ist scharf, bevor
 *     jemand hinsieht.
 *   · SCHARF ist ohne Wallet nicht waehlbar, und der gesperrte Schalter
 *     sagt WARUM.
 *   · Der Kauf-Tap oeffnet ein FORMULAR, keine Order: vor Tap 1 geht keine
 *     Anfrage raus, vor Tap 2 wird nichts signiert.
 *   · Das Gitter folgt safety.decision, nicht verdict — der Verkaufsweg
 *     bleibt bei deny offen (Exit-Regel tx v1.15).
 *   · Die Vorbefuellung kann das Betragslimit nicht ueberschreiten.
 *   · Die v887-Marker invertieren VOLLSTAENDIG: dieselben Stellen, ein
 *     Begriff, kein Rest.
 *   · Mitfahrer: venues aus der v1.15-Antwort · „Preis live · Kurve
 *     synthetisch" · Anker-Name VOR dem Bau geprueft (keine Anfrage) ·
 *     Karten-Status aus der Anker-Liste, Ausfall != OFF-CHAIN.
 *
 * Gesucht wird MARKUP und ZUSTAND, nicht Prosa (v887-Disziplin: eine
 * Testzeile, die einen Satz sucht, findet ihn im Banner wieder).
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v892_scharf_browser.cjs
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
const HASH = 'a'.repeat(64);

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  const seen = [];                          // jede Anfrage, die das Spiel stellt
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    const cfg = await page.evaluate(() => window.__v892 || {}).catch(() => ({}));

    if(/\/v1\/token\/safety/.test(url))
      return J(cfg.safety || { ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/quote/.test(url))
      return J(cfg.quote || { ok:true,
        quote:{ in_raw:'1000000000', out_raw:'42000000', min_out_raw:'41000000',
                slippage_bps:50, price_impact_pct:'0.0029' },
        route:{ hops:3, venues:['Whirlpool','BisonFi','Meteora'] } });
    if(/\/v1\/tx\/swap/.test(url))
      return J(cfg.swap || { transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377',
                slippage_bps:50, price_impact_pct:'0.0004' },
        cap:{ state:'none' }, fee:{ base_lamports:5000, priority_lamports:null },
        route:{ platform_fee_bps:50, hops:3, venues:['Whirlpool','BisonFi','Meteora'] },
        checked:{ instructions_match_request:true, level:'form+amount' } });
    if(/\/v1\/tx\/anchor/.test(url)){
      await page.evaluate(b => { window.__v892 = window.__v892 || {}; window.__v892.anchorBody = b; },
        (() => { try { return req.postData(); } catch(_){ return null; } })()).catch(() => {});
      return J(cfg.anchorRes || { ok:true, transaction:'AQIDBAU=',
        memo:'cr1:map:Testkarte:' + HASH.slice(0,8), expires_in_s:60, cluster:'mainnet',
        fee:{ base_lamports:5000, priority_lamports:null } });
    }
    if(/\/v1\/anchor\/list/.test(url)){
      const l = cfg.anchorList;
      if(l && l.__http) return route.fulfill({ status:l.__http, contentType:'application/json', body:'{}' });
      return J(l || { ok:true, entries:[] });
    }
    if(/\/v1\/mints\/resolve/.test(url)) return J(cfg.resolve || { ok:true, mints:{} });
    if(/\/v1\/price/.test(url))          return J(cfg.price   || { ok:true, prices:{} });
    if(/\/v1\/tx\/status/.test(url))     return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    if(/\/v1\/rpc\/balance/.test(url))   return J({ ok:true, lamports:'900000000', cluster:'mainnet' });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/health/.test(url)) return J({ ok:true, version:'tx v1.15', signs:false, kill:false,
      swap:{ cap:{ state:'none' }, quote_currencies:[{ symbol:'USDC', mint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals:6 }] },
      token_safety:{ stage:2, gates_swap:true, gate:{ kill:false } },
      platform_fee:{ accounts:[{ symbol:'WSOL', state:'exists' }] } });
    return J({});
  });

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){}
    window.__signs = [];
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async (i) => { window.__signs.push({ chain: i && i.chain });
              const s = new Uint8Array(64); s[0] = 5; return [{ signature:s }]; } } } });
    });
  };
  await page.addInitScript(initWallet, [ADDR]);
  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const src = fs.readFileSync(FILE, 'utf8');
  /* Kommentare weg — die Aussagen unten meinen den LIVE-CODE. Die Kommentare
   * erzaehlen die Geschichte und muessen es duerfen. */
  const live = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.892',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 892)))),
    banner.slice(0, 60));

  /* ═══ A — SIM IST DER ANFANGSZUSTAND ══════════════════════════════════ */
  console.log('\n-- A · SIM ist Default, SCHARF braucht Wallet UND Mint --');

  check('SIM beim Start — crArm.on() ist falsch',
    await page.evaluate(() => crArm.on() === false));
  check('… und der Schalter im Chart sagt SIM',
    await page.evaluate(() => {
      const b = document.getElementById('crArmSwitch');
      return !!b && b.getAttribute('data-cr-arm-state') === 'sim' && b.textContent.trim() === 'SIM';
    }));
  check('die Kauf-/Verkaufs-Taps sind auf SIM gesperrt',
    await page.evaluate(() => !!(document.getElementById('crArmBuy').disabled
                              && document.getElementById('crArmSell').disabled)));
  check('kein LIVE-Badge an der Preislinie',
    await page.evaluate(() => document.getElementById('crArmBadge').style.display === 'none'));

  /* Ohne Mint ist SCHARF nicht waehlbar — der Chart steht auf BTC. */
  const ohneMint = await page.evaluate(() => {
    const before = crArm.on();
    const set = crArm.set(true);
    return { before, set, on: crArm.on(), reason: crArm.eligible().reason, mint: crArm.mint() };
  });
  check('ohne handelbaren Mint bleibt SCHARF unwaehlbar',
    ohneMint.set === false && ohneMint.on === false, ohneMint);
  check('… und der Grund steht im Klartext da', /Mint|mint/.test(ohneMint.reason), ohneMint.reason);

  /* Jetzt einen echten Solana-Chart laden — dieselbe Funktion, die der
   * RUN-Knopf im Token-Fenster benutzt. */
  await page.evaluate(async (m) => {
    const a = crEnsureCustomSolanaToken(m);
    await switchAsset(a.id);
  }, BONK).catch(() => {});
  await page.waitForTimeout(800);
  check('der Chart traegt jetzt einen Mint',
    await page.evaluate((m) => crArm.mint() === m, BONK));

  /* Ohne Wallet: SCHARF darf NICHT waehlbar sein. crSigner/crWallet werden
   * dafuer voruebergehend stummgeschaltet — dieselbe Lage wie ein Spieler
   * ohne verbundene Wallet. */
  const ohneWallet = await page.evaluate(() => {
    const sA = crSigner.active, wG = crWallet.get;
    crSigner.active = () => null; crWallet.get = () => '';
    const set = crArm.set(true), on = crArm.on(), reason = crArm.eligible().reason;
    crSigner.active = sA; crWallet.get = wG;
    return { set, on, reason };
  });
  check('ohne Wallet ist SCHARF nicht waehlbar', ohneWallet.set === false && ohneWallet.on === false, ohneWallet);
  check('… und der Grund nennt die Wallet', /Wallet|wallet|cartera|钱包/.test(ohneWallet.reason), ohneWallet.reason);

  check('mit Wallet UND Mint laesst sich scharf schalten',
    await page.evaluate(() => { crArm.set(true); return crArm.on() === true; }));
  check('… das LIVE-Badge steht an der Preislinie',
    await page.evaluate(() => { _crArmPaint(); return document.getElementById('crArmBadge').style.display !== 'none'; }));
  check('… und der Rahmen-Akzent liegt am Chart',
    await page.evaluate(() => document.body.classList.contains('cr-arm-live')));

  /* ── DIE SCHARFE ZEILE: NICHTS DAVON UEBERLEBT EINEN NEUSTART ──────────
   *
   * Zwei Wege, dieselbe Frage, weil der erste Versuch dieser Zeile bei der
   * Gegenprobe GRUEN blieb und damit nichts geprueft hat (CLAUDE.md,
   * ROT/CRASH/GRUEN):
   *
   *   1. Ein NAMENS-Filter ueber die Speicher-Schluessel („heisst irgendwas
   *      arm/scharf?") faellt auf jeden Schluessel herein, der anders heisst.
   *      Also stattdessen ein echter DIFF: alles vor dem Scharfschalten
   *      gegen alles danach. Was sich aendert, ist gemerkt worden — egal wie
   *      es heisst.
   *   2. Der Neustart-Test war zu schwach, weil nach dem Reload der Chart
   *      wieder auf BTC steht: on() waere selbst mit gemerktem Zustand
   *      falsch, weil der MINT fehlt — die Zeile mass die falsche Haelfte.
   *      Jetzt wird der Solana-Chart ZUERST wiederhergestellt und ERST DANN
   *      gefragt. Damit ist die einzige verbliebene Variable der Zustand. */
  console.log('\n-- A2 · Neustart faengt bei SIM an (der Zustand wird NIE persistiert) --');
  const speicher = () => page.evaluate(() => {
    const snap = (st) => { const o = {}; try {
      for(let i = 0; i < st.length; i++){ const k = st.key(i); o[k] = String(st.getItem(k) || ''); }
    } catch(_){} return o; };
    return { l: snap(localStorage), s: snap(sessionStorage) };
  });
  await page.evaluate(() => { crArm.set(false); });
  const vor = await speicher();
  await page.evaluate(() => { crArm.set(true); });
  const nach = await speicher();
  const diff = [];
  for(const store of ['l','s'])
    for(const k of new Set([...Object.keys(vor[store]), ...Object.keys(nach[store])]))
      if(vor[store][k] !== nach[store][k]) diff.push([store, k, vor[store][k], nach[store][k]]);
  check('Scharfschalten schreibt NICHTS in local-/sessionStorage (Diff ist leer)',
    diff.length === 0, diff);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  /* ZUERST den Chart wiederherstellen — sonst prueft die naechste Zeile nur,
   * dass BTC keinen Mint hat, und das wusste sie schon. */
  await page.evaluate(async (m) => {
    const a = crEnsureCustomSolanaToken(m);
    await switchAsset(a.id);
  }, BONK).catch(() => {});
  await page.waitForTimeout(600);
  check('… und der Chart traegt nach dem Neustart wieder seinen Mint (sonst prueft die naechste Zeile nichts)',
    await page.evaluate((m) => crArm.mint() === m, BONK));
  check('nach dem Neustart steht der Chart auf SIM — obwohl Wallet UND Mint wieder da sind',
    await page.evaluate(() => crArm.on() === false));
  check('… und der Schalter zeigt SIM',
    await page.evaluate(() => { _crArmPaint();
      return document.getElementById('crArmSwitch').getAttribute('data-cr-arm-state') === 'sim'; }));
  check('… und an der Preislinie steht kein LIVE-Badge',
    await page.evaluate(() => document.getElementById('crArmBadge').style.display === 'none'));

  /* Wieder scharf schalten fuer die folgenden Bloecke. */
  await page.evaluate(() => { crArm.set(true); _crArmPaint(); });
  check('wieder scharf für die naechsten Bloecke', await page.evaluate(() => crArm.on() === true));

  /* ═══ B — DER TAP OEFFNET EIN FORMULAR, KEINE ORDER ═══════════════════ */
  console.log('\n-- B · Kauf-Tap: KEINE Anfrage vor Tap 1, KEINE Signatur vor Tap 2 --');

  const zaehl = (re) => seen.filter(u => re.test(u)).length;
  const swapVor  = zaehl(/\/v1\/tx\/swap/);
  const signsVor = await page.evaluate(() => window.__signs.length);

  const sheet = await page.evaluate(() => {
    const host = _crArmOpenSheet('kauf');
    if(!host) return null;
    const el = document.getElementById('crArmSheet');
    return {
      offen: !!(el && el.classList.contains('on')),
      hatFormular: !!host.querySelector('[data-cr-swap-form]'),
      hatKnopf: !!host.querySelector('[data-cr-swap]'),
      mint: (host.querySelector('[data-cr-swap]') || {}).getAttribute
            ? host.querySelector('[data-cr-swap]').getAttribute('data-cr-swap') : '',
      betrag: (host.querySelector('[data-cr-swap-betrag]') || {}).value,
      panelLeer: (host.querySelector('[data-cr-swap-panel]') || {}).textContent === ''
    };
  });
  check('das Blatt oeffnet und traegt die BESTEHENDE Tafel', !!(sheet && sheet.offen && sheet.hatFormular && sheet.hatKnopf), sheet);
  check('… auf den Mint des Charts vorbefuellt', sheet && sheet.mint === BONK, sheet && sheet.mint);
  check('… mit einem Standard-Einsatz im Feld', !!(sheet && sheet.betrag && /\d/.test(sheet.betrag)), sheet && sheet.betrag);
  await page.waitForTimeout(600);
  check('VOR Tap 1 ging KEINE Handels-Anfrage raus (Auto-Fire waere hier rot)',
    zaehl(/\/v1\/tx\/swap/) === swapVor, { vor: swapVor, jetzt: zaehl(/\/v1\/tx\/swap/) });
  /* Nach dem Warten gemessen, nicht davor: der Klickpfad ist asynchron, eine
   * synchron gelesene leere Tafel haette auch ein Auto-Fire ueberlebt. */
  const tafelVorTap1 = await page.evaluate(() => {
    const p = document.querySelector('#crArmSheet [data-cr-swap-panel]');
    return { text: (p && p.textContent) || '', sichtbar: !!(p && p.style.display !== 'none') };
  });
  check('… und die Tafel ist unberuehrt, weil nichts geholt wurde',
    tafelVorTap1.text === '' && !tafelVorTap1.sichtbar, tafelVorTap1);
  check('VOR Tap 1 wurde nichts signiert',
    (await page.evaluate(() => window.__signs.length)) === signsVor);

  /* Tap 1: der Spieler holt das Angebot. Jetzt DARF eine Anfrage rausgehen —
   * und weiterhin darf nichts signiert werden. */
  const tafel = await page.evaluate(() => new Promise((resolve) => {
    const host = document.querySelector('#crArmSheet .cr-armSheetCard');
    host.querySelector('[data-cr-swap]').click();
    const p = host.querySelector('[data-cr-swap-panel]');
    const t0 = Date.now();
    (function poll(){
      const t = p.textContent || '';
      if((t && !/Angebot wird geholt|Wallet wird/.test(t)) || Date.now() - t0 > 12000) return resolve(t);
      setTimeout(poll, 120);
    })();
  }));
  check('Tap 1 holt das Angebot ueber DENSELBEN Weg (/v1/tx/swap)',
    zaehl(/\/v1\/tx\/swap/) === swapVor + 1, { vor: swapVor, jetzt: zaehl(/\/v1\/tx\/swap/) });
  check('… die Tafel „Bevor du signierst" steht da', /Bevor du signierst/.test(tafel), tafel.slice(0, 120));
  check('NACH Tap 1 ist immer noch nichts signiert (Tap 2 gehoert dem Spieler)',
    (await page.evaluate(() => window.__signs.length)) === signsVor);

  await page.evaluate(() => _crArmCloseSheet());

  /* ═══ C — DAS GITTER: decision fuehrt, verdict zeigt ══════════════════ */
  console.log('\n-- C · safety.decision: Kaufweg aus, Verkaufsweg offen --');

  const setz = (o) => page.evaluate(o2 => {
    window.__v892 = Object.assign(window.__v892 || {}, o2);
    try { for(const k of Object.keys(window._crSafetyCache || {})) delete window._crSafetyCache[k]; } catch(_){}
  }, o);

  await setz({ safety: { ok:true, checked:{ read:true, verdict:'block', decision:'deny',
    findings:[{ code:'freeze-authority', severity:'block', note:'kann einfrieren' }] } } });
  await page.evaluate(() => _crArmPaint());
  await page.waitForTimeout(900);
  await page.evaluate(() => _crArmPaint());
  const deny = await page.evaluate(() => ({
    buyOff:  document.getElementById('crArmBuy').disabled === true,
    sellOn:  document.getElementById('crArmSell').disabled === false,
    kaufSheet: !!_crArmOpenSheet('kauf'),
    verkaufSheet: !!_crArmOpenSheet('verkauf')
  }));
  check('decision deny → der Kauf-Tap im Chart ist aus', deny.buyOff, deny);
  check('decision deny → der Verkaufs-Tap bleibt OFFEN (Exit-Regel)', deny.sellOn, deny);
  check('… und der Kaufweg oeffnet kein Blatt', deny.kaufSheet === false, deny);
  check('… waehrend der Verkaufsweg eines oeffnet', deny.verkaufSheet === true, deny);
  await page.evaluate(() => _crArmCloseSheet());

  /* Die Gegenprobe im Code selbst: verdict 'block' MIT decision 'allow'
   * ist ein ERLAUBTER Kauf. Wer auf verdict verzweigt, faellt hier um. */
  await setz({ safety: { ok:true, checked:{ read:true, verdict:'block', decision:'allow',
    findings:[{ code:'freeze-authority', severity:'warn', note:'Hinweis' }] } } });
  await page.evaluate(() => _crArmPaint());
  await page.waitForTimeout(900);
  await page.evaluate(() => _crArmPaint());
  const allow = await page.evaluate(() => ({
    buyOn: document.getElementById('crArmBuy').disabled === false,
    dec:   _crArmSafetyDecision(crArm.mint())
  }));
  check('verdict block + decision allow → der Kauf-Tap bleibt AN (verdict-Verzweigung waere hier rot)',
    allow.buyOn, allow);
  check('… weil _crSafDecision decision liest', allow.dec === 'allow', allow);

  await setz({ safety: { ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } } });
  await page.evaluate(() => _crArmPaint());
  await page.waitForTimeout(900);

  /* ═══ D — DAS BETRAGSLIMIT ════════════════════════════════════════════ */
  console.log('\n-- D · Betragslimit: die Vorbefuellung kann es nicht ueberschreiten --');

  const limit = await page.evaluate(() => {
    const gross = crArm.capLamports();
    crArm.setCap(10000000);                       // 0,01 SOL
    _crArmCloseSheet();
    const host = _crArmOpenSheet('kauf');
    const v = host ? host.querySelector('[data-cr-swap-betrag]').value : null;
    const raw = _crParseBetrag(v || '', 9);
    _crArmCloseSheet();
    crArm.setCap(gross);
    return { v, raw: raw && raw.raw, cap: 10000000 };
  });
  check('Limit 0,01 SOL → die Vorbefuellung steht auf 0,01 SOL',
    limit.raw != null && Number(limit.raw) === 10000000, limit);
  check('… also NICHT auf dem Standard-Vorschlag 0,05 SOL',
    limit.raw != null && Number(limit.raw) <= limit.cap, limit);
  const limitGross = await page.evaluate(() => {
    const gross = crArm.capLamports();
    crArm.setCap(1000000000);                     // 1 SOL — Limit ueber dem Vorschlag
    _crArmCloseSheet();
    const host = _crArmOpenSheet('kauf');
    const v = host ? host.querySelector('[data-cr-swap-betrag]').value : null;
    _crArmCloseSheet(); crArm.setCap(gross);
    const raw = _crParseBetrag(v || '', 9);
    return raw && raw.raw;
  });
  check('Limit ueber dem Vorschlag → der Vorschlag gewinnt (das Limit ist eine Decke, kein Betrag)',
    limitGross != null && Number(limitGross) === 50000000, limitGross);

  /* ═══ E — DIE MARKER INVERTIEREN VOLLSTAENDIG ═════════════════════════ */
  console.log('\n-- E · v887-Marker: dieselben Stellen, ein Begriff, kein Rest --');

  const zaehlMarker = () => page.evaluate(() => ({
    sim:  document.querySelectorAll('[data-cr-sim]').length,
    live: document.querySelectorAll('[data-cr-live]').length
  }));
  await page.evaluate(() => { crArm.set(false); _crArmPaint(); _crArmCloseSheet(); });
  const mSim = await zaehlMarker();
  await page.evaluate(() => { crArm.set(true); _crArmPaint(); });
  const mLive = await zaehlMarker();
  check('auf SIM tragen die Marker SIM und NUR SIM', mSim.sim > 0 && mSim.live === 0, mSim);
  check('auf SCHARF tragen dieselben Stellen LIVE und NUR LIVE', mLive.live > 0 && mLive.sim === 0, mLive);
  check('… und es sind dieselben Stellen (gleiche Zahl, kein Rest, kein Zuwachs)',
    mSim.sim === mLive.live, { sim: mSim, live: mLive });

  /* Der dritte Marker-Ort (Primitives-Kopf) wird bei jedem Oeffnen neu gebaut
   * — er kann deshalb nicht mitgezaehlt werden, solange das Menue zu ist. Also
   * am Quelltext: er stempelt aus DERSELBEN Quelle wie der Rest. */
  check('der Primitives-Kopf stempelt aus derselben Quelle (_crArmMarkAttr/_crArmWord)',
    /head\.innerHTML[\s\S]{0,400}_crArmMarkAttr\(\)/.test(live)
    && /var _pmWord = _crArmWord\(\);/.test(live));

  const badgeWort = await page.evaluate(() => {
    const el = document.querySelector('[data-cr-mark-word]');
    return el ? el.textContent.trim() : null;
  });
  check('das Wort im Badge ist LIVE, solange der Chart scharf ist', badgeWort === 'LIVE', badgeWort);

  const orderZeile = async () => page.evaluate(() => {
    const vorher = document.querySelectorAll('.crNotifyMsg').length;
    sdk.bracket({ side:'buy', price: 100 });
    const alle = Array.from(document.querySelectorAll('.crNotifyMsg')).slice(vorher);
    return { sim: alle.filter(e => e.classList.contains('sim')).length,
             live: alle.filter(e => e.classList.contains('live')).length,
             text: alle.map(e => e.textContent).join(' | ') };
  });
  const oLive = await orderZeile();
  check('eine Order im scharfen Chart meldet sich als .crNotifyMsg.live',
    oLive.live === 1 && oLive.sim === 0, oLive);
  check('… und sagt trotzdem, dass bracket nichts ausfuehrt (kein Keeper)',
    /executes nothing|no keeper/i.test(oLive.text), oLive.text);
  await page.evaluate(() => { crArm.set(false); _crArmPaint(); });
  const oSim = await orderZeile();
  check('auf SIM meldet dieselbe Order sich wieder als .crNotifyMsg.sim',
    oSim.sim === 1 && oSim.live === 0, oSim);
  await page.evaluate(() => { crArm.set(true); _crArmPaint(); });

  /* ═══ F — MITFAHRER ═══════════════════════════════════════════════════ */
  console.log('\n-- F1 · venues: der Worker nennt die Plaetze, der Client zeigt sie --');

  const venues = await page.evaluate(async () => {
    try { for(const k of Object.keys(window.crQuote.__c || {})) delete window.crQuote.__c[k]; } catch(_){}
    const q = await crQuote.quote({ inMint:'So11111111111111111111111111111111111111112',
      outMint:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', amountRaw: 1000000000, slippageBps: 50 });
    return { hops: q.hops, labels: q.labels, html: _crTradeabilityHtml(q, 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') };
  });
  check('crQuote liest venues aus der v1.15-Antwort',
    Array.isArray(venues.labels) && venues.labels[0] === 'Whirlpool', venues.labels);
  check('… hops kommt aus derselben Antwort', venues.hops === 3, venues.hops);
  check('die Zeile nennt die Plaetze mit Namen',
    /Whirlpool/.test(venues.html) && /BisonFi/.test(venues.html));
  check('… und kein „3 Hop(s) über ?" mehr',
    !/Hop\(s\)\s*über\s*\?|hop\(s\)\s*via\s*\?/.test(venues.html));

  /* Ohne venues: KEIN Fragezeichen, sondern die Aussage, dass keine
   * Namen dastehen. Ein „?" liest sich wie ein Fehler des Workers. */
  const ohneNamen = await page.evaluate(() =>
    _crTradeabilityHtml({ hops: 2, labels: [], priceImpactPct: 0.0001 }, 'x'));
  check('ohne venues steht kein „?" da, sondern der Grund',
    !/\?\s*<\/span>/.test(ohneNamen) && /nennt keine|not named/.test(ohneNamen),
    ohneNamen.slice(0, 200));

  console.log('\n-- F2 · Etikett: zwei Wahrheiten, zwei Woerter --');
  const etikett = await page.evaluate(() => {
    const s = { hasBinance:false, live:false, pxLive:true, curveLive:false };
    const badge = (s.hasBinance)
      ? '' : (s.pxLive && !s.curveLive) ? 'px-live-curve-synth' : 'synth';
    return { badge, dictDe: (window.crI18n && crI18n.t) ? crI18n.t('tok.pxLiveCurveSynth','') : '' };
  });
  check('die deutsche Fassung lautet „Preis live · Kurve synthetisch"',
    etikett.dictDe === 'Preis live · Kurve synthetisch', etikett.dictDe);
  check('der Schnappschuss fuehrt pxLive UND curveLive getrennt',
    /pxLive:\s*_pxLive/.test(live) && /curveLive:\s*_curveLive/.test(live));
  check('das Etikett haengt an (pxLive && !curveLive), nicht mehr pauschal am fehlenden Binance-Pair',
    /s\.pxLive\s*&&\s*!s\.curveLive/.test(live));
  check('… und traegt einen DOM-Marker statt nur Prosa',
    /data-tok-px-label="px-live-curve-synth"/.test(live));

  console.log('\n-- F3 · Anker-Name: geprueft VOR dem Bau, keine Anfrage --');
  const ankerVor = zaehl(/\/v1\/tx\/anchor/);
  const nameFall = await page.evaluate(async (h) => {
    const maps = [
      { id:'m1', name:'BTC:Setup', asset:'btc', timeframe:'15m', t: 1, indicators:[], brackets:[] },
      { id:'m2', name:'Testkarte', asset:'btc', timeframe:'15m', t: 2, indicators:[], brackets:[], contentHash: h },
      { id:'m3', name:'x'.repeat(70), asset:'btc', timeframe:'15m', t: 3, indicators:[], brackets:[] }
    ];
    localStorage.setItem('cr_maps_v1', JSON.stringify(maps));
    const colon = await crChainSave.prepareAnchor('BTC:Setup');
    const lang  = await crChainSave.prepareAnchor('x'.repeat(70));
    const ok    = crChainSave.checkAnchorName('Testkarte');
    const umlaut = crChainSave.checkAnchorName('ä'.repeat(33));   // 66 Bytes, 33 Zeichen
    return { colon, lang, ok, umlaut };
  }, HASH);
  check('ein Doppelpunkt im Namen wird VOR dem Bau erkannt',
    nameFall.colon && nameFall.colon.error === 'bad-name' && nameFall.colon.code === 'name-colon', nameFall.colon);
  check('… mit Klartext statt Fehlercode (und dem Hinweis, umzubenennen)',
    !!(nameFall.colon && /Doppelpunkt/.test(nameFall.colon.text) && /[Bb]enenne/.test(nameFall.colon.text)),
    nameFall.colon && nameFall.colon.text);
  check('… und es ging KEINE Anfrage an /v1/tx/anchor raus',
    zaehl(/\/v1\/tx\/anchor/) === ankerVor, { vor: ankerVor, jetzt: zaehl(/\/v1\/tx\/anchor/) });
  check('ein zu langer Name ebenso, mit der Byte-Zahl',
    !!(nameFall.lang && nameFall.lang.error === 'bad-name' && nameFall.lang.code === 'name-too-long'
       && /70/.test(String(nameFall.lang.text))), nameFall.lang);
  check('gezaehlt werden BYTES, nicht Zeichen (33 Umlaute = 66 Bytes = zu lang)',
    !!(nameFall.umlaut && nameFall.umlaut.ok === false && nameFall.umlaut.bytes === 66), nameFall.umlaut);
  check('ein sauberer Name geht durch', !!(nameFall.ok && nameFall.ok.ok === true), nameFall.ok);

  console.log('\n-- F4 · Karten-Status liest die Anker-Liste --');
  const sig = 'S1gnatur' + 'z'.repeat(80);
  await setz({ anchorList: { ok:true, entries:[
    { name:'Testkarte', content_hash: HASH, sig: sig, slot: 1 } ] } });
  const treffer = await page.evaluate(async (a) => {
    await crAnchors.load(a, true);
    window.renderMaps();
    const els = Array.from(document.querySelectorAll('#crMapGrid [data-cr-anchor-state]'));
    return els.map(e => [e.getAttribute('data-cr-anchor-state'), e.textContent.trim()]);
  }, ADDR);
  const tk = treffer.find(x => /verankert|anchored/.test(x[1]));
  check('ein Listen-Treffer (Name + Hash) steht als „verankert" an der Karte',
    !!tk && tk[0] === 'on', treffer);
  check('… mit der Signatur in Kurzform', !!tk && /S1gnatur/.test(tk[1]), tk);
  const off = treffer.filter(x => x[0] === 'off');
  check('Karten ohne Treffer bleiben OFF-CHAIN', off.length >= 1, treffer);

  /* Die scharfe Zeile: EIN AUSFALL IST KEIN OFF-CHAIN. */
  await setz({ anchorList: { __http: 503 } });
  const ausfall = await page.evaluate(async (a) => {
    await crAnchors.load(a, true);
    window.renderMaps();
    const els = Array.from(document.querySelectorAll('#crMapGrid [data-cr-anchor-state]'));
    return { state: crAnchors.state(),
             karten: els.map(e => [e.getAttribute('data-cr-anchor-state'), e.textContent.trim()]),
             banner: !!document.querySelector('#crMapGrid [data-cr-anchor-na]') };
  }, ADDR);
  check('Listen-Ausfall setzt den Zustand auf unavailable', ausfall.state === 'unavailable', ausfall.state);
  check('… KEINE Karte behauptet danach OFF-CHAIN',
    ausfall.karten.filter(x => x[0] === 'off').length === 0, ausfall.karten);
  check('… stattdessen steht „Anker-Status nicht abrufbar" an jeder Karte',
    ausfall.karten.length > 0 && ausfall.karten.every(x => x[0] === 'na' && /nicht abrufbar|not readable/.test(x[1])),
    ausfall.karten);
  check('… und die Warnzeile ueber dem Gitter steht weiter da', ausfall.banner);

  /* ═══ G — REGRESSION v885–v891 + die Wachen ═══════════════════════════ */
  console.log('\n-- G · Regression: EIN Weg, EINE Quelle, keine Altlasten --');

  check('das Swap-Formular steht an EINER Stelle (_crSwapFormHtml)',
    (live.match(/function _crSwapFormHtml\s*\(/g) || []).length === 1
    && (live.match(/_crSwapFormHtml\(/g) || []).length >= 3,
    (live.match(/_crSwapFormHtml\(/g) || []).length);
  check('das Chart-Sheet baut KEINE zweite Anfrage — crTxApi.swap wird nur aus prepareSwap gerufen',
    (live.match(/crTxApi\.swap\(/g) || []).length === 1,
    (live.match(/crTxApi\.swap\(/g) || []).length);
  check('das Sicherheits-Tor steht an EINER Stelle (_crSwapSafGate)',
    (live.match(/function _crSwapSafGate\s*\(/g) || []).length === 1
    && (live.match(/_crSwapSafGate\(/g) || []).length >= 3);
  /* _mapT lag INNERHALB der Maps-IIFE und war von aussen unerreichbar — die
   * v876-Falle. Jetzt reichen beide Namen an denselben Koerper durch. */
  check('_tokT und _mapT haben keinen eigenen Koerper mehr — beide reichen an _crT durch',
    /function\s+_tokT\s*\(k,\s*en,\s*v\)\s*\{\s*return\s+_crT\(/.test(live)
    && /function\s+_mapT\s*\(k,\s*en,\s*v\)\s*\{\s*return\s+_crT\(/.test(live));
  check('kein lite-api-Literal im Live-Code', !/lite-api\.jup\.ag/.test(live));
  check('kein crMapsTx / solanaWeb3 im Live-Code', !/crMapsTx|solanaWeb3/.test(live));
  check('renderMaps ist exportiert — die typeof-window.renderMaps-Aufrufe sind nicht mehr tot',
    /window\.renderMaps\s*=\s*renderMaps/.test(live));
  /* v892 macht NUR market zum Eingabegeraet. Bracket/Ladder/OCO bleiben
   * ausdruecklich Simulation — v893 macht sie zu Alarmen, nicht diese Version. */
  check('nur `market` fuehrt im scharfen Zustand ins Blatt — bracket / ladder / oco nicht',
    !/sdk\.(bracket|ladder|oco)[\s\S]{0,300}_crArmOpenSheet/.test(live)
    && /_crArmIsLive\(\) && _crArmOpenSheet\('kauf'\)/.test(live)
    && /_crArmIsLive\(\) && _crArmOpenSheet\('verkauf'\)/.test(live));
  check('SCHARF ruft NIE selbst crSigner.signAndSend',
    !/_crArmOpenSheet[\s\S]{0,4000}?crSigner\.signAndSend/.test(live));

  const guard = await page.evaluate(() => ({
    txApi: typeof crTxApi === 'object',
    dec:   _crSafDecision({ verdict:'block', decision:'allow' }),
    dec2:  _crSafDecision({ verdict:'block' }),
    dec3:  _crSafDecision({ decision:'deny' })
  }));
  check('_crSafDecision: decision gewinnt', guard.dec === 'allow', guard);
  check('… fehlt decision, ist block ein Nein (Ruecksicherung in die sichere Richtung)', guard.dec2 === 'deny', guard);
  check('… und deny bleibt deny', guard.dec3 === 'deny', guard);

  console.log('\n=====================================');
  console.log('  ' + pass + ' ok · ' + fail + ' FAIL');
  console.log('=====================================');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
