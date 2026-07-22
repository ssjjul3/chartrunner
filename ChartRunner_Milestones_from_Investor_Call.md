# ChartRunner — Roadmap & Milestones (from the Investor Call)

*Source: intro/product-feedback call with Fabian Salomon, 2026-06-24. Roadmap context: Phase 0 shipped (v0.5), Phase 1 = SDK pull-over, Phase 2 = wallet + live Solana trades.*

This is the consolidated, authoritative milestone doc. Every nuance from the call (the two laws of sharing, completionism, the 200ms test, ask-don't-impose, virality phases, feature freeze, ammunition, etc.) is folded into the milestone it belongs to, each with concrete actions, acceptance criteria, and current build status.

**Supporting docs:** `ChartRunner_M1-M2_Tickets.md` (M1–M2 implementation tickets) · `ChartRunner_crFirstRun_M2_Audit.md` (audit of the existing onboarding funnel) · `ChartRunner_Landing_Review_Tickets.md` + `ChartRunner_Landing_Copy_Draft.md` (landing) · `ChartRunner_Investor_Call_Tips_and_Milestones.md` (quick-reference).

## What Fabian validated (the spine)
ChartRunner is a **shareable demo portfolio + technical-analysis layer + didactic (teaching) layer**, wrapped in a multiplayer game. The three layers are independent; the teaching layer sits on top of TA, which feeds the demo portfolio. The concept itself isn't novel (banks have offered demo depots forever) — the **social + taught + gamified loop is the moat**. Plain charting is a "solved problem" for pros (Dexscreener, TradingView) but not for the beginner / "Mama-tauglich" audience you target.

His two hammered-home messages: **(1) the first-run experience is the blocker to going viral**, and **(2) you need a feature freeze and a deliberate go-to-market, not more features.**

**Status legend:** ✅ done · 🟡 partial / in progress · ⬜ not started.

---

## Milestone 1 — Nail the one-screen mental model  ⬜

**Goal:** a first-time visitor knows *what this is* and *what to click* in ~200ms, with no invite link or prior context.

**Nuances folded in:**
- **The 200ms test.** Average users don't scan the page — they get it instantly or bounce. Fabian couldn't tell what the product was from `Play / Terminal / Token / Profile` + a small wordmark.
- **Completionism — show, don't hide.** Don't remove gated features from view; surface them locked with a clear "do X to unlock." People are bothered by things they can't see, and the lock nudges the action you want (e.g. wallet connect).
- **LLM-as-UX-tester** is the standing check for this milestone (see acceptance).

**Actions:**
- Rewrite the first screen so the value proposition is the first thing read — lead with the promise (learn to read charts by playing, free, in-browser), not scattered buttons.
- Relabel opaque buttons (Terminal, Token) with one-line affordances or tooltips; keep Play dominant. Don't rename internal ids.
- Offer the entry choice: *demo portfolio / TA / both / explain-or-explore.*
- Show gated/locked features with "unlock by X" rather than hiding them.

**Acceptance:** A cold visitor (and a Claude-in-Chrome UX-tester primed as a UX expert, asked only "what is this / what would you click") correctly identifies it as a game that teaches chart-reading and knows the primary action. Re-run the UX-test after every onboarding change.

---

## Milestone 2 — First-run onboarding done right  🟡

**Goal:** guide new visitors without trapping them; let returners back in anytime.

**Nuances folded in:**
- **Ask, don't impose.** Don't auto-start a tutorial. Show a cookie-gated modal first: *"You're new — want the tour, or explore yourself?"* This is the canonical pattern people have known since Windows 3.1.
- **"Don't show again" + persistent reopener.** Many users dismiss modals reflexively, so the intro must always be reachable again, with a reassurance that tells them where.
- **Introduce the two mascots** — COACH (teacher) and the runner (you) — so the screen isn't an "alien planet."
- **Keep the wallet out of the first-run path** — don't over-complicate onboarding with it.

**Actions & status (audited against the existing `crFirstRun` funnel):**
- ✅ **Cookie-gated, one-time, resumable tour exists** (`crFirstRun`, key `cr_onboarding_v1`) with a dim+spotlight mask and COACH-bubble narration across every desktop surface.
- ✅ **M2-T3 — "New here?" reopener shipped:** a `?` badge on the persistent COACH hub (`crNewHereReopener`) replays the tour via `crFirstRun.reset()`; desktop-only, hidden in-run/tutorial; parse-validated.
- ✅ **M2-T4 — invite/deep-link entry respected** (implicit): the tour gates on `onDesktop()` + presence of app icons, so room/`?mg=`/snapshot invitees are never interrupted.
- 🟡 **M2-T1b — ask before launching (open gap):** the funnel currently auto-imposes the spotlight tour instead of offering "tour or explore?" — the exact thing Fabian warned against. Add a single COACH choice modal that launches the tour only on accept.
- ⬜ **M2-T2b — introduce the runner mascot (open gap):** COACH is introduced; the runner ("you") never is. Add one step naming the teacher/player split.
- ⬜ **M2-T5b — reassurance on dismiss (open gap):** skip only toasts "Tour skipped"; it should say "find it again under COACH → New here." (Now possible since the reopener exists.)
- ⬜ **Minor:** Esc-to-skip + ←/→ step nav, to match the in-game tutorial.

**Acceptance:** First visit offers a choice (not an imposed tour); the tour shows once and resumes across sessions; invite links bypass it; both mascots are introduced; dismissing reassures and points to the always-available reopener.

---

## Milestone 3 — Mode-based entry points that toggle features  ⬜

**Goal:** each context shows only the features that make sense, so newcomers aren't overloaded.

**Nuances folded in:**
- **Stop mixing features into one surface.** Multiplayer + chat + tutorial + minigames + free play all on one screen reads as an "alien planet." Distinct entry points should toggle the relevant set; features that don't apply to a mode aren't manually re-enableable.
- **Don't bury the minigames.** `Play → Minigame → Racing` is too deep for a first-timer; give arcade modes their own clear entry (Racing has viral precedent).

**Actions:**
- Define modes explicitly: Tutorial (guided) / Free single-player / 1-on-1 / 2-player / moderated multiplayer.
- In Tutorial mode, disable everything irrelevant to the current step.
- Surface minigames as a distinct, signposted entry (possibly their own icon).

**Acceptance:** From a cold load, the user lands in a mode whose visible features all make sense for it; minigames reachable in one obvious step.

---

## Milestone 4 — Rooms: ownership & moderation (the social + paid layer)  ⬜

**Goal:** a teacher can run a room for 1 or 200 people with real control — the natural paid feature.

**Nuances folded in:**
- **The teachers are your distribution.** The "komm in die Gruppe, ich erklär dir Charting" crowd is exactly the target; rooms give them somewhere to do it.
- **Moderation is the paid tier** and the protection against trolls at scale.
- **Wallet gating stays scoped** — only where genuinely on-chain (the Solana map "photo"), never leaking into the core first-run flow.

**Actions:**
- Room admin console: mute / kick / invite-as-presenter; owner-only write by default.
- Support 1-on-1 teaching (student gets write) and moderated broadcast (presenter writes, audience watches, headcount optionally hidden).
- Position the admin/moderation console as the paid feature.

**Acceptance:** An owner can host, moderate, and grant write in a room; the moderation console is gated as paid; wallet complexity doesn't appear in onboarding.

---

## Milestone 5 — Stabilize multiplayer, then feature-freeze the viral set  ⬜

**Goal:** a defined minimum set that is completely polished and bug-free — the go-to-market product.

**Nuances folded in:**
- **Feature freeze.** Stop adding features; decide the minimum viable *viral* set and polish it until nothing bugs.
- **Half-baked hurts more than missing.** Gate buggy/non-essential features out of view rather than shipping them rough.
- **Multiplayer is a conscious call.** It can be in the viral set, but only if it actually works — it's currently the newest and most broken feature.

**Actions:**
- Fix the known multiplayer bugs first: sticky drag-drop (runner keeps moving after release), chart-overlay sync/position across clients, the laggy ("backt") console/funnel.
- Define the viral set explicitly (polished onboarding + a few pro features + the core gaming loop + sharing); gate everything else.
- Decide multiplayer in-or-out deliberately.

**Acceptance:** The viral set is enumerated, fully polished, and bug-free; multiplayer is either solid-and-in or gated-and-out; everything non-essential is hidden.

---

## Milestone 6 — The virality engine  ⬜

**Goal:** sharing is built in, and what gets shared makes the sharer look good.

**Nuances folded in (the two laws of sharing):**
- **Law #1 — social proof.** People share more when they see others already have. Surface that others have joined/shared so a new user feels safe sharing too.
- **Law #2 — make the sharer look good.** People share what flatters them ("look what a well-informed crypto nerd I am"). Build artifacts that show *them* off.

**Actions:**
- Lean into leveling (wallet connect → level 1–10) and a player card (level, completed campaigns, trade wins) — the "look how cool I am" artifact; an Elo-style score is the explicit model Fabian suggested.
- Finish end-of-minigame Share buttons (Racing/Snake/Monster) and the on-chain leaderboard you've started.
- Surface social proof (players/runs shared, recent leaderboard).
- Design every shareable to flatter the sharer (their score, map, winning trade).

**Acceptance:** A user can share a flattering artifact (score/level/run); social proof is visible on the share surfaces and ideally the landing.

---

## Milestone 7 — Go-to-market sequencing  ⬜

**Goal:** a staged launch that doesn't burn every feature at once.

**Nuances folded in:**
- **Virality's three phases:** seed (nerds) → run → level-off. Design for all three up front.
- **Keep ammunition.** Hold features back to re-ignite interest after the first wave flattens; don't dump everything in one drop.
- **Onboarding is the gate.** Virality can't reach past the top 1% if newcomers can't get in — M1/M2 must land before the push.
- **eSports / competition angle** (the 40-player trading-competition format you described) is a future track once the funnel converts.

**Actions:**
- Seed to crypto-nerd early adopters (Solana Superteam network, your communities, the trading-competition/eSports format).
- Run phase: ride the first wave on the frozen, polished set.
- Level-off phase: release a held-back feature to re-accelerate; repeat.

**Acceptance:** A documented seed → run → level-off plan with reserved features mapped to each phase; launch gated on M1/M2 being live.

---

## Order of attack
**M1–M2** first — the unlock for everything else and mostly additive (M2 is already largely built; close the three open gaps M2-T1b/T2b/T5b). Run **M5** in parallel as a discipline. **M3, M4, M6** are the substance of the viral set. **M7** is the launch wrapper. Keep wallet / on-chain depth (Phase 2) out of the core first-run path until the funnel converts.

## Shipped so far (this workstream)
- ✅ M2-T3 "New here?" reopener (`crNewHereReopener` badge on the COACH hub → `crFirstRun.reset()`), parse-validated.
- 📋 Audit of `crFirstRun` against M2-T1…T5 → see `ChartRunner_crFirstRun_M2_Audit.md`.
- 📋 Landing review + drop-in replacement copy → see the two landing docs.
