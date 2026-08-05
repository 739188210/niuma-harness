const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  fs,
  path,
  read,
  run,
  tempDir,
  updateManifest,
} = require('../support/helpers');
const { initWorkspace } = require('../support/cli-fixtures');

function doctor(workspace, extra = []) {
  return run(['doctor', workspace, ...extra]);
}

function expectDoctorError(workspace, pattern, extra = []) {
  const result = doctor(workspace, extra);
  assert.notStrictEqual(result.status, 0, 'doctor should fail');
  assert.match(result.stdout, pattern);
  return result;
}

function append(filePath, content = '\nDRIFT\n') {
  fs.appendFileSync(filePath, content, 'utf8');
}

test('doctor ignores legacy process files but detects drift in active managed core and work templates', () => {
  const workspace = initWorkspace();
  const legacyBootstrap = path.join(workspace, 'harness', 'docs', 'process', 'bootstrap.md');
  fs.mkdirSync(path.dirname(legacyBootstrap), { recursive: true });
  fs.writeFileSync(legacyBootstrap, '# Legacy bootstrap notes\n\nKeep this project-owned file.\n', 'utf8');
  append(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'));
  append(path.join(workspace, 'harness', 'docs', 'layers', '03-process.md'));
  append(path.join(workspace, 'agent-work', 'README.md'));
  const result = expectDoctorError(workspace, /managed content drifted docs\/layers\/01-context\.md/);
  assert.match(result.stdout, /managed content drifted docs\/layers\/03-process\.md/);
  assert.match(result.stdout, /managed content drifted agent-work\/README\.md/);
  assert.doesNotMatch(result.stdout, /bootstrap\.md/);
});

test('doctor detects experience-guide drift but ignores project-maintained experience records', () => {
  const workspace = initWorkspace();
  const experience = path.join(workspace, 'harness', 'docs', 'experience');
  const projectRecord = path.join(experience, 'pagination.md');
  fs.writeFileSync(projectRecord, '# Pagination lesson\n\nInitial project experience.\n', 'utf8');
  fs.appendFileSync(projectRecord, 'Updated project experience.\n', 'utf8');
  let result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);

  append(path.join(experience, 'README.md'));
  result = expectDoctorError(workspace, /managed content drifted docs\/experience\/README\.md/);
  assert.doesNotMatch(result.stdout, /pagination\.md/);
});

test('doctor excludes user-maintained project context entry free content local config and unknown files', () => {
  const workspace = initWorkspace('claude', ['--skills', 'zentao-bug-workflow']);
  append(path.join(workspace, 'harness', 'docs', 'project-context.md'));
  append(path.join(workspace, 'CLAUDE.md'), '\nUser free content\n');
  fs.writeFileSync(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'zentao.config.json'), '{"local":true}\n', 'utf8');
  fs.writeFileSync(path.join(workspace, 'unknown.txt'), 'unknown\n', 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor rejects managed content reached through a parent symlink', () => {
  const workspace = initWorkspace();
  const docsRoot = path.join(workspace, 'harness', 'docs');
  const outside = path.join(tempDir(), 'docs');
  fs.cpSync(docsRoot, outside, { recursive: true });
  fs.rmSync(docsRoot, { recursive: true, force: true });
  fs.symlinkSync(outside, docsRoot, process.platform === 'win32' ? 'junction' : 'dir');
  expectDoctorError(workspace, /Refusing to write through symlink/);
});

test('doctor rejects inactive entry contracts but allows user-only inactive entries', () => {
  const workspace = initWorkspace();
  fs.copyFileSync(path.join(workspace, 'CLAUDE.md'), path.join(workspace, 'AGENTS.md'));
  expectDoctorError(workspace, /stale contract zone in AGENTS\.md/);
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), 'user notes\n', 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor rejects a drifted inactive entry contract', () => {
  const workspace = initWorkspace();
  const drifted = read(path.join(workspace, 'CLAUDE.md'))
    .replace('Niuma Harness — Operating Contract', 'Niuma Harness — Drifted Loop');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), drifted, 'utf8');
  expectDoctorError(workspace, /stale contract zone in AGENTS\.md/);
});

test('direct doctor ignores inactive entry contracts owned by another harness directory', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const otherHarnessEntry = read(path.join(workspace, 'CLAUDE.md'))
    .replaceAll('ai-harness/', 'harness/');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), otherHarnessEntry, 'utf8');
  result = doctor(path.join(workspace, 'ai-harness'));
  assert.strictEqual(result.status, 0, result.stdout);
});

test('direct doctor ignores an inactive Codex entry contract owned by another harness directory', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const codexWorkspace = tempDir();
  result = run(['init', codexWorkspace, '--agent', 'codex', '--harness-dir', 'harness', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), read(path.join(codexWorkspace, 'AGENTS.md')), 'utf8');

  result = doctor(path.join(workspace, 'ai-harness'));
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor reports a non-file inactive entry without crashing', () => {
  const workspace = initWorkspace();
  fs.mkdirSync(path.join(workspace, 'AGENTS.md'));
  const result = expectDoctorError(workspace, /not a regular file entry file AGENTS\.md/);
  assert.strictEqual(result.stderr, '');
});

test('doctor ignores OpenCode fields and user instruction paths', () => {
  const workspace = initWorkspace('opencode');
  const configPath = path.join(workspace, 'opencode.json');
  const config = JSON.parse(read(configPath));
  config.theme = 'user-theme';
  config.instructions = ['docs/team-rules.md', ...config.instructions, 'https://example.com/rules.md'];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});
