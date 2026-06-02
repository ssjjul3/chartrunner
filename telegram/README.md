# ChartRunner Telegram Mini App

Static live route for `https://chartrunner.xyz/telegram/`.

## What It Is

`index.html` is the full ChartRunner game and charting prototype adapted for
Telegram/mobile. It is intentionally single-file for the deployed route: chart
engine, game loop, terminal widgets, wallet surfaces, and mobile controls all
live in the page, with `cr-telegram-init.js` as the small Telegram boot bridge.

## v1.0.126 Phone-First Controls

- One-finger chart taps move the runner immediately.
- Two-finger chart gestures pan and zoom the market view.
- Placed chart tools/primitives keep using the existing drag/edit pipeline via
  touch-to-mouse adaptation.
- Pinned terminal/chart widgets can be dragged from their title bars and resized
  from their grips on touch screens.
- Bottom-left transparent hotkeys expose `1`, `2`, `3`, `4`, and `5`.
- Bottom-right runner control acts like a movement stick.
- Quick `F` and `S` buttons map to fly and shoot.

## Files

- `index.html` - canonical live Telegram route and full game surface
- `cr-telegram-init.js` - Telegram WebApp boot helpers
- `tonconnect-manifest.json` - placeholder manifest for future production TON Connect setup
- `icon.svg` - Telegram manifest/app icon
- `README.md` - this route note

## Verify

Use the ChartRunner inline-script verifier from the project workspace:

```bash
node /Users/julianroy/.agents/skills/chartrunner-playtest-verifier/scripts/check-prototype-js.mjs telegram/index.html
node scripts/check_public_leakage.mjs
```

The older split-file smoke test is not the source of truth for this live route.
