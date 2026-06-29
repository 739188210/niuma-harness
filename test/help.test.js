const { assert, run } = require('./helpers');

{
  const result = run(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /niuma-harness init/);
  assert.match(result.stdout, /niuma-harness doctor/);
  assert.match(result.stdout, /--rules-out/);
}

{
  const result = run(['init', '--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /--agent/);
}
