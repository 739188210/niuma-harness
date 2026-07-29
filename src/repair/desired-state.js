const path = require('path');
const { getAllEntryFiles, getEntryFilesForAgent } = require('../harness/agents');
const { createStatus } = require('../harness/manifest');
const { createTemplateVariables } = require('../harness/template-variables');
const { renderTemplate } = require('../generator/template-renderer');
const { renderTopologyRoute } = require('../harness/topology-route');

function createDesiredState(input) {
  const { agent, harnessDir, manifest, runtimeLayout, topology = { mode: 'single', modules: [] }, moduleSupplements = [], workspaceDir } = input;
  const targetDir = path.join(workspaceDir, harnessDir);
  const { workDirectory } = runtimeLayout;
  const variables = createTemplateVariables({ agent, harnessDir }, workDirectory);
  const directories = [
    targetDir,
    ...manifest.directories.map((item) => path.join(targetDir, ...item.split('/'))),
    ...runtimeLayout.workDirectories.map((item) => path.join(workspaceDir, ...item.split('/'))),
  ];
  const files = [];

  for (const file of manifest.templateFiles) {
    if (file.dynamic) continue;
    files.push(descriptor(
      workspaceDir,
      path.join(targetDir, ...file.target.split('/')),
      renderTemplate(file.template, variables),
      file.managed === 'user' ? 'user' : 'tool',
      'core'
    ));
  }
  for (const file of manifest.workTemplateFiles || []) {
    files.push(descriptor(workspaceDir, path.join(workspaceDir, ...file.target.split('/')), renderTemplate(file.template, variables), 'tool', 'work'));
  }
  if (topology.modules.length > 0) {
    files.push(descriptor(
      workspaceDir,
      path.join(targetDir, 'docs', 'module-topology.md'),
      renderTopologyRoute(harnessDir, topology.modules, agent),
      'tool',
      'topology'
    ));
  }

  const activeEntries = getEntryFilesForAgent(agent);
  const { renderEntry } = require('../harness/entry-renderer');
  for (const entry of activeEntries) {
    files.push(descriptor(workspaceDir, path.join(workspaceDir, entry), renderEntry(agent, entry, harnessDir, workDirectory, topology), 'entry', 'entry'));
  }

  const status = createStatus({
    agent,
    harnessDir,
    topology,
    moduleSupplements,
  }, runtimeLayout);

  for (const file of files) {
    let current = path.dirname(file.targetPath);
    while (current !== workspaceDir && current.startsWith(`${workspaceDir}${path.sep}`)) {
      directories.push(current);
      current = path.dirname(current);
    }
  }

  return {
    activeEntries,
    allEntries: getAllEntryFiles(),
    directories: [...new Set(directories)].sort((left, right) => left.length - right.length || left.localeCompare(right)),
    files: files.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    status,
    statusPath: path.join(targetDir, 'manifest.json'),
    targetDir,
    variables,
    workspaceDir,
  };
}

function descriptor(workspaceDir, targetPath, content, ownership, domain) {
  return {
    content,
    domain,
    ownership,
    relativePath: path.relative(workspaceDir, targetPath).split(path.sep).join('/'),
    targetPath,
  };
}

module.exports = { createDesiredState };
