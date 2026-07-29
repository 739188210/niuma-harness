const test = require('node:test');
const {
  assert,
  assertTreeUnchanged,
  path,
  read,
  readJson,
  run,
  snapshotTree,
  tempDir,
  writeJson,
} = require('../support/helpers');

test('re-run init refreshes core while preserving independent assets', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--rules', 'common', '--skills', 'database-readonly']);
  assert.strictEqual(result.status, 0, result.stderr);

  const rulePath = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  const skillPath = path.join(workspace, '.claude', 'skills', 'database-readonly', 'SKILL.md');
  const commandPath = path.join(workspace, '.claude', 'commands', 'dev-check.md');
  const opencodePath = path.join(workspace, 'opencode.json');
  const corePath = path.join(workspace, 'harness', 'docs', 'layers', '01-context.md');
  for (const filePath of [rulePath, skillPath, commandPath]) fsWrite(filePath, `local ${path.basename(filePath)}\n`);
  fsWrite(opencodePath, '{"instructions":["local.md"]}\n');
  fsWrite(corePath, 'stale core\n');
  const assetsBefore = snapshotTree(path.join(workspace, '.claude'));
  const opencodeBefore = read(opencodePath);

  result = run(['init', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(snapshotTree(path.join(workspace, '.claude')), assetsBefore);
  assert.strictEqual(read(opencodePath), opencodeBefore);
  assert.notStrictEqual(read(corePath), 'stale core\n');
  const manifest = readJson(path.join(workspace, 'harness', 'manifest.json'));
  assert.strictEqual(manifest.schemaVersion, 5);
  for (const field of ['rules', 'skills', 'commands', 'artifacts', 'openCodeInstructions']) {
    assert.ok(!Object.prototype.hasOwnProperty.call(manifest, field));
  }

  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

test('re-run init clears embedded Codex rules but preserves entry content outside the contract', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex', '--rules', 'common', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entryPath = path.join(workspace, 'AGENTS.md');
  fsWrite(entryPath, `${read(entryPath)}\n# Project override\nKeep this.\n`);
  assert.match(read(entryPath), /niuma-harness:codex-rules begin/);

  result = run(['init', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(read(entryPath), /Selected engineering rules|codex-rules begin/);
  assert.match(read(entryPath), /# Project override\nKeep this\./);
});

test('re-run init rejects asset selection flags without mutation', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const before = snapshotTree(workspace);

  result = run(['init', workspace, '--rules', 'common']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Asset selection options are only valid for fresh init/);
  assertTreeUnchanged(workspace, before);
});

test('re-run init migrates legacy asset-bound manifests without reading asset state', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const legacy = readJson(manifestPath);
  legacy.schemaVersion = 4;
  legacy.rules = 'broken';
  legacy.skills = { broken: true };
  legacy.commands = null;
  legacy.artifacts = 'not-a-ledger';
  legacy.openCodeInstructions = { invalid: true };
  require('fs').writeFileSync(manifestPath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');
  const beforeAssets = snapshotTree(path.join(workspace, '.claude'));

  result = run(['init', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(snapshotTree(path.join(workspace, '.claude')), beforeAssets);
  assert.strictEqual(readJson(manifestPath).schemaVersion, 5);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

function fsWrite(filePath, content) {
  require('fs').writeFileSync(filePath, content, 'utf8');
}
