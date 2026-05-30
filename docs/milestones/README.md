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

**M2.6 — Avatar identity + hotkey execution USP** (active focus 2026-05-30 onward)

M0.5 remains an external audit/security workstream, but the product/demo focus has moved to the first-minute USP: **import avatar → avatar becomes runner/cursor/profile identity → hotkey 4 initiates trades**.

## Latest wrap

- **2026-05-30 — M14 BotBacktestRecord heavy path source-wired.** `record_bot_backtest`, `BotBacktestRecord`, `BotBacktestRecorded`, `record-bot-backtest`, and `crRegistry.recordBotBacktest` now exist across Anchor, `solana-connect`, and `/play`. Browser smoke confirms Bot Terminal uses the dedicated path and still saves local proof docs. True on-chain completion remains gated on the local Anchor/IDL build blocker and the Squads-governed devnet registry upgrade.

## Backlog

| Milestone | Theme | Status |
|---|---|---|
| M0.5 | Security + Anchor unblock | 🟡 audit workstream |
| M1 | Tokenomics + fiat onramp | 🔵 next |
| M2 | Coach AI v2 | 🔵 queued |
| M2.5 | SDK extraction (Phase 1) | 🟢 runtime green · publish gated |
| M2.6 | Avatar identity + hotkey execution USP | 🟢 active |
| M3 | Build apps (Workbench rebuild) | 🟡 partial · Bot Terminal surface/chrome shipped (updated 2026-05-30) |
| M4 | P2P Marketplace | 🔵 queued |
| M5 | Hyperliquid + Helius RPC | 🔵 queued |
| M6 | AI · Telegram bot integration | 🔵 queued · 4/10 surface/research done, bridges pending |
| M7 | Streaming widget | 🔵 queued |
| M8 | Token launch tournaments | 🔵 queued |
| M9 | Solana Mobile / RN | 🔵 queued |
| M10 | Mainnet deploy | 🔵 queued |
| M11 | Umbrel-native quant toolset (Scanner · Chart · Strategy · Backtest) | 🟡 partial · Pine/spec real-OHLC lane wired (updated 2026-05-30) |
| M12 | Umbrel stack adoption (observability + scraper + dev accelerators) | 🟢 bonus (added 2026-05-28) |
| M13 | Runner Wallet (Chrome extension — wallet + LLM + payments + /play injection) | 🟢 bonus (added 2026-05-28) |
| M14 | Bot-first runtime + Agent Command Center (absorbs M2, expands M6) | 🟡 bonus · prototype/source-wired / browser-verified / deploy-gated + P1 evidence corpus ready (updated 2026-05-30) |
| M15 | Lightweight Charts hybrid + bloat reduction (pairs with M2.5) | 🟢 bonus (added 2026-05-28) |
| M16 | Complete market-data coverage | 🟢 bonus · P1 reuse proof landed (updated 2026-05-30) |

## Evaluator log

Daily plans land in `_evaluator-log/<YYYY-MM-DD>-{daytime,overnight}.md`.
