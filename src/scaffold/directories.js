// 创建 harness 内目录和 workspace 级运行期目录。
const { ensureDir, inspectDirectoryTarget, safeResolveInside } = require('../fs-safe');

function prepareDirectoryPlan(context) {
  const { manifest, runtimeLayout, targetDir, workspaceDir } = context;
  return [
    targetDir,
    ...manifest.directories.map((directory) => safeResolveInside(targetDir, directory, 'directory target')),
    ...runtimeLayout.workDirectories.map((directory) => safeResolveInside(workspaceDir, directory, 'work directory target')),
  ].map((targetPath) => ({
    action: inspectDirectoryTarget(targetPath) ? 'skip' : 'create',
    targetPath,
  }));
}

function createDirectories(context) {
  for (const item of context.directoryPlan) {
    context.printAction(ensureDir(item.targetPath, context.options.dryRun), item.targetPath);
  }
}

module.exports = {
  createDirectories,
  prepareDirectoryPlan,
};
