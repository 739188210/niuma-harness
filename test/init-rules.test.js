const test = require('node:test');
const {
  addAgentRules,
  agentCases,
  allRuleDirs,
  assert,
  assertClaudeRulePointers,
  assertDir,
  assertFile,
  assertManifest,
  assertNoCodexRulesDir,
  assertNoPath,
  assertOpenCodeRulesInstruction,
  assertRuleDirs,
  expectedDefaultRules,
  fs,
  getDefaultRulesForAgent,
  normalizeRules,
  normalizeRulesOut,
  path,
  read,
  run,
  tempDir,
} = require('./init-fixtures');

test('default rules include common and agent-specific adapters', () => {
  for (const scenario of agentCases) {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    const expectedRules = expectedDefaultRules(scenario.agent);

    assertFile(path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md'));
    assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'common', 'hooks.md'));
    assertRuleDirs(harnessRoot, expectedRules);
    if (scenario.agent === 'claude' || scenario.agent === 'multi') {
      assertClaudeRulePointers(workspace, 'harness', expectedRules);
    }
    if (scenario.agent === 'opencode' || scenario.agent === 'multi') {
      assertOpenCodeRulesInstruction(workspace, 'harness', expectedRules);
    }
    if (scenario.agent === 'codex' || scenario.agent === 'multi') {
      assert.match(read(path.join(workspace, 'AGENTS.md')), /harness\/docs\/rules\//);
      assertNoCodexRulesDir(workspace);
    }
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: scenario.agent,
      rules: expectedRules,
      entryFiles: scenario.entryFiles,
    });
  }
});

test('--rules none installs no rule files', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const contextMemo = path.join(harnessRoot, 'docs', 'layers', '01-context.md');
  assertDir(path.join(harnessRoot, 'docs', 'rules'));
  assertRuleDirs(harnessRoot, []);
  assertClaudeRulePointers(workspace, 'harness', []);
  assert.ok(read(contextMemo).length > 0, 'layer memos should not be affected by --rules none');
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: [],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

test('re-init preserves selected rule files', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const ruleFile = path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md');
  fs.writeFileSync(ruleFile, 'custom rule\n', 'utf8');

  const pointerFile = path.join(workspace, '.claude', 'rules', 'niuma-common.md');
  fs.writeFileSync(pointerFile, 'custom pointer\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(ruleFile), 'custom rule\n', 'selected rule file should be preserved on re-init');
  assert.match(read(pointerFile), /harness\/docs\/rules\/common\//, 'native rule pointer should be refreshed on re-init');
  assertRuleDirs(harnessRoot, expectedDefaultRules('claude'));
});

test('re-init converges rules from common to none', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, expectedDefaultRules('claude'));
  fs.writeFileSync(path.join(harnessRoot, 'docs', 'rules', 'common', 'local.md'), 'local rule\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, []);
  assertClaudeRulePointers(workspace, 'harness', []);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: [],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

if (allRuleDirs.length > 1) {
  test('--rules all then a specific rule converges on re-init', () => {
    const workspace = tempDir();
    const selectedRule = 'common';
    const expectedRules = addAgentRules([selectedRule], 'claude', allRuleDirs);
    let result = run(['init', workspace, '--agent', 'claude', '--rules', 'all']);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, allRuleDirs);

    result = run(['init', workspace, '--agent', 'claude', '--rules', selectedRule]);
    assert.strictEqual(result.status, 0, result.stderr);
    assertRuleDirs(harnessRoot, expectedRules);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: expectedRules,
      entryFiles: ['CLAUDE.md'],
    });
    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, doctor.stderr);
  });
}

for (const scenario of [
  { rules: 'common', expected: addAgentRules(['common'], 'claude', allRuleDirs) },
  { rules: 'web', expected: addAgentRules(['web'], 'claude', allRuleDirs) },
  { rules: 'typescript', expected: addAgentRules(['typescript'], 'claude', allRuleDirs) },
  { rules: 'java', expected: addAgentRules(['java'], 'claude', allRuleDirs) },
  { rules: 'python', expected: addAgentRules(['python'], 'claude', allRuleDirs) },
  { rules: 'fastapi', expected: addAgentRules(['fastapi'], 'claude', allRuleDirs) },
  { rules: 'web,typescript', expected: addAgentRules(['web', 'typescript'], 'claude', allRuleDirs) },
  { rules: 'java,web', expected: addAgentRules(['java', 'web'], 'claude', allRuleDirs) },
  { rules: 'java,typescript', expected: addAgentRules(['java', 'typescript'], 'claude', allRuleDirs) },
  { rules: 'python,fastapi', expected: addAgentRules(['python', 'fastapi'], 'claude', allRuleDirs) },
  { rules: 'all', expected: allRuleDirs },
]) {
  test(`--rules ${scenario.rules} installs expected dirs`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules', scenario.rules]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, scenario.expected);
    if (scenario.expected.includes('typescript')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'coding-style.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'patterns.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'hooks.md'));
    }
    if (scenario.expected.includes('java')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'coding-style.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'patterns.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'java', 'hooks.md'));
    }
    if (scenario.expected.includes('python')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'python', 'coding-style.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'python', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'python', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'python', 'patterns.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'python', 'hooks.md'));
    }
    if (scenario.expected.includes('fastapi')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'patterns.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'coding-style.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'hooks.md'));
    }
    assertClaudeRulePointers(workspace, 'harness', scenario.expected);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: scenario.expected,
      entryFiles: ['CLAUDE.md'],
    });
  });
}

test('rule normalization sorts, excludes, and adds agent adapters', () => {
  const availableRules = ['common', 'claude', 'codex', 'opencode', 'extra'];
  assert.deepStrictEqual(normalizeRules('extra,common', availableRules), ['common', 'extra']);
  assert.deepStrictEqual(normalizeRulesOut('common', availableRules), ['claude', 'codex', 'opencode', 'extra']);
  assert.deepStrictEqual(getDefaultRulesForAgent('claude', availableRules), ['common', 'claude']);
  assert.deepStrictEqual(getDefaultRulesForAgent('multi', availableRules), ['common', 'claude', 'codex', 'opencode']);
  assert.deepStrictEqual(addAgentRules(['common'], 'codex', availableRules), ['common', 'codex']);
  assert.deepStrictEqual(addAgentRules([], 'codex', availableRules), []);
});

for (const scenario of [
  { rulesOut: allRuleDirs[0], expected: allRuleDirs.slice(1) },
  { rulesOut: 'claude', expected: allRuleDirs.filter((rule) => rule !== 'claude') },
]) {
  test(`--rules-out ${scenario.rulesOut} excludes the selected dir`, () => {
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
  });
}

for (const invalidRules of ['copy', 'empty', 'unknown', 'common,,common', '../common', 'none,common', 'all,common']) {
  test(`--rules ${invalidRules} fails`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules', invalidRules]);
    assert.notStrictEqual(result.status, 0, `--rules ${invalidRules} should fail`);
  });
}

for (const invalidRulesOut of ['none', 'all', 'unknown']) {
  test(`--rules-out ${invalidRulesOut} fails`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules-out', invalidRulesOut]);
    assert.notStrictEqual(result.status, 0, `--rules-out ${invalidRulesOut} should fail`);
  });
}

