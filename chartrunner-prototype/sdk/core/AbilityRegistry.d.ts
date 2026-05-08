import type { ChartHost } from './ChartHost.js';
import type { BrokerAdapter } from './BrokerAdapter.js';
import type { SignalFeed } from './SignalFeed.js';
import type { RiskManager } from './RiskManager.js';
import type { GameState, GateDecision, OrderResult } from './types.js';
export interface AbilityContext {
    host: ChartHost;
    broker: BrokerAdapter;
    risk: RiskManager;
    signals: SignalFeed;
    state: GameState;
}
export type AbilityOutcome = {
    ok: true;
    order: OrderResult;
} | {
    ok: false;
    reason: string;
};
export interface Ability {
    /** stable id used in logs, registry keys, and Workbench equipped lists */
    id: string;
    /** optional hotkey — '2', '3', etc. */
    key?: string;
    /** ms cooldown after fire (default 0 — v0.7 decision: abilities don't deplete) */
    cooldownMs?: number;
    /** unicode glyph or asset path */
    icon: string;
    /** human-readable label for the spawn menu */
    label?: string;
    /** category — 'forecast' | 'fib' | 'orders' | 'lines' | 'volume' | … */
    cat?: string;
    /** the actual fire — calls broker.placeXxx(...) */
    onFire(ctx: AbilityContext): Promise<AbilityOutcome>;
    /** optional pre-fire risk/gate check */
    gate?(ctx: AbilityContext): Promise<GateDecision>;
    /** optional overlay draw — requested by registry, executed by renderer */
    drawOverlay?(host: ChartHost, ctx: CanvasRenderingContext2D): void;
}
export declare class AbilityRegistry {
    private abilities;
    register(ability: Ability): void;
    unregister(id: string): boolean;
    get(id: string): Ability | undefined;
    list(): Ability[];
    byCategory(cat: string): Ability[];
    byKey(key: string): Ability | undefined;
}
//# sourceMappingURL=AbilityRegistry.d.ts.map