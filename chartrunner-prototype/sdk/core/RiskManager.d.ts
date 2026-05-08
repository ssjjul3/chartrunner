import type { Ability, AbilityContext } from './AbilityRegistry.js';
import type { GateDecision } from './types.js';
export interface RiskManager {
    /** notional USD size for the ability — uses Kelly multiplier, OI/IV mult, cap, min */
    sizeFor(ability: Ability, ctx: AbilityContext): number;
    /** AI gate check. In sandbox/paper this is an inline stub; in live, RPC. */
    checkGate(ability: Ability, ctx: AbilityContext): Promise<GateDecision>;
}
export declare class SandboxRiskManager implements RiskManager {
    /** Same defaults as hl/trade_executor.py — ported on extraction. */
    private readonly KELLY_MULT;
    private readonly NOTIONAL_CAP;
    private readonly NOTIONAL_MIN;
    sizeFor(_ability: Ability, _ctx: AbilityContext): number;
    checkGate(_ability: Ability, _ctx: AbilityContext): Promise<GateDecision>;
}
//# sourceMappingURL=RiskManager.d.ts.map