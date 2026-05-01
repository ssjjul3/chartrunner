# Video Script — ChartRunner 3-Minute Explainer

**Format:** voice-over + screen capture + a few cuts to the founder on camera.
**Length target:** 2:45 – 3:10
**Aspect:** 16:9 master, vertical 9:16 cut for X / Reels.
**Music:** lo-fi synthwave, low BPM, no vocal.

---

## ⏱ 0:00 – 0:05 — Cold open

**On screen:** Black. Three frames flash: candle chart → upside-down chart → green Invader sprite.
Music drops.

**VO (spoken):**
> *"What if every trade was a game move?"*

---

## ⏱ 0:05 – 0:25 — The problem

**On screen:** Stock footage / quick clips: Bloomberg terminal close-up. A confused first-time user clicking around TradingView. A "404 — Did Not Read PDF" stat overlay.

**VO:**
> "Trading apps are a hospital monitor. Twelve panels, a hundred numbers, and an order ticket asking you to bet real money before you've understood what any of it means. **74% of retail traders quit in 90 days.** Not because they're stupid. Because the on-ramp is a cliff."

**Lower-third:** *Source: Brokerchooser, 2024*

---

## ⏱ 0:25 – 0:55 — The solution (game intro)

**On screen:** Cut to ChartRunner. Splash desktop with the Mac OS 9 menubar. Cursor opens **Run** → picks **Time is Money** → opens **Configs** → picks BTC → clicks **Start Run**.

**VO:**
> "ChartRunner turns the cliff into a game. Real Binance candles. Three avatar physics modes. Walk on the chart tops. Fall through the close. Land in the upside-down — a hostile shadow chart where bears spawn on volatility."

**On screen:** Player runs across candles, jumps, falls through close, drops into upside-down. Bears spawn. Shoot one. Hit-stop, particles, screen flash.

**VO:**
> "Every primitive you'd use as a trader — **bracket, ladder, OCO, hedge, radar, rescue** — is an in-game ability."

---

## ⏱ 0:55 – 1:30 — The trading primitive demo

**On screen:** Press `2` for Laser. Click a candle. The spawn menu opens (positioned smartly so the candle stays visible). Pick **Bracket**. Click a second anchor. The bracket appears on the chart with TP and SL lines.

**VO:**
> "Press 2. Click a candle. Pick a bracket. Click again to set the stop. That's a real bracket order. **It just routed through ChartRunnerSDK** — the same SDK we'll plug into Solana devnet for live trades. **What you practice is what graduates.**"

**On screen:** Cut to the SDK file. Highlight the `placeBracket` line.

**VO:**
> "The constitutional rule: abilities never touch the canvas. The SDK is the only thing that issues orders. That's why Phase 2 — live trades on Solana devnet — is a swap, not a rewrite."

---

## ⏱ 1:30 – 2:00 — Workbench + creator economy

**On screen:** Open Workbench. Show the **Bots** tab. Type a name, pick the Sniper role, hit **Build**. Equip the bot. Cut to the game — the bot orb is now flying around the avatar, emitting toasts: *"🎯 Bot: Engulfing — entry signal."*

**VO:**
> "Players can build their own bots in Pine Script. Equip them, they fly around your avatar as orbs and detect setups in real time. Strategies and indicators too — list them on the P2P Marketplace for $SOL. **Pine Script creators with revenue share. TradingView can't match that without breaking their SaaS.**"

---

## ⏱ 2:00 – 2:25 — Distribution

**On screen:** Show the single HTML file in Finder. Drag it to a Chrome tab. It runs.

**VO:**
> "The entire MVP is **one HTML file**. No backend. No build step. No CDN. We can embed in a tweet. Drop on a partner's site as a script tag. Spin up a hosted version for any venue in an hour. **Every other competitor is a SaaS. We're a runtime artifact. That's distribution asymmetry.**"

---

## ⏱ 2:25 – 2:45 — Why now + the ask

**On screen:** Quick montage — Phantom wallet UX, Hyperliquid funding chart spike, pump.fun feed, a Solana hackathon banner.

**VO:**
> "Hyperliquid plus Phantom flipped the wallet UX. Memecoin season trained 8 million wallets to swap on-chain. The infrastructure is here. The skill on-ramp is missing. **We're the on-ramp.**"

**On screen:** Founder on camera, eye-line to the lens. Clean background.

**VO (founder, on cam):**
> "We're looking for a **devnet integration partner** and a **six-month seed**. The product runs today. Try it."

---

## ⏱ 2:45 – 2:55 — Closing

**On screen:** ChartRunner logo. URL: `chartrunner.xyz` or GitHub repo. X handle: `@chartrunner_xyz`.

**VO (whispered, low):**
> "ChartRunner. Trade the chart. Survive the upside-down."

**Music:** out.

---

## Production checklist

- [ ] Screen capture in 4K, 60fps (downsampled to 1080p)
- [ ] OBS preset with no overlay clutter
- [ ] First take: capture all in-game footage in one continuous run so the audio doesn't have to fight cuts
- [ ] Founder VO recorded with a Shure MV7 or equivalent, dry, no reverb
- [ ] Background music licensed (Epidemic Sound or Artlist), credit in description
- [ ] Premiere project saved at `/video/chartrunner-explainer-v1.prproj`

## Asset shot list

| # | Shot | Length | Capture method |
|---|---|---|---|
| 1 | Cold open: 3 frames flash | 0:05 | After Effects composite |
| 2 | Hospital-monitor pain montage | 0:20 | Stock + screen recording of TV.com first-time setup |
| 3 | Game splash → Configure → Start Run | 0:30 | Live screen capture, single take |
| 4 | Player crosses chart, falls through close | 0:15 | Live capture |
| 5 | Bracket placement (laser → click → click) | 0:35 | Live capture |
| 6 | Workbench bot build + equip + orb in game | 0:30 | Live capture, two-cut composite |
| 7 | Single-file demo (Finder → Chrome) | 0:25 | Screen + finder |
| 8 | Why-now montage (Phantom / Hyperliquid / pump.fun) | 0:20 | Stock crops, fast cut |
| 9 | Founder on-cam ask | 0:15 | Camera, daylight, bookshelf bg |
| 10 | Closing logo + URL + handle | 0:10 | After Effects |

## Vertical 9:16 cut (X / Reels / TikTok)

- Trim to 0:55 max
- Lead with the bracket placement demo (0:55–1:30 of master) as the hook
- Drop the founder on-cam ask
- End with logo + handle

## Subtitles

- All VO captioned with auto-burned subtitles (Premiere Pro caption track → bake into export)
- Subtitle font: Inter Bold, 28pt for 16:9 / 36pt for 9:16
- Position: lower third, centered, 2-line max
