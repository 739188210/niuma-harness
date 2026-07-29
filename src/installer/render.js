const { digestBytes } = require('../infrastructure/content-digest');
const { renderCommandArtifacts } = require('../command/artifacts');
const { renderSkillArtifacts } = require('../skill/artifacts');
const { renderRuleArtifacts } = require('../rule/artifacts');
const { normalizeInstallerAssetNames } = require('./catalog');

const INSTALLER_TEMPLATE_VARIABLES = {
  HARNESS_DIR: 'harness',
  ENTRY_CODEX_RULES_GUIDANCE: '',
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
    artifacts = renderRuleArtifacts(agent, selected, undefined, templateVariables);
  } else {
    throw new Error(`Unknown asset type: ${type}`);
  }
  return normalizeArtifacts(artifacts);
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
