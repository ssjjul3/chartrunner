# ChartRunner v0.8 — OS, Monster Mode, L3 Coach, Tokenomics

Zweiter großer Design-Pivot. v0.7 hat das Meta-Layer (Gear, Items, Modes) eingeführt.
v0.8 restrukturiert die **Wahrnehmung** des Spiels: was der Spieler beim Laden sieht
(ChartRunnerOS als nostalgische iMac-Oberfläche), wie die Welten zueinander stehen
(Monster Mode wird eigener Raum, Upside-Down wird echte Physik-Inversion auf der
Unterseite der Kerzen), wer die Stimme im Ohr ist (L3 Coach als Avatar mit Persönlichkeit)
und wie Werte aus dem Spiel hinaus kommen (flüchtige In-Game $CHART swappen am
Run-Ende in harten $RUN auf Solana/Hyperliquid).

Gleichzeitig wird eine v0.7-Entscheidung kassiert: **Abilities dürfen sich nicht
selbst löschen.** Der Sinn von ChartRunner ist Chart-Gamification — die Abilities
sind die üblichen TradingView-Tools ins Spiel übersetzt. Ein RSI verbraucht sich
nicht. Ein Bracket-Tool verbraucht sich nicht.

---

## Part 1 — Die Spec (so wie sie reingekommen ist)

### ChartRunnerOS — der erste Blick

Heute landet der Spieler direkt im Spiel (mit Splash-Tiles darüber). v0.8 macht
daraus ein **nostalgisches Betriebssystem im iMac-Stil**: eine Desktop-Metapher
mit Icons für *Wallet · SDK · Missions · Marketplace · L3 Coach · ChartRunner
spielen*. Der Look soll an klassische Mac-OS-Zeiten erinnern, nicht an
Windows-Chrome. Fenster sind verschieb-/schließbar (Mac-Close-Button oben
rechts). Eintrag ins Spiel ist ein expliziter Klick auf das ChartRunner-Icon.

### Monster Mode vs. Upside-Down (Architektur-Pivot)

Heute: ein „Upside-Down" (↓↓) ist gleichzeitig **Kampfraum** (Bären droppen
$CHART) **und** physikalische Inversion der Welt. Das verwischt zwei Ideen.

v0.8 trennt:

- **Monster Mode** — eigener Raum / eigener Modus. Kampf gegen Bären + Regime-
  Monster. Hier lebt die heutige Upside-Down-Mechanik als Grundlage.
- **Neues Upside-Down** — reine Physik-Inversion: Spieler drückt ↓↓, Character
  wird 180° gedreht und teleportiert auf die **Unterseite** der Kerzen.
  Schwerkraft invertiert, Char läuft „kopfüber" auf der Candle-Unterkante.
  Kein Kampf, kein Feind — nur anderer Zugang zum Chart.

**Offene Design-Frage (siehe Part 3):** was *tut* man auf der Unterseite?
Liquidität sammeln? Short-Setups triggern? Gegengesetzte Pickups?

### L3 Coach — Persönlichkeit + Avatar

Heute: L3 ist ein farbloses Mock-Terminal links oben, das BotBoard-Karten zeigt.

v0.8: der Coach wird Charakter. Profit-orientiert. Hart im Ton. Avatar in der
Fußzeile („sticky footer coach"), spricht den Spieler direkt an, kommentiert
Trades, gibt Anweisungen. Immer anwesend, immer zuspitzend auf Profit.

**Offene Design-Frage:** welche Persönlichkeit genau? *aggressiv-pushend /
diszipliniert-risikoaverse / gieriger Wall-Street-Vet / pragmatisch-kühler
quant?* Die Wahl bestimmt den gesamten String-Katalog.

### Abilities — Korrektur aus v0.7

Die Abilities sind **TradingView-Tools ins Spiel übersetzt**:

| Ability | TradingView-Äquivalent |
|---|---|
| Bracket | Long/Short-Position-Tool mit TP/SL |
| Ladder | Scale-In / DCA-Tool |
| OCO | OCO-Order-Widget |
| Hedge | Hedge-Position |
| Radar | Volume/Liquidity-Indikator |
| Rescue | Emergency-Close-Button |
| Magnez | Magnet-Mode (Snap-to-Level) |

Konsequenz: **sie dürfen sich nicht verbrauchen** wie ein Heiltrank. Das `maxCharges`-
Modell aus v0.7b wird entweder:

- **A)** ersetzt durch klassisches Cooldown-System (wie bis v0.6), oder
- **B)** entfernt ganz — unbegrenzte Nutzung mit nur natürlichem Gating (Haltezeit,
  Geldmittel, verfügbarer Chart-Platz).

Empfehlung: **A**. Cooldowns sind eine bekannte Spielgrammatik und halten den
Rhythmus, ohne dem Spieler „leere Items" unterzujubeln.

### Topbar — TradingView-Style

Heute 8+ Elemente auf der Topbar (Brand · Sym · Last · Asset · TF · Strat · Score ·
Menu). Zielbild ist TradingView-like: **max 5 sichtbar**, Rest unter den Menu-Button
als Dropdowns. Ein Asset-Diamant/Token-Logo statt Text-Label.

**Abilities-Dropdown** wird unter den Menu-Button verschoben (nicht mehr als
bottom-HUD).

### Tokenomics — flüchtig → hart

- **$CHART** lebt nur in einem Run. Nach Game-Over: Swap-Screen.
- **$RUN** ist hart. Auf Solana gemintet, auf Hyperliquid handelbar.
- Der Swap läuft über ein zukünftiges On-Chain-Tool. Für v0.8 reicht ein
  Mock-Screen, der den Kurs anzeigt und einen simulierten Tausch durchführt.

### Phase 1 — SDK-Pullover (parallel)

Parallel-Workstream: das ganze Spiel wird zu einem **Overlay**, das man auf
Dexscreener (und später TradingView) drüberzieht. Dafür braucht es die
ChartHost-Abstraktion aus `references/architecture.md` und einen schlanken
Dexscreener-Adapter.

### Später — Trading-Bot-Crafting

Kerzen, Fenster, Coach-Persönlichkeiten, Strategien werden zu Bausteinen, aus
denen der Spieler **eigene Trading-Bots craftet, hostet, animiert**. Das ist das
Endspiel des Meta-Layers (die v0.6-Vision „Sensor → Operator → Actuator", aber
mit Spielcharakter).

---

## Part 2 — Klärungsfragen (brauchen Julians Antwort vor Architekturarbeit)

Diese blockieren den Pivot, nicht die Quick Wins:

1. **Upside-Down-Inhalt** — was *tut* der Char auf der Kerzen-Unterseite? Eigene
   Pickups? Short-Setups triggern? Negative Liquidität sammeln? Oder nur
   optische Perspektivwechsel ohne Gameplay-Konsequenz?

2. **Monster-Mode-Zugang** — wie betritt man ihn? (a) Button in der Topbar,
   (b) eigene Kachel in ChartRunnerOS, (c) in-game Tile/Portal, (d) zeitlich
   getriggert (z. B. bei Wochenende-Spike)?

3. **L3 Coach-Persönlichkeit** — eine der vier Richtungen fixieren, damit der
   String-Katalog geschrieben werden kann: aggressiv-pushend, disziplinierter
   Risiko-Manager, gieriger WS-Veteran, kühl-pragmatischer Quant?

4. **Topbar-Diamant** — soll der Diamant/Symbol-Icon das Token-Logo des aktuell
   gehandelten Assets sein (SOL-Logo bei SOL/USDT usw.) oder ein generisches
   Brand-Mark?

---

## Part 3 — Ranked Backlog

Legend: **I** = Impact (1–5), **E** = Ease (1–5, höher = einfacher),
**P** = Phase 0 compatible (✓/✗).

### Quick Wins (1–2h je, low risk) — Ship als v0.8a

1. **Default perspective Auto** (I 3, E 5, P ✓)
   `perspective = 'lin'` → `'auto'` in Zeile 1069. First-time Player sieht die
   selbst-skalierende Ansicht, die beste UX aus dem Auto-Zoom-Modus.

2. **Abilities self-delete entfernen** (I 5, E 3, P ✓)
   `maxCharges`-System rückbauen → klassisches Cooldown-System. HUD-Badge:
   statt Charge-Dots ein Cooldown-Ring. Begründung: Abilities sind TV-Tools.

3. **Topbar TradingView-Style** (I 4, E 3, P ✓)
   Heutige 8+ Elemente auf ≤5 reduzieren. Sichtbar: Brand+Symbol (zusammen
   als Diamant + Sym-Text) · Last Price · Timeframe-Buttons · Score · MenuBtn.
   Asset-Select + Strat-Select ziehen in das Menu-Drawer. Abilities-Dropdown
   wird ebenfalls via Menu-Button erreichbar (siehe #4).

4. **Abilities-Dropdown unter Menu-Button** (I 3, E 4, P ✓)
   Der heutige `hudWrap` (bottom-HUD mit Abilities-Toggle) bekommt einen
   Einstiegspunkt im Menu-Drawer oder direkt über den Menu-Button. Hotkeys
   (1–7) bleiben erhalten.

5. **SDK + L3-Terminal als schließbare Fenster** (I 2, E 4, P ✓)
   Mac-Style X-Close-Button oben rechts in `#drawer` und `#l3Drawer`. ESC
   schließt das jeweils offene Fenster. Vorbereitung auf ChartRunnerOS.

6. **Interval-Bar raus aus Game-Dropdown** (I 2, E 5, P ✓)
   Duplizierte TF-Auswahl entfernen, Single-Source in der Topbar belassen.

7. **Chart-Movement-Overlay Toggle** (I 2, E 4, P ✓)
   Optionale Visualisierung, die den Character-Pfad (Laufspur) auf der Chart
   nachzeichnet. Setting im Menu-Drawer („Show run trail"), default off.

### Mittel (halber bis ganzer Tag) — v0.8b

8. **Ability: Trailing-Stop** (I 4, E 3, P ✓)
   Als TradingView-Tool übersetzt: Stop-Loss, der sich bei Favorit-Bewegung
   nachzieht. Nutzt die bestehenden SDK-Primitives (`sdk.on('tick')`). Default
   Trail 1%. HUD-Slot 8.

9. **Regime-basierte Monster** (I 4, E 2, P ✓)
   Drei neue Monster, gekoppelt an Markt-Regime des aktuellen Fensters:
   - **Ranging-Krabbe** — spawnt in seitwärts-Phasen (niedriger ATR, wenig
     Direktionalität). Läuft horizontal, zermürbt Bracket-Gewinne.
   - **Trending-Wal** — spawnt bei klaren Trends (ADX > 25). Massiv, schwer,
     pusht gegen die Trend-Richtung.
   - **Volatility-Hornisse** — spawnt bei ATR-Spikes. Schnell, schmerzhaft,
     drückt die Volatility-Spitze ins Gameplay.
   Spawn-Logik liest die ATR-Werte, die v0.6a bereits trackt.

10. **L3 Coach — Footer + Avatar** (I 5, E 2, P ✓)
    L3-Layout umbauen: Avatar-Gesicht (SVG) in der **Fußzeile**, permanent
    sichtbar, Sprechblase über dem Avatar. Persönlichkeit per Klärungsfrage 3
    fixieren. Blockiert durch Klärungsfrage 3.

11. **Chart-Movement visueller Overlay** (I 3, E 3, P ✓)
    Der Runner hinterlässt eine dezente Bewegungsspur (alpha-fade), optional
    toggle-bar. Hebt die „du bist auf der Chart unterwegs"-Verbindung.

### Größer (≥1 Tag) — v0.8c

12. **ChartRunnerOS — iMac-Desktop** (I 5, E 1, P ✓)
    Das Boot-Erlebnis. Splash-Tiles werden zu **Desktop-Icons** auf einem
    nostalgischen Mac-Hintergrund: ChartRunner (Spiel), SDK, Missions,
    Wallet, Marketplace, L3 Coach. Klick auf Icon öffnet das jeweilige Fenster.
    Fensterverwaltung mit Close/Move (Minimize optional). Design-Bibel: iMac-
    OS-9 bis Early-OS-X-Aesthetic, nicht Windows.

13. **Audio-Layer via Tone.js** (I 3, E 2, P ✗ Abhängigkeit)
    Procedurale Sounds für: Pickup (↑↓ Ton), Kill (perc), Bracket-Close (win
    vs loss tonal), Candle-Pulse (Viertel-Takt). *Achtung: Tone.js ist eine
    externe Lib.* Entweder Web Audio API direkt (bleibt im Hard-Rules-Rahmen)
    oder explizite Ausnahme für Tone.js dokumentieren.

### Architektur-Pivot — v0.8d (blockiert durch Klärungsfragen 1+2)

14. **Upside-Down = reine Physik-Inversion** (I 5, E 1, P ✓)
    ↓↓ teleportiert Character um 180° gedreht auf die Kerzen-Unterseite.
    Gravitation invertiert. Laufen auf der Candle-Low-Reihe statt High-Reihe.
    Keine Monster hier. Inhalt abhängig von Klärungsfrage 1.

15. **Monster Mode als eigener Modus** (I 4, E 2, P ✓)
    Der heutige Upside-Down-Kampfraum wird eigenständig. Entry abhängig von
    Klärungsfrage 2. Alle Monster leben hier, $CHART wird primär hier verdient.

### Tokenomics-Layer — v0.8e

16. **End-of-Run Swap-Screen ($CHART → $RUN)** (I 4, E 3, P ✓)
    Mock zuerst: Game-Over-Screen zeigt erworbene $CHART und bietet Tausch zu
    $RUN zum aktuellen Kurs (Fake-Orakel). Explicit Confirm, kein Silent-Burn.

17. **Solana $RUN Token — Mock-Signer** (I 3, E 2, P ✗ Phase 2 prep)
    `SolanaAgentWallet` aus M5 nutzen, Paper-Mode. Realer Mint passiert auf
    Solana; Bridge zu Hyperliquid ist Phase 2.

### Phase 1 — parallel Workstream

18. **Dexscreener-Pullover** (I 5, E 1, P – eigener Track)
    `ChartHost`-Interface implementieren, Dexscreener-Adapter schreiben,
    Bookmarklet oder Browser-Extension, die das Game-UI als Overlay auf
    Dexscreener-Charts legt. Siehe `ChartRunner_Phase1_SDK_Architecture.md`.

### Spätere Arbeit (v0.9+)

- **Trading-Bot-Crafting** — Sensor → Operator → Actuator, aus Spielbausteinen.
- **Coach-Persönlichkeiten als NFTs** — verschiedene Voices/Styles kaufbar.
- **TradingView-Overlay** (analog Phase 1, TV-Adapter).
- **Creator-Tools** für Skins/Voices.

---

## Part 4 — Was von v0.7 kaputtgeht

### Breaks

- **`ABILITIES` Array** — `maxCharges`/`charges` Felder entfernt; `useAbility()`
  refuse-on-empty-Logik weg. Charge-Dots im HUD (`.ch`, `.dot`, `.on`, `empty`)
  werden Cooldown-Ring.
- **$CHART-Shop (v0.7b-items v2)** — „Spend $CHART to restock charges" passt nicht
  mehr. Modal muss umgewidmet werden auf Gear/Items-Kauf oder entfernt für v0.8.
- **Loot-Orb-Restock** von Bossen — gibt statt Charges jetzt bspw. $CHART oder
  Power-Up-Buffs.
- **HUD Bottom Wrap** — wenn Abilities ganz unter Menu-Button wandern, wird der
  bottom `hudWrap` optional (Toggle in Settings) oder fällt weg.

### Survives

- SDK-Event-Model bleibt unverändert.
- Missionen & Tutorial bleiben; Texte müssen ggf. nachgezogen werden.
- v0.6a-Metrik-Layer (P&L, Sharpe, ATR) bleibt.
- v0.7a-Game-Modes (`timeismoney` default, `creative`, `trade`) bleiben.
- Multi-Asset, Strategy-Overlay, Shadow-P&L bleiben.

---

## Part 5 — Suggested Order of Operations

**Heute (v0.8a — Quick Wins Batch):** Items 1–7 als ein Commit. Low risk, hoher
Legibility-Gewinn, kein Architekturrisiko. Playtest-Pass nach dem Batch.

**Nächste Session (v0.8b):** Items 8–11. Trailing-Stop + neue Monster + Coach
Footer (sobald Persönlichkeit festgelegt) + Chart-Movement-Overlay.

**Danach (v0.8c):** ChartRunnerOS. Das ist der Look-Pivot, braucht Zeit für Mac-
Aesthetic-Details. Audio-Layer kann hier parallel laufen wenn Tone.js
freigegeben wird.

**Parallel zu 0.8c (v0.8d):** Upside-Down-Pivot starten, **sobald Klärungsfrage
1+2 beantwortet sind**. Sonst Monster-Mode-Separation ohne Inhalt sinnlos.

**Zum Schluss (v0.8e):** End-of-Run Swap-Screen und Solana-Mock. Bridge zu
realem Mint bleibt Phase 2.

**Phase 1 (eigener Track):** Dexscreener-Pullover läuft orthogonal, setzt nicht
auf v0.8 auf. Könnte vor oder nach v0.8e in Production.

---

## Part 6 — Reminders (aus SKILL.md)

- Single File · Vanilla JS · kein Build · keine neuen Deps (Ausnahme Tone.js
  braucht expliziten Call von Julian).
- SDK ist der einzige Order-Issuer. Abilities nie direkt ans Netz/Canvas.
- Topbar ≤ 5 Elemente — v0.8 zieht das wieder gerade.
- Jede Mission/jeder Tutorial-Step muss auf jedem Timeframe spielbar bleiben.
- Playtest-Subagent nach jedem UI-touchenden Commit (flows A+E reichen für
  Quick Wins; A+E+F für Monster-Arbeit; komplett nach Architektur-Pivot).
- Determinismus: alle neuen Monster-Spawns müssen durch `mulberry32` laufen,
  sonst zerbricht Daily Challenge sobald sie landet.

---

## Part 7 — First slice to cut this session

**Empfehlung: v0.8a Quick Wins Batch (#1–#7) + dieses Backlog-Doc selbst.**

Konkret:
1. Diese Datei committen (hast du gerade gelesen).
2. Batch-Edit: Items 1–7 in einem zusammenhängenden `Edit`-Durchgang.
3. `node --check` auf Script-Body.
4. Playtest-Subagent Flow A (first-time player) + Flow E (ability use).
5. Commit: `v0.8a — quick wins (topbar, auto-perspective, ability cooldowns,
   closable windows)`.

Das lässt v0.8b (neue Abilities/Monster/Coach) für die nächste Session sauber
offen, sobald Klärungsfrage 3 (Coach-Persönlichkeit) beantwortet ist.
