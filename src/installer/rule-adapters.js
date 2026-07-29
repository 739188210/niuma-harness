const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../infrastructure/content-digest');
const {
  getRuleAdapterTargetsForAgent,
  isRuleArtifactManagedByAdapter,
} = require('../harness/agent-native-targets');
const { safeResolveInside } = require('../infrastructure/fs-safe');
const { readRegularFileNoFollow } = require('./safe-fs');
const {
  readOpenCodeConfig,
  reconcileOpenCodeInstructions,
  sameJsonValue,
} = require('../rule/opencode-instructions');

function prepareRuleAdapterArtifacts({ workspaceDir, agent, ruleArtifacts }) {
  const artifacts = [];

  const openCodeTarget = getRuleAdapterTargetsForAgent(agent)
    .find((target) => target.kind === 'opencode-instructions');
  if (openCodeTarget) {
    const expectedPaths = ruleArtifacts
      .filter((artifact) => isRuleArtifactManagedByAdapter(openCodeTarget, artifact.target))
      .map((artifact) => artifact.target);
    const configArtifact = prepareOpenCodeConfigArtifact({
      workspaceDir,
      configFile: openCodeTarget.file,
      expectedPaths,
    });
    if (configArtifact) artifacts.push(configArtifact);
  }

  return artifacts;
}

function prepareOpenCodeConfigArtifact({ workspaceDir, configFile, expectedPaths }) {
  if (expectedPaths.length === 0) return null;
  const existing = readOptionalRegularFile(workspaceDir, configFile, 'opencode.json');
  if (existing === null) {
    const reconciled = reconcileOpenCodeInstructions({}, expectedPaths, []);
    return artifact('rule-adapter', 'installer/opencode-instructions', configFile, `${JSON.stringify(reconciled.config, null, 2)}\n`);
  }

  const config = readOpenCodeConfig(existing);
  const reconciled = reconcileOpenCodeInstructions(config, expectedPaths, []);
  if (sameJsonValue(reconciled.config, config)) return null;
  return artifact('rule-adapter', 'installer/opencode-instructions', configFile, `${JSON.stringify(reconciled.config, null, 2)}\n`);
}

function readOptionalRegularFile(workspaceDir, target, label) {
  const targetPath = safeResolveInside(workspaceDir, target, label);
  let stat;
  try {
    stat = fs.lstatSync(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Cannot update ${target} because it is not a regular file.`);
  }
  return readRegularFileNoFollow({ workspaceDir, filePath: targetPath, label }).toString('utf8');
}

function artifact(kind, source, target, content) {
  return {
    kind,
    source,
    target: path.posix.normalize(target),
    content,
    digest: digestBytes(Buffer.from(content, 'utf8')),
  };
}

module.exports = {
  prepareRuleAdapterArtifacts,
  prepareOpenCodeConfigArtifact,
};
