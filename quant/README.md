# quant/ — Trading methodology reference

`quant.pdf` is the 39-page institutional confluence-trading methodology that drives ChartRunner's Signal Quality Scoring system.

The scoring spine in `ChartRunnerSDK.scoreSetup()` mirrors this PDF's Tier 1 weighting: HTF trend alignment, reference levels, divergence, Champions Channel, consolidation breakout, SFP, Failed Auction, OI confirmation, Bump-and-Run, Head & Shoulders, and the CCV mega-bonus. Each weight matches a section of the PDF.

## Why ship this in the repo

ChartRunner's gameplay isn't just "pick a setup that scores high." Every component has a corresponding SDK detector method (`sdk.detectSFP`, `sdk.detectFailedAuction`, etc.) that fires per-candle and shows ✓/✗ in-game. The PDF is the source of truth for *why* each detector exists and what it's actually testing.

Judges or contributors who want to verify the math (or argue a detector is wrong) can read this PDF and compare against `ChartRunner_Prototype.html`'s scoring code (search `scoreSetup`). It's the primary research input that distinguishes ChartRunner's quant brain from "just another TradingView clone."

## Source

Original PDF compiled from public-domain Bulkowski / Cooper / Auction Market Theory references. Not a proprietary or copyrighted document.
