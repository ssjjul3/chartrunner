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
10. **Anchor-Umzug, Worker-Teil** (Julians Auftrag 25.08., PDF): Memo-Pfad auf
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
