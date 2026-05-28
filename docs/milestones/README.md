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

**M0.5 — Security + Anchor unblock** (active 2026-05-13 onward)

## Backlog

| Milestone | Theme | Status |
|---|---|---|
| M0.5 | Security + Anchor unblock | 🟢 active |
| M1 | Tokenomics + fiat onramp | 🔵 next |
| M2 | Coach AI v2 | 🔵 queued |
| M2.5 | SDK extraction (Phase 1) | 🔵 queued |
| M2.6 | NFT avatars + Name Register | 🔵 queued |
| M3 | Build apps (Workbench rebuild) | 🔵 queued |
| M4 | P2P Marketplace | 🔵 queued |
| M5 | Hyperliquid + Helius RPC | 🔵 queued |
| M6 | AI · Telegram bot integration | 🔵 queued |
| M7 | Streaming widget | 🔵 queued |
| M8 | Token launch tournaments | 🔵 queued |
| M9 | Solana Mobile / RN | 🔵 queued |
| M10 | Mainnet deploy | 🔵 queued |
| M11 | Umbrel-native quant toolset (Scanner · Chart · Strategy · Backtest) | 🔵 queued (added 2026-05-28) |
| M12 | Umbrel stack adoption (observability + scraper + dev accelerators) | 🟢 bonus (added 2026-05-28) |

## Evaluator log

Daily plans land in `_evaluator-log/<YYYY-MM-DD>-{daytime,overnight}.md`.
