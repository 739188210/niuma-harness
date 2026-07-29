const test = require('node:test');
const { assert, assertTreeUnchanged, run, snapshotTree, tempDir } = require('../support/helpers');

for (const command of ['install-skill', 'install-rule', 'install-command']) {
  test(`${command} requires a TTY and leaves cwd unchanged`, () => {
    const workspace = tempDir();
    const before = snapshotTree(workspace);
    const result = run([command], { cwd: workspace });
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /asset installation requires an interactive terminal/);
    assertTreeUnchanged(workspace, before);
  });

  test(`${command} rejects installer-incompatible options`, () => {
    const workspace = tempDir();
    for (const args of [
      [command, '--agent', 'claude'],
      [command, '--target', workspace],
      [command, '--harness-dir', 'other'],
      [command, '--yes'],
    ]) {
      const result = run(args, { cwd: workspace });
      assert.notStrictEqual(result.status, 0, args.join(' '));
      assert.match(result.stderr, /only supports --dry-run|Unknown option/);
    }
  });
}
