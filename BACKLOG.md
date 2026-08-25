# BACKLOG — Stand 25.08.2026, geprüft gegen HANDOFF_phase2_vollstaendig

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

## OFFEN — nach Gewicht

### A · Fährt in den ANSTEHENDEN Client-PR (ein PR, öffentlich)

1. **G4 — SICHERHEIT-Block im Profil** (der letzte offene Kern-Baustein):
   Feld liest `/v1/token/safety` statt Birdeye (tot). Handoff-Regeln gelten:
   Client zeigt, entscheidet keine Schwere · drei Zustände (nicht gelesen ≠
   sauber) · alles durch `_tokEscA`, je eine Testzeile · der Satz „ein
   sauberer Befund heißt …" sichtbar. Handoff-Zusatz „nicht zum Tor machen"
   ist ÜBERHOLT: das Tor existiert jetzt bewusst (Stufe 2).
2. **UI-Reduktion** (Julians Vorgabe 25.08.): Schild-Badge statt Absatz
   (Sheet auf Tap, Urteil VOR dem Formular, Kaufen-Knopf bei block aus) ·
   Tafel auf drei Zeilen (Du zahlst / Mindestens / Gebühren gesamt), Rest ins
   Aufklapp · Preisauswirkung nur als Chip wenn > 1 % · Fehler: Urteil zuerst,
   Begründung hinter „Warum? ▾" · Knopf „PREIS ANSEHEN".
3. **G5 — rechtliche Aussage** (war Voraussetzung für G9 — die Türen sind
   de facto OHNE sie offen, das ist die größte Lücke des Audits): Seite mit
   den belegbaren Sätzen (nicht-verwahrend — `signs: false` in `/health` —
   keine Beratung, keine Ausführungszusage, Totalverlustrisiko), deutlich als
   „Entwurf, juristisch ungeprüft" markiert. Finaler Text: Vorlage bei
   jemandem, der dafür ausgebildet ist — Julians Aufgabe, nicht die einer
   Session.
4. **Übersetzung des Swap-Formulars** (EN-Grund, DE/ES/ZH) — Befund 25.08.
5. **Symbol-Anzeige** aus `symbol` — „Token" wird „BONK".
6. **Statusseite** (System-Ampel: Client-/Worker-Version, gates, Konten,
   Kills) + **diese Datei ins Repo** + ROT/CRASH/GRÜN-Absatz in CLAUDE.md.

### B · Nachträge, private Session (EIN Briefing, vier Punkte)

7. **Exit-Regel:** block gilt der Seite, die den Spieler NEU in den Token
   bringt. Auf der EINGABE-Seite wird block zum lauten warn — wer einen
   eingefrorenen/gesperrten Token hält, kommt immer heraus. (Befund aus der
   UI-Reduktion 25.08.; heute sperrt das Tor auch den Verkauf.)
8. **G2/B verifizieren:** confidentialTransfer explizit als `warn` statt
   `unknown-extension` — laut Handoff gehörte es in den Stufe-2-PR; die
   Session-Antwort erwähnt es nicht. Prüfen, ggf. nachziehen.
9. **`git_sha` in `/health`** — „ist der Merge live?" wird ein Vergleich.
   Dazu CI-Warnung „Commit auf gemergtem Branch" (zweimal passiert).
10. **Anchor-Umzug, Worker-Teil** (Julians Auftrag 25.08., PDF): Memo-Pfad auf
    Mainnet, Format `cr1:map:<name>:<hash>` (ab erstem Mainnet-Memo
    eingefroren — öffentlicher Vertrag), Grenzen im Worker (name ≤ 64 Bytes,
    hash exakt 32 Bytes hex), `GET /v1/anchor/list?address=&kind=map`
    (Ausfall ≠ leere Liste, wortgleich wie balance/tokens). Muss in
    `/health.endpoints` stehen, BEVOR der Client-Teil mergen darf.

### C · Eigene Arbeitspakete (je eigenes Briefing, Reihenfolge = Empfehlung)

11. **Anchor-Umzug Phase 1 — Maps** (Client-PR, direkt nach v890; Julians
    Auftrag 25.08., vollständige Spez im PDF/`briefings/`): `crChainSave` auf
    crTxApi→crSigner→status; crMapsTx-IIFE, unpkg-web3.js-Tag und `_b58` raus
    (erst grep-Messung, dann löschen — Trefferliste in den PR-Text);
    Restore/Owned lesen die neue Liste, alte PDA-Einträge GEKENNZEICHNET
    daneben; Spiel-Prosa zieht mit um. Deployetes Programm bleibt unberührt,
    KEIN neues Programm. CDN-Guard: 3 → 2 Altlasten. Gegenproben laut
    Auftrag (Format, err-Auswertung, Ausfall, Kennzeichnung, Guard).
12. **Anchor-Umzug Phase 2 — Registry** (eigener PR, nach Phase 1): Memo +
    atomare Transfers; hängt an denselben Worker-Bausteinen, Marktplatz-Teil
    mit eigener Verifikationsrunde. Oracle/Match: entfallen (Hermes-Prüfung
    bzw. Rooms-Server decken den Zweck) — README-Absatz im anchor/-Ordner
    vermerkt das Urteil mit Datum. Progression: NICHT anfassen (audit-gated).
13. **G8 — Kursabfrage hinter den Worker.** Handelbarkeit hängt am
    Client-direkten `lite-api.jup.ag` — abgekündigt, Nachfolger braucht
    API-Key (kann nicht in den Browser). Wird mit jedem Tag dringlicher;
    derselbe Zustand, in dem quote-api vor seinem Tod war.
14. **G7 — Positionen/PnL fertig verdrahten.** Bestand (Kette, exakt) steht;
    fehlt: Anzeige in der Handelstafel + Einstand NUR mit Abdeckungsgrad
    („nicht vollständig berechenbar" statt Zahl mit Sternchen).
    `window.crPositions` existiert — erst lesen, dann bauen.
15. **Intel/TRACE-Backend** — Client fertig, Backend fehlt komplett
    (Early-Buyer-Index, Feeds, Kontingente). Größenordnung ohlc-store.
16. **Stufe 3 Sicherheits-Tiefe** (Liquidität, LP-Lock, Halterkonzentration)
    — als Worker-Regel für alle, nie als Client-Datenquelle.
17. **§6-Rest:** Number(null)-Sweep · verbleibender dritter Signierpfad
    (unpkg/crMapsTx/_b58 erledigt der Anchor-Umzug Phase 1).
18. **G10 crBrokers / Börsen-agnostisch** (§6c) — nach eigener Prioritätslage.
19. **RUN-Token** — letzter Baustein laut Roadmap; Slots überall vorbereitet
    (Quote-Set, /health, Menü).

## AUSDRÜCKLICH NICHT (Handoff §5, unverändert gültig)

Keeper/echte Bracket-Ausführung · Multi-Wallet · eigene Kurs-Infrastruktur ·
alles, was der Abschnitt sonst nennt.
