const { getEntryFilesForAgent } = require('./agents');

function renderTopologyRoute(harnessDir, modules, agent) {
  const entryFiles = getEntryFilesForAgent(agent);
  const table = modules.length === 0
    ? '| _(none declared)_ | - | - | - |\n'
    : modules.map((module) => {
      const entries = entryFiles.map((entryFile) => `\`${module.root}/${entryFile}\``).join('<br>');
      return `| \`${module.id}\` | \`${module.root}\` | ${module.kind || 'module'} | ${entries} |`;
    }).join('\n') + '\n';
  return `# Module Topology\n\nThis is the tool-managed routing view. \`${harnessDir}/modules.json\` is project-maintained and declares module membership; current code, configuration, build definitions, and command output remain authoritative.\n\n## Declared modules\n\n| ID | Root | Kind | Read before module work |\n| --- | --- | --- | --- |\n${table}\n## Reading route\n\n1. Read the root entry and relevant root context first.\n2. Locate the task's module in the table, then read every exact path in its **Read before module work** column.\n3. For cross-module work, read the listed entries for every affected module, preserve root safety/policy rules, and record integration verification separately from module-local checks.\n4. Module-local facts supplement root guidance; they cannot weaken root safety, approval, evidence, or verification requirements.\n`;
}

module.exports = { renderTopologyRoute };
