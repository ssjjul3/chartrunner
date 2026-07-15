import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FORBIDDEN_PATHS = [
  ['defunct SDK scaffold', /^sdk-m1-scaffold(?:\/|$)/],
  ['served generated SDK artifacts', /^chartrunner-prototype\/sdk(?:\/|$)/],
  ['private dev kit', /^dev-kit(?:\/|$)/],
  ['local max workspace', /^local-max(?:\/|$)/],
  ['private patch archive', /^_patches(?:\/|$)/],
  ['private evaluator logs', /^docs\/milestones\/_evaluator-log(?:\/|$)/],
  ['private competitive strategy', /^docs\/COMPETITIVE\.md$/],
  ['private execution checklist', /^docs\/EXECUTION-CHECKLIST\.md$/],
  ['private traction plan', /^docs\/TRACTION\.md$/],
  ['private launch plan', /^docs\/X-LAUNCH\.md$/],
  ['private video script', /^docs\/VIDEO-SCRIPT\.md$/],
  ['partner submission docs', /^docs\/SUBMISSION-[^/]+\.md$/],
  ['sidetrack submission index', /^docs\/SIDETRACK-SUBMISSIONS-INDEX\.md$/],
  ['sidetrack integration plan', /^docs\/SIDETRACK-INTEGRATION-PLAN\.md$/],
  ['private economy concept', /^docs\/HONEYCOMB-CONCEPT\.md$/],
  ['private Phase 2 pipeline viz', /^docs\/architecture\/Phase2-Pipeline-Viz\.html$/],
  ['private Phase 2 M5 plan', /^docs\/architecture\/Phase2-M5-Implementation-Plan\.md$/],
  ['private model parity spec', /^docs\/architecture\/Phase2-Model-Parity-Spec\.md$/],
  ['private coach image instructions', /^COACH_IMAGE_INSTRUCTIONS\.md$/],
  ['private coach source image', /^coach\.jpg$/],
  ['local preview HTML', /(^|\/)[^/]*_preview\.html$/],
  ['local backup artifact', /(^|\/)[^/]*\.bak[^/]*$/],
  ['local backup artifact', /(^|\/)[^/]*\.backup[^/]*$/],
];

const FORBIDDEN_TEXT = [
  ['submission docs marker', /SUBMISSION-/],
  ['private evaluator logs marker', /_evaluator-log/],
  ['private Umbrel milestone', /M11-umbrel/],
  ['private Umbrel milestone', /M12-umbrel/],
  ['private bot milestone', /M14-bot/],
  ['private market data milestone', /M16-complete/],
  ['private FlareSolverr patch', /openclaw-flaresolverr/i],
  ['sidetrack submissions marker', /SIDETRACK-SUBMISSIONS/],
  // Bare 'openclaw' persona rule removed 2026-07-15 — Hermes / OpenClaw / Lobster are PUBLIC
  // harness-agent personas. The private FlareSolverr patch above is still forbidden.
  ['private home-server reference (no-Umbrel-in-public)', /umbrel|tail879ec|\.ts\.net/i],
  ['private labs flag', /crLabs/],
  ['private labs query flag', /crPrivateLabs/],
  ['private Bot Terminal query flag', /crPrivateBotTerminal/],
  ['private local app query flag', /crLocalPrivateApps/],
  ['private Bot Terminal localStorage flag', /cr_labs_bot_terminal_v1/],
  ['private labs DOM flag', /data-cr-labs-bot-terminal/],
  // QVAC / crQvac / cr_qvac rules removed 2026-07-15 — QVAC is a PUBLIC bring-your-own-local-AI adapter.
  ['private bot bridge panel', /crBotBridge/],
  ['private bot bridge marker', /BotBridge/],
  // Public agent-bridge knobs (crAgentBridgeUrl / crAgentEventsUrl / crAgentEvents / cr_agent_events /
  // cr_agent_bridge) reclassified as ALLOWED 2026-07-15 — they are public connectivity. The private
  // variants below stay forbidden, and 'nothing public points to Umbrel' is enforced by the
  // home-server rule above (umbrel / tail879ec / .ts.net). 0xLobster persona byline is PUBLIC → allowed.
  ['private agent bridge URL knob', /crPrivateAgentBridgeUrl/],
  ['private agent events URL knob', /crPrivateAgentEventsUrl/],
  ['private dev bridge flag', /__CR_DEV__/],
  ['legacy Umbrel data flag', /USE_UMBREL_DATA/],
  ['defunct SDK scaffold path', /sdk-m1-scaffold/],
  ['served generated SDK path', /chartrunner-prototype\/sdk/],
  ['private SDK brokers path', /sdk\/brokers/],
  ['private SDK MCP path', /sdk\/mcp/],
  ['private SDK agents path', /sdk\/agents/],
];

const TEXT_SCAN_ALLOWLIST = new Set([
  '.gitignore',
  'scripts/check_public_leakage.mjs',
  'scripts/test_public_leakage_guard.mjs',
  // SECURITY.md is a security CHANGELOG; naming a hardened knob there is documentation, not a leak.
  'SECURITY.md',
]);

const BINARY_EXTENSIONS = new Set([
  '.avif', '.gif', '.ico', '.jpeg', '.jpg', '.key', '.mov', '.mp4', '.odp',
  '.pdf', '.png', '.ppt', '.pptx', '.tar', '.tgz', '.webp', '.woff', '.woff2',
  '.zip',
]);

const HERMES_LOCKFILE_ALLOWLIST = new Set([
  'solana-connect/package-lock.json',
]);

const PYTH_HERMES_FILE_ALLOWLIST = new Set([
  'anchor/programs/chartrunner-oracle/src/lib.rs',
  'solana-connect/src/lib/pyth-feeds.ts',
]);

const PYTH_HERMES_LINE_ALLOWLIST = /Pyth|pythnetwork|hermes\.pyth\.network|HERMES_|VAA|verified feed|price update|price-update|price service|price feed|price snapshot|REST snapshot|WebSocket stream|benchmark endpoint|fetchLatestPrice|streamPyth|Live tape|streaming|price tape/i;

// Hermes is a PUBLIC harness-agent persona AND the name of Pyth's public price service, so a bare
// 'hermes' is allowed. Only flag a Hermes line that ALSO points at private home-server infra.
const HERMES_PRIVATE_INFRA = /umbrel|tail879ec|\.ts\.net/i;

function trackedFiles(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return walkFiles(root).map((file) => path.relative(root, file).split(path.sep).join('/'));
  }
}

function walkFiles(root) {
  const out = [];
  const skip = new Set(['.git', 'node_modules', 'target', 'dist', '.vite']);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }

  walk(root);
  return out;
}

function isTextScannable(relPath) {
  if (TEXT_SCAN_ALLOWLIST.has(relPath)) return false;
  // Internal working notes (e.g. *_RESTRUCTURE_*.md) are not shipping content — skip the text scan.
  if (/(^|\/)[^/]*_RESTRUCTURE_[^/]*\.md$/i.test(relPath)) return false;
  return !BINARY_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

function lineForOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function checkHermesText(file, text, messages) {
  if (HERMES_LOCKFILE_ALLOWLIST.has(file)) return;
  if (PYTH_HERMES_FILE_ALLOWLIST.has(file)) return;

  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/hermes/i.test(line)) continue;
    if (PYTH_HERMES_LINE_ALLOWLIST.test(line)) continue;
    if (!HERMES_PRIVATE_INFRA.test(line)) continue;
    messages.push(`forbidden text [private Hermes marker]: ${file}:${index + 1} contains ${line.trim().slice(0, 120)}`);
  }
}

export function runLeakageCheck(root = process.cwd()) {
  const repoRoot = path.resolve(root);
  const files = trackedFiles(repoRoot);
  const messages = [];

  for (const file of files) {
    for (const [label, pattern] of FORBIDDEN_PATHS) {
      if (pattern.test(file)) {
        messages.push(`forbidden path [${label}]: ${file}`);
      }
    }
  }

  for (const file of files) {
    if (!isTextScannable(file)) continue;

    const fullPath = path.join(repoRoot, file);
    let text = '';
    try {
      text = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    for (const [label, pattern] of FORBIDDEN_TEXT) {
      const match = pattern.exec(text);
      if (match) {
        const line = lineForOffset(text, match.index);
        messages.push(`forbidden text [${label}]: ${file}:${line} contains ${match[0]}`);
      }
    }

    checkHermesText(file, text, messages);
  }

  return { ok: messages.length === 0, messages, scannedFiles: files.length };
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = runLeakageCheck(root);

  if (!result.ok) {
    console.error('Public leakage guard failed:');
    for (const message of result.messages) console.error(`- ${message}`);
    process.exit(1);
  }

  console.log(`Public leakage guard passed. Scanned ${result.scannedFiles} tracked files.`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
