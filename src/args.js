const SUPPORTED_AGENTS = new Set(['claude', 'codex', 'opencode', 'multi']);
const SUPPORTED_RULES = new Set(['copy', 'empty']);

function parseArgs(argv) {
  const options = {
    command: null,
    targetDir: null,
    agent: null,
    rules: 'copy',
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

    if (arg === '--agent' || arg === '--tool' || arg === '--rules' || arg === '--harness-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`${arg} requires a value.`);
      }
      assignOption(options, arg.slice(2), value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--agent=') || arg.startsWith('--tool=') || arg.startsWith('--rules=') || arg.startsWith('--harness-dir=')) {
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
  options.rules = normalizeRules(options.rules);
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

function normalizeRules(rules) {
  const value = String(rules || 'copy').trim().toLowerCase();
  if (SUPPORTED_RULES.has(value)) {
    return value;
  }

  throw new Error(`--rules must be one of: copy, empty. Received: ${rules}`);
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

function getHelpText() {
  return `Usage:
  niuma-harness init [target] [options]
  niuma-harness doctor [target] [options]
  niuma-harness check [target] [options]

Init options:
  --agent <name>         claude | codex | opencode | multi
  --tool <name>          Alias for --agent
  --harness-dir <name>   Directory to create, default: harness
  --rules <mode>         copy | empty, default: copy
  --flat                 Write directly into target instead of target/harness
  --force                Overwrite existing scaffold files
  --dry-run              Print planned actions without writing files

Doctor/check options:
  --harness-dir <name>   Directory to inspect, default: harness

Global options:
  -h, --help             Show help

Examples:
  niuma-harness init . --agent claude
  niuma-harness init D:\\work\\app --agent codex --rules empty
  niuma-harness init . --agent multi --harness-dir ai-harness
  niuma-harness init . --agent opencode --flat --dry-run
  niuma-harness doctor .
  niuma-harness check . --harness-dir ai-harness`;
}

module.exports = {
  parseArgs,
  normalizeAgent,
  normalizeRules,
  normalizeHarnessDir,
  getHelpText,
};
