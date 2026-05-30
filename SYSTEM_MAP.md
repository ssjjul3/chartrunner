# ChartRunner System Map — canonical

> **Status:** 🟢 canonical · always-current
> **Last refreshed:** 2026-05-30 (M14 BotBacktestRecord source path wired; M3 Bot Terminal surface/style unification recorded; deploy gated)
> **Update protocol:** [`docs/SYSTEM_MAP_UPDATE_PROTOCOL.md`](docs/SYSTEM_MAP_UPDATE_PROTOCOL.md) — what triggers an update, file conventions, who-edits-what
> **Snapshots:** dated files (e.g. `SYSTEM_MAP_2026-05-28.md`) are point-in-time archives, only created on major rebuilds. This file is the always-current one.

Comprehensive map of where every component lives, who owns it, and how the
pieces are connected. Update this file whenever a new milestone is added,
an agent/container moves, a corpus appears, or a session ships a
deliverable that crosses ≥2 layers. See the protocol doc for the full
trigger list.

Sister docs:
- [`GAME_MAP.md`](GAME_MAP.md) — **canonical map of the game source** (editing source v1.0.150; deploy via ship script): modes, abilities, tools, on-chain wiring, automation surface, archived/parked
- [`MILESTONE_AUDIT.md`](MILESTONE_AUDIT.md) — milestone state-of-play
- [`BRAINSTORM_VS_SHIP_2026-05-28.md`](BRAINSTORM_VS_SHIP_2026-05-28.md) — founding-doc cross-reference
- [`DRIVE_AND_VAULT_MAP_2026-05-28.md`](DRIVE_AND_VAULT_MAP_2026-05-28.md) — Drive-vs-vault comparison + migration verdict (Drive officially non-ChartRunner)
- [`docs/SESSION-CONNECT.md`](docs/SESSION-CONNECT.md) — 8-tool session-start board
- [`docs/SYSTEM_MAP_UPDATE_PROTOCOL.md`](docs/SYSTEM_MAP_UPDATE_PROTOCOL.md) — maintenance contract for this file AND `GAME_MAP.md`
- [`dev-kit/MANIFEST.json`](dev-kit/MANIFEST.json) — machine-readable dev-kit index
- [`_maps/`](_maps/) — visual SVG snapshots (unified map + per-layer maps · dark and light themes · for pitch decks + at-a-glance orientation)

---

## 1. Products in flight

| Product | Where it ships | Stage | Source path |
|---|---|---|---|
| **ChartRunner-the-game** | `chartrunner.xyz/play/` | Editing source v1.0.150; deploy via ship script | `ChartRunner_Prototype.html` (single file, 3.1 MB) |
| **ChartRunner Mobile (Telegram Mini-App)** | `chartrunner.xyz/telegram/` | Live | `telegram/` in repo + `chartrunner-mobile-bot-built/` in vault |
| **ChartRunner-as-tool (M11)** | `/opt/data/chartrunner/` on Umbrel | In dev (4/13 done) | Hermes container; not yet user-facing |
| **Phase 1 SDK** | `chartrunner.xyz/sdk/` (built) | In progress (M2.5 in-flight) | `chartrunner-prototype/sdk/core/` (36 files) |
| **ChartRunner Wallet** | Standalone web app (no build) | Scaffold v0.1 (2026-05-29) | `wallet/` — self-custody Solana wallet, IDB keystore, real devnet signing via Memo program, MCP stdio surface (13 tools) for Hermes/OpenClaw/Claude/Codex/Grok/Ollama |
| **Trading-stack v1** | ARCHIVED 2026-05-17 | Dormant | `~/trading-stack` (memory: bot dormant since 2026-04-27, 31 units disabled) |

---

## 2. Workspaces (where the bytes live)

### On Julian's Mac

| Path | Role | Git? | Mounted in Cowork? |
|---|---|---|---|
| `~/Desktop/Desktop/Trading Game/` | **Obsidian vault — editing source of truth** | No (not a worktree) | ✅ Yes — this session writes here |
| `~/projects/chartrunner/` | Deploy repo; GitHub Pages source | ✅ Tracked (166 files) | ❌ Not mounted; reach via Chrome/SSH/file-copy |
| `~/projects/chartrunner.bak` | Older backup with Phase 0/1/2 docs | (separate repo) | ❌ |
| `~/projects/match-standalone/` | Match program build artifacts | (separate repo) | ❌ |
| `~/trading-stack/` | Archived v1 + SDK copies + Telegram bot archive | (separate repo) | ❌ |
| `~/chartrunner-tg/` | Static Telegram app repo | (separate repo) | ❌ |
| `~/.chartrunner-keypairs/` | Keypair directory | N/A | ❌ |
| `~/.codex/plugins/cache/claude-cowork/.../skills/chartrunner` | Installed chartrunner skill | N/A | ❌ |

**Editing flow:** Trading Game vault is the canonical editing source. `ship-v*.command` scripts in the vault copy `ChartRunner_Prototype.html` → `~/projects/chartrunner/`, commit, and push. GitHub Pages redeploys to `chartrunner.xyz/play/`.

### On Umbrel (Tailnet-only, not reachable from Cowork sandbox)

| Path | Container | Role |
|---|---|---|
| `/opt/data/chartrunner/` | **Hermes container** persistent volume | M11 buildout: strategic docs + data_access/ + backtest engine + pinescript/ + coin_profiles/ + chartrunner.db |
| `/data/umbrel/chartrunner/` | **Umbrel host volume** (OpenClaw container reads/writes) | OHLC JSONL scrape corpus: 79 GB, 381M rows |
| `/opt/data/chartrunner/data/ohlcv/` | Hermes container | Parallel Parquet OHLC corpus: 27 GB, 3.5M files |

**Reach:** Cowork sandbox has **no direct route** to Umbrel (cloud-side connector can't reach Tailnet). Pull files via Hermes/OpenClaw terminal in Chrome MCP, or have Julian copy them into the vault.

### Served locally

| URL | Source | Role |
|---|---|---|
| `http://127.0.0.1:8787/ChartRunner_Prototype.html` | `~/projects/chartrunner/` | Local game tab (dev) |
| `http://127.0.0.1:8787/dev-kit/dev-panel.html` | `~/projects/chartrunner/dev-kit/` | Dev cockpit panel |
| `http://127.0.0.1:8787/dev-kit/experiments/my-test-game.html` | `~/projects/chartrunner/dev-kit/experiments/` | Test Game / audit dashboard launcher |

**Bridge:** panel ↔ game via `BroadcastChannel` (same browser, same origin). Bridge code = `dev-kit/bridge.js`, paste-installs `window.__CR_DEV__` in the game tab's console.

---

## 3. On-chain layer (Solana devnet)

All 4 programs live + multisig-governed (Squads V4 2-of-3). Re-verified 2026-05-25; registry re-upgraded 2026-05-27 (`3XHRv5j…` tx). Source is now ahead of deployed registry for M14: `record_bot_backtest` / `BotBacktestRecord` compile locally but need Anchor/IDL build unblock + Squads upgrade before they are live on devnet.

| Program | Status | Last touched | Notes |
|---|---|---|---|
| `chartrunner_maps` | 🟢 live + hardened | 2026-05-25 | Multisig authority |
| `chartrunner_registry` | 🟢 live + re-upgraded; 🟡 M14 source-ahead | 2026-05-30 source, 2026-05-27 deploy | Live: parity + name-register + resale + oracle-cite. Source-ahead: `record_bot_backtest`, `BotBacktestRecord`, `BotBacktestRecorded`, `PDA_BOT_RUN`; Rust `cargo check` passes, Anchor/IDL build blocker remains. |
| `chartrunner_oracle` | 🟢 live + hardened | 2026-05-20 (Playground build) | Pyth-post still pending |
| `chartrunner_match` | 🟢 live | 2026-05-20 (local build, platform-tools v1.52) | MagicBlock realtime PvP scoreboard; needs anti-cheat on `tick_player` before live money |

Source: `anchor/programs/` in `~/projects/chartrunner/`. Memory: `project_chartrunner_anchor_deploys`.

---

## 4. Dev-kit (the private cockpit)

| Component | File | Purpose |
|---|---|---|
| Dev Panel | `dev-kit/dev-panel.html` | Mission Control + Strategy Composer + Agent Terminal + On-Chain Sim + Umbrel Browser + Scoring Inspector + Experiment Loader + Dev Kit Navigator |
| Bridge | `dev-kit/bridge.js` | `window.__CR_DEV__` v0.2.0 — modules: run, scoring, physics, god, recording, flags, onchain, blackboard, agents, terminal |
| Test Game launcher | `dev-kit/experiments/my-test-game.html` | Audit dashboard; reads `MANIFEST.json` |
| Manifest | `dev-kit/MANIFEST.json` | Machine-readable index (now extended with `structure.staged` + `structure.external` for cross-system pointers) |
| Catalogue | `dev-kit/catalogue/store-catalogue.json` | Dev-only store/marketplace/archive/tab/tutorial/TradingView-parity manifests |
| Terminal resources | `dev-kit/terminal-resources/` | 11 design specs (radar / composer / abilities / monsters / missions / HUD / overlays / pipeline / coach / watchdogs) |
| Planned work | `dev-kit/planned-work.json` | Machine-readable task manifest |

Served on `:8787` via `dev-kit/serve.sh`. `dev-kit/` is intentionally git-ignored in the repo (private research cockpit).

---

## 5. Agents (multi-agent operations)

| Agent | Runs where | Reach | Role |
|---|---|---|---|
| **Cowork Claude (this session)** | Anthropic cloud sandbox | Mac files via Cowork mount + Chrome MCP + connectors. **Cannot reach Umbrel.** | Authoring, planning, vault edits, staged patches |
| **Claude Code** | Julian's Mac CLI | Full Mac filesystem + git + bash | Repo work, deploys, real file ops |
| **Codex** | Julian's Mac (OpenAI CLI) | Full Mac filesystem + bash | Build/host-exec; ran a repo map earlier this session |
| **Grok** | `x.com/i/grok` (web) | Web research | Cheap reasoning + market research; ran a repo map earlier |
| **Hermes** | Umbrel container `hermes-agent_*` | Umbrel filesystem (`/opt/data/chartrunner/`) + DEX/CEX APIs | Built the M11 spine: strategic docs + data_access + backtest engine + pinescript |
| **OpenClaw** | Umbrel container `openclaw_gateway_1` | Umbrel host volume (`/data/umbrel/chartrunner/`) + Cron Jobs + Channels | Runs OHLC scrape crons (Bybit, OKX, Binance, etc.) + Telegram bridge to `ChartRunner_HQ` |

**Reach matrix (who can talk to what):**

| | Vault | Repo | Solana | Live game | Umbrel | DEX/CEX APIs |
|---|---|---|---|---|---|---|
| Cowork | ✅ | ✗ (via Chrome) | ✗ (via Chrome) | ✗ (via Chrome) | ✗ | ✗ |
| Claude Code | ✅ | ✅ | ✅ (via solana CLI) | — | via SSH | — |
| Codex | ✅ | ✅ | ✅ | — | via SSH | — |
| Grok | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ (web) |
| Hermes | ✗ | ✗ | ✗ | ✗ | ✅ (native) | ✅ |
| OpenClaw | ✗ | ✗ | ✗ | ✗ | ✅ (native) | ✅ |

Memory: `reference_openclaw_hermes_as_tools`, `chartrunner_umbrel_agents`.

**Telegram group `ChartRunner_HQ`** (chat_id `-5195550778`): multi-agent group winding down (memory: `project_chartrunner_hq_telegram_group`). Dual-agent OHLC scrape (OpenClaw JSONL + Hermes Parquet) was a test rig, not redundancy. Relay via Julian — Cowork can't reach Telegram.

---

## 6. Cowork-side connectors (session bootstrap)

| Connector | Status | Tools usable in chat? | ChartRunner-scope? |
|---|---|---|---|
| Notion | 🟢 connected | Yes (`mcp__ed959d7c-…notion-*`) | as needed |
| Gmail | 🟢 connected | Yes | as needed |
| Google Calendar | 🟢 connected | Yes | as needed |
| Google Drive | 🟢 connected | Yes | **❌ non-ChartRunner** — vault is canonical; Drive is for other projects (Colosseum Comedy Club, Roy collab, etc). See [`DRIVE_AND_VAULT_MAP_2026-05-28.md`](DRIVE_AND_VAULT_MAP_2026-05-28.md) §5 migration verdict. |
| Canva | 🟢 connected | Yes | as needed |
| Figma | 🟢 connected | Yes | as needed |
| Claude in Chrome | 🟢 2 browsers paired (ARC, cr) | Yes | yes |
| Obsidian (vault) | 🟢 mounted | Yes (via file tools) | **yes — canonical** |
| GitHub | 🟢 app-level integration | ❌ no chat MCP tools | yes (deploy target) |
| Telegram | 🟡 native app drivable via computer-use | No MCP | yes (ChartRunner_HQ relay) |
| Umbrel / Hermes / OpenClaw | 🟡 reach via Chrome only (Tailnet from local browser) | No MCP — see [`SESSION-CONNECT.md` §A](docs/SESSION-CONNECT.md) for why a tailnet-private MCP can't be a Cowork URL connector | yes (M11 + data corpora) |

---

## 7. Milestones (the roadmap)

Active product focus: **M2.6** (Avatar identity + hotkey execution USP). M0.5 remains the external audit/security workstream. Sources: [`docs/milestones/README.md`](docs/milestones/README.md), [`MILESTONE_AUDIT.md`](MILESTONE_AUDIT.md).

| ID | Theme | Status | Progress |
|---|---|---|---|
| M0.5 | Security + Anchor unblock | 🟡 audit workstream | ongoing |
| M1 | Tokenomics + fiat onramp | 🔵 next | 0/13; $CHART design fully committed 2026-05-26 |
| M2 | Coach AI v2 | 🔵 queued | 7/11; endpoint/cost/prompt/eval rounds 1-2 done; 2026-05-30 Coach summon/window surface fixed, LLM integration still open |
| M2.5 | SDK extraction (Phase 1) | 🟡 partial | in flight; 4/12 Ready done, builds at `chartrunner-prototype/sdk/core/` |
| M2.6 | Avatar identity + hotkey execution USP | 🟢 active | first-minute USP focus from 2026-05-30 |
| M3 | Build apps (Workbench rebuild) | 🟡 partial | 6/16; Bot Terminal desktop entry + app chrome/interiors unified 2026-05-30; real Workbench restores/bridges pending |
| M4 | P2P Marketplace | 🟢 effective-done | UI wired + resale royalty live 2026-05-27 |
| M5 | Hyperliquid + Helius RPC | 🔵 queued | 4/11; spec + pricing + hackathon decision done |
| M6 | AI · Telegram bot integration | 🔵 queued | 4/10; bridge research + Bot Terminal icon/surface done; real external bridges still M14/M6 work |
| M7 | Streaming widget | 🟡 partial | 2/9; RUN-tube + Display shipped early (v0.9.27) |
| M8 | Token launch tournaments | 🔵 queued | 4/11; World ID + CASH + bracket UX + MagicBlock audit done |
| M9 | Solana Mobile / RN | 🔵 queued | 0/12; Telegram Mini-App built separately |
| M10 | Mainnet deploy | 🔵 queued | 3/16; checklist + RPC projection + devnet→mainnet diff done |
| **M11** | **Umbrel-native quant toolset (Scanner · Chart · Strategy · Backtest)** | **🟡 partial** | **5/13; Pine/spec real-OHLC lane wired 2026-05-30; frontend pending** |
| **M12** | **Umbrel stack adoption (observability + scraper + dev accelerators)** | **🟢 bonus** | **0/8; added 2026-05-28 — infra sidequest, Julian-hands installs on `umbrel.local`** |
| **M13** | **Runner Wallet (Chrome ext — wallet + LLM + payments + /play injection)** | **🟢 bonus** | **0/9; added 2026-05-28 — replaces `/solana-connect/` URL-bounce** |
| **M14** | **Bot-first runtime + Agent Command Center** | **🟡 bonus · source-wired / deploy-gated** | **Bot Terminal slice + app style unification + `BotBacktestRecord` path verified locally 2026-05-30; registry deploy + transports pending** |
| **M15** | **Lightweight Charts hybrid + bloat reduction** | **🟢 bonus** | **0/8; added 2026-05-28 — pairs with M2.5; modular `src/core/` + LWC price engine + transparent game overlay** |
| **M16** | **Complete market-data coverage** | **🔵 queued** | **P1 reuse proof landed 2026-05-30** |

Founding-brainstorm gaps surfaced today (see `BRAINSTORM_VS_SHIP_2026-05-28.md`):
1. PvP arenas + Sharpe-ELO (M8 centerpiece)
2. Indicator-Fusion → Workbench Bot mint (M3)
3. 4 unbuilt keynote abilities: Ice Bridge, Teleport Beacons, Time Dilation, Trail Painter

---

## 8. Data (the corpora)

Two parallel OHLC scrapers exist on Umbrel — intentional experiment, winding down (memory: `project_chartrunner_hq_telegram_group`). Canonical-choice pending; both are M11's OHLC-integration condition.

| Corpus | Owner | Format | Path | Size | Notes |
|---|---|---|---|---|---|
| **OpenClaw OHLC scrape** | OpenClaw | JSONL | `/data/umbrel/chartrunner/` (Umbrel host volume) | 79 GB, 72,598 files, 381M rows | 7 exchanges: Bybit 188M, OKX 136M, incremental 32M (incl. DEX snapshots), Gate 12M, MEXC 5.6M, HL 4.8M, Binance 2.6M (16 intervals 1s–1M). DEX OHLC pending (`DEX_OHLC_TODO.json`). |
| **Hermes Parquet scrape** | Hermes | Parquet (columnar, daily-partitioned, manifest-resumable) | `/opt/data/chartrunner/data/ohlcv/{exchange}/.../{date}.parquet` | 27 GB, 3.5M files | 3 exchanges: Binance 215 symbols / 13 GB, Bybit 168 / 14 GB, OKX 163 / 722 MB. 15 timeframes (1m–1M). Manifest DB tracks last timestamp per (symbol, TF). Production-grade for backtest/ML. |
| **coin_profiles** | Hermes | JSON | `/opt/data/chartrunner/coin_profiles/` | 8 coins pre-generated | Regime history (bull/bear/crab/altseason + vol band) + perf matrix + capital scaling. Extendable via `generate_profiles.py`. Schema: `schema.json`. |
| **OpenClaw PineScript scraper** | OpenClaw | SQLite | `/opt/data/chartrunner/pinescript-scraper/` | (sample ingest verified) | Schema: sources / scripts / static-features / evaluations / backtest-runs |
| **Hermes PineScript scraper** | Hermes | SQLite | `/opt/data/chartrunner/pinescript/` | (initialized 2026-05-26) | Schema: scripts / metadata / evaluations / backtests / **duplicates** (similarity tracking). `discover_github.py` uses gh CLI with graceful fallback |

**Health flags (2026-05-26 status):**
- DEX OHLC pending: 1,581 fails + 8,276 rate-limits in last GeckoTerminal window
- Bybit deep ended 2026-05-26 04:21 UTC with exit 2 (1 failure) — restart via OpenClaw Cron Jobs

---

## 9. Recent session deliverables

### 2026-05-30 — M14 BotBacktestRecord closeout

| Deliverable | Path | Status |
|---|---|---|
| **Dedicated bot backtest PDA path** | `anchor/programs/chartrunner-registry/src/lib.rs` | Source-wired: `record_bot_backtest`, `RecordBotBacktest`, `BotBacktestRecord`, `BotBacktestRecorded`, `PDA_BOT_RUN` |
| **Wallet bridge action** | `solana-connect/src/lib/cr-registry-program.ts`, `solana-connect/src/App.tsx` | Source-wired: `buildRecordBotBacktestIx`, `findBotBacktestPda`, `action=record-bot-backtest` |
| **Game handoff** | `ChartRunner_Prototype.html` | v1.0.150: `crRegistry.recordBotBacktest`; Bot Terminal anchoring prefers the dedicated path, keeps generic Backtest fallback |
| **Verification + plan** | `docs/superpowers/plans/2026-05-30-m14-bot-backtest-record.md`, `scripts/check_m14_bot_backtest_wiring.mjs` | Static/browser/Rust checks passed; Anchor/IDL build + Squads deploy remain |
| **Session handover** | `SESSION_HANDOVER_2026-05-30_M14_BOT_BACKTEST_RECORD.md` | Added at wrap |

### 2026-05-28

| Deliverable | Path | Status |
|---|---|---|
| **P0 dev-kit bridge-rewiring patch** | `_patches/p0-bridge-rewiring-2026-05-28/` | Staged in vault; verified `git apply` clean; not yet applied to repo |
| **Founding-brainstorm cross-reference** | `BRAINSTORM_VS_SHIP_2026-05-28.md` | Done |
| **MILESTONE_AUDIT.md addendum** | `MILESTONE_AUDIT.md` (top) | Done — 3 deliverables tracked |
| **M3 callouts (Indicator-Fusion + P0 apply + Hermes backtest wiring + PineScript)** | `docs/milestones/M3-build-apps.md` | Done |
| **M2 callout (coin_profiles regime feed)** | `docs/milestones/M2-coach-ai.md` | Done |
| **M2.5 callout (P0 patch unblocks integration tests)** | `docs/milestones/M2.5-sdk-extraction.md` | Done |
| **M5 callout (4.8M HL rows in corpus → adapter test harness)** | `docs/milestones/M5-hyperliquid-helius.md` | Done |
| **M8 callouts (founding-doc centerpiece + corpus seeds)** | `docs/milestones/M8-tournaments.md` | Done |
| **M11 new milestone** | `docs/milestones/M11-umbrel-native-toolset.md` + Backlog row in `README.md` + per-milestone row in `MILESTONE_AUDIT.md` | Done — 4/13 at creation |
| **M12 new bonus milestone (Umbrel stack adoption)** | `docs/milestones/M12-umbrel-stack-adoption.md` + Backlog row in `README.md` + per-milestone row in `MILESTONE_AUDIT.md` | Done — 0/8 at creation; Tier-1 (Grafana/InfluxDB/Uptime Kuma/flaresolverr/Plausible/Gitingest/Excalidraw) Ready bucket, Tier-2 (Langflow/AnythingLLM/Open WebUI/Arcane/MinIO/Syncthing) Blocked bucket |
| **MANIFEST.json structure.staged (2 entries) + structure.external (9 entries)** | `dev-kit/MANIFEST.json` | Done; JSON parse-valid; attribution corrected (OpenClaw → Hermes for Hermes-built artifacts) |
| **This system map** | `SYSTEM_MAP_2026-05-28.md` | (this file) |

---

## 10. Mental model — one sentence per layer

1. **Vault** is where work happens.
2. **Repo** is where it ships.
3. **Solana devnet** is where the on-chain primitives are tested.
4. **Dev-kit** is the cockpit that drives the game tab in a paired browser.
5. **Umbrel** is the parallel world where Hermes & OpenClaw build their own things on shared data.
6. **Agents** route by reach (Cowork = vault, Claude Code/Codex = full Mac, Hermes/OpenClaw = Umbrel, Grok = web research).
7. **Milestones** are the conditions, not the dates.
8. **The founding brainstorm** is mostly shipped on the chart-as-game axis; mostly unbuilt on the competitive / on-chain-PvP / economic axis.

If you only remember three: **Vault is canonical for edits. Repo is canonical for deploys. Umbrel is a parallel world that is mostly unreachable from Cowork.**
