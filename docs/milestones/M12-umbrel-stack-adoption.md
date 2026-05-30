# M12 — Umbrel Stack Adoption (Bonus)

**Status:** 🟢 BONUS · 0/8 (added 2026-05-28; **Tier 1 install pass complete same day** — all 7 apps installed + reachable, configuration/wiring pending)
**Theme:** Adopt a curated slice of the Umbrel app catalog as ChartRunner infrastructure. Three lanes — **observability** (Grafana + InfluxDB + Uptime Kuma + Plausible), **scraper unblock** (flaresolverr), **dev/docs accelerators** (Gitingest + Excalidraw) — chosen by scanning the full Umbrel store against the running stack (Hermes + OpenClaw + Ollama + n8n + scheduled-tasks + on-chain devnet). Tier 2 (Langflow / AnythingLLM / Open WebUI / Arcane / MinIO / Syncthing) reserved as Blocked bucket — install when the trigger fires, not before.

> **Cross-product positioning:** this is infra, not a product. Both **ChartRunner-the-game** (`ChartRunner_Prototype.html`, deployed) and **ChartRunner-as-tool** ([[M11-umbrel-native-toolset]], in dev) benefit from the same observability + scraper plumbing. Treat M12 as the shared substrate underneath both surfaces.

> **Why bonus + not a numbered priority:** the ChartRunner roadmap (M0.5 → M10) is product-shaped (security → tokenomics → coach → SDK → wallet → build → marketplace → exchange → AI → streaming → tournaments → mobile → mainnet). M11 is a sibling product. M12 is an enabling sidequest — it removes invisible failure modes and accelerates the dev loop but doesn't ship a user-visible feature. Pickable opportunistically alongside whichever product milestone is active.

## Completion condition (all required)

- [ ] **Observability data plane** — Grafana + InfluxDB 2 installed; scheduled-task outcomes + on-chain devnet events + $CHART issuance events flowing in
- [ ] **Cascade Health dashboard** — at least one Grafana board live, showing the Claude→Hermes+OpenClaw→Ollama+n8n cascade success/failure timeline + per-step latency
- [x] 2026-05-28 — **Uptime monitoring** — Uptime Kuma admin set up + 7 monitors wired: chartrunner.xyz/play, chartrunner.xyz/telegram, flaresolverr (192.168.178.31:8191), Gitingest (:8895), Plausible (:9092), InfluxDB (:8886), Grafana (:3030). All 7 green at first check. Remaining add-ons (Hermes/OpenClaw auth-gated → keyword-match; Solana devnet RPC needs POST) deferred.
- [ ] **Scraper unblock** — flaresolverr installed; OpenClaw DEX scraper wired through it; the GeckoTerminal 401/429 issue (memory `reference_chartrunner_umbrel_agents`) resolved OR proven unrelated and re-routed via CoinGecko Demo key
- [ ] **Landing analytics** — Plausible (or Umami) installed; chartrunner.xyz/play + /telegram tagged; first weekly conversion read available
- [ ] **LLM-friendly repo ingest** — Gitingest installed; smoke test producing usable repo digest for Hermes/OpenClaw context priming (supports the [[project_chartrunner_botfriendly]] line)
- [ ] **Diagramming surface** — Excalidraw installed; first whitepaper / pitch / GAME_MAP diagram exported from it (proof it's actually adopted, not just installed)
- [ ] **Tier-2 decisions logged** — for each of {Langflow, AnythingLLM, Open WebUI, Arcane/Dockge, MinIO, Syncthing}: install-yes / install-no / install-when-triggered written down in the Notes section

## Imminent-solvables

### Ready bucket (evaluator can pick)

- [x] 2026-05-28 — `[D]` **Install Uptime Kuma + create monitor set** — DONE. SQLite chosen; admin account set up by Julian; **7 HTTP monitors wired** (chartrunner.xyz /play + /telegram external; flaresolverr/Gitingest/Plausible/InfluxDB/Grafana internal via Umbrel LAN IP `192.168.178.31`). All 7 returning 200 OK. Reachable at `umbrel.local:8385`. Pending TODOs documented in inventory section below.
- [x] 2026-05-28 — `[D]` **InfluxDB → Grafana datasource wired** — Julian generated `grafana-readonly` API token in InfluxDB (Load Data → API Tokens), configured Grafana → Connections → Data sources → InfluxDB (Flux, URL `http://192.168.178.31:8886/`, org `ChartRunner`, bucket `chartrunner`). Save & test green. **Cascade Health dashboard still pending: blocked on data — InfluxDB bucket is empty until Hermes/OpenClaw start pushing metrics.**
- [ ] `[D]` **Install flaresolverr + rewire OpenClaw DEX scraper** — direct fix for the 401/429 issue. Steps: install app → expose internal endpoint → patch the OpenClaw DEX-scrape script to route through it → re-run failing fetch → confirm 200. Falls back to CoinGecko Demo key + rate-limit if flaresolverr doesn't solve it (per the existing memory plan).
- [ ] `[D]` **Install Plausible Analytics + tag chartrunner.xyz** — add the snippet to landing + /play + /telegram. Outcome: first conversion data starts accumulating. Privacy-friendly so no cookie banner needed.
- [ ] `[D]` **Install Gitingest + smoke test** — install, point at the ChartRunner repo, capture the digest output, verify it's usable as context for Hermes/OpenClaw prompts. Outcome: one command in the bot-friendliness workflow that hands an LLM-ready snapshot of the repo.
- [ ] `[D]` **Install Excalidraw** — install, draw one real diagram (e.g. cascade DAG or M11 four-component flow), export, drop into `docs/` or a milestone file. Proves it's adopted, not shelfware.
- [ ] `[D]` **Install Grafana + InfluxDB 2 + write a dashboard schema doc** — install both, document the dashboard schema (datasource, panels, metrics) in `docs/architecture/observability-schema.md`. Defers wiring + dashboard build to subsequent tasks.
- [ ] `[D]` **Wire scheduled-task outcomes → InfluxDB** — the cron-jobs already log success/failure; pipe those events into InfluxDB. Probably a tiny shell script or n8n flow. Outcome: time-series data on which tasks pass/fail when.
- [ ] `[O]` **First Cascade Health dashboard in Grafana** — build the dashboard against the wired-up InfluxDB data. Panels: task success rate (24h), failed-task list, per-step latency, ChartRunner $CHART issuance events. **BLOCKED:** Grafana + InfluxDB installed + scheduled-task wiring done.
- [ ] `[O]` **Wire on-chain devnet event tail → InfluxDB** — tail the three live programs (maps + registry + oracle) for events, push to InfluxDB. Useful for tracking governance actions + oracle posts + map saves.
- [x] 2026-05-29 — `[O]` **M12 README / stack-doc** — single page listing every M12-adopted app, its role, where its data goes, who maintains it. **DONE** → `docs/architecture/umbrel-stack.md`. (Scheduled `cr-o-m12-stack-doc-20260529` @ 06:30 fired but hit the session limit and wrote nothing; delivered in the 2026-05-29 interactive recovery pass.)

### Blocked bucket (Tier 2 — install when triggered, NOT before)

- [ ] `[D]` **Langflow install + first cascade visualization** — **BLOCKED:** cascade complexity hits visual-debug threshold (current text-log debugging stops being enough).
- [ ] `[D]` **AnythingLLM install + corpus ingest** — **BLOCKED:** corpus size grows past what fits in scheduled-task prompts (currently we paste context per-run; AnythingLLM becomes worthwhile when ≥10 docs need to be queryable).
- [ ] `[D]` **Open WebUI install** — **BLOCKED:** opportunistic. No clear gate; install during a low-context session when you remember.
- [ ] `[D]` **Arcane or Dockge install** — **BLOCKED:** triggered when "is X container up?" comes up more than once/week. Currently you check via OpenClaw shell or SSH; once that's a daily check, install the UI.
- [ ] `[D]` **MinIO install** — **BLOCKED:** [[M7-streaming]] / RUN-tube demo recording starts producing video files + build artifacts that need storage. Skip until then.
- [ ] `[D]` **Syncthing install** — **BLOCKED:** only if you want the Trading Game vault mirrored Mac↔Umbrel outside git. Probably never — git is sufficient.

### Done bucket

(empty — newly added 2026-05-28)

## State

- Progress: 0/8 completion conditions (each Tier 1 condition is compound: install + configure; install half done 2026-05-28, configure half pending)
- Blockers active: 0
- Scheduled today: 0
- **Install pass (2026-05-28):** Tier 1 apps all installed + reachable via Chrome MCP. Next pickable work = the configure/wire half of each condition (set up Uptime Kuma monitor set, route OpenClaw through flaresolverr, tag chartrunner.xyz with Plausible, run a Gitingest smoke test on the repo, draw the first Excalidraw diagram, wire scheduled-task outcomes into InfluxDB, build the Cascade Health Grafana dashboard).

## Notes

### Skipped apps (explicit decisions, so the next "should I install X?" question has an answer)

- **All Bitcoin / Lightning apps** (Bitcoin Node / Knots / Core Lightning / LND / RTL / mempool / BlueWallet / Cashu / Fedimint / Samourai / Specter / Sphinx / Sparkkiosk / Bitwatch / Bitfeed / Bleskomat / Bassin / Public Pool / Krystal Bull / RoboSats / PeerSwap / BTCPay / BTC RPC / sat.watch / SatSale / Strix / Suredbits / Toshi Moto / Squeak Road / Squeaknode / Saifa / Holesail / DATUM / Decred / Public Pool's Web / Lightning Network+ / LNbits / LNbits Holesail / LNDg / LnVisualizer / TDEX / Ride The Lightning) — wrong chain. ChartRunner is Solana.
- **All media servers** (Plex / Jellyfin / Emby / Sonarr / Radarr / Lidarr / Readarr / Bazarr / Prowlarr / SABnzbd / Jackett / Tautulli / Transmission / qBittorrent / SimpleTorrent / autobrr / Just.Download / Tube Archivist / MeTube / Restreamer / Pinchflat / Audiobookshelf / Swing Music / Music Assistant / Navidrome / mStream / Lobe Hub / Calibre Web / BookLore / Kiwix / Karakeep / cobalt / Frigate / RomM) — not relevant.
- **Lifestyle / recipe / fitness / travel** (Tandoor / KitchenOwl / Mealie / Grocy / Habitica / Wallos / Wingfit / wger / Endurain / AdventureLog / AirTrail / Reitti / HortusFox / Domain Locker / Trip / Komodo / DocuSeal / LubeLogger / Mainsail / Ghostfolio / Firefly III / Firefly III Importer / Akaunting / Invoice Ninja / Maybe / Monetr / rotki / Sure / Shopstr / OctoPrint) — wrong domain.
- **Redundant chat / collab clients** (Mattermost / Element / Synapse / The Lounge / Threema Web / MeshChatX / Campfire / Yantrack) — Telegram + OpenClaw + Hermes is enough.
- **Redundant generic AI** (LibreChat / Vane / Agent Zero / PicoClaw / Spacebot / LocalAI / Lobe Hub) — covered in the AI-category answer; Hermes + OpenClaw + Ollama already in cascade.
- **Redundant productivity / notes / kanban / CRM** (NocoDB / Plane / Vikunja / Kimai / kan / Solidtime / Super Productivity / Twenty / Outline / Docmost / Affine / WikiJS / BookStack / Trilium Notes / DumbPad / flatnotes / Etherpad / Memos / Penpot / Poznote / ZeroNote / NoteDiscovery / Stalwart / Papra / DocuSeal / Mail Archiver / Paperless-ngx / Readur / BentoPDF / Stirling PDF / Mazanoke) — Notion + Obsidian + Excalidraw cover this.
- **Redundant git / file-sync** (Gitea / Forgejo / GitLab / Gitea Mirror / Nextcloud / Seafile / ownCloud / copyparty / File Drop / Pingvin Share / Dropgate Server / Slink / Snapdrop / Morphos / VERT / ConvertX) — GitHub + Trading Game folder are sufficient.
- **Networking / security niceties** (NetBird / WireGuard / Tor Browser / Tor Snowflake Proxy / Networking Toolbox / Nginx Proxy Manager / OpenResty Manager / Cloudflare Tunnel / Pi-hole / AdGuard Home / WatchYourLAN / MySpeed / Technitium DNS / Vaultwarden / Passky / chantools / Circuit Breaker / Zoraxy / NetBird) — Tailscale + 1Password already cover access + secrets; reverse-proxy / DNS not load-bearing.
- **Home / IoT / specialty** (Home Assistant / HA-Fusion / Homebridge / Homarr / HomeBox / HomeHub / Heimdall / ESPHome / Zigbee2MQTT / Matter Server / MQTTX Web / Mosquitto / Wavelog / Snort) — wrong domain.

### Tier-2 decisions log (resolved per completion-condition #8 when triggers fire)

| App | Decision | Trigger to revisit |
|---|---|---|
| Langflow | install-when-triggered | cascade text-log debugging stops being enough |
| AnythingLLM | install-when-triggered | ≥10 corpus docs need agent querying |
| Open WebUI | install-when-triggered | opportunistic low-context session |
| Arcane or Dockge | install-when-triggered | "is X container up?" >1×/week |
| MinIO | install-when-triggered | M7 / RUN-tube produces files needing object storage |
| Syncthing | install-no | git is sufficient, don't add Mac↔Umbrel sync |

### Relationship to other milestones

- **[[M0.5-security]]** — observability dashboard would surface devnet program upgrade activity in real time (Squads multisig actions); useful audit-prep evidence.
- **[[M1-tokenomics]]** — InfluxDB time-series for $CHART issuance + recycle leaks + reserve-float gives the tokenomics paper live charts instead of static snapshots.
- **[[M2-coach-ai]]** — Coach AI can read the Grafana / InfluxDB observability data to advise the player or surface stack health to Julian.
- **[[M2.5-sdk-extraction]]** — Gitingest accelerates the SDK extraction by feeding LLMs LLM-ready repo digests.
- **[[M6-ai-telegram]]** — Plausible analytics on /telegram tells us if the Mini App is actually getting traffic, separate from /play.
- **[[M7-streaming]]** — MinIO becomes the asset store for RUN-tube clips (Tier 2 trigger).
- **[[M11-umbrel-native-toolset]]** — Same Umbrel host, same observability + scraper substrate. M12 deliverables benefit M11 immediately (Hermes/OpenClaw uptime monitoring + scraper unblock are M11 enablers).

### Sandbox-reach caveat

All M12 apps live on Umbrel, which is **Tailnet-only from the cloud-side Cowork sandbox**. Installs + dashboards are Julian-hands (via `umbrel.local` from his Mac); the sandbox can stage scripts + config but can't push them. Same pattern as [[project_umbrel_mcp_paths]].

### Installed-app inventory (verified 2026-05-28 via Chrome MCP on `crdev` browser)

All seven Tier 1 apps reachable on `umbrel.local`. Default-credentials modal on Grafana confirmed already-configured state; existing InfluxDB org `ChartRunner` confirms prior setup. Several apps were pre-installed before today's pass — this milestone's install task is now closed regardless.

| App | App-store slug | Running URL | Status note |
|---|---|---|---|
| Uptime Kuma | `uptime-kuma` | `http://umbrel.local:8385/` | Installed + wired 2026-05-28; admin set up; SQLite backend; 6 monitors live (2 external chartrunner.xyz + 4 internal via Umbrel LAN IP). Optional monitors TODO: Grafana (port TBD), Hermes terminal (`:18790`, auth-gated → needs keyword-match), OpenClaw control (`:18789`, auth-gated → needs keyword-match), Solana devnet RPC (needs POST or push monitor). |
| flaresolverr | `flaresolverr` | `http://umbrel.local:8191/` | Installed; OpenClaw DEX scraper rewire still pending |
| Gitingest | `gitingest` | `http://umbrel.local:8895/` | Installed + smoke-tested 2026-05-28 (both the bundled example AND the live ChartRunner repo at `github.com/ssjjul3/chartrunner` digest successfully). ChartRunner result: 140 files, 2.5M estimated tokens, commit `b6a9aed4130c68ac2c2dd991646a128803f7822e` at ingest time. The default `Include files under: 50kB` slider EXCLUDES `ChartRunner_Prototype.html` (3 MB) — for full-repo digests set the slider to 100MB max. For LLM context priming use the default tiny digest; for targeted code lookups use the full digest. Bot-friendliness workflow can either ingest on demand (live URL) or cache the digest under `/opt/data/chartrunner/gitingest/` for Hermes/OpenClaw to chunk. |
| Excalidraw | `excalidraw` | (Open button confirmed) | Installed; first real diagram still pending |
| Plausible Analytics | `plausible` (NOT `plausible-analytics`) | `http://umbrel.local:9092/sites` | Installed; chartrunner.xyz site-tag still pending; may need public-internet exposure for site to receive traffic |
| InfluxDB 2 | `influxdb2` (NOT `influxdb-2`) | `http://umbrel.local:8886/` | Installed; org `ChartRunner` (id `5ea4659ff6b0b19f`) already exists from prior setup |
| Grafana | `grafana` | `http://umbrel.local:3030/` | Installed; InfluxDB datasource configured 2026-05-28 (Julian-hands, with token + ChartRunner-org bucket); Cascade Health dashboard pending (gated on having data in InfluxDB to query) |

Slug corrections recorded for the next session — `plausible-analytics` and `influxdb-2` both 404; canonical slugs are `plausible` and `influxdb2`.

### Wiring lessons from 2026-05-28 Uptime Kuma session (for future Cowork → Umbrel work)

- **`umbrel.local` does NOT resolve from inside Umbrel app containers** — only from the user's Mac via mDNS. For Uptime Kuma to monitor internal apps, use the Umbrel host's LAN IP (`192.168.178.31` in this network) instead of `umbrel.local`. Same will apply to any docker-side tool that needs to hit other Umbrel apps.
- **Uptime Kuma's Vue form needs JS-click to submit** when the Speichern button is outside the viewport — the `find` + ref-based click races with the layout, so the click hits stale coordinates. Working pattern in Chrome MCP: `form_input` for fields → `javascript_tool` with `button.scrollIntoView({block:'center'}); button.click()` to fire the submit. The plain `ref` click works when the button is already visible. (See session log for the exact JS snippet.)
- **Auth-gated apps need keyword monitors, not naive HTTP 200**. Hermes terminal (`umbrel.local:18790`) and OpenClaw (`:18789`) serve a login page that returns 200 — but if the page changes to "service down" the status code might still be 200. Use Uptime Kuma's HTTP keyword-match feature against an expected string in the login page (e.g. "Login" / "Sign in") rather than the default 2xx check. Tracked as a TODO in the inventory above.
- **First-run admin accounts are user-action** — per the no-create-accounts rule, the M12 install pass paused on Uptime Kuma's `/setup` page and handed off to Julian. Same pattern will apply to Plausible, Grafana, etc. when their first-run flows kick in.

### Where this milestone's docs land

- App-by-app stack reference: `docs/architecture/umbrel-stack.md` (created as part of the M12 README task)
- Observability schema: `docs/architecture/observability-schema.md`
- Grafana dashboard JSON: `dev-kit/dashboards/` (so it round-trips through git)
