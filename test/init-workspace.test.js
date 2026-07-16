const test = require('node:test');
const {
  assert,
  assertClaudeRulePointers,
  assertDir,
  assertFile,
  assertManifest,
  assertNoCodexRulesDir,
  assertNoOpenCodeManagedRulesInstruction,
  assertNoPath,
  assertOpenCodeRulesInstruction,
  assertRuleDirs,
  expectedDefaultRules,
  fs,
  path,
  read,
  readJson,
  run,
  tempDir,
} = require('./init-fixtures');

test('multi --rules none installs no agent adapters', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, []);
  assertClaudeRulePointers(workspace, 'harness', []);
  assertNoOpenCodeManagedRulesInstruction(workspace);
  assertNoCodexRulesDir(workspace);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'multi',
    rules: [],
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
});

test('opencode --rules none leaves config without managed rule paths byte-identical', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  const original = '{\n  "large": 9007199254740993,\n  "instructions": "keep"\n}\n';
  fs.writeFileSync(configPath, original, 'utf8');
  const result = run(['init', workspace, '--agent', 'opencode', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), original);
});

test('rules cleanup ignores marker examples outside OpenCode instructions', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  const original = '{\n  "large": 9007199254740993,\n  "note": "<!-- niuma-harness:rules begin --> example <!-- niuma-harness:rules end -->",\n  "instructions": "keep"\n}\n';
  fs.writeFileSync(configPath, original, 'utf8');
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(configPath), original);
});

test('opencode rules instructions merge with existing config', () => {
  const workspace = tempDir();
  fs.writeFileSync(path.join(workspace, 'opencode.json'), JSON.stringify({
    provider: 'local',
    instructions: ['docs/team-rules.md'],
  }, null, 2), 'utf8');

  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  const config = readJson(path.join(workspace, 'opencode.json'));
  assert.strictEqual(config.provider, 'local');
  assert.deepStrictEqual(config.instructions.filter((instruction) => instruction === 'docs/team-rules.md'), ['docs/team-rules.md']);
  assertOpenCodeRulesInstruction(workspace, 'harness', expectedDefaultRules('opencode'));

  const before = read(path.join(workspace, 'opencode.json'));
  const second = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(second.status, 0, second.stderr);
  assert.strictEqual(read(path.join(workspace, 'opencode.json')), before, 'OpenCode rules re-init must be byte-identical');
});

test('opencode rejects scalar instructions without modifying the workspace', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(configPath, JSON.stringify({
    instructions: 'docs/team-rules.md',
  }, null, 2), 'utf8');

  const before = read(configPath);
  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /instructions must be an array of strings/);
  assert.strictEqual(read(configPath), before);
  assertNoPath(path.join(workspace, 'harness'));
});

test('opencode preserves a user path that matches a canonical rule target before first init', () => {
  const workspace = tempDir();
  const userPath = '.opencode/rules/common/testing.md';
  fs.writeFileSync(path.join(workspace, 'opencode.json'), JSON.stringify({
    instructions: [userPath, 'docs/team-rules.md'],
  }, null, 2), 'utf8');

  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  let config = readJson(path.join(workspace, 'opencode.json'));
  assert.deepStrictEqual(config.instructions, [userPath, 'docs/team-rules.md']);

  result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  config = readJson(path.join(workspace, 'opencode.json'));
  assert.strictEqual(config.instructions.filter((item) => item === userPath).length, 1);
});

test('opencode rejects unsafe integer config without overwriting it', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  const original = '{"large":9007199254740993,"instructions":["docs/team.md"]}\n';
  fs.writeFileSync(configPath, original, 'utf8');
  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /without changing number 9007199254740993/);
  assert.strictEqual(read(configPath), original);
  assertNoPath(path.join(workspace, 'harness'));
});

test('opencode rejects lossy decimal integer config without overwriting it', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  const original = '{"large":9007199254740993.0,"instructions":["docs/team.md"]}\n';
  fs.writeFileSync(configPath, original, 'utf8');
  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /without changing number 9007199254740993\.0/);
  assert.strictEqual(read(configPath), original);
});

test('opencode invalid json fails without overwriting config', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(configPath, '{bad json', 'utf8');
  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.notStrictEqual(result.status, 0, 'invalid opencode.json should fail');
  assert.strictEqual(read(configPath), '{bad json');
});

test('--rules and --rules-out are mutually exclusive', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'common', '--rules-out', 'common']);
  assert.notStrictEqual(result.status, 0, '--rules and --rules-out should be mutually exclusive');
});

test('--dry-run writes nothing', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'manifest.json'));
  assertNoPath(path.join(workspace, 'agent-work'));
  assert.match(result.stdout, /manifest\.json/);
  assert.match(result.stdout, /agent-work/);
});

test('init and re-init accept a workspace directory alias', (t) => {
  const root = tempDir();
  const workspace = path.join(root, 'workspace');
  const alias = path.join(root, 'workspace-alias');
  fs.mkdirSync(workspace);
  try {
    fs.symlinkSync(workspace, alias, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }

  let result = run(['init', alias, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'harness', 'manifest.json'));
  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  result = run(['doctor', alias]);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('init creates a missing workspace below a directory alias', (t) => {
  const root = tempDir();
  const realParent = path.join(root, 'real');
  const alias = path.join(root, 'alias');
  fs.mkdirSync(realParent);
  try {
    fs.symlinkSync(realParent, alias, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.code || error.message}`);
    return;
  }

  const result = run(['init', path.join(alias, 'new', 'workspace'), '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(realParent, 'new', 'workspace', 'harness', 'manifest.json'));
});

test('custom ai-harness multi OpenCode adapter uses the actual harness root', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(configPath, `${JSON.stringify({ provider: 'local' }, null, 2)}\n`, 'utf8');

  const result = run(['init', workspace, '--agent', 'multi', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  const config = readJson(configPath);
  assert.strictEqual(config.provider, 'local');
  assertOpenCodeRulesInstruction(workspace, 'ai-harness', expectedDefaultRules('multi'));
  const instructions = Array.isArray(config.instructions) ? config.instructions.join('\n') : config.instructions;
  assert.doesNotMatch(instructions, /(^|[^-])harness\/docs\/rules\//);
  assertManifest(path.join(workspace, 'ai-harness', 'manifest.json'), {
    agent: 'multi',
    harnessDir: 'ai-harness',
    rules: expectedDefaultRules('multi'),
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });

  let doctor = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
  doctor = run(['doctor', path.join(workspace, 'ai-harness')]);
  assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
});

test('--harness-dir uses a custom directory name', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'ai-harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'ai-harness', 'README.md'));
  assertNoPath(path.join(workspace, 'ai-harness', 'HARNESS_GUIDE.md'));
  assertDir(path.join(workspace, 'agent-work'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));
  assertDir(path.join(workspace, 'agent-work', 'tasks'));
  assertNoPath(path.join(workspace, 'ai-harness', 'docs', 'tasks'));
  assertNoPath(path.join(workspace, 'ai-harness', 'agent-work'));
  assertManifest(path.join(workspace, 'ai-harness', 'manifest.json'), {
    agent: 'claude',
    harnessDir: 'ai-harness',
    entryFiles: ['CLAUDE.md'],
  });
  assertClaudeRulePointers(workspace, 'ai-harness', expectedDefaultRules('claude'));
  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /ai-harness\/docs\/index\.md/);
  assert.match(entry, /ai-harness\/docs\/layers\/01-context\.md/);
  assert.match(entry, /ai-harness\/docs\/experiments\/task-execution-record\.md/);
  assert.doesNotMatch(entry, /\(depth: `docs\//);

  const index = read(path.join(workspace, 'ai-harness', 'docs', 'index.md'));
  assert.match(index, /`ai-harness\/README\.md`/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /ai-harness\/docs\/experiments\/task-execution-record\.md/);
  assert.match(workReadme, /ai-harness\/docs\/layers\/07-loop\.md/);
  assert.match(workReadme, /ai-harness\/docs\/project-context\.md/);
  assert.doesNotMatch(workReadme, /`docs\//);
  assert.doesNotMatch(workReadme, /`harness\/docs\//);
  const doctor = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

for (const harnessDir of [
  '.',
  '../outside',
  'bad/name',
  'agent-work',
  'AGENT-WORK',
  ...(process.platform === 'win32' ? ['agent-work.', 'harness.'] : []),
]) {
  test(`--harness-dir ${harnessDir} fails`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', harnessDir]);
    assert.notStrictEqual(result.status, 0, `--harness-dir ${harnessDir} should fail`);
  });
}

test('existing root entry gets the contract merged in (user content preserved)', () => {
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(targetFile, 'my project notes\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const body = read(targetFile);
  assert.match(body, /<!-- niuma-harness:contract begin/, 'contract block should be inserted at top');
  assert.match(body, /<!-- niuma-harness:contract end/, 'contract block should be closed');
  assert.ok(body.endsWith('my project notes\n'), 'user content should be preserved after the contract block');
});

test('agent switch removes an untouched retired entry', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(path.join(workspace, 'AGENTS.md'));
  assertFile(path.join(workspace, 'CLAUDE.md'));
});

test('agent switch removes only the retired contract when user content exists', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entry = path.join(workspace, 'AGENTS.md');
  const body = `prefix\r\n${read(entry).replace(/\n/g, '\r\n')}suffix`;
  fs.writeFileSync(entry, body, 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const retired = read(entry);
  assert.match(retired, /^prefix\r\n/);
  assert.ok(retired.endsWith('suffix'));
  assert.doesNotMatch(retired, /niuma-harness:contract/);
});

test('codex and opencode keep their shared AGENTS entry', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'AGENTS.md'));
  assert.match(read(path.join(workspace, 'AGENTS.md')), /niuma-harness:contract begin/);
});

test('re-init refreshes the entry contract block (idempotent)', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const before = read(entry);

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(entry), before, 're-init with markers should leave the entry byte-identical');
  assert.match(result.stdout, /REFRESH/, 're-init should report REFRESH for the entry');
});

for (const scenario of [
  {
    name: 'missing contract end marker',
    mutate: (body) => body.replace('<!-- niuma-harness:contract end -->', ''),
    error: /contract zone end marker missing in CLAUDE\.md/,
  },
  {
    name: 'multiple contract zones',
    mutate: (body) => `${body}\n${body}`,
    error: /multiple contract zones in CLAUDE\.md/,
  },
]) {
  test(`re-init rejects ${scenario.name} without modifying the entry`, () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', 'claude']);
    assert.strictEqual(result.status, 0, result.stderr);
    const entry = path.join(workspace, 'CLAUDE.md');
    const invalid = scenario.mutate(read(entry));
    fs.writeFileSync(entry, invalid, 'utf8');

    result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, `re-init should reject ${scenario.name}`);
    assert.match(result.stderr, scenario.error);
    assert.strictEqual(read(entry), invalid, 're-init should not modify an ambiguous entry');
  });
}

test('multi re-init validates every entry before modifying either entry', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  const claudeEntry = path.join(workspace, 'CLAUDE.md');
  const agentsEntry = path.join(workspace, 'AGENTS.md');
  const claudeBefore = `${read(claudeEntry)}\nuser notes\n`;
  const invalidAgents = read(agentsEntry).replace('<!-- niuma-harness:contract end -->', '');
  fs.writeFileSync(claudeEntry, claudeBefore, 'utf8');
  fs.writeFileSync(agentsEntry, invalidAgents, 'utf8');

  result = run(['init', workspace, '--agent', 'multi']);
  assert.notStrictEqual(result.status, 0, 'multi re-init should reject an invalid entry');
  assert.match(result.stderr, /contract zone end marker missing in AGENTS\.md/);
  assert.strictEqual(read(claudeEntry), claudeBefore, 'valid entry should not be refreshed before all entries pass preflight');
  assert.strictEqual(read(agentsEntry), invalidAgents, 'invalid entry should not be modified');
});

test('init rejects an unsupported existing manifest before modifying the workspace', () => {
  const workspace = tempDir();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{"schemaVersion":1}\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'schemaVersion 1 should not be adopted');
  assert.match(result.stderr, /schemaVersion 2 ownership data is required/);
  assert.strictEqual(read(manifestPath), '{"schemaVersion":1}\n');
  assertNoPath(path.join(workspace, 'CLAUDE.md'));
});

test('re-init refreshes tool-managed files', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const memo = path.join(workspace, 'harness', 'docs', 'layers', '01-context.md');
  fs.writeFileSync(memo, 'tampered\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.notStrictEqual(read(memo), 'tampered\n', 'tool-managed file should be refreshed on re-init');
  assert.match(read(memo), /## Agent protocol/, 'tool-managed file should be restored from template');
});

test('re-init preserves user-maintained project-context.md', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const ctx = path.join(workspace, 'harness', 'docs', 'project-context.md');
  fs.writeFileSync(ctx, 'my project facts\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(ctx), 'my project facts\n', 'user-maintained project-context should be preserved');
});

test('directory symlink attack is rejected', (t) => {
  const workspace = tempDir();
  const outside = tempDir();
  const harnessLink = path.join(workspace, 'harness');
  let created = true;
  try {
    fs.symlinkSync(outside, harnessLink, 'dir');
  } catch {
    created = false;
  }

  if (!created) {
    t.skip('directory links unavailable');
    return;
  }
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'directory symlink should fail');
  assertNoPath(path.join(outside, 'CLAUDE.md'));
});

test('root entry symlink is rejected without overwriting the target', (t) => {
  const workspace = tempDir();
  const target = path.join(workspace, 'outside.md');
  fs.writeFileSync(target, 'outside', 'utf8');
  const link = path.join(workspace, 'CLAUDE.md');
  let created = true;
  try {
    fs.symlinkSync(target, link, 'file');
  } catch {
    created = false;
  }

  if (!created) {
    t.skip('file symlinks unavailable');
    return;
  }
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'root entry symlink should fail');
  assert.strictEqual(read(target), 'outside', 'symlink target should not be overwritten');
});

test('dangling root entry symlink is rejected', (t) => {
  const workspace = tempDir();
  const outside = tempDir();
  const danglingTarget = path.join(outside, 'created-through-link.md');
  const link = path.join(workspace, 'CLAUDE.md');
  let created = true;
  try {
    fs.symlinkSync(danglingTarget, link, 'file');
  } catch {
    created = false;
  }

  if (!created) {
    t.skip('file symlinks unavailable');
    return;
  }
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'dangling root entry symlink should fail');
  assertNoPath(danglingTarget);
});

test('harness path that is a file fails', () => {
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness');
  fs.writeFileSync(targetFile, 'not a directory', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'target harness path as file should fail');
});

test('unknown option fails', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--bad']);
  assert.notStrictEqual(result.status, 0, 'unknown option should fail');
});

test('missing --agent fails in a non-TTY', () => {
  const workspace = tempDir();
  const result = run(['init', workspace]);
  assert.notStrictEqual(result.status, 0, 'missing agent should fail in non-TTY');
  assert.match(result.stderr, /Missing --agent/);
});
