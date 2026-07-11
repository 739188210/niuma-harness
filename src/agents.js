// agent 相关规则集中在这里，避免 args/scaffold/doctor 各自维护一份。
const SUPPORTED_AGENTS = new Set(['claude', 'codex', 'opencode', 'multi']);

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

// entry 文件不放在模板 manifest 中，而是由 agent 模式决定。
function getAllEntryFiles() {
  return ['CLAUDE.md', 'AGENTS.md'];
}

function getEntryFilesForAgent(agent) {
  if (agent === 'claude') {
    return ['CLAUDE.md'];
  }

  if (agent === 'codex' || agent === 'opencode') {
    return ['AGENTS.md'];
  }

  if (agent === 'multi') {
    return ['CLAUDE.md', 'AGENTS.md'];
  }

  throw new Error(`Unsupported agent: ${agent}`);
}

module.exports = {
  normalizeAgent,
  getAllEntryFiles,
  getEntryFilesForAgent,
};
