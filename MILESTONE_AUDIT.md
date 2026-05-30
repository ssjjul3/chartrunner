# ChartRunner Milestone Audit — 2026-05-20 (Wed)

> **Canonical maps:** [`SYSTEM_MAP.md`](SYSTEM_MAP.md) (the surrounding system) and [`GAME_MAP.md`](GAME_MAP.md) (the live deployed game v1.0.125). Always-current. Maintenance contract in [`docs/SYSTEM_MAP_UPDATE_PROTOCOL.md`](docs/SYSTEM_MAP_UPDATE_PROTOCOL.md) — covers both files. If you change milestone status, ship a new version, add an ability, or wire on-chain hookups, refresh the relevant file(s) in the same session.

> **Session addendum 2026-05-30** — M14 moved from pure plan to **prototype/source-wired**:
> - `ChartRunner_Prototype.html` advanced through v1.0.141→v1.0.150 around Bot Terminal / Agent Command Center. COACH.llm now uses COACH.exe terminal chrome; the Bot Terminal Coach tab is archived; active tabs are **CONSOLE / SESSIONS / AGENTS**; Sessions persist as real `cr_bot_session_records_v1` docs with id/title/agent/created/updated/events; console + pinned agent widgets share `window.crAgentBus`; Sessions expose New/Rename/Copy `.md`/Archive/Delete/Anchor actions; AGENTS + SESSIONS share the console terminal style; agent icons are game-style SVG glyphs instead of emoji.
> - **M3 surface closeout:** Bot Terminal desktop entry, live Coach summon, and Bot Terminal-style app chrome/interiors now ship across Run, Workbench, Journal, Token, Maps, and Profile surfaces. This moves M3 to PARTIAL (6/16) for surface/chrome only; Workbench tab restores, builders, Metaplex, x402, and real bridges remain open.
> - **M6 surface condition closed:** the Bot Terminal icon/surface condition is now done via M3. M6 remains queued for real Claude / Telegram / Lobster / OpenClaw / Hermes bridge wiring.
> - M14's on-chain provenance path is now source-wired: `chartrunner_registry::record_bot_backtest`, `BotBacktestRecord`, `BotBacktestRecorded`, `PDA_BOT_RUN`, `solana-connect` `record-bot-backtest`, and `crRegistry.recordBotBacktest` are present, and Bot Terminal anchoring prefers that dedicated path before falling back to generic Backtest entities.
> - Verification at wrap: M14 static wiring, agent-on-chain wiring, Bot Terminal browser smoke, Journal alerts regression, extracted-game JS parse, and `NO_DNA=1 cargo check -p chartrunner-registry` pass. Deploy caveat: `NO_DNA=1 anchor build -p chartrunner-registry` currently fails before compile with `missing field discriminator at line 1 column 409`; `solana-connect` build is also not run because local `node_modules`/`tsc` are absent.
> - Remaining M14 blockers are deployment + product completion, not concept proof: Squads-governed registry upgrade, real external transports, LLM-backed Coach panel, headless run controls, sample bot scripts, and history/replay viewer.

> **Session addendum 2026-05-28** ([BRAINSTORM_VS_SHIP_2026-05-28.md](BRAINSTORM_VS_SHIP_2026-05-28.md), [_patches/p0-bridge-rewiring-2026-05-28/](_patches/p0-bridge-rewiring-2026-05-28/)) — three deliverables this session:
> - **Dev-kit P0 bridge-rewiring patch.** One file (`dev-kit/dev-panel.html`), 4 hunks, 50+/1−. Extends `createRemoteBridge()` to mirror the full bridge.js command surface (`run.startHeadless`, `terminal.compose.{execute,simulate}`, `terminal.overlays.{enable,disable,toggle}`, `terminal.chord`, `terminal.panic`, top-level `agents`, `onchain`, `scoring`, `experiments`, `injectMiniBotTerminal`) + null-guards `renderAgentList`. Unblocks COMPOSE Execute/Simulate buttons (already coded, were silently calling missing methods), the Agent Terminal flow, and on-chain test commands. **Crosscuts M2.5, M3, M4, M6 — dev-kit infra, not a single milestone.** Staged in vault, not yet applied to repo.
> - **Founding-brainstorm cross-reference.** Read the Sep 2025 cluster (EN+DE GDDs, Solana keynote outline). Confirmed the keynote outline (Sep 28) is the real product-shaping doc — pivots from fantasy abilities to **trading primitives as abilities** (Ladder, Bracket, OCO, Hedge, Radar, Rescue); 6 of 10 shipped intact. Surfaced the unbuilt founding priorities: (1) **PvP arenas + Sharpe-ELO** = M8 centerpiece, on-chain match primitive already live, (2) **Indicator-Fusion as on-chain crafting** = maps onto the archived Workbench Bot tab in M3, (3) 4 unbuilt keynote abilities (Ice Bridge, Teleport Beacons, Time Dilation, Trail Painter). Per-milestone notes added below.
> - **Umbrel-side ChartRunner buildout (NEW direction — see new milestone M11).** Initially surfaced as "OpenClaw data infra"; on closer reading of the 2026-05-27 + 2026-05-28 Hermes reports it's substantially **Hermes-built** strategic + implementation work at `/opt/data/chartrunner/` (the Hermes container's persistent volume). Three layers: (a) **Strategic docs** — `COMPETITIVE_MAPPING.md`, `P0_REQUIREMENTS.md`, `DATA_MODELS.md` — propose a new four-component product: **Scanner → Chart → Strategy Lab → Backtest Results** (a local-first DexScreener/TradingView competitor). (b) **Implementation spine** — `data_access/` Python package (pairs / chart_state / scanner / db / paths), `backtesting/engine/` (actual runner: `backtest_runner.py`, `data_loader.py`, `job_manifest.py`, `jobs.db`), `pinescript/` (SQLite ingester with `scripts/metadata/evaluations/backtests/duplicates` schema), `coin_profiles/` (regime-history JSON), `db/chartrunner.db` (main app DB). (c) **OHLC data** — Hermes Parquet corpus at `data/ohlcv/` (3.5M files, 3 exchanges, 15 timeframes, ~27 GB) **AND a parallel OpenClaw JSONL corpus** at the separate `/data/umbrel/chartrunner/` mount (379M rows, 79 GB). Per memory `project_chartrunner_hq_telegram_group` the dual-agent OHLC scrape is intentional experiment, winding down; canonical-choice pending. **Wired as new milestone [M11 — Umbrel-Native Quant Toolset](docs/milestones/M11-umbrel-native-toolset.md)** (4/13 done at creation; the strategic docs + data-access + backtest engine already exist on Umbrel). Crosscuts M2 (Coach reads regime profiles + backtest results), M3 (Workbench Backtest tab can call M11's engine via dev-kit bridge after [P0 patch](_patches/p0-bridge-rewiring-2026-05-28/) applies), M5 (M11 backtest engine + OHLC corpus = the Hyperliquid adapter test harness), M8 (closed-arena seed feeder pulls regime-balanced subsets from `coin_profiles/`). Two health flags on the OpenClaw scrape side: DEX OHLC still pending (`DEX_OHLC_TODO.json`; 1,581 fails + 8,276 rate-limits in last GeckoTerminal window), and Bybit deep ended 2026-05-26 04:21 UTC with exit 2 — restart via OpenClaw Cron Jobs.

> **P1 Pine/spec session addendum 2026-05-30** ([SESSION_HANDOVER_2026-05-30_P1_PINE_BACKTESTS.md](SESSION_HANDOVER_2026-05-30_P1_PINE_BACKTESTS.md), [_patches/p1-umbrel-pinescript-pipeline-2026-05-30/](_patches/p1-umbrel-pinescript-pipeline-2026-05-30/)) — P1 Pine/spec evaluation moved from synthetic-only proof to real market data. `backtest_specs.py` now reads OpenClaw JSONL from `ohlc-scraper/data/ohlc-full`, writes detector-proxy rows over 58 daily symbols, and inserts internal baseline comparison rows for `buy_hold`, `sma_cross`, `ema_cross`, and `rsi_mean_reversion`. Current manifest: 116 scripts (112 public MIT + 4 internal baselines), 4008 backtests, 64 exported data-only bot specs. `bot_specs_latest.json` latest metrics now point at `ohlc-jsonl-v1` and still contains no Pine runtime/source. Milestone impact: **M11 → partial 5/13** (Pine/spec real-OHLC lane wired), **M14 → P1 off-chain evidence corpus ready**, **M16 → product reuse proof landed**. Game file was not modified; banner check at close showed `CURRENT VERSION: v1.0.150`.

> **Session addendum 2026-05-26** ([CONSOLIDATED_STATUS_2026-05-26.md](CONSOLIDATED_STATUS_2026-05-26.md)) — movements since the 05-20 table:
> - **M3** (was 🔵 QUEUED · 0/16): x402 moved research → **scaffolded** (bidirectional + multi-rail; 5 files + plan). Workbench-tab restores still queued — M3 not "started" overall, but the x402 condition advanced.
> - **M4** (was 🔵 QUEUED · 3/9): Marketplace **UI wired** (real on-chain listings/buy/list/cancel + resale rows + My Licenses) and **resale-royalty LIVE** — resale instructions deployed in the 2026-05-27 batched registry re-upgrade. UI chain effectively done.
> - **M2.6** (was 🟡 PARTIAL): the dedicated **`claim_name` + global-uniqueness PDA is LIVE** (2026-05-27 deploy) — closes gap #2.
> - **M0.5**: the registry was rebuilt + 2-of-3 re-upgraded + **byte-verified 2026-05-27** (tx `3XHRv5j…`), carrying parity + name-register + resale + oracle-cite → **registry deploy-parity CLOSED**. Oracle remains source-ahead (Item 4 SDK upgrade skipped). Audit still the one open condition.
> - **Item 3 marketplace + Item 2 match-lobby Phase A + the 2026-05-27 registry items are all LIVE.** name-claim / resell / verified-run now work on-chain (verified-run still needs the off-chain Pyth post wired).


> **Purpose of this pass:** reconcile every milestone doc in `docs/milestones/`
> against the work that has actually been **committed / shipped**, and flag where
> the docs lag reality. Triggered by finding that M2.6 (Wallet identity) still
> reads "QUEUED · 1/13" while its avatar + name features have been live since
> v1.0.23 and were last touched in v1.0.122.
>
> This supersedes the **2026-05-18** audit below the line, whose "tonight's
> working slice" (Runroom Phase 1 / sections 4–5) is already marked OBSOLETE and
> whose Runroom + Phoenix-Live sections are PARKED. The standing backlog from
> that pass (Solana/Anchor, infra, marketing) is folded into the per-milestone
> notes here.

---

## 0 · Shipped baseline

- **Latest shipped version: `v1.0.122`** — "runner name is wallet-bound (hide when not connected)." Confirmed by `ship-v1.0.122.command` and inline `v1.0.122` annotations in `ChartRunner_Prototype.html`. Ship scripts present for v1.0.120 / .121 / .122; code annotations run continuously through v1.0.122.
- **Deploy mechanism:** `ship-vX.Y.Z.command` copies `Trading Game/ChartRunner_Prototype.html` → the git repo at `/Users/julianroy/projects/chartrunner`, commits, and pushes (Pages redeploys `chartrunner.xyz/play/`). The "Trading Game" Obsidian vault is the editing source of truth; the repo is the deploy target. `Trading Game` itself is **not** a git work tree.
- **⚠ Stale in-file version banner.** The `<head>` banner (the documented "source of truth" the surface-health daily greps) still reads **`CURRENT VERSION: v1.0.107`, LAST UPDATED 2026-05-15** — ~15 versions behind the code beneath it. The banner-drift grep pattern also only recognises `v1.0.11x`, so v1.0.12x ships are invisible to it.
- **Solana programs (devnet):** `chartrunner_maps` + `chartrunner_registry` live; `chartrunner_oracle` deployed 2026-05-20 (`4vfZ…i5wH`, Playground mirror-struct build); all three under a Squads V4 2-of-3 multisig. `chartrunner_match` still blocked on the Anza Rust-1.85 toolchain wall (day 13).

---

## 1 · Per-milestone sync verdict

| Milestone | Doc says | Committed reality | Verdict |
|---|---|---|---|
| **M0.5 Security** | 🟢 ACTIVE · 2/4 | Multisig holds all 3 program authorities; oracle deployed + upgraded via real 2-of-3 cycle; audit + match-deploy outstanding | ✅ **In sync** (doc updated 05-20) |
| **M1 Tokenomics** | 🔵 NEXT · 0/13 | No on-chain $RUN mint; in-game $CRDS/$RUN balances are UI-only and gated behind "tokenomics paper ships" CSS | ✅ **In sync** |
| **M2 Coach AI** | 🔵 QUEUED · 7/11 | Endpoint, snapshot spec, cost model, prompt template, matcher audit, and prompt eval rounds 1-2 are done. 2026-05-30 repaired live Coach summon/window chrome; the **v2 model-backed integration path** is still unbuilt | ✅ **In sync** — surface parity is explicitly non-counting |
| **M2.5 SDK extraction** | 🔵 QUEUED · 0/12 | **In flight.** `sdk-m1-scaffold/STATUS.md`: SDK catalogued, broker + detectors ported to TS, build pipeline emits to deploy. Pending: swap inline IIFE for the import (M1.4) + regression (M1.5) | ⚠️ **Drift → PARTIAL** |
| **M2.6 Wallet identity** | 🔵 QUEUED · 1/13 | **Largely shipped.** Real NFT picker (Magic Eden), in-game NFT avatar sprite, unified avatar pipeline, wallet-bound name claim (local + on-chain) all live v1.0.23→v1.0.122 | 🔴 **Major drift → PARTIAL** (see §2) |
| **M3 Build apps** | 🟡 PARTIAL · 6/16 | 5 research/audit items done; 2026-05-30 restored Bot Terminal desktop/summon surface + Bot Terminal-style app chrome/interiors. Functional Workbench rebuild, builders, bridge scaffolds, Metaplex, and x402 remain open | ✅ **In sync** |
| **M4 P2P marketplace** | 🔵 QUEUED · 0/9 | Registry has `list_entity`/`buy_entity`/`cancel_listing` instructions but no game-side marketplace | ✅ **In sync** (note: registry primitives exist) |
| **M5 Hyperliquid · Helius** | 🔵 QUEUED · 0/11 | Not started; Phoenix Rise `@ellipsis-labs/rise` now live on npm (clears one M10/M5 dependency, not M5 itself) | ✅ **In sync** |
| **M6 AI · Telegram** | 🔵 QUEUED · 4/10 | Hermes gateway exists (crash-loop); 3 research/audit items + 2026-05-30 Bot Terminal icon/surface are done, but no real in-game external bot bridge/adapters | ✅ **In sync** |
| **M7 Streaming** | 🟡 PARTIAL · 2/9 | RUN-tube + Display shipped early (v0.9.27) | ✅ **In sync** |
| **M8 Tournaments** | 🔵 QUEUED · 0/11 | Not started | ✅ **In sync** |
| **M9 Mobile** | 🔵 QUEUED · 0/12 | `chartrunner-mobile-bot-built/` exists; no touch controls in prototype | ✅ **In sync** |
| **M10 Mainnet** | 🔵 QUEUED · 0/16 | Not started; Phoenix npm-half cleared (one dependency, not the milestone) | ✅ **In sync** |
| **M11 Umbrel-native quant toolset** | 🟡 PARTIAL · 5/13 (updated 2026-05-30) | Strategic docs + data access + initial backtest engine still stand; P1 Pine/spec lane now reads OpenClaw JSONL real OHLC and writes detector-proxy + baseline rows. Remaining: Scanner CLI, Chart, Strategy Lab, Backtest Results View, cross-product contract, and smoke test | ✅ **In sync** (Pine/spec real-OHLC lane wired 2026-05-30) |
| **M12 Umbrel stack adoption** | 🟢 BONUS · 0/8 (added 2026-05-28) | Newly added. Adoption plan for a curated Umbrel-app slice as ChartRunner infra: observability (Grafana + InfluxDB 2 + Uptime Kuma + Plausible), scraper unblock (flaresolverr), dev/docs accelerators (Gitingest + Excalidraw). Tier 2 (Langflow / AnythingLLM / Open WebUI / Arcane-or-Dockge / MinIO / Syncthing) in Blocked bucket. Nothing installed yet — Julian-hands on Umbrel via `umbrel.local` | ✅ **In sync** (created from scan of Umbrel app catalog vs running stack) |
| **M13 Runner Wallet** | 🟢 BONUS · 0/9 (added 2026-05-28) | Newly added. Chrome-extension product: Solana wallet + in-extension LLM + payment helpers ($RUN/$CHART/SOL) + content-script injection of `chartrunner.xyz/play`. Replaces the current `/solana-connect/` URL-bounce architecture (today's marketplace exercise had to hand-build inline Anchor instructions to avoid that bounce). Nothing built — milestone captures product direction from 2026-05-28 Grok session; verified `runner-wallet-extension/` does not exist in vault or repo per `feedback_grok_output_unverified` | ✅ **In sync** (created from session-end strategic capture) |
| **M14 Bot-first runtime** | 🟡 BONUS · source-wired / deploy-gated (updated 2026-05-30) | First real `/play` slice is built: Bot Terminal active as Console/Sessions/Agents, COACH.llm tab archived, terminal-family app styling unified, real session docs/actions/import, shared `window.crAgentBus`, game-style agent glyphs, and source-level `BotBacktestRecord` route across Anchor + solana-connect + game client. Remaining: deploy the registry upgrade, wire real transports + LLM panel, add headless controls, sample bots, and history/replay viewer. **Absorbs M2 Coach v2 + expands M6 AI/Telegram** — both redirect headers remain valid | ✅ **In sync** (advanced from plan to prototype/source-wired 2026-05-30) |
| **M15 Lightweight Charts hybrid** | 🟢 BONUS · 0/8 (added 2026-05-28) | Newly added. TradingView Lightweight Charts as price layer + transparent overlay canvas for game layer (avatar/abilities/monsters) + modular `src/core/{chart-engine,game-overlay,game-world,play-guard}.js` + `src/play/my-runs.html` shell + all chart types + Object Tree / Layer Manager. Pairs with M2.5 SDK extraction. Replaces brainstorm memory `project_grok_hybrid_chart_architecture` with a milestone | ✅ **In sync** (created from session-end strategic capture) |
| **M16 Complete market-data coverage** | 🟢 BONUS · P1 reuse proof landed (updated 2026-05-30) | M16's full venue/layer scope is still open, but the OpenClaw JSONL corpus is now proven product-usable: P1 consumed 58 daily symbols for 3712 detector-proxy rows and 232 baseline rows | ✅ **In sync** (evidence landed, completion still open) |

**Headline:** This audit began as the 2026-05-20 sync pass and now carries 2026-05-26/28/30 addenda. The current status table in `docs/milestones/README.md` is the live index. As of the 2026-05-30 wrap, M3/M6/M11/M14/M16 have fresh state; the older known drift items remain **M2.6** (major historical drift), **M2.5** (in flight vs. old queued wording), and the minor M2 Coach v1/v2 distinction.

---

## 2 · M2.6 Wallet identity — the big drift

The M2.6 doc describes a future where a Helius DAS adapter filters NFTs and a new
`claim_name` Anchor instruction enforces global name uniqueness. **The code took a
different, simpler route and most of the player-visible surface already ships.**

**What actually shipped (committed):**

- **Real NFT picker (v1.0.23).** Replaced the v0.9.95 offline curated-SVG mockup. Reads the connected wallet's actual holdings via Magic Eden's public no-auth API (`https://api-mainnet.magiceden.dev/v2/wallets/{owner}/tokens`), 5-minute in-memory per-wallet cache, honest empty/error states. `cr_player_nft_avatar_v1` localStorage holds the pick. (`ChartRunner_Prototype.html` ~L39921–40196.)
- **In-game NFT avatar sprite (v1.0.119 / v1.0.120).** `_drawLoadoutAvatar` has an image-source branch: when `window._crNftAvatarImg` is loaded it draws the NFT at 16×scale in place of the procedural Invader, with a two-pass CORS loader (`_nftPreloadImage`) and a tainted-canvas fallback to the procedural sprite. Unified across every surface — small tile, big preview, in-game runner. (~L25885–25911, ~L39980–40055.) **This is the exact "drawPlayer image-source branch" the doc lists as an unstarted `[O]` task.**
- **Tabs override NFT (v1.0.121).** Invader/Snake are the default; picking a tab clears the NFT pick. Resolves the "NFT silently wins" footgun.
- **Wallet-bound name claim (v1.0.122).** Local claim + on-chain claim, both bound to the connected wallet; name reverts to `anon_runner` when no wallet is connected. Names render on `crLpName`, `crLpBbText`, `osProfileName`, `crProfilePlayerName`. (~L25130–25500.) **This satisfies the doc's "first-connect name flow" and "names display wherever crLpName is read" conditions.**

**What is genuinely NOT done (the real remaining M2.6 scope):**

1. **Helius DAS is not used at all.** The picker uses Magic Eden's free public API. The doc's central premise — provision a Helius DAS account, store a key in `cr_helius_key_v1`, filter via `getAssetsByOwner` — is **superseded unless a deliberate switch is made.** The open question is no longer "wire up DAS"; it's "do we *need* DAS (richer metadata, rate limits, reliability) over the free ME endpoint, and at what cost?" The two `[D]` Helius docs (DAS exploration + pricing) should be reframed around that decision.
2. **No global name uniqueness on-chain.** The on-chain claim reuses the existing `chartrunner_registry` generic `save_entity` path with `ENTITY_TOKENPROFILE = 6`, whose PDA seeds are `[b"entity", entity_type, owner, name]` — keyed by **owner + name**. Two different wallets can therefore claim the same name on-chain. The doc's `[b"name", name]` global-uniqueness design is unbuilt; a dedicated `claim_name` instruction (or a uniqueness-index PDA) would be needed, plus an M0.5 audit slot for the registry upgrade.
3. **Active avatar-display bug.** Per `CONSOLIDATED_STATUS_2026-05-20.md §4`, a long-running session is stuck on the NFT avatar not rendering (Chrome logs *no* network request for the image load). So the avatar path is committed but **may be broken in the live build** — verify before calling it done.

**Net:** M2.6 should move **QUEUED → 🟡 PARTIAL**. Roughly 7–8 of the original 13 conditions are effectively met (picker, sprite, name flow, name display); the remaining real work is the Helius-vs-ME decision and on-chain name uniqueness — not the long blocked chain the doc currently implies.

---

## 3 · Secondary fixes

- **M2.5 SDK extraction → 🟡 PARTIAL.** `sdk-m1-scaffold/STATUS.md` already tracks it as in-flight (SDK surface catalogued; `SandboxBroker.ts` + detectors ported; TS interface stubs; build pipeline emitting to `chartrunner-prototype/sdk/core/`). The milestone doc's "QUEUED · 0/12" undercounts this. Update the status line and note the M1.4 (swap inline IIFE for the import) + M1.5 (regression) remainder. Note also the dual numbering: the scaffold's internal "M1.1–M1.5" = SDK sub-phases, distinct from roadmap-M1 (Tokenomics).
- **Version banner.** Bump the `<head>` banner to `v1.0.122` / 2026-05-20, append the v1.0.108–v1.0.122 line to "Recent versions," and widen the surface-health grep note to `v1\.0\.\d+` so future ships aren't invisible.
- **M2 Coach AI.** Add a one-line note that v1 Coach (keyword/state `crCoach.reply()` + live ATR/score readout) already ships; M2 scope is strictly the model-backed v2 chat path. Status stays QUEUED.

---

## 4 · Confirmed in sync (no edits needed)

M0.5, M1, M3, M4, M5, M6, M7, M8, M9, M10 all match committed reality. M0.5's doc was refreshed 05-20 and correctly reflects the multisig + oracle work. M4's note: the registry already exposes marketplace primitives (`list_entity` / `buy_entity` / `cancel_listing`), but no game-side surface consumes them, so QUEUED is correct.

---

## 5 · Edits applied in this pass

See task list. Concretely:

1. `docs/milestones/M2.6-wallet-identity.md` — status flip + check off shipped conditions + reframe the Helius and name-uniqueness items as the true remaining scope.
2. `docs/milestones/M2.5-sdk-extraction.md` — status flip to PARTIAL + in-flight note.
3. `docs/milestones/M2-coach-ai.md` — one-line "v1 groundwork live" note.
4. `ChartRunner_Prototype.html` `<head>` banner — version bump + grep-pattern note.

---

*Audit 2026-05-20. Evidence: ship scripts `ship-v1.0.12{0,1,2}.command`; `ChartRunner_Prototype.html` (picker L39921+, avatar branch L25885+, name claim L25130+); `anchor/programs/chartrunner-registry/src/lib.rs` (PDA seeds L26, L293); `sdk-m1-scaffold/STATUS.md`; `CONSOLIDATED_STATUS_2026-05-20.md`.*

---
---

# ⤵ Superseded — ChartRunner Milestone Audit — 2026-05-18

> Retained for backlog reference only. The "tonight's working slice" and Runroom
> Phase 1 / Phoenix-Live sections are OBSOLETE or PARKED (see the 2026-05-19 note
> that previously headed this file). The standing Solana/Anchor, infra, and
> marketing backlog items remain valid and are tracked per-milestone above.
