const readline = require('readline');
const { normalizeTool } = require('./args');

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

async function chooseTool(tool) {
  const normalized = normalizeTool(tool);
  if (normalized) {
    return normalized;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Missing --tool. Use --tool claude, --tool codex, --tool opencode, or --tool multi.');
  }

  while (true) {
    const answer = await ask([
      'Choose AI coding tool:',
      '  1. claude   -> generate CLAUDE.md',
      '  2. codex    -> generate AGENTS.md',
      '  3. opencode -> generate AGENTS.md',
      '  4. multi    -> generate CLAUDE.md and AGENTS.md',
      'Enter claude/codex/opencode/multi or 1/2/3/4: ',
    ].join('\n'));

    try {
      return normalizeToolAlias(answer);
    } catch {
      console.log('Please enter claude, codex, opencode, multi, 1, 2, 3, or 4.');
    }
  }
}

function normalizeToolAlias(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    1: 'claude',
    2: 'codex',
    3: 'opencode',
    4: 'multi',
  };

  return normalizeTool(aliases[normalized] || normalized);
}

module.exports = {
  ask,
  chooseTool,
};
