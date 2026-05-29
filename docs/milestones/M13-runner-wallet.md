# M13 — Runner Wallet (Chrome extension product)

**Status:** 🟢 BONUS · 0/9 (added 2026-05-28)
**Theme:** A Phantom-style Chrome extension that combines four functions into one extension surface: **(a)** Solana wallet (sign txs without bouncing through `/solana-connect/`), **(b)** in-extension LLM access (local Ollama bridge or remote), **(c)** payments (SOL / $RUN / $CHART, including swaps), **(d)** game injection (controls `chartrunner.xyz/play` via content script). The goal: a player does *everything* from one extension — connect wallet, pay for backtests, chat with their Coach LLM, watch their bot play — without leaving the page.

> **Cross-product positioning:** replaces the current `/solana-connect/` URL-bounce architecture. Every save/list/buy operation today navigates the game tab away to the wallet-bridge React app, signs, then redirects back. Today's marketplace exercise (2026-05-28 session) had to hand-build inline Anchor instructions to avoid that bounce because `/solana-connect/` isn't served on the local dev server. M13 eliminates the bounce entirely — the extension's content script intercepts `crRegistry.saveOnChain()` etc. and signs directly. See `feedback_chartrunner_onchain_workflow` for the existing on-chain workflow this replaces; see `project_grok_hybrid_chart_architecture` for the broader bloat-reduction direction.

> **Why bonus + not numbered priority:** post-Frontier roadmap M0.5→M10 is product-shaped (security → tokenomics → coach → SDK → wallet identity → build → marketplace → exchange → AI → streaming → tournaments → mobile → mainnet). M13 is a *product surface* that benefits multiple existing milestones (M2.6 wallet identity, M4 marketplace flows, M14 bot terminal, M11 paid backtests) but isn't a single milestone's blocker. Bonus until it earns numbered priority.

## Completion condition (all required)

- [ ] **Phase 1 extension package** — `runner-wallet-extension/` with `manifest.json`, `popup.html`, `popup.js`, `background.js`, `content.js`. Loads in Chrome via "Load unpacked" without errors.
- [ ] **Phantom/Backpack interop** — extension can import an existing keypair OR run alongside as the primary wallet for chartrunner.xyz/play.
- [ ] **Balance display** — SOL + $RUN + $CHART, devnet + mainnet, refresh on demand.
- [ ] **Payment functions** — send-SOL, send-SPL ($RUN, $CHART), sign-message, signAndSendTransaction (for crRegistry calls).
- [ ] **Game injection** — content script reaches `chartrunner.xyz/play`, exposes the wallet as `window.runner_wallet` (or hooks into existing `crWallet` adapter as an alternate provider). Verify: `crRegistry.saveOnChain()` works without `/solana-connect/` redirect.
- [ ] **Swap function** — $CHART → $RUN (in-game profile swap, depends on M1 tokenomics + a swap surface — likely a Honeycomb resource burn-mint pair per `project_chartrunner_chart_issuance`).
- [ ] **LLM panel** — in-extension panel that talks to a local LLM (Ollama at `umbrel.local:11434` per `reference_chartrunner_umbrel_agents`) OR a remote model. Used as the Coach surface from M14 Bot Terminal.
- [ ] **Submission to Chrome Web Store** — at least the submission filed; review can take days. Includes the privacy policy page (M0.5 hardening required: no keys leave the extension).
- [ ] **Adoption** — ≥10 testers using it for /play (whitelist from `STEALTH_WALLET_WHITELIST`).

## Imminent-solvables

### Ready bucket (evaluator can pick)

- [ ] `[D]` **Scaffold extension folder + manifest** — `runner-wallet-extension/manifest.json` (Manifest V3), `popup.html`, `popup.js`, `background.js`, `content.js`. Smallest possible "loads in Chrome" milestone.
- [ ] `[D]` **Popup UI skeleton** — Connect / Disconnect / Network selector (mainnet/devnet) / Balance row × 3 (SOL/$RUN/$CHART). No real wallet yet — just stub data.
- [ ] `[D]` **Background worker for keypair storage** — encrypted with user passphrase, stored in `chrome.storage.local`. Generate on first run; import via JSON keypair or 12/24-word seed phrase.
- [ ] `[D]` **content.js injection into /play** — content script that runs on `chartrunner.xyz/play/*`. Exposes `window.runner_wallet = { connect, getPubkey, signTransaction, signAndSendTransaction }`. The game's existing `crWallet.adapter` should be able to use this.
- [ ] `[D]` **Wire to existing `crWallet` adapter** — adapter discovery: prefer Runner Wallet if installed, fall back to Phantom/Backpack. No game-side changes needed if the extension matches the standard wallet-adapter interface.
- [ ] `[D]` **Solana web3.js bundled or imported** — extension needs `@solana/web3.js` for tx building/signing. Bundle via esbuild/rollup; ~150 KB.
- [ ] `[D]` **Phantom/Backpack imported account flow** — let users import their existing Phantom wallet (read-only or full key, depending on what Phantom allows). Avoids the "users have to manage two wallets" friction.
- [ ] `[D]` **$RUN balance read via SPL token account** — `getParsedTokenAccountsByOwner` filtered by $RUN mint (M1 dependency: $RUN mint address must exist before this is testable on devnet).
- [ ] `[D]` **Backtest payment flow** — `payAndCallback(amountLamports, callbackUrl)` so M11's "Pay → run oracle-approved backtest → record on-chain" trip is one extension popup, not three pages.
- [ ] `[O]` **Extension dev/test in unpacked mode + walkthrough doc** — `runner-wallet-extension/README.md` with screenshots showing how to side-load + first-run UX.
- [ ] `[D]` **Chrome Web Store submission** — manifest review, screenshots, privacy policy. Listing under "Crypto wallets" category. **BLOCKED:** all of the above + a privacy policy page on chartrunner.xyz.
- [ ] `[D]` **Onboarding tutorial in /play** — "We notice you have Runner Wallet installed → use it as your primary?" prompt on first visit. **BLOCKED:** content.js injection working.

### Blocked bucket

- [ ] `[D]` **Swap surface ($CHART → $RUN)** — requires M1 tokenomics + Honeycomb burn-mint pair OR a Phoenix Rise market pair. **BLOCKED:** M1 + Honeycomb integration scope (in M14 / M1 territory).
- [ ] `[D]` **Mainnet support** — only meaningful once mainnet programs exist. **BLOCKED:** M10 (mainnet deploy).
- [ ] `[D]` **Hardware wallet support (Ledger)** — nice-to-have, not Phase 1. **BLOCKED:** Phase 2 (when mainnet ships and security stakes go up).

### Done bucket

(empty — newly added 2026-05-28)

## State

- Progress: 0/9 completion conditions
- Blockers active: 3 (swap depends on M1, mainnet depends on M10, hardware wallet is Phase 2)
- Scheduled today: 0

## Notes

### Why a separate wallet extension instead of just integrating with Phantom?

Three reasons surfaced in the 2026-05-28 Grok session:

1. **Payment-gated content needs a smooth UX.** M11 oracle-approved backtests + M14 bot run recording require the player to pay per action. Bouncing through Phantom for each payment is friction. An extension that bundles ChartRunner-specific payment helpers (`payForBacktest(N)` shows a single confirmation) is materially smoother.
2. **In-extension LLM hosting.** Per the Grok prompt: *"should we build a simple wallet application that hosts a llm, gets payed in crypto and can use web terminal"*. The LLM piece is a meaningful differentiator — players can chat with their Coach without leaving the extension.
3. **Game injection ergonomics.** The current `/solana-connect/` bounce is a known architectural debt — every save/list/buy is a full page navigation. A content script that signs in-page closes that gap entirely. This was the most-felt friction in today's marketplace exercise.

### Cross-milestone dependencies

- **M1** — $RUN mint address must exist for balance read + swap function. Currently $CHART/$RUN economy is design-committed but not on-chain.
- **M2.6 wallet identity** — NFT avatars + Name Register live; M13 could integrate avatar display ("Connected as `runner_julian`").
- **M11 Umbrel-native quant toolset** — Runner Wallet is the natural payment surface for the paid backtest flow. M11 was originally Hermes-only; M13 unlocks a player-facing payment path.
- **M14 Bot-first runtime + Agent Command Center** — Bot Terminal needs an LLM connector. Runner Wallet hosts an LLM panel that can be the Coach surface. Tightly coupled but neither is a strict dependency of the other.

### Sources

Grok session 2026-05-28 (`grok.com/share/c2hhcmQt…`) — Julian's prompts: *"should we build a simple wallet application that hosts a llm, gets payed in crypto and can use web terminal"* / *"build Phase 1 of the Runner Wallet"* / *"runner wallet should be a wallet extention like phantom"* / *"Generate the full extension package (all files) Add injection logic so it can control the game on chartrunner.xyz/play Add $RUN / SOL balance display + payment functions add a swap function to swap chart to run in game profile in wallet"* / *"Add real Phantom/Backpack integration"*.

Important: Grok claimed in that session to have *built* the extension (`runner-wallet-extension/` with manifest, popup, etc.). **None of those files exist** — verified 2026-05-28 across vault and `~/projects/chartrunner`. The milestone above captures the actual product direction; the work is **unbuilt**. See `feedback_grok_output_unverified`.
