# ChartRunner v0.9.8 — Repo Audit + Gap Analysis

One-page snapshot of where the codebase actually is vs what the docs / deck / SDK claim. Findings are grouped by severity and the "needs to be built" list is concrete.

## TL;DR — Health Snapshot

| Surface | State |
|---|---|
| Game runtime (single HTML) | ✅ Stable. ~25k LOC, parses clean, no live JS errors. |
| Solana adapter (`/solana-connect/`) | ✅ Builds clean (after v0.9.8d bigint fix). 5 modes, real signed devnet txs. |
| Anchor programs | 🟡 Code-complete, **never deployed**. All Program IDs are placeholders. |
| Marketplace UI | ✅ 6 categories, on-chain Buy flow wired through wallet popup. |
| Multiplayer leaderboard | ✅ Polling RPC every 60s, **empty until first run anchored on-chain**. |
| Docs | 🟡 Stuck at v0.9.1–v0.9.7 across 8+ files. Mass version-bump needed. |
| Phone OS overlay | 🟡 Documented as referencing 3 retired apps (Coach / Intel / Magnez). |

---

## 🔴 Real Breakages (fix first)

1. **`placeBracket` call doesn't exist** — `ChartRunner_Prototype.html:23640-23644` calls `sdk.placeBracket(...)` from a Bot Terminal handler, but the SDK class only has `bracket()`. Silent dead branch (the `if(sdk.placeBracket)` guard hides it). **Fix:** rename to `sdk.bracket()`.
2. **SDK panel docstring lies** — Lines `5045-5053` teach `sdk.placeBracket / sdk.radarScan / sdk.rescue` and event names `'order:filled' / 'position:closed'` — none exist. **Fix:** rewrite snippet against real surface (`bracket / liquidityRadar / rescueDrone` + `'fill' / 'bracketClose'`).
3. **CI vs Pages contradict each other** — `.github/workflows/ci.yml:36-42` checks `chartrunner-prototype/index.html` byte-matches `ChartRunner_Prototype.html` (the game). `pages.yml:46` says they MUST differ (one is landing, the other is game). **Fix:** drop the CI diff step.
4. **Landing-folder README claims it's the game** — `chartrunner-prototype/README.md:1-5` calls itself "Playable Prototype" and says open `index.html` to play. That `index.html` is the landing page. **Fix:** rewrite README to describe the deploy folder.
5. **Solana-connect footer has placeholder** — `App.tsx:844` literally renders `github.com/<you>/chartrunner` with `&lt;you&gt;` and `href="https://github.com/"` (root). **Fix:** patch to `ssjjul3/chartrunner`.
6. **Anchor workspace builds the wrong program** — `anchor/Cargo.toml` workspace still includes `chartrunner-maps`. The new `chartrunner_registry` is the canonical one. **Fix:** drop `chartrunner-maps` from members or document the dual-build intent.

---

## 🟡 Stale Docs (single mechanical sweep clears them)

Docs claiming v0.9.7 / v0.9.5 / v0.9.1 / v0.5 against actual **v0.9.8**:

- `README.md` badge + section headers (3 spots) — say v0.9.7
- `docs/MVP.md:5, 134` — "shipped as v0.9.7"
- `docs/EXECUTION-CHECKLIST.md:7` — "Shipped as v0.9.1"
- `docs/REPO-STRUCTURE.md:3, 162` — "Today's repo (v0.9.1)"
- `chartrunner-skill/SKILL.md` — `version: 0.5.0`, says HTML is "~2200 lines" (actually 26,700)
- `skills/solana/SKILL.md` — describes solana-connect as "tiny ~300 line app" (actually ~850, 5 modes)
- `ChartRunner_Prototype_README.md` — pinned to v0.8M#6, references 3 retired apps + Magnez (deleted) + 7-charge HUD (now 3 slots)
- `docs/MVP.md:116` — phone OS lists "Coach (retired), Intel (retired)" — drop the retired entries instead of marking them
- `docs/EXECUTION-CHECKLIST.md:31-37` — Day 1 still lists `Reserve @chartrunner_xyz` as TODO; X handle is reserved. Cross off.

---

## 📦 Placeholders Inventory (what's pretending to work)

Things wired with placeholder values that produce no real effect until backed by real data or a real ID:

| Placeholder | Where | What it should become |
|---|---|---|
| `ChMapsdLcj4N4ek3uW3RZE3pWYuKSTrgVLWeKQrU3yVz` | 3 files (Anchor.toml, lib.rs, cr-maps-program.ts) | Real Program ID from Solana Playground deploy |
| `ChRegSdLcj4N4ek3uW3RZE3pWYuKSTrgVLWeKQrU3yVz` | 3 files (same set, registry) | Real Program ID from registry deploy |
| `protocol_treasury() = crate::ID` | `chartrunner-registry/lib.rs:60-65` | Real multisig treasury address before mainnet |
| Marketplace seed listings (Bots/Maps/etc.) | `ChartRunner_Prototype.html:14635-14685` | None — hardcoded demo data; real listings come from on-chain Listings PDAs |
| `walletAddr: 'TBD'` in copyTrade primitive | `ChartRunner_Prototype.html:23078` | Real wallet picker UI when copyTrade ships |
| `cr_strategies_v1`, `cr_backtests_v1`, `cr_token_profiles_v1` | `ChartRunner_Prototype.html:6485-6490` | Currently keys read by crRegistry but **never written by anyone** — orphan storage |
| `cr_pinned_widgets_v1` | `NS_KEYS:6385` | Registered for namespacing but **never read or written** |
| Docs link `github.com/<you>/chartrunner` | `App.tsx:844` | `ssjjul3/chartrunner` |
| `App Builder template fallbacks` (`WB_APP_TEMPLATES.custom`) | Workbench Apps tab | Hardcoded placeholders; OK as defaults |
| `// v0.8b cleanup will remove residual charge fields` TODO | `ChartRunner_Prototype.html:~9700` | Six versions overdue — cleanup or drop the comment |

---

## 🏗 What Needs to Be Built (gap between SDK promise and runtime)

### Critical path (unblocks the on-chain claim)

1. **Deploy `chartrunner_registry` via Solana Playground** (~20 min) — flips every Save/List/Buy/RecordRun button from "tx fails" → real signed devnet confirmations. Single highest ROI move on the board.

### High-leverage (already-shipped UI without backing logic)

2. **Persistence for Strategy / Backtest / TokenProfile entities** — Workbench tabs exist, marketplace categories exist, registry routes exist, but the localStorage keys are orphans. Wire `_writeType()` paths in `crRegistry`. ~30 min.
3. **`buildDeleteEntityIx` integration** — exported in TS client, supported in Rust program, but no UI surface invokes it. Add a 🗑 button per entity row in Workbench. ~1 hr.
4. **Tests for `chartrunner_registry`** — `anchor/tests/` has only `chartrunner-maps.ts`. The much larger registry program (escrow, marketplace, leaderboard) ships untested. **Risk:** real money flow has zero test coverage. ~3 hr to write parity-style smoke tests.

### Half-built primitives

5. **`liquidityRadar` + `rescueDrone` standalone paths** — still flagged `'reframe'`. Standalone game uses gameplay-only effects (visual scan / immunity). Per the v0.9.7d hedge fix's pattern, these should also call real underlying primitives in standalone. ~1 hr each.
6. **`copyTrade` wallet picker** — primitive ships with `walletAddr: 'TBD'`. UI for picking a wallet to follow is unbuilt. ~2 hr.
7. **`fundingSnipe` real signal source** — flagged `'reframe'`; standalone emits signal but no real funding-rate feed. Either wire HL funding API or leave as Phase 2. ~4 hr.

### Documented but missing

8. **No `ChartRunner_v0.9_Backlog.md`** — v0.6 / v0.7 / v0.8 each have one. v0.9 (currently shipping, 5+ subversions) doesn't.
9. **`build_deck.py` referenced in README but file isn't in repo** — either the regen script never made it in or it's named differently. Verify.
10. **`PUBLISH.sh`** — README references this as the "one-shot publish script" but file may not exist.

---

## 🟢 Cleanup (low-priority polish)

- **~120 lines of dead CSS** for `.crChrome.left` survives across 5 spots in the stylesheet (palette base, ASCII theme, Solana theme, mobile, SVG sizing). Element was deleted in v0.9.8b. Safe to strip in one pass.
- **Re-exports from `cr-registry-program.ts`** — `sha256`, `toHex`, `solToLamports`, `getTreasuryAddress`, `findRunPda`, `findLicensePda` exported but never imported externally. Either drop or document as public API.
- **Top-level scratch files** — German screenshots in `Tools/`, `.~lock.PITCH-DECK.pdf#` lockfile, multiple GDD .docx files at root, three `Bitcoin Chart Bild vom 2X Sept 2025.png` duplicates, `lu471s7vk.tmp`. Move to `_brainstorm/` or add to `.gitignore`.
- **Parked TG Mini App** — `tg-miniapp/`, `ChartRunner_TG_MiniApp.html`, `ChartRunner_TG_MiniApp_README.md` are deadwood (per user memory: parked). Add `PARKED.md` marker.
- **Idle `idleEls`** — `:24210-:24222` references `crOSDockFixed` + `crBottomBar` (both retired). `getElementById().filter(Boolean)` saves it from crashing but the array is misleading.

---

## Top-5 Highest-Leverage Actions (ranked)

1. **Fix the `placeBracket` call** (5 min) — silent breakage in shipped Bot Terminal.
2. **Solana Playground deploy of `chartrunner_registry`** (20 min) — converts every wallet-popup tx from "fails" to real on-chain.
3. **Mass version-string sweep across 8 doc files** (15 min) — single mechanical pass, removes the "frozen-in-time" smell across all external-facing surfaces.
4. **Fix the CI vs Pages workflow contradiction + landing-folder README** (15 min) — eliminates a perma-warning on every CI run and a self-contradicting doc.
5. **Wire persistence for Strategy / Backtest / TokenProfile entities** (30 min) — closes the orphan-storage gap so the marketplace claim is honest end-to-end.

**Total: ~85 min of focused work clears the highest-leverage debt.** Everything else is cleanup that can wait for a quiet hour.
