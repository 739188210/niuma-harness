const test = require('node:test');
const { assert, fs, path, run, tempDir } = require('./helpers');

test('help documents repair options without force flags', () => {
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness repair/);
  assert.match(result.stdout, /-y, --yes/);
  assert.match(result.stdout, /--backup-dir/);
  assert.doesNotMatch(result.stdout, /--force|--include-/);
});

test('repair-only options are rejected by init and doctor', () => {
  let result = run(['init', tempDir(), '--agent', 'claude', '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /only available for repair/);
  result = run(['doctor', tempDir(), '--backup-dir', 'backup']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /only supports --harness-dir/);
});

test('repair requires -y in non-TTY mode when changes exist', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', 'dev-check.md'), 'drift');
  result = run(['repair', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /Found 1 issue/);
  assert.match(result.stderr, /Re-run with -y or --yes/);
});
