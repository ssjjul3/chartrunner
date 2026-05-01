# ChartRunner — Hackathon Prototype (v0.8M#6)

## What's new in v0.8M#6 — "Terminal app: Darkflow Engine on desktop, compact on phone, shared state"

The L3 terminal moves out of its old neon-purple drawer and into a proper Terminal.app — styled after the **Darkflow Engine** reference: dense multi-pane neon-on-black trading dashboard. Same data feeds the phone Terminal app (compact view).

- **Desktop Terminal** — Big ASCII title `DARKFLOW ENGINE`. Three-column dense grid: top stats row (PNL/PAIRS/DELTA/WIN/KELLY/SPREAD), left column (positions/tools/open positions/edge formulas/corr matrix/risk/regime), center (API calls + trade exec logs + transition matrix + L3 prompt), right (waveform canvas/signal constellation/market scan/stderr.watch/recent transactions), bottom (trades/volume/wallet/CONNECTED).
- **Phone Terminal** — 7th app on phone home. Compact 6-stat grid + scrolling event log + L3 command input.
- **crL3 shared module** — single source of truth, subscribes to SDK events, 1.1s heartbeat synthesizes plausible activity, both Terminal renderers consume it. Canvas animations (waveform 60Hz, signal constellation, corr heatmap) tick at 250ms.
- **Retired** — legacy `.l3drawer` and "Open L3 terminal" menu button hidden via CSS. DOM stays for back-compat with anything still pushing into `#l3Log`.

## What's new in v0.8M#5 — "Splash bottom taskbar removed"

The splash desktop's bottom strip (ChartRunner / status / version / clock) is now hidden. Apple menubar at top already shows brand + clock; status/version were dev noise.

## What's new in v0.8M#4 — "Old menu folded into the phone: coins, skins, backgrounds"

## What's new in v0.8M#4 — "Old menu folded into the phone: coins, skins, backgrounds"

The legacy menu drawer (Shift+M) had three lingering responsibilities that didn't fit the new OS structure: a coins on/off toggle, a flight/upside-down skin picker, and a chart background picker. All three move to the phone in this pass.

- **Phone keypad-1 (Coins)** — now actually fires `#coinsSwitch.click()` (the real toggle that gates pickup spawning + persists). Display shows `Coins · ON` / `Coins · OFF`.
- **Phone keypad-6 (BG)** — new key. Cycles chart background through default → bubbles → ascii via the legacy `#bgPicker` buttons. When the chosen BG matches the current OS theme (Ascii BG + Ascii theme, Bubbles BG + Bubble theme), display shows `◆ matches Ascii theme`.
- **Phone Profile app** — gets a real **Skins** picker. Two tabs (✈ Flight / 👁 Upside-Down) with the SKINS catalog rendered as 36×28 mini-canvas previews using each skin's `s.draw(ctx,1)` function. Click swaps the active skin AND syncs the legacy `buildSkinList()` so the menu drawer stays consistent if a power user opens it.

The corresponding sections in the legacy menu drawer (Coins toggle, Skins, Background) are now hidden via `:has(...)` CSS rules. The DOM stays — proxy clicks from the phone still hit the original elements, the wiring + persistence + spawn-gating all run unchanged.

What's still in the legacy menu drawer (Shift+M): Wallet pills (redundant with phone Wallet), World section (SDK panel + L3 terminal buttons), Perspective picker, the controls list. Eventual cleanup but they don't conflict with anything.



## What's new in v0.8M#3 — "Bottom dock + right sidebar retired (folded into the OS)"

Both the body-level bottom dock (`#crOSDockFixed`) and the right info sidebar (`.crChrome.right` with Wallet/Mission/Coach tabs) are now hidden permanently in-game. Their functions live in the OS proper:

- **Wallet** — phone Wallet app (M, then tap Wallet) and desktop Wallet.app
- **Mission progress** — phone Intel app (Stats tab) and desktop Missions.app
- **Coach feed** — phone SMS app and desktop Mail.app
- **App quick-launch** — splash desktop dock (Apple File menu → return), phone home screen

Net result: the chart gets back ~240 px on the right and the bottom dock no longer floats over the status bar. The remaining in-game chrome is intentional and minimal: Apple bar (top), TV top toolbar, left drawing-tools palette, bottom status strip. Press **M** for everything else.



## What's new in v0.8M#2 — "Bug fix: TDZ crash that broke the entire boot"

**The bug.** A synchronous `typeof crCoach !== 'undefined'` call inside the OS-extension IIFE (added in v0.8M#1) ran BEFORE the `const crCoach` declaration further down the script. Because `crCoach` was in the temporal dead zone, `typeof` threw `ReferenceError` — and a top-level uncaught throw halted every script statement that came after, including the TVChrome IIFE that sets `body.crSplashUp`.

**The visible damage.** Without `body.crSplashUp`, the CSS rule `body.crSplashUp .crChrome { display:none!important }` never matched, so the in-game TV chrome (top toolbar, left palette, right sidebar, bottom status bar, OS bar, fixed dock) rendered AT THE SAME TIME as the splash desktop icons. Clock didn't tick, theme propagation didn't run, the auto-hide loop didn't run, the live data tick didn't run — basically half the v0.8L#3+ features looked broken because half the wiring code never executed.

**The fix.**
1. Wrapped the `crCoach.subscribe(...)` call in `setTimeout(0, () => { try { ... } catch{} })` so the access is deferred to a microtask, AFTER `const crCoach` initialises.
2. Added a belt-and-braces `try{ document.body.classList.add('crSplashUp'); }catch{}` at the very top of the `<script>` tag, so the splash class is set before ANY IIFE has a chance to throw.

Both safeguards are in place — even if a future edit re-introduces a top-level throw, the splash class will still be applied.



## What's new in v0.8M#1 — "Phone OS, shared Coach memory, desktop reorganization"

Major restructuring. The right sidebar + dock + menu are folded into a single mobile companion (the **Phone**) in the bottom-right. The L3 Coach gets shared memory across three surfaces: SMS on the phone, Mail on the desktop, future Web3 wallet. Desktop apps are merged and re-grouped. Two hotkeys retired (R, B) — those actions live on the phone keypad now.

### Phone (bottom-right, M to toggle)

A 298×608 px mobile device that slides in from the right corner when you press **M**. Has a status bar (clock · signal · L3 · battery), a 6-icon home screen, and 6 functional apps:

- **SMS** — iMessage-style chat with L3 Coach. Real conversation: type a message, coach replies based on game state and personality. History persists across phone open/close.
- **Shop** — gear ($RUN) and items ($CRDS) merged into one mobile list. Buy buttons (Phase 2 placeholder).
- **Wallet** — $CRDS / $RUN balances + "Connect Wallet" button (Phantom integration deferred to Phase 2) + "Swap $CRDS → $RUN" button (deferred to v0.8e).
- **Intel** — three tabs: Stats (score / P&L / Sharpe / ATR / distance / kills), Strats (the 4 strategies from the existing strategy-overlay system), Token (swap rate, supply, mint chain, trade venue).
- **Profile** — avatar canvas + name + tag, plus owned skins / gear / vehicle sections.
- **Keypad** — 9-button numpad with 5 quick-action numbers: **1** Coins (toggle visibility), **2** Theme (cycles), **3** Perspective (lin → log → auto), **4** Restart, **5** Home (back to splash desktop). 4 empty slots reserved for v0.8M follow-ups.

**Theme-dependent visuals.** The phone re-skins for each theme:
- **Dark** — sleek modern iPhone with notch, rounded corners, blue accents.
- **Platinum** — boxy Mac-Phone with classic beige chrome and a 3D home button.
- **Bubble** — candy phone with pastel pink/lavender shell, bouncy rounded chrome.
- **Ascii** — Nokia-style monochrome LCD (green-on-black), monospace everywhere, `L3>` and `YOU>` prefixes on chat.
- **Solana** — cypherpunk neon: purple bezel with green glow accents, gradient buttons.

### crCoach — shared coach memory module

A single `crCoach` IIFE holds the conversation state. Same brain, different interfaces:

- **`crCoach.userSays(text)`** appends user message + triggers context-aware reply ~400ms later.
- **`crCoach.getHistory()`** returns the message log.
- **`crCoach.subscribe(fn)`** notifies any UI when history changes.
- Phone SMS app, Desktop Mail app are both subscribed — type in either, the other updates instantly.
- Reply generator is keyword + game-state aware (knows your $CRDS, score, brackets placed, upside-down state). Personality is fixed-aggressive for v0.8 per the design anchors.

### Desktop reorganization

- **ChartRunner.app** subsumes the legacy "Run" launcher. Click → opens the avatar + mode picker.
- **Shop** subsumes "Marketplace". Single icon for all purchases.
- **SDK** moved into Configs window (no separate icon).
- **Mail** (✉) — new app. Long-form coach correspondence using shared `crCoach` memory.
- **Terminal** (⌨) — new app. L3 trading console with commands: `trade BTCUSDT long 0.5R`, `backtest hl_funding`, `status`, `scan`, `help`. Real `sdk.placeBracket()` calls. Scrolling green-on-black terminal log.
- **Intel** (📊) — new app. Stats + Strats + Tokenomics consolidated.
- **Profile** — header still says "Avatar · Name" but content extends to skins, gear, vehicle (live in the phone Profile app for now; desktop expansion follows).
- Dock reorganized: ChartRunner · Missions · Mail · Terminal — Wallet · Intel · Shop · Profile.

### Retired

- Hotkey **R** (restart). Use phone keypad-4 (M, then 4) instead.
- Hotkey **B** (shop). Shop is now a phone app — open with M.
- Marketplace.app icon (folded into Shop).
- Standalone Run.app icon (folded into ChartRunner.app).
- Standalone SDK.app icon (folded into Configs).
- Standalone L3 Coach.app icon on dock (replaced with Mail).

### Deferred to follow-ups

- True Web3 wallet connect (Phantom)
- Coach able to navigate the web on the player's behalf
- Background-per-theme system + Ascii-art background option (today: each theme has its own bg colour but no bg gallery)
- Coins on/off toggle (placeholder) — needs a hook into the pickup-spawn system



## What's new in v0.8L#5 — "Dark is the default theme"

`THEMES` array reordered to put `dark` at index 0, so the page now boots into Dark theme by default. Cycle is now **Dark → Platinum → Bubble → Ascii → Solana → Dark**. Platinum is still in the rotation — just one click away via the Theme menu — but the first impression is the TradingView-dark look.

The change is one-line in the `THEMES` array; everything else (CSS, theme switching mechanism, splash propagation, body `data-os-theme` mirror) is unchanged.



## What's new in v0.8L#4 — "Polish pass: clean chrome, Solana theme, draggable icons"

The v0.8L#3 chrome was visually leaking — the legacy ChartRunner topbar pills (STRAT / ABILITIES / INDICATORS / STATS) were peeking through on the chart edges, the palette icons were a mix of emoji styles, prices weren't formatted, and the FLIGHT MODE banner was blocking the chart center. This pass cleans all of that.

- **Legacy topbar hidden in-game.** A single CSS rule `body:not(.crSplashUp) #stage > .overlay.topbar { display:none }` retires the old neon pills the moment the player launches into a run. Mission pill goes with them. The TV chrome takes over their duties. When the user returns to the desktop (showSplash), they're back.
- **TF pills moved into the TV top toolbar.** TradingView-style segmented pill row (15m / 1H / 4H / 12H / 1D / 1W / 1M) sits between the change badge and the icon group. Clicks forward to the legacy `#tfbox` so the existing TF-change wiring (candle reload, scale recompute) runs unchanged. Active pill stays in sync via 800 ms poll for hotkey-triggered changes.
- **Crisp SVG icons replace emoji on the left palette.** Each ability now has a proper TradingView-flat vector glyph (currentColor, 1.6 stroke): trail dots → laser crosshair → opposing OCO arrows → magnifier rune → opposing-arrows hedge → life-ring rescue → stairstep trail-stop → kebab "more". Theme overrides recolor cleanly.
- **Number formatting everywhere.** `Intl.NumberFormat`-based helpers: `fmtPx` (74,979.12 with thousands separator), `fmtNum` (1,234), `fmtPct` (true minus sign − instead of hyphen). Applied to TV price, change badge, status-bar last/CHG, wallet card values.
- **Right sidebar tighter + Open positions card.** Cards padded down to 8 px, font-size on values dropped from 18 → 16, sub-line down to 10 px. New "Open positions" card with mini-list: Brackets / Ladders / OCO pairs counts, updated 4× per second from the visualBrackets/visualLadders/visualOCO arrays.
- **FLIGHT MODE pill becomes a small chip.** Restyled to a 26 px tall pill at top:74 px under the TV toolbar — semi-transparent dark bg, blurred backdrop, 11 px text. Stops blocking chart center.
- **Bottom dock slimmed and grouped with status bar.** Dock height 38 → 34 px, button size 28 → 26 px, anchored at bottom:36 px so it sits cleanly above the 30 px status bar. Combined visual weight is now ~70 px instead of feeling like two stacked rows.

### New 5th theme — Solana (Cypherpunk)

Cycle now: **Platinum → Dark → Bubble → Ascii → Solana → Platinum**.

- Brand colors: `#9945FF` purple + `#14F195` green, on `#050306` near-black.
- Diagonal purple→green gradients on titlebars, primary buttons, avatars, the Apple logo's spotlight.
- Glowing borders (`box-shadow: 0 0 12px rgba(...)`) on cards, dock buttons, focused windows.
- L3 Coach avatar becomes a purple→green orb. Wallet values glow neon green. The Launch button on the TV toolbar literally lights up.
- Active TF pill and active palette tool both use the diagonal Solana gradient as fill.

### Draggable desktop icons

Mac OS 9-style: each icon on the splash desktop can be picked up and dropped anywhere on the desktop area. Drag threshold is 4 px — a normal click still opens the matching window. On first drag, the grid layout freezes to absolute positioning; subsequent positions are session-local (no localStorage per Hard Rule). Icons clamp to the desktop bounds so you can't lose one off-screen.



## What's new in v0.8L#3 — "TradingView chrome wraps the game, OS chrome auto-hides"

The in-game interface gets a TradingView-style facelift, while the ChartRunnerOS chrome (Apple bar + dock) survives past the splash and auto-hides when the player isn't moving the mouse. Four new overlay panels frame the chart:

- **Top TV toolbar** (`.crChrome.top`) — sits below the Apple bar. Symbol pill (BTC/USDT · Binance), live last-price, 24h-change badge (green/red), then chart-type, indicators, alerts, screenshot icons, then a primary `Launch` button on the right. Click the symbol pill to focus the legacy asset selector; click Indicators to open the existing topbar's indicators dropdown.
- **Left drawing-tools palette** (`.crChrome.left`) — 48px vertical column of TradingView-style icon buttons. Maps the live ChartRunner abilities: 1 Trails, 2 Laser (Bracket/Ladder/Fib/OCO/HLine/VWAP via the Laser spawn menu), 3 OCO. Slots 4–7 (Rune Scan, Hedge, Rescue, Trail Stop) are visible but show a "coming soon" toast — Rune lives in the Strategies dropdown, the rest are deferred to v0.8M. Hover shows a TradingView-flat tooltip; click flashes the active state and fires `ABILITIES[k].use()` directly.
- **Right info sidebar** (`.crChrome.right`) — 240px collapsible panel with three tabs: **Wallet** ($CRDS this run / $RUN persisted / Score with P&L+Sharpe sub-line), **Mission** (active mission text + progress, run count, distance, kills), **Coach** (L3 Coach avatar + rotating aggressive-push lines + recent activity counts: brackets/ladders/OCOs placed). Collapse to a 32px rail via the chevron.
- **Bottom status bar** (`.crChrome.bottom`) — 30px thin TV-style strip. SYM · LAST · CHG · ATR · server status (green dot · BINANCE · LIVE) · L3 footer-avatar with rotating coach line.

**Auto-hide.** All TV chrome plus the body-level Apple bar and dock fade out after **2.5 s** of cursor inactivity. They reappear instantly on mouse movement near the top or bottom 40px edge, and stay visible while the cursor is hovering any chrome element. While the splash desktop is up, all this body-level chrome is `display:none` (the splash has its own internal Apple bar and dock — no double-stacking).

**Themes propagate.** The `data-theme` set on `.splash` by the v0.8L#2 cycle is now mirrored to `body[data-os-theme]` via a MutationObserver, so all four themes restyle the in-game chrome too. **Dark** = TradingView's actual dark mode (`#131722` background, `#d1d4dc` text). **Bubble** = pastel candy TV (rounded TF pills, soft shadows, mint/lavender). **Ascii** = green-on-black Bloomberg-terminal (monospace, `[ symbol ]` brackets, `L3>` prompt before coach lines).

**The legacy topbar stays.** All the existing pills (Asset / Strat / Abilities / Indicators / Stats / TF / Menu) are untouched and still functional — the new TV chrome layers above as a presentation layer. The Launch button on the new top toolbar is a shortcut for the same `restart() + hideSplash()` flow that the splash's Launch button uses.

**Hard-rule compliance.** Single file, vanilla JS, no CDN, no fonts, no images. Theme propagation via `MutationObserver` (feature-detected). Live data refresh on a 250 ms `setInterval` reading existing globals (`game`, `candles`, `currentPrice`, `missions`) — no rAF coupling so it can never starve the frame loop.



## What's new in v0.8L#2 — "Three more themes: Dark, Bubble, Ascii"

ChartRunnerOS gets a theme switcher. The Apple menubar grew a `Theme` entry between Help and the title — clicking cycles **Platinum → Dark → Bubble → Ascii → Platinum**. The current and next theme name appear as the menu's tooltip; a toast confirms the switch.

- **Dark** — inverted Platinum. Dark grey desktop, near-black window bodies, light text. Pinstripe titlebars stay (in dark grey), red close-box stays red. Same Mac OS 9 chrome, just inverted — feels like a 2026 designer's "what if classic Mac had a dark mode" mock.
- **Bubble** — pastel cartoon mode. Pink-and-lavender desktop gradient, very-rounded windows (22px radius), candy-color titlebars in solid mint with no pinstripe, pill-shaped buttons, soft drop shadows. Dock buttons bounce harder on hover. Coach avatar becomes a circular gradient bubble.
- **Ascii** — monochrome terminal. Black background, `#33ff66` green-on-black, monospace font everywhere, no rounded corners, no shadows. Window titlebars wrap titles in `[ brackets ]`, the close-box becomes an `X` glyph, the launch button reads `> LAUNCH CHARTRUNNER _`, the coach line is prefixed `L3>`. Borders are `1px solid` or `1px dashed` green.

Themes are pure CSS — implementation is `data-theme="..."` on `.splash` plus per-theme override blocks at the end of `<style>`. Default Platinum applies when no `data-theme` is set, so existing markup is unchanged. Theme choice does not persist (no localStorage by hard rule); every page load starts on Platinum.



Single-file playable prototype of the **Gamified Trading SDK** idea from the brainstorm in this folder. Opens directly in any modern browser — no build, no install, no wallet.

**File:** `ChartRunner_Prototype.html`
**Phase 0 plan:** `ChartRunner_Phase0_Plan.md`
**v0.6 backlog:** `ChartRunner_v0.6_Backlog.md`
**v0.7 backlog:** `ChartRunner_v0.7_Backlog.md`
**v0.8 backlog (active):** `ChartRunner_v0.8_Backlog.md`
**Phase 2 model-parity spec:** `ChartRunner_Phase2_Model_Parity_Spec.md`
**Phase 2 M5 implementation plan:** `ChartRunner_Phase2_M5_Implementation_Plan.md`
**Phase 2 3-layer pipeline viz:** `ChartRunner_Phase2_Pipeline_Viz.html`

## What's new in v0.8L#1 — "ChartRunnerOS: Platinum desktop, multi-window, app dock"

First big chunk of v0.8 backlog item #12 (ChartRunnerOS iMac-Desktop) landed. The pre-game splash is no longer a dark neon card — it's a full Mac OS 9 / Platinum-style desktop with an Apple menubar, procedurally-drawn Happy-Mac boot screen, draggable platinum windows with top-left close-box, a bottom dock, and a new app lineup alongside the legacy utility windows. Nothing in the game engine changed — the OS is a re-skin + extension layer on top of the existing splash.

- **Boot sequence** — Every page load now opens with a ~2s boot overlay: SVG Happy-Mac, "Welcome to ChartRunnerOS" title, animated platinum progress bar. Click anywhere or press Esc to skip. Procedurally drawn, no asset files.
- **Apple menubar** — Rainbow Apple logo + `File · Edit · View · Special · Help`, right-aligned clock (`Thu 4:21 PM`). File → opens ChartRunner.app, View → cascades open windows, Special → closes all windows, Help → opens SDK, Apple menu → about toast.
- **New app lineup on the desktop** — `ChartRunner` (game launcher), `Missions` (mission list preview), `L3 Coach` (aggressive-push coach line with avatar), `Wallet` ($CRDS/$RUN balances, live-ticking while open), `SDK` (primitives snippet + Phase 1/2 note), `Marketplace` (v0.9 teaser). The legacy utility windows (Shop, Configs, Profile, Stats, Inventory) remain on the desktop as a second row so nothing was lost.
- **Dock at the bottom** — Shortcut row with platinum buttons for the six new apps plus legacy Run. Active window gets an under-dot indicator. Hover-bounce for feel.
- **Multi-window mode** — `osOpenWindow()` now opens *additive* instead of replacing. Multiple windows can be open simultaneously; the red dot in the top-left of each titlebar is now the close affordance (classic Mac). Click a window to raise it (`z-index` management), drag by the pinstripe titlebar. New windows cascade (offset +28x / +24y per open) so they don't stack.
- **Hard-rule compliance** — Still single-file, still vanilla JS, still no CDN / no fonts / no images. Rainbow Apple logo is a CSS conic-gradient with a masked center-bite; Happy-Mac is inline SVG. Platinum styling uses `:root` CSS custom properties so a later theme-factory reskin stays cheap.

**Gap vs. the v0.8 backlog spec:** the ChartRunner.app window launches the game into *full-screen* below the OS (same as before), not into a windowed canvas inside the desktop. True in-window gameplay requires the canvas resize to respect window bounds — follow-up in v0.8L#2.

## What's new in v0.8k#24j — "Two-anchor laser placement: drag a tool out of two candles"

Ladder, Fib Ladder, Bracket, and OCO no longer drop at the single click that opens the laser menu — they now ask for two anchor points. A typical placement is now: **(1)** click anywhere on the chart to open the spawn menu, **(2)** pick the tool, **(3)** click an anchor candle (snaps to wick-high / wick-low / body-top / body-bottom within 14 px), **(4)** click a second anchor candle while a dashed ghost preview shows where the tool will actually land. Side and dimensions are inferred from the anchor direction — anchor1 above anchor2 is a buy bracket (SL below entry); anchor1 below anchor2 is a sell. Ladder span = `|p1 − p2|`, rungs distributed evenly across both anchors. Fib base = `|p1 − p2|`, fib levels project from anchor1 toward anchor2. OCO upper/lower sit on the two anchors directly. HLine and VWAP stay single-click — they're one-price primitives so the two-anchor model would be ceremony for nothing.

- **`snapToCandle(sx, sy)`** picks the nearest of high / low / body-top / body-bottom within a 14-px Euclidean threshold, falling back to raw `(wx, price)` if no candle landmark is in range. The snapped landmark name (`wick-high`, `body-bottom`, …) is rendered next to each anchor dot so the player can see what they're hooked to.
- **`commitLaserTwoAnchor(tool, a1, a2)`** is the only path that calls `sdk.ladder` / `sdk.fibLadder` / `sdk.bracket` / `sdk.oco` from the laser menu now. Side, spacing/base/slDistance, and price are all derived from the anchor pair; defaults the player has no UX to control yet (R:R = 1:2, ladder rungs = 5, OCO size = 6) match the previous single-click behavior.
- **`drawLaserAnchorsAndPreview()`** runs after `drawLaserSight()` and renders the placed anchor dots + a dashed live preview of the tool between anchor1 and the cursor (Bracket: 3 lines for entry / TP / SL; Ladder: 5 evenly-spaced lines; Fib: 5 fib-level lines; OCO: upper + lower). Mouse-move during phase `'anchor2'` re-runs the snap so the ghost stays locked to candles.
- **Esc has two stops now.** During `'anchor1'` or `'anchor2'`, Esc cancels back to `'idle'` (menu-driven) without leaving laser aim — so picking the wrong tool or misclicking the first anchor is one Esc away from a retry. A second Esc (or hotkey 2) exits laser entirely.
- **No game-layer hooks regressed.** The trim from #24i still holds: shadow gate frozen, missions/tutorial frozen, no $CRDS/score/$RUN side-effects. Two-anchor placement only changes the *input UX* for those four tools — the SDK call shape, the visual overlay payload, and the persistence-and-mirror behavior across worlds are all unchanged.

## What's new in v0.8k#24h — "Tools don't fade, don't vanish, don't die on their own"

A correctness pass on the laser + abilities lifecycle. The reported symptom was "Ladder, Fib Ladder, and Bracket disappear after closing the laser" — the root cause turned out not to be the laser at all but a lifecycle-based prune that filtered every placed overlay out of `game.visualLadders` / `game.visualOCO` whenever an underlying SDK order filled or cancelled. A laser-dropped ladder at the aimed price had rungs close enough to market to fill on the very next tick, so the whole visual evaporated the moment the laser closed.

- **Tool-lifecycle prune removed.** `_pruneVisualsForOrderId()` and both of its callers (`sdk.on('fill', …)` and `sdk.on('cancel', …)`) are deleted. Fill and cancel events still log and still credit $CRDS + score, but they no longer mutate any overlay array. Visual Ladders and OCOs are now persistent chart drawings in the TradingView sense — "here is my level", not "here is my working order" — even if the SDK has already consumed the underlying orders.
- **Bracket outcome dim retired.** `sdk.on('bracketClose', …)` previously set `v.outcome = 'win' | 'loss'` and the bracket draw used `(b.outcome ? 0.55 : 1) * worldMul` to fade the bracket after resolution. The draw path now uses flat `1 * worldMul`, so a closed bracket still sits at full opacity. The recolor by outcome (green tint for wins, red for losses) is preserved — that's information, not a fade. Shadow-gate bracket outcome path is also kept at its entry alpha (0.55) instead of dropping to 0.35.
- **Del and `restart()` are the only removal paths.** The two surviving `visualLadders.filter(...)` / `visualOCO.filter(...)` call sites are both in the `Delete`-key handler (explicit user intent). Everything else is a no-op on the overlay arrays. Switching timeframes, mounting a vehicle, entering Monster Mode, surfacing from upside-down, resolving a bracket, filling a ladder rung — none of these touch the visuals. The only way to clear the chart is `R` (restart) or selecting the overlay and pressing `Delete`.
- **Drag wrong-side guard kept, comment refreshed.** The v0.8k#23b ladder-drag rollback still fires when a drag would land rungs on the immediate-fill side of market. Its original motivation (visual vanishing via the prune) is now moot, but the guard still protects the user from a "ladder visible but all orders already filled" desync, so it stays.

## What's new in v0.8k#24g — "OCO joins the laser menu"

A small but symmetric follow-up on #24f. The laser click-menu already hosted HLine / VWAP / Ladder / Fib Ladder / Bracket — the "drop anything at this price" contract. OCO was the one remaining SDK order primitive still trapped on its hotkey, which made it the only place you couldn't choose "here" rather than "where I'm standing."

- **⇅ OCO here.** New entry in `openLaserSpawnMenu`, positioned between Bracket and Cancel. Clicking it synthesizes a symmetric `upper`/`lower` pair around the clicked price: `off = max(20, round(80 * tfVolScale()))`, then `sdk.oco({ upper: off, lower: -off, size: 6, price: priceAt })`. The `tfVolScale()` gate keeps the pair visually proportional across timeframes — ±80 on 15m becomes ±880 on 1d, matching the chart's own volatility envelope.
- **Mirror-phantom aware.** The pushed overlay carries `upsideDown: originUp` (same pattern #24f formalized for every other overlay), so an OCO placed in the upper world renders as a dimmed dashed phantom while viewing from upside-down, and vice versa. No renderer changes needed — the OCO draw path from #24f already respects `sameWorld`.
- **Hotkey 3 unchanged.** Pressing `3` still fires an OCO at the player's current price, same SDK path, no regression. The laser-menu variant is the price-anchored complement — pick whichever matches your intent.
- **Feedback parity.** Float ('OCO' at the click point) and toast (`OCO @ <price> ± <off>`) mirror the Ladder / Bracket drop feedback exactly, so players get the same muscle-memory response regardless of which laser primitive they chose.

## What's new in v0.8k#24f — "Tools persist past laser · mirror across worlds · dblclick to tune"

Three tight follow-ups on top of #24e. Together they finish the "the laser is the spawner, the tool is the relationship you keep" loop.

- **Tools persist past the laser.** Materialized Ladders, Fib Ladders, Brackets, OCOs, HLines, and VWAPs already survived `Esc` / `2` — #24f formalizes that by making every overlay carry an `upsideDown` flag at placement time and rendering them under a unified "belongs to which world?" rule. The arrays are only cleared by `restart()`; the laser is purely a spawn surface, not a lifetime owner.
- **Mirror into the opposite world.** Each overlay now tags the world it was placed from (`upsideDown: !!player.upsideDown` at every push site — laser-menu HLine/VWAP/Ladder/Fib/Bracket, hotkey 3 OCO, quick bracket, bracket-editor confirm, ladder-editor confirm). When the viewer is in the same world as an overlay, it renders at full strength with the usual styling. When the viewer crosses to the opposite side, same-price overlays render as dimmed dashed phantoms (alpha × 0.35, `setLineDash([4,4])`) — the tool is clearly "from the other side" but still legible as a price reference. Applies to ladder rungs, bracket entry/TP/SL, OCO legs, HLine, and Anchored VWAP. Fib rung labels and outcome tints are preserved.
- **Vehicle-ride keeps the world flip.** `drawPlayer()` already applied `ctx.scale(player.facing, player.upsideDown ? -1 : 1)` in both flying and on-ground branches, so mounting a vehicle in upside-down correctly renders the avatar 180°-mirrored — verified as part of #24f, no new code needed. Vehicles still force-dismount on Monster Mode entry (unchanged from #24e).
- **Double-click a placed overlay to tune.** New canvas `dblclick` handler calls `hitOverlay()` and routes: Bracket → `openBracketEditor()` seeded with the overlay's entry / slDistance / side / computed R:R; Ladder (native) → `openLadderEditor()` seeded with the overlay's p / spacing / side / rungs and DOM fields pre-filled. Fib Ladder, HLine, VWAP, OCO emit a hint toast pointing at drag / Del as the adjust path until they grow dedicated editors. Single-click continues to select + drag as before.
- **Rune Scan fully lifted out of the laser.** The `🔮 Rune scan` button was still inside the laser click-menu in #24e — #24f removes it. Strategies dropdown is now the single entry point, matching the README.

## What's new in v0.8k#24e — "Rune Scan moves to the Strategies dropdown"

Rune Scan doesn't belong with the order primitives (Trails, Laser, OCO). It doesn't route through `sdk.*` — it samples the visible candle window for local swing highs/lows and drops persistent 🔮 markers on the chart. That's a signal-layer thing, the same category as the Strategies pill ("HL Funding Shorts", "Poly EV6%", etc). #24e moves Rune to where it actually fits.

- **Hotbar trimmed 4 → 3 slots.** New lineup: `1 Trails · 2 Laser · 3 OCO`. Key 4 is unbound. The `ABILITIES` array loses its Rune entry; the `hudStatus` header pill recomputes `ch + ' charges'` off `ABILITIES.length` automatically so the "4 charges" label becomes "3 charges" with no extra code.
- **Rune Scan lives in the Strategies grid.** `_renderStrategyGrid()` appends a dedicated `🔮 Rune Scan (SCAN)` slot after the regular STRATEGIES entries. Clicking it calls `triggerRuneScan()`, toasts `Rune scan · persistent`, logs `rune_scan` to the SDK event stream, and closes the `stratWrap` drawer — same dropdown-close pattern the real strategies use. It deliberately does NOT mutate `game.strategy`, so the active-strategy chain (marker drawing, `osStrategySel` mirror, pill status text) stays untouched.
- **Laser-menu Rune path retired (superseded by #24f).** #24e originally preserved the Rune button inside the laser menu as a fast drop path; #24f removes it so Strategies is the single entry point.
- **Tutorial subline rewritten.** Step 4's subline now reads *"Hotbar: 1 Trails · 2 Laser · 3 OCO. Ladder, Fib Ladder, and Bracket all drop from the Laser click-menu. Rune Scan lives in the Strategies dropdown."* No step gates on Rune, so no progression impact.
- **Shop entries left alone.** `SHOP_PRICES` keeps its `'Rune':10` entry — harmless unused data since the shop row loop iterates `ABILITIES` (which no longer contains Rune). Same for the OS-splash shop preview at `OS_SHOP_ITEMS` — it's cosmetic "coming in Phase 2" copy, no functional tie-in.

## What's new in v0.8k#24d — "Hotbar slim · laser owns order primitives"

Now that Ladder, Fib Ladder, and Bracket drop cleanly from the laser click-menu (#24c), the hotbar copies of those tools are dead weight — three slots, three editors, and a hold-vs-tap discriminator all duplicating what one laser click already does. #24d removes the duplication.

- **Hotbar trimmed 7 → 4 slots.** New lineup: `1 Trails · 2 Laser · 3 OCO · 4 Rune`. Trails stays at 1 because it's the "where did I just go" overlay (hold-1 still materializes). Laser moves **6 → 2** so the quick-drop tool sits adjacent to Trails and the tutorial can teach it as step 4. OCO and Rune keep their slots — OCO is a structural bracket (no price target), Rune is pure annotation, neither fits the laser menu's "drop at price" contract.
- **Hold-3 bracket editor retired.** The 320ms hold-vs-tap discriminator on key 3 is gone; `start3Hold` / `end3Hold` / the `hold3` state object and the `fireQuickBracket()` helper are all removed from the keydown/keyup path. The R:R picker, precision entry, and side-flip affordances still ship — they're reachable by double-clicking the Bracket path in the laser menu's editor (double-click any spawned bracket to open the editor; hotbar double-click is gone because the slot is gone).
- **Restart cleanup simplified.** The `R` / game-over reset path no longer clears `hold3.timer` because `hold3` no longer exists. Only `hold1.timer` (Trails materialize) survives.
- **Tutorial step 4 rewritten.** Step 4's text is now *"Tap 2 to arm the Laser, click the chart, then pick 🎯 Bracket here."* Subline: *"Hotbar: 1 Trails · 2 Laser · 3 OCO · 4 Rune. Ladder, Fib Ladder, and Bracket all drop from the Laser click-menu."* Highlight moves from `slotEls[2]` (old Bracket slot) to `slotEls[1]` (new Laser slot). The `bracketPlacedOnce` completion check is unchanged — missions.onBracketPlaced?.() still fires from the laser menu path, so tutorial and mission counters don't diverge.
- **Shop entries preserved.** `SHOP_PRICES` still lists Ladder / Bracket / FibLadder even though they're not hotbar keys anymore — they're ability primitives that can still be locked/unlocked in the economy; the laser menu gates on the same unlock state the hotbar used to.

## What's new in v0.8k#24c — "Ladder · Fib Ladder · Bracket in laser spawn menu"

The laser aim click-menu already had HLine / VWAP / Rune as single-click drops at the aimed price. #24c extends the same contract to three more primitives so the laser becomes the universal "place anything at this price" tool.

- **🪜 Ladder here.** Default BUY ladder (5 rungs × 30 spacing, scaled by `tfVolScale()`, size 4) anchored at the clicked wx and priced at the aimed price. Upside-down mirror is preserved (buy flips to sell in the inverted world), matching the behaviour of the hotbar path.
- **🌀 Fib Ladder here.** 5-rung Fib ladder (0.236 / 0.382 / 0.5 / 0.618 / 0.786) with `base = 80 * tfVolScale()`, anchored at clicked wx, priced at the aim price. Same SDK path as the hotbar version, same visual ladder overlay.
- **🎯 Bracket here.** Drops an instant 1:2 BUY bracket (risk 20, slDistance 60) at the clicked wx/price. Respects `shadowGateCheck()` — if the shadow gate blocks, `fireShadowBracket()` emits the ghost-bracket telemetry exactly as the hotbar path does. Also fires `missions.onBracketPlaced?.()` and `tutorial.markBracketPlaced?.()` so progression counters don't diverge based on *how* you placed the bracket.

The hotbar keys still open the full editors (2 → Ladder config · hold 3 → Bracket R:R picker · 5 → FibLadder default). The laser menu is the quick-drop path — one click, defaults, keep running. Players who need precision stay on the hotbar; players in flow stay on the laser.

## What's new in v0.8k#24b — "Oscillator sub-panel + Fear/Greed gauge"

Follow-up to #24: the four "badge" indicators (Fear/Greed, RSI, Stoch RSI, OBV) were previously rendered as a tiny stacked column of text pills in the top-left corner, hidden under the topbar. Real playtesters reported "Fear and greed, rsi, stoch rsi, obv do nothing" — they literally could not see them. #24b makes them first-class chart surfaces.

- **RSI / Stoch RSI / OBV → bottom sub-panel.** All three oscillators now share a dedicated panel at the bottom of the chart (TradingView-style), sized `max(80, min(160, H*0.18))`. The panel sits above the volume bar if volume is active; it slides down when volume is off. 30 / 70 dashed guide lines (plus a fainter 50 mid-line) are drawn when RSI or Stoch RSI is on, with `70` / `30` labels at the right edge.
- **Per-indicator line plots.** RSI is a 1.5px line on the 0..100 panel scale. Stoch RSI is the same. OBV is cumulative and normalized to its visible-range min/max, so it sits in the same panel without dominating it. Colors come from `INDICATOR_BY_ID[id].color` so they match the legend pills.
- **Legend row.** Top-left of the panel renders `RSI(14) 67.3 · SRSI(14) 82.1 · OBV 1.2M` with each token in its indicator color. Period displayed is the user-tuned value, so the editor and the legend stay in lockstep.
- **Fear/Greed → prominent gauge.** Top-left below the topbar: a 176×52px rounded box with a big 22px numeric score, a sentiment label (*Extreme Fear · Fear · Neutral · Greed · Extreme Greed*), and a filled progress bar. Color zones: `<25` red (extreme fear), `<45` orange (fear), `<55` yellow (neutral), `<75` light-blue (greed), `>=75` green (extreme greed). Score and gauge respect the user-tuned `rsiPeriod` and `volWindow` from the #24 editor.

No gameplay math changed — the same `_computeRSI`, `_computeStochRSI`, `_computeOBV`, and Fear/Greed raw-score logic drive everything. Only the render path was rewritten.

## What's new in v0.8k#24 — "Per-indicator parameter editors (TradingView-style)"

Every indicator in the grid is now individually tunable. The single-click path still toggles the overlay on/off; a **double-click** opens a per-indicator editor with the same pattern the hotbar uses.

- **Tunable parameters, saved per indicator.** SMA / EMA expose `period`. Ichimoku exposes `tenkan / kijun / senkouB`. VRVP exposes `buckets` + `width`. RSI + Stoch RSI expose `period` (Stoch RSI also has a `window`). Fear/Greed exposes `rsiPeriod` + `volWindow`. Volume exposes `heightPct` + `opacity`. OBV has no tunables yet (nothing sensible to expose — the whole metric is cumulative).
- **Editor modal.** Same `.brEditor` chrome the Bracket + Ladder editors use. Input fields are clamped to declared min/max ranges and snapped to `step` granularity so out-of-range values can't brick a draw helper. Buttons: **Apply (Enter)** commits, **Cancel (Esc)** backs out, **Reset defaults** wipes the override for that indicator.
- **Dynamic slot labels.** Slots like SMA / EMA / RSI / Stoch RSI / Ichimoku now show their current period in the grid — "SMA (20)" becomes "SMA (50)" the moment you apply a change. No reload needed; the next render frame picks up the override via `_getIndParam(id, key)`.
- **Persistence.** Overrides live in `INDICATOR_STATE.params` alongside `unlocked` + `active`, persisted under the existing `cr_indicators_v1` localStorage key. Prior saves migrate forward (params default to `{}`).

## What's new in v0.8k#23c → #23d — "Hotbar trim · fib body drag · double-click to edit"

Tail-end polish that grew out of real-run complaints with the #23 build.

- **Hotbar trim (#23d).** HLine (was key 6) and VWAP (was key 8) are **unbound from the keyboard**, because the Laser spawn menu already places them at a clicked price — owning two keys AND a menu entry was redundant. Laser moves **7 → 6**, Rune moves **9 → 7**. The HUD is now seven slots instead of nine: `1 Trails · 2 Ladder · 3 Bracket · 4 OCO · 5 FibLadder · 6 Laser · 7 Rune`. Anything removable through the laser menu lives only there now.
- **Double-click to edit (#23d).** Every HUD ability slot supports two gestures: a single click fires it (same as pressing the hotkey); a double click opens its editor. Bracket opens the R:R picker, Ladder opens the rungs/spacing/side editor, Trails materializes the live trail. Abilities without a dedicated editor fall back to `use()` so double-click is never a no-op. The single-click path is debounced 220 ms so the dblclick can preempt.
- **Fib ladder body drag (#23c).** Fib ladders can now be translated as a whole in 2D — drag the left-edge body grip (orange tick) to shift `wx` and all rung prices by the same delta. Previously only individual rungs were draggable; the whole fan was anchored. Grip renders anchored at `prices[0]` (shallowest rung).

## What's new in v0.8k — "TradingView-native topbar · chart tools · vehicles · laser aim"

The v0.8k pass (#1 → #23) is the largest single arc since v0.7b. It restructures the topbar around a TradingView-native pill layout, turns half the ability slots into first-class chart tools, adds a vehicle category with ride/grind mechanics, and rewires the economy to match.

- **TradingView-native topbar (#3–#15).** Left/right pill columns, clock next to price, Timeframe moved up, Strategy as a labelled icon grid, Abilities as a drawer category under the pills, Stats dropdown, unified inner-column alignment, drawer clipping fixes, coin-pickups toggle under Wallet. Stays at five visible elements; everything secondary lives in the drawer.
- **Tool-native abilities (#18, #22).** Slot lineup is now: **1 Trails · 2 Ladder · 3 Bracket · 4 OCO · 5 FibLadder · 6 HLine · 7 Laser · 8 VWAP · 9 Rune**. HLine and Anchored VWAP are new primitives — solid horizontals and anchored volume-weighted curves — and both are draggable, ridable, and deletable. Fib Ladder places five rungs at `[0.236 · 0.382 · 0.5 · 0.618 · 0.786]` × volatility-scaled base spacing; rungs can be drag-scaled around the first rung.
- **Laser aim mode (#21, #22).** `7` toggles laser aim. While aiming, the avatar freezes and a single click on the chart opens a mini spawn menu (HLine · VWAP · Rune · Cancel) at the click's price. ESC exits aim.
- **No-fade overlay discipline (#22).** Brackets, ladders, OCO, shadows, HLine, VWAP, trendlines, run trails — every overlay now behaves like a TradingView drawing: stable alpha while active, dimmed after resolution (brackets 0.55 / shadows 0.35), persistent until the run resets. No time-based prune.
- **Vehicle gear category + grind (#16, #17, #23).** A vehicle slot sits under Abilities; V toggles, hold-V opens the picker. While riding: the vehicle snaps to nearby grindable surfaces (trendlines, run trail, indicator lines, HLine, VWAP). Double-tap ↑ hops to the next line ABOVE; **triple-tap ↑ launches into flight.** Double-tap ↓ hops to the next line below. Three cosmetic chart backgrounds pickable from the menu.
- **Ladder 2D drag (#21–#23).** Grab the left-edge body grip to translate a normal ladder in 2D; grab a rung to stretch spacing. Upside-down confirms mirror the side (`buy` ↔ `sell`) so the visual matches the physics. Dragging a ladder to the wrong side of market (buy above, sell below) now rolls back instead of silently filling every rung on the next tick.
- **Indicator polylines grindable (#10, #16).** SMA/EMA/Ichimoku lines are valid grind targets AND valid hop targets, so Strategy-mode lines double as parkour.
- **Chart-background hygiene (#19, #20).** Red hazard stripes and rubber-duck pickups removed; chart backdrop is the game's main canvas now.

## What's new in v0.8f → v0.8j — "palette · capabilities · economy rewrite · per-endpoint handles"

The bridge between v0.8e's Monster Mode cleanup and v0.8k's topbar rewrite.

- **TV-native palette (v0.8f).** All accent colours rewritten to the TradingView token set (bull `20,241,149` / bear `255,91,127` / fib-orange `245,165,36` / creds `#9b8cff`). Magnez item deleted — it was a magnet ability that didn't map to any trading primitive.
- **SDK capabilities flag + reframe primitives (v0.8g).** The SDK now exposes a `capabilities` block so the game can advertise which primitives a chart host supports. Three new reframe primitives wired up for Phase 1 compatibility.
- **Economy rewrite (v0.8h).** `$RUN` becomes scarce (the precious, mined in the overworld); `$CRDS` becomes plentiful. A `$CRDS → $RUN` exchange lives in the shop. Earlier v0.7 ratios are deprecated.
- **Per-endpoint drag handles (v0.8i).** Trendlines and bracket Entry/TP/SL lines now expose per-endpoint drag zones instead of the old whole-line-vertical-translate contract. Drag a single endpoint to re-angle; drag the body to translate.
- **Trails + trendlines as Monster walls (v0.8j).** In Monster Mode, the run-trail and any materialized trendlines act as physical barriers that block bears — turning your own movement history into a defence.

## What's new in v0.8e — "flipped physics · chart-crossing autopilot · trimmed bears"

The v0.8e pass completes the upside-down/Monster Mode split and prunes combat back to its essential shape. Highlights (letters map 1:1 to commits in the v0.8 backlog):

- **Flipped physics (A)** — in the upside-down, gravity points up and the avatar walks along candle *bottoms*. Shadow (F/I) flips to the opposite side of the body. Avatar sprite now flips 180° (Q) so upside-down is a true mirror of the upper-world runner.
- **Monster Mode ↔ upside-down split (B/C/D/S)** — combat is now orthogonal to physics. Monster Mode is picked on the splash only; the V-key mid-run toggle is gone. Red atmosphere + scanlines only render in combat, not in pure flipped exploration.
- **Time is Money unlimited + click-teleport (J/K/L)** — Time is Money never auto-ends. HP refills on zero; click anywhere on the chart to teleport (preserves flight form when flying).
- **Chart-crossing autopilot (T)** — while flying, crossing the candle close flips the world for you: above the chart is upper-world, below is upside-down. Same rule applies to click-teleport — clicking above the candle close puts you in the upper world, below puts you upside-down.
- **Trendlines (P)** — the chart-movement run trail can be materialized into a draggable trendline overlay. Click to select; drag to translate vertically; Delete to remove.
- **More timeframes (R)** — topbar + menu drawer both surface 15m · 1h · 4h · 12h · 1d · 3d · 1w · 1M.
- **Monster Mode strip-down (U)** — bears are back to grunt + boss. Regime variants (crab/whale/hornet) and floater/runner were cut: they bloated combat, buried the bracket fantasy, and caused surprise deaths. Player HP bumped 3→5, contact i-frames 1.0s→1.5s, and a 3-second grace period now lets the avatar visibly spawn before the first bear appears. The spawn point also moved to clearly above the starting candle so you can actually see where you land.

## What's new in v0.7b-items v2 — "boss drops + $CRDS shop"

Second slice of the items arc. Charges now have a real economy: killable bosses drop loot, and a dedicated shop lets you convert $CRDS into charges mid-run. Running out of Brackets isn't just a consequence anymore — it's a trade you can spend your way out of.

- **Bear bosses.** An 8% roll on every monster spawn produces a **boss** variant instead of a grunt/floater/runner. Bosses are larger, slower (speed 45 vs 70-95), HP 6 (vs 1-2), render with a pulsing pink/green silhouette and an above-head HP bar. Their hitbox is ~2× so they're still fair to aim at. Two-hit lasers chew them in 3 shots; gun bullets take 6.
- **Loot orbs.** On boss kill, a cyan pulsing orb with an **"L"** glyph drops at the boss's death spot. Collecting it grants **+2 charges on every item** that isn't already maxed, plus **+20 $CRDS**, plus a "LOOT" banner. The boss kill itself also pays +5 $RUN + 8 $CRDS + 100 score.
- **$CRDS shop.** Press **B** or open Menu → Shop to bring up a modal that lists all 7 items with their current charges and a "+1 · N $CRDS" button per row. Prices scale with scarcity — Ladder/Bracket 6, OCO/Hedge/Radar 10, Magnez 12, Rescue 16. Buttons disable at max charges or insufficient $CRDS. Closing the shop is **Esc**, **B**, or the Close button. While the shop is open every other key is swallowed so a stray `1`/`w`/`space` doesn't leak into the game.
- **Economy loop.** The new circuit: survive the upside-down → kill bosses for $CRDS and loot → spend $CRDS at the shop to top up the items you use most → place more brackets → survive longer. Restock orbs from v1 are still around but far rarer than boss drops now that bosses exist as a reliable source.
- **No persistent progression yet.** Charges (and $CRDS) reset at the start of every run. Future v0.7b-items v3 will tackle maxCharges upgrades, tier unlocks, and the "end-of-run forced spend" the original backlog called for.

## What's new in v0.7b-items — "items replace cooldowns"

First slice of the v0.7b items/loadout arc. Time-based cooldowns are gone; every trading ability is now a **charge-gated item** with a finite per-run pool. Running out is a real consequence, and the only refills are rare green "R" orbs scattered across the chart.

- **Charges instead of cooldowns.** Each item in the HUD (`1`-`7`) carries a per-run charge pool: Ladder 5 · Bracket 5 · OCO 3 · Hedge 3 · Radar 3 · Rescue 2 · Magnez 3. Firing an item consumes one charge. At zero, the slot refuses with a toast, a red "no charges" float, and a small shake — then stays muted until a restock.
- **Charge dots in the HUD.** Every slot now shows a row of small accent-green dots — one per remaining charge, hollow when spent. No guessing how many Brackets you have left.
- **Restock pickup — the green R orb.** A new pickup kind spawns at ~2.5% of tiles. Collecting a **green pulsing "R" orb** refills +1 charge on every item that isn't already at max, with a *"RESTOCK"* banner and particle burst. Magnez does NOT pull these — you have to actually reach them.
- **Keyboard + HUD share one pool.** Tap-`2` (quick 1:2 bracket), hold-`2` (full editor), and clicking the Bracket HUD slot all draw from the same Bracket charge. Opening the editor and cancelling still consumes a charge — same contract as every other ability.
- **Charges reset per run.** Every run starts with everything at max. No session-carryover. Future v0.7b-items v2 will add boss drops + a $CRDS shop for upgrading `maxCharges` / adding rarer items.

Nothing else changed in this pass — L3 Terminal, multi-asset toggle, chart pan/zoom, avatar picker, strategies, shadow-mirror P&L all carry forward identically.

## What's new in v0.7b-l3 — "Mock-L3 Terminal (Phase 2 preview)"

An in-game preview of the Phase 2 "Eye" layer (L3). A left-pinned drawer shows what the Ollama coach would see if it were wired in, and fires mock CoachingDirectives / MandateSuggestions against live SDK events — without actually touching the SDK as an issuer. Read-only on the event bus; the L3 module is SDK listen-only and never crosses into rendering.

- **L3 Terminal drawer.** New `Open L3 terminal` button in the menu (World section). Pins to the top-left; coexists with the right-pinned SDK drawer so you can watch both at once.
- **BotBoard card.** Live win-rate, funding-style edge counter, variance footprint, and tilt flag. Metrics update on every `bracketClose` over a rolling window of 10 brackets. Ticks a tilt flag when recent R-multiples trend negative.
- **CoachChannel card.** Silent in Game-Mode, shows mock signed-receipt ID in Live-Mode. Four evaluation rules fire CoachingDirectives: *warn_before_fire* (3+ SLs in last 4), *surface_ability* (4+ TPs in last 5 with rMean > 0.8), *generate_mission* (25s idle). Directives expire; the card dims.
- **TuneChannel card.** MandateSuggestions when R-multiples trend sour (rMean < −0.3 over 8+). Always signed regardless of mode — matches the parity spec's asymmetry rule.
- **Coordination gate card.** If a CoachChannel and a TuneChannel directive would ship in the same 2s tick, only the Tune fires and the Coach is dropped with a log entry. Mirrors `ThesisEngine.publish()` coordination.
- **Mode toggle + event log.** Game / Live switch at the top of the drawer; a compact log streams all L3-observed events (obs / coach / tune / gate).

The Mock-L3 panel is a visualization of the Phase 2 architecture — it does not issue orders, does not sign anything real, and does not affect the game's score, currency, or missions. It exists so a first-time reader of the parity spec can see the three layers in motion.

## What's new in v0.7b-chart — "TradingView chart"

Pulled the chart slice of v0.7c forward because the pan/zoom + full-interval range is a foundational UX change that unblocks the rest of v0.7b (items, loadouts, gear) design work.

- **Pan the chart.** Mouse-drag anywhere on the canvas to pan both axes independently — X scrolls through time, Y shifts the price band. Drag releases unlock the 3-second "manual mode" window during which the camera stops following the player.
- **Zoom the chart.** Mouse wheel zooms both axes around the cursor position (TradingView-style pivot). Hold **Shift** while scrolling to zoom only Y (price scale). Hold **Ctrl** to zoom only X (time density).
- **Snap-back.** After 3 seconds of no drag/zoom input, the camera smoothly re-engages follow on the player and pan offsets fade back to zero. Zoom levels are preserved — your custom zoom sticks until you explicitly reset it with `0`.
- **All 15 Binance intervals.** Dropped the 5-button cap. The menu drawer now has an **Interval** slider spanning `1m · 3m · 5m · 15m · 30m · 1h · 2h · 4h · 6h · 8h · 12h · 1d · 3d · 1w · 1M`. `volMap` and `tfVolScale()` extended so pickups/hazards/ladders scale sensibly on every rung.
- **Hotkeys.** `−` / `=` step through intervals (never fires during bracket edit to avoid stranding editor state). `0` resets pan/zoom to defaults.
- **Physics stays honest.** Collision radii for pickups, monster-vs-player, and bullet-vs-monster all normalize the zoom factor out before comparing distances — zooming in/out never changes how easy or hard it is to grab a pickup or land a shot.

## What's new in v0.7a — "economy rename + mode splash"

This is the first slice of the v0.7 pivot (see `ChartRunner_v0.7_Backlog.md` for the full spec). It's a low-risk groundwork pass: no gameplay changes, but the data model is renamed and a game-mode selector replaces the single Play button.

- **Currency rename.** `TICK → $RUN` (hard currency, mined in the overworld) and `Creds → $CRDS` (soft currency, scarce — earned in the upside-down, forced to spend at end of run in v0.7b). All DOM pills, toasts, log strings, end-of-run screen, menu drawer tokenomics, SDK panel, and mission strings rewritten.
- **Three-tile mode splash.** The splash now shows three game modes: **Time is Money** (playable, default competitive loop), **Creative (SDK)** — greyed, "coming in v0.7b" — and **Trade** — greyed, "Phase 2 — Hyperliquid". Clicking the disabled tiles shows a toast; only Time is Money starts a run.
- **`game.mode` enum.** Internal state now carries `'creative' | 'timeismoney' | 'trade'`. v0.7b will branch item-count caps, upside-down availability, and $CRDS earn off this value.

Nothing else changed — all v0.6a work (real P&L, Sharpe, ATR bands, jump buffer, dash telegraph) carries forward.

## What's new in v0.6a — "readable trading"

This pass turns the bracket from a flavour ability into a real trading mechanic with consequences you can see at a glance.

- **Real P&L per bracket.** Every bracket now has a lifecycle (`open → tp | sl → closed`) tracked inside the SDK. P&L is computed as `(exit - entry) * dir * (risk / slDistance)` so an SL hit always equals -risk and a TP at 1:RR always equals +risk·RR. Realized P&L flows into a wallet pill and into Creds; SL hits dock score.
- **Live HUD stats bar.** A new floating row under the topbar shows three pills: **P&L** (green/red on sign, includes unrealized mark-to-market), **ATR** (rolling 14-candle Average True Range with a coloured volatility dot — green/yellow/red), and **Sharpe** (live coefficient over the last ~60s of equity samples). The topbar itself stays at exactly five elements; everything else lives in the menu or the stats bar.
- **ATR danger bands.** A subtle band of `±ATR(14)` is drawn around the close price across the visible chart. The band tints yellow when current ATR exceeds the long-run median by 1.1× and red at 1.6×. Telegraphs volatility before you walk into it.
- **Sharpe-adjusted scoring.** Equity is sampled every 0.5s; standard-deviation of returns gives a live Sharpe coefficient. Future tournaments score on Sharpe, not raw P&L — this surface lets the player learn to chase quality returns instead of luck.
- **Physics polish.** Coyote time was already there (~100ms). v0.6a adds a **jump buffer**: pressing ↑ within 120ms before landing now triggers the jump on touchdown, so a buffered jump no longer feels like an input swallowed.
- **Dash telegraph.** Starting a dash now spawns a particle burst in the trailing direction so the dash feels like a launch, not a teleport. Colour matches the world (green up-top, pink in the upside-down).

### Internal cleanup

- Hit-stop now actually freezes the main update loop (it used to scale dt to 8%, which still let combat tick during the freeze). FX continues at real time so particles and floats keep animating.
- `restart()` now clears the bracket-hold timer and pending toast timer, so a mid-restart hold no longer leaks an editor open after the new run starts.
- Bracket lifecycle emits `bracketClose` events with realized pnl, outcome (`tp` / `sl`), and exit price — the visual on the chart now finds its corresponding closed order by id and colour-codes accordingly.

## What's new in v0.5 — Phase 0 "first oneshot"

This pass is about making the game legible to a first-time player and putting real game-feel into every interaction.

- **Simplified topbar.** Strip to five things a player actually needs: `Brand · Symbol · Price · Timeframe · Score · ☰`. Perspective, src tag, TICK/Creds totals, and the SDK panel moved behind the menu. Rendering the game, not the cockpit.
- **Onboarding tutorial.** 4-step guided overlay on first play: **Move → Jump & Fly → Collect → Trade**. Each step waits for the player to perform the action, then auto-advances. `Esc` or the **Skip** button dismisses it. Replay any time from the menu.
- **Mission system.** A live mission pill at the top center. Three evergreen starter missions rotate on completion, each with a reward: *"Collect 5 TICK" → +5 Creds*, *"Place one bracket trade" → +8 Creds, +30 score*, *"Survive 30s in the upside-down" → +5 TICK, +100 score*.
- **Bracket quick-mode.** **Tap 2** now places a 1:2 bracket instantly at the current price. **Hold 2** (>320ms) still opens the full editor. Trading in one keypress.
- **Juice pass.** Particle bursts on kill, micro-bursts on hit, floating `+1 TICK` / `+2 Creds` / `-1 HP` numbers, red screen flash on damage, brief hit-stop (~55–90ms) on every impact, confetti burst on mission completion, camera shake, **First blood** banner on first kill.
- **Storytelling tightening.** Splash shrinks to one verb: *"Trade the chart. Survive the upside-down."* plus a big `[Play]`. Welcome banner on start. One-time **"The upside-down"** banner on first world-switch. Lore line in the menu: *"Runners extract liquidity from the chart; bears live in the upside-down."*
- **First-blood banner.** The first kill of every run triggers a single "First blood — the bear market bit back." banner, then stays silent.
- **Menu drawer expanded.** Now holds: Wallet totals (TICK/Creds), World lore + SDK panel button + source tag, Skins (Flight/Upside-Down tabs), Perspective, Run (Restart / About / Replay tutorial), Tokenomics.

Everything from v0.4 is still here — 5 timeframes, 3 perspectives, upside-down combat, all six abilities, the SDK event model.

## Controls

Movement — on foot
- **← / →** — walk (no auto-run)
- **← ←** / **→ →** — dash / speed boost
- **↑** — jump · **↑↑** — enter flight · **F** — toggle flight
- **↓↓** — enter upside-down · **F** or **↓↓** again — surface
- In flight: all four arrows move freely

Movement — on a vehicle (v0.8k)
- **V** — tap to mount / dismount the best-owned vehicle. **Hold V** (>320ms) — open the vehicle picker modal.
- **↑↑** — hop to the next grind line ABOVE the current one (run trail · trendline · indicator · HLine · VWAP)
- **↑↑↑** — launch into flight from the current line (triple-tap within ~640ms)
- **↓↓** — hop to the next grind line BELOW
- Vehicles auto-snap to nearby grindable surfaces within `GRIND_PX`.

Combat (Monster Mode / upside-down)
- **Space** — shoot (gun on ground, laser in flight)

Trading abilities (v0.8k#24e lineup)
- **1** Trails · **2** Laser · **3** OCO
- Ladder, Fib Ladder, and Bracket no longer have their own hotkey — they're spawned via the Laser aim menu (**2** → click chart → pick primitive). One hotkey, one click, defaults — same SDK path as the old hotbar versions, including shadow-gate telemetry and mission/tutorial hooks.
- HLine and Anchored VWAP also live only in the Laser menu.
- **Rune Scan** lives in the **Strategies** topbar dropdown — open the Strategies pill, click `🔮 Rune Scan (SCAN)`. One click samples the visible candle window for swing highs/lows, drops persistent 🔮 markers on the chart, and closes the drawer. The active strategy isn't touched.
- Each ability is a **TradingView-native tool** — it does not expire. HUD charge dots are kept for cosmetic consistency with the v0.7b economy, but every ability is always available.
- **Double-click a HUD slot to open its editor.** Single click = use; double click = edit. Trails → materialize; abilities without a dedicated editor fall back to `use()`.
- Laser aim (**2**): tap once to enter aim mode — avatar freezes, chart arms for spawn clicks. Single-click the chart to open a **HLine · VWAP · Ladder · Fib Ladder · Bracket · OCO · Cancel** menu at the clicked price. Tap **2** again or press **Esc** to exit aim.
- Laser Bracket drop: a 1:2 BUY bracket (risk 20, slDistance 60) is placed at the clicked price — same `shadowGateCheck()` + `fireShadowBracket()` path the old hotbar used, and it still fires `missions.onBracketPlaced?.()` + `tutorial.markBracketPlaced?.()`. For the full R:R / precise-entry editor, double-click a placed bracket overlay.
- HLine / VWAP / Fib ladder body: click + drag the overlay (body grip for ladders) to move it in 2D. **Delete** (when selected) removes it.

Other
- **M** — open / close menu drawer (holds wallet, skins, perspective, run, shop, stats, vehicle picker, replay tutorial, L3 terminal, chart background)
- **B** — open / close $CRDS shop (charges · $CRDS → $RUN exchange). Esc also closes.
- **Tab** — SDK drawer (event log · API · capabilities · tokenomics)
- **Esc** — skip tutorial · exit laser aim · close menus
- **R** — restart
- **Delete** — remove the currently-selected overlay (bracket · ladder · OCO · trendline · HLine · VWAP)
- **Menu → Open L3 terminal** — Phase 2 "Eye" preview drawer (BotBoard · CoachChannel · TuneChannel · Coordination · Event log)

## Three avatar states

| Mode | Entered by | Skins | Physics |
|---|---|---|---|
| **Runner** | Default | Built-in runner (Shadow Runner in upside-down) | Gravity, walks on candle tops, jumps |
| **Flight** | Double-tap ↑ (or F) | Invader · UFO · Rocket · X-Fighter | No gravity, 4-way free movement |
| **Upside-Down** | Double-tap ↓ | Shadow Sub · Hunter · Void Shark · Revenant | Same physics as Runner / Flight, but inside a hostile shadow chart with monsters |

## Perspective modes

| Mode | Behaviour |
|---|---|
| **Linear** | Constant pixels per dollar — the classic linear price ladder. |
| **Logarithmic** | Pixels are spaced by `log(price)`. Equal percent moves take equal screen distance — useful for 1D or wide ranges. |
| **Auto-zoom** | Each frame, fits the visible candles plus the player into ~72% of the viewport. Mid + scale lerp smoothly so it never snaps. |

Switching perspectives takes effect immediately and the bracket / HUD overlays follow.

## Bracket editor flow

1. **Quick path**: tap **2** → 1:2 BUY bracket at the current price. Consumes one Bracket charge.
2. **Full editor path**: hold **2** (>320ms) → R:R picker opens. Opening the editor also consumes one Bracket charge (even if cancelled — same contract as every other item).
3. Pick a preset (mouse or **1**/**2**/**3**/**4**). Ghost bracket appears on chart with dashed Entry / TP / SL lines.
4. Fine-tune: **Hold 2 + ↑/↓** to nudge entry, **Flip side** button, **E** to open precise input (Side · Entry · SL distance · R:R · Risk).
5. **Enter** → ability fires against the SDK, ghost becomes a solid overlay.

## What's real vs. mocked

- **Real:** Binance klines (all 15 intervals, 1m → 1M, plus 3D/1W/1M additions from v0.8e), candle rendering, game loop, physics for all three avatar modes plus the vehicle ride/grind system, perspective math (Lin / Log / Auto), SDK event model + capabilities flag (v0.8g), all nine abilities wired to the SDK (#1–#9), HLine + Anchored VWAP drag/ride/delete, Fib Ladder rung scaling, laser aim + click-spawn menu, overlay hit-testing + per-endpoint drag handles, bracket editor math, combat (Monster Mode: spawn / chase / collide / HP / kill rewards with trails and trendlines acting as walls), missions, tutorial, particles / floats / hit-stop / banners / confetti, L3 Terminal event stream (mock signed receipts, CoachChannel / TuneChannel / Coordination gate).
- **Mocked:** wallet / Solana transactions, on-chain fills. The `ChartRunnerSDK` surface (plus the v0.8g capabilities flag) is the right shape to plug a real DEX adapter behind it.
- **Not present yet:** WebSocket live candles, mobile touch controls, signed run summaries, leaderboards, symbol picker, per-asset P&L tracking. These sit on the v0.6 and v0.7 "next steps" lists and are still deferred to Phase 2.

## Architecture

`ChartRunnerSDK` stays framework-free and decoupled from rendering — it would lift cleanly into an npm package. The bracket editor, mission system, tutorial, and perspective system all sit on top of the SDK and the chart, respectively: they're pure UI / view code that doesn't touch the SDK contract, so swapping a real execution backend or a different chart source requires no changes to either.

Combat is isolated — `updateCombat(dt)` only runs while the player is in the upside-down world and clears state on exit. Particles + floating numbers have their own tick (`updateFxOnly`) so they keep animating cleanly during hit-stops.

The Phase 0 plan (`ChartRunner_Phase0_Plan.md`) lays out the reorchestration needed for Phase 1 SDK pull-over (rendering behind a `ChartHost` interface, abilities behind an `AbilityRegistry`) — those are the next structural changes.

## Roadmap

**Phase 0** — *shipped at v0.8k#23* — Playable first oneshot. Onboarding, missions, juice, simplicity, now with TradingView-native topbar, first-class chart tools, vehicle ride/grind system, and no-fade overlay discipline.
**Phase 1** — *next* — SDK pull-over layer. Drop the game UI on top of Dexscreener / TradingView / any chart host. The v0.8g capabilities flag is the handshake.
**Phase 2** — *later* — Standalone dApp with wallet connect, live Solana trades through the same SDK contract.

## Suggested next steps for v0.6

1. Extract `ChartHost` interface — first step toward Phase 1.
2. Per-trade P&L tracking — track fills against live price, show realised / unrealised P&L on the HUD.
3. WebSocket live updates — stream the newest kline so the right-most candle updates in real time.
4. More monster behaviours — shooters that fire back, swarm patterns, mini-bosses on high-volatility candles.
5. Mobile controls — on-screen joystick + ability buttons for touch play.
6. Signed run summaries — client signs `{seed, tf, startTs, endTs, pickups, kills, score}` for cheat-resistant leaderboards.
7. Symbol picker — dropdown for SOL, ETH, any Binance pair.
