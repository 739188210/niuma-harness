// doctor 的高层检查编排：字段校验后委托 core/rules 子检查。
const path = require('path');
const { normalizeAgent } = require('../agents');
const { formatCommands, normalizeConcreteCommands } = require('../commands');
const { formatRules, normalizeConcreteRules } = require('../rules');
const { formatSkills, normalizeConcreteSkills } = require('../skills');
const { loadManifest } = require('../scaffold/manifest');
const { addError, addOk } = require('./result');
const {
  checkCoreDocs,
  checkEntryContractIntegrity,
  checkEntryFiles,
  checkWorkDir,
} = require('./core-checks');
const { checkArtifactFiles } = require('./artifacts-checks');
const { checkCommandFiles, getAvailableCommands } = require('./commands-checks');
const { checkRuleAdapterFiles } = require('./rules-adapters-checks');
const { checkRuleFiles, getAvailableRules } = require('./rules-checks');
const { checkSkillFiles, getAvailableSkills } = require('./skills-checks');

// 保持检查顺序稳定：先 schema/字段，再文件结构，最后 workspace workDir。
function checkHarness(harnessRoot, status, result) {
  const context = createCheckContext(harnessRoot, status, result);
  checkSchemaVersion(context);
  checkAgent(context);
  checkRules(context);
  checkSkills(context);
  checkCommands(context);
  checkArtifactFiles(context);
  checkEntryFiles(context);
  checkEntryContractIntegrity(context);
  checkCoreDocs(context);
  checkRuleFiles(context);
  checkRuleAdapterFiles(context);
  checkSkillFiles(context);
  checkCommandFiles(context);
  checkWorkDir(context);
}

function createCheckContext(harnessRoot, status, result) {
  const templateManifest = loadManifest();
  return {
    agent: null,
    artifacts: null,
    availableCommands: getAvailableCommands(templateManifest.commandsRoot),
    availableRules: getAvailableRules(templateManifest.rulesRoot),
    availableSkills: getAvailableSkills(templateManifest.skillsRoot),
    commands: null,
    harnessRoot,
    result,
    rules: null,
    skills: null,
    status,
    templateManifest,
    workspaceRoot: path.dirname(harnessRoot),
  };
}

function checkSchemaVersion(context) {
  const { result, status } = context;
  if (status.schemaVersion !== 2) {
    addError(result, `unsupported schemaVersion: ${status.schemaVersion}`);
    return;
  }

  addOk(result, 'schemaVersion 2');
}

function checkAgent(context) {
  const { result, status } = context;
  if (!status.agent) {
    addError(result, 'missing agent');
    return;
  }

  context.agent = normalizeStatusField(result, () => normalizeAgent(status.agent), 'agent');
  if (context.agent) {
    addOk(result, `agent ${context.agent}`);
  }
}

// manifest 中保存的是最终安装的规则目录数组，不保存原始 CLI 参数。
function checkRules(context) {
  checkConcreteArrayField(context, 'rules', context.availableRules, normalizeConcreteRules, formatRules);
}

function checkSkills(context) {
  checkConcreteArrayField(context, 'skills', context.availableSkills, normalizeConcreteSkills, formatSkills);
}

function checkCommands(context) {
  checkConcreteArrayField(context, 'commands', context.availableCommands, normalizeConcreteCommands, formatCommands);
}

function checkConcreteArrayField(context, field, available, normalize, format) {
  const { result, status } = context;
  if (!Object.prototype.hasOwnProperty.call(status, field)) {
    addError(result, `missing ${field}`);
    return;
  }

  if (!Array.isArray(status[field])) {
    addError(result, `${field} must be an array`);
    return;
  }

  context[field] = normalizeStatusField(
    result,
    () => normalize(status[field], available, field),
    field
  );

  if (context[field]) {
    addOk(result, `${field} ${format(context[field])}`);
  }
}

function normalizeStatusField(result, normalize, label) {
  try {
    return normalize();
  } catch (error) {
    addError(result, `invalid ${label}: ${error.message}`);
    return null;
  }
}

module.exports = {
  checkHarness,
};
