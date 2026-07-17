# ChartRunnerOS — reinforce the existing themes (not a new one), 2026-07-17

Corrected scope: **no new theme.** `data-os-theme` already ships **ascii / solana /
mono / liquid / bw / frontier / platinum**, and `liquid` is the Liquid Glass theme
(122 rule blocks). This is a reinforcement pass on the *existing* liquid theme +
shared OS functionality, informed by the macos27.kimi.page teardown.

Deliverable: `liquid-theme-reinforcement.css` — keyed to the real selectors
(`[data-theme="liquid"] .os-menubar/.os-window/#crCoachOverlay`), so Fable 5 merges
it into the existing rules. Staged, not wired.

## The existing liquid theme is already solid — don't restyle it
Verified in `ChartRunner_Prototype.html` (**v1.0.646**): the liquid theme already has
the specular top-edge (`inset 0 1px 0 rgba(255,255,255,.82)`), glass tokens
(`--lg-glass .42/.64`, `--lg-line`, `--lg-shadow`), `blur(24–28px) saturate(1.38–1.45)`,
soft depth shadows, and a radial-gradient desktop. macos27 confirms this is the right
recipe — so the pass is **consistency + one fix**, not a redesign.

## Three reinforcements (all in-place, reversible, zero redesign)
1. **Consistency — tokenize the blur.** Today blur/saturate are hardcoded per rule
   (24/1.38 on menubar, 28/1.45 on window, plus stray `blur(22px) saturate(1.35)!important`
   elsewhere — 69 `backdrop-filter` sites, ~25 with `!important`). The patch adds a
   `--lg-blur-*` scale *inside* the liquid token block set to the **current values**
   (→ zero visual change) and points menubar/window at it. Result: one source of truth,
   `!important` sprawl removed, the theme toggle can retune glass in one place.
2. **Functionality fix — the COACH.llm "teleport."** Its entrance is a flat 8px fade
   (`crCoachIn .25s ease-out`) while the rest of the theme is polished. Reinforced to a
   small spatial scale-in on the iOS curve (`crCoachInLiquid`, .34s, scale .965→1),
   scoped to `[data-theme="liquid"]` only. Same panel/tokens — it settles instead of snapping.
3. **Feel + a11y.** A light tactile press (`.os-press`, scale .96 on `:active`) to reinforce
   menubar/dock/window-button interaction, and a `prefers-reduced-motion` guard so none of
   it animates for users who opt out.

## Apply (Fable 5)
- Merge blur tokens into the existing `[data-theme="liquid"]{…}` block; replace the two
  hardcoded `backdrop-filter` values on `.os-menubar` / `.os-window` with the token form.
- Replace `#crCoachOverlay`'s `animation: crCoachIn …` with `crCoachInLiquid` under the liquid theme.
- Map `.os-press` onto the existing menubar-item / dock-icon / window-button classes during merge.
- Sibling themes (solana/frontier also use glass): if they drift on blur values, point them at
  the same `--lg-blur-*` scale for cross-theme consistency. ascii/mono/bw/platinum are non-glass — leave them.

## Guardrails
Canvas stays pure (HUD/OS only) · reduced-motion safe · no new theme, no restyle · the
blur tokens equal current values so there's **no visual regression** to review — only the
COACH entrance is an intentional, scoped change.
