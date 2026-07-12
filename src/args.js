// CLI 参数解析层：只负责把 argv 变成规范化 options。
const { normalizeAgent } = require('./agents');
const { normalizeRules, normalizeRulesOut } = require('./rules');
const { normalizeSkills } = require('./skills');

// 解析阶段会规范化 agent/rules，并读取本地规则目录来校验选择值。
function parseArgs(argv) {
  const options = {
    command: null,
    targetDir: null,
    agent: null,
    agentProvided: false,
    rules: null,
    rulesOut: null,
    rulesProvided: false,
    rulesOutProvided: false,
    skills: null,
    skillsProvided: false,
    harnessDir: 'harness',
    harnessDirProvided: false,
    backupDir: null,
    backupDirProvided: false,
    dryRun: false,
    yes: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '-y' || arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg === '--agent' || arg === '--tool' || arg === '--rules' || arg === '--rules-out' || arg === '--skills' || arg === '--harness-dir' || arg === '--backup-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`${arg} requires a value.`);
      }
      assignOption(options, arg.slice(2), value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--agent=') || arg.startsWith('--tool=') || arg.startsWith('--rules=') || arg.startsWith('--rules-out=') || arg.startsWith('--skills=') || arg.startsWith('--harness-dir=') || arg.startsWith('--backup-dir=')) {
      const [name, value] = splitLongOption(arg);
      assignOption(options, name, value);
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!options.command) {
      options.command = arg;
      continue;
    }

    if (!options.targetDir) {
      options.targetDir = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  options.agent = normalizeAgent(options.agent);
  if (options.rulesOut) {
    if (options.rulesProvided) {
      throw new Error('--rules and --rules-out cannot be used together.');
    }
    options.rules = normalizeRulesOut(options.rulesOut);
  } else if (options.rulesProvided) {
    options.rules = normalizeRules(options.rules);
  }
  options.skills = normalizeSkills(options.skills);
  options.harnessDir = normalizeHarnessDir(options.harnessDir);
  validateCommandOptions(options);

  return options;
}

function assignOption(options, name, value) {
  if (name === 'agent' || name === 'tool') {
    options.agent = value;
    options.agentProvided = true;
    return;
  }

  if (name === 'rules') {
    options.rules = value;
    options.rulesProvided = true;
    return;
  }

  if (name === 'rules-out') {
    options.rulesOut = value;
    options.rulesOutProvided = true;
    return;
  }

  if (name === 'skills') {
    options.skills = value;
    options.skillsProvided = true;
    return;
  }

  if (name === 'harness-dir') {
    options.harnessDir = value;
    options.harnessDirProvided = true;
    return;
  }

  if (name === 'backup-dir') {
    options.backupDir = value;
    options.backupDirProvided = true;
    return;
  }

  throw new Error(`Unknown option: --${name}`);
}

function splitLongOption(arg) {
  const equalsIndex = arg.indexOf('=');
  const name = arg.slice(2, equalsIndex);
  const value = arg.slice(equalsIndex + 1);

  if (!value) {
    throw new Error(`--${name} requires a value.`);
  }

  return [name, value];
}

function validateCommandOptions(options) {
  if (options.command === 'init') {
    if (options.yes || options.backupDirProvided) {
      throw new Error('--yes and --backup-dir are only available for repair.');
    }
    return;
  }

  if (options.command === 'doctor' || options.command === 'check') {
    if (options.agentProvided || options.rulesProvided || options.rulesOutProvided || options.skillsProvided
        || options.yes || options.backupDirProvided || options.dryRun) {
      throw new Error('doctor/check only supports --harness-dir.');
    }
    return;
  }

  if (options.command !== 'repair'
      && (options.yes || options.backupDirProvided)) {
    throw new Error('--yes and --backup-dir are only available for repair.');
  }
}

function normalizeHarnessDir(harnessDir) {
  const value = String(harnessDir || 'harness').trim();
  if (!value) {
    throw new Error('--harness-dir cannot be empty.');
  }

  if (value === '.' || value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error('--harness-dir must be a simple directory name.');
  }

  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error('--harness-dir may only contain letters, numbers, dots, underscores, and dashes.');
  }
  if (process.platform === 'win32' && value.endsWith('.')) {
    throw new Error('--harness-dir cannot end with a dot on Windows.');
  }

  return value;
}

module.exports = {
  parseArgs,
};
