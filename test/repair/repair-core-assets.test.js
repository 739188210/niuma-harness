const test = require('node:test');
const fs = require('fs');
const path = require('path');
const {
  assert,
  assertTreeUnchanged,
  read,
  run,
  snapshotTree,
  tempDir,
} = require('../support/helpers');

test('repair restores core drift without planning or mutating assets', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--rules', 'common', '--skills', 'database-readonly']);
  assert.strictEqual(result.status, 0, result.stderr);

  const corePath = path.join(workspace, 'harness', 'docs', 'layers', '01-context.md');
  const assetRoot = path.join(workspace, '.claude');
  const opencodePath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(corePath, 'core drift\n', 'utf8');
  fs.writeFileSync(path.join(workspace, '.claude', 'rules', 'common', 'testing.md'), 'asset drift\n', 'utf8');
  fs.writeFileSync(opencodePath, '{"instructions":["local.md"]}\n', 'utf8');
  const assetsBefore = snapshotTree(assetRoot);
  const opencodeBefore = read(opencodePath);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.notStrictEqual(read(corePath), 'core drift\n');
  assert.deepStrictEqual(snapshotTree(assetRoot), assetsBefore);
  assert.strictEqual(read(opencodePath), opencodeBefore);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair preserves a valid Codex rules region byte-for-byte while restoring contract drift', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entryPath = path.join(workspace, 'AGENTS.md');
  let entry = read(entryPath).replace('Operating Loop', 'Operating Loop (drifted)');
  entry = entry.replace(
    '<!-- niuma-harness:codex-rules end -->',
    '### local/example.md\n\nKeep these exact bytes.\n<!-- niuma-harness:codex-rules end -->'
  );
  fs.writeFileSync(entryPath, entry, 'utf8');
  const regionBefore = read(entryPath).match(/<!-- niuma-harness:codex-rules begin -->[\s\S]*?<!-- niuma-harness:codex-rules end -->/)[0];

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  const repaired = read(entryPath);
  assert.doesNotMatch(repaired, /Operating Loop \(drifted\)/);
  assert.strictEqual(repaired.match(/<!-- niuma-harness:codex-rules begin -->[\s\S]*?<!-- niuma-harness:codex-rules end -->/)[0], regionBefore);
});

test('repair rejects an old Codex contract without a rules region without mutation', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entryPath = path.join(workspace, 'AGENTS.md');
  fs.writeFileSync(entryPath, read(entryPath).replace(/\n*<!-- niuma-harness:codex-rules begin -->[\s\S]*?<!-- niuma-harness:codex-rules end -->/, ''), 'utf8');
  const before = snapshotTree(workspace);

  result = run(['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Codex rules region.*missing.*incompatible/);
  assertTreeUnchanged(workspace, before);
});
