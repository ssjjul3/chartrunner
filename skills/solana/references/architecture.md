# `solana-connect/` — file layout + component shape

```
solana-connect/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html              # Vite entry — mounts <App>
├── README.md               # what it does + how to verify
├── .gitignore              # node_modules, dist, .vite
└── src/
    ├── main.tsx            # createRoot + <WalletProvider> wrapping <App>
    ├── App.tsx             # the connect + memo UI
    ├── lib/
    │   ├── memo.ts         # buildMemoInstruction(text, signer)
    │   ├── explorer.ts     # buildExplorerUrl(sig, cluster)
    │   └── format.ts       # truncatePubkey, lamportsToSol
    └── styles.css          # all CSS — small enough to keep in one file
```

## Component shape

Three components, single responsibility each.

### `<main.tsx>`

Sets up the wallet stack. The hierarchy must be:

```tsx
<ConnectionProvider endpoint="https://api.devnet.solana.com">
  <WalletProvider wallets={[]} autoConnect>
    <WalletModalProvider>
      <App />
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

- `wallets={[]}` is intentional — wallet-adapter v0.15+ auto-discovers Wallet Standard wallets at runtime. Passing the explicit Phantom/Solflare adapter packages is legacy.
- `autoConnect` reconnects on page reload if the user previously approved.

### `<App />`

Reads two hooks: `useConnection()` (the `Connection` instance) and `useWallet()` (current wallet, pubkey, signing methods). Renders three sections:

1. **Header** — brand + "devnet" pill (green so judges can't mistake it for mainnet).
2. **Wallet card** — uses `<WalletMultiButton />` from `@solana/wallet-adapter-react-ui` for the connect UI. Below it: pubkey (truncated), SOL balance.
3. **Memo card** — `<input>` + Send button. Pre-fills from `?memo=` query param if present. Disabled while `sending` is true. After success, shows signature + explorer link.

State lives in `App` via `useState`:
- `balance: number | null`
- `memoText: string`
- `sending: boolean`
- `lastSig: string | null`
- `error: string | null`

No external state library. The two wallet hooks are the cross-cutting state.

### `<lib/memo.ts>`

```ts
import { TransactionInstruction, PublicKey } from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export function buildMemoInstruction(text: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: new TextEncoder().encode(text),
  });
}
```

### `<lib/explorer.ts>`

```ts
export function txUrl(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function addressUrl(address: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}
```

## Why this shape

- A judge can read the entire app in `App.tsx` (one file, ~150 lines).
- Future Claude (or a Solana engineer once you hire one) can extend by adding more `lib/<thing>.ts` modules + new sections in `App` — no architectural lift.
- The hook-only state model means there's exactly one place to read `S.wallet.publicKey` from, and it's always fresh.

## Anti-patterns

- Don't reach into `window.solana` directly. `useWallet()` is the only correct API in a wallet-adapter app.
- Don't put `Connection` in `useState`. It's an instance with a long-lived RPC connection — make it once via `useConnection()` (provider gives a stable ref).
- Don't write `await tx.confirm()` — that doesn't exist on `Transaction`. Use `connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')`.
- Don't ship a `console.log` of the user's pubkey on connect. Verbose logging looks unprofessional and is a tiny privacy leak.
