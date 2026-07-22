# Toolchain Fix — the Anchor/IDL build blocker (2026-07-15)

**The blocker (M0.5 / M14, "Anchor/IDL build wall"):**
`anchor build -p chartrunner-registry` failed with:

```
missing field `discriminator` at line 1 column 409
```

## Root cause (diagnosed 2026-07-15)

The committed IDL `anchor/idl/chartrunner_registry.json` was in **Anchor 0.29 format** —
top-level `version` + `name` keys, a hand-edited `_note` key, and **no `discriminator`
fields** on instructions/accounts. The toolchain is **Anchor 0.30.1**
(`Anchor.toml → [toolchain] anchor_version = "0.30.1"`), whose IDL format **requires** a
`discriminator` field on every instruction and account. When `anchor build` read the stale
0.29 IDL, its parser hit the first instruction object (~char 409 of the single-line JSON),
found no `discriminator`, and aborted.

It was never a Rust/compiler wall. It was a **stale hand-edited artifact poisoning the IDL
step.** (The earlier "Rust 1.85 / platform-tools" wall was a *different*, already-fixed issue.)

## What was already done from the sandbox (2026-07-15)

- ✅ The stale IDL was **archived** to `anchor/idl/_stale-0.29-format-archived-2026-07-15/`
  so the next build regenerates a clean 0.30-format IDL. **Verified safe:** nothing at
  runtime imports `anchor/idl/*` (only a commented-out example in
  `solana-connect/src/lib/pyth-feeds.ts`).
- ✅ The new `chartrunner-progression` program has a real program ID
  (`3jESG5WzfKsGze1rYeRpBq6FznakSfULUJkCtDjkjdu5`) wired into `declare_id!` + `Anchor.toml`;
  keypair at `anchor/target/deploy/chartrunner_progression-keypair.json` (gitignored —
  **move the secret to 1Password, never commit it**).

## What YOU run on the Mac to close it (the sandbox has no Solana/Anchor toolchain)

```bash
cd ~/projects/chartrunner/anchor

# 1. Pin the Anchor CLI to match the workspace (0.30.1)
avm use 0.30.1
anchor --version          # expect: anchor-cli 0.30.1

# 2. Rebuild the registry — regenerates a clean 0.30-format IDL (with discriminators)
NO_DNA=1 anchor build -p chartrunner-registry
#   -> should now SUCCEED and write a fresh anchor/idl/chartrunner_registry.json
#      (0.30 format: top-level "address"/"metadata"/"spec", discriminator on every ix+account)

# 3. Sanity-check the regenerated IDL is 0.30 format
python3 -c "import json;d=json.load(open('idl/chartrunner_registry.json'));print('OK 0.30' if 'address' in d and 'discriminator' in d['instructions'][0] else 'STILL STALE')"

# 4. Build the new progression program too (first real build of the mint scaffold)
NO_DNA=1 anchor build -p chartrunner-progression
#   -> EXPECT compile errors to fix: this is the first build of hand-written scaffold.
#      Resolve them; the 19 AUDIT markers are already hardened (see the program's
#      lib.rs banner + // AUDITED notes), but Rust type/borrow errors are normal
#      on a first build and are a coding task, not an audit task.
```

## If `avm use 0.30.1` isn't enough

Two adjacent things can keep it red — check in this order:
1. **CLI ≠ 0.30.1.** If `anchor --version` shows 0.29.x or 0.31/0.32, the format mismatch
   returns. `avm install 0.30.1 && avm use 0.30.1`.
2. **A second stale IDL.** Only `chartrunner_registry.json` was stale in the sandbox, but if
   `anchor build` still complains, grep the tree for any other 0.29 IDL:
   `for f in idl/*.json target/idl/*.json; do python3 -c "import json,sys;d=json.load(open('$f'));print('$f', '0.30' if 'address' in d else '0.29-STALE')"; done`
   Archive any `0.29-STALE` the same way.

## Why this matters now

The registry build unblocks the `record_bot_backtest` upgrade (M14) **and** it's the
prerequisite for the audit (S8: "fix the toolchain before the audit — don't audit an
unreproducible binary"). With a clean 0.30 build, the deployed registry/oracle binaries can
finally be reproduced from source and hash-verified against what's live.

**Status:** the poison is removed and the fix is prescribed; the final `anchor build`
SUCCESS must be confirmed on the Mac. That's the one step the sandbox can't run.
