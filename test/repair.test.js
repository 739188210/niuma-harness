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

function initWorkspace(agent = 'claude') {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', agent]);
  assert.strictEqual(result.status, 0, result.stderr);
  return workspace;
}

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
    assert.ok(repaired.instructions.includes('harness/docs/rules/common/testing.md'));
    assert.ok(repaired.instructions.includes('harness/docs/rules/opencode/automation.md'));
    assert.strictEqual(run(['doctor', workspace]).status, 0);
  });
}

test('repair preserves user ownership for a canonical-looking OpenCode path', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  const userPath = 'harness/docs/rules/common/testing.md';
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
  assert.deepStrictEqual(manifest.rules, ['common', 'claude']);
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

test('repair rejects arbitrary content in the former damaged-harness marker files', () => {
  const target = tempDir();
  fs.mkdirSync(path.join(target, 'docs', 'layers'), { recursive: true });
  fs.writeFileSync(path.join(target, 'HARNESS_GUIDE.md'), 'unrelated guide\n');
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

test('repair restores an owned drifted selected rule with backup and Doctor-green ledger', () => {
  const workspace = initWorkspace('claude');
  const relative = path.join('harness', 'docs', 'rules', 'common', 'testing.md');
  const target = path.join(workspace, relative);
  const damaged = 'locally changed owned rule\n';
  fs.writeFileSync(target, damaged);

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /owned rule artifact differs from canonical content/i);
  assert.match(result.stdout, /BACKUP\s+harness\/docs\/rules\/common\/testing\.md/);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.strictEqual(read(path.join(backup, 'files', relative)), damaged);
  assert.notStrictEqual(read(target), damaged);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair restores a modified legacy selected rule and distinguishes it from owned drift', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const targetRecord = manifest.artifacts.find((record) => record.target === 'harness/docs/rules/common/testing.md');
  manifest.artifacts = manifest.artifacts.filter((record) => record !== targetRecord);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const target = path.join(workspace, ...targetRecord.target.split('/'));
  fs.writeFileSync(target, 'modified legacy rule\n');

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /modified legacy rule differs from canonical content/i);
  assert.match(result.stdout, /BACKUP\s+harness\/docs\/rules\/common\/testing\.md/);
});

test('repair recreates a missing selected rule and its ledger record', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  fs.rmSync(target);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(fs.lstatSync(target).isFile());
  const record = readJson(path.join(workspace, 'harness', 'manifest.json')).artifacts
    .find((item) => item.target === 'harness/docs/rules/common/testing.md');
  assert.ok(record);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair fixes a missing rule ledger record without rewriting or backing up canonical bytes', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  const before = fs.readFileSync(target);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.artifacts = manifest.artifacts.filter((record) => record.target !== 'harness/docs/rules/common/testing.md');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(fs.readFileSync(target), before);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assertNoPath(path.join(backup, 'files', 'harness', 'docs', 'rules', 'common', 'testing.md'));
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair removes only stale deselected ledger-owned exact files and preserves unknown siblings', () => {
  const workspace = initWorkspace('claude');
  const rulesRoot = path.join(workspace, 'harness', 'docs', 'rules');
  const stale = path.join(rulesRoot, 'common', 'testing.md');
  const staleBytes = fs.readFileSync(stale);
  const unknown = path.join(rulesRoot, 'common', 'local.md');
  fs.writeFileSync(unknown, 'keep local sibling\n');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = manifest.rules.filter((rule) => rule !== 'common');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(stale);
  assert.strictEqual(read(unknown), 'keep local sibling\n');
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.deepStrictEqual(fs.readFileSync(path.join(backup, 'files', 'harness', 'docs', 'rules', 'common', 'testing.md')), staleBytes);
  assert.ok(fs.lstatSync(path.dirname(unknown)).isDirectory());
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair preserves a deselected rule file when its bytes no longer match its ownership record', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  fs.writeFileSync(target, 'user-modified stale rule\n');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = manifest.rules.filter((rule) => rule !== 'common');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(target), 'user-modified stale rule\n');
  assert.doesNotMatch(result.stdout, /REMOVE\s+harness\/docs\/rules\/common\/testing\.md/);
});

test('repair preserves an unowned inactive-agent command in a Claude workspace', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, '.opencode', 'commands', 'dev-check.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'user-owned OpenCode command\n');

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /stale-command|REMOVE\s+\.opencode\/commands\/dev-check\.md/i);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(target), 'user-owned OpenCode command\n');
});

test('repair removes an exact-owned rule whose package template was removed', () => {
  const cliRoot = copyCliPackage();
  const workspace = tempDir();
  let result = runWithCliRoot(cliRoot, ['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const relative = 'harness/docs/rules/common/testing.md';
  const target = path.join(workspace, ...relative.split('/'));
  const original = fs.readFileSync(target);
  fs.rmSync(path.join(cliRoot, 'templates', 'rules', 'common', 'testing.md'));

  result = runWithCliRoot(cliRoot, ['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /run repair --dry-run/i);

  result = runWithCliRoot(cliRoot, ['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /stale-rule/i);
  assert.match(result.stdout, /REMOVE\s+harness\/docs\/rules\/common\/testing\.md/);

  result = runWithCliRoot(cliRoot, ['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(target);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.deepStrictEqual(fs.readFileSync(path.join(backup, 'files', ...relative.split('/'))), original);
  assert.strictEqual(runWithCliRoot(cliRoot, ['doctor', workspace]).status, 0);
});

test('repair preserves and reports a drifted rule whose package template was removed', () => {
  const cliRoot = copyCliPackage();
  const workspace = tempDir();
  let result = runWithCliRoot(cliRoot, ['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const relative = 'harness/docs/rules/common/testing.md';
  const target = path.join(workspace, ...relative.split('/'));
  fs.writeFileSync(target, 'user-modified obsolete rule\n');
  fs.rmSync(path.join(cliRoot, 'templates', 'rules', 'common', 'testing.md'));

  result = runWithCliRoot(cliRoot, ['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /stale-rule.*drift|drifted obsolete rule/is);
  assert.doesNotMatch(result.stdout, /REMOVE\s+harness\/docs\/rules\/common\/testing\.md/);
  assert.strictEqual(read(target), 'user-modified obsolete rule\n');

  result = runWithCliRoot(cliRoot, ['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.strictEqual(read(target), 'user-modified obsolete rule\n');
  assert.notStrictEqual(runWithCliRoot(cliRoot, ['doctor', workspace]).status, 0);
});

test('repair removes an exact-owned deselected rule after its copied-package template changes', () => {
  const cliRoot = copyCliPackage();
  const workspace = tempDir();
  let result = runWithCliRoot(cliRoot, ['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);

  const relative = 'harness/docs/rules/common/testing.md';
  const target = path.join(workspace, ...relative.split('/'));
  const original = fs.readFileSync(target);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const record = manifest.artifacts.find((item) => item.target === relative);
  manifest.rules = manifest.rules.filter((rule) => rule !== 'common');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    path.join(cliRoot, 'templates', 'rules', 'common', 'testing.md'),
    '# Updated copied-package rule\n',
    'utf8'
  );

  assert.ok(record);
  assert.strictEqual(record.digest, digestBytes(original));
  result = runWithCliRoot(cliRoot, ['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /REMOVE\s+harness\/docs\/rules\/common\/testing\.md/);

  result = runWithCliRoot(cliRoot, ['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(target);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.deepStrictEqual(fs.readFileSync(path.join(backup, 'files', ...relative.split('/'))), original);
  assert.strictEqual(runWithCliRoot(cliRoot, ['doctor', workspace]).status, 0);
});

test('repair authorizes stale rule removal only for an exact canonical ledger tuple and digest', async (t) => {
  const cases = [
    {
      name: 'wrong kind',
      mutate(record) { record.kind = 'command'; },
    },
    {
      name: 'wrong source',
      mutate(record) { record.source = 'rules/common/security.md'; },
    },
    {
      name: 'target borrowed from another canonical rule',
      mutate(record, canonical) {
        const other = canonical.find((item) => item.target.endsWith('/security.md'));
        record.target = other.target;
        record.digest = other.digest;
      },
    },
    {
      name: 'noncanonical target with matching bytes and digest',
      mutate(record, canonical, workspace) {
        record.target = 'harness/docs/rules/common/local.md';
        const bytes = fs.readFileSync(path.join(workspace, ...canonical[0].target.split('/')));
        fs.writeFileSync(path.join(workspace, ...record.target.split('/')), bytes);
        record.digest = digestBytes(bytes);
      },
    },
    {
      name: 'wrong digest',
      mutate(record) { record.digest = digestBytes('forged rule bytes\n'); },
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      const workspace = initWorkspace('claude');
      const manifestPath = path.join(workspace, 'harness', 'manifest.json');
      const manifest = readJson(manifestPath);
      const canonical = manifest.artifacts.filter((record) => record.kind === 'rule' && record.target.includes('/common/'));
      const record = manifest.artifacts.find((item) => item.target === 'harness/docs/rules/common/testing.md');
      manifest.rules = manifest.rules.filter((rule) => rule !== 'common');
      scenario.mutate(record, canonical, workspace);
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      const target = path.join(workspace, ...record.target.split('/'));
      const before = fs.readFileSync(target);

      const result = run(['repair', workspace, '--dry-run']);
      assert.strictEqual(result.status, 0, result.stderr);
      assert.deepStrictEqual(fs.readFileSync(target), before);
      assert.doesNotMatch(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
    });
  }
});
