const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const bin = path.join(root, 'bin', 'niuma-harness.js');
const layerMemos = [
  'docs/layers/01-context/memo.md',
  'docs/layers/02-policy/memo.md',
  'docs/layers/03-process/memo.md',
  'docs/layers/04-observation/memo.md',
  'docs/layers/05-recovery/memo.md',
  'docs/layers/06-memory/memo.md',
  'docs/layers/07-loop/memo.md',
];

function run(args) {
  return spawnSync(node, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'niuma-harness-'));
}

function assertFile(filePath) {
  assert.ok(fs.existsSync(filePath), `${filePath} should exist`);
}

function assertLayerMemos(harnessRoot) {
  for (const layerMemo of layerMemos) {
    assertFile(path.join(harnessRoot, ...layerMemo.split('/')));
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(read(filePath));
}

function assertManifest(filePath, expected) {
  assertFile(filePath);
  const manifest = readJson(filePath);
  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(manifest.agent, expected.agent);
  assert.strictEqual(manifest.rules, expected.rules || 'copy');
  assert.strictEqual(manifest.harnessDir, expected.harnessDir || 'harness');
  assert.strictEqual(manifest.flat, Boolean(expected.flat));
  assert.deepStrictEqual(manifest.entryFiles, expected.entryFiles);
  assert.strictEqual(manifest.createdBy, 'niuma-harness');
  assert.ok(!Number.isNaN(Date.parse(manifest.createdAt)), 'createdAt should be an ISO date');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'harness', 'HARNESS_GUIDE.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertLayerMemos(path.join(workspace, 'harness'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'AGENTS.md')), 'claude should not create AGENTS.md');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'codex',
    entryFiles: ['AGENTS.md'],
  });
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'CLAUDE.md')), 'codex should not create CLAUDE.md');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'opencode',
    entryFiles: ['AGENTS.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'multi',
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const rule = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  assertFile(rule);
  assert.ok(read(rule).length > 0, 'copy rules should contain starter content');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'empty']);
  assert.strictEqual(result.status, 0, result.stderr);
  const rule = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  const contextMemo = path.join(workspace, 'harness', 'docs', 'layers', '01-context', 'memo.md');
  assertFile(rule);
  assert.strictEqual(read(rule).length, 0, 'empty rules should create empty files');
  assert.ok(read(contextMemo).length > 0, 'layer memos should not be emptied by --rules empty');
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    rules: 'empty',
    entryFiles: ['CLAUDE.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'CLAUDE.md')), 'dry-run should not write files');
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'manifest.json')), 'dry-run should not write manifest');
  assert.match(result.stdout, /manifest\.json/);
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--flat']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertLayerMemos(workspace);
  assertManifest(path.join(workspace, 'manifest.json'), {
    agent: 'claude',
    flat: true,
    entryFiles: ['CLAUDE.md'],
  });
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'CLAUDE.md')), 'flat should not create nested harness');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'ai-harness', 'CLAUDE.md'));
  assertManifest(path.join(workspace, 'ai-harness', 'manifest.json'), {
    agent: 'claude',
    harnessDir: 'ai-harness',
    entryFiles: ['CLAUDE.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', '.']);
  assert.notStrictEqual(result.status, 0, '--harness-dir . should fail');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', '../outside']);
  assert.notStrictEqual(result.status, 0, '--harness-dir with traversal should fail');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'bad/name']);
  assert.notStrictEqual(result.status, 0, '--harness-dir with path separator should fail');
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness', 'CLAUDE.md');
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, 'custom', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(targetFile), 'custom', 'existing files should be skipped without force');
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness', 'CLAUDE.md');
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, 'custom', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.notStrictEqual(read(targetFile), 'custom', 'force should overwrite existing files');
}

{
  const workspace = tempDir();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{"custom":true}\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(manifestPath), '{"custom":true}\n', 'existing manifest should be skipped without force');
}

{
  const workspace = tempDir();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{"custom":true}\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertManifest(manifestPath, {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
}

{
  const workspace = tempDir();
  const outside = tempDir();
  const harnessLink = path.join(workspace, 'harness');
  let created = true;
  try {
    fs.symlinkSync(outside, harnessLink, 'dir');
  } catch {
    created = false;
  }

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'directory symlink should fail');
    assert.ok(!fs.existsSync(path.join(outside, 'CLAUDE.md')), 'symlink target should not receive files');
  }
}

{
  const workspace = tempDir();
  const target = path.join(workspace, 'outside.md');
  fs.writeFileSync(target, 'outside', 'utf8');
  const harness = path.join(workspace, 'harness');
  fs.mkdirSync(harness, { recursive: true });
  const link = path.join(harness, 'CLAUDE.md');
  let created = true;
  try {
    fs.symlinkSync(target, link, 'file');
  } catch {
    created = false;
  }

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude', '--force']);
    assert.notStrictEqual(result.status, 0, 'file symlink with force should fail');
    assert.strictEqual(read(target), 'outside', 'symlink target should not be overwritten');
  }
}

{
  const workspace = tempDir();
  const outside = tempDir();
  const danglingTarget = path.join(outside, 'created-through-link.md');
  const harness = path.join(workspace, 'harness');
  fs.mkdirSync(harness, { recursive: true });
  const link = path.join(harness, 'CLAUDE.md');
  let created = true;
  try {
    fs.symlinkSync(danglingTarget, link, 'file');
  } catch {
    created = false;
  }

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'dangling file symlink should fail');
    assert.ok(!fs.existsSync(danglingTarget), 'dangling symlink target should not be created');
  }
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness');
  fs.writeFileSync(targetFile, 'not a directory', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'target harness path as file should fail');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--bad']);
  assert.notStrictEqual(result.status, 0, 'unknown option should fail');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace]);
  assert.notStrictEqual(result.status, 0, 'missing agent should fail in non-TTY');
  assert.match(result.stderr, /Missing --agent/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /OK manifest\.json/);
  assert.match(result.stdout, /OK docs\/layers\/01-context\/memo\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['check', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', path.join(workspace, 'harness')]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'multi', '--harness-dir', 'ai-harness']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
}

{
  const workspace = tempDir();
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail without manifest');
  assert.match(result.stdout, /missing manifest\.json/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(path.join(workspace, 'harness', 'manifest.json'), '{bad json', 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail on invalid JSON');
  assert.match(result.stdout, /invalid manifest\.json/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'CLAUDE.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when entry file is missing');
  assert.match(result.stdout, /missing entry file CLAUDE\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'layers', '05-recovery', 'memo.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a layer memo is missing');
  assert.match(result.stdout, /missing docs\/layers\/05-recovery\/memo\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const before = read(manifestPath);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(manifestPath), before, 'doctor should not modify manifest');
}

{
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness init/);
  assert.match(result.stdout, /niuma-harness doctor/);
}

{
  const result = run(['init', '--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /--agent/);
}

console.log('cli tests passed');
