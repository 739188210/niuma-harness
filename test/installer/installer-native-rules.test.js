const test = require('node:test');
const fs = require('fs');
const path = require('path');
const {
  assert,
  assertFile,
  assertNoPath,
  assertTreeUnchanged,
  read,
  runInteractive,
  snapshotTree,
  tempDir,
} = require('../support/helpers');
const { run } = require('../support/helpers');
const supportsNoFollow = Boolean(fs.constants.O_NOFOLLOW);

function initWorkspace(agent, args = []) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', agent, ...args]);
  assert.strictEqual(result.status, 0, result.stderr);
  return workspace;
}

function installRule(workspace, agentChoice, ruleChoice, confirmation = '') {
  return runInteractive(['install-rule'], `${agentChoice}\n${ruleChoice}\n${confirmation}`, { cwd: workspace });
}

test('install-rule writes standalone Codex rules without modifying AGENTS.md', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = tempDir();
  const entryPath = path.join(workspace, 'AGENTS.md');
  fs.writeFileSync(entryPath, '# Project instructions\nKeep this text.\n', 'utf8');
  const entryBefore = read(entryPath);

  const result = installRule(workspace, '2', '1', 'y');

  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, '.agents', 'harness-rules', 'common', 'coding-style.md'));
  assertFile(path.join(workspace, '.agents', 'harness-rules', 'common', 'testing.md'));
  assert.strictEqual(read(entryPath), entryBefore);

  const repeat = installRule(workspace, '2', '1', 'y');
  assert.strictEqual(repeat.status, 0, repeat.stderr);
  assert.strictEqual(read(entryPath), entryBefore);
});

test('install-rule creates standalone Codex rules without a Harness contract', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = tempDir();

  const result = installRule(workspace, '2', '1', 'y');

  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, '.agents', 'harness-rules', 'common', 'security.md'));
  assertNoPath(path.join(workspace, 'AGENTS.md'));
});

test('install-rule appends OpenCode paths without changing unrelated configuration', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(configPath, `${JSON.stringify({ model: 'example/model', instructions: ['docs/team.md'] }, null, 2)}\n`, 'utf8');

  const result = installRule(workspace, '3', '1', 'y');

  assert.strictEqual(result.status, 0, result.stderr);
  const config = JSON.parse(read(configPath));
  assert.strictEqual(config.model, 'example/model');
  assert.ok(config.instructions.includes('docs/team.md'));
  assert.ok(config.instructions.includes('.opencode/rules/common/testing.md'));
  assert.ok(fs.existsSync(path.join(workspace, '.opencode', 'rules', 'common', 'testing.md')));

  const beforeRepeat = read(configPath);
  const repeat = installRule(workspace, '3', '1', 'y');
  assert.strictEqual(repeat.status, 0, repeat.stderr);
  assert.strictEqual(read(configPath), beforeRepeat);
});

test('install-rule rejects invalid OpenCode configuration atomically', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = tempDir();
  fs.writeFileSync(path.join(workspace, 'opencode.json'), '{"instructions": "invalid"}\n', 'utf8');
  const before = snapshotTree(workspace);

  const result = installRule(workspace, '3', '1', 'y');

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /instructions must be an array of strings/);
  assertTreeUnchanged(workspace, before);
});

test('install-rule refuses mutation when no-follow writes are unavailable', { skip: supportsNoFollow ? 'O_NOFOLLOW is available' : false }, () => {
  const workspace = tempDir();
  const before = snapshotTree(workspace);

  const result = installRule(workspace, '3', '1');

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /O_NOFOLLOW is unavailable/);
  assertTreeUnchanged(workspace, before);
});

test('install-rule applies multi-agent native adapters together', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = initWorkspace('multi', ['--rules', 'none']);
  const result = installRule(workspace, '4', '1', 'y');

  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(workspace, '.claude', 'rules', 'common', 'testing.md')));
  assert.ok(fs.existsSync(path.join(workspace, '.agents', 'harness-rules', 'common', 'testing.md')));
  assert.ok(fs.existsSync(path.join(workspace, '.opencode', 'rules', 'common', 'testing.md')));
  assert.doesNotMatch(read(path.join(workspace, 'AGENTS.md')), /Selected engineering rules|niuma-harness:codex-rules/);
  const config = JSON.parse(read(path.join(workspace, 'opencode.json')));
  assert.ok(config.instructions.includes('.opencode/rules/common/testing.md'));
});
