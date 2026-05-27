# ChartRunner × Honeycomb Protocol — Gamification Concept

> **Why this doc exists.** Honeycomb is the third on-chain partner in the v0.9.10 stack
> (alongside Phoenix Rise and MagicBlock Ephemeral Rollups; Pyth makes four). The TS
> adapter at [`solana-connect/src/lib/honeycomb-economy.ts`](../solana-connect/src/lib/honeycomb-economy.ts)
> is plumbing. **This doc is the design.** It explains how Honeycomb's six game-economy
> primitives — Profile, Character, Resources, Recipes, NectarMissions, NectarStaking —
> become ChartRunner's player-progression spine, replacing the localStorage / inline-state
> systems the prototype currently fakes.
>
> **Audience:** Frontier judges, future Claude sessions, anyone evaluating whether
> ChartRunner is "another monetization play with on-chain dressing" or a real on-chain
> game-economy implementation. The pitch deliberately leads with **gamification +
> education + on-chain**, not monetization. Honeycomb is the *gamification* axis.

---

## Framing — what Honeycomb actually is

Honeycomb's primitives are not "ways to charge money." They're the on-chain version of
the systems every loot-loop game has had for two decades: identity, progression,
missions, resources, crafting, staking. ChartRunner already has all of these in
`localStorage` today (skin/gear/vehicle, Campaign chapters, $CHART / $RUN, bot crafting
in Workbench). Honeycomb makes them **verifiable, persistent, and portable across
games**.

The under-told story is **cross-game portability**. A Honeycomb Character earned in
ChartRunner is the *same Character* in any other Honeycomb-integrated Solana game. A
Bronze trader in ChartRunner starts elevated in the next game on the network. We get
that network effect for free by adopting Honeycomb's primitives instead of inventing
our own.

Compression makes the cost story honest:

| Honeycomb action | Without compression | With compression | Reduction |
|---|---|---|---|
| Create profile | 0.0052100 SOL | 0.0000041 SOL | **99.92 %** |
| Create character | 0.0024200 SOL | 0.0000041 SOL | **99.83 %** |
| Mint resources | 0.0021450 SOL | 0.0000100 SOL | **99.53 %** |
| Mission start | 0.0024250 SOL | 0.0000100 SOL | **99.59 %** |

(Source: Honeycomb Cost Comparison page.) At those numbers, every run a player completes
can mint events on-chain without bankrupting the player or the protocol.

---

## Eight concepts, ordered by demoability

### 1 — Trader Identity (Profile + Character)

**Honeycomb primitive:** `createNewProfileTransaction` + `createCreateCharacterTransaction`
**Replaces in ChartRunner:** `localStorage` keys `cr_player_loadout_v1`, `cr_wallet_addr`, the inline trader avatar state.

Every wallet that connects gets one Honeycomb Profile (one-time mint, ~0.0000041 SOL after
compression). The Profile holds display name, bio, pfp. On top of the Profile sits a
Character with starting traits:

```
character.traits = {
  rank:        "Bronze",
  primitives:  "bracket,oco",
  ghostFactor: "1.00",
  runs_completed: 0,
}
```

The Profile is what the leaderboard reads, what the Coach greets, what the matchmaking
reads in PvP. The Character is what carries progression. **Single source of truth across
every ChartRunner surface** (game, Dexscreener overlay, TradingView overlay, Telegram
mini app) and across every other Honeycomb-integrated game on Solana.

Adapter call shapes already in [`honeycomb-economy.ts`](../solana-connect/src/lib/honeycomb-economy.ts):

```ts
const client = createHoneycombEdgeClient();
const { accessToken, userPublicKey } = await honeycombAuthenticate(client, wallet);

await honeycombCreateProfile(client, {
  accessToken, userPublicKey,
  name: "anon_runner",
  bio:  "trades the chart upside-down",
});

await honeycombCreateCharacter(client, {
  accessToken,
  characterModel: CHARACTER_MODEL_BASE_TRADER,
  owner: userPublicKey,
  payer: userPublicKey,
  traits: { rank: "Bronze", primitives: "bracket,oco", ghostFactor: "1.00" },
});
```

---

### 2 — Run = NectarMission lifecycle

**Honeycomb primitive:** `createCreateMissionPoolTransaction`, `createCreateMissionTransaction`, `createParticipateMissionTransaction`, `createRecallMissionTransaction`
**Replaces in ChartRunner:** the post-game `chartrunner_registry::record_run` inline call. The mission *is* the run.

Today: click Launch → run → game-over → click "Record on-chain". Tomorrow: clicking Launch
*is* `participateMission(asset_pool, character)`. The mission has:

- A **duration** (the run's `runLengthSec` from the Maps program) — enforced on-chain.
- An **entry cost** ($CHART, paid in to the mission pool).
- **Rewards** declared up-front (XP + $CHART or $RUN, weighted by score on `recall`).

On game-over, the client calls `recallMission(character)`. The Mission program checks
that `now >= participate_time + duration`, releases the locked Character, and pays out
rewards proportional to the score the run reported. The "is this score real?" question
gets enforced by Pyth-backed price citation (per the v0.9.11 chartrunner_oracle scaffold)
PLUS by the mission's own time-gate.

Mission pools partition the playerbase by skill / stake / format:

| Pool | Entry | Duration | Rewards | Audience |
|---|---|---|---|---|
| **Newbie Run** | 50 $CHART | 5 min | +50 XP, 50 $CHART guaranteed | First-week traders |
| **Daily Challenge** | 500 $CHART | 30 min | +500 XP, 0–2000 $CHART by score tier | Returning players |
| **Tournament Match** | 1 $RUN | 24 h | Pool → top 10 % of finishers | Competitive |
| **Educational Run** | 0 | Untimed | +XP, "Graduate" trait on completion | Campaign chapter mode |

```ts
// Player joins the Daily Challenge with their character
await honeycombParticipateMission(client, {
  accessToken,
  mission:   DAILY_CHALLENGE_MISSION_ADDR,
  character: charAddr,
  payer:     userPublicKey,
  runPayload: { asset: "BTC", score: 0, sharpeX100: 0 },  // updated at recall
});

// 30 minutes later, on game-over
await honeycombRecallMission(client, {
  accessToken,
  mission:   DAILY_CHALLENGE_MISSION_ADDR,
  character: charAddr,
  payer:     userPublicKey,
});
```

---

### 3 — $CHART and $RUN as Honeycomb Resources

**Honeycomb primitive:** `createMintResourceTransaction`, `createBurnResourceTransaction`, `createDelegateAuthorityTransaction`
**Replaces in ChartRunner:** the `localStorage` `cr_chart_balance` + `cr_run_balance`, plus the in-run mint events that currently live in JS only.

$CHART and $RUN are Honeycomb resources, not raw SPL tokens. State-compressed: minting
costs drop from 0.002 SOL to 0.00001 SOL. The ChartRunner backend wallet gets delegated
`MintResources` + `BurnResources` permissions via `createDelegateAuthorityTransaction`,
so the engine credits the player directly during a run without round-tripping through
wallet signs.

Every pickup the player collects on the chart canvas — a tick, a creds orb, a boss-loot
drop — fires a real `mintResource` against the player's Profile balance. Cheap enough
to do per-pickup at scale.

```ts
// Run engine credits the player during gameplay
await honeycombMintResource(client, {
  accessToken,
  resource:  HC_RESOURCE_CHART,
  owner:     userPublicKey,
  amount:    "250",
  authority: CHARTRUNNER_DELEGATE_AUTHORITY,
  payer:     userPublicKey,  // backend pays the tiny tx fee
});

// Exchange counter — burn 100 $CHART to mint 1 $RUN
await honeycombBurnResource(client, {
  accessToken, resource: HC_RESOURCE_CHART,
  owner: userPublicKey, amount: "100",
  authority: CHARTRUNNER_DELEGATE_AUTHORITY, payer: userPublicKey,
});
```

---

### 4 — Crafting Bots via Recipes

**Honeycomb primitive:** `createCreateRecipeTransaction`, `craftRecipeTransaction`
**Unblocks:** the Workbench bot-builder (currently Chapter 5 of the Campaign + the standalone Workbench → Bots tab).

Workbench's bot-builder becomes a real on-chain ceremony. A "Bot" is a Character minted
from inputs:

```
recipe.inputs  = [
  { kind: "resource",   address: STRATEGY_RESOURCE,  amount: 1 },
  { kind: "resource",   address: INDICATOR_RESOURCE, amount: 1 },
  { kind: "resource",   address: HC_RESOURCE_CHART,   amount: 100 },
]
recipe.outputs = [
  { kind: "character",  model: BOT_CHARACTER_MODEL, traitsFrom: "inputs" },
]
```

The Strategy and Indicator resources mint when the player publishes a Pine script or
a custom indicator. Combining them via the recipe burns the inputs (the strategy/indicator
get consumed) and mints a Bot Character with traits inherited from the inputs:

```
bot.traits = {
  detection_skill:  inputs.strategy.win_rate,    // copied at craft time
  reaction_window:  inputs.indicator.period,
  risk_tier:        inputs.strategy.max_drawdown,
}
```

Bots are Characters, so they're transferable, stakeable, and provable. A bot you craft
yourself can be sold to another player on the Marketplace (M4 milestone) — the buyer gets
a bot Character whose traits were derived from *your* strategy. Authorship is on-chain
forever.

---

### 5 — Streaks and Badges as Character traits

**Honeycomb primitive:** `AssignCharacterTraits` permission + `updateCharacterTraitsTransaction`
**Replaces in ChartRunner:** the inline `game.streak` counter, `cr_campaign_progress_v1` localStorage key, badge logic that currently lives in `endRun()`.

A non-mintable trait on the player's Character: `consecutive_wins`. On every
`recallMission` outcome, the trait increments on win or resets on loss. At certain
thresholds, additional non-transferable badge sub-traits get assigned:

| Trigger | Badge trait |
|---|---|
| 7 consecutive winning runs | `streak_hot_7` |
| 100 brackets placed (lifetime) | `bracket_master_100` |
| Full Campaign completion (chapters 1–17) | `chapter_8_graduate` |
| 10 runs won via FA detector firing | `failed_auction_specialist` |
| First on-chain `record_run` | `chain_initiate` |
| 1000 runs total | `veteran_1000` |

Badges compose into the Trader's social profile — visible to other players in PvP lobby,
visible to other Honeycomb-integrated games as input signals (e.g. another DeFi game might
gate access to high-stake pools by `bracket_master_100`).

---

### 6 — Tournaments via NectarStaking

**Honeycomb primitive:** `createStakingPoolTransaction`, stake/unstake flows
**Lands in:** M8 (token launch tournaments, the post-Frontier endgame milestone)

A tournament is a Staking pool with a fixed duration. Players stake their Character into
the pool. Top finishers by score pull rewards proportional to stake + rank. Losers'
staked entry fees redistribute to winners.

```
pool = {
  duration: 24h,
  entry_resource: $CHART,
  entry_amount: 1000,
  reward_distribution: [
    { rank: 1, share: 0.40 },
    { rank: 2, share: 0.20 },
    { rank: 3, share: 0.15 },
    { rank: "4-10", share_per_player: 0.025 / 7 = 0.00357 each },
    { rank: "11+", share: 0 },
  ],
}
```

The whole structure — entry, escrow, settlement, payout — is just `NectarStaking` with
custom score-based reward weights. The token-launch flavor of M8 (launch a token, fight
on the chart, win opponent supply) hangs off this same primitive: each player launches a
resource, stakes it into the tournament pool, and the winners' resources eat the
losers' resources via `BurnResources` + `MintResources` rebalancing.

---

### 7 — Cross-game portability via gameInteract

**Honeycomb primitive:** `gameInteract` permission grant on a Project
**Strategic hook:** ChartRunner becomes the on-ramp for the broader Honeycomb ecosystem.

Honeycomb's documentation explicitly designs Characters as cross-game assets. A
Character earned in ChartRunner carries its traits when the same wallet plays another
Honeycomb game. We grant `gameInteract` permission to specific peer games so they can
read trait values relevant to gating in their own systems:

```ts
await honeycombDelegateChartRunnerAuthority(client, {
  authority: CHARTRUNNER_PROJECT_AUTHORITY,
  delegate:  PEER_GAME_PROJECT,
  serviceDelegations: {
    CharacterManager: [
      { permission: CharacterManagerPermissionInput.ReadCharacterTraits },
    ],
  },
});
```

The peer game now sees:
- `rank=Gold` → admit to high-stakes pool
- `bracket_master_100` → unlock advanced trade UI
- `chain_initiate` → skip on-boarding tutorial

ChartRunner is positioned as the credentials engine for Solana-native trading skill.
Honeycomb wins because it gets a flagship game with real trader pedigree on its
Character schema. We win because our character has utility outside our own product.

---

### 8 — Anti-cheat as a public trait

**Honeycomb primitive:** `AssignCharacterTraits` (same as #5, opposite direction)
**Replaces in ChartRunner:** the v0.9.7 `MAX_RUN_SCORE` cap (stays as defense in depth, but augmented by reputation).

Today our defense against forged scores is:
1. Client-side defensive clamping (1M score / ±100 sharpe / 24h duration ceilings)
2. Anchor-level `require!` enforcement at `record_run`
3. Pyth price citation (post-deploy of `chartrunner_oracle`)

Honeycomb adds a fourth: **bad-actor traits**. If the engine detects bot-like behavior —
1000 runs in 24 hours, repeated 0-bracket runs scoring high, suspiciously identical
trade sequences — the Character earns a `flagged_velocity` trait. The leaderboard reads
this trait and filters those Characters from public rankings. Other Honeycomb games on
the network see the trait too, and can choose to gate access.

**Reputation, on-chain, portable.** A scammer can't escape their Character's history
without paying to mint a fresh Profile + Character, which costs them their existing
progression. The economic incentive aligns toward honest play.

---

## Sequence against the Post-Frontier roadmap

The eight concepts map to the M1–M8 milestones in the README:

| Honeycomb concept | Lands in | Notes |
|---|---|---|
| **#1 Profile + Character** | **M1** (tokenomics paper ships) | Bootstrap on Honeynet. One Honeycomb project for ChartRunner. |
| **#3 Resources ($CHART, $RUN)** | **M1** | Flips on as part of the M1 bootstrap — the adapter is already scaffolded. |
| **#2 NectarMissions for runs** | **M1** | Replaces the Phase-0 `record_run` flow at the same time. |
| **#4 Crafting recipes (Bots)** | **M3** (Build apps restored) | Workbench bot-builder routes through Honeycomb recipes. |
| **#5 Streak / badge traits** | **M3** | Free win once Mission lifecycle is wired in M1. |
| **#6 NectarStaking tournaments** | **M8** (token launch tournaments) | Becomes the literal infra for tournaments. |
| **#7 Cross-game gameInteract** | **M8** | Enables ChartRunner → "next Honeycomb game" portability. |
| **#8 Anti-cheat traits** | **between M5 and M8** | Built incrementally as we collect run data. |

---

## What ships before Frontier

For the May-11 demo build, **none of these concepts are wired live**. The README and this
doc describe the design; the scaffolded adapter shows the call shapes; the Honeycomb
Cost Comparison numbers prove the economics. Concrete on-chain flips begin at **M1**.

That gap is intentional. The Frontier pitch leads with **gamification + education +
on-chain (industry-standard)**, not "we already minted 10,000 NFTs." Showing a credible
plan with real call shapes, a deployed-adapter file, and a milestone-aligned execution
order is the right answer for a Phase-0 hackathon submission. Mainnet integrations
follow the audit + tokenomics paper, not a hackathon deadline.

---

## References

- **Adapter source:** [`solana-connect/src/lib/honeycomb-economy.ts`](../solana-connect/src/lib/honeycomb-economy.ts)
- **Honeycomb docs:** https://docs.honeycombprotocol.com
- **Edge Client repo:** https://github.com/honeycomb-protocol/edge-client
- **ChartRunner roadmap (M1–M8):** see "Post-Frontier roadmap" section in [README.md](../README.md)
- **The other three partners:**
  - Phoenix Rise — `solana-connect/src/lib/phoenix-rise.ts` (live trading, fee accrual)
  - MagicBlock ER — `solana-connect/src/lib/magicblock-ephemeral.ts` (realtime PvP)
  - Pyth Core — `solana-connect/src/lib/pyth-feeds.ts` (verifiable price feeds)
