# ChartRunner UI v2 — Übergabe-Dokumentation

Stand: 24.09.2026 · Version im Code: **v1.0.951** · Branch: **`ui-v2`** (Merge-Commit `71e5e2f`, PR #233)

Dieses Dokument ist für einen Entwickler geschrieben, der mit seinem eigenen
Claude-Agenten an der neuen Oberfläche weiterarbeitet. Es ist so aufgebaut,
dass der Agent es als Einstieg lesen kann. Ganz unten steht ein fertiger
Start-Prompt dafür.

> **Zuerst lesen:** `CLAUDE.md` im Repo-Wurzelverzeichnis. Die Regeln dort
> gelten auch für v2 und haben Vorrang vor diesem Dokument.
> Was hier über den Code steht, ist eine **Beschreibung**, keine Messung. Im
> Zweifel gilt der Code und der Browsertest.

---

## 1 · Worum es geht

UI v2 ist eine neue Oberfläche für das bestehende Spiel und Trading-Tool
(`ChartRunner_Prototype.html`) im 80s-Stil. Vorbild war das Layout von
Axiom und pump.fun. Farben: das bestehende ChartRunner-Grün/Pink/Cyan auf
dunklem Blau.

Grundgedanke: **eine Hülle, kein Umbau.**
- v2 baut kein Fenster, keinen Handelspfad und keine Order-Logik nach.
- Es ordnet das Vorhandene neu an: Toolbar, Tabs, Module und 80s-Stil.
- Geöffnet wird ausschließlich über die vorhandenen Wege.
- Gast-Sperre, Umleitungen und Refresh greifen dadurch unverändert.

Was man heute sieht (nur Desktop, ab 900 px Breite):

| Bereich | Was es ist |
|---|---|
| **Kopfleiste** (48 px) | Marke + ein Satz, was ChartRunner ist („200ms-Test“), Connect, Control Center, „? Tour“ |
| **Tab-Leiste** (30 px, oben links) | Jedes offene Modul, jedes offene Fenster und der Spiel-Chart als Tab. Klick holt nach vorn, ein zweiter Klick minimiert (wie eine Taskleiste). |
| **Toolbar links** (64 px) | Home + genau **5 Funktionen**: Swap/DEX, Trade, Launch, Game/Play, Bots. Jede hat ein Flyout mit Unterpunkten. Unten stehen Docs, Settings und „Layout zurücksetzen“. |
| **Desktop** | Module (eigene Kacheln von v2) und die vorhandenen OS-Fenster, frei verschiebbar und in der Größe änderbar, mit Mac-Ampel (rot/gelb/grün) |
| **Module** | Top Coins, Live-Feed, Pulse, Arcade, „Phase 2“-Platzhalter, **Chart-Fenster** (beliebig viele), **Solanatracker/CEXtracker** als eigene Fenster |
| **Führung** | Hover-Erklärungen an allen Bedienelementen, Willkommen beim ersten Besuch, Tour in 9 Schritten (ohne COACH) |

Das Telefon-Layout (< 900 px) bleibt **unverändert** das alte.

---

## 2 · Wo was liegt

| Was | Wo |
|---|---|
| Der gesamte v2-Code | `ChartRunner_Prototype.html`, **ein** IIFE `crUiV2` im **letzten** Skriptblock, zwischen den Markern `/* ═══ v1.0.947–949 · BEGIN — UI v2 …` und `/* ═══ v1.0.947–949 · END — UI v2 ═══ */` (heute etwa Zeile 115 799–117 863). Suchen per Marker, nicht per Zeilennummer. |
| Versions-Banner | Kopf der HTML-Datei (`CURRENT VERSION`, `LAST UPDATED`, `PREV …`). Jede Version beschreibt dort Auftrag, Umsetzung, Test-Funde und Rollback. |
| Browsertests | `scripts/check_v949_ui_v2_toolbar_browser.cjs`, `scripts/check_v950_ui_v2_guide_browser.cjs`, `scripts/check_v951_ui_v2_charts_browser.cjs` |
| Ursprünglicher Mockup | `docs/mockups/ui-v2-tabbar.html` (statisch, ohne Funktion) |
| Vorschau-Deploy | `.github/workflows/preview-ui-v2.yml` (auf `ui-v2`) + der Schritt „Stage ui-v2 preview at /play-v2/“ in `.github/workflows/pages.yml` (auf `main`) |
| Live-Vorschau | https://chartrunner.xyz/play-v2/ (immer der Stand von `ui-v2`) |
| Alte Oberfläche | https://chartrunner.xyz/play/ (Stand von `main`, **nicht** betroffen) |

### Einschalten

- `?ui=v2` an die URL hängen → v2 an, gemerkt in `localStorage.cr_ui_v2 = '1'`.
- `?ui=v1` → wieder aus.
- Auf `/play-v2/` ist v2 immer an. Das kommt vom Deploy-Umbau, siehe §3.
- Ohne Schalter läuft vom v2-Block **nur die Abfrage**, sonst nichts.

---

## 3 · Arbeitsablauf und Deploy

```
eigener Branch  →  PR gegen ui-v2 (NICHT gegen main)  →  Merge  →  preview-ui-v2.yml
                →  stößt pages.yml auf main an  →  pages.yml holt die HTML aus ui-v2
                →  /play-v2/ ist ~1 Minute später aktuell
```

- **PRs gehen gegen `ui-v2`**, nie gegen `main`. v2 soll das Original nicht
  berühren, bis es bewusst übernommen wird.
- Julian (Owner) arbeitet vom Telefon aus. Jeder PR braucht deshalb:
  1. was geändert wurde und warum,
  2. exakte Prüfschritte mit klickbarer URL
     (`https://chartrunner.xyz/play-v2/?_=<nonce>` gegen den Cache).
- **Ein gemergter PR ist fertig.** Nie auf einem gemergten Branch weiterbauen:
  Die Commits landen sonst nirgends, und nichts schlägt an. Folgearbeit geht
  auf einen neuen Branch von aktuellem `ui-v2` mit einem neuen PR:
  ```
  git fetch origin ui-v2 && git checkout -B <dein-branch> origin/ui-v2
  ```
  Bisher lief alles über den Branch `claude/gallant-meitner-zkxpvm`. Der ist
  mit #233 gemergt. **Nicht weiterverwenden.**
- **Wie `/play-v2/` entsteht:**
  - `pages.yml` (auf `main`) holt `ChartRunner_Prototype.html` aus `ui-v2`.
  - Es ersetzt per `sed` die Zeile `  if(!_want()) return;` durch
    `  if(!_want() && location.pathname.indexOf('/play-v2') !== 0) return;`.
  - Steht die Zeile **nicht genau einmal wörtlich** im Code, wird `/play-v2/`
    übersprungen. Das ist nur eine Warnung, der Kern-Deploy läuft weiter.
  - **→ Diese Zeile nie umformatieren.** Test C9xc prüft sie.
- `ui-v2` bekommt keinen eigenen Pages-Deploy. Ein Push dorthin würde sonst die
  ganze Seite aus `ui-v2` ausrollen.
- **Stand der Branches (24.09.):**
  - `ui-v2` ist 12 Commits vor `main`.
  - `main` ist 2 Commits vor `ui-v2`.
  - Vor einer späteren Übernahme nach `main` also erst `main` in `ui-v2`
    mergen.

---

## 4 · Versionsgeschichte v2

| Version | PR (gegen ui-v2) | Inhalt |
|---|---|---|
| v1.0.947 | — | Erste v2: Rubrikenleiste mit 5 Einträgen, Rubriken als Vollbild-Seiten, Tabs, Trading-Home (Top Coins, Live-Feed, Arcade), Pulse, **Kaufweg in 3 Klicks** |
| v1.0.948 | — | Vollbild-Seiten wieder raus, Desktop bleibt. Top Coins/Live/Pulse/Arcade als **Kacheln** (verschieben, Größe, 8-px-Raster), Tab-Leiste |
| v1.0.949 | — | **Toolbar** mit 5 Funktionen + Unterpunkten, Tools auf den Desktop **ziehen**, Mac-Ampel in jedem Fenster, Griff zum Skalieren, Phase-2-Modul, `preview-ui-v2.yml` |
| v1.0.950 | #232 | **Führung ohne COACH:** 200ms-Satz, Hover-Erklärungen (`#cr2Tip`), Willkommen, eigene Tour |
| v1.0.951 | #233 | **Chart-Fenster beliebig oft**, Solanatracker/CEXtracker als eigene Fenster, „▶ Runner“ öffnet das Spiel, Chart-Tab folgt dem Coin, **eine Stapelordnung** |

Die PR-Nummern von 947–949 stehen in der Merge-Historie von `ui-v2`
(`git log --merges origin/ui-v2`). Rollback: jeweils die Vorversion oder `?ui=v1`.

---

## 5 · Architektur des Blocks `crUiV2`

Alles liegt in einem einzigen IIFE. Es gibt keine globalen Funktionen außer
`window.crUiV2` (API, siehe §5.12). Das CSS wird per JS als
`<style id="cr-ui-v2">` eingefügt. Alle Regeln hängen an `body.cr2` und greifen
ohne v2 also nicht.

### 5.1 Start

```
_want()  →  API anlegen  →  if(!_want()) return;   ← wörtlich, siehe §3
         →  Breite < 900? → API.reason='narrow', return
         →  Konstanten, Registry, Funktionen …
         →  boot() bei DOMContentLoaded
```

`boot()`:
1. CSS einfügen und `body.cr2` setzen.
2. `buildRail()` (Toolbar) und `buildTiles()` (Module) aufrufen.
3. `wire()` (alle Event-Handler).
4. Bereits offene Fenster als Tabs übernehmen.
5. `placeTiles()`, `renderTabs()`, `renderRail()`, `poll(true)`.
6. `buildGuide()`, `tipStatic()` (Führung).
7. `wireCharts()`, `wireStack()`.
8. Gespeicherte Chart-Fenster neu laden und ausgelagerte Tracker wieder
   einhängen.

### 5.2 Toolbar = Daten (`RAIL`)

`RAIL` ist ein Array aus 5 Gruppen (`swap`, `trade`, `launch`, `play`, `bots`)
mit je `items`. Die Art eines Items bestimmt, was ein Klick tut:

| Schlüssel | Bedeutung | geöffnet über |
|---|---|---|
| `prog:'terminal'` | vorhandenes OS-Fenster | `openProg()` → `osOpenWindowMulti` / `crArena.open` / `osToggleWindowMulti('walletintel')` |
| `tile:'coins'` | Modul dieses Blocks | `openTile()` |
| `act:'swap'` | vorhandene Aktion | `doAct()` (`chart`, `swap`, `rooms`, `tournament`, `reset`, `desktop`) |
| `chartwin:true` | neues Chart-Fenster | `openChartWin()` |
| `view:'solana'` | Terminal-Ansicht als eigenes Fenster | `openView()` |
| `soon:'launch-token'` | ehrliches Phase-2-Modul **ohne Knöpfe** | `openSoon()` |
| `off:true` | gesperrt (nur Hinweis) | — |

`RAIL_FOOT` enthält die drei Fuß-Knöpfe, `SOON` die Texte der
Phase-2-Module, `LABELS` die Tab-Namen der Fenster, `ICON` die SVG-Pfade.
**Die gewünschte spätere Konfiguration der Toolbar (Position, welche Tools)
setzt genau hier an:** `RAIL` aus einer gespeicherten Nutzerauswahl bauen
statt aus der Konstante.

Ziehen aus der Toolbar: `_dragStart`/`_dragMove`/`_dragEnd` mit
`mode:'rail'`. Beim Loslassen auf dem Desktop wird `openItem(it, {x, y})`
aufgerufen, und das Fenster oder Modul öffnet am Ablegepunkt. Auf der
Toolbar losgelassen passiert nichts.

### 5.3 Module (Kacheln)

- **Registry:** `TILE_IDS` (veränderlich) und `L[id] = { x, y, w, h, open, min, max, z, kind?, … }`.
- **Feste Module:** `arcade`, `coins`, `feed`, `pulse`, `soon`.
- **Dynamische Module** (`_isDyn(id)`):
  - `chart-N`: Chart-Fenster, `kind:'chart'`, `ref`, `tf`.
  - `view-solana` / `view-cex`: `kind:'view'`.
  - Aufgebaut werden sie mit `_tileHtml`, `_addTileDom` und `_wireTileDom`.
  - Entfernt werden sie beim Schließen mit `_destroyDyn`.
- **Speicherung:** `L` wird in `cr_ui_v2_tiles` gespeichert und beim Laden
  wiederhergestellt, dynamische Module eingeschlossen.
- **„Layout zurücksetzen“** (`doAct('reset')`) setzt die festen Module auf
  Standard. Dynamische Module bleiben offen und werden versetzt neu
  angeordnet.
- **Bedienung:**
  - Kopf ziehen verschiebt (8-px-Raster, `_snap`), die Ecke ändert die Größe.
  - Doppelklick auf den Kopf maximiert. Erst echtes Ziehen hebt die
    Maximierung wieder auf.
  - Ampel: `minTile`, `toggleMaxTile`, `closeTile`.
- **DOM:** `#cr2Tiles` ist `display:contents`, und jedes `.cr2-tile` ist
  selbst `position:fixed`. Grund: Ein fixierter Container würde eine eigene
  Stapelebene bilden, und Module könnten nie über Fenstern liegen.

### 5.4 Vorhandene OS-Fenster

v2 fasst die Fenster nur an:
- **Stil:** 80s-Rahmen per CSS.
- **Position:** `_placeWin`, unter der Leiste, rechts der Toolbar, oder am
  Ablegepunkt.
- **Ampel:** Gelb ruft `winMin` auf (Klasse `cr2-min`, bleibt als Tab), grün
  `winMax` (Klasse `cr2-max`). Rot schließt über den **eigenen, vorhandenen**
  Handler.
- **Griff:** `_ensureWinGrip` fügt `.cr2-wrz` unten rechts ein.

Neu geöffnete Fenster erkennt ein Beobachter (`scan`, MutationObserver auf der
Klasse `on`). Er legt einen Tab an und setzt die Position. Bleibt ein Fenster
zu (Gast-Sperre), verfällt der Ablegepunkt.

### 5.5 Eine Stapelordnung (seit v951)

Module und Fenster teilen **eine** Reihenfolge: Was man zuletzt anfasst,
liegt oben.

Es gibt **zwei z-Zähler**. Das ist die häufigste Fehlerquelle:
- Der alte Fenster-Manager hat `zTop` (ab 100) und `raiseWindow(el)`. Er hebt
  bei **jedem mousedown** auf ein Fenster.
- v2 vergibt eigene Werte: `raiseTile()` → `_topZ(except) + 1` für Module und
  `_winAboveTiles(w)` für Fenster (über alle Module **und** alle anderen
  offenen Fenster).

`wireStack()` verbindet beides:
- **capture-`pointerdown`:**
  - Ein Modul wird gehoben, falls es nicht schon oben liegt.
  - Ein Fenster wird per `setTimeout` gehoben, **außer** der Klick hat
    inzwischen selbst ein Modul nach vorn geholt (`_stackTick` /
    `_tileRaisedAt`, z. B. der Tab eines ausgelagerten Trackers im Terminal).
- **bubble-`mousedown` auf document:**
  - Er läuft **nach** `raiseWindow` des Fenster-Managers und zieht das Fenster
    wieder über alles.
  - Ohne diesen Nachzug rutschte ein Fenster zwischen Drücken und Loslassen
    unter ein anderes, und der erste Klick auf 🟢 ging verloren (v949
    T12b/c/d, Gegenprobe R10).

Tab-Klick auf ein **verdecktes** Modul holt es nach vorn. Nur auf ein
**oberstes** Modul minimiert er (`_isTopTile`).

### 5.6 Tab-Leiste

- `addTab`, `closeTab`, `tabGo` und `renderTabs` bilden die Tab-Leiste,
  gespeichert in `cr_ui_v2_tabs`.
- `renderTabs` schreibt die Leiste **nur bei geändertem Inhalt** neu.
  Andernfalls würde das Element unter der Maus ersetzt, und Hover-Tipps an
  Tabs kämen nie an (Fund aus v950).
- Das Sammel-Schließen beim Wechsel Desktop ↔ Spiel wird markiert
  (`S.bulk`). Nur ein Schließen durch den Nutzer nimmt einen Tab weg.
- Der **Chart-Tab** (Spiel-Chart) trägt den Coin des Spiels:
  - Das Etikett kommt aus `_chartLabelNow()` (`currentAssetObj` +
    `SYM_BY_MINT`).
  - Es wird aktualisiert von Wrappern um `hideSplash`, `showSplash` und
    `switchAsset` (nach dem Promise).

### 5.7 Home-Daten (Top Coins, Live-Feed, Pulse)

- **Quellen:** keyless, dieselben wie die vorhandenen Terminal-Panes:
  - GeckoTerminal `trending_pools` und `new_pools` (Basis `GT`),
  - DexScreener `token-boosts`.
- **Laden:** `poll()` holt in den Abständen aus `STALE` (60 / 45 / 90 s).
- **Ergebnis:** landet in `D`, je Quelle `{ at, rows | null, err }`.
- **Ausfall = Grund statt Liste.** Ein fehlender Wert wird als „—“ gezeigt,
  nie als 0 oder als erfundener Wert.
- **„Migriert“** heißt nur: neuer Pool auf PumpSwap/Raydium in `new_pools`
  (`MIGR_DEX`), mehr nicht.
- **Nicht gemessen:** Beide Hosts sind aus der Claude-Sandbox gesperrt. Die
  Feldnamen stammen aus dem vorhandenen Parser und der API-Doku; der Test
  beantwortet sie per `page.route`. Erst eine Messung gegen die Live-Seite
  bestätigt sie.
- **„Final Stretch“** (Bonding-Fortschritt) ist nicht gebaut: Im Repo gibt es
  keine keyless Quelle dafür.

### 5.8 Kaufweg in 3 Klicks

Coin anklicken → kleines Popover (`openPop`) mit **BUY / SELL** →
`trade(mint, side, label)`:

1. `crEnsureCustomSolanaToken(mint)`
2. Broker auf Jupiter setzen (`game.broker`, `cr_broker_v1`)
3. `switchAsset(id)` → `hideSplash()` (Spiel-Chart)
4. `openActivation(side)` → `cr.blueLaser.openRouteSettings({kind:'hline', overlay:{…, tradeSide}})`,
   also das **bestehende** Activation-Panel mit vorbelegter Seite

**Es feuert nichts.** Julians Leitplanke: kein neues Trade-UI-Element. Das
Popover ist nur Navigation zum vorhandenen Panel. Die Orders laufen weiter
ausschließlich über `ChartRunnerSDK`.

### 5.9 Chart-Fenster (seit v951)

Chart-Fenster sind **vom Spiel entkoppelt**: Sie lesen und schreiben weder
`candles` noch `currentAsset`.

- **Öffnen:** `openChartWin(ref, at)` legt `chart-N` an. Ohne `ref` startet es
  mit dem zuletzt gewählten Coin (`cr_ui_v2_chart_last`), sonst mit BTC.
- **Daten:** `_fetchSeries(ref, tf)`:
  - Solana-Mint → `window._crRunOhlcCandles(mint, tf)` (derselbe OHLC-Store
    wie das Spiel),
  - sonst Binance `api/v3/klines?symbol=…&interval=…&limit=500`.
- **Ausfall:** Es erscheint **der Grund und keine Kerzen**, keine
  Ersatzkerzen (Test C3, Gegenprobe R5).
- **Zustand pro Fenster:** in `CH[id]`, also `{ rows, err, src, at, busy, off, span, hover, … }`.
  Beim Coinwechsel werden `off=0` und `span=90` zurückgesetzt (sonst hing die
  Zoomstufe eines kurzen Charts fest).
- **Zeichnen:** `drawChart(id)` auf einem eigenen Canvas mit Kerzen, Volumen,
  Preisachse (`fPx`, Breite `AX=76`), letzter Kursmarke, Fadenkreuz und
  OHLC-Ablesung.
- **Bedienung:**
  - `_chartPointer`: Ziehen verschiebt, Hover zeigt das Fadenkreuz.
  - `_chartWheel`: Zoom.
  - Aktualisierung alle 30 s.
- **Coin-Menü:** `_chartMenu` / `_chartMenuList` durchsuchen die Asset-Liste
  und die Listen aus Top Coins/Pulse/Feed. Eine eingefügte Mint wird direkt
  übernommen. Mit `setChartRef` / `setChartTf` wird umgestellt.
- **Buy/Sell:** `chartTrade(id, side)`, derselbe Kaufweg wie §5.8.
- **„▶ Runner“:** `chartToGame(id)` ruft `switchAsset` und `applyInterval(tf)`
  auf, danach `openProg('chartrunner')`. So öffnet sich **„Run starten“ wie
  gewohnt**. Gespielt wird weiterhin nur im **einen** Spiel-Chart;
  `restart()` bleibt der einzige Run-Einstieg.
- **Popover-Knopf** „Im Chart-Fenster öffnen“ (`data-cr2-popchart`) in Top
  Coins, Pulse und Feed.

### 5.10 Solanatracker / CEXtracker als eigene Fenster (seit v951)

- **Kein Nachbau.** `openView(v)` hängt den **vorhandenen** DOM-Knoten
  (`#crTermViewSolana` bzw. `#crTermViewCex`) in ein Modul um (`_mountView`).
- An der alten Stelle bleibt ein Kommentar-Marker (`VIEW_HOME`). Beim
  Schließen hängt `_unmountView` den Knoten genau dorthin zurück.
- Bindungen, Pane-Drag und Refresher funktionieren weiter:
  - `_bodiesOf(paneId)` sucht im ganzen Dokument,
  - aktualisiert werden sichtbare Panes (`offsetParent`).
- **Anzeige im Terminal:**
  - Der Terminal-Tab der Ansicht bekommt `.cr2-popped` („↗“, gestrichelt).
  - Ein Klick darauf holt das eigene Fenster nach vorn.
  - War die Ansicht im Terminal aktiv, schaltet das Terminal auf `darkflow`.
- **Grenze:** Jede Ansicht gibt es nur **einmal**, weil die Panes feste IDs
  tragen. Dasselbe gilt für das Terminal selbst: Mehrere Terminal-Fenster
  gehen **nicht** ohne tieferen Umbau der Terminal-Panes (siehe §9).

### 5.11 Führung (seit v950)

- **Hover-Erklärung:**
  - Ein Element `#cr2Tip`, gespeist aus `data-cr2-tip` (+ `data-cr2-tipt`
    als Titel).
  - Die Texte stehen in `GROUP_DESC` und `ITEM_TIP`.
  - Erscheint nach 280 ms, auch bei Tastatur-Fokus.
- **Willkommen:** `showWelcome()` beim ersten Besuch; `cr_ui_v2_welcome_v1`
  merkt es sich.
- **Tour:**
  - `TOUR` mit 9 Schritten und Scheinwerfer auf das Element.
  - Steuerung über Weiter/Zurück, Pfeiltasten und Esc; `cr_ui_v2_tour_v1`
    merkt den Stand.
  - Der Tutorial-Knopf der COACH-Blase (`crFirstRun.reset`) führt in v2 in
    diese Tour.

### 5.12 API `window.crUiV2` (für Tests und Konsole)

| Feld | Zweck |
|---|---|
| `active`, `reason` | läuft v2? (`reason:'narrow'` unter 900 px) |
| `open(prog)`, `openTile(id)`, `desktop()` | Fenster/Modul öffnen, zum Desktop |
| `openChart(ref)`, `charts()`, `setChart(id, …)`, `drawChart(id)`, `chartView(id)`, `chartToGame(id)`, `chartLabel()` | Chart-Fenster |
| `openView(v)`, `viewParent(v)` | Tracker-Fenster |
| `trade(mint, side, label)` | Kaufweg |
| `data`, `poll()`, `tiles`, `state`, `_layout()` | Daten/Zustand (nur lesen!) |
| `tip`, `tour`, `tourStep`, `welcome` | Führung |

### 5.13 Stil

- **Farb-Tokens** an `body.cr2`: `--cr2-bg0/1/2`, `--cr2-line`,
  `--cr2-ink/dim/mute`, `--cr2-green #14f195`, `--cr2-cyan #7be3f3`,
  `--cr2-pink #ff5b7f`, `--cr2-yellow #ffd166`, `--cr2-violet #9b8cff`.
- **Maße:** `--cr2-nav 48px`, `--cr2-tabh 30px`, `--cr2-rail 64px`.
- **Schriften:** `--cr2-disp` und `--cr2-mono`, beide Systemschriften. Kein
  Webfont und kein CDN.
- **Klassen-Präfix:** `cr2-`, IDs `#cr2…`.

### 5.14 `localStorage`-Schlüssel

| Schlüssel | Inhalt |
|---|---|
| `cr_ui_v2` | `'1'` = v2 an |
| `cr_ui_v2_tiles` | Anordnung aller Module inkl. Chart-/Tracker-Fenster |
| `cr_ui_v2_tabs` | Tab-Leiste |
| `cr_ui_v2_chart_last` | zuletzt gewählter Coin/Zeitrahmen für neue Chart-Fenster |
| `cr_ui_v2_welcome_v1`, `cr_ui_v2_tour_v1` | Willkommen / Tour erledigt |
| `cr_broker_v1` | (vorhanden, nicht v2) Broker, wird im Kaufweg auf Jupiter gesetzt |

---

## 6 · Tests

### 6.1 Browsertests laufen lassen

Sie laufen im echten Chromium gegen die Datei (1600×900). Netz-Quellen
werden per `page.route` beantwortet, der OHLC-Store per Stub. Die Tests
beweisen also die **Oberfläche, nicht die Quellen**.

```bash
npm i playwright --no-save        # falls nicht vorhanden; Browser muss installiert sein
node scripts/check_v949_ui_v2_toolbar_browser.cjs   # Toolbar, Ziehen, Ampel, Kacheln, Kaufweg, Ausfall
node scripts/check_v950_ui_v2_guide_browser.cjs     # 200ms, Hover-Tipps, Willkommen, Tour
node scripts/check_v951_ui_v2_charts_browser.cjs    # Chart-Fenster, Tracker, Runner, Etikett, Stapelung
```

Stand v1.0.951: **72 / 37 / 39 ok**, jeweils `0 FAIL · 0 UNGETESTET`.
Exit-Codes: 0 grün, 1 FAIL, 2 CRASH. Den Chromium-Pfad kann man mit
`CR_CHROME_PATH` vorgeben.

> **Wichtig:** Diese drei Suiten stehen **nicht** in `ci.yml`. Die CI auf dem
> PR prüft sie also nicht. Vor jedem PR müssen sie lokal bzw. in der Session
> laufen. Sie in die CI aufzunehmen wäre ein sinnvoller nächster Schritt.

### 6.2 Gegenproben (Pflicht laut CLAUDE.md)

Ein Test zählt erst, wenn er **ROT** wird, wenn man die geprüfte Zeile kaputt
macht. GRÜN heißt, die Zeile prüft nichts. CRASH heißt, sie prüft das
Falsche. Ablauf:

1. Committen.
2. Die Zeile im HTML gezielt mutieren.
3. Die Suite laufen lassen: Die Zielzeile ist rot, der Rest grün.
4. Mit `git checkout` wiederherstellen.
5. Mutation und Ergebnis in die Commit-Message schreiben.

Beispiele aus v951 (vollständig in der Commit-Message `3c1ba73`):
R1 Zoom-Reset weg → ROT C4a · R5 Ersatzkerzen bei Ausfall → ROT C3a ·
R7 Runner ohne `applyInterval` → ROT C6a · R10 mousedown-Nachzug weg → ROT
v949 T12b. R3 (`_isTopTile` ohne `except`) bleibt GRÜN, weil gleiche z-Werte
nicht mehr entstehen. Das `except` ist also Vorsicht, keine geprüfte
Zusicherung.

Ein kleines Python-Skript genügt dafür: Datei sichern, `replace(a, b)`
(vorher `count(a) == 1` prüfen), Suite starten, `FAIL`-Zeilen sammeln und die
Datei wiederherstellen. Die bisher benutzten Skripte liegen nicht im Repo.

### 6.3 CI-Checks vor jedem PR (aus `ci.yml`)

```bash
node scripts/check_public_leakage.mjs                                   # öffentlich/privat
npm i acorn --no-save && node scripts/check_duplicate_declarations.mjs   # Namenskollisionen
node scripts/check_no_new_cdn.mjs                                       # kein neues Fremdcode-CDN
# Parse-Check: jeder Inline-Skriptblock muss parsen, es müssen genau 7 sein
node -e "const s=require('fs').readFileSync('ChartRunner_Prototype.html','utf8');const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,n=0;while((m=re.exec(s))){n++;new Function(m[1])}console.log(n,'Bloecke ok')"
```

---

## 7 · Regeln und Fallen (bitte dem Agenten mitgeben)

1. **Single-File, kein Build, keine neue Dependency, kein neues CDN.** Alles
   bleibt inline in `ChartRunner_Prototype.html`.
2. **Genau 7 Skriptblöcke.** v2 lebt im letzten. Kein neuer `<script>`.
3. **Kein literales `<script>` in Kommentaren oder Strings** im HTML, denn
   das zerlegt den Block-Scanner. „Skriptblock“ schreiben.
4. **`  if(!_want()) return;` bleibt wörtlich und steht genau einmal da**
   (§3).
5. **Nur über vorhandene Wege öffnen.** Nie ein Fenster, einen Handelspfad
   oder die Gast-Sperre (`CR_CONNECT_EXCLUSIVE` /
   `crConnectExclusiveBlocked`) nachbauen oder umgehen.
6. **Kein neues Trade-UI-Element.** Kaufen und Verkaufen läuft über das
   bestehende Activation-Panel. `ChartRunnerSDK` bleibt die einzige
   Order-Instanz.
7. **Ein Ausfall ist keine Auskunft:** keine Ersatzkerzen, keine leere Liste
   statt Fehler, keine 0 statt „unbekannt“. Stattdessen steht der Grund da.
8. **Topbar maximal 5 Elemente**, die Toolbar hat genau 5 Funktionen.
9. **Rendering und Abilities kreuzen sich nicht.**
10. **Doppelte Funktionsnamen** im selben Scope kollidieren still: Die
    spätere Deklaration gewinnt. Neue Helfer brauchen deshalb eindeutige
    Namen; `check_duplicate_declarations.mjs` findet Kollisionen.
11. **Zwei z-Zähler** (§5.5): Wer Stapelung anfasst, muss die Suiten
    v949 T12 und v951 C9/C10 laufen lassen.
12. **Leakage-Guard nie lockern.** Private Namen und Infrastruktur gehören
    ins private Repo.
13. **Doku ist keine Messung.** Hosts wie GeckoTerminal, DexScreener,
    Binance, `*.workers.dev` und `jup.ag` sind aus der Claude-Sandbox meist
    nicht erreichbar. Was dort passiert, muss im echten Browser gemessen
    werden, und eine Aussage darüber muss als „nicht gemessen“
    gekennzeichnet sein.
14. **Grüner Run ≠ live.** Nach dem Merge
    `https://chartrunner.xyz/play-v2/?_=<nonce>` öffnen und die Version im
    Banner prüfen.
15. **Keine Junk-Dateien** committen (`*_preview.html`, `*.bak*` …).
16. **Nie direkt auf `main` oder `ui-v2` pushen**, immer Branch + PR.

---

## 8 · Offene Punkte / nächste Schritte

| Punkt | Stand |
|---|---|
| **v1.0.951 am Laptop abnehmen** | Gemergt, aber noch nicht von Hand geprüft. Prüfschritte stehen in PR #233. |
| **Terminal mehrfach öffnen** | Nicht möglich: Das Terminal und seine Panes tragen feste IDs. Chart-Fenster gehen beliebig oft, jeder Tracker einmal. Für mehrere Terminals müssten die Panes instanzierbar werden (größerer Umbau, eigene Absprache). |
| **Toolbar konfigurierbar** (Position, welche Tools) | Gewünscht, noch nicht beauftragt. Ansatzpunkt ist `RAIL` (§5.2). |
| **Telefon-Layout** | Später. Unter 900 px ist v2 heute aus. |
| **Launch, Auto-Strategien, Turnier** | Phase 2. Heute gibt es nur ehrliche Platzhalter ohne Knöpfe. |
| **„Final Stretch“** (Bonding-Fortschritt) in Pulse | Keine keyless Quelle vorhanden. |
| **Feldnamen der Listen-Quellen** | Nicht gegen die echten APIs gemessen (§5.7). |
| **v2-Suiten in `ci.yml` aufnehmen** | Offen (§6.1). |
| **Übernahme nach `main`** | Nicht geplant. Vorher `main` (2 Commits voraus) in `ui-v2` mergen, dann die gesamte Regression laufen lassen. |
| **Idee aus dem Investor-Call, Tipp #9** (LLM als UX-Tester gegen die Live-Seite) | Nicht umgesetzt, weil die Seite aus der Sandbox nicht erreichbar ist. |

---

## 9 · Start-Prompt für den eigenen Claude-Agenten

Zum Kopieren in eine neue Claude-Code-Session mit Zugriff auf `ssjjul3/chartrunner`:

```text
Du arbeitest an der neuen Oberfläche "UI v2" von ChartRunner im Repo ssjjul3/chartrunner.

Lies zuerst, in dieser Reihenfolge:
1. CLAUDE.md (verbindliche Regeln, haben Vorrang)
2. docs/UI-V2-HANDOFF.md (Architektur, Tests, Fallen, offene Punkte)
3. In ChartRunner_Prototype.html den Block zwischen
   "/* ═══ v1.0.947–949 · BEGIN — UI v2" und "/* ═══ v1.0.947–949 · END — UI v2 ═══ */"
   sowie die Banner-Einträge v1.0.947–v1.0.951 im Dateikopf.

Arbeitsweise:
- Neuer Branch von origin/ui-v2, PR gegen ui-v2 (NICHT gegen main). Nie einen gemergten Branch weiterverwenden.
- Alles bleibt in der einen HTML-Datei, im IIFE crUiV2, 7 Skriptblöcke, keine neuen Dependencies/CDNs.
- Die Zeile "  if(!_want()) return;" bleibt wörtlich und genau einmal stehen.
- Nur über vorhandene Wege öffnen (osOpenWindowMulti, crArena.open, …), kein neues Trade-UI, Orders nur über ChartRunnerSDK.
- Vor dem PR: die drei Browsertests scripts/check_v949/950/951_ui_v2_*_browser.cjs und die CI-Checks
  (Leakage, Parse 7 Blöcke, Namenskollisionen, CDN) grün laufen lassen, einen neuen Test für die Änderung
  schreiben, Gegenproben (Mutation → ROT) machen und in die Commit-Message schreiben.
- Versions-Banner hochzählen (CURRENT/LAST UPDATED, alte Zeile wird PREV).
- Im PR-Text: was und warum, plus Prüfschritte fürs Telefon/Laptop mit
  https://chartrunner.xyz/play-v2/?_=<nonce>.
- Was du nicht selbst gemessen hast, kennzeichnest du als nicht gemessen.

Meine Aufgabe für dich: <HIER DIE AUFGABE>
```
