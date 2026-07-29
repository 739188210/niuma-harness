const {
  chooseAssetInstallAgent,
  chooseAssets,
  closeAssetPrompts,
  confirmAssetOverwrite,
} = require('../cli/prompts');
const { getAssetLabel, getAvailableAssetNames, normalizeInstallerAssetNames } = require('./catalog');
const { INSTALLER_TEMPLATE_VARIABLES, renderInstallerArtifacts } = require('./render');
const { prepareRuleAdapterArtifacts } = require('./rule-adapters');
const {
  createAssetInstallPlan,
  formatAssetInstallPlan,
  hasConflicts,
  hasUnsafeTargets,
} = require('./plan');
const { createAssetInstallBackup, verifyAssetInstallBackup } = require('./backup');
const { applyAssetInstallPlan } = require('./apply');
const { assertNoFollowAvailable } = require('./safe-fs');

async function runAssetInstall({ type, names, workspaceDir, dryRun }) {
  const label = getAssetLabel(type);
  try {
    const agent = await chooseAssetInstallAgent();
    const selectedNames = names.length > 0
      ? normalizeInstallerAssetNames(type, names)
      : await chooseAssets(label, getAvailableAssetNames(type));

    if (selectedNames.length === 0) {
      console.log('No assets selected. No files changed.');
      return { status: 'cancelled' };
    }

    assertNoFollowAvailable('asset installation');
    const artifacts = renderInstallerArtifacts({ type, agent, names: selectedNames });
    if (type === 'rule') {
      artifacts.push(...prepareRuleAdapterArtifacts({
        workspaceDir,
        agent,
        rules: selectedNames,
        ruleArtifacts: artifacts,
        variables: INSTALLER_TEMPLATE_VARIABLES,
      }));
    }
    const plan = createAssetInstallPlan({ workspaceDir, artifacts });
    if (hasUnsafeTargets(plan)) {
      throw new Error(`Unsafe targets in install plan:\n${formatAssetInstallPlan({ type, plan })}`);
    }
    if (dryRun || hasConflicts(plan)) {
      if (hasConflicts(plan)) console.log('Conflicts:');
      console.log(formatAssetInstallPlan({ type, plan }));
    }
    if (dryRun) return { status: 'dry-run' };
    if (hasConflicts(plan) && !(await confirmAssetOverwrite())) {
      console.log('Installation cancelled. No files changed.');
      return { status: 'cancelled' };
    }

    const backup = hasConflicts(plan)
      ? createAssetInstallBackup({ workspaceDir, conflicts: plan })
      : null;
    if (backup) verifyAssetInstallBackup({
      workspaceDir,
      backupRoot: backup.backupRoot,
      conflicts: plan,
      originalBytes: backup.originalBytes,
    });
    applyAssetInstallPlan({
      workspaceDir,
      plan,
      backupRoot: backup && backup.backupRoot,
      originalBytes: backup && backup.originalBytes,
    });
    console.log(`Installed ${label}.`);
    return { status: 'installed' };
  } finally {
    closeAssetPrompts();
  }
}

module.exports = {
  runAssetInstall,
};
