# ChartRunner Milestones — condition + state

This folder is the source of truth for milestone state. The two evaluator scheduled tasks (`cr-evaluator-morning` @ 07:00 and `cr-evaluator-evening` @ 21:00) read these files daily and pick the next imminent-solvable sub-tasks to schedule.

## Concepts

- **Condition milestone** — a goal with completion conditions (not a date). One markdown file per milestone (`M0.5-security.md` etc).
- **Imminent solvable** — a sub-task that fits in ≤1 day, produces a concrete artifact, has clear pass/fail. Tagged `[O]` (overnight: testing/analyzing/debugging) or `[D]` (daytime: research/dev/deploy).
- **Evaluator** — the morning + evening scheduled tasks. Read milestone state → pick 1–2 (daytime) or 2–3 (overnight) imminent-solvables → schedule them for that block.

## Tag legend
- `[O]` overnight — testing · analyzing · debugging · scanning · drift detection · dry-runs · documentation generation · memory consolidation · backtest sims
- `[D]` daytime — research with web · architecture decisions · code writing · deploys · auditor outreach · drafting · external API integration

## Checkbox states
- `[ ]` Ready — eligible for evaluator pick
- `[~]` In progress — scheduled this block, not yet completed
- `[x]` Done (date) — produced an artifact / shipped commit
- `[!]` Blocked — condition listed inline; evaluator skips until condition met
- `[SCHEDULED <date>]` tag appended by evaluator when it picks a task

## Active milestone

**M17 — Jupiter Perps competition Weather Ops** (active event focus through 2026-06-06)

M0.5 remains an external audit/security workstream. M2.6 remains the product/demo focus after the competition window, but the near-term active focus is the Superteam Germany Jupiter Perps event: **refresh live BTC/ETH/SOL + Jupiter + catalysts → replay/eval → Weather payload → manual playbook before the 16:00 Berlin qualifier**.

## Latest wrap

- **2026-06-01 — Live v1.0.204 M3 Ready campaign repairs shipped.** Deploy commit `9258e11` pushed SDK-first MACD, Bollinger Bands, and ATR helpers, live 3-anchor Parallel Channel, and restored Campaign Ch.8/25/26/27 to public `/play` with the 1-39 numbering intact. Curl and browser smoke verified the live banner, 39 visible campaign cards, restored chapters, and no console errors.
- **2026-06-01 — M17 competition Weather Ops created.** The Superteam Germany Jupiter Perps Trading Cup prep is now tracked as `M17-jupiter-perps-competition-weather-ops.md`: OpenClaw manual dispatch completed the BTC/ETH/SOL live capture, Jupiter Perps state, catalyst scan, replay-eval, Weather payload, and manual playbook path. A heartbeat is scheduled for 2026-06-06 15:30 Berlin to rerun the live cycle before the 16:00 qualifier. Hard boundary unchanged: no worker trading, signing, fund movement, secret exposure, or public posting.
- **2026-06-01 — Public `/play` verified at v1.0.203.** Deploy commit `62f30f4` pushed the Configure Run polish repair live after the v1.0.202 Start Run/Terminal repair. Verified locally and live before the later v1.0.204 M3 campaign release: Configure Run full-hitbox buttons, selected broker names, compact DEX/CEX picker, chart widgets hidden until a run and closable during a run, Back/Start press feedback, and desktop-vs-chart Terminal scoping. M14 remains source-wired / Labs-gated / production deploy-gated, and no signing/broker/on-chain path changed.
- **2026-05-31 — Historical interactive closeout.** At that bookkeeping pass, vault source was v1.0.201 and public `/play` was last verified at v1.0.198. Docs/maps/milestone audit were refreshed after the Coach toolbar anchor pass (`v1.0.189`) and provider/advisor source notes (`v1.0.190`/`v1.0.191`). No deploy or milestone status flip in that pass: M2 stayed partial, M3 stayed partial, and M14 stayed source-wired / Labs-gated / production deploy-gated.
- **2026-05-31 — Public `/play` closeout at v1.0.198.** Deploy repo commit `b8aeb9d` pushed the windowed, blurred boot login and Terminal chart/run mode repair live. GitHub Pages completed, and live fetch confirmed `CURRENT VERSION`, boot label, and `CONFIG.VERSION` all read `v1.0.198`. The vault editing source has since moved to v1.0.201; do not treat v1.0.201 as public default until the next ship.
- **2026-05-31 — Coach LLM self-host/BYO lane live.** Commit `801461d` shipped the local/BYO provider cockpit and bounded `cr.quant.v1` context. Free default remains deterministic fallback; local Ollama/Umbrel-style endpoints stay local-only unless the player explicitly opts into remote endpoints. Security smokes verify Coach text cannot execute tools, route orders, sign, or call `crAgentBus.execute`.
- **2026-05-31 — Bot Terminal hosted event poller in source.** At that source wrap, v1.0.201 added Labs-only hosted `/events` polling into `crAgentBus.ingest(agentId, evt)`. Inbound work becomes visible session/proof tape, not hidden execution; production bridge deploy, secrets, KV, Telegram mapping, and approval telemetry remain open.
- **2026-05-31 — Umbrel data_jobs autonomous deployment + market-wide database spec.** `data_jobs/umbrel/run_once.cjs` is deployed on Umbrel as the user-level `chartrunner-data-jobs.timer`, writing live Binance public trades/funding/OI manifests every 15 minutes under `/home/umbrel/chartrunner-data/data_jobs` while blocking liquidations by design. A market-wide catalog spec for Binance + Bybit + Solana DEXes was approved at `docs/superpowers/specs/2026-05-31-market-wide-crypto-database-design.md`; M16 moves from reuse proof to design-approved implementation-ready.
- **2026-05-30 — M14 BotBacktestRecord heavy path source-wired.** `record_bot_backtest`, `BotBacktestRecord`, `BotBacktestRecorded`, `record-bot-backtest`, and `crRegistry.recordBotBacktest` now exist across Anchor, `solana-connect`, and `/play`. Browser smoke confirms Bot Terminal uses the dedicated path and still saves local proof docs. True on-chain completion remains gated on the local Anchor/IDL build blocker and the Squads-governed devnet registry upgrade.

## Backlog

| Milestone | Theme | Status |
|---|---|---|
| M0.5 | Security + Anchor unblock | 🟡 audit workstream |
| M1 | Tokenomics + fiat onramp | 🔵 next |
| M2 | Coach AI v2 | 🟡 partial · self-host/BYO provider lane live; hosted production/eval path open |
| M2.5 | SDK extraction (Phase 1) | 🟢 runtime/package green · publish/live gated |
| M2.6 | Avatar identity + hotkey execution USP | 🟢 active |
| M3 | Build apps (Workbench rebuild) | 🟡 partial · live v1.0.204 restores SDK-first MACD / Bollinger Bands / ATR + Parallel Channel campaign routes; Workbench tab restores still open (updated 2026-06-01) |
| M4 | P2P Marketplace | 🔵 queued |
| M5 | Hyperliquid + Helius RPC | 🔵 queued |
| M6 | AI · Telegram bot integration | 🔵 queued · bridge research + hosted scaffold/event queue exist; production Telegram/agent transports pending |
| M7 | Streaming widget | 🔵 queued |
| M8 | Token launch tournaments | 🔵 queued |
| M9 | Solana Mobile / RN | 🔵 queued |
| M10 | Mainnet deploy | 🔵 queued |
| M11 | Umbrel-native quant toolset (Scanner · Chart · Strategy · Backtest) | 🟡 partial · Pine/spec real-OHLC lane + autonomous data_jobs runner (updated 2026-05-31) |
| M12 | Umbrel stack adoption (observability + scraper + dev accelerators) | 🟢 bonus (added 2026-05-28) |
| M13 | Runner Wallet (Chrome extension — wallet + LLM + payments + /play injection) | 🟢 bonus (added 2026-05-28) |
| M14 | Bot-first runtime + Agent Command Center (absorbs M2, expands M6) | 🟡 bonus · source-wired / live-Labs-gated / hosted event poller in source / production deploy-gated (updated 2026-06-01) |
| M15 | Lightweight Charts hybrid + bloat reduction (pairs with M2.5) | 🟢 bonus (added 2026-05-28) |
| M16 | Complete market-data coverage | 🟡 bonus · market-wide catalog design approved; first Binance trades/funding/OI adapters source-ready (updated 2026-05-31) |
| M17 | Jupiter Perps competition Weather Ops | 🟢 active · event-window prep; live-cycle heartbeat scheduled for 2026-06-06 15:30 Berlin |

## Evaluator log

Daily plans land in `_evaluator-log/<YYYY-MM-DD>-{daytime,overnight}.md`.
