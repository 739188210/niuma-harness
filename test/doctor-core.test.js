const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  assertFile,
  assertNoPath,
  fs,
  getCommandId,
  path,
  read,
  readJson,
  run,
  tempDir,
  updateManifest,
} = require('./helpers');

const primaryCommand = allCommandFiles[0];
const primaryCommandId = getCommandId(primaryCommand);
const primarySkill = allSkillDirs[0];

test('doctor passes on a valid harness', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /OK manifest\.json/);
  assert.match(result.stdout, /OK docs\/layers\/01-context\.md/);
  assert.match(result.stdout, /OK docs\/policy\/action-boundary\.md/);
  assert.match(result.stdout, /OK docs\/policy\/untrusted-content\.md/);
  assert.match(result.stdout, /OK docs\/process\/refactor\.md/);
  assert.match(result.stdout, /OK docs\/process\/review\.md/);
  assert.match(result.stdout, /OK docs\/process\/release\.md/);
  assert.match(result.stdout, /OK agent-work\//);
  assert.match(result.stdout, /OK agent-work\/README\.md/);
  assert.match(result.stdout, /OK agent-work\/tasks\//);
});

test('check alias runs the same validation', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['check', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
});

test('doctor accepts workspace and direct harness aliases', (t) => {
  const root = tempDir();
  const workspace = path.join(root, 'workspace');
  fs.mkdirSync(workspace);
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);

  const workspaceAlias = path.join(root, 'workspace-alias');
  const harnessAlias = path.join(root, 'harness-alias');
  try {
    fs.symlinkSync(workspace, workspaceAlias, process.platform === 'win32' ? 'junction' : 'dir');
    fs.symlinkSync(path.join(workspace, 'harness'), harnessAlias, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }

  result = run(['doctor', workspaceAlias]);
  assert.strictEqual(result.status, 0, result.stdout);
  result = run(['doctor', harnessAlias]);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor works when pointed at the harness subdir', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', path.join(workspace, 'harness')]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
});

test('doctor works with a custom harness-dir', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'multi', '--harness-dir', 'ai-harness']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
});

test('doctor fails without a manifest', () => {
  const workspace = tempDir();
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail without manifest');
  assert.match(result.stdout, /missing manifest\.json/);
});

test('doctor fails on invalid JSON manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(path.join(workspace, 'harness', 'manifest.json'), '{bad json', 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail on invalid JSON');
  assert.match(result.stdout, /invalid manifest\.json/);
});

test('doctor fails when an entry file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'CLAUDE.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when entry file is missing');
  assert.match(result.stdout, /missing entry file CLAUDE\.md/);
});

test('doctor fails when a layer memo is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'layers', '05-recovery.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a layer memo is missing');
  assert.match(result.stdout, /missing docs\/layers\/05-recovery\.md/);
});

test('doctor fails when action-boundary is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'policy', 'action-boundary.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when action boundary policy is missing');
  assert.match(result.stdout, /missing docs\/policy\/action-boundary\.md/);
});

test('doctor fails when secret-leak is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'policy', 'secret-leak.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when secret leak policy is missing');
  assert.match(result.stdout, /missing docs\/policy\/secret-leak\.md/);
});

test('doctor fails when untrusted-content is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'policy', 'untrusted-content.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when untrusted content policy is missing');
  assert.match(result.stdout, /missing docs\/policy\/untrusted-content\.md/);
});

test('doctor fails when a process playbook is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'process', 'review.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a process playbook is missing');
  assert.match(result.stdout, /missing docs\/process\/review\.md/);
});

test('doctor checks templateFiles declared in package manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'index.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a manifest template file is missing');
  assert.match(result.stdout, /missing docs\/index\.md/);
});

test('doctor fails when agent-work is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, 'agent-work'), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work is missing');
  assert.match(result.stdout, /missing agent-work\//);
});

test('doctor fails when agent-work README is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'agent-work', 'README.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work README is missing');
  assert.match(result.stdout, /missing agent-work\/README\.md/);
});

test('doctor fails when agent-work tasks directory is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, 'agent-work', 'tasks'), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work tasks directory is missing');
  assert.match(result.stdout, /missing agent-work\/tasks\//);
});

test('doctor fails when workDir is missing from manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    delete manifest.workDir;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when workDir is missing');
  assert.match(result.stdout, /missing workDir/);
});

