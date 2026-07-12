const test = require('node:test');
const {
  assert,
  assertNoPath,
  assertTreeUnchanged,
  fs,
  path,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');
const { scanWorkspaceHarnesses } = require('../src/workspace-harnesses');

function init(workspace, agent = 'claude', extra = []) {
  return run(['init', workspace, '--agent', agent, '--rules', 'none', '--skills', 'none', ...extra]);
}

function writeManifestCandidate(workspace, name, content) {
  const root = path.join(workspace, name);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'manifest.json'), content, 'utf8');
  return root;
}

function expectConflict(workspace, agent, extra = []) {
  const before = snapshotTree(workspace);
  const result = init(workspace, agent, extra);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /competing Niuma harnesses found/);
  assert.doesNotMatch(result.stdout, /CREATE|OVERWRITE|REMOVE|Done\./);
  assertTreeUnchanged(workspace, before);
  return result;
}

test('custom harness supports same-name re-init and agent switch', () => {
  const workspace = tempDir();
  let result = init(workspace, 'claude', ['--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  result = init(workspace, 'codex', ['--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  result = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('changing harness-dir stops before mutation for non-overlapping agents', () => {
  const workspace = tempDir();
  const first = init(workspace, 'claude');
  assert.strictEqual(first.status, 0, first.stderr);
  const result = expectConflict(workspace, 'codex', ['--harness-dir', 'ai-harness']);
  assert.match(result.stderr, /- harness/);
  assert.match(result.stderr, /does not migrate an existing harness/);
  assertNoPath(path.join(workspace, 'ai-harness'));
});

test('changing custom harness back to default also conflicts', () => {
  const workspace = tempDir();
  const first = init(workspace, 'claude', ['--harness-dir', 'ai-harness']);
  assert.strictEqual(first.status, 0, first.stderr);
  const result = expectConflict(workspace, 'codex');
  assert.match(result.stderr, /- ai-harness/);
  assertNoPath(path.join(workspace, 'harness'));
});

test('conflict remains when prior command artifacts are missing and during dry-run', () => {
  const workspace = tempDir();
  const first = init(workspace, 'claude');
  assert.strictEqual(first.status, 0, first.stderr);
  fs.rmSync(path.join(workspace, '.claude', 'commands'), { recursive: true });
  expectConflict(workspace, 'claude', ['--harness-dir', 'ai-harness']);
  expectConflict(workspace, 'claude', ['--harness-dir', 'ai-harness', '--dry-run']);
});

test('multiple candidates are reported in stable order', () => {
  const workspace = tempDir();
  writeManifestCandidate(workspace, 'zeta', '{"createdBy":"niuma-harness"}\n');
  writeManifestCandidate(workspace, 'alpha', '{"createdBy":"niuma-harness"}\n');
  const result = expectConflict(workspace, 'claude', ['--harness-dir', 'requested']);
  assert.ok(result.stderr.indexOf('- alpha') < result.stderr.indexOf('- zeta'));
});

test('discovery ignores unrelated manifests and recognizes damaged harness structure', () => {
  const workspace = tempDir();
  writeManifestCandidate(workspace, 'unrelated', '{"createdBy":"other"}\n');
  writeManifestCandidate(workspace, 'nested', '{"metadata":{"createdBy":"niuma-harness"}}\n');
  writeManifestCandidate(workspace, 'array', '[]\n');
  const damaged = writeManifestCandidate(workspace, 'damaged', '{}\n');
  fs.mkdirSync(path.join(damaged, 'docs', 'layers'), { recursive: true });
  fs.mkdirSync(path.join(damaged, 'docs', 'policy'), { recursive: true });
  fs.writeFileSync(path.join(damaged, 'HARNESS_GUIDE.md'), '# Niuma Harness Guide\n\nstable 7-layer operating context\n', 'utf8');
  fs.writeFileSync(path.join(damaged, 'docs', 'index.md'), '# Harness Runtime Index\n\n## 7-layer harness model\n', 'utf8');
  fs.writeFileSync(path.join(damaged, 'docs', 'layers', '07-loop.md'), '# Loop Runtime Layer Memo\n\nagent-work/tasks/<task-name>/status.md\n', 'utf8');
  fs.writeFileSync(path.join(damaged, 'docs', 'policy', 'action-boundary.md'), '# Action Boundary Policy\n\n## Autonomous actions\n', 'utf8');

  assert.deepStrictEqual(
    scanWorkspaceHarnesses(workspace).map((candidate) => [candidate.directoryName, candidate.damaged]),
    [['damaged', true]]
  );
});

test('discovery treats case-distinct harness directories according to the platform', () => {
  const workspace = tempDir();
  writeManifestCandidate(workspace, 'Harness', '{"createdBy":"niuma-harness"}\n');
  const result = init(workspace, 'claude');
  assert.notStrictEqual(result.status, 0);
  if (process.platform === 'win32') {
    assert.doesNotMatch(result.stderr, /competing Niuma harnesses found/);
    assert.match(result.stderr, /unsupported previous manifest\.json/);
  } else {
    assert.match(result.stderr, /- Harness/);
  }
});

test('damaged structure does not follow internal symlinks', () => {
  const workspace = tempDir();
  const outside = tempDir();
  const root = writeManifestCandidate(workspace, 'damaged', '{invalid');
  fs.writeFileSync(path.join(root, 'HARNESS_GUIDE.md'), 'guide\n', 'utf8');
  fs.mkdirSync(path.join(outside, 'layers'));
  fs.writeFileSync(path.join(outside, 'layers', '07-loop.md'), 'loop\n', 'utf8');
  let linked = false;
  try {
    fs.symlinkSync(outside, path.join(root, 'docs'), process.platform === 'win32' ? 'junction' : 'dir');
    linked = true;
  } catch {}
  if (linked) {
    assert.deepStrictEqual(scanWorkspaceHarnesses(workspace), []);
  }
});

test('discovery does not follow sibling directory or manifest symlinks', () => {
  const workspace = tempDir();
  const outside = tempDir();
  writeManifestCandidate(outside, 'owned', '{"createdBy":"niuma-harness"}\n');
  let directoryLinked = false;
  try {
    fs.symlinkSync(path.join(outside, 'owned'), path.join(workspace, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    directoryLinked = true;
  } catch {}

  const manifestRoot = path.join(workspace, 'manifest-link');
  fs.mkdirSync(manifestRoot);
  let manifestLinked = false;
  try {
    fs.symlinkSync(path.join(outside, 'owned', 'manifest.json'), path.join(manifestRoot, 'manifest.json'), 'file');
    manifestLinked = true;
  } catch {}

  if (directoryLinked || manifestLinked) {
    assert.deepStrictEqual(scanWorkspaceHarnesses(workspace), []);
  }
});

test('competing harness discovery works through a workspace alias', (t) => {
  const root = tempDir();
  const workspace = path.join(root, 'workspace');
  const alias = path.join(root, 'workspace-alias');
  fs.mkdirSync(workspace);
  writeManifestCandidate(workspace, 'alpha', '{"createdBy":"niuma-harness"}\n');
  try {
    fs.symlinkSync(workspace, alias, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }

  const result = expectConflict(alias, 'claude', ['--harness-dir', 'requested']);
  assert.match(result.stderr, /- alpha/);
});

test('workspace doctor reports multiple harnesses while direct doctor checks one root', () => {
  const workspace = tempDir();
  let result = init(workspace, 'claude');
  assert.strictEqual(result.status, 0, result.stderr);
  fs.cpSync(path.join(workspace, 'harness'), path.join(workspace, 'ai-harness'), { recursive: true });

  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /competing Niuma harnesses found/);
  assert.match(result.stdout, /- ai-harness/);

  result = run(['doctor', path.join(workspace, 'harness')]);
  assert.strictEqual(result.status, 0, result.stdout);
});
