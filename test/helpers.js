const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { getAvailableRuleDirs, getDefaultRulesForAgent } = require('../src/rules');
const { getAvailableSkillDirs, getSkillTargetRootsForAgent } = require('../src/skills');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const bin = path.join(root, 'bin', 'niuma-harness.js');
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
  // macOS: os.tmpdir() returns /var/... where /var is a symlink to /private/var;
  // resolve it so the scaffold's symlink guard does not refuse the path.
  const base = fs.realpathSync(os.tmpdir());
  return fs.mkdtempSync(path.join(base, 'niuma-harness-'));
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

function expectedDefaultRules(agent) {
  return getDefaultRulesForAgent(agent, allRuleDirs);
}

function assertManifest(filePath, expected) {
  assertFile(filePath);
  const manifest = readJson(filePath);
  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(manifest.agent, expected.agent);
  assert.deepStrictEqual(manifest.rules, expected.rules || expectedDefaultRules(expected.agent));
  assert.deepStrictEqual(manifest.skills, expected.skills || []);
  assert.strictEqual(manifest.harnessDir, expected.harnessDir || 'harness');
  assert.strictEqual(manifest.workDir, expected.workDir || 'agent-work');
  assert.deepStrictEqual(manifest.entryFiles, expected.entryFiles);
  assert.strictEqual(manifest.createdBy, 'niuma-harness');
  assert.ok(!Number.isNaN(Date.parse(manifest.createdAt)), 'createdAt should be an ISO date');
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

module.exports = {
  allRuleDirs,
  allSkillDirs,
  assert,
  assertDir,
  assertFile,
  assertLayerMemos,
  assertManifest,
  assertNoPath,
  assertRuleDirs,
  assertSkillDirs,
  expectedDefaultRules,
  fs,
  path,
  read,
  readJson,
  run,
  tempDir,
};
