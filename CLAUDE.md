# ChartRunner — Arbeitsregeln für Sessions

Diese Datei ist der verbindliche Kontext für jede Code-Session in diesem Repo.
Vor jeder Änderung lesen. Kurz und konkret gehalten; im Zweifel gewinnen die
tatsächlichen Workflows unter `.github/workflows/` und der Leakage-Guard
`scripts/check_public_leakage.mjs`.

## Kontext: Phone-First

Der Owner (Julian) arbeitet vom Telefon aus. **Kein Schritt darf lokalen
Mac-/Desktop-Zugriff voraussetzen.** Die komplette Deploy-Kette läuft ohne
lokale Maschine:

```
Code-Session  →  Branch + PR nach main  →  Julian merged am Telefon  →  GitHub Actions deployt
```

Alles, was ein Mensch tun muss, muss sich vom Telefon aus erledigen lassen
(mergen, Actions manuell dispatchen, Live-URL prüfen). Konsequenz für Sessions:
Verifikation vollständig automatisieren oder als exakte Telefon-Schritte in den
PR schreiben — nie „mach das eben lokal".

## Workflow-Regeln

- **IMMER** Branch + PR nach `main`. **NIE** direkt auf `main` pushen.
- **PR-Text** enthält zwingend: (1) was geändert wurde und warum, (2) exakte
  Verifikationsschritte fürs Telefon (klickbare Live-URL, was dort zu sehen sein
  soll, ggf. Versionsstring/Endpoint-Antwort).
- **Vor dem PR** die `ci.yml`-Checks lokal laufen lassen, damit der PR grün
  startet:
  - Leakage-Guard: `node scripts/check_public_leakage.mjs`
  - Inline-Script-Parse-Check: jeder `<script>`-Block in
    `ChartRunner_Prototype.html` muss parsen (siehe `ci.yml` → „Validate every
    `<script>` body parses"). Der Scanner zählt **7** Blöcke — Blöcke mit `src=`
    sind ausgenommen. Wer 8 zählt, benutzt ein anderes Muster.
  - Namenskollisionen: `npm i acorn --no-save && node scripts/check_duplicate_toplevel.mjs`
    — zwei gleichnamige Funktionsdeklarationen im selben Scope kollidieren
    **nicht laut**: die spätere gewinnt, die frühere ist toter Code. Der
    Parse-Check kann das nicht sehen, die Datei ist ja gültig. Genau so hat
    v1.0.874 ein zweites `_crFmtSol` mitgebracht, und die Swap-Tafel benutzte
    nie den Formatierer, den sie mitbrachte.
  - **Achtung beim Banner-Text:** ein literales `<script>` im HTML-Kommentar
    zerlegt den Block-Scanner. Umschreiben („Skriptblock"), nicht escapen.
- **Leakage-Guard nie lockern.** Bei Konflikt die eigenen Namen/Dateien
  anpassen, nicht die Allowlist/Regeln aufweichen. Der Guard ist die maßgebliche
  Grenze zwischen öffentlich und privat.
- **Keine Junk-Dateien committen.** `.fuse_hidden*` ist bereits gitignored;
  bei WIP-/`git add -A`-Commits aufpassen, dass keine lokalen Backups
  (`*_preview.html`, `*.bak*`, `*.backup*`) o. Ä. reinrutschen — der Guard
  blockt sie ohnehin.

### Öffentlich vs. privat (Leakage-Guard)

Privater Namespace und private Infrastruktur gehören **nicht** ins öffentliche
Repo, sondern ins private Repo `ssjjul3/chartrunner-infra`. Tabu sind u. a.:
private `cr`-Labs-/Bot-Bridge-Flags und -Panels, Referenzen auf den privaten
Home-Server bzw. dessen Tailnet, Partner-Submission-Dokumente, private
Milestone-/Evaluator-Notizen und private SDK-Artefakte.

Die **maßgebliche, immer aktuelle** Liste (Pfade + Textmarker) steht in
`scripts/check_public_leakage.mjs` (`FORBIDDEN_PATHS` / `FORBIDDEN_TEXT`) — dort
nachsehen statt raten, denn die Klassifizierung ändert sich (manche Personas/
Adapter wurden bewusst als *public* freigegeben). Hinweis: Genau deshalb nennt
diese Datei die verbotenen Marker nicht wörtlich — täte sie es, würde der Guard
CLAUDE.md selbst als Leak flaggen.

## Deploys

### `pages.yml` — statische Surfaces → chartrunner.xyz

- Push auf `main` (Pfad-getriggert) baut ein Pages-Artefakt mit mehreren
  Surfaces:
  - `/` → Landing (`chartrunner-prototype/`)
  - `/play/` → das kanonische Spiel (`ChartRunner_Prototype.html`)
  - `/telegram/` → Telegram Mini App (best-effort)
  - `/solana-connect/` → Vite/React (best-effort)
- **Core-Surfaces** (`/`, `roadmap.html`, `/play/`) deployen immer; schlägt eine
  davon fehl, bricht der Deploy bewusst ab. `telegram/` und `solana-connect/`
  sind `continue-on-error` — ein Bruch dort blockiert das Kern-Deploy nicht.
- Nach erfolgreichem Deploy purged der Workflow den Cloudflare-Cache der Zone
  `chartrunner.xyz` (`purge_everything`).

### `deploy-workers.yml` — Cloudflare Workers

- Auto-Discovery: jeder Ordner `workers/*/` mit `wrangler.toml`/`.jsonc`/`.json`
  wird per `wrangler deploy` deployt. Node 22. Neuen Worker hinzufügen = Ordner
  unter `workers/<name>/` mit Wrangler-Config anlegen, keine Workflow-Edits nötig.
- **ACHTUNG Push-Trigger:** Auf Push nach `main` deployt der Workflow nur
  Worker, deren **eigene Pfade** (`workers/**`) sich geändert haben. Ein reiner
  Workflow-only-Commit (nur `.github/workflows/deploy-workers.yml`) ergibt einen
  **grünen Leerlauf-Run ohne Deploy**. Dann per `workflow_dispatch` manuell
  dispatchen (Input `worker: all` oder ein einzelner Dir-Name).

### Grüner Run ≠ live

Ein grüner Actions-Run heißt nicht, dass die Änderung live ist (Cache, Trigger-
Leerlauf, best-effort-Surface übersprungen). **Nach jedem Deploy cache-busted
gegen die Live-Domain verifizieren** — z. B. Versionsstring auf der Seite bzw.
Endpoint-Antwort des Workers prüfen (`?_=<nonce>` anhängen, um den Edge-Cache zu
umgehen).

## Infrastruktur-Karte

- **Cloudflare-Zone `chartrunner.xyz`:** Apex + `www` proxied. `rooms` sowie die
  Mail-Records sind bewusst **DNS only** — `rooms` macht sein eigenes TLS und
  darf **nie** proxied werden.
- **Worker-Route** `chartrunner.xyz/hermes/*` → Worker
  `chartrunner-hermes-proxy` (Pyth-Hermes-Proxy; injiziert serverseitig das
  Secret `HERMES_API_KEY`, hält den Key vom Client fern).
- **Multiplayer:** `wss://rooms.chartrunner.xyz` (Hetzner; `/health` + `/stats`;
  SSH nur Julian). `relay.chartrunner.xyz` ist Legacy/Home-Server und
  unzuverlässig — nicht als primär annehmen.
- **CI-Secrets (Repo-Secrets):** `CLOUDFLARE_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID`. Worker-**Runtime**-Secrets (z. B. `HERMES_API_KEY`)
  setzt Julian im Cloudflare-Dashboard bzw. per `wrangler secret` — nicht im
  Repo.

## Spielregeln (unverändert gültig)

- **Single-File:** Der gesamte Spielcode lebt in `ChartRunner_Prototype.html`.
  **Kein Build-Schritt, keine neuen Dependencies, kein CDN.** Alles inline.
- `ChartRunnerSDK` ist die **einzige** Order-Instanz — Orders laufen nur darüber.
- **Rendering und Abilities kreuzen sich nicht** — sauber getrennt halten.
- **Topbar: maximal 5 Elemente.**
