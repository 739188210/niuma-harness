const {
  allRuleDirs,
  assert,
  assertDir,
  assertFile,
  assertLayerMemos,
  assertManifest,
  assertNoPath,
  assertRuleDirs,
  fs,
  path,
  read,
  run,
  tempDir,
} = require('./helpers');

// 入口文件落在 workspace 根，协议内容落在 harness/。
{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'harness', 'HARNESS_GUIDE.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertLayerMemos(path.join(workspace, 'harness'));
  assertDir(path.join(workspace, 'agent-work'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));
  assertDir(path.join(workspace, 'agent-work', 'tasks'));
  assertNoPath(path.join(workspace, 'harness', 'docs', 'tasks'));
  assertNoPath(path.join(workspace, 'harness', 'agent-work'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
  assertNoPath(path.join(workspace, 'AGENTS.md'));
  assertNoPath(path.join(workspace, 'harness', 'AGENTS.md'));
}

// --tool 是 --agent 的别名。
{
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
}

for (const agent of ['codex', 'opencode']) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', agent]);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'AGENTS.md'));
  assertNoPath(path.join(workspace, 'harness', 'AGENTS.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent,
    entryFiles: ['AGENTS.md'],
  });
  assertNoPath(path.join(workspace, 'CLAUDE.md'));
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertFile(path.join(workspace, 'AGENTS.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'AGENTS.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'multi',
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const rule = path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md');
  assertFile(rule);
  assert.ok(read(rule).length > 0, 'default common rules should contain starter content');
  assertRuleDirs(harnessRoot, ['common']);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: ['common'],
    entryFiles: ['CLAUDE.md'],
  });
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const contextMemo = path.join(harnessRoot, 'docs', 'layers', '01-context', 'memo.md');
  assertDir(path.join(harnessRoot, 'docs', 'rules'));
  assertRuleDirs(harnessRoot, []);
  assert.ok(read(contextMemo).length > 0, 'layer memos should not be affected by --rules none');
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: [],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
}

{
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, ['common']);

  result = run(['init', workspace, '--agent', 'claude', '--rules', 'none', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, []);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: [],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
}

{
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--rules', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, allRuleDirs);

  result = run(['init', workspace, '--agent', 'claude', '--rules', 'java', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, ['java']);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: ['java'],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
}

for (const scenario of [
  { rules: 'java', expected: ['java'] },
  { rules: 'java,web', expected: ['java', 'web'] },
  { rules: 'common,java', expected: ['common', 'java'] },
  { rules: 'typescript', expected: ['typescript'] },
  { rules: 'all', expected: allRuleDirs },
]) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', scenario.rules]);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, scenario.expected);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: scenario.expected,
    entryFiles: ['CLAUDE.md'],
  });
}

for (const scenario of [
  { rulesOut: 'web', expected: ['common', 'java', 'typescript'] },
  { rulesOut: 'common,web', expected: ['java', 'typescript'] },
]) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules-out', scenario.rulesOut]);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, scenario.expected);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: scenario.expected,
    entryFiles: ['CLAUDE.md'],
  });
}

for (const invalidRules of ['copy', 'empty', 'unknown', 'java,,web', '../java', 'none,java', 'all,web']) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', invalidRules]);
  assert.notStrictEqual(result.status, 0, `--rules ${invalidRules} should fail`);
}

for (const invalidRulesOut of ['none', 'all', 'unknown']) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules-out', invalidRulesOut]);
  assert.notStrictEqual(result.status, 0, `--rules-out ${invalidRulesOut} should fail`);
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'java', '--rules-out', 'web']);
  assert.notStrictEqual(result.status, 0, '--rules and --rules-out should be mutually exclusive');
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'manifest.json'));
  assertNoPath(path.join(workspace, 'agent-work'));
  assert.match(result.stdout, /manifest\.json/);
  assert.match(result.stdout, /agent-work/);
}

{
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'ai-harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'ai-harness', 'HARNESS_GUIDE.md'));
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
}

for (const harnessDir of ['.', '../outside', 'bad/name', 'agent-work', 'AGENT-WORK', 'agent-work.']) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', harnessDir]);
  assert.notStrictEqual(result.status, 0, `--harness-dir ${harnessDir} should fail`);
}

// 根入口已存在：默认 skip + 提示，不破坏用户文件。
{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(targetFile, 'custom', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(targetFile), 'custom', 'existing root entry should be skipped without force');
  assert.match(result.stdout, /kept your existing CLAUDE\.md/);
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(targetFile, 'custom', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.notStrictEqual(read(targetFile), 'custom', 'force should overwrite existing root entry');
}

{
  const workspace = tempDir();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{"custom":true}\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(manifestPath), '{"custom":true}\n', 'existing manifest should be skipped without force');
}

{
  const workspace = tempDir();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{"custom":true}\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude', '--force']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertManifest(manifestPath, {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
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
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'directory symlink should fail');
    assertNoPath(path.join(outside, 'CLAUDE.md'));
  }
}

// 根入口是 symlink 时拒绝写入，不跟随链接覆盖目标。
{
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

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude', '--force']);
    assert.notStrictEqual(result.status, 0, 'root entry symlink with force should fail');
    assert.strictEqual(read(target), 'outside', 'symlink target should not be overwritten');
  }
}

{
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

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'dangling root entry symlink should fail');
    assertNoPath(danglingTarget);
  }
}

{
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness');
  fs.writeFileSync(targetFile, 'not a directory', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
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
  assert.notStrictEqual(result.status, 0, 'missing agent should fail in non-TTY');
  assert.match(result.stderr, /Missing --agent/);
}
