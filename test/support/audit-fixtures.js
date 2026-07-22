function markedRecord(begin, end, record) {
  return [begin, '```json', JSON.stringify(record), '```', end, ''].join('\n');
}

function markedAuditRecord(record) {
  return markedRecord('<!-- niuma-audit-record:begin -->', '<!-- niuma-audit-record:end -->', record);
}

function markedVerificationRecord() {
  return markedRecord('<!-- niuma-verification-record:begin -->', '<!-- niuma-verification-record:end -->', {
    schemaVersion: 1,
    evidence: [{
      id: 'tests',
      kind: 'command',
      check: 'npm test',
      expectedSignal: 'Exit code 0',
      actualResult: 'All tests passed.',
      outcome: 'passed',
      exitCode: 0,
      remainingUnknowns: [],
    }],
  });
}

function passingAuditRecord(taskId) {
  return {
    schemaVersion: 1,
    task: { id: taskId, recordedAt: '2026-07-12T09:00:00Z', tool: 'claude-code', requestSummary: 'Audit a fixture.', declaredResult: 'complete' },
    rating: { classification: 'bugfix', tier: 'normal', rationale: 'Localized evaluator fixture.', riskFactors: [], reclassified: false },
    context: {
      projectFiles: [{ path: 'CLAUDE.md', purpose: 'Confirm the generated entry contract.' }],
      harnessDocs: [{ path: 'harness/docs/process/bugfix.md', purpose: 'Select the bugfix process.' }],
      reusedImplementations: ['src/audit/evaluator.js'],
      knownGaps: [],
      sufficiency: 'sufficient',
    },
    boundary: {
      plannedActions: [{ id: 'audit-fixture', action: 'Audit fixture.', classification: 'autonomous', scope: 'Fixture files.' }],
      performedActions: [{ id: 'audit-fixture', action: 'Audit fixture.', classification: 'autonomous', scope: 'Fixture files.' }],
      authorizationReferences: [],
      scopeChanges: [],
    },
    execution: {
      playbook: 'bugfix',
      successCriteria: [{ id: 'criteria-1', description: 'Fixture test passes.' }],
      performedSteps: ['Created fixture.'],
      skippedSteps: [],
      decisionImpact: 'The fixture exercises public output.',
      alignment: 'aligned',
    },
    verification: {
      path: `agent-work/tasks/${taskId}/verification.md`,
      criteria: [{ criterionId: 'criteria-1', evidenceIds: ['tests'] }],
      declaredConclusion: 'passed',
    },
    recovery: { applicable: false },
    outcome: {
      criteria: [{ criterionId: 'criteria-1', status: 'passed', evidenceIds: ['tests'] }],
      knownGaps: [],
      regressionRisks: [],
      reviewResult: 'accepted',
    },
    evidenceSources: [{ kind: 'self-report' }],
  };
}

module.exports = { markedAuditRecord, markedVerificationRecord, passingAuditRecord };
