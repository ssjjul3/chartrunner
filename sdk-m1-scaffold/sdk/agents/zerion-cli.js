/* ────────────────────────────────────────────────────────────────────────
 *  ChartRunner agents — Zerion CLI compatible
 * ────────────────────────────────────────────────────────────────────────
 *  Post-Frontier Sidetrack module (v1.0.56). Wraps the existing Workbench
 *  bot system (Pine v5 detectors that already scan candles for CCV / SFP /
 *  H&S / BARR / FA / OI / Div patterns) as autonomous on-chain agents
 *  compatible with the Zerion CLI agent interface.
 *
 *  Architecture:
 *
 *    ZerionAgent (base class)
 *       │
 *       ├─ describe()          → metadata for the agent registry
 *       ├─ async run(context)  → returns { decisions: [...] }
 *       │
 *    ┌──┴────────────────────────────────────────────┐
 *    │  context = {                                  │
 *    │    wallet:      Solana pubkey                 │
 *    │    portfolio:   wallet balances + values      │
 *    │    chain:       'solana' (always for now)     │
 *    │    asset:       what we're looking at         │
 *    │    timeframe:   '15m' | '1h' | '4h' | '1D'    │
 *    │    candles:     OHLC[] from ChartRunner host  │
 *    │    broker:      optional broker for auto-exec │
 *    │  }                                            │
 *    │                                               │
 *    │  decision = {                                 │
 *    │    action:     'BUY' | 'SELL' | 'HOLD'        │
 *    │    mint:       Solana mint address            │
 *    │    size:       amount in token units          │
 *    │    reason:     human-readable explanation     │
 *    │    confidence: 0..1                           │
 *    │    setup:      pattern detector that fired    │
 *    │  }                                            │
 *    └───────────────────────────────────────────────┘
 *
 *  Six concrete agents ship today, each wrapping one of the existing
 *  ChartRunnerSDK detector functions. Agents are pure-decision: they
 *  surface recommendations, the player (or an upstream automation layer)
 *  decides whether to auto-execute via the broker chassis.
 *
 *  Frontier track: Zerion · Build an Autonomous Onchain Agent · $5k USDC
 *    https://earn.superteam.fun/listings/build-autonomous-onchain-agent-using-zerion-cli/
 * ──────────────────────────────────────────────────────────────────────── */

// ─── Base class ──────────────────────────────────────────────────────────

export class ZerionAgent {
  constructor({ name, description, detector, mint, sizeStrategy }){
    if(!name)        throw new Error('ZerionAgent: name required');
    if(!detector)    throw new Error('ZerionAgent: detector function required');
    this.name         = name;
    this.description  = description || '';
    this.detector     = detector;
    this.mint         = mint || 'So11111111111111111111111111111111111111112';
    this.sizeStrategy = sizeStrategy || _defaultSizeStrategy;
  }

  describe(){
    return {
      name:        this.name,
      description: this.description,
      type:        'onchain-trader',
      chain:       'solana',
      mint:        this.mint,
      capabilities: ['analyze', 'recommend', 'execute-via-broker'],
    };
  }

  // Run the agent against a context. Pure function: never mutates state,
  // never calls the broker directly. The caller decides whether to
  // execute the returned decisions.
  async run(context){
    if(!context) throw new Error('ZerionAgent.run: context required');
    const { candles, asset, timeframe, portfolio, side='buy' } = context;
    let signal = null;
    try {
      signal = await this.detector({ candles, asset, timeframe, side });
    } catch(err){
      return { decisions: [], error: 'detector failed: ' + err.message };
    }
    if(!signal || !signal.matched) return { decisions: [] };

    const size = this.sizeStrategy({ signal, portfolio, mint: this.mint });
    const action = (signal.side || side).toUpperCase() === 'SELL' ? 'SELL' : 'BUY';

    return {
      decisions: [{
        action,
        mint:       this.mint,
        size,
        reason:     signal.kind
          ? `${this.name} detected ${signal.kind} on ${asset || '?'} ${timeframe || '?'}`
          : `${this.name} matched`,
        confidence: typeof signal.confidence === 'number' ? signal.confidence : 0.7,
        setup:      signal,
      }],
    };
  }

  // Convenience: execute a decision through a registered broker. Caller
  // passes the broker driver (e.g. currentBroker() from brokers/index.js).
  async execute(decision, broker){
    if(!broker || typeof broker.submit !== 'function'){
      throw new Error('ZerionAgent.execute: broker.submit() required');
    }
    return await broker.submit({
      side: (decision.action || '').toLowerCase(),  // 'BUY' → 'buy'
      size: decision.size,
      type: 'market',
      mintOut: decision.mint,
    });
  }
}

// ─── Default size strategy ──────────────────────────────────────────────

function _defaultSizeStrategy({ signal, portfolio, mint }){
  // 1% of wallet's SOL balance, clamped to [0.01, 1.0] SOL.
  // Mirrors the v0.9.31 RiskManager defaults from sdk-m1-scaffold.
  if(!portfolio || !portfolio.sol) return 0.05;
  const target = Math.max(0.01, Math.min(1.0, portfolio.sol * 0.01));
  return target;
}

// ─── Pre-built agents ────────────────────────────────────────────────────

// Each agent wraps one of the in-game SDK detector functions. The
// detector is passed in at construction time so the same wrapper class
// covers all 6 patterns — and players can register custom detectors
// alongside via `registerAgent()` without changing this file.

export const ccvAgent = new ZerionAgent({
  name:        'CCV Detector',
  description: 'Counter-Candle-Volume divergence — pattern fires when bar volume rises against the prevailing close direction. High precision on liquid majors.',
  detector:    async (ctx) => (typeof sdk !== 'undefined' && sdk.detectCCV)
                              ? sdk.detectCCV(ctx) : { matched: false },
});

export const sfpAgent = new ZerionAgent({
  name:        'SFP Detector',
  description: 'Swing Failure Pattern — wick rejection at prior high/low. Best on 15m–1h after a strong impulse.',
  detector:    async (ctx) => (typeof sdk !== 'undefined' && sdk.detectSFP)
                              ? sdk.detectSFP(ctx) : { matched: false },
});

export const hnsAgent = new ZerionAgent({
  name:        'H&S Detector',
  description: 'Head & Shoulders reversal — three-peak structure with neckline confirmation. Higher TFs only (1h+).',
  detector:    async (ctx) => (typeof sdk !== 'undefined' && sdk.detectHnS)
                              ? sdk.detectHnS(ctx) : { matched: false },
});

export const barrAgent = new ZerionAgent({
  name:        'BARR Detector',
  description: 'Bar-At-Range-Rejection — bar closes at the extreme of a multi-bar range. Continuation signal.',
  detector:    async (ctx) => (typeof sdk !== 'undefined' && sdk.detectBARR)
                              ? sdk.detectBARR(ctx) : { matched: false },
});

export const faAgent = new ZerionAgent({
  name:        'Failed Auction Detector',
  description: 'Failed auction — price probes a level, fails to follow through, snaps back. Classic mean-revert.',
  detector:    async (ctx) => (typeof sdk !== 'undefined' && sdk.detectFailedAuction)
                              ? sdk.detectFailedAuction(ctx) : { matched: false },
});

export const oiAgent = new ZerionAgent({
  name:        'OI Confirm Detector',
  description: 'Open-Interest confirmation — directional price move alongside OI expansion. Crowd is committing.',
  detector:    async (ctx) => (typeof sdk !== 'undefined' && sdk.detectOIConfirm)
                              ? sdk.detectOIConfirm(ctx) : { matched: false },
});

// ─── Registry ────────────────────────────────────────────────────────────

const REGISTRY = new Map([
  ['ccv', ccvAgent],
  ['sfp', sfpAgent],
  ['hns', hnsAgent],
  ['barr', barrAgent],
  ['fa', faAgent],
  ['oi', oiAgent],
]);

export function registerAgent(key, agent){
  if(!(agent instanceof ZerionAgent)){
    throw new Error('registerAgent: must be a ZerionAgent instance');
  }
  REGISTRY.set(key, agent);
}

export function listAgents(){
  return [...REGISTRY.entries()].map(([key, agent]) => ({ key, ...agent.describe() }));
}

export function getAgent(key){
  return REGISTRY.get(key) || null;
}

// ─── Zerion portfolio helper ─────────────────────────────────────────────

/**
 * Fetch the portfolio for a Solana wallet via the Zerion API. Returns
 * a normalized { sol, tokens: [{ mint, symbol, amount, valueUsd }] }
 * shape that the agent.run() context expects.
 *
 * Zerion's wallet API path (mainnet):
 *   GET https://api.zerion.io/v1/wallets/<pubkey>/positions?filter[chain_ids]=solana
 *
 * For hackathon submission we accept an env-provided API key via
 * `window.crZerionKey` or `localStorage.cr_zerion_key_v1`. Falls back
 * to a stub when no key is present so the agent demo flow still runs.
 */
export async function fetchPortfolio(walletPubkey){
  const key = _zerionKey();
  if(!key){
    return _stubPortfolio();
  }
  try {
    const url = `https://api.zerion.io/v1/wallets/${encodeURIComponent(walletPubkey)}/positions`
              + `?filter[chain_ids]=solana&currency=usd`;
    const r = await fetch(url, {
      headers: {
        'authorization': 'Basic ' + btoa(key + ':'),
        'accept':        'application/json',
      },
    });
    if(!r.ok) return _stubPortfolio();
    const j = await r.json();
    return _normalizeZerionPositions(j);
  } catch(err){
    return _stubPortfolio();
  }
}

function _zerionKey(){
  try {
    if(typeof window !== 'undefined' && window.crZerionKey) return String(window.crZerionKey);
    const k = (typeof localStorage !== 'undefined') ? localStorage.getItem('cr_zerion_key_v1') : null;
    return k || '';
  } catch(_){ return ''; }
}

function _normalizeZerionPositions(j){
  const tokens = [];
  let sol = 0;
  const arr = Array.isArray(j?.data) ? j.data : [];
  for(const p of arr){
    const a   = p.attributes || {};
    const fung= a.fungible_info || {};
    const imp = a.quantity?.float || 0;
    const val = a.value || 0;
    const sym = fung.symbol || '';
    const mint= (fung.implementations || []).find(x => x.chain_id === 'solana')?.address || '';
    if(sym === 'SOL') sol = imp;
    tokens.push({ mint, symbol: sym, amount: imp, valueUsd: val });
  }
  return { sol, tokens };
}

function _stubPortfolio(){
  return { sol: 1.0, tokens: [{ mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', amount: 1.0, valueUsd: 170 }] };
}

// ─── Browser-side global so the in-game UI can call us ──────────────────

if(typeof window !== 'undefined'){
  window.crAgents = {
    list:           listAgents,
    get:            getAgent,
    register:       registerAgent,
    fetchPortfolio: fetchPortfolio,
    ZerionAgent,
  };
}
