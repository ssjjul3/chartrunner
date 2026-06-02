# Play Mobile Shell Release - 2026-06-02

## Public Surface

- `chartrunner.xyz/play/`
- Source: `ChartRunner_Prototype.html`
- Shipped versions: `v1.0.214` and `v1.0.215`

## Summary

The regular `/play/` route now has the adaptive phone/tablet shell that was previously limited to the mobile/Telegram surface. Phones and tablets get touch-first chart navigation, tap-to-run movement, quick runner controls, mobile app sheets, and chart-safe terminal pane widgets.

The follow-up `v1.0.215` cleanup removed duplicate control affordances: the left rail is now chart-mode only (`M`, `I`, `T`, `W`), while laser and numbered hotkeys live in a collapsed bottom-left `HOT` tray. The bottom-right runner cluster remains focused on `F`, `S`, and `RUN`.

## Verified

- Prototype inline JavaScript extraction passed.
- Public leakage guard passed.
- Local `/play/` mobile adaptive shell smoke passed.
- Live `/play/` mobile adaptive shell smoke passed.
- GitHub Pages deploy passed.

## Boundary

This milestone changes the public game interface only. It does not ship standalone SDK package artifacts, live broker execution, hosted agent transports, private market data pipelines, premium bot logic, or mainnet trading paths.
