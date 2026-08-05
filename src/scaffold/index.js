// init 的顶层编排层；具体写文件逻辑放在 src/scaffold/ 子模块中。
const fs = require('fs');
const path = require('path');

const { getEntryFilesForAgent, normalizeAgent } = require('../harness/agents');
const { canonicalizeWorkspacePath } = require('../infrastructure/fs-safe');
const {
  formatCommands,
  getAvailableCommandFiles,
  getCommandId,
  getDefaultCommandsForAgent,
  normalizeConcreteCommands,
} = require('../command/catalog');
const { formatRules, getAvailableRuleDirs, normalizeConcreteRules } = require('../rule/catalog');
const {
  formatSkills,
  getAvailableSkillDirs,
  normalizeConcreteSkills,
} = require('../skill/catalog');
const { loadManifest, validateManifest } = require('../generator/template-manifest');
const { createDirectories, prepareDirectoryPlan } = require('./directories');
const { prepareFilePlan, writeFilePlan } = require('./entries');
const { getModuleSupplementRecords, prepareModuleEntryPlan, writeModuleEntryPlan } = require('./module-entries');
const { prepareTopologyPlan, writeTopologyPlan } = require('./topology-writer');
const { resolveTopology } = require('../harness/topology');
const { prepareCommandPlan, writeCommandFiles } = require('./commands-writer');
const { STATUS_FILE, parseCoreManifest } = require('../harness/manifest');
const { validateArtifactRecords } = require('../artifact/ledger');
const { prepareRuleAdapterPlan, writeRuleAdapterFiles } = require('./rules-adapters-writer');
const { prepareRulePlan, writeRuleFiles } = require('./rules-writer');
const { prepareSkillPlan, writeSkillFiles } = require('./skills-writer');
const { prepareStatusPlan, writeStatusFile } = require('./status-writer');
const { createTemplateVariables } = require('../harness/template-variables');
const { getRuntimeLayout } = require('../harness/runtime-layout');
const {
  findCompetingHarnesses,
  formatCompetingHarnessError,
} = require('../harness/workspace-harnesses');

// 通过统一 context 串联各个步骤，避免 runInit 重新堆成长方法。
function runInit(options) {
  const context = createInitContext(options);
  printInitSummary(context);
  createDirectories(context);
  writeTopologyPlan(context);
  writeFilePlan(context);
  writeModuleEntryPlan(context);
  if (!context.previousStatus) {
    writeRuleFiles(context);
    writeRuleAdapterFiles(context);
    writeSkillFiles(context);
    writeCommandFiles(context);
  }
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

  const runtimeLayout = getRuntimeLayout(manifest);
  assertHarnessDirAvailable(options, runtimeLayout.workDirectory);
  const availableCommands = getAvailableCommandFiles(manifest.commandsRoot);
  assertCommandSkillIdsAvailable(availableCommands, getAvailableSkillDirs(manifest.skillsRoot));
  const commands = getDefaultCommandsForAgent(options.agent, availableCommands);
  const previousStatus = readPreviousStatus(targetDir, options.harnessDir, runtimeLayout);
  const topology = options.resolvedTopology || resolveTopology(workspaceDir, options);
  const context = {
    commands,
    manifest,
    options,
    previousStatus,
    printAction,
    runtimeLayout,
    targetDir,
    topology,
    variables: createTemplateVariables(options, runtimeLayout.workDirectory),
    workDirectory: runtimeLayout.workDirectory,
    workspaceDir,
  };
  if (!previousStatus) {
    const preparedCommands = prepareCommandPlan(context);
    context.commandPlan = preparedCommands.plan;
    const preparedRules = prepareRulePlan(context);
    context.rulePlan = preparedRules.plan;
    const preparedSkills = prepareSkillPlan(context);
    context.skillPlan = preparedSkills.plan;
    context.artifacts = validateArtifactRecords([
      ...preparedCommands.artifacts,
      ...preparedRules.artifacts,
      ...preparedSkills.artifacts,
    ]);
  } else {
    context.commandPlan = [];
    context.rulePlan = [];
    context.skillPlan = [];
    context.artifacts = [];
  }
  context.directoryPlan = prepareDirectoryPlan(context);
  context.topologyPlan = prepareTopologyPlan(context);
  context.filePlan = prepareFilePlan(context);
  context.moduleEntryPlan = prepareModuleEntryPlan(context);
  context.moduleSupplements = getModuleSupplementRecords(context.moduleEntryPlan);
  context.ruleAdapterPlan = previousStatus ? { expectedOpenCodePaths: [] } : prepareRuleAdapterPlan(context);
  context.statusPlan = prepareStatusPlan(context);
  return context;
}

function readPreviousStatus(targetDir, harnessDir, runtimeLayout) {
  const statusPath = path.join(targetDir, STATUS_FILE);
  if (!fs.existsSync(statusPath)) return null;
  const stat = fs.lstatSync(statusPath);
  if (!stat.isFile()) throw new Error(`Path exists but is not a regular file: ${statusPath}`);

  let status;
  try {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid previous ${STATUS_FILE}: ${error.message}`);
  }
  try {
    return parseCoreManifest(status, { harnessDir, runtimeLayout });
  } catch (error) {
    throw new Error(`invalid previous ${STATUS_FILE}: ${error.message}`);
  }
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
  console.log(`Topology: ${context.topology.modules.length === 0 ? 'root-only' : context.topology.modules.map((module) => module.root).join(', ')}`);
}

function printDone() {
  console.log('Done. Agents follow the generated collaboration contract in CLAUDE.md / AGENTS.md. Run `niuma-harness doctor .` to verify installed Harness integrity; read the generated Harness README for ownership and maintenance.');
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
