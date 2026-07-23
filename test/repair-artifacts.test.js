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

test('repair restores an owned drifted selected rule with backup and Doctor-green ledger', () => {
  const workspace = initWorkspace('claude');
  const relative = path.join('.claude', 'rules', 'common', 'testing.md');
  const target = path.join(workspace, relative);
  const damaged = 'locally changed owned rule\n';
  fs.writeFileSync(target, damaged);

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /owned rule artifact differs from canonical content/i);
  assert.match(result.stdout, /BACKUP\s+\.claude\/rules\/common\/testing\.md/);

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
  const targetRecord = manifest.artifacts.find((record) => record.target === '.claude/rules/common/testing.md');
  manifest.artifacts = manifest.artifacts.filter((record) => record !== targetRecord);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const target = path.join(workspace, ...targetRecord.target.split('/'));
  fs.writeFileSync(target, 'modified legacy rule\n');

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /modified legacy rule differs from canonical content/i);
  assert.match(result.stdout, /BACKUP\s+\.claude\/rules\/common\/testing\.md/);
});

test('repair recreates a missing selected rule and its ledger record', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  fs.rmSync(target);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(fs.lstatSync(target).isFile());
  const record = readJson(path.join(workspace, 'harness', 'manifest.json')).artifacts
    .find((item) => item.target === '.claude/rules/common/testing.md');
  assert.ok(record);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair fixes a missing rule ledger record without rewriting or backing up canonical bytes', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  const before = fs.readFileSync(target);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.artifacts = manifest.artifacts.filter((record) => record.target !== '.claude/rules/common/testing.md');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(fs.readFileSync(target), before);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assertNoPath(path.join(backup, 'files', '.claude', 'rules', 'common', 'testing.md'));
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair removes only stale deselected ledger-owned exact files and preserves unknown siblings', () => {
  const workspace = initWorkspace('claude');
  const rulesRoot = path.join(workspace, '.claude', 'rules');
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
  assert.deepStrictEqual(fs.readFileSync(path.join(backup, 'files', '.claude', 'rules', 'common', 'testing.md')), staleBytes);
  assert.ok(fs.lstatSync(path.dirname(unknown)).isDirectory());
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair preserves a deselected rule file when its bytes no longer match its ownership record', () => {
  const workspace = initWorkspace('claude');
  const target = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  fs.writeFileSync(target, 'user-modified stale rule\n');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = manifest.rules.filter((rule) => rule !== 'common');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(target), 'user-modified stale rule\n');
  assert.doesNotMatch(result.stdout, /REMOVE\s+\.claude\/rules\/common\/testing\.md/);
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
  const relative = '.claude/rules/common/testing.md';
  const target = path.join(workspace, ...relative.split('/'));
  const original = fs.readFileSync(target);
  fs.rmSync(path.join(cliRoot, 'templates', 'rules', 'common', 'testing.md'));

  result = runWithCliRoot(cliRoot, ['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /run repair --dry-run/i);

  result = runWithCliRoot(cliRoot, ['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /stale-rule/i);
  assert.match(result.stdout, /REMOVE\s+\.claude\/rules\/common\/testing\.md/);

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
  const relative = '.claude/rules/common/testing.md';
  const target = path.join(workspace, ...relative.split('/'));
  fs.writeFileSync(target, 'user-modified obsolete rule\n');
  fs.rmSync(path.join(cliRoot, 'templates', 'rules', 'common', 'testing.md'));

  result = runWithCliRoot(cliRoot, ['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /stale-rule.*drift|drifted obsolete rule/is);
  assert.doesNotMatch(result.stdout, /REMOVE\s+\.claude\/rules\/common\/testing\.md/);
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

  const relative = '.claude/rules/common/testing.md';
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
  assert.match(result.stdout, /REMOVE\s+\.claude\/rules\/common\/testing\.md/);

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
        record.target = '.claude/rules/common/local.md';
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
      const record = manifest.artifacts.find((item) => item.target === '.claude/rules/common/testing.md');
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

test('repair removes an exact ledger-owned deselected skill with backup', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const staleSkill = manifest.skills[0];
  const record = manifest.artifacts.find((item) => item.kind === 'skill'
    && item.target === `.claude/skills/${staleSkill}/SKILL.md`);
  const target = path.join(workspace, ...record.target.split('/'));
  const original = fs.readFileSync(target);
  manifest.skills = manifest.skills.filter((skill) => skill !== staleSkill);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(target);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assert.deepStrictEqual(fs.readFileSync(path.join(backup, 'files', ...record.target.split('/'))), original);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair preserves a modified or unledgered matching skill path', () => {
  const workspace = initWorkspace('claude', ['--skills', 'none']);
  const target = path.join(workspace, '.claude', 'skills', 'database-readonly', 'SKILL.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'user-owned matching skill\n', 'utf8');

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /REMOVE\s+\.claude\/skills\/database-readonly\/SKILL\.md/);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(target), 'user-owned matching skill\n');
});

test('repair preserves a drifted ledger-owned deselected skill', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const staleSkill = manifest.skills[0];
  const record = manifest.artifacts.find((item) => item.kind === 'skill'
    && item.target === `.claude/skills/${staleSkill}/SKILL.md`);
  const target = path.join(workspace, ...record.target.split('/'));
  manifest.skills = manifest.skills.filter((skill) => skill !== staleSkill);
  fs.writeFileSync(target, 'modified stale skill\n', 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /STALE-SKILL-DRIFT/);
  assert.doesNotMatch(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  assert.strictEqual(read(target), 'modified stale skill\n');

  result = run(['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /cannot safely resolve user-owned or drifted obsolete artifacts/i);
  assert.strictEqual(read(target), 'modified stale skill\n');
});

test('repair removes only an exact legacy Claude rule pointer', () => {
  const workspace = initWorkspace('claude', ['--rules', 'none']);
  const target = path.join(workspace, '.claude', 'rules', 'niuma-common.md');
  const { renderLegacyClaudeRulePointer } = require('../src/scaffold/rules-adapters-writer');
  const canonical = renderLegacyClaudeRulePointer('harness', 'common');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, canonical, 'utf8');

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /REMOVE\s+\.claude\/rules\/niuma-common\.md/);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(target);
});

test('repair preserves a modified legacy Claude rule pointer', () => {
  const workspace = initWorkspace('claude', ['--rules', 'none']);
  const target = path.join(workspace, '.claude', 'rules', 'niuma-common.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'user-owned pointer\n', 'utf8');

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /REMOVE\s+\.claude\/rules\/niuma-common\.md/);
  assert.strictEqual(read(target), 'user-owned pointer\n');
});

test('repair preserves matching skill files from a schema-3 manifest without skill ledger evidence', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const staleSkill = manifest.skills[0];
  const record = manifest.artifacts.find((item) => item.kind === 'skill'
    && item.target === `.claude/skills/${staleSkill}/SKILL.md`);
  const target = path.join(workspace, ...record.target.split('/'));
  const original = fs.readFileSync(target);
  manifest.schemaVersion = 3;
  manifest.skills = manifest.skills.filter((skill) => skill !== staleSkill);
  manifest.artifacts = manifest.artifacts.filter((item) => item.kind !== 'skill');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(fs.readFileSync(target), original);
  assert.strictEqual(readJson(manifestPath).schemaVersion, 4);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair does not authorize skill removal from a forged ledger tuple', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const staleSkill = manifest.skills[0];
  const record = manifest.artifacts.find((item) => item.kind === 'skill'
    && item.target === `.claude/skills/${staleSkill}/SKILL.md`);
  const target = path.join(workspace, ...record.target.split('/'));
  const original = fs.readFileSync(target);
  manifest.skills = manifest.skills.filter((skill) => skill !== staleSkill);
  record.source = 'skills/database-readonly/forged.md';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  assert.deepStrictEqual(fs.readFileSync(target), original);
});

test('repair does not authorize skill removal from a forged ledger digest', () => {
  const workspace = initWorkspace('claude');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const staleSkill = manifest.skills[0];
  const record = manifest.artifacts.find((item) => item.kind === 'skill'
    && item.target === `.claude/skills/${staleSkill}/SKILL.md`);
  const target = path.join(workspace, ...record.target.split('/'));
  const userBytes = Buffer.from('user-owned matching skill\n');
  manifest.skills = manifest.skills.filter((skill) => skill !== staleSkill);
  fs.writeFileSync(target, userBytes);
  record.digest = digestBytes(userBytes);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  assert.deepStrictEqual(fs.readFileSync(target), userBytes);
});

test('repair preserves retired skill files when their package template no longer exists', () => {
  const cliRoot = copyCliPackage();
  const workspace = tempDir();
  let result = runWithCliRoot(cliRoot, ['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  const staleSkill = manifest.skills[0];
  const record = manifest.artifacts.find((item) => item.kind === 'skill'
    && item.target === `.claude/skills/${staleSkill}/SKILL.md`);
  const target = path.join(workspace, ...record.target.split('/'));
  const original = fs.readFileSync(target);
  manifest.skills = manifest.skills.filter((skill) => skill !== staleSkill);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(cliRoot, 'templates', 'skills', staleSkill), { recursive: true, force: true });

  result = runWithCliRoot(cliRoot, ['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(`REMOVE\\s+${record.target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  assert.deepStrictEqual(fs.readFileSync(target), original);
});

test('repair removes an exact legacy Claude rule pointer for a custom harness directory', () => {
  const workspace = initWorkspace('claude', ['--harness-dir', 'ai-harness', '--rules', 'none']);
  const target = path.join(workspace, '.claude', 'rules', 'niuma-common.md');
  const { renderLegacyClaudeRulePointer } = require('../src/scaffold/rules-adapters-writer');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderLegacyClaudeRulePointer('ai-harness', 'common'), 'utf8');

  const result = run(['repair', workspace, '-y', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(target);
});

test('repair preserves directory and symlink legacy pointer targets', () => {
  const workspace = initWorkspace('claude', ['--rules', 'none']);
  const target = path.join(workspace, '.claude', 'rules', 'niuma-common.md');
  fs.mkdirSync(target, { recursive: true });
  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /REMOVE\s+\.claude\/rules\/niuma-common\.md/);
  assert.ok(fs.lstatSync(target).isDirectory());

  fs.rmSync(target, { recursive: true, force: true });
  const outside = path.join(tempDir(), 'pointer.md');
  fs.writeFileSync(outside, 'outside pointer\n', 'utf8');
  fs.symlinkSync(outside, target);
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /REMOVE\s+\.claude\/rules\/niuma-common\.md/);
  assert.ok(fs.lstatSync(target).isSymbolicLink());
});
