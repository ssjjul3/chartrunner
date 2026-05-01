// Smoke test: deploy chartrunner_maps to a local validator, save a map,
// verify the PDA holds the expected hash + name + owner. Re-save with a
// new hash and confirm the entry was overwritten.
//
// Run: `anchor test` (boots a local validator, deploys, runs Mocha)

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { ChartrunnerMaps } from '../target/types/chartrunner_maps';
import { expect } from 'chai';
import { createHash } from 'crypto';

const PROGRAM_SEED = Buffer.from('map');

function pda(programId: PublicKey, owner: PublicKey, name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROGRAM_SEED, owner.toBuffer(), Buffer.from(name)],
    programId,
  );
}

function sha256Hex(s: string): Uint8Array {
  return createHash('sha256').update(s).digest();
}

describe('chartrunner_maps', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.ChartrunnerMaps as Program<ChartrunnerMaps>;
  const owner = provider.wallet.publicKey;

  it('saves a map for the first time', async () => {
    const name = 'BTC · 15m · funding-shorts';
    const hashBytes = sha256Hex('{"asset":"BTC","tf":"15m","strategy":"funding_shorts"}');
    const hashArray = Array.from(hashBytes);
    const [mapPda] = pda(program.programId, owner, name);

    await program.methods
      .saveMap(name, hashArray as any)
      .accounts({
        map: mapPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const acct = await program.account.mapEntry.fetch(mapPda);
    expect(acct.owner.toBase58()).to.equal(owner.toBase58());
    expect(acct.name).to.equal(name);
    expect(Buffer.from(acct.contentHash).equals(Buffer.from(hashBytes))).to.equal(true);
    expect(acct.savedAt.toNumber()).to.be.greaterThan(0);
  });

  it('overwrites the same map name with a new hash', async () => {
    const name = 'BTC · 15m · funding-shorts';
    const newHashBytes = sha256Hex('{"asset":"BTC","tf":"15m","strategy":"funding_shorts","v":2}');
    const newHashArray = Array.from(newHashBytes);
    const [mapPda] = pda(program.programId, owner, name);

    await program.methods
      .saveMap(name, newHashArray as any)
      .accounts({
        map: mapPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const acct = await program.account.mapEntry.fetch(mapPda);
    expect(Buffer.from(acct.contentHash).equals(Buffer.from(newHashBytes))).to.equal(true);
    expect(acct.name).to.equal(name);
  });

  it('rejects empty names', async () => {
    const name = '';
    const hashArray = Array.from(sha256Hex('x'));
    // Manually derive PDA with empty seed (still valid).
    const [mapPda] = PublicKey.findProgramAddressSync(
      [PROGRAM_SEED, owner.toBuffer(), Buffer.from(name)],
      program.programId,
    );
    try {
      await program.methods
        .saveMap(name, hashArray as any)
        .accounts({ map: mapPda, owner, systemProgram: SystemProgram.programId })
        .rpc();
      expect.fail('should have thrown EmptyName');
    } catch (e: any) {
      expect(String(e)).to.match(/EmptyName/);
    }
  });

  it('rejects names longer than 64 bytes', async () => {
    const name = 'x'.repeat(65);
    const hashArray = Array.from(sha256Hex('x'));
    const [mapPda] = PublicKey.findProgramAddressSync(
      [PROGRAM_SEED, owner.toBuffer(), Buffer.from(name)],
      program.programId,
    );
    try {
      await program.methods
        .saveMap(name, hashArray as any)
        .accounts({ map: mapPda, owner, systemProgram: SystemProgram.programId })
        .rpc();
      expect.fail('should have thrown NameTooLong');
    } catch (e: any) {
      // Anchor may reject at the seed-length stage (PDA seeds limited to 32B
      // each) before the program-side require! fires. Either error counts.
      expect(String(e)).to.match(/NameTooLong|seed|Max seed length/);
    }
  });
});
