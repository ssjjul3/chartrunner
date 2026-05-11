# ChartRunner — Dune Analytics Frontier Data Sidetrack
**Track:** Dune Analytics · Frontier Data Sidetrack — Win $6k Plan
**Prize:** $6k USDC
**Deliverable:** public Dune dashboard with 5 panels + this writeup

---

## Dashboard structure

Public Dune dashboard: `dune.com/<your-handle>/chartrunner-frontier`
**Title:** *ChartRunner — Solana Trading Game · On-chain Activity*

| Panel | Visualization | Refresh |
|---|---|---|
| 1 — Program activity timeline | Bar chart, daily tx count | hourly |
| 2 — Token watchlist volume | Stacked area, top Solana memes by 24h volume USD | hourly |
| 3 — Avatar collection sales velocity | Table, top 20 avatar collections by 24h sales | 6h |
| 4 — Anchor instruction discriminators | Reference table (educational; rendered once) | static |
| 5 — Solana memecoin holder distribution | Treemap, holder counts for ChartRunner tokens | 6h |
| 6 — Frontier hackathon submission landscape | Bar chart, projects per category | weekly |

---

## SQL queries — paste these directly into Dune

### Query 1 — ChartRunner program activity

Tracks both LIVE Anchor programs (`chartrunner_maps` and `chartrunner_registry`) by daily transaction count. **Note:** ChartRunner is currently on devnet; Dune indexes Solana mainnet. This query is structured for the eventual mainnet redeploy and will populate the moment we ship to mainnet.

```sql
-- ChartRunner Anchor program activity
-- Counts daily txs touching either of our two LIVE programs.
WITH program_ids AS (
  SELECT 'DbzEqKfgCBqneR6Yuc17yEPc1fbVeqTeGy721f1n3UvH' AS pid, 'chartrunner_maps'    AS name
  UNION ALL
  SELECT 'ER8G9BnvyrQiBeiVvjmZaUpmeBu5jxoh1vnDPPdPrdcn',         'chartrunner_registry'
)
SELECT
  date_trunc('day', ic.block_time) AS day,
  pi.name                          AS program,
  COUNT(DISTINCT ic.tx_id)         AS txs
FROM solana.instruction_calls ic
JOIN program_ids pi
  ON ic.executing_account = pi.pid
WHERE ic.block_time > NOW() - INTERVAL '30' DAY
GROUP BY 1, 2
ORDER BY day DESC, txs DESC
```

### Query 2 — Token watchlist volume

The 7 Solana tokens in ChartRunner's Token Terminal (per `TOK_BIRDEYE_MINT` mapping). Powers the same widget the game uses.

```sql
-- ChartRunner Token Terminal — 24h volume for the watchlist
WITH watchlist AS (
  SELECT 'So11111111111111111111111111111111111111112' AS mint, 'SOL'  AS sym
  UNION ALL SELECT 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', 'WIF'
  UNION ALL SELECT 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'BONK'
  UNION ALL SELECT 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',  'JUP'
  UNION ALL SELECT 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',  'JTO'
  UNION ALL SELECT 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',  'PUMP'
  UNION ALL SELECT '9BB6NFEcjBCtP6LewSSuvkKsztTpfsxk25oRGNVsohB2', 'FART'
)
SELECT
  date_trunc('hour', t.block_time)        AS hour,
  w.sym                                   AS symbol,
  SUM(t.amount_usd)                       AS volume_usd
FROM dex_solana.trades t
JOIN watchlist w
  ON (t.token_bought_mint_address = w.mint OR t.token_sold_mint_address = w.mint)
WHERE t.block_time > NOW() - INTERVAL '24' HOUR
GROUP BY 1, 2
ORDER BY hour DESC, volume_usd DESC
```

### Query 3 — Avatar collection sales velocity

The 20 Solana NFT collections our avatar picker lets players choose from. Shows which are most active right now — a signal for "who plays ChartRunner".

```sql
-- ChartRunner Avatar Picker — 24h sales velocity for the 20 collections
WITH avatar_collections AS (
  -- These are the symbols our picker offers (curated v0.9.95). Replace
  -- collection_symbol with the actual Magic Eden / Tensor symbol once
  -- you confirm each. Adjust to match `_crNftCurated` in the game.
  SELECT 'mad_lads'      AS sym UNION ALL
  SELECT 'smb_gen2'      UNION ALL
  SELECT 'tensorians'    UNION ALL
  SELECT 'claynosaurz'   UNION ALL
  SELECT 'fff'           UNION ALL
  SELECT 'froganas'      UNION ALL
  SELECT 'okay_bears'    UNION ALL
  SELECT 'degods'        UNION ALL
  SELECT 'photo_finish'  UNION ALL
  SELECT 'fckedcatz'
)
SELECT
  ac.sym                          AS collection,
  COUNT(*)                        AS sales_24h,
  SUM(s.amount_usd)               AS volume_usd_24h,
  AVG(s.amount_usd)               AS avg_sale_usd,
  MIN(s.amount_usd)               AS floor_24h
FROM nft_solana.trades s
JOIN avatar_collections ac
  ON s.project_name = ac.sym  -- Adjust to the canonical field your dataset uses
WHERE s.block_time > NOW() - INTERVAL '24' HOUR
  AND s.amount_usd > 0
GROUP BY 1
ORDER BY volume_usd_24h DESC
```

### Query 4 — Anchor instruction discriminators (reference panel)

Educational — surfaces the 8-byte discriminators each ChartRunner instruction uses, so anyone reading the dashboard can decode our raw on-chain calls.

```sql
-- ChartRunner Anchor discriminators (reference table — static)
-- Anchor discriminator = first 8 bytes of sha256("global:<fn_name>")
SELECT * FROM (VALUES
  ('chartrunner_maps',     'save_map',       'sha256("global:save_map")[0..8]'),
  ('chartrunner_registry', 'save_entity',    'sha256("global:save_entity")[0..8]'),
  ('chartrunner_registry', 'delete_entity',  'sha256("global:delete_entity")[0..8]'),
  ('chartrunner_registry', 'list_entity',    'sha256("global:list_entity")[0..8]'),
  ('chartrunner_registry', 'buy_entity',     'sha256("global:buy_entity")[0..8]'),
  ('chartrunner_registry', 'cancel_listing', 'sha256("global:cancel_listing")[0..8]'),
  ('chartrunner_registry', 'record_run',     'sha256("global:record_run")[0..8]')
) AS t(program, instruction, discriminator_recipe)
```

### Query 5 — Solana memecoin holder distribution

Treemap of holder counts across ChartRunner's token watchlist. Big block = lots of holders = healthy distribution.

```sql
-- Holder counts for ChartRunner watchlist tokens
WITH watchlist AS (
  SELECT 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' AS mint, 'WIF'  AS sym UNION ALL
  SELECT 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'BONK' UNION ALL
  SELECT 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',  'JUP'  UNION ALL
  SELECT 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',  'JTO'  UNION ALL
  SELECT 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',  'PUMP' UNION ALL
  SELECT '9BB6NFEcjBCtP6LewSSuvkKsztTpfsxk25oRGNVsohB2', 'FART'
)
SELECT
  w.sym                                AS symbol,
  COUNT(DISTINCT b.token_balance_owner) AS holders
FROM solana.token_balances b
JOIN watchlist w ON b.token_mint_address = w.mint
WHERE b.token_balance > 0
  AND b.block_date = (SELECT MAX(block_date) FROM solana.token_balances)
GROUP BY 1
ORDER BY holders DESC
```

### Query 6 — Frontier hackathon submission landscape (meta panel)

Style-points panel: count Frontier submissions by category. Lives outside of ChartRunner but demonstrates we read Dune as a tool for thinking about Solana, not just our own metrics.

```sql
-- Frontier 2026 — submissions by Superteam region
-- Hand-loaded data: replace VALUES with the actual category counts from
-- the Superteam Earn track listing. This is illustrative — Dune doesn't
-- index Superteam Earn directly, so we serve this as a refreshed CSV upload.
SELECT * FROM (VALUES
  ('Stablecoins',       12),
  ('DeFi',              28),
  ('Consumer Apps',     19),
  ('RWA',                7),
  ('Privacy',            5),
  ('Identity / Names',   4),
  ('Data / Analytics',   3),
  ('Infrastructure',    11)
) AS t(category, submissions)
ORDER BY submissions DESC
```

---

## Why this dashboard wins the track

Dune's track scope: dashboards that **analyze Frontier projects** with **on-chain data**. Two things working in our favour:

1. **ChartRunner has two LIVE Anchor programs** with their own discriminators, PDAs, and event emissions. Query 1 + Query 4 give the panel-judging story: "here's a real Frontier project, here's how to read its on-chain calls, here's its activity." Even on devnet (where data is sparse), the SQL is correctly-shaped and ready to run the moment we mainnet-deploy.
2. **ChartRunner's Token Terminal already curates the same tokens Dune wants to chart.** Query 2 + Query 5 mirror the in-game watchlist exactly — same mints, same priorities. So the dashboard isn't a separate artefact; it's the offline twin of what players see inside the game.

The cross-pollination is the pitch: *the dashboard is for analysts; the game is for players; they look at the same data.*

## How to build it (30-min flow on dune.com)

1. dune.com → "New Query" → paste Query 1 → set viz: bar chart, X=day, Y=txs, color=program
2. Repeat for Queries 2-5 (each becomes its own viz)
3. "New Dashboard" → name "ChartRunner — Solana Trading Game" → drag in the 5 visualizations
4. For Query 3's collection symbols: cross-reference against the `_crNftCurated` array in `ChartRunner_Prototype.html` (line ~25840 area) — copy the canonical Magic Eden symbol for each
5. Make the dashboard public → grab the URL → drop into the submission form's `Link to your Submission` field

## Submission package

- **Project title:** ChartRunner — Solana Trading Game · Frontier Activity Dashboard
- **Description:** Dune dashboard for ChartRunner — a gamified Solana trading SDK with 2 LIVE Anchor programs on devnet. 6 panels: program tx activity, token watchlist volume, NFT avatar collection sales, instruction discriminator reference, holder distribution, Frontier submission landscape.
- **GitHub:** github.com/\<owner\>/chartrunner
- **Website:** chartrunner.xyz
- **Dashboard URL:** dune.com/\<your-handle\>/chartrunner-frontier
- **Sponsor integrated:** Dune Analytics

## Tweet draft

> 📊 ChartRunner's on-chain shadow now lives on @DuneAnalytics.
>
> 6 panels:
> · Anchor program tx activity
> · Token Terminal watchlist volume (PUMP/FART/WIF/BONK)
> · Avatar NFT collection sales
> · Instruction discriminator decoder
> · Holder distribution
> · Frontier submission landscape
>
> dune.com/\<handle\>/chartrunner-frontier · @ColosseumOrg sidetrack
