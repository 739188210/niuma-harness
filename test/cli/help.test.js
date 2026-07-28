const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { assert, run } = require('../support/helpers');

test('README documents only retained CLI commands and doctor health checks', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', '..', 'README.md'), 'utf8');
  assert.match(readme, /niuma-harness init \[target\] \[options\]/);
  assert.match(readme, /niuma-harness doctor \[target\] \[options\]/);
  assert.match(readme, /niuma-harness repair \[target\] \[options\]/);
  assert.match(readme, /## Doctor/);
});

test('--help shows init, doctor, repair, and no removed command surface', () => {
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness init/);
  assert.match(result.stdout, /niuma-harness doctor/);
  assert.match(result.stdout, /niuma-harness repair/);
  assert.match(result.stdout, /Doctor options:/);
  assert.match(result.stdout, /--rules-out/);
  assert.match(result.stdout, /--skills/);
  assert.match(result.stdout, /named selections automatically include common/);
});

test('init --help shows --agent', () => {
  const result = run(['init', '--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /--agent/);
});
