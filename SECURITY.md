# ChartRunner — security notes

Status of the trust-boundary findings from the external audit (June 24, 2026).
All client-side fixes live in `ChartRunner_Prototype.html`; the single-file,
no-backend constraint shapes what's fixable here vs. what needs server/CDN config.

## Fixed in the client

**#1 — Redirect param trust / on-chain spoof (was HIGH).**
The `/solana-connect/` redirect round-trip is now bound to a per-tab, single-use
intent (`crRegGo` / `crRegConsume` / `_crRegOk`, defined in the `<head>`). Before
navigating out, the tab records the intended action in `sessionStorage`
(`cr_reg_pending_v1`, 10-min TTL). On return, the inbound handler only decorates
local entity state (`onChain` / `listed` / `bought` / license) if a matching,
fresh, unconsumed intent exists. A crafted external link carrying
`regAction`/`sig` no longer matches an intent this tab issued, so it's ignored
and the params are stripped. This is a mitigation, not authority — see #2.

**#3 — Agent/bridge URL persistence from links (was MEDIUM).**
`crAgentBridgeUrl` / `crQvacBridgeUrl` / `crAgentEventsUrl` (+ tokens) are no
longer silently written to localStorage. `crConfirmExternalEndpoint` enforces an
`http(s)`/`ws(s)` protocol allowlist, passes same-origin and localhost through,
and requires an explicit confirm naming the external host before persisting. The
event-feed token/channel only bind once their endpoint is approved.

**#4 — API keys in the browser (was MEDIUM).**
Keys (Birdeye, GoldRush, CoinGecko, COACH provider) and the agent bridge token
are still stored and sent in-browser — a backend proxy isn't possible in a
single-file app. Added a one-call purge (`window.crPurgeApiKeys()`) plus a
visible "Forget all API keys" button and an explicit warning in the API
reference panel.

**#6 — Shared-map import (was LOW/MED).**
`_ungzipB64` now caps the payload at 256 KB compressed / 2 MB decompressed
(streamed, bounded) to stop decompression-bomb OOM. Auto-opening a shared map
into the chart — and the auto-guest/login-gate dismissal that came with it — now
requires a verified content hash (`parts.h` present and matching). Unverified
links still import to Maps for manual open, but never auto-authenticate the
opener. (Note: the login screen is currently archived/auto-guest, so the
auth-bypass angle is already moot in this build; the gate guards future re-enable.)

**#5 — Security headers (partial).**
Added what GitHub Pages can honor via `<meta>`: a referrer policy and a
non-breaking CSP subset (`object-src 'none'; base-uri 'self'; form-action 'self'`)
that closes plugin/`<base>`/cross-origin-form vectors without constraining the
large inline app. The map-name render sinks checked were already escaped
(`escapeHtml`) / `textContent`.

## Still needs server / CDN config (not doable on GitHub Pages alone)

- **Full CSP** (`script-src`/`connect-src` with nonces/hashes) — requires moving
  inline JS to nonced assets and setting an HTTP header.
- **`frame-ancestors 'none'`** (clickjacking) — header only; not added as a
  framebuster because Phase 1 (SDK pull-over) may legitimately embed the app.
- **HSTS**, **Permissions-Policy**, **X-Frame-Options** — HTTP headers; set on the
  custom domain via a CDN/proxy (e.g. Cloudflare) in front of Pages.

## Needs a backend / on-chain authority (architectural)

- **#2 — Client-side ownership/equip gates.** `cr_owned_bots_v1` and equip checks
  are localStorage and remain authoritative client-side. Fine for the alpha toy
  economy; before paid unlocks, tournaments, leaderboards, or real on-chain
  claims, server/on-chain ownership must be the source of truth and localStorage
  treated as cache only.
- True verification for #1 (validate the signature/transaction against the chain
  before mutating local state) also belongs here.
