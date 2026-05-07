# ChartRunner

> **Fortnite meets Space Invaders meets a trading chart.** Every trade is a game move.

[![Live](https://img.shields.io/badge/live-chartrunner.xyz-14F195)](https://chartrunner.xyz/)
[![Solana](https://img.shields.io/badge/solana-devnet%20chain%20LIVE-9945FF)](https://chartrunner.xyz/solana-connect/)
[![Phase](https://img.shields.io/badge/phase-0.9.7%20multiplayer%20on--chain-success)](#status)
[![Anchor](https://img.shields.io/badge/anchor-2%20programs%20deployed-brightgreen)](anchor/)
[![Stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Vite%20%2B%20Rust-blue)](#stack)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

## Live now

| Surface | URL | What it is |
|---|---|---|
| 🎮 **Landing** | https://chartrunner.xyz/ | Project page · pitch · animated hero |
| 🕹 **Game** | https://chartrunner.xyz/play/ | The playable prototype · wallet-first boot login |
| 🪙 **Wallet bridge** | https://chartrunner.xyz/solana-connect/ | Phantom Connect (Frontier-recommended embedded wallet) + Backpack + Solflare → devnet handshake |
| 📖 **Pitch deck** | [PITCH-DECK.pdf](PITCH-DECK.pdf) · [.pptx](PITCH-DECK.pptx) | Full pitch · 22 slides incl. v0.9.7 update |

## On-chain — Phase 2 LIVE on Solana devnet

Both Anchor programs are **deployed and verifiable on Solana Explorer.** Players mint real `RunRecord` PDAs from inside the game; async multiplayer leaderboard polls every 60s and renders ghost markers on every player's chart for the same asset.

| Program | Address | Job |
|---|---|---|
| `chartrunner_maps` | [`DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH`](https://explorer.solana.com/address/DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH?cluster=devnet) | SHA-256 map index, PDA per (wallet, name) |
| `chartrunner_registry` | [`ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn`](https://explorer.solana.com/address/ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn?cluster=devnet) | 9-entity registry · first-sale marketplace · run leaderboard |

IDLs committed at [`anchor/target/idl/*.json`](anchor/target/idl/). Source at [`anchor/programs/chartrunner-{maps,registry}/src/lib.rs`](anchor/programs/).

## What it is

A **gamified trading SDK** built on three pillars — **gamification**, **education**, and **on-chain (industry-standard)**. Players run on real candle data (Binance, Coinbase, Bitfinex, Hyperliquid — any OHLCV source), drop into the upside-down on volatility, and every ability — bracket, ladder, OCO, hedge, radar, rescue — is a real trading primitive that routes through `ChartRunnerSDK`. The same SDK plugs into a real Solana adapter in Phase 2 — and the on-chain marketplace + leaderboard primitives are live on devnet today.

The hard architectural rule: **abilities never touch the canvas, the SDK is the only thing that issues orders.** That's what made Phase 2 a swap, not a rewrite.

For the Frontier hackathon submission, the social and on-chain gaming layer is intentionally prioritized over monetization — tokenomics, marketplace P2P, and bot-terminal commerce sit on the post-hackathon roadmap (see below). What ships in the demo is the on-ramp, not the cash register.

## Status

**Phase 2 chain LIVE · v0.9.7 multiplayer on devnet.** Four deploy surfaces all working on chartrunner.xyz, two Anchor programs deployed and verifiable on Solana Explorer, wallet-first boot login (Phantom / Backpack / Solflare), async on-chain leaderboard rendering ghost markers from real `RunRecord` PDAs, full quant scoring spine + 10 SDK detectors + 8-chapter scripted Campaign + tool-aware laser system.

| Phase | Goal | State |
|---|---|---|
| **0** | Playable game prototype · onboarding · juice · simplicity | ✅ Shipped |
| **0.5** | Devnet wallet + signed transaction | ✅ Live at `/solana-connect/` |
| **0.9** | Public landing · repo · CI · Pages deploy | ✅ Shipped |
| **0.9.3** | Wallet-gated entry + per-wallet localStorage | ✅ Shipped |
| **0.9.4** | `chartrunner_maps` program + on-chain SaveMap | ✅ Deployed devnet · `Dbz…3UvH` |
| **0.9.5** | P2P Marketplace, 6 categories | ✅ Shipped |
| **0.9.6** | `chartrunner_registry` — multi-entity + marketplace | ✅ Deployed devnet · `ER8…rdcn` |
| **0.9.7** | Async multiplayer leaderboard + wallet-first login | ✅ LIVE · real RunRecord PDAs minting from inside the game |
| **0.9.9–0.9.12** | quant.pdf Tier 1 — scoring spine + 10 detectors + Workbench Quick Builder + real-data Terminal widgets | ✅ Shipped |
| **0.9.13–0.9.14** | Play-app subcategories (Regular/Campaign/Minigame/PVP) + sleeker mode cards + Fib Extension tool | ✅ Shipped |
| **0.9.15–0.9.16** | 8-chapter Campaign coach + tool-aware laser beam + per-primitive setup guide + commit confetti | ✅ Shipped |
| **0.9.17–0.9.21** | Run Controls → in-game lite profile · hotkey 3 = green primitives laser · campaign chapters direct-launch | ✅ Shipped |
| **0.9.22** | Primitives laser expanded — 18 entries · 11 tier-1-4 SDK primitives surfaced as click placements (limit/stopLoss/takeProfit/trailingTp/scaleOut/magnet/perpFlip/borrowShort/liqGuard/twap/iceberg) | ✅ Shipped |
| **0.9.8** | **Phoenix Rise broker adapter + Flight builder integration** — every in-game primitive (bracket/OCO/limit/market/stop) routes to live Phoenix perpetual orders via `@ellipsis-labs/rise`. Flight wrap means ChartRunner accrues `fee_bps` (currently 25 bps = 0.25%) on every routed order — fees withdrawable from the Phoenix frontend. Scaffold landed at [`solana-connect/src/lib/phoenix-rise.ts`](solana-connect/src/lib/phoenix-rise.ts). | 🟡 Adapter scaffolded · pending `npm install @ellipsis-labs/rise` + Flight builder slot from Phoenix |
| **0.9.9** | **MagicBlock Ephemeral Rollup integration — realtime PvP** — new Anchor program [`chartrunner_match`](anchor/programs/chartrunner-match/src/lib.rs) holds shared `MatchState` PDA. Host calls `delegate_match`, then every player streams `tick_player` instructions to `https://devnet-as.magicblock.app/` at sub-millisecond latency, zero fee. `commit_match` periodically pushes state back to Solana base layer for verifiability; `commit_and_finish` ends the match and undelegates. Client adapter at [`solana-connect/src/lib/magicblock-ephemeral.ts`](solana-connect/src/lib/magicblock-ephemeral.ts). Built against `ephemeral-rollups-sdk` v0.11.1 (Rust) + `@magicblock-labs/ephemeral-rollups-sdk` v0.0.4 (TS), Anchor 0.32.1. | 🟡 Both scaffolds shipped · pending Anchor 0.32.1 workspace upgrade + first deploy via Solana Playground |
| **0.9.10** | **Honeycomb Protocol integration — game-economy primitives** — Edge Client adapter at [`solana-connect/src/lib/honeycomb-economy.ts`](solana-connect/src/lib/honeycomb-economy.ts) wraps `@honeycomb-protocol/edge-client` so ChartRunner's profile / mission / character / resource flows route to Honeycomb's on-chain primitives instead of being re-invented in `chartrunner_registry`. Every run becomes a NectarMissions `participate → recall` lifecycle; `$CRDS` and `$RUN` move as Honeycomb resources via delegated `MintResources` / `BurnResources` permissions; trader progression lives as state-compressed Character traits. Compression = **99.5%+ cost reduction** vs raw Solana accounts (per Honeycomb Cost Comparison page). Third ecosystem partner alongside Phoenix Rise + MagicBlock. | 🟡 Adapter scaffolded · pending `npm install @honeycomb-protocol/edge-client` + Honeynet bootstrap (project + character model + resource mint) |
| **0.9.11** | **Pyth Core integration — verifiable price feeds** — new Anchor program [`chartrunner_oracle`](anchor/programs/chartrunner-oracle/src/lib.rs) wraps Pyth's pull-oracle pattern: client posts a Hermes VAA to a `PriceUpdateV2` account, then `verify_price` reads it via `pyth-solana-receiver-sdk` v0.6.1, enforces a 30-second freshness gate, and writes a `PriceCertificate` PDA seeded by (trader, feed_id). `chartrunner_registry::record_run` and `chartrunner_match::tick_player` cite the certificate on-chain — a forged score now requires forging Pyth's signed VAA, which is impossible. Client adapter at [`solana-connect/src/lib/pyth-feeds.ts`](solana-connect/src/lib/pyth-feeds.ts) covers Hermes REST snapshots, WebSocket streaming (~400 ms cadence), the post-update + verify atomic transaction, and certificate readback. Three feeds wired by default — BTC/USD, ETH/USD, SOL/USD. Fourth ecosystem partner: **Phoenix for trades, MagicBlock for matches, Honeycomb for economy, Pyth for truth.** | 🟡 Both scaffolds shipped · pending `npm install @pythnetwork/hermes-client @pythnetwork/pyth-solana-receiver` + Anchor 0.32.1 workspace upgrade + first deploy via Solana Playground |
| **1** | SDK pull-over · drop runtime onto Dexscreener / TradingView | 🟡 Architecture done · in `sdk/` next |
| **2** | Anchor programs deployed to devnet → mainnet | 🟡 Devnet live · mainnet pending |

## Post-Frontier roadmap

The May-11 demo build is intentionally tight — gamification, education, and on-chain primitives only. Everything below is the post-hackathon arc, in roughly the order it will land:

| Milestone | Theme | What lands |
|---|---|---|
| **M0.5** | Security hardening | Wrap `chartrunner_maps` + `chartrunner_registry` upgrade authorities in a **Squads multisig** (used by Helius / Jito / Kamino / Jupiter). Independent Anchor program audit. Resolves the upstream `solana-pubkey` v2/v3 conflict in `ephemeral-rollups-sdk` so the two scaffold-complete programs (`chartrunner_match`, `chartrunner_oracle`) ship live. |
| **M1** | Tokenomics paper + fiat onramp | $CRDS / $RUN supply curves, sinks, vesting, swap math. Restores the token UI surfaces (Profile balances, Marketplace, Missions) hidden behind v0.9.12 feature flags. **MoonPay** or **Coinbase Onramp** for fiat → $RUN distribution. |
| **M2** | Coach · AI Q&A v2 | Hardcoded FAQ ships in v0.9.12 (Frontier demo). M2 routes Coach to a real model endpoint with chart + position context. |
| **M2.5** | SDK extraction (Phase 1 unblock) | M1.4 / M1.5 — extract `ChartRunnerSDK` from the inline IIFE into the publishable `@chartrunner/core` npm package via the inline-bundler pattern (see `sdk-m1-scaffold/DEFUNCT.md`). Unlocks Dexscreener / TradingView host overlays. |
| **M3** | Build apps | Bot Terminal back online, Workbench Strategies / Indicators / Terminal / Backtest / App Builder / Theme tabs restored. App Builder template gallery rewritten — the v0.9.11 P&L Tracker + Trade Notes templates are deprecated. **Metaplex Agent Kit** registers Workbench bots as on-chain agents (014 registry); **Coinbase x402** for paid API access on premium bots / advanced indicators. |
| **M4** | Intel · P2P commerce | Marketplace restored as a real on-chain P2P surface for bots, maps, strategies, indicators, themes. Backed by `chartrunner_registry`. |
| **M5** | Hyperliquid integration + production RPC | Second live-trading partner alongside Phoenix Rise. **Helius** RPC replaces public devnet endpoint for production-grade reads. *Action item: check whether Hyperliquid runs hackathons we should align with.* |
| **M6** | AI · Telegram bot integration | The Bot Terminal becomes a real bridge to Claude / Telegram bots / Lobster / OpenClaw. Telegram's newest mini-app + AI features get pulled into the in-game Terminal. |
| **M7** | RUN-tube · Streaming + display layer | Two-part: (a) **RUN-tube** — a draggable video widget for in-game picture-in-picture (creator face on chart while running) + an inline file-display app for documents (pitch decks, strategy PDFs, chart snapshots). Ships partially in v0.9.27 as the **demo + pitch video recording rig**. (b) Full streaming-site connectors (YouTube / Twitch / Kick / X Live) ship at the milestone proper. |
| **M8** | Token launch tournaments | Natural extension of streaming. 1v1 / 2v2 / NvN players each launch a token, control supply, fight on the chart, win opponent supply as reward. Tournament entry fees + payouts in **CASH** (Phantom-backed stablecoin, Frontier-recommended payout asset). **World ID** proof-of-human gate against bot farms. The ChartRunner social + on-chain gaming endgame. |
| **M9** | Solana Mobile / React Native | iOS + Android build via the Phantom React Native template + Solana Mobile / Saga integration. Touch-native chart interactions. |
| **M10** | Mainnet deploy | Audit-clean Anchor programs deployed to Solana mainnet-beta. Phoenix Rise + MagicBlock + Honeycomb + Pyth integrations move from devnet to live. CASH and $RUN become spendable, not just demo currencies. |

## Why this matters

74% of new retail traders quit within 90 days. Bloomberg looks like a hospital monitor, paper-trading feels like homework, and YouTube doesn't transfer to real screens. ChartRunner replaces that on-ramp with a game where **the act of trading is the lesson** — and every primitive learned in the game is the same SDK call that lives in production.

Hyperliquid + Phantom flipped the wallet UX. Memecoin season trained 8M+ wallets to swap on-chain. The infra is here. The skill on-ramp is missing. We're the on-ramp.

**The mainnet partner thesis: Phoenix.** Phoenix Rise is the live-trading partner that maps 1:1 to ChartRunner's primitive vocabulary — bracket, OCO, stop-loss, limit, market — every in-game gesture has a corresponding Rise instruction builder. Better, Phoenix's **Flight** builder layer means ChartRunner-routed orders auto-accrue `fee_bps` to a registered builder authority. **No marketplace UI is required for revenue** — Flight is the business model. See `docs.phoenix.trade` and the integration scaffold at [`solana-connect/src/lib/phoenix-rise.ts`](solana-connect/src/lib/phoenix-rise.ts).

**The realtime-multiplayer thesis: MagicBlock.** Two players running on the same chart in real time isn't possible at Solana's base-layer 400ms slot times. **Ephemeral Rollups** solve this: the `MatchState` PDA gets delegated to MagicBlock's ER validator, where every player's `tick_player` instruction settles in **~1ms at zero fee**. Every 30s the rollup `commits` state back to the Solana base layer for verifiability — and at match end, `commit_and_finish` undelegates so the final state lives on Solana forever, naturally chaining into a `chartrunner_registry::record_run` for the on-chain leaderboard. See `docs.magicblock.gg` and the integration scaffold at [`solana-connect/src/lib/magicblock-ephemeral.ts`](solana-connect/src/lib/magicblock-ephemeral.ts).

**The game-economy thesis: Honeycomb.** Profiles, missions, character traits, and a resource ledger ($CRDS, $RUN) are exactly the kind of game-economy primitives `chartrunner_registry` was beginning to re-invent. Honeycomb's Edge Client ships them as compressed Solana accounts — per their Cost Comparison page, **creating a profile drops from 0.0052 SOL to 0.0000041 SOL (99.92% cheaper)**, and a mission start drops from 0.0024 SOL to 0.0000001 SOL (99.59% cheaper). Every ChartRunner run is modeled as `participate(mission) → recall(mission) → claim rewards`; rank, primitives unlocked, and ghost-quality multiplier live as Character traits; $CRDS and $RUN move as Honeycomb resources under delegated `MintResources` / `BurnResources` permissions. See `docs.honeycombprotocol.com` and the integration scaffold at [`solana-connect/src/lib/honeycomb-economy.ts`](solana-connect/src/lib/honeycomb-economy.ts).

**The price-truth thesis: Pyth.** The other three partners assume the price the score was computed against is real. Today, ChartRunner pulls candles from Binance REST and the client signs over the resulting score — solid for replay and training, but not provably honest. Pyth Core closes the loop: a new Anchor program [`chartrunner_oracle`](anchor/programs/chartrunner-oracle/src/lib.rs) accepts a fresh Pyth update via the receiver SDK's pull pattern (Hermes VAA → `PriceUpdateV2` account → `verify_price` instruction → `PriceCertificate` PDA, with a 30-second freshness gate), and `chartrunner_registry::record_run` cites that certificate on-chain. A forged score now requires forging Pyth's signed VAA — which means forging Wormhole guardian signatures, which is the same security model as Pyth itself. Same on-chain truth feeds the live tape: Hermes WebSocket gives ~400 ms ticks for BTC/ETH/SOL into the game's HUD. Four thesis-mapping primitives, four ecosystem partners — **Phoenix for trades, MagicBlock for matches, Honeycomb for the economy, Pyth for the truth.** See `docs.pyth.network` and the integration scaffold at [`solana-connect/src/lib/pyth-feeds.ts`](solana-connect/src/lib/pyth-feeds.ts).

## What's in v0.9.22

> **v0.9.22 (latest deploy)** expanded the green primitives laser (hotkey 3) from 7 → **18 entries** across 3 categories. New **Orders category** surfaces 11 tier-1-to-4 SDK primitives as one-click chart placements: limit, stopLoss-at, takeProfit-at, trailingTP-at, scaleOut-at, magnet-at, perpFlip-at, borrowShort-at, liqGuard-at, plus 2 two-anchor primitives (TWAP, Iceberg). Each gets per-tool color, glow, setup guide card, and commit confetti.

## What's in v0.9.21 (still current)

### Quant brain — `sdk.scoreSetup()` spine + 10 detectors (Tier 1 from quant.pdf, all live)

A **Signal Quality Scoring system** mirrors institutional confluence weighting from a 39-page trading methodology PDF. Top-right HUD pill shows live 0–20 score with tier label (WAIT / TRADEABLE / STRONG / PRIME) — players trade only ≥6 setups.

| Component | SDK method | Pts | Detection |
|---|---|---|---|
| HTF trend alignment | (inline) | +2 | Last close vs SMA(50) vs SMA(200) |
| Reference level proximity | `computeReferenceLevels` | +2 | Within ATR/4 of dOpen / pdH/L/C / pdVAH/POC/VAL / IBH/IBL |
| Volume node bonus | (inline) | +1 | Nearest level is pdPOC |
| Class A/B/C divergence | `_findSwings` + RSI | +2/+1/0 | Real swing-based geometry classifier |
| Champions Channel | (inline + autoFib band) | +2 | Price in 0.55–0.66 fib retrace of last 50-bar swing |
| Consolidation breakout | (inline) | +2 | Recent 20-bar range / prior 20-bar range < 0.6 + close outside |
| SFP | `sdk.detectSFP` | +2 | Wick beyond real swing high/low + close back inside |
| Failed Auction | `sdk.detectFailedAuction` | +2 | Open outside prior-day VA + accept back inside |
| OI confirmation | `sdk.detectOIConfirm` | +1 | Binance Futures `/openInterestHist` REST · OI direction matches price |
| Bump-and-Run reversal | `sdk.detectBumpAndRun` | +1 | Bulkowski's BARR — bump slope ≥2× lead slope + run pierces lead trendline |
| Head & Shoulders / Inverse | `sdk.detectHeadShoulders` | +2 | 5-swing matcher — shoulders within 5%, head >2% above, neckline pierce |
| **CCV composite mega-bonus** | `sdk.detectCCV` | +1 | All three (consolidation + Champion Zone + volume) fire (PDF cites ~80% WR) |

Per-frame **CCV watcher** (`ccvWatcherTick`) auto-fires a banner + optional auto-bracket when CCV matches. Five **probe abilities** in the menu let players manually inspect any detector and see ✓/✗ per component.

### Reference Levels overlay (`reflevels` indicator)

Toggleable horizontal lines for the canonical Igor / quant.pdf level template: **dOpen** (today's open), **pdHigh/Low/Close**, **pdVAH/POC/VAL** (prior-day value area, 70% capture, 24-bin volume bucket expansion from POC), **IBH/IBL** (initial balance high/low — first hour of session). Per-level checkboxes + opacity slider. Cached on `game._refLevelsCache` keyed by candle/asset/timeframe.

### Champions Channel autoFib upgrade

Fib retracement now ships an 8-level default (added 0.66) with a pulsing yellow shaded band between 0.618–0.66 ("CHAMPION ZONE 0.618–0.66" label). PDF cites 68% bounce probability inside this band. Auto-fib also infers swing chronology and pushes the fibRetrace overlay alongside the order ladder.

### Fib Extension tool (v0.9.14)

New 2-anchor laser tool — 9 default levels (1, 1.272, 1.414, **1.618 Golden Extension** with thicker stroke + pulsing blue band 1.5–1.7, 2, 2.272, 2.618, 3.618, 4.236). Extends right past anchor 2 by default. Use for take-profit targets.

### Workbench Quick Builder (no-code strategy builder)

Strategy + Indicator builder views get a "⚡ Quick Builder · No-code" panel above the existing Pine textareas. **Strategies:** all 12 confluence components shown as toggleable rows with weight sliders (0 to max). Side picker (Long/Short/Both), min-score slider (1–17), risk %, R:R, live preview button (calls `sdk.scoreSetup()` on current candles). **Indicators:** preset dropdown clones any built-in INDICATORS entry, color picker, per-param sliders. Saves snapshots alongside Pine code so future edits restore form state.

### Real-data Terminal widgets

Terminal `+` builder gets four new template kinds: **Confluence Signals** (live score + tier + breakdown), **Reference Levels** (all 9 levels), **Watchlist** (BTC/ETH/SOL/HYPE/DOGE async-cached tickers), **Live Indicators** (RSI/ATR/SMA50/SMA200/Vol vs median). All bind values refresh on the 1s `_wbTermBind` tick — no mocks.

### Tool-aware laser beam + setup guide overlay (v0.9.16)

Per-primitive 3-layer beam (white-hot core + colored mid + glow halo) with spark particles. Color keyed off the active tool: bracket=green, OCO=red, fib=gold, fibExt=blue, etc. **Setup guide card** (top-center floating banner) shows per-primitive: icon + name + step counter + current step ("Click swing low") + animated demo glyph (single-click pulse / two-anchor sequence) + small-print hint. Confetti burst in tool color at click point on commit.

### Hotkey 3 = green primitives laser (v0.9.19 + v0.9.21)

Slot 3 toggles a parallel laser-aim mode tinted green. Spawn menu reads **"PRIMITIVES"** in the header (not "TOOLS") and is filtered to Fibonacci + Forecast categories. Auto-equips the canonical primitive set regardless of player's Workbench tools: Bracket · OCO · Long Position · Short Position · Fib Ladder · Fib Retracement · Fib Extension. Shift+3 still opens the legacy modal picker.

### Play app subcategories + 8-chapter Campaign coach (v0.9.13–v0.9.18)

Run-window pill tabs: **Regular** (Time is Money, Trade) · **Campaign** (8 chapters) · **Minigame** (Snake, Racing, Monster) · **PVP** (Battle Arena). Sleeker mode cards (smaller min-height, refined typography). Each Campaign chapter direct-launches into a preset BTC/USDT chart (skips Configure Run window) with per-chapter indicators pre-equipped, then `crCampaignCoach` activates a top-center banner that gates progression on real game events (SDK orders, indicator toggles, score thresholds). 19 scripted steps total across the 8 chapters; player can Skip or wait for auto-advance.

### Run Controls in lite profile (v0.9.20b)

Reset / Save / Coins / Connect Wallet moved off the topbar (now hidden) into the in-game lite profile widget (`#crLightProfile`) as a 2×2 button grid. Wallet-connected glow mirrors via MutationObserver. Topbar buttons stay in DOM so existing handlers still work — lite profile entries just `.click()` through.

### The game (`/play/`) — pre-existing surfaces

- Real Binance klines (15 timeframes, 1m → 1M), 9+ assets
- Three avatar physics modes — runner / flight / upside-down
- Original 6 SDK primitives + 18 new tier-1-to-4 primitives shipped in v0.9.8
- Two-anchor laser placement for every two-anchor primitive
- Workbench Pine Script builder for custom bots, strategies, indicators, terminal widgets, full apps
- 🪙 Save on-chain + 📤 List on Marketplace buttons on every Workbench row
- Backtest tab with paper-mode simulator
- Desktop OS — Profile · Marketplace · Terminal · Workbench · Maps · Bot Terminal · Token Terminal · Configs
- Multi-tracker Terminal: Engine · HyperTracker · SolanaTracker · CEXTracker · Strategies + `+` tab
- Drag-to-desktop AND drag-to-chart-background widgets
- Save run as a Map → optional on-chain anchor confirm
- Mobile phone OS overlay

### Wallet integration (Phase 0.9.3+)
- **Wallet-gated entry** — landing's Play CTAs route through `/solana-connect/?next=play` for the handshake first
- **Connect button** on both the in-game topbar and the desktop OS menubar (mint pill when connected, click to disconnect with confirm)
- **Per-wallet localStorage namespacing** via `Storage.prototype` shim — each connected wallet sees its own Profile, Maps, Workbench data; guest mode is a clean slate (`__guest__` namespace)
- **`crWallet` IIFE** owns wallet state; `crRegistry` IIFE wraps the on-chain dispatcher

### On-chain (Phase 0.9.4 + 0.9.6 + 0.9.7) — `anchor/programs/`
- **`chartrunner_maps`** — single instruction `save_map(name, content_hash)` → PDA per (wallet, name)
- **`chartrunner_registry`** — multi-entity registry + marketplace, six instructions:
  - `save_entity(type, name, hash, royalty_bps)` — supports 9 entity types (Map · Strategy · Bot · Indicator · Backtest · App · TokenProfile · Widget · Tool)
  - `delete_entity(type, name)` — owner-only, refunds rent
  - `list_entity(type, name, price)` — creates Listing PDA on the marketplace
  - `buy_entity(type, name)` — escrow tx: 95% to seller, 5% to protocol treasury, mints License PDA for buyer
  - `cancel_listing(type, name)` — seller-only, refunds listing rent
  - `record_run(asset, tf, score, sharpe, duration, map_hash, nonce)` — leaderboard substrate
- **TS instruction builders** — hand-rolled in `solana-connect/src/lib/cr-*.ts`, no `@coral-xyz/anchor` dep, ~600 lines covering all 7 instructions
- **Anchor program code-complete; deployment via Solana Playground** is the one remaining step to flip from placeholder Program IDs to live devnet addresses

### P2P Marketplace (Phase 0.9.5+) — six categories
- **Bots** — Pine bot orbs that detect setups in real time
- **Maps** — full saved chart setups (asset, TF, indicators, overlays, destruction state, thumbnail)
- **Strategies** — Pine strategy code with hash anchored to creator
- **Backtests** — verified results (Sharpe / WR / MaxDD) hash-anchored to parent strategy
- **Indicators** — Pine overlay/badge/panel indicators
- **Apps** — HTML widgets that install as desktop OS icons
- **Real on-chain Buy flow** — clicking Buy on a listing with seller info routes through `/solana-connect/?action=buy-entity` for wallet popup + signed tx

### Async multiplayer (Phase 0.9.7) — `crGhost` IIFE
- **On-chain leaderboard** docked to the right edge of the chart, top-10 ranked by score for the current (asset, timeframe)
- **No server, no WebSocket** — vanilla-JS RPC client polls `chartrunner_registry` `getProgramAccounts` every 60s with memcmp filter for `RunRecord` discriminator
- **Manual Borsh decode** in 30 lines (no `@solana/web3.js` dep; keeps single-file constraint intact)
- **🏆 Record on-chain button** on the run-end screen — anchors (asset, tf, score, sharpe, duration, map_hash) so other players see the run on their leaderboard
- **Live pulse dot** in the panel corner signals on-chain polling activity

### Solana edge (`/solana-connect/`)
- React 18 + Vite 5 + TypeScript strict + `@solana/wallet-adapter-react`
- Wallet Standard auto-discovery (Phantom, Backpack, Solflare, Glow, etc.)
- **Five operating modes** selected by URL params:
  - `memo` — default; freeform memo demo
  - `connect` — `?next=play`; wallet-only handshake before `/play/`
  - `save-map` — legacy `chartrunner_maps` flow (one-trick)
  - `registry` — multi-action handler for the registry program (save / list / buy / cancel / record-run)
- Explorer-verifiable signatures, devnet faucet link
- One-card UI per action with full metadata preview before signing

### Landing (`/`)
- defikingdoms-style landing page
- Animated candle chart hero with drifting Invader sprite
- Bracket-flow canvas demo (laser → click → click → bracket on a 7s loop)
- 6-card mechanics grid · architecture diagram · Solana section · 3-phase roadmap
- **All Play CTAs route through wallet handshake** (v0.9.3+)
- All inline, no external deps, dark mode

## Stack

| Surface | Stack | Build |
|---|---|---|
| Landing | Static HTML · vanilla JS · canvas | None |
| Game prototype | Single HTML file · vanilla JS · canvas (~25 KB minified equiv) | None (build-free by design — see hard rule below) |
| Solana connect | React 18 · TypeScript strict · Vite 5 · `@solana/web3.js` 1.95 · wallet-adapter | `npm run build` |
| Anchor programs | Rust · Anchor 0.30.1 · Solana 1.18.x | `anchor build` (or Solana Playground) |
| Skills | `skills/chartrunner` (game work) · `skills/solana` (devnet React work) | — |
| CI | GitHub Actions: parse-check HTML + Vite build + Pages deploy | Auto on push |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  ChartRunner Game (canvas)                      │
│  - Player physics, monsters, particles          │
│  - Tools: bracket, ladder, OCO, hedge, radar    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  ChartRunnerSDK (framework-free)                │
│  - placeBracket / placeLadder / placeOCO        │
│  - openHedge / radarScan / rescue               │
│  - Event bus: order:filled, position:closed     │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌────────────┐ ┌─────────────┐ ┌──────────────┐
│ Mock       │ │ Solana      │ │ Mainnet      │
│ paper      │ │ devnet      │ │ Phase 2.5    │
│ Phase 0    │ │ live now    │ │ planned      │
└────────────┘ └─────────────┘ └──────────────┘
```

The single architectural rule: **ChartRunnerSDK is the only thing that issues orders.** Abilities call the SDK. The SDK calls the adapter. The adapter calls the venue.

## Run locally

### The game prototype (no install)
```bash
git clone https://github.com/ssjjul3/chartrunner.git
cd chartrunner
open ChartRunner_Prototype.html        # macOS
xdg-open ChartRunner_Prototype.html    # Linux
start ChartRunner_Prototype.html       # Windows
```

No install, no wallet, no npm. The game runs.

### The Solana devnet page
```bash
cd solana-connect
npm install
npm run dev      # http://localhost:5173
```

You'll need a Solana wallet extension (Phantom or Backpack). Get devnet SOL from the in-page faucet link, then sign a memo.

## Repo layout (current state)

```
chartrunner/
├── ChartRunner_Prototype.html          # Game prototype (canonical source · 1.8MB)
├── chartrunner-prototype/              # Pages deploy folder
│   ├── index.html                      #   → landing page (root URL)
│   └── README.md
├── solana-connect/                     # Vite + React Solana devnet page
│   ├── src/
│   │   ├── App.tsx                     # 5 modes: memo / connect / save-map / registry
│   │   ├── main.tsx
│   │   └── lib/
│   │       ├── memo.ts · explorer.ts · format.ts
│   │       ├── cr-maps-program.ts      # Manual ix builder for chartrunner_maps
│   │       └── cr-registry-program.ts  # Manual ix builder for chartrunner_registry
│   ├── package.json · vite.config.ts · tsconfig.json
│   └── README.md
├── anchor/                             # Anchor workspace — 2 programs
│   ├── Anchor.toml
│   ├── Cargo.toml
│   ├── programs/
│   │   ├── chartrunner-maps/           # Single instruction: save_map
│   │   │   └── src/lib.rs
│   │   └── chartrunner-registry/       # 9-entity registry + marketplace + record_run
│   │       └── src/lib.rs
│   ├── tests/                          # Mocha smoke tests
│   ├── package.json
│   └── README.md                       # Toolchain install + Playground deploy guide
├── skills/
│   ├── chartrunner/                    # Game-work skill (auto-loaded)
│   └── solana/                         # Solana single-file React skill
├── docs/
│   ├── PROBLEM.md · MVP.md · COMPETITIVE.md · TRACTION.md
│   ├── PITCH-DELIVERY.md · VIDEO-SCRIPT.md · X-LAUNCH.md
│   ├── REPO-STRUCTURE.md · EXECUTION-CHECKLIST.md
├── docs/
│   ├── architecture/                   # Phase 0/1/2 plans, SDK arch, model parity
│   ├── legacy/                         # v0.6/0.7/0.8 backlogs, kept for history
│   ├── CHANGELOG-v0.9.x.md             # Per-version changelog
│   ├── MVP.md · COMPETITIVE.md · TRACTION.md  # Pitch supplements
│   └── SDK-REFERENCE-v0.9.21.md        # Latest SDK API reference
├── ChartRunner_v0.{6,7,8}_Backlog.md   # version backlogs
├── PITCH-DECK.pptx + .pdf              # 12-slide submission deck
├── build_deck.py                       # Python script to regenerate the deck
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # parse-check on PR
│   │   └── pages.yml                   # build + deploy both surfaces
│   ├── ISSUE_TEMPLATE/{bug,feature}.md
│   └── PULL_REQUEST_TEMPLATE.md
├── LICENSE                             # MIT
├── PUBLISH.sh                          # one-shot publish script
└── README.md                           # ← you are here
```

For the **target** Phase 1 layout (sdk/, adapters/, chart-host/, workbench/ as workspaces), see [docs/REPO-STRUCTURE.md](docs/REPO-STRUCTURE.md).

## Quick links

- 📖 [Problem validation](docs/PROBLEM.md)
- 🎯 [What's in the MVP](docs/MVP.md)
- 🥊 [Competitive edge](docs/COMPETITIVE.md)
- 📈 [Traction](docs/TRACTION.md)
- 🎤 [Pitch delivery guide](docs/PITCH-DELIVERY.md)
- 🎬 [Video script](docs/VIDEO-SCRIPT.md)
- 🐦 [X launch kit](docs/X-LAUNCH.md)
- 🏗 [Production repo target](docs/REPO-STRUCTURE.md)
- ✅ [Execution checklist](docs/EXECUTION-CHECKLIST.md)
- 🪙 [Solana skill (devnet React)](skills/solana/SKILL.md)

## Contributing

PRs welcome. The hard rules are documented in `.github/PULL_REQUEST_TEMPLATE.md`:

1. No new dependencies in the single-file HTML
2. Abilities don't touch the canvas (use the SDK)
3. SDK is the only thing that issues orders
4. Default topbar ≤ 5 elements

CI parse-checks the HTML on every PR. The full Pages deploy runs on `main` push and updates both surfaces in ~2 minutes.

## Contact

- **Email:** jsg@julianroy.com
- **GitHub:** [@ssjjul3](https://github.com/ssjjul3) · [chartrunner](https://github.com/ssjjul3/chartrunner)
- **X:** [@chartrunner_xyz](https://x.com/chartrunner_xyz)
- **Demo:** https://chartrunner.xyz/

## License

MIT — see [LICENSE](LICENSE). Two Anchor programs (`chartrunner_maps` + `chartrunner_registry`) ship code-complete in `anchor/` — runtime requires the one-time Solana Playground deploy described in [`anchor/README.md`](anchor/README.md). Built without raising a round (yet — open to seed conversations after first traction milestones).
