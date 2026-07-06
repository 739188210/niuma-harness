// doctor 的高层检查编排：字段校验后委托 core/rules 子检查。
const path = require('path');
const { normalizeAgent } = require('../agents');
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
const { checkRuleFiles, getAvailableRules } = require('./rules-checks');
const { checkSkillFiles, getAvailableSkills } = require('./skills-checks');

// 保持检查顺序稳定：先 schema/字段，再文件结构，最后 workspace workDir。
function checkHarness(harnessRoot, status, result) {
  const context = createCheckContext(harnessRoot, status, result);
  checkSchemaVersion(context);
  checkAgent(context);
  checkRules(context);
  checkSkills(context);
  checkEntryFiles(context);
  checkEntryContractIntegrity(context);
  checkCoreDocs(context);
  checkRuleFiles(context);
  checkSkillFiles(context);
  checkWorkDir(context);
}

function createCheckContext(harnessRoot, status, result) {
  const templateManifest = loadManifest();
  return {
    agent: null,
    availableRules: getAvailableRules(templateManifest.rulesRoot),
    availableSkills: getAvailableSkills(templateManifest.skillsRoot),
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
  if (status.schemaVersion !== 1) {
    addError(result, `unsupported schemaVersion: ${status.schemaVersion}`);
    return;
  }

  addOk(result, 'schemaVersion 1');
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
  const { availableRules, result, status } = context;
  if (!Object.prototype.hasOwnProperty.call(status, 'rules')) {
    addError(result, 'missing rules');
    return;
  }

  if (!Array.isArray(status.rules)) {
    addError(result, 'rules must be an array');
    return;
  }

  context.rules = normalizeStatusField(
    result,
    () => normalizeConcreteRules(status.rules, availableRules, 'rules'),
    'rules'
  );

  if (context.rules) {
    addOk(result, `rules ${formatRules(context.rules)}`);
  }
}

function checkSkills(context) {
  const { availableSkills, result, status } = context;
  if (!Object.prototype.hasOwnProperty.call(status, 'skills')) {
    context.skills = [];
    addOk(result, 'skills none');
    return;
  }

  if (!Array.isArray(status.skills)) {
    addError(result, 'skills must be an array');
    return;
  }

  context.skills = normalizeStatusField(
    result,
    () => normalizeConcreteSkills(status.skills, availableSkills, 'skills'),
    'skills'
  );

  if (context.skills) {
    addOk(result, `skills ${formatSkills(context.skills)}`);
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
