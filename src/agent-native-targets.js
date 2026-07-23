// Agent-native surface topology: declares where each agent consumes generated artifacts.
// Renderers and ownership lifecycle remain in their domain modules.
const AGENT_NATIVE_TARGETS = {
  claude: {
    entryFiles: ['CLAUDE.md'],
    commands: [{ kind: 'claude-command', root: '.claude/commands' }],
    rules: {
      adapters: [],
      entryInjection: null,
      legacyRoots: ['.claude/rules/niuma'],
      roots: ['.claude/rules'],
    },
    skills: ['.claude/skills'],
  },
  codex: {
    entryFiles: ['AGENTS.md'],
    commands: [{ kind: 'codex-skill-command', root: '.agents/skills' }],
    rules: {
      adapters: [],
      entryInjection: { entryFile: 'AGENTS.md', renderer: 'codex-rules' },
      legacyRoots: [],
      roots: [],
    },
    skills: ['.agents/skills'],
  },
  opencode: {
    entryFiles: ['AGENTS.md'],
    commands: [{ kind: 'opencode-command', root: '.opencode/commands' }],
    rules: {
      adapters: [{
        file: 'opencode.json',
        kind: 'opencode-instructions',
        ruleRoot: '.opencode/rules',
      }],
      entryInjection: null,
      legacyRoots: ['.opencode/rules/niuma'],
      roots: ['.opencode/rules'],
    },
    skills: ['.opencode/skills'],
  },
  multi: {
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
    commands: [
      { kind: 'claude-command', root: '.claude/commands' },
      { kind: 'codex-skill-command', root: '.agents/skills' },
      { kind: 'opencode-command', root: '.opencode/commands' },
    ],
    rules: {
      adapters: [{
        file: 'opencode.json',
        kind: 'opencode-instructions',
        ruleRoot: '.opencode/rules',
      }],
      entryInjection: { entryFile: 'AGENTS.md', renderer: 'codex-rules' },
      legacyRoots: ['.claude/rules/niuma', '.opencode/rules/niuma'],
      roots: ['.claude/rules', '.opencode/rules'],
    },
    skills: ['.claude/skills', '.agents/skills', '.opencode/skills'],
  },
};

function getSupportedAgents() {
  return Object.keys(AGENT_NATIVE_TARGETS);
}

function getEntryFilesForAgent(agent) {
  return [...getProfile(agent).entryFiles];
}

function getAllEntryFiles() {
  return unique(getSupportedAgents().flatMap((agent) => getEntryFilesForAgent(agent)));
}

function getCommandTargetsForAgent(agent) {
  return getProfile(agent).commands.map(copyTarget);
}

function getRuleTargetRootsForAgent(agent) {
  return [...getProfile(agent).rules.roots];
}

function getLegacyRuleTargetRootsForAgent(agent) {
  return [...getProfile(agent).rules.legacyRoots];
}

function getAllKnownRuleTargetRoots() {
  return unique(getSupportedAgents().flatMap((agent) => [
    ...getRuleTargetRootsForAgent(agent),
    ...getLegacyRuleTargetRootsForAgent(agent),
  ]));
}

function getRuleAdapterTargetsForAgent(agent) {
  return getProfile(agent).rules.adapters.map(copyTarget);
}

function getAllRuleAdapterTargets() {
  const targets = [];
  const seen = new Set();
  for (const agent of getSupportedAgents()) {
    for (const target of getRuleAdapterTargetsForAgent(agent)) {
      const key = `${target.kind}\0${target.file}\0${target.ruleRoot}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(target);
    }
  }
  return targets;
}

function getRuleEntryInjectionForAgent(agent) {
  const injection = getProfile(agent).rules.entryInjection;
  return injection ? copyTarget(injection) : null;
}

function getSkillTargetRootsForAgent(agent) {
  return [...getProfile(agent).skills];
}

function getAllSkillTargetRoots() {
  return unique(getSupportedAgents().flatMap((agent) => getSkillTargetRootsForAgent(agent)));
}

function getLegacyClaudeRulePointerRoot() {
  return '.claude/rules';
}

function getLegacyClaudeRulePointerTarget(ruleName) {
  return `${getLegacyClaudeRulePointerRoot()}/niuma-${ruleName}.md`;
}

function isRuleArtifactManagedByAdapter(adapter, target) {
  return target === adapter.ruleRoot || target.startsWith(`${adapter.ruleRoot}/`);
}

function getProfile(agent) {
  const profile = AGENT_NATIVE_TARGETS[agent];
  if (!profile) {
    throw new Error(`Unsupported agent: ${agent}`);
  }
  return profile;
}

function copyTarget(target) {
  return { ...target };
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  getAllEntryFiles,
  getAllKnownRuleTargetRoots,
  getAllRuleAdapterTargets,
  getAllSkillTargetRoots,
  getCommandTargetsForAgent,
  getEntryFilesForAgent,
  getLegacyClaudeRulePointerRoot,
  getLegacyClaudeRulePointerTarget,
  getLegacyRuleTargetRootsForAgent,
  getRuleAdapterTargetsForAgent,
  getRuleEntryInjectionForAgent,
  getRuleTargetRootsForAgent,
  getSkillTargetRootsForAgent,
  getSupportedAgents,
  isRuleArtifactManagedByAdapter,
};
