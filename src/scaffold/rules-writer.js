// 根据已规范化的 rules 数组复制对应规则目录。
const path = require('path');
const { getAvailableRuleDirs, getRulesRootPath } = require('../rules');
const {
  listFilesRecursive,
  removeEmptyDirsUntil,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function writeRuleFiles(context) {
  const { manifest, options } = context;
  const rulesRootPath = getRulesRootPath(manifest.rulesRoot);
  const availableRules = getAvailableRuleDirs(manifest.rulesRoot);

  if (options.force) {
    cleanupUnselectedRuleFiles(context, availableRules, rulesRootPath);
  }

  for (const ruleName of options.rules) {
    writeRuleDirectory(context, ruleName, rulesRootPath);
  }
}

// --force 重新初始化时，让已知 rule pack 收敛到本次 manifest 声明。
function cleanupUnselectedRuleFiles(context, availableRules, rulesRootPath) {
  const selected = new Set(context.options.rules);
  for (const ruleName of availableRules) {
    if (!selected.has(ruleName)) {
      removeRuleDirectoryFiles(context, ruleName, rulesRootPath);
    }
  }
}

function removeRuleDirectoryFiles(context, ruleName, rulesRootPath) {
  const ruleSourceDir = path.join(rulesRootPath, ruleName);
  for (const ruleFile of listFilesRecursive(ruleSourceDir)) {
    removeRuleFile(context, ruleFile, rulesRootPath);
  }
}

function removeRuleFile(context, ruleFile, rulesRootPath) {
  const { options, targetDir, printAction } = context;
  const targetRelativePath = path.relative(rulesRootPath, ruleFile).split(path.sep).join('/');
  const rulesTargetRoot = safeResolveInside(targetDir, path.join('docs', 'rules'), 'rules target');
  const targetPath = safeResolveInside(targetDir, path.join('docs', 'rules', targetRelativePath), 'rule target');
  const action = removeFile(targetPath, options);
  printAction(action, targetPath);

  if (action === 'remove') {
    removeEmptyDirsUntil(path.dirname(targetPath), rulesTargetRoot, options.dryRun);
  }
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
  printAction(writeFile(targetPath, content, options), targetPath);
}

module.exports = {
  writeRuleFiles,
};
