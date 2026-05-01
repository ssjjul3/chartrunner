# Transactions — memo, transfer, generic

For `solana-connect/`, the only transaction we ship is **Memo**. The other patterns are here for reference when you extend the page later.

## The Memo program

Program ID: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` (the v2 Memo program — requires the signer key in `keys`, supersedes the v1 program).

It does one thing: log arbitrary UTF-8 text to the transaction log. Cheap (~5,000 lamports), fast, and present on every cluster including devnet. Perfect proof-of-on-chain-action.

```ts
// src/lib/memo.ts
import { TransactionInstruction, PublicKey } from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export function buildMemoInstruction(
  text: string,
  signer: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: new TextEncoder().encode(text),
  });
}
```

Note: memo data is technically capped at ~566 bytes per instruction (it has to fit in a single transaction with all the other overhead). For longer payloads, hash the content and write the hash.

## SOL transfer

```ts
import { SystemProgram, PublicKey } from '@solana/web3.js';

export function buildTransferInstruction(
  from: PublicKey,
  to: PublicKey,
  lamports: number
) {
  return SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports,
  });
}
```

1 SOL = `LAMPORTS_PER_SOL` (= 1,000,000,000) lamports. Use `lamports * LAMPORTS_PER_SOL` to convert from SOL units.

## Multi-instruction transaction

```ts
import { Transaction } from '@solana/web3.js';

const tx = new Transaction();
tx.add(buildMemoInstruction('hello', publicKey));
tx.add(buildTransferInstruction(publicKey, recipient, 1_000));
const sig = await sendTransaction(tx, connection);
```

The wallet shows ALL instructions in its approval popup. The user sees "Memo + Transfer" and can decide.

## Send + confirm pattern

Wallet-adapter's `sendTransaction` does the signing and broadcasting. After it returns the signature, you should confirm before saying "done":

```ts
const sig = await sendTransaction(tx, connection);

// Critical: get a FRESH blockhash for confirmation, not the one used for the tx.
// Otherwise confirmTransaction may complete instantly without actually verifying.
const latest = await connection.getLatestBlockhash('confirmed');
const result = await connection.confirmTransaction({
  signature: sig,
  blockhash: latest.blockhash,
  lastValidBlockHeight: latest.lastValidBlockHeight,
}, 'confirmed');

if (result.value.err) {
  throw new Error('Transaction failed: ' + JSON.stringify(result.value.err));
}
return sig;
```

Confirmation levels:
- `'processed'` — fastest, weakest guarantee (~400ms). The cluster has SEEN it but may revert.
- `'confirmed'` — supermajority of validators have confirmed it (~2-3s). Safe for UI updates.
- `'finalized'` — the block is rooted, can never be reverted (~12-30s). Overkill for hackathon UI; show as final.

Use `'confirmed'` for the UI. If you want to display a "fully finalized" badge, poll for `'finalized'` separately and update.

## Pre-built default tx state

```ts
const [sending, setSending]   = useState(false);
const [lastSig, setLastSig]   = useState<string | null>(null);
const [error,   setError]     = useState<string | null>(null);

async function onSend(text: string) {
  setSending(true);
  setError(null);
  try {
    const sig = await sendMemo(text);
    setLastSig(sig);
  } catch (err: any) {
    if (/user rejected/i.test(err?.message || '')) return;   // cancelled, no error
    setError(err?.message || String(err));
  } finally {
    setSending(false);
  }
}
```

Render rules:
- `sending === true` → disable the button, show "Sending… (waiting for confirmation)".
- `lastSig` set → show signature + explorer link, hide error if any.
- `error` set → show banner with red text + dismiss button.

## What to NOT use this skill for

- **Token transfers (SPL)**. Token-2022 mints, associated token accounts, decimals — multi-tx flow with edge cases. Use the Solana Foundation's `frontend-with-framework-kit` patterns.
- **Versioned transactions (v0)**. Required for big tx (>1232 bytes) or address lookup tables. Memo + small transfers don't need them. If you do need them, use `VersionedTransaction` + `MessageV0`.
- **Priority fees**. Devnet doesn't really need them. For mainnet, add a `ComputeBudgetProgram.setComputeUnitPrice` instruction.
