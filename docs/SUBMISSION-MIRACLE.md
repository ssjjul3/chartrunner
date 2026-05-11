# ChartRunner — theMiracle In-Wallet Brand Activation Track
**Track:** theMiracle · Build the Best Benefit · Earn $10k In-Wallet Brand Activation
**Prize:** $10k USDC

---

## Why ChartRunner is the in-wallet brand activation submission

"In-wallet brand activation" = your wallet *is* the experience, not a separate account or login. ChartRunner already ships this end-to-end at v1.0.50. Three pillars:

### Pillar 1 — Wallet *is* the runner identity
- **NFT avatar picker** (v0.9.95 + v1.0.20 + v1.0.23): connect Phantom → pick from your top-20 Solana collections (Mad Lads, SMB Gen2, Tensorians, Claynosaurz, FFF, Frogs, DeGods, Okay Bears, …). Your equipped NFT becomes your in-game sprite and your Profile portrait.
- **SNS Identity** (post-Frontier M2.6 — pulling forward): your `.sol` primary domain becomes your runner handle on the in-game LED billboard. No separate signup.
- **Lite-profile billboard** (v1.0.48): green dot-matrix LED display cycles `<your-name>` / `<asset · TF>` / `<game-mode>` — your wallet's identity is literally displayed on cabin-sign hardware in the game.

### Pillar 2 — Wallet *is* the save game
- **Per-wallet localStorage namespacing** (v0.9.3 → v1.0.28): every save key (`cr_maps_v1`, `cr_widgets_v1`, `cr_chart_widgets_v1`, `cr_workbench_v1`, `cr_starred_tools_v1`, `cr_pinned_widgets_v1`, `cr_desktop_bg_v1`, …) is transparently scoped by connected pubkey via a `Storage.prototype` shim.
  - Disconnect → wallet A's maps disappear → connect wallet B → wallet B's maps appear. Switch back → wallet A's setup returns intact.
  - **Custom desktop background per wallet** (v1.0.43): upload an image, it's stored under your wallet only. Different wallet = different desktop.
  - **Equipped bots, indicators, pinned widgets, theme** all persist per wallet, including the Mac OS 9 / Solana / Ascii / Frontier theme selection.
- **Maps anchored on devnet** under your wallet (`chartrunner_maps` program at `DbzEqK…UvH`): the SHA-256 of your chart-state JSON lives on-chain under `["map", your-pubkey, name]`. Even if the localStorage cache evicts, the anchor proves you held this exact strategy at this exact time. Your wallet *is* the proof-of-strategy.

### Pillar 3 — Wallet *is* the brand surface
- **Direct Phantom signing for save_map** (v1.0.47): no `/solana-connect/` bounce. The brand moment ("I anchored my chart on Solana") happens in 3 seconds inside the game, not after a page nav. The Phantom modal appears INSIDE the ChartRunner desktop.
- **Wallet pill in topbar** + **Connect button in Profile** + **`Connected` state in lite-profile Game tab**: three persistent surfaces that reflect the brand "this wallet is the trader". When connected, the brand reads as ChartRunner-by-you, not ChartRunner-with-an-account.
- **Brand-aligned themes:** Mac OS 9 Platinum (the nostalgia anchor), Solana Cypherpunk (the platform brand), Ascii Terminal (the dev-cred play), Frontier (the hackathon palette). Theme is per-wallet.

## What we'd build with the $10k

The Miracle credits would underwrite **the next layer of in-wallet brand activation**, post-Frontier:

1. **Wallet-cohort badges** (M2.6 polish): if your wallet holds a specific collection's NFT, an in-game badge appears next to your LED billboard. Mad Lads → "Lad" badge with mint glow; SMB → SMB icon; Frogs → frog emoji. Brand collections become visible at the gameplay layer, not just the portrait.
2. **Wallet-gated chapters** (M3): unlock side-chapters that only your wallet can play, based on what NFTs / tokens you hold. E.g., hold a $RUN governance token → unlock the M8 tournament-token chapter. Hold Phoenix builder NFT → unlock the Phoenix Rise advanced campaign.
3. **Multi-wallet roster** (M3.5): switch between connected wallets without a page reload. Different wallet = different trader career, kept side-by-side. Useful for traders who paper-trade one wallet and live-trade another.

## Submission package

- **Project title:** ChartRunner
- **Description:** Gamified Solana trading SDK where your wallet is the runner. NFT avatar, on-chain anchored maps, per-wallet save state, direct Phantom signing — your wallet is the brand experience, not an attached identity.
- **GitHub:** github.com/\<owner\>/chartrunner
- **Website:** chartrunner.xyz
- **Demo path for judging:** connect Phantom on chartrunner.xyz/play/ → Profile → click the centred avatar `+` → equip an NFT from your wallet (or pick from curated samples) → run Campaign Ch.1 → in-game LED billboard now shows your name + your equipped sprite is your avatar.

## Tweet draft

> Your wallet is the runner. 🧬
>
> @ChartRunner ships in-wallet brand activation end-to-end:
> · NFT avatar from your top-20 Solana collections
> · Per-wallet save state (maps, widgets, themes, even desktop bg)
> · Direct Phantom anchoring of every chart you save
>
> No signup. Wallet = identity = save = brand.
>
> 🔗 chartrunner.xyz · @theMiracleEcho Frontier Track
