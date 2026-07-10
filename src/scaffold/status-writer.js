// 最后写入生成态 manifest.json，doctor 后续依赖它判断 harness 形状。
const { STATUS_FILE, createStatus } = require('../harness-status');
const { safeResolveInside, writeFile } = require('../fs-safe');

function writeStatusFile(context) {
  const { artifacts, commands, options, targetDir, workDirectory, printAction } = context;
  const statusPath = safeResolveInside(targetDir, STATUS_FILE, 'status target');
  const statusContent = `${JSON.stringify(createStatus({ ...options, artifacts, commands }, { workDirectory }), null, 2)}\n`;
  printAction(writeFile(statusPath, statusContent, { dryRun: options.dryRun, overwrite: true }), statusPath);
}

module.exports = {
  writeStatusFile,
};
