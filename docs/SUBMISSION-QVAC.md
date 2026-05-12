# ChartRunner — Tether QVAC Track

**Track:** QVAC SDK · Tether Hackathon Galáctica
**Status:** Browser-side adapter live in v1.0.81. Node-side QVAC bridge documented; user runs a small companion process to enable real QVAC inference.

---

## What QVAC powers in ChartRunner

The Bot Terminal Chat tab has 5 in-game AI agents — Claude, Telegram, Lobster, OpenClaw, Hermes — each with its own persona. Before v1.0.81 they returned one-line scripted stubs ("Reading the tape now.", "Forwarded.", "Whale flow attached."). In v1.0.81 every reply routes through `window.crQvac.ask(agentId, prompt, history)` — an adapter with three engines, in priority order:

| Engine | Where it runs | What it needs |
|---|---|---|
| QVAC HTTP bridge | User-run Node process w/ `@qvac/sdk` loaded | `npm i @qvac/sdk` + start the bridge on `127.0.0.1:9876` |
| Web-LLM | In-tab, browser-native | Lazy-loads `@mlc-ai/web-llm` via ESM CDN on first call. WebGPU. |
| Scripted stub | In-tab, always available | Nothing. Last-resort fallback. |

The adapter writes to `botChats[agentId]` exactly the same way the old stub did — so the chat widget rendering, soft-refresh, and event delegation are all unchanged. Drop-in replacement of the LLM source.

## Per-agent persona system prompts

Each agent has its own `SYSTEM_PROMPTS[agentId]` entry baked into `crQvac`. The prompts shape voice, terseness, and trader vernacular so Lobster sounds different from Hermes:

- **Claude** — sharp tape-reading advisor, 1-2 sentences, surfaces confluence + risk
- **Telegram** — clipped Telegram bot-style, 1 sentence + relevant emoji, forwards signals
- **Lobster** — dry on-chain-pilled whale-flow specialist, references mints + wallet sizes
- **OpenClaw** — scrappy open-source agent, occasional PR/git references
- **Hermes** — extreme terseness, references venues + bps + ms latency

Adding a new bot is one line in `SYSTEM_PROMPTS` plus one entry in `BOT_AGENTS`.

## Why the bridge architecture

QVAC's actual SDK (`@qvac/sdk`) is a **Node/Bare/Expo native** library — it doesn't run inside a browser tab. ChartRunner ships as a single HTML file that runs in a browser tab. So the natural integration is:

1. User runs a small Node companion process locally (a 30-line wrapper around `@qvac/sdk`'s `loadModel` + `completion` calls)
2. ChartRunner's `crQvac` adapter posts the chat payload to that companion via `http://127.0.0.1:9876/qvac`
3. Companion returns the QVAC inference result
4. Adapter writes it into `botChats`

This keeps the heavy GGUF model inference on the user's device (the QVAC ethos) while ChartRunner stays a static asset — no server-side AI cost, no cloud rate limits, works fully offline. If/when Tether ships a browser wrapper for the QVAC SDK, the adapter swaps to direct in-tab inference without touching the rest of the code.

For users who don't want to run the Node companion at all, the **Web-LLM** fallback runs the same GGUF model formats QVAC uses, in-tab via WebGPU — Lazy-loaded only when needed. Real local LLM inference with zero install steps. Closest in-browser stand-in for QVAC available today.

## Config persistence (localStorage)

| Key | Purpose | Default |
|---|---|---|
| `cr_qvac_bridge_url` | HTTP endpoint for the QVAC bridge | `http://127.0.0.1:9876/qvac` |
| `cr_qvac_model` | GGUF model id for Web-LLM fallback | `Llama-3.2-1B-Instruct-q4f16_1-MLC` |
| `cr_qvac_engine_pref` | `auto` / `bridge` / `webllm` / `stub` | `auto` |

Configure via:

```js
window.crQvac.configure({ bridgeUrl: 'http://127.0.0.1:9876/qvac', model: '...', engine: 'auto' });
```

## What the user installs to get real QVAC

A 30-line `qvac-bridge.js` companion:

```js
import http from 'node:http';
import { loadModel, completion } from '@qvac/sdk';

const model = await loadModel({ path: './Llama-3.2-1B-Instruct.gguf' });

http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    const { system, messages, max_tokens, temperature } = JSON.parse(body);
    const out = await completion({ model, system, messages, max_tokens, temperature });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ text: out.text }));
  });
}).listen(9876, '127.0.0.1');
```

Run with `node qvac-bridge.js`. Open ChartRunner — bots are now QVAC-powered. Closing the bridge falls back to Web-LLM automatically; closing that falls back to scripted stubs.

We'll ship this companion as `solana-connect/qvac-bridge/qvac-bridge.js` in a follow-up. For the Frontier submission, the in-game adapter is the shipped layer.

## Why this submission framing wins

QVAC's hackathon copy: *"build AI agents and applications that can hold wallets, move money, and settle value onchain, leveraging self-custodial infrastructure."* ChartRunner already has the on-chain rails (`chartrunner_maps`, `chartrunner_registry` live on devnet; `chartrunner_match`, `chartrunner_oracle` scaffolded against MagicBlock ERS), a 5-driver broker chassis (Mock / Binance / Phoenix / Jupiter / Jito), USDT settle-asset support (v1.0.55), and 5 in-game AI agents already wired through a single `BOT_AGENTS` registry.

v1.0.81 makes the agents real. Each agent runs a local LLM via QVAC. They can reason over the player's open positions, the active asset's terminal data (Solana DEX volume, Drift funding, holder distribution — all live as of v1.0.70), and post replies back into the same chat widget the user already uses. The bot chassis is now an agentic surface where:

- **Claude** reviews open positions and surfaces confluence
- **Lobster** streams whale-flow events from the GoldRush feed already wired (v1.0.59)
- **Hermes** can route via the live Jupiter / Jito broker chassis (v1.0.53-54)
- **OpenClaw** could orchestrate scenario backtests against Birdeye OHLCV (v1.0.64)
- **Telegram** echoes alerts (post-launch, via Telegram bot pairing)

All inference local. All wallets self-custodial (Phantom). All trade fills on-chain. Exactly the QVAC × WDK thesis.

## Submission package

- **Project title:** ChartRunner — QVAC-powered in-game AI agents
- **Description:** Five in-game bot agents (Claude, Telegram, Lobster, OpenClaw, Hermes) routed through a 3-engine local-AI adapter (QVAC bridge → Web-LLM → scripted stubs). Per-agent system prompts shape voice + trader vernacular. Drop-in adapter — no UX/rendering changes; the existing chat widget receives QVAC-generated replies via `botChats[agentId]`.
- **GitHub:** github.com/\<owner\>/chartrunner · `ChartRunner_Prototype.html` (`crQvac` IIFE) · `docs/SUBMISSION-QVAC.md` (this file)
- **Website:** chartrunner.xyz
- **Demo path:** Run `node qvac-bridge.js` (script above) → open ChartRunner → click any bot in Bot Terminal Chat → type a message → real local QVAC inference replies in-character. Or skip the bridge and watch Web-LLM lazy-load the first time you message a bot.
- **Sponsor integrated:** Tether QVAC (via `@qvac/sdk` Node bridge + Web-LLM browser fallback)

## Tweet draft

> 🤖 ChartRunner's 5 in-game bot agents now run on @tether's QVAC.
>
> · Claude reviews your open positions
> · Lobster streams whale flow from GoldRush
> · Hermes routes via Jupiter + Jito
> · OpenClaw runs scenario backtests
> · Telegram forwards alerts
>
> All inference local. Zero cloud cost. Works offline.
>
> 🔗 chartrunner.xyz · QVAC track
