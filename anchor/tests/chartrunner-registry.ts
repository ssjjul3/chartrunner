// Smoke tests for chartrunner_registry. Boots a local validator, runs each
// instruction once, asserts the on-chain state matches the inputs.
//
// Coverage:
//  - save_entity (round-trip + overwrite + name/royalty validation)
//  - delete_entity (PDA closes, rent refunds)
//  - list_entity (Listing PDA created, has_one constraints honored)
//  - buy_entity (escrow tx: SOL routes seller + treasury; License PDA minted)
//  - cancel_listing (Listing closes, rent refunds to seller)
//  - record_run (RunRecord PDA stores asset/tf/score/sharpe/duration/mapHash)
//
// Each test uses fresh PDAs so order doesn't matter and reruns are idempotent.
//
// Run: `anchor test` (boots a local validator + deploys + runs Mocha)

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ChartrunnerRegistry } from '../target/types/chartrunner_registry';
import { expect } from 'chai';
import { createHash } from 'crypto';

// Mirror Rust constants — keep in sync with chartrunner-registry/src/lib.rs.
const ENTITY = {
  Map: 0, Strategy: 1, Bot: 2, Indicator: 3, Backtest: 4,
  App: 5, TokenProfile: 6, Widget: 7, Tool: 8,
} as const;
const PROTOCOL_FEE_BPS = 500;  // 5%

// PDA seed prefixes
const SEED_ENTITY  = Buffer.from('entity');
const SEED_LISTING = Buffer.from('listing');
const SEED_LICENSE = Buffer.from('license');
const SEED_RUN     = Buffer.from('run');

function entityPda(programId: PublicKey, owner: PublicKey, type: number, name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_ENTITY, Buffer.from([type]), owner.toBuffer(), Buffer.from(name)],
    programId,
  );
}
function listingPda(programId: PublicKey, entity: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEED_LISTING, entity.toBuffer()], programId);
}
function licensePda(programId: PublicKey, buyer: PublicKey, entity: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_LICENSE, buyer.toBuffer(), entity.toBuffer()], programId,
  );
}
function runPda(programId: PublicKey, player: PublicKey, nonce: anchor.BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_RUN, player.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)], programId,
  );
}

function sha256Bytes(s: string): Uint8Array {
  return createHash('sha256').update(s).digest();
}

function fixedAscii(s: string, len: number): number[] {
  const out = Buffer.alloc(len);
  Buffer.from(s, 'utf-8').copy(out, 0);
  return Array.from(out);
}

describe('chartrunner_registry', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.ChartrunnerRegistry as Program<ChartrunnerRegistry>;
  const owner = provider.wallet.publicKey;
  const treasury = program.programId;  // protocol_treasury() = crate::ID

  // ── save_entity ────────────────────────────────────────────────────────

  it('save_entity creates a fresh PDA with the right metadata', async () => {
    const name = 'BTC funding-shorts v1';
    const hash = sha256Bytes('{"asset":"BTC","tf":"15m","entry":"funding<-0.05"}');
    const royaltyBps = 250;  // 2.5%
    const [pda] = entityPda(program.programId, owner, ENTITY.Strategy, name);

    await program.methods
      .saveEntity(ENTITY.Strategy, name, Array.from(hash) as any, royaltyBps)
      .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId })
      .rpc();

    const acct = await program.account.entityRecord.fetch(pda);
    expect(acct.owner.toBase58()).to.equal(owner.toBase58());
    expect(acct.entityType).to.equal(ENTITY.Strategy);
    expect(acct.name).to.equal(name);
    expect(Buffer.from(acct.contentHash).equals(Buffer.from(hash))).to.equal(true);
    expect(acct.royaltyBps).to.equal(royaltyBps);
    expect(acct.savedAt.toNumber()).to.be.greaterThan(0);
  });

  it('save_entity overwrites the same (owner, type, name) without rent re-charge', async () => {
    const name = 'overwrite-target';
    const [pda] = entityPda(program.programId, owner, ENTITY.Bot, name);

    await program.methods
      .saveEntity(ENTITY.Bot, name, Array.from(sha256Bytes('v1')) as any, 0)
      .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId }).rpc();

    const balBefore = await provider.connection.getBalance(owner);

    const newHash = sha256Bytes('v2');
    await program.methods
      .saveEntity(ENTITY.Bot, name, Array.from(newHash) as any, 100)
      .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId }).rpc();

    const acct = await program.account.entityRecord.fetch(pda);
    expect(Buffer.from(acct.contentHash).equals(Buffer.from(newHash))).to.equal(true);
    expect(acct.royaltyBps).to.equal(100);
    // Rent not charged twice → balance loss should be just the tx fee (~5000 lamports)
    const balAfter = await provider.connection.getBalance(owner);
    const delta = balBefore - balAfter;
    expect(delta).to.be.lessThan(0.001 * LAMPORTS_PER_SOL);
  });

  it('save_entity rejects empty names', async () => {
    const [pda] = entityPda(program.programId, owner, ENTITY.Map, '');
    try {
      await program.methods
        .saveEntity(ENTITY.Map, '', Array.from(sha256Bytes('x')) as any, 0)
        .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId }).rpc();
      expect.fail('should have thrown EmptyName');
    } catch (e: any) {
      expect(String(e)).to.match(/EmptyName/);
    }
  });

  it('save_entity rejects royalty > 5000 bps', async () => {
    const name = 'royalty-test';
    const [pda] = entityPda(program.programId, owner, ENTITY.Strategy, name);
    try {
      await program.methods
        .saveEntity(ENTITY.Strategy, name, Array.from(sha256Bytes('x')) as any, 6000)
        .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId }).rpc();
      expect.fail('should have thrown RoyaltyTooHigh');
    } catch (e: any) {
      expect(String(e)).to.match(/RoyaltyTooHigh/);
    }
  });

  it('save_entity rejects entity_type out of range', async () => {
    const name = 'oob-type';
    const [pda] = PublicKey.findProgramAddressSync(
      [SEED_ENTITY, Buffer.from([99]), owner.toBuffer(), Buffer.from(name)],
      program.programId,
    );
    try {
      await program.methods
        .saveEntity(99, name, Array.from(sha256Bytes('x')) as any, 0)
        .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId }).rpc();
      expect.fail('should have thrown InvalidEntityType');
    } catch (e: any) {
      expect(String(e)).to.match(/InvalidEntityType/);
    }
  });

  // ── delete_entity ──────────────────────────────────────────────────────

  it('delete_entity closes the PDA and refunds rent to owner', async () => {
    const name = 'delete-me';
    const [pda] = entityPda(program.programId, owner, ENTITY.App, name);

    await program.methods
      .saveEntity(ENTITY.App, name, Array.from(sha256Bytes('app')) as any, 0)
      .accounts({ entity: pda, owner, systemProgram: SystemProgram.programId }).rpc();

    const balBefore = await provider.connection.getBalance(owner);
    await program.methods
      .deleteEntity(ENTITY.App, name)
      .accounts({ entity: pda, owner }).rpc();

    // Account should no longer exist
    const acct = await provider.connection.getAccountInfo(pda);
    expect(acct).to.equal(null);
    // Owner balance increased by ~rent minus tx fee
    const balAfter = await provider.connection.getBalance(owner);
    expect(balAfter).to.be.greaterThan(balBefore);
  });

  // ── list_entity + buy_entity + cancel_listing ─────────────────────────

  it('list_entity creates Listing PDA pointing at the entity', async () => {
    const name = 'list-me';
    const price = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const [ePda] = entityPda(program.programId, owner, ENTITY.Indicator, name);
    const [lPda] = listingPda(program.programId, ePda);

    await program.methods
      .saveEntity(ENTITY.Indicator, name, Array.from(sha256Bytes('ind')) as any, 0)
      .accounts({ entity: ePda, owner, systemProgram: SystemProgram.programId }).rpc();

    await program.methods
      .listEntity(ENTITY.Indicator, name, price)
      .accounts({
        entity: ePda, listing: lPda, owner,
        systemProgram: SystemProgram.programId,
      }).rpc();

    const lst = await program.account.listing.fetch(lPda);
    expect(lst.entity.toBase58()).to.equal(ePda.toBase58());
    expect(lst.seller.toBase58()).to.equal(owner.toBase58());
    expect(lst.price.toNumber()).to.equal(price.toNumber());
  });

  it('buy_entity transfers SOL (95% seller / 5% treasury) and mints License PDA', async () => {
    const name = 'buy-me';
    const price = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    const [ePda] = entityPda(program.programId, owner, ENTITY.Map, name);
    const [lPda] = listingPda(program.programId, ePda);

    // Seller (the test wallet) creates entity + lists it.
    await program.methods
      .saveEntity(ENTITY.Map, name, Array.from(sha256Bytes('map')) as any, 0)
      .accounts({ entity: ePda, owner, systemProgram: SystemProgram.programId }).rpc();
    await program.methods
      .listEntity(ENTITY.Map, name, price)
      .accounts({
        entity: ePda, listing: lPda, owner,
        systemProgram: SystemProgram.programId,
      }).rpc();

    // Fresh buyer wallet, fund with airdrop.
    const buyer = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(buyer.publicKey, 1 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    const [licPda] = licensePda(program.programId, buyer.publicKey, ePda);
    const sellerBalBefore   = await provider.connection.getBalance(owner);
    const treasuryBalBefore = await provider.connection.getBalance(treasury);

    await program.methods
      .buyEntity(ENTITY.Map, name)
      .accounts({
        entity: ePda, listing: lPda, license: licPda,
        seller: owner, buyer: buyer.publicKey,
        treasury, systemProgram: SystemProgram.programId,
      })
      .signers([buyer]).rpc();

    // License minted with right metadata.
    const lic = await program.account.license.fetch(licPda);
    expect(lic.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(lic.entity.toBase58()).to.equal(ePda.toBase58());
    expect(lic.pricePaid.toNumber()).to.equal(price.toNumber());

    // SOL routing: seller gets ~95%, treasury gets ~5% (modulo listing-rent refund noise).
    const sellerBalAfter   = await provider.connection.getBalance(owner);
    const treasuryBalAfter = await provider.connection.getBalance(treasury);
    const sellerDelta   = sellerBalAfter - sellerBalBefore;
    const treasuryDelta = treasuryBalAfter - treasuryBalBefore;
    const expectedFee   = Math.floor(price.toNumber() * PROTOCOL_FEE_BPS / 10_000);
    const expectedPayout = price.toNumber() - expectedFee;
    // Seller payout = `expectedPayout` + listing rent refund (since Listing closes to seller).
    expect(sellerDelta).to.be.greaterThan(expectedPayout - 1000);
    expect(treasuryDelta).to.equal(expectedFee);

    // Listing PDA should be closed.
    const closedListing = await provider.connection.getAccountInfo(lPda);
    expect(closedListing).to.equal(null);
  });

  it('cancel_listing closes the Listing PDA and refunds rent to seller', async () => {
    const name = 'cancel-me';
    const price = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    const [ePda] = entityPda(program.programId, owner, ENTITY.Bot, name);
    const [lPda] = listingPda(program.programId, ePda);

    await program.methods
      .saveEntity(ENTITY.Bot, name, Array.from(sha256Bytes('bot')) as any, 0)
      .accounts({ entity: ePda, owner, systemProgram: SystemProgram.programId }).rpc();
    await program.methods
      .listEntity(ENTITY.Bot, name, price)
      .accounts({
        entity: ePda, listing: lPda, owner,
        systemProgram: SystemProgram.programId,
      }).rpc();

    const balBefore = await provider.connection.getBalance(owner);
    await program.methods
      .cancelListing(ENTITY.Bot, name)
      .accounts({ entity: ePda, listing: lPda, seller: owner }).rpc();

    const closed = await provider.connection.getAccountInfo(lPda);
    expect(closed).to.equal(null);
    const balAfter = await provider.connection.getBalance(owner);
    expect(balAfter).to.be.greaterThan(balBefore);
  });

  it('list_entity rejects price = 0', async () => {
    const name = 'price-zero';
    const [ePda] = entityPda(program.programId, owner, ENTITY.Strategy, name);
    const [lPda] = listingPda(program.programId, ePda);

    await program.methods
      .saveEntity(ENTITY.Strategy, name, Array.from(sha256Bytes('s')) as any, 0)
      .accounts({ entity: ePda, owner, systemProgram: SystemProgram.programId }).rpc();
    try {
      await program.methods
        .listEntity(ENTITY.Strategy, name, new anchor.BN(0))
        .accounts({
          entity: ePda, listing: lPda, owner,
          systemProgram: SystemProgram.programId,
        }).rpc();
      expect.fail('should have thrown PriceMustBePositive');
    } catch (e: any) {
      expect(String(e)).to.match(/PriceMustBePositive/);
    }
  });

  // ── record_run ─────────────────────────────────────────────────────────

  it('record_run anchors a completed run with asset/tf/score/sharpe/duration/mapHash', async () => {
    const nonce  = new anchor.BN(Date.now());
    const score  = new anchor.BN(12_345);
    const sharpe = 247;            // 2.47
    const duration = 180;          // 180s
    const mapHash = sha256Bytes('canonical-map-json');
    const [rPda] = runPda(program.programId, owner, nonce);

    await program.methods
      .recordRun(
        nonce,
        fixedAscii('BTCUSDT', 16) as any,
        fixedAscii('15m', 8) as any,
        score,
        sharpe,
        duration,
        Array.from(mapHash) as any,
      )
      .accounts({ run: rPda, player: owner, systemProgram: SystemProgram.programId })
      .rpc();

    const r = await program.account.runRecord.fetch(rPda);
    expect(r.player.toBase58()).to.equal(owner.toBase58());
    expect(r.nonce.toNumber()).to.equal(nonce.toNumber());
    expect(r.score.toNumber()).to.equal(score.toNumber());
    expect(r.sharpeX100).to.equal(sharpe);
    expect(r.durationSecs).to.equal(duration);
    expect(Buffer.from(r.mapHash).equals(Buffer.from(mapHash))).to.equal(true);
    // Trim trailing nulls when checking asset / timeframe strings.
    expect(Buffer.from(r.asset).toString('utf-8').replace(/\0+$/, '')).to.equal('BTCUSDT');
    expect(Buffer.from(r.timeframe).toString('utf-8').replace(/\0+$/, '')).to.equal('15m');
  });
});
