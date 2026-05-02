# ChartRunner v0.9.8 — Deferral Inventory

What's intentionally deferred vs unintentionally half-built. Companion to `AUDIT-v0.9.8.md`. Each item lists: where the placeholder lives, what's blocking, when it should ship.

## 🚦 Blocked on the one thing (Solana Playground deploy)

These are code-complete, just need the deploy command to run.

| Item | Where | Unblocks when |
|---|---|---|
| `chartrunner_maps` Program ID | 3 files: `Anchor.toml`, `programs/chartrunner-maps/src/lib.rs`, `solana-connect/src/lib/cr-maps-program.ts` | First Playground deploy |
| `chartrunner_registry` Program ID | 3 files: `Anchor.toml`, `programs/chartrunner-registry/src/lib.rs`, `solana-connect/src/lib/cr-registry-program.ts` | Same deploy |
| Every wallet popup ("tx fails: program not found") | All Workbench 🪙 / 📤 / 🪙× buttons, P2P Marketplace Buy buttons, run-end 🏆 Record | Same |
| Leaderboard panel ("empty until first record") | `crGhost` IIFE polls but `getProgramAccounts` returns 0 results | Same |

**Reality check:** ~20 minutes of work to deploy, paste 3 IDs, push. Single highest-ROI item on the entire board. Already documented in `anchor/README.md`.

## 🌐 Half-real primitives (work in standalone, full-real needs venue feed)

| Primitive | Standalone state | Real-real needs |
|---|---|---|
| `fundingSnipe` | Arms a paper trigger; toast spells out "Phase 2 wires live feed" | HL or Binance funding-rate websocket subscription via Phase 1 ChartHost adapter |
| `copyTrade` | Real wallet picker (base58 validated) + multiplier; mirror logic is paper | Subscribe to followee's `RunRecord` events from on-chain leaderboard. Phase 2 once registry is deployed + first leaderboard data exists |

**Capability flags:** both still `'reframe'` in the SDK `capabilities` map — accurate.

## 🎮 UI shells with no backing logic

| Surface | What's there | What's missing |
|---|---|---|
| **TokenProfile** entity type | `crRegistry.ENTITY.TokenProfile = 6`, registered in `STORAGE_KEYS`, 4 marketplace listings | No Workbench tab, no builder UI, no `_readType` resolver. Marketplace shows the 4 seeded listings but a player can't make their own. |
| **Marketplace seed listings** | 22 hardcoded items in `OS_SHOP_P2P` (3 bots / 3 maps / 3 strategies / 4 backtests / 4 indicators / 4 apps + 1 OCO seed) | Replace with on-chain `Listing` PDA reads via `getProgramAccounts` filtered by Listing discriminator. Same pattern as `crGhost`'s leaderboard query. |
| **Bot Terminal "agents" tab** (Claude / Telegram / Lobster / OpenClaw / Hermes) | UI rows visible | Connect buttons don't connect to anything; no LLM bridge wired |
| **Phantom-Connect P2P toast fallback** | When buying a seed listing without a `seller` field | Toast says "Phantom-Connect ships in Phase 2" — accurate, but only because seed listings predate the wallet flow |

## 🤝 Multiplayer (async leaderboard ✅, full ghost replay ❌, real-time ❌)

| Layer | State |
|---|---|
| Endpoint-marker leaderboard (top 10 per asset+TF) | ✅ Live in `crGhost`; polls every 60s |
| `record_run` instruction (asset/tf/score/sharpe/duration/mapHash anchored) | ✅ Live, smoke-tested |
| **Full ghost-trajectory replay** (other players' avatar paths overlaid on your chart) | ❌ Deferred — needs IPFS/Arweave path-sample storage. Documented in `crGhost` IIFE comment as the explicit tradeoff |
| **Real-time multiplayer** (see other players move live) | ❌ Deferred — needs WebSocket server, breaks single-file rule. Phase 2+ |

## 💰 Marketplace gaps

| Item | Status |
|---|---|
| First-sale flow (buy) | ✅ End-to-end: SOL escrows → splits 95/5 → mints License PDA → closes Listing |
| `protocol_treasury()` address | 🟡 Placeholder = `crate::ID` (fees burn into program PDA). **Must swap for real multisig before mainnet.** Flagged at `anchor/programs/chartrunner-registry/src/lib.rs:60-65` |
| Cancel listing | ✅ Live |
| **Resale royalty escrow** | ❌ Deferred — `royalty_bps` is stored on entities but no resale instruction routes the share back to creator. Phase 1.5 (~100 lines new Rust) |
| **"Owned" tab in P2P Marketplace** | ❌ Deferred — should query License PDAs for connected wallet via `getProgramAccounts` (memcmp on buyer pubkey). Phase 1.5 (~80 lines TS) |

## 🚀 Phase 1 (architecture done, work pending)

| Item | Status |
|---|---|
| **ChartHost adapter layer** (drop UI on Dexscreener / TradingView / Birdeye) | Architecture complete in `docs/architecture/ChartRunner_Phase1_SDK_Architecture.md`. SDK has `hostMode` flag + `capabilities` introspection. No partner integration written. |
| **`@chartrunner/sdk@0.1` npm package** | Listed as Phase 1 entry gate in `EXECUTION-CHECKLIST.md`. Not yet published. |
| **First devnet partner integration LOI** | Listed as Phase 1 entry gate. Pre-launch. |
| **500+ unique sessions on the demo** | Listed as Phase 1 entry gate. Pre-launch. |

## 🏗 Build / infrastructure deferrals

| Item | Why deferred |
|---|---|
| **Anchor 0.31.x + Solana 2.x upgrade** | Would unblock local `anchor build` (currently jailed by Rust 1.79 / `block-buffer 0.12.0` edition2024 mismatch). Defer until Solana Playground deploy is done — that path bypasses the toolchain entirely. |
| **`build_deck.py` + `PUBLISH.sh`** | Referenced in README — verify they're in the repo. May have never been committed. |
| **`ChartRunner_v0.9_Backlog.md`** | Not present. v0.6/0.7/0.8 each have one. Skipped because v0.9 shipped 11 sub-versions in a tight cluster. |
| **TS strict-mode pre-push validation** | Manual `cd solana-connect && npm run build` is the workaround. CI catches it but the iteration cost is one full deploy cycle. Could add a pre-commit hook later. |
| **WebSocket live candles** | Currently REST polled (5s tick). Real-time would feel snappier but breaks the no-deps rule. Phase 2 via ChartHost adapter. |
| **Mobile touch controls** | Desktop only. Mobile-friendly version was experimented (`tg-miniapp/`) and parked. |

## 📝 Code-level deferrals (TODO comments still in source)

| Where | What |
|---|---|
| `ChartRunner_Prototype.html` ~9700 | `// v0.8b cleanup will remove the residual charge fields and convert dots → cooldown ring.` Six versions overdue. |
| `ChartRunner_Prototype.html` `crChrome.left` CSS rules ~1389-1620 | ~120 lines of dead CSS for the deleted left palette. Element gone in v0.9.8b; CSS waiting for an audit pass. |
| `tg-miniapp/`, `ChartRunner_TG_MiniApp.html`, `ChartRunner_TG_MiniApp_README.md` | Parked per user memory. Sit in repo as deadwood. Should get a `PARKED.md` marker or move to `_archive/`. |
| Top-level scratch files | German screenshots in `Tools/`, GDD .docx files, Bitcoin chart .png duplicates, `lu471s7vk.tmp`, lock files. Move to `_brainstorm/` or add to `.gitignore`. |
| `idleEls` array | References `crOSDockFixed` + `crBottomBar` (both retired). `getElementById().filter(Boolean)` saves the array from crashing but the dead references mislead readers. |

## ✅ Recently un-deferred (in case you forgot what shipped)

| Was deferred until | Now |
|---|---|
| v0.9.7d hedge | `hedgeParachute` standalone opens real `inverseBracket` |
| v0.9.8j radar | `liquidityRadar` standalone toggles VRVP indicator |
| v0.9.8j rescue | `rescueDrone` standalone calls `closeAll()` |
| v0.9.8j copyTrade UI | Real wallet picker with base58 validation |
| v0.9.8h delete UI | 🪙× Unanchor button on every Workbench row |
| v0.9.8h registry tests | Mocha smoke tests for all 6 registry instructions |
| v0.9.8g orphan storage | Strategy/Indicator/Backtest now read from `cr_workbench_v1` |

---

## Top-3 deferrals by ROI (if you want to attack one)

1. **Solana Playground deploy** — single most valuable item. Unblocks ~10 different "this works as code but tx fails at runtime" gaps in one shot. ~20 min.
2. **"Owned" tab for License PDAs** — would make the marketplace actually demonstrate the buy → license model end-to-end. ~80 lines TS, requires registry deploy first.
3. **Real on-chain marketplace listings** — replace 22 hardcoded `OS_SHOP_P2P` entries with `getProgramAccounts` query for Listing PDAs. ~150 lines, requires registry deploy first.

After those three, the entire on-chain narrative is verifiable end-to-end.
