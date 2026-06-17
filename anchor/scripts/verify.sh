#!/usr/bin/env bash
# ChartRunner — reproducible-build + on-chain verification helper.
#
# Wraps `solana-verify` (Ellipsis Labs / OtterSec verified-builds pipeline).
# Builds each program DETERMINISTICALLY in Docker, then compares the resulting
# executable hash against the on-chain program hash. Identical hashes prove the
# deployed bytecode was built from this exact source tree.
#
# Requires (on your Mac, NOT the sandbox):
#   - Docker running
#   - cargo install solana-verify
#   - solana CLI
#
# Why per-program: solana-verify builds ONE program at a time keyed off
# Cargo.lock. ChartRunner's workspace spans two Anchor generations
# (maps/registry = 0.30.1 / Rust ~1.79; match/oracle = 0.32.1 / Rust 1.85),
# which cannot share a single build image — so we always pass --library-name
# and treat each program independently.
#
# Devnet note: OtterSec REMOTE verification (the Explorer "verified" badge) is
# MAINNET-ONLY. On devnet we self-verify locally by comparing
# get-executable-hash (Docker build) with get-program-hash (on-chain). The
# remote/Squads PDA flow is documented in BUILD_VERIFY.md for the mainnet cut.
#
# Usage:
#   scripts/verify.sh maps          # build + hash-compare one program
#   scripts/verify.sh registry
#   scripts/verify.sh all           # all RECONCILED programs (maps, registry)
#   scripts/verify.sh all --include-unreconciled   # also try match + oracle
#
# Run from the anchor/ workspace root.

set -euo pipefail

RPC="${RPC:-https://api.devnet.solana.com}"
# If the repo nests this workspace in a subfolder, set MOUNT_PATH (e.g. "anchor")
# for the verify-from-repo commands in BUILD_VERIFY.md. Not needed for local hash
# compare below.
MOUNT_PATH="${MOUNT_PATH:-anchor}"

# program key -> "library_name program_id reconciled?"
declare -A LIB=(
  [maps]="chartrunner_maps"
  [registry]="chartrunner_registry"
  [match]="chartrunner_match"
  [oracle]="chartrunner_oracle"
)
declare -A PID=(
  [maps]="DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH"
  [registry]="ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn"
  [match]="3mzEAWZVtTV7sjqkRrPAbB3tT7bA3vVx5wyYQZvfp5zu"
  [oracle]="4vfZVDfDzhR79qdaUdPAzRwUHYB5qbgNwTGBwfy6i5wH"
)
# Programs whose committed source is known to match (or will match after the
# pending upgrade) the deployed bytecode. match + oracle are NOT here yet —
# see BUILD_VERIFY.md "Reconciliation matrix".
RECONCILED="maps registry"

verify_one() {
  local key="$1"
  local lib="${LIB[$key]}"
  local pid="${PID[$key]}"
  echo "──────────────────────────────────────────────────────────"
  echo "▶ $key  ($lib)  program=$pid"
  echo "  building in Docker (deterministic)…"
  solana-verify build --library-name "$lib"

  local exe_hash onchain_hash
  exe_hash="$(solana-verify get-executable-hash "target/deploy/${lib}.so")"
  onchain_hash="$(solana-verify get-program-hash -u "$RPC" "$pid")"

  echo "  executable hash : $exe_hash"
  echo "  on-chain  hash  : $onchain_hash"
  if [[ "$exe_hash" == "$onchain_hash" ]]; then
    echo "  ✅ MATCH — deployed bytecode reproduces from this source."
  else
    echo "  ❌ MISMATCH — source ≠ deployed (see BUILD_VERIFY.md)."
    return 1
  fi
}

main() {
  local target="${1:-all}"
  local include_unreconciled=0
  [[ "${2:-}" == "--include-unreconciled" ]] && include_unreconciled=1

  if [[ "$target" == "all" ]]; then
    local rc=0
    for k in $RECONCILED; do verify_one "$k" || rc=1; done
    if [[ $include_unreconciled -eq 1 ]]; then
      echo; echo "⚠ Attempting UNRECONCILED programs (expected to mismatch until"
      echo "  their source is reconciled — see BUILD_VERIFY.md):"
      for k in match oracle; do verify_one "$k" || true; done
    fi
    exit $rc
  fi

  [[ -n "${LIB[$target]:-}" ]] || { echo "unknown program: $target"; exit 2; }
  verify_one "$target"
}

main "$@"
