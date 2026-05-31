import fs from 'node:fs';
import path from 'node:path';

const htmlPath = path.resolve('ChartRunner_Prototype.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const providerStart = html.indexOf('window.crCoachProviders = (function()');
const providerEnd = html.indexOf('/* =========================================================================\n * v0.8M#1 — crCoach', providerStart);
const providerModule = providerStart >= 0 && providerEnd > providerStart ? html.slice(providerStart, providerEnd) : '';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  }
}

assert(/window\.crCoachProviders\s*=\s*\(function/.test(html), 'Coach provider router must expose window.crCoachProviders');
assert(/coachAI:\s*true/.test(html), 'Feature flags must include coachAI:true');
assert(/function buildCoachSnapshot\(\)/.test(html), 'Router must build a bounded Coach snapshot');
assert(/function ask\(playerMsg,\s*history,\s*fallbackText\)/.test(html), 'Router must expose ask(playerMsg, history, fallbackText)');
assert(/AbortController/.test(html), 'Provider calls must use AbortController timeout');
assert(/fallbackText/.test(html), 'Provider path must preserve deterministic fallback text');
assert(/function isLocalProviderUrl\(url\)/.test(html), 'Router must enforce local-only provider URL checks');
assert(/local_only_blocks_remote/.test(html), 'Router must block remote provider URLs in local_only mode');
assert(/Coach LLM is an untrusted narrator/.test(html), 'Source must document the untrusted narrator invariant');
assert(/Coach reads context[^]*connected agent\/tool proposes[^]*SDK\/wallet executes/.test(html), 'Source must document the authority split');
assert(/function coachKnowledge\(\)/.test(providerModule), 'Provider must include a bounded ChartRunner/trading knowledge pack');
assert(/Bot Terminal[^]*external bots and agents/i.test(providerModule), 'Provider prompt must identify Bot Terminal as the external agent interface');
assert(/in_game_context_advisor|in-game context advisor/i.test(providerModule), 'Provider snapshot must identify Coach as the in-game context advisor');
assert(/tradingPlaybook/.test(providerModule), 'Provider snapshot must include general trading guidance, not only game state');
assert(providerModule && providerModule.length > 1000, 'Coach provider module slice must be detectable');
assert(!/crAgentBus\.execute/.test(providerModule), 'Coach provider module must not call crAgentBus.execute');
assert(!/signAndSendTransaction/.test(providerModule), 'Coach provider module must not call wallet signing');
assert(!/recordBotBacktest/.test(providerModule), 'Coach provider module must not start on-chain proof');

if (process.exitCode) process.exit(process.exitCode);
console.log('Coach provider security checks passed.');
