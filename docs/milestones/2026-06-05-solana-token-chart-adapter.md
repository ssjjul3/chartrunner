# Solana Token Chart Adapter - 2026-06-05

## Public Surface

- `chartrunner.xyz/play/`
- Source: `ChartRunner_Prototype.html`
- Shipped version: `v1.0.222`

## Summary

Configure Run now accepts pasted Solana token mint addresses in the Token field. A valid mint creates a public custom token asset, discovers a high-liquidity GeckoTerminal Solana pool, fetches pool OHLCV candles for the pasted token, and updates the chart source label with the selected DEX/pair.

If no public pool or usable candles are available, the game keeps the run playable by falling back to visibly labeled seeded candles.

## Verified

- Prototype inline JavaScript extraction passed.
- Local browser smoke passed for pasted wrapped SOL mint:
  - selected pool: Orca `SOL / USDC`
  - source label: `live · GeckoTerminal · Orca · SOL / USDC`
  - 1000 live candles loaded
- Configure Run layout smoke passed: Asset / Token / Timeframe / Broker, with no visible Perspective control in the Configure Run window.

## Boundary

This milestone adds public market-data lookup only. It does not store API keys, route broker orders, sign wallet messages, move funds, write on-chain, ship hosted agent transports, publish SDK packages, or add live execution adapters.
