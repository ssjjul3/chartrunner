# ChartRunner Prototype

ChartRunner is a playable browser prototype for a gamified trading SDK. The public build focuses on game mechanics, paper/sandbox primitives, wallet handoff, and devnet-verifiable on-chain source.

## Public Surfaces

- `ChartRunner_Prototype.html` - playable single-file game prototype
- `solana-connect/` - Solana devnet wallet bridge
- `telegram/` - mobile/Telegram prototype
- `docs/SDK.md` - standalone SDK package status
- `anchor/` - public devnet program source

## Safety Boundary

ChartRunnerSDK is the only order-like action path. Public builds expose paper/sandbox behavior and explicit wallet handoffs only. Standalone SDK package source, generated SDK artifacts, live broker execution, hosted agent transports, premium bot logic, private data pipelines, and marketplace operations are gated outside the public repository until explicitly released.

## Local Use

Open `ChartRunner_Prototype.html` in a browser, or use the live public build at `https://chartrunner.xyz/play/`.

## Mobile / Tablet Play

`/play/` includes an adaptive mobile shell for phones and tablets: portrait uses compact top-bar commands, bottom-left transparent hotkeys, bottom-right runner controls, mobile app sheets, tap-to-run movement, two-finger chart movement, and one-active-laser routing. Landscape phone and tablet layouts keep more desktop chrome while preserving the touch controls.
