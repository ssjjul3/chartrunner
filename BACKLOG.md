# BACKLOG — Stand 26.08.2026, geprüft gegen HANDOFF_phase2_vollstaendig

Eine Liste, ein Ort. Gepflegt als Teil jedes PRs, wie das Versions-Banner.
Quellen: das Original-Handoff (23.08.), die Messungen 24.–25.08., die
Entscheidungen aus dem Chat.

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
  entscheidet nichts mehr. Preise aus `GET /v1/price`; Mint ohne Preisfeld
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
- **Stale, NICHT von v892 verursacht** (gemessen gegen `origin/main`, gleiche
  Zahlen): `check_v874_swap` (9 FAIL) und `check_v876_tradeability` (5 FAIL)
  prüfen die Deckel-Probe-Schaltfläche und ein Formular ohne Betragsfeld —
  beides ist mit **v888** weggefallen. Die Prüfungen sind veraltet, nicht der
  Code. Eigener kleiner Aufräum-Punkt, siehe C·22.

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
   Worker-Hälfte laut Bericht mit tx v1.15 da (`git_sha 4f06899`); **von
   dieser Session NICHT nachgemessen**, beide Sandboxes sind für
   `*.workers.dev` gesperrt (403 auf CONNECT). Die CI-Wächter-Hälfte ist
   mit v891 erledigt (`stranded-commits.yml`).
10. **Worker-`/v1/quote` ruft selbst noch `lite-api.jup.ag`** (Julians
    Messung 26.08.: die Antwort trägt `"source": "lite-api.jup.ag"`). Der
    Client ist mit v891 sauber — er fragt nur noch den eigenen Worker. Die
    Fremdquelle ist damit **nicht weg, sondern eine Etage tiefer gezogen**,
    und dort steht sie auf demselben Sterbebett: `quote-api` ist bereits tot,
    `lite-api` ist laut Jupiter zum 31.01.2026 abgelöst. Der haltbare Weg ist
    `api.jup.ag/swap/v1` MIT Schlüssel — und ein Schlüssel im Worker ist genau
    richtig, er gehört nur nicht in den Browser. **Der Key-Umzug steht im
    Worker aus, bevor `lite-api` stirbt.** Sonst wiederholt sich v877, diesmal
    serverseitig: der Ausfall erschiene im Spiel als „Kursabfrage nicht
    erreichbar", und niemand suchte ihn im Worker. Nur Eintrag — nicht in
    dieser (öffentlichen) Session gebaut.
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
    mit eigener Verifikationsrunde. Oracle/Match: entfallen (Hermes-Prüfung
    bzw. Rooms-Server decken den Zweck) — README-Absatz im anchor/-Ordner
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
    `hermes-proxy`). Die Zahl aus dem Auftrag (sechs, davon keiner mit Tor)
    schließt die Worker des privaten Repos ein — von dieser Session nicht
    einsehbar und deshalb nicht als Messwert übernommen.
22. **Veraltete Prüfskripte aufräumen** (klein, jederzeit).
    `check_v874_swap` und `check_v876_tradeability` prüfen zwei Dinge, die es
    seit **v888** nicht mehr gibt: die Deckel-Probe-Schaltfläche und ein
    Swap-Markup ohne Betragsfeld. Sie sind seither rot und waren es auch vor
    v892 — gemessen gegen `origin/main`, gleiche Zahlen (9 bzw. 5 FAIL).
    Gefährlich ist daran nicht das Rot, sondern die Gewöhnung: eine Suite mit
    dauerhaft roten Zeilen wird nicht mehr gelesen. Entweder auf die heutige
    Ansicht nachziehen oder als überholt kennzeichnen — nicht löschen, ohne zu
    prüfen, was sie sonst noch abdecken.
21. **Node-20-Deprecation in den Actions** (Einzeiler für die nächste private
    Session). GitHub zwingt Actions von `actions/*@v4` bereits auf Node 24
    („being forced to run on Node.js 24" im Log). `ci.yml` ist auf
    `checkout@v5`/`setup-node@v6` gezogen; die übrigen Workflows
    (`deploy-workers`, `pages`, `render-cards`, `verified-build`,
    `audit-worker-secrets`) sind ungeprüft. Einmal durchziehen, damit die
    Warnung nicht zur Abschaltung wird.

## AUSDRÜCKLICH NICHT (Handoff §5, unverändert gültig)

Keeper/echte Bracket-Ausführung · Multi-Wallet · eigene Kurs-Infrastruktur ·
alles, was der Abschnitt sonst nennt.
