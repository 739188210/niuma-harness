// 根据已规范化的 rules 数组复制对应规则目录。
const path = require('path');
const { getRulesRootPath } = require('../rules');
const { listFilesRecursive, safeResolveInside, writeFile } = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function writeRuleFiles(context) {
  const { manifest, options } = context;
  for (const ruleName of options.rules) {
    writeRuleDirectory(context, ruleName, getRulesRootPath(manifest.rulesRoot));
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
