# ChartRunner Public System Overview

**Status date: 2026-09-21.** ChartRunner is a playable chart game and gamified trading SDK, shipped as one HTML file, with real Mainnet trades through Jupiter since August 2026. This file says what exists, where it lives, and how each claim was established.

Every line carries one of three tags:

- **[measured]** — read from the running service on 2026-09-21 between 02:57 and 03:05 CEST through a browser (`/health` with a cache-buster), the Cloudflare connector or the Supabase connector.
- **[source]** — read from this repository, with file:line. Line numbers are against this branch's HEAD; the client file moves, so re-`grep` the symbol rather than trusting the number.
- **[private]** — lives in `ssjjul3/chartrunner-private-ops`, taken over from `HANDOFF-2026-09-21.md`, not verifiable here.

A report about built code is a description, not a measurement. Numbers below go stale; the tag says how to refresh them.

---

## 1 · Public surfaces

| Path | What | Tag |
|---|---|---|
| `chartrunner.xyz/` | landing (`chartrunner-prototype/index.html`; a second variant lives in root `index.html`) | [source] |
| `/play/` | the game — `ChartRunner_Prototype.html`, 116,449 lines, **7** inline `<script>` blocks, no external `<script src>`. **v1.0.944** was live when the measurement was taken; this branch ships **v1.0.946** (`:114`) | [measured] live version; [source] structure and branch version |
| `/pricing.html` | card via `POST /v1/billing/checkout`, SOL/USDC via `POST /v1/pay/sol/intent` + `GET /v1/pay/sol/status` | [source] `pricing.html:391, 614, 649` |
| `/roadmap.html` | milestones M0–M11. The stale copy is repaired in this branch: chapter count and the Pro fee, see §8 | [source] |
| `/lesson/1…63/` | deep-link stubs → `/play/?campaign=n`; **63 stub directories exist**, display chapters 64–100 have none and 404 on reload | [source] `ls chartrunner-prototype/lesson` |
| `/snake/`, `/monster/`, `/racing/` | minigame routes; `/s/*.html` share cards; `/onramp/`; `/docs/` | [source] |
| `/telegram/` | Telegram Mini App (single file + boot bridge), best-effort deploy | [source] `telegram/README.md` |
| `/solana-connect/` | React/Vite devnet wallet bridge; the redirect target of `crWallet`/`crRegistry` | [source] `solana-connect/package.json` |
| `/ownership/*`, `/loadout*`, `/account/*` | Cloudflare Worker routes on the apex (see §3) | [source] `workers/*/wrangler.toml` |

Deploy: `pages.yml` builds `/`, `/play/`, `/telegram/`, `/solana-connect/`; core surfaces fail the deploy, the last two are `continue-on-error`; cache purge after deploy. **A green run is not live** — check the version string with a nonce. [source] `.github/workflows/pages.yml`, `CLAUDE.md`

## 2 · The client, from the inside [source]

- **Engine + SDK** in script block 6 (opens at `:15517`). `ChartRunnerSDK` is the only order path. Rendering and abilities never cross. [source]
- **≈70 `window.crXxx` IIFE modules**, grouped — wallet/signing/account (`crWallet :16024`, `crSigner :16807`, `crAccount :18611`, `crNames :19856`) · money path (`crTxApi :17282`, `crVaultApi :17587`, `crArm :18386`, `crWeiche :37688`, `crRestingRoute :36704`, `crOnchainLimit :36777`, `crPanelLive :37936`, `crPanelKlar :38494`) · on-chain (`crRegistry :19243`, `crGhost :20113`, `crMarket :20415`, `crMatch :20675`, `crOwnership :74672`) · multiplayer (`crRoomsNet :49532`, default since v1.0.649; `crRoom :48889` legacy relay) · monetisation (`crTier :67443`, `crEntitlement :67519`, `crGate :67638`, `crBilling :67720`) · data/intel (`crBirdeye :107251` residue, `crGoldRush :107779`, `crTraceApi :68672`, `crWalletIntel :68738`) · agents (`crAgentBus :102306`, `crBridge :112493`, `crVault :112611`). [source]
- **One trading surface: the ARM widget** (`#crArmWidgetHome`, moved to the Chart/Run terminal in v1.0.928). `signs:false` end to end — the client signs via `crSigner`, workers never hold a key. [source]
- **UI**: 16 OS windows (`win-run … win-tokenterm`), Splash mode tabs `regular / rooms / campaign / pvp`, TERMINAL tab with views `darkflow, command, info, txn, online, phoenix, solana, cex, hyper, strats`, Settings `tools / account / notif / brokers`, Journal, Control Center (theme, language, notifications — the only place appearance is set since v1.0.937). [source]
- **Campaign**: **107 chapter entries** (`CAMPAIGN_CHAPTERS :60931`, ids 0–107 with 46 absent), of which **100 carry a player-facing number 1–100** (`CR_CH_DISPLAY :61498`, contiguous, no gaps); ids 0, 45, 47, 48, 49, 50 and 53 have no number. **104 are claimable** (`CR_CAMPAIGN_CLAIMABLE :45696`). Each chapter is a coach script, always BTC/15m, 50 $RUN once per chapter. **Player Level** 1–10 from claimed chapters (`_crPlayerLevelRaw :45701`, `CR_LEVEL_MAX :45695`). **`CR_FEATURE_GATE` is empty** (`:45740`, literally `{}`) — the only working level gate is PL10 (PvP tab, skin, weapon). No sequential lock, no score gate, no Pro gate on chapters. **All progress is `localStorage`; nothing server-side.** [source]
- **Two balances**: `game.chart` ($CHART) and `game.run` ($RUN). The $RUN token does not exist on-chain; purchase copy discloses that. [source]
- **Direct third-party calls from the browser**: Supabase (auth, RPCs), Binance spot + futures, DexScreener, GeckoTerminal, CoinGecko, Bonfida/SNS, Solana RPC (devnet for Anchor reads; publicnode/mainnet-beta for balances), Birdeye residue (`public-api.birdeye.so`, dead upstream — BACKLOG 28). **Not called directly**: Jupiter (only via `chartrunner-tx`), Helius (server-side only), Stripe (via the money worker), Pyth (removed 2026-09-20). [source]

## 3 · Services — 14 Cloudflare scripts, one Hetzner box, one Supabase project

**Cloudflare account: 14 scripts** [measured, connector]. Two are not ChartRunner's (`bebindustries`) or orphaned (`my-worker`, 2026-07-21 — `my-worker/` in the private repo deploys as `chartrunner-worker`, not this). `chartrunner-terminal-edge-gateway-staging` (2026-06-07) is the previously "unresolved 14th": a staging script with no directory anywhere known. `chartrunner-hermes-proxy` is deployed with no caller since PR #92 (Pyth removal); only a human can delete it in the dashboard.

| Script | Repo | `/health` · `git_sha` | Role | Tag |
|---|---|---|---|---|
| `chartrunner-worker` | private `my-worker/` | **yes** · `91c8cc6` injected · `signs:false` · `chain:mainnet` · **status `pending`** (only `market_data.cg_quota`: CoinGecko monthly quota, `error_code 10006`, resets 2026-10-01). `boost_checkout` (4 tiers), `pay_identity` (account + wallet), `chain_events` all ok. Price feed Jupiter, `max_age_s 60` | money: billing, boosts, SOL pay intents, market/OHLC/quote proxies, RPC proxy, mail relay | [measured] |
| `chartrunner-tx` | private `workers/tx` | **yes** · v1.28 · `8f63535` · `signs:false`, 31 endpoints | trading: Jupiter swaps (mainnet, 50 bps on the quote side, fee accounts checked on-chain), Trigger **V1 on-chain** (default, referral fee) and **V2 vault** aliases (`fee { bps:0, reason: v2-no-integrator-fee }`), token safety gate, anchors (memo `cr1:…`), price/quote/resolve | [measured] |
| `chartrunner-ohlc-store` | private | yes · v5.19 · **no `git_sha` key** — defect | candles (10 TFs, 251,397 rows), Helius swap webhook (subscriptions 0, webhook deleted), GeckoTerminal rebuild cron (done 495, pending 96, `gt_429_count` 450, `gt_implausibel_count` 15,873), `/v1/whales\|tape\|pressure\|track` | [measured] |
| `chartrunner-ownership` | **this repo** `workers/ownership/` | yes — `GET /ownership/health` (`src/index.js:619`) · `git_sha` only when `GIT_SHA` is injected, else `null` plus a note (`src/index.js:401-403`) · measured `f4a2320…`, `catalog_items []`, `configured.treasury false`, `stripe false` | ownership register (Supabase RPCs), wallet link (Ed25519), loadout; **sells nothing for SOL today** | [source] endpoint; [measured] values |
| `chartrunner-account` | this repo `workers/account/` | **no** | `POST /account/delete` only | [source] |
| `chartrunner-alerts-cron` | this repo `workers/alerts-cron/` | **no** (no route; cron `*/5`) | alert + wallet-watch mails via Resend; GoldRush only through the money worker's `/v1/goldrush` | [source] |
| `chartrunner-trace` | private | yes · v1.3 · D1, Helius | token/wallet trace, quota free 2 / pro 25 per day | [measured] |
| `chartrunner-vault` | private | yes · v1 · 0 vaults | zero-knowledge doc archive | [measured] |
| `chartrunner-data-proxy` | private | yes · v1.5 (kv-swr) | KV/D1 cache proxy; `BIRDEYE_UPSTREAM` points nowhere | [measured] health; [private] upstream |
| `chartrunner-agent-bridge` | private | yes · v1 · MCP 2025-06-18, 27 tools | agent/MCP bridge | [measured] |

Deploy gate: `DEPLOY_GATE` exists only in the private repo and a red gate stops **all** workers there, `tx` included (open item, HANDOFF §6). The three public workers are **ungated** — `deploy-workers.yml` auto-discovers every `workers/*/` with a Wrangler config and runs `wrangler deploy`, with no check between merge and rollout. [source] `deploy-workers.yml`, `grep DEPLOY_GATE` → no hit in this repo; [private] for the gated ones

**Rooms** — `wss://rooms.chartrunner.xyz`, Hetzner, deployed by Julian over SSH; a merge alone changes nothing there. `1.4.0`, `git_sha 15ff009`, `features: [moderation, overlays]`, `maxPlayersPerRoom 8`, `roomTtlSeconds 300`, no persistence, no identity; mute/unmute with a host token, **no per-player removal**; the TTL runs from the moment a room falls empty (`emptySince`), so a room with players in it never expires; overlays `trendline / fibExt / avwap`. `relay.chartrunner.xyz` is legacy and stays the default of `crRoom` only. [measured] health; [private] `emptySince` in `servers/rooms/app/server.js`

**Supabase** — project `ChartRunner`, eu-west-1, Postgres 17.6, ACTIVE_HEALTHY. **13 tables in `public`, all RLS on**: `profiles`, `subscriptions`, `orders`, `cr_names`, `cr_alerts`, `cr_follows`, `cr_ownership`, `cr_wallet_link`, `cr_loadout`, `boost_intents` (4 rows), `boosts` (0), `pay_intents` (1), `on_chain_events` (0). Migrations in this repo: `chartrunner_{names,follows,ownership,ownership_revoke_anon}_migration.sql`; 0001/0003/0004 applied 2026-09-20. **Nobody has bought anything yet** — `boosts` and `on_chain_events` are empty. [measured] tables and rows; [source] the four migration files; [private] 0001/0003/0004

## 4 · On-chain programs (`anchor/`)

Five programs, `Anchor.toml` provider Devnet, no mainnet block; `[programs.devnet]` lists only maps/registry/progression. Nothing in this section was verified against a cluster from this repository.

| Program | `declare_id!` | Head status | Tests | Client | Tag |
|---|---|---|---|---|---|
| `chartrunner-maps` | `DbzEqKfg…3UvH` | devnet | 4 | via `solana-connect/` | [source] |
| `chartrunner-registry` | `ER8G9Bnv…rdcn` | devnet; entities, marketplace, `record_run`, handles, resale, governance; treasury pinned to the Squads vault via Config PDA | 14 — **test file lags source** (`chartrunner-registry.ts:71`) | `crGhost`, `crMarket`, `crRegistry` | [source] |
| `chartrunner-oracle` | **two IDs**: `4vfZ…` (`src/lib.playground.rs:45`, deployed stub) / `7FJj…` (`src/lib.rs:40`, "NOT yet deployed") | contradictory | 3 | none | [source] |
| `chartrunner-match` | `3mzEAWZV…p5zu` | "NOT yet deployed" (client comment says live) — Anchor 0.32.1 + MagicBlock ER | **none** | `crMatch` | [source] |
| `chartrunner-progression` | `3jESG5Wz…jdu5` | **NOT AUDITED — NOT DEPLOYED**, gated M0.5/M10; $RUN tokenomics | **none** | none | [source] |

**Known defect**: `registry/src/lib.rs:107-108` pins `ORACLE_PROGRAM_ID = 4vfZ…` as a compile-time constant while `oracle/src/lib.rs:40` declares `7FJj…`; the cert check is optional and would fail silently. No `#[cfg(test)]` anywhere in `anchor/programs/`. `verified-build.yml` excludes `match` and `oracle`. `PAY_CHAIN = "mainnet"` describes the payment rail, not these programs. [source]

`record_run` takes `(nonce, asset[16], timeframe[8], score, sharpe_x100, duration_secs, map_hash[32])` — `anchor/programs/chartrunner-registry/src/lib.rs:314-321`. There is **no `Profile` account**; `TokenProfile` is entity type 6 in the entity registry (`lib.rs:19`). [source]

## 5 · Data providers

| Provider | Answers | Path | Tag |
|---|---|---|---|
| **Jupiter** (`api.jup.ag`, keyed) | quotes, swaps, Trigger V1/V2, headline price for pay intents and boosts | `chartrunner-tx`; money worker `price_feed.source: jupiter` | [measured] |
| **CoinGecko Pro / GeckoTerminal** | catalogue, market rows, OHLC rebuild | money worker `/v1/market`, ohlc-store `gt_mode: pro`; client direct for GT trending/new pools | [measured] quota exhausted until 2026-10-01 |
| **Helius** | RPC, DAS, swap webhooks | ohlc-store, trace, money worker `/v1/rpc` | [measured] configured; [private] 12,716 / 16 M credits |
| **GoldRush (Covalent)** | wallet-watch signatures only | alerts-cron → money worker `/v1/goldrush` | [source] |
| Binance, DexScreener, Bonfida | tickers/klines/futures data; pair price/liquidity; SNS names | client direct | [source] |
| Stripe | card subscriptions | money worker `/v1/billing/*` (ownership worker's own Stripe slot is unset) | [measured] |
| Resend | mails | alerts-cron | [source] |
| ~~Birdeye~~, ~~Pyth/Hermes~~ | removed | ~200 dead Birdeye call sites remain in the client (BACKLOG 28); hermes-proxy script still deployed | [source] client residue; [measured] script still deployed |

**Treasury**: one single-key wallet for all revenue and trade fees (ed25519, not a vault). Its address is served by the money worker's `/health` and is **not written into this file** — take it from Julian, never from a screenshot. Vault-or-not is decision §7.1 in the handoff. [private]

## 6 · Boundaries that hold

`ChartRunnerSDK` is the only order path. Workers sign nothing (`signs:false` measured on tx and the money worker). JWTs for Jupiter's vault pass through and are never stored. Secrets never enter the repo, the client or a ticket. The leakage guard (`scripts/check_public_leakage.mjs`) is the public/private line. Nothing financially effective happens without Julian's click and wallet signature. [source] + [measured] `signs:false`

## 7 · Known gaps (not a status, a defect list)

Account and alerts-cron answer no `/health` **[source]**. ohlc-store answers without `git_sha` **[measured]**. The ownership worker reports `git_sha: null` unless `GIT_SHA` is injected **[source]**. Level progress and $RUN balances are client-only and freely settable **[source]**. `CR_FEATURE_GATE` is empty while UI copy still promises level unlocks **[source]**. Two oracle IDs **[source]**. Registry test file stale **[source]**. `solana-connect` still carries a placeholder registry program ID (`ChRegSdLcj4N4ek3uW3RZE3pWYuKSTrgVLWeKQrU3yVz`, `src/lib/cr-registry-program.ts:29`) instead of the deployed `ER8G9Bnv…` **[source]**. Display chapters 64–100 have no `/lesson/` stub **[source]**. Landing copy claims sequential chapter unlocks that do not exist **[source]**. Claim-by-claim grounding for the 2026-09-19 state: `docs/STATUS-2026-09-19.md`.

## 8 · Two things settled on 2026-09-21

- **Roadmap stamp.** M5 (second venue / Phoenix) is **planned**, M8 (tournaments) is **planned with no date**. In the page this is `data-id="m5" data-status="next"` (legend “◆ Unlocked”) and `data-id="m8" data-status="future"` (legend “🔒 Locked”); the M8 copy now ends on “No date yet.” The status attributes were **not** changed — only the copy. [source] `chartrunner-prototype/roadmap.html:320-333, 620-626, 701-702`
- **Pro fee 0.35 %: configured in the client, not in the money path.** The client knows the two rates (`ChartRunner_Prototype.html:67546`, `crEntitlement.fees.tradingPct { free: 0.5, pro: 0.35 }`) and keeps the fee engine off (`:67533`, `tradingLive: false`). `chartrunner-tx` v1.28 has **no tier concept at all**: `ONCHAIN_FEE_BPS` is 50 for everyone. So the rate is decided and advertised, but not built — `roadmap.html` and `pricing.html` now say “planned” rather than stating it as current. BACKLOG 38 carries the build. [source] client; [private] `workers/tx/src/index.js`
