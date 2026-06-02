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
  const root = makeRepo({
    'docs/leak.md': 'Do not let crAgentBridgeUrl return to public docs.\n',
  });
  try {
    const result = runLeakageCheck(root);
    assert.equal(result.ok, false);
    assert.match(result.messages.join('\n'), /crAgentBridgeUrl/);
  } finally {
    cleanup(root);
  }
}

console.log('Public leakage guard self-test passed.');
