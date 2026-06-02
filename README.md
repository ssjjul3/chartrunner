# ChartRunner

> A playable chart game and gamified trading SDK prototype. Every trade-like game action travels through the `ChartRunnerSDK` boundary.

[![Live](https://img.shields.io/badge/live-chartrunner.xyz-14F195)](https://chartrunner.xyz/)
[![Game](https://img.shields.io/badge/play-chartrunner.xyz%2Fplay-orange)](https://chartrunner.xyz/play/)
[![Solana](https://img.shields.io/badge/solana-devnet%20proof-9945FF)](https://chartrunner.xyz/solana-connect/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

## Live Surfaces

| Surface | URL | Public role |
|---|---|---|
| Landing | https://chartrunner.xyz/ | Public project overview |
| Game | https://chartrunner.xyz/play/ | Playable browser prototype with adaptive desktop, phone, and tablet controls |
| Wallet bridge | https://chartrunner.xyz/solana-connect/ | Explicit wallet/devnet handoff |
| Docs | https://chartrunner.xyz/docs/ | Public SDK boundary and devnet reference |

## What It Is

ChartRunner is a trading education game where players run on live-looking chart candles, fight market pressure, and learn trading primitives by using them as game abilities. Brackets, OCOs, ladders, hedges, alerts, and rescue moves all share one rule: the UI does not issue orders directly.

The architectural invariant is the product:

```text
game input -> ChartRunnerSDK intent -> risk/wallet/broker boundary -> result
```

The public repo demonstrates the playable game, the SDK call shape, public devnet proof, and the wallet approval boundary. Premium execution, hosted agents, private market data, replay corpora, bot tuning, and unpublished SDK packages stay gated until they are intentionally released.

## Public Boundary

Public:

- The browser-playable prototype in `ChartRunner_Prototype.html` and `/play`.
- Adaptive `/play/` mobile/tablet controls: chart-only mode rail, collapsible HOT tray, bottom-right runner controls, mobile app sheets, tap-to-run, and two-finger chart movement.
- Paper/sandbox trading primitives and explicit wallet/devnet handoff.
- Public Anchor source under `anchor/programs`.
- Devnet program IDs and Explorer links.
- Boundary docs in [docs/SDK.md](docs/SDK.md) and [docs/PUBLIC_BOUNDARY.md](docs/PUBLIC_BOUNDARY.md).
- Leakage guard scripts that prevent private paths and terms from re-entering the public repo.

Gated:

- Standalone SDK package source and generated browser artifacts until publish-ready.
- Live execution adapters, venue routing, and production market-data depth.
- Hosted bot/agent transports and private bridge configuration.
- Partner submissions, monetization plans, strategy-heavy concepts, backtest corpora, and ops logs.

## Devnet Proof

These programs are public devnet proof surfaces. They show the intended on-chain boundary without publishing private execution or monetization playbooks.

| Program | Address | Public job |
|---|---|---|
| `chartrunner_maps` | [`DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH`](https://explorer.solana.com/address/DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH?cluster=devnet) | Map hash/index proof |
| `chartrunner_registry` | [`ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn`](https://explorer.solana.com/address/ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn?cluster=devnet) | Profiles, run records, marketplace-shaped records |
| `chartrunner_oracle` | [`4vfZVDfDzhR79qdaUdPAzRwUHYB5qbgNwTGBwfy6i5wH`](https://explorer.solana.com/address/4vfZVDfDzhR79qdaUdPAzRwUHYB5qbgNwTGBwfy6i5wH?cluster=devnet) | Price certificate proof boundary |
| `chartrunner_match` | [`3mzEAWZVtTV7sjqkRrPAbB3tT7bA3vVx5wyYQZvfp5zu`](https://explorer.solana.com/address/3mzEAWZVtTV7sjqkRrPAbB3tT7bA3vVx5wyYQZvfp5zu?cluster=devnet) | Match-state proof boundary |

IDLs live at [anchor/target/idl](anchor/target/idl). Program source lives under [anchor/programs](anchor/programs).

## Local Use

Open the single-file prototype directly:

```sh
open ChartRunner_Prototype.html
```

Or serve the repository locally:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080/chartrunner-prototype/`.

## Verification

Run these before publishing public changes:

```sh
node scripts/check_public_leakage.mjs
node scripts/test_public_leakage_guard.mjs
node /Users/julianroy/.agents/skills/chartrunner-playtest-verifier/scripts/check-prototype-js.mjs ChartRunner_Prototype.html
```

## Repository Map

| Path | Role |
|---|---|
| `ChartRunner_Prototype.html` | Playable single-file game prototype |
| `chartrunner-prototype/` | GitHub Pages public deploy surface |
| `solana-connect/` | Wallet/devnet bridge |
| `anchor/` | Public Anchor source, IDLs, and tests |
| `docs/` | Public docs only |
| `docs/milestones/` | Public milestone notes |
| `scripts/check_public_leakage.mjs` | CI guard for private/public boundary |
