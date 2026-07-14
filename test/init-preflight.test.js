const test = require('node:test');
const {
  allRuleDirs,
  allSkillDirs,
  assert,
  assertNoPath,
  assertTreeUnchanged,
  fs,
  path,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');

function assertFreshFailureLeavesNoChanges(agent, setup, extraArgs = []) {
  const workspace = tempDir();
  setup(workspace);
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', agent, ...extraArgs]);
  assert.notStrictEqual(result.status, 0, result.stdout);
  assertTreeUnchanged(workspace, before);
  return result;
}

test('invalid opencode config on fresh init leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('opencode', (workspace) => {
    fs.writeFileSync(path.join(workspace, 'opencode.json'), '{ invalid', 'utf8');
  });
  assert.match(result.stderr, /not valid JSON/);
});

test('scalar opencode instructions on fresh init leave workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('opencode', (workspace) => {
    fs.writeFileSync(path.join(workspace, 'opencode.json'), '{"instructions":"docs/rules.md"}\n', 'utf8');
  });
  assert.match(result.stderr, /instructions must be an array of strings/);
});

test('mixed opencode instructions on fresh init leave workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('opencode', (workspace) => {
    fs.writeFileSync(path.join(workspace, 'opencode.json'), '{"instructions":["docs/rules.md",7]}\n', 'utf8');
  });
  assert.match(result.stderr, /instructions must be an array of strings/);
});

test('agent switch preserves scalar OpenCode instructions after managed paths are absent', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  const configPath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(configPath, '{"instructions":"docs/rules.md"}\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(fs.readFileSync(configPath, 'utf8'), '{"instructions":"docs/rules.md"}\n');
});

test('invalid entry leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.writeFileSync(path.join(workspace, 'CLAUDE.md'), '<!-- niuma-harness:contract begin -->\n', 'utf8');
  });
  assert.match(result.stderr, /contract zone end marker missing/);
});

test('user-maintained target directory conflict leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, 'harness', 'docs', 'project-context.md'), { recursive: true });
  });
  assert.match(result.stderr, /not a regular file/);
});

test('work template directory conflict leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, 'agent-work', 'README.md'), { recursive: true });
  });
  assert.match(result.stderr, /not a regular file/);
});

test('unowned differing rule target leaves workspace unchanged and points to repair', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    const target = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'user rule\n', 'utf8');
  }, ['--rules', 'common']);
  assert.match(result.stderr, /unowned rule artifact/);
  assert.match(result.stderr, /repair --dry-run/);
});

test('late rule pointer conflict leaves workspace unchanged', () => {
  const rule = allRuleDirs[0];
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, '.claude', 'rules', `niuma-${rule}.md`), { recursive: true });
  }, ['--rules', rule]);
  assert.match(result.stderr, /not a regular file/);
});

test('late skill conflict leaves workspace unchanged', () => {
  const skill = allSkillDirs[0];
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, '.claude', 'skills', skill, 'SKILL.md'), { recursive: true });
  }, ['--skills', skill]);
  assert.match(result.stderr, /not a regular file/);
});

test('late status conflict leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, 'harness', 'manifest.json'), { recursive: true });
  });
  assert.match(result.stderr, /not a regular file/);
});

test('command parent path conflict leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(workspace, '.claude', 'commands'), 'not a directory\n', 'utf8');
  });
  assert.match(result.stderr, /Parent path exists but is not a directory/);
});

test('malformed retired entry leaves workspace unchanged', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entry = path.join(workspace, 'AGENTS.md');
  const invalid = fs.readFileSync(entry, 'utf8').replace('<!-- niuma-harness:contract end -->', '');
  fs.writeFileSync(entry, invalid, 'utf8');
  const before = snapshotTree(workspace);
  result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /cannot retire AGENTS\.md/);
  assertTreeUnchanged(workspace, before);
});

test('drifted retired command leaves workspace unchanged', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  const target = path.join(workspace, '.opencode', 'commands', 'dev-check.md');
  fs.appendFileSync(target, 'drift\n', 'utf8');
  const before = snapshotTree(workspace);
  result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /owned command artifact drifted/);
  assertTreeUnchanged(workspace, before);
});

test('drifted retired agent rule leaves workspace unchanged', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  const target = path.join(workspace, 'harness', 'docs', 'rules', 'opencode', 'automation.md');
  fs.appendFileSync(target, 'drift\n', 'utf8');
  const before = snapshotTree(workspace);
  result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /owned rule artifact drifted/);
  assertTreeUnchanged(workspace, before);
});

test('dry-run performs full preflight without mutation', () => {
  const workspace = tempDir();
  fs.mkdirSync(path.join(workspace, '.claude', 'skills', allSkillDirs[0], 'SKILL.md'), { recursive: true });
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', 'claude', '--dry-run']);
  assert.notStrictEqual(result.status, 0);
  assertTreeUnchanged(workspace, before);
  assertNoPath(path.join(workspace, 'harness'));
});
