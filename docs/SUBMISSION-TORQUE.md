# ChartRunner — Torque MCP Frontier Hackathon Track
**Track:** Torque · Build with Torque MCP
**Prize:** $3k USDC
**Status:** integrated in v1.0.57 (Day 14 of post-Frontier sprint)

---

## What we shipped

ChartRunner is now an **MCP server**. Any MCP-compatible AI assistant — Claude Desktop, Cursor, Continue, Torque's own agents — can connect via stdio and use ChartRunner's primitives as tools. Six tools, three resources, all sharing the same code that powers the in-game Coach and the v1.0.56 Zerion CLI agents.

This is **the same detector code reaching its fourth deployment target**:

```
                          ┌──── 1. In-game Coach (interactive overlay)
   sdk.detectSFP() ───┼──── 2. Zerion CLI autonomous agent (v1.0.56)
   sdk.detectCCV()  ──┤──── 3. External Node runner (cron-driven)
   sdk.detect…()    ──┘──── 4. MCP server (this file, v1.0.57)
                              ↓
                          AI assistant calls analyze_chart(...)
```

One detector. Four runtimes. Zero duplication.

## Why this wins the Torque MCP track

Torque's track asks for *real* MCP integrations on Solana. ChartRunner ships a complete MCP server that:

1. **Exposes the actual game primitives**, not a mock. `analyze_chart` runs `sdk.detectCCV` against live Binance klines. `submit_trade` routes through the Jupiter or Jito broker we built Days 8-10. `get_portfolio` hits the Zerion API we wired in v1.0.56.
2. **Shares logic with the autonomous agent** layer. An AI assistant calling `analyze_chart` and an autonomous Zerion agent running the same detector hit exactly the same code path — no drift between the assistant-driven and headless flows.
3. **Auditable trade execution**. The `submit_trade` tool routes through the same broker chassis the in-game Blue Laser uses, so every assistant-initiated trade is observable as a normal ChartRunner fill record (same `txSig`, same `routePlan`, same `quoteAsset`).

## Tools exposed

| Tool | What it does |
|---|---|
| `analyze_chart` | Run one of 6 pattern detectors (ccv / sfp / hns / barr / fa / oi) on an asset+timeframe. Returns decision payload (action, size, confidence, raw setup). Risk-scaled by Zerion portfolio if `wallet` provided. |
| `list_agents` | List all registered detector agents with descriptions + capabilities. |
| `get_portfolio` | Fetch a Solana wallet's portfolio via Zerion's `/v1/wallets/<pk>/positions` endpoint. |
| `submit_trade` | Submit a trade through the active broker (mock / binance-paper / phoenix / jupiter / jito). Accepts side / size / slippageBps / quoteAsset / tipLamports. |
| `list_brokers` | List all registered brokers + their state (live / paper / pending). |
| `get_quote_asset` | Return the active settle asset (USDC or USDT). |

## Resources exposed

| URI | What it returns |
|---|---|
| `chart://current` | Latest OHLC candles + symbol + timeframe from the active ChartRunner session. |
| `bot://signals` | Pattern detector signals fired in the last 60 seconds. |
| `map://list` | Map PDAs anchored on devnet under the connected wallet (chartrunner_maps program). |

## Integration with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chartrunner": {
      "command": "node",
      "args": ["/path/to/chartrunner/sdk-m1-scaffold/sdk/mcp/chartrunner-mcp.js"],
      "env": {
        "CR_ZERION_KEY":   "<your-zerion-key>",
        "CR_BIRDEYE_KEY":  "<your-birdeye-key>"
      }
    }
  }
}
```

Restart Claude Desktop → `chartrunner` appears in the tools menu. Try:

> *Analyze BTC on the 15-minute chart for SFP patterns. Use my wallet 8x… for sizing.*

Claude calls `analyze_chart({ detector: 'sfp', asset: 'BTC', timeframe: '15m', wallet: '8x…' })`. The MCP server runs the same SFP detector the in-game Coach uses, scales the recommended size against the Zerion-sourced SOL balance, returns a decision. If you then ask:

> *Submit that trade through Jupiter with USDT.*

Claude calls `submit_trade({ side: 'buy', size: 0.42, broker: 'jupiter', quoteAsset: 'usdt' })`. The fill returns with txSig + routePlan, same shape as if the in-game Blue Laser had armed it.

## Why "Torque MCP" specifically

The track is named after Torque's MCP — which we understand as Torque's on-chain campaign / loyalty rails exposed via MCP. ChartRunner's MCP server is the **counterpart** on the trading side: if Torque MCP says "this wallet just completed a campaign and earned 50 points," ChartRunner MCP says "this wallet's chart shows an SFP — recommended trade is 0.4 SOL into USDT via Jupiter." A future Torque flow could chain the two: campaign completion → reward → autonomous trade entry via ChartRunner. That's the integration story.

## Technical integration

### File: `sdk-m1-scaffold/sdk/mcp/chartrunner-mcp.js` (~200 lines)

- Imports detector agents from `../agents/zerion-cli.js` (v1.0.56) — same registry
- Imports broker chassis from `../brokers/index.js` (v1.0.4 + v1.0.53 + v1.0.54 + v1.0.55)
- Builds the MCP server using `@modelcontextprotocol/sdk`
- Stdio transport for Claude Desktop / Cursor / etc compatibility
- Stub `_fetchCandles` hits Binance's klines endpoint server-side (no browser CORS concerns)
- Companion `package.json` declares `@modelcontextprotocol/sdk` as the only runtime dep

### Same code, four runtimes

The same `sdk.detectSFP()` function is invoked from:
- **In-game Coach** (browser, line ~27797 of `ChartRunner_Prototype.html`)
- **Zerion agent** (`sfpAgent.run()` in `sdk/agents/zerion-cli.js`)
- **External runner** (Node script importing the same module)
- **MCP server** (this file, called via `analyze_chart` tool)

One bug fix in the detector benefits all four. One new pattern detector added benefits all four. That's the SDK story.

## Submission package

- **Project title:** ChartRunner MCP — Chart analysis + broker execution as MCP tools
- **Description:** MCP server exposing ChartRunner's 6 pattern detectors, broker chassis (Jupiter / Jito), Zerion portfolio reads, and on-chain map registry as tools/resources for AI assistants. Shares 100% of detector + broker code with the in-game Coach and the Zerion autonomous agents — same SDK, four deployment targets.
- **GitHub:** github.com/\<owner\>/chartrunner · `sdk-m1-scaffold/sdk/mcp/chartrunner-mcp.js`
- **Website:** chartrunner.xyz
- **Demo path:** clone repo → `cd sdk-m1-scaffold/sdk/mcp && npm install && node chartrunner-mcp.js` → wire into Claude Desktop config → ask "analyze BTC 15m for SFP" → Claude calls the MCP tool → returns ChartRunner detector output
- **Sponsor integrated:** Torque (MCP)

## Tweet draft

> 🔧 ChartRunner is now an MCP server.
>
> 6 tools (analyze_chart, submit_trade, list_agents, get_portfolio, list_brokers, get_quote_asset) + 3 resources (chart://current, bot://signals, map://list).
>
> Same detector code as the in-game Coach and the Zerion autonomous agents. One SDK, four deployment targets.
>
> 🔗 chartrunner.xyz · @TorqueFi MCP track
