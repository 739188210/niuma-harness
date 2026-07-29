const { canonicalizeWorkspacePath, safeResolveInside } = require('../infrastructure/fs-safe');
const { revalidateAssetInstallPlan } = require('./plan');
const { restoreAssetInstallBackup } = require('./backup');
const { removeCreatedFileNoFollow, writeRegularFileNoFollow } = require('./safe-fs');

function applyAssetInstallPlan({ workspaceDir, plan, backupRoot, originalBytes, dependencies = {} }) {
  const revalidate = dependencies.revalidateAssetInstallPlan || revalidateAssetInstallPlan;
  const restore = dependencies.restoreAssetInstallBackup || restoreAssetInstallBackup;
  const resolvedWorkspaceDir = canonicalizeWorkspacePath(workspaceDir);
  const mutations = plan
    .filter((item) => item.status === 'CREATE' || item.status === 'CONFLICT')
    .sort((left, right) => left.target.localeCompare(right.target));
  const createdTargets = [];

  revalidate({ workspaceDir: resolvedWorkspaceDir, plan });
  try {
    for (const item of mutations) {
      const targetPath = safeResolveInside(resolvedWorkspaceDir, item.target, 'asset install target');
      const writeOperation = dependencies.writeFile
        ? () => dependencies.writeFile(targetPath, item.content, { overwrite: item.status === 'CONFLICT' })
        : () => writeRegularFileNoFollow({
          workspaceDir: resolvedWorkspaceDir,
          filePath: targetPath,
          content: item.content,
          mode: item.status === 'CREATE' ? 'create' : 'overwrite',
          label: `asset install target ${item.target}`,
          beforeOpen: dependencies.beforeFinalWrite && (({ filePath }) => dependencies.beforeFinalWrite({ targetPath: filePath, item })),
        });
      const result = writeOperation();
      if (dependencies.writeFile) {
        const expectedResult = item.status === 'CREATE' ? 'create' : 'overwrite';
        if (result !== expectedResult) throw new Error(`Asset install target changed after revalidation: ${item.target}`);
        if (item.status === 'CREATE') createdTargets.push({ target: item.target, targetPath, identity: null });
        continue;
      }
      if (item.status === 'CREATE') createdTargets.push({ target: item.target, targetPath, identity: result });
    }
  } catch (writeError) {
    const rollbackFailures = [];
    for (const item of [...createdTargets].reverse()) {
      try {
        if (item.identity) {
          removeCreatedFileNoFollow({
            workspaceDir: resolvedWorkspaceDir,
            filePath: item.targetPath,
            identity: item.identity,
            label: `asset install rollback create ${item.target}`,
          });
        } else if (dependencies.removeFile) {
          dependencies.removeFile(item.targetPath, { dryRun: false });
        } else {
          const stat = require('fs').lstatSync(item.targetPath);
          if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing to remove unsafe injected create: ${item.targetPath}`);
          require('fs').unlinkSync(item.targetPath);
        }
      } catch (error) {
        rollbackFailures.push({ target: item.target, error });
      }
    }
    if (backupRoot) {
      const restoreResult = restore({
        workspaceDir,
        backupRoot,
        conflicts: plan,
        originalBytes,
        dependencies,
      });
      rollbackFailures.push(...restoreResult.failures.map((failure) => ({ target: failure.target, error: failure.error || new Error(failure.message) })));
    }
    if (rollbackFailures.length === 0) throw writeError;
    const details = rollbackFailures.map((failure) => `${failure.target}: ${failure.error.message}`).join('; ');
    throw new Error(`${writeError.message}; rollback failures: ${details}`, { cause: writeError });
  }
}

module.exports = {
  applyAssetInstallPlan,
};
