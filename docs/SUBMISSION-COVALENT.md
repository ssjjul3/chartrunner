# ChartRunner — GoldRush by Covalent Frontier Hackathon Track
**Track:** Build with GoldRush Track (Powered by Covalent)
**Prize:** $3k USDC
**Status:** integrated in v1.0.59 (Day 16 of post-Frontier sprint)

---

## What we shipped

ChartRunner now uses **GoldRush by Covalent** as its third on-chain data provider, alongside Birdeye (Solana token data) and Binance (CEX OHLC). One wrapper IIFE (`window.crGoldRush`) exposes four high-level methods:

| Method | What it returns | Where ChartRunner uses it |
|---|---|---|
| `tokenHolders(mint, opts)` | Top-N holders for an SPL token | **Phoenix Live "whale ghosts" overlay** — primary data source |
| `walletBalances(address)` | All token balances for a wallet | Backstop for Zerion portfolio reads (v1.0.56) |
| `walletTxs(address)` | Recent transactions for a wallet | M4 marketplace-activity widget (post-Frontier) |
| `nftMetadata(mint)` | NFT metadata for a single mint | Backstop when Helius DAS is rate-limited |

The standout integration: the **whale-ghosts overlay** that v1.0.2 introduced now reads from GoldRush every 90 seconds instead of stubbing top-10 holder addresses. Players running on BONK / WIF / JUP / PUMP see real top-10 holders as in-game ghost markers, sized by `balance / total_supply`.

## Why this wins the GoldRush track

GoldRush's value prop is "one API shape across 200+ chains." Most submissions will integrate one endpoint. ChartRunner integrates **four** — each plugging into a distinct ChartRunner subsystem that already existed before v1.0.59:

1. **Phoenix Live whale-ghosts** (was stub → now GoldRush). Visible in-game overlay; updates every 90s.
2. **Wallet portfolio reads** (parallel to Zerion). When Zerion rate-limits or returns sparse data, GoldRush is the fallback that keeps the agent decisions accurate.
3. **Transaction history** (M4 marketplace activity feed). Pre-built so the M4 work is a wire-up, not a research-and-then-build.
4. **NFT metadata** (Helius DAS fallback for the NFT avatar picker).

One wrapper, four subsystems. **GoldRush is the data backbone**, not a single widget.

## Technical integration

### `window.crGoldRush` IIFE (~140 lines, end-of-file)

```js
const BASE = 'https://api.covalenthq.com/v1';
// Auth: window.crGoldRushKey || localStorage.cr_goldrush_key_v1
// Cache: 60s TTL per (chain, endpoint, params)
// In-flight dedupe so 5 concurrent overlay renders fire one HTTP

async function tokenHolders(mint, { pageSize = 20 }){ ... }
async function walletBalances(address, { chain = 'solana-mainnet' }){ ... }
async function walletTxs(address, { chain = 'solana-mainnet', pageSize = 50 }){ ... }
async function nftMetadata(mint, { chain = 'solana-mainnet' }){ ... }
function setApiKey(key){ ... }
```

Cache key shape: `<chain>|<endpoint>|<params-as-json>`. Returns the same shape across all chains GoldRush supports — when ChartRunner adds Ethereum L2 / Base / etc support post-mainnet, the wrapper Just Works.

### Phoenix Live whale-ghosts shim

A second small IIFE waits for `window.crLive` to exist (the Phoenix overlay manager from v1.0.2), then patches its whale-ghosts data source to GoldRush:

```js
async function _refresh(){
  const mint = TOK_BIRDEYE_MINT[currentAsset] || BONK_FALLBACK;
  const holders = await window.crGoldRush.tokenHolders(mint, { pageSize: 10 });
  if(origSetWhales) origSetWhales(holders);
  else              window.crLive._whales = holders;
}
setInterval(_refresh, 90_000);
```

The legacy stub setter is kept as a fallback — if GoldRush returns nothing (rate-limited, mint with no holders data, etc), the overlay falls back to Phoenix's existing stubbed holder list. Zero failure mode is "overlay breaks."

### API key configuration

```js
window.crGoldRush.setApiKey('cqt_xxx');
// or in DevTools:
localStorage.setItem('cr_goldrush_key_v1', 'cqt_xxx');
```

Free tier (1M req/month, 100 req/sec) is more than enough for our usage profile — ~4 calls per active player per session (overlay refresh × 3 + initial portfolio read).

## Cross-pollination with other v1.0.x integrations

GoldRush data also makes the v1.0.56 Zerion agents + v1.0.57 Torque MCP server stronger:

- **Zerion agent `fetchPortfolio`** can use GoldRush as a fallback when Zerion's key isn't configured — same `{ sol, tokens }` shape returned
- **Torque MCP `get_portfolio` tool** can route through GoldRush instead of Zerion if the user prefers Covalent's data freshness
- **Future Torque MCP tools** could expose `get_token_holders(mint)` and `get_recent_txs(wallet)` directly — both backed by GoldRush — letting AI assistants query holder concentration before making trade recommendations

## Submission package

- **Project title:** ChartRunner — GoldRush as multichain data backbone
- **Description:** ChartRunner integrates GoldRush by Covalent across four subsystems: Phoenix Live whale-ghosts overlay (top-N holders, 90s refresh), wallet portfolio reads (Zerion fallback), transaction history (M4 marketplace widget), NFT metadata (Helius DAS fallback). One wrapper IIFE, four data feeds, same API shape across 200+ chains for ChartRunner's future cross-chain expansion.
- **GitHub:** github.com/\<owner\>/chartrunner · search `crGoldRush` in `ChartRunner_Prototype.html`
- **Website:** chartrunner.xyz
- **Demo path:** chartrunner.xyz/play/ → set API key via `window.crGoldRush.setApiKey('cqt_xxx')` → start a run on BONK or WIF → Phoenix Live overlay activates → whale-ghost markers now sourced from real GoldRush holder data
- **Sponsor integrated:** GoldRush by Covalent (token_holders_v2, balances_v2, transactions_v2, nft_external_metadata endpoints)

## Tweet draft

> 🥇 @CovalentHQ GoldRush just became @ChartRunner's data backbone.
>
> 4 subsystems wired:
> · Phoenix Live whale-ghosts overlay (top-N holders, 90s refresh)
> · Wallet portfolio reads (Zerion fallback)
> · Transaction history (M4 marketplace widget)
> · NFT metadata (Helius DAS fallback)
>
> One API shape, 200+ chains. ChartRunner's cross-chain expansion is wire-up, not research.
>
> 🔗 chartrunner.xyz · GoldRush Frontier Track
