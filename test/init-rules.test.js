const test = require('node:test');
const { digestBytes } = require('../src/artifact-ledger');
const { revalidateRulePlan } = require('../src/scaffold/rules-writer');
const {
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
  assertTreeUnchanged,
  copyCliPackage,
  expectedDefaultRules,
  fs,
  getDefaultRulesForAgent,
  normalizeRules,
  normalizeRulesOut,
  normalizeSelectedRules,
  path,
  read,
  run,
  runWithCliRoot,
  snapshotTree,
  tempDir,
} = require('./init-fixtures');

test('default rules include common engineering rules', () => {
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

test('revalidates a canonical rule plan using item target paths', () => {
  const workspace = fs.realpathSync(tempDir());
  const targetPath = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'canonical rule\n', 'utf8');

  assert.doesNotThrow(() => revalidateRulePlan([{
    target: 'harness/docs/rules/common/testing.md',
    targetPath,
    observedDigest: digestBytes(fs.readFileSync(targetPath)),
  }]));
});

test('re-init refreshes managed rules from a copied package upgrade', () => {
  const cliRoot = copyCliPackage();
  const workspace = tempDir();
  const initArgs = ['init', workspace, '--agent', 'claude'];
  let result = runWithCliRoot(cliRoot, initArgs);
  assert.strictEqual(result.status, 0, result.stderr);

  const harnessRoot = path.join(workspace, 'harness');
  const generatedRule = path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md');
  const manifestPath = path.join(harnessRoot, 'manifest.json');
  const commandRoot = path.join(workspace, '.claude', 'commands');
  const commandTree = snapshotTree(commandRoot);
  const previousRule = read(generatedRule);
  const previousManifest = JSON.parse(read(manifestPath));
  const previousRecord = previousManifest.artifacts.find((record) => record.target === 'harness/docs/rules/common/testing.md');
  const previousCommandRecords = previousManifest.artifacts.filter((record) => record.kind === 'command');
  assert.ok(previousRule.length > 0, 'generated common testing rule should have content');
  assert.ok(previousRecord, 'generated common testing rule should have an artifact record');
  assert.strictEqual(previousRecord.digest, digestBytes(fs.readFileSync(generatedRule)));

  const upgradedRule = '# Updated common testing rule\n\nUse the copied package upgrade.\n';
  fs.writeFileSync(path.join(cliRoot, 'templates', 'rules', 'common', 'testing.md'), upgradedRule, 'utf8');

  result = runWithCliRoot(cliRoot, initArgs);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(generatedRule), upgradedRule);
  assertTreeUnchanged(commandRoot, commandTree);

  const upgradedManifest = JSON.parse(read(manifestPath));
  const upgradedRecord = upgradedManifest.artifacts.find((record) => record.target === 'harness/docs/rules/common/testing.md');
  const upgradedCommandRecords = upgradedManifest.artifacts.filter((record) => record.kind === 'command');
  assert.ok(upgradedRecord, 'upgraded common testing rule should have an artifact record');
  assert.notStrictEqual(upgradedRecord.digest, previousRecord.digest);
  assert.strictEqual(upgradedRecord.digest, digestBytes(fs.readFileSync(generatedRule)));
  assert.deepStrictEqual(upgradedCommandRecords, previousCommandRecords);

  const doctor = runWithCliRoot(cliRoot, ['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
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

test('re-init rejects drifted selected rule files and leaves the workspace unchanged', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const ruleFile = path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  fs.writeFileSync(ruleFile, 'custom rule\n', 'utf8');
  const before = snapshotTree(workspace);

  result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /owned rule artifact drifted/);
  assert.match(result.stderr, /repair --dry-run/);
  assertTreeUnchanged(workspace, before);
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
  assert.strictEqual(read(path.join(harnessRoot, 'docs', 'rules', 'common', 'local.md')), 'local rule\n');
  assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md'));
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
    const expectedRules = normalizeSelectedRules([selectedRule], allRuleDirs);
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
  { rules: 'common', expected: normalizeSelectedRules(['common'], allRuleDirs) },
  { rules: 'web', expected: normalizeSelectedRules(['web'], allRuleDirs) },
  { rules: 'typescript', expected: normalizeSelectedRules(['typescript'], allRuleDirs) },
  { rules: 'java', expected: normalizeSelectedRules(['java'], allRuleDirs) },
  { rules: 'python', expected: normalizeSelectedRules(['python'], allRuleDirs) },
  { rules: 'fastapi', expected: normalizeSelectedRules(['fastapi'], allRuleDirs) },
  { rules: 'web,typescript', expected: normalizeSelectedRules(['web', 'typescript'], allRuleDirs) },
  { rules: 'java,web', expected: normalizeSelectedRules(['java', 'web'], allRuleDirs) },
  { rules: 'java,typescript', expected: normalizeSelectedRules(['java', 'typescript'], allRuleDirs) },
  { rules: 'python,fastapi', expected: normalizeSelectedRules(['python', 'fastapi'], allRuleDirs) },
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

test('rule normalization sorts and excludes selected rules', () => {
  const availableRules = ['common', 'web', 'extra'];
  assert.deepStrictEqual(normalizeRules('extra,common', availableRules), ['common', 'extra']);
  assert.deepStrictEqual(normalizeRulesOut('common', availableRules), ['web', 'extra']);
  assert.deepStrictEqual(getDefaultRulesForAgent('claude', availableRules), ['common']);
  assert.deepStrictEqual(getDefaultRulesForAgent('multi', availableRules), ['common']);
  assert.deepStrictEqual(normalizeSelectedRules(['common'], availableRules), ['common']);
  assert.deepStrictEqual(normalizeSelectedRules([], availableRules), []);
});

for (const scenario of [
  { agent: 'multi', rulesOut: 'common', expected: allRuleDirs.filter((rule) => rule !== 'common'), entryFiles: ['CLAUDE.md', 'AGENTS.md'] },
  { agent: 'opencode', rulesOut: 'web', expected: allRuleDirs.filter((rule) => rule !== 'web'), entryFiles: ['AGENTS.md'] },
]) {
  test(`${scenario.agent} --rules-out ${scenario.rulesOut} excludes the selected dir from every managed surface`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent, '--rules-out', scenario.rulesOut]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, scenario.expected);
    if (scenario.agent === 'multi') {
      assertClaudeRulePointers(workspace, 'harness', scenario.expected);
    }
    assertOpenCodeRulesInstruction(workspace, 'harness', scenario.expected);
    const instructions = JSON.stringify(JSON.parse(read(path.join(workspace, 'opencode.json'))).instructions);
    assert.doesNotMatch(instructions, new RegExp(`Selected rule directories:[^\\n]*\\b${scenario.rulesOut}\\b`));
    assertNoPath(path.join(harnessRoot, 'docs', 'rules', scenario.rulesOut));
    assertNoPath(path.join(workspace, '.claude', 'rules', `niuma-${scenario.rulesOut}.md`));
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: scenario.agent,
      rules: scenario.expected,
      entryFiles: scenario.entryFiles,
    });
    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
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
