// Manual instruction builder for the chartrunner_maps Anchor program.
//
// Why hand-rolled and not @coral-xyz/anchor:
// - The Anchor TS client adds ~200 KB to the bundle and pulls in Rust-style
//   IDL machinery we don't otherwise need.
// - We have one instruction (save_map) with two args. A 30-line ix builder
//   is more honest about what's actually happening on the wire.
//
// Wire format (Anchor convention):
//   [ 8B  discriminator = sha256("global:save_map")[0..8] ]
//   [ 4B  little-endian length of `name` (Borsh string prefix)        ]
//   [ Nb  name UTF-8 bytes                                             ]
//   [ 32B content_hash (raw, no length prefix — fixed-size array)      ]
//
// Account list (in order, must match the SaveMap struct in src/lib.rs):
//   0. map           — PDA derived from [b"map", owner, name]   writable, NOT signer
//   1. owner         — wallet pubkey                            writable, signer
//   2. system_program — SystemProgram                           readonly, NOT signer

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

// Default = the placeholder ID from Anchor.toml. Override at runtime via
// VITE_CR_MAPS_PROGRAM_ID once the real program is deployed and you've
// re-pasted the printed ID into Anchor.toml + lib.rs.
export const CR_MAPS_PROGRAM_ID = new PublicKey(
  (import.meta as any).env?.VITE_CR_MAPS_PROGRAM_ID ||
    'DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH'
);

// sha256("global:save_map")[0..8] — precomputed; see anchor/README.md.
const SAVE_MAP_DISCRIMINATOR = Buffer.from(
  [23, 246, 139, 73, 212, 65, 55, 37]
);

const PDA_SEED_PREFIX = Buffer.from('map');

/** Find the PDA address for a given (owner, name). */
export function findMapPda(owner: PublicKey, name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PDA_SEED_PREFIX, owner.toBuffer(), Buffer.from(name, 'utf-8')],
    CR_MAPS_PROGRAM_ID
  );
}

/** Build the save_map instruction. `contentHash` must be exactly 32 bytes. */
export function buildSaveMapInstruction(params: {
  owner: PublicKey;
  name: string;
  contentHash: Uint8Array;
}): TransactionInstruction {
  const { owner, name, contentHash } = params;
  if (contentHash.length !== 32) {
    throw new Error(`content_hash must be 32 bytes (got ${contentHash.length})`);
  }
  const nameBytes = Buffer.from(name, 'utf-8');
  if (nameBytes.length === 0) {
    throw new Error('name cannot be empty');
  }
  if (nameBytes.length > 64) {
    throw new Error(`name too long (${nameBytes.length}B; max 64)`);
  }

  // Length prefix (Borsh u32 LE) + name bytes + raw 32B hash.
  const data = Buffer.concat([
    SAVE_MAP_DISCRIMINATOR,
    (() => {
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32LE(nameBytes.length, 0);
      return lenBuf;
    })(),
    nameBytes,
    Buffer.from(contentHash),
  ]);

  const [mapPda] = findMapPda(owner, name);

  return new TransactionInstruction({
    programId: CR_MAPS_PROGRAM_ID,
    keys: [
      { pubkey: mapPda, isSigner: false, isWritable: true },
      { pubkey: owner,  isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** SHA-256 → Uint8Array(32). Uses the WebCrypto API; available in all modern browsers. */
export async function sha256(input: string | Uint8Array): Promise<Uint8Array> {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return new Uint8Array(digest);
}

/** Hex-encode a Uint8Array — used for URL-safe transport of the hash. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Inverse of toHex(). Throws if the input isn't valid 32-byte hex. */
export function fromHex(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('content_hash must be 64 hex chars (32 bytes)');
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}
