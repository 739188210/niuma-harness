const { createTemplateVariables } = require('./template-variables');
const { renderTemplate } = require('../generator/template-renderer');

function renderEntry(agent, entryFile, harnessDir, workDirectory, topology = { mode: 'single', modules: [] }) {
  const variables = createTemplateVariables({ agent, harnessDir }, workDirectory);
  const hasModules = Array.isArray(topology && topology.modules) && topology.modules.length > 0;
  Object.assign(variables, entryTopologyGuidance(hasModules, harnessDir), {
    ENTRY_CODEX_RULES_GUIDANCE: codexRulesGuidance(agent, entryFile),
  });
  return renderTemplate('entry/entry.md', variables);
}

function codexRulesGuidance(agent, entryFile) {
  if (entryFile !== 'AGENTS.md' || (agent !== 'codex' && agent !== 'multi')) return '';
  return [
    '',
    '## Codex engineering rules',
    '',
    'For every engineering modification, first read each existing file in .agents/harness-rules/common/. Then read every existing applicable rule file under .agents/harness-rules/:',
    '- typescript/ for TypeScript, JavaScript, Node, frontend logic, and related configuration;',
    '- web/ for pages, components, styles, interactions, browser performance, and frontend security;',
    '- java/ for Java, JVM, Maven, and Gradle changes;',
    '- python/ for Python changes;',
    '- fastapi/ for FastAPI APIs, routes, schemas, and server-side work.',
    '',
    'For cross-domain changes or uncertain applicability, read all existing potentially applicable rule files before editing. Do not assume a rule directory or file exists.',
  ].join('\n');
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
