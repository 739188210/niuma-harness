const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const bin = path.join(root, 'bin', 'niuma-harness.js');
const allRuleDirs = ['common', 'java', 'typescript', 'web'];
const layerMemos = [
  'docs/layers/01-context/memo.md',
  'docs/layers/02-policy/memo.md',
  'docs/layers/03-process/memo.md',
  'docs/layers/04-observation/memo.md',
  'docs/layers/05-recovery/memo.md',
  'docs/layers/06-memory/memo.md',
  'docs/layers/07-loop/memo.md',
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

function assertManifest(filePath, expected) {
  assertFile(filePath);
  const manifest = readJson(filePath);
  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(manifest.agent, expected.agent);
  assert.deepStrictEqual(manifest.rules, expected.rules || ['common']);
  assert.strictEqual(manifest.harnessDir, expected.harnessDir || 'harness');
  assert.strictEqual(manifest.flat, Boolean(expected.flat));
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

module.exports = {
  allRuleDirs,
  assert,
  assertDir,
  assertFile,
  assertLayerMemos,
  assertManifest,
  assertNoPath,
  assertRuleDirs,
  fs,
  path,
  read,
  readJson,
  run,
  tempDir,
};
