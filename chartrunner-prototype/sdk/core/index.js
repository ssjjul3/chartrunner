// @chartrunner/core — public entry point.
//
// The prototype HTML loads this as:
//   <script type="module">
//     import { ChartRunnerSDK, AbilityRegistry } from './sdk/web/core/dist/index.js';
//     window.sdk = new ChartRunnerSDK();
//   </script>
//
// v0.9.57 (M1.2) — ChartRunnerSDK lifted from prototype lines 8438–9948.
// Lift-and-shift: behavior unchanged, file location new. Inline class in
// the prototype stays for now; M1.4 deletes it and swaps in this import.
// — Lifted class (the canonical SDK) —
export { ChartRunnerSDK } from './ChartRunnerSDK.js';
export { AbilityRegistry } from './AbilityRegistry.js';
export { SandboxBroker } from './SandboxBroker.js';
export { SandboxSignalFeed } from './SignalFeed.js';
export { SandboxRiskManager } from './RiskManager.js';
//# sourceMappingURL=index.js.map