import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runLeakageCheck } from './check_public_leakage.mjs';

function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-leak-guard-'));
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'ChartRunner Guard Test'], { cwd: root });

  for (const [name, body] of Object.entries(files)) {
    const full = path.join(root, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }

  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

{
  const root = makeRepo({
    'README.md': '# Public ChartRunner repo\n',
    'docs/SDK.md': 'Standalone SDK package remains gated until stable.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, true, result.messages.join('\n'));
  } finally {
    cleanup(root);
  }
}

{
  const root = makeRepo({
    'sdk-m1-scaffold/sdk/core/package.json': '{}\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /sdk-m1-scaffold/);
  } finally {
    cleanup(root);
  }
}

{
  const root = makeRepo({
    'docs/TRACTION.md': '# Private traction plan\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /TRACTION\.md/);
  } finally {
    cleanup(root);
  }
}

{
  // crAgentBridgeUrl reclassified PUBLIC 2026-07-15 — a public connectivity knob, now allowed.
  const root = makeRepo({
    'docs/pub.md': 'crAgentBridgeUrl / crAgentEventsUrl are public agent-bridge connectivity knobs.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, true, result.messages.join('\n'));
  } finally {
    cleanup(root);
  }
}

{
  // QVAC is a PUBLIC bring-your-own-local-AI adapter 2026-07-15 — now allowed.
  const root = makeRepo({
    'docs/pub.md': 'window.crQvac.ask() routes through the public QVAC local-AI adapter.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, true, result.messages.join('\n'));
  } finally {
    cleanup(root);
  }
}

{
  // New rule: nothing public may point at private home-server infra (umbrel / tail879ec / *.ts.net).
  const root = makeRepo({
    'docs/leak.md': 'Dev host reachable at dev.tail879ec.ts.net stays private.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /tail879ec|\.ts\.net/);
  } finally {
    cleanup(root);
  }
}

{
  const root = makeRepo({
    'docs/leak.md': 'Do not let ?crPrivateBotTerminal=1 return as a public gate.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /crPrivateBotTerminal/);
  } finally {
    cleanup(root);
  }
}

{
  // Bare Hermes / OpenClaw / Lobster personas are PUBLIC harness agents 2026-07-15 — allowed.
  const root = makeRepo({
    'docs/pub.md': 'Agent personas: Claude, Telegram, Lobster, OpenClaw, Hermes answer in-character.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, true, result.messages.join('\n'));
  } finally {
    cleanup(root);
  }
}

{
  // ...but a Hermes line that points at private home-server infra is still forbidden.
  const root = makeRepo({
    'docs/leak.md': 'Hermes routing pinned to an umbrel.local box stays private.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /umbrel/);
  } finally {
    cleanup(root);
  }
}

{
  const root = makeRepo({
    'docs/pyth.md': [
      'Pyth Hermes snapshot remains public market-data plumbing.\n',
      'https://hermes.pyth.network/v2/updates/price/latest\n',
    ].join(''),
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, true, result.messages.join('\n'));
  } finally {
    cleanup(root);
  }
}

{
  // 0xLobster is a PUBLIC persona byline 2026-07-15 — now allowed in public docs.
  const root = makeRepo({
    'docs/pub.md': 'Marketplace bot listed "by 0xLobster" — public persona byline.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, true, result.messages.join('\n'));
  } finally {
    cleanup(root);
  }
}

{
  const root = makeRepo({
    'docs/leak.md': 'Do not let umbrel.local return to public docs.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /umbrel/);
  } finally {
    cleanup(root);
  }
}

console.log('Public leakage guard self-test passed.');
