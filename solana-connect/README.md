# `solana-connect/` — devnet wallet + signed memo

Companion to the ChartRunner prototype. Proves the on-chain edge that the prototype's mocked SDK calls represent: a real wallet connect, a real signed transaction on Solana devnet, a real explorer-verifiable signature.

This page is the answer to a hackathon judge asking *"is the Solana integration real, or slideware?"*

## What it does

1. **Connect** any Wallet Standard wallet (Phantom, Backpack, Solflare, Glow, Coin98, …) via `@solana/wallet-adapter-react`.
2. **Show** the connected pubkey, devnet SOL balance, and the wallet name.
3. **Sign + send a memo transaction** on devnet (the canonical Solana Memo program). UTF-8 text up to 500 chars; supports a `?memo=...` query-string deep-link from the game's topbar.
4. **Confirm + display** the signature with a link to the Solana Explorer (devnet).

That's the entire scope. No Anchor program, no SPL token mint, no mainnet, no custody.

## Stack

- React 18 + TypeScript (strict)
- Vite 5
- `@solana/web3.js` 1.95.x
- `@solana/wallet-adapter-react` 0.15.x + `…-react-ui` 0.9.x
- `vite-plugin-node-polyfills` for `Buffer` / `process` in the browser bundle

The Solana Foundation skill `frontend-with-framework-kit` covers the equivalent setup using `@solana/kit` (the new SDK). When we migrate to that, the bridge patterns live in `kit-web3-interop`. For now we use `@solana/web3.js` because wallet-adapter is built around it and the surface is well-documented.

## Local dev

```bash
cd solana-connect
pnpm install            # or npm install / yarn
pnpm dev                # opens http://localhost:5173
```

You'll need a wallet extension installed (Phantom is the easiest path on first use).

## Build for production

```bash
pnpm build              # outputs dist/
pnpm preview            # serve dist/ locally to sanity-check
```

The repo's `.github/workflows/pages.yml` builds this folder during the GitHub Pages deploy and publishes it under `/solana-connect/` on the same Pages site as the prototype.

Live URL after publish: `https://<your-github-user>.github.io/chartrunner/solana-connect/`

## Smoke test (after deploy)

1. Open the live URL in incognito.
2. Header shows the green **devnet** pill.
3. Click `Select Wallet` → modal lists installed wallets → pick Phantom (or any) → wallet popup → Approve.
4. Pubkey + balance show. If balance is 0, click "get devnet SOL ↗" → faucet → wait ~5s → balance refreshes.
5. Type a memo (or use the auto-filled default) → click "Send memo to devnet" → wallet popup ("Devnet" label) → Approve.
6. After 5–15s: green success banner with truncated signature + "View on Explorer ↗".
7. Click the explorer link → tx page loads with status `Confirmed` → memo text appears in the log section.

If any step fails, see `../skills/solana/references/devnet-checklist.md` for the diagnostic table.

## Deep-link from the game

The main game's topbar can spawn a window with a pre-filled memo:

```
https://<host>/solana-connect/?memo=ChartRunner+devnet+%C2%B7+BTC+1h+funding_shorts+%C2%B7+sig_a1b2c3
```

The page reads `?memo=` from the URL on mount and uses it as the initial textarea value. URL-encode the memo content; cap is 400 chars when coming through the query string (the page enforces 500 chars total).

## Architecture

See `../skills/solana/SKILL.md` and the references in that folder. tl;dr:

- `src/main.tsx` — `<ConnectionProvider>` + `<WalletProvider>` + `<WalletModalProvider>` + `<App>`.
- `src/App.tsx` — the entire UI; reads `useConnection()` and `useWallet()`; manages local state via `useState`; renders the wallet card + memo card.
- `src/lib/memo.ts` — `buildMemoInstruction(text, signer)` returning a `TransactionInstruction`.
- `src/lib/explorer.ts` — `txUrl(sig, cluster)` and `addressUrl(addr, cluster)`.
- `src/lib/format.ts` — `truncatePubkey`, `lamportsToSol`.

## License

MIT (same as the rest of the repo).
