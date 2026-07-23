const test = require('node:test');
const {
  assert,
  fs,
  path,
  tempDir,
} = require('./helpers');
const {
  assertWorkDirBinding,
  getRuntimeLayout,
  resolveRuntimePaths,
} = require('../src/runtime-layout');

function manifest(overrides = {}) {
  return {
    workDirectory: 'agent-work',
    workDirectories: ['agent-work', 'agent-work/tasks'],
    workTemplateFiles: [{ target: 'agent-work/README.md', template: 'agent-work/README.md' }],
    ...overrides,
  };
}

test('runtime layout resolves the canonical default declarations', () => {
  const layout = getRuntimeLayout(manifest());
  assert.deepStrictEqual(layout, {
    readmeTarget: 'agent-work/README.md',
    tasksDirectory: 'agent-work/tasks',
    workDirectories: ['agent-work', 'agent-work/tasks'],
    workDirectory: 'agent-work',
  });
  assert.doesNotThrow(() => assertWorkDirBinding('agent-work', layout));
  assert.throws(() => assertWorkDirBinding('../outside', layout), /workDir must match package manifest/);
});

test('runtime layout rejects inconsistent package declarations', () => {
  assert.throws(
    () => getRuntimeLayout(manifest({ workDirectories: ['agent-work'] })),
    /must include agent-work\/tasks/
  );
  assert.throws(
    () => getRuntimeLayout(manifest({ workTemplateFiles: [] })),
    /must include agent-work\/README.md/
  );
  assert.throws(
    () => getRuntimeLayout(manifest({ workDirectories: ['agent-work', 'agent-work/tasks', 'outside'] })),
    /must stay inside agent-work/
  );
  assert.throws(
    () => getRuntimeLayout(manifest({ workDirectory: '../outside' })),
    /path must stay inside the scaffold/
  );
});

test('runtime paths stay confined and reject a symlinked runtime root', (t) => {
  const workspace = tempDir();
  const layout = getRuntimeLayout(manifest());
  const paths = resolveRuntimePaths(workspace, layout);
  assert.strictEqual(paths.workDir, path.join(workspace, 'agent-work'));
  assert.strictEqual(paths.tasksPath, path.join(workspace, 'agent-work', 'tasks'));
  assert.strictEqual(paths.readmePath, path.join(workspace, 'agent-work', 'README.md'));

  const external = tempDir();
  try {
    fs.symlinkSync(external, paths.workDir, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }
  assert.throws(() => resolveRuntimePaths(workspace, layout), /Refusing to write through symlink/);
});
