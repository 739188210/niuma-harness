// 最后写入生成态 manifest.json，doctor 后续依赖它判断 harness 形状。
const { STATUS_FILE, createStatus } = require('../harness-status');
const { inspectFileTarget, safeResolveInside, writeFile } = require('../fs-safe');

function prepareStatusPlan(context) {
  const statusPath = safeResolveInside(context.targetDir, STATUS_FILE, 'status target');
  const exists = inspectFileTarget(statusPath);
  return {
    action: exists ? 'overwrite' : 'create',
    content: `${JSON.stringify(createStatus({
      ...context.options,
      artifacts: context.artifacts,
      commands: context.commands,
      openCodeInstructions: context.ruleAdapterPlan.expectedOpenCodePaths,
    }, { workDirectory: context.workDirectory }), null, 2)}\n`,
    targetPath: statusPath,
  };
}

function writeStatusFile(context) {
  const item = context.statusPlan;
  context.printAction(writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: true }), item.targetPath);
}

module.exports = {
  prepareStatusPlan,
  writeStatusFile,
};
