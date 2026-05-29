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
  ladder(_o: { side?: Side; rungs?: number; spacing?: number; size?: number; price: number }): Order[] { throw new Error('TODO M2.5 — HTML 10549'); }
  oco(_o: { upper?: number; lower?: number; size?: number; price: number }): Order[] { throw new Error('TODO M2.5 — HTML 10590'); }
  hedgeParachute(_o?: { duration?: number; side?: Side; price?: number; risk?: number }): Order | Record<string, unknown> | null { throw new Error('TODO M2.5 — HTML 10656'); }
  liquidityRadar(_o?: { range?: number }): Record<string, unknown> { throw new Error('TODO M2.5 — HTML 10688'); }
  rescueDrone(): Record<string, unknown> { throw new Error('TODO M2.5 — HTML 10717'); }

  // ── order-issuing · reframe / host primitives ─────────────────────────
  inverseBracket(_o?: { side?: Side; risk?: number; rr?: number; price?: number; slDistance?: number }): Order { throw new Error('TODO M2.5 — HTML 10613'); }
  closeAll(_o?: { types?: string[] }): { count: number; ids: number[] } { throw new Error('TODO M2.5 — HTML 10620'); }
  toggleIndicator(_o?: { name?: string; visible?: boolean; duration?: number }): Record<string, unknown> { throw new Error('TODO M2.5 — HTML 10644'); }
  fibLadder(_o?: { side?: Side; size?: number; price: number; base?: number }): Order[] { throw new Error('TODO M2.5 — HTML 10562'); }
  trailStop(_o?: { id: number; distance?: number }): Order | null { throw new Error('TODO M2.5 — HTML 10600'); }

  // ── order-issuing · Tier 1 (missing basics, v0.9.8) ───────────────────
  market(_o?: { side?: Side; size?: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10742'); }
  limit(_o?: { side?: Side; price: number; size?: number }): Order | null { throw new Error('TODO M2.5 — HTML 10756'); }
  stopLoss(_o?: { id: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10769'); }
  takeProfit(_o?: { id: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10785'); }
  scaleOut(_o?: { id: number; fraction?: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10798'); }

  // ── order-issuing · Tier 2 (pro primitives, v0.9.8) ───────────────────
  twap(_o?: { side?: Side; totalSize?: number; slices?: number; intervalSecs?: number; price: number }): Order | null { throw new Error('TODO M2.5 — HTML 10821'); }
  iceberg(_o?: { side?: Side; visibleSize?: number; hiddenSize?: number; price: number }): Record<string, unknown> | null { throw new Error('TODO M2.5 — HTML 10854'); }
  trailingTakeProfit(_o?: { id: number; distance?: number }): Order | null { throw new Error('TODO M2.5 — HTML 10875'); }
  ocoBracket(_o?: { upper: number; lower: number; side?: Side; risk?: number; rr?: number; slDistance?: number }): { up: Order; down: Order } | null { throw new Error('TODO M2.5 — HTML 10887'); }
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
  cancelOrder(_id: number): boolean { throw new Error('TODO M2.5 — HTML 11940'); }
  editOrder(_id: number, _patch: Partial<Order>): boolean { throw new Error('TODO M2.5 — HTML 11947'); }

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
