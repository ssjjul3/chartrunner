# ChartRunner Public System Overview

ChartRunner is a playable chart game and gamified trading SDK. The public system is intentionally focused on the demo, the SDK boundary, and verifiable devnet programs.

## Public Surfaces

- `chartrunner.xyz/` - landing page
- `chartrunner.xyz/play/` - playable browser prototype
- `chartrunner.xyz/solana-connect/` - Solana devnet wallet bridge
- `chartrunner.xyz/telegram/` - Telegram/mobile prototype
- `anchor/` - public Solana devnet program source
- `docs/SDK.md` - public SDK status and package-readiness boundary

## Public Architecture Boundary

ChartRunnerSDK is the only path for order-like actions. The public repository includes paper/sandbox primitives, public interfaces, demo code, and devnet program source.

Standalone SDK package source, generated SDK browser artifacts, live broker execution, hosted agent transports, private data pipelines, premium bot logic, and marketplace operations are not part of the public surface until explicitly released.

## Public Status

- Playable prototype: live
- `/play/` mobile/tablet shell: adaptive portrait/landscape/tablet controls live in `ChartRunner_Prototype.html`
- Solana devnet maps/registry/oracle/match programs: public source and devnet-oriented
- SDK package: gated until publish-ready
- Mainnet/live trading: gated
