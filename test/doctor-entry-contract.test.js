const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  assertFile,
  assertNoPath,
  fs,
  getCommandId,
  path,
  read,
  readJson,
  run,
  tempDir,
  updateManifest,
} = require('./helpers');

const primaryCommand = allCommandFiles[0];
const primaryCommandId = getCommandId(primaryCommand);
const primarySkill = allSkillDirs[0];

test('doctor reports the entry contract zone intact on a fresh init', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /contract intact in CLAUDE\.md/);
});

test('doctor tolerates CRLF line endings in the entry contract', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const body = read(entry).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  fs.writeFileSync(entry, body, 'utf8');
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /contract intact in CLAUDE\.md/);
});

test('doctor fails when the entry contract zone is tampered', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const body = read(entry).replace('Operating Loop', 'Operating Loop (hacked)');
  fs.writeFileSync(entry, body, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when the contract zone is tampered');
  assert.match(result.stdout, /contract zone drifted in CLAUDE\.md/);
});

test('doctor fails when the entry contract zone is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(path.join(workspace, 'CLAUDE.md'), 'my own entry\n', 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when the contract zone is missing');
  assert.match(result.stdout, /contract zone missing in CLAUDE\.md/);
});

test('doctor fails when only the entry contract begin marker remains', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(entry, read(entry).replace('<!-- niuma-harness:contract end -->', ''), 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when the end marker is missing');
  assert.match(result.stdout, /contract zone end marker missing in CLAUDE\.md/);
});

test('doctor fails when only the entry contract end marker remains', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(entry, '<!-- niuma-harness:contract end -->\n', 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when the begin marker is missing');
  assert.match(result.stdout, /contract zone begin marker missing in CLAUDE\.md/);
});

test('doctor fails when entry contract markers are out of order', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(
    entry,
    '<!-- niuma-harness:contract end -->\n<!-- niuma-harness:contract begin — do not modify -->\n',
    'utf8'
  );
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when contract markers are out of order');
  assert.match(result.stdout, /contract zone markers out of order in CLAUDE\.md/);
});

test('doctor fails when the entry contains multiple contract zones', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const body = read(entry);
  fs.writeFileSync(entry, `${body}\n${body}`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when multiple contract zones exist');
  assert.match(result.stdout, /multiple contract zones in CLAUDE\.md/);
});

