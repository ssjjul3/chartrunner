# Devnet checklist

The 30-second smoke test before declaring `solana-connect/` done, plus a diagnostic table for the common errors.

## Endpoints + faucet

| Resource | URL |
|---|---|
| Devnet RPC | `https://api.devnet.solana.com` |
| Devnet faucet (web) | `https://faucet.solana.com/` |
| Devnet faucet (CLI) | `solana airdrop 1 <pubkey> --url https://api.devnet.solana.com` |
| Explorer (devnet tx) | `https://explorer.solana.com/tx/<sig>?cluster=devnet` |
| Explorer (devnet address) | `https://explorer.solana.com/address/<pubkey>?cluster=devnet` |

For helpers in `src/lib/explorer.ts`, always default `cluster = 'devnet'`. Pass it through, never hardcode in three places.

## Smoke test

After `pnpm build` + deploy:

1. Open the hosted URL in an incognito window (catches cached state).
2. Header shows brand + green **devnet** pill.
3. Click `<WalletMultiButton />` → modal lists installed wallets (Phantom shows up if you have it).
4. Pick wallet → wallet popup → Approve → button morphs to truncated pubkey.
5. Balance shows in SOL. (If 0, click "Get devnet SOL" link → faucet → wait ~5s → balance refreshes.)
6. Type a memo → click Send → wallet popup → Approve → "Sending…" state for 5–15s → success card with signature + "View on Explorer ↗".
7. Click the explorer link → tx page loads, shows the memo string in the log section, status: `Confirmed` (then `Finalized` after another ~10s).

If any step fails, the diagnostic table below covers the common causes.

## Diagnostic table

| Symptom | Likely cause | Fix |
|---|---|---|
| Wallet modal is empty | No Wallet Standard wallets installed | Install Phantom (`phantom.app`) or Backpack (`backpack.app`) and reload |
| Wallet popup shows "Mainnet" | `ConnectionProvider` endpoint is wrong | Check `endpoint = clusterApiUrl('devnet')` in `main.tsx` |
| `WalletNotConnectedError` | UI didn't gate on `connected` | Use `const { connected } = useWallet()`; disable Send when `!connected` |
| `Insufficient lamports` | Wallet has 0 SOL on devnet | Open `https://faucet.solana.com/`, paste pubkey, request 1 SOL |
| `Blockhash not found` | Tx took too long; blockhash expired | Refetch `getLatestBlockhash` and retry once before showing error |
| `Simulation failed` (no other detail) | Common when memo data is too large or contains invalid UTF-8 | Reduce memo to <500 bytes; ensure pure ASCII for first ship |
| Signature returned but explorer says "Not found" | Cluster mismatch in explorer URL | Confirm `?cluster=devnet` is appended to the tx URL |
| `confirmTransaction` hangs forever | Used the SAME blockhash that signed the tx for confirm | Always fetch a FRESH blockhash for `confirmTransaction({ blockhash, lastValidBlockHeight })` |
| `Failed to fetch` from RPC | RPC rate-limited or briefly down | Retry after a few seconds; for production, use a paid RPC like Helius / QuickNode |
| Build fails: `Buffer is not defined` | Vite + browser context, polyfill missing | Add `vite-plugin-node-polyfills` OR set `define: { global: 'globalThis' }` in `vite.config.ts` |
| Build fails: `process is not defined` | Same polyfill class | Same plugin OR `define: { 'process.env': {} }` |
| Wallet popup never appears | Wallet extension is locked | User opens the wallet extension, unlocks it, then retries |
| `User rejected the request` | User cancelled the popup — NOT an error | Catch + suppress; show "Cancelled" not "Failed" |

## Vite polyfill recipe

`@solana/web3.js` reaches for `Buffer`, `process`, and `crypto` (Node-style globals). Vite's browser bundle doesn't ship them by default. Two options:

**Option A — `vite-plugin-node-polyfills` (recommended, declarative):**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills()],
});
```

**Option B — manual `define` (fewer deps, more brittle):**

```ts
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: { buffer: 'buffer/' },
  },
});
```

Use Option A. It's one `pnpm add -D vite-plugin-node-polyfills` and it just works.

## Final pre-ship review

- [ ] Cluster pill is visible and reads "devnet" in green.
- [ ] `<WalletMultiButton />` is the only connect path. No `window.solana` access anywhere.
- [ ] Every successful tx renders signature + explorer link with `?cluster=devnet`.
- [ ] Errors show as readable text, never just `console.error`.
- [ ] User-rejected wallet popups do NOT show as errors.
- [ ] `pnpm build` succeeds on a fresh checkout.
- [ ] The hosted URL works in a fresh incognito window with no extensions other than the wallet.
- [ ] README has the live URL + smoke-test steps.
