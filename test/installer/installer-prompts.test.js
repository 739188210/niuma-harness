const test = require('node:test');
const fs = require('fs');
const { assert, assertFile, assertTreeUnchanged, path, runInteractive, snapshotTree, tempDir } = require('../support/helpers');
const supportsNoFollow = Boolean(fs.constants.O_NOFOLLOW);

test('install-skill without names selects agent and assets interactively', { skip: supportsNoFollow ? false : 'O_NOFOLLOW is unavailable' }, () => {
  const workspace = tempDir();
  const result = runInteractive(['install-skill'], '1\n1\n', { cwd: workspace });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Choose asset installation agent:/);
  assert.match(result.stdout, /Available skills:/);
  assert.match(result.stdout, /Installed skills\./);
  assertFile(path.join(workspace, '.claude', 'skills', 'database-readonly', 'SKILL.md'));
});

test('empty asset selection cancels without writing', () => {
  const workspace = tempDir();
  const before = snapshotTree(workspace);
  const result = runInteractive(['install-command'], '1\n\n', { cwd: workspace });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /No assets selected\. No files changed\./);
  assertTreeUnchanged(workspace, before);
});
