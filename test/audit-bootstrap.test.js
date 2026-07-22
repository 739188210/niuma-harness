const test = require('node:test');
const { assert } = require('./helpers');
const {
  BOOTSTRAP_RECORD_BEGIN,
  BOOTSTRAP_RECORD_END,
  VERIFICATION_RECORD_BEGIN,
  VERIFICATION_RECORD_END,
  parseBootstrapRecord,
  parseVerificationRecord,
} = require('../src/audit/records');
const {
  completeBootstrap,
  completeBootstrapContent,
  marker,
  passingVerification,
  workspaceFixture,
} = require('./support/audit-evaluator-fixtures');
const { evaluateBootstrap } = require('../src/audit/evaluator');

test('parses bootstrap and verification marker records with duplicate protection', () => {
  assert.strictEqual(parseBootstrapRecord(completeBootstrapContent()).status, 'complete');
  const verification = marker(VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END, passingVerification());
  assert.strictEqual(parseVerificationRecord(verification).evidence[0].id, 'tests');
  assert.throws(() => parseBootstrapRecord(`${completeBootstrapContent()}${completeBootstrapContent()}`), /exactly one bootstrap record block/);
});

test('bootstrap is PARTIAL when pending or legacy and FAIL when complete evidence is unsafe or incomplete', () => {
  const fixture = workspaceFixture();
  let result = evaluateBootstrap({ workspaceRoot: fixture.workspaceRoot, content: completeBootstrapContent({ schemaVersion: 1, status: 'pending' }) });
  assert.strictEqual(result.status, 'PARTIAL');

  result = evaluateBootstrap({ workspaceRoot: fixture.workspaceRoot, content: '# Project Context\n- Bootstrap status: complete\n' });
  assert.strictEqual(result.status, 'PARTIAL');
  assert.match(result.findings[0].reason, /legacy/i);

  const invalid = { ...completeBootstrap(), filesInspected: ['../outside'], scanScope: '' };
  result = evaluateBootstrap({ workspaceRoot: fixture.workspaceRoot, content: completeBootstrapContent(invalid).replace('npm test', '# install') });
  assert.strictEqual(result.status, 'FAIL');
  assert.ok(result.findings.some((finding) => /workspace-relative|outside|escape/i.test(finding.reason)));
  assert.ok(result.findings.some((finding) => /verification command/i.test(finding.reason)));
});

test('complete bootstrap passes only with safe existing references and substantive core sections', () => {
  const fixture = workspaceFixture();
  const result = evaluateBootstrap({ workspaceRoot: fixture.workspaceRoot, content: completeBootstrapContent() });
  assert.strictEqual(result.status, 'PASS');
  assert.deepStrictEqual(result.findings, []);
});

