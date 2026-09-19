# ChartRunner Public System Overview

ChartRunner is a playable chart game and gamified trading SDK. The public system is intentionally focused on the demo, the SDK boundary, and verifiable devnet programs.

## Public Surfaces

- `chartrunner.xyz/` - landing page
- `chartrunner.xyz/play/` - playable browser prototype with adaptive desktop, phone, and tablet controls
- `chartrunner.xyz/solana-connect/` - Solana devnet wallet bridge
- `chartrunner.xyz/telegram/` - Telegram/mobile prototype
- `anchor/` - public Solana devnet program source
- `docs/SDK.md` - public SDK status and package-readiness boundary

## Public Architecture Boundary

ChartRunnerSDK is the only path for order-like actions. The public repository includes paper/sandbox primitives, public interfaces, demo code, and devnet program source.

Standalone SDK package source, generated SDK browser artifacts, live broker execution, hosted agent transports, private data pipelines, premium bot logic, and marketplace operations are not part of the public surface until explicitly released.

## Public Status

- Playable prototype: live
- `/play/` mobile/tablet shell: adaptive portrait/landscape/tablet controls with chart-only mode rail and collapsible HOT tray live in `ChartRunner_Prototype.html`
- Latest public milestone: `2026-07-21` accounts/billing/data pass live as `v1.0.701`. Player accounts (e-mail + Google sign-in via Supabase) with one unified runner name; premium market panes (token lists, whale holders, stablecoin balances) now work keyless for every player through the hosted API gateway (server-side provider keys, edge-cached proxies for CoinGecko/Birdeye/GoldRush, Helius RPC); paid tiers (Runner Pro / Quant / Desk, monthly or annual) purchasable by card or SOL/USDC on `chartrunner.xyz/pricing.html` or in-game, with server-declared per-tier limits; e-mail notifications (alert/TP-SL/security mails, branded) configurable in Settings; campaign expanded to 100 levels (`v1.0.700`); UI pass: unified light styling in Platinum/B&W themes, inline room settings, single-tab alerts, reordered desktop icons. No broker routing, signing, or live execution was added.
- On-chain Pro purchase (SOL/USDC), on `chartrunner.xyz/pricing.html` and in-game (`v1.0.937`): the receiving address, the exact amount and a payment reference are issued per account by the ChartRunner server (`POST /v1/pay/sol/intent`). No public surface holds a payment address any more and none computes an amount in the browser; without that server response no payment request is built at all. The payment is watched by its reference (`GET /v1/pay/sol/status`) and Pro is granted server-side, so the on-chain path requires a signed-in account. Card checkout (Stripe) stays open to guests.
- Solana devnet maps/registry/oracle/match programs: public source and devnet-oriented
- SDK package: gated until publish-ready
- Mainnet/live trading: gated
