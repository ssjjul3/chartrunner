# ChartRunner Telegram dApp

Static Telegram Mini App prototype for a ChartRunner training run with TON wallet connect.

## What It Is

ChartRunner mobile treats the chart as the level: live candles move through liquidity,
bears pressure the setup, and the player uses Run, Long, Short, Bracket, and Rescue
abilities from the thumb zone.

The app has no build step. It includes Telegram's Mini App SDK and otherwise stays static/offline-friendly. Wallet connection is a no-crash prototype handoff using Telegram Wallet/Tonkeeper links plus a clearly labeled local demo connect state.

## Telegram + Wallet Behavior

- Detects `window.Telegram.WebApp` safely.
- Calls `ready()`, `expand()`, `setHeaderColor()`, and `setBackgroundColor()` when available.
- Shows Telegram Mini App status and user info from `initDataUnsafe.user` when present.
- Shows browser fallback copy outside Telegram.
- Opens Telegram Wallet inside Telegram, or a Tonkeeper universal handoff link in browser fallback.
- Stores disconnected, pending, and demo-connected wallet states in `localStorage`.
- Keeps chart gameplay usable without a wallet while annotating abilities as browser demo or wallet mode.

## Files

- `index.html` - Telegram SDK include, app shell, wallet panel, chart viewport, action deck, and Mission/Abilities/Stats sheets
- `styles.css` - safe-area mobile layout, chart-first UI, bottom sheet, desktop phone frame
- `app.js` - Telegram WebApp setup, wallet handoff/demo state, canvas drawing, live candle loop, trading ability feedback, sheet navigation
- `MOBILE_PLAN.md` - implementation plan and verification checklist
- `scripts/smoke-test.js` - static smoke test and JavaScript syntax check
- `tonconnect-manifest.json` - placeholder manifest for a future production TON Connect setup

## Verify

```bash
node scripts/smoke-test.js
```

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy as a Telegram Mini App

1. Host the folder on an HTTPS URL.
2. Configure that URL in BotFather as a Web App button or menu button.
3. Replace `tonconnect-manifest.json` with production HTTPS `url` and `iconUrl` values.
4. Add a real TON Connect bridge/SDK flow if ChartRunner needs signed wallet proofs or transactions.
