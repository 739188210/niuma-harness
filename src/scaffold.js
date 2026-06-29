// init 的顶层编排层；具体写文件逻辑放在 src/scaffold/ 子模块中。
const path = require('path');

const { getEntryFilesForAgent } = require('./agents');
const { formatRules } = require('./rules');
const {
  assertNoSymlinkInPath,
  ensureDir,
  listFilesRecursive,
  safeResolveInside,
  writeFile,
} = require('./fs-safe');
const { createStatus } = require('./harness-status');
const { loadManifest, validateManifest } = require('./scaffold/manifest');
const { renderTemplate } = require('./scaffold/templates');
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
const { writeRuleFiles } = require('./scaffold/rules-writer');
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
  writeStatusFile(context);
  printDone();
}

// 集中解析路径和模板变量，让后续 writer 模块只关注自己的写入职责。
function createInitContext(options) {
  const workspaceDir = path.resolve(options.targetDir || '.');
  const targetDir = options.flat ? workspaceDir : path.join(workspaceDir, options.harnessDir);
  const manifest = loadManifest();
  validateManifest(manifest);

  const workDirectory = manifest.workDirectory || 'agent-work';
  assertHarnessDirAvailable(options, workDirectory);

  return {
    manifest,
    options,
    printAction,
    targetDir,
    variables: createTemplateVariables(options, workDirectory),
    workDirectory,
    workspaceDir,
  };
}

// 防止 harness 目录和 workspace 级运行期任务目录重名。
function assertHarnessDirAvailable(options, workDirectory) {
  if (!options.flat && sameDirectoryName(options.harnessDir, workDirectory)) {
    throw new Error(`--harness-dir cannot be ${workDirectory} because it is reserved for runtime task records.`);
  }
}

function createTemplateVariables(options, workDirectory) {
  return {
    ENTRY_FILES: getEntryFilesForAgent(options.agent).join(', '),
    HARNESS_DIR: options.flat ? '.' : options.harnessDir,
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
}

function printDone() {
  console.log('Done. Start task work from docs/index.md. Read HARNESS_GUIDE.md for harness maintenance.');
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
  loadManifest,
  validateManifest,
  getEntryFilesForAgent,
  createStatus,
  renderTemplate,
  listFilesRecursive,
  ensureDir,
  writeFile,
  safeResolveInside,
  assertNoSymlinkInPath,
};
