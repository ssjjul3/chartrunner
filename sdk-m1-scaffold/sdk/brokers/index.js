/* ────────────────────────────────────────────────────────────────────────
 *  @chartrunner/core/brokers — broker driver registry
 * ────────────────────────────────────────────────────────────────────────
 *  M1.4 contract. Four drivers ship today; ChartRunnerSDK reads
 *  `currentBroker()` for every order route. Default = 'mock' so existing
 *  paper-trading behaviour is preserved.
 *
 *    mock           → in-memory fills (current behaviour, free dev loop)
 *    binance-paper  → REST testnet (M1.5, real venue, fake money)
 *    phoenix        → Solana CLOB via @ellipsis-labs/phoenix-sdk (M3, blocked
 *                     until npm publishes; throws "awaiting publish" today)
 *    jupiter        → Solana DEX aggregator (v1.0.53, LIVE, no SDK dep —
 *                     hits the public quote/swap HTTP API directly)
 *
 *  Switching drivers does not change SDK call shapes. Tools stay the
 *  same; settlement venue changes underneath. This is Shift 1 from the
 *  Chapter 39 capstone: "SDK becomes a broker router."
 * ──────────────────────────────────────────────────────────────────────── */

import { mockBroker } from './mock.js';
import { binancePaperBroker } from './binance-paper.js';
import { phoenixBroker } from './phoenix.js';
import { jupiterBroker } from './jupiter.js';

const REGISTRY = {
  'mock':           mockBroker,
  'binance-paper':  binancePaperBroker,
  'phoenix':        phoenixBroker,
  'jupiter':        jupiterBroker,
};

let _current = 'mock';

/** List the broker keys available right now. */
export function listBrokers(){
  return Object.keys(REGISTRY).map(k => ({
    key:   k,
    label: REGISTRY[k].label,
    state: REGISTRY[k].state,           // 'live' | 'paper' | 'pending'
    venue: REGISTRY[k].venue,
  }));
}

/** Get the active broker driver instance. */
export function currentBroker(){
  return REGISTRY[_current];
}

/** Switch the active broker. Persists to localStorage if available. */
export function setBroker(key){
  if(!REGISTRY[key]) throw new Error('Unknown broker: ' + key);
  _current = key;
  try { if(typeof localStorage !== 'undefined') localStorage.setItem('cr_broker_v1', key); } catch(_){}
  return REGISTRY[key];
}

/** Restore the persisted broker if any. Called by SDK boot. */
export function restoreBroker(){
  try {
    if(typeof localStorage === 'undefined') return _current;
    const k = localStorage.getItem('cr_broker_v1');
    if(k && REGISTRY[k]) _current = k;
  } catch(_){}
  return _current;
}

export { mockBroker, binancePaperBroker, phoenixBroker };
