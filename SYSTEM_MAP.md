# ChartRunner Public System Overview

ChartRunner is a playable chart game and gamified trading SDK. The public system is intentionally focused on the demo, the SDK boundary, and verifiable devnet programs.

## Public Surfaces

- `chartrunner.xyz/` - landing page
- `chartrunner.xyz/play/` - playable browser prototype with adaptive desktop, phone, and tablet controls
- `chartrunner.xyz/solana-connect/` - Solana devnet wallet bridge
- `chartrunner.xyz/telegram/` - Telegram/mobile prototype
- `anchor/` - public Solana devnet program source
- `docs/SDK.md` - public SDK status and package-readiness boundary

## Workers and Services

The Cloudflare account behind ChartRunner holds **14 scripts** (count taken from the
IST-Abgleich of 2026-09-19 — this repository cannot count them). Only some have a
directory here. The split, as far as it is verifiable:

| Where the directory lives | Count | Verifiable here? |
|---|---|---|
| This repository (`workers/*/`) | **4** | **yes** — listed below |
| `ssjjul3/chartrunner-private-ops` | 7 | no |
| Orphaned, no directory anywhere (`my-worker`) | 1 | no |
| Not a ChartRunner script | 1 | no |
| *(4 + 7 + 1 + 1 = 13; the 14th is not resolved by the source report)* | | |

> The IST-Abgleich names **three** public worker directories. That is one short:
> `workers/ownership/` also carries a `wrangler.toml` and is deployed by the same
> auto-discovery. The table below is the repository's own count.

### The four workers in this repository

`deploy-workers.yml` deploys **every** `workers/*/` directory that has a Wrangler
config — adding a directory is all it takes. Everything in this table is checkable
from the files named in it:

| Directory | Script name | Route / trigger | `/health` | `git_sha` |
|---|---|---|---|---|
| `workers/account/` | `chartrunner-account` | `chartrunner.xyz/account/*` | **no** | no |
| `workers/alerts-cron/` | `chartrunner-alerts-cron` | no route — cron `*/5 * * * *`, plus a token-gated `*.workers.dev` trigger | **no** | no |
| `workers/hermes-proxy/` | `chartrunner-hermes-proxy` | `chartrunner.xyz/hermes/*` | **no** | no |
| `workers/ownership/` | `chartrunner-ownership` | `chartrunner.xyz/ownership/*`, `chartrunner.xyz/loadout*` | **yes** — `GET /ownership/health` (`src/index.js:619`) | **conditional** — `src/index.js:401-403` reports `git_sha` only when `GIT_SHA` is injected at deploy; otherwise `null`, with a note saying the worker cannot name its own commit |

**This is a defect list, not a status report.** Three of four public workers answer no
health path at all, so "is the merge live?" cannot be asked of them — it can only be
guessed from a green Actions run, which `CLAUDE.md` says explicitly is not the same
thing. The fourth answers, but names its commit only if the deploy injected it.

**None of the four is gated.** There is no `DEPLOY_GATE` anywhere in this repository
(`grep` finds no occurrence); the gate the IST-Abgleich describes covers `workers/tx`
and `workers/ohlc-store`, both of which live in the private repository. Between a merge
to `main` and `wrangler deploy` there is no check for these four.

### Services without a directory here

- **`chartrunner-worker`** — the money worker. No directory in this repository; visible
  only as a proxy target in `workers/alerts-cron/wrangler.toml`
  (`https://chartrunner-worker.jsg-951.workers.dev/v1/{birdeye,market,goldrush}`).
  Per the IST-Abgleich it answers **no** `/health` and carries **no** `git_sha` — taken
  over from that report, **not measured here**, and tracked as a defect.
- **Rooms** — `wss://rooms.chartrunner.xyz` (Hetzner, not Cloudflare). `/health` and
  `/stats` per `CLAUDE.md`; whether they answer is only measurable live.
- **`relay.chartrunner.xyz`** — legacy, unreliable, not to be assumed primary.

Claim-by-claim grounding for all of the above:
[docs/STATUS-2026-09-19.md](docs/STATUS-2026-09-19.md).

## Public Architecture Boundary

ChartRunnerSDK is the only path for order-like actions. The public repository includes paper/sandbox primitives, public interfaces, demo code, and devnet program source.

Standalone SDK package source, generated SDK browser artifacts, live broker execution, hosted agent transports, private data pipelines, premium bot logic, and marketplace operations are not part of the public surface until explicitly released.

## Public Status

> **Currency warning.** The milestone bullet below still describes
> `v1.0.701` (2026-07-21). The repository is at **`v1.0.936`**. The milestone text has
> not been re-verified line by line against that build, so it is left standing rather
> than silently re-dated. What is and is not verifiable is itemised in
> [docs/STATUS-2026-09-19.md](docs/STATUS-2026-09-19.md).

- Playable prototype: live
- `/play/` mobile/tablet shell: adaptive portrait/landscape/tablet controls with chart-only mode rail and collapsible HOT tray live in `ChartRunner_Prototype.html`
- Latest public milestone: `2026-07-21` accounts/billing/data pass live as `v1.0.701`. Player accounts (e-mail + Google sign-in via Supabase) with one unified runner name; premium market panes (token lists, whale holders, stablecoin balances) now work keyless for every player through the hosted API gateway (server-side provider keys, edge-cached proxies for CoinGecko/Birdeye/GoldRush, Helius RPC); paid tiers (Runner Pro / Quant / Desk, monthly or annual) offered on `chartrunner.xyz/pricing.html` and in-game, with server-declared per-tier limits (**what that offer actually unlocks — see the payment bullet below**); e-mail notifications (alert/TP-SL/security mails, branded) configurable in Settings; campaign expanded to 100 levels (`v1.0.700`); UI pass: unified light styling in Platinum/B&W themes, inline room settings, single-tab alerts, reordered desktop icons. No broker routing, signing, or live execution was added.
- **Payment paths — what actually unlocks a tier (repo-verifiable, 19.09.2026).** The
  offer and the unlock are not the same thing:
  - **SOL/USDC: unlocks nothing today.** `workers/ownership/wrangler.toml` ships
    `OWNERSHIP_CATALOG_JSON = "{}"` — its own comment reads *"Empty = ChartRunner sells
    nothing for SOL today"* — and leaves `OWNERSHIP_TREASURY` commented out, so the worker
    cannot check who was paid and refuses every `purchase_onchain` grant with
    503 `not_configured`.
  - **Card: unverified from this repo.** It hangs on a `STRIPE_SECRET_KEY` Wrangler secret;
    without it `subscription` is refused with 503. Secrets are not visible here, so whether
    the card path unlocks anything is **only measurable against the running worker**.
  - **Client side (`v1.0.938`): a payment is at least attributable now.** On
    `chartrunner.xyz/pricing.html` and in-game, the receiving address, the exact amount and
    a payment reference come solely from the ChartRunner server (`POST /v1/pay/sol/intent`),
    and the payment is watched by that reference (`GET /v1/pay/sol/status`). No public
    surface holds a payment address any more and none computes an amount in the browser;
    without that server response no payment request is built at all, so the on-chain path
    requires a signed-in account. This fixes **whom a payment could be credited to**. It
    does **not** soften the first bullet: whether anything is actually unlocked depends on
    server configuration that is not visible from here.
  - Rebuilding the server side of this path runs as its own assignment. `pricing.html`
    itself was moved onto the intent path in `v1.0.938`.

- Solana devnet maps/registry/oracle/match programs: public source and devnet-oriented
- SDK package: gated until publish-ready
- Mainnet/live trading: gated
