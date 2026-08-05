const test = require('node:test');
const { digestBytes } = require('../../src/artifact/ledger');
const { canonicalizeWorkspacePath } = require('../../src/infrastructure/fs-safe');
const {
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
} = require('../support/helpers');
const { initWorkspace } = require('../support/cli-fixtures');

test('repair -y backs up all affected targets and finishes doctor-green', () => {
  const workspace = initWorkspace('multi');
  const entry = path.join(workspace, 'CLAUDE.md');
  const core = path.join(workspace, 'harness', 'docs', 'layers', '01-context.md');
  fs.writeFileSync(entry, '<!-- niuma-harness:contract begin -->\nuser content', 'utf8');
  fs.appendFileSync(core, 'user core change\n');

  let result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repair completed\. Doctor passed/);
  const match = result.stdout.match(/Backup retained: (.+)/);
  assert.ok(match, result.stdout);
  const backup = match[1].trim();
  assert.strictEqual(read(path.join(backup, 'files', 'CLAUDE.md')), '<!-- niuma-harness:contract begin -->\nuser content');
  assert.match(read(path.join(backup, 'files', 'harness', 'docs', 'layers', '01-context.md')), /user core change/);
  assert.strictEqual(readJson(path.join(backup, 'repair-manifest.json')).verified, true);
  result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stdout);
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
  fs.appendFileSync(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'), 'drift');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), raw);
});

test('repair leaves custom non-string OpenCode instructions byte-identical without Niuma markers', () => {
  const workspace = initWorkspace('claude');
  const configPath = path.join(workspace, 'opencode.json');
  const raw = '{"instructions":[{"file":"custom.md"}],"other":7}\n';
  fs.writeFileSync(configPath, raw);
  fs.appendFileSync(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'), 'drift');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), raw);
});

test('repair ignores marker-looking text outside supported OpenCode instructions', () => {
  const workspace = initWorkspace('claude');
  const configPath = path.join(workspace, 'opencode.json');
  const raw = '{\n  "instructions": {"file": "custom.md"},\n  "note": "<!-- niuma-harness:rules begin --> unrelated text"\n}\n';
  fs.writeFileSync(configPath, raw);
  fs.appendFileSync(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'), 'drift');
  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), raw);
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

test('repair leaves a legacy process file and project context unchanged without planning or backing either up', () => {
  const workspace = initWorkspace();
  const facts = path.join(workspace, 'harness', 'docs', 'project-context.md');
  const legacyBootstrap = path.join(workspace, 'harness', 'docs', 'process', 'bootstrap.md');
  const factsContent = '# Project facts\n\nKeep this user content.\n';
  const legacyContent = '# Legacy bootstrap notes\n\nKeep this unchanged.\n';
  fs.writeFileSync(facts, factsContent, 'utf8');
  fs.mkdirSync(path.dirname(legacyBootstrap), { recursive: true });
  fs.writeFileSync(legacyBootstrap, legacyContent, 'utf8');
  fs.appendFileSync(path.join(workspace, 'harness', 'docs', 'layers', '03-process.md'), 'drift\n', 'utf8');

  let result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /harness\/docs\/layers\/03-process\.md/);
  assert.doesNotMatch(result.stdout, /bootstrap\.md/);
  assert.doesNotMatch(result.stdout, /project-context\.md/);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(facts), factsContent);
  assert.strictEqual(read(legacyBootstrap), legacyContent);
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assertNoPath(path.join(backup, 'files', 'harness', 'docs', 'process', 'bootstrap.md'));
  assertNoPath(path.join(backup, 'files', 'harness', 'docs', 'project-context.md'));
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair preserves a legacy four-column context coverage table and custom facts byte-identically', () => {
  const workspace = initWorkspace();
  const facts = path.join(workspace, 'harness', 'docs', 'project-context.md');
  const factsContent = `# Project Context

## Context coverage

| Scope | Status | Primary sources | Known gap |
| --- | --- | --- | --- |
| Build and verification commands | verified | package.json scripts | Smoke tests must be run manually. |
| Deployment ownership | partial | ops/runbook.md | Staging ownership is not documented. |

## Custom facts

- Production releases are approved by the platform team.
- The legacy integration still uses the blue queue.
`;
  assert.doesNotMatch(factsContent, /Refresh when/);
  fs.writeFileSync(facts, factsContent, 'utf8');
  fs.appendFileSync(path.join(workspace, 'harness', 'docs', 'layers', '03-process.md'), 'drift\n', 'utf8');

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repair completed\. Doctor passed/);
  assert.strictEqual(read(facts), factsContent, 'user-managed legacy project-context content must remain byte-identical');
  const backup = result.stdout.match(/Backup retained: (.+)/)[1].trim();
  assertNoPath(path.join(backup, 'files', 'harness', 'docs', 'project-context.md'));
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair retires only the managed contract from an inactive entry', () => {
  const workspace = initWorkspace('multi');
  const inactive = path.join(workspace, 'AGENTS.md');
  const original = read(inactive);
  const userContent = '\n\n# User notes\nkeep this exactly\n';
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.agent = 'claude';
  manifest.entryFiles = ['CLAUDE.md'];
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
  manifest.entryFiles = ['CLAUDE.md'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(inactive);
});

test('repair removes an untouched Codex-guided inactive entry', () => {
  const workspace = initWorkspace('multi');
  const inactive = path.join(workspace, 'AGENTS.md');
  assert.match(read(inactive), /Codex engineering rules/);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.agent = 'claude';
  manifest.entryFiles = ['CLAUDE.md'];
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
  manifest.entryFiles = ['CLAUDE.md'];
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
  manifest.entryFiles = ['CLAUDE.md'];
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

