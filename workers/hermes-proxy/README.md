# ChartRunner Hermes proxy worker

Proxies `chartrunner.xyz/hermes/*` → the public Pyth Hermes API
(`https://hermes.pyth.network`), injecting the mandatory API key server-side so
it never ships to the browser.

Background: Pyth is switching Hermes to **mandatory authentication** with a
**2026-07-31** cutover. After that date, unauthenticated Hermes calls 401. This
worker keeps the game working by holding the key as a Cloudflare secret.

## What it does

- `GET/HEAD chartrunner.xyz/hermes/<path>?<query>` → `GET/HEAD hermes.pyth.network/<path>?<query>`
  with `Authorization: Bearer $HERMES_API_KEY` added.
- Streams responses through unbuffered, so SSE (`/v2/updates/price/stream`) works.
- Only forwards to the single Hermes upstream and only allows read methods — it
  is not an open proxy.
- Returns `503 hermes_key_unset` (not an unauthenticated upstream call) until the
  key is set.

## Config

| Name              | Type            | Where set                                   |
| ----------------- | --------------- | ------------------------------------------- |
| `HERMES_API_KEY`  | Wrangler secret | out-of-band (see below) — **not committed** |
| `HERMES_UPSTREAM` | plaintext var   | `wrangler.toml` (defaults to Hermes prod)   |
| account id        | env at deploy   | `CLOUDFLARE_ACCOUNT_ID` (CI)                |

## Setting the Hermes key (do this once the real key arrives)

**Option A — CLI (recommended):**

```bash
cd workers/hermes-proxy
# You'll be prompted to paste the key; it is stored encrypted on Cloudflare.
npx wrangler secret put HERMES_API_KEY --name chartrunner-hermes-proxy
```

The `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` env vars must be exported
(same token used by CI) so wrangler can authenticate non-interactively.

**Option B — Cloudflare dashboard:**

Workers & Pages → **chartrunner-hermes-proxy** → Settings → **Variables and
Secrets** → *Add* → type **Secret**, name `HERMES_API_KEY`, paste the value → Save.

No redeploy is needed after setting a secret — it takes effect on the next request.

## Verify

```bash
# Should return JSON price feed metadata once the key is set:
curl "https://chartrunner.xyz/hermes/v2/price_feeds?query=btc&asset_type=crypto"
# Before the key is set it returns: {"error":"hermes_key_unset",...} with HTTP 503
```

## Deploy

Handled automatically by `.github/workflows/deploy-workers.yml` on any push to
`main` that touches `workers/hermes-proxy/**`, or manually via the workflow's
`workflow_dispatch`. Local manual deploy: `npx wrangler deploy` from this dir.

> Note on Hermes auth scheme: this worker sends the key as
> `Authorization: Bearer <key>`, the standard Hermes auth header. If Pyth's final
> mandatory-auth scheme differs (e.g. a custom header), adjust the single
> `fwdHeaders.set("Authorization", …)` line in `src/index.js`.
