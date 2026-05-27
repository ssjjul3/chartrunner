# ChartRunner — Abilities vs. TradingView Native (Phase 1 Audit)

**Frage:** Welche der 8 aktuellen Slot‑Abilities spiegeln eine *native* TradingView‑Funktion (Drawing‑Tool **oder** Order‑Typ im Trade‑Panel) und welche sind reine Game‑Fantasie, die in einem TV‑Host‑Context keine Entsprechung hat?

**Kriterium:** Eine Ability gilt als "TV‑nativ spiegelbar", wenn die Phase‑1‑Adapter‑Schicht sie **1:1 an eine vorhandene TV‑Primitive routen kann** — entweder als Order (via Broker‑Integration) oder als Drawing‑Tool (via Chart‑API). Alles andere braucht Reframing oder muss im TV‑Host stumm geschaltet werden.

---

## Kurzfassung

| # | Slot | TV‑Spiegelung | Phase‑1‑Verhalten |
|---|---|---|---|
| 1 | 🪜 Ladder | ✅ Native | Keep 1:1 — Scaled‑Entry im Long/Short‑Dialog |
| 2 | 🎯 Bracket | ✅ Native | Keep 1:1 — Bracket‑Order im Trade‑Panel |
| 3 | ⇅ OCO | ✅ Native | Keep 1:1 — OCO‑Order im Trade‑Panel |
| 4 | 🪂 Hedge | ❌ Kein TV‑Pendant | Reframe → **Inverse Bracket** |
| 5 | 📡 Radar | ⚠️ Adjacent | Reframe → **Volume‑Profile‑Toggle** |
| 6 | 🚁 Rescue | ❌ Kein Drawing | Reframe → **Flatten‑All** (Broker‑Action) |
| 7 | 🧲 Magnez | ❌ Pure Game | **Hide in TV‑Host**, Standalone‑only |
| 8 | 📉 Trail | ✅ Native | Keep 1:1 — Trailing‑Stop im Trade‑Panel |

**Score:** 4 Abilities 1:1 TV‑nativ · 1 Adjacent · 3 müssen reframed oder versteckt werden.

---

## 1. 🪜 Ladder — *Native, Keep*

**TV‑Status:** **Teil des Long/Short‑Order‑Flows.** Gestaffelte Limit‑Entries (Scaled Entry / DCA Entry) und Split‑TP‑Level sind Standard‑Inhalt von TV's Long‑ und Short‑Order‑Dialogen. Jeder Broker‑Connect, der Long/Short kann, kann auch N gestaffelte Limits — das ist keine exotische Composite‑Konstruktion, sondern der normale Weg, wie Trader skalierte Einstiege in TV platzieren.

**Phase‑1‑Adapter:** `sdk.ladder({side, rungs, spacing, size, price})` → `broker.placeScaledEntry({side, levels, sizePerLevel})`. Wo der Broker Scaled‑Entry nicht als First‑Class‑Order führt, zerfällt der Call in N × `broker.placeLimit()` — das ist für TV aber **dasselbe UX**, weil der User es manuell genauso baut.

**Verdict:** ✅ **Bleibt drin, 1:1.** Rangiert mit Bracket/OCO/Trail als Flaggschiff. Die Game‑Leiter‑Metapher übersetzt sauber in "Scaled Entry" — das ist sogar ein *besseres* Lernziel als Bracket allein, weil Scaled Entries seltener richtig gemacht werden.

---

## 2. 🎯 Bracket — *Native, Keep*

**TV‑Status:** Vollständig nativ. TV's Trade‑Panel hat einen eigenen "Bracket Order"‑Typ (Entry + attached TP + attached SL). Die `risk/rr/slDistance`‑Semantik der SDK mappt sauber auf TV's Long‑Short‑Order‑Dialog.

**Phase‑1‑Adapter:** `sdk.bracket({risk, rr, side, price, slDistance})` → `broker.placeBracketOrder({entry, tp, sl})`. Die Editor‑Logik (Size via Risk, RR‑Multiplikator) bleibt vor dem Broker — nur die finalen Zahlen wandern raus.

**Verdict:** ✅ **Bleibt drin, 1:1.** Die Flaggschiff‑Ability. Sie rechtfertigt sogar den gesamten Game‑Layer: "Du lernst TV‑Bracket‑Orders als Muscle Memory."

---

## 3. ⇅ OCO — *Native, Keep*

**TV‑Status:** Nativ auf allen verbundenen Brokern, die OCO unterstützen (Binance, Bybit, Interactive Brokers etc.). "One Cancels Other" ist ein Standard‑Order‑Typ.

**Phase‑1‑Adapter:** `sdk.oco({upper, lower, size, price})` → `broker.placeOCO({stopBuy: upper, stopSell: lower, size})`. Die beiden Order‑IDs (`a.id`, `b.id`), die das Game bereits trackt, sind genau das, was TV zurückliefert.

**Verdict:** ✅ **Bleibt drin, 1:1.** Perfekte Spiegelung.

---

## 4. 🪂 Hedge — *Reframe*

**TV‑Status:** Kein natives "Hedge"‑Tool und kein natives "Hedge"‑Drawing. Manche Broker haben Hedge‑Mode‑Positionen (simultan Long + Short auf demselben Asset), aber TV selbst bietet kein Ein‑Klick‑Hedge im Chart.

**Problem:** `hedgeParachute({duration:6})` spawnt im Game eine kurzlebige Gegenposition, die nach 6 Sekunden auto‑schließt. Das gibt es auf TV so nicht — **eine Position ohne Close‑Trigger existiert in der echten Welt unbegrenzt**.

**Reframe → "Inverse Bracket":** Statt einer magischen 6‑Sekunden‑Pufferposition wird Hedge zu einer **gespiegelten Bracket‑Order**: wenn du Long bist, legt Hedge eine Short‑Bracket mit engem TP (1R) und gleicher Size an. Schließt automatisch bei TP oder SL — das ist der "Fallschirm". Fällt damit zurück auf Primitive #2 (native Bracket), nur inverse.

**Phase‑1‑Adapter:** `sdk.hedgeParachute({duration})` → `sdk.bracket({side: opposite, rr: 1, slDistance: tightRange})`. Das `duration`‑Feld verschwindet, weil TV keine Zeit‑basierten Auto‑Closes nativ kennt.

**Verdict:** 🔧 **Reframe notwendig.** Game‑Mechanik bleibt erlebbar (kurzlebige Gegenposition), aber intern läuft alles über Bracket. Kein zusätzlicher SDK‑Primitive nötig.

---

## 5. 📡 Radar — *Reframe (Indicator‑Toggle)*

**TV‑Status:** Kein "Radar"‑Tool. **Aber:** TV hat native Indikatoren, die dasselbe Ziel erfüllen — Liquiditätszonen sichtbar machen:
- Volume Profile (Fixed Range, Session, Visible Range)
- Auction Market Theory Zonen
- Third‑Party Liquidity‑Heatmaps (z.B. Hyblock, Coinglass via Pine)

**Problem:** `liquidityRadar({range:320})` zeichnet eigene Overlays, die im Game frei erfunden sind. In einem TV‑Host wäre das eine Parallel‑Zeichnung *neben* TV's eigenem Volume Profile — verwirrend.

**Reframe → "Liquidity Lens":** Radar wird zu einem **Visibility‑Toggle für TV's Volume Profile Indicator**. Cast Radar → TV's Fixed Range VP wird auf sichtbarer Range ein‑/ausgeblendet. Die 5‑Sekunden‑Dauer bleibt als Game‑Feeling (Pulse‑Animation über den VP‑Layer), aber die Daten kommen aus TV, nicht aus der SDK.

**Phase‑1‑Adapter:** `sdk.liquidityRadar({range})` → `chartHost.toggleIndicator('VolumeProfileFixedRange', {visible: true, duration})`. Fallback im Standalone: weiter das hausinterne Radar‑Overlay.

**Verdict:** 🔧 **Reframe zu Indicator‑Toggle.** Gameplay bleibt (ephemeres Reveal), aber Datensouveränität liegt bei TV.

---

## 6. 🚁 Rescue — *Reframe (Flatten‑All)*

**TV‑Status:** Kein "Rescue"‑Tool. **Aber:** jeder TV‑Broker‑Connect hat einen **"Close All Positions"** bzw. **"Flatten"**‑Button im Trade‑Panel.

**Problem:** `rescueDrone()` ist im Game ein gamified Panic‑Close + Immunity. Der Immunity‑Teil ist pure Fantasy; der Close‑Teil ist Standard.

**Reframe → "Eject":** Rescue wird zur Ein‑Klick‑**Flatten‑Action**, die alle offenen Brackets + Ladder‑Rungs schließt (Market‑Close). Die Game‑Animation bleibt (der Drone holt den Runner raus), aber der SDK‑Call wird zu `sdk.closeAll()`, der im TV‑Host zu `broker.closeAllPositions()` wird.

**Phase‑1‑Adapter:** `sdk.rescueDrone()` → `broker.closeAllPositions(symbol)`. Der "Immunity" / "Safe Zone"‑Teil des Game‑Feelings verschwindet in TV — oder wird zu einem 3‑Sekunden‑Cooldown auf weiteres Order‑Placement (client‑side).

**Verdict:** 🔧 **Reframe zu Flatten‑All.** Die bekannteste Broker‑Action, einzigartig wichtig für Panic‑Management. Lohnt sich, als Game‑Ability prominent zu halten.

---

## 7. 🧲 Magnez — *Game‑Only*

**TV‑Status:** **Null Entsprechung.** TradingView hat zwar einen "Magnet Mode" — aber das ist ein **Drawing‑Snap** (Linien rasten auf Candle‑Highs/‑Lows ein), nicht ein Magnet für Pickups. Komplett andere Semantik.

**Problem:** `magnez({duration:6, range:260})` zieht $CHART‑Orbs in den Runner. $CHART existiert nicht in TV. Pickup‑Orbs existieren nicht in TV. Es gibt hier nichts zu spiegeln.

**Verdict:** ❌ **Im TV‑Host versteckt.** Im Standalone‑Mode bleibt Magnez drin (dort gibt es $CHART). Im Phase‑1‑TV‑Adapter wird der Slot entweder leer gelassen oder durch eine Phase‑2‑Ability ersetzt (z.B. einen der 11 neuen TV‑Drawing‑Tools aus dem Brainstorm).

**Empfehlung:** Phase‑1‑Code‑Guard — `if(chartHost.mode === 'tv') slot7.hidden = true;`. Slot 7 wird dann frei für z.B. **Fib Retracement** (siehe Brainstorm #5) oder **Horizontal Line** (Brainstorm #1).

---

## 8. 📉 Trail — *Native, Keep*

**TV‑Status:** Nativ im Trade‑Panel als **Trailing Stop Order**. Die meisten Broker unterstützen es. TV rendert den Trailing‑SL als bewegliche Linie, genau wie ChartRunner das schon tut (v0.8b Drag‑System).

**Phase‑1‑Adapter:** `sdk.trailStop({id})` → `broker.modifyOrder(id, {type: 'trailing_stop', trailBy: distance})`. Die SL‑Linie, die im Game nach oben folgt, wird durch TV's eigene Trailing‑Stop‑Line ersetzt.

**Verdict:** ✅ **Bleibt drin, 1:1.** Zweite Flaggschiff‑Ability. Kombination mit Bracket (#2) ist genau das, was TV‑Pro‑User manuell bauen.

---

## Die neue Palette (7 Slots, Magnez raus)

Nach dem Audit und der Magnez‑Löschung sieht die Palette so aus. Ordnungs‑Regel: **TV‑Nativ zuerst, Reframes danach, Drawing‑Tools an der hinteren Kante** (Slot 8 ist die geplante Andock‑Stelle für die TV‑Drawing‑Familie aus dem Brainstorm, startend mit Horizontal Line).

### Aktive Palette — ship heute

| Slot | Key | Ability | Klasse | TV‑Primitive |
|---|---|---|---|---|
| 1 | `1` | 🪜 **Ladder** | TV Native | Scaled‑Entry (Long/Short‑Dialog) |
| 2 | `2` | 🎯 **Bracket** | TV Native | Bracket‑Order |
| 3 | `3` | ⇅ **OCO** | TV Native | OCO‑Order |
| 4 | `4` | 🪂 **Hedge** | Reframe | → Inverse Bracket |
| 5 | `5` | 📡 **Radar** | Adjacent | → Volume‑Profile‑Toggle |
| 6 | `6` | 🚁 **Rescue** | Reframe | → Flatten‑All |
| 7 | `7` | 📉 **Trail** | TV Native | Trailing‑Stop |

**Klasse‑Farbcodierung (HUD‑Hinweis):** Die drei Klassen können langfristig einen leisen visuellen Rand bekommen — z.B. TV‑Native in neutralem Weiß, Reframes in leichtem Ocker, Adjacent in Cyan. Kein Marketingschrei; nur ein Signal für den Spieler, welcher Slot "echte TV‑Order" vs. "Game‑Alias" ist. Kann später folgen; nicht blockierend.

### Reservierter Slot — next tool

| Slot | Key | Ability | Klasse | Quelle |
|---|---|---|---|---|
| 8 | `8` | 📏 *Horizontal Line* | TV Drawing | *Brainstorm #1* |

Slot 8 wird der Einstiegspunkt für die **TV‑Drawing‑Tools‑Familie** aus `ChartRunner_TV_Tools_Brainstorm.md`. Horizontal Line ist der saubere Erstling: pure Overlay, keine Order, lehrt das Tripwire‑Pattern und verbindet sich direkt mit Slot 2 (`sdk.bracket().armOnCross(line)`). Wenn der erste Drawing‑Tool‑Slot gesetzt ist, folgen die anderen 10 aus dem Brainstorm als Chart‑Right‑Click‑Menü (keine weiteren Hotkey‑Slots), damit die Palette nicht aufquillt.

### Warum diese Reihenfolge

**Slots 1‑3 sind der Einstiegsweg.** Ladder → Bracket → OCO ist der natürliche Lern‑Bogen: "wie baue ich Entry" → "wie mache ich einen Trade sicher" → "wie setze ich Entry‑Breakout auf Autopilot". Jede dieser drei ist 1:1 TV‑Nativ, was heißt: der Spieler baut Muscle Memory für das echte Trade‑Panel.

**Slots 4‑6 sind die Defensiv‑Schicht.** Hedge (Gegenbracket), Radar (was‑sehe‑ich‑an‑Liquidität), Rescue (panic close). Das sind keine Entry‑Primitives mehr — sie managen, visualisieren, retten. Dort landen die Reframes, weil Reframes per Definition kein 1:1‑TV‑Äquivalent haben und daher nicht das Onboarding tragen dürfen.

**Slot 7 ist der Profi‑Move.** Trail ist fortgeschritten — er setzt voraus, dass der Spieler schon eine Bracket‑Position hat, auf die er sich stülpt. Auf Slot 7 statt Slot 4, weil er keine Onboarding‑Ability ist, sondern ein Skill‑Expander.

**Slot 8 ist Zukunft.** Reserviert für das erste Drawing‑Tool (Horizontal Line). Dort landet Phase 1's neue Tool‑Familie — pure Overlays, keine Orders, die sich an die TV‑Native‑Order‑Slots hinten anschließen.

### Was rausgeflogen ist

| Slot (alt) | Ability | Grund |
|---|---|---|
| 7 (alt) | 🧲 Magnez | Null TV‑Entsprechung. $CHART‑Pickup‑Magnet ist reines Game‑Feature, lehrt keine Trading‑Primitive. Im Phase‑1‑TV‑Host wäre er ohnehin unsichtbar. Gelöscht — nicht versteckt. |

**Wichtig:** Magnez war nicht "falsch" — er hat in v0.7b den $CHART‑Economy‑Loop unterstützt. Aber in der TV‑Spiegelungs‑Logik bricht er die Identität "jede Ability = ein TV‑Tool". Besser raus als halb drin. Der freigewordene Slot wandert nicht zu einer neuen Game‑Fantasie, sondern zu Trail (hochrücken) und öffnet Slot 8 für das erste echte TV‑Drawing‑Tool.

### Telemetrie‑Check (für Phase 1)

Wenn die Adapter‑Schicht steht, lohnt ein Event‑Log über drei Runs zu messen:

- **% Abilities auf TV‑Nativ‑Slots 1‑3 + 7 vs. Reframe‑Slots 4‑6.** Ziel: ≥ 70% der Ability‑Aktivierungen sollten auf die Nativ‑Slots gehen. Tun sie das nicht, ist das Onboarding zu reframe‑lastig.
- **Trail‑Adoption (Slot 7).** Wird Trail nach Bracket auch wirklich genutzt, oder bleibt er ungedrückt? Niedrige Adoption = Slot‑7‑Sichtbarkeit ist zu schwach; Kandidat für eine spezielle Tutorial‑Mission.
- **Rescue‑Frequenz (Slot 6).** Wird der Flatten‑All‑Knopf regelmäßig gezogen? Wenn ja → Risk‑Management funktioniert. Wenn nie → das Spiel ist zu einfach und Rescue kann in ein späteres Tutorial verschoben werden, um Slot 6 freier zu halten.

---

## Architektur‑Konsequenz

**Die `ChartRunnerSDK`‑Oberfläche muss ein "host‑capability flag" bekommen.** Nicht alle Methoden sind in allen Hosts sinnvoll:

```js
sdk.capabilities = {
  bracket: true,           // Standalone + TV
  ladder: true,            // Standalone + TV
  oco: true,               // Standalone + TV
  hedgeParachute: 'alias', // In TV: alias → inverseBracket()
  liquidityRadar: 'alias', // In TV: alias → toggleIndicator()
  rescueDrone: 'alias',    // In TV: alias → closeAll()
  magnez: 'standalone',    // In TV: no‑op, slot hidden
  trailStop: true,         // Standalone + TV
};
```

Das macht Phase 1 zu einem **Capability‑Mapping**, nicht zu einem Rewrite. Jede Ability entscheidet anhand von `sdk.capabilities[name]`, ob sie die originale Game‑Logik oder den TV‑Alias fährt — das bleibt im Einklang mit Hard Rule #3 (*SDK ist der einzige Order‑Emitter*).

---

## Fazit

**4 von 8 Abilities sind 1:1 TV‑nativ** (Ladder, Bracket, OCO, Trail) — alle vier sind Standard‑Inhalt des Trade‑Panels bzw. der Long/Short‑Order‑Dialoge.

**2 von 8 brauchen ein Semantik‑Reframe** (Hedge → Inverse Bracket, Rescue → Flatten‑All) — aber beide Reframes landen wieder auf *anderen TV‑nativen Primitiven*, also kein echter Verlust.

**1 von 8 ist Indicator‑adjacent** (Radar → Volume‑Profile‑Toggle) — TV hat den Datenhintergrund nativ als Indikator, Game liefert nur die Pulse‑Choreografie drumherum.

**1 von 8 ist reines Game‑Feature** (Magnez) und gehört in Phase 1 versteckt. Sein Slot wird der Einstiegspunkt für die TV‑Drawing‑Tool‑Familie aus dem Brainstorm.

**Kein einziger aktueller Slot muss geschlachtet werden.** Der Game → TV‑Port ist damit ein **Capability‑Mapping‑Projekt**, kein Rewrite — genau das Ziel von Phase 1.
