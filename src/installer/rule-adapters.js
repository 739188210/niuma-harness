const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../infrastructure/content-digest');
const {
  analyzeContractBlock,
  replaceContractBlock,
} = require('../harness/contract');
const { appendCodexRuleSections } = require('../rule/codex-entry-rules');
const {
  getRuleAdapterTargetsForAgent,
  getRuleEntryInjectionForAgent,
  isRuleArtifactManagedByAdapter,
} = require('../harness/agent-native-targets');
const { safeResolveInside } = require('../infrastructure/fs-safe');
const { readRegularFileNoFollow } = require('./safe-fs');
const {
  readOpenCodeConfig,
  reconcileOpenCodeInstructions,
  sameJsonValue,
} = require('../rule/opencode-instructions');

function prepareRuleAdapterArtifacts({ workspaceDir, agent, rules, ruleArtifacts, variables }) {
  const artifacts = [];
  const injection = getRuleEntryInjectionForAgent(agent);
  if (injection) {
    const entryArtifact = prepareCodexEntryArtifact({ workspaceDir, rules, variables, entryFile: injection.entryFile });
    if (entryArtifact) artifacts.push(entryArtifact);
  }

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

function prepareCodexEntryArtifact({ workspaceDir, rules, variables, entryFile }) {
  const existing = readRequiredRegularFile(workspaceDir, entryFile, 'Niuma entry contract');
  if (existing === null) {
    throw new Error(`Cannot install Codex rules because ${entryFile} has no Niuma contract. Run init first.`);
  }

  const analysis = analyzeContractBlock(existing);
  if (analysis.status !== 'valid') {
    throw new Error(`Cannot install Codex rules because ${entryFile} has an invalid Niuma contract (${analysis.status}). Run init first.`);
  }

  const nextBlock = appendCodexRuleSections(analysis.block, rules, variables);
  if (nextBlock === analysis.block) return null;
  const content = replaceContractBlock(existing, nextBlock);
  if (content === null) {
    throw new Error(`Cannot install Codex rules because ${entryFile} has an invalid Niuma contract. Run init first.`);
  }
  return artifact('rule-adapter', 'installer/codex-rules-contract', entryFile, content);
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

function readRequiredRegularFile(workspaceDir, target, label) {
  const content = readOptionalRegularFile(workspaceDir, target, label);
  if (content === null) return null;
  return content;
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  appendCodexRuleSections,
  prepareRuleAdapterArtifacts,
  prepareOpenCodeConfigArtifact,
};
