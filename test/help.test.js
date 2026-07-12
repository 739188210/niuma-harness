const test = require('node:test');
const { assert, run } = require('./helpers');

test('--help shows init, doctor, audit, and key options', () => {
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness init/);
  assert.match(result.stdout, /niuma-harness doctor/);
  assert.match(result.stdout, /niuma-harness audit/);
  assert.match(result.stdout, /--task <name>/);
  assert.match(result.stdout, /--strict/);
  assert.match(result.stdout, /--rules-out/);
  assert.match(result.stdout, /--skills/);
});

test('init --help shows --agent', () => {
  const result = run(['init', '--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /--agent/);
});
