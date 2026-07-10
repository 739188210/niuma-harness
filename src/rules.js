// rules 选择模型：从模板目录发现规则包，并把 CLI 输入规范化为目录数组。
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const DEFAULT_RULES_ROOT = 'core/docs/rules';
const DEFAULT_RULES_SELECTION = 'common';
const DEFAULT_ENGINEERING_RULES = ['common'];
const AGENT_RULES = {
  claude: ['claude'],
  codex: ['codex'],
  opencode: ['opencode'],
  multi: ['claude', 'codex', 'opencode'],
};
const RULE_ADAPTER_TARGETS = {
  claude: [{ kind: 'claude-rule-pointer', root: '.claude/rules' }],
  codex: [{ kind: 'codex-entry-pointer', file: 'AGENTS.md' }],
  opencode: [{ kind: 'opencode-instructions', file: 'opencode.json' }],
  multi: [
    { kind: 'claude-rule-pointer', root: '.claude/rules' },
    { kind: 'codex-entry-pointer', file: 'AGENTS.md' },
    { kind: 'opencode-instructions', file: 'opencode.json' },
  ],
};
const PREFERRED_RULE_ORDER = ['common', 'web', 'typescript', 'java', 'python', 'fastapi', 'claude', 'codex', 'opencode'];
const SPECIAL_RULES = new Set(['all', 'none']);

function getRulesRootPath(rulesRoot = DEFAULT_RULES_ROOT) {
  return path.join(TEMPLATE_DIR, ...String(rulesRoot).split(/[\\/]+/));
}

function getAvailableRuleDirs(rulesRoot = DEFAULT_RULES_ROOT) {
  const rulesRootPath = getRulesRootPath(rulesRoot);
  if (!fs.existsSync(rulesRootPath)) {
    return [];
  }

  return fs
    .readdirSync(rulesRootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareRuleDirs);
}

function compareRuleDirs(left, right) {
  const leftIndex = PREFERRED_RULE_ORDER.indexOf(left);
  const rightIndex = PREFERRED_RULE_ORDER.indexOf(right);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right);
}

// --rules 的最终结果始终是“实际要安装的规则目录数组”。
function normalizeRules(rules, availableRules = getAvailableRuleDirs()) {
  if (Array.isArray(rules)) {
    return normalizeConcreteRules(rules, availableRules, 'rules');
  }

  const tokens = parseRuleTokens(rules || DEFAULT_RULES_SELECTION, 'rules');
  if (tokens.length === 1 && tokens[0] === 'none') {
    return [];
  }

  if (tokens.length === 1 && tokens[0] === 'all') {
    return [...availableRules];
  }

  if (tokens.some((token) => SPECIAL_RULES.has(token))) {
    throw new Error('all and none must be used alone.');
  }

  return normalizeConcreteRules(tokens, availableRules, 'rules');
}

function getAgentRuleDirs(agent, availableRules = getAvailableRuleDirs()) {
  const agentRules = AGENT_RULES[agent];
  if (!agentRules) {
    throw new Error(`unknown agent for default rules: ${agent}`);
  }

  return normalizeConcreteRules(agentRules, availableRules, 'agent rules');
}

function getDefaultRulesForAgent(agent, availableRules = getAvailableRuleDirs()) {
  return mergeRules([...DEFAULT_ENGINEERING_RULES, ...getAgentRuleDirs(agent, availableRules)], availableRules);
}

function getRuleAdapterTargetsForAgent(agent) {
  const targets = RULE_ADAPTER_TARGETS[agent];
  if (!targets) {
    throw new Error(`unknown agent for rule adapters: ${agent}`);
  }

  return targets.map((target) => ({ ...target }));
}

function addAgentRules(rules, agent, availableRules = getAvailableRuleDirs()) {
  const normalizedRules = normalizeConcreteRules(rules, availableRules, 'rules');
  if (normalizedRules.length === 0) {
    return [];
  }

  return mergeRules([...normalizedRules, ...getAgentRuleDirs(agent, availableRules)], availableRules);
}

function mergeRules(rules, availableRules = getAvailableRuleDirs()) {
  return normalizeConcreteRules(rules, availableRules, 'rules');
}

// --rules-out 以 all 为基准，排除用户列出的规则目录。
function normalizeRulesOut(rulesOut, availableRules = getAvailableRuleDirs()) {
  const excluded = normalizeConcreteRules(parseRuleTokens(rulesOut, 'rules-out'), availableRules, 'rules-out');
  return availableRules.filter((rule) => !excluded.includes(rule));
}

function normalizeConcreteRules(rules, availableRules = getAvailableRuleDirs(), label = 'rules') {
  const normalized = [];
  for (const rule of rules) {
    const value = normalizeRuleName(rule, label);
    if (SPECIAL_RULES.has(value)) {
      throw new Error(`${value} is not a rule directory for --${label}.`);
    }

    if (!availableRules.includes(value)) {
      throw new Error(`unknown rule directory: ${value}. Available: ${formatAvailableRules(availableRules)}`);
    }

    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return availableRules.filter((rule) => normalized.includes(rule));
}

function parseRuleTokens(value, label) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error(`--${label} cannot be empty.`);
  }

  const tokens = raw.split(',').map((token) => token.trim().toLowerCase());
  if (tokens.some((token) => !token)) {
    throw new Error(`--${label} cannot contain empty rule names.`);
  }

  return tokens;
}

function normalizeRuleName(rule, label) {
  const value = String(rule || '').trim().toLowerCase();
  if (!value) {
    throw new Error(`--${label} cannot contain empty rule names.`);
  }

  if (value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error(`--${label} values must be simple rule directory names.`);
  }

  if (!/^[a-z0-9._-]+$/.test(value)) {
    throw new Error(`--${label} values may only contain letters, numbers, dots, underscores, and dashes.`);
  }

  return value;
}

function formatRules(rules) {
  return rules.length === 0 ? 'none' : rules.join(',');
}

function formatAvailableRules(availableRules = getAvailableRuleDirs()) {
  return availableRules.length === 0 ? '(none)' : availableRules.join(', ');
}

module.exports = {
  getRulesRootPath,
  getAvailableRuleDirs,
  normalizeRules,
  normalizeRulesOut,
  normalizeConcreteRules,
  getDefaultRulesForAgent,
  getRuleAdapterTargetsForAgent,
  addAgentRules,
  formatRules,
};
