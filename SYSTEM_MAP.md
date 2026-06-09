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
- Latest public milestone: `2026-06-09` object alarms and bracket tools release live as `v1.0.255`; per-object Alarm setup now covers tools, primitives, indicators, Blue Laser object cards, and individual levels such as Fib, Bracket TP/SL, ladder rungs, channel/VWAP-style levels, while Journal Alert V2 renders detailed progression. Uniform object settings tabs, Fib Extension hit/config repair, Bracket resolved-access/shootability archive, and Bracket trade-size fee/profit inputs are included. `v1.0.230` unified cursor/scroller behavior and earlier public chart interaction backports remain included. Bot Terminal remains archived from public launchers/window.
- Solana devnet maps/registry/oracle/match programs: public source and devnet-oriented
- SDK package: gated until publish-ready
- Mainnet/live trading: gated
