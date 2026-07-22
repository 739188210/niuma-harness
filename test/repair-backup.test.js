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

test('repair -y backs up all affected targets and finishes doctor-green', () => {
  const workspace = initWorkspace('multi');
  const entry = path.join(workspace, 'CLAUDE.md');
  const command = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  fs.writeFileSync(entry, '<!-- niuma-harness:contract begin -->\nuser content', 'utf8');
  fs.appendFileSync(command, 'user command change\n');

  let result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repair completed\. Doctor passed/);
  const match = result.stdout.match(/Backup retained: (.+)/);
  assert.ok(match, result.stdout);
  const backup = match[1].trim();
  assert.strictEqual(read(path.join(backup, 'files', 'CLAUDE.md')), '<!-- niuma-harness:contract begin -->\nuser content');
  assert.match(read(path.join(backup, 'files', '.claude', 'commands', allCommandFiles[0])), /user command change/);
  assert.strictEqual(readJson(path.join(backup, 'repair-manifest.json')).verified, true);
  result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('repair restores the managed decision guide without touching project ADRs', () => {
  const workspace = initWorkspace();
  const decisions = path.join(workspace, 'harness', 'docs', 'decisions');
  const guide = path.join(decisions, 'README.md');
  const projectAdr = path.join(decisions, '0001-example.md');
  const projectAdrContent = '# Project ADR\n\nKeep this project record unchanged.\n';
  fs.writeFileSync(projectAdr, projectAdrContent, 'utf8');
  fs.appendFileSync(guide, 'drift\n', 'utf8');

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /harness\/docs\/decisions\/README\.md/);
  assert.doesNotMatch(result.stdout, /0001-example\.md/);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repair completed\. Doctor passed/);
  assert.strictEqual(read(projectAdr), projectAdrContent);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair restores the managed experience guide without touching project experience records', () => {
  const workspace = initWorkspace();
  const experience = path.join(workspace, 'harness', 'docs', 'experience');
  const guide = path.join(experience, 'README.md');
  const projectRecord = path.join(experience, 'pagination.md');
  const projectRecordContent = '# Pagination lesson\n\nKeep this project record unchanged.\n';
  fs.writeFileSync(projectRecord, projectRecordContent, 'utf8');
  fs.appendFileSync(guide, 'drift\n', 'utf8');

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /harness\/docs\/experience\/README\.md/);
  assert.doesNotMatch(result.stdout, /pagination\.md/);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repair completed\. Doctor passed/);
  assert.strictEqual(read(projectRecord), projectRecordContent);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair leaves user-only OpenCode config byte-identical when no managed rule paths are desired', () => {
  const workspace = initWorkspace('claude');
  const configPath = path.join(workspace, 'opencode.json');
  const raw = '{\n  "instructions" : { "custom": true },\n  "theme": "user"\n}\n';
  fs.writeFileSync(configPath, raw);
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), raw);
});

test('repair leaves custom non-string OpenCode instructions byte-identical without Niuma markers', () => {
  const workspace = initWorkspace('claude');
  const configPath = path.join(workspace, 'opencode.json');
  const raw = '{"instructions":[{"file":"custom.md"}],"other":7}\n';
  fs.writeFileSync(configPath, raw);
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), raw);
});

test('repair ignores marker-looking text outside supported OpenCode instructions', () => {
  const workspace = initWorkspace('claude');
  const configPath = path.join(workspace, 'opencode.json');
  const raw = '{\n  "instructions": {"file": "custom.md"},\n  "note": "<!-- niuma-harness:rules begin --> unrelated text"\n}\n';
  fs.writeFileSync(configPath, raw);
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), raw);
});

for (const [label, instructions] of [
  ['object', { file: 'custom.md' }],
  ['mixed-type array', ['custom.md', { file: 'other.md' }]],
]) {
  test(`repair recovers active OpenCode ${label} instructions through full backup`, () => {
    const workspace = initWorkspace('opencode');
    const configPath = path.join(workspace, 'opencode.json');
    const raw = `${JSON.stringify({ instructions, theme: 'user' }, null, 2)}\n`;
    fs.writeFileSync(configPath, raw);
    const before = snapshotTree(workspace);

    let result = run(['repair', workspace, '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /INVALID-INSTRUCTIONS \[adapters\]/);
    assert.match(result.stdout, /BACKUP\s+opencode\.json/);
    assert.deepStrictEqual(snapshotTree(workspace), before);

    result = run(['repair', workspace, '-y']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /Repair completed\. Doctor passed/);
    const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
    assert.strictEqual(read(path.join(backup, 'files', 'opencode.json')), raw);
    const repaired = readJson(configPath);
    assert.strictEqual(repaired.theme, 'user');
    assert.ok(Array.isArray(repaired.instructions));
    assert.ok(repaired.instructions.every((item) => typeof item === 'string'));
    assert.ok(repaired.instructions.includes('.opencode/rules/common/testing.md'));
    assert.strictEqual(run(['doctor', workspace]).status, 0);
  });
}

test('repair preserves user ownership for a canonical-looking OpenCode path', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  const userPath = '.opencode/rules/common/testing.md';
  fs.writeFileSync(configPath, `${JSON.stringify({ instructions: [userPath, 'docs/team.md'] }, null, 2)}\n`);

  let result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  delete manifest.createdBy;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  result = run([
    'repair', workspace, '-y', '--agent', 'opencode',
    '--rules', 'common', '--skills', 'none',
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!readJson(manifestPath).openCodeInstructions.includes(userPath));

  result = run(['init', workspace, '--agent', 'opencode', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(readJson(configPath).instructions.includes(userPath));
});

test('repair preserves local config and unknown skill files', () => {
  const workspace = initWorkspace('claude');
  const root = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
  fs.writeFileSync(path.join(root, 'zentao.config.json'), '{"local":true}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'notes.md'), 'keep\n', 'utf8');
  fs.appendFileSync(path.join(root, 'SKILL.md'), 'drift\n');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(path.join(root, 'zentao.config.json')), '{"local":true}\n');
  assert.strictEqual(read(path.join(root, 'notes.md')), 'keep\n');
});

test('repair replaces internal symlink without touching its target', (t) => {
  const workspace = initWorkspace('claude');
  const outside = tempDir();
  fs.writeFileSync(path.join(outside, 'keep.txt'), 'outside\n', 'utf8');
  const commandRoot = path.join(workspace, '.claude', 'commands');
  fs.rmSync(commandRoot, { recursive: true });
  try {
    fs.symlinkSync(outside, commandRoot, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  const match = result.stdout.match(/Backup retained: (.+)/);
  assert.ok(match, result.stdout);
  const backupCommandRoot = path.join(match[1].trim(), 'files', '.claude', 'commands');
  assert.ok(fs.lstatSync(backupCommandRoot).isSymbolicLink());
  assert.strictEqual(fs.readlinkSync(backupCommandRoot), outside);
  assert.strictEqual(read(path.join(outside, 'keep.txt')), 'outside\n');
  assert.ok(fs.lstatSync(commandRoot).isDirectory());
  assert.ok(!fs.lstatSync(commandRoot).isSymbolicLink());
});



test('repair backs up and replaces a file-directory type conflict', () => {
  const workspace = initWorkspace();
  const target = path.join(workspace, 'harness', 'docs', 'project-context.md');
  fs.rmSync(target);
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'user.txt'), 'user data\n', 'utf8');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(fs.lstatSync(target).isFile());
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.strictEqual(read(path.join(backup, 'files', 'harness', 'docs', 'project-context.md', 'user.txt')), 'user data\n');
});

test('repair retires only the managed contract from an inactive entry', () => {
  const workspace = initWorkspace('multi');
  const inactive = path.join(workspace, 'AGENTS.md');
  const original = read(inactive);
  const userContent = '\n\n# User notes\nkeep this exactly\n';
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.agent = 'claude';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(inactive, original + userContent);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  const retired = read(inactive);
  assert.ok(retired.endsWith(userContent));
  assert.doesNotMatch(retired, /niuma-harness:contract/);
});

test('repair removes untouched generated-only inactive entry', () => {
  const workspace = initWorkspace('multi');
  const inactive = path.join(workspace, 'AGENTS.md');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.agent = 'claude';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(inactive);
});

test('repair preserves inactive entry with no contract', () => {
  const workspace = initWorkspace('multi');
  const inactive = path.join(workspace, 'AGENTS.md');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.agent = 'claude';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(inactive, '# User-only instructions\n');

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(inactive), '# User-only instructions\n');
});

test('repair neutralizes ambiguous inactive markers without deleting recoverable content', () => {
  const workspace = initWorkspace('multi');
  const inactive = path.join(workspace, 'AGENTS.md');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.agent = 'claude';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const damaged = '<!-- niuma-harness:contract begin -->\nmanaged-looking text\n# User notes\nkeep me\n';
  fs.writeFileSync(inactive, damaged);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(read(inactive), /managed-looking text/);
  assert.match(read(inactive), /# User notes\nkeep me/);
  assert.doesNotMatch(read(inactive), /niuma-harness:contract/);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.strictEqual(read(path.join(backup, 'files', 'AGENTS.md')), damaged);
});

