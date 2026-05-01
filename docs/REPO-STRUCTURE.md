# Production Repo Structure

**Target** layout for `github.com/ssjjul3/chartrunner` once the SDK extraction (Phase 1) lands. Today's repo (v0.9.1) ships the single-file game + the Solana devnet React app + the landing page; the workspace split below is the next-phase migration target.

For the **current** state of the shipping repo, see the top-level [README.md](../README.md) "Repo layout (current state)" section.

## Top-level

```
chartrunner/
├── ChartRunner_Prototype.html          # Phase 0 single-file playable
├── chartrunner-prototype/              # GitHub Pages deploy folder (mirror)
│   ├── index.html                      # = ChartRunner_Prototype.html
│   └── README.md
├── sdk/                                # Phase 1 ES module SDK
│   ├── src/
│   │   ├── index.ts                    # public surface
│   │   ├── ChartRunnerSDK.ts
│   │   ├── primitives/
│   │   │   ├── bracket.ts
│   │   │   ├── ladder.ts
│   │   │   ├── fibLadder.ts
│   │   │   ├── oco.ts
│   │   │   ├── hedge.ts
│   │   │   ├── radar.ts
│   │   │   └── rescue.ts
│   │   ├── risk/
│   │   │   └── RiskManager.ts
│   │   ├── events/
│   │   │   └── eventBus.ts
│   │   └── types/
│   │       ├── Order.ts
│   │       ├── Position.ts
│   │       └── ChartHost.ts
│   ├── tests/
│   │   ├── parity/
│   │   │   ├── empty_stream_parity.test.mjs
│   │   │   ├── schema_version.test.mjs
│   │   │   └── mandate_parity.test.mjs
│   │   └── unit/
│   │       └── (per-primitive tests)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                        # SDK reference
├── adapters/                           # venue-specific implementations
│   ├── solana-devnet/                  # Phase 2 — primary
│   │   ├── src/
│   │   │   ├── SolanaDevnetAdapter.ts
│   │   │   ├── wallet/
│   │   │   │   ├── SolanaAgentWallet.ts # paper-mode + live signer
│   │   │   │   └── SolanaAgentSession.ts
│   │   │   └── approver/
│   │   │       └── solana_approver.py
│   │   ├── tests/
│   │   │   └── parity_vectors.json
│   │   └── README.md
│   ├── hyperliquid/                    # Phase 2 — secondary
│   ├── drift/                          # Phase 2 — secondary
│   └── mock/                           # Phase 0 fallback
│       └── MockAdapter.ts
├── chart-host/                         # Phase 1 chart-source adapters
│   ├── src/
│   │   ├── ChartHost.ts                # interface
│   │   ├── BinanceChartHost.ts         # default (today)
│   │   ├── DexscreenerChartHost.ts     # Phase 1 target
│   │   └── TradingViewChartHost.ts     # Phase 1 target
│   └── README.md
├── workbench/                          # Pine Script builder + backtest engine
│   ├── parser/
│   │   ├── pine-lexer.ts
│   │   └── pine-parser.ts
│   ├── runtime/
│   │   └── pine-vm.ts                  # bytecode VM for compiled Pine
│   ├── backtest/
│   │   └── PaperEngine.ts
│   └── README.md
├── docs/
│   ├── PROBLEM.md
│   ├── MVP.md
│   ├── COMPETITIVE.md
│   ├── TRACTION.md
│   ├── PITCH-DELIVERY.md
│   ├── VIDEO-SCRIPT.md
│   ├── REPO-STRUCTURE.md               # this file
│   ├── X-LAUNCH.md
│   ├── EXECUTION-CHECKLIST.md
│   ├── architecture/
│   │   ├── ChartRunner_Phase0_Plan.md
│   │   └── ChartRunner_Phase1_SDK_Architecture.md
│   └── adr/                            # Architecture Decision Records
│       ├── 0001-single-file-prototype.md
│       ├── 0002-sdk-as-only-order-issuer.md
│       └── 0003-abilities-never-touch-canvas.md
├── skills/                             # AI-agent contributor skills
│   └── chartrunner/
│       ├── SKILL.md
│       └── references/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # parse-check + test on PR
│   │   └── pages.yml                   # deploy chartrunner-prototype/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   └── feature.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── PITCH-DECK.pptx                     # submission deck
├── LICENSE                             # MIT
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── package.json                        # workspaces config
├── pnpm-workspace.yaml                 # or yarn workspaces
└── README.md                           # ← top-level
```

## Why this layout

### Workspaces (pnpm or yarn)
- `sdk/`, `adapters/*`, `chart-host/`, `workbench/` are independent packages
- `pnpm install` once, all internal deps resolve via workspace links
- Adapters can be published to npm independently — partners can `npm install @chartrunner/solana-devnet-adapter`

### The constitutional rule shows up in directories
- `sdk/` knows nothing about rendering
- `chart-host/` knows nothing about orders
- `adapters/` knows nothing about UI
- The Phase 0 single-file HTML is the *only* thing that imports across all three

### ADRs
- Codify the rules so future contributors don't re-litigate them
- Each ADR is a 1-page markdown doc with: context, decision, consequences

### Skills folder
- Lets Claude / GPT-4 / agentic coders contribute via documented best-practices
- Already started — see `/skills/chartrunner/SKILL.md`

## Migration plan from today's monolith

Today: `ChartRunner_Prototype.html` is one ~14,700-line file. The constitutional rule is enforced by code review, not by directory structure.

Migration sequence:

1. **Don't break the single-file shipping.** It stays as the Phase 0 fallback forever.
2. **Extract `ChartRunnerSDK` to `sdk/` first.** Already started on the M1 branch (M1 milestone in TRACTION.md).
3. **Extract `ChartHost` to `chart-host/`.** This is what makes Phase 1 (Dexscreener overlay) possible.
4. **Create `adapters/mock`** — drop-in for Phase 0 behavior so the SDK can be tested in isolation.
5. **Create `adapters/solana-devnet`** — Phase 2 primary work.
6. **Wire CI** to parse-check the HTML + run SDK tests on every PR.
7. **Publish npm packages.** First public release: `@chartrunner/sdk@0.1.0`.

Each step is a PR. Each PR keeps the single-file demo working — that's the regression test.

## Branch strategy

- `main` — always shippable. Merges from PRs only.
- `next` — staging branch for the upcoming version.
- `feat/*` — feature branches (`feat/solana-adapter`, `feat/dexscreener-host`, etc.)
- `fix/*` — bug fixes
- `chore/*` — non-feature work (CI, docs, deps)

Tags: `v0.X.Y` semver. Phase 0 ships at `v0.9.0` (current state). Phase 1 entry: `v1.0.0`.

## Required CI checks (PR gating)

- [ ] HTML parses (`node --check` on extracted scripts, see `scripts/check-html.mjs`)
- [ ] SDK unit tests pass
- [ ] SDK parity tests pass (mock adapter ↔ live adapter equivalence)
- [ ] No new external dependencies in the single-file HTML
- [ ] CHANGELOG.md updated
- [ ] If touching primitives: ADR review required

## Issue + PR templates (copy-paste ready)

### `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
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
- [ ] HTML parses (`pnpm run check`)
- [ ] SDK tests pass (`pnpm test`)
- [ ] Manual playtest: Phase 0 still loads + bracket flow works
```

### `.github/ISSUE_TEMPLATE/bug.md`

```markdown
**What broke?**

**How to reproduce?**

**Expected vs actual?**

**Browser + OS?**

**Screenshot or screen recording?**
```
