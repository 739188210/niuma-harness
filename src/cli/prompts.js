const readline = require('readline');
const { normalizeAgent } = require('../harness/agents');

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

let assetPromptInterface;
let assetPromptAnswers = [];
let assetPromptResolver;

function askAsset(question) {
  if (!assetPromptInterface) {
    assetPromptInterface = readline.createInterface({ input: process.stdin });
    assetPromptInterface.on('line', (answer) => {
      if (assetPromptResolver) {
        const resolve = assetPromptResolver;
        assetPromptResolver = undefined;
        resolve(answer);
        return;
      }
      assetPromptAnswers.push(answer);
    });
  }

  process.stdout.write(question);
  if (assetPromptAnswers.length > 0) {
    return Promise.resolve(assetPromptAnswers.shift());
  }

  return new Promise((resolve) => {
    assetPromptResolver = resolve;
  });
}

function closeAssetPrompts() {
  if (assetPromptInterface) {
    assetPromptInterface.close();
    assetPromptInterface = undefined;
  }
  assetPromptAnswers = [];
  assetPromptResolver = undefined;
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

async function chooseAssetInstallAgent() {
  if (!process.stdin.isTTY) {
    throw new Error('asset installation requires an interactive terminal');
  }

  while (true) {
    const answer = await askAsset([
      'Choose asset installation agent:',
      '  1. claude',
      '  2. codex',
      '  3. opencode',
      '  4. multi',
      'Enter claude/codex/opencode/multi or 1/2/3/4: ',
    ].join('\n'));

    try {
      return normalizeAgentAlias(answer);
    } catch {
      console.log('Please enter claude, codex, opencode, multi, 1, 2, 3, or 4.');
    }
  }
}

async function chooseAssets(label, assets) {
  if (!process.stdin.isTTY) {
    throw new Error('asset installation requires an interactive terminal');
  }

  while (true) {
    console.log(`Available ${label}:`);
    for (const [index, asset] of assets.entries()) {
      console.log(`  ${index + 1}. ${asset}`);
    }

    const answer = String(await askAsset('Enter comma-separated numbers, or press Enter to cancel: ')).trim();
    if (!answer) return [];

    const selections = answer.split(',').map((item) => item.trim());
    if (selections.every((item) => /^[1-9]\d*$/.test(item) && Number(item) <= assets.length)) {
      return [...new Set(selections.map((item) => assets[Number(item) - 1]))];
    }

    console.log('Please enter comma-separated numbers from the available list.');
  }
}

async function confirmAssetOverwrite() {
  if (!process.stdin.isTTY) {
    throw new Error('asset installation requires an interactive terminal');
  }
  return String(await askAsset('Continue? [y/N] ')) === 'y';
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
  chooseAssetInstallAgent,
  chooseAssets,
  closeAssetPrompts,
  confirmAssetOverwrite,
  chooseDiscoveredModules,
  confirmRepair,
};
