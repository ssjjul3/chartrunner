// Manual instruction builders for the chartrunner_registry Anchor program.
// Same hand-rolled style as cr-maps-program.ts (no @coral-xyz/anchor TS dep);
// for one-shot instructions this keeps the bundle small and the wire format
// honest.
//
// Anchor wire format reminder:
//   [ 8B  discriminator = sha256("global:<method>")[0..8]                ]
//   [   args, in declared order, Borsh-encoded                            ]
//
// Borsh quick rules used here:
//   u8/i8     → 1 byte little-endian
//   u16/u64   → 2/8 bytes LE
//   i32/i64   → 4/8 bytes LE
//   String    → 4-byte LE length prefix + UTF-8 bytes
//   [u8; N]   → N raw bytes (no prefix)

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

// ─── Program ID ──────────────────────────────────────────────────────────
// Default = placeholder from anchor/Anchor.toml. Override at runtime via
// VITE_CR_REGISTRY_PROGRAM_ID once deployed (Solana Playground prints it).
export const CR_REGISTRY_PROGRAM_ID = new PublicKey(
  (import.meta as any).env?.VITE_CR_REGISTRY_PROGRAM_ID ||
    'ChRegSdLcj4N4ek3uW3RZE3pWYuKSTrgVLWeKQrU3yVz'
);

// Treasury that collects the 5% protocol fee on each marketplace buy.
// Hardcoded in the Rust program as `protocol_treasury()` = program ID.
// Override here when the real treasury is set on the on-chain side.
export function getTreasuryAddress(): PublicKey {
  return CR_REGISTRY_PROGRAM_ID;
}

// ─── Entity types ─────────────────────────────────────────────────────────
// Mirrors the entity_type discriminator in Rust. Keep in sync.
export enum EntityType {
  Map          = 0,
  Strategy     = 1,
  Bot          = 2,
  Indicator    = 3,
  Backtest     = 4,
  App          = 5,
  TokenProfile = 6,
  Widget       = 7,
  Tool         = 8,
}

export const ENTITY_TYPE_NAMES: Record<EntityType, string> = {
  [EntityType.Map]:          'Map',
  [EntityType.Strategy]:     'Strategy',
  [EntityType.Bot]:          'Bot',
  [EntityType.Indicator]:    'Indicator',
  [EntityType.Backtest]:     'Backtest',
  [EntityType.App]:          'App',
  [EntityType.TokenProfile]: 'TokenProfile',
  [EntityType.Widget]:       'Widget',
  [EntityType.Tool]:         'Tool',
};

// ─── Instruction discriminators (precomputed; see anchor/README.md) ──────
// sha256("global:<method>")[0..8]
const DISC_SAVE_ENTITY     = Buffer.from([195, 6, 31, 121, 78, 227, 95, 33]);
const DISC_DELETE_ENTITY   = Buffer.from([169, 211, 4, 205, 110, 39, 157, 251]);
const DISC_LIST_ENTITY     = Buffer.from([65, 235, 47, 92, 82, 144, 173, 85]);
const DISC_BUY_ENTITY      = Buffer.from([159, 155, 75, 25, 216, 78, 153, 78]);
const DISC_CANCEL_LISTING  = Buffer.from([41, 183, 50, 232, 230, 233, 157, 70]);
const DISC_RECORD_RUN      = Buffer.from([203, 171, 212, 47, 170, 30, 0, 146]);

// ─── PDA seed prefixes ────────────────────────────────────────────────────
const PDA_ENTITY  = Buffer.from('entity');
const PDA_LISTING = Buffer.from('listing');
const PDA_LICENSE = Buffer.from('license');
const PDA_RUN     = Buffer.from('run');

// ─── PDA helpers ──────────────────────────────────────────────────────────

export function findEntityPda(
  owner: PublicKey,
  entityType: EntityType,
  name: string,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PDA_ENTITY, Buffer.from([entityType]), owner.toBuffer(), Buffer.from(name, 'utf-8')],
    CR_REGISTRY_PROGRAM_ID,
  );
}

export function findListingPda(entityPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PDA_LISTING, entityPda.toBuffer()],
    CR_REGISTRY_PROGRAM_ID,
  );
}

export function findLicensePda(buyer: PublicKey, entityPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PDA_LICENSE, buyer.toBuffer(), entityPda.toBuffer()],
    CR_REGISTRY_PROGRAM_ID,
  );
}

export function findRunPda(player: PublicKey, nonce: bigint): [PublicKey, number] {
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(nonce, 0);
  return PublicKey.findProgramAddressSync(
    [PDA_RUN, player.toBuffer(), nonceBuf],
    CR_REGISTRY_PROGRAM_ID,
  );
}

// ─── Borsh encoders for the small set of types we actually emit ──────────

function encU8(n: number):  Buffer { const b = Buffer.alloc(1); b.writeUInt8(n, 0);              return b; }
function encU16(n: number): Buffer { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0);          return b; }
function encU32(n: number): Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0);          return b; }
function encI32(n: number): Buffer { const b = Buffer.alloc(4); b.writeInt32LE(n, 0);           return b; }
function encU64(n: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(typeof n === 'bigint' ? n : BigInt(n), 0);
  return b;
}
function encStr(s: string): Buffer {
  const bytes = Buffer.from(s, 'utf-8');
  return Buffer.concat([encU32(bytes.length), bytes]);
}
function encBytes32(b: Uint8Array): Buffer {
  if (b.length !== 32) throw new Error(`expected 32 bytes, got ${b.length}`);
  return Buffer.from(b);
}
function encFixedBytes(b: Uint8Array | string, len: number): Buffer {
  // Used for fixed-length identifiers (asset, timeframe in record_run).
  // Strings get UTF-8 encoded then null-padded to `len`.
  let raw: Buffer;
  if (typeof b === 'string') {
    raw = Buffer.from(b, 'utf-8');
  } else {
    raw = Buffer.from(b);
  }
  if (raw.length > len) throw new Error(`string too long for ${len}-byte field`);
  const out = Buffer.alloc(len);
  raw.copy(out, 0);
  return out;
}

// ─── Public ix builders ───────────────────────────────────────────────────

export function buildSaveEntityIx(params: {
  owner: PublicKey;
  entityType: EntityType;
  name: string;
  contentHash: Uint8Array;
  royaltyBps?: number;             // default 0 (no royalty on resale)
}): TransactionInstruction {
  const { owner, entityType, name, contentHash } = params;
  const royaltyBps = params.royaltyBps ?? 0;
  if (name.length === 0 || Buffer.byteLength(name, 'utf-8') > 64) {
    throw new Error('name must be 1–64 bytes UTF-8');
  }
  if (royaltyBps < 0 || royaltyBps > 5000) {
    throw new Error('royaltyBps must be 0..5000 (0–50%)');
  }
  const data = Buffer.concat([
    DISC_SAVE_ENTITY,
    encU8(entityType),
    encStr(name),
    encBytes32(contentHash),
    encU16(royaltyBps),
  ]);
  const [entityPda] = findEntityPda(owner, entityType, name);
  return new TransactionInstruction({
    programId: CR_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: entityPda, isSigner: false, isWritable: true },
      { pubkey: owner,     isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildDeleteEntityIx(params: {
  owner: PublicKey;
  entityType: EntityType;
  name: string;
}): TransactionInstruction {
  const { owner, entityType, name } = params;
  const data = Buffer.concat([
    DISC_DELETE_ENTITY,
    encU8(entityType),
    encStr(name),
  ]);
  const [entityPda] = findEntityPda(owner, entityType, name);
  return new TransactionInstruction({
    programId: CR_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: entityPda, isSigner: false, isWritable: true },
      { pubkey: owner,     isSigner: true,  isWritable: true },
    ],
    data,
  });
}

export function buildListEntityIx(params: {
  owner: PublicKey;
  entityType: EntityType;
  name: string;
  priceLamports: bigint;
}): TransactionInstruction {
  const { owner, entityType, name, priceLamports } = params;
  if (priceLamports <= 0n) throw new Error('price must be > 0');
  const data = Buffer.concat([
    DISC_LIST_ENTITY,
    encU8(entityType),
    encStr(name),
    encU64(priceLamports),
  ]);
  const [entityPda]  = findEntityPda(owner, entityType, name);
  const [listingPda] = findListingPda(entityPda);
  return new TransactionInstruction({
    programId: CR_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: entityPda,  isSigner: false, isWritable: false },
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: owner,      isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildBuyEntityIx(params: {
  buyer: PublicKey;
  seller: PublicKey;
  entityType: EntityType;
  name: string;
}): TransactionInstruction {
  const { buyer, seller, entityType, name } = params;
  const data = Buffer.concat([
    DISC_BUY_ENTITY,
    encU8(entityType),
    encStr(name),
  ]);
  const [entityPda]  = findEntityPda(seller, entityType, name);
  const [listingPda] = findListingPda(entityPda);
  const [licensePda] = findLicensePda(buyer, entityPda);
  return new TransactionInstruction({
    programId: CR_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: entityPda,  isSigner: false, isWritable: false },
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: licensePda, isSigner: false, isWritable: true },
      { pubkey: seller,     isSigner: false, isWritable: true },
      { pubkey: buyer,      isSigner: true,  isWritable: true },
      { pubkey: getTreasuryAddress(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildCancelListingIx(params: {
  seller: PublicKey;
  entityType: EntityType;
  name: string;
}): TransactionInstruction {
  const { seller, entityType, name } = params;
  const data = Buffer.concat([
    DISC_CANCEL_LISTING,
    encU8(entityType),
    encStr(name),
  ]);
  const [entityPda]  = findEntityPda(seller, entityType, name);
  const [listingPda] = findListingPda(entityPda);
  return new TransactionInstruction({
    programId: CR_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: entityPda,  isSigner: false, isWritable: false },
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: seller,     isSigner: true,  isWritable: true },
    ],
    data,
  });
}

export function buildRecordRunIx(params: {
  player: PublicKey;
  nonce: bigint;
  asset: string;             // e.g. "BTCUSDT"  (≤ 16 bytes)
  timeframe: string;         // e.g. "15m"      (≤ 8 bytes)
  score: bigint;
  sharpeX100: number;        // sharpe * 100, signed (247 = 2.47, -125 = -1.25)
  durationSecs: number;
  mapHash: Uint8Array;       // 32 bytes
}): TransactionInstruction {
  const { player, nonce, asset, timeframe, score, sharpeX100,
          durationSecs, mapHash } = params;
  const data = Buffer.concat([
    DISC_RECORD_RUN,
    encU64(nonce),
    encFixedBytes(asset,     16),
    encFixedBytes(timeframe,  8),
    encU64(score),
    encI32(sharpeX100),
    encU32(durationSecs),
    encBytes32(mapHash),
  ]);
  const [runPda] = findRunPda(player, nonce);
  return new TransactionInstruction({
    programId: CR_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: runPda, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ─── SHA-256 + hex helpers (re-exports from cr-maps-program for consistency) ─

export async function sha256(input: string | Uint8Array): Promise<Uint8Array> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return new Uint8Array(digest);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

// SOL ↔ lamports (1 SOL = 1e9 lamports)
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * 1_000_000_000));
}
export function lamportsToSol(lamports: bigint | number): number {
  const n = typeof lamports === 'bigint' ? Number(lamports) : lamports;
  return n / 1_000_000_000;
}
