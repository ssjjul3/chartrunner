# Cloudflare Deploys — Mac-free Handoff

**Branch:** `claude/cloudflare-deploys-mac-frei-pylm2n`
**Date:** 2026-07-22
**Goal:** make Cloudflare Worker deploys + cache purge run from CI (no Mac, no
local `wrangler login`), and stand up the Pyth Hermes mandatory-auth proxy.

> **Half of this document is history, not instructions (note added 2026-09-20).**
> The CI deploy chain it describes is still how this repository works. The
> **Hermes proxy half is not**: Pyth was removed as a price source on
> 2026-09-20, `workers/hermes-proxy/` is deleted, and `HERMES_API_KEY` was never
> set in the two months this document spent asking for it. The former §4
> ("Hermes proxy status") and its key-setting recipe are gone from this file,
> because a recipe for keying a worker that no longer exists is worse than no
> recipe. The worker and the route `chartrunner.xyz/hermes/*` still exist in the
> Cloudflare dashboard until deleted by hand — see `SYSTEM_MAP.md`.

---

## TL;DR — what to do next

1. **Merge this branch to `main`.** That push is what activates the automation
   (I can't push to `main`, and the automation token here can't click "Run
   workflow" — see [§6](#6-trigger--verify-status)). On merge:
   - `deploy-workers.yml` sees `workers/hermes-proxy/**` changed → deploys the
     Hermes proxy + binds the route `chartrunner.xyz/hermes/*`.
   - `pages.yml` runs and exercises the new cache-purge step.
2. **Set the Hermes key** once Pyth sends it (see [§4](#4-hermes-proxy-status)):
   `cd workers/hermes-proxy && npx wrangler secret put HERMES_API_KEY --name chartrunner-hermes-proxy`
3. **Audit existing worker secrets** (Anthropic / Telegram) via the new
   `audit-worker-secrets` workflow → Run workflow (see [§5](#5-secrets-audit)).

---

## 1. Worker inventory (what actually exists)

I searched the whole repo for `wrangler.toml` / `wrangler.jsonc` / worker source
and every `*.workers.dev` reference. Findings:

| Worker | Source in repo? | Route / URL | Notes |
| --- | --- | --- | --- |
| **chartrunner-hermes-proxy** | ❌ retired 2026-09-20 (was `workers/hermes-proxy/`) | `chartrunner.xyz/hermes/*` | Pyth Hermes proxy. Directory deleted with the Pyth cleanup; the deployed script and its route still exist in Cloudflare until removed by hand. |
| **chartrunner-worker** | ❌ not in repo | `chartrunner-worker.jsg-951.workers.dev` (+ `/v1/birdeye`, `/v1/goldrush`, `/v1/mail/alert`) | The live billing / market-data / mail gateway. Referenced by the game + `pricing.html`. Source is **gated** per `docs/PUBLIC_BOUNDARY.md` ("hosted agent transports, private data pipelines … not part of the public surface"). |
| **"Relay"** | ❌ not found | — | No `wrangler.*` and no worker source in this repo. |
| **"Bot-Terminal-Bridge"** | ❌ not found | — | No worker source in this repo. The client refers to bridge URLs (`crAgentBridgeUrl`, `crQvacBridgeUrl` in `SECURITY.md`) but those are client-held URLs, not a worker checked in here. |
| `_to_delete/my-worker/` | ✅ (scaffold) | none | Hello-World `wrangler init` scaffold sitting in `_to_delete/`. **Intentionally excluded** from CI (see below). |

> **Important:** the task assumed Relay + Bot-Terminal-Bridge worker source lives
> in the repo. It does not. I did **not** invent them. The deploy workflow is
> built to **auto-discover** workers, so the moment you add
> `workers/relay/wrangler.toml` (etc.) it deploys with zero workflow edits.

**Why `_to_delete/my-worker/` is not deployed:** the deploy workflow only scans
`workers/*/`, so the scaffold in `_to_delete/` is ignored. If it's truly dead,
consider deleting it; if it's the start of a real worker, move it to
`workers/<name>/`.

---

## 2. `deploy-workers.yml` — automated worker deploys

New file: `.github/workflows/deploy-workers.yml`.

- **Discovery:** finds every `workers/*/` dir that has a `wrangler.toml` /
  `.jsonc` / `.json`. Adding a worker = drop it under `workers/<name>/`. No
  workflow edits needed.
- **Triggers:**
  - `push` to `main` touching `workers/**` → deploys **only the workers whose
    own paths changed** (diffs `github.event.before..github.sha`).
  - `workflow_dispatch` → input `worker` = `all` (default) or a single dir name
    (e.g. `hermes-proxy`).
- **Deploy:** matrix job, one runner per worker, `npx wrangler deploy` in the
  worker dir. `fail-fast: false` so one bad worker doesn't block the others.
- **Auth:** env `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (repo secrets).
  `account_id` is deliberately **not** in `wrangler.toml` — it comes from the
  secret at deploy time.

Verified offline: discovery selects `workers/hermes-proxy`; `wrangler
--dry-run` builds the bundle and accepts the route config (exit 0).

---

## 3. `pages.yml` — cache purge after deploy

Added a **"Purge Cloudflare cache (chartrunner.xyz)"** step after the `Deploy`
step, gated on `if: success()`.

- Resolves the **zone ID at runtime** from the zone **name** (`chartrunner.xyz`)
  via `GET /zones?name=…` → so **no new secret** is needed.
- Then `POST /zones/{id}/purge_cache` with `{"purge_everything":true}`.
- Reuses `CLOUDFLARE_API_TOKEN`. Fails loud (with the CF API error) if the zone
  can't be resolved or the purge is rejected.

> **Token note:** the runtime zone-name lookup needs the token to be able to
> **read** the `chartrunner.xyz` zone. Your token has `Cache Purge:Purge` +
> `Workers Routes:Edit` on the zone, which normally lets `GET /zones?name=` see
> it. If the first real run logs `No zone id resolved…`, add **Zone → Zone:Read**
> to the token (still no repo-secret change needed).

---

## 4. Hermes proxy status — **entfallen (2026-09-20)**

Dieser Abschnitt beschrieb den Bau des Proxys `chartrunner-hermes-proxy` und
die Schritte, um `HERMES_API_KEY` zu setzen, sobald Pyth den Schlüssel liefert.
Der Schlüssel kam nie, der Proxy hat in zwei Monaten keine einzige gekeyte
Antwort gegeben, und Pyth ist als Kursquelle entfernt. Die Anleitung ist
gelöscht statt stehengelassen: eine Anleitung, die auf einen gelöschten Worker
zeigt, kostet die nächste Session mehr Zeit als eine fehlende.

Was davon noch gilt, steht in `SYSTEM_MAP.md` unter **Data providers**.

---

## 5. Secrets audit

I **could not run `wrangler secret list` from this environment** — there are no
Cloudflare credentials here (the token exists only as a GitHub repo secret), and
the existing production worker's source isn't in the repo. So, per "invent
nothing", here is exactly what's known vs. what must be checked live.

**GitHub repo secrets (prerequisite — you stated these are set):**
- `CLOUDFLARE_API_TOKEN` ✅ (assumed set)
- `CLOUDFLARE_ACCOUNT_ID` ✅ (assumed set)

**Worker secrets known from repo source:**
- None of the three remaining public workers reads a secret that this file can
  name. (`chartrunner-hermes-proxy` → `HERMES_API_KEY` stood here until
  2026-09-20; it was never set, and the worker is retired.)

**Worker secrets that must be checked live (source not in this repo → not
derivable here):**
- `chartrunner-worker` (the billing/market-data/mail gateway). From the client
  call paths it clearly proxies providers + mail + billing, but I will **not**
  assert its exact secret names. The task flags two as expected-missing —
  **Anthropic key** (AI coach) and **Telegram token** (Telegram bot / bridge).
  Confirm — don't assume — with the audit below.

**How to check (mac-free):** I added `.github/workflows/audit-worker-secrets.yml`
— Actions → **Audit Worker Secrets** → *Run workflow*, input the worker names
(default: the three public workers plus `chartrunner-worker`). It runs `wrangler secret
list --name <worker>` and prints the **secret names only** (never values).

Equivalent locally:
```bash
npx wrangler secret list --name chartrunner-ownership
npx wrangler secret list --name chartrunner-worker
```
Compare the printed names against what each worker's code reads; anything the
code uses but the list doesn't show is a missing secret to `wrangler secret put`.

---

## 6. Trigger / verify status

**I could not trigger the runs live.** The GitHub integration token in this
environment lacks `actions: write` — `POST .../dispatches` returns
`403 Resource not accessible by integration` for **every** workflow, including
the pre-existing `pages.yml`. And `deploy-workers.yml`/`pages.yml` only auto-run
on push to `main`, which I'm not permitted to push to.

**What I verified instead (offline):**
- ✅ All three workflow YAMLs parse.
- ✅ Discovery job logic selects a `workers/*/` directory for both the
  `worker=all` dispatch path and the push-diff path. (Verified in 2026-07
  against `workers/hermes-proxy`, which has since been retired; the mechanism
  is unchanged.)

**To actually run them:**
- **Automatic:** merge this branch to `main`. The merge push touches
  `workers/**` and `.github/workflows/pages.yml`, triggering both workflows.
- **Manual:** Actions tab → pick the workflow → **Run workflow** (works once the
  workflow file is on `main`; `deploy-workers` + `audit-worker-secrets` both have
  `workflow_dispatch`).

Then verify: Actions → the run → the `deploy` job log should end with wrangler's
"Uploaded / Published <worker>" + the route; the `pages.yml` run
should log `Cache purged for chartrunner.xyz (purge_everything)`.

---

## 7. Files changed

```
.github/workflows/deploy-workers.yml         (new) worker deploys, path-filtered + dispatch
.github/workflows/audit-worker-secrets.yml   (new) mac-free `wrangler secret list`
.github/workflows/pages.yml                  (mod) + cache-purge step
workers/hermes-proxy/*                       (new in 2026-07, DELETED 2026-09-20)
HANDOFF.md                                   (new) this file
```

## Open items for you

- [ ] Merge to `main` to activate the automation.
- [x] ~~`wrangler secret put HERMES_API_KEY` when Pyth delivers the key~~ —
      **entfallen 2026-09-20**: der Schlüssel kam nie, Pyth ist raus, der Worker
      ist stillgelegt. Offen bleibt dafür: Route `chartrunner.xyz/hermes/*`,
      Worker `chartrunner-hermes-proxy` und den Secret-Platz `HERMES_API_KEY`
      im Cloudflare-Dashboard löschen.
- [ ] Run **Audit Worker Secrets** to confirm which secrets `chartrunner-worker`
      is missing (Anthropic key, Telegram token) and `wrangler secret put` them.
- [ ] Decide the fate of `_to_delete/my-worker/` (delete, or move to `workers/`).
- [ ] If the purge step logs `No zone id resolved…`, add `Zone:Read` to the token.
- [ ] Add `workers/relay/` and `workers/bot-terminal-bridge/` source when ready —
      they'll deploy automatically.
```
