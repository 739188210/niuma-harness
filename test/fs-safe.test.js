const test = require('node:test');
const {
  assert,
  fs,
  path,
  tempDir,
} = require('./helpers');
const { canonicalizeWorkspacePath } = require('../src/fs-safe');

function createDirectoryAlias(target, alias) {
  fs.symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
}

function canonicalPath(target) {
  return (fs.realpathSync.native || fs.realpathSync)(target);
}

test('canonicalizeWorkspacePath resolves an existing directory', () => {
  const workspace = tempDir();
  assert.strictEqual(canonicalizeWorkspacePath(workspace), canonicalPath(workspace));
});

test('canonicalizeWorkspacePath appends a missing suffix to the canonical ancestor', () => {
  const parent = tempDir();
  const target = path.join(parent, 'new', 'nested');
  assert.strictEqual(
    canonicalizeWorkspacePath(target),
    path.join(canonicalPath(parent), 'new', 'nested')
  );
});

test('canonicalizeWorkspacePath resolves a directory alias and missing suffix', (t) => {
  const root = tempDir();
  const realParent = path.join(root, 'real');
  const alias = path.join(root, 'alias');
  fs.mkdirSync(realParent);
  try {
    createDirectoryAlias(realParent, alias);
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }

  assert.strictEqual(canonicalizeWorkspacePath(alias), canonicalPath(realParent));
  assert.strictEqual(
    canonicalizeWorkspacePath(path.join(alias, 'new', 'nested')),
    path.join(canonicalPath(realParent), 'new', 'nested')
  );
});

test('canonicalizeWorkspacePath rejects a dangling directory alias', (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows junctions cannot represent a portable dangling directory alias');
    return;
  }
  const root = tempDir();
  const alias = path.join(root, 'alias');
  fs.symlinkSync(path.join(root, 'missing'), alias, 'dir');
  assert.throws(() => canonicalizeWorkspacePath(alias), /ENOENT|no such file or directory/i);
});

test('canonicalizeWorkspacePath rejects a file ancestor', () => {
  const root = tempDir();
  const file = path.join(root, 'file');
  fs.writeFileSync(file, 'content', 'utf8');
  assert.throws(
    () => canonicalizeWorkspacePath(path.join(file, 'child')),
    /Parent path exists but is not a directory/
  );
});
