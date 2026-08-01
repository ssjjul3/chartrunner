# ChartRunner Account worker — self-service account deletion

Serves **`POST chartrunner.xyz/account/delete`** (same-origin as the game, so the
client needs no CORS). Powers the Settings → Account → **Delete account…** button.

## How it works

1. The game sends the signed-in user's Supabase JWT as `Authorization: Bearer <token>`
   (`crAccount.deleteAccount()`).
2. The worker verifies it via `GET /auth/v1/user` (apikey = public anon key) and
   derives the **uid from the verified token only** — never from the body — so a
   caller can delete **only their own** account.
3. With the **service-role** key it deletes the user's rows (`profiles`,
   `cr_alerts`, best-effort `cr_names` by email), then deletes the auth user via
   the Admin API. Success is reported only if the auth-user delete succeeds.

`deploy-workers.yml` auto-discovers and deploys this folder on push to `main`
(same as hermes-proxy / alerts-cron). Deploying the route needs the CI token to
hold **Workers Routes:Edit** on the `chartrunner.xyz` zone (hermes-proxy already
proves the token has it).

## Config

| Name                        | Type            | Where                                            |
| --------------------------- | --------------- | ------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | Wrangler secret | out-of-band — **service-role / sb_secret**, server-only |
| `SUPABASE_URL`              | plaintext var   | `wrangler.toml` (already public)                 |
| `SUPABASE_ANON_KEY`         | plaintext var   | `wrangler.toml` (publishable key — already public) |
| account id                  | env at deploy   | `CLOUDFLARE_ACCOUNT_ID` (CI)                     |

## Set the one secret (once, from the phone via CI or any shell with the token)

```bash
cd workers/account
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name chartrunner-account
```
(`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` exported so wrangler can auth
non-interactively — same token CI uses.) This is the **same** service-role key
the alerts-cron worker already uses (Supabase → API Keys → Secret keys, `sb_secret_…`).

## Verify

- Unauthed: `curl -X POST https://chartrunner.xyz/account/delete` → `401 {"error":"no_token"}`.
- End-to-end: in the app, Settings → Account → **Delete account…** → confirm →
  the account is removed, you're signed out, and signing in again fails.
