import { TransactionInstruction, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

/**
 * The canonical Solana Memo program (v2). Requires the signer key in `keys`.
 * Logs arbitrary UTF-8 text to the transaction log. Cheap, fast, present on
 * every cluster — perfect proof-of-on-chain-action for hackathon demos.
 */
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

/**
 * Build a Memo instruction. The signer is the wallet placing the memo
 * (the wallet's signature on the tx is what the program verifies).
 *
 * @solana/web3.js types require `Buffer` for `data` (Node legacy). We
 * import from the `buffer` package — vite-plugin-node-polyfills ships a
 * browser-compatible implementation, no extra runtime cost.
 */
export function buildMemoInstruction(
  text: string,
  signer: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, 'utf-8'),
  });
}
