// workspace 级运行期目录的唯一 layout contract；不信任生成态 manifest 自报的路径。
const { assertNoSymlinkInPath, safeResolveInside, validateRelativePath } = require('./fs-safe');

const DEFAULT_WORK_DIRECTORY = 'agent-work';
const TASKS_DIRECTORY = 'tasks';
const README_FILE = 'README.md';

function getRuntimeLayout(manifest) {
  const workDirectory = manifest.workDirectory || DEFAULT_WORK_DIRECTORY;
  validateRelativePath(workDirectory, 'manifest work directory');
  if (workDirectory !== DEFAULT_WORK_DIRECTORY) {
    throw new Error(`manifest workDirectory must be ${DEFAULT_WORK_DIRECTORY}`);
  }

  const tasksDirectory = `${workDirectory}/${TASKS_DIRECTORY}`;
  const readmeTarget = `${workDirectory}/${README_FILE}`;
  const workDirectories = manifest.workDirectories || [];
  if (!workDirectories.includes(workDirectory)) {
    throw new Error(`manifest workDirectories must include ${workDirectory}`);
  }
  if (!workDirectories.includes(tasksDirectory)) {
    throw new Error(`manifest workDirectories must include ${tasksDirectory}`);
  }
  for (const directory of workDirectories) {
    validateRelativePath(directory, 'manifest work directory');
    if (directory !== workDirectory && !directory.startsWith(`${workDirectory}/`)) {
      throw new Error(`manifest work directory must stay inside ${workDirectory}: ${directory}`);
    }
  }

  const workTemplateFiles = manifest.workTemplateFiles || [];
  if (!workTemplateFiles.some((file) => file.target === readmeTarget)) {
    throw new Error(`manifest workTemplateFiles must include ${readmeTarget}`);
  }
  for (const file of workTemplateFiles) {
    validateRelativePath(file.target, 'manifest work template target');
    if (file.target !== readmeTarget && !file.target.startsWith(`${workDirectory}/`)) {
      throw new Error(`manifest work template target must stay inside ${workDirectory}: ${file.target}`);
    }
  }

  return {
    readmeTarget,
    tasksDirectory,
    workDirectories: [...workDirectories],
    workDirectory,
  };
}

function assertWorkDirBinding(workDir, runtimeLayout) {
  if (workDir !== runtimeLayout.workDirectory) {
    throw new Error(`workDir must match package manifest: ${runtimeLayout.workDirectory}`);
  }
}

function resolveRuntimePaths(workspaceDir, runtimeLayout) {
  const workDir = safeResolveInside(workspaceDir, runtimeLayout.workDirectory, 'workDir');
  assertNoSymlinkInPath(workDir);
  return {
    readmePath: safeResolveInside(workDir, README_FILE, 'workDir README'),
    tasksPath: safeResolveInside(workDir, TASKS_DIRECTORY, 'workDir tasks'),
    workDir,
  };
}

module.exports = {
  DEFAULT_WORK_DIRECTORY,
  assertWorkDirBinding,
  getRuntimeLayout,
  resolveRuntimePaths,
};
