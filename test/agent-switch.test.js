const test = require('node:test');
const {
  allCommandFiles,
  allRuleDirs,
  allSkillDirs,
  assert,
  assertClaudeRulePointers,
  assertFile,
  assertManifest,
  assertNoCodexRulesDir,
  assertNoPath,
  assertOpenCodeRulesInstruction,
  assertRuleDirs,
  fs,
  getExpectedArtifactRecords,
  path,
  read,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');
const { getEntryFilesForAgent } = require('../src/agents');
const { getSkillTargetRootsForAgent } = require('../src/skills');

const agents = ['claude', 'codex', 'opencode', 'multi'];

for (const from of agents) {
  for (const to of agents) {
    test(`agent switch ${from} -> ${to} converges managed surfaces`, () => {
      const workspace = tempDir();
      const skill = allSkillDirs[0];
      let result = run(['init', workspace, '--agent', from, '--skills', skill]);
      assert.strictEqual(result.status, 0, result.stderr);
      result = run(['init', workspace, '--agent', to, '--skills', skill]);
      assert.strictEqual(result.status, 0, result.stderr);

      const activeEntries = new Set(getEntryFilesForAgent(to));
      for (const entry of ['CLAUDE.md', 'AGENTS.md']) {
        const target = path.join(workspace, entry);
        if (activeEntries.has(entry)) {
          assertFile(target);
          assert.match(read(target), /niuma-harness:contract begin/);
        } else if (fs.existsSync(target)) {
          assert.doesNotMatch(read(target), /niuma-harness:contract/);
        }
      }

      const activeRoots = new Set(getSkillTargetRootsForAgent(to));
      for (const root of getSkillTargetRootsForAgent(from)) {
        const target = path.join(workspace, root, skill, 'SKILL.md');
        if (activeRoots.has(root)) {
          assertFile(target);
        } else {
          assertNoPath(target);
        }
      }

      const manifestPath = path.join(workspace, 'harness', 'manifest.json');
      assertManifest(manifestPath, {
        agent: to,
        skills: [skill],
        entryFiles: getEntryFilesForAgent(to),
      });
      assert.deepStrictEqual(
        JSON.parse(read(manifestPath)).artifacts,
        getExpectedArtifactRecords(to, allCommandFiles, JSON.parse(read(manifestPath)).rules)
      );
      const doctor = run(['doctor', workspace]);
      assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
    });
  }
}

for (const scenario of [
  { from: 'multi', fromRulesOut: 'common', to: 'claude', toRulesOut: 'claude' },
  { from: 'opencode', fromRulesOut: 'opencode', to: 'multi', toRulesOut: 'codex' },
]) {
  test(`agent switch ${scenario.from} --rules-out ${scenario.fromRulesOut} -> ${scenario.to} --rules-out ${scenario.toRulesOut} converges rules surfaces`, () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', scenario.from, '--rules-out', scenario.fromRulesOut, '--skills', 'none']);
    assert.strictEqual(result.status, 0, result.stderr);

    result = run(['init', workspace, '--agent', scenario.to, '--rules-out', scenario.toRulesOut, '--skills', 'none']);
    assert.strictEqual(result.status, 0, result.stderr);

    const expectedRules = allRuleDirs.filter((rule) => rule !== scenario.toRulesOut);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, expectedRules);
    assertNoPath(path.join(harnessRoot, 'docs', 'rules', scenario.toRulesOut));
    if (scenario.to === 'claude' || scenario.to === 'multi') {
      assertClaudeRulePointers(workspace, 'harness', expectedRules);
    } else {
      for (const rule of allRuleDirs) assertNoPath(path.join(workspace, '.claude', 'rules', `niuma-${rule}.md`));
    }
    if (scenario.to === 'opencode' || scenario.to === 'multi') {
      assertOpenCodeRulesInstruction(workspace, 'harness', expectedRules);
      const instructions = JSON.stringify(JSON.parse(read(path.join(workspace, 'opencode.json'))).instructions);
      assert.doesNotMatch(instructions, new RegExp(`Selected rule directories:[^\\n]*\\b${scenario.toRulesOut}\\b`));
    } else if (fs.existsSync(path.join(workspace, 'opencode.json'))) {
      assert.doesNotMatch(read(path.join(workspace, 'opencode.json')), /niuma-harness:rules begin/);
    }
    assertNoCodexRulesDir(workspace);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: scenario.to,
      rules: expectedRules,
      skills: [],
      entryFiles: getEntryFilesForAgent(scenario.to),
    });
    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
  });
}

test('agent switch dry-run reports removals without mutation', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi', '--skills', allSkillDirs[0]]);
  assert.strictEqual(result.status, 0, result.stderr);
  const before = snapshotTree(workspace);
  result = run(['init', workspace, '--agent', 'claude', '--skills', allSkillDirs[0], '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /REMOVE/);
  assert.deepStrictEqual(snapshotTree(workspace), before);
});
