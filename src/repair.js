const { inspectHarness } = require('./doctor');
const { chooseAgent, confirmRepair } = require('./prompts');
const { applyRepairPlan, rollback } = require('./repair/apply');
const {
  createRepairIdentity,
  createVerifiedBackup,
  resolveBackupRoot,
  revalidateOperations,
} = require('./repair/backup');
const { createRepairPlan } = require('./repair/planner');
const { printRepairPlan, printRepairSuccess } = require('./repair/report');
const { resolveRepairState } = require('./repair/state');

async function runRepair(options, dependencies = {}) {
  const now = dependencies.now ? dependencies.now() : new Date();
  const repairId = dependencies.createRepairId ? dependencies.createRepairId(now) : createRepairIdentity(now);
  const state = await resolveRepairState(options, dependencies.chooseAgent || chooseAgent);
  const backupRoot = resolveBackupRoot(state, options, repairId);
  const plan = createRepairPlan(state, backupRoot);
  const createBackup = dependencies.createVerifiedBackup || createVerifiedBackup;
  const revalidate = dependencies.revalidateOperations || revalidateOperations;
  const apply = dependencies.applyRepairPlan || applyRepairPlan;
  const inspect = dependencies.inspectHarness || inspectHarness;
  const restore = dependencies.rollback || rollback;
  const printPlan = dependencies.printRepairPlan || printRepairPlan;
  const printSuccess = dependencies.printRepairSuccess || printRepairSuccess;
  printPlan(plan);

  if (plan.issues.length === 0 || options.dryRun) {
    return;
  }
  const unresolved = plan.issues.filter((issue) => issue.code === 'stale-rule-drift'
    || issue.code === 'invalid-topology-state'
    || issue.code === 'module-registry-missing'
    || issue.code === 'module-registry-invalid'
    || issue.code === 'module-registry-drift'
    || issue.code === 'module-supplement-missing'
    || issue.code === 'module-supplement-drift');
  if (unresolved.length > 0) {
    throw new Error(`Repair cannot safely resolve user-owned module or drifted obsolete artifacts: ${unresolved.map((issue) => issue.path).join(', ')}`);
  }
  const confirmed = options.yes || await (dependencies.confirmRepair || confirmRepair)();
  if (!confirmed) {
    console.log('Repair cancelled. No files changed.');
    return;
  }

  createBackup(plan, { createdAt: now.toISOString(), repairId });
  revalidate(plan);
  apply(plan);
  const doctor = inspect({ harnessDir: state.harnessDir, targetDir: state.targetDir });
  if (doctor.errors.length > 0) {
    const rollbackErrors = restore(plan, plan.operations);
    const suffix = rollbackErrors.length > 0 ? ` Rollback errors: ${rollbackErrors.join('; ')}` : ' Original state restored from backup.';
    throw new Error(`Repair validation failed: ${doctor.errors.join('; ')}.${suffix} Backup retained at ${backupRoot}`);
  }
  printSuccess(plan);
}

module.exports = { runRepair };
