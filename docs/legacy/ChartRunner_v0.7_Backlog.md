# ChartRunner v0.7 — Economy, Gear, Items, Game Modes

This is a design pivot, not a patch. v0.6 (and v0.6a just shipped) validated the core loop:
run across real candles, trade with abilities, survive the upside-down. v0.7 reframes
the whole meta-layer around **persistent gear**, **consumable items as algorithms**,
and **three game modes** that branch the player's intent (creative/competitive/real-money).
This document captures the full spec, translates it into concrete mechanics, and
cuts it into shippable slices.

---

## Part 1 — The full spec (as given)

### Currency rename & role swap

- **TICK → $RUN**. Hard currency. Earned in the **overworld** by mining with the Pickaxe
  (the starter weapon). Also purchasable with $CRDS at end of run.
- **Creds → $CRDS**. Soft currency, but **scarce**. Earned in the **underworld** through
  fighting (kills, mining), winning trades, winning competitions. **$CRDS must be spent
  at the end of every run or it's lost** (forced-spend economy). Spend on: more $RUN,
  or Items.

### Gear — your persistent stack (NFTs)

Gear persists across runs. Every player has four slots:

1. **Skin** — cosmetic (anything; community creators can make them).
2. **Riding** — skateboard, surfboard, Lambo. Affects overworld locomotion.
3. **Flying** — Space Invader ship, UFO, etc. Affects flight physics/feel. Must be
   well-designed and curated (this is the UX hero moment).
4. **Weapon — evolving.** Pickaxe → Magic Wand → Laser Gun.
   - Pickaxe mines $RUN.
   - When Pickaxe evolves into Mining Rig equivalent, mining becomes passive/richer.
   - Magic Wand and Laser Gun unlock different combat/mining dynamics.

Gear is purchased with **$RUN**.

### Items — consumable algorithms

- Items **replace the current time-cooldown abilities** (bracket, ladder, OCO, hedge,
  radar, rescue). They are indicators / algorithms, expressed in gamified form.
- Items are chosen in the **start menu** before a run. How many depends on game mode:
  Creative = unlimited, Time\_is\_Money = 5, Trade = 3, etc.
- Items are purchased with **$CRDS**.
- Items can **drop from Boss monsters** in the underworld.
- Items can be **crafted**: fuse upgraded items into new ones. This is the storytelling
  layer — each fusion is a discovery moment ("I built my own RSI").

### Ability adjustments within the item system

- **Ladder** — must become adjustable like Bracket (spacing / size curve / depth).
- **OCO** — must become automatically adaptive (the two legs rebalance as price moves,
  not static).
- **Bracket, Hedge, Radar, Rescue** — survive as items but no longer bound to cooldown.

### Game modes

| Mode | Time/Life | Resources | $CRDS earned | Upside-down | Abilities cap |
|---|---|---|---|---|---|
| **Creative (SDK)** | unlimited | unlimited | no | disabled | unlimited items |
| **Time\_is\_Money** | fixed session timer | finite items/HP | yes — primary goal | yes | 5 items (default) |
| **Trade (Phase 2)** | real market cadence | real USDC via Hyperliquid | no (real $) | yes | 3 items |

- **Creative** = the SDK sandbox. Fly, run, use items without constraint, no $CRDS.
  Think: "draw lines on a chart forever." No combat.
- **Time\_is\_Money** = the arcade loop. Fixed timer. Maximise $CRDS per session.
  This is the default competitive mode.
- **Trade** = Hyperliquid-backed real trading (deferred to Phase 2).

### Chart UX

- **Dynamic interval adjusting** — not locked to the five current timeframes. Let the
  player zoom in on a slice or out to a full dataset.
- **TradingView-style scroll** — both X-axis (time) and Y-axis (price) independently
  pannable by drag/scroll. Chart is an interactive canvas, not a fixed viewport.

---

## Part 2 — What breaks vs v0.6a (and what survives)

### Breaks

- `game.tick` and `game.creds` variables are renamed everywhere; all pill DOM updates
  need to rewire; all toast/log strings need to rewrite.
- `slotEls` and `ABILITIES` array (6 fixed time-cooldown slots) goes away. Replaced by
  an **inventory model**: a list of item instances the player picked in the start
  menu, each with its own charge count or trigger rules.
- Cooldown CSS/HUD (`#cd0..5`, the active-highlight outline) goes away. Replaced by
  per-item charge counters or cooldown-on-use.
- `restart()` needs to read a new `playerLoadout` (gear + selected items) from
  persistent state.

### Survives

- The entire SDK event model (`sdk.on('fill' | 'bracketClose' | ...)`) stays — items
  will use the same primitives internally. Items are just a different *trigger shell*
  around the same SDK calls.
- All the v0.6a work (real P&L, Sharpe, ATR bands, physics polish) carries forward
  unchanged.
- The mission + tutorial systems stay. Missions phrased against $CRDS/$RUN instead of
  Creds/TICK.
- The upside-down combat is retained for Time\_is\_Money mode and becomes the primary
  $CRDS source.
- Candle loader, perspective modes, juice pass — all retained.

---

## Part 3 — Open design questions (need Julian's call)

These are places the spec is underdetermined and I need a decision before building:

1. **Item charges vs. cooldowns.** Are items one-shot per run, or do they have N
   charges, or do they re-charge slowly over time? The spec says "cut the time-based
   system" — so probably *charges*, not seconds. Recommended: **each item has a finite
   charge pool per run, printed on the hotbar; charges regenerate by mining or by
   boss drops**.

2. **Gear slot key in UI.** Does pressing the weapon key swap between Pickaxe/Wand/Gun,
   or are those separate evolution stages (you only ever hold the currently-evolved
   form)? Spec says "Evolving" singular. Recommended: **evolution is linear; you own
   the highest stage you've unlocked**.

3. **"Curated" flying skins.** Who makes them? Recommended for prototype: **bundle
   3–5 well-designed flying skins (SVG) and call them "curated"; ignore creator
   uploads until after Phase 1**.

4. **How many items per run?** Spec says "unlimited / 5 / 3 / ... depending on game
   mode." Recommended starter numbers: **Creative unlimited, Time\_is\_Money 5, Trade
   3**.

5. **$CRDS forced-spend.** At end of run, show a spend screen with two buttons:
   *convert to $RUN at current rate* vs. *buy items*. If player closes the screen
   without spending, $CRDS goes to zero. Recommended: **soft warning + explicit Confirm
   button, not silent burn** (players will rage-quit if they close the tab and lose
   everything).

6. **Hyperliquid integration (Phase 2).** Out of scope for v0.7. Leave a
   `gameMode === 'trade'` branch that says "coming in Phase 2."

7. **Item crafting.** Full crafting = big scope. Recommended minimum: **a "Fuse" button
   in the item inventory that lets you combine 2 of the same item + some $RUN to
   produce a +1 version** (Bracket → Bracket+ → Bracket++). Deeper crafting trees
   later.

8. **Chart pan/zoom and game physics.** Pan/zoom on a running game is weird — if the
   player drags the chart, does the avatar move too? Recommended: **pan/zoom is only
   free in Creative (SDK) mode**; in Time\_is\_Money the camera follows the player;
   the avatar always anchors the active viewport.

---

## Part 4 — Phased rollout

Ship in three passes, smallest viable diff first. Each pass must end with a validated,
playable file.

### v0.7a — economy rename + game mode scaffolding (1 session)

Goal: nothing looks visually different in-game, but internal data model is aligned
for v0.7b. Rename all code references; add a game-mode enum; add a start-menu stub.

1. **Rename** `game.tick` → `game.run`, `game.creds` → `game.crds` across the file.
   Update pill DOM (`#tick` → `#run`, `#creds` → `#crds`), strings in the menu
   ("0 TICK" → "0 \$RUN", "0 Creds" → "0 \$CRDS"), toasts, logs.
2. **Add** a `gameMode` state: `'creative' | 'timeismoney' | 'trade'`. Default
   `'timeismoney'` to preserve current behaviour. No UI yet.
3. **Splash** gets three tiles: *Time is Money* (default, currently playable),
   *Creative SDK* (greyed, "coming v0.7b"), *Trade* (greyed, "Phase 2 — Hyperliquid").
   Only the first starts a run.
4. **Validate** node --check + playtest bot pass A/G.

### v0.7b — items replace abilities + start-menu loadout picker (1–2 sessions)

Goal: the six fixed ability slots become a loadout system. Minimum viable items.

1. **Item model**: `{ id, name, icon, charges, maxCharges, description, onFire(ctx) }`.
   `onFire` calls into the existing SDK (e.g. `sdk.bracket(...)`) — items are
   trigger-shells.
2. **Inventory**: `player.loadout` — an array of up to N item instances; slot keys
   1..N cycle through the loadout.
3. **Start menu**: a modal before run starts. Left column = owned items. Right column
   = chosen loadout. Drag/click to add. Button: Start Run.
4. **Port existing abilities** as items: Bracket, Ladder (now adjustable), OCO (now
   auto-adaptive stub — just make it re-issue on each bar close), Hedge, Radar, Rescue.
5. **Item drops**: one placeholder boss in the upside-down drops a random item
   instance on kill.
6. **$CRDS forced-spend**: end-of-run screen with two actions (convert to $RUN, buy
   item). Confirm button required.
7. **Validate**.

### v0.7c — gear stack + evolving weapon + chart pan/zoom (Creative mode) (2 sessions)

Goal: persistent meta-layer starts working. Creative mode becomes fully playable.

1. **Gear slots**: Skin / Riding / Flying / Weapon. Persisted to localStorage for now
   (NFT layer deferred — localStorage is an honest stub).
2. **Evolving weapon**: Pickaxe → Wand → Gun, triggered by hitting $RUN milestones.
   Each stage changes the mining/combat VFX.
3. **Creative mode**: no HP, no upside-down, unlimited item charges, no $CRDS earn.
4. **Chart pan/zoom in Creative**: mouse-drag pans X/Y; scroll zooms. In other modes,
   camera stays locked.
5. **Dynamic interval**: a slider (or +/- keys) that re-fetches candles at a custom
   interval once interval is a known Binance value; otherwise snap to nearest.
6. **Validate**.

### Phase 2 (out of scope for v0.7)

- Trade mode with Hyperliquid.
- Real NFT minting / marketplace for gear.
- Creator-uploaded skins.
- Deep item crafting trees.
- Seasonal competitions, veTICK/veRUN governance.

---

## Part 5 — First slice to cut this session

Recommended starter: **v0.7a — economy rename + game mode scaffolding.** It's low
risk, self-contained, validates in one session, and unblocks v0.7b cleanly.

What I'd ship in that first slice, concretely:
- Rename TICK → \$RUN and Creds → \$CRDS throughout HTML/JS (search + replace with
  care around pill DOM ids and the SDK).
- Add `game.mode` with three values; default `'timeismoney'`.
- Add a **three-tile splash** replacing the current single Play button. Only the
  first tile starts a run. The other two show "coming in v0.7b / Phase 2."
- Re-run the playtest bot on flow A (first-time player) and confirm no soft-lock.
- Bump README to v0.7a.

That leaves the item/loadout/gear work clean for v0.7b, with a stable currency model
underneath. If you want to jump straight into loadouts instead, say so and we start
with v0.7b — but expect ~2 sessions because item model + start menu + drops is a
bigger diff.
