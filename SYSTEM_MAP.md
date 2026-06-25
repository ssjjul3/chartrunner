# ChartRunner Public System Overview

ChartRunner is a playable chart game and gamified trading SDK. The public system is intentionally focused on the demo, the SDK boundary, and verifiable devnet programs.

## Public Surfaces

- `chartrunner.xyz/` - landing page
- `chartrunner.xyz/play/` - playable browser prototype with adaptive desktop, phone, and tablet controls
- `chartrunner.xyz/solana-connect/` - Solana devnet wallet bridge
- `chartrunner.xyz/telegram/` - Telegram/mobile prototype
- `anchor/` - public Solana devnet program source
- `docs/SDK.md` - public SDK status and package-readiness boundary

## Public Architecture Boundary

ChartRunnerSDK is the only path for order-like actions. The public repository includes paper/sandbox primitives, public interfaces, demo code, and devnet program source.

Standalone SDK package source, generated SDK browser artifacts, live broker execution, hosted agent transports, private data pipelines, premium bot logic, and marketplace operations are not part of the public surface until explicitly released.

## Public Status

- Playable prototype: live
- `/play/` mobile/tablet shell: adaptive portrait/landscape/tablet controls with chart-only mode rail and collapsible HOT tray live in `ChartRunner_Prototype.html`
- Latest public milestone: `2026-06-25` onboarding/terminal/economy pass live as `v1.0.568`. First-run onboarding is a clean guided tour (Play → Terminal → Profile → Token → Coach.llm → Connect; Maps for connected wallets; Journal stop archived until unlocked) that opens with a name prompt, uses `>_NAME` blinking-cursor titles, pops each surface's tooltip, runs a desktop-only drag-and-drop demo on the Terminal/Token steps, and locks the desktop so no run starts mid-tour; multiplayer join prompts for a name. The in-game command console is single-command with a toolbar toggle (one line ↔ hidden) plus a new `⌘ COMMAND` Terminal tab carrying the full run tape and missed-`Build? Y/N` replay (executes only if still valid). Token terminal renames `Buy`/`Strong Buy` → `UP`/`MOON`, squares the gold watchlist star, and labels the swap router `offline router · 100:1`; phones collapse `12H`+ timeframes behind a dropdown; RUN buttons gain a blinking CTA. Economy: per-run grind-coin `$CHART` is front-loaded and hard-capped (closes a short-chart farm exploit); non-Binance small-caps fall back to seeded candles fast via a 7s fetch timeout. Earlier `v1.0.255` object alarms/bracket tools and `v1.0.230` unified cursor/scroller backports remain included. Bot Terminal remains archived from public launchers/window. No broker routing, signing, or live execution was added.
- Solana devnet maps/registry/oracle/match programs: public source and devnet-oriented
- SDK package: gated until publish-ready
- Mainnet/live trading: gated
