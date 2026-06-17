# ChartRunner — reproducible builds & on-chain verification

Goal: let anyone prove that each deployed ChartRunner program was built from this
public source. Tooling:
[solana-verify](https://github.com/Ellipsis-Labs/solana-verifiable-build)
(Ellipsis Labs / OtterSec), the canonical Solana verified-builds pipeline.

> Verified ≠ audited ≠ safe. Verification only proves source == deployed.

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
