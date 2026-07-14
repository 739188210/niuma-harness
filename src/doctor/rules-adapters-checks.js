// 校验 agent-native rules 入口是否指向 canonical docs/rules。
const fs = require('fs');
const path = require('path');

const { renderRuleArtifacts } = require('../rule-artifacts');
const { getAvailableRuleDirs, getRuleAdapterTargetsForAgent } = require('../rules');
const { safeResolveInside } = require('../fs-safe');
const { CONTRACT_BEGIN, sliceContractBlock } = require('../contract');
const { createTemplateVariables } = require('../template-variables');
const { addError, addOk } = require('./result');

function checkRuleAdapterFiles(context) {
  const { agent, rules } = context;
  if (!agent || !rules) {
    return;
  }

  const targets = getRuleAdapterTargetsForAgent(agent);
  const targetKinds = new Set(targets.map((target) => target.kind));

  if (targetKinds.has('claude-rule-pointer')) {
    checkClaudeRulePointers(context, targets.find((target) => target.kind === 'claude-rule-pointer'));
  }

  if (targetKinds.has('opencode-instructions')) {
    checkOpenCodeRulesInstruction(context, targets.find((target) => target.kind === 'opencode-instructions'));
  } else {
    checkNoStaleOpenCodeRulesInstruction(context);
  }

  if (targetKinds.has('codex-entry-pointer')) {
    checkCodexEntryRulesPointer(context, targets.find((target) => target.kind === 'codex-entry-pointer'));
  }
}

function checkClaudeRulePointers(context, target) {
  const { result, rules, workspaceRoot } = context;
  if (rules.length === 0) {
    return;
  }

  for (const ruleName of rules) {
    const relativePath = path.join(target.root, `niuma-${ruleName}.md`);
    const pointerPath = safeResolveInside(workspaceRoot, relativePath, 'claude rule pointer');
    const label = relativePath.split(path.sep).join('/');
    if (!fs.existsSync(pointerPath)) {
      addError(result, `missing ${label}`);
      continue;
    }

    const stat = fs.lstatSync(pointerPath);
    if (!stat.isFile()) {
      addError(result, `not a regular file ${label}`);
      continue;
    }

    const expectedPointer = `${path.basename(context.harnessRoot)}/docs/rules/${ruleName}/`;
    const content = fs.readFileSync(pointerPath, 'utf8');
    if (!content.includes(expectedPointer)) {
      addError(result, `${label} must point to ${expectedPointer}`);
      continue;
    }

    addOk(result, label);
  }
}

function checkOpenCodeRulesInstruction(context, target) {
  const { result, workspaceRoot } = context;
  const expected = getOpenCodeRulePaths(context, context.rules);
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
  const configPath = safeResolveInside(workspaceRoot, 'opencode.json', 'opencode config');
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

function getOpenCodeRulePaths(context, rules) {
  const variables = createTemplateVariables(
    { agent: context.agent, harnessDir: path.basename(context.harnessRoot) },
    context.templateManifest.workDirectory || 'agent-work'
  );
  return renderRuleArtifacts(
    rules,
    path.basename(context.harnessRoot),
    context.templateManifest.rulesRoot,
    variables
  ).map((artifact) => artifact.target);
}

function getKnownOpenCodeRulePaths(context) {
  return getOpenCodeRulePaths(
    context,
    getAvailableRuleDirs(context.templateManifest.rulesRoot)
  );
}

function checkCodexEntryRulesPointer(context, target) {
  const { result, workspaceRoot } = context;
  const entryPath = safeResolveInside(workspaceRoot, target.file, `entry file ${target.file}`);
  if (!fs.existsSync(entryPath)) {
    return;
  }

  const content = fs.readFileSync(entryPath, 'utf8');
  if (!content.includes(CONTRACT_BEGIN)) {
    return;
  }

  const block = sliceContractBlock(content);
  if (!block) {
    return;
  }

  if (!block.includes('docs/rules/')) {
    addError(result, `${target.file} contract must point to docs/rules/`);
    return;
  }

  addOk(result, `${target.file} rules pointer`);
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
