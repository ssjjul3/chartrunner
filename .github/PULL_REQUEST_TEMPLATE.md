## What
<!-- One sentence -->

## Why
<!-- Link the problem or doc -->

## Constitutional check
- [ ] No new dependencies in the single-file HTML
- [ ] Abilities don't touch the canvas (or, if they do, this PR is in `sdk/` not the HTML)
- [ ] SDK is still the only thing issuing orders
- [ ] Topbar still ≤ 5 elements default

## Validation
- [ ] HTML parses (CI workflow is green)
- [ ] Manual playtest: Phase 0 still loads + bracket flow works
- [ ] If the change touches gameplay: tested in both Time-Is-Money and Monster Mode
