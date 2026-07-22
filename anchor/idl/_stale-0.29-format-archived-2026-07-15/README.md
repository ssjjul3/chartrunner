# Archived stale IDL — 2026-07-15

`chartrunner_registry.json` here was **Anchor 0.29-format** (top-level `version`+`name`,
hand-edited `_note` key, NO `discriminator` fields on instructions/accounts).

The toolchain is **Anchor 0.30.1** (`Anchor.toml [toolchain] anchor_version = "0.30.1"`),
whose IDL format REQUIRES a `discriminator` field. Reading this stale IDL during
`anchor build` produced: **`missing field discriminator at line 1 column 409`** — the
long-standing "Anchor/IDL build blocker" (M0.5 / M14).

**Fix:** archived here so `anchor build` regenerates a clean 0.30-format IDL.
Nothing at runtime imports `anchor/idl/*` (verified — only a commented-out example in
`solana-connect/src/lib/pyth-feeds.ts`), so removal is safe.

Do NOT restore this file. If you need the registry IDL, rebuild it (see
`anchor/TOOLCHAIN-FIX-2026-07-15.md`).
