#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────────────
 *  ChartRunner MCP server — Model Context Protocol
 * ────────────────────────────────────────────────────────────────────────
 *  Post-Frontier Sidetrack server (v1.0.57). Exposes ChartRunner's chart
 *  state, pattern detectors, broker chassis, and on-chain map registry as
 *  MCP tools + resources so any MCP-compatible AI assistant (Claude
 *  Desktop, Cursor, Continue, custom Torque flows, etc) can drive the
 *  same primitives that the in-game Coach uses.
 *
 *  Architecture:
 *
 *    AI assistant (Claude / Torque agent / etc)
 *      ↓ stdin/stdout (JSON-RPC over MCP transport)
 *    chartrunner-mcp (this file, Node.js)
 *      ↓ in-process function calls
 *    sdk/agents/zerion-cli.js    ← detector logic (shared)
 *    sdk/brokers/index.js        ← trade execution (shared)
 *
 *  Frontier track: Torque · Build with Torque MCP · $3k USDC
 *    https://earn.superteam.fun/listings/build-with-torque-mcp/
 *
 *  Run locally:
 *    node sdk-m1-scaffold/sdk/mcp/chartrunner-mcp.js
 *
 *  Or wire into Claude Desktop via claude_desktop_config.json:
 *    {
 *      "mcpServers": {
 *        "chartrunner": {
 *          "command": "node",
 *          "args": ["/path/to/chartrunner-mcp.js"],
 *          "env": { "CR_ZERION_KEY": "...", "CR_BIRDEYE_KEY": "..." }
 *        }
 *      }
 *    }
 *
 *  This file targets the @modelcontextprotocol/sdk Node API. Install
 *  the dep with: npm install @modelcontextprotocol/sdk
 *  ──────────────────────────────────────────────────────────────────── */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Shared detector + broker logic — same code path as the in-game Coach
// and the Zerion-CLI autonomous agent wrappers from v1.0.56.
import { listAgents, getAgent, fetchPortfolio } from '../agents/zerion-cli.js';
import { currentBroker, setBroker, listBrokers, setQuoteAsset, getQuoteAsset } from '../brokers/index.js';

// ─── Server setup ────────────────────────────────────────────────────────

const server = new Server(
  {
    name:    'chartrunner-mcp',
    version: '1.0.57',
  },
  {
    capabilities: {
      tools:     {},
      resources: {},
    },
  },
);

// ─── Tool definitions ────────────────────────────────────────────────────

const TOOLS = [
  {
    name:        'analyze_chart',
    description: 'Run a ChartRunner pattern detector against an asset/timeframe. Returns a decision payload with action, size, confidence, and the raw detector setup (which kind of pattern fired, where, with what evidence). Supported detectors: ccv, sfp, hns, barr, fa, oi.',
    inputSchema: {
      type:       'object',
      required:   ['detector', 'asset', 'timeframe'],
      properties: {
        detector:  { type: 'string', enum: ['ccv','sfp','hns','barr','fa','oi'],
                     description: 'Which pattern detector to run' },
        asset:     { type: 'string', description: 'Asset symbol (BTC, ETH, SOL, WIF, BONK, JUP, JTO, PUMP, FART, ...)' },
        timeframe: { type: 'string', enum: ['1m','5m','15m','1h','4h','1D','1W'],
                     description: 'Chart timeframe' },
        wallet:    { type: 'string', description: 'Optional Solana wallet pubkey for portfolio-aware sizing' },
      },
    },
  },
  {
    name:        'list_agents',
    description: 'List all registered ChartRunner detector agents. Each agent wraps a Pine v5 pattern detector and can produce decisions risk-scaled by a wallet portfolio.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name:        'get_portfolio',
    description: 'Fetch the Solana portfolio for a wallet via the Zerion API. Returns SOL balance + token list with USD values. Used by analyze_chart to size decisions by wallet state.',
    inputSchema: {
      type:       'object',
      required:   ['wallet'],
      properties: {
        wallet: { type: 'string', description: 'Solana wallet pubkey (base58)' },
      },
    },
  },
  {
    name:        'submit_trade',
    description: 'Submit a trade through the ChartRunner broker chassis. Routes through whichever broker is currently active (mock / binance-paper / phoenix / jupiter / jito). Returns a fill record. WARNING: gated behind user approval at the host application layer; this tool itself does not enforce confirmation.',
    inputSchema: {
      type:       'object',
      required:   ['side', 'size'],
      properties: {
        side:     { type: 'string', enum: ['buy','sell'] },
        size:     { type: 'number', description: 'Order size in base token units (e.g. SOL)' },
        broker:   { type: 'string', enum: ['mock','binance-paper','phoenix','jupiter','jito'],
                    description: 'Override the active broker for this trade only' },
        quoteAsset:{ type: 'string', enum: ['usdc','usdt'], description: 'Settle asset for this trade' },
        slippageBps:{ type: 'number', description: 'Slippage tolerance in basis points (default 50)' },
        tipLamports:{ type: 'number', description: 'Jito tip in lamports (default 10000, only used when broker=jito)' },
      },
    },
  },
  {
    name:        'list_brokers',
    description: 'List all registered ChartRunner brokers with their current state (live / paper / pending).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name:        'get_quote_asset',
    description: 'Get the currently selected quote asset (USDC or USDT) — the default settle asset for trades that don\'t specify mintIn/mintOut.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── Tool dispatch ───────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    switch(name){
      case 'analyze_chart': {
        const agent = getAgent(args.detector);
        if(!agent){
          return _err(`unknown detector: ${args.detector}`);
        }
        const portfolio = args.wallet ? await fetchPortfolio(args.wallet) : null;
        const candles = await _fetchCandles(args.asset, args.timeframe);
        const result = await agent.run({
          wallet:    args.wallet,
          portfolio,
          chain:     'solana',
          asset:     args.asset,
          timeframe: args.timeframe,
          candles,
        });
        return _ok(result);
      }
      case 'list_agents': {
        return _ok({ agents: listAgents() });
      }
      case 'get_portfolio': {
        const p = await fetchPortfolio(args.wallet);
        return _ok(p);
      }
      case 'submit_trade': {
        if(args.broker)     setBroker(args.broker);
        if(args.quoteAsset) setQuoteAsset(args.quoteAsset);
        const broker = currentBroker();
        const fill = await broker.submit({
          side:        args.side,
          size:        args.size,
          type:        'market',
          slippageBps: args.slippageBps,
          tipLamports: args.tipLamports,
        });
        return _ok(fill);
      }
      case 'list_brokers': {
        return _ok({ brokers: listBrokers() });
      }
      case 'get_quote_asset': {
        return _ok(getQuoteAsset());
      }
      default:
        return _err(`unknown tool: ${name}`);
    }
  } catch(err){
    return _err(err && err.message ? err.message : String(err));
  }
});

function _ok(payload){
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}
function _err(msg){
  return { content: [{ type: 'text', text: `ERROR: ${msg}` }], isError: true };
}

// ─── Resources ───────────────────────────────────────────────────────────

// MCP resources are read-only chunks of context the assistant can pull
// without an explicit tool call (e.g. "show me the current chart" before
// asking "what pattern is forming"). We expose three:
//   chart://current      — latest candles + symbol + timeframe
//   bot://signals        — latest fired detector signals (last 60s)
//   map://list           — saved chartrunner_maps PDAs for the connected wallet

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: 'chart://current', name: 'Current chart state',  mimeType: 'application/json',
      description: 'Latest OHLC candles + symbol + timeframe from the active ChartRunner session.' },
    { uri: 'bot://signals',   name: 'Recent detector signals', mimeType: 'application/json',
      description: 'Pattern detector signals fired in the last 60 seconds across all registered agents.' },
    { uri: 'map://list',      name: 'On-chain saved maps', mimeType: 'application/json',
      description: 'Map PDAs anchored on devnet under the connected wallet via chartrunner_maps program.' },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  if(uri === 'chart://current'){
    // Stub — in production, the host process injects current state.
    return { contents: [{ uri, mimeType: 'application/json',
      text: JSON.stringify({ asset: 'BTC', timeframe: '15m', candles: [] }, null, 2) }] };
  }
  if(uri === 'bot://signals'){
    return { contents: [{ uri, mimeType: 'application/json',
      text: JSON.stringify({ signals: [] }, null, 2) }] };
  }
  if(uri === 'map://list'){
    return { contents: [{ uri, mimeType: 'application/json',
      text: JSON.stringify({ maps: [], note: 'Connect a wallet via getProgramAccounts to populate' }, null, 2) }] };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

// ─── Helpers ─────────────────────────────────────────────────────────────

async function _fetchCandles(asset, timeframe){
  // Stub — server-side fetch from Binance ticker. In production this
  // would read from the host ChartRunner runtime via shared state.
  const pair = (asset || 'BTC').toUpperCase() + 'USDT';
  try {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${timeframe || '15m'}&limit=120`);
    if(!r.ok) return [];
    const arr = await r.json();
    return arr.map(k => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
  } catch(_){ return []; }
}

// ─── Boot ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[chartrunner-mcp] connected via stdio · v1.0.57');
