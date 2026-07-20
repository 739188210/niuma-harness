const readline = require('readline');
const { normalizeAgent } = require('./agents');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function chooseAgent(agent) {
  const normalized = normalizeAgent(agent);
  if (normalized) {
    return normalized;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Missing --agent. Use --agent claude, --agent codex, --agent opencode, or --agent multi.');
  }

  while (true) {
    const answer = await ask([
      'Choose AI coding agent:',
      '  1. claude   -> generate CLAUDE.md',
      '  2. codex    -> generate AGENTS.md',
      '  3. opencode -> generate AGENTS.md',
      '  4. multi    -> generate CLAUDE.md and AGENTS.md',
      'Enter claude/codex/opencode/multi or 1/2/3/4: ',
    ].join('\n'));

    try {
      return normalizeAgentAlias(answer);
    } catch {
      console.log('Please enter claude, codex, opencode, multi, 1, 2, 3, or 4.');
    }
  }
}

function normalizeAgentAlias(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    1: 'claude',
    2: 'codex',
    3: 'opencode',
    4: 'multi',
  };

  return normalizeAgent(aliases[normalized] || normalized);
}

async function chooseDiscoveredModules(modules) {
  if (!process.stdin.isTTY) {
    throw new Error('Topology discovery is preview-only without a TTY. Re-run with --dry-run or --modules <path,...>.');
  }
  console.log('Discovered module candidates:');
  for (const module of modules) console.log(`  - ${module.root} (${module.source || 'root descriptor'})`);
  const answer = String(await ask('Initialize supplements for all listed modules? [y/N] ')).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

async function confirmRepair() {
  if (!process.stdin.isTTY) {
    throw new Error('Repair confirmation requires a TTY. Re-run with -y or --yes.');
  }
  const answer = String(await ask('Apply this repair plan? Existing affected targets will be backed up permanently. [y/N] '))
    .trim()
    .toLowerCase();
  return answer === 'y' || answer === 'yes';
}

module.exports = {
  chooseAgent,
  chooseDiscoveredModules,
  confirmRepair,
};
