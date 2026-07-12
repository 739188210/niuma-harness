const path = require('path');

const { digestBytes } = require('./artifact-ledger');
const { listFilesRecursive } = require('./fs-safe');
const { getAvailableRuleDirs, getRulesRootPath } = require('./rules');
const { TEMPLATE_DIR } = require('./scaffold/manifest');
const { renderTemplate } = require('./scaffold/templates');

function renderRuleArtifacts(rules, harnessDir, rulesRoot, variables, dependencies = {}) {
  const availableRules = (dependencies.getAvailableRuleDirs || getAvailableRuleDirs)(rulesRoot);
  const getRootPath = dependencies.getRulesRootPath || getRulesRootPath;
  const listFiles = dependencies.listFilesRecursive || listFilesRecursive;
  const render = dependencies.renderTemplate || renderTemplate;
  const digest = dependencies.digestBytes || digestBytes;
  const templateDir = dependencies.TEMPLATE_DIR || TEMPLATE_DIR;
  const selected = [...rules].sort((left, right) => left.localeCompare(right));

  for (const rule of selected) {
    if (!availableRules.includes(rule)) {
      throw new Error(`unknown rule directory: ${rule}`);
    }
  }

  const rootPath = getRootPath(rulesRoot);
  const artifacts = [];
  for (const rule of selected) {
    const ruleRoot = path.join(rootPath, rule);
    for (const sourcePath of listFiles(ruleRoot)) {
      const relativePath = path.relative(ruleRoot, sourcePath).split(path.sep).join('/');
      const source = path.relative(templateDir, sourcePath).split(path.sep).join('/');
      const target = path.posix.join(harnessDir, 'docs', 'rules', rule, relativePath);
      const content = render(source, variables);
      artifacts.push({
        kind: 'rule',
        rule,
        relativePath,
        source,
        target,
        content,
        digest: digest(Buffer.from(content, 'utf8')),
      });
    }
  }

  return artifacts.sort((left, right) => left.target.localeCompare(right.target));
}

module.exports = {
  renderRuleArtifacts,
};
