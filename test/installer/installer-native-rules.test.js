const test = require('node:test');
const fs = require('fs');
const path = require('path');
const {
  assert,
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

test('install-rule refuses platforms without no-follow support before modifying a Codex contract', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = initWorkspace('codex', ['--rules', 'none']);
  const entryPath = path.join(workspace, 'AGENTS.md');
  fs.appendFileSync(entryPath, '\n# Project overrides\nKeep this text.\n', 'utf8');
  const before = read(entryPath).split('<!-- niuma-harness:contract end -->')[1];

  const result = installRule(workspace, '2', '1', 'y');

  assert.strictEqual(result.status, 0, result.stderr);
  const entry = read(entryPath);
  assert.match(entry, /## Selected engineering rules/);
  assert.match(entry, /### common\/coding-style\.md/);
  assert.match(entry, /### common\/testing\.md/);
  assert.strictEqual(entry.split('<!-- niuma-harness:contract end -->')[1], before);
  assertNoPath(path.join(workspace, '.codex', 'rules'));

  const repeat = installRule(workspace, '2', '1', 'y');
  assert.strictEqual(repeat.status, 0, repeat.stderr);
  assert.strictEqual((read(entryPath).match(/### common\/testing\.md/g) || []).length, 1);
});

test('install-rule rejects missing Codex contract without writes', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = tempDir();
  const before = snapshotTree(workspace);

  const result = installRule(workspace, '2', '1', 'y');

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /AGENTS\.md has no Niuma contract.*Run init first/);
  assertTreeUnchanged(workspace, before);
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
  assert.match(read(path.join(workspace, 'AGENTS.md')), /### common\/testing\.md/);
  assert.ok(fs.existsSync(path.join(workspace, '.claude', 'rules', 'common', 'testing.md')));
  assert.ok(fs.existsSync(path.join(workspace, '.opencode', 'rules', 'common', 'testing.md')));
  assertNoPath(path.join(workspace, '.codex', 'rules'));
  const config = JSON.parse(read(path.join(workspace, 'opencode.json')));
  assert.ok(config.instructions.includes('.opencode/rules/common/testing.md'));
});
