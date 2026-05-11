# ChartRunner — Zerion CLI Frontier Hackathon Track
**Track:** Zerion · Build an Autonomous Onchain Agent using the Zerion CLI
**Prize:** $5k USDC
**Status:** integrated in v1.0.56 (Day 12-13 of post-Frontier sprint)

---

## What we shipped

ChartRunner's **Workbench bot system** — Pine v5 detectors that scan candles for trading patterns — is now exposed as a **registry of autonomous on-chain agents** compatible with the Zerion CLI agent interface. Six pre-built detector-agents ship today; players can register their own custom detectors as agents via a single function call.

This isn't a separate agent SDK bolted onto the game. It's the same `sdk.detectCCV()` / `sdk.detectSFP()` / `sdk.detectHnS()` / `sdk.detectBARR()` / `sdk.detectFailedAuction()` / `sdk.detectOIConfirm()` that the in-game Coach + the Confluence Score widget have been using since v0.9.x — wrapped in a `ZerionAgent` class that turns each detector into an autonomous trader.

## The agent shape

```js
class ZerionAgent {
  describe()  →  { name, type, chain, mint, capabilities }
  run(ctx)    →  Promise<{ decisions: [{
                   action: 'BUY'|'SELL'|'HOLD',
                   mint, size, reason, confidence,
                   setup    // raw detector payload
                 }] }>
  execute(d, broker) →  Promise<fill>   // optional auto-route via broker
}
```

The `ctx` passed to `run()`:
```js
{
  wallet:    Solana pubkey,
  portfolio: { sol, tokens: [{ mint, symbol, amount, valueUsd }] },
  chain:     'solana',
  asset:     'btc' | 'sol' | 'wif' | ...,
  timeframe: '15m' | '1h' | '4h' | '1D',
  candles:   OHLC[],
  side:      'buy' | 'sell',   // optional
}
```

A decision is **pure** — it surfaces a recommendation. The caller (the player, or an upstream automation layer) decides whether to fire `agent.execute(decision, broker)` which hands the order to the v1.0.53 Jupiter or v1.0.54 Jito broker.

## Why this is "autonomous"

Each agent has full control of its own analysis loop:
- Reads the wallet portfolio via `fetchPortfolio(walletPubkey)` against the Zerion API
- Reads the chart candles passed in by the host (ChartRunner game or external runner)
- Runs its detector function — same code path the game uses for live signals
- Sizes the order based on a pluggable `sizeStrategy` (default: 1% of SOL balance, clamped to [0.01, 1.0] SOL)
- Emits a decision payload that's directly executable via any of our 5 broker drivers

The "autonomous" loop in production:
```
every N seconds:
  for each registered agent:
    portfolio  = await fetchPortfolio(wallet)
    decisions  = await agent.run({ wallet, portfolio, candles, ... })
    for each decision in decisions:
      if decision.confidence > threshold:
        await agent.execute(decision, currentBroker())
```

For the hackathon submission we ship the agents + the registry + the portfolio helper. The autonomous loop is a 10-line shell script the user can run with `node` — kept out of the agent module itself so the agents can also be used in non-autonomous (player-supervised) mode inside the game.

## Pre-built agents

| Agent | Wraps | When it fires |
|---|---|---|
| `ccvAgent` | `sdk.detectCCV` | Counter-Candle-Volume divergence — bar volume rises against the prevailing close. High precision on liquid majors. |
| `sfpAgent` | `sdk.detectSFP` | Swing Failure Pattern — wick rejection at prior high/low. Best on 15m–1h after a strong impulse. |
| `hnsAgent` | `sdk.detectHnS` | Head & Shoulders reversal — three-peak structure with neckline confirmation. 1h+ TFs only. |
| `barrAgent` | `sdk.detectBARR` | Bar-At-Range-Rejection — bar closes at the extreme of a multi-bar range. Continuation signal. |
| `faAgent` | `sdk.detectFailedAuction` | Failed auction — price probes a level, fails to follow through, snaps back. Mean-revert. |
| `oiAgent` | `sdk.detectOIConfirm` | OI confirmation — directional price move alongside OI expansion. Crowd commitment signal. |

## Why this wins the Zerion track

The track asks for "an autonomous on-chain agent **using the Zerion CLI**." ChartRunner answers two ways:

### 1 — Portfolio-aware pattern detection

Most pattern-detector bots run in isolation: they see the chart, not the wallet. Our agents consume the Zerion portfolio API (`/v1/wallets/<pubkey>/positions?filter[chain_ids]=solana`) before sizing each decision. So the same SFP detection on a wallet with 0.1 SOL fires a 0.001 SOL order; on a wallet with 100 SOL it fires a 1.0 SOL order. Risk-scaled by portfolio state, not chart state.

### 2 — Player-friendly + agent-friendly with one codebase

The Pine v5 detector code is the load-bearing piece. It runs in three places without modification:
- **Inside ChartRunner game** — the in-game Coach signals when SFP fires on the player's chart
- **As a Zerion agent** — same function, wrapped in the `ZerionAgent` class
- **As an external runner** — the autonomous shell script imports the same module

One detector, three deployment targets. That's the agent-SDK story Zerion wants Solana to have.

## Technical integration

### File: `sdk-m1-scaffold/sdk/agents/zerion-cli.js`

Three exports:
- `ZerionAgent` base class (wrappable around any detector function)
- 6 pre-built agents (`ccvAgent`, `sfpAgent`, `hnsAgent`, `barrAgent`, `faAgent`, `oiAgent`)
- Registry API: `registerAgent(key, agent)` / `listAgents()` / `getAgent(key)`
- `fetchPortfolio(walletPubkey)` — Zerion API wrapper with stub fallback when no API key is configured

### Browser global

```js
window.crAgents = {
  list, get, register, fetchPortfolio, ZerionAgent
};
```

So in-game UI can show "Active agents" in the Workbench (M3 deliverable) or in DevTools the user can `await window.crAgents.get('sfp').run({ ... })` to test.

### Auto-execute via broker chassis

```js
const agent  = window.crAgents.get('sfp');
const port   = await window.crAgents.fetchPortfolio('<wallet>');
const result = await agent.run({ ... });
for(const d of result.decisions){
  if(d.confidence > 0.7){
    await agent.execute(d, currentBroker());  // routes via Jupiter or Jito
  }
}
```

The `currentBroker()` import comes from `sdk-m1-scaffold/sdk/brokers/index.js` — five drivers in the registry, ready to settle the agent's decision on-chain.

## Submission package

- **Project title:** ChartRunner — 6 autonomous pattern-detector agents on Zerion CLI
- **Description:** ChartRunner's Workbench bot system wrapped as Zerion-CLI-compatible agents. 6 pre-built detectors (CCV, SFP, H&S, BARR, Failed Auction, OI Confirm) consume the Zerion portfolio API to risk-scale decisions, then execute via the ChartRunner broker chassis (Jupiter / Jito / Mock). Same detector code runs inside the game's Coach AND as autonomous agents — one detector, three deployment targets.
- **GitHub:** github.com/\<owner\>/chartrunner · `sdk-m1-scaffold/sdk/agents/zerion-cli.js`
- **Website:** chartrunner.xyz
- **Demo path:** `window.crAgents.list()` in DevTools → `window.crAgents.get('sfp').run({ ... })` → decision payload includes `setup`, `confidence`, `size` → optionally `agent.execute(decision, currentBroker())` to land on-chain via Jupiter or Jito
- **Sponsor integrated:** Zerion (portfolio API + agent interface conventions)

## Tweet draft

> 🦅 6 ChartRunner pattern detectors just became autonomous @zerion agents.
>
> CCV · SFP · H&S · BARR · Failed Auction · OI Confirm. Each reads your wallet via Zerion, sizes orders by portfolio state, fires through the ChartRunner broker chassis (Jupiter / Jito).
>
> Same detector code runs inside the game's Coach. One signal, three deployment targets.
>
> 🔗 chartrunner.xyz · @zerion Frontier Track
