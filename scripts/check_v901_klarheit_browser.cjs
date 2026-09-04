/* Smoke-Verifikation v1.0.901 — S5a.2 · Block A: KLARHEIT IM ACTIVATION-PANEL.
 *
 * Das Prinzip in einem Satz: DAS PANEL SAGT IN ALLTAGSSPRACHE, WAS PASSIEREN
 * WIRD — und behauptet nie mehr, als die Weiche ausfuehren wuerde. Geprueft
 * wird das ECHTE Panel (renderBlueRouteInputs, direkt gerendert und bedient)
 * gegen gemockte Worker-Antworten; der Trade-Pfad selbst ist unveraendert
 * (v897/v898-Suiten bleiben die Wahrheit dafuer).
 *
 * Scharf geprueft wird, was Geld oder Wahrheit kostet, wenn es fehlt:
 *   · Einheiten (A1): DEX-Venue → SIZE-Label ist ein BETRAG, nie „contracts";
 *     „Erhältst du ~" kommt aus dem Quote-Echo (out_raw × _crTokMeta) und
 *     zeigt bei Quote-Ausfall „—", NIE eine erfundene Zahl.
 *   · Klartext (A2): Uebungs-Satz im Paper, „echtes Geld"-Satz mit Gebuehr
 *     aus platform_fee im Live-Zustand.
 *   · Zustand (A3): st-live NUR bei armedGlobal ∧ source.armed ∧ badgeGate
 *     (die ORIGINAL-Funktionen der Weiche, gespiegelt) — Gegenprobe:
 *     Badge=median → kein st-live, obwohl global scharf.
 *   · RUN-Zeile (A4): Paper „PAPIER-CONNECTOR · kein echter Auftrag",
 *     Live „JUPITER LIVE · Phantom signiert gleich" — textContent beginnt
 *     weiter mit 'Run: ' (der Punkt ist CSS-::before, keine Textaenderung).
 *   · SIDE (A5): SELL-Bracket → SIDE=SELL vorbelegt; Abweichung → sichtbare
 *     Warnung statt stillem Gegeneinanderlaufen.
 *   · Fill-Karte (A6): NUR nach einem echten Fill (Weiche → Adapter → sig),
 *     mit Solscan-Link + Gebuehr; Paper-Arm erzeugt KEINE Karte.
 *   · Weltband (A6): globales ARM an → Goldband in #stage mit Wallet+Limit;
 *     aus → weg. Kein Topbar-Element.
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v901_klarheit_browser.cjs
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
    const cfg = await page.evaluate(() => window.__v901 || {}).catch(() => ({}));

    if(/\/v1\/token\/safety/.test(url))
      return J({ ok:true, checked:{ read:true, verdict:'clean', decision:'allow', findings:[] } });
    if(/\/v1\/quote/.test(url))
      return J(cfg.quote || { ok:true,
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
    /* DEX-Venue schon BEIM Boot: das SIZE-Label haengt daran (A1). */
    try { localStorage.setItem('cr_broker_v1', JSON.stringify({ name:'Jupiter', type:'dex' })); } catch(_){}
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
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.901',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 901)))), bv);

  /* Panel-Werkbank — dieselbe wie v898: das ECHTE renderBlueRouteInputs. */
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    /* Meta fuer die Erhältst-du-Zeile: dieselbe Quelle wie die Handels-Tafel. */
    window._crMintMeta = window._crMintMeta || {};
    window._crMintMeta[mint] = { symbol:'BONK', decimals:5 };
    window.__renderPanel = function(overlay){
      const host = document.createElement('div');
      document.body.appendChild(host);
      overlay = overlay || { kind:'hline', id: Math.floor(Math.random() * 1e6), py:100 };
      const section = renderBlueRouteInputs(host, overlay, {});
      const sels = section.querySelectorAll('select');
      const p = {
        section, overlay,
        route: sels[0], side: sels[1],
        size: Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox'),
        armed: section.querySelector('input[type=checkbox]'),
        klar: section.querySelector('[data-cr-panel-klar]'),
        get: section.querySelector('[data-cr-panel-get]'),
        warn: section.querySelector('[data-cr-side-warn]'),
        ctx: Array.from(section.querySelectorAll('div')).find(d => /^Run: /.test(d.textContent || '')),
        msg: section.querySelector('[data-cr-panel-msg]'),
        chip: Array.from(section.querySelectorAll('span')).find(s => /ENTWURF|SCHARF/.test(s.textContent || '')),
        btn: (label) => Array.from(section.querySelectorAll('button')).find(b => b.textContent === label),
      };
      p.sizeLabel = p.size ? p.size.parentNode.firstChild : null;
      window.__panel = p;
      return p;
    };
    window.__st = function(){
      const s = window.__panel.section.classList;
      return { draft: s.contains('st-draft'), ap: s.contains('st-armed-paper'), live: s.contains('st-live'),
               chip: (window.__panel.chip || {}).textContent || '' };
    };
    window.__installSpy = function(){
      window.__spy = [];
      ChartRunner.sdk.setRealSDK({ marketSwap: function(pp){
        window.__spy.push(JSON.parse(JSON.stringify(pp)));
        return Promise.resolve({ sig:'KLARSIG901', inAmount:String(pp.amountRaw), outAmount:'284742418', feeRaw:'250000' });
      }});
    };
  }, [BONK]);

  console.log('\n-- A1 · Einheiten: DEX-Venue heisst Betrag, nie contracts --');
  let a1 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const p = window.__renderPanel();
    p.size.value = '0,05';
    p.size.dispatchEvent(new Event('change'));
    return { label: p.sizeLabel.textContent, val: p.size.value, ph: p.size.placeholder };
  });
  check('SIZE-Label = „Größe (SOL-Betrag)"', a1.label === 'Größe (SOL-Betrag)', a1);
  check('… und nirgends „contracts"', !/contract/i.test(a1.label + ' ' + a1.val + ' ' + a1.ph), a1);
  await page.waitForTimeout(600);
  let a1b = await page.evaluate(() => ({
    get: window.__panel.get.textContent, shown: window.__panel.get.style.display !== 'none',
    klar: window.__panel.klar.textContent }));
  check('„Erhältst du ~" zeigt die Quote-Menge (284742418 raw · dec 5 → 2.847,42 BONK)',
    a1b.shown && /Erhältst du ~ 2\.847,42\s?BONK/.test(a1b.get), a1b);
  check('Uebungs-Satz traegt Betrag + ~Gegenwert + „nur simuliert"',
    /^Übung: Kauf für 0,05 SOL ≈ 2\.847,42\s?BONK — nur simuliert\./.test(a1b.klar), a1b);

  console.log('\n-- A1 · Quote weg → „—", keine erfundene Zahl --');
  let a1c = await page.evaluate(() => {
    window.__v901 = { quote: { error:'no-route', detail:'kaputt' } };
    const p = window.__panel;
    p.size.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(600);
  a1c = await page.evaluate(() => ({ get: window.__panel.get.textContent, klar: window.__panel.klar.textContent }));
  check('„Erhältst du ~ —" bei Quote-Ausfall', /Erhältst du ~ —/.test(a1c.get), a1c);
  check('… und der Satz behauptet keinen Gegenwert (kein „≈")', !/≈/.test(a1c.klar), a1c);
  await page.evaluate(() => { window.__v901 = null; });

  console.log('\n-- A3 · Zustand: draft → armed-paper → live, Spiegel der Weiche --');
  let a3 = await page.evaluate(() => window.__st());
  check('ohne Haken: st-draft + „◇ ENTWURF · PAPIER"',
    a3.draft && !a3.ap && !a3.live && /ENTWURF · PAPIER/.test(a3.chip), a3);
  a3 = await page.evaluate(() => {
    const p = window.__panel;
    p.armed.checked = true;
    p.armed.dispatchEvent(new Event('change'));
    return window.__st();
  });
  check('Haken ohne globales ARM: st-armed-paper + „◆ SCHARF · PAPIER"',
    !a3.draft && a3.ap && !a3.live && /SCHARF · PAPIER/.test(a3.chip), a3);
  await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window.__panel.armed.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(600);
  a3 = await page.evaluate(() => window.__st());
  check('global scharf + Badge jupiter + Market: st-live + „⚡ SCHARF · LIVE · ECHTES GELD"',
    a3.live && /SCHARF · LIVE · ECHTES GELD/.test(a3.chip), a3);

  console.log('\n-- A3 · Gegenprobe: Badge=median → KEIN st-live --');
  let a3m = await page.evaluate(([mint]) => {
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'median', usd:1, age_s:2, block_id:1 }, 0);
    window.__panel.armed.dispatchEvent(new Event('change'));
    return window.__st();
  }, [BONK]);
  check('Badge=median: Panel zeigt nie LIVE (st-armed-paper)', !a3m.live && a3m.ap, a3m);
  await page.evaluate(([mint]) => {
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
  }, [BONK]);

  console.log('\n-- A4 · RUN-Zeile: Wortlaut + Balkenklasse --');
  let a4 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const p = window.__renderPanel();
    p.armed.checked = true;
    p.armed.dispatchEvent(new Event('change'));
    return { ctx: p.ctx.textContent, cls: p.ctx.className };
  });
  check('Paper: „PAPIER-CONNECTOR · kein echter Auftrag" + cr-run-paper',
    /PAPIER-CONNECTOR · kein echter Auftrag/.test(a4.ctx) && /cr-run-paper/.test(a4.cls), a4);
  check('… textContent beginnt weiter mit „Run: " (v898-Sonde bleibt gueltig)', /^Run: /.test(a4.ctx), a4);
  await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    const p = window.__panel;
    p.size.value = '0,05';
    p.armed.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(700);
  a4 = await page.evaluate(() => ({ ctx: window.__panel.ctx.textContent, cls: window.__panel.ctx.className,
    klar: window.__panel.klar.textContent }));
  check('Live: „JUPITER LIVE · Phantom signiert gleich" + cr-run-live',
    /JUPITER LIVE · Phantom signiert gleich/.test(a4.ctx) && /cr-run-live/.test(a4.cls), a4);
  check('… Gebuehr steht weiter VOR dem Klick in der Zeile', /GEBUEHR 0,5 %/.test(a4.ctx), a4);
  check('Klartext-Satz sagt „echtes Geld" + „Gebühr 0,5 %"',
    /echtes Geld/.test(a4.klar) && /Gebühr 0,5 %/.test(a4.klar), a4);

  console.log('\n-- A5 · SIDE-Vorbelegung + Abweichungs-Warnung --');
  let a5 = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const p = window.__renderPanel({ kind:'bracket', id: 777001, side:'sell', entry:100, tp:90, sl:105 });
    return { side: p.side.value, warnShown: p.warn.style.display !== 'none' };
  });
  check('SELL-Bracket → SIDE=SELL vorbelegt', a5.side === 'SELL', a5);
  check('… ohne Abweichung keine Warnung', !a5.warnShown, a5);
  a5 = await page.evaluate(() => {
    const p = window.__panel;
    p.side.value = 'BUY';
    p.side.dispatchEvent(new Event('change'));
    return { warn: p.warn.textContent, warnShown: p.warn.style.display !== 'none' };
  });
  check('SIDE=BUY gegen SELL-Bracket → sichtbare Warnung',
    a5.warnShown && /Bracket zeigt SELL, Order kauft — absichtlich\?/.test(a5.warn), a5);

  console.log('\n-- A6 · Fill-Karte: nur nach ECHTEM Fill --');
  let a6p = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    const old = document.getElementById('crFillCard'); if(old) old.remove();
    const p = window.__renderPanel();
    p.size.value = '0,05';
    p.btn('Arm / Update').click();
    return true;
  });
  await page.waitForTimeout(700);
  a6p = await page.evaluate(() => ({ card: !!document.getElementById('crFillCard') }));
  check('Paper-Arm (Nullprobe): KEINE Fill-Karte', !a6p.card, a6p);
  await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    window.__installSpy();
    const p = window.__renderPanel();
    p.size.value = '0,05';
    p.armed.checked = true;
    p.btn('Arm / Update').click();
  });
  await page.waitForTimeout(1200);
  const a6 = await page.evaluate(() => {
    const card = document.getElementById('crFillCard');
    const link = card && card.querySelector('a');
    return { card: !!card, txt: card ? card.textContent : '',
             href: link ? link.getAttribute('href') : '', spy: (window.__spy || []).length };
  });
  check('echter Fill (genau EIN Adapter-Aufruf) → gruene Karte', a6.card && a6.spy === 1, a6);
  check('… mit Bezahlt/Erhalten/Kurs/Gebühr + „Journal · Quelle live"',
    /Bezahlt/.test(a6.txt) && /Erhalten/.test(a6.txt) && /Kurs/.test(a6.txt)
    && /Gebühr/.test(a6.txt) && /Journal · Quelle live/.test(a6.txt), a6);
  check('… Solscan-Link traegt die sig', a6.href === 'https://solscan.io/tx/KLARSIG901', a6);
  check('… Erhalten aus dem Fill-Echo (2.847,42 BONK)', /2\.847,42\s?BONK/.test(a6.txt), a6);

  console.log('\n-- A6 · Live-Weltband — RETIRED in v1.0.904 (S5a.3) --');
  /* Das schwebende Weltband ist ersatzlos von der #stage verschwunden und in
   * die CC-Sektion „ARM · Echtgeld" (Zustandszeile #crCCArmState) gewandert.
   * Die v901-Sonde prueft jetzt genau das Gegenteil von frueher: bei globalem
   * ARM entsteht KEIN Band mehr in der Stage (Details: check_v904). */
  let band = await page.evaluate(() => {
    localStorage.setItem('cr_arm_v1', '1');
    crArmGrammar.sync();
    const b = document.getElementById('crLiveBand');
    return { there: !!b, inStage: !!(b && b.closest('#stage')) };
  });
  check('globales ARM → KEIN Band mehr in #stage (v904-Verlagerung)', !band.there && !band.inStage, band);
  band = await page.evaluate(() => {
    localStorage.removeItem('cr_arm_v1');
    crArmGrammar.sync();
    return { there: !!document.getElementById('crLiveBand') };
  });
  check('ARM aus → weiterhin kein Band', !band.there, band);
  const topbarCount = await page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    return tb ? tb.children.length : -1;
  });
  check('Topbar unangetastet (Budget max 5)', topbarCount === -1 || topbarCount <= 5, topbarCount);

  console.log('\n-- Abschluss --');
  const hard2 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('weiterhin keine harten Page-Errors', hard2.length === 0, hard2.slice(0, 3));

  await browser.close();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
