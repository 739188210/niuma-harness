const test = require('node:test');
const { assert } = require('./helpers');
const {
  AUDIT_RECORD_BEGIN,
  AUDIT_RECORD_END,
  VERIFICATION_RECORD_BEGIN,
  VERIFICATION_RECORD_END,
  parseAuditRecord,
  parseVerificationRecord,
} = require('../src/audit/records');
const { marker, passingTask, passingVerification } = require('./support/audit-evaluator-fixtures');

test('parses task and verification marker records with duplicate protection', () => {
  const task = marker(AUDIT_RECORD_BEGIN, AUDIT_RECORD_END, passingTask());
  assert.strictEqual(parseAuditRecord(task).task.id, 'task-213');
  const verification = marker(VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END, passingVerification());
  assert.strictEqual(parseVerificationRecord(verification).evidence[0].id, 'tests');
  assert.throws(() => parseAuditRecord(`${task}${task}`), /exactly one audit record block/);
});
