const test = require('node:test');
const fs = require('fs');
const path = require('path');
const { assert, readJson, run, tempDir } = require('../support/helpers');

test('doctor ignores native asset drift and malformed legacy asset state', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'opencode', '--rules', 'common', '--skills', 'database-readonly']);
  assert.strictEqual(result.status, 0, result.stderr);

  fs.writeFileSync(path.join(workspace, '.opencode', 'rules', 'common', 'testing.md'), 'local rule\n');
  fs.rmSync(path.join(workspace, '.opencode', 'skills', 'database-readonly', 'SKILL.md'));
  fs.rmSync(path.join(workspace, '.opencode', 'commands', 'dev-check.md'));
  fs.writeFileSync(path.join(workspace, 'opencode.json'), '{"instructions":["local.md"]}\n');
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const legacy = readJson(manifestPath);
  legacy.schemaVersion = 4;
  legacy.rules = 'broken';
  legacy.skills = null;
  legacy.commands = {};
  legacy.artifacts = 'bad';
  legacy.openCodeInstructions = 9;
  fs.writeFileSync(manifestPath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');

  result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
});
