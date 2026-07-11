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

test('late rule conflict leaves workspace unchanged', () => {
  const result = assertFreshFailureLeavesNoChanges('claude', (workspace) => {
    fs.mkdirSync(path.join(workspace, 'harness', 'docs', 'rules', 'common', 'coding-style.md'), { recursive: true });
  }, ['--rules', 'common']);
  assert.match(result.stderr, /not a regular file/);
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

test('dry-run performs full preflight without mutation', () => {
  const workspace = tempDir();
  fs.mkdirSync(path.join(workspace, '.claude', 'skills', allSkillDirs[0], 'SKILL.md'), { recursive: true });
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', 'claude', '--dry-run']);
  assert.notStrictEqual(result.status, 0);
  assertTreeUnchanged(workspace, before);
  assertNoPath(path.join(workspace, 'harness'));
});
