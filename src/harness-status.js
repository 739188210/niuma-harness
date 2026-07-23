// 生成 harness/manifest.json 的状态结构，供 init 写入、doctor 读取。
const { getEntryFilesForAgent } = require('./agents');

const STATUS_FILE = 'manifest.json';

function createStatus(options, runtimeLayout) {
  return {
    schemaVersion: 4,
    agent: options.agent,
    rules: options.rules,
    skills: options.skills,
    commands: options.commands || [],
    artifacts: options.artifacts || [],
    openCodeInstructions: options.openCodeInstructions || [],
    harnessDir: options.harnessDir,
    workDir: runtimeLayout.workDirectory,
    entryFiles: getEntryFilesForAgent(options.agent),
    topology: options.topology || { mode: 'single', modules: [] },
    moduleSupplements: options.moduleSupplements || [],
    createdBy: 'niuma-harness',
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  STATUS_FILE,
  createStatus,
};
