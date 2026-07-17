# Asset Licenses

## Sprite pack (inlined in `ChartRunner_Prototype.html`, source copy in `assets/sprites/`)

All sprites in the ChartRunner sprite pack (`cr_sprites.js` — 48 animations,
99 frames, palette + char-grid format) are **original work, © ChartRunner 2026**.

- No third-party assets, no traced or converted artwork.
- Every grid was hand-authored in-session (generator: `assets/sprites/gen.py`);
  the HD set (`assets/sprites/hd/`) is a pure algorithmic Scale4x refinement of
  those same grids — no external image sources.
- Palette is the ChartRunner terminal aesthetic (Solana-green family `#14F195`
  et al.), defined in `CR_SPRITES.pal`.
- The pack deliberately avoids the silhouettes of classic arcade IP (no alien /
  bird / mole shapes, no yellow wedge muncher): see the v1.0.641 changelog entry
  and the wording rules in Spec 08 (`ChartRunner-Brain/raw/perplexity/`).

## Everything else

The game is procedurally drawn (canvas): no bundled fonts beyond the system
stack, no images, no CDN assets. The pixel mascot (`drawInvader`), Snake avatar,
Byte avatar and all UI chrome are original procedural or sprite-pack work under
the repository license.
