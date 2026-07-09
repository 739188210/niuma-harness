// 校验 agent-native rules 入口是否指向 canonical docs/rules。
const fs = require('fs');
const path = require('path');

const { getRuleAdapterTargetsForAgent } = require('../rules');
const { safeResolveInside } = require('../fs-safe');
const { CONTRACT_BEGIN, sliceContractBlock } = require('../contract');
const { addError, addOk } = require('./result');
const { MANAGED_RULES_BEGIN, MANAGED_RULES_END } = require('../scaffold/rules-adapters-writer');

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
  const { result, rules, status, workspaceRoot } = context;
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

    const expectedPointer = `${status.harnessDir || 'harness'}/docs/rules/${ruleName}/`;
    const content = fs.readFileSync(pointerPath, 'utf8');
    if (!content.includes(expectedPointer)) {
      addError(result, `${label} must point to ${expectedPointer}`);
      continue;
    }

    addOk(result, label);
  }
}

function checkOpenCodeRulesInstruction(context, target) {
  const { result, rules, status, workspaceRoot } = context;
  if (rules.length === 0) {
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

  const instructions = readInstructionText(config.instructions, result);
  if (instructions === null) {
    return;
  }

  if (!hasManagedRulesBlock(instructions)) {
    addError(result, 'missing opencode.json niuma rules instructions');
    return;
  }

  const expectedRoot = `${status.harnessDir || 'harness'}/docs/rules/`;
  if (!instructions.includes(expectedRoot)) {
    addError(result, `opencode.json rules instructions must point to ${expectedRoot}`);
    return;
  }

  for (const ruleName of rules) {
    if (!instructions.includes(ruleName)) {
      addError(result, `opencode.json rules instructions missing rule ${ruleName}`);
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

  const content = fs.readFileSync(configPath, 'utf8');
  if (!hasManagedRulesBlock(content)) {
    return;
  }

  const config = readOpenCodeConfig(configPath, result);
  if (!config) {
    return;
  }

  const instructions = readInstructionText(config.instructions, result, { allowMissing: true });
  if (instructions !== null && hasManagedRulesBlock(instructions)) {
    addError(result, 'stale opencode.json niuma rules instructions');
  }
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

function readOpenCodeConfig(configPath, result) {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    addError(result, `invalid opencode.json: ${error.message}`);
    return null;
  }

  if (!config || Array.isArray(config) || typeof config !== 'object') {
    addError(result, 'opencode.json must contain a JSON object');
    return null;
  }

  return config;
}

function readInstructionText(instructions, result, options = {}) {
  if (instructions === undefined) {
    if (!options.allowMissing) {
      addError(result, 'opencode.json missing instructions');
    }
    return null;
  }

  if (typeof instructions === 'string') {
    return instructions;
  }

  if (Array.isArray(instructions) && instructions.every((instruction) => typeof instruction === 'string')) {
    return instructions.join('\n');
  }

  addError(result, 'opencode.json instructions must be a string or an array of strings');
  return null;
}

function hasManagedRulesBlock(instructions) {
  return instructions.includes(MANAGED_RULES_BEGIN) && instructions.includes(MANAGED_RULES_END);
}

module.exports = {
  checkRuleAdapterFiles,
};
