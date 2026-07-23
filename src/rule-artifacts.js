const path = require('path');

const { digestBytes } = require('./artifact-ledger');
const { listFilesRecursive } = require('./fs-safe');
const { getAvailableRuleDirs, getRuleTargetRootsForAgent, getRulesRootPath } = require('./rules');
const { TEMPLATE_DIR } = require('./generator/template-manifest');
const { renderTemplate } = require('./generator/template-renderer');

function renderRuleArtifacts(agent, rules, rulesRoot, variables, dependencies = {}) {
  const availableRules = (dependencies.getAvailableRuleDirs || getAvailableRuleDirs)(rulesRoot);
  const getRootPath = dependencies.getRulesRootPath || getRulesRootPath;
  const listFiles = dependencies.listFilesRecursive || listFilesRecursive;
  const render = dependencies.renderTemplate || renderTemplate;
  const digest = dependencies.digestBytes || digestBytes;
  const templateDir = dependencies.TEMPLATE_DIR || TEMPLATE_DIR;
  const targetRoots = (dependencies.getRuleTargetRootsForAgent || getRuleTargetRootsForAgent)(agent);
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
      const content = render(source, variables);
      for (const targetRoot of targetRoots) {
        const target = path.posix.join(targetRoot, rule, relativePath);
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
  }

  return artifacts.sort((left, right) => left.target.localeCompare(right.target));
}

function renderCodexRulesBlock(rules, rulesRoot, variables, dependencies = {}) {
  const availableRules = (dependencies.getAvailableRuleDirs || getAvailableRuleDirs)(rulesRoot);
  const getRootPath = dependencies.getRulesRootPath || getRulesRootPath;
  const listFiles = dependencies.listFilesRecursive || listFilesRecursive;
  const render = dependencies.renderTemplate || renderTemplate;
  const templateDir = dependencies.TEMPLATE_DIR || TEMPLATE_DIR;
  const selected = [...rules].sort((left, right) => left.localeCompare(right));
  const sections = [];
  for (const rule of selected) {
    if (!availableRules.includes(rule)) throw new Error(`unknown rule directory: ${rule}`);
    const ruleRoot = path.join(getRootPath(rulesRoot), rule);
    for (const sourcePath of listFiles(ruleRoot)) {
      const relativePath = path.relative(ruleRoot, sourcePath).split(path.sep).join('/');
      const source = path.relative(templateDir, sourcePath).split(path.sep).join('/');
      sections.push(`### ${rule}/${relativePath}\n\n${render(source, variables).trim()}`);
    }
  }
  return sections.length === 0 ? '' : `\n\n## Selected engineering rules\n\n${sections.join('\n\n')}`;
}

module.exports = {
  renderRuleArtifacts,
  renderCodexRulesBlock,
};
