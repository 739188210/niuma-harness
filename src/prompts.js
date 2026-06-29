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

module.exports = {
  ask,
  chooseAgent,
};
