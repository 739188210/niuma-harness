// 校验 OpenCode 是否加载 Niuma 生成的原生 Markdown rules。
const fs = require('fs');
const path = require('path');

const {
  getAllRuleAdapterTargets,
  isRuleArtifactManagedByAdapter,
} = require('../agent-native-targets');
const { renderRuleArtifacts } = require('../rule-artifacts');
const { getRuleAdapterTargetsForAgent } = require('../rules');
const { safeResolveInside } = require('../fs-safe');
const { createTemplateVariables } = require('../template-variables');
const { addError, addOk } = require('./result');

function checkRuleAdapterFiles(context) {
  const { agent, rules } = context;
  if (!agent || !rules) {
    return;
  }

  const targets = getRuleAdapterTargetsForAgent(agent);
  const targetKinds = new Set(targets.map((target) => target.kind));

  if (targetKinds.has('opencode-instructions')) {
    checkOpenCodeRulesInstruction(context, targets.find((target) => target.kind === 'opencode-instructions'));
  } else {
    checkNoStaleOpenCodeRulesInstruction(context);
  }

}

function checkOpenCodeRulesInstruction(context, target) {
  const { result, workspaceRoot } = context;
  const expected = getOpenCodeRulePaths(context, context.rules, target);
  if (expected.length === 0) {
    checkNoStaleOpenCodeRulesInstruction(context);
    return;
  }

  const configPath = safeResolveInside(workspaceRoot, target.file, 'opencode config');
  if (!fs.existsSync(configPath)) {
    addError(result, 'missing opencode.json rules instructions');
    return;
  }

  const config = readOpenCodeConfig(configPath, result);
  if (!config) {
    return;
  }

  const instructions = readInstructionPaths(config.instructions, result);
  if (!instructions) {
    return;
  }

  for (const expectedPath of expected) {
    const count = instructions.filter((item) => item === expectedPath).length;
    if (count !== 1) {
      addError(result, `opencode.json rules instructions must contain ${expectedPath} exactly once`);
      return;
    }
  }

  addOk(result, 'opencode.json rules instructions');
}

function checkNoStaleOpenCodeRulesInstruction(context) {
  const { result, workspaceRoot } = context;
  const target = getAllRuleAdapterTargets().find((item) => item.kind === 'opencode-instructions');
  if (!target) return;
  const configPath = safeResolveInside(workspaceRoot, target.file, 'opencode config');
  if (!fs.existsSync(configPath)) {
    return;
  }

  const config = readOpenCodeConfig(configPath, result, { ignoreInvalid: true });
  if (!config) {
    return;
  }
  if (!Array.isArray(config.instructions)) {
    return;
  }
  const manifest = context.status;
  const owned = manifest && Array.isArray(manifest.openCodeInstructions)
    ? manifest.openCodeInstructions
    : [];
  const stale = config.instructions.find((item) => owned.includes(item));
  if (stale) {
    addError(result, `stale opencode.json niuma rules instruction ${stale}`);
  }
}

function getOpenCodeRulePaths(context, rules, target) {
  const variables = createTemplateVariables(
    { agent: context.agent, harnessDir: path.basename(context.harnessRoot) },
    context.runtimeLayout.workDirectory
  );
  return renderRuleArtifacts(
    context.agent,
    rules,
    context.templateManifest.rulesRoot,
    variables
  )
    .filter((artifact) => isRuleArtifactManagedByAdapter(target, artifact.target))
    .map((artifact) => artifact.target);
}

function readOpenCodeConfig(configPath, result, options = {}) {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    if (!options.ignoreInvalid) {
      addError(result, `invalid opencode.json: ${error.message}`);
    }
    return null;
  }

  if (!config || Array.isArray(config) || typeof config !== 'object') {
    if (!options.ignoreInvalid) {
      addError(result, 'opencode.json must contain a JSON object');
    }
    return null;
  }

  return config;
}

function readInstructionPaths(instructions, result) {
  if (instructions === undefined) {
    addError(result, 'opencode.json missing instructions');
    return null;
  }
  if (!Array.isArray(instructions) || instructions.some((instruction) => typeof instruction !== 'string')) {
    addError(result, 'opencode.json instructions must be an array of strings');
    return null;
  }
  return instructions;
}

module.exports = {
  checkRuleAdapterFiles,
};
