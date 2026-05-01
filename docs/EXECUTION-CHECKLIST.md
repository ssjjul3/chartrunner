# Execution Checklist

Use this to drive the next 14 days from "MVP submission package built" → "shipped + first traction milestone hit."

## Day 0 — Repo + deploy

- [ ] Create GitHub org `chartrunner-xyz` (or `<your-org>`)
- [ ] Create public repo `chartrunner` under the org
- [ ] Initial commit:
  - [ ] `ChartRunner_Prototype.html`
  - [ ] `chartrunner-prototype/` (deploy folder mirror)
  - [ ] `README.md`
  - [ ] `LICENSE` (MIT)
  - [ ] `docs/` (all 9 files in this package)
  - [ ] `PITCH-DECK.pptx`
  - [ ] `.gitignore` for node_modules, .DS_Store, /tmp
- [ ] Enable GitHub Pages:
  - Settings → Pages → Source: `main` branch, `/chartrunner-prototype` folder
  - Custom domain (optional): `chartrunner.xyz` → CNAME `<user>.github.io`
- [ ] Verify the live URL loads + the first bracket placement works
- [ ] Add the live URL to repo About + README badges
- [ ] Push initial CI workflow (`.github/workflows/ci.yml`):
  - parse-check on the HTML scripts
  - run on every PR

## Day 1 — Social + identity

- [ ] Reserve `@chartrunner_xyz` on X
- [ ] Reserve backup handles `@playchartrunner`, `@chartrun_app`
- [ ] Set profile picture (Invader sprite on `#0D0D14`)
- [ ] Set header image (game screenshot)
- [ ] Set bio (option from X-LAUNCH.md)
- [ ] Pin the launch thread (drafted in X-LAUNCH.md, just paste)
- [ ] Reserve `chartrunner.xyz` domain (Namecheap / Porkbun)
- [ ] Point domain at GitHub Pages
- [ ] Wait 24–48h for DNS propagation
- [ ] Add `chartrunner.xyz` to X bio link

## Day 2 — Video

- [ ] Record screen captures per VIDEO-SCRIPT.md shot list
- [ ] Record VO (Shure MV7 or equivalent, treated room)
- [ ] Edit master 16:9 (~3 min) in Premiere
- [ ] Cut 9:16 vertical (~55s) for X / Reels
- [ ] Subtitle bake on both
- [ ] Upload master to YouTube unlisted
- [ ] Upload vertical to X media library

## Day 3 — Public launch (X)

- [ ] Post launch thread (10 tweets from X-LAUNCH.md), pin it
- [ ] Drop the live demo URL in 3 communities:
  - r/solana (text post: "I built a single-file gamified trading SDK")
  - Hyperliquid Discord (#general or #builders)
  - Drift Discord (#community)
- [ ] DM 5 targets:
  - 1 Solana foundation eng
  - 1 Hyperliquid biz dev
  - 1 Drift biz dev
  - 1 Phantom partnerships
  - 1 crypto-native VC associate
- [ ] Track every reply / mention in `traction-log.md` (private)

## Day 4 — Show HN

- [ ] Submit to Hacker News:
  - Title: `Show HN: ChartRunner — gamified trading SDK in one HTML file`
  - URL: live demo (not GitHub repo)
  - First comment: short technical breakdown — single-file constraint, SDK rule, Phase 2 Solana plan
- [ ] Stay on the thread for the first 4 hours; reply to every comment
- [ ] Cross-post to Lobsters

## Day 5–7 — Hackathon submissions (if applicable)

- [ ] Solana hackathon (next open window — check earn.superteam.fun)
- [ ] Hyperliquid hackathon if available
- [ ] Submission package:
  - Demo URL
  - GitHub repo
  - Pitch deck (PPTX from this package)
  - 3-min video
  - Project description (use README + PROBLEM.md as source)

## Week 2 — Outreach + traction

- [ ] DM 10 trader-creator accounts:
  - "We built a Pine Script marketplace inside a game. Want a Workbench account to publish your strategy as a tradeable asset?"
- [ ] Schedule 3 partner conversations:
  - 1 devnet integration partner
  - 1 chart-host (Dexscreener / Birdeye for Phase 1 overlay)
  - 1 wallet (Phantom / Solflare for Phase 2 connect)
- [ ] First seed conversations (DM ≠ formal pitch yet):
  - Solana foundation grants program
  - 1 crypto-native angel
  - 1 gaming-focused fund

## Week 2 metrics check

Compare vs targets in TRACTION.md (30-day):

- [ ] X followers ≥ 100
- [ ] Game sessions ≥ 25 (instrument via simple POST to a free analytics endpoint or basic GitHub Pages access logs)
- [ ] Trader-creator conversations ≥ 5
- [ ] Devnet integration LOI signed ≥ 1
- [ ] Tier-2 media embed ≥ 1

If any metric is < 50% of target by day 14, stop and audit:
- Is the demo URL working?
- Is the launch thread getting impressions but no follows? (signal: copy is wrong)
- Is the ask muddled? (signal: nobody DMs back)

## Phase 1 entry gate (≤ 90 days)

Don't start Phase 1 work until:
- [ ] `@chartrunner/sdk` published as npm package v0.1
- [ ] First devnet partner integration spec doc co-signed
- [ ] At least 500 unique sessions in the public demo
- [ ] At least 3 user-built strategies on the Workbench (from outside contributors)

If any of those isn't true, the Phase 0 prototype isn't done yet — don't fragment effort.

## Phase 2 entry gate (≤ 180 days)

- [ ] ChartHost adapter live for at least one third-party chart vendor (Dexscreener or Birdeye preferred)
- [ ] Solana devnet adapter shipping (paper-mode mirrors devnet behavior 1:1 in parity vectors)
- [ ] Funding closed (seed)
- [ ] Solana eng hire signed
- [ ] Comms/community hire signed

## Founder stamina rules

- **Max 2 hours / day on social.** Anything more is procrastination.
- **Ship something every day.** Even if it's a 10-line README fix. Cadence > batch.
- **Public progress on Sundays.** Honest weekly recap thread — Wins / Misses / Next.
- **Don't argue with strangers.** One reply, polite, then mute and move on.
- **One demo improvement per Friday.** Adds compounding artifact value to the launch URL.

## When to ask for help

- Stuck on architecture: post in the GitHub Discussions, tag the contributor list.
- Stuck on positioning: re-read PROBLEM.md aloud. If you can't say "ChartRunner is the X for Y" in one breath, the problem isn't sharp enough.
- Stuck on momentum: ship one thing in 2 hours. Anything. Compounding > debugging mood.

## What success looks like at day 30

Looking back at the day-30 mark, you should be able to write this paragraph honestly:

> ChartRunner has 100+ X followers. The public demo logs 25+ sessions. Five trader-creators have DM'd about Workbench publishing. One devnet partner is in active LOI conversation. Phase 1 SDK is feature-frozen at npm v0.1. The constitutional rule is intact.

If you can write that, you're on track. If you can't, audit *why* — usually it's that the launch happened but the engagement loop didn't.
