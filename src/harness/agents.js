// agent 相关规则集中在这里，避免 args/scaffold/doctor 各自维护一份。
const {
  getAllEntryFiles,
  getEntryFilesForAgent,
  getSupportedAgents,
} = require('./agent-native-targets');

const SUPPORTED_AGENTS = new Set(getSupportedAgents());

function normalizeAgent(agent) {
  if (!agent) {
    return null;
  }

  const value = String(agent).trim().toLowerCase();
  if (SUPPORTED_AGENTS.has(value)) {
    return value;
  }

  throw new Error(`--agent must be one of: claude, codex, opencode, multi. Received: ${agent}`);
}

module.exports = {
  normalizeAgent,
  getAllEntryFiles,
  getEntryFilesForAgent,
};
