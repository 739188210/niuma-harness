// 生成 harness/manifest.json 的状态结构，供 init 写入、doctor 读取。
const { getEntryFilesForAgent } = require('./agents');

const STATUS_FILE = 'manifest.json';

function createStatus(options, manifest = {}) {
  return {
    schemaVersion: 1,
    agent: options.agent,
    rules: options.rules,
    skills: options.skills,
    commands: options.commands || [],
    harnessDir: options.harnessDir,
    workDir: manifest.workDirectory || 'agent-work',
    entryFiles: getEntryFilesForAgent(options.agent),
    createdBy: 'niuma-harness',
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  STATUS_FILE,
  createStatus,
};
