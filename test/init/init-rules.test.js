const test = require('node:test');
const { digestBytes } = require('../../src/artifact/ledger');
const { revalidateRulePlan } = require('../../src/scaffold/rules-writer');
const {
  agentCases,
  allRuleDirs,
  assert,
  assertClaudeRulePointers,
  assertDir,
  assertFile,
  assertManifest,
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
} = require('../support/init-fixtures');

test('default rules include common engineering rules', () => {
  for (const scenario of agentCases) {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    const expectedRules = expectedDefaultRules(scenario.agent);

    if (scenario.agent === 'claude' || scenario.agent === 'multi') {
      assertFile(path.join(workspace, '.claude', 'rules', 'common', 'testing.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'common', 'hooks.md'));
    }
    if (scenario.agent === 'opencode') {
      assertFile(path.join(workspace, '.opencode', 'rules', 'common', 'testing.md'));
    }
    assertRuleDirs(harnessRoot, expectedRules);
    if (scenario.agent === 'claude' || scenario.agent === 'multi') {
      assertClaudeRulePointers(workspace, 'harness', expectedRules);
    }
    if (scenario.agent === 'opencode' || scenario.agent === 'multi') {
      assertOpenCodeRulesInstruction(workspace, 'harness', expectedRules);
    }
    if (scenario.agent === 'codex' || scenario.agent === 'multi') {
      assertFile(path.join(workspace, '.agents', 'harness-rules', 'common', 'testing.md'));
      assert.match(read(path.join(workspace, 'AGENTS.md')), /Codex engineering rules/);
    }
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: scenario.agent,
      rules: expectedRules,
      entryFiles: scenario.entryFiles,
    });
  }
});

test('generated common testing rules require test-first behavior evidence across agent surfaces', () => {
  for (const scenario of [
    { agent: 'claude', rulePath: ['.claude', 'rules', 'common', 'testing.md'] },
    { agent: 'codex', rulePath: ['.agents', 'harness-rules', 'common', 'testing.md'] },
    { agent: 'opencode', rulePath: ['.opencode', 'rules', 'common', 'testing.md'] },
  ]) {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent, '--harness-dir', 'ai-harness']);
    assert.strictEqual(result.status, 0, result.stderr);
    const rule = read(path.join(workspace, ...scenario.rulePath));

    assert.match(rule, /must follow the test-first behavior evidence protocol in `ai-harness\/docs\/layers\/04-observation\.md`/);
    assert.match(rule, /RED → same-target GREEN → optional REFACTOR/);
    assert.match(rule, /does not replace test-first work when that protocol applies/);
    assert.match(rule, /Valid alternatives must be declared before implementation/);
    assert.doesNotMatch(rule, /testing preferences|lightweight preference layer/i);
    if (scenario.agent === 'opencode') {
      assertOpenCodeRulesInstruction(workspace, 'ai-harness', ['common']);
    }
  }
});

test('default common rule routes minimum verification by change type', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);

  const generatedRule = read(path.join(workspace, '.claude', 'rules', 'common', 'testing.md'));
  assert.match(generatedRule, /## Minimum verification direction by change type/);
  assert.match(generatedRule, /Use the strongest relevant row\. If multiple rows apply, collect evidence that covers each changed risk and report required evidence that could not be collected\./);
  assert.match(generatedRule, /not a universal toolchain or heavyweight gate/);
  assert.match(generatedRule, /Select the smallest checks that prove the changed risks using project-local guidance\./);
  assert.match(generatedRule, /\| Documentation \/ rules \| Links, paths, example commands, factual sources, and index completeness\. \|/);
  assert.match(generatedRule, /\| Backend code \| Available formatting or static checks, affected focused tests, and compile or module checks\. \|/);
  assert.match(generatedRule, /\| Frontend code \| Type checks, build, page or interaction verification, and network-request verification\. \|/);
  assert.match(generatedRule, /\| Database \/ migration \| Forward migration, rollback, data impact, and permission or tenant impact\. \|/);
  assert.match(generatedRule, /\| Configuration \/ deployment \| Configuration parsing, startup or dry-run, and dependency connectivity\. \|/);
  assert.match(generatedRule, /\| API contract \| Server and caller compatibility, representative examples, and error paths\. \|/);
  assert.match(generatedRule, /evidence that could not be collected, skipped checks and reasons, substitute verification, and remaining unknowns or material risks/);
});

test('revalidates a canonical rule plan using item target paths', () => {
  const workspace = fs.realpathSync(tempDir());
  const targetPath = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'canonical rule\n', 'utf8');

  assert.doesNotThrow(() => revalidateRulePlan([{
    target: '.claude/rules/common/testing.md',
    targetPath,
    observedDigest: digestBytes(fs.readFileSync(targetPath)),
  }]));
});

test('--rules none installs no rule files', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const contextMemo = path.join(harnessRoot, 'docs', 'layers', '01-context.md');
  assertNoPath(path.join(harnessRoot, 'docs', 'rules'));
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


for (const scenario of [
  { rules: 'common', expected: normalizeRules('common', allRuleDirs) },
  { rules: 'web', expected: normalizeRules('web', allRuleDirs) },
  { rules: 'typescript', expected: normalizeRules('typescript', allRuleDirs) },
  { rules: 'java', expected: normalizeRules('java', allRuleDirs) },
  { rules: 'python', expected: normalizeRules('python', allRuleDirs) },
  { rules: 'fastapi', expected: normalizeRules('fastapi', allRuleDirs) },
  { rules: 'web,typescript', expected: normalizeRules('web,typescript', allRuleDirs) },
  { rules: 'java,web', expected: normalizeRules('java,web', allRuleDirs) },
  { rules: 'java,typescript', expected: normalizeRules('java,typescript', allRuleDirs) },
  { rules: 'python,fastapi', expected: normalizeRules('python,fastapi', allRuleDirs) },
  { rules: 'all', expected: allRuleDirs },
]) {
  test(`--rules ${scenario.rules} installs expected dirs`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules', scenario.rules]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, scenario.expected);
    if (scenario.expected.includes('typescript')) {
      assertFile(path.join(workspace, '.claude', 'rules', 'typescript', 'coding-style.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'typescript', 'testing.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'typescript', 'security.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'typescript', 'patterns.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'typescript', 'hooks.md'));
    }
    if (scenario.expected.includes('java')) {
      assertFile(path.join(workspace, '.claude', 'rules', 'java', 'coding-style.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'java', 'patterns.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'java', 'testing.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'java', 'security.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'java', 'hooks.md'));
    }
    if (scenario.expected.includes('python')) {
      assertFile(path.join(workspace, '.claude', 'rules', 'python', 'coding-style.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'python', 'testing.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'python', 'security.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'python', 'patterns.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'python', 'hooks.md'));
    }
    if (scenario.expected.includes('fastapi')) {
      assertFile(path.join(workspace, '.claude', 'rules', 'fastapi', 'patterns.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'fastapi', 'testing.md'));
      assertFile(path.join(workspace, '.claude', 'rules', 'fastapi', 'security.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'fastapi', 'coding-style.md'));
      assertNoPath(path.join(workspace, '.claude', 'rules', 'fastapi', 'hooks.md'));
    }
    assertClaudeRulePointers(workspace, 'harness', scenario.expected);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: scenario.expected,
      entryFiles: ['CLAUDE.md'],
    });
  });
}

test('ordinary rule selections include common while special selections and exclusions retain their semantics', () => {
  const availableRules = ['common', 'web', 'python', 'fastapi', 'extra'];
  assert.deepStrictEqual(normalizeRules('extra,common,extra', availableRules), ['common', 'extra']);
  assert.deepStrictEqual(normalizeRules('web', availableRules), ['common', 'web']);
  assert.deepStrictEqual(normalizeRules('fastapi', availableRules), ['common', 'fastapi']);
  assert.deepStrictEqual(normalizeRules('all', availableRules), availableRules);
  assert.deepStrictEqual(normalizeRules('none', availableRules), []);
  assert.deepStrictEqual(normalizeRulesOut('common', availableRules), ['web', 'python', 'fastapi', 'extra']);
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
    assertNoPath(path.join(harnessRoot, 'docs', 'rules'));
    assertNoPath(path.join(workspace, '.claude', 'rules', scenario.rulesOut));
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
