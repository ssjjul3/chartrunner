/* ────────────────────────────────────────────────────────────────────────
 *  Jupiter broker — Solana DEX aggregator
 * ────────────────────────────────────────────────────────────────────────
 *  Post-Frontier Sidetrack driver (v1.0.53). Routes orders through the
 *  Jupiter v6 swap API — Solana's canonical aggregator. Coverage spans
 *  every major DEX (Phoenix, Raydium, Orca, Meteora, Lifinity, Serum,
 *  Drift, etc.) so a single quote → swap call ships the best route.
 *
 *  Order shape (matches ChartRunnerSDK contract):
 *    { side: 'buy'|'sell', size: number, price?: number, type: 'market'|'limit',
 *      mintIn?: string,           // optional override
 *      mintOut?: string,          // optional override
 *      slippageBps?: number }     // default 50 bps
 *
 *  Fill shape:
 *    { id, side, size, price, ts, venue: 'jupiter',
 *      txSig, routePlan, inAmount, outAmount }
 *
 *  Auth: none — Jupiter's public quote + swap API is free / unauthenticated
 *  at moderate request rates. For production, point at a paid endpoint
 *  via `setEndpoint()` if rate-limited.
 *
 *  Settlement path:
 *    1. quoteAPI ← GET /v6/quote (inAmount, slippageBps, mints)
 *    2. swapAPI  ← POST /v6/swap { quoteResponse, userPublicKey, wrapAndUnwrapSol }
 *                 returns base64 versioned tx
 *    3. wallet.signAndSendTransaction(decode(b64Tx))
 *    4. confirm via connection.confirmTransaction
 *    5. emit fill record; (optional) call record_run on chartrunner_registry
 *
 *  Frontier track: Jupiter · Not Your Regular Bounty · $3k jupUSD
 *    https://earn.superteam.fun/listings/build-with-jupiter/
 * ──────────────────────────────────────────────────────────────────────── */

// Default token pair: SOL → USDC. Override via order.mintIn / order.mintOut.
const MINT_SOL  = 'So11111111111111111111111111111111111111112';
const MINT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

let _seq = 1;
let _endpoint = {
  quote: 'https://quote-api.jup.ag/v6/quote',
  swap:  'https://quote-api.jup.ag/v6/swap',
};

export function setEndpoint(quote, swap){
  if(quote) _endpoint.quote = quote;
  if(swap)  _endpoint.swap  = swap;
}

/** Build a quote URL with query params. */
function _quoteUrl({ inputMint, outputMint, amount, slippageBps }){
  const u = new URL(_endpoint.quote);
  u.searchParams.set('inputMint',   inputMint);
  u.searchParams.set('outputMint',  outputMint);
  u.searchParams.set('amount',      String(amount));
  u.searchParams.set('slippageBps', String(slippageBps));
  // Jupiter's defaults exclude vote accounts + private pools; keep that.
  u.searchParams.set('onlyDirectRoutes', 'false');
  return u.toString();
}

/** Fetch a quote — exposed for game UI to preview the route before
 *  arming a Blue Laser trade. Returns the full Jupiter quoteResponse. */
export async function quote({ side='buy', size, mintIn, mintOut, slippageBps=50 } = {}){
  // For 'buy' SOL with USDC: input = USDC, output = SOL.
  // For 'sell' SOL into USDC: input = SOL, output = USDC.
  const isBuy      = side === 'buy';
  const inputMint  = mintIn  || (isBuy ? MINT_USDC : MINT_SOL);
  const outputMint = mintOut || (isBuy ? MINT_SOL  : MINT_USDC);
  // Jupiter expects `amount` in raw token units (no decimal scaling).
  // Caller passes `size` in whole-token units; we assume SOL=9 decimals,
  // USDC=6 decimals. Real production: query the mint's decimals via RPC.
  const inDecimals = (inputMint === MINT_SOL) ? 9 : 6;
  const rawAmount  = Math.round(size * Math.pow(10, inDecimals));
  const r = await fetch(_quoteUrl({ inputMint, outputMint, amount: rawAmount, slippageBps }));
  if(!r.ok) throw new Error('jupiter quote ' + r.status);
  return await r.json();
}

/** Build the swap transaction (base64) for a given quote.
 *  Caller signs + sends via their wallet. */
export async function buildSwapTx({ quoteResponse, userPublicKey, wrapAndUnwrapSol=true }){
  const r = await fetch(_endpoint.swap, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      // Jupiter applies a tiny priority fee by default; surface for tuning later.
      prioritizationFeeLamports: 'auto',
      dynamicComputeUnitLimit:   true,
    }),
  });
  if(!r.ok) throw new Error('jupiter swap-build ' + r.status);
  const j = await r.json();
  if(!j.swapTransaction) throw new Error('jupiter swap response missing swapTransaction');
  return j;          // { swapTransaction (b64), lastValidBlockHeight, ... }
}

export const jupiterBroker = {
  key:   'jupiter',
  label: 'Jupiter · Solana DEX aggregator',
  state: 'live',
  venue: 'jupiter-solana',

  async submit(order){
    if(!order || typeof order.size !== 'number') throw new Error('jupiter: order.size required');
    // Resolve the wallet provider via the host SDK runtime. The host
    // injects `order._provider` (the Phantom-style window.solana shim)
    // OR we fall back to window.phantom.solana if available.
    const provider = order._provider ||
                     (typeof window !== 'undefined' &&
                      (window.phantom?.solana || window.solana));
    if(!provider) throw new Error('jupiter: no wallet provider (need Phantom)');
    if(!provider.publicKey) throw new Error('jupiter: wallet not connected');
    const userPk = provider.publicKey.toString();

    // 1. Get a quote.
    const q = await quote({
      side:        order.side,
      size:        order.size,
      mintIn:      order.mintIn,
      mintOut:     order.mintOut,
      slippageBps: order.slippageBps,
    });

    // 2. Build the swap tx.
    const sw = await buildSwapTx({
      quoteResponse:  q,
      userPublicKey:  userPk,
    });

    // 3. Sign + send via the wallet. We need @solana/web3.js to decode
    //    the versioned-tx bytes. ChartRunner loads it async in <head>
    //    for v1.0.47's direct-Phantom save_map path, so it's available
    //    here too.
    const web3 = (typeof window !== 'undefined') ? window.solanaWeb3 : null;
    if(!web3) throw new Error('jupiter: @solana/web3.js not loaded');
    const txBytes = Uint8Array.from(atob(sw.swapTransaction), c => c.charCodeAt(0));
    const tx      = web3.VersionedTransaction.deserialize(txBytes);

    const res     = await provider.signAndSendTransaction(tx);
    const sig     = (res && res.signature) ? res.signature : (typeof res === 'string' ? res : null);
    if(!sig) throw new Error('jupiter: signAndSendTransaction returned no signature');

    // 4. Confirm. Best-effort — surface sig regardless.
    try {
      const conn = new web3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      await conn.confirmTransaction({
        signature:            sig,
        blockhash:            q.contextSlot ? null : undefined,
        lastValidBlockHeight: sw.lastValidBlockHeight,
      }, 'confirmed');
    } catch(err){
      try { console.warn('[jupiter] confirmTransaction soft-fail:', err.message); } catch(_){}
    }

    // 5. Synthesize the fill shape.
    const inDec  = ((order.mintIn  || (order.side==='buy' ? MINT_USDC : MINT_SOL)) === MINT_SOL) ? 9 : 6;
    const outDec = ((order.mintOut || (order.side==='buy' ? MINT_SOL  : MINT_USDC)) === MINT_SOL) ? 9 : 6;
    const inAmt  = Number(q.inAmount)  / Math.pow(10, inDec);
    const outAmt = Number(q.outAmount) / Math.pow(10, outDec);
    const fillPrice = (order.side === 'buy')
      ? (inAmt / outAmt)   // USDC in / SOL out = USDC per SOL
      : (outAmt / inAmt);  // USDC out / SOL in = USDC per SOL

    return {
      id:        'jup-' + (_seq++),
      side:      order.side,
      size:      order.size,
      price:     fillPrice,
      ts:        Date.now(),
      venue:     'jupiter',
      txSig:     sig,
      routePlan: q.routePlan,
      inAmount:  inAmt,
      outAmount: outAmt,
    };
  },

  async cancel(id){
    // Jupiter swaps are atomic; once submitted, there's nothing to
    // cancel on-chain. We surface a no-op so callers don't error.
    return { id, status: 'no-op', reason: 'jupiter swaps are atomic' };
  },

  async balance(){
    // Balance is read from the wallet, not the broker. Caller queries
    // via @solana/web3.js getBalance / token-account scan.
    return null;
  },

  _plannedShape: {
    sdk:        '@jup-ag/api or raw HTTP',
    api:        'https://quote-api.jup.ag/v6',
    settlement: 'on-chain via wallet.signAndSendTransaction',
    record:     'chartrunner_registry · record_run after each fill',
    programId:  'ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn',
  },
};
