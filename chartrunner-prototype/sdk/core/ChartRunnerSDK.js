/* @chartrunner/core — ChartRunnerSDK (extracted, M1.2 lift-and-shift)
 *
 * Verbatim extraction from ChartRunner_Prototype.html lines 8438–9948.
 * The original class is preserved unchanged in semantics; only:
 *   - `class` → `export class`
 *   - global `game.x` → `(globalThis as any).game.x`
 *   - global `candles` → `(globalThis as any).candles`
 *
 * The prototype currently keeps its inline class as well; M1.4 deletes it
 * and replaces with `import { ChartRunnerSDK } from '@chartrunner/core'`.
 *
 * TODO list before M1 ships:
 *   - Tighten `any` types as methods are reviewed (~30 methods, no rush)
 *   - Split into BrokerAdapter / SignalFeed surfaces (M1.5, optional)
 *   - Wire SandboxBroker (currently a stub) to delegate to ChartRunnerSDK
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck — lift-and-shift; type tightening is a follow-up commit.
export class ChartRunnerSDK {
    constructor() {
        this.listeners = {};
        this.openOrders = [];
        this.activeEffects = [];
        this.nextId = 1;
        // v0.8g — Phase-1 prep: host-aware dispatch.
        // 'standalone' = running inside ChartRunner's own canvas game (current default).
        // 'tv'         = running as an overlay on a TradingView host chart (Phase 1).
        // 'dex'        = running inside a DEX frontend like Dexscreener (Phase 1).
        // Reframe methods (hedgeParachute / liquidityRadar / rescueDrone) branch on
        // this flag — in 'standalone' they run the original game logic, in 'tv' they
        // route to a TV-native primitive (inverseBracket / toggleIndicator / closeAll).
        this.hostMode = 'standalone';
        // v0.8g — capability descriptor. Shape per-method:
        //   true       = 1:1 available on every host (TV-native primitive)
        //   'reframe'  = available on every host; in non-standalone it aliases to a
        //                TV-native primitive (see the method body for the target).
        //   'standalone' = only exists in standalone; hidden in TV/DEX hosts.
        // This is the single source of truth that Phase 1 adapters can introspect.
        this.capabilities = {
            bracket: true,
            ladder: true,
            fibLadder: true, // v0.8k#18 — fib-weighted ladder primitive
            oco: true,
            trailStop: true,
            inverseBracket: true,
            closeAll: true,
            toggleIndicator: true,
            // v0.9.8j — All three former 'reframe' primitives now route through
            // real underlying actions in standalone too:
            //   - hedgeParachute (v0.9.7d): opens real inverseBracket + 6s buffer
            //   - liquidityRadar (v0.9.8j): toggles in-game VRVP indicator + 5s scan
            //   - rescueDrone    (v0.9.8j): calls closeAll() + arms immunity effect
            // The SDK promise 'every ability is a real trading primitive' now
            // holds uniformly without the asterisk. capabilities flag = true.
            hedgeParachute: true,
            liquidityRadar: true,
            rescueDrone: true,
            // v0.9.8 — Tier 1: missing-basics that real traders expect. All five
            // are fully implementable in standalone via the existing openOrders
            // bookkeeping; no reframe needed.
            market: true,
            limit: true,
            stopLoss: true,
            takeProfit: true,
            scaleOut: true,
            // v0.9.8 — Tier 2: pro-trader primitives that signal sophistication.
            twap: true,
            iceberg: true,
            trailingTakeProfit: true,
            ocoBracket: true,
            ifThen: true,
            // v0.9.8 — Tier 3: Solana / Hyperliquid signature plays. fundingSnipe
            // and copyTrade are 'reframe' until Phase 2 venue data lands; the
            // others compose existing primitives.
            fundingSnipe: 'reframe',
            borrowShort: true,
            liquidationGuard: true,
            copyTrade: 'reframe',
            perpFlip: true,
            // v0.9.8 — Tier 4: gameplay-flavored, uniquely-ChartRunner. comboTrade
            // composes pre-baked multi-leg setups; autoFib derives swing then
            // delegates to fibLadder; magnet is pure gameplay (TP-tightening).
            comboTrade: true,
            autoFib: true,
            magnet: true,
            // v0.9.10 — CCV Setup composite detector (PDF ~80% WR claim).
            detectCCV: true,
            // v0.9.11 — Pattern detectors.
            detectBumpAndRun: true,
            detectHeadShoulders: true,
            // v0.9.12 — Promoted SFP + Failed Auction + OI confirm.
            detectSFP: true,
            detectFailedAuction: true,
            detectOIConfirm: true,
        };
    }
    // v0.8g — allow host adapters to switch mode post-construction.
    setHostMode(mode) {
        if (!['standalone', 'tv', 'dex'].includes(mode))
            return false;
        this.hostMode = mode;
        this._emit('hostMode', { mode });
        return true;
    }
    on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
    _emit(evt, p) {
        // v0.9.49 — Stamp paper:true on every order originating in campaign mode.
        // The SDK doesn't change behaviour (this prototype was already mock-only)
        // but the Journal + any future host adapter can branch on the flag.
        try {
            if (evt === 'order' && p && typeof globalThis.game !== 'undefined' && globalThis.game.papertrade) {
                if (p.order)
                    p.order.paper = true;
                if (Array.isArray(p.orders))
                    p.orders.forEach(o => { if (o)
                        o.paper = true; });
            }
        }
        catch (_) { }
        (this.listeners[evt] || []).forEach(f => f(p));
    }
    _id() { return this.nextId++; }
    ladder({ side = 'buy', rungs = 5, spacing = 30, size = 4, price }) {
        const orders = [];
        for (let i = 1; i <= rungs; i++) {
            const off = (side === 'buy' ? -1 : 1) * spacing * i;
            const o = { id: this._id(), type: 'ladder', side, price: price + off, size };
            this.openOrders.push(o);
            orders.push(o);
        }
        this._emit('order', { kind: 'ladder', orders });
        return orders;
    }
    // v0.8k#18 — Fibonacci Ladder. Places 5 ladder-type orders at fib-weighted
    // offsets (0.236 / 0.382 / 0.5 / 0.618 / 0.786) times `base` from `price`.
    // Emits the same {kind:'ladder',orders} payload so the visual overlay +
    // fill logic in tick() treat it as a standard ladder.
    fibLadder({ side = 'buy', size = 4, price, base = 60 } = {}) {
        const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
        const dir = side === 'buy' ? -1 : 1;
        const orders = [];
        for (const f of levels) {
            const off = dir * base * f;
            const o = { id: this._id(), type: 'ladder', side, price: price + off, size };
            this.openOrders.push(o);
            orders.push(o);
        }
        this._emit('order', { kind: 'ladder', orders });
        return orders;
    }
    bracket({ risk = 20, rr = 2.0, side = 'buy', price, slDistance = 60 }) {
        // size is purely visual; risk/RR drives the real P&L math via slDistance
        const size = Math.max(1, risk / Math.max(0.001, slDistance) * 100);
        const tp = price + (side === 'buy' ? +rr * slDistance : -rr * slDistance);
        const sl = price + (side === 'buy' ? -slDistance : +slDistance);
        // Bracket lifecycle: 'pending' → price touches entry → 'open' → tp or sl → 'closed'
        // Quick mode places at current price, so we mark 'open' immediately so the player sees a live position.
        const pkg = {
            id: this._id(), type: 'bracket', side, entry: price, tp, sl, size,
            risk, rr, slDistance,
            status: 'open', // pending | open | closed
            openedAt: performance.now() / 1000,
            pnl: 0, // realized $ once closed
        };
        this.openOrders.push(pkg);
        this._emit('order', { kind: 'bracket', order: pkg });
        return pkg;
    }
    oco({ upper = +80, lower = -80, size = 6, price }) {
        const a = { id: this._id(), type: 'oco', side: 'sell', price: price + upper, size, pair: null };
        const b = { id: this._id(), type: 'oco', side: 'buy', price: price + lower, size, pair: null };
        a.pair = b.id;
        b.pair = a.id;
        this.openOrders.push(a, b);
        this._emit('order', { kind: 'oco', orders: [a, b] });
        return [a, b];
    }
    // v0.8d #8 — Trailing Stop. Armed on an existing open bracket; SL ratchets in
    // the favorable direction each tick, never retreats. Distance defaults to the
    // bracket's original slDistance so behavior is predictable. Returns the order
    // (with `trailing` attached) on success, null if the id isn't an open bracket.
    trailStop({ id, distance } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || o.type !== 'bracket' || o.status !== 'open')
            return null;
        const dist = Math.max(0.001, distance != null ? distance : o.slDistance);
        o.trailing = { active: true, distance: dist, breakeven: false };
        this._emit('trail', { order: o });
        return o;
    }
    // v0.8g — Inverse Bracket. Opens a bracket on the opposite side of `side`
    // with a tight TP (default RR=1). Used by hedgeParachute() in TV host mode
    // to replace the 6-second auto-close game mechanic with a real, TP/SL-bounded
    // protective position. Falls through to this.bracket() so the entire bracket
    // lifecycle (fill/close/edit) works unchanged.
    inverseBracket({ side = 'buy', risk = 20, rr = 1.0, price, slDistance = 40 } = {}) {
        const opp = side === 'buy' ? 'sell' : 'buy';
        return this.bracket({ side: opp, risk, rr, price, slDistance });
    }
    // v0.8g — Close-All / Flatten. Marks every still-open order `closed` with
    // reason='flatten'. Emits one bulk event + per-order 'bracketClose' for
    // existing listeners. Used by rescueDrone() in TV host mode.
    closeAll({ types = ['bracket', 'ladder', 'oco'] } = {}) {
        const closed = [];
        for (const o of this.openOrders) {
            if (o.status === 'closed' || o.cancelled)
                continue;
            if (!types.includes(o.type))
                continue;
            if (o.type === 'bracket') {
                o.status = 'closed';
                o.outcome = 'flatten';
                o.exitPrice = null; // market-close; exit-price TBD by caller
                o.pnl = 0; // conservative: no fake P&L for a manual flatten
                this._emit('bracketClose', { order: o, reason: 'flatten' });
            }
            else {
                o.cancelled = true;
                this._emit('cancel', { order: o, reason: 'flatten' });
            }
            closed.push(o.id);
        }
        this._emit('closeAll', { ids: closed, count: closed.length });
        return { count: closed.length, ids: closed };
    }
    // v0.8g — Indicator toggle stub. Standalone: pushes an effect that the
    // renderer can pick up to briefly reveal an indicator-style overlay (e.g.
    // a pulse over a volume profile range). TV host: the adapter intercepts
    // 'effect'+{kind:'indicator'} and calls the real TV indicator API.
    toggleIndicator({ name = 'VolumeProfileFixedRange', visible = true, duration = 5 } = {}) {
        const e = {
            id: this._id(), type: 'indicator', name, visible,
            until: duration ? performance.now() / 1000 + duration : null,
        };
        this.activeEffects.push(e);
        this._emit('effect', { kind: 'indicator', effect: e });
        return e;
    }
    // v0.8g — Reframe dispatch. In standalone the original game effect drives
    // the HUD (hedgeUntil / radarUntil / rescueArmed). In TV host mode the
    // method aliases to the TV-native primitive the audit chose for it.
    hedgeParachute({ duration = 6, side = 'buy', price, risk = 20 } = {}) {
        if (this.hostMode !== 'standalone') {
            // TV alias: an inverse bracket with tight TP replaces the 6-second buffer.
            if (price == null)
                return null; // TV caller must supply context
            this._emit('reframe', { from: 'hedgeParachute', to: 'inverseBracket' });
            return this.inverseBracket({ side, risk, rr: 1.0, price, slDistance: 40 });
        }
        // v0.9.7d — Standalone hedge now opens a REAL inverseBracket alongside the
        // 6-second visual buffer effect. Closes the previous gap where standalone
        // was a pure power-up timer with no underlying position. Now the SDK
        // promise ("every ability is a real trading primitive") holds uniformly:
        //   - Price provided → real opposing bracket fires + buffer effect for game-feel
        //   - Price missing  → buffer-only fallback (preserves legacy callers + the
        //     safety-net trigger paths that don't have price context)
        // The buffer effect carries `orderId` so any future tracker can join the
        // visual shield to the underlying position.
        let realOrder = null;
        if (price != null) {
            realOrder = this.inverseBracket({ side, risk, rr: 1.0, price, slDistance: 40 });
        }
        const e = {
            id: this._id(),
            type: 'hedge',
            until: performance.now() / 1000 + duration,
            orderId: realOrder ? realOrder.id : null,
        };
        this.activeEffects.push(e);
        this._emit('effect', { kind: 'hedge', effect: e, order: realOrder });
        // Return the underlying order when one was opened so callers can edit /
        // cancel it; fall back to the effect for the buffer-only path.
        return realOrder || e;
    }
    liquidityRadar({ range = 320 } = {}) {
        if (this.hostMode !== 'standalone') {
            // TV alias: flash TV's Volume Profile indicator for `range`-mapped duration.
            this._emit('reframe', { from: 'liquidityRadar', to: 'toggleIndicator' });
            return this.toggleIndicator({ name: 'VolumeProfileFixedRange', duration: 5 });
        }
        // v0.9.8j — Standalone now ALSO toggles the in-game VRVP indicator
        // alongside the 5s visual scan. Mirrors the v0.9.7d hedge pattern:
        // standalone is no longer a pure power-up timer; it actually surfaces
        // the same volume-profile data a real trader uses, just with a
        // gameplay-flavored coat of paint (the scan beam).
        try {
            if (typeof INDICATOR_STATE !== 'undefined' && INDICATOR_STATE.active) {
                if (!INDICATOR_STATE.active.has('vrvp')) {
                    INDICATOR_STATE.active.add('vrvp');
                    // Flag for auto-disable so the indicator only stays on for the
                    // 5-second scan window. A simple setTimeout — game already
                    // tolerates indicator state mutations from outside its own UI.
                    setTimeout(() => {
                        try {
                            INDICATOR_STATE.active.delete('vrvp');
                        }
                        catch (_) { }
                    }, 5000);
                }
            }
        }
        catch (_) { }
        const e = { id: this._id(), type: 'radar', until: performance.now() / 1000 + 5, range };
        this.activeEffects.push(e);
        this._emit('effect', { kind: 'radar', effect: e });
        return e;
    }
    rescueDrone() {
        if (this.hostMode !== 'standalone') {
            // TV alias: flatten every open position. No in-game immunity — that's
            // pure fantasy and doesn't exist on a real chart.
            this._emit('reframe', { from: 'rescueDrone', to: 'closeAll' });
            return this.closeAll();
        }
        // v0.9.8j — Standalone now ALSO calls closeAll() in addition to arming
        // the immunity effect. Player gets BOTH the gameplay shield AND a real
        // position flatten — the SDK promise ('every ability is a real trading
        // primitive') holds uniformly. Same fix shape as v0.9.7d hedge.
        const flattened = this.closeAll();
        const e = { id: this._id(), type: 'rescue', armed: true, flattenedCount: (flattened ? flattened.count : 0) };
        this.activeEffects.push(e);
        this._emit('effect', { kind: 'rescue', effect: e, flattened: flattened });
        return e;
    }
    // ─── v0.9.8 TIER 1 ─ Missing-basics every real trader expects ────────
    // These are the obvious holes left by the bracket-centric original SDK.
    // Each is composable from the existing openOrders + tick() machinery.
    /** Instant fill at current price. Pure entry, no TP/SL coupling. Useful
     *  for momentum entries where the player wants exposure NOW and will
     *  manage exits later (via stopLoss / takeProfit). */
    market({ side = 'buy', size = 1, price } = {}) {
        if (price == null)
            return null;
        const o = {
            id: this._id(), type: 'market', side, entry: price, size,
            filledAt: performance.now() / 1000, status: 'open', pnl: 0,
        };
        this.openOrders.push(o);
        this._emit('order', { kind: 'market', order: o });
        this._emit('fill', { order: o, price });
        return o;
    }
    /** Resting limit order. Fills when price crosses. Decouples entry from
     *  exit (unlike bracket which forces TP+SL coupling at creation). */
    limit({ side = 'buy', price, size = 1 } = {}) {
        if (price == null)
            return null;
        const o = {
            id: this._id(), type: 'limit', side, price, size,
            status: 'pending',
        };
        this.openOrders.push(o);
        this._emit('order', { kind: 'limit', order: o });
        return o;
    }
    /** Add or move a stop-loss on an existing open position (bracket or
     *  market). Returns the patched order or null if not found. */
    stopLoss({ id, price } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || price == null)
            return null;
        if (o.status === 'closed' || o.cancelled)
            return null;
        o.sl = price;
        // Recompute slDistance for trailing-stop logic if it gets armed later.
        if (o.entry != null) {
            o.slDistance = Math.abs(o.entry - price);
        }
        this._emit('modify', { order: o, field: 'sl', price });
        return o;
    }
    /** Add or move a take-profit on an existing open position. Symmetric to
     *  stopLoss. Useful after entering with market() and deciding the exit
     *  level reactively. */
    takeProfit({ id, price } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || price == null)
            return null;
        if (o.status === 'closed' || o.cancelled)
            return null;
        o.tp = price;
        this._emit('modify', { order: o, field: 'tp', price });
        return o;
    }
    /** Partial close at a specified fraction of the position size. Pro-trader
     *  signature ("take 25% off at 2R"). Reduces `size` on the live order,
     *  records realized P&L on the closed slice, and emits a 'partial' event
     *  so visual overlays can fade the closed quarter. */
    scaleOut({ id, fraction = 0.25, price } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || o.status === 'closed' || o.cancelled)
            return null;
        if (price == null || fraction <= 0 || fraction >= 1)
            return null;
        const closeSize = o.size * fraction;
        const remaining = o.size - closeSize;
        // Realized P&L on the closed slice — uses entry vs partial-exit price.
        if (o.entry != null) {
            const dir = o.side === 'buy' ? 1 : -1;
            const slicePnl = dir * (price - o.entry) * closeSize;
            o.pnl = (o.pnl || 0) + slicePnl;
        }
        o.size = remaining;
        this._emit('partial', { order: o, fraction, closeSize, price });
        return o;
    }
    // ─── v0.9.8 TIER 2 ─ Pro-trader primitives ────────────────────────────
    /** Time-Weighted Average Price. Splits a total size into N market slices
     *  fired at fixed intervals. Real venues (Hyperliquid, Binance) ship this
     *  natively; we schedule slices via setTimeout so the standalone game
     *  shows the staggered fills as the chart progresses. */
    twap({ side = 'buy', totalSize = 10, slices = 5, intervalSecs = 2, price } = {}) {
        if (price == null || slices < 1)
            return null;
        const sliceSize = totalSize / slices;
        const planId = this._id();
        const plan = {
            id: planId, type: 'twap', side, totalSize, sliceSize,
            slices, intervalSecs, fired: 0, slices_orders: [],
            status: 'running', createdAt: performance.now() / 1000,
        };
        this.openOrders.push(plan);
        const fireSlice = () => {
            if (plan.status !== 'running')
                return;
            const order = this.market({ side, size: sliceSize, price });
            if (order)
                plan.slices_orders.push(order.id);
            plan.fired++;
            this._emit('twap', { plan, sliceIndex: plan.fired, sliceOrder: order });
            if (plan.fired >= plan.slices) {
                plan.status = 'completed';
                this._emit('twap', { plan, completed: true });
            }
        };
        fireSlice(); // first slice fires immediately
        for (let i = 1; i < slices; i++) {
            setTimeout(fireSlice, i * intervalSecs * 1000);
        }
        this._emit('order', { kind: 'twap', order: plan });
        return plan;
    }
    /** Iceberg: large order with only a small visible portion. As each visible
     *  slice fills, the next slice is exposed. In standalone we model this
     *  as N stacked limit orders at the same price — only the front one is
     *  flagged 'visible'; the others are 'hidden' until promoted. */
    iceberg({ side = 'buy', visibleSize = 1, hiddenSize = 10, price } = {}) {
        if (price == null || hiddenSize <= 0)
            return null;
        const totalSlices = Math.ceil(hiddenSize / visibleSize);
        const slices = [];
        for (let i = 0; i < totalSlices; i++) {
            const o = this.limit({ side, price, size: visibleSize });
            if (o) {
                o.iceberg = true;
                o.icebergSliceIndex = i;
                o.icebergVisible = (i === 0); // only first slice is visible to the book
                slices.push(o);
            }
        }
        const plan = { id: this._id(), type: 'iceberg', side, price, slices: slices.map(o => o.id) };
        this._emit('order', { kind: 'iceberg', plan, slices });
        return plan;
    }
    /** Trailing take-profit: TP that ratchets UP with price for longs (DOWN
     *  for shorts). Mirror of trailStop on the upside. The fill check in
     *  tick() reads `tp` so the per-frame ratchet update is enough. */
    trailingTakeProfit({ id, distance } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || o.type !== 'bracket' || o.status !== 'open')
            return null;
        const dist = Math.max(0.001, distance != null ? distance : Math.abs((o.tp || o.entry) - o.entry));
        o.trailingTp = { active: true, distance: dist };
        this._emit('trailTp', { order: o });
        return o;
    }
    /** OCO bracket: two pending bracket entries; first to fill cancels the
     *  other. Common breakout setup ("buy on break above X, sell on break
     *  below Y"). Returns the pair as { up, down }. */
    ocoBracket({ upper, lower, side = 'buy', risk = 20, rr = 2.0, slDistance = 60 } = {}) {
        if (upper == null || lower == null)
            return null;
        const a = this.bracket({ side: 'buy', risk, rr, price: upper, slDistance });
        const b = this.bracket({ side: 'sell', risk, rr, price: lower, slDistance });
        a.status = 'pending';
        b.status = 'pending';
        a.ocoPair = b.id;
        b.ocoPair = a.id;
        this._emit('order', { kind: 'ocoBracket', orders: [a, b] });
        return { up: a, down: b };
    }
    /** Conditional / If-Then: when `triggerPrice` is touched, execute `then`
     *  (a function that receives the SDK and returns whatever ix it builds).
     *  The watcher is checked in tick() via `pendingConditionals[]`. */
    ifThen({ triggerPrice, side = 'above', then } = {}) {
        if (triggerPrice == null || typeof then !== 'function')
            return null;
        if (!this.pendingConditionals)
            this.pendingConditionals = [];
        const cond = {
            id: this._id(), type: 'ifThen', triggerPrice, side, then,
            armed: true, createdAt: performance.now() / 1000,
        };
        this.pendingConditionals.push(cond);
        this._emit('ifThen', { cond, armed: true });
        return cond;
    }
    // ─── v0.9.8 TIER 3 ─ Solana / Hyperliquid signature plays ─────────────
    /** Funding-rate snipe: auto-enter when perp funding crosses threshold.
     *  In standalone this is 'reframe' — we don't have live funding feed yet,
     *  so we emit a deferred-signal event the strategy markers system can
     *  pick up. In TV/HL host mode this would subscribe to the venue's
     *  funding stream and fire a real entry on cross. */
    fundingSnipe({ asset = 'BTC', threshold = -0.05, side = 'buy', risk = 20 } = {}) {
        if (this.hostMode !== 'standalone') {
            this._emit('reframe', { from: 'fundingSnipe', to: 'subscribeFundingFeed' });
            // TV adapter would wire this to the real funding stream here.
        }
        const sub = {
            id: this._id(), type: 'fundingSnipe', asset, threshold, side, risk,
            armed: true, createdAt: performance.now() / 1000,
        };
        if (!this.pendingSnipes)
            this.pendingSnipes = [];
        this.pendingSnipes.push(sub);
        this._emit('snipe', { sub, kind: 'funding' });
        return sub;
    }
    /** Borrow-then-short DeFi flow. Standalone composes it as a flagged
     *  short position; the borrow leg is implicit (perps already shoulder
     *  this on the venue side). The flag tells partner integrations to
     *  source collateral from the lending market instead of margin. */
    borrowShort({ asset = 'SOL', size = 1, collateralAsset = 'USDC', collateralSize, price } = {}) {
        if (price == null)
            return null;
        const o = this.market({ side: 'sell', size, price });
        if (!o)
            return null;
        o.flow = 'borrow-short';
        o.borrowAsset = asset;
        o.collateralAsset = collateralAsset;
        o.collateralSize = collateralSize || size * price;
        this._emit('borrowShort', { order: o });
        return o;
    }
    /** Liquidation guard: when a position's margin ratio crosses `marginRatio`,
     *  auto-add margin to push it back. Pure gameplay framing of "don't get
     *  rekt." Standalone composes by tagging the order; tick() honors the
     *  flag during the existing P&L update path. */
    liquidationGuard({ id, marginRatio = 0.15, addAmount = 10 } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || o.status === 'closed' || o.cancelled)
            return null;
        o.guard = { marginRatio, addAmount, armed: true, triggers: 0 };
        this._emit('guard', { order: o, kind: 'liquidation' });
        return o;
    }
    /** Copy-trade: mirror another wallet's positions at a size multiplier.
     *  Reframe in standalone — we don't fetch other wallets here. Phase 2
     *  on-chain leaderboard PDAs make this a one-liner: subscribe to the
     *  followee's RunRecord events, replicate at 1:scale. */
    copyTrade({ walletAddr, sizeMultiplier = 1.0, autoStop = true } = {}) {
        if (this.hostMode !== 'standalone') {
            this._emit('reframe', { from: 'copyTrade', to: 'subscribeWallet' });
        }
        if (!this.copySubs)
            this.copySubs = [];
        const sub = {
            id: this._id(), type: 'copyTrade', walletAddr, sizeMultiplier,
            autoStop, active: true, createdAt: performance.now() / 1000,
        };
        this.copySubs.push(sub);
        this._emit('copyTrade', { sub, active: true });
        return sub;
    }
    /** Perp flip: close current position + open opposite-side same-size in one
     *  conceptual ix. Real venues (HL, Drift) ship this as 'reduceOnly' +
     *  immediate inverse market. Standalone composes from closeAll(side) +
     *  market(opposite). Useful for momentum reversals. */
    perpFlip({ id, price } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || o.status === 'closed' || o.cancelled || price == null)
            return null;
        const oppositeSide = o.side === 'buy' ? 'sell' : 'buy';
        const size = o.size;
        // Close the existing position
        o.status = 'closed';
        o.outcome = 'flip';
        o.exitPrice = price;
        if (o.entry != null) {
            const dir = o.side === 'buy' ? 1 : -1;
            o.pnl = (o.pnl || 0) + dir * (price - o.entry) * size;
        }
        this._emit('bracketClose', { order: o, reason: 'flip' });
        // Open the inverse
        const newOrder = this.market({ side: oppositeSide, size, price });
        if (newOrder)
            newOrder.flippedFrom = o.id;
        this._emit('flip', { closed: o, opened: newOrder });
        return newOrder;
    }
    // ─── v0.9.8 TIER 4 ─ Gameplay-flavored, uniquely ChartRunner ──────────
    /** Combo trade: fires a pre-baked multi-leg setup by name. The playbook
     *  is data-driven so partners + Workbench builders can register their own
     *  named setups. Default registrations cover three classics. */
    comboTrade({ setup = 'ironCondor', price, size = 1, risk = 20 } = {}) {
        if (price == null)
            return null;
        if (!this._comboPlaybook) {
            this._comboPlaybook = {
                // Iron condor: profit if price stays in range. We approximate via OCO
                // at outer strikes + paired closer strikes (bull put + bear call).
                ironCondor: (sdk, p, s, r) => sdk.ocoBracket({ upper: p + 80, lower: p - 80, risk: r }),
                // Calendar spread: long bracket near-term + opposing far-term. We
                // approximate with two brackets at different RR profiles.
                calendar: (sdk, p, s, r) => [
                    sdk.bracket({ side: 'buy', risk: r, rr: 1.5, price: p, slDistance: 30 }),
                    sdk.bracket({ side: 'sell', risk: r / 2, rr: 3.0, price: p, slDistance: 60 }),
                ],
                // Straddle: market entries both directions, profit on big move.
                straddle: (sdk, p, s, r) => [
                    sdk.bracket({ side: 'buy', risk: r / 2, rr: 2.0, price: p, slDistance: 40 }),
                    sdk.bracket({ side: 'sell', risk: r / 2, rr: 2.0, price: p, slDistance: 40 }),
                ],
            };
        }
        const fn = this._comboPlaybook[setup];
        if (!fn) {
            this._emit('comboTrade', { error: 'unknown setup: ' + setup });
            return null;
        }
        const result = fn(this, price, size, risk);
        this._emit('comboTrade', { setup, result });
        return result;
    }
    /** Auto-fib: detect the visible swing high/low (passed in by caller) and
     *  delegate to fibLadder with the correct base + side. Saves the player
     *  from having to manually two-anchor a fib.
     *  v0.9.10 — also pushes a fibRetrace overlay with Champions Channel band on
     *  so the player gets visual confirmation of the 0.618–0.66 high-probability
     *  bounce zone alongside the order ladder. */
    autoFib({ swingHigh, swingLow, swingHighWx, swingLowWx, side = 'buy', size = 4, drawOverlay = true } = {}) {
        if (swingHigh == null || swingLow == null)
            return null;
        const base = Math.abs(swingHigh - swingLow);
        const anchor = side === 'buy' ? swingHigh : swingLow;
        // Push a fibRetrace overlay with the Champion Zone shaded if we have wx
        // anchors and the in-game overlay system is available.
        if (drawOverlay && typeof globalThis.game !== 'undefined' && Array.isArray(globalThis.game.tvOverlays)
            && typeof swingHighWx === 'number' && typeof swingLowWx === 'number') {
            try {
                globalThis.game.tvOverlays.push({
                    id: globalThis.game.tvNextId++, kind: 'fibRetrace',
                    wx1: swingHighWx, py1: swingHigh,
                    wx2: swingLowWx, py2: swingLow,
                    levels: [
                        { lvl: 0, color: '#888', on: true },
                        { lvl: 0.236, color: '#ef5350', on: true },
                        { lvl: 0.382, color: '#ffffff', on: true },
                        { lvl: 0.5, color: '#4caf50', on: true },
                        { lvl: 0.618, color: '#ffd166', on: true },
                        { lvl: 0.66, color: '#ffd166', on: true },
                        { lvl: 0.786, color: '#22d3ee', on: true },
                        { lvl: 1, color: '#888', on: true },
                    ],
                    trendLine: true, extend: 'right',
                    championBand: true, t: 0,
                    source: 'autoFib',
                });
            }
            catch (_) { }
        }
        return this.fibLadder({ side, size, price: anchor, base });
    }
    /** Magnet: pulls open positions toward a target by tightening the SL on
     *  every tick. Pure gameplay primitive — no real-world equivalent. The
     *  per-frame tighten is handled in tick() via the `magnet` flag. */
    magnet({ id, target, strength = 0.5 } = {}) {
        const o = this.openOrders.find(x => x.id === id);
        if (!o || o.status === 'closed' || o.cancelled || target == null)
            return null;
        o.magnet = { target, strength: Math.max(0.01, Math.min(1.0, strength)) };
        this._emit('magnet', { order: o, target });
        return o;
    }
    /* ============================================================
     * v0.9.9 — Signal Quality Scoring (the "spine")
     * ------------------------------------------------------------
     * Mirrors the confluence-weighting table from quant.pdf. Returns
     * { score, max, components, recommendation }.
     *
     * Components and their weights (max 17, min 5 to "trade"):
     *   HTF trend alignment ............. +2
     *   Reference level proximity ....... +2  (any of dOpen/pdH/pdL/pdC/pdVAH/pdPOC/pdVAL/IBH/IBL within ATR/4)
     *   Class A divergence .............. +2
     *   Class B divergence .............. +1
     *   Champions Channel (0.618–0.66) .. +2
     *   Consolidation breakout .......... +2
     *   Volume profile node (POC/VA) .... +1
     *   Open Interest confirmation ...... +1  (Phase 1 — optional today)
     *   SFP at level .................... +2
     *   Failed auction .................. +2
     *
     * Top-level call: sdk.scoreSetup({side, price, weights})
     *   - side:   'buy' | 'sell'  (default: derived from current bracket or 'buy')
     *   - price:  reference price (default: latest close)
     *   - weights: optional override map keyed by component id; lets the player
     *             tune "how much each thing counts" from the Workbench UI without
     *             touching code. Top level all components on by default.
     *
     * Designed so additional analyzers can register themselves at runtime via
     * sdk.registerScoreComponent(id, fn) — Phase 1/2 modules can plug in CVD,
     * footprint, OI, regime detector, etc.
     * ============================================================ */
    registerScoreComponent(id, fn, defaultWeight = 1) {
        this._scoreComponents = this._scoreComponents || {};
        this._scoreComponents[id] = { fn, defaultWeight };
    }
    scoreSetup(opts) {
        opts = opts || {};
        const side = opts.side || 'buy';
        const price = (typeof opts.price === 'number' && isFinite(opts.price))
            ? opts.price
            : (typeof globalThis.candles !== 'undefined' && globalThis.candles.length ? globalThis.candles[candles.length - 1].c : 0);
        const weights = opts.weights || {};
        const w = (id, def) => (typeof weights[id] === 'number') ? weights[id] : def;
        const components = [];
        const ctxs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = ctxs.length;
        if (!N)
            return { score: 0, max: 17, components: [], recommendation: 'NO DATA' };
        // ATR(14) approximation — used as the "near a level" tolerance.
        let atr = 0;
        if (N >= 15) {
            let sum = 0;
            for (let i = N - 14; i < N; i++) {
                const c = ctxs[i], p = ctxs[i - 1];
                sum += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c));
            }
            atr = sum / 14;
        }
        const tol = Math.max(atr * 0.25, price * 0.0005);
        // 1. HTF trend alignment — compare last close to SMA(50) and SMA(200).
        if (N >= 50) {
            const sma = (n) => {
                let s = 0;
                for (let i = N - n; i < N; i++)
                    s += ctxs[i].c;
                return s / n;
            };
            const sma50 = sma(Math.min(50, N));
            const sma200 = sma(Math.min(200, N));
            const trendUp = price > sma50 && sma50 > sma200;
            const trendDown = price < sma50 && sma50 < sma200;
            const aligned = (side === 'buy' && trendUp) || (side === 'sell' && trendDown);
            if (aligned) {
                components.push({ id: 'htf_trend', label: 'HTF trend aligned', pts: w('htf_trend', 2) });
            }
        }
        // 2. Reference level proximity.
        const lev = (typeof computeReferenceLevels === 'function') ? computeReferenceLevels() : null;
        if (lev) {
            const keys = ['dOpen', 'pdHigh', 'pdLow', 'pdClose', 'pdVAH', 'pdPOC', 'pdVAL', 'IBH', 'IBL'];
            let nearest = null, nearestDist = Infinity, nearestKey = null;
            for (const k of keys) {
                const px = lev[k];
                if (typeof px !== 'number')
                    continue;
                const d = Math.abs(price - px);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = px;
                    nearestKey = k;
                }
            }
            if (nearest != null && nearestDist <= tol) {
                components.push({ id: 'ref_level', label: 'At ' + nearestKey + ' (' + (typeof fmtPrice === 'function' ? fmtPrice(nearest) : nearest.toFixed(2)) + ')', pts: w('ref_level', 2) });
                // Bonus +1 if nearest is POC (highest-volume node).
                if (nearestKey === 'pdPOC') {
                    components.push({ id: 'vol_node', label: 'Volume node (POC)', pts: w('vol_node', 1) });
                }
            }
        }
        // 3. v0.9.11 — RSI divergence (Class A / B / C) via real swing detection.
        //    Find the last two confirmed swing highs (for sell) or swing lows (for
        //    buy) in price; look up RSI at those swings; classify by the divergence
        //    geometry per quant.pdf:
        //      Class A — strongest. Price makes a HH (HH = higher high) but RSI
        //                makes a LH (lower high), at HTF resistance/extreme. +2.
        //                For buy: price LL, RSI HL, at HTF support/oversold.
        //      Class B — Price makes EH (equal high) + RSI LH, OR
        //                Price makes HH + RSI EH. Confirmed but weaker. +1.
        //      Class C — Price makes LH (downtrend continuation) + RSI HL — usually
        //                a failed divergence; treated as 0 pts (no add).
        if (typeof _computeRSI === 'function' && typeof this._findSwings === 'function' && N >= 40) {
            const useHighs = (side === 'sell');
            const swings = this._findSwings(ctxs, useHighs ? 'high' : 'low', 5);
            if (swings.length >= 2) {
                const a = swings[swings.length - 2]; // older swing
                const b = swings[swings.length - 1]; // newer swing
                const rsiA = _computeRSI(a.idx, 14);
                const rsiB = _computeRSI(b.idx, 14);
                // Equal-tolerance threshold relative to ATR.
                const eqPx = atr * 0.20;
                const eqRSI = 2.0; // RSI points
                const priceCmp = (b.price - a.price);
                const rsiCmp = (rsiB - rsiA);
                let cls = null;
                if (useHighs) {
                    // Looking for bearish divergence at swing HIGHS.
                    // Class A: price HH (b > a meaningfully) AND RSI LH (rsiB < rsiA meaningfully)
                    if (priceCmp > eqPx && rsiCmp < -eqRSI && rsiA > 60) {
                        cls = 'A';
                    }
                    else if (Math.abs(priceCmp) <= eqPx && rsiCmp < -eqRSI) {
                        cls = 'B'; // EH price + LH RSI
                    }
                    else if (priceCmp > eqPx && Math.abs(rsiCmp) <= eqRSI) {
                        cls = 'B'; // HH price + EH RSI
                    }
                    else if (priceCmp < -eqPx && rsiCmp > eqRSI) {
                        cls = 'C'; // failed: price LH but RSI HL (downtrend continuation)
                    }
                }
                else {
                    // Looking for bullish divergence at swing LOWS.
                    if (priceCmp < -eqPx && rsiCmp > eqRSI && rsiA < 40) {
                        cls = 'A';
                    }
                    else if (Math.abs(priceCmp) <= eqPx && rsiCmp > eqRSI) {
                        cls = 'B';
                    }
                    else if (priceCmp < -eqPx && Math.abs(rsiCmp) <= eqRSI) {
                        cls = 'B';
                    }
                    else if (priceCmp > eqPx && rsiCmp < -eqRSI) {
                        cls = 'C';
                    }
                }
                if (cls === 'A') {
                    components.push({ id: 'div_a', label: 'Class A divergence (HH price + LH RSI)', pts: w('div_a', 2) });
                }
                else if (cls === 'B') {
                    components.push({ id: 'div_b', label: 'Class B divergence', pts: w('div_b', 1) });
                }
                // Class C explicitly does NOT add points but is recorded for the probe ability.
                this._lastDivergence = { cls, priceA: a.price, priceB: b.price, rsiA, rsiB, side };
            }
        }
        // 4. Champions Channel (Fib 0.618–0.66 of last visible swing).
        //    Approximated as: between last 50-bar swing high & low, is price in the
        //    0.55–0.66 retracement band? (slightly wider than the strict 0.618–0.66
        //    so the player gets a generous "champion zone" hit.)
        if (N >= 50) {
            let hi = -Infinity, lo = Infinity, hiI = N - 1, loI = N - 1;
            const lookback = Math.min(50, N);
            for (let i = N - lookback; i < N; i++) {
                if (ctxs[i].h > hi) {
                    hi = ctxs[i].h;
                    hiI = i;
                }
                if (ctxs[i].l < lo) {
                    lo = ctxs[i].l;
                    loI = i;
                }
            }
            const trending = (hiI > loI); // up-leg if high came after low
            if (hi > lo) {
                let fib = 0;
                if (trending) {
                    // retracement of an uptrend — measure from hi back down
                    fib = (hi - price) / (hi - lo);
                }
                else {
                    // retracement of a downtrend — measure from lo back up
                    fib = (price - lo) / (hi - lo);
                }
                if (fib >= 0.55 && fib <= 0.66) {
                    components.push({ id: 'champion', label: 'Champions Channel (0.618–0.66)', pts: w('champion', 2) });
                }
            }
        }
        // 5. Consolidation breakout — last 20 bars range / prior 20 bars range < 0.6
        //    AND latest candle closes outside the consolidation envelope.
        if (N >= 40) {
            const range = (a, b) => {
                let h = -Infinity, l = Infinity;
                for (let i = a; i <= b; i++) {
                    if (ctxs[i].h > h)
                        h = ctxs[i].h;
                    if (ctxs[i].l < l)
                        l = ctxs[i].l;
                }
                return { h, l, span: h - l };
            };
            const recent = range(N - 21, N - 1);
            const prior = range(N - 41, N - 21);
            if (prior.span > 0 && recent.span / prior.span < 0.6) {
                const inside = range(N - 21, N - 2);
                const last = ctxs[N - 1].c;
                if (last > inside.h || last < inside.l) {
                    components.push({ id: 'breakout', label: 'Consolidation breakout', pts: w('breakout', 2) });
                }
            }
        }
        // 6. v0.9.12 — SFP via dedicated detector using real swing detection.
        try {
            if (typeof this.detectSFP === 'function') {
                const sfp = this.detectSFP();
                if (sfp && sfp.matched && sfp.side === side) {
                    components.push({ id: 'sfp', label: 'SFP at swing extreme (' + (typeof fmtPrice === 'function' ? fmtPrice(sfp.level) : sfp.level) + ')', pts: w('sfp', 2) });
                }
            }
        }
        catch (_) { }
        // 7. v0.9.12 — Failed auction via dedicated detector.
        try {
            if (typeof this.detectFailedAuction === 'function') {
                const fa = this.detectFailedAuction();
                if (fa && fa.matched && fa.side === side) {
                    components.push({ id: 'failed_auction', label: 'Failed auction · ' + fa.kind, pts: w('failed_auction', 2) });
                }
            }
        }
        catch (_) { }
        // 7b. v0.9.12 — Open Interest confirmation. Async-cached fetch; first call
        //     kicks off the request and returns pending=true (no add). Subsequent
        //     calls within 60s use the cached result.
        try {
            if (typeof this.detectOIConfirm === 'function') {
                const oi = this.detectOIConfirm({ side });
                if (oi && oi.matched) {
                    components.push({ id: 'oi', label: 'OI confirms · ' + (oi.kind || 'aligned') + ' (' + (oi.oiChg * 100).toFixed(1) + '%)', pts: w('oi', 1) });
                }
            }
        }
        catch (_) { }
        // 8. CCV Setup mega-bonus — when all three CCV components fire and the
        //    side matches, add an extra +1 on top of the individual components
        //    they already contributed. Reflects PDF's emphasis that the
        //    composite has higher win rate than any single piece.
        try {
            if (typeof this.detectCCV === 'function') {
                const ccv = this.detectCCV();
                if (ccv && ccv.matched && ccv.side === side) {
                    components.push({ id: 'ccv', label: '★ CCV composite (PDF ~80% WR)', pts: w('ccv', 1) });
                }
            }
        }
        catch (_) { }
        // v0.9.11 — 8b. Bump-and-Run reversal pattern.
        try {
            if (typeof this.detectBumpAndRun === 'function') {
                const barr = this.detectBumpAndRun();
                if (barr && barr.matched && barr.side === side) {
                    components.push({ id: 'barr', label: 'Bump-and-Run reversal', pts: w('barr', 1) });
                }
            }
        }
        catch (_) { }
        // v0.9.11 — 8c. Head and Shoulders / Inverse H&S.
        try {
            if (typeof this.detectHeadShoulders === 'function') {
                const hs = this.detectHeadShoulders();
                if (hs && hs.matched && hs.side === side) {
                    components.push({ id: 'hs', label: (hs.kind === 'topping' ? 'Head & Shoulders top' : 'Inverse H&S bottom'), pts: w('hs', 2) });
                }
            }
        }
        catch (_) { }
        // 9. Player-registered components (Phase 1+ extensions).
        if (this._scoreComponents) {
            for (const id in this._scoreComponents) {
                try {
                    const def = this._scoreComponents[id];
                    const out = def.fn({ side, price, candles: ctxs, levels: lev, atr, tol });
                    if (out && out.matched) {
                        components.push({
                            id,
                            label: out.label || id,
                            pts: w(id, (typeof out.pts === 'number') ? out.pts : def.defaultWeight),
                        });
                    }
                }
                catch (_) { }
            }
        }
        // v0.9.11 — Score ceiling raised from 17 → 20 to accommodate CCV (+1) and
        //           the new pattern detectors: BARR (+1), H&S (+2). Tier
        //           thresholds rescaled proportionally so player intuition
        //           ("≥10 = STRONG") stays roughly constant.
        let score = 0;
        for (const c of components)
            score += c.pts;
        score = Math.max(0, Math.min(20, score));
        let recommendation = 'WAIT';
        if (score >= 16)
            recommendation = 'PRIME';
        else if (score >= 11)
            recommendation = 'STRONG';
        else if (score >= 6)
            recommendation = 'TRADEABLE';
        return { score, max: 20, components, recommendation, side, price };
    }
    /* ============================================================
     * v0.9.10 — CCV Setup detector
     * ------------------------------------------------------------
     * Composite of three high-leverage components from quant.pdf:
     *   1. Consolidation         — last 20 bars range / prior 20 < threshold
     *   2. Champions Channel tag — wick or close inside 0.55–0.66 fib retrace
     *                              of the last 50-bar swing
     *   3. Volume confirmation   — current bar volume > 1.5x 14-bar median,
     *                              OR price within ATR/2 of pdPOC
     *
     * PDF cites this combination at ~80% historical win rate. Returns
     *   { matched, side, components, since, banner }
     * Pure detection — no orders placed. The `_ccvWatcherTick` poller
     * (called from the render frame) decides whether to fire the banner +
     * (optionally) auto-arm a bracket via player setting.
     * ============================================================ */
    detectCCV(opts) {
        opts = opts || {};
        const cs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = cs.length;
        if (N < 50)
            return { matched: false, side: 'buy', components: [], banner: '' };
        const last = cs[N - 1];
        const price = last.c;
        // 1. Consolidation
        let consol = false, consolRatio = 0;
        {
            const range = (a, b) => {
                let h = -Infinity, l = Infinity;
                for (let i = a; i <= b; i++) {
                    if (cs[i].h > h)
                        h = cs[i].h;
                    if (cs[i].l < l)
                        l = cs[i].l;
                }
                return h - l;
            };
            const recent = range(N - 21, N - 1);
            const prior = range(N - 41, N - 21);
            if (prior > 0) {
                consolRatio = recent / prior;
                consol = consolRatio < 0.65;
            }
        }
        // 2. Champion Zone tag — derive swing on the LAST 50 bars (excluding the
        //    consolidation tail, which by definition is ranging). Use bars
        //    [N-50, N-21] for the swing detection.
        let inChampion = false, side = 'buy', fibVal = 0;
        {
            let hi = -Infinity, lo = Infinity, hiI = N - 1, loI = N - 1;
            for (let i = Math.max(0, N - 50); i < N - 20; i++) {
                if (cs[i].h > hi) {
                    hi = cs[i].h;
                    hiI = i;
                }
                if (cs[i].l < lo) {
                    lo = cs[i].l;
                    loI = i;
                }
            }
            if (hi > lo) {
                const trending = hiI > loI; // up-leg = buy retrace expected
                side = trending ? 'buy' : 'sell';
                fibVal = trending ? (hi - price) / (hi - lo) : (price - lo) / (hi - lo);
                // Wick-tag check: if either the recent low (for buy) or recent high
                // (for sell) tagged the band even if close didn't, still count it.
                const wickFib = (() => {
                    if (trending) {
                        return (hi - last.l) / (hi - lo);
                    }
                    else {
                        return (last.h - lo) / (hi - lo);
                    }
                })();
                inChampion = (fibVal >= 0.55 && fibVal <= 0.66) || (wickFib >= 0.55 && wickFib <= 0.66);
            }
        }
        // 3. Volume confirmation
        let volConfirm = false, volRatio = 0, atPOC = false;
        {
            const vols = [];
            for (let i = N - 15; i < N - 1; i++)
                vols.push(cs[i].v || 0);
            vols.sort((a, b) => a - b);
            const med = vols[Math.floor(vols.length / 2)] || 0;
            const cur = last.v || 0;
            if (med > 0) {
                volRatio = cur / med;
                volConfirm = volRatio > 1.5;
            }
            // Alternate: price within ATR/2 of pdPOC.
            try {
                const lev = (typeof computeReferenceLevels === 'function') ? computeReferenceLevels() : null;
                if (lev && typeof lev.pdPOC === 'number') {
                    let atr = 0;
                    for (let i = N - 14; i < N; i++) {
                        const c = cs[i], p = cs[i - 1];
                        atr += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c));
                    }
                    atr /= 14;
                    if (Math.abs(price - lev.pdPOC) < atr * 0.5) {
                        atPOC = true;
                        volConfirm = true; // POC tag counts as volume confirmation
                    }
                }
            }
            catch (_) { }
        }
        const matched = consol && inChampion && volConfirm;
        const components = [
            { id: 'consol', label: 'Consolidation (range ratio ' + consolRatio.toFixed(2) + ')', ok: consol },
            { id: 'champion', label: 'Champion Zone (fib ' + fibVal.toFixed(3) + ')', ok: inChampion },
            { id: 'volConfirm', label: atPOC ? 'POC tag' : ('Volume ' + volRatio.toFixed(2) + 'x median'), ok: volConfirm },
        ];
        let banner = '';
        if (matched) {
            banner = 'CCV SETUP · ' + side.toUpperCase() + ' · all 3 firing';
        }
        return { matched, side, components, banner, price };
    }
    /* ============================================================
     * v0.9.11 — Shared swing finder
     * ------------------------------------------------------------
     * Finds local extrema (highs or lows) in the candle stream using
     * a fractal/pivot rule: a candle at index i is a swing if it
     * exceeds (or undershoots) every candle within `window` bars on
     * either side. Returns an array of {idx, price} sorted by idx.
     *
     * Used by:
     *   - scoreSetup divergence A/B/C reclassifier (last 2 swings)
     *   - detectBumpAndRun (lead/bump trendlines)
     *   - detectHeadShoulders (5-swing pattern matcher)
     * ============================================================ */
    _findSwings(candles, kind, windowBars) {
        if (!candles || candles.length < (windowBars * 2 + 1))
            return [];
        const out = [];
        const isHigh = (kind === 'high');
        for (let i = windowBars; i < candles.length - windowBars; i++) {
            const v = isHigh ? candles[i].h : candles[i].l;
            let ok = true;
            for (let j = i - windowBars; j <= i + windowBars; j++) {
                if (j === i)
                    continue;
                const cmp = isHigh ? candles[j].h : candles[j].l;
                if (isHigh ? (cmp > v) : (cmp < v)) {
                    ok = false;
                    break;
                }
            }
            if (ok)
                out.push({ idx: i, price: v });
        }
        return out;
    }
    /* ============================================================
     * v0.9.11 — Bump-and-Run detector
     * ------------------------------------------------------------
     * Three phases per Bulkowski's BARR pattern:
     *   1. Lead-in    — gentle slope, ~30 bars
     *   2. Bump       — steep slope (≥2x lead slope), ~15 bars
     *   3. Run        — close pierces back through the lead trendline
     *
     * Returns { matched, side, leadSlope, bumpSlope, leadAtNow }.
     * The side is "sell" for bump-up + run-down (most common), "buy"
     * for inverse (bump-down + run-up).
     * ============================================================ */
    detectBumpAndRun(opts) {
        opts = opts || {};
        const cs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = cs.length;
        if (N < 50)
            return { matched: false, side: 'buy' };
        // Linear-fit slopes via least squares on closes.
        const fitSlope = (a, b) => {
            const n = b - a + 1;
            if (n < 3)
                return 0;
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            for (let i = a; i <= b; i++) {
                const x = i - a;
                const y = cs[i].c;
                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumXX += x * x;
            }
            const denom = (n * sumXX - sumX * sumX);
            if (Math.abs(denom) < 1e-9)
                return 0;
            return (n * sumXY - sumX * sumY) / denom;
        };
        const leadStart = N - 50, leadEnd = N - 20;
        const bumpStart = N - 19, bumpEnd = N - 3;
        const leadSlope = fitSlope(leadStart, leadEnd);
        const bumpSlope = fitSlope(bumpStart, bumpEnd);
        // Project lead trendline forward to the current bar.
        const leadIntercept = cs[leadStart].c; // value at x=0
        const leadAtNow = leadIntercept + leadSlope * (N - 1 - leadStart);
        const last = cs[N - 1].c;
        // BARR-up: lead slightly up, bump steeply up (≥2x), run back below lead.
        const upBumpThenRun = leadSlope > 0 && bumpSlope > 2 * Math.abs(leadSlope) && bumpSlope > 0
            && last < leadAtNow;
        // BARR-down (inverse): lead slightly down, bump steeply down, run back above lead.
        const dnBumpThenRun = leadSlope < 0 && bumpSlope < 2 * leadSlope && bumpSlope < 0
            && last > leadAtNow;
        let matched = false, side = 'buy';
        if (upBumpThenRun) {
            matched = true;
            side = 'sell';
        }
        else if (dnBumpThenRun) {
            matched = true;
            side = 'buy';
        }
        return { matched, side, leadSlope, bumpSlope, leadAtNow, price: last };
    }
    /* ============================================================
     * v0.9.11 — Head and Shoulders detector
     * ------------------------------------------------------------
     * Find a 5-swing pattern: LS (left shoulder), LL (low between LS
     * and head), H (head), RL (low between head and RS), RS (right
     * shoulder). Constraints:
     *   - LS and RS within 5% of each other in height
     *   - H meaningfully above both LS and RS (>2% above the higher
     *     shoulder)
     *   - Neckline = line through LL and RL
     *   - Confirmed when last close pierces the neckline
     * Inverse H&S detected by flipping the comparisons.
     * ============================================================ */
    detectHeadShoulders(opts) {
        opts = opts || {};
        const cs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = cs.length;
        if (N < 60)
            return { matched: false, side: 'buy' };
        const highs = this._findSwings(cs, 'high', 4);
        const lows = this._findSwings(cs, 'low', 4);
        if (highs.length < 3 || lows.length < 2)
            return { matched: false, side: 'buy' };
        const last = cs[N - 1].c;
        // Take last 3 swing highs; check the H&S geometry.
        const h3 = highs.slice(-3);
        const LS = h3[0], H = h3[1], RS = h3[2];
        const shoulderEq = Math.abs(LS.price - RS.price) / Math.max(LS.price, RS.price) < 0.05;
        const headHigher = H.price > LS.price * 1.02 && H.price > RS.price * 1.02;
        if (shoulderEq && headHigher) {
            // Find LL = lowest low between LS.idx and H.idx; RL = lowest between H.idx and RS.idx.
            const findLowBetween = (a, b) => {
                let best = null;
                for (const l of lows) {
                    if (l.idx > a && l.idx < b) {
                        if (!best || l.price < best.price)
                            best = l;
                    }
                }
                return best;
            };
            const LL = findLowBetween(LS.idx, H.idx);
            const RL = findLowBetween(H.idx, RS.idx);
            if (LL && RL) {
                const dx = RL.idx - LL.idx;
                const slope = dx === 0 ? 0 : (RL.price - LL.price) / dx;
                const necklineAtNow = LL.price + slope * (N - 1 - LL.idx);
                const matched = last < necklineAtNow;
                return {
                    matched, side: 'sell',
                    neckline: necklineAtNow, LS, H, RS, LL, RL, price: last, kind: 'topping'
                };
            }
        }
        // Inverse H&S: 3 swing lows, head meaningfully below shoulders, neckline above.
        const l3 = lows.slice(-3);
        if (l3.length === 3) {
            const LSi = l3[0], Hi = l3[1], RSi = l3[2];
            const shouldersEqI = Math.abs(LSi.price - RSi.price) / Math.max(LSi.price, RSi.price) < 0.05;
            const headLowerI = Hi.price < LSi.price * 0.98 && Hi.price < RSi.price * 0.98;
            if (shouldersEqI && headLowerI) {
                const findHighBetween = (a, b) => {
                    let best = null;
                    for (const h of highs) {
                        if (h.idx > a && h.idx < b) {
                            if (!best || h.price > best.price)
                                best = h;
                        }
                    }
                    return best;
                };
                const LH = findHighBetween(LSi.idx, Hi.idx);
                const RH = findHighBetween(Hi.idx, RSi.idx);
                if (LH && RH) {
                    const dx = RH.idx - LH.idx;
                    const slope = dx === 0 ? 0 : (RH.price - LH.price) / dx;
                    const necklineAtNow = LH.price + slope * (N - 1 - LH.idx);
                    const matched = last > necklineAtNow;
                    return {
                        matched, side: 'buy',
                        neckline: necklineAtNow, LS: LSi, H: Hi, RS: RSi, LH, RH, price: last, kind: 'bottoming'
                    };
                }
            }
        }
        return { matched: false, side: 'buy' };
    }
    /* ============================================================
     * v0.9.12 — SFP (Swing Failure Pattern) detector
     * ------------------------------------------------------------
     * Uses _findSwings to locate the most recent swing high (for sell
     * SFPs) and swing low (for buy SFPs), then checks whether the
     * latest bar's wick pierced beyond it but the close came back
     * inside. The reference swing must be at least 3 bars old (so we
     * don't compare a swing to itself).
     * Returns { matched, side, level, kind, price }.
     * ============================================================ */
    detectSFP(opts) {
        opts = opts || {};
        const cs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = cs.length;
        if (N < 30)
            return { matched: false, side: 'buy' };
        const last = cs[N - 1];
        const highs = this._findSwings(cs, 'high', 4);
        const lows = this._findSwings(cs, 'low', 4);
        // Newest swing that is at least 3 bars older than the current candle.
        const recentHigh = [...highs].reverse().find(s => s.idx <= N - 3);
        const recentLow = [...lows].reverse().find(s => s.idx <= N - 3);
        let matched = false, side = 'buy', level = null, kind = null;
        if (recentHigh && last.h > recentHigh.price && last.c < recentHigh.price) {
            matched = true;
            side = 'sell';
            level = recentHigh.price;
            kind = 'bearish';
        }
        else if (recentLow && last.l < recentLow.price && last.c > recentLow.price) {
            matched = true;
            side = 'buy';
            level = recentLow.price;
            kind = 'bullish';
        }
        return { matched, side, level, kind, price: last.c };
    }
    /* ============================================================
     * v0.9.12 — Failed Auction detector
     * ------------------------------------------------------------
     * Promoted from inline scoreSetup check to a dedicated method so
     * the probe ability and the Quick Builder can both call it.
     * Logic: opened OUTSIDE prior-day value area (above pdVAH or
     * below pdVAL), then accepted back inside. Mean-reversion signal.
     * Returns { matched, side, dOpen, pdVAH, pdVAL, kind }.
     * ============================================================ */
    detectFailedAuction(opts) {
        opts = opts || {};
        const cs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = cs.length;
        if (N < 5)
            return { matched: false, side: 'buy' };
        const last = cs[N - 1];
        const lev = (typeof computeReferenceLevels === 'function') ? computeReferenceLevels() : null;
        if (!lev || lev.pdVAH == null || lev.pdVAL == null || lev.dOpen == null) {
            return { matched: false, side: 'buy', reason: 'no levels' };
        }
        const openedHigh = lev.dOpen > lev.pdVAH;
        const openedLow = lev.dOpen < lev.pdVAL;
        const insideNow = last.c <= lev.pdVAH && last.c >= lev.pdVAL;
        let matched = false, side = 'buy', kind = null;
        if (openedHigh && insideNow) {
            matched = true;
            side = 'sell';
            kind = 'high-open mean-rev';
        }
        else if (openedLow && insideNow) {
            matched = true;
            side = 'buy';
            kind = 'low-open mean-rev';
        }
        return { matched, side, kind, dOpen: lev.dOpen, pdVAH: lev.pdVAH, pdVAL: lev.pdVAL, price: last.c };
    }
    /* ============================================================
     * v0.9.12 — Open Interest confirmation (Binance futures REST)
     * ------------------------------------------------------------
     * Polls /futures/data/openInterestHist for the current symbol +
     * timeframe, cached per (symbol, period) for 60s. Async — returns
     * synchronously from cache; if cache is cold, kicks off a fetch
     * and returns { matched:false, pending:true }.
     *
     * Confirmation logic:
     *   bull confirm — both price AND OI rising over last N=8 buckets
     *   bear confirm — both price AND OI falling over last N=8 buckets
     *   divergence (no add) — OI rising while price falling, etc.
     *
     * Side-aware: only matches when the inferred direction aligns with
     * the requested side.
     * ============================================================ */
    detectOIConfirm(opts) {
        opts = opts || {};
        const sym = (typeof currentAssetObj === 'function') ? (currentAssetObj().sym || 'BTCUSDT') : 'BTCUSDT';
        // Map game timeframe to a Binance OI period (their endpoint accepts a
        // limited set: 5m / 15m / 30m / 1h / 2h / 4h / 6h / 12h / 1d).
        const tfMap = { '1m': '5m', '3m': '5m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '6h', '12h': '12h', '1d': '1d', '3d': '1d', '1w': '1d', '1M': '1d' };
        const tf = (typeof timeframe !== 'undefined') ? timeframe : '15m';
        const period = tfMap[tf] || '1h';
        const key = sym + '|' + period;
        const cache = this._oiCache = this._oiCache || {};
        const inflight = this._oiInflight = this._oiInflight || {};
        const now = Date.now();
        const entry = cache[key];
        if (!entry || now - entry.t > 60000) {
            if (!inflight[key]) {
                inflight[key] = true;
                const url = 'https://fapi.binance.com/futures/data/openInterestHist?symbol=' + encodeURIComponent(sym) + '&period=' + period + '&limit=12';
                fetch(url).then(r => r.ok ? r.json() : Promise.reject())
                    .then(arr => {
                    if (Array.isArray(arr) && arr.length) {
                        cache[key] = { t: now, data: arr.map(x => ({ ts: x.timestamp, oi: +x.sumOpenInterest, oiUSD: +x.sumOpenInterestValue })) };
                    }
                }).catch(() => { }).finally(() => { inflight[key] = false; });
            }
            return { matched: false, side: 'buy', pending: true, sym, period };
        }
        const data = entry.data;
        if (data.length < 8)
            return { matched: false, side: 'buy', sym, period };
        const oiNow = data[data.length - 1].oi;
        const oiPrev = data[data.length - 8].oi;
        const oiChg = (oiNow - oiPrev) / Math.max(1e-9, oiPrev);
        // Pull the matching price window from candles.
        const cs = (typeof globalThis.candles !== 'undefined') ? globalThis.candles : [];
        const N = cs.length;
        if (N < 8)
            return { matched: false, side: 'buy', sym, period };
        const pNow = cs[N - 1].c;
        const pPrev = cs[N - 8].c;
        const pChg = (pNow - pPrev) / Math.max(1e-9, pPrev);
        const wantSide = opts.side || 'buy';
        let matched = false, side = wantSide, kind = null;
        if (pChg > 0.002 && oiChg > 0.005) {
            matched = (wantSide === 'buy');
            side = 'buy';
            kind = 'bull confirm';
        }
        else if (pChg < -0.002 && oiChg < -0.005) {
            matched = (wantSide === 'sell');
            side = 'sell';
            kind = 'bear confirm';
        }
        else if (pChg < -0.002 && oiChg > 0.005) {
            // Distribution-style divergence — no add but flag as info.
            kind = 'distribution (price down, OI up)';
        }
        else if (pChg > 0.002 && oiChg < -0.005) {
            kind = 'short-cover (price up, OI down)';
        }
        return { matched, side, kind, oiChg, pChg, oiNow, oiPrev, sym, period };
    }
    tick({ price, t }) {
        this.activeEffects = this.activeEffects.filter(e => { if (e.until && e.until < t) {
            this._emit('expired', { effect: e });
            return false;
        } return true; });
        const still = [];
        for (const o of this.openOrders) {
            let filled = false;
            if (o.type === 'ladder' || o.type === 'oco') {
                if ((o.side === 'buy' && price <= o.price) || (o.side === 'sell' && price >= o.price)) {
                    filled = true;
                    this._emit('fill', { order: o, price });
                    if (o.type === 'oco') {
                        const p = this.openOrders.find(x => x.id === o.pair);
                        if (p) {
                            p.cancelled = true;
                            this._emit('cancel', { order: p });
                        }
                    }
                }
            }
            // v0.9.8 — Limit fill check (Tier 1).
            if (o.type === 'limit' && o.status === 'pending') {
                if ((o.side === 'buy' && price <= o.price) || (o.side === 'sell' && price >= o.price)) {
                    o.status = 'open';
                    o.entry = o.price;
                    o.filledAt = t;
                    this._emit('fill', { order: o, price });
                    // Iceberg promotion: when this slice fills, expose the next.
                    if (o.iceberg) {
                        const next = this.openOrders.find(x => x.iceberg && x.icebergSliceIndex === o.icebergSliceIndex + 1);
                        if (next) {
                            next.icebergVisible = true;
                            this._emit('iceberg', { promoted: next });
                        }
                    }
                }
            }
            if (o.type === 'bracket' && o.status === 'open') {
                // v0.8d #8 — Trailing stop: ratchet SL in the favorable direction.
                // Emits 'edit' with a `trailingTick:true` flag so the visual layer can
                // sync b.sl and spawn subtle feedback (without the juice of a manual edit).
                if (o.trailing && o.trailing.active) {
                    const dist = o.trailing.distance;
                    let newSL = o.sl;
                    if (o.side === 'buy') {
                        const candidate = price - dist;
                        if (candidate > o.sl)
                            newSL = candidate;
                    }
                    else {
                        const candidate = price + dist;
                        if (candidate < o.sl)
                            newSL = candidate;
                    }
                    if (newSL !== o.sl) {
                        const prevSL = o.sl;
                        o.sl = newSL;
                        o.slDistance = Math.max(0.001, Math.abs(o.entry - o.sl));
                        // Detect breakeven crossing: SL moves past entry in the favorable direction.
                        const nowPastEntry = (o.side === 'buy' && newSL >= o.entry) || (o.side === 'sell' && newSL <= o.entry);
                        const wasPastEntry = (o.side === 'buy' && prevSL >= o.entry) || (o.side === 'sell' && prevSL <= o.entry);
                        const crossedBE = nowPastEntry && !wasPastEntry;
                        if (crossedBE)
                            o.trailing.breakeven = true;
                        this._emit('edit', { order: o, patch: { sl: newSL }, trailingTick: true, crossedBE });
                    }
                }
                // v0.9.8 — Trailing take-profit (Tier 2): mirror of trailStop on the
                // upside. TP ratchets toward price, never retreats. Same shape so the
                // visual layer can reuse the trailing-stop overlay machinery.
                if (o.trailingTp && o.trailingTp.active && o.tp != null) {
                    const dist = o.trailingTp.distance;
                    let newTP = o.tp;
                    if (o.side === 'buy') {
                        const candidate = price + dist;
                        if (candidate > o.tp)
                            newTP = candidate;
                    }
                    else {
                        const candidate = price - dist;
                        if (candidate < o.tp)
                            newTP = candidate;
                    }
                    if (newTP !== o.tp) {
                        o.tp = newTP;
                        this._emit('edit', { order: o, patch: { tp: newTP }, trailingTpTick: true });
                    }
                }
                // v0.9.8 — Magnet (Tier 4): tighten SL toward target each tick.
                // Pure gameplay — no real-world equivalent. The strength factor controls
                // how aggressively the SL crawls (0.01 = imperceptible, 1.0 = snap).
                if (o.magnet && o.magnet.target != null) {
                    const target = o.magnet.target;
                    const k = o.magnet.strength;
                    // Lerp SL toward target; clamp so we never cross to the wrong side of entry.
                    const newSL = o.sl + (target - o.sl) * k * 0.05;
                    const safe = (o.side === 'buy' && newSL < o.entry) || (o.side === 'sell' && newSL > o.entry);
                    if (safe && Math.abs(newSL - o.sl) > 0.0001) {
                        o.sl = newSL;
                        o.slDistance = Math.max(0.001, Math.abs(o.entry - o.sl));
                        this._emit('edit', { order: o, patch: { sl: newSL }, magnetTick: true });
                    }
                }
                // P&L per bracket = (exit - entry) * direction * (risk / slDistance)
                // Risk-as-stake means SL hit = -risk, TP hit at 1:RR = +risk*RR.
                const dir = o.side === 'buy' ? 1 : -1;
                const tpHit = (o.side === 'buy' && price >= o.tp) || (o.side === 'sell' && price <= o.tp);
                const slHit = (o.side === 'buy' && price <= o.sl) || (o.side === 'sell' && price >= o.sl);
                if (tpHit || slHit) {
                    const exit = tpHit ? o.tp : o.sl;
                    const moveAtSL = Math.max(0.001, Math.abs(o.entry - o.sl));
                    o.pnl = (exit - o.entry) * dir * (o.risk / moveAtSL);
                    o.status = 'closed';
                    o.closedAt = t;
                    o.exitPrice = exit;
                    o.outcome = tpHit ? 'tp' : 'sl';
                    filled = true;
                    this._emit('bracketClose', { order: o });
                }
            }
            if (!filled && !o.cancelled)
                still.push(o);
        }
        this.openOrders = still;
        // v0.9.8 — IfThen watcher (Tier 2). Each conditional has a triggerPrice
        // and a side ('above' / 'below'). When price crosses, fire `then(this)`
        // and disarm. Failures during `then` don't crash the loop — they emit
        // an error event so the caller can react.
        if (this.pendingConditionals && this.pendingConditionals.length) {
            const stillCond = [];
            for (const c of this.pendingConditionals) {
                if (!c.armed)
                    continue;
                const triggered = (c.side === 'above' && price >= c.triggerPrice) ||
                    (c.side === 'below' && price <= c.triggerPrice);
                if (triggered) {
                    c.armed = false;
                    c.firedAt = t;
                    try {
                        const result = c.then(this);
                        this._emit('ifThen', { cond: c, fired: true, result });
                    }
                    catch (err) {
                        this._emit('ifThen', { cond: c, fired: false, error: err.message });
                    }
                }
                else {
                    stillCond.push(c);
                }
            }
            this.pendingConditionals = stillCond;
        }
    }
    // Mark-to-market unrealized P&L across open brackets at the given price
    unrealized(price) {
        let u = 0;
        for (const o of this.openOrders) {
            if (o.type === 'bracket' && o.status === 'open') {
                const dir = o.side === 'buy' ? 1 : -1;
                const moveAtSL = Math.max(0.001, Math.abs(o.entry - o.sl));
                u += (price - o.entry) * dir * (o.risk / moveAtSL);
            }
        }
        return u;
    }
    // v0.8b — Direct-manipulation primitives. Overlays are TradingView tools the player
    // can drag (edit TP/SL/entry prices) or delete (cancel the order). These keep the
    // SDK as the single source of truth — mutations go through here, never via the
    // visual arrays directly.
    findOrder(id) { return this.openOrders.find(o => o.id === id) || null; }
    cancelOrder(id) {
        const o = this.findOrder(id);
        if (!o)
            return false;
        o.cancelled = true;
        this.openOrders = this.openOrders.filter(x => x.id !== id);
        this._emit('cancel', { order: o });
        return true;
    }
    editOrder(id, patch) {
        const o = this.findOrder(id);
        if (!o)
            return false;
        if (o.type === 'bracket') {
            if (o.status !== 'open')
                return false; // resolved brackets are immutable
            if (patch.tp != null)
                o.tp = patch.tp;
            if (patch.sl != null)
                o.sl = patch.sl;
            if (patch.entry != null)
                o.entry = patch.entry;
            // slDistance drives risk math; recompute if SL or entry moved
            o.slDistance = Math.max(0.001, Math.abs(o.entry - o.sl));
            o.rr = Math.abs(o.tp - o.entry) / o.slDistance;
        }
        else if (o.type === 'ladder' || o.type === 'oco') {
            if (patch.price != null)
                o.price = patch.price;
        }
        this._emit('edit', { order: o, patch });
        return true;
    }
}
//# sourceMappingURL=ChartRunnerSDK.js.map