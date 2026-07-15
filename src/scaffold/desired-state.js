const path = require('path');
const { getAllEntryFiles, getEntryFilesForAgent } = require('../agents');
const { digestBytes, validateArtifactRecords } = require('../artifact-ledger');
const { renderCommandArtifacts } = require('../command-artifacts');
const { renderRuleArtifacts } = require('../rule-artifacts');
const { getAvailableRuleDirs, getRuleAdapterTargetsForAgent } = require('../rules');
const { getAvailableSkillDirs, getSkillFiles, getSkillTargetRootsForAgent } = require('../skills');
const { createStatus } = require('../harness-status');
const { createTemplateVariables } = require('../template-variables');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function createDesiredState(input) {
  const { agent, commands, harnessDir, manifest, rules, skills, workspaceDir } = input;
  const targetDir = path.join(workspaceDir, harnessDir);
  const workDirectory = manifest.workDirectory || 'agent-work';
  const variables = createTemplateVariables({ agent, harnessDir }, workDirectory);
  const directories = [
    targetDir,
    ...manifest.directories.map((item) => path.join(targetDir, ...item.split('/'))),
    ...(manifest.workDirectories || []).map((item) => path.join(workspaceDir, ...item.split('/'))),
  ];
  const files = [];

  for (const file of manifest.templateFiles) {
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

  const activeEntries = getEntryFilesForAgent(agent);
  const { renderEntry } = require('../entry-renderer');
  for (const entry of activeEntries) {
    files.push(descriptor(workspaceDir, path.join(workspaceDir, entry), renderEntry(agent, entry, rules, harnessDir, workDirectory, manifest.rulesRoot), 'entry', 'entry'));
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
  for (const root of getSkillTargetRootsForAgent(agent)) {
    for (const skill of skills) {
      for (const file of getSkillFiles(skill, manifest.skillsRoot)) {
        const source = path.relative(TEMPLATE_DIR, file.sourcePath).split(path.sep).join('/');
        files.push(descriptor(workspaceDir, path.join(workspaceDir, ...root.split('/'), skill, ...file.relativePath.split('/')), renderTemplate(source, variables), 'tool', 'skills'));
      }
    }
  }

  const commandArtifacts = renderCommandArtifacts(agent, commands, manifest.commandsRoot, variables)
    .map((item) => ({
      ...item,
      digest: digestBytes(Buffer.from(item.content, 'utf8')),
      targetPath: path.join(workspaceDir, ...item.target.split('/')),
    }));
  const records = validateArtifactRecords([...commandArtifacts, ...ruleArtifacts]
    .map((item) => ({ kind: item.kind, source: item.source, target: item.target, digest: item.digest })));
  const artifactByTarget = new Map([...commandArtifacts, ...ruleArtifacts].map((item) => [item.target, item]));
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
  }, { workDirectory });

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
  const active = targets.some((item) => item.kind === 'opencode-instructions');
  return {
    active,
    paths: active ? ruleArtifacts
      .filter((artifact) => artifact.target.startsWith('.opencode/rules/'))
      .map((artifact) => artifact.target) : [],
    target: 'opencode.json',
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
