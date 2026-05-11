# ChartRunner — SNS Identity Track Submission
**Track:** SNS Identity Track · Colosseum Hackathon (Powered by SNS, STMY)
**Prize:** $5k USDC
**Status:** integrated in v1.0.51 (Day 3 of post-Frontier sprint)

---

## What we shipped

ChartRunner now uses **SNS as the canonical runner identity layer**. Your Solana name *is* your trader handle — no separate signup, no in-game username form. Display path:

1. On wallet connect (Phantom direct, see `crWallet.on()` listener)
2. `crSnsIdentity.resolveName(pubkey)` fires → Bonfida public SNS API → primary `.sol` domain
3. Result stashed on `window._crSnsName` (cached 10 min per pubkey)
4. **Lite-profile LED billboard** (the green dot-matrix display at the top of the in-game profile) reads it on the next 500-ms tick and surfaces it as the first message in the 3-message rotation: `<your-name>.sol → BTC · 15m → Time is Money → …`

If you connect a wallet with no `.sol` domain, the billboard falls back to the legacy `profileName` input, then to `anon_runner`. Zero failure mode is "billboard breaks" — every path returns something to display.

## Why SNS instead of building our own Name Register

Our post-Frontier roadmap (M2.6) originally called for a custom on-chain Name Register using `chartrunner_registry`. Reviewing the SNS Identity Track scope made the right answer obvious:

| Building it ourselves | Using SNS |
|---|---|
| One more PDA per user we maintain | Already-deployed program, audited, ~1M domains live |
| Name only works inside ChartRunner | Name works across every Solana app — Backpack, Magic Eden, Helius, Phantom directly displays them |
| We have to handle transferability | SNS handles transfer via NFT model |
| We have to handle uniqueness enforcement | PDA-derived from name hash; uniqueness is mechanically free |
| Zero network effects | Users with existing `.sol` domains arrive with identity intact |

The integration is now **read-only at v1.0.51**: we surface whatever SNS knows about your wallet. At M2.6 proper, we'll layer "Claim runner subdomain" on top — register `<handle>.chartrunner.sol` under a parent domain we own — so players without a `.sol` can still get a runner handle.

## Technical integration

### Code

**New IIFE** `window.crSnsIdentity` at end of `ChartRunner_Prototype.html`:
- `resolveName(pubkey) → Promise<string|null>` — primary domain lookup with 10-min cache + in-flight dedupe
- `peek(pubkey) → string|null` — synchronous cache read (used by the billboard tick)
- Hooked into `crWallet.on()` so connect/disconnect triggers exactly one fetch
- Cross-network: lookup hits **mainnet** SNS registry even though ChartRunner runs on devnet (same pubkey, different network)

**Modified** `_refreshLightProfile` (line ~31599) — display priority for the billboard name slot:
1. `window._crSnsName` (the resolved `.sol` primary)
2. `document.getElementById('profileName').value` (legacy override input)
3. `'anon_runner'` (fallback)

### API strategy

We use **Bonfida's public SNS endpoints** rather than bundling `@bonfida/spl-name-service` because:
- HTTP is one round-trip per pubkey vs. multi-hop RPC for client-side PDA derivation + account read
- No SDK weight (the game is already 2 MB)
- The endpoint chain we try is graceful — `sns-sdk-proxy.bonfida.workers.dev` (newest) → `/v2/user/...` → legacy `/fav-domain/...`

If all three endpoint patterns fail, we fall back silently to `anon_runner`. Caching means a temporary Bonfida outage doesn't even surface to the player after the first successful lookup.

### Where to verify

1. Open `chartrunner.xyz/play/`
2. Connect a Solana wallet that owns a `.sol` primary domain (e.g., `bonfida.sol` is a public test domain)
3. Click your wallet pill → Profile opens (lite profile is also live in the top-right during a run)
4. Watch the green LED billboard: rotates through `<your-name>.sol` → `BTC · 15m` → `Time is Money`
5. Verify in DevTools console: `console.log(window._crSnsName)` returns the domain string

### File-level diff

| File | Change |
|---|---|
| `ChartRunner_Prototype.html` line ~31599 | Billboard `_bbName` reads `window._crSnsName` first |
| `ChartRunner_Prototype.html` end-of-script | New `crSnsIdentity` IIFE (~100 lines) |

## Roadmap (post-this submission)

- **M2.6 proper** (~Q3 2026): deploy `chartrunner.sol` parent domain. Add a "Claim runner subdomain" button to Profile. Players without a `.sol` get `<handle>.chartrunner.sol`. Uses Bonfida's subdomain registration ix.
- **M3**: NFT-gated chapters keyed on the wallet's owned domains — own a "rare" subdomain class → unlock a side-campaign chapter.
- **M8**: Tournament brackets display competitor handles via SNS rather than truncated pubkeys.

## Submission package

- **Project title:** ChartRunner
- **Description:** Gamified Solana trading SDK. SNS is the runner identity layer — your `.sol` primary domain becomes your in-game handle, displayed on the lite-profile LED billboard at every save and every run.
- **GitHub:** github.com/\<owner\>/chartrunner
- **Website:** chartrunner.xyz
- **Demo path:** chartrunner.xyz/play/ → connect a `.sol`-owning wallet → run any chapter → top-right LED billboard shows your name

## Tweet draft

> Your .sol IS your runner. 🪪
>
> @ChartRunner now reads your primary SNS domain on connect and surfaces it on the in-game LED billboard. No signup, no username form — your wallet's identity is the brand.
>
> Powered by @SNS · Frontier Sidetrack submission.
>
> 🔗 chartrunner.xyz
