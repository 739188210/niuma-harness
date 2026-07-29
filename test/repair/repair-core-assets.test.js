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

test('repair rejects asset recovery flags before mutation', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const before = snapshotTree(workspace);
  const repair = run(['repair', workspace, '--rules', 'common']);
  assert.notStrictEqual(repair.status, 0);
  assert.match(repair.stderr, /repair does not manage rules or skills/);
  assertTreeUnchanged(workspace, before);
});
