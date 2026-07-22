const test = require('node:test');
const { digestBytes } = require('../src/artifact-ledger');
const { canonicalizeWorkspacePath } = require('../src/fs-safe');
const {
  allCommandFiles,
  assert,
  assertNoPath,
  copyCliPackage,
  fs,
  path,
  read,
  readJson,
  run,
  runWithCliRoot,
  snapshotTree,
  tempDir,
} = require('./helpers');
const { initWorkspace } = require('./support/cli-fixtures');

test('repair dry-run reports all issues without mutation', () => {
  const workspace = initWorkspace('multi');
  fs.writeFileSync(path.join(workspace, 'CLAUDE.md'), '<!-- niuma-harness:contract begin -->\nbad', 'utf8');
  fs.writeFileSync(path.join(workspace, 'opencode.json'), '{bad', 'utf8');
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  fs.rmSync(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'));
  const before = snapshotTree(workspace);

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Found 4 issues/);
  for (const target of ['CLAUDE.md', 'opencode.json', `.claude/commands/${allCommandFiles[0]}`, 'harness/docs/layers/01-context.md']) {
    assert.match(result.stdout, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.deepStrictEqual(snapshotTree(workspace), before);
  assertNoPath(path.join(workspace, '.niuma-harness'));
});

test('repair no-ops on a healthy harness', () => {
  const workspace = initWorkspace();
  const before = snapshotTree(workspace);
  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /No repair needed/);
  assert.deepStrictEqual(snapshotTree(workspace), before);
});

test('repair rebuilds an invalid manifest with explicit recovery selections', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.writeFileSync(manifestPath, '{bad', 'utf8');
  const result = run([
    'repair', workspace, '-y', '--agent', 'claude',
    '--rules', 'common', '--skills', 'none',
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
  const manifest = readJson(manifestPath);
  assert.strictEqual(manifest.agent, 'claude');
  assert.deepStrictEqual(manifest.rules, ['common']);
  assert.deepStrictEqual(manifest.skills, []);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair retains valid selections when trusted workDir binding is invalid', () => {
  const workspace = initWorkspace('codex');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.workDir = '../outside';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  const repaired = readJson(manifestPath);
  assert.strictEqual(repaired.agent, 'codex');
  assert.deepStrictEqual(repaired.rules, manifest.rules);
  assert.deepStrictEqual(repaired.skills, manifest.skills);
  assert.strictEqual(repaired.workDir, 'agent-work');
});

test('repair retains valid selections when trusted artifact records are invalid', () => {
  const workspace = initWorkspace('opencode');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.artifacts = manifest.artifacts.map((artifact, index) => index === 0
    ? { ...artifact, digest: `sha256:${'0'.repeat(64)}` }
    : artifact);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  const repaired = readJson(manifestPath);
  assert.strictEqual(repaired.agent, 'opencode');
  assert.deepStrictEqual(repaired.rules, manifest.rules);
  assert.deepStrictEqual(repaired.skills, manifest.skills);
  assert.notDeepStrictEqual(repaired.artifacts, manifest.artifacts);
});

test('repair stores permanent backup under a custom parent', () => {
  const workspace = initWorkspace();
  const command = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  fs.appendFileSync(command, 'drift');
  const result = run(['repair', workspace, '-y', '--backup-dir', 'my-repairs']);
  assert.strictEqual(result.status, 0, result.stderr);
  const match = result.stdout.match(/Backup retained: (.+)/);
  assert.ok(match);
  const backup = match[1].trim();
  const canonicalBackup = canonicalizeWorkspacePath(backup);
  const canonicalParent = canonicalizeWorkspacePath(path.join(workspace, 'my-repairs'));
  assert.strictEqual(path.dirname(canonicalBackup), canonicalParent);
  assert.ok(fs.existsSync(backup));
});

test('repair rejects an explicit harness directory with different case without mutation', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'Harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  const before = snapshotTree(workspace);

  result = run(['repair', workspace, '-y', '--harness-dir', 'harness']);
  assert.notStrictEqual(result.status, 0);
  if (process.platform === 'win32') {
    assert.match(result.stderr, /Requested --harness-dir "harness"/);
    assert.match(result.stderr, /existing harness directory "Harness"/);
    assert.match(result.stderr, /name exactly/);
  } else {
    assert.match(result.stderr, /No Niuma harness found/);
  }
  assert.doesNotMatch(result.stdout, /Found \d+ issues|BACKUP|WRITE|Repair completed/);
  assert.deepStrictEqual(snapshotTree(workspace), before);
  assertNoPath(path.join(workspace, '.niuma-harness'));
});

test('repair rejects a backup directory through a symlink parent', (t) => {
  const workspace = initWorkspace();
  const outside = tempDir();
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  try {
    fs.symlinkSync(outside, path.join(workspace, 'linked-backups'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }
  const result = run(['repair', workspace, '-y', '--backup-dir', 'linked-backups']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /symlink|link/i);
  assert.deepStrictEqual(fs.readdirSync(outside), []);
});

test('repair rejects a backup directory through a dangling link', (t) => {
  const workspace = initWorkspace();
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  try {
    fs.symlinkSync(path.join(workspace, 'missing-target'), path.join(workspace, 'dangling'));
  } catch (error) {
    t.skip(`links unavailable: ${error.code || error.message}`);
    return;
  }
  const result = run(['repair', workspace, '-y', '--backup-dir', 'dangling/repairs']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /symlink|link/i);
});

test('repair rejects an absolute backup directory outside the workspace', () => {
  const workspace = initWorkspace();
  const outside = tempDir();
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  const result = run(['repair', workspace, '-y', '--backup-dir', outside]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /absolute paths are not allowed|inside.*workspace|escapes/i);
});

test('repair rejects a canonical backup alias overlapping an affected target', (t) => {
  const workspace = initWorkspace();
  const affected = path.join(workspace, '.claude', 'commands');
  fs.appendFileSync(path.join(affected, allCommandFiles[0]), 'drift');
  try {
    fs.symlinkSync(affected, path.join(workspace, 'backup-alias'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }
  const result = run(['repair', workspace, '-y', '--backup-dir', 'backup-alias']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /symlink|overlaps/i);
});


test('repair discovers a strongly damaged harness with a missing manifest from workspace target', () => {
  const workspace = initWorkspace('claude');
  fs.rmSync(path.join(workspace, 'harness', 'manifest.json'));
  const result = run(['repair', workspace, '-y', '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair discovers a strongly damaged harness with a missing manifest from direct target', () => {
  const workspace = initWorkspace('claude');
  const harness = path.join(workspace, 'harness');
  fs.rmSync(path.join(harness, 'manifest.json'));
  const result = run(['repair', harness, '-y', '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(run(['doctor', harness]).status, 0);
});

test('repair rejects an explicitly named unrelated manifest directory without mutation', () => {
  const workspace = tempDir();
  const target = path.join(workspace, 'custom-harness');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'manifest.json'), '{"createdBy":"other-tool","data":{"keep":true}}\n');
  fs.writeFileSync(path.join(target, 'keep.txt'), 'untouched\n');
  const before = snapshotTree(workspace);

  const result = run(['repair', workspace, '-y', '--agent', 'claude', '--harness-dir', 'custom-harness']);

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /No Niuma harness found/);
  assert.deepStrictEqual(snapshotTree(workspace), before);
});

test('repair rejects a direct directory with an unrelated valid manifest', () => {
  const target = tempDir();
  fs.writeFileSync(path.join(target, 'manifest.json'), '{"createdBy":"other-tool"}\n');
  const result = run(['repair', target, '--dry-run', '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /No Niuma harness found/);
});

test('repair rejects a direct directory with an unrelated invalid manifest', () => {
  const target = tempDir();
  fs.writeFileSync(path.join(target, 'manifest.json'), '{invalid');
  const result = run(['repair', target, '--dry-run', '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /No Niuma harness found/);
});

test('repair rejects arbitrary content in damaged-harness marker files', () => {
  const target = tempDir();
  fs.mkdirSync(path.join(target, 'docs', 'layers'), { recursive: true });
  fs.writeFileSync(path.join(target, 'README.md'), 'unrelated readme\n');
  fs.writeFileSync(path.join(target, 'docs', 'layers', '07-loop.md'), 'unrelated loop\n');
  const result = run(['repair', target, '--dry-run', '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /No Niuma harness found/);
});

test('repair reports ambiguity for multiple strongly damaged harness roots', () => {
  const workspace = initWorkspace('claude');
  const first = path.join(workspace, 'harness');
  const second = path.join(workspace, 'second-harness');
  fs.cpSync(first, second, { recursive: true });
  fs.rmSync(path.join(first, 'manifest.json'));
  fs.rmSync(path.join(second, 'manifest.json'));
  const result = run(['repair', workspace, '--dry-run', '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Multiple Niuma harnesses found/);
});

test('repair does not treat an ordinary docs directory as a damaged harness', () => {
  const workspace = tempDir();
  fs.mkdirSync(path.join(workspace, 'docs', 'layers'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'docs', 'layers', '07-loop.md'), 'ordinary notes\n');
  const result = run(['repair', workspace, '--dry-run', '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /No Niuma harness found/);
});

test('repair refuses to act as init when no harness exists', () => {
  const workspace = tempDir();
  const result = run(['repair', workspace, '--dry-run', '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /No Niuma harness found/);
});

