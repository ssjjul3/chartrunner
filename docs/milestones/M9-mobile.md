# M9 — Solana Mobile / React Native

**Status:** 🔵 QUEUED
**Theme:** iOS + Android build via the Phantom React Native template + Solana Mobile / Saga integration. Touch-native chart interactions.

## Completion condition (all required)

- [ ] React Native app scaffold (Expo or bare RN) imports `@chartrunner/core` (depends on M2.5)
- [ ] Phantom RN integration: connect, sign, transact
- [ ] Solana Mobile Saga SDK integration: the dApp Store listing path
- [ ] Touch-native chart interactions: pinch zoom, pan, tap-to-arm-laser, drag-to-bracket
- [ ] iOS TestFlight build
- [ ] Android internal testing track
- [ ] Touch-native Coach widget (no kbd shortcuts; everything reachable by tap)

## Imminent-solvables

### Ready bucket

> **All 4 Ready-bucket items done 2026-05-20** (auto-resolve sweep). Correction: the audit found the prototype has **zero** touch handlers — mobile is a real port, not a tweak.

- [x] 2026-05-20 — `[D]` Phantom RN walkthrough — `docs/architecture/M9-phantom-rn.md`. Recommends `@phantom/react-native-sdk` via `create-solana-dapp --template phantom-embedded-react-native`; integration is shell-level (2 call sites); Expo Go is a dead end (needs a custom dev build).
- [x] 2026-05-20 — `[D]` Saga / Solana Mobile research — `docs/architecture/M9-saga.md`. MWA (Android-only, wallet-agnostic), Seed Vault (free hardware custody), dApp Store 3-NFT model (~0.2 SOL + Arweave).
- [x] 2026-05-20 — `[D]` Touch interaction design — `docs/architecture/M9-touch-design.md`. Full mapping: hotkeys 1/2/3/4 → bottom action bar; tap = click; one-finger drag = mouse drag; pinch/two-finger pan = wheel-zoom/pan; hold-chords → long-press (timers port verbatim).
- [x] 2026-05-20 — `[O]` Touch-handling audit — `docs/architecture/M9-touch-handling-audit.md`. **Zero touch handlers confirmed** (grep). Only the primitives-menu drag uses Pointer Events (L15617+); chart is mouse-only (L35705+), gameplay keyboard-only (L12226+).

### Blocked bucket

- [ ] `[D]` RN scaffold — **BLOCKED:** template walkthrough done + M2.5 `@chartrunner/core` published.
- [ ] `[D]` Chart canvas ported to RN view — **BLOCKED:** scaffold.
- [ ] `[D]` Phantom RN integration — **BLOCKED:** scaffold.
- [ ] `[D]` Touch interaction layer — **BLOCKED:** design done + chart canvas ported.
- [ ] `[D]` iOS TestFlight build — **BLOCKED:** integration tested.
- [ ] `[D]` Android internal track — **BLOCKED:** iOS proven.
- [ ] `[D]` Saga dApp Store submission — **BLOCKED:** Android build passing.
- [ ] `[O]` Cross-platform regression suite — **BLOCKED:** builds live.

### Done bucket

(none yet)

## State

- Progress: 4/12 done — all 4 Ready-bucket items written 2026-05-20. Remaining 8 are the Blocked-bucket RN build chain (scaffold → canvas port → Phantom → touch layer → iOS → Android → dApp Store → regression), gated on M2.5 `@chartrunner/core` publish.
- Blockers active: 8
- Scheduled today: 0

## Notes

- Hard dependency on M2.5 (SDK package must exist before RN can import it).
- The 46k-line single-file `ChartRunner_Prototype.html` is the web target; RN gets a thinner shell that consumes the SDK + renders chart via react-native-canvas or Skia.
- Memecoin season trained the audience on Phantom mobile — distribution is ready.

### Ecosystem scan 2026-05-14
- **Phantom RN starter (current canonical path):** `npx create-solana-dapp@latest <name> --template phantom-embedded-react-native`. Requires Expo custom dev build — will NOT work with Expo Go (native modules). Use this as the scaffold for the M9-phantom-rn.md walkthrough.
- **Phantom Connect SDKs** (React, RN, Browser, Server) all support Google/Apple social login + 7-day sessions. EVM chain support for embedded wallets confirmed "later in 2026" — keep an eye on this before M9 ships if multi-chain on mobile becomes a story.
Source: `docs/SOLANA-ECOSYSTEM-DAILY.md#2026-05-14`.
