# BACKLOG — Stand 21.09.2026

*(vorherige Stände: 19.09.2026, geprüft gegen den IST-Abgleich vom 19.09.2026 · 26.08.2026,
geprüft gegen HANDOFF_phase2_vollstaendig)*

**Neu am 21.09.2026:** Punkte 32–43 aus `BACKLOG-NACHTRAG-2026-09-21.md`
(Handoff §5/§6/§10 und Julians Antworten aus dem Taskboard-Abgleich).

Eine Liste, ein Ort. Gepflegt als Teil jedes PRs, wie das Versions-Banner.
Quellen: das Original-Handoff (23.08.), die Messungen 24.–25.08., die
Entscheidungen aus dem Chat, und der IST-Abgleich des öffentlichen Repos vom
19.09.2026.

**Zu den Messwerten vom 17.09./19.09.:** sie stammen aus dem IST-Abgleich, nicht
aus dieser Session. Diese Session erreicht weder `*.workers.dev` noch
`chartrunner.xyz` und hat **nichts nachgemessen**. Was hier als gemessen steht,
steht als *übernommen* da — die Unterscheidung ist der halbe Sinn dieser Liste.
Die Ableitung Aussage für Aussage: [docs/STATUS-2026-09-19.md](docs/STATUS-2026-09-19.md).

## ERLEDIGT — gebaut UND gemessen (nicht mehr anfassen)

- **G1** Brackets im Live-Modus: gemessen, SIM-Kennzeichnung am Order-Event
  (v887), Journal sagt SIM (v888). Beweis: DOM-Marker, Checks 22/43 ok.
- **G2/A** Sicherheits-Codes nach Sofortwirkung: war erledigt, unverändert.
- **G3** `/v1/rpc/tokens` (v1.12): beide Programme, spendable, frozen;
  `symbol` nachgereicht (v1.14). Gemessen am eigenen Bestand.
- **G6** Verkaufen, beide Richtungen, freie Paare (v1.13 + Client v888/v889).
  Beweisketten: Kauf +250.000 (23.08., Eingabe-Seite), Verkauf +469.092
  (25.08., Ausgabe-Seite) am Gebührenkonto.
- **G9 im Kern / Türen 1–3:** echter Kaufpfad ✓ · Allowlist ersetzt durch
  Regeln ✓ (Stufe 2, v1.14: Tor blockt, gemessen an EURC live) · Gebühr
  konfiguriert, beide Seiten gemessen ✓ · Deckel ersatzlos weg ✓.
- **Quote-Regel** (nicht im Handoff, Julians Entscheidung 24.08.): Gebühr auf
  der Quote-Seite, drei Konten, `fee_mint`/`fee_side` in Fehlern.
- **Einheiten-Fix** (v889): eine decimals-Rangfolge für Parser/MAX/Tafel.
- **§6: %%-Fix** (v887). **103f504-Reapply** (v887).
- **G4 / UI-Reduktion / G5-Entwurf / Übersetzung / Statusseite** (v890):
  gebaut, im PR verifiziert. (Waren A·1–A·4, A·6.)
- **G8 — Kursabfrage hinter den Worker** (v891): `crQuote` sitzt auf
  `crTxApi.quote` → `GET /v1/quote`; `CR_JUP_BASE` und der zweite,
  parallele Aufrufer (Terminal-Sonde `phxBook`) sind weg. Kein Aufruf an
  `lite-api.jup.ag` mehr im Live-Code. (War C·13.)
- **Mint-Auflösung statt Whitelist** (v891, Julians Vorgabe 26.08.): jeder
  Listeneintrag, dessen Markt-ID sich über `/v1/mints/resolve` auflöst, ist
  handelbar; ohne Mint steht „nur Chart" mit Grund. `TOK_BIRDEYE_MINT`
  entscheidet nichts mehr — es steht noch als dritte, nachrangige Mint-Quelle
  in `_tokMintOf` und ist Teil des Birdeye-Restbestands, siehe Punkt 28.
  Preise aus `GET /v1/price`; Mint ohne Preisfeld
  → „Preis nicht verfügbar", nie eine Zahl.
- **Exit-Regel im Client** (v891): der Fluss folgt `safety.decision`
  (allow/deny), das Schild zeigt weiter `verdict`. VERKAUFEN wird nie
  mitabgeschaltet; die Tafel zeigt beim Verkauf eines block-Tokens die volle
  Schwere als Warnzeile. (War B·7, Client-Hälfte — die Worker-Hälfte ist mit
  tx v1.15 gebaut.)
- **Anchor-Umzug Phase 1 — Maps** (v891): `crChainSave` über
  `POST /v1/tx/anchor` → `crSigner` → `status` mit err-Auswertung,
  zweistufig; `crMapsTx`, das unpkg-web3.js-Tag und das eigene devnet-
  Programm sind aus dem Client raus; Anker-Liste aus `GET /v1/anchor/list`,
  alte PDA-Einträge gekennzeichnet; CDN-Guard 3 → 2. (War C·11.)
  **Nicht gelöscht: `_b58`.** Die Messung vor dem Löschen hat gezeigt, dass
  es kein Anker-Rest ist — es kodiert die `roomId` der Live-Map-Räume
  (`_roomId` → `crMapsShare(map, {live:true})`). Löschen hätte die
  Multiplayer-Raumlinks gebrochen.
- **CI-Wächter „gestrandete Commits"** (v891):
  `.github/workflows/stranded-commits.yml` + die Session-Regel in
  `CLAUDE.md`. (War die zweite Hälfte von B·9.)

## OFFEN — nach Gewicht

### A · Fährt in den ANSTEHENDEN Client-PR (ein PR, öffentlich)

Leer. A·1–A·6 sind mit v890 und v891 gebaut (siehe ERLEDIGT). Was hier als
Nächstes einzieht, entscheidet Julian.

#### GEBAUT, ABNAHME STEHT AUS — v1.0.893 (das dritte Tor: echte Kerzen)

Nachtrag zu v892, und zwar zu einer **fehlenden Bedingung**, nicht zu einem
Schönheitsfehler. Julians Vorgabe vom 26.08. hatte drei Tore für SCHARF —
Wallet, Mint **und echte Kurve** („auf synthetischen Kerzen ist SCHARF nicht
wählbar"). Gebaut waren zwei. Das dritte fehlte im Code vollständig; im
Banner, in der Commit-Message und im Prüfskript von v892 kommt es an keiner
Stelle vor. Gemessen an `origin/main` (Headless, BONK-Chart ohne Pool →
Serie `custom Solana token · Jupiter · no-solana-pool · seeded`):
`crArm.set(true)` ergab **true**. SCHARF ließ sich also auf einer erzeugten
Kurve scharf schalten — und ein Tap darauf wäre ein **echter** Kauf zu einem
Preis gewesen, den der Chart sich ausgedacht hat. Genau der Widerspruch, den
das v892-Etikett „Preis live · Kurve synthetisch" daneben geschrieben hätte.

- **Das Tor** (`crArm.curveLive()`): gelesen wird `window.crChartLive`, das
  `crSetMarketSource` seit v1.0.859 ohnehin führt — true, wenn die Serie eine
  QUELLE getragen hat (`/v1/ohlc` bzw. Live-Tick-Aufbau), false bei
  `seeded` / `NOT LIVE`. Kein neues Feld, kein zweiter Wahrheitsbegriff: das
  Flag war da, es hat nur niemand gefragt. Verglichen wird gegen `=== true`,
  also zählt `undefined` (während des Ladens) als **Nein**.
- **Sichtbar, nicht nur rechnerisch**: `crSetMarketSource` zeichnet den
  Schalter neu, sobald eine Serie auf seeded zurückfällt — derselbe Grund,
  aus dem `onAssetChange()` existiert.
- **Nebenwirkung, erwünscht**: solange der OHLC-Endpunkt nicht live ist,
  bleibt SCHARF überall dort von selbst aus, wo die Kurve erzeugt wird. Die
  Reihenfolge erzwingt sich per Konstruktion statt per Merkzettel.
- **Zur Nummer**: v893 war für die Bracket-Alarme vorgesehen. Die sind hier
  **nicht** drin und rücken auf **v894**; Bracket, Ladder und Laser bleiben
  ausdrücklich Simulation, es gibt weiter keinen Keeper. Eine neue Nummer
  musste es trotzdem sein, weil v892 gemerged und ausgerollt ist und der
  Versionsstring die einzige Telefon-Probe für „angekommen" ist (CLAUDE.md:
  „grüner Run ≠ live"). Ein Buchstaben-Suffix hätte diese Probe blind
  gemacht — der Banner-Leser in der Datei liest nur Ziffern und Punkte und
  hätte das `a` still verschluckt.
- **Nicht gemessen, ausdrücklich**: auch diese Session erreicht
  `*.workers.dev` nicht (403 auf CONNECT, Proxy-Status dieser Session),
  `/health` ist also **nicht** gegengelesen. Alle Worker-Aussagen stammen
  weiter aus Julians Messung vom 26.08.

#### GEBAUT, ABNAHME STEHT AUS — v1.0.892 (SCHARF-Schalter + fünf Mitfahrer)

Bewusst **nicht** unter ERLEDIGT: dort steht nur, was gebaut **und gemessen**
ist. Diese Session konnte den Worker nicht messen — beide Sandboxes sind für
`*.workers.dev` gesperrt (403 auf CONNECT), also ist `/health` **nicht**
gegengelesen worden. Alle Worker-Aussagen unten (tx v1.15, `git_sha 4f06899`,
`venues`, `decision`) stammen aus Julians Messung vom 26.08., nicht aus einer
eigenen. Der Punkt zieht nach der Telefon-Abnahme um.

- **SCHARF-Schalter** (`crArm`): SIM (Default) / SCHARF im Chart, fünftes und
  letztes Element der `header-picks`. Zustand **nur in der Closure**, nie
  persistiert — jeder Neustart beginnt SIM. SCHARF nur mit Wallet UND
  aufgelöstem Mint; `on()` prüft bei jeder Abfrage neu, der Zustand entwaffnet
  sich also selbst. **Das dritte Tor (echte Kurve) fehlte hier und kam erst
  mit v1.0.893 dazu** — siehe oben.
- **Market vom Chart**: der Kauf-/Verkaufs-Tap öffnet die **bestehende** Tafel
  als Blatt, vorbefüllt. `_crSwapFormHtml` + `_crWireSwap` sind jetzt eine
  Quelle für Token-Fenster und Chart; `crTxApi.swap` wird weiterhin an genau
  einer Stelle gerufen. Keine Anfrage vor Tap 1, keine Signatur vor Tap 2.
- **Gitter**: Kauf folgt `safety.decision`, Verkauf nie (Exit-Regel);
  Betragslimit pro Tap deckelt die Vorbefüllung (Default 0,05 SOL).
  Bracket/Ladder/Laser bleiben ausdrücklich SIM — v893 macht sie zu Alarmen.
- **Mitfahrer 1–4**: `venues`/`hops` aus der v1.15-Antwort · Etikett
  „Preis live · Kurve synthetisch" · Anker-Namensprüfung VOR dem Bau
  (kein `:`, ≤ 64 **Bytes**) · Karten-Status aus `GET /v1/anchor/list`
  (Name + Hash), Listen-Ausfall = „Anker-Status nicht abrufbar", nie
  OFF-CHAIN.
- **Zwei Befunde nebenbei**, beide von der v876-Klasse (eingesperrte Funktion,
  die von außen aussieht wie erreichbar): `renderMaps` war nie exportiert,
  während zwei Stellen `if(typeof window.renderMaps === 'function')` prüften —
  beide still tot. Und `_mapT` war eine dritte, eingesperrte Kopie des
  Übersetzer-Körpers. Beides behoben (`_crT` ist der eine Körper).
- ~~**Stale, NICHT von v892 verursacht**~~ — **abgearbeitet 20.09.2026**, siehe
  C·22. Kurzfassung: bei `check_v876_tradeability` waren fünf Zeilen veraltet,
  nicht das Skript (jetzt 25 ok, 0 fail); `check_v874_swap` bricht nach den
  neun FAIL ab und ist gelöscht.

1. **Symbol-Anzeige** aus `symbol` — „Token" wird „BONK". War A·5 und ist
   in der Handelstafel erledigt (v889); offen bleibt die Markt-Liste, wo
   Zeilen ohne CoinGecko-Namen noch den Ticker doppeln.

### B · Nachträge, private Session (EIN Briefing, vier Punkte)

7. ~~**Exit-Regel**~~ — erledigt: Worker mit tx v1.15, Client mit v891
   (`safety.decision` führt den Fluss, `verdict` nur noch das Schild).
8. **G2/B verifizieren:** confidentialTransfer explizit als `warn` statt
   `unknown-extension` — laut Handoff gehörte es in den Stufe-2-PR; die
   Session-Antwort erwähnt es nicht. Prüfen, ggf. nachziehen.
9. **`git_sha` in `/health`** — „ist der Merge live?" wird ein Vergleich.
   **Weiterhin offen, und der Rückstand ist jetzt beziffert.** Laut IST-Abgleich
   19.09.2026 erfüllen das **2 von 9** Diensten (`tx` und Rooms) — übernommen,
   **nicht** von dieser Session nachgemessen; beide Sandboxes sind für
   `*.workers.dev` gesperrt (403 auf CONNECT).
   Im öffentlichen Repo ist der Stand **belegbar** und schlechter, als die Regel
   verspricht: von drei Workern hat **einer** überhaupt einen Health-Pfad
   (`chartrunner-ownership`, `GET /ownership/health`), und der nennt seinen Commit
   nur, wenn `GIT_SHA` beim Deploy injiziert wurde (`src/index.js:401-403`).
   `chartrunner-account` und `chartrunner-alerts-cron` haben **keinen**.
   (Bis 20.09.2026 stand hier ein vierter, `chartrunner-hermes-proxy`; sein
   Verzeichnis ist mit der Pyth-Entfernung gelöscht.) Der Geld-Worker `chartrunner-worker` laut IST-Abgleich
   ebenfalls keinen und kein `git_sha`.
   Die CI-Wächter-Hälfte ist mit v891 erledigt (`stranded-commits.yml`).
   Tabelle je Dienst: [docs/STATUS-2026-09-19.md](docs/STATUS-2026-09-19.md) §1.
10. ~~**Worker-`/v1/quote` ruft selbst noch `lite-api.jup.ag`**~~ — **erledigt.**
    Der Schlüsselumzug im Worker ist vollzogen: Messung vom **17.09.2026**
    (übernommen aus dem IST-Abgleich, **nicht** von dieser Session nachgemessen)
    — die Antwort trägt `api.jup.ag`, `keyed: true`, und die Lite-Stufe ist
    **seit Worker-v1.16 raus**.
    Damit ist die Befürchtung aus dem alten Eintrag erledigt, bevor sie eintrat:
    `lite-api` stirbt zum 31.01.2026, ohne ChartRunner mitzunehmen. Der Schlüssel
    sitzt dort, wo er hingehört — im Worker, nicht im Browser.
    *Gegenprobe, falls je wieder zweifelhaft:* `GET /v1/quote` gegen den
    ausgerollten Worker; `source` muss `api.jup.ag` nennen und `keyed` `true` sein.
    Ein Commit-Hash belegt das **nicht** (`CLAUDE.md`: „Gemerged ist nicht ausgerollt").

11. **Anchor-Umzug, Worker-Teil** (Julians Auftrag 25.08., PDF): Memo-Pfad auf
    Mainnet, Format `cr1:map:<name>:<hash>` (ab erstem Mainnet-Memo
    eingefroren — öffentlicher Vertrag), Grenzen im Worker (name ≤ 64 Bytes,
    hash exakt 32 Bytes hex), `GET /v1/anchor/list?address=&kind=map`
    (Ausfall ≠ leere Liste, wortgleich wie balance/tokens). Muss in
    `/health.endpoints` stehen, BEVOR der Client-Teil mergen darf.

### C · Eigene Arbeitspakete (je eigenes Briefing, Reihenfolge = Empfehlung)

11. ~~**Anchor-Umzug Phase 1 — Maps**~~ — erledigt mit v891 (siehe ERLEDIGT).
12. **Anchor-Umzug Phase 2 — Registry** (eigener PR, nach Phase 1): Memo +
    atomare Transfers; hängt an denselben Worker-Bausteinen, Marktplatz-Teil
    mit eigener Verifikationsrunde. Oracle/Match: entfallen (die Prüfung gegen
    die Kursquelle bzw. der Rooms-Server decken den Zweck; die Kursquelle war
    damals Pyth/Hermes und ist seit 20.09.2026 entfernt) — README-Absatz im anchor/-Ordner
    vermerkt das Urteil mit Datum. Progression: NICHT anfassen (audit-gated).
13. ~~**G8 — Kursabfrage hinter den Worker**~~ — erledigt mit v891.
14. **G7 — Positionen/PnL fertig verdrahten.** Bestand (Kette, exakt) steht;
    fehlt: Anzeige in der Handelstafel + Einstand NUR mit Abdeckungsgrad
    („nicht vollständig berechenbar" statt Zahl mit Sternchen).
    `window.crPositions` existiert — erst lesen, dann bauen.
15. **Intel/TRACE-Backend** — Client fertig, Backend fehlt komplett
    (Early-Buyer-Index, Feeds, Kontingente). Größenordnung ohlc-store.
16. **Stufe 3 Sicherheits-Tiefe** (Liquidität, LP-Lock, Halterkonzentration)
    — als Worker-Regel für alle, nie als Client-Datenquelle.
17. **§6-Rest:** Number(null)-Sweep · verbleibender dritter Signierpfad.
    unpkg/crMapsTx sind mit v891 erledigt; `_b58` BLEIBT (es kodiert die
    roomId der Live-Map-Räume, nicht den Anker — siehe ERLEDIGT).
    Offen bleibt der **Legacy-Bounce** `../solana-connect/?action=save-map`:
    er ist der letzte Client-Weg, der noch gegen das alte devnet-Programm
    schreibt. v891 hat ihn NICHT entfernt (er ist der einzige Anker-Pfad für
    Browser ohne injizierte Wallet) und lässt ihn auch nicht mehr als
    stillen Rückfall zu — er läuft nur, wenn kein Signierer im Spiel ist,
    und der Toast sagt „legacy devnet route". Eigenes Paket.
18. **G10 crBrokers / Börsen-agnostisch** (§6c) — nach eigener Prioritätslage.
19. **RUN-Token** — letzter Baustein laut Roadmap; Slots überall vorbereitet
    (Quote-Set, /health, Menü).
20. **Auto-Deploy je Worker mit eigenem Test-Tor** (Befund 26.08.).
    Gemessen an `.github/workflows/deploy-workers.yml` in DIESEM Repo:
    Auto-Discovery über `workers/*/` mit Wrangler-Config; auf Push nach
    `main` deployt der Workflow bereits **nur die Worker, deren eigene Pfade
    sich geändert haben** — das Einzel-Deploy ist also da. Was **fehlt, ist
    das Tor**: kein einziger Test kann einen Deploy aufhalten, weder vorher
    noch nachher. `wrangler deploy` läuft, und was der Worker danach
    antwortet, prüft niemand. Der einzige „alles"-Fall ist ein manueller
    `workflow_dispatch` mit `worker: all`.
    Ziel: je Worker ein eigenes Tor — Smoke gegen `/health` des FRISCH
    deployten Workers, rot heißt Rollback, und der Run wird rot statt grün.
    Vorarbeit: pro Worker einen `/health`-Vertrag festschreiben (welche
    Felder müssen da sein), sonst prüft das Tor nichts.
    Zahl der betroffenen Worker: **hier drei** (`account`, `alerts-cron`,
    `ownership`; bis 20.09.2026 war `hermes-proxy` der dritte, er ist
    stillgelegt). Die Zahl aus dem Auftrag (sechs, davon keiner mit Tor)
    schließt die Worker des privaten Repos ein — von dieser Session nicht
    einsehbar und deshalb nicht als Messwert übernommen.
22. ~~**Veraltete Prüfskripte aufräumen**~~ — **erledigt 20.09.2026**, und die
    Forderung „nicht löschen, ohne zu prüfen, was sie sonst noch abdecken"
    wurde eingelöst: beide Skripte liefen im echten Chromium gegen den
    heutigen Client.
    **`check_v876_tradeability` war nicht veraltet** — 24 ok, 5 FAIL, und alle
    fünf Fehlschläge dieselbe Zeile (`data-cr-cap-probe`, weggefallen mit v888).
    Die übrigen 24 prüfen heutiges Verhalten, darunter den Live-Befund, der das
    Skript ausgelöst hat (Handel-Knopf bleibt da, wenn die Vorschau fällt). Also
    nur die fünf Zeilen raus; das Skript läuft **25 ok, 0 fail**.
    **`check_v874_swap` war schlimmer als veraltet** — 9 FAIL, und danach bricht
    es mit einem TypeError ab. Alles dahinter lief nie: `cluster=mainnet`,
    Explorer-Link ohne cluster-Parameter, POST-Körper, Einsatzgröße, WSOL als
    Eingabe, „der Worker wird nicht von selbst angerufen". Gelöscht — siehe
    den neuen Punkt 27 für das, was dabei verlorengeht.
21. **Node-20-Deprecation in den Actions** (Einzeiler für die nächste private
    Session). GitHub zwingt Actions von `actions/*@v4` bereits auf Node 24
    („being forced to run on Node.js 24" im Log). `ci.yml` ist auf
    `checkout@v5`/`setup-node@v6` gezogen; die übrigen Workflows
    (`deploy-workers`, `pages`, `render-cards`, `verified-build`,
    `audit-worker-secrets`) sind ungeprüft. Einmal durchziehen, damit die
    Warnung nicht zur Abschaltung wird.

22. **`/health` für die zwei stummen öffentlichen Worker** (`chartrunner-account`,
    `chartrunner-alerts-cron`; der dritte, `chartrunner-hermes-proxy`, ist seit
    20.09.2026 stillgelegt). Heute lässt sich bei
    keinem von ihnen fragen, ob der Merge live ist — es gibt keinen Pfad, den man
    fragen könnte. `workers/ownership/src/index.js` ist die Vorlage: Health-Antwort
    plus `git_sha` aus `env.GIT_SHA`, und wenn der Deploy es nicht injiziert, sagt
    die Antwort das ausdrücklich, statt zu schweigen. **Belegt** aus dem Repo, keine
    Messung nötig.

23. **`GIT_SHA` beim Worker-Deploy wirklich injizieren.** `chartrunner-ownership`
    kann seinen Commit nennen — aber nur, wenn `deploy-workers.yml` die Variable
    setzt. Ob das passiert, sagt nur der laufende Endpunkt
    (`GET https://chartrunner.xyz/ownership/health` → `build.git_sha`). **Nicht
    gemessen.** Solange das offen ist, ist `git_sha` im öffentlichen Repo eine
    Absicht, keine Eigenschaft.

24. **Kein Deploy-Gate für die vier öffentlichen Worker.** `deploy-workers.yml`
    rollt jeden `workers/*/`-Ordner mit Wrangler-Config aus; zwischen Merge und
    `wrangler deploy` steht nichts. Der `DEPLOY_GATE`, den der IST-Abgleich nennt,
    existiert in diesem Repo nicht (`grep`: null Treffer) — er deckt `workers/tx`
    und `workers/ohlc-store` im privaten Repo. Entscheiden, ob die vier
    öffentlichen Worker ein Gate bekommen oder ob ihr ungegateter Zustand die
    bewusste Wahl ist. **Unbeantwortet ist schlechter als beides.**

25. **Die gepinnte Oracle-ID in `anchor/programs/chartrunner-registry/src/lib.rs:107-108`.**
    `ORACLE_PROGRAM_ID` steht auf `4vfZ…` — die **ausgerollte** Playground-Variante
    (`oracle/src/lib.playground.rs:45`). Die SDK-Variante `oracle/src/lib.rs:40`
    deklariert `7FJj…` und ist laut eigenem Kopf „code-complete, NOT yet deployed".
    Heute ist der Pin damit **richtig**. Die Falle steht in `docs/index.html:300`:
    für `4vfZ…` ist ein „in-place SDK upgrade pending one batched re-upgrade cycle"
    vermerkt. Zieht die Oracle-Adresse dabei um, prüft `record_run` Zertifikate
    gegen einen Owner, der keiner mehr ist — und lehnt **still** jedes echte
    Zertifikat ab, statt laut zu scheitern. Vor dem Re-Upgrade klären, welche ID
    gilt, und beide Seiten zusammen ausrollen. **Hier nur dokumentiert, nicht
    angefasst** (so beauftragt). Welche ID auf Devnet wirklich liegt: nicht gemessen.

26. ~~**`roadmap.html` und `docs/index.html` stehen inhaltlich auf `v1.0.800`**~~
    — **erledigt mit v1.0.946** (inhaltlicher Durchgang, dann die Zahl: Pro-Gebühr
    als „planned", 107 Kapitel/Anzeige 1–100, Profile-PDA raus, `record_run`-Signatur,
    Rooms-Moderation; danach alle Flächen auf eine Nummer). Der alte Wortlaut:
    (`roadmap.html:14,221,317`, `docs/index.html:113`), das Repo auf `v1.0.936`.
    Bewusst **nicht** hochgesetzt: `roadmap.html:14` sagt „Content current to the
    public prototype v1.0.800" — die Zahl zu ändern, ohne den Inhalt gegen v1.0.936
    durchzugehen, wäre eine Behauptung, die wie ein Messwert aussieht. Eigener
    inhaltlicher Durchgang, dann die Zahl.

27. **Die Mainnet-Strecke hat wieder weniger Prüfung, als sie hatte.**
    Mit `check_v874_swap` (gelöscht, C·22) fallen rund 15 Prüfungen weg, die
    seit der v888-Umstellung ohnehin **nie ausgeführt** wurden — das Skript
    stirbt vorher. Inhaltlich waren das: `cluster` wird als `mainnet`
    mitgeschickt · Explorer-Link ohne `cluster`-Parameter · Status wird gegen
    Mainnet abgefragt · POST statt GET · Einsatz und Eingabe-Mint im
    Worker-Körper · während der Bestätigung holt ein Tap kein neues Angebot ·
    ein Fehlschlag auf der Kette gilt nicht als Handel · der Worker wird nicht
    von selbst angerufen. Das sind Aussagen über den Geldweg, und sie sind
    heute unbewacht. Neu schreiben gegen die heutige Oberfläche (Menge +
    Einheit), mit Gegenprobe je Zeile. **Bauen, nicht Aufräumen** — eigener
    Auftrag.

28. **Birdeye-Restbestand im Client** (aus dem Aufräum-PR vom 20.09.2026
    berichtet, **nicht** angefasst). Der Anbieter ist im Geld-Worker entfernt
    und `BIRDEYE_API_KEY` war nie gesetzt — die Kette zeigt also ins Leere.
    Im Client steht sie trotzdem noch und wird gelesen:
    `window.crBirdeye` (`ChartRunner_Prototype.html:107008`) zeigt auf
    `chartrunner-worker…/v1/birdeye`; ein zweiter Pfad
    (`ChartRunner_Prototype.html:108536-108540`) geht bei einem vom Spieler
    selbst eingetragenen Schlüssel (`localStorage.cr_birdeye_key_v1`) direkt
    an `public-api.birdeye.so`. Betroffen sind Radar-Flächen (New Listings,
    Movers, Whale Tape), das Sicherheits-Verdikt, Holder/Marktkapitalisierung
    und der OHLCV-Zweig. Das sauber zu entfernen ist ein Umbau von Flächen,
    kein Aufräumen — eigener Auftrag, mit der Frage vorweg, was an diesen
    Flächen überhaupt bleiben soll.

29. **`chartrunner-alerts-cron` ruft Birdeye ohne Tor — und degradiert still.**
    `workers/alerts-cron/src/index.js:371` ruft `bdVerdict(env, a.mint)`
    **ohne** die `BIRDEYE_API_KEY`-Bedingung, die der Preis-Zweig in Zeile 224
    hat. `bdVerdict` geht damit auf
    `chartrunner-worker…/v1/birdeye/defi/token_security` — den Pfad, dessen
    Birdeye-Hälfte entfernt wurde. Antwort nicht `ok` → `null` → `evaluate`
    liefert `met:false` → **die Sicherheits-Alarmmail feuert nie mehr, und
    niemand erfährt es.** Das ist genau die stille Degradierung, die die
    Produktregeln verbieten. Abgeleitet aus dem Quelltext beider Seiten,
    **nicht gemessen** — der Cron läuft, ich erreiche ihn nicht.
    Entscheidung fällig: Sicherheits-Alarm einstellen und das sagen, oder auf
    eine Quelle umstellen, die es noch gibt. **Der Worker wurde in diesem PR
    nicht angefasst** — er trägt die Wallet-Watch-Mails.

30. **Die toten Birdeye-Aufrufe liegen weiter im Client** (Stand nach
    v1.0.941). v941 hat den Anbieter **nicht** ersetzt und die Aufrufe
    **nicht** herausgelöst — es hat nur dafür gesorgt, dass keine Fläche
    mehr still leer läuft. Offen bleibt genau das, was Punkt 28 beschreibt:
    `crBirdeye.fetchToken/fetchOhlcv/security/trades` fragen bei jedem Tick
    einen Endpunkt, der nicht mehr antwortet, und `crBirdeye.hasKey()` gibt
    weiter pauschal `true` zurück (v1.0.690) — das ist die Zeile, an der die
    Terminal-Flächen glauben, es gäbe eine Quelle. Ehrlich wäre
    `hasKey() === !!_apiKey()`; das blendet die drei Flächen dann aber
    **vor** dem Abruf aus (`_crTermPrivateOpsReason`), also genau das
    Verschwinden, das v941 abgestellt hat. Reihenfolge deshalb: erst
    entscheiden, was an den Flächen bleiben soll, dann herauslösen.

31. **`_crTermPrivateOpsReason` vergleicht Anbieternamen, die es nicht gibt.**
    Befund aus der Gegenprobe zu v1.0.941, am Quelltext, **nicht gemessen**:
    die Funktion prüft `meta.provider === 'on-chain'`, die Karte
    `CR_TERMINAL_PRIVATE_OPS_PANES` schreibt aber `'on-chain data'`. Folge:
    ein gesetzter GoldRush-Schlüssel hebt die Archivierung von `solHolders`,
    `solSmart`, `phxWhales`, `cexWhales` **nie** auf — die Flächen bleiben
    ausgeblendet, auch wenn der Schlüssel da ist und der Abruf liefe.
    Dieselbe Klasse wie die Namens-Kollision aus v874: nichts schlägt an,
    weil ein Vergleich still falsch ist. Eine Zeile Fix, aber sie ändert
    Sichtbarkeit von Flächen — eigener, kleiner Auftrag, mit Ablesung am
    Telefon.

### D · Nachtrag 21.09.2026 (Punkte 32–43)

**Belegklassen wie oben:** *gemessen* = am 21.09. über Browser/Konnektor abgelesen ·
*Quelle* = Datei:Zeile · *übernommen* = aus `HANDOFF-2026-09-21.md`, nicht selbst
gemessen. Ein Bericht über gebauten Code ist eine Beschreibung, keine Messung.

#### Aus dem Handoff (§5/§6/§10), bisher ohne Zeile hier

32. **Zwei Ablesungen zu Ende bringen — ein Boost-Kauf und ein Pro-Kauf
    on-chain** (HO §10.1, *übernommen*). Beide Wege sind offen und unbewiesen:
    es hat noch nie jemand gekauft. Billigster Fortschritt auf der Liste;
    Ergebnis = Signatur + Zeile in der `my-worker`-Tabelle `subscriptions`
    (`verifyIntent → upsertSubscription`, `my-worker/src/lib/solpay.ts`, privat).
    Gegenprobe zur Messung: `boosts` und `on_chain_events` sind heute leer
    (*gemessen 21.09.*) — eine Zeile dort ist der Beweis, kein Bericht darüber.

33. **Anchor-Testschicht** (HO §5.4, *Quelle + gemessen*). Vier Programme ohne
    Testebene; belegter Widerspruch: `chartrunner-registry` pinnt eine
    Oracle-ID (`anchor/programs/chartrunner-registry/src/lib.rs:107-108`, siehe
    Punkt 25), die `oracle/src/lib.rs:40` nicht deklariert. Devnet-Messung 21.09.:
    maps, registry, oracle, match deployt; progression nicht. Werkzeuge:
    LiteSVM, Mollusk, Surfpool; Blueshift für Signer-/PDA-/CPI-Fehler.
    ROT/CRASH/GRÜN gilt: Test **und** Gegenprobe im selben Commit.

34. **Attrappen Stufe 2** (HO §5.5, *übernommen* aus `docs/ATTRAPPEN-2026-09-20.md`,
    privat). Vorlagen-Körper ausbauen (W1 blendet nur aus) · `cexDexFlow` ohne
    Refresher · Phone-Terminal (EDGE FORMULAS, RISK SNAPSHOT, REGIME DETECT reines
    Markup; `kill switch ARMED` ohne id) · **falsch etikettierte Indikatoren**:
    VWAP-Etikett über einem TWAP, `_cvd` ohne Volumen. Letzte Gruppe = eigene
    Klasse: nicht leer, sondern falsch benannt — und damit schlimmer als leer.

35. **P2 R-1 / R-2 — Identität im Raum, dann Persistenz** (HO §5.7, privat).
    Die offene Frage aus dem Handoff („wogegen läuft die Frist?") ist
    **beantwortet, gemessen 21.09.** an `servers/rooms/app/server.js`
    (943 Zeilen): die TTL läuft **seit leer** (`emptySince`); Räume mit
    Spielern verfallen nie. Damit kann der Auftrag geschrieben werden.
    Die öffentliche Doku sagt das seit v1.0.946 auch so (`/docs/`, Moderation).

36. **BACKLOG 28 bleibt offen** (HO §5.6): Punkt 28 (Birdeye-Restbestand)
    ist vorhanden; hier nur der Nachtrag, dass GeckoTerminal die passenden
    Endpunkte hat, das Kontingent aber bis 1.10. leer ist (*gemessen 21.09.*:
    CoinGecko 100.002 Calls, Overage aus, Reset 1.10.).

37. **Helius-Verbrauch erklären** (*gemessen 21.09.*): 131.991 von 16 M
    Credits, davon **+119 k innerhalb eines Tages**. Nicht dramatisch, aber
    unerklärt — vor dem nächsten Cron-Umbau die Verbrauchsansicht lesen.
    Kopffreiheit ist kein Argument gegen das Nachsehen.

#### Aus dem Taskboard-Abgleich 21.09. (Julians Antworten)

38. **Pro-Gebühr 0,35 % in den Geldweg bauen** (Julians Entscheidung 21.09.:
    *bauen*). Befund: entschieden (`docs/HANDOFF_ECON_BOT_INDEXER_933.md`,
    privat), im Client konfiguriert (`ChartRunner_Prototype.html:67546`,
    `crEntitlement.fees.tradingPct {free:0.5, pro:0.35}`, `:67533`
    `tradingLive:false`), beworben (`chartrunner-prototype/pricing.html:134`) —
    im **tx-Worker nicht vorhanden**: kein Tier-Begriff, `ONCHAIN_FEE_BPS` 50
    für alle, `PLATFORM_FEE_BPS` 0 (*Quelle* `workers/tx/src/index.js`, privat,
    v1.28). Weg: tx liest die Stufe (`my-worker` Entitlement, `TIER_RANK` in
    `src/lib/entitlement.ts:71`) je Wallet und setzt 50/35 bps; Lesung
    **fail-closed** (keine Stufe lesbar → 50 bps, **nie** 0); neue Var
    `PRO_FEE_BPS` (Vorgabe 35), Kill-Var `PRO_FEE_KILL`; `/health.trigger.fee`
    trägt beide Werte; ein Spec je Fall (free/pro/unlesbar) **und** die
    Gegenprobe, die die Stufenlesung ausbaut und rot wird.
    **Erst wenn das live gemessen ist** (eine Pro-Wallet, eine Order,
    Gebührenkonto abgelesen), fällt das „planned" auf `pricing.html` und
    `roadmap.html` wieder raus — v1.0.946 hat es gesetzt, nicht entfernt.

39. **Feature-Registry + Preferences** (Board P1.1–P1.3, Julians Vorgaben
    21.09.): Registry im Client-HTML (eine Datei, kein Build); Preferences als
    neue Supabase-Tabelle **mit Migrationsdatei**, Schreibweg über
    `workers/ownership`; Default für bestehende Accounts: alle an; Screen =
    Seite in der Settings-App, nur für angemeldete Konten, überspringbar.
    Core (nicht abschaltbar): ARM-Widget, Chart/Engine, Wallet/Konto.
    Hinweis zur Benennung: die Settings-App heißt im Client **Control Center**;
    „Funktionsauswahl" ist eine Seite darin, kein eigenes `crSettings`.

40. **Vier Supabase-Tabellen ohne Migration im Repo** (*gemessen 21.09.*
    über den Konnektor: 13 Tabellen; `profiles`, `orders`, `subscriptions`,
    `cr_alerts` haben keine Datei unter `my-worker/migrations/0001–0004`).
    Nachziehen, **bevor** Punkt 39 die fünfte Tabelle anlegt.

41. ~~**Roadmap-Stempel**~~ (Board P1.1.1/P1.1.2, Julians Entscheidung 21.09.:
    M5 = „geplant", M8 = „geplant, kein Termin") — **erledigt mit v1.0.946**.
    Umgesetzt als Textänderung, **ohne** Statusänderung: `data-id="m5"` bleibt
    `data-status="next"` (◆ Unlocked), `data-id="m8"` bleibt `"future"`
    (🔒 Locked), M8 endet jetzt auf „No date yet.". Gehörte zu Punkt 26, im
    selben Durchgang gesetzt.

42. ~~**Docs-Seite, Rest nach HO §5.2**~~ — **erledigt mit v1.0.946**. Die vier
    Zeilen: „70 Kapitel" → 107 Kapitel, Anzeige 1–100 (`CAMPAIGN_CHAPTERS`
    hat 107 Einträge, `CR_CH_DISPLAY` bildet 100 davon lückenlos auf 1–100 ab,
    104 einlösbar) · Profile-PDAs gestrichen (es gibt nur `TokenProfile` als
    Entity-Typ 6) · `record_run`-Signatur an `lib.rs:314-321` angeglichen
    (`nonce` ergänzt, `ghost_cid[46]` → `map_hash[32]`) · „removal from a room"
    gestrichen. Dazu eine Versionsnummer statt vier.
    **Offen geblieben** aus demselben Abschnitt: der zweite `record_run`-Block
    im Oracle-Teil der Doku-Seite beschreibt einen v0.9.11-Entwurf mit
    `price_cert`, den es so nicht gibt — Pyth ist seit 20.09. raus. Eigener,
    kleiner Auftrag.

43. **Zwei Kopfzeilen sind alt** (privat, *Quelle*):
    `HANDOFF_PRIVATE_OPS.md` sagt „Stand 2026-08-18",
    `architecture/private/SYSTEM_MAP.md` sagt „always-current", zuletzt
    21.07. Beide beim nächsten privaten PR mitziehen.
    `HANDOFF-2026-09-21.md` selbst ist **nicht eingecheckt** — solange das so
    ist, ist jede Zeile hier mit *übernommen* nicht nachlesbar.
    Die öffentliche Karte ist mit diesem PR nachgezogen (`SYSTEM_MAP.md`,
    Stand 21.09., jede Zeile mit Belegklasse).

## AUSDRÜCKLICH NICHT (Handoff §5, Stand 21.09.2026)

Keeper/echte Bracket-Ausführung · Multi-Wallet · eigene Kurs-Infrastruktur ·
neues On-Chain-Programm · Progression anfassen · Agent Wallet als Bau
(Board P5 = Entscheidungsdokument; Phase-2-Entwurf ohne Termin, existierender
non-custodial Pfad: `workers/agent-bridge`) · alles, was der Abschnitt sonst
nennt.
