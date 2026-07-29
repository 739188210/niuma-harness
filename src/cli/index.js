// CLI 入口只做命令分发，具体行为委托给 init/doctor 模块。
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('./args');
const { getHelpText } = require('./help');
const { chooseAgent, chooseDiscoveredModules } = require('./prompts');
const { resolveTopology } = require('../harness/topology');
const { canonicalizeWorkspacePath } = require('../infrastructure/fs-safe');
const { normalizeSelectedRules, getDefaultRulesForAgent } = require('../rule/catalog');
const { runDoctor } = require('../doctor/index');
const { runInit } = require('../scaffold/index');
const { runRepair } = require('../repair/index');
const { runAssetInstall } = require('../installer/index');
const { STATUS_FILE } = require('../harness/manifest');

function finalizeRules(options) {
  if (options.rulesOut) {
    return;
  }

  if (options.rulesProvided) {
    options.rules = normalizeSelectedRules(options.rules);
    return;
  }

  options.rules = getDefaultRulesForAgent(options.agent);
}

function shouldDiscoverTopology(options, workspaceDir) {
  if (options.topology === 'discover') return true;
  if (options.topologyProvided || options.modulesProvided || !process.stdin.isTTY) return false;
  return !fs.existsSync(path.join(workspaceDir, options.harnessDir, STATUS_FILE));
}

async function main(argv) {
  const options = parseArgs(argv);

  if (options.help || !options.command) {
    console.log(getHelpText());
    return;
  }

  if (['install-skill', 'install-rule', 'install-command'].includes(options.command)) {
    await runAssetInstall({
      type: options.command.slice('install-'.length),
      names: options.assetNames,
      workspaceDir: canonicalizeWorkspacePath(process.cwd()),
      dryRun: options.dryRun,
    });
    return;
  }

  if (options.command === 'init') {
    options.agent = await chooseAgent(options.agent);
    finalizeRules(options);
    const workspaceDir = canonicalizeWorkspacePath(options.targetDir || '.');
    if (shouldDiscoverTopology(options, workspaceDir)) {
      const explicitDiscovery = options.topology === 'discover';
      const discovered = resolveTopology(workspaceDir, { ...options, topology: 'discover' });
      if (explicitDiscovery || discovered.modules.length > 0) {
        if (!options.dryRun) {
          const accepted = await chooseDiscoveredModules(discovered.modules);
          if (!accepted) {
            console.log('Topology discovery was not adopted. No files changed.');
            return;
          }
        }
        options.resolvedTopology = discovered;
      }
    }
    runInit(options);
    return;
  }

  if (options.command === 'doctor') {
    runDoctor(options);
    return;
  }

  if (options.command === 'repair') {
    await runRepair(options);
    return;
  }

  throw new Error(`Unknown command: ${options.command}. Use "init", "doctor", "repair", or an asset install command.`);
}

module.exports = {
  main,
};
