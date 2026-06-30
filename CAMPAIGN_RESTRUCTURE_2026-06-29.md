# ChartRunner Campaign — Restructure Proposal

Date: 2026-06-29 · Status: proposal for approval (no chapter renumber shipped yet)
Author: Cowork session · Source of truth: `CAMPAIGN_CHAPTERS` / `SCRIPTS` in `ChartRunner_Prototype.html`

This proposal acts on the directives: keep every campaign run **BTC/15m** and rewrite chapter copy to match (decision **B**); standardize **Activation / Alert** wording; move **all trading-activation content (blue laser, brokers, Phoenix, PvP) to the end** because live trading is Phase 2 / not yet live; weave **wallet-gating** into the progression; teach the **basics that are currently skipped** (drag-and-drop panes, map setup/label/save, marketplace); and **scaffold** chapters for incoming progression-gated content.

---

## 1. The core principle: three acts that mirror what's actually live

Today the 41 chapters are one flat ladder (Tools → Primitives → Indicators → Bots → Foundation → Live → Execution). The problem the audits keep hitting: **planning skills that work right now are interleaved with trading-execution skills that are Phase-2 and don't actually route**. A new player can't tell what's real.

Re-cast the campaign as three acts, gated by what is live:

- **ACT I — READ THE CHART** (free · guest · paper). Pure charting + reading. Everything works with no wallet, no execution. This is the bulk of teachable value today.
- **ACT II — CONNECT & PERSIST** (wallet-gated). Identity, Maps, Journal, bots, leaderboards. Requires a connected Solana wallet; the campaign explicitly hands off to "Connect to continue."
- **ACT III — TRADE** (Phase 2 · progression-gated · "coming soon"). Order **activation** (blue laser), brokers, Phoenix overlays, PvP, and the marketplace. Visible but flagged as gated, so the story has a clear "horizon," and the chapters are pre-built (scaffolded) for when execution goes live.

Rule of thumb: **placing** an object is planning (Act I, paper). **Arming/routing** it is trading (Act III, gated). The Red Laser (hotkey 2, draw/place) lives in Act I; the **Blue Laser / Activation (hotkey 3) and Alert (hotkey 4)** lasers live in Act III.

---

## 2. Proposed structure (renumbered)

Legend: 🟢 free/guest · 🔵 wallet-gated · 🟣 Phase-2 gated (coming soon) · ✨ NEW chapter

### ACT I — READ THE CHART (free, paper, BTC/15m)
- 🟢 **Ch.0 · Trading Desk** — toolbar tour (asset, timeframe, scroller, mini-map, object tree, indicators, perspective). *Shipped.*
- 🟢✨ **Ch.A · Move & Survive** — the actual game basics a first-timer is currently never told: move (◀▶), jump (▲), flight (↑↑), upside-down (↓↓), collect, avoid wicks, reach the goal. (Today this is only in the separate first-run tour, not the campaign.)
- 🟢✨ **Ch.B · Drag & Pin** — introduce **drag-and-drop**: drag a terminal/Run pane or a token row out and pin it to the chart. Reuses the existing desktop drag-demo cursor. Pairs with on-chart labels while charting.
- 🟢 **Tools** — Trendline, Horizontal Line, Anchored VWAP, Fib Retracement, Fib Extension, FRVP, Ray, Parallel Channel, Rectangle.
- 🟢 **Indicators** — Reference Levels, RSI, EMA, Volume, Ichimoku, MACD, Bollinger, ATR. *(Indicators precede order-planning so the reads inform the plan — moved up.)*
- 🟢 **Plan the trade (paper objects)** — Bracket, OCO, Limit, Ladder, Stop-Loss-At, Take-Profit-At, Trailing TP, Market, Scale-Out, TWAP. Taught as **paper setups with risk math** — placed, edited, never routed. (This is the current Primitives section, reframed as "planning," not "executing.")
- 🟢 **Foundation / reading** — Confluence Score, CCV Setup, Patterns, Risk Management, Multi-Timeframe.
- 🟢✨ **Ch.C · Save your read (Map basics)** — set up, **label, and save a Map** (asset, timeframe, indicators, placed objects). Guest can *build* and preview a map; **saving on-chain/sharing is the Act II hand-off.** This is the missing bridge the directive calls out.

### ACT II — CONNECT & PERSIST (wallet-gated 🔵)
- 🔵 **Ch.D · Connect & claim your name** — connect a Solana wallet, claim the on-chain runner name. The campaign blocks here for guests with a clear "Connect to unlock the next act."
- 🔵 **Ch.E · Maps** — save, label, organize into folders, share a live room link.
- 🔵 **Ch.F · Journal** — auto-log trades, the pre-trade checklist, review P&L.
- 🔵 **Bots** — SFP Hunter (free), then Volume Climax / VWAP Reclaim / CCV / Order Block / Divergence. Taught on **seeded chart moments** so the detector fires fast (fixes the "feels broken while waiting for a ring" problem).
- 🔵 **Ch.G · Leaderboards & best runs** — record a best run on-chain, see the board.

### ACT III — TRADE (Phase 2, gated 🟣 "coming soon")
- 🟣 **Ch.H · Activation Laser** — hotkey **3**: arm a placed order so it can route. Unlocks leverage + broker.
- 🟣 **Ch.I · Alert Laser** — hotkey **4**: set a price alert/alarm. Unlocks the alert log + Journal alerts.
- 🟣 **Broker chapters — one per broker, each teaching that broker's single strength:**
  - 🟣 **Phoenix** — on-chain CLOB on Solana: tightest book, maker rebates, fully on-chain settlement. *(This is the current Ch.39 "Phoenix Overlays," promoted into the broker set.)*
  - 🟣 **Drift** — Solana perps: cross-margin, funding, deep perp liquidity.
  - 🟣 **Jupiter** — best-route aggregation across Solana DEXs: one click, best fill.
  - 🟣 **CEX (Binance/OKX/Bybit)** — spot + the deepest books for majors.
  (Each is a self-contained lesson highlighting one feature/strength, per the directive.)
- 🟣 **Ch.J · Marketplace** — list/sell a saved Map, bot, or strategy for $SOL; buy others'. The "later, when marketplace comes up, how to trade it" payoff the directive asks for.
- 🟣 **Ch.K · Arena / PvP** — 1v1 / 2v2 / Rumble / Tournament. Already PL10-gated.

This puts **everything that doesn't actually execute yet at the tail**, clearly flagged, while the front of the campaign is 100% real and playable.

---

## 3. App-coverage matrix (which surface each act teaches)

| Surface / app | Taught today? | Proposed chapter |
|---|---|---|
| Chart toolbar (asset/tf/cursor/minimap/objtree/indicators/perspective) | partial (Ch.0) | Ch.0 ✅ |
| Movement / flight / upside-down | ❌ (only first-run tour) | Ch.A ✨ |
| Drag-and-drop panes / pin to chart | ❌ | Ch.B ✨ |
| Drawing tools (red laser, hotkey 2) | ✅ | Act I Tools |
| Indicators | ✅ | Act I Indicators |
| Order objects (paper) | ✅ (as "Primitives") | Act I "Plan the trade" |
| Foundation/reading | ✅ | Act I Foundation |
| **Maps: setup/label/save** | ❌ | Ch.C (build) + Ch.E (save/share) ✨ |
| Wallet connect / on-chain name | ❌ in campaign | Ch.D ✨ |
| Journal | ❌ in campaign | Ch.F ✨ |
| Bots | ✅ (28–33) | Act II Bots (seeded) |
| Leaderboards / best run | ❌ | Ch.G ✨ |
| Activation / Alert lasers | ✅ (40/41) | Act III H/I |
| Brokers (Phoenix/Drift/Jupiter/CEX) | ❌ (only Phoenix, archived) | Act III broker set ✨ |
| **Marketplace (trade a map/bot for $SOL)** | ❌ | Ch.J ✨ |
| Token research | ❌ in campaign | optional Act I/II side-chapter |
| Terminal (data panes) | ❌ in campaign | folded into Ch.B drag-and-drop |
| PvP / Arena | ✅ (gated) | Ch.K |

**Gaps the directive specifically flags and this plan closes:** movement basics, drag-and-drop, map setup/label/save, marketplace trading, per-broker chapters, connect/Journal as taught steps.

---

## 4. Wallet-gating model

- **Act I** never requires a wallet. A guest completes the entire charting/reading curriculum.
- The **Act I → Act II boundary is the single connect wall** (Ch.D). The campaign shows a clear "Connect a Solana wallet to continue — Maps, Journal, bots and on-chain progress" gate, reusing the existing `crGuest()` / `_nameVisibleForCurrentWallet()` logic and the on-connect name-claim flow.
- Chapters tagged 🔵 are hidden or shown locked-with-explainer for guests (mirror the bot/gear/weapon "connect to unlock" treatment already shipped in v1.0.569).
- Chapters tagged 🟣 render as **"COMING SOON · Phase 2"** cards — visible (so the roadmap is legible) but not launchable, until live trading ships. This is the scaffold the directive asks for: the chapter shells exist now and light up when the feature lands.

---

## 5. Implementation items (post-approval, in priority order)

1. **Decision B copy rewrite** — strip "BTC 4h / SOL / ETH 1h / Ichimoku ETH 4h" etc. from every chapter `goal`/`tip`; all copy reads BTC/15m (the launcher already forces it). Low-risk, do first.
2. **Reorder + renumber** to the three-act structure above; mark 🔵/🟣 on `CAMPAIGN_CHAPTERS` (`walletGated`, `phase2` flags) and gate the cards/launch accordingly.
3. **Unify the in-chapter coach to the COACH.llm window layout** — the campaign currently uses `#crCoachOverlay` (its own chrome) while the desktop first-run tour uses the COACH.llm bubble (`#crFrPop` + `.cr-tut-terminal-bubble`). Re-skin the campaign coach to the same bubble so onboarding + campaign feel like one system. *(Directive 7.)*
4. **Add the ghost-window / ring-beacon-arrow highlighting to campaign** — reuse the first-run tour's `reposition()` ring + `_frDragDemo` ghost cursor so campaign highlights match the desktop tutorial. *(Directive 8.)*
5. **Seeded deterministic snapshots** for indicator/bot/foundation chapters so the taught pattern fires immediately instead of waiting on live detection.
6. **New chapters** Ch.A/B/C/D/E/F/G/J + the broker set (content + scripts).
7. **Desktop + mobile flow audit** of every chapter (see §6).

Already shipped toward this: Ch.0 toolbar tour (1.0.577), cause→effect demos (1.0.578), forced first beat (1.0.579), anchor guidance on a real swing (1.0.580–581), Ch.0 target fix (1.0.582), **toolbar pinned during campaign (1.0.583)**.

---

## 6. Desktop + mobile flow audit — status

I can drive the **Chrome extension** (and have been — that's how the "toolbar y=−11" claim was disproven and the hidden-target bug found). I **cannot** drive your Hermes/OpenClaw agents from this session; if you want their passes, run them on your box and drop the report into the repo and I'll fold it in.

Open audit checks to run per chapter, desktop **and** mobile:
- Does the spotlight target exist and sit on-screen in that chapter's layout? (Ch.0 already fixed two hidden targets.)
- On mobile, are the toolbar controls reachable, and does the COACH bubble dock as the bottom sheet without covering the spotlight?
- Does each chapter's one required action complete and advance cleanly?
- Does the anchor ring land on a candle and track on both pointer + touch?

---

## 7. Open decisions for you
1. Approve the **three-act order** (esp. moving brokers/Phoenix/blue-laser/PvP/marketplace into a flagged Act III)?
2. Broker set — confirm **Phoenix · Drift · Jupiter · CEX** (add/remove any)?
3. Movement basics (Ch.A): a dedicated campaign chapter, or keep it only in the first-run tour and just cross-link?
4. Should 🟣 Phase-2 chapters be **visible-but-locked cards** now (recommended, scaffolds the story), or hidden until trading is live?
