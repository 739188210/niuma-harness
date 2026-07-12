// init 的顶层编排层；具体写文件逻辑放在 src/scaffold/ 子模块中。
const fs = require('fs');
const path = require('path');

const { getEntryFilesForAgent, normalizeAgent } = require('./agents');
const { canonicalizeWorkspacePath } = require('./fs-safe');
const {
  formatCommands,
  getAvailableCommandFiles,
  getCommandId,
  getDefaultCommandsForAgent,
  normalizeConcreteCommands,
} = require('./commands');
const { formatRules } = require('./rules');
const {
  formatSkills,
  getAvailableSkillDirs,
  normalizeConcreteSkills,
} = require('./skills');
const { loadManifest, validateManifest } = require('./scaffold/manifest');
const { createDirectories, prepareDirectoryPlan } = require('./scaffold/directories');
const { prepareFilePlan, writeFilePlan } = require('./scaffold/entries');
const { prepareCommandPlan, writeCommandFiles } = require('./scaffold/commands-writer');
const { STATUS_FILE } = require('./harness-status');
const { validateArtifactRecords } = require('./artifact-ledger');
const { prepareRuleAdapterPlan, writeRuleAdapterFiles } = require('./scaffold/rules-adapters-writer');
const { prepareRulePlan, writeRuleFiles } = require('./scaffold/rules-writer');
const { prepareSkillPlan, writeSkillFiles } = require('./scaffold/skills-writer');
const { prepareStatusPlan, writeStatusFile } = require('./scaffold/status-writer');
const { createTemplateVariables } = require('./template-variables');
const {
  findCompetingHarnesses,
  formatCompetingHarnessError,
} = require('./workspace-harnesses');

// 通过统一 context 串联各个步骤，避免 runInit 重新堆成长方法。
function runInit(options) {
  const context = createInitContext(options);
  printInitSummary(context);
  createDirectories(context);
  writeFilePlan(context);
  writeRuleFiles(context);
  writeRuleAdapterFiles(context);
  writeSkillFiles(context);
  writeCommandFiles(context);
  writeStatusFile(context);
  printDone();
}

// 集中解析路径和模板变量，让后续 writer 模块只关注自己的写入职责。
function createInitContext(options) {
  const workspaceDir = canonicalizeWorkspacePath(options.targetDir || '.');
  const targetDir = path.join(workspaceDir, options.harnessDir);
  assertNoCompetingHarnesses(workspaceDir, options.harnessDir);
  const manifest = loadManifest();
  validateManifest(manifest);

  const workDirectory = manifest.workDirectory || 'agent-work';
  assertHarnessDirAvailable(options, workDirectory);
  const availableCommands = getAvailableCommandFiles(manifest.commandsRoot);
  assertCommandSkillIdsAvailable(availableCommands, getAvailableSkillDirs(manifest.skillsRoot));
  const commands = getDefaultCommandsForAgent(options.agent, availableCommands);
  const previousStatus = readPreviousStatus(
    targetDir,
    options.harnessDir,
    availableCommands,
    getAvailableSkillDirs(manifest.skillsRoot)
  );
  const context = {
    commands,
    manifest,
    options,
    previousStatus,
    printAction,
    targetDir,
    variables: createTemplateVariables(options, workDirectory),
    workDirectory,
    workspaceDir,
  };
  const preparedCommands = prepareCommandPlan(context);
  context.commandPlan = preparedCommands.plan;
  const preparedRules = prepareRulePlan(context);
  context.rulePlan = preparedRules.plan;
  context.artifacts = validateArtifactRecords([
    ...preparedCommands.artifacts,
    ...preparedRules.artifacts,
  ]);
  context.directoryPlan = prepareDirectoryPlan(context);
  context.filePlan = prepareFilePlan(context);
  context.ruleAdapterPlan = prepareRuleAdapterPlan(context);
  context.skillPlan = prepareSkillPlan(context);
  context.statusPlan = prepareStatusPlan(context);
  return context;
}

function readPreviousStatus(targetDir, harnessDir, availableCommands, availableSkills) {
  const statusPath = path.join(targetDir, STATUS_FILE);
  if (!fs.existsSync(statusPath)) {
    return null;
  }
  const stat = fs.lstatSync(statusPath);
  if (!stat.isFile()) {
    throw new Error(`Path exists but is not a regular file: ${statusPath}`);
  }

  let status;
  try {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid previous ${STATUS_FILE}: ${error.message}`);
  }
  if (!status || Array.isArray(status) || typeof status !== 'object') {
    throw new Error(`invalid previous ${STATUS_FILE}: expected a JSON object`);
  }
  if (status.schemaVersion !== 2 || status.createdBy !== 'niuma-harness') {
    throw new Error(`unsupported previous ${STATUS_FILE}; schemaVersion 2 ownership data is required`);
  }
  if (status.harnessDir !== harnessDir) {
    throw new Error(`invalid previous ${STATUS_FILE}: harnessDir must be ${harnessDir}`);
  }

  let agent;
  let commands;
  let skills;
  try {
    agent = normalizeAgent(status.agent);
    commands = normalizeConcreteCommands(status.commands, availableCommands, 'previous commands');
    skills = normalizeConcreteSkills(status.skills, availableSkills, 'previous skills');
  } catch (error) {
    throw new Error(`invalid previous ${STATUS_FILE}: ${error.message}`);
  }
  if (!agent) {
    throw new Error(`invalid previous ${STATUS_FILE}: missing agent`);
  }
  if (!sameStringArray(status.entryFiles, getEntryFilesForAgent(agent))) {
    throw new Error(`invalid previous ${STATUS_FILE}: entryFiles must match agent ${agent}`);
  }
  if (!sameStringArray(status.commands, commands)) {
    throw new Error(`invalid previous ${STATUS_FILE}: commands must be canonical`);
  }
  if (!sameStringArray(status.skills, skills)) {
    throw new Error(`invalid previous ${STATUS_FILE}: skills must be canonical`);
  }

  return {
    agent,
    artifacts: validateArtifactRecords(status.artifacts),
    commands,
    skills,
  };
}

function assertNoCompetingHarnesses(workspaceDir, harnessDir) {
  const conflicts = findCompetingHarnesses(workspaceDir, harnessDir);
  if (conflicts.length > 0) {
    throw new Error(formatCompetingHarnessError(workspaceDir, harnessDir, conflicts));
  }
}

// 防止 harness 目录和 workspace 级运行期任务目录重名。
function assertHarnessDirAvailable(options, workDirectory) {
  if (sameDirectoryName(options.harnessDir, workDirectory)) {
    throw new Error(`--harness-dir cannot be ${workDirectory} because it is reserved for runtime task records.`);
  }
}

function assertCommandSkillIdsAvailable(commandFiles, skillDirs) {
  const skillDirSet = new Set(skillDirs);
  for (const commandFile of commandFiles) {
    const commandId = getCommandId(commandFile);
    if (skillDirSet.has(commandId)) {
      throw new Error(`command ${commandFile} conflicts with skill directory ${commandId}`);
    }
  }
}

function printInitSummary(context) {
  const { options, targetDir, workspaceDir } = context;
  console.log(options.dryRun ? 'DRY RUN: preview scaffold changes' : 'Initializing niuma harness');
  console.log(`Workspace: ${workspaceDir}`);
  console.log(`Target: ${targetDir}`);
  console.log(`Agent: ${options.agent}`);
  console.log(`Rules: ${formatRules(options.rules)}`);
  console.log(`Skills: ${formatSkills(options.skills)}`);
  console.log(`Commands: ${formatCommands(context.commands)}`);
}

function printDone() {
  console.log('Done. Agents follow the operating loop in the generated entry file (CLAUDE.md / AGENTS.md). Run `niuma-harness doctor .` to verify; read HARNESS_GUIDE.md for maintenance.');
}

function sameStringArray(left, right) {
  return Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sameDirectoryName(left, right) {
  return normalizeDirectoryNameForCollision(left) === normalizeDirectoryNameForCollision(right);
}

function normalizeDirectoryNameForCollision(directoryName) {
  return directoryName.toLowerCase().replace(/[.]+$/u, '');
}

function printAction(action, targetPath) {
  const label = {
    create: 'CREATE',
    overwrite: 'OVERWRITE',
    remove: 'REMOVE',
    skip: 'SKIP',
  }[action] || action.toUpperCase();

  console.log(`${label.padEnd(9)} ${targetPath}`);
}

module.exports = {
  runInit,
};
