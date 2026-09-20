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
| This repository (`workers/*/`) | **3** | **yes** — listed below |
| `ssjjul3/chartrunner-private-ops` | 7 | no |
| Orphaned, no directory anywhere (`my-worker`) | 1 | no |
| Deployed, directory retired 2026-09-20 (`chartrunner-hermes-proxy`) | 1 | no |
| Not a ChartRunner script | 1 | no |
| *(3 + 7 + 1 + 1 + 1 = 13; the 14th is not resolved by the source report)* | | |

> **`chartrunner-hermes-proxy` moved rows on 2026-09-20, it did not disappear.**
> The Pyth cleanup deleted `workers/hermes-proxy/` from this repository, so
> auto-discovery no longer deploys it. Deleting a directory does not delete a
> deployed script: the worker, the route `chartrunner.xyz/hermes/*` and the
> `HERMES_API_KEY` secret slot live in the Cloudflare dashboard and only a human
> can remove them there. Until that happens the script is still deployed and
> still answers — with `503 hermes_key_unset`, as it always did.

### The three workers in this repository

`deploy-workers.yml` deploys **every** `workers/*/` directory that has a Wrangler
config — adding a directory is all it takes. Everything in this table is checkable
from the files named in it:

| Directory | Script name | Route / trigger | `/health` | `git_sha` |
|---|---|---|---|---|
| `workers/account/` | `chartrunner-account` | `chartrunner.xyz/account/*` | **no** | no |
| `workers/alerts-cron/` | `chartrunner-alerts-cron` | no route — cron `*/5 * * * *`, plus a token-gated `*.workers.dev` trigger | **no** | no |
| `workers/ownership/` | `chartrunner-ownership` | `chartrunner.xyz/ownership/*`, `chartrunner.xyz/loadout*` | **yes** — `GET /ownership/health` (`src/index.js:619`) | **conditional** — `src/index.js:401-403` reports `git_sha` only when `GIT_SHA` is injected at deploy; otherwise `null`, with a note saying the worker cannot name its own commit |

**This is a defect list, not a status report.** Two of three public workers answer no
health path at all, so "is the merge live?" cannot be asked of them — it can only be
guessed from a green Actions run, which `CLAUDE.md` says explicitly is not the same
thing. The third answers, but names its commit only if the deploy injected it.

**None of the three is gated.** There is no `DEPLOY_GATE` anywhere in this repository
(`grep` finds no occurrence); the gate the IST-Abgleich describes covers `workers/tx`
and `workers/ohlc-store`, both of which live in the private repository. Between a merge
to `main` and `wrangler deploy` there is no check for these three.

### Services without a directory here

- **`chartrunner-worker`** — the money worker. No directory in this repository; visible
  only as a proxy target in `workers/alerts-cron/wrangler.toml`
  (`https://chartrunner-worker.jsg-951.workers.dev/v1/{birdeye,market,goldrush}`) — of
  which `/v1/birdeye` no longer has an upstream, see **Data providers** below.
  Per the IST-Abgleich it answers **no** `/health` and carries **no** `git_sha` — taken
  over from that report, **not measured here**, and tracked as a defect.
- **Rooms** — `wss://rooms.chartrunner.xyz` (Hetzner, not Cloudflare). `/health` and
  `/stats` per `CLAUDE.md`; whether they answer is only measurable live.
- **`relay.chartrunner.xyz`** — legacy, unreliable, not to be assumed primary.
- **`chartrunner-hermes-proxy`** — retired here on 2026-09-20 (see the note above),
  still deployed in Cloudflare until it is deleted by hand. Nothing in this
  repository calls it any more.

Claim-by-claim grounding for all of the above:
[docs/STATUS-2026-09-19.md](docs/STATUS-2026-09-19.md).

## Data providers

Which third party answers which question. Everything here is read from this
repository; nothing in this section was measured against a running service.

| Provider | What it answers | Where |
|---|---|---|
| **Helius** | Solana RPC, DAS asset reads, webhooks | through the money worker's `/v1/rpc`; no key in this repo |
| **CoinGecko / GeckoTerminal** | catalogue prices, top-500 market rows, OHLC for alts | client, via the hosted gateway |
| **Jupiter** | quotes, market swaps, Trigger orders | the trading path — `workers/tx` (private repo) |
| **GoldRush (Covalent)** | latest transaction signature per watched wallet | **wallet-watch mails only** — `workers/alerts-cron/src/index.js:438-445`, cron `*/5 * * * *`, via the money worker's `/v1/goldrush` proxy. This is the provider's only job. |
| Binance | 24h ticker and the 60-bar klines behind the sparklines | client, direct |
| DexScreener | pair price, liquidity, age for resolved mints | client, direct |

**Removed 2026-09-20 — Pyth / Hermes.** It was the verified headline price
(`TOK_PYTH_FEED`, `chartrunner.xyz/hermes/*`). Gone from the client, from the
Telegram Mini App, from `solana-connect/`, and the proxy worker's directory is
deleted. The on-chain program `anchor/programs/chartrunner-oracle` still cites
Pyth — it is a devnet artifact, not a price source for the game, and it was
deliberately left standing.

**Removed earlier — Birdeye.** The provider is out of the money worker.
`BIRDEYE_API_KEY` was never set, so every call already answered 503. **Its
client-side residue is still in this repository** and is a known open item, not
a claim that Birdeye is in use: `window.crBirdeye`
(`ChartRunner_Prototype.html:107008`) still points at
`chartrunner-worker…/v1/birdeye`, and `TOK_BIRDEYE_MINT` is still read as one
of three mint sources by the trading path. The chain leads nowhere; unpicking
it touches the Radar panes, the safety verdict and the OHLCV path and is its own
assignment.

**The full chain — which surface asks whom, in what order, and what happens on
failure — is described in `docs/DATENKETTE-2026-09-20.md` in the private
repository `ssjjul3/chartrunner-private-ops`.** That file is not reachable from
this repository and was not available to the session that wrote this section.

## Public Architecture Boundary

ChartRunnerSDK is the only path for order-like actions. The public repository includes paper/sandbox primitives, public interfaces, demo code, and devnet program source.

Standalone SDK package source, generated SDK browser artifacts, live broker execution, hosted agent transports, private data pipelines, premium bot logic, and marketplace operations are not part of the public surface until explicitly released.

## Public Status

> **Currency warning.** The milestone bullet below still describes
> `v1.0.701` (2026-07-21). The repository is at **`v1.0.940`**. The milestone text has
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
