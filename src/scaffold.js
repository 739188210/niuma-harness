// init 的顶层编排层；具体写文件逻辑放在 src/scaffold/ 子模块中。
const fs = require('fs');
const path = require('path');

const { getEntryFilesForAgent } = require('./agents');
const { formatCommands, getAvailableCommandFiles, getCommandId, getDefaultCommandsForAgent } = require('./commands');
const { formatRules } = require('./rules');
const { formatSkills, getAvailableSkillDirs } = require('./skills');
const { loadManifest, validateManifest } = require('./scaffold/manifest');
const {
  createHarnessDirectories,
  createTargetDirectory,
  createWorkDirectories,
} = require('./scaffold/directories');
const {
  writeEntryFiles,
  writeTemplateFiles,
  writeWorkTemplateFiles,
} = require('./scaffold/entries');
const { prepareCommandPlan, writeCommandFiles } = require('./scaffold/commands-writer');
const { STATUS_FILE } = require('./harness-status');
const { validateArtifactRecords } = require('./artifact-ledger');
const { writeRuleAdapterFiles } = require('./scaffold/rules-adapters-writer');
const { writeRuleFiles } = require('./scaffold/rules-writer');
const { writeSkillFiles } = require('./scaffold/skills-writer');
const { writeStatusFile } = require('./scaffold/status-writer');

// 通过统一 context 串联各个步骤，避免 runInit 重新堆成长方法。
function runInit(options) {
  const context = createInitContext(options);
  printInitSummary(context);
  createTargetDirectory(context);
  createHarnessDirectories(context);
  createWorkDirectories(context);
  writeEntryFiles(context);
  writeTemplateFiles(context);
  writeWorkTemplateFiles(context);
  writeRuleFiles(context);
  writeRuleAdapterFiles(context);
  writeSkillFiles(context);
  writeCommandFiles(context);
  writeStatusFile(context);
  printDone();
}

// 集中解析路径和模板变量，让后续 writer 模块只关注自己的写入职责。
function createInitContext(options) {
  const workspaceDir = path.resolve(options.targetDir || '.');
  const targetDir = path.join(workspaceDir, options.harnessDir);
  const manifest = loadManifest();
  validateManifest(manifest);

  const workDirectory = manifest.workDirectory || 'agent-work';
  assertHarnessDirAvailable(options, workDirectory);
  const availableCommands = getAvailableCommandFiles(manifest.commandsRoot);
  assertCommandSkillIdsAvailable(availableCommands, getAvailableSkillDirs(manifest.skillsRoot));
  const commands = getDefaultCommandsForAgent(options.agent, availableCommands);
  const context = {
    commands,
    manifest,
    options,
    printAction,
    targetDir,
    variables: createTemplateVariables(options, workDirectory),
    workDirectory,
    workspaceDir,
  };
  const previousArtifacts = readPreviousArtifacts(targetDir);
  const prepared = prepareCommandPlan(context, previousArtifacts);
  context.artifacts = prepared.artifacts;
  context.commandPlan = prepared.plan;
  return context;
}

function readPreviousArtifacts(targetDir) {
  const statusPath = path.join(targetDir, STATUS_FILE);
  if (!fs.existsSync(statusPath)) {
    return [];
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
  if (status.schemaVersion !== 2 || status.createdBy !== 'niuma-harness') {
    throw new Error(`unsupported previous ${STATUS_FILE}; schemaVersion 2 ownership data is required`);
  }
  return validateArtifactRecords(status.artifacts);
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

function createTemplateVariables(options, workDirectory) {
  return {
    ENTRY_FILES: getEntryFilesForAgent(options.agent).join(', '),
    HARNESS_DIR: options.harnessDir,
    WORK_DIR: workDirectory,
  };
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
