# Audit — `crFirstRun` vs Milestone 2 acceptance criteria

Audited the existing first-run funnel `window.crFirstRun` (defined ~line 84869, CSS ~line 2457) in `ChartRunner_Prototype.html` against the M2-T1…T5 acceptance criteria from `ChartRunner_M1-M2_Tickets.md`. Read-only — no edits made.

**What crFirstRun is:** a data-driven, 13-step guided spotlight tour. On a cold desktop it auto-launches once, dims the screen with a spotlight mask (`#crFrMask`), points a ring + beacon + bouncing arrow at each desktop app icon, and narrates each in a COACH.llm bubble (`#crFrPop`) with Back / Next / ✕-skip. State is `localStorage['cr_onboarding_v1']` = `{idx, done, skipped, ts}`. It resumes mid-tour across sessions and hands off into a run on the final step. Exposes `{start, reset, next, skip}`.

## Scorecard

| Criterion | Verdict |
|---|---|
| M2-T1 — gated modal over a dimmed desktop | ⚠️ Partial |
| M2-T2 — introduce the two mascots | ⚠️ Partial |
| M2-T3 — persistent "New here?" reopener | ❌ Gap |
| M2-T4 — respect invite / deep-link entry | ✅ Pass (implicit) |
| M2-T5 — "don't show again" → confirmation pointing to reopener | ⚠️ Partial |

---

## M2-T1 — first-run gated modal over a dimmed desktop — ⚠️ Partial

What passes:
- **localStorage-gated, shows once.** `boot()` and `start(false)` both return if `load().done` (lines 84971, 84981). ✅
- **Resumes across sessions.** `idx` is persisted (`persist()`, 84960) and `start()` resumes from `o.idx` (84975). ✅ (Exceeds the ticket.)
- **Dimmed desktop + on-brand chrome.** `#crFrMask` spotlight + the exact COACH.llm bubble chrome (`.cr-tut-terminal-bubble .crCoachWin`). ✅

Two real divergences:
- **The background is NOT non-interactive.** `#crFrMask` is `pointer-events:none` (line 2457), so the dim is purely visual — every desktop icon stays clickable behind the tour. Only the *last* step (`gateClick:true`) listens for a click, and only on the Play icon (84924-84928). The ticket called for "background visible but non-interactive while open." Today a user on step 2 can click Terminal and open it on top of the tour. Acceptable for a click-through spotlight style, but it is a divergence and it lets users wander out of the funnel.
- **It auto-launches the tour unprompted** rather than first asking. This is the one Fabian explicitly warned against: *"nicht ungefragt mit irgendeinem Tutorial loslegen, sondern erst … möchtest du [das Tutorial] oder möchtest du selbst erkunden?"* The current flow dims the screen and starts pointing immediately. It's skippable (✕ / SKIP), which softens it, but it is not the "ask first, then tour" modal the canonical pattern (and the investor) call for.

## M2-T2 — introduce the two mascots — ⚠️ Partial

- **Teacher: ✅.** The whole popup is COACH.llm — invader sprite + "COACH.llm" header, and step 0 opens *"I'm COACH.llm."* (84882, 84912-84913).
- **Player/runner: ❌.** No step introduces the little runner avatar as "you." Step 0 says *"ChartRunnerOS is a chart you can run on"* but never names the runner mascot or the teacher/player split. The ticket wanted both introduced.

## M2-T3 — persistent "New here? / About" reopener — ❌ Gap

- There is **no visible reopener** anywhere. `window.crFirstRun.start()/reset()` exist but only for "replay / testing" via console (84979). A user who skips (or finishes) has no UI path back to the tour.
- The persistent COACH hub invader (`#crCoachHub`) is the obvious host — it's already always-on-desktop — but crFirstRun doesn't wire anything to it. Clear miss.

## M2-T4 — respect invite / deep-link entry — ✅ Pass (implicit)

- Effectively satisfied: `boot()` polls and `start()` bails unless `onDesktop()` is true (splash visible) **and** `.os-icon[data-prog]` exists (84972, 84984). Deep-link invitees (`?room`/`?sharedMap`/`#m=`) and minigame links (`?mg=`) land in-game with the splash hidden, so `onDesktop()` is false and the tour never fires.
- Caveats: it's **implicit**, not an explicit deep-link guard. It leans on (a) the splash being hidden before the 500ms poll catches a desktop flash, and (b) the deep-link boot cover doing its job. Also, unlike the ticket's "set `done` implicitly," crFirstRun does **not** mark done on a deep-link entry — so an invitee who later opens the bare desktop gets the tour then. That's arguably better UX, just different from the spec.

## M2-T5 — "don't show again" → confirmation pointing to reopener — ⚠️ Partial

- **Won't re-show: ✅.** `finish(skipped)` sets `o.done=true` on both skip and complete (84965).
- **No reassuring confirmation: ❌.** Skip just toasts *"Tour skipped"* (84966); it doesn't tell the user how to get the tour back — and it can't, because the reopener (M2-T3) doesn't exist.

---

## Other observations
- **z-index is safe.** `#crFrMask` (2147483400) and `#crFrPop` (2147483500) sit above the deep-link cover (100060) and crConfirm (100050), so the funnel can never render invisibly behind the boot cover. (This is the trap the earlier duplicate modal had — crFirstRun avoids it.)
- **No keyboard support.** No Esc-to-skip and no ←/→ step nav; navigation is mouse-only (Back/Next/✕). Minor a11y gap; the in-game tutorial does bind Esc, so it's inconsistent.
- **Mid-tour resume can surprise.** If a user navigates away mid-tour without skipping, `done` is never set, so a later desktop visit re-dims and resumes the tour. Consider marking `done` after N dismissals or a TTL.

---

## Suggested follow-up tickets

**M2-T3 (do first — highest leverage):** wire a persistent reopener. Add a small "New here?" affordance to the existing `#crCoachHub` invader (e.g. a "?" badge) that calls `window.crFirstRun.reset()`. Unblocks M2-T5 too. *(S)*

**M2-T1b — ask before launching.** Gate the auto-launch behind a single COACH choice modal: *"New here? Take the 60-second tour, or explore on your own."* Launch the spotlight tour only on accept; on "explore," set `done` and drop the user onto the desktop. Directly addresses Fabian's "don't start a tutorial unprompted." *(M)*

**M2-T2b — introduce the runner.** Add one step (or extend step 0) that names the two mascots: COACH = your teacher, the runner = you. Reuse the runner sprite already drawn on the desktop. *(S)*

**M2-T5b — reassure on skip.** On skip/finish, toast or confirm: *"Tour hidden — find it again under COACH → New here."* (Depends on M2-T3.) *(S)*

**M2-T4b — explicit deep-link guard (hardening, optional).** Add a URL check in `boot()`/`start()` mirroring the room/`?mg=`/`#m=` patterns, so a slow invite load that briefly flashes the desktop can't trigger the tour. *(S)*

**Minor — keyboard.** Esc → skip, ←/→ → Back/Next, to match the in-game tutorial. *(S)*

### Net
crFirstRun is a solid, more ambitious implementation than the ticket envisioned (full spotlight tour + cross-session resume), and it nails the gating and deep-link safety. The meaningful gaps are all about **user control**: it imposes the tour instead of offering it (M2-T1b), never gives the runner a face (M2-T2b), and provides no way back in (M2-T3 / M2-T5b). Those three are what stand between it and the canonical onboarding pattern Fabian described.
