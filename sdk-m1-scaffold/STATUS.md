# SDK · Status

> **TL;DR:** Phase 1 SDK extraction is *in flight*. The canonical `ChartRunnerSDK` still lives inline in [`ChartRunner_Prototype.html`](../ChartRunner_Prototype.html) at **lines 11709-13219** (1,511 lines — line numbers updated 2026-05-29, see [`docs/architecture/M25-sdk-extraction-status-2026-05-29.md`](../docs/architecture/M25-sdk-extraction-status-2026-05-29.md) for the full pickup spec). This folder is the lift-and-shift target.

> **Per-method porting in flight (M1.4a, started 2026-05-29):**
>
> **Round 1 — `bracket()` solo:** ported from HTML line 11830 → [`sdk/core/src/ChartRunnerSDK.ts`](sdk/core/src/ChartRunnerSDK.ts). 24/24 regression checks pass via [`sdk/core/tests/bracket.test.mjs`](sdk/core/tests/bracket.test.mjs). Build clean (10.5 KB ESM via esbuild, ~11ms).
>
> **Round 2 — 12 abilities batch:** all bracket-pattern small methods identified by a CLEAN-vs-host-globals scan. Ported as one focused batch:
> - **Core abilities (+2):** `ladder` (HTML 11805), `oco` (11846) — 2 of the 6 milestone-named core abilities now done. Remaining: `hedgeParachute`, `liquidityRadar`, `rescueDrone`.
> - **Bracket family (+3):** `inverseBracket` (11869), `ocoBracket` (12143), `fibLadder` (11818) — composites + variants of bracket/ladder.
> - **Tier 1 basics (+4):** `market` (11998), `limit` (12012), `stopLoss` (12025), `takeProfit` (12041) — the missing primitives v0.9.8 added.
> - **Management (+3):** `trailStop` (11856), `cancelOrder` (13196), `editOrder` (13203) — order-lifecycle controls.
>
> 70/70 checks pass via [`sdk/core/tests/abilities.test.mjs`](sdk/core/tests/abilities.test.mjs). Build clean (15.8 KB ESM, ~13ms). `tsc --noEmit` clean.
>
> **Round 3 — core ability finishers + 2 support methods:**
> - **Core abilities (+3) — completes the 6 milestone-named set:** `hedgeParachute` (HTML 11927), `liquidityRadar` (11959), `rescueDrone` (11988). Each has two paths (standalone vs TV-host mode); both paths covered.
> - **Support methods (+2):** `closeAll` (11891), `toggleIndicator` (11915). Required because `rescueDrone` calls `closeAll()` and `liquidityRadar`'s TV-alias calls `toggleIndicator`.
>
> 53/53 checks pass via [`sdk/core/tests/round3.test.mjs`](sdk/core/tests/round3.test.mjs). Includes a globalThis-INDICATOR_STATE-stub test that validates the host-toggle path works when the host exposes the global. Build clean (19.5 KB ESM, ~11ms).
>
> **Progress: 18 of ~35 public methods ported (~51%).**
> All 6 milestone-named core abilities (bracket / ladder / oco / hedgeParachute / liquidityRadar / rescueDrone) ✅
>
> **Total regression coverage: 147 checks across 3 suites** (bracket 24 + abilities 70 + round3 53). Run all via `npm test`.
>
> **Next rounds (per-method commit cadence continues):**
> - Tier 2 pro primitives: `scaleOut` (has setTimeout — needs slight adaptation), `iceberg`, `twap`, `trailingTakeProfit`, `ifThen`.
> - Tier 3 Solana plays: `fundingSnipe`, `borrowShort`, `liquidationGuard`, `copyTrade`, `perpFlip`.
> - Tier 4 composites: `comboTrade`, `autoFib`, `magnet`.
> - Big targets last: `tick()` (131L — the per-frame engine), `scoreSetup` (282L — composite of detectors), `setHostMode` (6L — needs HostMode + ChartHost wiring).

## Why this folder exists

The `ChartRunnerSDK` started as a 1500-line inline IIFE inside the prototype HTML. Phase 1 — making the SDK independently consumable so it can be dropped onto Dexscreener / TradingView as a host overlay — requires lifting that surface into TypeScript modules with explicit interfaces (`ChartHost`, `AbilityRegistry`, `BrokerAdapter`, `RiskManager`, `SignalFeed`).

This folder holds the in-progress extraction: each former IIFE chunk is now a TypeScript module under [`sdk/web/core/`](sdk/web/core/) (after `npm run build` populates [`chartrunner-prototype/sdk/core/`](../chartrunner-prototype/sdk/core/) with the compiled `.js` + `.d.ts`).

## What's done (M1.1 → M1.3)

- `ChartRunnerSDK` surface catalogued
- Order-issuing methods ported into `SandboxBroker.ts`
- Setup detectors ported into `core/src/detectors.ts`
- Type interfaces stubbed (`ChartHost.d.ts`, `AbilityRegistry.d.ts`, `BrokerAdapter.d.ts`, `RiskManager.d.ts`, `SignalFeed.d.ts`)
- Build pipeline working — `npm run build` emits to the deployed prototype's `sdk/core/` folder

## What's pending (M1.4 → M1.5)

- **M1.4** — Replace the inline IIFE in `ChartRunner_Prototype.html` with `import { ChartRunnerSDK } from "./sdk/core/index.js"`. Single source of truth.
- **M1.5** — Static playtest regression after M1.4 to confirm no behavioral drift.

Once M1.4 lands, the gitignore line for `chartrunner-prototype/sdk/` comes off and the compiled SDK ships with the deploy.

## Folder rename

This will be renamed to plain `sdk/` (top-level) after M1.5 is green. The "scaffold" suffix is a deliberate signal that the structure isn't frozen yet.

## How to inspect

- Live SDK *interfaces* (TypeScript): [`sdk/web/core/src/`](sdk/web/core/src/)
- Built artifacts (committed for serving): would land at [`../chartrunner-prototype/sdk/core/`](../chartrunner-prototype/sdk/core/) (currently gitignored until M1.4 ships)
- Canonical inline implementation (still authoritative): [`../ChartRunner_Prototype.html`](../ChartRunner_Prototype.html), search for `// ChartRunnerSDK` (around line 8438)
