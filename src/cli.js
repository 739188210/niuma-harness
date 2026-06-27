const { parseArgs, getHelpText } = require('./args');
const { chooseAgent } = require('./prompts');
const { runDoctor } = require('./doctor');
const { runInit } = require('./scaffold');

async function main(argv) {
  const options = parseArgs(argv);

  if (options.help || !options.command) {
    console.log(getHelpText());
    return;
  }

  if (options.command === 'init') {
    options.agent = await chooseAgent(options.agent);
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
