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
| `SUPABASE_SERVICE_ROLE_KEY` | Wrangler secret | out-of-band — **service-role, keep secret**|
| `BIRDEYE_API_KEY`           | Wrangler secret | out-of-band                                |
| `RESEND_API_KEY`            | Wrangler secret | out-of-band                                |
| `CRON_TEST_TOKEN` (optional)| Wrangler secret | out-of-band — enables the manual trigger   |
| `SUPABASE_URL`              | plaintext var   | `wrangler.toml` (already public)           |
| `BIRDEYE_BASE`              | plaintext var   | `wrangler.toml`                            |
| `MAIL_FROM`                 | plaintext var   | `wrangler.toml` (Resend-verified sender)   |
| `MAX_PER_RUN`               | plaintext var   | `wrangler.toml` (default 500)              |
| account id                  | env at deploy   | `CLOUDFLARE_ACCOUNT_ID` (CI)               |

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
npx wrangler secret put BIRDEYE_API_KEY          --name chartrunner-alerts-cron
npx wrangler secret put RESEND_API_KEY           --name chartrunner-alerts-cron
npx wrangler secret put CRON_TEST_TOKEN          --name chartrunner-alerts-cron   # optional
```
(`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` exported so wrangler can auth
non-interactively — same token CI uses.) You can reuse the Birdeye/Resend keys
already held by `chartrunner-worker`.

## Verify

- Names of set secrets (safe, values never shown): run the **Audit Worker
  Secrets** GitHub Action with `chartrunner-alerts-cron`.
- Manual run (with `CRON_TEST_TOKEN` set):
  `https://chartrunner-alerts-cron.<subdomain>.workers.dev/?run=1&token=<TOKEN>`
  → returns `{ scanned, checked, fired, mailed, errors }`.
- End-to-end: create a signed-in alert with the ✉ mail channel and a condition
  that's already true, wait ≤5 min → e-mail arrives; the row shows
  `status='triggered'` in `select public.cr_alerts_list();`.
