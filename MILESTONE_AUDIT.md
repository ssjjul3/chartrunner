# ChartRunner Public Roadmap Status

This public roadmap summarizes product direction without exposing private operations, data strategy, partner submissions, or internal agent logs.

## Current Public State

- Playable browser prototype is live.
- `/play/` mobile/tablet shell is live with chart-only mode rail, collapsible HOT tray, tap-to-run, two-finger chart movement, runner controls, and mobile app sheets.
- Solana devnet wallet bridge is live.
- Anchor program source is public.
- Standalone SDK package source and generated `/sdk/` artifacts are gated until publish-ready.
- Mainnet and live broker execution are not shipped.

## Public Roadmap

| Area | Status |
|---|---|
| Playable chart game | Live prototype; adaptive `/play/` mobile/tablet controls shipped |
| SDK extraction | Prototype runtime bundled; standalone package gated |
| Solana devnet programs | Public source, devnet deployment |
| Wallet identity | Prototype/devnet path |
| Marketplace | Devnet/prototype path |
| Coach and agents | Public demo surfaces only |
| Premium bots/data | Gated/private |
| Live trading adapters | Gated/private |
| Mainnet deployment | Future |

## Boundary

Private operations, hosted bridges, data pipelines, bot tuning, competition playbooks, and monetization details are maintained outside the public repository.

## Latest Public Milestone

- `2026-06-02`: `/play/` mobile shell release (`v1.0.214`) and control cleanup (`v1.0.215`) shipped. See [docs/milestones/2026-06-02-play-mobile-shell.md](docs/milestones/2026-06-02-play-mobile-shell.md).
- `2026-06-03`: `/play/` boot overlay hitbox hotfix (`v1.0.216`) shipped so dismissed guest/login chrome no longer intercepts terminal pane widget close/delete clicks.
