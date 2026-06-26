const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const root = __dirname;
const node = process.execPath;

function run(args, options = {}) {
  return spawnSync(node, [path.join(root, 'install'), ...args], {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-init-'));
}

function assertFile(filePath) {
  assert.ok(fs.existsSync(filePath), `${filePath} should exist`);
}

{
  const workspace = makeTempDir();
  const target = path.join(workspace, 'harness');
  const result = run([workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(target, 'AGENTS.md'));
  assertFile(path.join(target, 'HARNESS_GUIDE.md'));
  assertFile(path.join(target, 'docs', 'index.md'));
  assertFile(path.join(target, 'docs', 'rules', 'web', 'testing.md'));
  assert.ok(fs.existsSync(path.join(target, 'docs', 'rules', 'common')), 'common rules directory should exist');
  assert.ok(fs.existsSync(path.join(target, 'docs', 'rules', 'java')), 'java rules directory should exist');
  assert.ok(fs.existsSync(path.join(target, 'docs', 'rules', 'web')), 'web rules directory should exist');
  assert.ok(
    fs.readFileSync(path.join(target, 'docs', 'rules', 'web', 'testing.md'), 'utf8').length > 0,
    'rules should be copied by default',
  );
  assert.ok(
    fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8').includes('根目录 `AGENTS.md`'),
    'AGENTS.md should point to itself as the root entry',
  );
  assert.ok(!fs.existsSync(path.join(target, 'CLAUDE.md')), 'CLAUDE.md should not be created for codex');
}

{
  const workspace = makeTempDir();
  const target = path.join(workspace, 'harness');
  const result = run([workspace, '--agent=claude', '--rules', 'empty']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(target, 'CLAUDE.md'));
  assert.strictEqual(
    fs.readFileSync(path.join(target, 'docs', 'rules', 'web', 'testing.md'), 'utf8').length,
    0,
    'rules should stay empty when --rules empty is used',
  );
  assert.ok(
    fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8').includes('根目录 `CLAUDE.md`'),
    'CLAUDE.md should point to itself as the root entry',
  );
  assert.ok(!fs.existsSync(path.join(target, 'AGENTS.md')), 'AGENTS.md should not be created for claude');
}

{
  const workspace = makeTempDir();
  const result = run([workspace, '--agent', 'codex', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(workspace, 'harness', 'AGENTS.md')), 'dry-run should not write files');
}

{
  const target = makeTempDir();
  const result = run([target, '--agent', 'codex', '--flat']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(target, 'AGENTS.md'));
  assert.ok(!fs.existsSync(path.join(target, 'harness', 'AGENTS.md')), '--flat should not create nested harness directory');
}

{
  const workspace = makeTempDir();
  fs.mkdirSync(path.join(workspace, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'docs', 'old.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(workspace, 'HARNESS_GUIDE.md'), 'legacy', 'utf8');

  const result = run([workspace, '--agent', 'codex']);
  assert.notStrictEqual(result.status, 0, 'legacy root files should stop installation by default');
  assert.ok(!fs.existsSync(path.join(workspace, 'harness')), 'installation should stop before creating harness');
  assertFile(path.join(workspace, 'docs', 'old.md'));
  assertFile(path.join(workspace, 'AGENTS.md'));
}

{
  const workspace = makeTempDir();
  fs.mkdirSync(path.join(workspace, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'docs', 'old.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), 'legacy', 'utf8');

  const result = run([workspace, '--agent', 'codex', '--keep-legacy-root']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
  assertFile(path.join(workspace, 'docs', 'old.md'));
  assertFile(path.join(workspace, 'AGENTS.md'));
}

{
  const workspace = makeTempDir();
  fs.mkdirSync(path.join(workspace, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'docs', 'old.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(workspace, 'CLAUDE.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(workspace, 'HARNESS_GUIDE.md'), 'legacy', 'utf8');

  const result = run([workspace, '--agent', 'codex', '--cleanup-legacy-root']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'AGENTS.md'));
  assert.ok(!fs.existsSync(path.join(workspace, 'docs')), 'legacy root docs should be removed');
  assert.ok(!fs.existsSync(path.join(workspace, 'AGENTS.md')), 'legacy root AGENTS.md should be removed');
  assert.ok(!fs.existsSync(path.join(workspace, 'CLAUDE.md')), 'legacy root CLAUDE.md should be removed');
  assert.ok(!fs.existsSync(path.join(workspace, 'HARNESS_GUIDE.md')), 'legacy root HARNESS_GUIDE.md should be removed');
}

console.log('install tests passed');
