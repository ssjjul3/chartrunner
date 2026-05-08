// SandboxBroker — deterministic in-browser paper book.
//
// M1 ships only this one broker. It mirrors the prototype's existing
// `sdk.bracket(...)` / `sdk.oco(...)` semantics: orders are tracked locally,
// fills are decided by candle prints, P&L is computed against the entry on
// close. No network. No real money. No signal_bus.
//
// Existing prototype callers (every Workbench laser tool, every campaign
// chapter detector) keep working unchanged when this is the active adapter
// because the public method shape is identical to today's `sdk.*`.
let _id = 0;
const nextId = () => `sandbox-${Date.now().toString(36)}-${(++_id).toString(36)}`;
export class SandboxBroker {
    name = 'sandbox';
    mode = 'sandbox';
    openOrders = new Map();
    subscribers = new Set();
    equity = 10_000;
    async placeBracket(o) {
        const entry = o.price ?? 0;
        const dir = o.side === 'buy' ? 1 : -1;
        const tp = entry + dir * o.slDistance * o.rr;
        const sl = entry - dir * o.slDistance;
        const order = {
            id: nextId(), side: o.side, type: 'bracket',
            entry, tp, sl, status: 'open',
        };
        this.openOrders.set(order.id, order);
        this.emit(order);
        return order;
    }
    async placeLadder(o) {
        // Treated as a single composite order in v1 — sub-rungs are visual.
        const order = {
            id: nextId(), side: o.side, type: 'ladder',
            entry: (o.fromPrice + o.toPrice) / 2, status: 'open',
        };
        this.openOrders.set(order.id, order);
        this.emit(order);
        return order;
    }
    async placeOCO(o) {
        const order = {
            id: nextId(), side: o.side ?? 'buy', type: 'oco',
            entry: (o.upper + o.lower) / 2, status: 'open',
        };
        this.openOrders.set(order.id, order);
        this.emit(order);
        return order;
    }
    async cancel(orderId) {
        const order = this.openOrders.get(orderId);
        if (!order)
            return;
        order.status = 'cancelled';
        this.openOrders.delete(orderId);
        this.emit(order);
    }
    async getOpenPositions() {
        // Sandbox has no real positions — only tracked orders. Surface the open
        // brackets as faux-positions so HUD code doesn't have to special-case mode.
        return Array.from(this.openOrders.values())
            .filter(o => o.status === 'open' && o.type === 'bracket')
            .map(o => ({
            coin: 'BTC', // host should override per-asset
            side: o.side,
            size: 1,
            entry: o.entry,
            unrealizedPnl: 0,
        }));
    }
    async getEquity() {
        return this.equity;
    }
    onOrderUpdate(cb) {
        this.subscribers.add(cb);
        return () => this.subscribers.delete(cb);
    }
    // Internal — called by the host's per-tick loop to mark orders against
    // the current candle. Intentionally not on the BrokerAdapter interface;
    // adapters that talk to a real exchange handle this server-side.
    tickFill(currentPrice) {
        for (const o of this.openOrders.values()) {
            if (o.status !== 'open' || o.type !== 'bracket' || o.tp == null || o.sl == null)
                continue;
            const longSide = o.side === 'buy';
            const tpHit = longSide ? currentPrice >= o.tp : currentPrice <= o.tp;
            const slHit = longSide ? currentPrice <= o.sl : currentPrice >= o.sl;
            if (tpHit) {
                o.status = 'closed';
                o.pnl = +Math.abs(o.tp - o.entry);
                this.openOrders.delete(o.id);
                this.emit(o);
            }
            else if (slHit) {
                o.status = 'closed';
                o.pnl = -Math.abs(o.entry - o.sl);
                this.openOrders.delete(o.id);
                this.emit(o);
            }
        }
    }
    emit(o) {
        for (const cb of this.subscribers) {
            try {
                cb(o);
            }
            catch { /* per-listener isolation */ }
        }
    }
}
//# sourceMappingURL=SandboxBroker.js.map