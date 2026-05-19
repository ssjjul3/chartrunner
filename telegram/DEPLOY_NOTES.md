# chartrunner-mobile — Deploy Notes

*Last updated 2026-05-19 by Cowork-Claude after audit + manifest edit.*

## Provenance

- Built autonomously by Hermes10000 + OpenClaw30000 in ChartRunner_HQ on 2026-05-18 (~22:30 CEST)
- Source on Umbrel: `/data/.openclaw/workspace/chartrunner-mobile/` (in `openclaw_gateway_1` container)
- Extracted to Mac: `Trading Game/chartrunner-mobile-bot-built/` via `docker cp` + scp

## What this is

A **standalone Telegram Mini App shell** — NOT a port of `ChartRunner_Prototype.html`. ~452 lines of JS, mobile-first, TON Connect handoff. Five abilities (Run / Long / Short / Bracket / Rescue), animated mock candles, wallet panel with localStorage state.

This is a **second product** alongside the desktop prototype:

| Product | Code | Deploy target | Audience |
|---|---|---|---|
| ChartRunner desktop prototype | `ChartRunner_Prototype.html` (47k lines) | chartrunner.app | Desktop browser, full game |
| ChartRunner Telegram Mini App | `chartrunner-mobile-bot-built/` (~452 lines) | chartrunner.xyz/telegram | Mobile via Telegram, thumb-first shell |

## Edits applied tonight

1. **`tonconnect-manifest.json`** — replaced placeholder URLs:
   - `url`: `https://chartrunner.example.com` → `https://chartrunner.xyz/telegram`
   - `name`: `ChartRunner Mobile` → `ChartRunner`
   - `iconUrl`: `https://chartrunner.example.com/icon.png` → `https://chartrunner.xyz/telegram/icon-180.png`
2. **`scripts/smoke-test.js`** — updated name assertion to match new `"ChartRunner"` value
3. **Smoke test verified passing** via `node scripts/smoke-test.js`

## Findings from audit

- **`twaReturnUrl` was claimed but doesn't exist** in app.js. The bots referenced it as one of three edits to make; in reality the wallet handoff uses `TELEGRAM_WALLET_URL` (`https://t.me/wallet?startattach=wallet`) and `TONKEEPER_UNIVERSAL_URL`, both hardcoded at lines 21-22. No bot username appears anywhere. Nothing to update there.
- **Manifest URL is built dynamically** at runtime (line 23: `${window.location.origin}/tonconnect-manifest.json`) — works automatically once deployed under any HTTPS origin.
- **No external CDN dependencies** except Telegram's `telegram-web-app.js` (allowlisted in smoke test).
- **Wallet flows**: Connect = opens Telegram Wallet inside Telegram, Tonkeeper universal handoff in browser. Demo = saves a fake connected state to `localStorage`. Disconnect = clears state.
- **No real signed TON Connect proof yet** — by design. This is a v0.1 prototype shell, not production wallet signing.

## What's left before deploy

1. **Create `icon-180.png`** (180×180 PNG, ChartRunner logo) in the folder root. Either:
   - Generate from your existing logo assets (downscale `LOGO.png` to 180×180)
   - Or design fresh for Telegram aspect
2. **Host the folder** at `chartrunner.xyz/telegram`. Options:
   - Cloudflare Pages: drag the folder into Pages dashboard, or push to a `chartrunner-telegram` git repo with Pages auto-deploy
   - GitHub Pages: if `chartrunner.xyz` is already on GH Pages, add `/telegram/` subdirectory in the repo
   - Vercel / Netlify: similar drag-folder
   - Self-hosted nginx: scp folder + add `/telegram` location block
3. **Configure BotFather**:
   - Open Telegram → `@BotFather` → `/mybots` → pick or create the ChartRunner bot
   - **Bot Settings** → **Menu Button** → set URL to `https://chartrunner.xyz/telegram`
   - (Optional) `/setdomain` → register `chartrunner.xyz` as allowed
4. **Smoke-test live**:
   - Open `https://t.me/<bot_username>` in your phone Telegram
   - Tap the Menu Button → Mini App loads
   - Verify Telegram status strip says "Telegram Mini App" (not "Browser fallback")
   - Tap Connect Wallet → should open Telegram Wallet in-app
   - Tap Demo Connect → wallet badge turns green

## Open strategic questions

- **Bot username**: what bot will host this? Need to pick or create before BotFather config. Existing options from memory: `@Hermes10000_bot`, `@OpenClaw30000_bot`, `@Agent_Zero_Trade_Bot` (legacy). A dedicated `@ChartRunner_bot` is the right brand move — `/newbot` in BotFather, 30 seconds.
- **Convergence path with the desktop prototype**: do both apps eventually share code (e.g. extract a shared `ChartRunnerSDK` per the M2.5 milestone) or stay separate? Plan v2.1 anticipated this for M2.5. The current divergence (~452 vs 47k lines) is fine for v0.1 but won't scale long-term.
- **Real TON Connect**: when to add SDK-based signed wallet proof. Probably aligned with the on-chain features in M0.5 + M3 (Anchor programs already on devnet).

## Commands reference

```bash
# Smoke test
cd "Trading Game/chartrunner-mobile-bot-built" && node scripts/smoke-test.js

# Local preview (Mac http.server)
python3 -m http.server 4173
# then open http://localhost:4173

# Local preview via existing localhost:8765 server
# (Not directly — that server is rooted at Trading Game/. Could add subpath
#  by symlinking chartrunner-mobile-bot-built/ in there.)
```
