const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const bin = path.join(root, 'bin', 'niuma-harness.js');

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

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'harness', 'HARNESS_GUIDE.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'index.md'));
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'AGENTS.md')), 'claude should not create AGENTS.md');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'CLAUDE.md')), 'codex should not create CLAUDE.md');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const rule = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  assertFile(rule);
  assert.ok(read(rule).length > 0, 'copy rules should contain starter content');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--rules', 'empty']);
  assert.strictEqual(result.status, 0, result.stderr);
  const rule = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  assertFile(rule);
  assert.strictEqual(read(rule).length, 0, 'empty rules should create empty files');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'CLAUDE.md')), 'dry-run should not write files');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--flat']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'CLAUDE.md')), 'flat should not create nested harness');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'ai-harness', 'CLAUDE.md'));
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--harness-dir', '.']);
  assert.notStrictEqual(result.status, 0, '--harness-dir . should fail');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--harness-dir', '../outside']);
  assert.notStrictEqual(result.status, 0, '--harness-dir with traversal should fail');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude', '--harness-dir', 'bad/name']);
  assert.notStrictEqual(result.status, 0, '--harness-dir with path separator should fail');
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness', 'CLAUDE.md');
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, 'custom', 'utf8');
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(targetFile), 'custom', 'existing files should be skipped without force');
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness', 'CLAUDE.md');
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, 'custom', 'utf8');
  const result = run(['init', workspace, '--tool', 'claude', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.notStrictEqual(read(targetFile), 'custom', 'force should overwrite existing files');
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
    const result = run(['init', workspace, '--tool', 'claude']);
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
    const result = run(['init', workspace, '--tool', 'claude', '--force']);
    assert.notStrictEqual(result.status, 0, 'file symlink with force should fail');
    assert.strictEqual(read(target), 'outside', 'symlink target should not be overwritten');
  }
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness');
  fs.writeFileSync(targetFile, 'not a directory', 'utf8');
  const result = run(['init', workspace, '--tool', 'claude']);
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
  assert.notStrictEqual(result.status, 0, 'missing tool should fail in non-TTY');
  assert.match(result.stderr, /Missing --tool/);
}

{
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness init/);
}

{
  const result = run(['init', '--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /--tool/);
}

console.log('cli tests passed');
