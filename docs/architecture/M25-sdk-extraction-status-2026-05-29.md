# M2.5 SDK extraction — concrete state + next-pickup spec (2026-05-29)

> **Source memo:** updates the stale `sdk-m1-scaffold/STATUS.md` (its line-number references for the inline IIFE are off by ~3,000 lines after a year of feature additions). Use this doc as the current pickup spec for M1.4 / M1.5.
> **Cascade context:** [`unblock-cascade-plan.md`](unblock-cascade-plan.md) Tier 1 🥈 — finishing M1.4 + M1.5 unblocks ~5 downstream solvables across M14 / M15 / M3.

## Where the SDK actually lives today

| Layer | Where | Status |
|---|---|---|
| **Inline class (authoritative)** | `ChartRunner_Prototype.html` **lines 11709 → 13219** (1,511 lines) | LIVE; this is what runs in production |
| **TypeScript modules (target)** | `sdk-m1-scaffold/sdk/web/core/src/` (and parallel `sdk/core/src/`) | M1.1–M1.3 done — surface catalogued, broker + detectors ported, type interfaces stubbed |
| **Build pipeline** | `sdk-m1-scaffold/sdk/web/` `npm run build` | Working — emits compiled `.js` + `.d.ts` |
| **Compiled deploy target** | `chartrunner-prototype/sdk/core/` | Gitignored until M1.4 lands |
| **Total prototype file size** | `ChartRunner_Prototype.html` 50,207 lines | The inline SDK is ~3% of the file by line count |

## What `M1.4 — replace inline IIFE` actually entails

The inline class is a single `class ChartRunnerSDK { … }` declaration at line 11709. M1.4 swaps it for an ES-module import. The plumbing needed:

1. **Build the ES-module bundle** to `chartrunner-prototype/sdk/core/index.js` from `sdk-m1-scaffold/sdk/web/core/`. Build pipeline already does this; just remove the `.gitignore` line that hides the artifact.
2. **Add the import** at the top of the prototype's script block:
   ```html
   <script type="module">
     import { ChartRunnerSDK } from "./sdk/core/index.js";
     window.ChartRunnerSDK = ChartRunnerSDK;
   </script>
   ```
3. **Delete lines 11709–13219** from `ChartRunner_Prototype.html` (the 1,511-line inline class).
4. **Verify the late assignment at line 50165** (`window.ChartRunnerSDK = ChartRunnerSDK_Foundation`) still resolves — that pattern uses `ChartRunnerSDK_Foundation`, which is presumably a base shim; check if it survives or also needs porting.

## What's NOT in the TS port yet

Per the `index.ts` export list and the comment at the top of `sdk/core/src/index.ts`, the TS modules are described as **"SKELETON ONLY — no real logic ported yet. Method bodies are TODO stubs that cite the inline source lines they graft from."**

This is the actual gap. M1.1–M1.3 catalogued the surface and stubbed types; the method bodies still need porting. M1.4 can't ship until the bodies are real, otherwise the import would replace a working SDK with a stub SDK.

**Revised M1.4 split** (the real work):

- **M1.4a — Method-body port.** Walk the 1,511-line inline class top-down; copy each method body into its TS module (`ChartRunnerSDK.ts`, `SandboxBroker.ts`, etc). Preserve the runtime behavior exactly. This is the bulk of the work — likely a full focused session.
- **M1.4b — Build + swap.** Once bodies are real, build → drop import in → delete inline class. Trivial after M1.4a.
- **M1.5 — Regression.** Static playtest: run the deployed game with the new module-based SDK, confirm no behavioral drift on bracket / ladder / OCO / hedge / radar / rescue + scoring.

## Recommended pickup for the next dev session

Start with one method: **`bracket`** (the simplest ability + the one M15 also wants to port first per its imminent-solvables). Lift `bracket(...)` from the inline class into `sdk/core/src/ChartRunnerSDK.ts`, leave a `__INLINE_BRACKET_REMOVED__` marker comment at the old site, run the existing test harness if any. If green, repeat for `ladder` / `OCO` / `hedge` / `radar` / `rescue`.

This gives a clean per-method commit cadence (`m1.4a: port bracket`, `m1.4a: port ladder`, …) and surfaces drift early instead of attempting a 1,511-line atomic swap.

## What downstream gets when M1.4+M1.5 ship

- **M14** — `window.ChartRunner.sdk = ChartRunnerSDK` works without referencing the inline class. Bot Terminal can wire to it cleanly.
- **M14** — SDK call log instrumentation is straightforward in a module (wrap each method with a logger); near-impossible inside a 1,511-line inline class.
- **M15** — `src/core/chart-engine.js` + `game-overlay.js` + `game-world.js` slot alongside `sdk/core/`. The file structure becomes coherent.
- **M3** — Workbench tabs (Strategies / Indicators / Backtest / Bots) can `import { ... } from "../sdk/core/..."` instead of relying on globals.

## What's needed from Julian

- Sign-off on the per-method commit cadence vs. an atomic 1,511-line swap (recommend per-method).
- Sign-off on starting with `bracket`.
- Confirm the existing test/regression harness in `sdk-m1-scaffold/` is the right thing to run, or if a smoke-test script needs writing first.

## Cross-references

- `sdk-m1-scaffold/STATUS.md` — original status doc (line numbers stale, replace references with this doc)
- `sdk-m1-scaffold/MOVE.md` — folder rename plan (post-M1.5)
- `docs/architecture/M25-bundler-decision.md` — inline-bundler decision the index.ts comment references
- `docs/architecture/M25-sdk-surface.md` — public API surface inventory
- `docs/milestones/M2.5-sdk-extraction.md` — the milestone itself (8 blocked items will mostly become Ready bucket once M1.4a is in flight)
