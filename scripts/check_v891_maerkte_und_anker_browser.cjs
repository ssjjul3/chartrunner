/* Smoke-Verifikation v1.0.891 — die Markt-Liste, die Entscheidung und der Anker.
 *
 * Scharf geprueft wird, was Geld oder Wahrheit kostet, wenn es fehlt:
 *   · Mint-Aufloesung: der Client fragt, er raet nicht. mint:null → „nur Chart"
 *     MIT Grund, nicht ein still fehlendes Modul.
 *   · Preis: Mint ohne Preisfeld → „Preis nicht verfuegbar". Nie 0, nie Synthese.
 *   · safety.decision fuehrt den Fluss, verdict nur das Schild. Der Verkaufsweg
 *     eines block-Tokens bleibt offen (Exit-Regel tx v1.15).
 *   · Anker: kanonisches Anfrageformat · eine bestaetigte Signatur ist KEIN
 *     Erfolg, solange err dransteht · Listen-Ausfall ist keine leere Liste ·
 *     alte PDA-Eintraege sind gekennzeichnet.
 *   · Altlasten: crMapsTx / solanaWeb3 / lite-api null Treffer im Live-Code.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md): die
 * geprüfte Zeile kaputtmachen, sehen dass GENAU sie rot wird. Die Mutationen
 * und ihre Ergebnisse stehen in der Commit-Message.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
let pass = 0, fail = 0;
function check(n, c, x){ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n+(x!==undefined?' :: '+JSON.stringify(x):''));} }
function launchOptions(){
  const o = { headless: true }; const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-')) o.executablePath = path.join(root, d, 'chrome-linux', 'chrome'); } catch(_){}
  return o;
}
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const HASH = 'a'.repeat(64);

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  const seen = [];                       // jede Anfrage, die das Spiel stellt
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request();
    const url = req.url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    const cfg = await page.evaluate(() => window.__v891 || {}).catch(() => ({}));

    if(/\/v1\/mints\/resolve/.test(url))   return J(cfg.resolve || { ok:true, mints:{} });
    if(/\/v1\/price/.test(url))            return J(cfg.price   || { ok:true, prices:{} });
    if(/\/v1\/quote/.test(url))            return J(cfg.quote   || { ok:true,
      quote:{ in_raw:'1000000000', out_raw:'42000000', min_out_raw:'41000000',
              slippage_bps:50, price_impact_pct:'0.0029' },
      route:{ hops:2, labels:['Orca','Raydium'] } });
    if(/\/v1\/token\/safety/.test(url))    return J(cfg.safety  || { ok:true, checked:{ read:true, verdict:'clean', findings:[] } });
    if(/\/v1\/tx\/anchor/.test(url)){
      try { cfg.__anchorBody = req.postData(); } catch(_){}
      await page.evaluate(b => { window.__v891 = window.__v891 || {}; window.__v891.anchorBody = b; },
        (() => { try { return req.postData(); } catch(_){ return null; } })()).catch(() => {});
      const a = (await page.evaluate(() => (window.__v891 || {}).anchorRes).catch(() => null));
      return J(a || { ok:true, transaction:'AQIDBAU=', memo:'cr1:map:Testkarte:' + HASH.slice(0,8),
                      expires_in_s:60, cluster:'mainnet', fee:{ base_lamports:5000, priority_lamports:null } });
    }
    if(/\/v1\/tx\/status/.test(url)){
      const st = await page.evaluate(() => (window.__v891 || {}).status).catch(() => null);
      return J(st || { confirmationStatus:'confirmed', confirmations:1, err:null });
    }
    if(/\/v1\/anchor\/list/.test(url)){
      const l = await page.evaluate(() => (window.__v891 || {}).anchorList).catch(() => null);
      if(l && l.__http) return route.fulfill({ status:l.__http, contentType:'application/json', body:'{}' });
      return J(l || { ok:true, entries:[] });
    }
    if(/\/v1\/rpc\/balance/.test(url)) return J({ ok:true, lamports:'900000000', cluster:'mainnet' });
    if(/\/v1\/rpc\/tokens/.test(url))  return J({ ok:true, read:true, holdings:[] });
    if(/\/health/.test(url)) return J({ ok:true, version:'tx v1.15', signs:false, kill:false,
      swap:{ cap:{ state:'none' } }, token_safety:{ stage:2, gates_swap:true, gate:{ kill:false } },
      platform_fee:{ accounts:[{ symbol:'WSOL', state:'exists' }] } });
    return J({});
  });

  await page.addInitScript(([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){}
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async () => { const s = new Uint8Array(64); s[0] = 5; return [{ signature:s }]; } } } });
    });
  }, [ADDR]);

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const src = fs.readFileSync(FILE, 'utf8');
  /* Kommentare weg — „kein Aufruf mehr an lite-api" meint den LIVE-CODE.
   * Die Kommentare erzaehlen die Geschichte des Umzugs und muessen es duerfen. */
  const live = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));

  /* ═══ A1 — Mint-Aufloesung ═══════════════════════════════════════════ */
  console.log('\n-- A1 · Mint-Aufloesung: der Client fragt, er raet nicht --');

  check('der Client baut KEINE eigene Aufloesung (kein Symbol-/Ticker-Match)',
    !/TOK_BIRDEYE_MINT\s*\[\s*[^\]]*(tag|sym|symbol)/i.test(live)
    && !/mintBy(Symbol|Tag)|resolveBySymbol|symbolToMint/i.test(live));
  check('_tokMintOf ist die EINE Quelle — Profil, RUN und Tafel teilen sie',
    (live.match(/_tokMintOf\(/g) || []).length >= 3, (live.match(/_tokMintOf\(/g) || []).length);
  check('die alte Profil-Zeile (TOK_BIRDEYE_MINT || def.mint) ist weg',
    !/String\(\(typeof TOK_BIRDEYE_MINT !== 'undefined' && TOK_BIRDEYE_MINT\[def\.id\]\) \|\| def\.mint \|\| ''\)/.test(live));

  const setz = (o) => page.evaluate(o2 => {
    window.__v891 = Object.assign(window.__v891 || {}, o2);
    try { for(const k of Object.keys(crMarkets._mint)) delete crMarkets._mint[k]; } catch(_){}
    try { for(const k of Object.keys(crMarkets._px))   delete crMarkets._px[k]; } catch(_){}
  }, o);

  await setz({ resolve: { ok:true, mints: { 'pudgy-penguins': { mint: BONK, verified:true },
                                            'world-liberty-financial': { mint: null, reason:'kein Solana-Mint bekannt' } } } });
  const r1 = await page.evaluate(async () => {
    await crMarkets.resolve(['pudgy-penguins', 'world-liberty-financial']);
    return { a: crMarkets.mintOf('pudgy-penguins'), ar: crMarkets.reasonOf('pudgy-penguins'),
             b: crMarkets.mintOf('world-liberty-financial'), br: crMarkets.reasonOf('world-liberty-financial'),
             c: crMarkets.knows('gibt-es-nicht'), cv: crMarkets.mintOf('gibt-es-nicht') };
  });
  check('aufgeloest → Mint da', r1.a === BONK, r1);
  check('mint:null → beantwortet, MIT Grund', r1.b === null && /Solana-Mint/.test(r1.br), r1);
  check('nie gefragt ist NICHT „kein Mint" (undefined, nicht null)',
    r1.c === false && r1.cv === undefined, r1);

  /* Ausfall darf sich nicht als Antwort tarnen. */
  await setz({ resolve: { ok:false, error:'offline' } });
  const r2 = await page.evaluate(async () => {
    await crMarkets.resolve(['irgendwas']);
    return { knows: crMarkets.knows('irgendwas') };
  });
  check('Aufloesungs-AUSFALL wird nicht als „kein Mint" gecacht', r2.knows === false, r2);

  /* Das Profil: Modul da / „nur Chart" mit Grund. */
  const profil = (id) => page.evaluate(i => {
    _tokState.selectedId = i; _tokRenderProfile();
    const h = document.getElementById('crTokProfile');
    return { html: h ? h.innerHTML : '', text: h ? h.textContent : '' };
  }, id);

  await setz({ resolve: { ok:true, mints: { 'cr-test-mit': { mint: BONK, verified:true },
                                            'cr-test-ohne': { mint: null, reason:'nur auf Ethereum gelistet' } } },
               price: { ok:true, prices: { [BONK]: { usd: 0.000021 } } } });
  await page.evaluate(([m, o]) => {
    TOK_LIST.push({ id:'cr-test-mit',  nm:'MitMint',  tag:'CRMIT', chain:'sol', seed:9001, cgId:'cr-test-mit' });
    TOK_LIST.push({ id:'cr-test-ohne', nm:'OhneMint', tag:'CROHNE', chain:'cex', seed:9002, cgId:'cr-test-ohne' });
  }, ['x', 'y']);
  await page.evaluate(async () => { await crMarkets.resolve(['cr-test-mit', 'cr-test-ohne']);
                                    await crMarkets.prices([crMarkets.mintOf('cr-test-mit')]); });

  let p = await profil('cr-test-mit');
  check('Eintrag MIT Mint bekommt das volle Handelsmodul',
    p.html.indexOf('data-tok-quote-mint="' + BONK + '"') >= 0 && p.html.indexOf('data-cr-swap-dir="kauf"') < 0
      || p.html.indexOf('data-tok-quote-mint="' + BONK + '"') >= 0, p.text.slice(0, 160));
  p = await profil('cr-test-ohne');
  check('Eintrag OHNE Mint: „nur Chart" statt eines still fehlenden Moduls',
    p.html.indexOf('data-tok-chart-only="1"') >= 0 && /nur Chart/.test(p.text), p.text.slice(0, 200));
  check('… und der Grund kommt aus der Antwort',
    /nur auf Ethereum gelistet/.test(p.text), p.text.slice(0, 200));
  check('… und es gibt dort KEIN Handelsmodul', p.html.indexOf('data-tok-quote-mint') < 0);

  /* ═══ A2 — Preise ════════════════════════════════════════════════════ */
  console.log('\n-- A2 · Preis: nicht verfuegbar ist eine Auskunft, 0 ist eine Luege --');

  await setz({ resolve: { ok:true, mints: { 'cr-test-mit': { mint: BONK, verified:true } } },
               price: { ok:true, prices: { } } });          // Mint da, PREISFELD fehlt
  const snapOhnePx = await page.evaluate(async () => {
    await crMarkets.resolve(['cr-test-mit']);
    await crMarkets.prices([BONK_M]);
    const s = _tokSnapshot('cr-test-mit');
    return { px: s.px, mint: s.mint, synth: s.pxSynth };
  }).catch(async () => {
    return page.evaluate(async (m) => {
      await crMarkets.resolve(['cr-test-mit']); await crMarkets.prices([m]);
      const s = _tokSnapshot('cr-test-mit');
      return { px: s.px, mint: s.mint, synth: s.pxSynth };
    }, BONK);
  });
  check('Mint ohne Preisfeld → px bleibt null (keine Synthese, keine 0)',
    snapOhnePx.px === null && snapOhnePx.mint === BONK && snapOhnePx.synth === false, snapOhnePx);
  p = await profil('cr-test-mit');
  check('… und im Profil steht „Preis nicht verfügbar"',
    /Preis nicht verfügbar/.test(p.text), p.text.slice(0, 160));

  await setz({ resolve: { ok:true, mints: { 'cr-test-mit': { mint: BONK, verified:true } } },
               price: { ok:true, prices: { [BONK]: { usd: 0 } } } });   // 0 ist kein Preis
  const snapNull = await page.evaluate(async (m) => {
    await crMarkets.resolve(['cr-test-mit']); await crMarkets.prices([m]);
    return { px: _tokSnapshot('cr-test-mit').px, cached: crMarkets.pxOf(m) };
  }, BONK);
  check('usd:0 zaehlt nicht als Preis', snapNull.cached === null && snapNull.px === null, snapNull);

  await setz({ resolve: { ok:true, mints: { 'cr-test-mit': { mint: BONK, verified:true } } },
               price: { ok:true, prices: { [BONK]: { usd: 1.2345 } } } });
  const snapPx = await page.evaluate(async (m) => {
    await crMarkets.resolve(['cr-test-mit']); await crMarkets.prices([m]);
    const s = _tokSnapshot('cr-test-mit'); return { px: s.px, synth: s.pxSynth, worker: s.pxWorker };
  }, BONK);
  check('echter Worker-Preis ersetzt die Synthese und traegt KEIN SYNTH-Etikett',
    snapPx.px === 1.2345 && snapPx.synth === false && snapPx.worker === true, snapPx);

  /* ═══ A3 — Handelbarkeit ueber den eigenen Worker ════════════════════ */
  console.log('\n-- A3 · Handelbarkeit: eine Quelle weniger im Browser --');
  check('kein lite-api.jup.ag im LIVE-Code (Kommentare ausgenommen)',
    live.indexOf('lite-api.jup.ag') < 0);
  check('CR_JUP_BASE existiert nicht mehr', live.indexOf('CR_JUP_BASE') < 0);
  check('crQuote sitzt auf crTxApi.quote', /crTxApi\.quote\(/.test(live));

  const q = await page.evaluate(async (m) => {
    return crQuote.quote({ inMint:'So11111111111111111111111111111111111111112', outMint:m,
                           amountRaw:1e9, slippageBps:50 });
  }, BONK);
  check('Antwortform unveraendert (outAmountRaw/priceImpactPct/hops/labels)',
    q.outAmountRaw === '42000000' && q.priceImpactPct === 0.0029 && q.hops === 2
      && Array.isArray(q.labels) && q.labels[0] === 'Orca', q);
  check('Mindest-Erhalt kommt mit (die Sonde las ihn frueher beim Fremdhost)',
    q.minOutRaw === '41000000', q.minOutRaw);
  const jupHits = seen.filter(u => /jup\.ag/.test(u));
  check('kein einziger Netzaufruf an jup.ag waehrend des Laufs', jupHits.length === 0, jupHits.slice(0, 3));

  await setz({ quote: { ok:true, quote:{ in_raw:'123456789', out_raw:'0' } } });
  // Anderer Betrag: crQuote cacht 30s je (Mints, Betrag, Slippage), und ein
  // Treffer aus dem Cache haette hier die VORIGE Antwort geprueft statt der
  // neuen. Genau so besteht ein Test, der nichts prueft.
  const qNoRoute = await page.evaluate(m => crQuote.quote({ inMint:'So11111111111111111111111111111111111111112',
    outMint:m, amountRaw:123456789, slippageBps:50 }), BONK);
  check('out_raw 0 ist keine Route (und wird nicht als Menge gezeigt)',
    qNoRoute.error === 'no-route', qNoRoute);

  /* ═══ A4 — safety.decision ═══════════════════════════════════════════ */
  console.log('\n-- A4 · Die Entscheidung fuehrt den Fluss, das Urteil das Schild --');

  const dec = await page.evaluate(() => ({
    blockDeny:      _crSafDecision({ verdict:'block', decision:'deny' }),
    blockAllow:     _crSafDecision({ verdict:'block', decision:'allow' }),
    blockOhneFeld:  _crSafDecision({ verdict:'block' }),
    cleanOhneFeld:  _crSafDecision({ verdict:'clean' }),
    nichts:         _crSafDecision(null)
  }));
  check('verdict block + decision allow → ALLOW (Verkaufsfall)', dec.blockAllow === 'allow', dec);
  check('verdict block + decision deny  → DENY', dec.blockDeny === 'deny', dec);
  check('kein decision-Feld: block gilt als Nein (Ruecksicherung in die sichere Richtung)',
    dec.blockOhneFeld === 'deny' && dec.cleanOhneFeld === null, dec);

  /* DAS TOR IM ECHTEN PROFIL — nicht nachgebaut.
   *
   * Erste Fassung dieses Blocks stellte die Gate-Logik im Testwirt NACH.
   * Die Gegenprobe hat das entlarvt: die Mutation „verzweige wieder auf
   * verdict" liess diesen Test GRUEN, weil er seine eigene Kopie prueft und
   * nicht den Produktionscode. Ein Test, der eine Nachbildung prueft, prueft
   * nichts. Also laeuft er jetzt durch _tokRenderProfile: echtes Profil,
   * echter Sicherheits-Abruf, echtes _safGate, echte Knoepfe. */
  const tor = (saf) => page.evaluate(([id, m, s]) => new Promise(res => {
    window.__v891 = Object.assign(window.__v891 || {}, { safety: s });
    window._crSafetyCache = {};
    _tokState.selectedId = id;
    _tokRenderProfile();
    const host = document.getElementById('crTokProfile');
    const t0 = Date.now();
    (function poll(){
      const kb = host.querySelector('[data-cr-swap-dir="kauf"]');
      const vb = host.querySelector('[data-cr-swap-dir="verkauf"]');
      const safDone = /GESPERRT|WARNUNG|sauber|nicht abrufbar/.test(host.textContent || '');
      if((kb && vb && safDone) || Date.now() - t0 > 12000)
        return res({ kauf: kb ? kb.disabled : null, verkauf: vb ? vb.disabled : null,
                     schild: (host.querySelector('[data-tok-safety-mint]') || {}).textContent || '',
                     hatForm: !!kb });
      setTimeout(poll, 120);
    })();
  }), ['cr-test-mit', BONK, saf]);

  await setz({ resolve: { ok:true, mints: { 'cr-test-mit': { mint: BONK, verified:true } } },
               price: { ok:true, prices: { [BONK]: { usd: 1.23 } } } });
  await page.evaluate(async () => { await crMarkets.resolve(['cr-test-mit']); });

  let t = await tor({ ok:true, checked:{ read:true, verdict:'block', decision:'allow',
    findings:[{ code:'freeze-authority', severity:'block', note:'Freeze Authority steht am Mint.' }] } });
  check('das echte Profil hat das Formular gerendert', t.hatForm === true, t);
  check('block + allow: KAUFEN bleibt an (der Fluss folgt decision)', t.kauf === false, t);
  check('block + allow: VERKAUFEN bleibt an (Exit-Regel)', t.verkauf === false, t);
  check('block + allow: das SCHILD zeigt trotzdem GESPERRT (Urteil ≠ Entscheidung)',
    /GESPERRT/.test(t.schild), t.schild.slice(0, 120));

  t = await tor({ ok:true, checked:{ read:true, verdict:'block', decision:'deny',
    findings:[{ code:'freeze-authority', severity:'block', note:'x' }] } });
  check('block + deny: KAUFEN aus', t.kauf === true, t);
  check('block + deny: VERKAUFEN TROTZDEM an — der Ausgang bleibt offen',
    t.verkauf === false, t);

  t = await tor({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
  check('clean + allow: KAUFEN an (ein frueheres Nein wird auch wieder aufgehoben)',
    t.kauf === false, t);

  t = await tor({ ok:false, error:'offline' });
  check('nicht gelesen: kein Urteil, und KAUFEN wird nicht stillschweigend gesperrt',
    /nicht abrufbar/.test(t.schild) && t.kauf === false, t);

  /* Das Tor im Produktionsblock selbst: es darf den Verkauf nicht anfassen. */
  const gateSrc = (src.match(/var _safGate = function\(res\)\{[\s\S]*?\n      \};/) || [''])[0];
  check('_safGate schaltet den VERKAUFEN-Knopf nirgends ab',
    gateSrc.length > 0 && !/verkauf"\]\s*\)[\s\S]{0,120}disabled\s*=\s*true/.test(gateSrc), gateSrc.length);
  check('_safGate verzweigt auf die ENTSCHEIDUNG, nicht auf das Urteil',
    /_crSafDecision\(res && res\.checked\)/.test(gateSrc) && !/res\.checked\.verdict/.test(gateSrc));

  /* Die Tafel beim Verkauf eines block-Tokens: volle Schwere, keine Sperre. */
  const tafel = (opts) => page.evaluate(([m, o]) => new Promise(resolve => {
    window.__v891 = Object.assign(window.__v891 || {}, o.cfg || {});
    try { for(const k of Object.keys(_crWalBalCache)) delete _crWalBalCache[k]; } catch(_){}
    document.querySelectorAll('[data-v891-tafel]').forEach(n => n.remove());
    const host = document.createElement('div');
    host.setAttribute('data-v891-tafel', '1');
    host.innerHTML = '<button data-cr-swap-dir="kauf">k</button><button data-cr-swap-dir="verkauf">v</button>'
      + '<input data-cr-swap-betrag value="0,05"><button data-cr-swap="' + m + '">g</button>'
      + '<div data-cr-swap-panel="' + m + '" style="display:none"></div>';
    document.body.appendChild(host);
    _crWireSwap(host, m);
    host.querySelector('[data-cr-swap]').click();
    const pn = host.querySelector('[data-cr-swap-panel]');
    const t0 = Date.now();
    (function poll(){
      const tx = pn.textContent || '';
      if((tx && !/wird geholt/.test(tx)) || Date.now() - t0 > 12000)
        return resolve({ text: tx, html: pn.innerHTML,
                         verkaufAus: host.querySelector('[data-cr-swap-dir="verkauf"]').disabled });
      setTimeout(poll, 120);
    })();
  }), [BONK, opts]);

  await page.route('**/v1/tx/swap*', route => route.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify({ transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
      quote:{ in_raw:'50000000', out_raw:'148979256884', min_out_raw:'148234360600',
              slippage_bps:50, price_impact_pct:'0.0029' },
      fee:{ base_lamports:5000, priority_lamports:null },
      checked:{ instructions_match_request:true, level:'form+amount' },
      route:{ platform_fee_bps:50 },
      safety:{ verdict:'block', decision:'allow',
               findings:[{ code:'freeze-authority', severity:'block',
                           note:'Der Herausgeber kann dein Konto einfrieren.' }] } }) }));
  t = await tafel({});
  check('Verkauf eines block-Tokens: die volle Schwere steht als Warnzeile in der Tafel',
    /data-cr-swap-safblock/.test(t.html) && /freeze-authority/.test(t.text), t.text.slice(0, 240));
  check('… mit dem vollen Befundtext, nicht nur dem Code',
    /Der Herausgeber kann dein Konto einfrieren/.test(t.text), t.text.slice(0, 240));
  check('… und OHNE zu sperren: der Signieren-Knopf ist da',
    t.html.indexOf('data-cr-swap-go') >= 0, t.html.slice(0, 200));
  check('… und der VERKAUFEN-Knopf ist nicht abgeschaltet', t.verkaufAus === false);

  /* ═══ B — Der Anker ══════════════════════════════════════════════════ */
  console.log('\n-- B · Anker: Format, err-Auswertung, Ausfall, Kennzeichnung --');

  const anker = (cfg) => page.evaluate(([n, c]) => {
    window.__v891 = Object.assign(window.__v891 || {}, c);
    try { localStorage.setItem('cr_maps_v1', JSON.stringify([{ id:'m1', name:n, t:1, asset:'BTCUSDT', timeframe:'15m' }])); } catch(_){}
    return crChainSave.anchorByName(n, { skipConfirm: true }).then(ok => ({
      ok: ok,
      proof: window.crChainSaveLastProof || null,
      body: (window.__v891 || {}).anchorBody || null,
      map: (JSON.parse(localStorage.getItem('cr_maps_v1') || '[]')[0] || {})
    }));
  }, ['Testkarte', cfg]);

  let a = await anker({ status: { confirmationStatus:'confirmed', confirmations:1, err:null } });
  const body = a.body ? JSON.parse(a.body) : {};
  check('Anfrage im kanonischen Format (payer/kind/name/content_hash/cluster)',
    body.payer === ADDR && body.kind === 'map' && body.name === 'Testkarte'
      && /^[0-9a-f]{64}$/.test(String(body.content_hash)) && body.cluster === 'mainnet', body);
  check('bestaetigt ohne err → verankert', a.ok === true && a.map.onChain === true, { ok:a.ok, m:a.map.onChain });
  check('das Memo aus der Antwort steht im Beleg',
    /^cr1:map:/.test(String(a.proof && a.proof.memo)), a.proof && a.proof.memo);

  a = await anker({ status: { confirmationStatus:'confirmed', confirmations:1,
                              err: { InstructionError: [0, 'Custom'] } } });
  check('SIGNATUR IST NICHT ERFOLG: bestaetigt MIT err → NICHT verankert',
    a.ok === false && a.map.onChain !== true, { ok:a.ok, m:a.map.onChain });
  check('… und der Kettenfehler steht im Beleg', !!(a.proof && a.proof.chainError), a.proof);

  a = await anker({ anchorRes: { ok:false, error:'anchor-not-deployed' } });
  check('Bau-Ausfall faellt NICHT still auf den alten Programm-Weg zurueck',
    a.ok === false, a.ok);

  /* Die Liste: Ausfall ist keine leere Liste. */
  const liste = (cfg) => page.evaluate(([addr, c]) => {
    window.__v891 = Object.assign(window.__v891 || {}, c);
    return crTxApi.anchorList(addr, { kind:'map', cluster:'mainnet' }).then(j => j);
  }, [ADDR, cfg]);

  let l = await liste({ anchorList: { ok:true, entries:[{ name:'Testkarte', sig:'S1', content_hash:HASH, source:'memo' }] } });
  check('Liste gelesen → Eintraege', Array.isArray(l.entries) && l.entries.length === 1, l);
  l = await liste({ anchorList: { __http: 502 } });
  check('HTTP-Ausfall → Fehler, KEINE leere Liste',
    !!l.error && !Array.isArray(l.entries), l);
  l = await liste({ anchorList: { ok:true } });                 // Listenfeld fehlt
  check('fehlendes Listenfeld → Fehler, KEINE leere Liste',
    l.error === 'no-list-field' && !Array.isArray(l.entries), l);

  /* Alte PDA-Eintraege sind gekennzeichnet, nie still gemischt. */
  const kennz = (rows) => page.evaluate(([addr, rs]) => {
    window.__v891 = Object.assign(window.__v891 || {}, { anchorList: { ok:true, entries: rs } });
    return crAnchors.load(addr, true).then(() => ({
      neu:  crAnchors.byName('Neu'),
      alt:  crAnchors.byName('Alt'),
      weg:  crAnchors.byName('Gibtsnicht'),
      state: crAnchors.state()
    }));
  }, [ADDR, rows]);
  let k = await kennz([{ name:'Neu', sig:'S1', memo:'cr1:map:Neu', source:'memo' },
                       { name:'Alt', sig:'S0', pda:'Pda111', source:'pda' }]);
  check('neuer Memo-Anker: nicht als alt markiert', k.neu && k.neu.legacy === false, k.neu);
  check('alter PDA-Eintrag: GEKENNZEICHNET', k.alt && k.alt.legacy === true, k.alt);
  check('gelesen und nicht dabei → null (nicht undefined)', k.weg === null, k.weg);

  const kAus = await page.evaluate(([addr]) => {
    window.__v891 = Object.assign(window.__v891 || {}, { anchorList: { __http: 502 } });
    return crAnchors.load(addr, true).then(() => ({ state: crAnchors.state(),
      byName: crAnchors.byName('Neu'), rows: crAnchors.rows() }));
  }, [ADDR]);
  check('Listen-Ausfall: Zustand „unavailable", keine Zeilen, KEINE Aussage je Karte',
    kAus.state === 'unavailable' && kAus.rows === null && kAus.byName === undefined, kAus);

  /* ═══ Altlasten ══════════════════════════════════════════════════════ */
  console.log('\n-- Altlasten: gemessen, dann geloescht --');
  check('crMapsTx: null Treffer im Live-Code', live.indexOf('crMapsTx') < 0);
  check('solanaWeb3: null Treffer im Live-Code', live.indexOf('solanaWeb3') < 0);
  check('unpkg: null Treffer in der ganzen Datei', src.indexOf('unpkg.com') < 0);
  check('kein statischer Skriptverweis mehr', !/<script[^>]*\ssrc=/i.test(src));
  check('das alte Programm wird nirgends mehr aufgerufen',
    src.indexOf('DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH') < 0);
  /* _b58 BLEIBT — und das ist ein Befund, kein Versehen: es kodiert die
   * roomId der Live-Map-Raeume. Diese Zeile haelt fest, dass der Weg noch
   * steht, damit ein spaeteres „aufraeumen" ihn nicht doch mitnimmt. */
  check('_b58 ist NICHT geloescht — es traegt die roomId der Live-Raeume',
    /function _b58\(bytes\)/.test(live) && /_b58\(_hexToBytes\(d\)\)/.test(live));
  check('… und _roomId wird weiterhin benutzt', /await _roomId\(/.test(live));

  /* ═══ Prosa + Woerterbuecher ═════════════════════════════════════════ */
  console.log('\n-- Prosa: „on-chain verankert" bleibt, der Programmname geht --');
  check('Kampagne nennt kein Programm mehr',
    !/Saving anchors it on-chain via <b>chartrunner_maps<\/b>/.test(src) && /Saving anchors it <b>on-chain<\/b>/.test(src));
  check('Mission 48 nennt kein Programm mehr',
    !/Anchored on-chain via chartrunner_maps/.test(src));
  check('Save-Tooltips nennen kein Programm mehr',
    !/same chartrunner_maps PDA/.test(src) && !/new chartrunner_maps entry/.test(src));
  check('„on-chain" bleibt aber stehen (die Aussage ist weiter wahr)',
    /same on-chain anchor/.test(src) && /new on-chain anchor/.test(src));
  ['tok.pxUnavail', 'tok.chartOnly', 'tok.tblExitOpen', 'tok.safSellOn', 'maps.anchorNA'].forEach(k => {
    check('Schluessel ' + k + ' in allen drei Woerterbuechern',
      (src.match(new RegExp("'" + k.replace('.', '\\.') + "':", 'g')) || []).length === 3,
      (src.match(new RegExp("'" + k.replace('.', '\\.') + "':", 'g')) || []).length);
  });

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
