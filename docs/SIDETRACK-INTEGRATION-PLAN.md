# Frontier Sidetrack Integration Plan
**Status:** 16 confirmed tracks · ceiling ~$149.5k
**Strategy:** group tracks by shared technical work — build the underlying integration once, write 2–4 submissions from one body of work.

---

## 0 · Grouping the 16 tracks

```
┌─────────────────────────────────────────────────────────────┐
│  Group A — Pure writeup (NO new code)                       │
│  Adevar · Visa Germany · theMiracle · RPC Fast              │
│  ─────────────────────────────────────────────────  ~$80k   │
│                                                             │
│  Group B — Identity layer (one build → 2 tracks)            │
│  SNS · (feeds Visa Germany)                                 │
│  ─────────────────────────────────────────────────  ~$5k    │
│                                                             │
│  Group C — Data feeds (one Dune dashboard → 1 track,        │
│  one Birdeye/GoldRush feed → 2 tracks)                      │
│  Dune · Etherway (Birdeye) · GoldRush                       │
│  ─────────────────────────────────────────────────  ~$29k   │
│                                                             │
│  Group D — Trade routing / broker (one broker build         │
│  → 4 tracks)                                                │
│  Jupiter · Jito · Tether · Etherway (DFlow)                 │
│  ─────────────────────────────────────────────────  ~$38k   │
│                                                             │
│  Group E — Agent / MCP exposure (one agent → 2 tracks)      │
│  Zerion CLI · Torque MCP                                    │
│  ─────────────────────────────────────────────────  ~$8k    │
│                                                             │
│  Group F — Cross-chain funding (one widget → 2 tracks)      │
│  LI.FI · (Visa onramp)                                      │
│  ─────────────────────────────────────────────────  ~$2.5k  │
│                                                             │
│  Group G — Privacy lane                                     │
│  Cloak · MagicBlock                                         │
│  ─────────────────────────────────────────────────  ~$10k   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1 · Group A — Pure writeup (Days 1-2)

Zero new code; submissions are entirely framing of what already shipped at v1.0.50.

### Adevar Labs · $50k Security Audit Credits
- **What we submit:** existing 2 LIVE Anchor programs (`chartrunner_maps` `DbzEqK…UvH`, `chartrunner_registry` `ER8G9…rdcn`), plus the scaffolded `chartrunner_match` + `chartrunner_oracle`.
- **What we write:** `docs/SECURITY.md` describing the upgrade-authority posture (going to Squads multisig per M0.5), known issues, request audit scope (chartrunner_registry has the most attack surface — buy/sell/fee math).
- **Effort:** 2-3 hours writing.
- **Blocker:** none.

### Visa Frontier (Germany) · $10k USDG
- **What we submit:** ChartRunner as German-built Solana app. The broker layer + USDG settlement angle.
- **What we write:** position ChartRunner as "stablecoin-settled trade routing for retail traders". Emphasize Germany origin + Frontier submission already filed with Germany flag.
- **Effort:** 1 hour writeup.
- **Blocker:** none — eligibility already met.

### theMiracle · $10k In-Wallet Brand Activation
- **What we submit:** the NFT avatar picker + lite-profile + LED billboard rotator as an in-wallet brand experience. Player's wallet becomes their trader identity.
- **What we write:** explain how the in-wallet NFT (top 20 collections) + the per-wallet desktop background (v1.0.43) + per-wallet save persistence (v1.0.28) all create wallet-bound brand activation.
- **Effort:** 1 hour writeup.
- **Blocker:** none.

### RPC Fast · $10k Infrastructure Credits
- **What we submit:** ChartRunner reads from public devnet RPC currently; switch to RPC Fast endpoint.
- **What we change in code:** one constant in `crGhost` and `crMapsTx` IIFEs — `RPC_URL = 'https://...rpc-fast.io/devnet'`.
- **What we write:** describe traffic profile (RPC reads for `getProgramAccounts` filtered by RunRecord, `getBalance` for SOL pill, `getLatestBlockhash` + `signAndSendTransaction` for save_map).
- **Effort:** 30 min code + 30 min writeup.
- **Blocker:** apply for credits first; swap URL once approved.

---

## 2 · Group B — SNS Identity layer (Days 3-4)

**Replaces** the M2.6 custom Name Register entirely. SNS gives us global uniqueness, transferability, and grant credit in one move.

### SNS · $5k Identity Track
- **What we build:**
  1. On wallet connect: `getDomainKeySync(name)` lookup for any `.sol` primary domain the wallet owns. Use `@bonfida/spl-name-service`.
  2. If found, display `<owner-domain>.sol` in the lite-profile LED billboard (replacing `anon_runner`).
  3. Optional: in-game "Claim runner subdomain" button that registers `<runner>.chartrunner.sol` under a parent domain we own. Defer the subdomain UX to M2.6 proper; v1 just READ existing primary domain.
- **What we write:** "ChartRunner uses SNS as the runner identity layer — your Solana name IS your trader handle, displayed on the LED billboard and persisted with every saved map."
- **Code touch points:**
  - New IIFE `crSnsIdentity` at end of script: lazy-loads `@bonfida/spl-name-service` from CDN, exposes `crSnsIdentity.resolveName(pubkey) → Promise<string|null>`.
  - Modify `_refreshLightProfile` (line ~31174) so the billboard `_bbName` reads from `crSnsIdentity.resolveName(wallet)` with fallback to `profileName` input.
- **Effort:** 1 day. Mostly the lookup wiring + handling the async resolution (cache for 10min per pubkey).
- **Dependencies:** none. Works on devnet (SNS has devnet support).

---

## 3 · Group C — Data feeds (Days 5-7)

### Etherway · $20k (Birdeye lane) — pick Birdeye as the cheapest of the 5 sponsor options
- **What we build:** the in-game **Token widget** already exists (line ~28916 in `_wWireTokWidgets`); currently it shows static data. Swap to Birdeye API (`/defi/price`, `/defi/token_overview`) for live price + 24h change + holders.
- **Code touch points:** new IIFE `crBirdeye` that wraps `fetch('https://public-api.birdeye.so/...')` with a 30s cache + API key from env. Modify token widget render to consume `crBirdeye.fetchToken(mint)`.
- **Effort:** 1 day.
- **Dependencies:** Birdeye API key (free tier exists).

### Dune Analytics · $6k Data Sidetrack
- **What we build:** **Dune dashboard** (not code in our repo, code on dune.com) titled "ChartRunner · Frontier Activity":
  - Panel 1: Anchored maps per day (count `chartrunner_maps.MapSaved` events on devnet)
  - Panel 2: Top runs by score (count `chartrunner_registry.RunRecorded` events)
  - Panel 3: Most-traded assets (`asset` field from RunRecord, grouped)
  - Panel 4: NFT collections used as avatars (cross-reference our 20 curated mint addresses)
  - Panel 5: Geographic distribution if SNS adoption is high (resolve `.sol` → location field, optional)
- **Effort:** 1 day on Dune. Solana spellbook + a few SQL queries.
- **Dependencies:** Dune Solana datasets cover Frontier devnet — verify before sinking time.

### Covalent / GoldRush · $3k
- **What we build:** **Phoenix Live overlays** currently pull from Phoenix's own API. Swap one overlay (say "whale ghosts" = top-10 holder entries) to GoldRush's `/balances` endpoint with `wallet-activity-v2`.
- **Code touch points:** modify the Phoenix overlay IIFE in `v1.0.2`. New `crGoldRush` wrapper.
- **Effort:** 1 day.
- **Dependencies:** GoldRush API key.

---

## 4 · Group D — Trade routing / broker (Days 8-14)

This is the M3 broker work being pulled forward. One broker chassis serves four submissions.

### v0.4 broker chassis already exists at `sdk-m1-scaffold/sdk/brokers/{mock,binance-paper,phoenix}.js` (v1.0.4).
Add three new adapters:

### Jupiter · $3k jupUSD
- **New adapter:** `sdk-m1-scaffold/sdk/brokers/jupiter.js` — wraps the Jupiter aggregator API for quote + swap. Trade routes from Hotkey 4 BLUE LASER fire through Jupiter when this broker is selected.
- **Effort:** 1 day.

### Jito · $2k
- **New adapter:** `sdk-m1-scaffold/sdk/brokers/jito.js` — wraps Jito bundle submission for MEV-protected trades. Either standalone OR a "wrapper" around the Jupiter adapter that adds tip → bundle submission.
- **Effort:** 1 day on top of Jupiter (shared signing path).

### Tether · $10k USDT
- **What we add:** USDT-USDT.b tracking in the Token widget, USDT as a settle option in the broker UI, $RUN-USDT swap math placeholder for M1 tokenomics.
- **Effort:** 0.5 day code + writeup.

### Etherway · $20k (DFlow lane — if you'd rather lean into DFlow than Birdeye)
- **New adapter:** `sdk-m1-scaffold/sdk/brokers/dflow.js` — DFlow's order routing.
- **Effort:** 2 days. (Choose: this OR Birdeye for the Etherway submission, not both.)

**Recommendation:** ship Birdeye for Etherway (smaller integration, ships in a day) + Jupiter as standalone for the Jupiter track. Skip DFlow for hackathon timeline.

---

## 5 · Group E — Agent / MCP exposure (Days 15-16)

### Zerion CLI · $5k Autonomous Agent
- **What we build:** wrap the existing Workbench bot system as a Zerion CLI–compatible agent. The Pine v5 bots already scan candles, detect patterns (CCV, SFP, H&S, etc.) and emit signals via `crLive`. Expose this stream via Zerion CLI's agent interface.
- **Code touch points:** new file `sdk-m1-scaffold/sdk/agents/zerion-cli.js` that registers our bot's `detect()` function as a Zerion CLI agent. Likely 100-200 lines.
- **Effort:** 1 day.
- **Dependencies:** Zerion CLI docs — verify the agent interface matches our event shape.

### Torque · $3k MCP
- **What we build:** an MCP server that exposes ChartRunner's chart state + bot signals as MCP tools. Agents can `getCurrentChart()`, `listOpenPositions()`, `queryRecentSignals()`.
- **Code touch points:** new file `sdk-m1-scaffold/mcp/chartrunner-mcp.js` (Node), wraps the bot system's API. Could reuse the same `crLive` / `bot.detect()` exposed for Zerion.
- **Effort:** 1 day (shares logic with Zerion agent).

---

## 6 · Group F — Cross-chain funding (Day 17)

### LI.FI · $2.5k Germany
- **What we build:** "Fund your trading wallet" modal in the lite-profile Wallet tab. Embed LI.FI's web widget (iframe or React component, depending on what we can load lazily). User can swap ETH/BSC/etc → SOL/USDC and the funded wallet is what they use for $RUN swaps later (M1).
- **Code touch points:** new IIFE `crLifiFunding` — adds a "+ Fund" button to the Wallet tab's $CRDS card; on click, lazy-loads LI.FI widget script + opens modal.
- **Effort:** 1 day.
- **Bonus:** the same widget supports the Visa Germany "stablecoin payment infrastructure" framing — feature it in both submissions.

---

## 7 · Group G — Privacy lane (Days 18-20, optional)

These two are speculative until we read each SDK's actual surface area.

### Cloak · $5,010 Real-world Payment Privacy
- **What we'd build:** confidential trade size mode — when broker submits a Jupiter swap, route through Cloak so trade amount is obfuscated until execution.
- **Effort:** unknown (need to read Cloak docs first). 1–2 days estimated.
- **Risk:** if Cloak is mainnet-only or has complex SDK, drop it.

### MagicBlock · $5k Privacy
- **What we'd build:** finish deploying `chartrunner_match` + `chartrunner_oracle` — they're already scaffolded against `ephemeral-rollups-sdk` (MagicBlock). Currently blocked on Rust 1.85 toolchain.
- **Effort:** half day to deploy + submit IF the toolchain unblocks. Otherwise: write up the architecture as a v1.5 plan.
- **Risk:** toolchain blocker may not lift before Frontier deadlines.

---

## 8 · Recommended build order (3 weeks total)

```
Week 1 (Days 1-7)
├── Day 1   Adevar writeup       (+$50k ceiling locked behind doc)
├── Day 1   Visa Germany writeup (+$10k)
├── Day 2   theMiracle writeup   (+$10k)
├── Day 2   RPC Fast credit apply + URL swap (+$10k)
├── Day 3-4 SNS Identity         (+$5k, also fixes M2.6 roadmap)
├── Day 5   Birdeye for Etherway (+$20k)
├── Day 6-7 Dune dashboard       (+$6k)
                                  Running total ~$111k

Week 2 (Days 8-14)
├── Day 8-9   Jupiter broker adapter (+$3k)
├── Day 10    Jito wrapper           (+$2k)
├── Day 11    Tether integration     (+$10k)
├── Day 12-13 Zerion CLI agent       (+$5k)
├── Day 14    Torque MCP server      (+$3k)
                                  Running total ~$134k

Week 3 (Days 15-20)
├── Day 15   LI.FI widget          (+$2.5k)
├── Day 16   GoldRush feed         (+$3k)
├── Day 17-18 Cloak (if viable)    (+$5k)
├── Day 19-20 MagicBlock deploy
              (if toolchain ready) (+$5k)
                                  Final ceiling ~$149.5k
```

---

## 9 · Per-track submission checklist

For every track, the Superteam Earn form needs (from the 18:55 screenshot):

- [ ] **Link to your Submission** — track-specific (point at a feature page or README anchor)
- [ ] **Tweet Link** — write one tweet per track on X with the ChartRunner handle
- [ ] **Project Title** — "ChartRunner" (same for all)
- [ ] **Project Description** — 1-paragraph version per track, leading with the integrated sponsor's tech
- [ ] **Project GitHub Link** — `github.com/<owner>/chartrunner`
- [ ] **Project Website** — `chartrunner.xyz` (same for all)
- [ ] Reviewed scope checkbox

You said you'd compile the criteria — when you do, I can write the per-track descriptions + tweet drafts.

---

## 10 · What I need from you to start

To kick off Week 1:

1. **Adevar:** confirm I should draft `docs/SECURITY.md` (the audit application doc). Yes/no.
2. **RPC Fast:** I'll apply via the Superteam form and swap the URL once you have credits. Want me to do the apply writeup now?
3. **SNS:** confirm: read primary `.sol` domain only (v1), defer subdomain registration to M2.6 proper. Or do you want full subdomain claim flow on day 4?
4. **Order priority:** the sequence above is by ROI. Want a different priority — e.g., Visa Germany first because it has a deadline, or Adevar first because $50k is the ceiling? Tell me which 3 you want shipped first.

Or just say "execute the plan top-to-bottom" and I start at Day 1 right now.
