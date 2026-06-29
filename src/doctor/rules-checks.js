// 按 manifest.rules 声明校验已选择的规则包文件是否完整。
const path = require('path');
const { getAvailableRuleDirs, getRulesRootPath } = require('../rules');
const { listFilesRecursive } = require('../fs-safe');
const { checkDirectory, checkRegularFile } = require('./core-checks');

function getAvailableRules(rulesRoot) {
  return getAvailableRuleDirs(rulesRoot);
}

function checkRuleFiles(context) {
  const { harnessRoot, result, rules, templateManifest } = context;
  if (!rules) {
    return;
  }

  const rulesRootPath = getRulesRootPath(templateManifest.rulesRoot);
  for (const ruleName of rules) {
    checkRuleDirectory(harnessRoot, result, rulesRootPath, ruleName);
  }
}

function checkRuleDirectory(harnessRoot, result, rulesRootPath, ruleName) {
  const sourceDir = path.join(rulesRootPath, ruleName);
  checkDirectory(path.join(harnessRoot, 'docs', 'rules', ruleName), `docs/rules/${ruleName}/`, result);

  for (const sourceFile of listFilesRecursive(sourceDir)) {
    checkRuleFile(harnessRoot, result, sourceDir, sourceFile, ruleName);
  }
}

function checkRuleFile(harnessRoot, result, sourceDir, sourceFile, ruleName) {
  const relativePath = path.relative(sourceDir, sourceFile).split(path.sep).join('/');
  const label = `docs/rules/${ruleName}/${relativePath}`;
  checkRegularFile(path.join(harnessRoot, 'docs', 'rules', ruleName, ...relativePath.split('/')), label, result);
}

module.exports = {
  getAvailableRules,
  checkRuleFiles,
};
