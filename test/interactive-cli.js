Object.defineProperty(process.stdin, 'isTTY', { value: true });

const { main } = require('../src/cli');

main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
