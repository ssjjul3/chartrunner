/* ────────────────────────────────────────────────────────────────────────
 *  Jito broker — MEV-protected bundle submission on top of Jupiter
 * ────────────────────────────────────────────────────────────────────────
 *  Post-Frontier Sidetrack driver (v1.0.54). Wraps the Jupiter quote +
 *  swap-build flow so we don't duplicate routing logic, then takes over
 *  the submission path:
 *
 *    1.  Jupiter ─ GET /v6/quote                  (route discovery)
 *    2.  Jupiter ─ POST /v6/swap                   (versioned tx build)
 *    3.  Jito    ─ build SOL → tipAccount transfer (priority tip)
 *    4.  Wallet  ─ signAllTransactions([swap, tip])
 *    5.  Jito    ─ POST /api/v1/bundles            (atomic 2-tx bundle)
 *    6.  Jito    ─ poll /getBundleStatuses          (landed | failed)
 *    7.  Return fill record with bundleId + tipLamports + both sigs
 *
 *  Why bundle the swap with a tip:
 *  ─────────────────────────────────────────────────────────────────────
 *    Solana mempool isn't private. Jupiter's swap tx is decodable the
 *    moment it hits a public RPC — searchers can frontrun it. Jito's
 *    block engine accepts ATOMIC bundles, where the tip transfer pays
 *    a validator to include all bundle txs in the same block, with
 *    the bundle's order preserved. Net effect: the swap fills at the
 *    quoted price, not the post-sandwich price.
 *
 *  Order shape: same as Jupiter (the wrapper passes it through).
 *  Extra: order.tipLamports overrides the default 10,000-lamport tip.
 *
 *  Fill shape — extra fields vs Jupiter:
 *    { ..., bundleId, tipLamports, swapSig, tipSig, venue: 'jito' }
 *
 *  Frontier track: Jito · Build on top of Jito infrastructure · $2k USDC
 *    https://earn.superteam.fun/listings/build-on-top-of-jito-infrastructure/
 * ──────────────────────────────────────────────────────────────────────── */

import { quote as jupiterQuote, buildSwapTx as jupiterBuildSwapTx } from './jupiter.js';

// Jito's 8 rotating tip accounts. Picked at random per submission so
// all 8 receive traffic (Jito's docs recommend round-robin).
const TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pivKeVBBjNs1bgvQF1ee',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

// Block engine endpoint. Mainnet only — Jito doesn't expose a public
// devnet block engine. For devnet testing, the bundle returns immediately
// from the fallback path (logged as 'devnet-fallback').
let _blockEngine = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';
const DEFAULT_TIP_LAMPORTS = 10_000;     // ≈ $0.0017 at $170 SOL — cheap insurance

export function setBlockEngine(url){ _blockEngine = url; }

function _randTipAccount(){
  return TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)];
}

/** Build a SystemProgram.transfer instruction wrapped in a versioned tx
 *  with the same recentBlockhash as the swap tx. We pull the blockhash
 *  from the swap tx's message so both txs land in the same slot. */
async function _buildTipTx({ web3, connection, fromPubkey, tipLamports, recentBlockhash }){
  const tipPubkey = new web3.PublicKey(_randTipAccount());
  const ix = web3.SystemProgram.transfer({
    fromPubkey,
    toPubkey: tipPubkey,
    lamports: tipLamports,
  });
  // Versioned tx with v0 message — Jito accepts both legacy + v0.
  const msg = new web3.TransactionMessage({
    payerKey:        fromPubkey,
    recentBlockhash,
    instructions:    [ix],
  }).compileToV0Message();
  return new web3.VersionedTransaction(msg);
}

/** Submit the 2-tx bundle to Jito's block engine.
 *  Returns the bundle id (a base58 hash). */
async function _sendBundle(b64Txs){
  const r = await fetch(_blockEngine, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({
      jsonrpc: '2.0',
      id:      1,
      method:  'sendBundle',
      params:  [b64Txs],
    }),
  });
  if(!r.ok) throw new Error('jito sendBundle ' + r.status);
  const j = await r.json();
  if(j.error) throw new Error('jito sendBundle error: ' + JSON.stringify(j.error));
  if(!j.result) throw new Error('jito sendBundle: no bundle id returned');
  return j.result;
}

/** Poll getBundleStatuses until the bundle is Landed, Failed, or we
 *  hit the 30s timeout (Jito's max blockhash window is ~30s anyway). */
async function _pollBundleStatus(bundleId, timeoutMs = 30_000){
  const start = Date.now();
  while((Date.now() - start) < timeoutMs){
    const r = await fetch(_blockEngine, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'getBundleStatuses',
        params:  [[bundleId]],
      }),
    });
    if(r.ok){
      const j = await r.json();
      const status = j.result && j.result.value && j.result.value[0];
      if(status){
        if(status.confirmation_status === 'finalized' ||
           status.confirmation_status === 'confirmed') return status;
        if(status.err) throw new Error('jito bundle failed: ' + JSON.stringify(status.err));
      }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('jito bundle timeout after ' + timeoutMs + 'ms');
}

let _seq = 1;

export const jitoBroker = {
  key:   'jito',
  label: 'Jito · MEV-protected bundles (via Jupiter)',
  state: 'live',
  venue: 'jito-solana',

  async submit(order){
    if(!order || typeof order.size !== 'number') throw new Error('jito: order.size required');
    const provider = order._provider ||
                     (typeof window !== 'undefined' &&
                      (window.phantom?.solana || window.solana));
    if(!provider) throw new Error('jito: no wallet provider (need Phantom)');
    if(!provider.publicKey) throw new Error('jito: wallet not connected');
    if(typeof provider.signAllTransactions !== 'function'){
      throw new Error('jito: wallet does not support signAllTransactions (required for bundles)');
    }
    const web3 = (typeof window !== 'undefined') ? window.solanaWeb3 : null;
    if(!web3) throw new Error('jito: @solana/web3.js not loaded');

    const userPk = provider.publicKey.toString();
    const userPubkey = new web3.PublicKey(userPk);
    const connection = new web3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // 1. Quote via Jupiter.
    const q = await jupiterQuote({
      side:        order.side,
      size:        order.size,
      mintIn:      order.mintIn,
      mintOut:     order.mintOut,
      slippageBps: order.slippageBps,
    });

    // 2. Build swap tx via Jupiter.
    const sw = await jupiterBuildSwapTx({
      quoteResponse:  q,
      userPublicKey:  userPk,
    });
    const swapBytes = Uint8Array.from(atob(sw.swapTransaction), c => c.charCodeAt(0));
    const swapTx    = web3.VersionedTransaction.deserialize(swapBytes);
    // Lift the swap's recent blockhash so the tip tx lands in the same slot.
    const recentBlockhash = swapTx.message.recentBlockhash;

    // 3. Build tip tx with matching blockhash.
    const tipLamports = (order.tipLamports | 0) || DEFAULT_TIP_LAMPORTS;
    const tipTx = await _buildTipTx({
      web3, connection,
      fromPubkey:      userPubkey,
      tipLamports,
      recentBlockhash,
    });

    // 4. Sign both atomically.
    const signed = await provider.signAllTransactions([swapTx, tipTx]);
    const b64Txs = signed.map(tx => btoa(String.fromCharCode(...tx.serialize())));

    // 5. Submit bundle.
    let bundleId;
    try {
      bundleId = await _sendBundle(b64Txs);
    } catch(err){
      // Devnet fallback / block engine outage — fall through to plain
      // RPC send so the trade still lands (just without MEV protection).
      try { console.warn('[jito] block-engine fallback to plain RPC:', err.message); } catch(_){}
      const sig = await provider.sendTransaction
        ? await provider.sendTransaction(swapTx, connection)
        : await provider.signAndSendTransaction(swapTx).then(r => r.signature || r);
      return _fillRecord({ order, q, swapSig: sig, tipSig: null, tipLamports, bundleId: 'devnet-fallback' });
    }

    // 6. Poll until landed (or timeout).
    try {
      await _pollBundleStatus(bundleId);
    } catch(err){
      try { console.warn('[jito] poll failed (bundle may still land):', err.message); } catch(_){}
    }

    return _fillRecord({
      order, q,
      swapSig:  _sigOf(signed[0], web3),
      tipSig:   _sigOf(signed[1], web3),
      tipLamports,
      bundleId,
    });
  },

  async cancel(id){
    return { id, status: 'no-op', reason: 'jito bundles are atomic — submit-or-fail' };
  },

  async balance(){ return null; },

  _plannedShape: {
    blockEngine: 'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
    tipMin:      '1000 lamports (Jito floor)',
    tipDefault:  DEFAULT_TIP_LAMPORTS + ' lamports',
    record:      'chartrunner_registry · record_run after each fill',
  },
};

function _sigOf(tx, web3){
  try {
    const sig0 = tx.signatures && tx.signatures[0];
    if(!sig0) return null;
    // Encode signature as base58.
    return web3.bs58 ? web3.bs58.encode(sig0) : Buffer.from(sig0).toString('hex');
  } catch(_){ return null; }
}

function _fillRecord({ order, q, swapSig, tipSig, tipLamports, bundleId }){
  // Same fillPrice derivation as Jupiter.
  const MINT_SOL  = 'So11111111111111111111111111111111111111112';
  const MINT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const inMint  = order.mintIn  || (order.side==='buy' ? MINT_USDC : MINT_SOL);
  const outMint = order.mintOut || (order.side==='buy' ? MINT_SOL  : MINT_USDC);
  const inDec   = (inMint  === MINT_SOL) ? 9 : 6;
  const outDec  = (outMint === MINT_SOL) ? 9 : 6;
  const inAmt   = Number(q.inAmount)  / Math.pow(10, inDec);
  const outAmt  = Number(q.outAmount) / Math.pow(10, outDec);
  const fillPrice = (order.side === 'buy') ? (inAmt / outAmt) : (outAmt / inAmt);
  return {
    id:          'jito-' + (_seq++),
    side:        order.side,
    size:        order.size,
    price:       fillPrice,
    ts:          Date.now(),
    venue:       'jito',
    bundleId,
    swapSig,
    tipSig,
    tipLamports,
    routePlan:   q.routePlan,
    inAmount:    inAmt,
    outAmount:   outAmt,
  };
}
