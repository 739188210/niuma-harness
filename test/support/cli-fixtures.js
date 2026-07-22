const { assert, run, tempDir } = require('../helpers');

function resultOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join('\n');
}

function runCliSuccess(args, message = 'CLI command should succeed') {
  const result = run(args);
  assert.strictEqual(result.status, 0, `${message}:\n${resultOutput(result)}`);
  return result;
}

function initWorkspace(options = {}, legacyExtra = []) {
  const { agent, extra } = typeof options === 'string'
    ? { agent: options, extra: legacyExtra }
    : { agent: 'claude', extra: [], ...options };
  const workspace = tempDir();
  runCliSuccess(['init', workspace, '--agent', agent, ...extra], 'init should succeed');
  return workspace;
}

module.exports = { initWorkspace };
