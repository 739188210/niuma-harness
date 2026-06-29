// CLI 参数解析层：只负责把 argv 变成规范化 options。
const { normalizeAgent } = require('./agents');
const { getHelpText } = require('./help');
const { DEFAULT_RULES_SELECTION, normalizeRules, normalizeRulesOut } = require('./rules');

// 解析阶段会规范化 agent/rules，并读取本地规则目录来校验选择值。
function parseArgs(argv) {
  const options = {
    command: null,
    targetDir: null,
    agent: null,
    rules: DEFAULT_RULES_SELECTION,
    rulesOut: null,
    rulesProvided: false,
    harnessDir: 'harness',
    flat: false,
    force: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--flat') {
      options.flat = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--agent' || arg === '--tool' || arg === '--rules' || arg === '--rules-out' || arg === '--harness-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`${arg} requires a value.`);
      }
      assignOption(options, arg.slice(2), value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--agent=') || arg.startsWith('--tool=') || arg.startsWith('--rules=') || arg.startsWith('--rules-out=') || arg.startsWith('--harness-dir=')) {
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
  } else {
    options.rules = normalizeRules(options.rules);
  }
  options.harnessDir = normalizeHarnessDir(options.harnessDir);

  return options;
}

function assignOption(options, name, value) {
  if (name === 'agent' || name === 'tool') {
    options.agent = value;
    return;
  }

  if (name === 'rules') {
    options.rules = value;
    options.rulesProvided = true;
    return;
  }

  if (name === 'rules-out') {
    options.rulesOut = value;
    return;
  }

  if (name === 'harness-dir') {
    options.harnessDir = value;
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

  return value;
}

module.exports = {
  parseArgs,
  normalizeAgent,
  normalizeRules,
  normalizeHarnessDir,
  getHelpText,
};
