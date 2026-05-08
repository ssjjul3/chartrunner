export type Timeframe = '15m' | '1h' | '4h' | '12h' | '1d' | '3d' | '1w' | '1M';
export interface Candle {
    /** open timestamp, ms since epoch */
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
}
export type Side = 'buy' | 'sell';
export interface BracketOrder {
    side: Side;
    /** intended entry price (market when omitted) */
    price?: number;
    /** stop-loss distance in price units */
    slDistance: number;
    /** target multiple of slDistance (e.g. 2.0 = 1:2 R:R) */
    rr: number;
    /** notional risk in USD */
    risk: number;
}
export interface LadderOrder {
    side: Side;
    fromPrice: number;
    toPrice: number;
    rungs: number;
    totalSize: number;
}
export interface OCOOrder {
    upper: number;
    lower: number;
    size: number;
    /** which side the bracket is hedging (used to decide which leg cancels which) */
    side?: Side;
}
export interface OrderResult {
    id: string;
    side: Side;
    type: 'bracket' | 'ladder' | 'oco' | 'limit' | 'market';
    entry: number;
    tp?: number;
    sl?: number;
    status: 'open' | 'filled' | 'cancelled' | 'closed';
    pnl?: number;
}
export interface Position {
    coin: string;
    side: Side;
    size: number;
    entry: number;
    unrealizedPnl: number;
}
export type RiskMode = 'sandbox' | 'paper' | 'signed-testnet' | 'live';
export interface Signal {
    source: string;
    direction: 'LONG' | 'SHORT';
    confidence: number;
    coin: string;
    reason: string;
    metadata?: Record<string, unknown>;
}
export interface LocalSignal extends Signal {
    /** locally-generated signals carry an originating ability id */
    abilityId?: string;
}
export interface GateDecision {
    approved: boolean;
    reason: string;
}
/** Visible-range view of the chart host. Coordinates in screen-space. */
export interface VisibleRange {
    t0: number;
    t1: number;
    p0: number;
    p1: number;
}
/** Generic game-state snapshot the SDK needs from the host. Kept narrow. */
export interface GameState {
    asset: string;
    timeframe: Timeframe;
    riskMode: RiskMode;
    /** wall-clock ms since the run started; 0 if not in a run */
    runMs: number;
}
//# sourceMappingURL=types.d.ts.map