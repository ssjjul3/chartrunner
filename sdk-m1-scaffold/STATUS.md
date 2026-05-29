# SDK · Status

> **TL;DR:** Phase 1 SDK extraction is *in flight*. The canonical `ChartRunnerSDK` still lives inline in [`ChartRunner_Prototype.html`](../ChartRunner_Prototype.html) at **lines 11709-13219** (1,511 lines — line numbers updated 2026-05-29, see [`docs/architecture/M25-sdk-extraction-status-2026-05-29.md`](../docs/architecture/M25-sdk-extraction-status-2026-05-29.md) for the full pickup spec). This folder is the lift-and-shift target.

> **Per-method porting in flight (M1.4a, started 2026-05-29):**
> - ✅ `bracket()` — ported from HTML line 11830 → [`sdk/core/src/ChartRunnerSDK.ts`](sdk/core/src/ChartRunnerSDK.ts), 24/24 regression checks pass via [`sdk/core/tests/bracket.test.mjs`](sdk/core/tests/bracket.test.mjs). Build clean (10.5 KB ESM via esbuild, ~11ms).
> - ⏳ `ladder` / `oco` / `hedgeParachute` / `liquidityRadar` / `rescueDrone` — next per-method ports. Follow the bracket pattern (lift body verbatim into TS, add regression test, keep behavior identical).

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
