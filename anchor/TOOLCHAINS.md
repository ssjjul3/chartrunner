# ChartRunner — pinned toolchains

Exact versions each program builds against. Keep these in sync with each
program's `Cargo.toml` and with `Cargo.lock` (which is what `solana-verify`
reads). See `BUILD_VERIFY.md` for the reproducible/verified-build workflow.

## Per-program matrix

| Program | Anchor | Solana CLI / platform-tools | Rust (host) | Extra crates |
|---------|--------|-----------------------------|-------------|--------------|
| chartrunner_maps | 0.30.1 | 1.18.x (solana-program =1.18.17) | 1.79.0 | — |
| chartrunner_registry | 0.30.1 | 1.18.x (solana-program =1.18.17) | 1.79.0 | — |
| chartrunner_oracle | 0.30.1 | 1.18.x (solana-program =1.18.17) | 1.79.0 | pyth-solana-receiver-sdk 0.4.0 |
| chartrunner_match | 0.32.1 | 2.x (per ephemeral-rollups-sdk) | 1.85.x | ephemeral-rollups-sdk 0.13.0 |

Three of four programs share one toolchain (Anchor 0.30.1). Only
`chartrunner_match` needs the newer one, because the MagicBlock ephemeral-rollups
SDK requires it.

## Why split, and the recommended cleanup

`maps`/`registry`/`oracle` use Anchor 0.30.1 (Rust ~1.79); `match` needs Anchor
0.32.1 (Rust 1.85). One Anchor version can't serve both, so:

- **Now:** build per-program (switch Anchor with `avm use` before each, or use
  `solana-verify build --library-name <lib>`, which is per-program anyway).
- **Recommended:** move `chartrunner_match` into its own workspace so the main
  Anchor workspace is uniformly 0.30.1 and `Anchor.toml`'s
  `[toolchain] anchor_version` can be set to `0.30.1` for a clean plain
  `anchor build`. Until then, always pass `-p` / `--library-name`.

## Installing the toolchains (one-time)

```bash
# Rust + the version manager
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup toolchain install 1.79.0      # for the 0.30.1 programs
rustup toolchain install 1.85.0      # for match

# Anchor version manager
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm install 0.32.1

# Solana CLI (brings the platform-tools used for the SBF build)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

For deterministic/verified builds you don't manage these by hand —
`solana-verify build` runs the correct pinned toolchain inside Docker, keyed off
`Cargo.lock`. The list above is for fast local iteration with `anchor build`.
