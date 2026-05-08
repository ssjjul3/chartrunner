import type { Signal, LocalSignal } from './types.js';
export interface SignalFeed {
    /** read currently-active signals; optionally filter by coin */
    active(coin?: string): Signal[];
    /** subscribe to new / updated signals from the bus */
    subscribe(cb: (s: Signal) => void): () => void;
    /** emit a signal — local in sandbox/paper, RPC in live */
    emit(s: LocalSignal): void;
}
export declare class SandboxSignalFeed implements SignalFeed {
    private signals;
    private subs;
    active(coin?: string): Signal[];
    subscribe(cb: (s: Signal) => void): () => void;
    emit(s: LocalSignal): void;
}
//# sourceMappingURL=SignalFeed.d.ts.map