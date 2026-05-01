# ChartRunner Anchor workspace

On-chain programs for ChartRunner. Phase 0.9.4 ships one program:
**`chartrunner_maps`** — store the SHA-256 hash + saved-at timestamp of each
map a player saves from the game, keyed by `(wallet, name)`.

Maps themselves stay in localStorage (5–15 KB each is too expensive for
on-chain storage). The hash is the proof: anyone can re-hash a map JSON and
verify it matches the on-chain entry.

## Layout

```
anchor/
├── Anchor.toml                                # workspace config
├── Cargo.toml                                 # workspace Cargo
├── programs/
│   └── chartrunner-maps/
│       ├── Cargo.toml
│       └── src/lib.rs                         # the program (one instruction: save_map)
├── tests/
│   └── chartrunner-maps.ts                    # Mocha smoke test
├── package.json
└── tsconfig.json
```

## Prereqs

Install on the dev machine (one-time):

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable

# Solana CLI (1.18+)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version

# Anchor (avm = anchor version manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
anchor --version
```

## First-time keypair + cluster setup

```bash
solana-keygen new                         # creates ~/.config/solana/id.json
solana config set --url devnet
solana airdrop 2                          # devnet SOL (free; rate-limited)
solana balance
```

## Build + deploy to devnet

```bash
cd anchor
yarn install                              # one time
anchor build                              # compiles the program → target/
anchor deploy --provider.cluster devnet   # deploys; prints Program ID

# IMPORTANT: paste the printed Program ID into:
#   - anchor/Anchor.toml under [programs.devnet]
#   - anchor/programs/chartrunner-maps/src/lib.rs at `declare_id!(...)`
# then re-run `anchor build && anchor deploy --provider.cluster devnet`
# so the on-chain bytecode and the declared ID match.
```

## Run the smoke test

```bash
cd anchor
anchor test                               # boots a local validator + runs Mocha
```

## Wiring the client

The game's "Save" button (in `ChartRunner_Prototype.html`) opens
`/solana-connect/?action=save-map&name=<name>&hash=<hex>&return=/play/`.
The React app at `/solana-connect/` constructs the `save_map` instruction
manually using `@solana/web3.js` (no Anchor TS client; keeps the bundle
small), prompts the wallet to sign, then redirects back to `/play/?savedMap=...`.

See `solana-connect/src/lib/cr-maps-program.ts` for the manual ix builder.
