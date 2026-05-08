// ChartHost — abstraction over any chart that hosts ChartRunner.
//
// Concrete hosts shipped in Phase 1 (live in @chartrunner/adapters):
//   BinanceHost       — current prototype's internal renderer (REST klines)
//   HyperliquidHost   — wraps hl/api.py::get_all_assets / get_price
//   TradingViewHost   — TradingView Widget API onChartReady + priceScale()
//   DexScreenerHost   — iframe postMessage bridge (best-effort)
//
// The renderer in the prototype implements this surface implicitly today via
// `sX(wx)`, `priceToY(price)`, `yToPrice(y)`, `xToTime(x)` etc. M1 work is to
// expose those as a single named interface so the same trading code can run
// on top of any chart that conforms.
export {};
//# sourceMappingURL=ChartHost.js.map