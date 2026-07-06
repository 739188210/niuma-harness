// CLI 入口只做命令分发，具体行为委托给 init/doctor 模块。
const { parseArgs } = require('./args');
const { getHelpText } = require('./help');
const { chooseAgent } = require('./prompts');
const { addAgentRules, getDefaultRulesForAgent } = require('./rules');
const { runDoctor } = require('./doctor');
const { runInit } = require('./scaffold');

function finalizeRules(options) {
  if (options.rulesOut) {
    return;
  }

  if (options.rulesProvided) {
    options.rules = addAgentRules(options.rules, options.agent);
    return;
  }

  options.rules = getDefaultRulesForAgent(options.agent);
}

async function main(argv) {
  const options = parseArgs(argv);

  if (options.help || !options.command) {
    console.log(getHelpText());
    return;
  }

  if (options.command === 'init') {
    options.agent = await chooseAgent(options.agent);
    finalizeRules(options);
    runInit(options);
    return;
  }

  if (options.command === 'doctor' || options.command === 'check') {
    runDoctor(options);
    return;
  }

  throw new Error(`Unknown command: ${options.command}. Use "init", "doctor", or "check".`);
}

module.exports = {
  main,
};
