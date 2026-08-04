const test = require('node:test');
const fs = require('fs');
const path = require('path');
const {
  assert,
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

test('repair restores Codex contract drift without managing independent rule assets', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex', '--rules', 'common', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entryPath = path.join(workspace, 'AGENTS.md');
  const rulesRoot = path.join(workspace, '.agents', 'harness-rules');
  fs.writeFileSync(entryPath, read(entryPath).replace('Operating Contract', 'Operating Contract (drifted)'), 'utf8');
  fs.writeFileSync(path.join(rulesRoot, 'common', 'testing.md'), 'local Codex rule\n', 'utf8');
  fs.writeFileSync(path.join(rulesRoot, 'local.md'), 'extra asset\n', 'utf8');
  const assetsBefore = snapshotTree(rulesRoot);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(read(entryPath), /Operating Contract \(drifted\)/);
  assert.deepStrictEqual(snapshotTree(rulesRoot), assetsBefore);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});
