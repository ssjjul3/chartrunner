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
- Latest public milestone: `2026-06-09` unified laser dotted-guide backport live as `v1.0.229`; Tools, Primitives, Blue Laser, and Alarm modes share the same `crLaserCursor` dotted source-to-cursor guide while preserving existing placement and arming behavior. `v1.0.223`-`v1.0.225` chart interaction/guidance parity and the v1.0.226-v1.0.228 broker-wheel/timeframe/coin backports remain included. Bot Terminal remains archived from public launchers/window.
- Solana devnet maps/registry/oracle/match programs: public source and devnet-oriented
- SDK package: gated until publish-ready
- Mainnet/live trading: gated
