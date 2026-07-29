const path = require('path');
const { digestBytes } = require('../infrastructure/content-digest');
const { renderCommandArtifacts } = require('../command/artifacts');
const { renderTemplate } = require('../generator/template-renderer');
const { TEMPLATE_DIR } = require('../infrastructure/template-paths');
const { getStandaloneRuleTargetRootsForAgent } = require('../harness/agent-native-targets');
const { listFilesRecursive } = require('../infrastructure/fs-safe');
const { getAvailableRuleDirs, getRulesRootPath } = require('../rule/catalog');
const { renderSkillArtifacts } = require('../skill/artifacts');
const { normalizeInstallerAssetNames } = require('./catalog');

const INSTALLER_TEMPLATE_VARIABLES = {
  HARNESS_DIR: 'harness',
  CODEX_RULES: '',
  ENTRY_CONTEXT_TOPOLOGY_GUIDANCE: '',
  ENTRY_MEMORY_SCOPE_GUIDANCE: '',
  ENTRY_RED_LINE_MEMORY_GUIDANCE: '',
  ENTRY_OVERRIDES_COMMENT_SCOPE_GUIDANCE: '',
};

function renderInstallerArtifacts({ type, agent, names, variables = {} }) {
  const selected = normalizeInstallerAssetNames(type, names);
  const templateVariables = { ...INSTALLER_TEMPLATE_VARIABLES, ...variables };
  let artifacts;
  if (type === 'command') {
    artifacts = renderCommandArtifacts(agent, selected.map((name) => `${name}.md`), undefined, templateVariables);
  } else if (type === 'skill') {
    artifacts = renderSkillArtifacts(agent, selected, undefined, templateVariables);
  } else if (type === 'rule') {
    artifacts = renderStandaloneRuleArtifacts(agent, selected, templateVariables);
  } else {
    throw new Error(`Unknown asset type: ${type}`);
  }
  return normalizeArtifacts(artifacts);
}

function renderStandaloneRuleArtifacts(agent, rules, variables) {
  const available = getAvailableRuleDirs();
  const rootPath = getRulesRootPath();
  const targetRoots = getStandaloneRuleTargetRootsForAgent(agent);
  const artifacts = [];
  for (const rule of [...rules].sort((left, right) => left.localeCompare(right))) {
    if (!available.includes(rule)) throw new Error(`Unknown rule: ${rule}`);
    const ruleRoot = path.join(rootPath, rule);
    for (const sourcePath of listFilesRecursive(ruleRoot)) {
      const relativePath = path.relative(ruleRoot, sourcePath).split(path.sep).join('/');
      const source = path.relative(TEMPLATE_DIR, sourcePath).split(path.sep).join('/');
      const content = renderTemplate(source, variables);
      for (const targetRoot of targetRoots) {
        artifacts.push({
          kind: 'rule',
          source,
          target: path.posix.join(targetRoot, rule, relativePath),
          content,
        });
      }
    }
  }
  return artifacts;
}

function normalizeArtifacts(artifacts) {
  const targets = new Set();
  return artifacts.map(({ kind, source, target, content }) => {
    if (targets.has(target)) throw new Error(`Duplicate installer artifact target: ${target}`);
    targets.add(target);
    return { kind, source, target, content, digest: digestBytes(Buffer.from(content, 'utf8')) };
  }).sort((left, right) => left.target.localeCompare(right.target));
}

module.exports = {
  INSTALLER_TEMPLATE_VARIABLES,
  renderInstallerArtifacts,
};
