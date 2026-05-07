# ⚠️ DEFUNCT — `sdk-m1-scaffold/`

> **Stop reading code in this folder.** It is the abandoned target of an older
> M1 SDK extraction plan ("inline IIFE → `<script type="module">` import").
> A drift audit on 2026-05-07 surfaced a structural problem: the prototype's
> 23 000+ lines of synchronous JS below the inline class can't safely become
> async-module clients without a full HTML rewrite. The plan was redirected.

## What replaced it

Phase 1 (post-Frontier-hackathon) reorganises the SDK around an **inline
bundler** instead of a runtime module swap:

```
packages/core/src/*.ts        ← single source of truth (TypeScript)
        │
        ▼  esbuild + IIFE wrap (tools/inline-bundler/)
        │
apps/game/index.html          ← gets the bundled code spliced in at a sentinel
```

This preserves the prototype's synchronous execution model (and `file://`
portability) while giving us a real npm-publishable `@chartrunner/core` for
Phase-1 host overlays (Dexscreener / TradingView).

## What's safe to read here

These are useful reference material, not active code:

- `STATUS.md` — historical record of the M1.1–M1.3 milestones
- `MOVE.md` — original migration plan (now superseded)
- `sdk/web/core/src/ChartRunnerSDK.ts` — partial port (1530 lines, 48/48 method
  parity with inline class but missing 3 external-global wrappers; will be the
  starting point for `packages/core/src/`)
- `sdk/web/core/src/{ChartHost,AbilityRegistry,BrokerAdapter,RiskManager,
  SignalFeed}.ts` — interface stubs that DO carry over to `packages/core/`

## What's NOT to read here

- `sdk.service`, `sdk.timer` — were meant for a systemd-based dev loop that
  was never wired up. Ignore.
- `sdk/web/overlay/`, `sdk/web/adapters/` — empty / stubbed; the post-hackathon
  reorg supersedes them with proper `packages/adapter-*/` packages.

## Action items (post-Frontier-hackathon)

1. Build `tools/inline-bundler/` (~80 LoC esbuild script, IIFE-wrap + sentinel
   replace).
2. Move `sdk/web/core/src/*.ts` → `packages/core/src/`. Resolve the three
   external-global gaps (`INDICATOR_STATE`, `_computeRSI`, `wallet`).
3. Repoint `apps/game/index.html` (formerly `ChartRunner_Prototype.html`) at
   the inline-bundler output.
4. Archive this folder under `_archive/scaffold/`.

Tracked as TODO #48 / #49 in the project task list.
