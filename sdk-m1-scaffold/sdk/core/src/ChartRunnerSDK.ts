// ChartRunnerSDK — trading primitives as gameplay abilities.
//
// The canonical class. Lifted from the inline IIFE in
// ChartRunner_Prototype.html (class at line 10453, instantiated at 13186,
// closes at 11963). SKELETON ONLY — method bodies are TODO stubs citing the
// inline source line they graft from. Full surface map:
// docs/architecture/M25-sdk-surface.md (39 public methods, 24 events).
//
// Hard rule: this class is the ONLY thing that issues orders. Abilities never
// touch the canvas or the network. That's what makes the extraction cheap.
//
// Host dependencies: the inline class reads 8 prototype globals via `typeof`
// guards (candles / computeReferenceLevels / _computeRSI / INDICATOR_STATE /
// currentAssetObj / timeframe / game / fmtPrice). Those become ChartHost
// (constructor-injected) — see ChartHost.ts. The inline-bundler IIFE build can
// still see them in shared scope (cheap prototype parity); a host-overlay build
// cannot, which is the whole point of Phase 1.

import { EventBus, type Listener } from './events.js';
import * as detectors from './detectors.js';
import type { ChartHost } from './ChartHost.js';
import type {
  Side, Order, ScoreResult, DetectorResult,
  SdkEvent, SdkEventPayload,
} from './types.js';

export type HostMode = 'standalone' | 'tv' | 'dex';

export class ChartRunnerSDK {
  // ── constructor state (HTML 10454-10527) ──────────────────────────────
  openOrders: Order[] = [];
  activeEffects: Array<Record<string, unknown>> = [];
  private bus = new EventBus();
  private nextId = 1;
  hostMode: HostMode = 'standalone';
  /** capability descriptor Phase-1 adapters introspect (HTML 10470) */
  readonly capabilities: Record<string, true | 'reframe' | 'standalone'> = {
    // TODO(M2.5): copy the full descriptor verbatim from HTML 10470-10526.
  };

  // ChartHost is optional so the inline-bundler build (shared scope) and the
  // host-overlay build (injected) share one constructor.
  constructor(private host?: ChartHost) {}

  // ── lifecycle / events (HTML 10529-10548) ─────────────────────────────
  setHostMode(_mode: HostMode): boolean { throw new Error('TODO M2.5 — HTML 10529'); }
  on(evt: SdkEvent, fn: Listener): void { this.bus.on(evt, fn); }
  /** semi-public: prototype calls this from outside (HTML 18740) — keep reachable */
  _emit(evt: SdkEvent, p: SdkEventPayload): void { this.bus.emit(evt, p); }
  private _id(): number { return this.nextId++; }

  // ── order-issuing · core abilities (the 6 the milestone names) ─────────
  /** Open a bracket position with TP/SL derived from `slDistance` × `rr`.
   *  Ported from inline ChartRunner_Prototype.html line 11830 (M1.4a, 2026-05-29).
   *  Behavior preserved exactly: same defaults, same size formula (visual-only),
   *  same TP/SL math, same 'open' status (Quick mode skips 'pending' state),
   *  same event payload shape. */
  bracket({ risk = 20, rr = 2.0, side = 'buy', price, slDistance = 60 }: {
    risk?: number;
    rr?: number;
    side?: Side;
    price: number;
    slDistance?: number;
  }): Order {
    // size is purely visual; risk/RR drives the real P&L math via slDistance
    const size = Math.max(1, (risk / Math.max(0.001, slDistance)) * 100);
    const tp = price + (side === 'buy' ? +rr * slDistance : -rr * slDistance);
    const sl = price + (side === 'buy' ? -slDistance : +slDistance);
    // Bracket lifecycle: 'pending' → price touches entry → 'open' → tp or sl → 'closed'
    // Quick mode places at current price, so we mark 'open' immediately so the
    // player sees a live position.
    const pkg: Order = {
      id: this._id(),
      type: 'bracket',
      side,
      entry: price,
      tp,
      sl,
      size,
      risk,
      rr,
      slDistance,
      status: 'open',          // pending | open | closed
      openedAt: performance.now() / 1000,
      pnl: 0,                  // realized $ once closed
    };
    this.openOrders.push(pkg);
    this._emit('order', { kind: 'bracket', order: pkg });
    return pkg;
  }
  /** Place N ladder orders at fixed spacing from `price`.
   *  Ported from HTML line 11805 (M1.4a, 2026-05-29). */
  ladder({ side = 'buy', rungs = 5, spacing = 30, size = 4, price }: {
    side?: Side; rungs?: number; spacing?: number; size?: number; price: number;
  }): Order[] {
    const orders: Order[] = [];
    for (let i = 1; i <= rungs; i++) {
      const off = (side === 'buy' ? -1 : 1) * spacing * i;
      const o: Order = { id: this._id(), type: 'ladder', side, price: price + off, size };
      this.openOrders.push(o); orders.push(o);
    }
    this._emit('order', { kind: 'ladder', orders });
    return orders;
  }
  /** OCO pair: sell above + buy below, mutually-cancelling via `pair` ref.
   *  Ported from HTML line 11846 (M1.4a, 2026-05-29). */
  oco({ upper = +80, lower = -80, size = 6, price }: {
    upper?: number; lower?: number; size?: number; price: number;
  }): Order[] {
    const a: Order = { id: this._id(), type: 'oco', side: 'sell', price: price + upper, size, pair: null };
    const b: Order = { id: this._id(), type: 'oco', side: 'buy',  price: price + lower, size, pair: null };
    a.pair = b.id; b.pair = a.id;
    this.openOrders.push(a, b);
    this._emit('order', { kind: 'oco', orders: [a, b] });
    return [a, b];
  }
  /** Hedge Parachute — TV mode: inverseBracket only.
   *  Standalone: inverseBracket (if price given) + 6s buffer effect.
   *  Ported from HTML line 11927 (M1.4a Round 3, 2026-05-29). */
  hedgeParachute({ duration = 6, side = 'buy', price, risk = 20 }: {
    duration?: number; side?: Side; price?: number; risk?: number;
  } = {}): Order | Record<string, unknown> | null {
    if (this.hostMode !== 'standalone') {
      // TV alias: an inverse bracket with tight TP replaces the 6-second buffer.
      if (price == null) return null;  // TV caller must supply context
      this._emit('reframe', { from: 'hedgeParachute', to: 'inverseBracket' });
      return this.inverseBracket({ side, risk, rr: 1.0, price, slDistance: 40 });
    }
    // Standalone: opens REAL inverseBracket alongside the visual buffer effect.
    // Price provided → real opposing bracket fires + buffer.
    // Price missing  → buffer-only fallback (preserves legacy callers).
    let realOrder: Order | null = null;
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
    return realOrder || e;
  }
  /** Liquidity Radar — TV mode: toggle VRVP indicator only.
   *  Standalone: toggle in-game VRVP via host-side INDICATOR_STATE
   *  (when available) + 5s scan-beam effect.
   *  Ported from HTML line 11959 (M1.4a Round 3, 2026-05-29). */
  liquidityRadar({ range = 320 }: { range?: number } = {}): Record<string, unknown> {
    if (this.hostMode !== 'standalone') {
      // TV alias: flash TV's Volume Profile indicator.
      this._emit('reframe', { from: 'liquidityRadar', to: 'toggleIndicator' });
      return this.toggleIndicator({ name: 'VolumeProfileFixedRange', duration: 5 });
    }
    // Standalone: toggle in-game VRVP if the host exposes INDICATOR_STATE
    // (it does in the inline-IIFE build; not in standalone TS-module tests).
    // typeof guard preserves the inline's "fail silently" behavior.
    try {
      const g = globalThis as unknown as { INDICATOR_STATE?: { active: Set<string> } };
      if (g.INDICATOR_STATE !== undefined && g.INDICATOR_STATE.active) {
        if (!g.INDICATOR_STATE.active.has('vrvp')) {
          g.INDICATOR_STATE.active.add('vrvp');
          // Auto-disable after 5s so the indicator only stays on for the scan.
          setTimeout(() => {
            try { g.INDICATOR_STATE?.active.delete('vrvp'); } catch (_) { /* host gone */ }
          }, 5000);
        }
      }
    } catch (_) { /* host not present — silent fail, expected in TS-module ctx */ }
    const e = { id: this._id(), type: 'radar', until: performance.now() / 1000 + 5, range };
    this.activeEffects.push(e);
    this._emit('effect', { kind: 'radar', effect: e });
    return e;
  }
  /** Rescue Drone — TV mode: closeAll() only (no fantasy immunity).
   *  Standalone: closeAll() + arm immunity effect.
   *  Ported from HTML line 11988 (M1.4a Round 3, 2026-05-29). */
  rescueDrone(): Record<string, unknown> {
    if (this.hostMode !== 'standalone') {
      // TV alias: flatten every open position. No in-game immunity — that's
      // pure fantasy and doesn't exist on a real chart.
      this._emit('reframe', { from: 'rescueDrone', to: 'closeAll' });
      return this.closeAll();
    }
    // Standalone: calls closeAll() AND arms immunity. Player gets both real
    // position flatten + gameplay shield (SDK promise: "every ability is a
    // real trading primitive").
    const flattened = this.closeAll();
    const e = {
      id: this._id(),
      type: 'rescue',
      armed: true,
      flattenedCount: flattened ? flattened.count : 0,
    };
    this.activeEffects.push(e);
    this._emit('effect', { kind: 'rescue', effect: e, flattened });
    return e;
  }

  // ── order-issuing · reframe / host primitives ─────────────────────────
  /** Open a bracket on the opposite side; tight default RR=1.
   *  Used by hedgeParachute() in TV host mode. Ported from HTML 11869. */
  inverseBracket({ side = 'buy', risk = 20, rr = 1.0, price, slDistance = 40 }: {
    side?: Side; risk?: number; rr?: number; price: number; slDistance?: number;
  }): Order {
    const opp: Side = side === 'buy' ? 'sell' : 'buy';
    return this.bracket({ side: opp, risk, rr, price, slDistance });
  }
  /** Flatten every open order of the named types. Brackets get status='closed'
   *  + outcome='flatten' + pnl=0; ladders/oco get cancelled=true.
   *  Ported from HTML line 11891 (M1.4a Round 3, 2026-05-29). */
  closeAll({ types = ['bracket', 'ladder', 'oco'] }: { types?: string[] } = {}): { count: number; ids: number[] } {
    const closed: number[] = [];
    for (const o of this.openOrders) {
      if (o.status === 'closed' || o.cancelled) continue;
      if (!types.includes(o.type)) continue;
      if (o.type === 'bracket') {
        o.status = 'closed';
        o.outcome = 'flatten';
        o.exitPrice = null;  // market-close; exit-price TBD by caller
        o.pnl = 0;           // conservative: no fake P&L for a manual flatten
        this._emit('bracketClose', { order: o, reason: 'flatten' });
      } else {
        o.cancelled = true;
        this._emit('cancel', { order: o, reason: 'flatten' });
      }
      closed.push(o.id);
    }
    this._emit('closeAll', { ids: closed, count: closed.length });
    return { count: closed.length, ids: closed };
  }
  /** Push an 'indicator' effect that the renderer / TV-host adapter intercepts.
   *  Ported from HTML line 11915 (M1.4a Round 3, 2026-05-29). */
  toggleIndicator({ name = 'VolumeProfileFixedRange', visible = true, duration = 5 }: {
    name?: string; visible?: boolean; duration?: number;
  } = {}): Record<string, unknown> {
    const e = {
      id: this._id(),
      type: 'indicator',
      name,
      visible,
      until: duration ? performance.now() / 1000 + duration : null,
    };
    this.activeEffects.push(e);
    this._emit('effect', { kind: 'indicator', effect: e });
    return e;
  }
  /** 5 ladder orders at fib offsets (0.236/0.382/0.5/0.618/0.786 × base).
   *  Ported from HTML line 11818 (M1.4a, 2026-05-29). */
  fibLadder({ side = 'buy', size = 4, price, base = 60 }: {
    side?: Side; size?: number; price: number; base?: number;
  }): Order[] {
    const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
    const dir = side === 'buy' ? -1 : 1;
    const orders: Order[] = [];
    for (const f of levels) {
      const off = dir * base * f;
      const o: Order = { id: this._id(), type: 'ladder', side, price: price + off, size };
      this.openOrders.push(o); orders.push(o);
    }
    this._emit('order', { kind: 'ladder', orders });
    return orders;
  }
  /** Arm a trailing stop on an existing open bracket.
   *  Ported from HTML line 11856 (M1.4a, 2026-05-29). */
  trailStop({ id, distance }: { id: number; distance?: number }): Order | null {
    const o = this.openOrders.find(x => x.id === id);
    if (!o || o.type !== 'bracket' || o.status !== 'open') return null;
    const dist = Math.max(0.001, distance != null ? distance : (o.slDistance as number));
    o.trailing = { active: true, distance: dist, breakeven: false };
    this._emit('trail', { order: o });
    return o;
  }

  // ── order-issuing · Tier 1 (missing basics, v0.9.8) ───────────────────
  /** Immediate market order. Status 'open' on creation, emits 'order' + 'fill'.
   *  Ported from HTML line 11998 (M1.4a, 2026-05-29). */
  market({ side = 'buy', size = 1, price }: { side?: Side; size?: number; price: number } = { price: NaN }): Order | null {
    if (price == null || Number.isNaN(price)) return null;
    const o: Order = {
      id: this._id(), type: 'market', side, entry: price, size,
      filledAt: performance.now() / 1000, status: 'open', pnl: 0,
    };
    this.openOrders.push(o);
    this._emit('order', { kind: 'market', order: o });
    this._emit('fill',  { order: o, price });
    return o;
  }
  /** Resting limit order. Status 'pending' until tick() crosses it.
   *  Ported from HTML line 12012 (M1.4a, 2026-05-29). */
  limit({ side = 'buy', price, size = 1 }: { side?: Side; price: number; size?: number } = { price: NaN }): Order | null {
    if (price == null || Number.isNaN(price)) return null;
    const o: Order = {
      id: this._id(), type: 'limit', side, price, size,
      status: 'pending',
    };
    this.openOrders.push(o);
    this._emit('order', { kind: 'limit', order: o });
    return o;
  }
  /** Add or move SL on an existing open position. Symmetric to takeProfit.
   *  Ported from HTML line 12025 (M1.4a, 2026-05-29). */
  stopLoss({ id, price }: { id: number; price: number }): Order | null {
    const o = this.openOrders.find(x => x.id === id);
    if (!o || price == null) return null;
    if (o.status === 'closed' || o.cancelled) return null;
    o.sl = price;
    // Recompute slDistance for trailing-stop logic if it gets armed later.
    if (o.entry != null) {
      o.slDistance = Math.abs((o.entry as number) - price);
    }
    this._emit('modify', { order: o, field: 'sl', price });
    return o;
  }
  /** Add or move TP on an existing open position. Symmetric to stopLoss.
   *  Ported from HTML line 12041 (M1.4a, 2026-05-29). */
  takeProfit({ id, price }: { id: number; price: number }): Order | null {
    const o = this.openOrders.find(x => x.id === id);
    if (!o || price == null) return null;
    if (o.status === 'closed' || o.cancelled) return null;
    o.tp = price;
    this._emit('modify', { order: o, field: 'tp', price });
    return o;
  }
  scaleOut(_o?: { id: number; fraction?: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10798'); }

  // ── order-issuing · Tier 2 (pro primitives, v0.9.8) ───────────────────
  twap(_o?: { side?: Side; totalSize?: number; slices?: number; intervalSecs?: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10821'); }
  iceberg(_o?: { side?: Side; visibleSize?: number; hiddenSize?: number; price: number }): Record<string, unknown> | null { throw new Error('TODO M2.5 — HTML 10854'); }
  trailingTakeProfit(_o?: { id: number; distance?: number }): Order | null { throw new Error('TODO M2.5 — HTML 10875'); }
  /** Two brackets at upper + lower; pending until one triggers + cancels the other.
   *  Ported from HTML line 12143 (M1.4a, 2026-05-29). */
  ocoBracket({ upper, lower, side: _side = 'buy', risk = 20, rr = 2.0, slDistance = 60 }: {
    upper: number; lower: number; side?: Side; risk?: number; rr?: number; slDistance?: number;
  }): { up: Order; down: Order } | null {
    if (upper == null || lower == null) return null;
    const a = this.bracket({ side: 'buy',  risk, rr, price: upper, slDistance });
    const b = this.bracket({ side: 'sell', risk, rr, price: lower, slDistance });
    a.status = 'pending'; b.status = 'pending';
    a.ocoPair = b.id; b.ocoPair = a.id;
    this._emit('order', { kind: 'ocoBracket', orders: [a, b] });
    return { up: a, down: b };
  }
  ifThen(_o?: { triggerPrice: number; side?: 'above' | 'below'; then: (sdk: ChartRunnerSDK) => unknown }): Record<string, unknown> | null { throw new Error('TODO M2.5 — HTML 10900'); }

  // ── order-issuing · Tier 3 (Solana signature plays, v0.9.8) ───────────
  fundingSnipe(_o?: { asset?: string; threshold?: number; side?: Side; risk?: number }): Record<string, unknown> { throw new Error('TODO M2.5 — HTML 10919'); }
  borrowShort(_o?: { asset?: string; size?: number; collateralAsset?: string; collateralSize?: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10938'); }
  liquidationGuard(_o?: { id: number; marginRatio?: number; addAmount?: number }): Order | null { throw new Error('TODO M2.5 — HTML 10954'); }
  copyTrade(_o?: { walletAddr: string; sizeMultiplier?: number; autoStop?: boolean }): Record<string, unknown> { throw new Error('TODO M2.5 — HTML 10966'); }
  perpFlip(_o?: { id: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10984'); }

  // ── order-issuing · Tier 4 (gameplay composites, v0.9.8) ──────────────
  comboTrade(_o?: { setup?: string; price: number; size?: number; risk?: number }): unknown { throw new Error('TODO M2.5 — HTML 11010'); }
  autoFib(_o?: { swingHigh: number; swingLow: number; swingHighWx?: number; swingLowWx?: number; side?: Side; size?: number; drawOverlay?: boolean }): Order[] | null { throw new Error('TODO M2.5 — HTML 11046 (only host WRITE: pushes game.tvOverlays — route via ChartHost.pushOverlay)'); }
  magnet(_o?: { id: number; target: number; strength?: number }): Order | null { throw new Error('TODO M2.5 — HTML 11081'); }

  // ── queries / mutators ────────────────────────────────────────────────
  registerScoreComponent(_id: string, _fn: (...a: unknown[]) => unknown, _defaultWeight = 1): void { throw new Error('TODO M2.5 — HTML 11118'); }
  scoreSetup(_opts?: { side?: Side; price?: number; weights?: Record<string, number> }): ScoreResult { throw new Error('TODO M2.5 — HTML 11122 (composes the detectors below)'); }
  unrealized(_price: number): number { throw new Error('TODO M2.5 — HTML 11924'); }
  findOrder(id: number): Order | null { return this.openOrders.find(o => o.id === id) ?? null; }
  /** Mark order cancelled + remove from openOrders + emit 'cancel'.
   *  Ported from HTML line 13196 (M1.4a, 2026-05-29). */
  cancelOrder(id: number): boolean {
    const o = this.findOrder(id);
    if (!o) return false;
    o.cancelled = true;
    this.openOrders = this.openOrders.filter(x => x.id !== id);
    this._emit('cancel', { order: o });
    return true;
  }
  /** Patch a bracket's tp/sl/entry (recomputes slDistance+rr) or a ladder/oco's price.
   *  Brackets must be 'open' to be edited; resolved brackets are immutable.
   *  Ported from HTML line 13203 (M1.4a, 2026-05-29). */
  editOrder(id: number, patch: Partial<Order>): boolean {
    const o = this.findOrder(id);
    if (!o) return false;
    if (o.type === 'bracket') {
      if (o.status !== 'open') return false; // resolved brackets are immutable
      if (patch.tp    != null) o.tp    = patch.tp;
      if (patch.sl    != null) o.sl    = patch.sl;
      if (patch.entry != null) o.entry = patch.entry;
      // slDistance drives risk math; recompute if SL or entry moved
      o.slDistance = Math.max(0.001, Math.abs((o.entry as number) - (o.sl as number)));
      o.rr         = Math.abs((o.tp as number) - (o.entry as number)) / (o.slDistance as number);
    } else if (o.type === 'ladder' || o.type === 'oco') {
      if (patch.price != null) o.price = patch.price;
    }
    this._emit('edit', { order: o, patch });
    return true;
  }

  // ── detectors (delegate to ./detectors.ts; pure, emit nothing) ─────────
  private _detCtx() {
    return {
      candles: this.host?.getCandles() ?? [],
      referenceLevels: this.host?.referenceLevels?.() ?? null,
      rsi: this.host?.rsi,
    };
  }
  detectCCV(): DetectorResult { return detectors.detectCCV(this._detCtx()); }
  detectBumpAndRun(): DetectorResult { return detectors.detectBumpAndRun(this._detCtx()); }
  detectHeadShoulders(): DetectorResult { return detectors.detectHeadShoulders(this._detCtx()); }
  detectSFP(): DetectorResult { return detectors.detectSFP(this._detCtx()); }
  detectFailedAuction(): DetectorResult { return detectors.detectFailedAuction(this._detCtx()); }
  detectOIConfirm(o?: { side?: Side }): DetectorResult { return detectors.detectOIConfirm({ ...this._detCtx(), side: o?.side }); }

  // ── per-frame engine (HTML 11793) ─────────────────────────────────────
  // Advances ladder/oco/limit fills, bracket tp/sl + trailing/magnet ratchets,
  // ifThen watchers, effect GC. Emits fill / cancel / edit / bracketClose /
  // expired / iceberg / ifThen.
  tick(_o: { price: number; t: number }): void { throw new Error('TODO M2.5 — HTML 11793'); }
}
