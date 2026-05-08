import type { Candle, Timeframe, VisibleRange } from './types.js';
export interface ChartHost {
    /** screen-space y for a given price */
    priceToY(price: number): number;
    /** price for a given screen-space y */
    yToPrice(y: number): number;
    /** ms-since-epoch timestamp for a given screen-space x */
    xToTime(x: number): number;
    /** screen-space x for a given ms-since-epoch timestamp */
    timeToX(ts: number): number;
    /** current visible window (for laser snap, indicator culling, etc.) */
    visibleRange(): VisibleRange;
    /** streaming candles for a given timeframe — async iterable so the host can
     *  yield REST history followed by live websocket ticks transparently */
    getCandles(tf: Timeframe): AsyncIterable<Candle>;
    /** subscribe to viewport-resize / pan / zoom. Returns unsubscribe. */
    onResize(cb: () => void): () => void;
    /** subscribe to per-tick updates of the right-most (live) candle. */
    onTick(cb: (c: Candle) => void): () => void;
}
//# sourceMappingURL=ChartHost.d.ts.map