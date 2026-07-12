function printRepairPlan(plan) {
  console.log('Niuma Harness repair');
  console.log(`Workspace: ${plan.state.workspaceDir}`);
  console.log(`Harness: ${plan.state.targetDir}`);
  console.log(`Agent: ${plan.selections.agent} (${plan.selections.agentSource})`);
  console.log(`Rules: ${formatList(plan.selections.rules)} (${plan.selections.rulesSource})`);
  console.log(`Skills: ${formatList(plan.selections.skills)} (${plan.selections.skillsSource})`);
  console.log(`Backup: ${plan.backupRoot}`);
  console.log('');
  if (plan.issues.length === 0) {
    console.log('No repair needed.');
    return;
  }
  console.log(`Found ${plan.issues.length} issue${plan.issues.length === 1 ? '' : 's'}:`);
  for (const [index, issue] of plan.issues.entries()) {
    console.log(`${index + 1}. ${issue.code.toUpperCase()} [${issue.domain}]`);
    console.log(`   Path: ${issue.path}`);
    console.log(`   ${issue.message}`);
  }
  console.log('');
  console.log('Planned actions:');
  for (const operation of plan.operations) {
    if (operation.requiresBackup) console.log(`BACKUP   ${operation.relativePath}`);
    console.log(`${formatAction(operation.action).padEnd(8)} ${operation.relativePath}`);
  }
}

function printRepairSuccess(plan) {
  console.log('');
  console.log('Repair completed. Doctor passed.');
  if (plan.operations.some((item) => item.requiresBackup)) {
    console.log(`Backup retained: ${plan.backupRoot}`);
    console.log('Review the backup to restore any user content from files that had ambiguous markers or invalid structure.');
  }
}

function formatAction(action) {
  if (action === 'create-directory') return 'CREATE';
  if (action === 'replace-directory') return 'REPLACE';
  if (action === 'write-file') return 'WRITE';
  if (action === 'replace-file') return 'REPLACE';
  if (action === 'remove-node') return 'REMOVE';
  return action.toUpperCase();
}

function formatList(values) {
  return values.length === 0 ? 'none' : values.join(',');
}

module.exports = { printRepairPlan, printRepairSuccess };
