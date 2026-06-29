// 创建 harness 内目录和 workspace 级运行期目录。
const { ensureDir, safeResolveInside } = require('../fs-safe');

function createTargetDirectory(context) {
  const { options, targetDir, printAction } = context;
  printAction(ensureDir(targetDir, options.dryRun), targetDir);
}

function createHarnessDirectories(context) {
  const { manifest, options, targetDir, printAction } = context;
  for (const directory of manifest.directories) {
    const targetPath = safeResolveInside(targetDir, directory, 'directory target');
    printAction(ensureDir(targetPath, options.dryRun), targetPath);
  }
}

function createWorkDirectories(context) {
  const { manifest, options, workspaceDir, printAction } = context;
  for (const directory of manifest.workDirectories || []) {
    const targetPath = safeResolveInside(workspaceDir, directory, 'work directory target');
    printAction(ensureDir(targetPath, options.dryRun), targetPath);
  }
}

module.exports = {
  createTargetDirectory,
  createHarnessDirectories,
  createWorkDirectories,
};
