# ChartRunner — Milestone 1 & 2 Implementation Tickets

Target file: `ChartRunner_Prototype.html` (single file, vanilla JS, no build).
Hard rules in play: single file · framework-free · topbar ≤ 5 elements · abilities never touch rendering · smallest diff.
North star to protect: *first-time player places a first bracket in < 60s, no docs.*

**Reusable building blocks already in the code (use these, don't reinvent):**
- `#crConfirmBackdrop` + `.crConfirmCard / .crConfirmTitle / .crConfirmBody / .crConfirmActions / .crConfirmBtn(.primary/.danger) / .crConfirmInput` — theme-aware modal chrome (v1.0.432). The welcome modal should reuse this so it inherits all themes (ascii/frontier/bw/mono/solana) for free.
- `#crBoot` — the archived boot/login screen. Its DOM was moved to `_patches/login-archive-2026-06-19/crBoot-login-modal.html`; the app now auto-enters as guest. The 8 `getElementById('crBoot')` hooks and the z-index layer (≈100000) still exist — this is the natural mount point/precedent for a first-run modal.
- `#crCoachHub` / `#crCoachHubBtn` — the persistent desktop COACH invader (the teacher mascot), bottom-right, with an existing welcome bubble + Tutorial/Chat actions. `.cr-hub-off` hides it during the guided tutorial.
- `#splash` / `body.crSplashUp` — the desktop surface and its visibility flag.
- Guided tutorial overlay + narrator already exist (two-phase desktop tutorial).

> Note on line numbers: the file is ~2200+ lines and versioned in-place. Tickets reference **ids/classes**, not line numbers — locate with `Grep` before editing, per the skill workflow. Validate with `node --check` on the extracted `<script>` and run the playtest-bot subagent after any splash/modal/tutorial change.

---

## Milestone 1 — Nail the one-screen mental model

### M1-T1 — Desktop masthead: say what this is before any click
**Problem:** On load the desktop (`#splash`) shows app icons + the COACH invader but no plain-language statement of what ChartRunner is. Fabian's 200ms test failed here.
**Change:**
- Add a lightweight masthead element inside `#splash` (above/around the app-icon grid): one headline + one sub-line, e.g. *"Learn to read charts by playing them — free, in your browser."*
- Style with existing theme vars (`--cd-*` / theme tokens), no new fonts/assets (hard rule #5).
- Must not consume a topbar slot (topbar discipline). It lives on the desktop body, hidden via `body.crSplashUp`/`body.cr-in-run` once a run starts (mirror the `#crCoachHub` hide rule).
**Acceptance:** First paint communicates "game that teaches chart reading" without clicking; disappears in-run; renders correctly in all themes.
**Effort:** S. **Depends on:** none.

### M1-T2 — Relabel / annotate the opaque app icons (Terminal, Token)
**Problem:** `Play / Terminal / Profile / Token` mean nothing cold. "Terminal" and "Token" were called out explicitly.
**Change:**
- Add a one-word affordance under each icon label (e.g. Terminal → "Terminal · research desk", Token → "Token · scanner") or a hover/tap tooltip. Keep "Play" primary and visually dominant.
- Do **not** rename internal ids (`Terminal`, `Token` ids are referenced widely) — change the *display label* only.
- Consider demoting connect-exclusive/empty apps for guests (Maps/Journal are already hidden for guests — extend that pattern so a cold guest sees the smallest meaningful icon set).
**Acceptance:** A first-timer can guess what each visible icon does; no internal id renamed; guest icon set is minimal.
**Effort:** S. **Depends on:** none.

### M1-T3 — Entry-point chooser in the COACH welcome
**Problem:** No moment that asks the user what they want (Fabian: *"Demo portfolio? TA? Both? Want me to explain it or explore yourself?"*).
**Change:**
- Extend the `#crCoachHub` welcome bubble (and the M2 modal) with 2–3 intent buttons that route into existing flows: **"Teach me" → guided tutorial**, **"Let me explore" → dismiss to desktop**, **"Just let me play" → Play/Start Run**.
- Reuse `.crConfirmBtn` styling; wire buttons to the existing tutorial-start and Play handlers (no new gameplay).
**Acceptance:** From a cold load, two clicks reach either the tutorial or a run; choice is explicit, not guessed.
**Effort:** M. **Depends on:** M2-T1 (shares the modal), M1-T4 reuses copy.

### M1-T4 — LLM UX-tester as a standing QA gate (process/dev-kit)
**Problem:** No repeatable check that the cold-start screen reads correctly.
**Change:**
- Add a short runbook in `dev-kit/` (not in the game file): clear cookies/localStorage → load `/play/` → prime Claude-in-Chrome as a UX tester → ask only *"what is this and what would you click next?"* (never feed the answer). Record pass/fail before each release.
- Optional: a tiny dev-only `?uxtest=1` flag that force-clears the first-run localStorage key so the cold state is reproducible.
**Acceptance:** Runbook exists; the `?uxtest=1` reset works; run it as part of the M5 feature-freeze checklist.
**Effort:** S. **Depends on:** M2-T1 (the localStorage key it resets).

---

## Milestone 2 — Cookie-gated onboarding modal

### M2-T1 — First-run welcome modal (localStorage-gated) over a dimmed desktop
**Problem:** New visitors land straight on the "alien planet" with no guided choice; the old `#crBoot` gate was archived and nothing replaced it.
**Change:**
- Build a first-run modal on the `#crConfirmBackdrop` chrome (reuse card/title/body/actions classes so it's theme-aware automatically). Mount at the `#crBoot` layer precedent (z above desktop, below in-run HUD).
- Gate on a localStorage key, e.g. `cr_onboarded_v1`. Show only when the key is absent **and** the user did not arrive via a direct room/invite link (see M2-T4).
- Background visible but non-interactive while open (this is the canonical modal behavior Fabian described); ESC / backdrop / "Explore yourself" dismiss it.
- Primary action "Start tutorial", secondary "Explore yourself", plus a "Don't show this again" checkbox that writes the key.
**Acceptance:** First load shows the modal once; reload after dismissal does not re-show; works in every theme; never blocks an invite-link entry.
**Effort:** M. **Depends on:** none (foundation for M1-T3, M2-T2/T3/T5).

### M2-T2 — Introduce the two mascots in the modal
**Problem:** The teacher (COACH invader) and the player (green runner) are never introduced; the runner's role is ambiguous.
**Change:**
- In the M2-T1 modal, render both sprites with one line each: COACH = "your teacher", Runner = "you". Reuse the existing `#crCoachHubBtn` canvas sprite draw + the runner sprite already drawn on the desktop (no new art — hard rule #5).
- Decide and commit: the runner is the recurring player mascot. Document the teacher/player split in the README feature list.
**Acceptance:** A new user can name who teaches and who they control after seeing the modal; no new image assets added.
**Effort:** S. **Depends on:** M2-T1.

### M2-T3 — Persistent "New here? / About" reopener
**Problem:** Users who dismiss the modal (often reflexively) can never get the intro back.
**Change:**
- Add a small always-visible "New here?" affordance on the desktop, off to the side (not in the ≤5-slot topbar). It re-opens the M2-T1 modal regardless of the localStorage key.
- The existing `#crCoachHub` invader can double as this entry — if so, add a tiny "?" badge so its purpose is discoverable rather than relying on users knowing to click the alien.
**Acceptance:** From any state (cookie set or not), the intro is reachable in one click; topbar slot count unchanged.
**Effort:** S. **Depends on:** M2-T1.

### M2-T4 — Respect invite-link / direct-room entry
**Problem:** Someone arriving via a shared room link should drop straight into the room, not hit an onboarding wall.
**Change:**
- Detect room/invite params (the rooms layer already exists — `#crRoomsBackdrop`, `window.crSocial`; locate the room-join query/hash parser). If present, suppress the M2-T1 modal and set `cr_onboarded_v1` implicitly.
**Acceptance:** A room invite link bypasses the modal and lands in the room; a plain visit still shows it.
**Effort:** S. **Depends on:** M2-T1.

### M2-T5 — "Don't show again" → confirmation that points to the reopener
**Problem:** Dismissing should reassure, not strand (Fabian's canonical pattern).
**Change:**
- When the user checks "Don't show again" / dismisses, show a one-line `crConfirm` toast: *"Got it — won't show this again. Find it any time under 'New here?'."* Then write `cr_onboarded_v1`.
**Acceptance:** Dismissal writes the key and tells the user where the reopener lives; never appears again automatically.
**Effort:** S. **Depends on:** M2-T1, M2-T3.

---

## Suggested sequence & sizing
1. **M2-T1** (modal foundation) → 2. **M2-T2/T3/T4/T5** (round out onboarding) → 3. **M1-T1/T2** (cold-desktop clarity, independent) → 4. **M1-T3** (intent chooser, ties modal to flows) → 5. **M1-T4** (lock the UX-test gate into the M5 freeze checklist).

All of it is **additive** — no existing feature is removed (matches Fabian's "I don't want you to break anything you have"). Every ticket touching the splash/modal/tutorial must pass `node --check` and the playtest-bot trace before merge.
