---
name: solana
description: Build a small React + Vite + Wallet Standard app that proves the on-chain edge for the ChartRunner submission. Devnet wallet connect (Phantom / Backpack / Solflare via wallet-adapter), signed memo transaction, explorer link. Companion to the Solana Foundation skills (`solana-foundation/solana-dev-skill`) — those drive the production app; this one is scoped to the hackathon-grade `solana-connect/` page that ships next to the prototype.
---

# Solana — `solana-connect/` (Vite + React + wallet-adapter)

This skill is the local complement to the Solana Foundation's official agent skills. Use the Foundation skills as the source of truth for production patterns; use this one for the **single deliverable** in this repo: `solana-connect/` — a tiny React app that proves the wallet + on-chain action edge for hackathon submission.

## Companion skills (install on your Mac, separate from this one)

```bash
# One-time install. Lives globally for any future Claude session.
npx skills add https://github.com/solana-foundation/solana-dev-skill
```

The Foundation skills you'll reach for from there:

- **frontend-with-framework-kit** — canonical React patterns with `@solana/kit` and Wallet Standard. For Phase 2 production work.
- **common-errors** + **version-compatibility** — diagnostic tables. Read first when something breaks.
- **security-checklist** — must-read before any tx-signing code merges.
- **kit-web3-interop** — bridge patterns. Useful when migrating this app from `@solana/web3.js` to `@solana/kit`.
- **idl-codegen** + **testing-strategy** — Phase 2 (Anchor program) work.

This local skill does NOT cover those. It scopes one thing: ship `solana-connect/` for the hackathon.

## Scope of `solana-connect/`

A two-page React app, ~300 lines of TS+TSX, that does exactly four things:

1. **Connect wallet** via `@solana/wallet-adapter-react` — picks up Phantom / Backpack / Solflare automatically through Wallet Standard discovery.
2. **Show pubkey + devnet SOL balance.**
3. **Sign + send a memo transaction** on devnet via the canonical Memo program (`MemoSq...`). Memo body is either user-typed or pre-filled via `?memo=` query param (so the main game's topbar can deep-link with the current run's setup hash).
4. **Show signature + explorer link** that resolves on `explorer.solana.com?cluster=devnet`.

That's the **minimum** for boxes 2 + 3 of a Solana hackathon checklist. Everything else is polish.

## Hard rules

1. **Devnet only.** RPC = `https://api.devnet.solana.com`. Explorer URLs always include `?cluster=devnet`. Never default to mainnet.
2. **Wallet-adapter for React, not raw `window.solana`.** Lets the app support Phantom, Backpack, Solflare, etc. through one path.
3. **Sign client-side, never custody.** Wallet-adapter pops the wallet's own approval UI. The app never sees a private key.
4. **Surface signature + explorer link** for every successful tx. Hackathon judges verify on chain.
5. **No state-management library.** React `useState` + `useMemo`. The app is too small to justify Redux/Zustand/etc.
6. **TypeScript strict.** `tsconfig.json` has `"strict": true`. The dependencies have proper types — use them.

## Build / deploy

- **Local dev**: `cd solana-connect && pnpm install && pnpm dev` → opens at `http://localhost:5173`.
- **Build for prod**: `pnpm build` → outputs `solana-connect/dist/`.
- **Deploys** with the rest of the repo via the existing `.github/workflows/pages.yml` (updated to build `solana-connect/` and publish under `/solana-connect/` on GitHub Pages).
- **Live URL** after publish: `https://<user>.github.io/chartrunner/solana-connect/`.

## Workflow for any task in `solana-connect/`

1. **Read `references/architecture.md`** — directory layout, module boundaries, the App / WalletProvider / hooks split.
2. **For wallet logic**, see `references/wallet-adapter.md` — provider setup, auto-connect, what `useWallet()` and `useConnection()` give you.
3. **For tx logic**, see `references/transactions.md` — building a Memo instruction, blockhash + fee payer wiring, confirmation polling, error taxonomy.
4. **Validate with `references/devnet-checklist.md`** before declaring done. Includes the smoke test the user runs.

## When to STOP and ask the user

- Anything Anchor / Rust / on-chain program. That's `frontend-with-framework-kit` + a Solana engineer.
- Anything mainnet. Different RPC, real money, different risk model.
- SPL token mints. Multi-tx flow with treasury implications.
- Wallet adapter UI customization beyond default styles. Cheap; ask first to confirm priority.
- Migrating from `@solana/web3.js` to `@solana/kit`. Read the Foundation `kit-web3-interop` skill first; this is a real refactor, not a swap.

## Style of work

- One source of truth for the connect button and tx button: an `<App>` component. No prop drilling — `useWallet()` and `useConnection()` are the cross-component contracts.
- Every async tx path catches errors and surfaces them as readable text in the UI. "User rejected the request" → show "Cancelled" (neutral); anything else → show the error message.
- Devnet confirmations take 5–15 seconds. Show a "Sending… (1/3 confirmations)" state, never a frozen button.
- Always render the cluster badge so judges see at a glance you're on devnet, not mainnet.

## What this delivers vs the Foundation skills

| Question | This skill | Foundation skills |
|---|---|---|
| Production app shape | ✗ | `frontend-with-framework-kit` |
| Anchor program code | ✗ | `idl-codegen` + Anchor tooling |
| Security review | ✗ | `security-checklist` |
| Hackathon proof-of-Solana | ✓ | not their scope |
| The `solana-connect/` page in this repo | ✓ | not their scope |

When in doubt, the Foundation skills win on patterns. This skill wins on "what exactly do I commit to ship `solana-connect/` for the hackathon."
