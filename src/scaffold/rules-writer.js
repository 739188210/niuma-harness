// 根据已规范化的 rules 数组复制对应规则目录；重复 init 时规则目录按本次选择收敛。
const path = require('path');
const { getAvailableRuleDirs, getRulesRootPath } = require('../rules');
const {
  inspectDirectoryTarget,
  inspectFileTarget,
  listFilesRecursive,
  removeDirectory,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function prepareRulePlan(context) {
  const rulesRootPath = getRulesRootPath(context.manifest.rulesRoot);
  const availableRules = getAvailableRuleDirs(context.manifest.rulesRoot);
  const selected = new Set(context.options.rules);
  const plan = [];

  for (const ruleName of availableRules) {
    if (!selected.has(ruleName)) {
      const targetPath = safeResolveInside(context.targetDir, path.join('docs', 'rules', ruleName), 'rule target');
      inspectDirectoryTarget(targetPath);
      plan.push({ kind: 'remove-directory', targetPath });
    }
  }
  for (const ruleName of context.options.rules) {
    const sourceDir = path.join(rulesRootPath, ruleName);
    for (const sourcePath of listFilesRecursive(sourceDir)) {
      const sourceRelativePath = path.relative(TEMPLATE_DIR, sourcePath).split(path.sep).join('/');
      const targetRelativePath = path.relative(rulesRootPath, sourcePath).split(path.sep).join('/');
      const targetPath = safeResolveInside(context.targetDir, path.join('docs', 'rules', targetRelativePath), 'rule target');
      const exists = inspectFileTarget(targetPath);
      plan.push({ kind: 'write', action: exists ? 'skip' : 'create', content: renderTemplate(sourceRelativePath, context.variables), targetPath });
    }
  }
  return plan;
}

function writeRuleFiles(context) {
  for (const item of context.rulePlan) {
    if (item.kind === 'remove-directory') {
      context.printAction(removeDirectory(item.targetPath, { dryRun: context.options.dryRun }), item.targetPath);
    } else {
      context.printAction(writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: false }), item.targetPath);
    }
  }
}

module.exports = {
  prepareRulePlan,
  writeRuleFiles,
};
