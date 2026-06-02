# Security Posture

ChartRunner treats security as part of the product boundary. The public repo demonstrates a playable browser prototype, explicit wallet/devnet handoff, and public Anchor source. Production execution, hosted agents, private data, and premium bot systems stay gated.

## Public Scope

| Surface | Public security concern |
|---|---|
| `ChartRunner_Prototype.html` | Browser-only game state, paper/sandbox primitives, no hidden order path |
| `solana-connect/` | Explicit wallet connection and devnet transaction handoff |
| `anchor/programs/chartrunner-maps` | Map hash/index proof |
| `anchor/programs/chartrunner-registry` | Profiles, run records, and marketplace-shaped records |
| `anchor/programs/chartrunner-oracle` | Price-certificate proof boundary |
| `anchor/programs/chartrunner-match` | Match-state proof boundary |

## Core Rules

- UI controls, game abilities, bots, and widgets may create intents; they do not issue orders directly.
- `ChartRunnerSDK` is the only order-like intent path.
- Wallet approval must be visible and explicit.
- Live execution adapters, venue routing, production infrastructure, and hosted agent transport are not public-release surfaces.
- Public demos may use paper fills, sandbox behavior, and devnet proof only.

## Client Posture

- Static GitHub Pages deploy.
- No required backend for the public playable demo.
- Browser state is local and namespaced.
- Wallet use is explicit and approval-driven.
- Public build hides or gates private/local-only systems.

## On-Chain Posture

The public Anchor programs are devnet proof surfaces. They should be audited before any production release involving value, payments, or execution.

Recommended audit focus:

- PDA seed correctness and account ownership checks.
- Reinitialization resistance for map/profile-style records.
- Checked arithmetic around listing/payment-shaped records.
- Race conditions around cancel/list/buy-shaped flows.
- Rent refunds and account close targets.
- Score/run-record caps and input validation.
- Upgrade-authority and deployment governance.

## Disclosure

Security reports should go to `info@chartrunner.xyz`. Include the affected public surface, reproduction steps, expected impact, and whether the issue touches wallet approval or order-like intent paths.

Private ops notes, audit-credit applications, partner-specific scoping, and commercial release plans are kept outside the public repo.
