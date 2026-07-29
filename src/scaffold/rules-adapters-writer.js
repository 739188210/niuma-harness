// 为 OpenCode 写入已生成规则正文的 instruction paths，并迁移可验证的旧 Claude 指针。
const fs = require('fs');
const { renderLegacyClaudeRulePointer } = require('../rule/legacy-claude-pointer');

const {
  getAllRuleAdapterTargets,
  getLegacyClaudeRulePointerRoot,
  getLegacyClaudeRulePointerTarget,
  isRuleArtifactManagedByAdapter,
} = require('../harness/agent-native-targets');
const { getAvailableRuleDirs, getRuleAdapterTargetsForAgent } = require('../rule/catalog');
const {
  readOpenCodeConfig,
  reconcileOpenCodeInstructions,
  sameJsonValue,
} = require('../rule/opencode-instructions');
const {
  inspectFileTarget,
  removeEmptyDirsUntil,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../infrastructure/fs-safe');

function prepareRuleAdapterPlan(context) {
  const targets = getRuleAdapterTargetsForAgent(context.options.agent);
  const targetKinds = new Set(targets.map((target) => target.kind));
  const availableRules = getAvailableRuleDirs(context.manifest.rulesRoot);
  const pointerRoot = getLegacyClaudeRulePointerRoot();
  const pointerActions = availableRules
    .map((ruleName) => ({
      targetPath: getLegacyClaudeRulePointerPath(context.workspaceDir, ruleName),
      expectedContent: renderLegacyClaudeRulePointer(context.options.harnessDir, ruleName),
    }))
    .filter((item) => inspectFileTarget(item.targetPath)
      && fs.readFileSync(item.targetPath, 'utf8') === item.expectedContent);
  const openCodeTarget = targets.find((target) => target.kind === 'opencode-instructions');
  const knownOpenCodeTarget = getAllRuleAdapterTargets()
    .find((target) => target.kind === 'opencode-instructions');
  const configPath = getOpenCodeConfigPath(context, openCodeTarget || knownOpenCodeTarget);
  const expectedPaths = openCodeTarget
    ? context.rulePlan
      .filter((item) => item.operation === 'write'
        && isRuleArtifactManagedByAdapter(openCodeTarget, item.target))
      .map((item) => item.target)
    : [];
  const ownedPaths = context.previousStatus ? context.previousStatus.openCodeInstructions : [];
  let nextOwnedPaths = [];
  let openCodeContent = null;
  if (inspectFileTarget(configPath)) {
    const existing = fs.readFileSync(configPath, 'utf8');
    const hasOwnedPath = ownedPaths.some((item) => existing.includes(item));
    if (expectedPaths.length > 0 || hasOwnedPath) {
      const config = readOpenCodeConfig(existing);
      const reconciled = reconcileOpenCodeInstructions(config, expectedPaths, ownedPaths);
      nextOwnedPaths = reconciled.ownedPaths;
      if (!sameJsonValue(reconciled.config, config)) {
        openCodeContent = `${JSON.stringify(reconciled.config, null, 2)}\n`;
      }
    }
  } else if (expectedPaths.length > 0) {
    const reconciled = reconcileOpenCodeInstructions({}, expectedPaths, ownedPaths);
    nextOwnedPaths = reconciled.ownedPaths;
    openCodeContent = `${JSON.stringify(reconciled.config, null, 2)}\n`;
  }
  return {
    configPath,
    expectedOpenCodePaths: nextOwnedPaths,
    ownedOpenCodePaths: ownedPaths,
    openCodeContent,
    pointerActions,
    targets,
    targetKinds,
  };
}

function writeRuleAdapterFiles(context) {
  writeClaudeRulePointers(context);
  writeOpenCodeRulesInstruction(context);
}

function writeClaudeRulePointers(context) {
  const rulesRoot = safeResolveInside(context.workspaceDir, '.claude/rules', 'claude rules root');
  for (const item of context.ruleAdapterPlan.pointerActions) {
    const action = removeFile(item.targetPath, { dryRun: context.options.dryRun });
    context.printAction(action, item.targetPath);
    if (action === 'remove') {
      removeEmptyDirsUntil(path.dirname(item.targetPath), rulesRoot, context.options.dryRun);
    }
  }
}

function getLegacyClaudeRulePointerPath(workspaceDir, ruleName) {
  return safeResolveInside(workspaceDir, getLegacyClaudeRulePointerTarget(ruleName), 'claude rule pointer');
}

function writeOpenCodeRulesInstruction(context) {
  const { configPath, openCodeContent } = context.ruleAdapterPlan;
  if (openCodeContent !== null) {
    context.printAction(writeFile(configPath, openCodeContent, { dryRun: context.options.dryRun, overwrite: true }), configPath);
  }
}

function getOpenCodeConfigPath(context, target) {
  return safeResolveInside(context.workspaceDir, target.file, 'opencode config');
}

module.exports = {
  getLegacyClaudeRulePointerTarget,
  prepareRuleAdapterPlan,
  renderLegacyClaudeRulePointer,
  writeRuleAdapterFiles,
};
