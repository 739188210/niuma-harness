const path = require('path');
const { getAllEntryFiles, getEntryFilesForAgent } = require('../agents');
const {
  getAllRuleAdapterTargets,
  isRuleArtifactManagedByAdapter,
} = require('../agent-native-targets');
const { digestBytes, validateArtifactRecords } = require('../artifact-ledger');
const { renderCommandArtifacts } = require('../command-artifacts');
const { renderRuleArtifacts } = require('../rule-artifacts');
const { getAvailableRuleDirs, getRuleAdapterTargetsForAgent } = require('../rules');
const { getAvailableSkillDirs } = require('../skills');
const { renderSkillArtifacts } = require('../skill-artifacts');
const { createStatus } = require('../harness-status');
const { createTemplateVariables } = require('../template-variables');
const { renderTemplate } = require('../generator/template-renderer');
const { renderTopologyRoute } = require('../scaffold/topology-writer');

function createDesiredState(input) {
  const { agent, commands, harnessDir, manifest, runtimeLayout, rules, skills, topology = { mode: 'single', modules: [] }, moduleSupplements = [], workspaceDir } = input;
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
  const { renderEntry } = require('../entry-renderer');
  for (const entry of activeEntries) {
    files.push(descriptor(workspaceDir, path.join(workspaceDir, entry), renderEntry(agent, entry, rules, harnessDir, workDirectory, manifest.rulesRoot, topology), 'entry', 'entry'));
  }

  const availableRules = getAvailableRuleDirs(manifest.rulesRoot);
  const ruleArtifacts = renderRuleArtifacts(agent, rules, manifest.rulesRoot, variables)
    .map((item) => ({
      ...item,
      targetPath: path.join(workspaceDir, ...item.target.split('/')),
    }));
  for (const artifact of ruleArtifacts) {
    files.push(descriptor(workspaceDir, artifact.targetPath, artifact.content, 'rule', 'rules'));
  }

  const adapterTargets = getRuleAdapterTargetsForAgent(agent);
  const skillArtifacts = renderSkillArtifacts(agent, skills, manifest.skillsRoot, variables)
    .map((item) => ({
      ...item,
      targetPath: path.join(workspaceDir, ...item.target.split('/')),
    }));
  for (const artifact of skillArtifacts) {
    files.push(descriptor(workspaceDir, artifact.targetPath, artifact.content, 'tool', 'skills'));
  }

  const commandArtifacts = renderCommandArtifacts(agent, commands, manifest.commandsRoot, variables)
    .map((item) => ({
      ...item,
      digest: digestBytes(Buffer.from(item.content, 'utf8')),
      targetPath: path.join(workspaceDir, ...item.target.split('/')),
    }));
  const records = validateArtifactRecords([...commandArtifacts, ...ruleArtifacts, ...skillArtifacts]
    .map((item) => ({ kind: item.kind, source: item.source, target: item.target, digest: item.digest })));
  const artifactByTarget = new Map([...commandArtifacts, ...ruleArtifacts, ...skillArtifacts].map((item) => [item.target, item]));
  const artifacts = records.map((record) => ({ ...artifactByTarget.get(record.target), ...record }));
  for (const artifact of commandArtifacts) {
    files.push(descriptor(workspaceDir, artifact.targetPath, artifact.content, 'command', 'commands'));
  }

  const status = createStatus({
    agent,
    artifacts: records,
    commands,
    harnessDir,
    openCodeInstructions: createOpenCodeDesired(adapterTargets, ruleArtifacts).paths,
    rules,
    skills,
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
    artifacts,
    commandArtifacts,
    ruleArtifacts,
    skillArtifacts,
    availableRules,
    availableSkills: getAvailableSkillDirs(manifest.skillsRoot),
    directories: [...new Set(directories)].sort((left, right) => left.length - right.length || left.localeCompare(right)),
    files: files.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    openCode: createOpenCodeDesired(adapterTargets, ruleArtifacts),
    status,
    statusPath: path.join(targetDir, 'manifest.json'),
    targetDir,
    variables,
    workspaceDir,
  };
}

function createOpenCodeDesired(targets, ruleArtifacts) {
  const target = targets.find((item) => item.kind === 'opencode-instructions');
  const knownTarget = getAllRuleAdapterTargets()
    .find((item) => item.kind === 'opencode-instructions');
  return {
    active: Boolean(target),
    paths: target ? ruleArtifacts
      .filter((artifact) => isRuleArtifactManagedByAdapter(target, artifact.target))
      .map((artifact) => artifact.target) : [],
    target: (target || knownTarget).file,
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
