const {
  allCommandFiles,
  allRuleDirs,
  allSkillDirs,
  assert,
  assertClaudeRulePointers,
  assertCommandFiles,
  assertDir,
  assertFile,
  assertLayerMemos,
  assertManifest,
  assertNoCodexRulesDir,
  assertNoOpenCodeManagedRulesInstruction,
  assertNoPath,
  assertOpenCodeRulesInstruction,
  assertRuleDirs,
  assertSkillDirs,
  getCommandId,
  getExpectedCommandArtifactTargets,
  expectedDefaultRules,
  fs,
  path,
  read,
  readJson,
  run,
  tempDir,
} = require('./helpers');
const { addAgentRules, getDefaultRulesForAgent, normalizeRules, normalizeRulesOut } = require('../src/rules');
const { getSkillFiles, normalizeSkills, SKILL_METADATA_FILE } = require('../src/skills');

const agentCases = [
  { agent: 'claude', entryFiles: ['CLAUDE.md'], absentEntryFiles: ['AGENTS.md'] },
  { agent: 'codex', entryFiles: ['AGENTS.md'], absentEntryFiles: ['CLAUDE.md'] },
  { agent: 'opencode', entryFiles: ['AGENTS.md'], absentEntryFiles: ['CLAUDE.md'] },
  { agent: 'multi', entryFiles: ['CLAUDE.md', 'AGENTS.md'], absentEntryFiles: [] },
];
const primarySkill = allSkillDirs[0];
const gitSyncCommand = allCommandFiles.includes('git-sync.md') ? 'git-sync.md' : allCommandFiles[0];

function assertCommonHarnessShape(workspace, options = {}) {
  const harnessDir = options.harnessDir || 'harness';
  const harnessRoot = path.join(workspace, harnessDir);

  assertFile(path.join(harnessRoot, 'HARNESS_GUIDE.md'));
  assertFile(path.join(harnessRoot, 'docs', 'index.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'action-boundary.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'secret-leak.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'untrusted-content.md'));
  assertDir(path.join(harnessRoot, 'docs', 'experiments'));
  assertFile(path.join(harnessRoot, 'docs', 'experiments', 'task-execution-record.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'refactor.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'review.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'release.md'));
  assertLayerMemos(harnessRoot);
  assertNoPath(path.join(harnessRoot, 'docs', 'layers', '01-context'));
  assertDir(path.join(workspace, 'agent-work'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));
  assertDir(path.join(workspace, 'agent-work', 'tasks'));
  assertNoPath(path.join(harnessRoot, 'docs', 'tasks'));
  assertNoPath(path.join(harnessRoot, 'agent-work'));
}

function assertAgentEntryShape(workspace, scenario, options = {}) {
  const harnessDir = options.harnessDir || 'harness';
  const harnessRoot = path.join(workspace, harnessDir);

  for (const entryFile of scenario.entryFiles) {
    assertFile(path.join(workspace, entryFile));
  }

  for (const entryFile of scenario.absentEntryFiles) {
    assertNoPath(path.join(workspace, entryFile));
  }

  for (const entryFile of ['CLAUDE.md', 'AGENTS.md']) {
    assertNoPath(path.join(harnessRoot, entryFile));
  }

  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: scenario.agent,
    entryFiles: scenario.entryFiles,
    harnessDir,
  });
}

function initWorkspace(agent) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', agent]);
  assert.strictEqual(result.status, 0, result.stderr);
  return workspace;
}

function readTextTree(root, options = {}) {
  const tree = {};
  const excludedPrefixes = options.exclude || [];

  function walk(currentDir, prefix) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excludedPrefixes.some((excludedPrefix) => relativePath === excludedPrefix || relativePath.startsWith(`${excludedPrefix}/`))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(entryPath, relativePath);
      } else if (entry.isFile()) {
        tree[relativePath] = read(entryPath);
      }
    }
  }

  walk(root, '');
  return tree;
}

module.exports = {
  SKILL_METADATA_FILE,
  addAgentRules,
  agentCases,
  allCommandFiles,
  allRuleDirs,
  allSkillDirs,
  assert,
  assertAgentEntryShape,
  assertClaudeRulePointers,
  assertCommandFiles,
  assertCommonHarnessShape,
  assertDir,
  assertFile,
  assertManifest,
  assertNoCodexRulesDir,
  assertNoOpenCodeManagedRulesInstruction,
  assertNoPath,
  assertOpenCodeRulesInstruction,
  assertRuleDirs,
  assertSkillDirs,
  expectedDefaultRules,
  fs,
  getCommandId,
  getDefaultRulesForAgent,
  getExpectedCommandArtifactTargets,
  getSkillFiles,
  gitSyncCommand,
  initWorkspace,
  normalizeRules,
  normalizeRulesOut,
  normalizeSkills,
  path,
  primarySkill,
  read,
  readJson,
  readTextTree,
  run,
  tempDir,
};
