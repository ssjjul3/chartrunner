// Tests for chartrunner_oracle (real Pyth pull-oracle, lib.rs).
//
// What this covers:
//  - program wiring + PriceCertificate PDA derivation (keccak(feed_id_hex))
//  - read_certificate on an uninitialized cert reverts (account gate works)
//  - [GATED] verify_price happy path + read_certificate, against a real Pyth
//    PriceUpdateV2 account cloned into the local validator
//
// Why the happy path is gated: verify_price reads a `PriceUpdateV2` account that
// only exists if a Pyth price update has been posted. The simplest way to test
// locally is to CLONE Pyth's sponsored BTC/USD price-feed account (a live
// PriceUpdateV2) from devnet into the test validator, then call verify_price with
// a large max_age so the (now-frozen) publish_time still passes freshness.
//
// To enable it, add the clone to Anchor.toml and set the env var:
//
//   [test.validator]
//   url = "https://api.devnet.solana.com"
//   [[test.validator.clone]]
//   address = "<BTC/USD PriceUpdateV2 account on devnet>"   # the sponsored feed
//   [[test.validator.clone]]
//   address = "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ" # Pyth receiver program
//
//   PYTH_BTC_PRICE_ACCOUNT=<same address> anchor test
//
// (The sponsored price-feed account address comes from
//  @pythnetwork/pyth-solana-receiver getPriceFeedAccountAddress(0, BTC_FEED_ID).)

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { ChartrunnerOracle } from '../target/types/chartrunner_oracle';
import { expect } from 'chai';

// keccak256 is needed to derive the cert PDA seed (matches
// anchor_lang::solana_program::keccak::hash in lib.rs). Loaded defensively so a
// missing dep skips these tests instead of breaking the whole suite.
let keccak256: ((msg: string) => string) | undefined;
try { keccak256 = require('js-sha3').keccak256; } catch { /* add js-sha3 to devDeps to enable */ }

// BTC/USD — mirrors FEED_BTC_USD in lib.rs.
const BTC_FEED_HEX = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const SEED_CERT = Buffer.from('cert');

function certPda(programId: PublicKey, payer: PublicKey, feedHex: string): [PublicKey, number] {
  // seeds = [b"cert", payer, keccak256(feed_id_hex_bytes)]
  const hashHex = keccak256!(feedHex);                  // hex string, 32 bytes
  const hashBytes = Buffer.from(hashHex, 'hex');
  return PublicKey.findProgramAddressSync(
    [SEED_CERT, payer.toBuffer(), hashBytes], programId,
  );
}

describe('chartrunner_oracle', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.ChartrunnerOracle as Program<ChartrunnerOracle>;
  const payer = provider.wallet.publicKey;

  before(function () {
    if (!keccak256) this.skip(); // needs js-sha3 for PDA derivation
  });

  it('derives a deterministic PriceCertificate PDA', () => {
    const [a] = certPda(program.programId, payer, BTC_FEED_HEX);
    const [b] = certPda(program.programId, payer, BTC_FEED_HEX);
    expect(a.toBase58()).to.equal(b.toBase58());
  });

  it('read_certificate reverts when the cert does not exist yet', async () => {
    const [cert] = certPda(program.programId, payer, BTC_FEED_HEX);
    let threw = false;
    try {
      await program.methods.readCertificate().accounts({ certificate: cert }).rpc();
    } catch (_) { threw = true; }
    expect(threw, 'reading an uninitialized certificate should revert').to.equal(true);
  });

  // GATED: only runs when a real Pyth PriceUpdateV2 account is cloned in and its
  // address is provided via PYTH_BTC_PRICE_ACCOUNT (see header).
  it('verify_price reads a cloned Pyth update, then read_certificate returns it', async function () {
    const priceAcct = process.env.PYTH_BTC_PRICE_ACCOUNT;
    if (!priceAcct) this.skip();
    const priceUpdate = new PublicKey(priceAcct);
    const [cert] = certPda(program.programId, payer, BTC_FEED_HEX);

    // Large max_age so a cloned (frozen) update still passes the freshness gate.
    await program.methods
      .verifyPrice(BTC_FEED_HEX, new anchor.BN(60 * 60 * 24 * 365))
      .accounts({
        payer,
        priceUpdate,
        certificate: cert,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const c = await program.account.priceCertificate.fetch(cert);
    expect(Buffer.from(c.feedId).toString('hex'))
      .to.equal(BTC_FEED_HEX.replace(/^0x/, ''));
    expect(c.price.toString()).to.not.equal('0');

    // read_certificate now succeeds (emits PriceSnapshot).
    await program.methods.readCertificate().accounts({ certificate: cert }).rpc();
  });
});
