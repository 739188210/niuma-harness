const test = require('node:test');
const assert = require('assert');
const {
  digestBytes,
  findArtifactRecord,
  mergeArtifactRecords,
  validateArtifactRecords,
} = require('../src/artifact-ledger');

function record(target, digest = digestBytes(Buffer.from(target))) {
  return {
    kind: 'command',
    source: 'commands/example.md',
    target,
    digest,
  };
}

function ruleRecord(target, digest = digestBytes(Buffer.from(target))) {
  return {
    kind: 'rule',
    source: 'rules/common/testing.md',
    target,
    digest,
  };
}

test('artifact ledger hashes exact bytes with sha256', () => {
  assert.strictEqual(
    digestBytes(Buffer.from('hello\n', 'utf8')),
    'sha256:5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03'
  );
  assert.notStrictEqual(digestBytes(Buffer.from('hello\n')), digestBytes(Buffer.from('hello\r\n')));
});

test('artifact ledger validates command and rule records with deterministic mixed sorting', () => {
  const records = validateArtifactRecords([
    ruleRecord('harness/docs/rules/common/testing.md'),
    record('.opencode/commands/example.md'),
    record('.claude/commands/example.md'),
    ruleRecord('harness/docs/rules/common/security.md'),
  ]);
  assert.deepStrictEqual(records.map((item) => item.target), [
    '.claude/commands/example.md',
    '.opencode/commands/example.md',
    'harness/docs/rules/common/security.md',
    'harness/docs/rules/common/testing.md',
  ]);
});

test('artifact ledger rejects malformed records and duplicate targets', () => {
  for (const invalid of [
    null,
    {},
    [record('../outside.md')],
    [record('/absolute.md')],
    [record('bad\\path.md')],
    [record('./relative.md')],
    [record('path//empty.md')],
    [{ ...record('valid.md'), digest: 'sha256:ABC' }],
    [{ ...record('valid.md'), kind: '' }],
    [{ ...record('valid.md'), kind: 'unknown' }],
    [{ ...record('valid.md'), source: '' }],
    [record('duplicate.md'), record('duplicate.md')],
    [record('duplicate.md'), ruleRecord('duplicate.md')],
  ]) {
    assert.throws(() => validateArtifactRecords(invalid));
  }
});

test('artifact ledger finds records by kind and target', () => {
  const records = validateArtifactRecords([record('.claude/commands/example.md')]);
  assert.strictEqual(
    findArtifactRecord(records, 'command', '.claude/commands/example.md'),
    records[0]
  );
  assert.strictEqual(findArtifactRecord(records, 'command', '.claude/commands/missing.md'), null);
});

test('artifact ledger merges planned records and retains other owned artifacts', () => {
  const retained = record('.opencode/commands/example.md');
  const retainedRule = ruleRecord('harness/docs/rules/common/testing.md');
  const old = record('.claude/commands/example.md', digestBytes(Buffer.from('old')));
  const refreshed = record('.claude/commands/example.md', digestBytes(Buffer.from('new')));
  const merged = mergeArtifactRecords([old, retained, retainedRule], [refreshed]);
  assert.deepStrictEqual(merged, [refreshed, retained, retainedRule]);
});
