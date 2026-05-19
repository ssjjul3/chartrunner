# ChartRunner Telegram Mini App Implementation Plan

## Goals

- Make the chart canvas the playable level: live candles, liquidity zones, bear pressure, and score feedback are visible without leaving the Run screen.
- Ship the prototype as a Telegram Mini App with safe fallback behavior in normal mobile browsers.
- Add a TON/Telegram wallet connection surface that can launch wallet handoff links now and support a real TON Connect bridge after HTTPS deployment.
- Keep the app mobile-first for portrait play with safe-area padding, thumb-friendly actions, and bottom sheet navigation.
- Preserve the static prototype stack with no package install or bundler; the only runtime network script is Telegram's Mini App SDK.
- Provide a clean desktop fallback that frames the mobile app like a device.

## Architecture

- `index.html` defines the app shell, Telegram SDK include, Telegram status strip, wallet panel, chart viewport, trading controls, onboarding copy, and bottom sheet panels for Mission, Abilities, and Stats/Learn.
- `styles.css` owns the responsive mobile layout, safe-area support, chart-first composition, thumb controls, sheets, and desktop device frame.
- `app.js` owns Telegram WebApp detection, `ready()`/`expand()` setup, wallet state persistence in `localStorage`, TON/Telegram wallet handoff links, the lightweight game state, candle animation, canvas rendering, ability buttons, tab switching, and outcome feedback.
- `tonconnect-manifest.json` is a placeholder manifest to replace with production HTTPS URLs before real TON Connect signing.
- `scripts/smoke-test.js` performs static verification and runs JavaScript syntax checks with `node --check`.

## Wallet Flow

- In Telegram, the app detects `window.Telegram.WebApp`, marks the session as a Telegram Mini App, and shows the Telegram user from `initDataUnsafe.user` when available.
- `Connect Wallet` opens Telegram Wallet through a Telegram link when inside Telegram, or a Tonkeeper universal handoff link in browser fallback.
- `Demo Connect` stores a clearly labeled prototype wallet state locally so gameplay can be tested without a live bridge.
- Trade abilities remain playable in browser fallback, but their feedback distinguishes demo mode from wallet mode.

## Verification

Run these commands from `chartrunner-mobile`:

```bash
node scripts/smoke-test.js
```

Manual check:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173` and verify:

- The chart is the primary viewport and candles continue moving.
- Run, Long, Short, Bracket, and Rescue controls are reachable by thumb.
- Mission, Abilities, and Stats/Learn bottom sheets open from the nav.
- Telegram status shows browser fallback outside Telegram and Mini App/user info inside Telegram.
- Wallet panel supports disconnected, pending handoff, demo connected, and disconnected states.
- Desktop view frames the mobile app cleanly.

## Real Telegram Deployment

- Host this folder on HTTPS; Telegram Mini Apps cannot be served from plain HTTP in production.
- In BotFather, add the HTTPS URL as a Web App button or menu button for the ChartRunner bot.
- Replace `tonconnect-manifest.json` with production `url`, `name`, and `iconUrl` values on the same HTTPS origin.
- Add a real TON Connect bridge or SDK integration if signed wallet proofs or on-chain transactions are required.
