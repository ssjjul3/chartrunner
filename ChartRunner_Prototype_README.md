# ChartRunner Prototype

ChartRunner is a playable browser prototype for a gamified trading SDK. The public build focuses on game mechanics, paper/sandbox primitives, wallet handoff, and devnet-verifiable on-chain source.

Current public prototype version: `v1.0.568`.

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

`v1.0.230` is the public-safe unified cursor/scroller backport from the local v1.0.246-v1.0.251 cursor work. Hotkeys `2`, `3`, `4`, and `5` share one `crLaserCursor` renderer and draw the same dotted source-to-cursor guide for Tools, Primitives, Blue Laser, and Alarm modes. Runner is folded into the Scroller toolbar cycle, the button paints the avatar sprite only while Runner is selected, non-runner scrollers holster Runner/laser input, and in-game COACH.llm stays routed through the headbar while the toolbar launcher is hidden. No broker routing, signing, or live execution was added.

`v1.0.255` is the public object alarms and bracket tools release. Tools, primitives, indicators, Blue Laser object cards, and TradingView-style settings can save local per-level alarms into Journal Alert V2 progression rows; Bracket, ladder, OCO, HLine, VWAP, Fib Retracement, Fib Extension, and indicator settings share Inputs / Style / Alarm / Coordinates / Visibility where applicable. Fib Extension projected levels are hittable/configurable again, Bracket remains accessible after resolution and shootable without destructive removal feedback, and Bracket Inputs now include trade size, leverage, round-trip fee, fee hurdle, and TP net-profit estimates. No broker routing, signing, or live execution was added.

`v1.0.565`-`v1.0.568` is an onboarding, in-game terminal, and economy pass. The first-run onboarding tour is rebuilt as a clean guided sequence (Play → Terminal → Profile → Token → Coach.llm → Connect; Maps is inserted for connected wallets; a Journal stop stays archived until the app is unlocked) that opens with a "What's your name" handle prompt, renders terminal-style `>_NAME` titles with a blinking cursor, pops each surface's own tooltip as it highlights it, runs a desktop-only guided drag-and-drop demo on the Terminal/Token steps, drops the Back button and step counter, and locks the desktop so no run can start mid-tour. Joining a multiplayer room now prompts for a name. The in-game command console shows only the latest single command, with a green toggle moved into the chart toolbar (one line ↔ hidden) and a new `⌘ COMMAND` tab in the Terminal app that holds the full run command tape and lets players answer a bot `Build? Y/N` they missed (it executes only if the setup is still valid). The Token terminal renames its `Buy`/`Strong Buy` signals to `UP`/`MOON`, squares up the watchlist star as a gold button, and labels the in-run swap router `offline router · 100:1`; on phones the toolbar collapses `12H`+ timeframes behind a dropdown after `4H`; the RUN buttons gain a blinking CTA glow. Economy: per-run grind-coin `$CHART` is front-loaded and hard-capped per run, closing an unlimited-`$CHART` exploit on short high-timeframe charts, and small-cap coins that are not on Binance now fall back to seeded candles fast (candle fetches abort after 7s) instead of hanging. No broker routing, signing, or live execution was added.

## Local Use

Open `ChartRunner_Prototype.html` in a browser, or use the live public build at `https://chartrunner.xyz/play/`.

## Mobile / Tablet Play

`/play/` includes an adaptive mobile shell for phones and tablets: portrait uses compact top-bar commands, a bottom-left collapsible HOT tray for hotkeys, bottom-right runner controls, mobile app sheets, tap-to-run movement, two-finger chart movement, one-active-laser routing, and a `12H`+ timeframe dropdown (after `4H`) that keeps the toolbar on a single row. The desktop-only guided drag-and-drop tour demo is suppressed on phones. Landscape phone and tablet layouts keep more desktop chrome while preserving the touch controls.

Mobile regression smoke:

```sh
node scripts/check_play_mobile_adaptive_shell_browser.cjs
```
