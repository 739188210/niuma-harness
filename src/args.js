const SUPPORTED_TOOLS = new Set(['claude', 'codex', 'opencode', 'multi']);
const SUPPORTED_RULES = new Set(['copy', 'empty']);

function parseArgs(argv) {
  const options = {
    command: null,
    targetDir: null,
    tool: null,
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

    if (arg === '--tool' || arg === '--rules' || arg === '--harness-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`${arg} requires a value.`);
      }
      assignOption(options, arg.slice(2), value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--tool=') || arg.startsWith('--rules=') || arg.startsWith('--harness-dir=')) {
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

  options.tool = normalizeTool(options.tool);
  options.rules = normalizeRules(options.rules);
  options.harnessDir = normalizeHarnessDir(options.harnessDir);

  return options;
}

function assignOption(options, name, value) {
  if (name === 'tool') {
    options.tool = value;
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

function normalizeTool(tool) {
  if (!tool) {
    return null;
  }

  const value = String(tool).trim().toLowerCase();
  if (SUPPORTED_TOOLS.has(value)) {
    return value;
  }

  throw new Error(`--tool must be one of: claude, codex, opencode, multi. Received: ${tool}`);
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

Options:
  --tool <name>          claude | codex | opencode | multi
  --harness-dir <name>   Directory to create inside target, default: harness
  --rules <mode>         copy | empty, default: copy
  --flat                 Write directly into target instead of target/harness
  --force                Overwrite existing scaffold files
  --dry-run              Print planned actions without writing files
  -h, --help             Show help

Examples:
  niuma-harness init . --tool claude
  niuma-harness init D:\\work\\app --tool codex --rules empty
  niuma-harness init . --tool multi --harness-dir ai-harness
  niuma-harness init . --tool opencode --flat --dry-run`;
}

module.exports = {
  parseArgs,
  normalizeTool,
  normalizeRules,
  normalizeHarnessDir,
  getHelpText,
};
