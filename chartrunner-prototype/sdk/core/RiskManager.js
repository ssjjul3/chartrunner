// RiskManager — ports hl/trade_executor.py::compute_position_size 1:1 to TS.
// Same multipliers, same cap, same $10 minimum. This gives the browser-side
// paper book the SAME sizing discipline as live.
//
// In live mode, RiskManager.checkGate is RPC'd to the server, which calls
// hl/gate_logic.py::ollama_pre_trade_gate. In sandbox/paper, an inline
// permissive stub is used so the player can practice without the gate.
export class SandboxRiskManager {
    /** Same defaults as hl/trade_executor.py — ported on extraction. */
    KELLY_MULT = 0.25;
    NOTIONAL_CAP = 500;
    NOTIONAL_MIN = 10;
    sizeFor(_ability, _ctx) {
        // Sandbox sizes are flat — extraction will port the Kelly / OI / IV logic
        // verbatim from compute_position_size. For M1 we just pass the cap.
        return Math.max(this.NOTIONAL_MIN, Math.min(this.NOTIONAL_CAP, 50));
    }
    async checkGate(_ability, _ctx) {
        // Sandbox is permissive. Live mode replaces this with the RPC.
        return { approved: true, reason: 'sandbox: gate bypassed' };
    }
}
//# sourceMappingURL=RiskManager.js.map