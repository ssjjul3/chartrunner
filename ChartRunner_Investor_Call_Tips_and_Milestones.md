# ChartRunner — Investor Call: Filtered Tips & Milestones

Distilled from the Fabian Salomon call (2026-06-24). Signal only — the concrete advice and the sequenced milestones, stripped of the back-and-forth.

## The validated mental model
ChartRunner = **shareable demo portfolio + technical-analysis layer + didactic (teaching) layer**, wrapped in a multiplayer game. Three layers, usable independently; the teaching layer sits on top of TA, which feeds the demo portfolio. The novelty isn't the demo-portfolio concept (banks have done it forever) — it's the **social + taught + gamified** loop. That's the moat versus Dexscreener / TradingView, where charting is a "solved problem" for pros but not for the beginner / "Mama-tauglich" audience you're targeting.

## Tips (Fabian's concrete advice)

1. **Don't hide gated features — show them locked.** Completionism: people are bothered by things they can't see/click. Surface locked features with a clear "do X to unlock," which also nudges the action you want (wallet connect, etc.).
2. **Pass the 200ms test.** A new visitor must know *what this is* and *what to click* almost instantly, or they bounce. Average users don't scan the page — they get it fast or leave.
3. **Onboard by asking, not imposing.** Don't auto-start a tutorial. Show a cookie-gated modal first: *"You're new here — want the tour, or explore yourself?"* Include "Don't show again," and keep a persistent reopener for people who dismissed it. This is the canonical pattern people already know (since Windows 3.1).
4. **Introduce the two mascots.** Name the teacher (COACH) and the player (runner) explicitly so the screen isn't an "alien planet."
5. **Make entry points = modes that toggle features.** Tutorial / free single-player / 1-on-1 / multiplayer are distinct contexts; each shows only the features that make sense and disables the rest so newcomers aren't overloaded. You're currently mixing too many features into one surface.
6. **Don't bury the minigames.** Racing three menus deep (`Play → Minigame → Racing`) is too much for a first-timer; give arcade modes their own clear entry. (Racing has viral precedent.)
7. **Rooms need an owner/moderation model — and it's the paid feature.** Mute / kick / invite-as-presenter; owner-only write by default. The people who teach charting to their group ("komm in die Gruppe") are your distribution, and moderation is what they'll pay for and need against trolls.
8. **Don't over-complicate the wallet** in the core flow — keep it out of the first-run path.
9. **Use an LLM as a UX tester.** Clear cookies, point Claude-in-Chrome at the start screen primed as a UX expert, and ask only *"what is this / what would you click next?"* — never feed it the answer. Re-run after each onboarding change.
10. **Virality law #1 — social proof.** People share more when they see others already have. Build visible proof in from the start.
11. **Virality law #2 — make the sharer look good.** People share what flatters them. Lean into leveling (1–10), an Elo-style score, a player card, shareable runs / leaderboards.
12. **Plan for virality's three phases:** seed (nerds) → run → level-off. Design shareables for all three up front.
13. **Feature freeze + minimum viable viral set.** Stop adding features. Decide the smallest set that can go viral, polish it until it's bug-free, and gate everything buggy or non-essential out of view — half-baked features hurt virality more than missing ones.
14. **Keep ammunition.** Don't dump every feature at once; hold some back to re-ignite interest after the first wave levels off. Multiplayer can be in the viral set, but only as a *conscious* decision and only if it actually works (right now it's the newest and most broken).

## Milestones (sequenced toward go-to-market)

1. **One-screen mental model** — first screen states what ChartRunner is and what to click; relabel opaque buttons (Terminal, Token); offer the entry choice (demo / TA / both / explain or explore). *(Unblocks everything; mostly additive.)*
2. **Cookie-gated onboarding modal** — ask "tutorial or explore?" on first visit; introduce both mascots; persistent "New here?" reopener; "don't show again" + reassurance.
3. **Mode-based entry points** — distinct modes that toggle the right feature set; disable irrelevant features (esp. in tutorial); surface minigames clearly.
4. **Rooms: ownership & moderation** — admin console (mute/kick/invite-as-presenter), 1-on-1 teaching + moderated broadcast; this is the paid tier.
5. **Stabilize multiplayer + feature freeze** — fix the multiplayer bugs (sticky drag, overlay sync, laggy console), then freeze and polish the viral set; gate the rest.
6. **Virality engine** — leveling + player card + Elo-style score, end-of-minigame Share, on-chain leaderboard, visible social proof; design shareables to flatter the sharer.
7. **Go-to-market sequencing** — seed to the crypto-nerd early adopters (Solana Superteam network, the eSports/trading-competition format), ride the wave on the frozen set, then release held-back features to re-accelerate. Onboarding is the gate — virality can't reach past the top 1% if newcomers can't get in.

## Suggested order of attack
Milestones **1–2** first (the unlock, and additive). Run **5** in parallel as a discipline. **3, 4, 6** are the substance of the viral set. **7** is the launch wrapper. Keep wallet / on-chain depth out of the core first-run path until the funnel converts.
