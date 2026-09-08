/* Smoke-Verifikation v1.0.925 — Ownership B (CLIENT): crOwnership, der Server
 * als Autoritaet fuer BELEGTEN Besitz, ehrliche Kennzeichnung.
 *
 * GEMESSEN VOR DEM BAU (08.09.2026, siehe PR): der Server aus Auftrag A ist
 * NICHT ausgerollt. Supabase fuehrt weder cr_ownership_claim noch
 * cr_loadout_get/_set (pg_proc abgefragt), das Repo hat keinen
 * ownership-Worker, und es liegt kein offener PR dafuer. Genau deshalb ist
 * O1b („Serverausfall nimmt nichts weg") hier kein Randfall, sondern der
 * heutige Normalzustand — der Test faehrt beide Welten.
 *
 * Geprueft wird, was die Seite VERLAESST (Spion im page.route-Handler), was
 * als RPC gestellt wird (Spion im crAccount-Stub) und was der Nutzer SIEHT
 * (Picker-Zeile, Settings-Text, Kauf-Toast). Jede Gegenprobe MUSS ROT werden
 * koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *   O1   has() vereinigt Server und lokal; ein verified:true kommt vom Server,
 *        ein lokaler Eintrag ist owned:true/verified:false.
 *        (Mutation: in has() den `if(local)`-Block entfernen → O1 rot.)
 *   O1b  Serverausfall (HTTP 500) → lokaler Besitz bleibt sichtbar UND
 *        benutzbar (crBotOwned true), der zuvor gespiegelte Server-Bestand
 *        ebenfalls. Es wird NICHTS entfernt.
 *        (Mutation: in init() bei Fehler `_srv = _blank()` setzen → O1b rot.)
 *   O2   Ein lokaler claim auf eine Kennung, die der Server verified:true
 *        fuehrt, stuft sie NICHT herab.
 *        (Mutation: in _note() `if(verified) cur.verified = true;` durch
 *         `cur.verified = !!verified;` ersetzen → O2 rot.)
 *   O3   claim genau EINMAL je Erwerb, mit der richtigen Provenienz:
 *        Kampagnen-Grant → 'campaign', Soft-Kauf → 'softcurrency'.
 *        (Mutation: in crBuyBot `crUnlockBot(id, 'softcurrency')` auf
 *         `crUnlockBot(id)` zuruecksetzen → O3 rot.)
 *   O3b  RPC-Ausfall blockiert weder Kauf noch Spiel: crBuyBot liefert true,
 *        der Bot ist besessen, der Anspruch liegt in der Schlange.
 *        (Mutation: in claim() bei Fehler `throw` statt `_queue` → O3b rot.)
 *   O4   Migration laeuft GENAU EINMAL (Merker cr_ownership_migrated_v1),
 *        meldet Kampagnen-Bots als 'campaign' und bepreiste Gear als
 *        'softcurrency', und meldet Starter-Bots NICHT (die bekommt jeder).
 *        (Mutation: das localStorage.setItem des Merkers entfernen → O4 rot.)
 *   O5   GAST-PFAD: null Netzaufrufe an /ownership/*, null RPCs, und keine
 *        Kennzeichnung (label() leer) — ohne Konto gibt es nichts zu belegen.
 *        (Mutation: in init() das `if(isGuest())` entfernen → O5 rot.)
 *   O6   Kein sichtbarer Kauf-Text sagt mehr „$RUN": Datei-grep auf die
 *        Kauf-Strings PLUS der echte Toast aus einem gescheiterten Kauf.
 *        (Mutation: '$RUN' in den Toast zuruecklegen → O6 rot.)
 *   O7   Kennzeichnung ist eine HERKUNFTSANGABE: zwei Zeilen mit
 *        data-cr-prov, kein Schloss, keine rote Farbe, verified
 *        hervorgehoben.
 *        (Mutation: den prov-Block in _openPlayerSlotPop entfernen → O7 rot.)
 *   O8   Settings traegt „Link wallet to account" und sagt ausdruecklich, dass
 *        nichts bezahlt und nichts auf die Kette geht; ohne Anmeldung geht
 *        KEIN Request raus; angemeldet laeuft challenge → signMessage →
 *        verify mit genau EINER Nachrichten-Signatur.
 *        (Mutation: den `if(!id.signedIn)`-Riegel in linkWallet entfernen
 *         → O8 rot.)
 *   O9   syncLoadout: neuerer Server-Stand gewinnt, aelterer wird ueber-
 *        schrieben (push). Kein Autoritaetsanspruch, nur letzter Schreiber.
 *        (Mutation: `srvTs > locTs` zu `srvTs < locTs` → O9 rot.)
 *   O10  Regression: Market- und Limit-Pfad unveraendert vorhanden.
 *
 * Aufruf:  npm i playwright --no-save && node scripts/check_v925_ownership_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
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

/* Ein winziger Static-Server, damit die Seite einen echten Origin hat. */
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

/* Fixture-Schalter, node-seitig zwischen den Schritten umstellbar. */
const cfg = { listMode: 'ok' };

/* Spion: was die Seite an /ownership/* schickt. */
const seen = { list: [], link: [] };

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const req = route.request(), url = req.url();
    if(url.startsWith('file:')) return route.continue();
    /* Das Dokument selbst kommt vom lokalen Server, nicht aus dem Mock. */
    if(/^http:\/\/127\.0\.0\.1:\d+\/play\/?(\?|$)/.test(url)) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });

    if(/\/ownership\/list/.test(url)){
      seen.list.push({ url, auth: req.headers()['authorization'] || '' });
      if(cfg.listMode === 'down') return J({ error: 'server-down' }, 500);
      return J({ ok: true, items: [
        { kind:'bot',  id:'det_ccv',  verified:true,  provenance:'purchase' },
        { kind:'bot',  id:'det_srv',  verified:false, provenance:'campaign' },
        { kind:'gear', id:'magnet',   verified:true,  provenance:'purchase' },
      ] });
    }
    if(/\/ownership\/link-wallet/.test(url)){
      let b = null; try { b = req.postDataJSON(); } catch(_){}
      seen.link.push(b);
      if(b && b.step === 'challenge') return J({ ok:true, challenge:'CR-LINK-925-abc' });
      if(b && b.step === 'verify')    return J({ ok:true });
      return J({ error: 'bad-step' }, 400);
    }
    /* Alles andere (Worker, Preise, Charts) darf schweigen — dieser Test
     * misst den Besitz, nicht den Handel. */
    return J({});
  });

  /* Der Identitaets-Stub. crOwnership liest window.crAccount / window.crSigner
   * bei JEDEM Aufruf neu, deshalb reicht ein Austausch nach dem Boot — und der
   * Test misst dann GENAU unseren Vertrag, nicht die Supabase-Bibliothek. */
  await page.addInitScript(() => {
    window.__signedIn = false;
    window.__rpc = [];
    window.__rpcFail = false;
    window.__msgs = [];
    window.__loadoutRow = null;
    window.__installStubs = function(){
      window.crAccount = {
        isSignedIn: () => !!window.__signedIn,
        token: () => (window.__signedIn ? 'JWT-TESTONLY-925' : ''),
        email: () => (window.__signedIn ? 'a@b.c' : ''),
        userId: () => (window.__signedIn ? 'uid-925' : ''),
        rpc: (fn, args) => {
          window.__rpc.push({ fn, args });
          if(window.__rpcFail) return Promise.resolve({ error: 'rpc-down' });
          if(fn === 'cr_loadout_get') return Promise.resolve(window.__loadoutRow);
          return Promise.resolve({ ok: true });
        },
        _gatesSync: () => {},
      };
      window.crSigner = {
        active: () => (window.__wallet ? { address: window.__wallet } : null),
        signMessage: (m) => { window.__msgs.push(String(m)); return Promise.resolve({ signature: 'SIGB58-925' }); },
      };
    };
  });

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
  check('Banner meldet mindestens v1.0.925',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || (bv[1] === 0 && bv[2] >= 925)))), bv);
  check('crOwnership ist da (init/has/claim/syncLoadout/linkWallet)', await page.evaluate(() =>
    !!(window.crOwnership && ['init','has','claim','syncLoadout','linkWallet','label','identity','isGuest']
      .every(k => typeof crOwnership[k] === 'function'))));

  /* ─────────────────────────────────────────────────────────────────────
   * O5 zuerst: der Gast-Pfad ist nur beweisbar, SOLANGE noch keine
   * Identitaet gesetzt wurde. Der Boot lag bereits hinter uns — was hier
   * gezaehlt wird, schliesst den Start-Anstoss mit ein.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O5 · Gast: null Netz, null Kennzeichnung --');
  await page.evaluate(() => { window.__installStubs(); window.__signedIn = false; window.__wallet = ''; window.__rpc = []; });
  const guest = await page.evaluate(async () => {
    try { localStorage.removeItem('cr_wallet'); } catch(_){}
    const out = { isGuest: crOwnership.isGuest() };
    /* JEDEN Einstieg einzeln anfassen, nicht nur den bequemen. Die erste
     * Fassung rief nur onIdentityChange() — das steigt selbst aus, bevor es
     * init() erreicht, also blieb der Gast-Riegel IN init() ungeprueft: die
     * Gegenprobe (Riegel raus) blieb gruen. init(true) geht absichtlich am
     * Cache vorbei und zwingt den Riegel in die Messung. */
    await crOwnership.onIdentityChange();
    await crOwnership.init(true);
    await crOwnership.syncLoadout();
    await crOwnership.claim('bot', 'det_guest', 'campaign');
    const link = await crOwnership.linkWallet();
    out.linkErr = link && link.error;
    out.label = crOwnership.label('bot', 'det_sfp');
    out.rpc = window.__rpc.length;
    return out;
  });
  check('Gast erkannt', guest.isGuest === true, guest);
  check('O5 · null Requests an /ownership/*', seen.list.length === 0 && seen.link.length === 0,
    { list: seen.list.length, link: seen.link.length });
  check('O5 · null RPCs', guest.rpc === 0, guest.rpc);
  check('O5 · keine Kennzeichnung fuer Gaeste', guest.label === '', guest.label);
  check('O5 · linkWallet sagt ehrlich, was fehlt', guest.linkErr === 'not-signed-in', guest.linkErr);

  /* ─────────────────────────────────────────────────────────────────────
   * O4 · Migration. Muss VOR O1 laufen: sie haengt am jungfraeulichen
   * Merker, und O1 setzt ihn durch seinen eigenen init() unweigerlich.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O4 · Uebernahme des Bestands, genau einmal --');
  seen.list.length = 0;
  const mig = await page.evaluate(async () => {
    try {
      localStorage.removeItem('cr_ownership_migrated_v1');
      localStorage.setItem('cr_owned_bots_v1', JSON.stringify(['det_sfp','det_climax','det_vwap','det_ccv','det_div']));
      localStorage.setItem('cr_owned_gear_v1', JSON.stringify(['magnet']));
    } catch(_){}
    /* Die In-Memory-Sets auf denselben Stand bringen (der Boot hat sie
     * einmal aus localStorage gelesen; hier zaehlt der neue Inhalt). */
    ['det_ccv','det_div'].forEach(b => CR_OWNED_BOTS.add(b));
    CR_OWNED_GEAR.add('magnet');
    window.__signedIn = true; window.__wallet = ''; window.__rpc = [];
    await crOwnership.init(true);
    const first = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);
    const marker = localStorage.getItem('cr_ownership_migrated_v1');
    window.__rpc = [];
    await crOwnership.init(true);
    const second = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);
    return { first, second, marker };
  });
  const migIds = mig.first.map(a => a.p_kind + ':' + a.p_id + ':' + a.p_provenance).sort();
  check('O4 · Kampagnen-Bots als campaign gemeldet',
    migIds.includes('bot:det_ccv:campaign') && migIds.includes('bot:det_div:campaign'), migIds);
  check('O4 · bepreiste Gear als softcurrency gemeldet',
    migIds.includes('gear:magnet:softcurrency'), migIds);
  check('O4 · Starter-Bots NICHT gemeldet (die bekommt jeder geschenkt)',
    !migIds.some(s => /det_sfp|det_climax|det_vwap/.test(s)), migIds);
  check('O4 · Merker gesetzt', mig.marker === '1', mig.marker);
  check('O4 · zweiter Start meldet NICHTS erneut', mig.second.length === 0, mig.second);

  /* ─────────────────────────────────────────────────────────────────────
   * O1/O2 · Vereinigung und Nicht-Herabstufung.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O1/O2 · Vereinigung, Ausfall, keine Herabstufung --');
  cfg.listMode = 'ok';
  const union = await page.evaluate(async () => {
    window.__signedIn = true; window.__wallet = ''; window.__rpc = [];
    CR_OWNED_BOTS.add('det_local');           /* nur lokal, nie beim Server */
    await crOwnership.init(true);
    return {
      srvVerified: crOwnership.has('bot', 'det_ccv'),
      srvPlain:    crOwnership.has('bot', 'det_srv'),
      localOnly:   crOwnership.has('bot', 'det_local'),
      unknown:     crOwnership.has('bot', 'det_nope'),
      gearVerified: crOwnership.has('gear', 'magnet'),
      ownedSrv:    crBotOwned('det_srv'),
      ownedLocal:  crBotOwned('det_local'),
    };
  });
  check('O1 · Server-Eintrag mit Beleg → owned + verified',
    union.srvVerified.owned === true && union.srvVerified.verified === true, union.srvVerified);
  check('O1 · Server-Eintrag ohne Beleg → owned, NICHT verified',
    union.srvPlain.owned === true && union.srvPlain.verified === false, union.srvPlain);
  check('O1 · rein lokaler Eintrag → owned, NICHT verified, provenance local',
    union.localOnly.owned === true && union.localOnly.verified === false && union.localOnly.provenance === 'local', union.localOnly);
  check('O1 · Unbekanntes bleibt unbesessen', union.unknown.owned === false, union.unknown);
  check('O1 · crBotOwned sieht beide Seiten', union.ownedSrv === true && union.ownedLocal === true, union);
  check('O1 · Gear folgt derselben Regel', union.gearVerified.owned === true && union.gearVerified.verified === true, union.gearVerified);

  const noDown = await page.evaluate(async () => {
    /* Ein lokaler Anspruch auf genau die Kennung, die der Server BELEGT
     * fuehrt. Herabstufen waere hier der teure Fehler. */
    await crOwnership.claim('bot', 'det_ccv', 'campaign');
    return crOwnership.has('bot', 'det_ccv');
  });
  check('O2 · lokaler claim stuft verified:true NICHT herab',
    noDown.owned === true && noDown.verified === true, noDown);

  console.log('\n-- O1b · Serverausfall nimmt nichts weg --');
  cfg.listMode = 'down';
  const down = await page.evaluate(async () => {
    const r = await crOwnership.init(true);
    return {
      initErr: r && r.error,
      local: crBotOwned('det_local'),
      mirrored: crBotOwned('det_srv'),          /* war gespiegelt → ueberlebt offline */
      stillVerified: crOwnership.has('bot', 'det_ccv').verified,
    };
  });
  check('O1b · Ausfall wird als Fehler gemeldet, nicht verschwiegen', !!down.initErr, down.initErr);
  check('O1b · lokaler Besitz bleibt nutzbar', down.local === true, down);
  check('O1b · gespiegelter Server-Besitz bleibt nutzbar', down.mirrored === true, down);
  check('O1b · ein Ausfall entwertet keinen Beleg', down.stillVerified === true, down);
  cfg.listMode = 'ok';

  /* ─────────────────────────────────────────────────────────────────────
   * O3 · Genau ein claim je Erwerb, mit der richtigen Provenienz.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O3 · claim genau einmal, richtige Provenienz --');
  const claims = await page.evaluate(async () => {
    window.__signedIn = true; window.__rpcFail = false;
    try { game.run = 500; } catch(_){}
    window.__rpc = [];
    const granted = crUnlockBot('det_camp1', 'campaign');
    await new Promise(r => setTimeout(r, 60));
    const afterGrant = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);

    window.__rpc = [];
    const bought = crBuyBot('det_buy1');
    await new Promise(r => setTimeout(r, 60));
    const afterBuy = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').map(r => r.args);

    /* Ein zweiter Griff auf dasselbe: schon besessen → kein zweiter claim. */
    window.__rpc = [];
    const again = crUnlockBot('det_camp1', 'campaign');
    await new Promise(r => setTimeout(r, 60));
    const afterAgain = window.__rpc.filter(r => r.fn === 'cr_ownership_claim').length;

    return { granted, bought, again, afterGrant, afterBuy, afterAgain };
  });
  check('O3 · Kampagnen-Grant → genau 1 claim, provenance campaign',
    claims.granted === true && claims.afterGrant.length === 1
    && claims.afterGrant[0].p_id === 'det_camp1' && claims.afterGrant[0].p_provenance === 'campaign', claims.afterGrant);
  check('O3 · Soft-Kauf → genau 1 claim, provenance softcurrency',
    claims.bought === true && claims.afterBuy.length === 1
    && claims.afterBuy[0].p_id === 'det_buy1' && claims.afterBuy[0].p_provenance === 'softcurrency', claims.afterBuy);
  check('O3 · schon Besessenes claimt nicht erneut',
    claims.again === false && claims.afterAgain === 0, claims);

  const failSafe = await page.evaluate(async () => {
    window.__rpcFail = true;
    try { game.run = 500; } catch(_){}
    const bought = crBuyBot('det_buy2');
    await new Promise(r => setTimeout(r, 80));
    const st = crOwnership._state();
    window.__rpcFail = false;
    return { bought, owned: crBotOwned('det_buy2'),
             queued: st.pending.some(p => p.id === 'det_buy2' && p.provenance === 'softcurrency') };
  });
  check('O3b · RPC-Ausfall blockiert den Kauf nicht', failSafe.bought === true && failSafe.owned === true, failSafe);
  check('O3b · der abgewiesene Anspruch wartet in der Schlange', failSafe.queued === true, failSafe);

  /* ─────────────────────────────────────────────────────────────────────
   * O9 · Loadout-Sync, letzter Schreiber gewinnt.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O9 · Loadout: letzter Schreiber gewinnt --');
  const sync = await page.evaluate(async () => {
    localStorage.setItem('cr_loadout_synced_v1', String(Date.parse('2026-01-01T00:00:00Z')));
    window.__loadoutRow = { equipped_bots: ['det_srv'], equipped_tools: ['hline'],
                            loadout: { skin: 'invader-red' }, updated_at: '2026-09-01T00:00:00Z' };
    window.__rpc = [];
    const a = await crOwnership.syncLoadout();
    const applied = { res: a && a.applied,
                      bots: localStorage.getItem('cr_equipped_bots_v1'),
                      skin: (JSON.parse(localStorage.getItem('cr_player_loadout_v1') || '{}') || {}).skin,
                      sets: window.__rpc.filter(r => r.fn === 'cr_loadout_set').length };

    /* Jetzt ist der lokale Stand der juengere → der Client schreibt. */
    window.__loadoutRow = { equipped_bots: ['det_old'], equipped_tools: [], loadout: {},
                            updated_at: '2020-01-01T00:00:00Z' };
    window.__rpc = [];
    const b = await crOwnership.syncLoadout();
    return { applied, second: { res: b && b.applied,
             sets: window.__rpc.filter(r => r.fn === 'cr_loadout_set').length,
             bots: localStorage.getItem('cr_equipped_bots_v1') } };
  });
  check('O9 · neuerer Server-Stand wird uebernommen',
    sync.applied.res === 'server' && /det_srv/.test(sync.applied.bots || '')
    && sync.applied.skin === 'invader-red' && sync.applied.sets === 0, sync.applied);
  check('O9 · aelterer Server-Stand wird ueberschrieben, nicht uebernommen',
    sync.second.res === 'local' && sync.second.sets === 1 && !/det_old/.test(sync.second.bots || ''), sync.second);

  /* ─────────────────────────────────────────────────────────────────────
   * O7 · Kennzeichnung ist eine Herkunftsangabe, keine Warnung.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O7 · Ehrliche Kennzeichnung --');
  const prov = await page.evaluate(() => {
    const labels = { verified: crOwnership.label('bot', 'det_ccv'),
                     unverified: crOwnership.label('bot', 'det_local') };
    const anchor = document.createElement('div');
    anchor.style.cssText = 'position:fixed;left:10px;top:10px;width:60px;height:20px';
    document.body.appendChild(anchor);
    _openPlayerSlotPop(anchor, [
      { id:'a', ic:'▣', nm:'Freigespielt', prov: labels.unverified, provVerified: false },
      { id:'b', ic:'▣', nm:'Belegt',       prov: labels.verified,   provVerified: true  },
    ], 'a', () => {});
    const rows = Array.from(document.querySelectorAll('.player-slot-pop [data-cr-prov]'));
    const out = { labels, n: rows.length,
      texts: rows.map(r => r.textContent),
      kinds: rows.map(r => r.getAttribute('data-cr-prov')),
      colors: rows.map(r => r.style.color),
      hasLock: rows.some(r => /🔒/.test(r.textContent)),
      tip: rows.map(r => r.title) };
    try { anchor.remove(); } catch(_){}
    return out;
  });
  check('O7 · belegt und freigespielt tragen verschiedene Worte',
    prov.labels.verified === 'gekauft, belegt' && prov.labels.unverified === 'im Spiel freigespielt', prov.labels);
  check('O7 · beide Zeilen werden gerendert', prov.n === 2, prov);
  check('O7 · verified/unverified sind unterscheidbar ausgezeichnet',
    prov.kinds.join(',') === 'unverified,verified', prov.kinds);
  check('O7 · KEIN Schloss-Symbol, keine Abwertung', prov.hasLock === false, prov.texts);
  check('O7 · belegter Besitz wird hervorgehoben, nicht gewarnt',
    /14f195|rgb\(20, ?241, ?149\)/.test(prov.colors[1] || '') && !/ff6b6b|red/i.test(prov.colors[0] || ''), prov.colors);
  check('O7 · der Tooltip erklaert den Unterschied',
    /Turniere/.test(prov.tip[0] || '') && /Spiel/.test(prov.tip[0] || ''), prov.tip[0]);

  /* ─────────────────────────────────────────────────────────────────────
   * O8 · Wallet verknuepfen.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O8 · Wallet mit Konto verknuepfen --');
  const uiText = await page.evaluate(() => {
    const b = document.getElementById('crSetLinkWallet');
    const w = document.getElementById('crSetLinkWrap');
    return { btn: !!b, label: b ? b.textContent.trim() : '', hint: w ? w.textContent : '' };
  });
  check('O8 · der Punkt steht in den Settings', uiText.btn === true, uiText);
  check('O8 · er sagt, dass NICHTS bezahlt und NICHTS auf die Kette geht',
    /no payment/i.test(uiText.hint) && /no transaction/i.test(uiText.hint) && /nothing on-chain/i.test(uiText.hint), uiText.hint);
  check('O8 · er sagt, dass es freiwillig ist', /optional/i.test(uiText.hint), uiText.hint);

  seen.link.length = 0;
  const linkNoSignIn = await page.evaluate(async (addr) => {
    window.__signedIn = false; window.__wallet = addr; window.__msgs = [];
    const r = await crOwnership.linkWallet();
    window.__signedIn = true;
    return { err: r && r.error, msgs: window.__msgs.length };
  }, ADDR);
  check('O8 · ohne Anmeldung: kein Request, keine Signatur',
    linkNoSignIn.err === 'not-signed-in' && linkNoSignIn.msgs === 0 && seen.link.length === 0,
    { linkNoSignIn, link: seen.link.length });

  seen.link.length = 0;
  const linked = await page.evaluate(async (addr) => {
    window.__signedIn = true; window.__wallet = addr; window.__msgs = [];
    const r = await crOwnership.linkWallet();
    return { ok: r && r.ok, err: r && r.error, msgs: window.__msgs.slice() };
  }, ADDR);
  check('O8 · challenge → signMessage → verify, genau EINE Nachrichten-Signatur',
    linked.ok === true && linked.msgs.length === 1 && linked.msgs[0] === 'CR-LINK-925-abc',
    { linked, steps: seen.link.map(b => b && b.step) });
  check('O8 · beide Schritte gehen raus, in dieser Reihenfolge',
    seen.link.length === 2 && seen.link[0].step === 'challenge' && seen.link[1].step === 'verify'
    && seen.link[1].signature === 'SIGB58-925', seen.link.map(b => b && b.step));

  /* ─────────────────────────────────────────────────────────────────────
   * O6 · Kein sichtbarer Kauf-Text sagt mehr „$RUN".
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O6 · Kauf-Texte sagen $CHART, nicht $RUN --');
  const html = fs.readFileSync(FILE, 'utf8');
  const buyStrings = html.match(/'(?:Need|BOT BOUGHT|GEAR BOUGHT)[^']*'/g) || [];
  check('O6 · die Kauf-Strings sind auffindbar', buyStrings.length >= 4, buyStrings);
  check('O6 · KEIN Kauf-String enthaelt noch $RUN',
    !buyStrings.some(s => s.includes('$RUN')), buyStrings.filter(s => s.includes('$RUN')));
  check('O6 · das Etikett steht an genau einer Stelle',
    (html.match(/const CR_INGAME_CUR = '\$CHART';/g) || []).length === 1);
  /* Und das, was der Spieler wirklich liest — der echte Toast. */
  const toastTxt = await page.evaluate(() => {
    const seenT = [];
    const orig = window.toast;
    window.toast = (t) => { seenT.push(String(t)); };
    try { game.run = 0; } catch(_){}
    crBuyBot('det_toast_probe');
    window.toast = orig;
    return seenT;
  });
  check('O6 · der gescheiterte Kauf sagt $CHART',
    toastTxt.some(t => /\$CHART/.test(t)) && !toastTxt.some(t => /\$RUN/.test(t)), toastTxt);
  check('O6 · die Tokenomics-Tafel sagt, dass $RUN nicht gelauncht ist',
    (html.match(/Not launched yet/g) || []).length >= 2);

  /* ─────────────────────────────────────────────────────────────────────
   * O10 · Regression: Handelspfade unangetastet.
   * ──────────────────────────────────────────────────────────────────── */
  console.log('\n-- O10 · Market- und Limit-Pfad unveraendert --');
  const seam = await page.evaluate(() => ({
    adapter: !!(window.crRealAdapter && typeof crRealAdapter.marketSwap === 'function'
             && typeof crRealAdapter.limitVault === 'function'
             && typeof crRealAdapter.limitOnchain === 'function'),
    weiche: !!(window.crWeiche && typeof crWeiche.decide === 'function'),
    vault:  !!(window.crVaultLimit && typeof crVaultLimit.prepare === 'function'),
    onchain:!!(window.crOnchainLimit && typeof crOnchainLimit.prepare === 'function'),
  }));
  check('O10 · crRealAdapter fuehrt weiter alle drei Wege', seam.adapter === true, seam);
  check('O10 · Weiche, Vault- und On-Chain-Limit unveraendert vorhanden',
    seam.weiche && seam.vault && seam.onchain, seam);

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + ' ok, ' + fail + ' fehlgeschlagen');
  await browser.close();
  try { srv.close(); } catch(_){}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
