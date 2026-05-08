// SignalFeed — client-side mirror of shared/signal_bus.
//
// In sandbox/paper mode, simulated. In hl-live, a readonly WebSocket
// subscription to state.json["bot_signals"]. The architecture keeps the
// browser as a SIGNAL EMITTER, never an executor — `emit` writes locally in
// sandbox, RPC's to sdk/server.py in live.
export class SandboxSignalFeed {
    signals = [];
    subs = new Set();
    active(coin) {
        return coin ? this.signals.filter(s => s.coin === coin) : this.signals.slice();
    }
    subscribe(cb) {
        this.subs.add(cb);
        return () => this.subs.delete(cb);
    }
    emit(s) {
        this.signals.push(s);
        for (const cb of this.subs) {
            try {
                cb(s);
            }
            catch { /* per-listener isolation */ }
        }
    }
}
//# sourceMappingURL=SignalFeed.js.map