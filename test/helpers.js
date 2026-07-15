const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  getAvailableCommandFiles,
  getCommandId,
  getCommandTargetsForAgent,
  getDefaultCommandsForAgent,
} = require('../src/commands');
const { getAvailableRuleDirs, getDefaultRulesForAgent } = require('../src/rules');
const { renderCommandArtifacts } = require('../src/command-artifacts');
const { digestBytes } = require('../src/artifact-ledger');
const { renderRuleArtifacts } = require('../src/rule-artifacts');
const { createTemplateVariables } = require('../src/template-variables');
const { getAvailableSkillDirs, getSkillTargetRootsForAgent } = require('../src/skills');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const bin = path.join(root, 'bin', 'niuma-harness.js');
const allCommandFiles = getAvailableCommandFiles();
const allRuleDirs = getAvailableRuleDirs();
const allSkillDirs = getAvailableSkillDirs();
const layerMemos = [
  'docs/layers/01-context.md',
  'docs/layers/02-policy.md',
  'docs/layers/03-process.md',
  'docs/layers/04-observation.md',
  'docs/layers/05-recovery.md',
  'docs/layers/06-memory.md',
  'docs/layers/07-loop.md',
];

function run(args) {
  return spawnSync(node, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function copyCliPackage() {
  const cliRoot = tempDir();
  for (const entry of ['bin', 'src', 'templates', 'package.json']) {
    fs.cpSync(path.join(root, entry), path.join(cliRoot, entry), { recursive: true });
  }
  return cliRoot;
}

function runWithCliRoot(cliRoot, args) {
  return spawnSync(node, [path.join(cliRoot, 'bin', 'niuma-harness.js'), ...args], {
    cwd: cliRoot,
    encoding: 'utf8',
  });
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'niuma-harness-'));
}

function assertFile(filePath) {
  assert.ok(fs.existsSync(filePath), `${filePath} should exist`);
}

function assertDir(dirPath) {
  assert.ok(fs.existsSync(dirPath), `${dirPath} should exist`);
  assert.ok(fs.lstatSync(dirPath).isDirectory(), `${dirPath} should be a directory`);
}

function assertNoPath(targetPath) {
  assert.ok(!fs.existsSync(targetPath), `${targetPath} should not exist`);
}

function snapshotTree(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return null;
  }
  const stat = fs.lstatSync(rootPath);
  if (stat.isFile()) {
    return { type: 'file', content: fs.readFileSync(rootPath, 'base64') };
  }
  if (!stat.isDirectory()) {
    return { type: stat.isSymbolicLink() ? 'symlink' : 'other' };
  }
  return {
    type: 'directory',
    entries: Object.fromEntries(fs.readdirSync(rootPath).sort().map((name) => [name, snapshotTree(path.join(rootPath, name))])),
  };
}

function assertTreeUnchanged(rootPath, before) {
  assert.deepStrictEqual(snapshotTree(rootPath), before, `${rootPath} should remain unchanged`);
}

function assertLayerMemos(harnessRoot) {
  for (const layerMemo of layerMemos) {
    assertFile(path.join(harnessRoot, ...layerMemo.split('/')));
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(read(filePath));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function updateManifest(workspaceRoot, mutate, harnessDir = 'harness') {
  const manifestPath = path.join(workspaceRoot, harnessDir, 'manifest.json');
  const manifest = readJson(manifestPath);
  mutate(manifest);
  writeJson(manifestPath, manifest);
  return manifest;
}

function expectedDefaultRules(agent) {
  return getDefaultRulesForAgent(agent, allRuleDirs);
}

function expectedDefaultCommands(agent) {
  return getDefaultCommandsForAgent(agent, allCommandFiles);
}

function assertManifest(filePath, expected) {
  assertFile(filePath);
  const manifest = readJson(filePath);
  assert.strictEqual(manifest.schemaVersion, 2);
  assert.strictEqual(manifest.agent, expected.agent);
  assert.deepStrictEqual(manifest.rules, expected.rules || expectedDefaultRules(expected.agent));
  assert.deepStrictEqual(manifest.skills, expected.skills || allSkillDirs);
  assert.deepStrictEqual(manifest.commands, expected.commands || expectedDefaultCommands(expected.agent));
  assert.strictEqual(manifest.harnessDir, expected.harnessDir || 'harness');
  assert.strictEqual(manifest.workDir, expected.workDir || 'agent-work');
  assert.deepStrictEqual(manifest.entryFiles, expected.entryFiles);
  const expectedOpenCode = (expected.agent === 'opencode' || expected.agent === 'multi')
    ? getExpectedRuleArtifactTargets('opencode', manifest.rules, manifest.harnessDir)
    : [];
  assert.deepStrictEqual(manifest.openCodeInstructions, expectedOpenCode);
  assertArtifactRecords(filePath, manifest, expected.agent, manifest.commands, expected.artifactTargets);
  assert.strictEqual(manifest.createdBy, 'niuma-harness');
  assert.ok(!Number.isNaN(Date.parse(manifest.createdAt)), 'createdAt should be an ISO date');
}

function getExpectedCommandArtifactTargets(agent, commandFiles) {
  const targets = [];
  for (const target of getCommandTargetsForAgent(agent)) {
    for (const commandFile of commandFiles) {
      const commandId = getCommandId(commandFile);
      if (target.kind === 'codex-skill-command') {
        targets.push(
          `${target.root}/${commandId}/SKILL.md`,
          `${target.root}/${commandId}/agents/openai.yaml`
        );
      } else {
        targets.push(`${target.root}/${commandFile}`);
      }
    }
  }
  return targets;
}

function assertArtifactRecords(manifestPath, manifest, agent, commandFiles, explicitTargets) {
  assert.ok(Array.isArray(manifest.artifacts), 'manifest artifacts should be an array');
  const workspaceRoot = path.dirname(path.dirname(manifestPath));
  const expected = getExpectedArtifactRecords(
    agent,
    commandFiles,
    manifest.rules,
    manifest.harnessDir,
    explicitTargets
  );
  const actual = manifest.artifacts.map(({ kind, source, target, digest }) => ({ kind, source, target, digest }));
  assert.deepStrictEqual(actual, expected);
  for (const record of actual) {
    const targetPath = path.join(workspaceRoot, ...record.target.split('/'));
    assert.strictEqual(record.digest, digestBytes(fs.readFileSync(targetPath)), `digest should match ${record.target}`);
  }
}

function getExpectedArtifactRecords(agent, commandFiles, rules, harnessDir = 'harness', explicitCommandTargets) {
  const variables = createTemplateVariables({ agent, harnessDir }, 'agent-work');
  const commandArtifacts = renderCommandArtifacts(agent, commandFiles, undefined, variables);
  const expectedCommands = explicitCommandTargets
    ? commandArtifacts.filter((artifact) => explicitCommandTargets.includes(artifact.target))
    : commandArtifacts;
  const ruleArtifacts = renderRuleArtifacts(agent, rules, undefined, variables);
  return [...expectedCommands, ...ruleArtifacts]
    .map(({ kind, source, target, digest, content }) => ({
      kind,
      source,
      target,
      digest: digest || digestBytes(Buffer.from(content, 'utf8')),
    }))
    .sort((left, right) => left.target.localeCompare(right.target));
}

function getExpectedRuleArtifactTargets(agent, rules, harnessDir = 'harness') {
  const variables = createTemplateVariables({ agent, harnessDir }, 'agent-work');
  return renderRuleArtifacts(agent, rules, undefined, variables).map((artifact) => artifact.target);
}

function assertRuleDirs(harnessRoot, expected) {
  assertNoPath(path.join(harnessRoot, 'docs', 'rules'));
}

function assertClaudeRulePointers(workspaceRoot, harnessDir, expected) {
  const variables = createTemplateVariables({ agent: 'claude', harnessDir }, 'agent-work');
  const expectedTargets = new Set(getExpectedRuleArtifactTargets('claude', expected, harnessDir));
  for (const artifact of renderRuleArtifacts('claude', allRuleDirs, undefined, variables)) {
    const targetPath = path.join(workspaceRoot, ...artifact.target.split('/'));
    if (expectedTargets.has(artifact.target)) assertFile(targetPath);
    else assertNoPath(targetPath);
  }
}

function assertOpenCodeRulesInstruction(workspaceRoot, harnessDir, expected) {
  const config = readJson(path.join(workspaceRoot, 'opencode.json'));
  assert.ok(Array.isArray(config.instructions), 'OpenCode instructions must be an array');
  assert.ok(config.instructions.every((instruction) => typeof instruction === 'string'));
  const managed = getExpectedRuleArtifactTargets('opencode', expected, harnessDir);
  for (const target of managed) {
    assert.strictEqual(
      config.instructions.filter((instruction) => instruction === target).length,
      1,
      `OpenCode instructions must contain ${target} exactly once`
    );
  }
  assert.doesNotMatch(config.instructions.join('\n'), /niuma-harness:rules begin/);
}

function assertNoOpenCodeManagedRulesInstruction(workspaceRoot, harnessDir = 'harness') {
  const configPath = path.join(workspaceRoot, 'opencode.json');
  if (!fs.existsSync(configPath)) {
    return;
  }

  const config = readJson(configPath);
  if (!Array.isArray(config.instructions)) {
    return;
  }
  const known = new Set(getExpectedRuleArtifactTargets('opencode', allRuleDirs, harnessDir));
  assert.ok(config.instructions.every((instruction) => !known.has(instruction)));
}

function assertNoCodexRulesDir(workspaceRoot) {
  assertNoPath(path.join(workspaceRoot, '.codex', 'rules'));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertSkillDirs(workspaceRoot, agent, expected) {
  for (const targetRoot of getSkillTargetRootsForAgent(agent)) {
    for (const skillDir of allSkillDirs) {
      const skillDirPath = path.join(workspaceRoot, ...targetRoot.split('/'), skillDir);
      if (expected.includes(skillDir)) {
        assertDir(skillDirPath);
      } else {
        assertNoPath(skillDirPath);
      }
    }
  }
}

function assertCommandFiles(workspaceRoot, agent, expected) {
  for (const target of getCommandTargetsForAgent(agent)) {
    for (const commandFile of allCommandFiles) {
      if (target.kind === 'codex-skill-command') {
        assertCodexCommandSkill(workspaceRoot, target.root, commandFile, expected.includes(commandFile));
        continue;
      }

      const commandFilePath = path.join(workspaceRoot, ...target.root.split('/'), commandFile);
      if (expected.includes(commandFile)) {
        assertFile(commandFilePath);
      } else {
        assertNoPath(commandFilePath);
      }
    }
  }
}

function assertCodexCommandSkill(workspaceRoot, targetRoot, commandFile, shouldExist) {
  const commandId = getCommandId(commandFile);
  const skillDir = path.join(workspaceRoot, ...targetRoot.split('/'), commandId);
  if (!shouldExist) {
    assertNoPath(skillDir);
    return;
  }

  assertDir(skillDir);
  assertFile(path.join(skillDir, 'SKILL.md'));
  assertFile(path.join(skillDir, 'agents', 'openai.yaml'));
}

module.exports = {
  allCommandFiles,
  allRuleDirs,
  allSkillDirs,
  assert,
  assertClaudeRulePointers,
  assertCommandFiles,
  assertCodexCommandSkill,
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
  assertTreeUnchanged,
  copyCliPackage,
  getCommandId,
  getExpectedArtifactRecords,
  getExpectedCommandArtifactTargets,
  expectedDefaultRules,
  fs,
  path,
  read,
  readJson,
  run,
  runWithCliRoot,
  snapshotTree,
  tempDir,
  updateManifest,
};
