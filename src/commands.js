// commands 分发模型：从 templates/commands 发现命令源模板，并映射到各 agent 的原生产物。
const fs = require('fs');
const path = require('path');
const { parseMarkdownFrontmatter } = require('./frontmatter');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const DEFAULT_COMMANDS_ROOT = 'commands';
const COMMAND_TARGETS = {
  claude: [{ kind: 'claude-command', root: '.claude/commands' }],
  codex: [{ kind: 'codex-skill-command', root: '.agents/skills' }],
  opencode: [{ kind: 'opencode-command', root: '.opencode/commands' }],
  multi: [
    { kind: 'claude-command', root: '.claude/commands' },
    { kind: 'codex-skill-command', root: '.agents/skills' },
    { kind: 'opencode-command', root: '.opencode/commands' },
  ],
};

function getCommandsRootPath(commandsRoot = DEFAULT_COMMANDS_ROOT) {
  return path.join(TEMPLATE_DIR, ...String(commandsRoot || DEFAULT_COMMANDS_ROOT).split(/[\\/]+/));
}

function getAvailableCommandFiles(commandsRoot = DEFAULT_COMMANDS_ROOT) {
  const commandsRootPath = getCommandsRootPath(commandsRoot);
  if (!fs.existsSync(commandsRootPath)) {
    return [];
  }

  return fs
    .readdirSync(commandsRootPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

function normalizeConcreteCommands(commands, availableCommands = getAvailableCommandFiles(), label = 'commands') {
  const normalized = [];
  for (const command of commands) {
    const value = normalizeCommandFile(command, label);
    if (!availableCommands.includes(value)) {
      throw new Error(`unknown command file: ${value}. Available: ${formatAvailableCommands(availableCommands)}`);
    }

    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return availableCommands.filter((command) => normalized.includes(command));
}

function normalizeCommandFile(command, label) {
  const value = String(command || '').trim().toLowerCase();
  if (!value) {
    throw new Error(`${label} cannot contain empty command names.`);
  }

  if (value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error(`${label} values must be simple command file names.`);
  }

  if (!/^[a-z0-9._-]+\.md$/.test(value)) {
    throw new Error(`${label} values must be Markdown file names using letters, numbers, dots, underscores, or dashes.`);
  }

  return value;
}

function getCommandId(commandFile) {
  return normalizeCommandFile(commandFile, 'commands').slice(0, -'.md'.length);
}

function parseCommandSpec(commandFile, content) {
  const parsed = parseMarkdownFrontmatter(content);
  if (!parsed) {
    throw new Error(`missing frontmatter in command template: ${commandFile}`);
  }

  const description = parsed.fields.description || '';
  if (!description) {
    throw new Error(`missing description in command template: ${commandFile}`);
  }

  return {
    id: getCommandId(commandFile),
    fileName: commandFile,
    description,
    argumentHint: parsed.fields['argument-hint'] || '',
    body: parsed.body,
  };
}

function getCommandTargetsForAgent(agent) {
  const targets = COMMAND_TARGETS[agent];
  if (!targets) {
    throw new Error(`unknown agent for command targets: ${agent}`);
  }

  return targets.map((target) => ({ ...target }));
}

function getCommandTargetRootsForAgent(agent) {
  return getCommandTargetsForAgent(agent)
    .filter((target) => target.kind === 'claude-command' || target.kind === 'opencode-command')
    .map((target) => target.root);
}

function getDefaultCommandsForAgent(agent, availableCommands = getAvailableCommandFiles()) {
  return getCommandTargetsForAgent(agent).length === 0 ? [] : [...availableCommands];
}

function formatCommands(commands) {
  return commands.length === 0 ? 'none' : commands.join(',');
}

function formatAvailableCommands(availableCommands = getAvailableCommandFiles()) {
  return availableCommands.length === 0 ? '(none)' : availableCommands.join(', ');
}

module.exports = {
  DEFAULT_COMMANDS_ROOT,
  getCommandsRootPath,
  getAvailableCommandFiles,
  normalizeConcreteCommands,
  getCommandId,
  parseCommandSpec,
  getCommandTargetsForAgent,
  getCommandTargetRootsForAgent,
  getDefaultCommandsForAgent,
  formatCommands,
  formatAvailableCommands,
};
