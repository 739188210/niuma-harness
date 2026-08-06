const test = require('node:test');
const { sliceContractBlock } = require('../../src/harness/contract');
const {
  agentCases,
  assert,
  assertAgentEntryShape,
  assertCommonHarnessShape,
  initWorkspace,
  path,
  read,
  readTextTree,
  run,
  tempDir,
} = require('../support/init-fixtures');


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
  assert.match(body, /Operating Contract/, 'entry must contain the operating contract');
  assert.match(body, /autonomous \/ ask-first \/ stop-and-report/, 'entry must use Policy action categories');
  assert.match(body, /Ask before ask-first; always stop at stop-and-report or unclear risk/, 'entry must align action handling with Policy');
  assert.doesNotMatch(body, /forbidden|stop-and-escalate|default-forbidden/, 'entry must not reference retired Policy categories');
  assert.match(body, /harness\/docs\/layers\/03-process\.md/, 'entry must point task-material profile selection to Process');
  assert.match(body, /only progressive task-material profile card for Direct, Planned, or Tracked work/, 'entry must point task-material selection to the work-area profile card');
  assert.match(body, /Inspect the smallest request-relevant current source, configuration, build, test, README, or command evidence/i, 'entry must prioritize task-specific current evidence');
  assert.match(body, /harness\/docs\/layers\/01-context\.md/, 'entry depth links must include the harness directory');
  assert.doesNotMatch(body, /\(depth: `docs\//, 'entry depth links must not use workspace-root docs paths');
});

test('root managed contract uses the current Policy action categories', () => {
  const rootEntry = read(path.join(__dirname, '..', '..', 'CLAUDE.md'));
  const templateEntry = read(path.join(__dirname, '..', '..', 'templates', 'entry', 'entry.md'));
  const rootContract = sliceContractBlock(rootEntry);
  const templateContract = sliceContractBlock(templateEntry);
  const actionCategories = /autonomous \/ ask-first \/ stop-and-report/;
  const actionHandling = /Ask before ask-first; always stop at stop-and-report or unclear risk/;
  const retiredCategories = /forbidden|stop-and-escalate|default-forbidden/;

  assert.ok(rootContract, 'root entry must contain a complete managed contract');
  assert.ok(templateContract, 'entry template must contain a complete managed contract');
  assert.match(rootContract, actionCategories, 'root contract must use current Policy action categories');
  assert.match(rootContract, actionHandling, 'root contract must use current Policy action handling');
  assert.doesNotMatch(rootContract, retiredCategories, 'root contract must not use retired Policy categories');
  assert.match(templateContract, actionCategories, 'entry template must use current Policy action categories');
  assert.match(templateContract, actionHandling, 'entry template must use current Policy action handling');
  assert.doesNotMatch(templateContract, retiredCategories, 'entry template must not use retired Policy categories');
});

test('multi mode makes AGENTS.md the complete entry and CLAUDE.md its pointer', () => {
  const workspace = initWorkspace('multi');
  const claude = read(path.join(workspace, 'CLAUDE.md'));
  const agents = read(path.join(workspace, 'AGENTS.md'));
  assert.match(claude, /Niuma Harness — Claude Pointer/);
  assert.match(claude, /read the root \[`AGENTS\.md`\]\(AGENTS\.md\)/);
  assert.doesNotMatch(claude, /Niuma Harness — Operating Contract/);
  assert.doesNotMatch(claude, /Codex engineering rules/);
  assert.match(agents, /Niuma Harness — Operating Contract/);
  assert.match(agents, /## Codex engineering rules/);
  assert.match(agents, /\.agents\/harness-rules\//);
  assert.doesNotMatch(agents, /Selected engineering rules|niuma-harness:codex-rules/);
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

test('all agent entries retain the shared operating contract', () => {
  for (const scenario of agentCases) {
    const workspace = initWorkspace(scenario.agent);

    for (const entryFile of scenario.entryFiles) {
      const entry = read(path.join(workspace, entryFile));
      assert.match(entry, /<!-- niuma-harness:contract begin/);
      assert.match(entry, /<!-- niuma-harness:contract end/);
      if (scenario.agent === 'multi' && entryFile === 'CLAUDE.md') {
        assert.match(entry, /Niuma Harness — Claude Pointer/);
        assert.match(entry, /read the root \[`AGENTS\.md`\]\(AGENTS\.md\)/);
        assert.doesNotMatch(entry, /Niuma Harness — Operating Contract/);
        continue;
      }
      assert.match(entry, /Niuma Harness — Operating Contract/);
      if (entryFile === 'AGENTS.md' && (scenario.agent === 'codex' || scenario.agent === 'multi')) {
        assert.match(entry, /## Codex engineering rules/);
        assert.match(entry, /\.agents\/harness-rules\/common\//);
        assert.doesNotMatch(entry, /Selected engineering rules|niuma-harness:codex-rules/);
      }
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
