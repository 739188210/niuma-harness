const test = require('node:test');
const {
  agentCases,
  assert,
  assertAgentEntryShape,
  assertCommonHarnessShape,
  assertFile,
  assertManifest,
  assertNoPath,
  initWorkspace,
  path,
  read,
  readTextTree,
  run,
  tempDir,
} = require('./init-fixtures');

test('--tool is an alias for --agent', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
});

for (const scenario of agentCases.filter((entry) => entry.agent === 'codex' || entry.agent === 'opencode')) {
  test(`init ${scenario.agent}: AGENTS.md at root`, () => {
    const workspace = initWorkspace(scenario.agent);
    assertAgentEntryShape(workspace, scenario);
  });
}

test('init multi: both CLAUDE.md and AGENTS.md', () => {
  const workspace = initWorkspace('multi');
  assertAgentEntryShape(workspace, agentCases.find((scenario) => scenario.agent === 'multi'));
});

test('entry file carries the operating contract zone', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const body = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(body, /<!-- niuma-harness:contract begin/, 'entry must open the contract zone');
  assert.match(body, /<!-- niuma-harness:contract end/, 'entry must close the contract zone');
  assert.match(body, /Operating Loop/, 'entry must contain the operating loop');
  assert.match(body, /harness\/docs\/index\.md/, 'entry must point agents to the harness index');
  assert.match(body, /harness\/docs\/layers\/01-context\.md/, 'entry depth links must include the harness directory');
  assert.doesNotMatch(body, /\(depth: `docs\//, 'entry depth links must not use workspace-root docs paths');
});

test('multi mode shares one entry source so both files are identical', () => {
  const workspace = initWorkspace('multi');
  const claude = read(path.join(workspace, 'CLAUDE.md'));
  const agents = read(path.join(workspace, 'AGENTS.md'));
  assert.strictEqual(claude, agents, 'CLAUDE.md and AGENTS.md must share one source');
});

test('init produces parity scaffold across supported agents', () => {
  for (const scenario of agentCases) {
    const workspace = initWorkspace(scenario.agent);
    assertCommonHarnessShape(workspace);
    assertAgentEntryShape(workspace, scenario);

    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, `${scenario.agent} doctor failed: ${doctor.stderr}`);
  }
});

test('all agent entry files share the same generated contract source', () => {
  const baselineWorkspace = initWorkspace('claude');
  const baseline = read(path.join(baselineWorkspace, 'CLAUDE.md'));

  for (const scenario of agentCases) {
    const workspace = scenario.agent === 'claude' ? baselineWorkspace : initWorkspace(scenario.agent);

    for (const entryFile of scenario.entryFiles) {
      assert.strictEqual(
        read(path.join(workspace, entryFile)),
        baseline,
        `${scenario.agent} ${entryFile} should match the claude entry contract`,
      );
    }
  }
});

test('all agents generate the same runtime-neutral docs', () => {
  const baselineWorkspace = initWorkspace('claude');
  const baselineDocs = readTextTree(path.join(baselineWorkspace, 'harness', 'docs'), { exclude: ['rules'] });
  const baselineWorkReadme = read(path.join(baselineWorkspace, 'agent-work', 'README.md'));

  for (const scenario of agentCases.filter((entry) => entry.agent !== 'claude')) {
    const workspace = initWorkspace(scenario.agent);
    assert.deepStrictEqual(
      readTextTree(path.join(workspace, 'harness', 'docs'), { exclude: ['rules'] }),
      baselineDocs,
      `${scenario.agent} docs should match claude docs`,
    );
    assert.strictEqual(
      read(path.join(workspace, 'agent-work', 'README.md')),
      baselineWorkReadme,
      `${scenario.agent} agent-work README should match claude agent-work README`,
    );
  }
});
