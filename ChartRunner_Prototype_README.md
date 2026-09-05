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

`v1.0.644` finishes the terminal rail-drawer (design phases D1/D2). Drawers now update live — a LIVE dot pulses and the hero value flashes in place as the source pane refreshes — and lazy insight blocks load once on open: perp funding-rate history mini-bars, a protocol 30-day TVL spark, and a token's top pools. ↑/↓ walk the rail's rows with the drawer following, and Esc closes. New drawer actions: `＋ compare` holds up to three symbols in a cross-kind compare tray and shows delta columns when a new drawer opens; `⌘ Explain` routes the row's metric to COACH.llm (a free deterministic explainer plus the base FAQ for guests, with the premium model path wallet-gated); and an in-run `⤓ drop on chart` pins the source pane onto the running chart. Rows in panes pinned to the desktop open a floating draggable window instead of the slide-in drawer, and `▶ Run` only asks before switching the chart mid-run when a wallet is connected and you've built objects (brackets / tools / indicators) on the current map. No broker routing, signing, or live execution was added.

`v1.0.646` unlocks **moderated multiplayer rooms** (design phase P1, paired with the `chartrunner-relay` v0.2.0 redeploy). A connected host can create a **MODERATED** room (only the host's builds and chat broadcast) or a **CURATED** room (guests submit builds/chat and the host approves each), with relay-enforced `kick` / `mute` and a hide-guest-chat toggle. The host proves ownership by signing the room config with their wallet (a per-connection challenge nonce); a floating host-controls panel exposes the moderated/curated switch, per-runner mute/kick, and the curated approve tray. The `EARN ON-CHAIN` (paid entry / copy-trading) preset stays locked until phase P2. Rooms stay fully backward compatible — an un-upgraded relay falls back to cosmetic labels, and old clients see plain open rooms. No broker routing, trade signing, or live execution was added.

## Local Use

Open `ChartRunner_Prototype.html` in a browser, or use the live public build at `https://chartrunner.xyz/play/`.

## Mobile / Tablet Play

`/play/` includes an adaptive mobile shell for phones and tablets: portrait uses compact top-bar commands, a bottom-left collapsible HOT tray for hotkeys, bottom-right runner controls, mobile app sheets, tap-to-run movement, two-finger chart movement, one-active-laser routing, and a `12H`+ timeframe dropdown (after `4H`) that keeps the toolbar on a single row. The desktop-only guided drag-and-drop tour demo is suppressed on phones. Landscape phone and tablet layouts keep more desktop chrome while preserving the touch controls.

### M0 · Touch-Steuerungsschicht (`v1.0.908`)

The first working mobile ground-access cut. On touch devices (`crTouch.active`, detected via
`pointer:coarse` / `maxTouchPoints`, forceable with `?crTouchLayer=on|off`) `/play/` shows a
thumb cockpit: a right-hand dock with on-screen **HK1–HK4** (Vehikel · Ausricht-Laser ·
Aktivierungs-Laser · Alarm-Laser) plus an **Order** button that opens the existing
Activation-Panel (Market/Limit), and a left-hand move zone with **Auto-Run** by default plus an
optional on-screen **Stick** (toggle, persisted in `cr_touch_stick_v1`, default off).

Each ability button is only a *second trigger*: it dispatches the exact same real keyboard
sequence as the physical key (via `ChartRunner.control.tap`), so every existing handler — and its
guest/feature gate — applies bit-for-bit. No new trade path, no new switch: the Order button only
opens the view; the four gates + Weiche are untouched. Visibility is staged like the ARM gate
(guest sees the base; HK3/HK4 appear once signed-in/wallet-connected — same `crGuest`), live-reactive
through `crApplyAccessGates`. Desktop/keyboard is unchanged (the layer never appears on non-touch and
the auto-run hook returns 0 there). The older `#crTouchPad` move-pad is superseded while the M0 layer
is active.

#### M0.1 · Feinschliff (`v1.0.909`)

Visibility/position/optics only — no logic change (the buttons fire the exact same actions as M0):

- **Chart-only.** The whole layer (HK1–HK4 + Auto-Run + Stick + Order) now renders **only in the
  chart/play view** (`game.running` and not `crSplashUp`). On the ChartRunnerOS surface
  (Home/Desktop, Profile, Terminal, Token) and on the splash it is off — same state that already
  separates “Desktop” from “Chart”. `crTouch.active` stays pure touch-detection; a light 250 ms tick
  keeps `#crTouchLayer[hidden]` reactive.
- **Phantom-/safe-area-safe.** Height uses `svh` (vh fallback); the bottom anchor is one variable,
  `--cr-tl-lift = env(safe-area-inset-bottom) + 20px`, referenced by both docks; a `visualViewport`
  fallback aligns the layer to the truly-visible area so no button row hides behind the in-app
  browser bar. Hit targets stay ≥ 44 px.
- **Minimalist** like the timeframe pills/topbar: flat/semi-transparent ground instead of a filled
  box, thin accent ring in the ability colour (cyan/red/blue/gold), icon-forward with a small quiet
  label, Auto-Run & Stick as slim pills.

#### M0.2 · Two-thumb cockpit (`v1.0.910`)

Touch input redesign, no logic change to actions/trade-path: **Auto-Run deleted** (no thumb on the
stick ⇒ the runner stands still; `crTouch.autoMoveAxis` → `crTouch.moveAxis`, stick axis only), the
movement **Stick is always on** (no toggle), the four ability boxes collapse into **one radial hub**
(`#crTouchRadial`, press-and-flick: up=HK1/right=HK2/down=HK3/left=HK4), and the **Order** button is
guest-gated (not in the DOM until `signedIn() ∨ walletConnected()`). Every flick routes through
`crTouch.flick → fireHotkey → ChartRunner.control.tap` — parity by construction.

#### M0.3 · Controls higher + tap-to-fire (`v1.0.911`)

Two focused fixes to the M0.2 controls from the phone test — **position + one extra trigger gesture,
no logic change** to actions/trade-path/Weiche/desktop:

- **Higher (visualViewport-anchored).** The whole layer (Stick, Radial, Order) is bound to
  `window.visualViewport`: `_syncViewport()` sizes and shifts it to the *visible* area
  (`height = vv.height`, `top = vv.offsetTop`), re-run on `visualViewport` resize/scroll **and** when
  the layer un-hides. The comfortable minimum gap `--cr-tl-lift` rises from 20 → **30 px** (spec
  24–32) *on top of* `env(safe-area-inset-bottom)`. Reason: the in-app browser bar (Phantom/Brave) is
  not a safe-area inset and the layout viewport (`svh`/`vh`) ends behind it — `env` alone wasn't
  enough. Result: Stick, all four radial slots (incl. the lowest AKTIV slot) and Order sit clearly
  above the bar.
- **Tap-to-fire.** Each visible radial slot fires its ability on **tap** (`click → fireHotkey →
  ChartRunner.control.tap`) — the exact same action as flick and key, parity by construction. Flick
  stays as the one-gesture shortcut; a hub tap reveals the slots (now `pointer-events:auto`), another
  hub tap while open = abort/collapse; a slot tap collapses after firing. Slots are ≥ 44 px.

#### M0.6 · One-button selector + touch Shoot + mobile Support (`v1.0.915`)

The right control side is now **one** transparent, glassy selector button (`#crSelBtn`) at 3/4
height — no radial, no separate FIRE, icons only. **Tap** (short) opens the icon fan (`#crSelFan`:
Shoot · HK1 Vehicle · HK2 Align · HK3 Active · HK4 Alarm · Order, each in its own colour);
**tap a fan icon** selects it (the button then shows that icon); **press-and-hold** runs the
selected function while held (a sweep-ring shows "running"), with exact trigger parity —
`kind:'key'` holds the matching key (`crTouch.holdKey` → keydown on press / keyup on release;
Shoot = Space = continuous fire), Order-hold opens **only** the Activation-Panel (no trade without
the four gates; the Weiche/spy fires on no touch element).

- **Shoot on touch (new).** Same Space action, no new combat path. On the phone there is no cursor,
  so the shot direction follows the movement-**stick tilt** (`crTouch.aimVec`; neutral stick → last
  direction, fallback to run/facing). `shoot()` reads the aim vector **only** while `crTouch.active`
  — the desktop "aim at cursor" path is bit-for-bit untouched. Movement (`crTouch.moveAxis`) stays
  horizontal and unchanged; the aim vector is a separate read.
- **Guest gate.** HK3 (Active) + HK4 (Alarm) do **not** appear in the fan for guests
  (`crGuest`/`crApplyAccessGates` → `crTouch.syncGates`, live-reactive); Shoot/HK1/HK2/Order are the
  base set for everyone. The per-ability feature gate still also sits in each key handler.
- **Support overlay mobile fix.** `drawSetupGuide()`'s setup card is now responsive: width ≤ the
  visible viewport (minus `env(safe-area-inset-left/right)` + margin), the step text **wraps** (or
  ellipsises) instead of running off the **left** edge, and it stays clear of the top-bar and the
  3/4 controls. Desktop (wide) rendering is unchanged.

Mobile regression smoke:

```sh
node scripts/check_v908_touch_controls_browser.cjs   # M0 touch cockpit (parity, gating, auto-run, trade-path)
node scripts/check_v909_touch_polish_browser.cjs     # M0.1 polish (chart-only, safe-area, hit-area, parity)
node scripts/check_v910_cockpit_browser.cjs          # M0.2 two-thumb cockpit (stick, radial, order-gate, parity)
node scripts/check_v911_hoch_tap_browser.cjs         # M0.3 higher + tap-to-fire (position, tap parity, flick regression)
node scripts/check_v915_selektor_browser.cjs         # M0.6 one-button selector + touch Shoot + mobile Support
node scripts/check_play_mobile_adaptive_shell_browser.cjs
```
