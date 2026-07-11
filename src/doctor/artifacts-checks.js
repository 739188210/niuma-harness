// 校验 schema-2 artifact ledger、当前 command 覆盖和每个已登记文件的精确摘要。
const fs = require('fs');
const { getCommandArtifactDescriptors } = require('../commands');
const { digestBytes, findArtifactRecord, validateArtifactRecords } = require('../artifact-ledger');
const { assertNoSymlinkInPath, safeResolveInside } = require('../fs-safe');
const { addError, addOk } = require('./result');

function checkArtifactFiles(context) {
  const { agent, commands, result, status, workspaceRoot } = context;
  if (status.schemaVersion !== 2) {
    return;
  }

  let artifacts;
  try {
    artifacts = validateArtifactRecords(status.artifacts);
  } catch (error) {
    addError(result, error.message);
    return;
  }
  context.artifacts = artifacts;
  addOk(result, `artifacts ${artifacts.length}`);

  let activeArtifacts = artifacts;
  if (agent && commands) {
    activeArtifacts = checkExpectedCommandRecords(
      result,
      artifacts,
      getCommandArtifactDescriptors(agent, commands)
    );
  }
  for (const record of activeArtifacts) {
    checkArtifactFile(workspaceRoot, result, record);
  }
}

function checkExpectedCommandRecords(result, artifacts, expected) {
  const expectedByTarget = new Map(expected.map((descriptor) => [descriptor.target, descriptor]));
  const active = [];
  for (const descriptor of expected) {
    const record = findArtifactRecord(artifacts, descriptor.kind, descriptor.target);
    if (!record || record.source !== descriptor.source) {
      addError(result, `missing command artifact record ${descriptor.target}`);
      continue;
    }
    active.push(record);
    addOk(result, `command artifact record ${descriptor.target}`);
  }
  for (const record of artifacts) {
    const descriptor = expectedByTarget.get(record.target);
    if (!descriptor || record.kind !== descriptor.kind || record.source !== descriptor.source) {
      addError(result, `inactive command artifact record ${record.target}`);
    }
  }
  return active;
}

function checkArtifactFile(workspaceRoot, result, record) {
  let targetPath;
  try {
    targetPath = safeResolveInside(workspaceRoot, record.target, 'artifact target');
    assertNoSymlinkInPath(targetPath);
  } catch (error) {
    addError(result, error.message);
    return;
  }
  if (!fs.existsSync(targetPath)) {
    addError(result, `missing artifact ${record.target}`);
    return;
  }
  const stat = fs.lstatSync(targetPath);
  if (!stat.isFile()) {
    addError(result, `not a regular artifact file ${record.target}`);
    return;
  }
  const actual = digestBytes(fs.readFileSync(targetPath));
  if (actual !== record.digest) {
    addError(result, `artifact drifted ${record.target}: expected ${record.digest}, got ${actual}`);
    return;
  }
  addOk(result, `artifact intact ${record.target}`);
}

module.exports = {
  checkArtifactFiles,
};
