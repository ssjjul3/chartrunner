/* Smoke-Verifikation v1.0.897 — S5a PR 1: DIE ARMED-WEICHE.
 *
 * Das Prinzip in einem Satz, und der Spion-Test ist sein Beweis:
 * REAL WIRD NUR GERUFEN, WENN ALLE VIER TORE OFFEN SIND — armedGlobal()
 * (cr_arm_v1 + Session-Limit) UND source.armed UND badgeGate()
 * (Jupiter-Referenz, frisch, Mint-gleich) UND crSigner.info().ready —
 * UND die Route 'Market' ist. Alles andere ist Paper, Bit fuer Bit.
 *
 * Scharf geprueft wird, was Geld kostet, wenn es fehlt:
 *   · Der SPION ersetzt den Adapter (ChartRunner.sdk.setRealSDK): mit je
 *     EINEM geschlossenen Tor wird er ueber die GESAMTE Ability-Matrix
 *     (market buy/sell, bracket, ladder, oco, twap, limit) NIE gerufen.
 *   · Alles offen → GENAU EIN Aufruf, mit den richtigen Mints, dem rohen
 *     Betrag und den Slippage-Bps.
 *   · Badge ist SCHALTBEDINGUNG: median → zu, stale (>120 s) → zu,
 *     Binance-Chart (kein Sol-Mint) → per Definition zu.
 *   · Session-Limit: der bekannte SOL-Einsatz wird VOR dem Trade gegen das
 *     Limit gerechnet; darueber verweigert die Weiche mit Meldung,
 *     darunter laeuft sie (Gegenprobe).
 *   · Route !== 'Market' bei gewolltem ARM → ehrliche P3-Meldung im
 *     Notify-Panel, KEIN Spion-Aufruf, KEIN stiller Fallback.
 *   · Paper bleibt Paper: ohne source.armed liefert sdk.market SYNCHRON
 *     dasselbe Order-Objekt wie im Bestand.
 *   · Ende-zu-Ende gegen gemockte Worker-Antworten: /v1/quote VOR
 *     /v1/tx/swap, genau eine Wallet-Signatur, Ergebnis {sig, inAmount,
 *     outAmount, feeRaw aus platform_fee.amount_raw}.
 *   · Wallet-Reject: Fehler kommt als {error} zurueck, das Session-Volumen
 *     bucht NICHTS.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v897_armed_weiche_browser.cjs
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
  const seen = [];                          // jede Anfrage, die das Spiel stellt
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

    if(/\/v1\/token\/safety/.test(url))
      return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    /* /v1/quote traegt die Gebuehr — genau das Echo, aus dem feeRaw kommt. */
    if(/\/v1\/quote/.test(url))
      return J({ ok:true,
        quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377',
                slippage_bps:50, price_impact_pct:'0.0004' },
        platform_fee:{ bps:50, amount_raw:'5000' },
        route:{ hops:3, venues:['Whirlpool','BisonFi','Meteora'] } });
    if(/\/v1\/tx\/swap/.test(url))
      return J({ transaction:'AQIDBAU=', expires_in_s:40, cluster:'mainnet',
        quote:{ in_raw:'50000000', out_raw:'142371209424', min_out_raw:'141659353377',
                slippage_bps:50, price_impact_pct:'0.0004' },
        cap:{ state:'none' }, fee:{ base_lamports:5000, priority_lamports:null },
        route:{ platform_fee_bps:50, hops:3, venues:['Whirlpool','BisonFi','Meteora'] },
        checked:{ instructions_match_request:true, level:'form+amount' } });
    if(/\/v1\/tx\/status/.test(url))     return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    if(/\/v1\/mints\/resolve/.test(url)) return J({ ok:true, mints:{} });
    if(/\/v1\/price/.test(url))          return J({ ok:true, prices:{} });
    if(/\/v1\/ohlc/.test(url))           return J({ ok:true, candles:[], ref:null, gated:0 });
    if(/\/v1\/rpc\/balance/.test(url))   return J({ ok:true, lamports:'900000000', cluster:'mainnet' });
    if(/\/v1\/rpc\/tokens/.test(url))    return J({ ok:true, read:true, holdings:[] });
    if(/\/health/.test(url)) return J({ ok:true, version:'tx v1.19', signs:false, kill:false,
      swap:{ cap:{ state:'none' } }, token_safety:{ stage:2, gates_swap:true, gate:{ kill:false } },
      platform_fee:{ accounts:[{ symbol:'WSOL', state:'exists' }] } });
    return J({});
  });

  /* Wallet-Standard-Mock wie v892; __rejectSign laesst die Signatur
   * gezielt scheitern (Reject-Pfad). */
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
              const s = new Uint8Array(64); s[0] = 5; return [{ signature:s }]; } } } });
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
  check('Banner meldet mindestens v1.0.897',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 897)))), bv);

  /* Der Geld-Adapter ueberlebt das v1.0.124-Boot-Wiring: ChartRunner.sdk.real
   * ist crRealAdapter, NICHT die Spiel-Instanz. (Mutation: Guard in
   * wireModularFoundation entfernen → diese Zeile wird rot.) */
  const seam = await page.evaluate(() => ({
    isAdapter: !!(window.ChartRunner && ChartRunner.sdk && ChartRunner.sdk.real === window.crRealAdapter),
    hasSwap: !!(window.ChartRunner && ChartRunner.sdk && ChartRunner.sdk.real
                && typeof ChartRunner.sdk.real.marketSwap === 'function'),
    weiche: !!(window.crWeiche && typeof crWeiche.route === 'function' && typeof crWeiche.decide === 'function'),
  }));
  check('ChartRunner.sdk.real ist der Geld-Adapter (Boot-Wiring ueberschreibt nicht)', seam.isAdapter, seam);
  check('Adapter traegt marketSwap', seam.hasSwap);
  check('crWeiche ist exponiert', seam.weiche);

  console.log('\n-- Aufbau: Sol-Chart, frische Jupiter-Referenz, Wallet --');
  const setup = await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    const m = crStoreMint(currentAssetObj());
    crTrustBadge.note(m, { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    const act = crSigner.active();
    return { mint:m, ready: !!(crSigner.info() && crSigner.info().ready),
             addr: act && act.address, badge: crWeiche.badgeGate() };
  }, [BONK]);
  check('Sol-Asset aktiv, crStoreMint aufgeloest', setup.mint === BONK, setup.mint);
  check('Wallet reattached und signierfaehig (info().ready)', setup.ready === true, setup);
  check('badgeGate() offen bei frischer Jupiter-Referenz', setup.badge && setup.badge.ok === true, setup.badge);

  /* Spion installieren. Er zaehlt und antwortet wie ein erfolgreicher Swap —
   * outAmount klein, damit die Sell-Buchung das Limit nicht verfaelscht. */
  await page.evaluate(() => {
    window.__spy = [];
    ChartRunner.sdk.setRealSDK({ marketSwap: function(p){
      window.__spy.push(JSON.parse(JSON.stringify(p)));
      return Promise.resolve({ sig:'SPYSIG', inAmount:String(p.amountRaw), outAmount:'42', feeRaw:'5' });
    }});
    /* Die gesamte Ability-Matrix in einem Ruf. intervalSecs hoch, damit
     * TWAP-Scheiben nicht spaeter in andere Messungen tropfen. */
    window.__fireMatrix = function(source, skipMarket){
      const here = 100;
      const s = source ? Object.assign({}, source) : undefined;
      if(!skipMarket){
        try { sdk.market({ side:'buy',  size:1, price:here, source:s }); } catch(_){}
        try { sdk.market({ side:'sell', size:1, price:here, source:s }); } catch(_){}
      }
      try { sdk.bracket({ risk:20, rr:2, side:'buy', price:here, slDistance:60, source:s }); } catch(_){}
      try { sdk.ladder({ side:'buy', rungs:5, spacing:30, size:4, price:here, source:s }); } catch(_){}
      try { sdk.oco({ upper:80, lower:-80, size:6, price:here, source:s }); } catch(_){}
      try { sdk.twap({ side:'buy', totalSize:10, slices:2, intervalSecs:9999, price:here, source:s }); } catch(_){}
      try { sdk.limit({ side:'buy', price:here, size:1, source:s }); } catch(_){}
    };
    window.__spyCount = () => window.__spy.length;
    /* Die ARM-Meldung kommt VOR dem Paper-Lauf, der SIM-Horchpunkt danach,
     * und das Panel darf alte Zeilen wegwerfen — gemessen wird deshalb am
     * crNotify-AUFRUF (derselbe Weg, den die Weiche nimmt), nicht am DOM. */
    const origNotify = window.crNotify;
    window.__notes = [];
    window.crNotify = function(m, k){ try { window.__notes.push(String(m)); } catch(_){}
      return origNotify.apply(this, arguments); };
    window.__notifyMark = () => window.__notes.length;
    window.__notifySince = (mark) => window.__notes.slice(mark);
  });

  console.log('\n-- Spion-Test: je ein geschlossenes Tor → NIE ein Aufruf --');
  const armedSrc = { armed:true, amountRaw:'1000000' };

  /* Tor 1 zu: kein globales ARM. */
  let n0 = await page.evaluate((src) => { window.__fireMatrix(src, false); return window.__spyCount(); }, armedSrc);
  check('global aus (cr_arm_v1 fehlt) → 0 Aufrufe ueber die ganze Matrix', n0 === 0, n0);
  const dGlobalOff = await page.evaluate((src) => crWeiche.decide('Market', { side:'buy', source:src }), armedSrc);
  check('decide() meldet global-off STILL (heutiges Paper-Verhalten)',
    dGlobalOff && dGlobalOff.live === false && dGlobalOff.silent === true, dGlobalOff);

  /* Tor 2 zu: global an, aber kein source.armed — der Bestand. */
  await page.evaluate(() => localStorage.setItem('cr_arm_v1', '1'));
  let n1 = await page.evaluate(() => { window.__fireMatrix(undefined, false); return window.__spyCount(); });
  check('global an, source.armed fehlt → 0 Aufrufe (Bestand bleibt Paper)', n1 === 0, n1);

  /* Tor 3 zu, Variante a: Referenz median. */
  await page.evaluate(([m]) => crTrustBadge.note(m, { source:'median', age_s:2 }, 0), [BONK]);
  let n2 = await page.evaluate((src) => { window.__fireMatrix(src, false); return window.__spyCount(); }, armedSrc);
  check('Referenz median → 0 Aufrufe', n2 === 0, n2);
  const bgMedian = await page.evaluate(() => crWeiche.badgeGate());
  check('badgeGate() nennt median als Grund', bgMedian && bgMedian.ok === false && /jupiter/i.test(bgMedian.reason || ''), bgMedian);

  /* Tor 3 zu, Variante b: Jupiter, aber stale (>120 s). */
  await page.evaluate(([m]) => crTrustBadge.note(m, { source:'jupiter', age_s:500 }, 0), [BONK]);
  let n3 = await page.evaluate((src) => { window.__fireMatrix(src, false); return window.__spyCount(); }, armedSrc);
  check('Referenz stale (500 s) → 0 Aufrufe', n3 === 0, n3);

  /* Tor 3 zu, Variante c: Binance-Chart — nie ARMED-faehig. */
  await page.evaluate(([m]) => { crTrustBadge.note(m, { source:'jupiter', age_s:2 }, 0); currentAsset = 'btc'; }, [BONK]);
  let n4 = await page.evaluate((src) => { window.__fireMatrix(src, false); return window.__spyCount(); }, armedSrc);
  check('Binance-Chart (kein Sol-Mint) → 0 Aufrufe', n4 === 0, n4);
  const bgBtc = await page.evaluate(() => crWeiche.badgeGate());
  check('badgeGate() sagt Binance-nie', bgBtc && bgBtc.ok === false, bgBtc);
  await page.evaluate(([mint]) => { currentAsset = 'sol_' + mint.slice(0, 10); }, [BONK]);

  /* Tor 4 zu: Wallet nicht signierfaehig (info() gezielt gestubbt). */
  let n5 = await page.evaluate((src) => {
    const orig = crSigner.info;
    crSigner.info = () => ({ ready:false });
    try { window.__fireMatrix(src, false); } finally { crSigner.info = orig; }
    return window.__spyCount();
  }, armedSrc);
  check('Wallet nicht signierfaehig → 0 Aufrufe', n5 === 0, n5);

  /* Route !== Market bei gewolltem ARM: 0 Aufrufe UND ehrliche P3-Meldung. */
  let routeRes = await page.evaluate((src) => {
    const mark = window.__notifyMark();
    window.__fireMatrix(src, true);            // nur bracket/ladder/oco/twap/limit
    return { n: window.__spyCount(), notes: window.__notifySince(mark) };
  }, armedSrc);
  check('Route != Market, ARM gewollt → 0 Aufrufe', routeRes.n === 0, routeRes.n);
  check('… und die P3-Meldung steht im Notify-Panel',
    routeRes.notes.some(t => /P3/.test(t)), routeRes.notes.slice(0, 4));

  console.log('\n-- Gegenprobe: alles offen → GENAU EIN Aufruf --');
  const live1 = await page.evaluate(async (src) => {
    const res = await sdk.market({ side:'buy', size:1, price:100, source:src });
    return { n: window.__spyCount(), res, call: window.__spy[0], vol: crWeiche.sessionLamports() };
  }, armedSrc);
  check('genau EIN Spion-Aufruf', live1.n === 1, live1.n);
  check('Ergebnis traegt sig', live1.res && live1.res.sig === 'SPYSIG', live1.res);
  check('Buy: input SOL, output Chart-Mint, roher Betrag, Default-Slippage',
    live1.call && live1.call.inputMint === SOL && live1.call.outputMint === BONK
    && live1.call.amountRaw === '1000000' && live1.call.slippageBps === 50, live1.call);
  check('SOL-Einsatz gebucht (Session-Volumen)', live1.vol === 1000000, live1.vol);

  const live2 = await page.evaluate(async () => {
    const res = await sdk.market({ side:'sell', size:1, price:100,
      source:{ armed:true, amountRaw:'500000', slippageBps:75 } });
    return { n: window.__spyCount(), call: window.__spy[1], vol: crWeiche.sessionLamports(), res };
  });
  check('Sell: input Chart-Mint, output SOL, explizite Slippage',
    live2.call && live2.call.inputMint === BONK && live2.call.outputMint === SOL
    && live2.call.slippageBps === 75, live2.call);
  check('Sell bucht die SOL-SEITE (outAmount 42), nicht den Token-Betrag',
    live2.vol === 1000042, live2.vol);

  console.log('\n-- Session-Limit --');
  await page.evaluate(() => localStorage.setItem('cr_arm_limit_v1', '1400000'));
  const lim1 = await page.evaluate(async (src) => {
    const before = window.__spyCount();
    const mark = window.__notifyMark();
    await sdk.market({ side:'buy', size:1, price:100, source:src });   // 1000042 + 1000000 > 1400000
    return { delta: window.__spyCount() - before, notes: window.__notifySince(mark) };
  }, armedSrc);
  check('projizierter Einsatz ueber Limit → verweigert, 0 neue Aufrufe', lim1.delta === 0, lim1);
  check('… mit Limit-Meldung', lim1.notes.some(t => /Session limit/i.test(t)), lim1.notes);
  const lim2 = await page.evaluate(async () => {
    const before = window.__spyCount();
    const res = await sdk.market({ side:'buy', size:1, price:100, source:{ armed:true, amountRaw:'300000' } });
    return { delta: window.__spyCount() - before, sig: res && res.sig, vol: crWeiche.sessionLamports() };
  });
  check('Gegenprobe unter Limit → laeuft (1 Aufruf)', lim2.delta === 1 && lim2.sig === 'SPYSIG', lim2);
  const lim3 = await page.evaluate(async (src) => {
    const before = window.__spyCount();
    await sdk.market({ side:'buy', size:1, price:100, source:src });   // Summe jetzt >= projiziert ueber Limit
    return { delta: window.__spyCount() - before };
  }, armedSrc);
  check('naechster Arm ueber der Fill-Summe → wieder verweigert', lim3.delta === 0, lim3);

  console.log('\n-- Paper unveraendert --');
  const paper = await page.evaluate(() => {
    const before = sdk.openOrders.length;
    const o = sdk.market({ side:'buy', size:1, price:100 });
    return { sync: !!(o && typeof o.then !== 'function'), type: o && o.type, status: o && o.status,
             grew: sdk.openOrders.length === before + 1 };
  });
  check('ohne source.armed: synchrones Order-Objekt wie im Bestand',
    paper.sync && paper.type === 'market' && paper.status === 'open' && paper.grew, paper);

  console.log('\n-- Ende-zu-Ende: echter Adapter gegen gemockte Worker --');
  await page.evaluate(() => {
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    ChartRunner.sdk.setRealSDK(window.crRealAdapter);
  });
  const seenBefore = seen.length;
  const e2e = await page.evaluate(async () => {
    const res = await sdk.market({ side:'buy', size:1, price:100,
      source:{ armed:true, amountRaw:'50000000' } });
    return { res, signs: window.__signs.length };
  });
  const tail = seen.slice(seenBefore);
  const iQuote = tail.findIndex(u => /\/v1\/quote/.test(u));
  const iSwap  = tail.findIndex(u => /\/v1\/tx\/swap/.test(u));
  check('/v1/quote wird VOR /v1/tx/swap gefragt', iQuote >= 0 && iSwap > iQuote, tail.filter(u => /\/v1\//.test(u)));
  check('genau EINE Wallet-Signatur', e2e.signs === 1, e2e.signs);
  check('Ergebnis: sig + Zahlen aus dem Swap-Echo', !!(e2e.res && e2e.res.sig
    && e2e.res.inAmount === '50000000' && e2e.res.outAmount === '142371209424'), e2e.res);
  check('feeRaw kommt aus platform_fee.amount_raw des Quotes', e2e.res && e2e.res.feeRaw === '5000', e2e.res && e2e.res.feeRaw);

  console.log('\n-- Wallet-Reject: Fehler ehrlich, Volumen unangetastet --');
  const rej = await page.evaluate(async () => {
    const volBefore = crWeiche.sessionLamports();
    window.__rejectSign = true;
    const res = await sdk.market({ side:'buy', size:1, price:100,
      source:{ armed:true, amountRaw:'1000000' } });
    window.__rejectSign = false;
    return { err: res && res.error, volSame: crWeiche.sessionLamports() === volBefore };
  });
  check('Reject → {error}, kein sig', !!rej.err, rej);
  check('Reject bucht KEIN Session-Volumen', rej.volSame === true, rej);

  console.log('\n== v897 ARMED-Weiche: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
