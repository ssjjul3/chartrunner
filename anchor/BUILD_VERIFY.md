# ChartRunner — reproducible builds & on-chain verification

Goal: let anyone prove that each deployed ChartRunner program was built from this
public source. Tooling:
[solana-verify](https://github.com/Ellipsis-Labs/solana-verifiable-build)
(Ellipsis Labs / OtterSec), the canonical Solana verified-builds pipeline.

> Verified ≠ audited ≠ safe. Verification only proves source == deployed.

## Toolchain pins — why `Cargo.lock` is frozen (do NOT `cargo update`)

`solana-verify` builds in a **pinned Docker image** whose Rust (~1.75/1.79 for the
Solana 1.18.17 programs) predates **Rust edition2024**. `cargo metadata` — which
`solana-verify build` runs first — parses **every** manifest in the resolved
graph, so a single transitive crate that has moved to edition2024 makes the whole
build fail before it starts (e.g. `feature edition2024 is required`).

Over time crates.io publishes edition2024 releases of common transitive deps, so a
lock that is regenerated on a modern host silently drifts and breaks the verified
build. This workspace therefore pins the offenders **down** to their last
edition2021-compatible versions in the committed `Cargo.lock`:

| Crate | Pinned | Why |
|-------|--------|-----|
| `blake3` | `1.8.2` | `1.8.3+` bumped its own edition to 2024 (and `1.8.4+` pulls `block-buffer 0.12`/`digest 0.11`). **Linked** into the `.so` via `solana-program`, so this is also the version that must reproduce the deployed hash. |
| `proc-macro-crate` | `3.3.0` | `3.4.0` needs `toml_edit 0.23` → `toml_parser` (edition2024); `3.5.0` needs Rust 1.82. Build-time only. |
| `indexmap` | `2.11.4` | `2.12+` needs Rust 1.82. Pulls `hashbrown 0.16.1`. Build-time only. |
| `jobserver` | `0.1.32` | `0.1.33+` pull `getrandom 0.3` → `wasip2` → `wit-bindgen` (edition2024). Build-time only. |

Only `blake3` is compiled into the SBF bytecode; the rest are host/proc-macro
build deps and do **not** affect the executable hash. If you must refresh the
lock, do it inside the pinned image (or with `cargo +1.79`) and re-assert these
pins, then re-run `scripts/verify.sh` to confirm the hashes still match.

The workspace (`anchor/Cargo.toml`) is also scoped to the three Anchor 0.30.1
programs (`maps`, `registry`, `progression`). `match` (Anchor 0.32.1 / Rust 1.85)
and `oracle` (pyth-solana-receiver-sdk drags the Solana 2.x split crates, which
require edition2024) are `exclude`d — they cannot resolve under the 0.30.1 image,
and `cargo metadata` resolves the whole workspace.

## How it works

`solana-verify build --library-name <lib>` builds one program in a pinned Docker
image (deterministic; Solana version taken from `Cargo.lock`). Then compare two
hashes:

```
solana-verify get-executable-hash target/deploy/<lib>.so      # from the build
solana-verify get-program-hash   -u <rpc> <program-id>        # from the chain
```

Equal hashes ⇒ the chain runs this source. `scripts/verify.sh` wraps this per
program.

Two constraints for this repo:

1. **Split toolchain.** `maps`, `registry`, `oracle` use Anchor 0.30.1; `match`
   uses Anchor 0.32.1. They can't share one build image, so always build
   per-program (`--library-name`) — never a bare `solana-verify build`. See
   `TOOLCHAINS.md`.
2. **Devnet = local verify only.** OtterSec **remote** verification (the Explorer
   "verified" badge) is mainnet-only. On devnet, self-verify by comparing the two
   hashes above.

`Cargo.lock` is committed (solana-verify needs it); `target/` is gitignored.

## Program IDs (devnet)

| Program | Library name | Program ID |
|---------|--------------|------------|
| maps | `chartrunner_maps` | `DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH` |
| registry | `chartrunner_registry` | `ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn` |
| oracle | `chartrunner_oracle` | `4vfZVDfDzhR79qdaUdPAzRwUHYB5qbgNwTGBwfy6i5wH` |
| match | `chartrunner_match` | `3mzEAWZVtTV7sjqkRrPAbB3tT7bA3vVx5wyYQZvfp5zu` |

## Per-program status

| Program | Anchor | Verifiable today? |
|---------|--------|-------------------|
| maps | 0.30.1 | Yes |
| registry | 0.30.1 | Yes, after the pending governance upgrade ships |
| oracle | 0.30.1 | Pending — the deployed binary is an interim no-SDK variant; the full Pyth version (`src/lib.rs`) builds locally and will be upgraded in place |
| match | 0.32.1 | Pending — built from a separate crate; being consolidated into this workspace |

## Verify on devnet (now)

```bash
cd anchor
scripts/verify.sh maps
scripts/verify.sh registry
```

## Mainnet — remote verification with a multisig (later)

```bash
cd anchor
solana-verify build --library-name <lib>
# upgrade via the multisig, then:
solana-verify verify-from-repo -u <mainnet-rpc> \
  --program-id <PROGRAM_ID> <repo-url> \
  --commit-hash <COMMIT> --library-name <lib> --mount-path anchor
# multisig: export the PDA tx, execute it through the multisig, then:
solana-verify remote submit-job --program-id <PROGRAM_ID> --uploader <authority>
```

`--mount-path` = the folder holding the workspace `Cargo.toml` (here, `anchor`).
Programs previously verified with Anchor may need the `--bpf` flag.

## Recommended: security.txt

Add the `solana-security-txt` macro to each program (contact, repo, policy) so
researchers can reach the maintainers and explorers can link source/SDK. It
changes bytecode, so wire it in on each program's next upgrade.

Sources: [Solana docs — Verifying Programs](https://solana.com/docs/programs/verified-builds),
[Ellipsis-Labs/solana-verifiable-build](https://github.com/Ellipsis-Labs/solana-verifiable-build).
