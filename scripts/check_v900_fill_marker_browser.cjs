/* Smoke-Verifikation v1.0.900 — S5a PR 4: FILL-MARKER + FEINSCHLIFF.
 *
 * Das Prinzip in einem Satz: der Chart zeigt, WO echtes Geld geflossen
 * ist — und Paper zeichnet keinen einzigen neuen Pixel.
 *
 * Scharf geprueft wird, was Geld oder Wahrheit kostet, wenn es fehlt:
 *   · Marker-Geometrie gegen die ECHTEN Projektionen: der Punkt liegt
 *     exakt bei sX(wx)/priceToY(price).
 *   · Kamera-Pan-Gegenprobe: der Punkt WANDERT MIT (Reposition am
 *     Draw-Hook, keine gespeicherte Pixelposition) — eine Implementierung
 *     mit gemerkten Pixeln wuerde hier rot.
 *   · Live-Fill ueber den ECHTEN Panel-Weg (v898-Harness) erzeugt genau
 *     einen Marker mit sig.
 *   · Klick auf den Marker (Canvas, Capture-Phase, W/H-skaliert) nennt den
 *     Fill und oeffnet das Journal ueber denselben Weg wie der
 *     Docs-Alerts-Knopf; der Event ist konsumiert (preventDefault).
 *   · Fehlklick daneben laeuft UNKONSUMIERT durch — das Spiel bekommt ihn
 *     wie heute; leere Liste: der Listener tut exakt NICHTS.
 *   · Hotkey-Hygiene: kein neues keydown-Handling in dieser Nummer —
 *     geprueft wird der Live-Code auf die Abwesenheit neuer Tasten-Pfade
 *     im PR-Modul (crFillMarkers registriert KEINE Tastatur-Listener).
 *
 * Jede scharfe Zeile hat eine Gegenprobe (ROT/CRASH/GRUEN, CLAUDE.md).
 * Die Mutationen und ihre Ergebnisse stehen in der Commit-Message.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v900_fill_marker_browser.cjs
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
      return J({ ok:true, quote:{ in_raw:'10000000', out_raw:'28474241', min_out_raw:'28200000', slippage_bps:50 },
                 platform_fee:{ bps:50, amount_raw:'50000' }, route:{ hops:2, venues:['Whirlpool'] } });
    if(/\/v1\/tx\/status/.test(url)) return J({ confirmationStatus:'confirmed', confirmations:1, err:null });
    return J({ ok:true });
  });

  const initWallet = ([a]) => {
    try { localStorage.setItem('cr_wallet', a); } catch(_){}
    const acct = { address:a, chains:['solana:mainnet'], features:[] };
    window.addEventListener('wallet-standard:app-ready', e => { const r = e.detail;
      (typeof r === 'function' ? r : r.register)({ name:'M', version:'1', icon:'', chains:['solana:mainnet'],
        get accounts(){ return [acct]; },
        features:{ 'standard:connect':{ version:'1.0.0', connect: async () => ({ accounts:[acct] }) },
          'solana:signAndSendTransaction':{ version:'1.0.0',
            signAndSendTransaction: async () => { const s = new Uint8Array(64); s[0] = 3; return [{ signature:s }]; } } } });
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
  check('Banner meldet mindestens v1.0.900',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 900)))), bv);

  console.log('\n-- Geometrie: der Punkt liegt bei sX/priceToY --');
  const g1 = await page.evaluate(() => {
    window.__stub = () => { const rec = { arcs: [] };
      return { rec, ctx: { save(){}, restore(){}, beginPath(){}, fill(){}, stroke(){},
        arc(x, y, r){ rec.arcs.push([x, y, r]); },
        set fillStyle(v){}, set strokeStyle(v){}, set lineWidth(v){} } };
    };
    crFillMarkers.clear();
    const wx = camera.wx + 120;
    const price = candles[Math.floor(candles.length / 2)].c;
    const m = crFillMarkers.add({ wx, price, side:'buy', sig:'GEOSIG' });
    const s = window.__stub();
    const drawn = crFillMarkers.draw(s.ctx);
    return { drawn, arc: s.rec.arcs[0] || null,
             expX: sX(wx), expY: priceToY(price), wx, price, id: m && m.id };
  });
  check('genau EIN Punkt gezeichnet', g1.drawn === 1, g1.drawn);
  check('… exakt bei sX(wx)/priceToY(price)',
    g1.arc && Math.abs(g1.arc[0] - g1.expX) < 0.001 && Math.abs(g1.arc[1] - g1.expY) < 0.001, g1);

  console.log('\n-- Kamera-Pan-Gegenprobe: der Punkt wandert mit --');
  const g2 = await page.evaluate(() => {
    const before = window.__stub();
    crFillMarkers.draw(before.ctx);
    camera.panX += 60;
    const after = window.__stub();
    crFillMarkers.draw(after.ctx);
    camera.panX -= 60;
    return { x0: before.rec.arcs[0][0], x1: after.rec.arcs[0][0],
             y0: before.rec.arcs[0][1], y1: after.rec.arcs[0][1] };
  });
  check('Pan +60 px verschiebt den Punkt um exakt +60 (keine gemerkten Pixel)',
    Math.abs((g2.x1 - g2.x0) - 60) < 0.001 && Math.abs(g2.y1 - g2.y0) < 0.001, g2);

  console.log('\n-- Live-Fill ueber den echten Panel-Weg → Marker mit sig --');
  await page.evaluate(([mint]) => {
    const a = crEnsureCustomSolanaToken(mint);
    currentAsset = a.id;
    crTrustBadge.note(crStoreMint(currentAssetObj()), { source:'jupiter', usd:1, age_s:2, block_id:1 }, 0);
    crSigner.active();
    localStorage.setItem('cr_arm_v1', '1');
    localStorage.setItem('cr_arm_limit_v1', '999999999999');
    ChartRunner.sdk.setRealSDK({ marketSwap: p => Promise.resolve({ sig:'PANELSIG', inAmount:String(p.amountRaw), outAmount:'42', feeRaw:'5' }) });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const section = renderBlueRouteInputs(host, { kind:'hline', id:8001, py:100 }, {});
    const p = {
      armed: section.querySelector('input[type=checkbox]'),
      size: Array.from(section.querySelectorAll('input')).find(i => i.type !== 'checkbox'),
      btn: (l) => Array.from(section.querySelectorAll('button')).find(b => b.textContent === l),
    };
    crFillMarkers.clear();
    p.armed.checked = true;
    p.size.value = '0.01';
    p.btn('Arm / Update').click();
  }, [BONK]);
  await page.waitForTimeout(900);
  const f1 = await page.evaluate(() => {
    const l = crFillMarkers.list();
    return { n: l.length, sig: l[0] && l[0].sig, priceOk: l[0] && isFinite(l[0].price) && l[0].price > 0 };
  });
  check('genau EIN Marker aus dem Live-Fill, mit sig', f1.n === 1 && f1.sig === 'PANELSIG', f1);
  check('… und einem echten Preis (Chart-Preis des Fills)', f1.priceOk === true, f1);

  console.log('\n-- Klick auf den Marker → Journal; daneben → Spiel --');
  const c1 = await page.evaluate(() => {
    const s = window.__stub();
    crFillMarkers.draw(s.ctx);                       // _sx/_sy aktualisieren
    const m = crFillMarkers.list()[0];
    const cv = document.getElementById('cv');
    const r = cv.getBoundingClientRect();
    const sxToClientX = (sx) => r.left + sx * (r.width / (typeof W !== 'undefined' ? W : r.width));
    const syToClientY = (sy) => r.top + sy * (r.height / (typeof H !== 'undefined' ? H : r.height));
    const live = crFillMarkers.hit(0, 0);            // weit weg: kein Treffer
    const mk = (x, y) => new PointerEvent('pointerdown', { clientX:x, clientY:y, bubbles:true, cancelable:true });
    const missUnconsumed = cv.dispatchEvent(mk(sxToClientX(5), syToClientY(5)));
    return { farMiss: live === null, missUnconsumed };
  });
  check('weit entfernt: kein Treffer (hit=null)', c1.farMiss === true, c1);
  check('Fehlklick laeuft UNKONSUMIERT durch (Spiel bekommt ihn)', c1.missUnconsumed === true, c1);
  const c2 = await page.evaluate(() => {
    const m = crFillMarkers.list()[0];
    const cv = document.getElementById('cv');
    const r = cv.getBoundingClientRect();
    const x = r.left + m._sx * (r.width / (typeof W !== 'undefined' ? W : r.width));
    const y = r.top + m._sy * (r.height / (typeof H !== 'undefined' ? H : r.height));
    const consumed = !cv.dispatchEvent(new PointerEvent('pointerdown', { clientX:x, clientY:y, bubbles:true, cancelable:true }));
    return { consumed };
  });
  await page.waitForTimeout(400);
  const c3 = await page.evaluate(() => {
    const notes = Array.from(document.querySelectorAll('.crNotifyMsg')).map(e => e.textContent);
    const win = document.getElementById('win-display');
    return { consumed: true, note: notes.some(t => /LIVE-Fill/.test(t)),
             journalOpen: !!(win && win.classList.contains('on')) };
  });
  check('Treffer wird konsumiert (preventDefault)', c2.consumed === true, c2);
  check('… nennt den Fill im Terminal', c3.note === true);
  check('… und oeffnet das Journal-Fenster', c3.journalOpen === true, c3.journalOpen);

  console.log('\n-- Paper-Nullprobe + Hygiene --');
  const n1 = await page.evaluate(() => {
    crFillMarkers.clear();
    const s = window.__stub();
    const drawn = crFillMarkers.draw(s.ctx);
    const cv = document.getElementById('cv');
    const r = cv.getBoundingClientRect();
    const un = cv.dispatchEvent(new PointerEvent('pointerdown',
      { clientX: r.left + 50, clientY: r.top + 50, bubbles:true, cancelable:true }));
    return { drawn, unconsumed: un };
  });
  check('leere Liste: draw() zeichnet 0, Klick laeuft unkonsumiert durch',
    n1.drawn === 0 && n1.unconsumed === true, n1);
  const src = fs.readFileSync(FILE, 'utf8');
  const live = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ').replace(/<!--[\s\S]*?-->/g, ' ');
  const mod = (live.match(/window\.crFillMarkers = \(function\(\)\{[\s\S]*?\}\)\(\);/) || [''])[0];
  check('crFillMarkers registriert KEINE Tastatur-Listener (Hotkey-Hygiene)',
    mod.length > 0 && !/keydown|keyup|keypress/.test(mod));
  check('… und haengt im echten Render-Pass (Live-Code)',
    /crFillMarkers\.draw\(ctx\)/.test(live));

  console.log('\n== v900 Fill-Marker: ' + pass + ' ok, ' + fail + ' fail ==');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
