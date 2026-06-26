const { parseArgs, getHelpText } = require('./args');
const { chooseTool } = require('./prompts');
const { runInit } = require('./scaffold');

async function main(argv) {
  const options = parseArgs(argv);

  if (options.help || !options.command) {
    console.log(getHelpText());
    return;
  }

  if (options.command !== 'init') {
    throw new Error(`Unknown command: ${options.command}. Only "init" is supported.`);
  }

  options.tool = await chooseTool(options.tool);
  runInit(options);
}

module.exports = {
  main,
};
