const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { assert, run } = require('../support/helpers');

test('README documents retained CLI commands, doctor health checks, and asset installers', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', '..', 'README.md'), 'utf8');
  assert.match(readme, /niuma-harness init \[target\] \[options\]/);
  assert.match(readme, /niuma-harness doctor \[target\] \[options\]/);
  assert.match(readme, /niuma-harness repair \[target\] \[options\]/);
  for (const command of ['install-skill', 'install-rule', 'install-command']) {
    assert.match(readme, new RegExp(`niuma-harness ${command} \\[names\\.\\.\\.\\]`));
  }
  assert.match(readme, /## Doctor/);
});

test('README documents interactive current-directory asset installers', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', '..', 'README.md'), 'utf8');
  for (const command of ['install-skill', 'install-rule', 'install-command']) {
    assert.match(readme, new RegExp(`niuma-harness ${command} \\[names\\.\\.\\.\\]`));
  }
  assert.match(readme, /current working directory/i);
  assert.match(readme, /interactive terminal/i);
  assert.match(readme, /does not initialize or update.*Harness/i);
  assert.match(readme, /\.niuma-harness\/asset-installs/i);
  assert.doesNotMatch(readme, /install-skill \[target\]/);
  assert.doesNotMatch(readme, /install-rule .*--agent/);
  assert.doesNotMatch(readme, /install-command .*--target/);
});

test('--help shows init, doctor, repair, asset installers, and no removed command surface', () => {
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness init/);
  assert.match(result.stdout, /niuma-harness doctor/);
  assert.match(result.stdout, /niuma-harness repair/);
  for (const command of ['install-skill', 'install-rule', 'install-command']) {
    assert.match(result.stdout, new RegExp(`niuma-harness ${command} \\[names\\.\\.\\.\\]`));
  }
  assert.match(result.stdout, /Doctor options:/);
  assert.match(result.stdout, /Asset install options:/);
  assert.match(result.stdout, /--dry-run/);
  assert.match(result.stdout, /current working directory/i);
  assert.match(result.stdout, /interactive terminal/i);
  assert.match(result.stdout, /--rules-out/);
  assert.match(result.stdout, /--skills/);
  assert.match(result.stdout, /named selections automatically include common/);
});

test('init --help shows --agent', () => {
  const result = run(['init', '--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /--agent/);
});
