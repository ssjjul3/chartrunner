# ChartRunner Alert Engine — server tier (cron)

Makes standing alerts fire **even while you're not playing**. Every 5 minutes
this worker reads armed alerts from Supabase (`cr_alerts`), checks each one
server-side against Birdeye, and e-mails triggers via Resend. The in-browser
`crAlertEngine` still handles the app-open case; this covers offline.

No public route — it runs only on the cron schedule (plus a token-gated manual
trigger for testing). `deploy-workers.yml` auto-discovers and deploys it on push
to `main` (just like `hermes-proxy`).

## What it checks

Mirrors the client's `crAlertEngine._evaluate` exactly:

| type          | source (Birdeye)                     | fires when                              |
| ------------- | ------------------------------------ | --------------------------------------- |
| `price_above` | `/defi/token_overview` `.price`      | price ≥ threshold                       |
| `price_below` | `/defi/token_overview` `.price`      | price ≤ threshold                       |
| `pct_move`    | `.priceChange24hPercent`             | signed threshold (≥ if +, ≤ if −)       |
| `vol_mult`    | `.v24hUSD`                           | vol ≥ threshold × `base_vol`            |
| `safety`      | `/defi/token_security` verdict       | verdict rank worse than `base_verdict`  |

Only alerts with the **mail channel on** and a resolvable **mint** are handled
server-side (app-only alerts are the browser's job). Baselines (`base_vol`,
`base_verdict`) are written back on first sight and never fire that run.
Non-recurring alerts flip to `status='triggered'` (one mail); recurring alerts
stay armed with a 1-hour cooldown (`last_fired_at`).

## Config

| Name                        | Type            | Where set                                  |
| --------------------------- | --------------- | ------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | Wrangler secret | out-of-band — **service-role / sb_secret, keep secret** |
| `RESEND_API_KEY`            | Wrangler secret | out-of-band                                |
| `CRON_TEST_TOKEN` (optional)| Wrangler secret | out-of-band — enables the manual trigger   |
| `BIRDEYE_API_KEY` (optional)| Wrangler secret | out-of-band — only for direct Birdeye; omit to use the proxy |
| `SUPABASE_URL`              | plaintext var   | `wrangler.toml` (already public)           |
| `BIRDEYE_PROXY`             | plaintext var   | `wrangler.toml` (chartrunner-worker /v1/birdeye) |
| `BIRDEYE_BASE`              | plaintext var   | `wrangler.toml` (only used with a direct key) |
| `MAIL_FROM`                 | plaintext var   | `wrangler.toml` (Resend-verified sender)   |
| `MAX_PER_RUN`               | plaintext var   | `wrangler.toml` (default 500)              |
| account id                  | env at deploy   | `CLOUDFLARE_ACCOUNT_ID` (CI)               |

**Birdeye needs no key here.** By default the worker calls the existing
`chartrunner-worker` `/v1/birdeye` proxy (same path the game client uses), which
handles Birdeye auth server-side. Only set `BIRDEYE_API_KEY` if you want the
worker to bypass the proxy and hit Birdeye directly.

**`MAIL_FROM` must be on a Resend-verified domain** (the same one `/v1/mail/alert`
already uses). Adjust the var in `wrangler.toml` if that address differs.

## Prerequisites

The `cr_alerts` table + the v1.0.760 map columns must exist (the two SQL
migrations already run in Supabase). This worker needs the table columns
`owner,id,symbol,mint,type,threshold,channels,recurring,status,base_vol,base_verdict,last_fired_at,triggered_at,last_checked,last_value` — all present after those migrations.

## Set the secrets (once, from the phone via CI or any shell with the token)

```bash
cd workers/alerts-cron
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name chartrunner-alerts-cron
npx wrangler secret put RESEND_API_KEY           --name chartrunner-alerts-cron
npx wrangler secret put CRON_TEST_TOKEN          --name chartrunner-alerts-cron   # optional
# BIRDEYE_API_KEY is NOT needed — Birdeye goes through the /v1/birdeye proxy.
```
(`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` exported so wrangler can auth
non-interactively — same token CI uses.) Only two required secrets:
`SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key from Supabase → API Keys →
Secret keys) and `RESEND_API_KEY`. Make `MAIL_FROM` match the Resend-verified
sender that `chartrunner-worker` already uses (`RESEND_FROM_EMAIL`).

## Verify

- Names of set secrets (safe, values never shown): run the **Audit Worker
  Secrets** GitHub Action with `chartrunner-alerts-cron`.
- Manual run (with `CRON_TEST_TOKEN` set):
  `https://chartrunner-alerts-cron.<subdomain>.workers.dev/?run=1&token=<TOKEN>`
  → returns `{ scanned, checked, fired, mailed, errors }`.
- End-to-end: create a signed-in alert with the ✉ mail channel and a condition
  that's already true, wait ≤5 min → e-mail arrives; the row shows
  `status='triggered'` in `select public.cr_alerts_list();`.
