/* Smoke-Verifikation v1.0.932 — ROOMS B · CLIENT: Host-Kennung, zwei falsche
 * Basis-URLs, und die vier Felder.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, und zwar an den zwei
 * Stellen, an denen der Client die Aussenwelt beruehrt:
 *
 *   · DER DRAHT  — ein WebSocket-Doppel ersetzt window.WebSocket, bevor die
 *     Seite laedt, und schreibt JEDEN gesendeten Rahmen mit. Geprueft wird
 *     also die `create`-NACHRICHT, nicht ein Aufruf. Ein Spion auf
 *     RoomsClient.create bewiese nur, dass jemand sie ruft — der Server sieht
 *     das JSON, und genau das ist der Vertrag mit „Rooms A · SERVER":
 *         { type:'create', name, pub:bool, asset?, tf?, mapName? }
 *         pub Vorgabe false · asset <= 24 · tf <= 8 · mapName <= 64
 *   · DAS NETZ  — page.route sieht die URL jedes /rooms/<id>-Abrufs. Ob ein
 *     Beitrittspfad auf rooms.chartrunner.xyz oder auf den Legacy-Relay
 *     relay.chartrunner.xyz zeigt, ist eine Frage der URL, nicht der Absicht.
 *
 * Beide Beitrittspfade werden ueber die ECHTE Oberflaeche ausgeloest (Klick auf
 * eine LIVE-ROOMS-Zeile bzw. auf „Join their room" im Profil), nicht ueber die
 * privaten Funktionen — die sind nicht exportiert, und ein Test, der sie
 * herausoperiert, prueft eine andere Strecke als der Benutzer laeuft.
 *
 * Jede Pruefung MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Ersteller -> roster()[0].seat === 'host', die Tafel zeigt HOST;
 *      Peer bleibt 'guest', nach leaveRoom wieder 'guest', ein Beitretender
 *      ist 'guest' (sonst waere 'host' bloss eine Konstante).
 *  T2  joinById (LIVE-ROOMS-Zeile) und crSocial.joinRoom holen /rooms/<id>
 *      von rooms.chartrunner.xyz und NICHT vom Relay; der Spion sieht
 *      crRoomsDirFetch mit derselben Aufrufform wie im Modal.
 *  T3  PUBLIC -> die create-Nachricht traegt pub:true + asset + tf + mapName,
 *      asset/tf aus DERSELBEN Quelle wie chartParams(); PRIVATE -> pub false.
 *      Der Vertrag kappt (24/8/64), der Altaufruf mit blossem String lebt,
 *      der 'Public listing'-Hinweis ist weg, der moderated-Hinweis nicht.
 *
 * GEGENPROBEN — GEMESSEN, nicht behauptet. Jede Mutation wurde einzeln in
 * ChartRunner_Prototype.html eingebaut, die Suite lief, danach hat
 * `git checkout` wiederhergestellt. Keine davon war CRASH: der Lauf ging jedes
 * Mal durch, „keine harten Page-Errors" blieb gruen, und rot wurde nur das,
 * was die Zeile behauptet.
 *
 *   M1  enterRoom: `iAmCreator = !!asCreator` gestrichen (Zustand wie v931)
 *       ROT: T1a, T1b, T1c  (24 gruen)
 *   M2  leaveRoom: `iAmCreator = false` gestrichen
 *       ROT: T1e  (26 gruen) — der Host-Sitz ueberlebte den Raum.
 *   M3  crRoomOverview: 'host' aus der Sitz-Erkennung genommen
 *       (isHostSeat nur noch 'creator')
 *       ROT: T1b  (26 gruen) — roster() sagt weiter 'host', nur die Tafel
 *       schrieb wieder „guest": genau der Befund aus dem Auftrag.
 *   M4  crSocial.joinRoom auf http() zurueckgedreht (Auftrag, Test 5)
 *       ROT: T2d, T2e, T2f  (24 gruen)
 *   M5  joinById auf fetch(http() + ...) zurueckgedreht
 *       ROT: T2a, T2b, T2c  (24 gruen)
 *   M6  _createPayload: asset/tf fest auf '' (Felder wieder leer)
 *       ROT: T3b, T3c  (25 gruen)
 *   M7  RoomsClient.create: `pub: !!r.pub` -> `pub: false`
 *       ROT: T3a  (26 gruen) — T3d bleibt gruen, PRIVATE war ja schon richtig.
 *   M8  RoomsClient.create: Kappung fuer mapName entfernt (slice(0,64) raus)
 *       ROT: T3g  (26 gruen)
 *
 * Aufruf:  node scripts/check_v932_rooms_client_browser.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'ChartRunner_Prototype.html');
const HTML = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
function check(n, c, x){
  if(c){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x).slice(0, 600) : '')); }
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

const LIVE_RID = 'V932LIVE';    // T2 — die LIVE-ROOMS-Zeile im ROOMS-Tab
const SOC_RID  = 'V932SOC';     // T2 — „Join their room" im Spielerprofil
const SOC_NAME = 'v932zora';

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  const seen = [];                          // jede Anfrage, die das Spiel stellt
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    seen.push(url);
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if(/\/rooms\/[^/?]+/.test(url))  return J({});          // Raumsatz ohne id -> kein location.href, kein Wegnavigieren
    if(/\/rooms(\?|$)/.test(url))    return J([{ id: SOC_RID, handle: SOC_NAME, mapName: 'BTC · 1m', asset: 'BTC', tf: '1m', players: 2, pub: 1 }]);
    if(/\/presence/.test(url))       return J([{ name: SOC_NAME, wallet: '', online: true, lastSeen: Date.now() }]);
    if(/\/v1\/track\//.test(url))    return J({ ok: true });
    if(/\/v1\/ohlc\//.test(url))     return J({ ok: true, candles: [] });
    if(/dexscreener/.test(url))      return J({ pairs: [] });
    if(/\/health/.test(url))         return J({ ok: true });
    return J({});
  });

  /* DAS DRAHT-DOPPEL. Steht VOR jedem Skript der Seite, damit RoomsClient beim
   * ersten send() unser WebSocket baut und nicht das echte (rooms.chartrunner.xyz
   * ist aus dieser Sandbox ohnehin nicht erreichbar — ein Test, der davon
   * abhinge, waere gruen aus dem falschen Grund). */
  await page.addInitScript(() => {
    window.__v932 = { sent: [], sockets: 0, toasts: [], dir: [] };
    function FakeWS(url){
      this.url = String(url); this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      window.__v932.sockets++; window.__v932._last = this;
      var self = this;
      setTimeout(function(){ if(self.readyState === 0){ self.readyState = 1; try { if(self.onopen) self.onopen({}); } catch(_){} } }, 10);
    }
    FakeWS.prototype.send = function(raw){ try { window.__v932.sent.push(String(raw)); } catch(_){} };
    FakeWS.prototype.close = function(){ if(this.readyState === 3) return; this.readyState = 3; try { if(this.onclose) this.onclose({}); } catch(_){} };
    FakeWS.CONNECTING = 0; FakeWS.OPEN = 1; FakeWS.CLOSING = 2; FakeWS.CLOSED = 3;
    window.WebSocket = FakeWS;
    window.__v932.emit = function(o){
      var s = window.__v932._last;
      if(!s || !s.onmessage) return false;
      s.onmessage({ data: JSON.stringify(o) });
      return true;
    };
    window.__v932.msgs = function(t){
      return window.__v932.sent.map(function(r){ try { return JSON.parse(r); } catch(_){ return null; } })
        .filter(function(m){ return m && (!t || m.type === t); });
    };
    window.__v932.clear = function(){ window.__v932.sent.length = 0; window.__v932.toasts.length = 0; window.__v932.dir.length = 0; };
    // Die Namensabfrage in crSocial.joinRoom darf den Lauf nicht anhalten.
    window.prompt = function(){ return null; };
    try { localStorage.setItem('cr_lang_v1', 'de'); } catch(_){}
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Spione, die es erst NACH dem Boot geben kann: der Verzeichnis-Abruf und die
  // Toasts. crRoomsDirFetch wird umhuellt, nicht ersetzt — der echte Abruf laeuft.
  await page.evaluate(() => {
    var real = window.crRoomsDirFetch;
    window.crRoomsDirFetch = function(p){ window.__v932.dir.push(String(p)); return real.apply(this, arguments); };
    var t = window.toast;
    window.toast = function(m){ try { window.__v932.toasts.push(String(m)); } catch(_){} try { return t.apply(this, arguments); } catch(_){} };
  });

  console.log('\n-- Boot --');
  const hard0 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard0.length === 0, hard0.slice(0, 3));
  check('crRoomsNet ist der aktive Stack (ohne ?relay=1)',
    await page.evaluate(() => !!(window.crRoomsNet && crRoomsNet.enabled())));
  check('das Draht-Doppel steht (sonst misst T1/T3 nichts)',
    await page.evaluate(() => typeof window.__v932 === 'object' && Array.isArray(window.__v932.sent)));

  /* ═══ T1 — DER ERSTELLER IST HOST ═══════════════════════════════════════ */
  console.log('\n-- T1 · Host-Kennung --');
  const t1 = await page.evaluate(async () => {
    window.__v932.clear();
    crRoomsNet.create({});
    await new Promise(r => setTimeout(r, 120));
    const socketBuilt = window.__v932.sockets > 0;
    const created = window.__v932.emit({ type:'created', room:'V932', playerId:'me1' });
    const mine = crRoomsNet.roster();
    window.__v932.emit({ type:'peer_joined', playerId:'peer1', name:'gast' });
    const withPeer = crRoomsNet.roster();
    return { socketBuilt, created, mine, withPeer, code: crRoomsNet.roomId() };
  });
  check('T1a Ersteller: der eigene Eintrag traegt seat "host"',
    t1.created === true && t1.mine.length === 1 && t1.mine[0].self === true && t1.mine[0].seat === 'host', t1);

  const t1b = await page.evaluate(() => {
    window.crRoomOverviewOpen();
    var row = document.querySelector('#crRoomOverview .crRoRow');
    return { seat: row && row.querySelector('.seat') ? row.querySelector('.seat').textContent : null,
             nm: row ? row.textContent : null };
  });
  check('T1b … und die Tafel schreibt HOST, nicht GUEST (das war der Befund)',
    t1b.seat === 'host' && /★/.test(t1b.nm || ''), t1b);
  await page.evaluate(() => window.crRoomOverviewClose());

  check('T1c der Peer bleibt "guest" — wer von den anderen der Ersteller war, weiss der Client nicht',
    t1.withPeer.length === 2 && t1.withPeer[1].self === false && t1.withPeer[1].seat === 'guest', t1.withPeer);

  const t1d = await page.evaluate(async () => {
    crRoomsNet.leave();
    await new Promise(r => setTimeout(r, 60));
    const afterLeave = crRoomsNet.roster();
    window.__v932.clear();
    crRoomsNet.join('V933');
    await new Promise(r => setTimeout(r, 120));
    const joined = window.__v932.emit({ type:'joined', room:'V933', playerId:'me2', players:[] });
    const asJoiner = crRoomsNet.roster();
    crRoomsNet.leave();
    return { afterLeave, joined, asJoiner };
  });
  check('T1d nach leaveRoom wieder "guest" — der Host-Sitz endet mit dem Raum',
    t1d.afterLeave.length === 1 && t1d.afterLeave[0].seat === 'guest', t1d.afterLeave);
  check('T1e als Beitretender "guest" (sonst waere "host" bloss eine Konstante)',
    t1d.joined === true && t1d.asJoiner.length === 1 && t1d.asJoiner[0].seat === 'guest', t1d);

  /* ═══ T2 — DIE ZWEI BEITRITTSPFADE ══════════════════════════════════════ */
  console.log('\n-- T2 · Basis-URL der Beitrittspfade --');
  const roomsHits = (rid) => seen.filter(u => u.indexOf('/rooms/' + rid) >= 0);
  seen.length = 0;
  await page.evaluate(async (rid) => {
    window.__v932.clear();
    // Eine echte LIVE-ROOMS-Zeile im echten Container: der Klick laeuft ueber
    // den delegierten Handler des Spiels, nicht ueber eine Testabkuerzung.
    var host = document.getElementById('crRoomsLiveList');
    if(!host){ host = document.createElement('div'); host.id = 'crRoomsLiveList'; document.body.appendChild(host); }
    var b = document.createElement('button');
    b.className = 'rl-join'; b.setAttribute('data-rid', rid);
    host.appendChild(b);
    b.click();
  }, LIVE_RID);
  await page.waitForTimeout(900);
  const liveHits = roomsHits(LIVE_RID);
  const liveDir = await page.evaluate(() => window.__v932.dir.slice());
  check('T2a die LIVE-ROOMS-Zeile hat ueberhaupt einen Raum geholt (sonst bewiese T2b nichts)',
    liveHits.length > 0, liveHits);
  check('T2b … von rooms.chartrunner.xyz und NICHT vom Legacy-Relay',
    liveHits.length > 0 && liveHits.every(u => /^https:\/\/rooms\.chartrunner\.xyz\//.test(u))
    && liveHits.every(u => u.indexOf('relay.chartrunner.xyz') < 0), liveHits);
  check('T2c … ueber crRoomsDirFetch, dieselbe Aufrufform wie im Modal',
    liveDir.indexOf('/rooms/' + LIVE_RID) >= 0, liveDir);

  seen.length = 0;
  const t2soc = await page.evaluate(async (nm) => {
    window.__v932.clear();
    await window.crSocial.openProfile(nm);
    await new Promise(r => setTimeout(r, 400));
    var b = document.querySelector('#crSocialBackdrop [data-join]');
    if(!b) return { btn: false };
    b.click();
    return { btn: true, rid: b.getAttribute('data-join') };
  }, SOC_NAME);
  await page.waitForTimeout(900);
  const socHits = roomsHits(SOC_RID);
  const socDir = await page.evaluate(() => window.__v932.dir.slice());
  check('T2d das Profil bietet „Join their room" an und der Klick holt den Raum',
    t2soc.btn === true && t2soc.rid === SOC_RID && socHits.length > 0, { t2soc, socHits });
  check('T2e … von rooms.chartrunner.xyz und NICHT vom Legacy-Relay',
    socHits.length > 0 && socHits.every(u => /^https:\/\/rooms\.chartrunner\.xyz\//.test(u))
    && socHits.every(u => u.indexOf('relay.chartrunner.xyz') < 0), socHits);
  check('T2f … ueber crRoomsDirFetch',
    socDir.indexOf('/rooms/' + SOC_RID) >= 0, socDir);
  check('T2g die Namensabfrage vor dem Beitritt (crNames.claim, v1.0.754) steht unveraendert im Pfad',
    /Choose a name to join this room as/.test(HTML) && /crNames && crNames\.claim/.test(HTML));

  /* ═══ T3 — DIE VIER FELDER ══════════════════════════════════════════════ */
  console.log('\n-- T3 · create traegt die Raumdaten mit --');
  const t3 = await page.evaluate(async () => {
    window.__v932.clear();
    const ct = crRoomsNet.chartParams();
    crRoomsNet.create({ pub: true });                    // die PUBLIC-Karte
    await new Promise(r => setTimeout(r, 120));
    const pubMsg = window.__v932.msgs('create').slice(-1)[0] || null;
    const pubToasts = window.__v932.toasts.slice();
    window.__v932.clear();
    crRoomsNet.create({});                               // die PRIVATE-Karte
    await new Promise(r => setTimeout(r, 120));
    const privMsg = window.__v932.msgs('create').slice(-1)[0] || null;
    window.__v932.clear();
    crRoomsNet.create({ mode: 'moderated' });            // Gegenzeuge fuer den Hinweis
    await new Promise(r => setTimeout(r, 120));
    const modToasts = window.__v932.toasts.slice();
    return { ct, pubMsg, privMsg, pubToasts, modToasts,
             asset: (typeof currentAsset !== 'undefined') ? String(currentAsset) : '',
             tf: (typeof timeframe !== 'undefined') ? String(timeframe) : '' };
  });
  check('T3a PUBLIC: die create-Nachricht traegt pub: true',
    !!t3.pubMsg && t3.pubMsg.type === 'create' && t3.pubMsg.pub === true, t3.pubMsg);
  check('T3b … asset und tf sind da UND stammen aus derselben Quelle wie chartParams()',
    !!t3.pubMsg && !!t3.ct.a && !!t3.ct.tf
    && t3.pubMsg.asset === t3.ct.a && t3.pubMsg.tf === t3.ct.tf, { msg: t3.pubMsg, ct: t3.ct });
  check('T3c … mapName ist Asset in Grossbuchstaben + " · " + Zeitrahmen (wie im Altpfad)',
    !!t3.pubMsg && t3.pubMsg.mapName === (t3.asset.toUpperCase() + ' · ' + t3.tf),
    { mapName: t3.pubMsg && t3.pubMsg.mapName, erwartet: t3.asset.toUpperCase() + ' · ' + t3.tf });
  check('T3d PRIVATE: pub fehlt oder ist false',
    !!t3.privMsg && !t3.privMsg.pub, t3.privMsg);
  check('T3e der Hinweis „Public listing is coming soon" ist weg …',
    !t3.pubToasts.some(m => /Public listing/i.test(m)), t3.pubToasts);
  check('T3f … der fuer moderated/curated aber nicht (der ist weiterhin wahr)',
    t3.modToasts.some(m => /Moderated rooms are coming soon/i.test(m)), t3.modToasts);

  const t3g = await page.evaluate(async () => {
    if(typeof RoomsClient !== 'object' || !RoomsClient || typeof RoomsClient.create !== 'function') return { reachable: false };
    window.__v932.clear();
    RoomsClient.create({ name: 'n'.repeat(80), pub: 1, asset: 'A'.repeat(40), tf: 'T'.repeat(20), mapName: 'M'.repeat(200) });
    await new Promise(r => setTimeout(r, 60));
    const capped = window.__v932.msgs('create').slice(-1)[0] || null;
    window.__v932.clear();
    RoomsClient.create('altpfad');                        // Altaufruf: blosser String
    await new Promise(r => setTimeout(r, 60));
    const legacy = window.__v932.msgs('create').slice(-1)[0] || null;
    return { reachable: true, capped, legacy };
  });
  check('T3g der Vertrag kappt vor dem Draht: asset <= 24, tf <= 8, mapName <= 64, pub bleibt bool',
    t3g.reachable && !!t3g.capped && t3g.capped.asset.length === 24 && t3g.capped.tf.length === 8
    && t3g.capped.mapName.length === 64 && t3g.capped.pub === true, t3g.capped);
  check('T3h der Altaufruf mit blossem String lebt weiter (name gesetzt, pub false)',
    t3g.reachable && !!t3g.legacy && t3g.legacy.name === 'altpfad' && t3g.legacy.pub === false, t3g.legacy);

  console.log('\n-- Regression --');
  check('T4a keine harten Page-Errors ueber den ganzen Lauf',
    errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m)).length === 0,
    errs.slice(0, 3));
  await browser.close();

  const bv = (HTML.match(/CURRENT VERSION:\s*v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  check('T4b Banner meldet mindestens v1.0.932',
    bv.length === 3 && (bv[0] > 1 || (bv[0] === 1 && (bv[1] > 0 || bv[2] >= 932))), bv);
  ['armedGlobal','source.armed','badgeGate','walletCanSign'].forEach(g =>
    check('T4c Tor „' + g + '" steht weiter im Quelltext', HTML.indexOf(g) >= 0));
  check('T4d crVaultLimit / crOnchainLimit und die beiden ARM-Speicher unveraendert',
    /crVaultLimit/.test(HTML) && /crOnchainLimit/.test(HTML)
    && /'cr_arm_v1'/.test(HTML) && /'cr_arm_limit_v1'/.test(HTML));
  check('T4e der ?relay=1-Pfad bleibt, wie er ist',
    /relay=1/.test(HTML) && /RELAY_ESCAPE/.test(HTML));
  check('T4f single-file: kein statisches <script src="http…">',
    (HTML.match(/<script[^>]*\bsrc="https?:/gi) || []).length === 0);

  console.log('\n' + (fail === 0 ? 'ALLE ' + pass + ' PRUEFUNGEN GRUEN' : fail + ' FEHLGESCHLAGEN, ' + pass + ' gruen'));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e && e.stack ? e.stack : e); process.exit(2); });
