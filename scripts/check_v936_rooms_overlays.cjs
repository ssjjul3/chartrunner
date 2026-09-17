/* Smoke-Verifikation v1.0.936 — ROOMS OVERLAY-SYNC · TEIL 2 · CLIENT.
 *
 * GEMESSEN WIRD IM ECHTEN CHROMIUM GEGEN DIE DATEI, an den zwei Stellen, an
 * denen dieser Patch die Aussenwelt beruehrt:
 *
 *   · DER DRAHT — ein WebSocket-Doppel ersetzt window.WebSocket, bevor die
 *     Seite laedt, und schreibt JEDEN gesendeten Rahmen mit. Geprueft wird
 *     also die `overlay_set`-NACHRICHT, nicht ein Aufruf. Ein Spion auf eine
 *     interne Funktion bewiese nur, dass jemand sie ruft; der Server sieht
 *     das JSON, und das JSON ist der Vertrag mit Server v1.4.0:
 *         { type:'overlay_set', id, k, a:[{t,p}], cfg, asset, tf }
 *         { type:'overlay_del', id }
 *     Die Gegenrichtung (`created`/`joined`/`overlay`/`overlay_gone`) wird
 *     ueber dasselbe Doppel eingespielt.
 *
 *   · DAS BILD — `crRoomsNet.render(ctx, W, H)` wird mit einem PROTOKOLLIERENDEN
 *     2D-Kontext aufgerufen. Der Kontext-Riegel und der Schalter sind Aussagen
 *     darueber, was GEZEICHNET wird; sie lassen sich nur daran messen, ob
 *     gezeichnet wurde. Ein Test, der stattdessen eine Variable abfragt,
 *     pruefte die Buchhaltung und nicht das Bild.
 *
 * Jede Pruefung MUSS ROT werden koennen (CLAUDE.md · ROT/CRASH/GRUEN):
 *
 *  T1  Die Faehigkeit wird GEMESSEN: `created` ohne `overlays`-Liste ->
 *      overlaysLive() false, es geht NICHTS raus, und es wird EINMAL gesagt.
 *      Mit `overlays: []` -> true.
 *  T2  Trendlinie: die Nachricht traegt k, zwei Anker mit t und p, KEINE
 *      Bildschirmpunkte, und asset/tf aus DERSELBEN Quelle wie chartParams().
 *  T3  Fib-Extension: die STUFEN und die Richtung reisen mit (nicht nur die
 *      zwei Anker — das war der Befund an v1.0.935).
 *  T4  VWAP: genau EIN Anker, die Baender reisen mit, `source` NICHT.
 *  T5  Aendern schickt neu, Unveraendertes schickt NICHTS (Signaturvergleich).
 *  T6  Verschwinden aus der Liste -> overlay_del mit derselben id.
 *  T7  Kontext-Riegel: gleicher Chart -> gezeichnet; anderer Token ODER
 *      anderer Zeitrahmen -> NICHT gezeichnet, stattdessen der Hinweis mit
 *      Token und Zeitrahmen. Das EIGENE aus dem Rundruf wird nicht doppelt
 *      gezeichnet.
 *  T8  Schalter: aus -> kein fremdes Overlay mehr, nur die Zeile; an -> zurueck.
 *  T9  Fremdes ist nicht bearbeitbar: es landet in KEINER der drei Spiel-Listen,
 *      und der Client loescht es nie (kein overlay_del auf eine fremde id).
 *  T10 EIN Weg je Objekt: echoDraw laesst trendline/fibExt/avwap aus, solange
 *      der Server sie traegt — die uebrigen Werkzeuge gehen weiter als `dw`.
 *  T11 Ausserhalb eines Raums geht nichts raus.
 *  T13 Der Schalter steht im Werkzeugmenue, nennt den Stand, schaltet um und
 *      laesst das Menue offen — und ausserhalb eines Raums gibt es ihn nicht.
 *  T12 Die fremde Fib-Extension kommt als Stufen an und der fremde VWAP als
 *      Kurve — nicht als Linie und nicht als Raute. Das war der Befund an
 *      v1.0.935, und ohne diesen Abschnitt bliebe er auf der Empfangsseite
 *      ungeprueft.
 *
 * GEGENPROBE — GEMESSEN, nicht behauptet. Jede Mutation wurde einzeln in
 * ChartRunner_Prototype.html eingebaut, diese Suite lief, danach wurde der
 * Quelltext wiederhergestellt. Ergebnis: 29x ROT, 0 GRUEN, 0 CRASH. Der
 * unveraenderte Quelltext ist gruen — die Messung faellt nicht von allein.
 *
 *   M1 _ovSeed misst die Faehigkeit nicht mehr (immer true)
 *       ROT (3): T1a ohne overlays-Liste im created meldet der Client die Faehigkeit als NICHT vorhanden | T1b...
 *   M2 die ehrliche Meldung bei fehlender Faehigkeit faellt weg
 *       ROT (1): T1c … sagt es aber EINMAL sichtbar (nicht null, nicht zehnmal)
 *   M3 gesendet wird trotz fehlender Faehigkeit
 *       ROT (2): T1b … und schickt dann auch nichts (keine stille Behauptung) | T1c … sagt es aber EINMAL sich...
 *   M4 die Anker reisen wieder als Bildschirm-/Indexmass (x,y statt t,p)
 *       ROT (1): T2f … und KEINE Bildschirmpunkte (kein x, kein y am Anker)
 *   M5 der Zeitanker faellt weg (wieder ein Kerzen-Indexmass)
 *       ROT (1): T2e … die Zeit liegt IN der Serie (ein Kerzen-Index waere eine viel kleinere Zahl)
 *   M6 die Stufen der Fib-Extension reisen nicht mehr mit (der v935-Befund)
 *       ROT (2): T3b ihre STUFEN reisen mit — das war der Befund an v1.0.935 | T3c abgewaehlte Stufen reisen N...
 *   M7 auch ABGEWAEHLTE Stufen reisen mit
 *       ROT (2): T3b ihre STUFEN reisen mit — das war der Befund an v1.0.935 | T3c abgewaehlte Stufen reisen N...
 *   M8 die Richtung der Fib-Extension faellt weg
 *       ROT (1): T3d ihre Richtung reist mit
 *   M9 der VWAP schickt die ganze Dialog-Einstellung (source, bandsCalc, priceLabel)
 *       ROT (2): T4e `source` reist NICHT mit — computeVwapPoly rechnet auf beiden Seiten hlc3, egal was dort ...
 *   M10 der VWAP schickt zwei Anker statt einem
 *       ROT (1): T4b mit GENAU EINEM Anker — dem Ankerzeitpunkt
 *   M11 asset/tf kommen nicht mehr aus chartParams-Quelle
 *       ROT (1): T2g asset und tf kommen aus DERSELBEN Quelle wie chartParams()
 *   M12 der Signaturvergleich faellt weg (Dauerlast statt Aenderung)
 *       ROT (2): T5a ohne Aenderung geht NICHTS raus — drei Objekte mal 5 Hz waeren sonst Dauerlast | T5b eine...
 *   M13 was aus der Liste faellt, wird nicht geloescht
 *       ROT (1): T6a was aus der Liste faellt, wird beim Server geloescht
 *   M14 die id traegt ihre Liste nicht mehr im Praefix (tl:/fx:/vw: kollidieren)
 *       ROT (4): T2h die id traegt ihre Liste im Praefix (tl:), sonst kollidiert sie mit vw:/fx: | T5b eine ve...
 *   M15 der KONTEXT-RIEGEL ist ausgebaut (fremde Linie ueber eigene, andere Kerzen)
 *       ROT (4): T7c das auf einem ANDEREN Chart wird NICHT gezeichnet | T7d … stattdessen steht da ein Hinwei...
 *   M16 der Riegel prueft nur das Token, nicht den Zeitrahmen
 *       ROT (2): T7e gleicher Token, ANDERER Zeitrahmen wird ebenso wenig gezeichnet — der Riegel prueft beide...
 *   M17 der Hinweis auf den anderen Chart faellt weg (stilles Weglassen)
 *       ROT (2): T7d … stattdessen steht da ein Hinweis, der Token UND Zeitrahmen nennt | T7f … und auch dafue...
 *   M18 der Hinweis nennt den Zeitrahmen nicht
 *       ROT (2): T7d … stattdessen steht da ein Hinweis, der Token UND Zeitrahmen nennt | T7f … und auch dafue...
 *   M19 fremde Overlays tragen den Namen ihres Urhebers nicht mehr
 *       ROT (2): T7b das auf DEM GLEICHEN Chart wird gezeichnet — mit dem Namen seines Urhebers | T8d wieder a...
 *   M20 der Schalter wirkt nicht (fremde Overlays bleiben immer an)
 *       ROT (3): T8a aus: kein fremdes Overlay mehr | T8b aus: auch der Hinweis auf andere Charts ist weg — da...
 *   M21 aus heisst spurlos (es steht nicht da, DASS etwas ausgeblendet ist)
 *       ROT (1): T8c aus: aber es steht da, DASS etwas ausgeblendet ist (nicht spurlos)
 *   M22 overlay_gone wird ignoriert (die Linie bleibt stehen, obwohl der Server sie nahm)
 *       ROT (1): T9e der Server sagt "weg" — dann ist es weg
 *   M23 der Schluessel traegt die Herkunft nicht (zwei Spieler ueberschreiben sich)
 *       ROT (1): T9e der Server sagt "weg" — dann ist es weg
 *   M24 der Raumwechsel raeumt die fremden Overlays nicht mehr weg
 *       ROT (1): T11b die fremden Overlays gehen mit dem Raum
 *   M25 echoDraw schickt die drei Arten WEITER als dw (zweiter Weg fuer dasselbe Objekt)
 *       ROT (3): T10a trendline geht NICHT mehr als dw — sie hat ihren eigenen Weg | T10b fibExt ebenso | T10c...
 *   M26 echoDraw laesst ALLES aus (auch die uebrigen ~50 Werkzeuge verlieren ihren Weg)
 *       ROT (1): T10d die uebrigen ~50 Werkzeuge gehen weiter als dw (hier: rect)
 *   M27 die Abgleichschleife laeuft nicht (nichts wird je gesendet)
 *       ROT (22): T1c … sagt es aber EINMAL sichtbar (nicht null, nicht zehnmal) | T2a eine Trendlinie geht als...
 *   M28 render() haengt wieder an ghosts.size (der Nachzuegler sieht nichts)
 *       ROT (5): T7b das auf DEM GLEICHEN Chart wird gezeichnet — mit dem Namen seines Urhebers | T7d … stattd...
 *   M29 ein fremdes Overlay wird wie ein eigenes gezeichnet (kein owner-Filter)
 *       ROT (1): T7g das EIGENE Overlay aus dem Rundruf wird NICHT ein zweites Mal gezeichnet
 *
 * Drei Zeilen waren beim ERSTEN Lauf zu schwach und sind geschaerft worden
 * (M4, M16, M29): die Zusage "der Draht traegt keine Bildschirmpunkte" hielten
 * zwei Schichten unabhaengig voneinander, sodass keine einzelne Mutation sie
 * rot machen konnte — die zweite ist deshalb aus RoomsClient.overlaySet
 * entfernt worden; der Riegel wurde nur an einem Fall gemessen, der sich in
 * Token UND Zeitrahmen unterschied; und der owner-Filter (das eigene Overlay
 * kommt im Rundruf zurueck) war ueberhaupt nicht geprueft.
 *
 * Lauf:  npm i playwright acorn --no-save && node scripts/check_v936_rooms_overlays.cjs
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const FILE = path.join(__dirname, '..', 'ChartRunner_Prototype.html');

let pass = 0, fail = 0;
function check(label, cond, detail){
  if(cond){ pass++; console.log('  ok    ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 400))); }
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

(async () => {
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));

  await page.route('**://**', async route => {
    const url = route.request().url();
    if(url.startsWith('file:')) return route.continue();
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if(/\/rooms\/[^/?]+/.test(url)) return J({});
    if(/\/rooms(\?|$)/.test(url))   return J([]);
    if(/\/v1\/ohlc\//.test(url))    return J({ ok: true, candles: [] });
    if(/dexscreener/.test(url))     return J({ pairs: [] });
    return J({});
  });

  await page.addInitScript(() => {
    window.__v936 = { sent: [], sockets: 0, toasts: [] };
    function FakeWS(url){
      this.url = String(url); this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      window.__v936.sockets++; window.__v936._last = this;
      var self = this;
      setTimeout(function(){ if(self.readyState === 0){ self.readyState = 1; try { if(self.onopen) self.onopen({}); } catch(_){} } }, 10);
    }
    FakeWS.prototype.send = function(raw){ try { window.__v936.sent.push(String(raw)); } catch(_){} };
    FakeWS.prototype.close = function(){ if(this.readyState === 3) return; this.readyState = 3; try { if(this.onclose) this.onclose({}); } catch(_){} };
    FakeWS.CONNECTING = 0; FakeWS.OPEN = 1; FakeWS.CLOSING = 2; FakeWS.CLOSED = 3;
    window.WebSocket = FakeWS;
    window.__v936.emit = function(o){
      var s = window.__v936._last;
      if(!s || !s.onmessage) return false;
      s.onmessage({ data: JSON.stringify(o) });
      return true;
    };
    window.__v936.msgs = function(t){
      return window.__v936.sent.map(function(r){ try { return JSON.parse(r); } catch(_){ return null; } })
        .filter(function(m){ return m && (!t || m.type === t); });
    };
    window.__v936.clear = function(){ window.__v936.sent.length = 0; window.__v936.toasts.length = 0; };

    /* Der protokollierende 2D-Kontext. Er ZEICHNET nichts — er schreibt auf,
     * was gezeichnet WORDEN WAERE. Fuer die Aussagen dieses Patches reicht das
     * genau: "gezeichnet" heisst hier stroke()/fill()/fillText() mit den
     * Koordinaten, die der Aufrufer gesetzt hat. */
    window.__v936.ctx = function(){
      var log = { strokes: 0, fills: 0, texts: [], dashes: [], colors: [] };
      var c = {
        canvas: { width: 1280, height: 900 },
        save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){},
        arc(){}, rect(){}, fillRect(){}, strokeRect(){}, clip(){}, translate(){}, scale(){},
        setLineDash(d){ log.dashes.push((d || []).join(',')); },
        stroke(){ log.strokes++; log.colors.push(String(c.strokeStyle)); },
        fill(){ log.fills++; log.colors.push(String(c.fillStyle)); },
        fillText(t){ log.texts.push(String(t)); },
        measureText(){ return { width: 10 }; },
        globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1, font: '',
        lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0, shadowColor: '',
        _log: log,
      };
      return c;
    };
    window.prompt = function(){ return null; };
  });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    var t = window.toast;
    window.toast = function(m){ try { window.__v936.toasts.push(String(m)); } catch(_){} try { return t.apply(this, arguments); } catch(_){} };
  });

  /* Eine echte Kerzenserie. Ohne sie liefert tFromWX/wxFromT nichts Brauchbares,
   * und JEDE Zeile unten waere gruen aus dem falschen Grund: nicht weil der
   * Riegel greift, sondern weil gar nichts gezeichnet werden kann. */
  const seeded = await page.evaluate(() => {
    var t0 = 1750000000000, dur = 900000;
    candles.length = 0;
    for(var i=0;i<200;i++){
      var base = 100 + Math.sin(i / 7) * 5;
      candles.push({ t: t0 + i * dur, o: base, h: base + 2, l: base - 2, c: base + 0.5, v: 1000 + i });
    }
    /* Und eine brauchbare Projektion. Ohne sie steht die Kamera auf ihrem
     * Startwert: priceToY(99) ergibt dann rund 28.000, sX(0) rund -8.400 —
     * alles ausserhalb des Bildes. Die Zeilen unten pruefen, ob GEZEICHNET
     * wird; mit einer Projektion, die nichts ins Bild bringt, waeren sie rot
     * aus dem falschen Grund (und die Cull-Zeilen des Zeichners waeren die
     * einzigen, die je etwas taeten). */
    perspective = 'linear';
    midPrice = 100; priceScale = 20;
    camera.wx = 0; camera.zoomX = 1; camera.panX = 20;
    camera.zoomY = 1; camera.panY = 0;
    return { n: candles.length, step: STEP, t0: candles[0].t, tEnd: candles[candles.length-1].t,
             W: W, H: H, y99: priceToY(99), x0: sX(0) };
  });

  console.log('\n-- Boot --');
  const hard0 = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors', hard0.length === 0, hard0.slice(0, 3));
  check('crRoomsNet ist der aktive Stack (ohne ?relay=1)',
    await page.evaluate(() => !!(window.crRoomsNet && crRoomsNet.enabled())));
  check('das Draht-Doppel steht (sonst misst nichts von unten etwas)',
    await page.evaluate(() => typeof window.__v936 === 'object' && Array.isArray(window.__v936.sent)));
  check('eine Kerzenserie liegt (sonst waeren die Zeichen-Zeilen gruen aus dem falschen Grund)',
    seeded.n === 200 && seeded.step > 0, seeded);
  check('und die Projektion bringt sie ins Bild (sonst zeichnet der Cull alles weg)',
    seeded.y99 > 0 && seeded.y99 < seeded.H && seeded.x0 > -50, seeded);

  /* ═══ T1 — DIE FAEHIGKEIT WIRD GEMESSEN, NICHT GERATEN ══════════════════ */
  console.log('\n-- T1 · Faehigkeit --');
  const t1 = await page.evaluate(async () => {
    window.__v936.clear();
    crRoomsNet.create({});
    await new Promise(r => setTimeout(r, 120));
    /* Ein Server OHNE die Faehigkeit: created ohne overlays-Liste. */
    window.__v936.emit({ type:'created', room:'V936A', playerId:'me1' });
    var live = crRoomsNet.overlaysLive();
    game.visualTrendlines.length = 0;
    game.visualTrendlines.push({ id: 1, points: [{ wx: 10*STEP, py: 101 }, { wx: 40*STEP, py: 106 }] });
    await new Promise(r => setTimeout(r, 500));
    var sets = window.__v936.msgs('overlay_set').length;
    var gesagt = window.__v936.toasts.filter(function(m){ return /teilt keine Werkzeuge/.test(m); }).length;
    crRoomsNet.leave();
    await new Promise(r => setTimeout(r, 60));
    return { live: live, sets: sets, gesagt: gesagt };
  });
  check('T1a ohne overlays-Liste im created meldet der Client die Faehigkeit als NICHT vorhanden',
    t1.live === false, t1);
  check('T1b … und schickt dann auch nichts (keine stille Behauptung)', t1.sets === 0, t1);
  check('T1c … sagt es aber EINMAL sichtbar (nicht null, nicht zehnmal)', t1.gesagt === 1, t1);

  const t1d = await page.evaluate(async () => {
    window.__v936.clear();
    crRoomsNet.create({});
    await new Promise(r => setTimeout(r, 120));
    window.__v936.emit({ type:'created', room:'V936B', playerId:'me1', overlays: [] });
    return { live: crRoomsNet.overlaysLive(), n: crRoomsNet.peerOverlayCount() };
  });
  check('T1d mit overlays: [] im created ist die Faehigkeit da — und der Raum leer',
    t1d.live === true && t1d.n === 0, t1d);

  /* ═══ T2 — TRENDLINIE: DIE KONFIGURATION, NICHT DAS BILD ════════════════ */
  console.log('\n-- T2 · Trendlinie --');
  const t2 = await page.evaluate(async () => {
    window.__v936.clear();
    game.visualTrendlines.length = 0;
    game.tvOverlays.length = 0;
    game.vwapAnchors.length = 0;
    game.visualTrendlines.push({ id: 7, points: [{ wx: 10*STEP, py: 101 }, { wx: 40*STEP, py: 106 }] });
    await new Promise(r => setTimeout(r, 500));
    var m = window.__v936.msgs('overlay_set').filter(function(x){ return x.k === 'trendline'; });
    return { n: m.length, msg: m[0] || null, chart: crRoomsNet.chartParams() };
  });
  check('T2a eine Trendlinie geht als overlay_set raus', t2.n >= 1 && !!t2.msg, t2);
  const m2 = t2.msg || {};
  check('T2b … mit der Art', m2.k === 'trendline', m2);
  check('T2c … mit ZWEI Ankern', Array.isArray(m2.a) && m2.a.length === 2, m2);
  check('T2d … und jeder Anker traegt ZEIT und PREIS',
    Array.isArray(m2.a) && m2.a.every(q => Number.isFinite(q.t) && Number.isFinite(q.p)), m2);
  check('T2e … die Zeit liegt IN der Serie (ein Kerzen-Index waere eine viel kleinere Zahl)',
    Array.isArray(m2.a) && m2.a.every(q => q.t >= seeded.t0 && q.t <= seeded.tEnd + 900000), { a: m2.a, t0: seeded.t0, tEnd: seeded.tEnd });
  check('T2f … und KEINE Bildschirmpunkte (kein x, kein y am Anker)',
    Array.isArray(m2.a) && m2.a.every(q => !('x' in q) && !('y' in q)), m2);
  check('T2g asset und tf kommen aus DERSELBEN Quelle wie chartParams()',
    m2.asset === t2.chart.a && m2.tf === t2.chart.tf, { msg: { asset: m2.asset, tf: m2.tf }, chart: t2.chart });
  check('T2h die id traegt ihre Liste im Praefix (tl:), sonst kollidiert sie mit vw:/fx:',
    m2.id === 'tl:7', m2);

  /* ═══ T3 — FIB-EXTENSION: DIE STUFEN REISEN MIT ═════════════════════════ */
  console.log('\n-- T3 · Fib-Extension --');
  const t3 = await page.evaluate(async () => {
    window.__v936.clear();
    game.tvOverlays.push({
      id: 3, kind: 'fibExt', wx1: 12*STEP, py1: 99, wx2: 30*STEP, py2: 107,
      levels: [{ lvl: 1, on: true }, { lvl: 1.272, on: true }, { lvl: 1.618, on: true },
               { lvl: 2.618, on: false }],
      extend: 'right', t: 0,
    });
    await new Promise(r => setTimeout(r, 500));
    var m = window.__v936.msgs('overlay_set').filter(function(x){ return x.k === 'fibExt'; });
    return { n: m.length, msg: m[0] || null };
  });
  const m3 = t3.msg || {};
  check('T3a die Fib-Extension geht als eigene Art raus (nicht als Linie)', t3.n >= 1 && m3.k === 'fibExt', t3);
  check('T3b ihre STUFEN reisen mit — das war der Befund an v1.0.935',
    !!m3.cfg && Array.isArray(m3.cfg.levels) && m3.cfg.levels.join(',') === '1,1.272,1.618', m3.cfg);
  check('T3c abgewaehlte Stufen reisen NICHT mit (2.618 stand auf off)',
    !!m3.cfg && Array.isArray(m3.cfg.levels) && m3.cfg.levels.indexOf(2.618) === -1, m3.cfg);
  check('T3d ihre Richtung reist mit', m3.cfg && m3.cfg.extend === 'right', m3.cfg);
  check('T3e und sie hat zwei Anker in Zeit und Preis',
    Array.isArray(m3.a) && m3.a.length === 2 && m3.a.every(q => Number.isFinite(q.t) && Number.isFinite(q.p)), m3);

  /* ═══ T4 — VWAP: EIN ANKER, KEINE KURVE, KEIN source ════════════════════ */
  console.log('\n-- T4 · VWAP --');
  const t4 = await page.evaluate(async () => {
    window.__v936.clear();
    game.vwapAnchors.push({
      id: 5, wx: 20*STEP, anchorIdx: 20, t: 0, poly: [{ wx: 1, py: 2 }],
      cfg: { bandsCalc: 'Standard', mult1: 10, mult2: 2, mult3: 3, band1: true, band2: false, band3: false, source: 'hl', priceLabel: true },
    });
    await new Promise(r => setTimeout(r, 500));
    var m = window.__v936.msgs('overlay_set').filter(function(x){ return x.k === 'avwap'; });
    return { n: m.length, msg: m[0] || null };
  });
  const m4 = t4.msg || {};
  check('T4a der VWAP geht als eigene Art raus', t4.n >= 1 && m4.k === 'avwap', t4);
  check('T4b mit GENAU EINEM Anker — dem Ankerzeitpunkt', Array.isArray(m4.a) && m4.a.length === 1, m4);
  check('T4c die KURVE reist nicht mit (kein poly, keine points)',
    !('poly' in m4) && !('points' in m4), m4);
  check('T4d die Baender reisen mit', m4.cfg && m4.cfg.mult1 === 10 && m4.cfg.band1 === true && m4.cfg.band2 === false, m4.cfg);
  check('T4e `source` reist NICHT mit — computeVwapPoly rechnet auf beiden Seiten hlc3, egal was dort steht',
    !!m4.cfg && !('source' in m4.cfg), m4.cfg);
  check('T4f und die Anzeige-Felder des Dialogs auch nicht (bandsCalc, priceLabel)',
    !!m4.cfg && !('bandsCalc' in m4.cfg) && !('priceLabel' in m4.cfg), m4.cfg);

  /* ═══ T5 — AENDERN SCHICKT NEU, UNVERAENDERTES SCHICKT NICHTS ═══════════ */
  console.log('\n-- T5 · Aendern --');
  const t5 = await page.evaluate(async () => {
    window.__v936.clear();
    await new Promise(r => setTimeout(r, 500));
    var ruhe = window.__v936.msgs('overlay_set').length;
    game.visualTrendlines[0].points[1].py = 111;
    await new Promise(r => setTimeout(r, 500));
    var m = window.__v936.msgs('overlay_set').filter(function(x){ return x.id === 'tl:7'; });
    return { ruhe: ruhe, n: m.length, letzt: m[m.length-1] || null };
  });
  check('T5a ohne Aenderung geht NICHTS raus — drei Objekte mal 5 Hz waeren sonst Dauerlast',
    t5.ruhe === 0, t5);
  check('T5b eine verschobene Ankerpreis schickt dasselbe id neu (anlegen und aendern ist EIN Typ)',
    t5.n === 1 && t5.letzt && t5.letzt.id === 'tl:7', t5);
  check('T5c … und zwar mit dem NEUEN Preis',
    !!t5.letzt && Math.abs(t5.letzt.a[1].p - 111) < 1e-9, t5.letzt);

  /* ═══ T6 — VERSCHWINDEN HEISST LOESCHEN ════════════════════════════════ */
  console.log('\n-- T6 · Loeschen --');
  const t6 = await page.evaluate(async () => {
    window.__v936.clear();
    game.visualTrendlines.length = 0;          // wie Entf, wie ein Treffer, wie ein Neustart
    await new Promise(r => setTimeout(r, 500));
    var d = window.__v936.msgs('overlay_del');
    return { n: d.length, ids: d.map(function(x){ return x.id; }) };
  });
  check('T6a was aus der Liste faellt, wird beim Server geloescht', t6.n === 1 && t6.ids[0] === 'tl:7', t6);

  const t6b = await page.evaluate(async () => {
    window.__v936.clear();
    await new Promise(r => setTimeout(r, 500));
    return { n: window.__v936.msgs('overlay_del').length };
  });
  check('T6b … und zwar genau einmal, nicht bei jedem Durchlauf erneut', t6b.n === 0, t6b);

  /* ═══ T7 — DER KONTEXT-RIEGEL ══════════════════════════════════════════ */
  console.log('\n-- T7 · Kontext-Riegel --');
  const t7 = await page.evaluate(async () => {
    /* Die eigenen Listen leer — ab hier wird ausschliesslich gemessen, was
     * VOM SERVER kommt. Mit eigenen Objekten darin wuerde T9a zaehlen, was
     * dieser Client selbst angelegt hat. */
    game.visualTrendlines.length = 0; game.tvOverlays.length = 0; game.vwapAnchors.length = 0;
    await new Promise(r => setTimeout(r, 400));
    window.__v936.clear();
    var chart = crRoomsNet.chartParams();
    var an = function(i, p){ return { t: candles[i].t, p: p }; };
    /* Ein Peer muss im Roster stehen? Nein — Overlays haengen nicht am Roster,
     * sie kommen vom Server. Genau das wird hier mitgemessen. */
    window.__v936.emit({ type:'overlay', ov: {
      id:'tl:1', k:'trendline', a:[an(10, 101), an(40, 106)], cfg:{},
      asset: chart.a, tf: chart.tf, owner:'peerA', name:'anna' } });
    window.__v936.emit({ type:'overlay', ov: {
      id:'tl:9', k:'trendline', a:[an(10, 101), an(40, 106)], cfg:{},
      asset:'EINANDERERTOKEN', tf:'99m', owner:'peerB', name:'bert' } });
    /* Gleicher Token, ANDERER Zeitrahmen. Ohne diese Zeile pruefte T7c nur,
     * ob der Riegel den Token ansieht — ein Riegel, der den Zeitrahmen
     * vergisst, waere gruen durchgegangen. Genau das ist bei der Gegenprobe
     * aufgefallen. */
    window.__v936.emit({ type:'overlay', ov: {
      id:'tl:8', k:'trendline', a:[an(10, 101), an(40, 106)], cfg:{},
      asset: chart.a, tf:'99m', owner:'peerC', name:'clara' } });
    /* Und das EIGENE: der Server rundfunkt an ALLE, den Absender
     * eingeschlossen. Es darf hier nicht gezeichnet werden — das eigene Bild
     * kommt aus den eigenen Listen, und ein zweites, gestricheltes Exemplar
     * mit dem eigenen Namen daneben waere genau das doppelte Zeichnen. */
    window.__v936.emit({ type:'overlay', ov: {
      id:'tl:5', k:'trendline', a:[an(12, 102), an(42, 107)], cfg:{},
      asset: chart.a, tf: chart.tf, owner: 'me1', name:'ichselbst' } });
    var c = window.__v936.ctx();
    crRoomsNet.render(c, W, H);
    return { n: crRoomsNet.peerOverlayCount(), texts: c._log.texts.slice(), strokes: c._log.strokes, chart: chart };
  });
  check('T7a die drei fremden Overlays liegen im Client (das eigene zaehlt nicht mit)', t7.n === 3, t7);
  check('T7b das auf DEM GLEICHEN Chart wird gezeichnet — mit dem Namen seines Urhebers',
    t7.texts.indexOf('anna') >= 0, t7.texts);
  check('T7c das auf einem ANDEREN Chart wird NICHT gezeichnet',
    t7.texts.indexOf('bert') === -1, t7.texts);
  check('T7d … stattdessen steht da ein Hinweis, der Token UND Zeitrahmen nennt',
    t7.texts.some(x => /bert/.test(x) && /EINANDERERTOKEN/.test(x) && /99m/.test(x)), t7.texts);
  check('T7e gleicher Token, ANDERER Zeitrahmen wird ebenso wenig gezeichnet — der Riegel prueft beides',
    t7.texts.indexOf('clara') === -1, t7.texts);
  check('T7f … und auch dafuer steht der Hinweis da',
    t7.texts.some(x => /clara/.test(x) && /99m/.test(x)), t7.texts);
  check('T7g das EIGENE Overlay aus dem Rundruf wird NICHT ein zweites Mal gezeichnet',
    t7.texts.indexOf('ichselbst') === -1, t7.texts);

  /* ═══ T8 — DER SCHALTER ════════════════════════════════════════════════ */
  console.log('\n-- T8 · Schalter --');
  const t8 = await page.evaluate(() => {
    crRoomsNet.showPeerOverlays(false);
    var aus = window.__v936.ctx(); crRoomsNet.render(aus, W, H);
    crRoomsNet.showPeerOverlays(true);
    var an = window.__v936.ctx(); crRoomsNet.render(an, W, H);
    return { ausTexts: aus._log.texts.slice(), anTexts: an._log.texts.slice(),
             stand: crRoomsNet.peerOverlaysShown() };
  });
  check('T8a aus: kein fremdes Overlay mehr', t8.ausTexts.indexOf('anna') === -1, t8.ausTexts);
  check('T8b aus: auch der Hinweis auf andere Charts ist weg — das eigene Bild ist zurueck',
    !t8.ausTexts.some(x => /EINANDERERTOKEN/.test(x)), t8.ausTexts);
  check('T8c aus: aber es steht da, DASS etwas ausgeblendet ist (nicht spurlos)',
    t8.ausTexts.some(x => /ausgeblendet/.test(x)), t8.ausTexts);
  check('T8d wieder an: alles zurueck', t8.anTexts.indexOf('anna') >= 0 && t8.stand === true, t8.anTexts);

  /* ═══ T9 — FREMDES IST NICHT BEARBEITBAR ═══════════════════════════════ */
  console.log('\n-- T9 · Fremdes gehoert nicht mir --');
  const t9 = await page.evaluate(async () => {
    window.__v936.clear();
    var listen = game.visualTrendlines.length + game.tvOverlays.length + game.vwapAnchors.length;
    await new Promise(r => setTimeout(r, 500));
    var del = window.__v936.msgs('overlay_del').map(function(x){ return x.id; });
    var set = window.__v936.msgs('overlay_set').map(function(x){ return x.id; });
    return { listen: listen, del: del, set: set, n: crRoomsNet.peerOverlayCount() };
  });
  check('T9a ein fremdes Overlay landet in KEINER der drei Spiel-Listen — es ist nicht anfassbar',
    t9.listen === 0, t9);
  check('T9b … und der Client loescht es nie (kein overlay_del auf eine fremde id)',
    t9.del.indexOf('tl:1') === -1 && t9.del.length === 0, t9);
  check('T9c … und schickt es nie als eigenes zurueck', t9.set.length === 0, t9);
  check('T9d … es bleibt aber liegen, solange der Server es haelt', t9.n === 3, t9);

  const t9e = await page.evaluate(() => {
    window.__v936.emit({ type:'overlay_gone', owner:'peerA', ids:['tl:1'] });
    var c = window.__v936.ctx(); crRoomsNet.render(c, W, H);
    return { n: crRoomsNet.peerOverlayCount(), texts: c._log.texts.slice() };
  });
  check('T9e der Server sagt "weg" — dann ist es weg', t9e.n === 2 && t9e.texts.indexOf('anna') === -1, t9e);

  /* ═══ T10 — EIN WEG JE OBJEKT ══════════════════════════════════════════ */
  console.log('\n-- T10 · ein Weg je Objekt --');
  const t10 = await page.evaluate(async () => {
    window.__v936.clear();
    crRoomsNet.echoDraw('trendline', [{ x: 10*STEP, y: 101 }, { x: 40*STEP, y: 106 }], 'tools');
    crRoomsNet.echoDraw('fibExt',    [{ x: 10*STEP, y: 101 }, { x: 40*STEP, y: 106 }], 'tools');
    crRoomsNet.echoDraw('avwap',     [{ x: 20*STEP, y: 103 }], 'tools');
    crRoomsNet.echoDraw('rect',      [{ x: 10*STEP, y: 101 }, { x: 40*STEP, y: 106 }], 'tools');
    /* Die Pumpe laeuft nur im Lauf; hier wird der Auszug direkt gelesen. Das
     * ist dieselbe Liste, aus der sie `dw` fuellt. */
    if(typeof game !== 'undefined') game.running = true;
    await new Promise(r => setTimeout(r, 400));
    var st = window.__v936.msgs('state').filter(function(m){ return m.data && Array.isArray(m.data.dw); });
    var arten = [];
    st.forEach(function(m){ m.data.dw.forEach(function(e){ if(arten.indexOf(e.k) === -1) arten.push(e.k); }); });
    game.running = false;
    return { arten: arten };
  });
  check('T10a trendline geht NICHT mehr als dw — sie hat ihren eigenen Weg',
    t10.arten.indexOf('trendline') === -1, t10);
  check('T10b fibExt ebenso', t10.arten.indexOf('fibExt') === -1, t10);
  check('T10c avwap ebenso', t10.arten.indexOf('avwap') === -1, t10);
  check('T10d die uebrigen ~50 Werkzeuge gehen weiter als dw (hier: rect)',
    t10.arten.indexOf('rect') >= 0, t10);

  /* ═══ T11 — AUSSERHALB EINES RAUMS AENDERT SICH NICHTS ═════════════════ */
  console.log('\n-- T11 · ausserhalb des Raums --');
  const t11 = await page.evaluate(async () => {
    crRoomsNet.leave();
    await new Promise(r => setTimeout(r, 80));
    window.__v936.clear();
    game.visualTrendlines.push({ id: 99, points: [{ wx: 10*STEP, py: 101 }, { wx: 40*STEP, py: 106 }] });
    await new Promise(r => setTimeout(r, 500));
    return { sets: window.__v936.msgs('overlay_set').length,
             dels: window.__v936.msgs('overlay_del').length,
             peer: crRoomsNet.peerOverlayCount(),
             eigene: game.visualTrendlines.length };
  });
  check('T11a ausserhalb eines Raums geht nichts raus', t11.sets === 0 && t11.dels === 0, t11);
  check('T11b die fremden Overlays gehen mit dem Raum', t11.peer === 0, t11);
  check('T11c die EIGENEN Werkzeuge bleiben unangetastet — die Synchronisierung kam obendrauf',
    t11.eigene === 1, t11);

  /* ═══ T12 — DIE ANDEREN BEIDEN ARTEN WERDEN AUCH GEZEICHNET ════════════
   * T7 misst den Riegel an einer Trendlinie. Ohne diesen Abschnitt waere
   * "jeder Client zeichnet daraus selbst" fuer Fib-Extension und VWAP
   * ungeprueft — und eine Ausnahme in ihrem Zeichenpfad faellt still in das
   * try/catch, das den Rest des Bildes schuetzt. Genau so sieht ein Werkzeug
   * aus, das niemand vermisst. */
  console.log('\n-- T12 · Fib-Extension und VWAP beim Betrachter --');
  const t12 = await page.evaluate(async () => {
    crRoomsNet.leave();
    await new Promise(r => setTimeout(r, 80));
    window.__v936.clear();
    crRoomsNet.create({});
    await new Promise(r => setTimeout(r, 120));
    window.__v936.emit({ type:'created', room:'V936C', playerId:'me1', overlays: [] });
    game.visualTrendlines.length = 0; game.tvOverlays.length = 0; game.vwapAnchors.length = 0;
    const chart = crRoomsNet.chartParams();
    const an = (i, p) => ({ t: candles[i].t, p: p });

    window.__v936.emit({ type:'overlay', ov: {
      id:'fx:1', k:'fibExt', a:[an(10, 99), an(40, 107)],
      cfg:{ levels:[1, 1.272, 1.618], extend:'right' },
      asset: chart.a, tf: chart.tf, owner:'peerF', name:'fiona' } });
    const cf = window.__v936.ctx(); crRoomsNet.render(cf, W, H);

    window.__v936.emit({ type:'overlay_gone', owner:'peerF', ids:['fx:1'] });
    window.__v936.emit({ type:'overlay', ov: {
      id:'vw:1', k:'avwap', a:[an(20, 103)], cfg:{ mult1: 10, band1: true },
      asset: chart.a, tf: chart.tf, owner:'peerV', name:'viktor' } });
    const cv = window.__v936.ctx(); crRoomsNet.render(cv, W, H);

    return { fib: { strokes: cf._log.strokes, texts: cf._log.texts.slice() },
             vwap: { strokes: cv._log.strokes, fills: cv._log.fills, texts: cv._log.texts.slice() } };
  });
  check('T12a die fremde Fib-Extension wird gezeichnet, mit dem Namen ihres Urhebers',
    t12.fib.texts.indexOf('fiona') >= 0, t12.fib.texts);
  check('T12b … und zwar als Impulsbein PLUS drei Stufen, nicht als eine Linie',
    t12.fib.strokes >= 4, t12.fib);
  check('T12c … die Stufenbeschriftung steht dran',
    ['1','1.272','1.618'].every(x => t12.fib.texts.indexOf(x) >= 0), t12.fib.texts);
  check('T12d der fremde VWAP wird gezeichnet, mit dem Namen seines Urhebers',
    t12.vwap.texts.indexOf('viktor') >= 0, t12.vwap.texts);
  check('T12e … als KURVE (aus den eigenen Kerzen gerechnet), nicht als Raute',
    t12.vwap.strokes >= 1, t12.vwap);
  check('T12f … mit dem Ankerpunkt dazu', t12.vwap.fills >= 1, t12.vwap);

  /* ═══ T13 — DER SCHALTER IST DA, WO DIE WERKZEUGE SIND ═════════════════
   * T8 misst, dass der Schalter WIRKT. Dass ihn jemand ERREICHT, ist eine
   * andere Aussage: die Zeile wird in den Werkzeug-Pane gebaut, und ein
   * Ausnahmefehler dort faellt still in ein try/catch. Ein Schalter, den es
   * nur in der Konsole gibt, ist keiner. */
  console.log('\n-- T13 · der Schalter im Werkzeugmenue --');
  const t13 = await page.evaluate(() => {
    /* Ueber _laserSpawnEl, nicht ueber einen Style-Selektor: der Browser
     * normalisiert cssText ("z-index: 9999" mit Leerzeichen), und ein
     * Selektor, der daran vorbeigreift, faende nie etwas und saehe wie ein
     * Befund aus. */
    const zeile = () => {
      const el = (typeof _laserSpawnEl !== 'undefined') ? _laserSpawnEl : null;
      if(!el) return null;
      return [...el.querySelectorAll('button')].find(b => /Fremde Overlays anzeigen/.test(b.textContent || '')) || null;
    };
    openLaserSpawnMenu(100, 100, 10 * STEP, 101);
    const drin = zeile();
    const vorher = drin ? drin.textContent : null;
    if(drin) drin.click();
    const nachKlick = zeile();
    const nachher = nachKlick ? nachKlick.textContent : null;
    const stand = crRoomsNet.peerOverlaysShown();
    if(nachKlick) nachKlick.click();          // zurueck auf an
    closeLaserSpawnMenu();
    return { vorhanden: !!drin, vorher, nachher, stand, offenGeblieben: !!nachKlick };
  });
  check('T13a die Zeile steht im Werkzeugmenue (Hotkey 2), nicht in einem Einstellungsfenster',
    t13.vorhanden === true, t13);
  check('T13b sie nennt den Stand: wie viele fremde Overlays gerade an sind',
    /1 an/.test(t13.vorher || ''), t13);
  check('T13c ein Klick schaltet um — und das Menue bleibt offen, der Schalter ist zum Vergleichen da',
    t13.stand === false && t13.offenGeblieben === true && /1 aus/.test(t13.nachher || ''), t13);

  const t13d = await page.evaluate(async () => {
    crRoomsNet.leave();
    await new Promise(r => setTimeout(r, 80));
    openLaserSpawnMenu(100, 100, 10 * STEP, 101);
    const el = (typeof _laserSpawnEl !== 'undefined') ? _laserSpawnEl : null;
    const gebaut = !!el;
    const drin = el ? [...el.querySelectorAll('button')].some(b => /Fremde Overlays anzeigen/.test(b.textContent || '')) : false;
    closeLaserSpawnMenu();
    return { drin, gebaut };
  });
  check('T13d das Menue baut sich auch ausserhalb eines Raums (sonst pruefte T13e nichts)',
    t13d.gebaut === true, t13d);
  check('T13e … aber die Zeile fehlt dort — eine tote Zeile waere eine Luege in Ruhe',
    t13d.drin === false, t13d);

  console.log('\n-- Ende --');
  const hard = errs.filter(m => !/Failed to fetch|NetworkError|ERR_FAILED|net::/i.test(m));
  check('keine harten Page-Errors im ganzen Lauf', hard.length === 0, hard.slice(0, 3));

  await browser.close();
  console.log('\n================================');
  console.log('  v936 overlays: ' + pass + ' ok · ' + fail + ' FAIL');
  console.log('================================');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
