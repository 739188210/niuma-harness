const fs = require('fs');
const { inspectFileTarget, safeResolveInside, writeFile } = require('../fs-safe');
const { REGISTRY_FILE, parseRegistry, registryContent } = require('../topology');

function prepareTopologyPlan(context) {
  const registryPath = safeResolveInside(context.targetDir, REGISTRY_FILE, 'module registry target');
  const registryExists = inspectFileTarget(registryPath);
  let modules = context.topology.modules;
  if (registryExists) {
    const registered = parseRegistry(fs.readFileSync(registryPath, 'utf8'), context.workspaceDir);
    if (context.topology.modules.length === 0) {
      if (!context.options.topologyProvided && context.previousStatus && context.previousStatus.topology && context.previousStatus.topology.modules.length > 0) {
        modules = registered;
      } else if (context.options.topologyProvided) {
        throw new Error('explicit topology differs from the existing module registry; update the registry first or select matching modules');
      } else {
        throw new Error('existing module registry requires --modules or --topology discover before Niuma can manage module supplements');
      }
    } else if (JSON.stringify(registered.map(minimalModule)) !== JSON.stringify(context.topology.modules.map(minimalModule))) {
      throw new Error('explicit topology differs from the existing module registry; update the registry first or select matching modules');
    } else {
      modules = registered;
    }
  }
  context.topology = { ...context.topology, modules };
  if (modules.length === 0 && !registryExists) {
    return { registry: null, route: null };
  }
  const routePath = safeResolveInside(context.targetDir, 'docs/module-topology.md', 'module topology target');
  const routeExists = inspectFileTarget(routePath);
  return {
    registry: {
      action: registryExists ? 'skip' : 'create',
      content: registryContent(modules),
      targetPath: registryPath,
    },
    route: {
      action: routeExists ? 'overwrite' : 'create',
      content: renderTopologyRoute(context.options.harnessDir, modules, context.options.agent),
      targetPath: routePath,
    },
  };
}

function renderTopologyRoute(harnessDir, modules, agent) {
  const entryFiles = agent === 'claude' ? ['CLAUDE.md']
    : agent === 'multi' ? ['CLAUDE.md', 'AGENTS.md'] : ['AGENTS.md'];
  const table = modules.length === 0
    ? '| _(none declared)_ | - | - | - |\n'
    : modules.map((module) => {
      const entries = entryFiles.map((entryFile) => `\`${module.root}/${entryFile}\``).join('<br>');
      return `| \`${module.id}\` | \`${module.root}\` | ${module.kind || 'module'} | ${entries} |`;
    }).join('\n') + '\n';
  return `# Module Topology\n\nThis is the tool-managed routing view. \`${harnessDir}/modules.json\` is project-maintained and declares module membership; current code, configuration, build definitions, and command output remain authoritative.\n\n## Declared modules\n\n| ID | Root | Kind | Read before module work |\n| --- | --- | --- | --- |\n${table}\n## Reading route\n\n1. Read the root entry and relevant root context first.\n2. Locate the task's module in the table, then read every exact path in its **Read before module work** column.\n3. For cross-module work, read the listed entries for every affected module, preserve root safety/policy rules, and record integration verification separately from module-local checks.\n4. Module-local facts supplement root guidance; they cannot weaken root safety, approval, evidence, or verification requirements.\n`;
}

function minimalModule(module) { return { id: module.id, root: module.root, ...(module.kind ? { kind: module.kind } : {}) }; }

function writeTopologyPlan(context) {
  for (const item of [context.topologyPlan.registry, context.topologyPlan.route].filter(Boolean)) {
    if (item.action === 'skip') {
      inspectFileTarget(item.targetPath);
      context.printAction('skip', item.targetPath);
      continue;
    }
    context.printAction(writeFile(item.targetPath, item.content, {
      dryRun: context.options.dryRun,
      overwrite: item.action === 'overwrite',
    }), item.targetPath);
  }
}

module.exports = { prepareTopologyPlan, renderTopologyRoute, writeTopologyPlan };
