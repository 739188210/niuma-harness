const { renderCodexRulesBlock } = require('./rule-artifacts');
const { createTemplateVariables } = require('./template-variables');
const { renderTemplate } = require('./scaffold/templates');

function renderEntry(agent, entryFile, rules, harnessDir, workDirectory, rulesRoot, topology = { mode: 'single', modules: [] }) {
  const variables = createTemplateVariables({ agent, harnessDir }, workDirectory);
  const hasModules = Array.isArray(topology && topology.modules) && topology.modules.length > 0;
  Object.assign(variables, entryTopologyGuidance(hasModules, harnessDir));
  variables.CODEX_RULES = entryFile === 'AGENTS.md' && (agent === 'codex' || agent === 'multi')
    ? renderCodexRulesBlock(rules, rulesRoot, variables)
    : '';
  return renderTemplate('entry/entry.md', variables);
}

function entryTopologyGuidance(hasModules, harnessDir) {
  if (!hasModules) {
    return {
      ENTRY_CONTEXT_TOPOLOGY_GUIDANCE: '',
      ENTRY_MEMORY_SCOPE_GUIDANCE: '',
      ENTRY_RED_LINE_MEMORY_GUIDANCE: ` Durable root-project facts → \`${harnessDir}/docs/project-context.md\`;`,
      ENTRY_OVERRIDES_COMMENT_SCOPE_GUIDANCE: '',
      ENTRY_OVERRIDES_SCOPE_GUIDANCE: '',
    };
  }
  return {
    ENTRY_CONTEXT_TOPOLOGY_GUIDANCE: ` For declared multi-module workspaces, identify affected modules through \`${harnessDir}/docs/module-topology.md\` and read their local supplements.`,
    ENTRY_MEMORY_SCOPE_GUIDANCE: " Verified module-local durable facts → the affected module entry's marker-external knowledge area.",
    ENTRY_RED_LINE_MEMORY_GUIDANCE: ` Module-local durable facts → the affected module entry; root or cross-module durable facts → \`${harnessDir}/docs/project-context.md\`;`,
    ENTRY_OVERRIDES_COMMENT_SCOPE_GUIDANCE: ' Module-local durable facts belong in the applicable\nmodule entry.',
    ENTRY_OVERRIDES_SCOPE_GUIDANCE: '; module-local durable facts belong in the applicable module entry',
  };
}

module.exports = { renderEntry };
