const { renderCodexRulesBlock } = require('./rule-artifacts');
const { createTemplateVariables } = require('./template-variables');
const { renderTemplate } = require('./scaffold/templates');

function renderEntry(agent, entryFile, rules, harnessDir, workDirectory, rulesRoot) {
  const variables = createTemplateVariables({ agent, harnessDir }, workDirectory);
  variables.CODEX_RULES = entryFile === 'AGENTS.md' && (agent === 'codex' || agent === 'multi')
    ? renderCodexRulesBlock(rules, rulesRoot, variables)
    : '';
  return renderTemplate('entry/entry.md', variables);
}

module.exports = { renderEntry };
