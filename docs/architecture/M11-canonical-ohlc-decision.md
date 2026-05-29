# M11 — Canonical OHLC corpus decision (2026-05-29)

> **Status:** decision memo · awaiting Julian sign-off
> **Why this matters:** picking one is the single decision that unblocks ~4 downstream items across M3, M11, M14 — see [`unblock-cascade-plan.md`](unblock-cascade-plan.md) Tier 2.
> **Source memos:** `MILESTONE_AUDIT.md` §0/§3, memory `project_chartrunner_hq_telegram_group` (dual-scrape was an EXPERIMENT, winding down).

## TL;DR — recommendation

**Use the OpenClaw JSONL corpus as canonical for M11 + M14.** Migrate scripts that currently read Hermes Parquet to read OpenClaw JSONL via a tiny adapter, archive the Hermes corpus as a frozen reference snapshot for the audit trail, then wind down the Hermes scraper. Reasoning below; reversible if performance bench says otherwise.

## The two corpora

| Property | **Hermes Parquet** | **OpenClaw JSONL** |
|---|---|---|
| Owner | Hermes container | OpenClaw container |
| Path | `/opt/data/chartrunner/data/ohlcv/` | `/data/umbrel/chartrunner/` (Umbrel host volume) |
| Format | Parquet | JSONL |
| Size | ~27 GB | 79 GB |
| File count | 3.5M | 72,598 |
| Row count | (not measured) | 381M rows |
| Exchanges | 3 | 7 (Bybit 188M · OKX 136M · incremental 32M incl. DEX · Gate 12M · MEXC 5.6M · HL 4.8M · Binance 2.6M) |
| Timeframes | 15 | 16 intervals 1s → 1M |
| Backtest engine wired? | **Yes** — `backtesting/engine/` reads Parquet today | No (would need a thin reader) |
| DEX coverage | No | Yes (incremental 32M includes DEX snapshots) |
| Currently healthy? | Yes | DEX OHLC pending — `DEX_OHLC_TODO.json` + 1,581 fails + 8,276 rate-limits last GeckoTerminal window. Bybit deep ended 2026-05-26 04:21 UTC with exit 2. |

## What downstream wants

- **M3 Backtest tab → Hermes engine wiring** — wants whatever the backtest engine actually reads. Currently the engine reads Parquet, so Hermes wins on zero-migration; OpenClaw wins if we move the engine.
- **M11 Scanner / Chart / Strategy Lab** — wants the *widest* exchange + timeframe coverage so users can scan beyond Binance/OKX/Bybit. OpenClaw wins clearly (7 vs 3 exchanges, DEX coverage).
- **M14 Bot backtests** — wants the same source as the M11 engine. Either works; what matters is *one* source.
- **`project_chartrunner_chart_issuance` (M1 tokenomics)** — `coin_profiles/` regime-tagging reads OHLC. Independent of choice; both can feed it.

## Decision factors

### In favor of Hermes Parquet

1. **Zero-migration.** Backtest engine already reads Parquet; switching means rewriting the data loader.
2. **Parquet > JSONL for analytical workloads.** Columnar, compressed, vectorized reads. ~3× compression vs. JSONL on OHLC.
3. **Smaller corpus, easier to back up.** 27 GB vs 79 GB.
4. **Hermes is the research container** — `reference_chartrunner_umbrel_agents` ties Hermes to research/analytical work; keeping its corpus canonical aligns the responsibility split.

### In favor of OpenClaw JSONL

1. **2.3× exchange coverage** (7 vs 3). For a Scanner + cross-market analysis product (M11's premise), exchange breadth is the differentiator.
2. **DEX coverage** — incremental 32M includes DEX snapshots. Hermes has none. ChartRunner's narrative is gamified meme + DEX trading; CEX-only is the wrong canonical for that thesis.
3. **381M rows** — finer-grained data (16 intervals incl. 1s) supports M14 bot backtests + M11 Strategy Lab tick-level work.
4. **OpenClaw is the ops container** — runs Cron Jobs, owns data pipeline scheduling. It's already the "where data comes in" surface.
5. **Wider exchanges support M5 Hyperliquid** — HL 4.8M rows already there.

### Tie-breakers

- **Format conversion is one-time and cheap.** Both formats are well-understood; a Parquet ↔ JSONL adapter is a day's work, not a milestone. The format itself shouldn't drive the decision.
- **Storage cost is negligible at this scale** — 79 GB on the Umbrel is not load-bearing.
- **The "winding down" decision is already made** per memory. The question is which one survives, not whether to keep both.

## Recommendation: OpenClaw JSONL as canonical

The product premise — Scanner across 7 exchanges + DEX coverage + tick-level — points at OpenClaw. The downside (rewriting the backtest engine's data loader) is a one-time migration cost that buys 2.3× exchange coverage permanently.

### Concrete steps if approved

1. **Write a thin JSONL reader** for `backtesting/engine/data_loader.py`. Drop-in for the Parquet reader. ~50 LOC. Test on a single Binance/1h slice first.
2. **Run the existing backtest engine against OpenClaw JSONL** on a known-good strategy. Confirm parity vs. Parquet output.
3. **Migrate `coin_profiles/` regime-tagging** to read OpenClaw. Independent of #1.
4. **Freeze Hermes corpus** at current state → move to `/opt/data/chartrunner/data/ohlcv-frozen-2026-05-29/`. Don't delete (audit trail).
5. **Disable Hermes OHLC scraper** (stop the timer, keep the code for repro). Hermes stays alive for research analyses.
6. **Fix OpenClaw DEX scraper** (currently 1,581 fails + 8,276 rate-limits). M12 `flaresolverr` install + CoinGecko Demo key + rate-limit per the existing memory plan.
7. **Document the canonical store** in `docs/architecture/M11-canonical-data-store.md` so future agents/sessions don't re-litigate.

### Reversibility

If OpenClaw migration trips up — performance issues, JSONL parsing too slow at 379M rows, schema drift — the Hermes corpus is frozen, not deleted. Convert one-way back to Parquet with a script. Worst case is ~2 weeks of wasted work, not a permanent commitment.

## Alternative considered: keep both

Rejected. Memory `project_chartrunner_hq_telegram_group` already pegged the dual-scrape as an EXPERIMENT not redundancy; the audit cost (which is canonical for downstream-X? whose number do you trust?) compounds with every milestone that needs OHLC.

## Open questions for Julian

1. Sign off on OpenClaw-as-canonical?
2. Any downstream consumers of Hermes Parquet I missed? (the audit memo names backtest engine + `coin_profiles/`; if there are others, they need migration too)
3. Timing — do step #1 (JSONL reader) in this week's M11 push, or block on M1 paper publish?

## Cross-references

- Milestone: `docs/milestones/M11-umbrel-native-toolset.md` — completion-condition mentions canonical OHLC choice as a gating dependency
- Memory: `project_chartrunner_hq_telegram_group` (winding-down decision context)
- Memory: `reference_chartrunner_umbrel_agents` (Hermes-research / OpenClaw-ops split)
- Cascade plan: [`unblock-cascade-plan.md`](unblock-cascade-plan.md) Tier 2 §M11 canonical OHLC choice
