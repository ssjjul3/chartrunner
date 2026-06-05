# Run Window UI Polish - 2026-06-05

## Public Surface

- `chartrunner.xyz/play/`
- Source: `ChartRunner_Prototype.html`
- Shipped versions: `v1.0.218` and `v1.0.219`

## Summary

The public `/play/` prototype received a focused Run-window UI polish pass.

`v1.0.218` made Configure Run match the Run window language: slimmer setup buttons, fewer section dividers, a flat broker row, a quieter Back action, and one clear Start Run action. The run-start flow was preserved.

`v1.0.219` updated RUN-tube without changing its PIP camera behavior. The widget now follows the active window theme, uses slimmer window controls, keeps the camera viewport clean, and has a compact wider default so the `RUN-tube · LIVE` title and three controls fit without crowding.

## Verified

- Prototype inline JavaScript extraction passed.
- Public leakage guard passed.
- Public leakage guard self-test passed.
- Local browser smoke passed for Configure Run: open, change asset/timeframe/broker, Back, reopen, Start Run.
- Local browser smoke passed for RUN-tube: open, readable title/layout, close.
- GitHub CI passed for both releases.
- GitHub Pages deploy passed for both releases.
- Live `/play/` served `v1.0.218` after Configure Run and `v1.0.219` after RUN-tube.

## Boundary

This milestone changes public UI chrome only. It does not ship standalone SDK package artifacts, live broker execution, hosted agent transports, private market data pipelines, premium bot logic, or mainnet trading paths.
