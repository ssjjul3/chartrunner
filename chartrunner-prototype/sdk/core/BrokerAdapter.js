// BrokerAdapter — the one-way door to execution.
//
// Deliberately narrower than hl/api.py — the SDK never needs anything exotic.
// Concrete adapters:
//   SandboxBroker    — in-browser paper book, deterministic seed (M1)
//   PaperBroker      — in-browser paper book, live price feed (M3)
//   HLTestnetBroker  — real signed orders to HL testnet (M4)
//   HLLiveBroker     — intent forwarded to hl_bot via signal_bus (M4)
//
// Only HLLiveBroker opens a WebSocket to sdk/server.py. The rest are pure-
// client. This is what makes the risk-mode enum safe — execution authority
// stays inside hl_bot for `live` mode; the browser only ever expresses intent.
export {};
//# sourceMappingURL=BrokerAdapter.js.map