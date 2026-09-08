/* Smoke-Verifikation v1.0.926 — Ownership C (CLIENT): der Client spricht den
 * Vertrag, den der Server WIRKLICH fuehrt.
 *
 * WARUM ES DIESEN TEST GIBT. Server (PR #199) und Client (PR #200) wurden
 * unabhaengig voneinander gebaut; niemand hat die Vertraege gegeneinander
 * gelesen. Am gemergten Stand cac2882 passten sie an vier Stellen nicht
 * zusammen — und weil crOwnership bei JEDEM Fehler weich auf den Lokalbetrieb
 * zurueckfaellt, brach nichts: das Register blieb leer und wirkungslos. Ein
 * Test, der nur „es kracht nicht" prueft, haette das nie gesehen. Dieser hier
 * prueft deshalb den DRAHT: was als RPC-Argument gestellt wird (Spion im
 * crAccount-Stub) und was als URL die Seite verlaesst (Spion im page.route).
 *
 * Jede Gegenprobe MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   C1   claim stellt cr_ownership_claim mit ALLEN FUENF p_*-Parametern:
 *        p_owner_kind/p_owner_id (Eigner aus crAccount.userId()) und
 *        p_item_kind/p_item_id/p_provenance. Die alte Dreier-Form ist ROT.
 *        (Mutation: in _claimRpc auf { p_kind, p_id, p_provenance }
 *         zuruecksetzen → C1 rot.)
 *   C2   items[] in SERVER-Schreibweise (item_kind/item_id) landet
 *        VOLLSTAENDIG im Speicher; eine Zeile ohne item_id wird
 *        uebersprungen UND gezaehlt — nie geraten.
 *        (Mutation: in _takeRow it.item_kind/it.item_id auf it.kind/it.id
 *         zuruecksetzen → C2 rot.)
 *   C3   Angemeldet → GET /ownership/list OHNE Eigner-Parameter (der Worker
 *        leitet den Eigner aus dem JWT ab). Verknuepfte Wallet → ein
 *        ZWEITER Request mit owner_kind=wallet&owner_id=<addr>, ebenfalls
 *        mit JWT. Wallet OHNE Konto → NULL Anfragen an /ownership/* und
 *        NULL RPCs; kein provoziertes 401.
 *        (Mutation a: in _listPath fuer 'account' wieder '?wallet='
 *         anhaengen → C3 rot. Mutation b: in init() den owner()-Riegel
 *         entfernen → C3 rot.)
 *   C4   Loadout ueber die GEWAEHLTE Variante: RPC cr_loadout_get/_set mit
 *        p_owner_kind/p_owner_id, p_data als OBJEKT (nicht als String),
 *        p_updated_at = der zuletzt gelesene Stand. Neuerer Server-Stand
 *        gewinnt, aelterer wird ueberschrieben.
 *        (Mutation: p_data wieder als JSON.stringify uebergeben → C4 rot.)
 *   C5   Kauf-Text nennt wieder $RUN — den Saldo, der wirklich sinkt — und
 *        die EINE Offenlegung zu $RUN steht im Wallet-Bereich.
 *        (Mutation: CR_INGAME_CUR auf '$CHART' → C5 rot. Mutation:
 *         #crRunDisclosure entfernen → C5 rot.)
 *   C6   Regression: die Regeln aus v925 gelten weiter (Vereinigung, keine
 *        Herabstufung, Ausfall nimmt nichts weg), und Market-/Limit-Pfad
 *        sind unveraendert vorhanden.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v926_ownership_contract_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
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

const ADDR = 'CRtestWa11etAddre55111111111111111111111111';
const UID  = 'uid-926-0000-0000';

function serve(file){
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      if((req.url || '').split('?')[0] === '/play/'){
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(file));
        return;
      }
      res.writeHead(404); res.end('');
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/* Der Server antwortet in SEINER Schreibweise — genau so, wie
 * cr_ownership_list sie liefert: item_kind/item_id/provenance/verified.
 * Die vierte Zeile hat KEIN item_id: sie muss uebersprungen und gezaehlt
 * werden, nicht geraten. */
const SRV_ITEMS = [
  { item_kind: 'bot',  item_id: 'det_ccv',  provenance: 'grant',        verified: true,  created_at: '2026-09-01T00:00:00Z' },
  { item_kind: 'bot',  item_id: 'det_srv',  provenance: 'campaign',     verified: false, created_at: '2026-09-02T00:00:00Z' },
  { item_kind: 'gear', item_id: 'magnet',   provenance: 'softcurrency', verified: false, created_at: '2026-09-03T00:00:00Z' },
  { item_kind: 'bot',                       provenance: 'campaign',     verified: false, created_at: '2026-09-04T00:00:00Z' },
];
const WALLET_ITEMS = [
  { item_kind: 'gear', item_id: 'thrust', provenance: 'purchase_onchain', verified: true, created_at: '2026-09-05T00:00:00Z' },
];

const cfg = { listMode: 'ok' };
const seen = { list: [], link: [] };

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    if(/^http:\/\/127\.0\.0\.1:\d+\/play\/?(\?|$)/.test(url)) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

    if(/\/ownership\/list/.test(url)){
      const u = new URL(url);
      seen.list.push({ url, kind: u.searchParams.get('owner_kind') || '',
                       id: u.searchParams.get('owner_id') || '',
                       wallet: u.searchParams.get('wallet') || '',
                       /* Die NAMEN aller Parameter, nicht nur ihre Werte: ein
                        * leerer ?wallet= ist ein mitgeschickter Parameter, und
                        * genau den soll dieser Request nicht haben. `_` ist der
                        * Cache-Buster aus _fetchJson und zaehlt nicht mit. */
                       params: Array.from(u.searchParams.keys()).filter(k => k !== '_'),
                       auth: req.headers()['authorization'] || '' });
      if(cfg.listMode === 'down') return J({ error: 'register_unavailable' }, 502);
      const isWallet = u.searchParams.get('owner_kind') === 'wallet';
      return J({ ok: true, owner_kind: isWallet ? 'wallet' : 'account',
                 owner_id: isWallet ? u.searchParams.get('owner_id') : UID,
                 items: isWallet ? WALLET_ITEMS : SRV_ITEMS });
    }
    if(/\/ownership\/link-wallet/.test(url)){
      let b = null; try { b = req.postDataJSON(); } catch(_){}
      seen.link.push(b);
      if(b && b.step === 'challenge') return J({ ok:true, challenge:'CR-LINK-926-abc' });
      if(b && b.step === 'verify')    return J({ ok:true });
      return J({ error: 'bad-step' }, 400);
    }
    return J({});
  });

  /* Der Identitaets-Stub. Er antwortet wie supabase-js: { data, error }. Eine
   * Set-Returning-Function kommt als ARRAY in data — genau so, wie
   * cr_loadout_get antwortet, und genau daran ist v1.0.925 gescheitert. */
  await page.addInitScript((uid) => {
    window.__signedIn = false;
    window.__uid = uid;
    window.__rpc = [];
    window.__rpcFail = false;
    window.__msgs = [];
    window.__loadoutRows = [];
    window.__setTs = '2026-09-08T12:00:00Z';
    window.__installStubs = function(){
      window.crAccount = {
        isSignedIn: () => !!window.__signedIn,
        token: () => (window.__signedIn ? 'JWT-TESTONLY-926' : ''),
        email: () => (window.__signedIn ? 'a@b.c' : ''),
        userId: () => (window.__signedIn ? window.__uid : ''),
        rpc: (fn, args) => {
          window.__rpc.push({ fn, args });
          if(window.__rpcFail) return Promise.resolve({ data: null, error: { message: 'rpc-down' } });
          if(fn === 'cr_loadout_get') return Promise.resolve({ data: window.__loadoutRows, error: null });
          if(fn === 'cr_loadout_set') return Promise.resolve({ data: window.__setTs, error: null });
          return Promise.resolve({ data: true, error: null });
        },
        _gatesSync: () => {},
      };
      window.crSigner = {
        active: () => (window.__wallet ? { address: window.__wallet } : null),
        signMessage: (m) => { window.__msgs.push(String(m)); return Promise.resolve({ signature: 'SIGB58-926' }); },
      };
    };
  }, UID);

  const { srv, port } = await serve(FILE);
  await page.goto('http://127.0.0.1:' + port + '/play/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('\n-- Boot --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard.length === 0, hard.slice(0, 3));
  const banner = await page.evaluate(() => {
    const it = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let n; while((n = it.nextNode())) if(/CURRENT VERSION:/.test(n.nodeValue)) return n.nodeValue;
    return ''; });
  const bv = (banner.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('Banner meldet mindestens v1.0.926',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 926)))), bv);
  check('crOwnership traegt den Eigner nach aussen (owner())',
    await page.evaluate(() => typeof (window.crOwnership && crOwnership.owner) === 'function'));

  /* ─────────────────────────────────────────────────────────────────────
   * C3 zuerst, Teil 1: WALLET OHNE KONTO. Nur solange noch keine
   * Anmeldung stattfand, ist beweisbar, dass NICHTS rausgeht. Der Boot
   * liegt bereits hinter uns — was hier gezaehlt wird, schliesst den
   * Start-Anstoss mit ein.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- C3a · Wallet ohne Konto: kein provoziertes 401 --');
  seen.list.length = 0; seen.link.length = 0;
  const noAcc = await page.evaluate(async (addr) => {
    window.__installStubs();
    window.__signedIn = false; window.__wallet = addr; window.__rpc = [];
    try { localStorage.removeItem('cr_wallet_linked_v1'); } catch(_){}
    const out = { isGuest: crOwnership.isGuest(), owner: crOwnership.owner() };
    /* JEDEN Einstieg einzeln anfassen, nicht nur den bequemen: onIdentity-
     * Change steigt selbst aus, bevor es init() erreicht — init(true) geht
     * absichtlich am Cache vorbei und zwingt den Riegel in die Messung. */
    await crOwnership.onIdentityChange();
    await crOwnership.init(true);
    await crOwnership.syncLoadout();
    await crOwnership.claim('bot', 'det_nokonto', 'campaign');
    out.rpc = window.__rpc.length;
    out.owned = crOwnership.has('bot', 'det_nokonto').owned;   /* lokal trotzdem da */
    out.tip = crOwnership.tipText();
    return out;
  }, ADDR);
  check('C3a · eine Wallet ohne Konto ist KEIN Gast, aber auch KEIN Eigner',
    noAcc.isGuest === false && noAcc.owner === null, noAcc);
  check('C3a · NULL Anfragen an /ownership/*',
    seen.list.length === 0 && seen.link.length === 0, { list: seen.list.length, link: seen.link.length });
  check('C3a · NULL RPCs', noAcc.rpc === 0, noAcc.rpc);
  check('C3a · lokal wird trotzdem gearbeitet', noAcc.owned === true, noAcc);
  check('C3a · und genau EINE Stelle sagt, warum',
    /Belegter Besitz braucht ein Konto/.test(noAcc.tip) && /lokal auf diesem Ger/.test(noAcc.tip), noAcc.tip);

  /* ─────────────────────────────────────────────────────────────────────
   * C2/C3b · Lesen: Server-Schreibweise, Eigner aus dem JWT.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- C2/C3b · items[] als item_kind/item_id, Eigner aus dem JWT --');
  seen.list.length = 0;
  const read = await page.evaluate(async () => {
    try { localStorage.setItem('cr_ownership_migrated_v1', '1'); } catch(_){}  /* Uebernahme aus dem Weg */
    try { localStorage.removeItem('cr_wallet_linked_v1'); } catch(_){}
    window.__signedIn = true; window.__wallet = ''; window.__rpc = [];
    const r = await crOwnership.init(true);
    return { ok: r && r.ok,
      owner: crOwnership.owner(),
      ccv:    crOwnership.has('bot',  'det_ccv'),
      srvRow: crOwnership.has('bot',  'det_srv'),
      gear:   crOwnership.has('gear', 'magnet'),
      trace:  crOwnership._state().trace,
      ownedMirror: (typeof crBotOwned === 'function') ? crBotOwned('det_srv') : null };
  });
  check('C3b · angemeldet: genau EIN Request', seen.list.length === 1, seen.list.map(s => s.url));
  check('C3b · und er traegt GAR KEINEN Parameter ausser dem Cache-Buster',
    seen.list.length === 1 && seen.list[0].params.length === 0,
    (seen.list[0] || {}).params);
  check('C3b · das JWT geht mit', /^Bearer JWT-TESTONLY-926$/.test((seen.list[0] || {}).auth || ''), (seen.list[0] || {}).auth);
  check('C3b · der Eigner ist das Konto mit der auth uid',
    read.owner && read.owner.kind === 'account' && read.owner.id === UID, read.owner);
  check('C2 · verifizierte Server-Zeile kommt vollstaendig an',
    read.ccv.owned === true && read.ccv.verified === true && read.ccv.provenance === 'grant', read.ccv);
  check('C2 · unverifizierte Server-Zeile ebenso',
    read.srvRow.owned === true && read.srvRow.verified === false && read.srvRow.provenance === 'campaign', read.srvRow);
  check('C2 · Gear folgt derselben Schreibweise',
    read.gear.owned === true && read.gear.provenance === 'softcurrency', read.gear);
  check('C2 · der Server-Bestand wird lokal gespiegelt (offline weiter nutzbar)',
    read.ownedMirror === true, read.ownedMirror);
  check('C2 · alle vier Zeilen gesehen, GENAU EINE uebersprungen — und gezaehlt',
    read.trace.rows === 4 && read.trace.skipped === 1, read.trace);

  console.log('\n-- C3c · verknuepfte Wallet als zweiter Eigner --');
  seen.list.length = 0;
  const linkedRead = await page.evaluate(async (addr) => {
    window.__signedIn = true; window.__wallet = addr;
    try { localStorage.setItem('cr_wallet_linked_v1', addr); } catch(_){}
    await crOwnership.init(true);
    return { thrust: crOwnership.has('gear', 'thrust'), ccv: crOwnership.has('bot', 'det_ccv') };
  }, ADDR);
  check('C3c · zwei Requests: Konto ohne Parameter, Wallet mit owner_kind/owner_id',
    seen.list.length === 2 && seen.list[0].params.length === 0
    && seen.list[1].params.slice().sort().join(',') === 'owner_id,owner_kind'
    && seen.list[1].kind === 'wallet' && seen.list[1].id === ADDR, seen.list.map(s => s.url));
  check('C3c · auch der Wallet-Request traegt das JWT (cr_wallet_link haengt an der uid)',
    /^Bearer JWT-TESTONLY-926$/.test((seen.list[1] || {}).auth || ''), (seen.list[1] || {}).auth);
  check('C3c · KEIN Request benutzt noch den alten ?wallet=-Parameter',
    seen.list.every(s => s.wallet === ''), seen.list.map(s => s.wallet));
  check('C3c · Besitz beider Eigner steht nebeneinander',
    linkedRead.thrust.owned === true && linkedRead.thrust.verified === true
    && linkedRead.ccv.owned === true, linkedRead);

  /* ─────────────────────────────────────────────────────────────────────
   * C1 · claim mit allen fuenf Parametern.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- C1 · cr_ownership_claim: alle fuenf p_*-Parameter --');
  const claims = await page.evaluate(async (addr) => {
    window.__signedIn = true; window.__wallet = addr; window.__rpcFail = false;
    try { game.run = 500; } catch(_){}
    window.__rpc = [];
    const granted = crUnlockBot('det_c1_camp', 'campaign');
    await new Promise(r => setTimeout(r, 60));
    const grant = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);
    window.__rpc = [];
    const bought = crBuyBot('det_c1_buy');
    await new Promise(r => setTimeout(r, 60));
    const buy = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);
    return { granted, bought, grant, buy };
  }, ADDR);
  const FIVE = ['p_owner_kind','p_owner_id','p_item_kind','p_item_id','p_provenance'];
  const a1 = claims.grant[0] || {};
  check('C1 · Kampagnen-Grant → genau EIN claim', claims.granted === true && claims.grant.length === 1, claims.grant);
  check('C1 · er traegt GENAU die fuenf Parameter der Server-Signatur',
    FIVE.every(k => k in a1) && Object.keys(a1).length === 5, Object.keys(a1));
  check('C1 · KEIN Parameter der alten Dreier-Form (p_kind/p_id)',
    !('p_kind' in a1) && !('p_id' in a1), Object.keys(a1));
  check('C1 · Eigner = Konto mit der auth uid',
    a1.p_owner_kind === 'account' && a1.p_owner_id === UID, a1);
  check('C1 · Gegenstand und Herkunft stimmen',
    a1.p_item_kind === 'bot' && a1.p_item_id === 'det_c1_camp' && a1.p_provenance === 'campaign', a1);
  const a2 = claims.buy[0] || {};
  check('C1 · Soft-Kauf → genau EIN claim, provenance softcurrency, fuenfstellig',
    claims.bought === true && claims.buy.length === 1 && FIVE.every(k => k in a2)
    && a2.p_item_id === 'det_c1_buy' && a2.p_provenance === 'softcurrency', claims.buy);

  const queued = await page.evaluate(async () => {
    window.__rpcFail = true;
    try { game.run = 500; } catch(_){}
    const bought = crBuyBot('det_c1_fail');
    await new Promise(r => setTimeout(r, 80));
    const st = crOwnership._state();
    window.__rpcFail = false;
    return { bought, owned: crBotOwned('det_c1_fail'),
             queued: st.pending.some(p => p.id === 'det_c1_fail' && p.provenance === 'softcurrency') };
  });
  check('C1 · ein abgewiesener claim blockiert den Kauf nicht',
    queued.bought === true && queued.owned === true, queued);
  check('C1 · und wartet in der Schlange', queued.queued === true, queued);

  const flushed = await page.evaluate(async () => {
    window.__rpc = [];
    await crOwnership.init(true);
    const again = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);
    return { again, pending: crOwnership._state().pending.length };
  });
  check('C1 · beim naechsten Start wird nachgereicht — fuenfstellig',
    flushed.again.length >= 1 && flushed.again.every(a => FIVE.every(k => k in a))
    && flushed.again.some(a => a.p_item_id === 'det_c1_fail'), flushed.again);
  check('C1 · danach ist die Schlange leer', flushed.pending === 0, flushed.pending);

  /* ─────────────────────────────────────────────────────────────────────
   * C4 · Loadout ueber die gewaehlte Variante (RPC, nicht /loadout).
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- C4 · Loadout: RPC mit Eigner, p_data als Objekt --');
  const sync = await page.evaluate(async () => {
    localStorage.setItem('cr_loadout_synced_v1', String(Date.parse('2026-01-01T00:00:00Z')));
    /* Der Server antwortet wie cr_loadout_get: EIN jsonb `data` + updated_at. */
    window.__loadoutRows = [{ data: { equipped_bots: ['det_srv'], equipped_tools: ['hline'],
                                      loadout: { skin: 'invader-red' } },
                              updated_at: '2026-09-07T00:00:00Z' }];
    window.__rpc = [];
    const a = await crOwnership.syncLoadout();
    const getArgs = (window.__rpc.find(r => r.fn === 'cr_loadout_get') || {}).args || {};
    const applied = { res: a && a.applied, getArgs,
                      bots: localStorage.getItem('cr_equipped_bots_v1'),
                      skin: (JSON.parse(localStorage.getItem('cr_player_loadout_v1') || '{}') || {}).skin,
                      sets: window.__rpc.filter(r => r.fn === 'cr_loadout_set').length };

    /* Jetzt ist der lokale Stand der juengere → der Client schreibt. */
    window.__loadoutRows = [{ data: { equipped_bots: ['det_old'], equipped_tools: [], loadout: {} },
                              updated_at: '2020-01-01T00:00:00Z' }];
    window.__rpc = [];
    const b = await crOwnership.syncLoadout();
    const setArgs = (window.__rpc.find(r => r.fn === 'cr_loadout_set') || {}).args || {};
    return { applied, second: { res: b && b.applied, setArgs,
             bots: localStorage.getItem('cr_equipped_bots_v1') } };
  });
  check('C4 · cr_loadout_get wird MIT Eigner gerufen',
    sync.applied.getArgs.p_owner_kind === 'account' && sync.applied.getArgs.p_owner_id === UID
    && Object.keys(sync.applied.getArgs).length === 2, sync.applied.getArgs);
  check('C4 · neuerer Server-Stand wird uebernommen (aus data, nicht aus der Zeile)',
    sync.applied.res === 'server' && /det_srv/.test(sync.applied.bots || '')
    && sync.applied.skin === 'invader-red' && sync.applied.sets === 0, sync.applied);
  const sa = sync.second.setArgs;
  check('C4 · aelterer Server-Stand wird ueberschrieben, nicht uebernommen',
    sync.second.res === 'local' && !/det_old/.test(sync.second.bots || ''), sync.second);
  check('C4 · cr_loadout_set traegt Eigner, p_data und p_updated_at',
    sa.p_owner_kind === 'account' && sa.p_owner_id === UID
    && 'p_data' in sa && 'p_updated_at' in sa, Object.keys(sa));
  check('C4 · p_data ist ein OBJEKT (jsonb), kein String',
    sa.p_data && typeof sa.p_data === 'object' && !Array.isArray(sa.p_data)
    && Array.isArray(sa.p_data.equipped_bots) && Array.isArray(sa.p_data.equipped_tools)
    && sa.p_data.loadout && typeof sa.p_data.loadout === 'object', typeof sa.p_data);
  check('C4 · p_updated_at ist der zuletzt GELESENE Stand (staler Schreiber verliert)',
    sa.p_updated_at === '2020-01-01T00:00:00Z', sa.p_updated_at);
  check('C4 · KEIN der drei alten p_equipped_*/p_loadout-Parameter mehr',
    !('p_equipped_bots' in sa) && !('p_equipped_tools' in sa) && !('p_loadout' in sa), Object.keys(sa));

  /* ─────────────────────────────────────────────────────────────────────
   * C6 · Regression der Regeln aus v925.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- C6 · Regeln aus v925 gelten weiter --');
  const rules = await page.evaluate(async () => {
    CR_OWNED_BOTS.add('det_c6_local');
    await crOwnership.claim('bot', 'det_ccv', 'campaign');   /* auf eine BELEGTE Kennung */
    return { local: crOwnership.has('bot', 'det_c6_local'),
             noDowngrade: crOwnership.has('bot', 'det_ccv') };
  });
  check('C6 · Vereinigung: rein lokaler Eintrag bleibt owned, unverifiziert, provenance local',
    rules.local.owned === true && rules.local.verified === false && rules.local.provenance === 'local', rules.local);
  check('C6 · keine Herabstufung: ein lokaler claim entwertet verified:true nicht',
    rules.noDowngrade.owned === true && rules.noDowngrade.verified === true, rules.noDowngrade);

  cfg.listMode = 'down';
  const down = await page.evaluate(async () => {
    const r = await crOwnership.init(true);
    return { err: r && r.error, local: crBotOwned('det_c6_local'),
             mirrored: crBotOwned('det_srv'), stillVerified: crOwnership.has('bot', 'det_ccv').verified };
  });
  cfg.listMode = 'ok';
  check('C6 · ein Ausfall wird gemeldet, nicht verschwiegen', !!down.err, down.err);
  check('C6 · und er nimmt nichts weg', down.local === true && down.mirrored === true && down.stillVerified === true, down);

  const seam = await page.evaluate(() => ({
    adapter: !!(window.crRealAdapter && typeof crRealAdapter.marketSwap === 'function'
             && typeof crRealAdapter.limitVault === 'function'
             && typeof crRealAdapter.limitOnchain === 'function'),
    weiche: !!(window.crWeiche && typeof crWeiche.decide === 'function'),
    vault:  !!(window.crVaultLimit && typeof crVaultLimit.prepare === 'function'),
    onchain:!!(window.crOnchainLimit && typeof crOnchainLimit.prepare === 'function'),
    link:   !!document.getElementById('crSetLinkWallet'),
  }));
  check('C6 · crRealAdapter fuehrt weiter alle drei Wege', seam.adapter === true, seam);
  check('C6 · Weiche, Vault- und On-Chain-Limit unveraendert vorhanden',
    seam.weiche && seam.vault && seam.onchain, seam);
  check('C6 · der Wallet-Link aus v925 steht weiter in den Settings', seam.link === true, seam);

  /* ─────────────────────────────────────────────────────────────────────
   * C5 · Kauf-Text nennt den Saldo, der wirklich sinkt.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- C5 · $RUN in den Kauf-Texten, EINE Offenlegung --');
  const html = fs.readFileSync(FILE, 'utf8');
  check('C5 · das Etikett steht an genau EINER Stelle und sagt $RUN',
    (html.match(/const CR_INGAME_CUR = '\$RUN';/g) || []).length === 1
    && !/const CR_INGAME_CUR = '\$CHART';/.test(html));
  const spend = await page.evaluate(() => {
    const seenT = [];
    const orig = window.toast;
    window.toast = (t) => { seenT.push(String(t)); };
    try { game.run = 0; } catch(_){}
    crBuyBot('det_c5_probe');
    window.toast = orig;
    return { toasts: seenT, run: (typeof game !== 'undefined') ? game.run : null,
             chart: (typeof game !== 'undefined') ? game.chart : null };
  });
  check('C5 · der gescheiterte Kauf nennt $RUN, nicht $CHART',
    spend.toasts.some(t => /\$RUN/.test(t)) && !spend.toasts.some(t => /\$CHART/.test(t)), spend.toasts);
  const paid = await page.evaluate(() => {
    try { game.run = 100; game.chart = 100; } catch(_){}
    const ok = crBuyBot('det_c5_paid');
    return { ok, run: game.run, chart: game.chart };
  });
  check('C5 · und abgezogen wird genau dieser Saldo: game.run sinkt, game.chart nicht',
    paid.ok === true && paid.run === 75 && paid.chart === 100, paid);
  const disc = await page.evaluate(() => {
    const el = document.getElementById('crRunDisclosure');
    return el ? el.textContent.trim() : '';
  });
  check('C5 · die Offenlegung steht dort, wo der Saldo erklaert wird',
    /\$RUN ist ein Guthaben im Spiel/.test(disc) && /nicht gelauncht/.test(disc)
    && /weder verf/.test(disc) && /zugesagt/.test(disc), disc);
  check('C5 · sie steht genau EINMAL in der Datei',
    (html.match(/id="crRunDisclosure"/g) || []).length === 1);
  check('C5 · die „Not launched yet"-Korrektur aus v925 bleibt',
    (html.match(/Not launched yet/g) || []).length >= 2);

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + ' ok, ' + fail + ' fehlgeschlagen');
  await browser.close();
  try { srv.close(); } catch(_){}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
