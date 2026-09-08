# ChartRunner — Ownership worker

Serverseitiges Besitz-Register. Der Worker ist der **einzige** Schreibweg zu
`verified = true`; alles andere darf der Client selbst behaupten und ist dann
eben *nicht* verifiziert.

* Worker: `chartrunner-ownership`
* Routen: `chartrunner.xyz/ownership/*`, `chartrunner.xyz/loadout*`
* Tabellen/RPCs: `chartrunner_ownership_migration.sql` (einmal im Supabase-SQL-Editor ausführen)
* Tests: `node scripts/check_ownership_worker.mjs` · `DATABASE_URL=… node scripts/check_ownership_migration.mjs`

## Warum es das gibt

Besitz und Ausrüstung liegen heute autoritativ im `localStorage`
(`cr_owned_bots_v1`, `cr_owned_gear_v1`, `cr_equipped_*`). Wer die Konsole
öffnet, besitzt, was er hineinschreibt. Solange das der einzige Nachweis ist,
kann der Server bei **keinem** bezahlten Unlock, **keinem** Turnier-Preisgeld und
**keiner** Marketplace-Transaktion prüfen, ob jemand hat, was er behauptet.

Das Register löst das nicht dadurch, dass es dem Client mehr glaubt. Es trennt
den Nachweis in zwei Hälften und sagt, welche welche ist:

| provenance | verified | wer schreibt |
| --- | --- | --- |
| `starter` | true | Server (Regel, kein Beleg nötig) |
| `purchase_onchain` | true | **nur dieser Worker**, nach Prüfung einer Solana-Tx |
| `subscription` | true | **nur dieser Worker**, nach Prüfung des Abos |
| `grant` | true | **nur dieser Worker**, mit Admin-Secret |
| `campaign` | **false** | der Client darf es behaupten |
| `softcurrency` | **false** | der Client darf es behaupten |

**Die Regel, die alles trägt:** nur `verified = true` öffnet je etwas mit echtem
Geld (Turnier-Entry, Preisgeld, Marketplace-Verkauf, bezahlter Tier).
Freigespieltes und mit `$RUN` Gekauftes bleibt für Gameplay und Kosmetik voll
gültig — es gilt nur nicht als Vermögenswert. Bewusst so geschnitten:
serverseitig validierte Spielläufe wären ein Vielfaches an Aufwand und für
Kosmetik gegenstandslos.

Die Regel ist zusätzlich eine **Check-Constraint** auf der Tabelle, nicht nur
eine Zeile Code — sonst könnte ein einziger unachtsamer Service-Role-Schreibzug
(der RLS *und* die RPCs umgeht) eine verifizierte Kampagnen-Zeile anlegen.

## Routen

### `GET /ownership/health`
Ohne Auftrag aufrufbar. Nennt Endpunkte, Regeln (welche provenance der Client
behaupten darf, Starter-Items, Nonce-TTL), Kill-Zustand und — als **Booleans,
nie als Werte** — was konfiguriert ist. Unter `build.git_sha` steht der Commit,
der tatsächlich läuft (`deploy-workers.yml` injiziert ihn beim Deploy). Ist
`GIT_SHA` nicht injiziert, steht dort `null` plus Begründung im Klartext, statt
einer erfundenen Zahl.

### `GET /ownership/list?owner_kind=&owner_id=`
Liest den **eigenen** Besitz. Der Worker prüft das JWT (`GET /auth/v1/user`,
uid ausschließlich aus dieser Antwort) und ruft die RPC dann **mit dem JWT des
Aufrufers** auf: die Eigner-Regel steht damit an genau einer Stelle, in der
Datenbank. Fremde Identität → leere Menge (aus der Datenbank).
Kein Token → `401`. Register nicht erreichbar → `502` **ohne** `items`-Feld —
ein Ausfall darf nicht wie „du besitzt nichts" aussehen.

### `POST /ownership/link-wallet`
Zwei Schritte, kein Speicher nötig:

1. `{action:'challenge', wallet}` → `{nonce, message, expires_in_s}`.
   Die Nonce ist HMAC-signiert und trägt Wallet **und uid** und Ablauf.
2. `{action:'verify', wallet, nonce, signature}` → Ed25519-Prüfung über
   WebCrypto gegen exakt die `message` aus Schritt 1 (Domain + Wallet + Konto +
   Nonce). Erst danach die Zeile in `cr_wallet_link`.

Die uid steckt in der Nonce, weil sie sonst fehlte: ein mitgeschnittenes Paar
aus Nonce und Signatur ließe sich sonst innerhalb der TTL von **jemand anderem**
einlösen und würde eine fremde Wallet an das eigene Konto binden. Kein Geld,
keine Kette — nur eine Nachrichten-Signatur.

### `POST /ownership/grant`
Der einzige Weg zu `verified = true`. Aufrufer ist entweder der Eigner selbst
(JWT) oder Admin (`X-Ownership-Admin`). Geschrieben wird **erst nach** der
Prüfung des Belegs:

* `purchase_onchain` — Preis und Empfänger kommen aus dem **serverseitigen**
  Katalog (`src/catalog.js` bzw. `OWNERSHIP_CATALOG_JSON`) und dem
  `OWNERSHIP_TREASURY`, **nie** aus dem Request. Geprüft wird per
  `getTransaction`: Transaktion existiert, `meta.err = null`, ein Signer ist die
  Eigner-Wallet (bei `owner_kind=account`: eine verknüpfte Wallet), und die
  Bilanzdifferenz der Treasury ≥ Preis. Eine Signatur kauft **einen** Artikel —
  ein zweiter Versuch mit derselben Signatur ist `signature_already_used`.
* `subscription` — es gibt heute **keinen** Abo-Pfad in ChartRunner. Ohne
  `STRIPE_SECRET_KEY` antwortet der Worker `503
  subscription_verifier_not_configured` und schreibt nichts; mit Key prüft er
  ein echtes Abo (`active`/`trialing`) und dass die Kunden-Mail dem Konto
  gehört. Ein Stub, der „ok" sagt, wäre genau die Lüge, gegen die es hier geht.
* `grant` — nur mit `OWNERSHIP_ADMIN_SECRET` und mit `evidence.reason`.
* `starter` — nur für die serverseitige Starter-Liste (`det_sfp`, `det_climax`,
  `det_vwap`).

Fehlgeschlagene Prüfung: `403` mit Klartext-Grund, **keine** Zeile. Ausfall der
RPC/des Registers: `502` — nie `403`, sonst bekäme ein echter Zahler zu hören,
seine Zahlung sei erfunden.

### `GET|POST /loadout` (auch `/ownership/loadout`)
Sync von equipped bots/tools. Keine Autorität, letzter Schreiber gewinnt;
`updated_at` ist der Tiebreaker (ein `updated_at` im POST verliert gegen eine
neuere Zeile). Gibt es noch keine Zeile, **fehlt** das Feld `data` — es ist nicht
`null` und nicht `{}`, denn `{}` wäre ein Loadout.

## Sicherheit

* Der Worker **signiert nichts** und bewegt kein Geld. Kein Keypair, nirgends.
* Der Service-Role-Key existiert nur hier (Wrangler-Secret), geht nur an
  Supabase und steht in keiner Antwort und in keiner Logzeile
  (`scripts/check_ownership_worker.mjs` prüft beides über alle Antworten der
  Suite).
* Ein Aufrufer kann ausschließlich seinen eigenen Besitz lesen und über die
  RPC ausschließlich **unverifizierte** Zeilen erzeugen.
* `OWNERSHIP_KILL=1` stoppt jeden Schreibweg ohne Code-Deploy; Lesen antwortet
  weiter, und `/health` sagt den Zustand.

## Secrets setzen (phone-first)

```
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name chartrunner-ownership
wrangler secret put OWNERSHIP_NONCE_SECRET    --name chartrunner-ownership   # z. B. 32 zufällige Bytes hex
wrangler secret put OWNERSHIP_ADMIN_SECRET    --name chartrunner-ownership
wrangler secret put STRIPE_SECRET_KEY         --name chartrunner-ownership   # optional
```

Vom Telefon aus geht das über den `setup-*`-Weg bzw. das Cloudflare-Dashboard
(Workers → chartrunner-ownership → Settings → Variables). Welche Secrets gesetzt
sind, zeigt der Workflow **Audit Worker Secrets** (`workflow_dispatch`, Input
`chartrunner-ownership`) — er nennt nur Namen, nie Werte.

## Abnahme nach dem Deploy

```
curl -s "https://chartrunner.xyz/ownership/health?_=$(date +%s)"
```

* `endpoints` muss alle sechs Zeilen nennen (gemerged ist nicht ausgerollt).
* `configured.service_role_key` muss `true` sein, sonst ist das Secret nicht gesetzt.
* `GET /ownership/list` mit gültigem JWT muss für ein frisches Konto
  `{"ok":true,…,"items":[]}` liefern — eine leere Liste, keinen Fehler.

## Was hier NICHT passiert

Der Client bleibt unverändert — die Umstellung des Spiels von `localStorage` auf
dieses Register ist Auftrag B. Bis dahin liest und schreibt das Spiel weiter
lokal; das Register läuft daneben und ist leer, bis es benutzt wird.
