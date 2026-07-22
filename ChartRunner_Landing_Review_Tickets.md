# ChartRunner Landing Page — Review & Tickets

Reviewed live: `https://chartrunner.xyz/` (the marketing landing — note `/landing` currently 404s; the real page is at the root). Lens: the same investor feedback (mental-model clarity, the 200ms test, virality/social proof, the validated differentiator).

## What's already working — keep it
- **One dominant CTA.** "▶ START RUN" is the clear primary action, repeated consistently (start run / play free / play now). This is exactly the focus Fabian wanted; don't dilute it.
- **Reassurance chips** ("Free · No install · Guest mode · Real candles") and the FAQ answers ("no wallet needed", "trades are simulated", "works on mobile") pre-empt the obvious objections. Good.
- **Hero is legible.** "RIDE THE CHART." + the sub-line reads as a chart-based game within ~200ms. The COACH.llm panel ("the floor is a real price chart / candle bodies become platforms…") is a strong concrete explainer.
- **Complete legal + social footer** (disclaimer, terms, privacy, impressum, X, GitHub).

## The core gap (most important)
The landing sells a **solo arcade game**. The differentiator Fabian actually validated — *learn technical analysis socially; teacher-student rooms; shareable runs/portfolios; "komm in die Gruppe" multiplayer* — is **absent**. As positioned, ChartRunner competes with browser games, not with "learn trading with friends." The social/teaching/multiplayer layer is the moat and it's not on the page.

Secondary gaps: visible **placeholder copy** (dev scaffolding shipped as live text), **zero social proof** (Fabian's law #1 of virality), and **no "makes-me-look-good" shareable** surfaced (his law #2).

---

## Tickets

### L-T1 — Replace placeholder eyebrow/scaffold copy
**Problem:** Dev-scaffold strings are live on the page: `> ARCADE_RUN :: LIVE_SITE_CONTENT`, `> playable_truth`, `> choose_run`, `> mode_select`, `> tutorial_boot`, `> coach_steps`, `> faq_cache`, `> final_command`. They read as unfinished.
**Change:** Replace each eyebrow with a real, human section label (the terminal `>` aesthetic is fine — the *words* need to be intentional, e.g. `> what it is`, `> ways to play`, `> how it works`). Audit truncated card copy too (several descriptions cut mid-sentence in the DOM).
**Acceptance:** No string on the page reads like a variable name; no sentence truncated.
**Effort:** S.

### L-T2 — Add the social / teaching / multiplayer story to the hero or a dedicated section
**Problem:** The validated differentiator isn't communicated. A visitor can't tell ChartRunner is multiplayer/social/taught.
**Change:** Add a section (and ideally one hero line) covering: invite a friend into a live room, learn charting together, a teacher walks you through, share your run. Frame the three-layer model in plain words — *play it · learn it · share it*. Tie to the validated "shareable demo portfolio + technical analysis + didactic layer."
**Acceptance:** A first-time reader can state that ChartRunner is social/multiplayer and teaches charting, not just a solo dash.
**Effort:** M. **Depends on:** the rooms/multiplayer feature being demo-ready (Milestone 4/5) before over-promising.

### L-T3 — Add social proof
**Problem:** No counts, testimonials, or activity. Fabian: people share more when they see others already have.
**Change:** Surface lightweight proof once real: players this week, runs shared, a live/recent leaderboard strip, the Solana Superteam association, or a short quote. Until real numbers exist, use a true, modest signal (e.g. "Built at a Solana hackathon") rather than fabricated metrics.
**Acceptance:** At least one credible, non-fabricated proof element above the fold or in the modes section.
**Effort:** S–M.

### L-T4 — Surface a shareable "look-good" artifact
**Problem:** Nothing on the landing shows the thing users would proudly share (Fabian's law #2 of virality).
**Change:** Show the player card / level (1–10) / Elo-style score / shareable run summary the game already plans (leveling + on-chain leaderboard from Milestone 6). Include an example "share card" image and a "share your run" mention.
**Acceptance:** Landing depicts a concrete shareable artifact that flatters the sharer.
**Effort:** M. **Depends on:** Milestone 6 share-card/leaderboard work.

### L-T5 — Tighten positioning for the crypto-newcomer audience
**Problem:** "Trading game / ride candles" may not connect to "I'll learn technical analysis" for the non-expert, Mama-tauglich audience that is the actual target.
**Change:** Make the learning outcome explicit and beginner-framed in the hero sub-line and the "how it works" steps (e.g. "Never read a chart before? You will after one run."). Keep jargon (bracket, volatility) out of the first screen; introduce it in the COACH panel.
**Acceptance:** A non-trader understands the payoff ("I'll learn to read charts") from the hero alone.
**Effort:** S.

### L-T6 — Fix the `/landing` route (and pick one canonical URL)
**Problem:** `chartrunner.xyz/landing` returns the 404 page ("This candle doesn't exist"). If `/landing` is referenced anywhere (ads, decks, links), it's a dead end.
**Change:** Either redirect `/landing` → `/`, or serve the landing at `/landing` — pick one canonical path and 301 the other. Confirm the 404 page's "Back to home" / "Play" links resolve.
**Acceptance:** `/landing` no longer 404s; one canonical landing URL; no broken internal links.
**Effort:** S.

### L-T7 — Align landing modes with the in-app entry-point modes
**Problem:** The landing lists modes (Racing / Monster / Snake / Time is Money / Campaign / Terminal & Bots) but not the tutorial/teaching and multiplayer/room modes that Milestone 3 defines in-app — so the landing and the product will tell different stories.
**Change:** Once Milestone 3's mode taxonomy is set, mirror it on the landing (add Tutorial/1-on-1/Multiplayer cards), and ensure each "play" deep-link (`/play/?mg=…`) maps to the right in-app entry point.
**Acceptance:** Landing mode cards 1:1 match in-app modes; deep links land in the correct mode.
**Effort:** S–M. **Depends on:** Milestone 3.

---

## Sequence
Do **L-T1** and **L-T6** now (cheap, pure polish/correctness, support the M5 feature-freeze discipline). **L-T5** is a quick copy win. **L-T2 / L-T3 / L-T4 / L-T7** depend on the corresponding product milestones (4, 6, 3) being demo-ready — land them as those features mature so the landing never over-promises a buggy feature (Fabian's warning that half-baked features hurt more than missing ones).
