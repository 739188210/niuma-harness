// 根据已规范化的 rules 数组复制对应规则目录；重复 init 时规则目录按本次选择收敛。
const path = require('path');
const { getAvailableRuleDirs, getRulesRootPath } = require('../rules');
const {
  listFilesRecursive,
  removeDirectory,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function writeRuleFiles(context) {
  const { manifest } = context;
  const rulesRootPath = getRulesRootPath(manifest.rulesRoot);
  const availableRules = getAvailableRuleDirs(manifest.rulesRoot);

  cleanupUnselectedRuleFiles(context, availableRules, rulesRootPath);

  for (const ruleName of context.options.rules) {
    writeRuleDirectory(context, ruleName, rulesRootPath);
  }
}

// 重复 init 时让 docs/rules 收敛到本次 --rules / --rules-out 的选择。
function cleanupUnselectedRuleFiles(context, availableRules, rulesRootPath) {
  const selected = new Set(context.options.rules);
  for (const ruleName of availableRules) {
    if (!selected.has(ruleName)) {
      removeRuleDirectoryFiles(context, ruleName);
    }
  }
}

function removeRuleDirectoryFiles(context, ruleName) {
  const { options, targetDir, printAction } = context;
  const targetPath = safeResolveInside(targetDir, path.join('docs', 'rules', ruleName), 'rule target');
  printAction(removeDirectory(targetPath, { dryRun: options.dryRun }), targetPath);
}

function writeRuleDirectory(context, ruleName, rulesRootPath) {
  const ruleSourceDir = path.join(rulesRootPath, ruleName);
  for (const ruleFile of listFilesRecursive(ruleSourceDir)) {
    writeRuleFile(context, ruleFile, rulesRootPath);
  }
}

// sourceRelativePath 用于读取模板，targetRelativePath 用于保留规则目录结构。
function writeRuleFile(context, ruleFile, rulesRootPath) {
  const { options, targetDir, variables, printAction } = context;
  const sourceRelativePath = path.relative(TEMPLATE_DIR, ruleFile).split(path.sep).join('/');
  const targetRelativePath = path.relative(rulesRootPath, ruleFile).split(path.sep).join('/');
  const targetPath = safeResolveInside(targetDir, path.join('docs', 'rules', targetRelativePath), 'rule target');
  const content = renderTemplate(sourceRelativePath, variables);
  printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite: false }), targetPath);
}

module.exports = {
  writeRuleFiles,
};
