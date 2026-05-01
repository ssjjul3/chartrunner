# Wallet adapter (React) — connect, sign, send

`@solana/wallet-adapter-react` is the canonical React wallet integration. It wraps the Wallet Standard (the underlying protocol every modern Solana wallet implements: Phantom, Backpack, Solflare, Glow, etc.) and exposes it as React hooks. Use these hooks — never `window.solana` directly.

## Provider setup

In `src/main.tsx`:

```tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = clusterApiUrl('devnet');
const wallets: Adapter[] = [];   // empty — Wallet Standard auto-discovers installed wallets

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
```

- `wallets={[]}` is intentional. wallet-adapter v0.15+ auto-detects Wallet Standard wallets at runtime. Passing explicit `PhantomWalletAdapter`, `SolflareWalletAdapter`, etc. is the legacy path and adds bundle size for no functional gain.
- `autoConnect` reconnects on page reload if the user previously approved.
- The `@solana/wallet-adapter-react-ui/styles.css` import gives you the dark wallet-list modal out of the box.

## The two hooks

```tsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

function App(){
  const { connection } = useConnection();   // a stable Connection instance
  const { publicKey, sendTransaction, connected, connecting, wallet } = useWallet();
  // ...
}
```

What each gives you:

- **`useConnection()`** — `{ connection: Connection }`. The `Connection` instance shared across the tree. Don't reinstantiate.
- **`useWallet()`** — current wallet state:
  - `publicKey: PublicKey | null` — current account; `null` if disconnected.
  - `connected: boolean`, `connecting: boolean`, `disconnecting: boolean` — UI state flags.
  - `wallet: Wallet | null` — adapter object (has `.adapter.name`, `.adapter.icon`).
  - `sendTransaction(tx, connection, opts?)` — signs the tx via the wallet AND submits to the RPC. Returns the signature. **Use this**, not `signTransaction` + manual submit, unless you need raw control.
  - `signTransaction(tx)` — for cases where you submit yourself (e.g. via a different RPC).
  - `disconnect()` — programmatic disconnect.

## Connect button

The simplest path is the prebuilt `<WalletMultiButton />`:

```tsx
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

<WalletMultiButton />
```

This single component handles: "Select Wallet" → wallet list modal → user picks → wallet popup → connected state → click again to disconnect/copy/change. Don't reinvent it for the hackathon.

## Send a transaction (wallet-adapter way)

```tsx
import { Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buildMemoInstruction } from '../lib/memo';

async function sendMemo(text: string){
  if(!publicKey) throw new Error('Wallet not connected');

  const tx = new Transaction().add(buildMemoInstruction(text, publicKey));

  // wallet-adapter handles: latest blockhash injection, fee payer, signing,
  // submitting via the connection passed in, and returning the signature.
  const sig = await sendTransaction(tx, connection);

  // Confirm so we know it landed.
  const latest = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction(
    { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    'confirmed'
  );
  return sig;
}
```

The wallet's own popup will show: "Approve transaction → Memo program · Devnet". The user clicks Approve. The wallet signs and broadcasts.

## User-rejected vs failure

The wallet throws an error with `name: 'WalletSendTransactionError'` and `message: 'User rejected the request'` when the user cancels the popup. That's NOT a failure — it's a normal flow exit. Catch it specifically:

```tsx
try {
  const sig = await sendMemo(memoText);
  setLastSig(sig);
} catch (err: any) {
  if (err?.message && /user rejected/i.test(err.message)) {
    setError('');           // clear, just show neutral "Cancelled" state
    return;
  }
  setError(err?.message || String(err));
}
```

Other common errors (see `references/devnet-checklist.md` for the full diagnostic table):

- `WalletNotConnectedError` — call `useWallet().connected` before triggering tx flows
- `BlockhashNotFoundError` — refetch latest blockhash and retry once
- `Transaction simulation failed: Insufficient lamports` — devnet airdrop needed; show a "Get devnet SOL ↗" link to `faucet.solana.com`

## Verifying the wallet stack on devnet

The wallet popup will display the cluster it sees in the request. Phantom, Backpack, and Solflare all pick this up from the `Connection` you pass to `sendTransaction` — they don't need an explicit cluster setting from your code. As long as your `ConnectionProvider` uses `clusterApiUrl('devnet')`, the user's popup will show "Devnet" in the corner.

## Anti-patterns

- Don't reach into `window.solana`. `useWallet()` is the only correct API. Direct access bypasses the adapter and breaks for non-Phantom wallets.
- Don't put `Connection` in `useState` — `useConnection()` already gives you the stable provider instance.
- Don't `JSON.parse(localStorage.getItem('walletName'))` to restore a wallet. `autoConnect` on `WalletProvider` does this for you.
- Don't await `sendTransaction` and then immediately read the on-chain state — confirm the signature first.
- Don't disable the Connect button after connecting; hide it. The `<WalletMultiButton />` morphs into a "connected" pill with disconnect/copy menu.
