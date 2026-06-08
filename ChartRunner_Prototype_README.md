# ChartRunner Prototype

ChartRunner is a playable browser prototype for a gamified trading SDK. The public build focuses on game mechanics, paper/sandbox primitives, wallet handoff, and devnet-verifiable on-chain source.

Current public prototype version: `v1.0.229`.

## Public Surfaces

- `ChartRunner_Prototype.html` - playable single-file game prototype
- `solana-connect/` - Solana devnet wallet bridge
- `telegram/` - mobile/Telegram prototype
- `docs/SDK.md` - standalone SDK package status
- `anchor/` - public devnet program source

## Safety Boundary

ChartRunnerSDK is the only order-like action path. Public builds expose paper/sandbox behavior and explicit wallet handoffs only. Standalone SDK package source, generated SDK artifacts, live broker execution, hosted agent transports, premium bot logic, private data pipelines, and marketplace operations are gated outside the public repository until explicitly released.

Bot Terminal public demo work has been archived to `chartrunner-private-ops`; live `/play/` keeps the public Coach advisory surface and hides Bot Terminal launchers/window. Configure Run now uses the sleeker Run-window setup language with slimmer controls, a flat broker row, and a Solana token paste field that can load real GeckoTerminal pool OHLCV candles for public mint addresses. RUN-tube keeps its PIP camera behavior while matching the active window theme. See `docs/milestones/2026-06-05-solana-token-chart-adapter.md` for the latest public token-chart milestone.

`v1.0.223`-`v1.0.225` keeps the same public boundary while tightening chart interaction parity: advanced chart objects and active indicator surfaces are shootable, draggable, configurable, and Blue Laser-armable where appropriate, and Support, Coach, and Campaign copy now explain that model without adding live broker execution, signing, or hidden order routing.

`v1.0.229` is the public-safe unified laser dotted-guide backport from the local v1.0.251 cursor work. Hotkeys `2`, `3`, `4`, and `5` share one `crLaserCursor` renderer and draw the same dotted source-to-cursor guide for Tools, Primitives, Blue Laser, and Alarm modes without adding broker routing, signing, or live execution.

## Local Use

Open `ChartRunner_Prototype.html` in a browser, or use the live public build at `https://chartrunner.xyz/play/`.

## Mobile / Tablet Play

`/play/` includes an adaptive mobile shell for phones and tablets: portrait uses compact top-bar commands, a bottom-left collapsible HOT tray for hotkeys, bottom-right runner controls, mobile app sheets, tap-to-run movement, two-finger chart movement, and one-active-laser routing. Landscape phone and tablet layouts keep more desktop chrome while preserving the touch controls.

Mobile regression smoke:

```sh
node scripts/check_play_mobile_adaptive_shell_browser.cjs
```
