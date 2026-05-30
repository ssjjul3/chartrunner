# M6 — AI · Telegram bot integration

**Status:** 🔵 QUEUED · ⚠️ **EXPANDED & REFRAMED by [[M14-bot-first-runtime]]**
**Theme:** Bot Terminal becomes a real bridge to Claude / Telegram bots / Lobster / OpenClaw / Hermes. Pulls Telegram's newest mini-app + AI features into the in-game Terminal.

> **REDIRECT 2026-05-28** — [[M14-bot-first-runtime]] reframes this scope. M6 originally centered on Telegram as the bot transport; M14 broadens it to ≥5 agents (Hermes / OpenClaw / Grok / Claude / Codex) with Telegram as one transport among many. The Bot Terminal surface itself, the multi-agent adapter pattern, the on-chain `BotBacktestRecord`, and the Coach LLM panel all live in M14. M6 narrows to its **Telegram-specific** bits: Telegram WebApp integration (mini-app surface), Telegram bot bridge as one M14 agent adapter, and bot-to-game command pings via Telegram. The other 4 agent bridges migrate to M14. Until Julian confirms, both milestones stay queued.

> **UPDATE 2026-05-30** — the M14 surface is now source-wired in `/play`: `window.crAgentBus` drives the Bot Terminal session/activity store, and agent work anchoring prefers the dedicated `BotBacktestRecord` route. M6 should now be treated as the transport/comms milestone, not the place where the Terminal UI or on-chain provenance schema is invented.

> **Surface closeout 2026-05-30** — The Bot Terminal desktop/icon surface and Coach summon path are back online, and app chrome now follows the Bot Terminal styleguide. This clears the old icon/surface blocker only. M6 still has no real Claude / Telegram / Lobster / OpenClaw / Hermes bridge wiring.

## Completion condition (all required)

- [x] Bot Terminal icon restored in Voll-OS dock (surface restored 2026-05-30 via M3)
- [ ] Per-bot bridge contracts defined (Claude / Telegram / Lobster / OpenClaw / Hermes)
- [ ] At least 3 of 5 bridges actually wired (not stubs)
- [ ] Telegram WebApp integration (so ChartRunner can be opened inside a Telegram bot)
- [ ] Bot-to-game command surface (e.g. Telegram bot pings ChartRunner when a setup fires)

## Imminent-solvables

### Ready bucket

> **All 3 Ready-bucket items done 2026-05-20** (auto-resolve sweep). Key takeaway: Claude + Telegram + the existing `crQvac` engine clear the "≥3 of 5 bridges" bar with no partner dependency.

- [x] 2026-05-20 — `[D]` Bot bridge spec — `docs/architecture/M6-bot-bridges.md`. Per-bridge spec + shared `CrBridge` interface. Buildable now: **Claude, Telegram**. Partner-blocked: Lobster (no public API), OpenClaw, Hermes.
- [x] 2026-05-20 — `[D]` Telegram WebApp research — `docs/architecture/M6-telegram-webapp.md`. Mini-app launch surfaces, BotFather setup, `initData` HMAC/Ed25519 validation, the Solana-wallet-in-WebView problem.
- [x] 2026-05-20 — `[O]` Bot Terminal audit — `docs/architecture/M6-bot-terminal-audit.md`. UI fully built (`#win-bot` L8493, 4 tabs, `BOT_AGENTS` roster) but all connections are **mock**; the real `crQvac.ask()` engine (L47549) is wired only into the pinned widget, not the Terminal — narrow wiring gap.

### Blocked bucket

- [ ] `[D]` Claude bridge wiring — **BLOCKED:** bridge spec + M2 endpoint live (Coach already routes through Claude).
- [ ] `[D]` Telegram bot bridge — **BLOCKED:** bridge spec + Telegram dev account.
- [ ] `[D]` Lobster bridge — **BLOCKED:** bridge spec + Lobster API access.
- [ ] `[D]` OpenClaw bridge — **BLOCKED:** bridge spec + OpenClaw partner relationship.
- [ ] `[D]` Hermes bridge — **BLOCKED:** bridge spec + Hermes partner relationship.
- [ ] `[D]` Telegram WebApp deploy — **BLOCKED:** integration research + bot.

### Done bucket

- [x] 2026-05-30 — Bot Terminal desktop/icon surface restored via M3; no bridge/adaptor completion counted beyond the surface condition.

## State

- Progress: 4/10 done — all 3 Ready-bucket items written 2026-05-20, plus the 2026-05-30 Bot Terminal icon/surface restore. Remaining 6 are Blocked-bucket bridge/deploy wiring (Claude + Telegram are buildable now off the spec; Lobster/OpenClaw/Hermes need partner access).
- Blockers active: 6
- Scheduled today: 0

## Notes

- M6 builds on M3 (Bot Terminal UI scaffold restored 2026-05-30) and M2/M14 (Coach as a model-backed bridge).
- Telegram WebApp opens new distribution channels — Solana memecoin season trained the audience.
- Partner relationships (Lobster, OpenClaw, Hermes) may need outreach BEFORE the milestone starts.
