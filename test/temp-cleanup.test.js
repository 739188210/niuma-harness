const test = require('node:test');
const { spawnSync } = require('child_process');
const { assert, fs, path, tempDir } = require('./helpers');

const childFixture = path.join(__dirname, 'fixtures', 'temp-cleanup-child.test.js');

function runChild(env = {}) {
  const childEnv = { ...process.env, ...env };
  delete childEnv.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, ['--test', childFixture], {
    encoding: 'utf8',
    env: childEnv,
  });
}

function readTempRoot(result) {
  const match = result.stdout.match(/TEMP_ROOT=(.+)/);
  assert.ok(match, `child output should identify its temporary root:\n${result.stdout}\n${result.stderr}`);
  return match[1].trim();
}

test('tempDir tracks a fixture root while the test is running', () => {
  const fixture = tempDir();
  assert.ok(fs.existsSync(fixture));
});

test('normal test teardown removes tracked temporary roots', () => {
  const result = runChild({ NIUMA_HARNESS_KEEP_TEST_TEMPS: '' });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(readTempRoot(result)));
});

test('NIUMA_HARNESS_KEEP_TEST_TEMPS preserves tracked temporary roots for debugging', () => {
  const result = runChild({ NIUMA_HARNESS_KEEP_TEST_TEMPS: '1' });
  assert.strictEqual(result.status, 0, result.stderr);
  const fixture = readTempRoot(result);
  assert.ok(fs.existsSync(fixture));
  fs.rmSync(fixture, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});
