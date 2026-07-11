const assert = require('assert');
const crypto = require('crypto');
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
  const expectedTargets = explicitTargets ? [...explicitTargets] : getExpectedCommandArtifactTargets(agent, commandFiles);
  expectedTargets.sort((left, right) => left.localeCompare(right));
  assert.deepStrictEqual(manifest.artifacts.map((record) => record.target), expectedTargets);
  for (const record of manifest.artifacts) {
    assert.strictEqual(record.kind, 'command');
    assert.match(record.source, /^commands\/.+\.md$/);
    const targetPath = path.join(workspaceRoot, ...record.target.split('/'));
    const digest = `sha256:${crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex')}`;
    assert.strictEqual(record.digest, digest, `digest should match ${record.target}`);
  }
}

function assertRuleDirs(harnessRoot, expected) {
  for (const ruleDir of allRuleDirs) {
    const ruleDirPath = path.join(harnessRoot, 'docs', 'rules', ruleDir);
    if (expected.includes(ruleDir)) {
      assertDir(ruleDirPath);
    } else {
      assertNoPath(ruleDirPath);
    }
  }
}

function assertClaudeRulePointers(workspaceRoot, harnessDir, expected) {
  for (const ruleDir of allRuleDirs) {
    const pointerPath = path.join(workspaceRoot, '.claude', 'rules', `niuma-${ruleDir}.md`);
    if (expected.includes(ruleDir)) {
      assertFile(pointerPath);
      assert.match(read(pointerPath), new RegExp(`${escapeRegExp(harnessDir)}/docs/rules/${escapeRegExp(ruleDir)}/`));
    } else {
      assertNoPath(pointerPath);
    }
  }
}

function assertOpenCodeRulesInstruction(workspaceRoot, harnessDir, expected) {
  const config = readJson(path.join(workspaceRoot, 'opencode.json'));
  const instructions = Array.isArray(config.instructions) ? config.instructions.join('\n') : config.instructions;
  assert.strictEqual(typeof instructions, 'string');
  assert.match(instructions, /niuma-harness:rules begin/);
  assert.match(instructions, new RegExp(`${escapeRegExp(harnessDir)}/docs/rules/`));
  for (const ruleDir of expected) {
    assert.match(instructions, new RegExp(`\\b${escapeRegExp(ruleDir)}\\b`));
  }
}

function assertNoOpenCodeManagedRulesInstruction(workspaceRoot) {
  const configPath = path.join(workspaceRoot, 'opencode.json');
  if (!fs.existsSync(configPath)) {
    return;
  }

  const config = readJson(configPath);
  const instructions = Array.isArray(config.instructions) ? config.instructions.join('\n') : config.instructions || '';
  assert.doesNotMatch(instructions, /niuma-harness:rules begin/);
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
  getCommandId,
  getExpectedCommandArtifactTargets,
  expectedDefaultRules,
  fs,
  path,
  read,
  readJson,
  run,
  snapshotTree,
  tempDir,
  updateManifest,
};
