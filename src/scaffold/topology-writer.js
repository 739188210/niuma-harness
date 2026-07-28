const fs = require('fs');
const { renderTopologyRoute } = require('../harness/topology-route');
const { inspectFileTarget, safeResolveInside, writeFile } = require('../infrastructure/fs-safe');
const { REGISTRY_FILE, parseRegistry, registryContent, sameModules } = require('../harness/topology');

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
    } else if (!sameModules(registered, context.topology.modules)) {
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
