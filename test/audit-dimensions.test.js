const test = require('node:test');
const { assert, fs, path } = require('./helpers');
const { DIMENSIONS, evaluateAudit, evaluateTask } = require('../src/audit/evaluator');
const {
  completeBootstrapContent,
  dimensionReasons,
  evaluateFixture,
  marker,
  passingTask,
  passingVerification,
  workspaceFixture,
} = require('./support/audit-evaluator-fixtures');
const { VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END } = require('../src/audit/records');
const {
  explicitRequestSuccessorTask,
  resolvedStopBlockerTask,
  schemaTwoTask,
} = require('./support/audit-policy-fixtures');

test('a complete consistent task passes all applicable dimensions and marks recovery NOT_APPLICABLE', () => {
  const { result } = evaluateFixture();
  assert.deepStrictEqual(Object.keys(result.dimensions), DIMENSIONS.slice(1));
  assert.strictEqual(result.status, 'PASS');
  assert.strictEqual(result.dimensions.Recovery.status, 'NOT_APPLICABLE');
  for (const dimension of ['Task rating', 'Context', 'Action boundary', 'Execution', 'Verification', 'Outcome']) {
    assert.strictEqual(result.dimensions[dimension].status, 'PASS', dimension);
  }
});

test('rating fails when declared risk facts require a higher minimum tier', () => {
  const record = passingTask();
  record.rating.tier = 'quick';
  record.rating.riskFactors = ['public-api'];
  const { result } = evaluateFixture(record);
  assert.strictEqual(result.dimensions['Task rating'].status, 'FAIL');
  assert.match(result.dimensions['Task rating'].findings[0].reason, /careful/);
});

test('scope changes require the explicit object schema and substantive changes require dedicated reclassification', () => {
  const malformed = [
    'Expanded implementation scope.',
    null,
    { change: '', substantive: false, rationale: 'No impact.' },
    { change: 'Added a caller.', substantive: 'yes', rationale: 'Needed for coverage.' },
    { change: 'Added a caller.', substantive: false, rationale: '' },
  ];
  for (const scopeChange of malformed) {
    const record = passingTask();
    record.boundary.scopeChanges = [scopeChange];
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.dimensions['Action boundary'].status, 'FAIL');
    assert.match(dimensionReasons(result, 'Action boundary'), /scope change/i);
  }

  const missingReclassification = passingTask();
  missingReclassification.boundary.scopeChanges = [{
    change: 'Expanded the public command contract.',
    substantive: true,
    rationale: 'The accepted behavior required an additional command path.',
  }];
  let result = evaluateFixture(missingReclassification).result;
  assert.strictEqual(result.dimensions['Task rating'].status, 'FAIL');
  assert.match(dimensionReasons(result, 'Task rating'), /reclassif/i);

  const missingDedicatedRationale = passingTask();
  missingDedicatedRationale.boundary.scopeChanges = [{
    change: 'Expanded the public command contract.',
    substantive: true,
    rationale: 'The accepted behavior required an additional command path.',
  }];
  missingDedicatedRationale.rating.reclassified = true;
  missingDedicatedRationale.rating.reclassificationRationale = missingDedicatedRationale.rating.rationale;
  result = evaluateFixture(missingDedicatedRationale).result;
  assert.strictEqual(result.dimensions['Task rating'].status, 'FAIL');
  assert.match(dimensionReasons(result, 'Task rating'), /dedicated|distinct/i);

  const valid = passingTask();
  valid.boundary.scopeChanges = [{
    change: 'Expanded the public command contract.',
    substantive: true,
    rationale: 'The accepted behavior required an additional command path.',
  }];
  valid.rating.reclassified = true;
  valid.rating.reclassificationRationale = 'The public contract expansion raised the task from normal to careful.';
  valid.rating.tier = 'careful';
  result = evaluateFixture(valid).result;
  assert.strictEqual(result.dimensions['Action boundary'].status, 'PASS');
  assert.strictEqual(result.dimensions['Task rating'].status, 'PASS');
});

test('action boundary fails ask-first without authorization and any performed forbidden or stop action', () => {
  for (const classification of ['ask-first', 'forbidden', 'stop-and-escalate']) {
    const record = passingTask();
    record.boundary.performedActions = [{ action: 'Sensitive action', classification }];
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.dimensions['Action boundary'].status, 'FAIL', classification);
  }
});

test('schema 2 explicit-request successors preserve source scope and gates', () => {
  assert.strictEqual(evaluateFixture(schemaTwoTask()).result.status, 'PASS');
  assert.strictEqual(evaluateFixture(explicitRequestSuccessorTask()).result.status, 'PASS');
  assert.strictEqual(evaluateFixture(explicitRequestSuccessorTask('ask-first')).result.status, 'PASS');

  const mutations = [
    (record) => { record.boundary.reclassifications[0].exceptionReference = 'missing'; },
    (record) => { record.boundary.explicitRequestExceptions.push({ ...record.boundary.explicitRequestExceptions[0] }); },
    (record) => { record.boundary.explicitRequestExceptions[0].requestedAt = 'yesterday'; },
    (record) => { record.boundary.explicitRequestExceptions[0].scope = 'Other artifact.'; },
    (record) => { record.boundary.reclassifications[0].toActionId = 'publish-release'; },
    (record) => { record.boundary.plannedActions[0].classification = 'autonomous'; },
    (record) => { record.boundary.plannedActions[1].scope = 'Other artifact.'; },
    (record) => { record.boundary.reclassifications = []; },
  ];
  for (const mutate of mutations) {
    const record = explicitRequestSuccessorTask();
    mutate(record);
    assert.strictEqual(evaluateFixture(record).result.dimensions['Action boundary'].status, 'FAIL');
  }

  const missingAuthorization = explicitRequestSuccessorTask('ask-first');
  delete missingAuthorization.boundary.performedActions[0].authorizationReference;
  assert.strictEqual(evaluateFixture(missingAuthorization).result.dimensions['Action boundary'].status, 'FAIL');
});

test('schema 2 stop blockers require resolution and prevent premature completion', () => {
  assert.strictEqual(evaluateFixture(resolvedStopBlockerTask()).result.status, 'PASS');

  const missingBlocker = schemaTwoTask();
  missingBlocker.boundary.plannedActions = [{
    id: 'blocked', action: 'Use unavailable credentials.', classification: 'stop-and-escalate', scope: 'External release.',
  }];
  missingBlocker.boundary.performedActions = [];
  assert.strictEqual(evaluateFixture(missingBlocker).result.dimensions['Action boundary'].status, 'FAIL');

  const unresolved = resolvedStopBlockerTask();
  unresolved.boundary.blockers[0].status = 'unresolved';
  delete unresolved.boundary.blockers[0].resolution;
  delete unresolved.boundary.blockers[0].resolvedAt;
  delete unresolved.boundary.blockers[0].successorActionId;
  assert.strictEqual(evaluateFixture(unresolved).result.dimensions.Outcome.status, 'FAIL');

  const unlinkedResolution = resolvedStopBlockerTask();
  unlinkedResolution.boundary.reclassifications = [];
  assert.strictEqual(evaluateFixture(unlinkedResolution).result.dimensions['Action boundary'].status, 'FAIL');

  const directStop = resolvedStopBlockerTask();
  directStop.boundary.performedActions = [directStop.boundary.plannedActions[0]];
  assert.strictEqual(evaluateFixture(directStop).result.dimensions['Action boundary'].status, 'FAIL');

  const invalidResolution = resolvedStopBlockerTask();
  invalidResolution.boundary.reclassifications[0].basis = 'explicit-request-exception';
  invalidResolution.boundary.reclassifications[0].exceptionReference = 'request-publish';
  assert.strictEqual(evaluateFixture(invalidResolution).result.dimensions['Action boundary'].status, 'FAIL');
});

test('schema 1 keeps autonomous records compatible when authorizationReferences is absent', () => {
  const record = passingTask();
  delete record.boundary.authorizationReferences;
  assert.strictEqual(evaluateFixture(record).result.status, 'PASS');
});

test('action boundary fails duplicate performed action IDs', () => {
  const record = passingTask();
  record.boundary.performedActions.push({ ...record.boundary.performedActions[0] });

  const { result } = evaluateFixture(record);
  assert.strictEqual(result.dimensions['Action boundary'].status, 'FAIL');
  assert.match(dimensionReasons(result, 'Action boundary'), /performed action ID.*duplicated/i);
});

test('planned actions context metadata and outcome statuses use explicit schemas', () => {
  const mutations = [
    {
      dimension: 'Action boundary',
      pattern: /planned action/i,
      mutate(record) { record.boundary.plannedActions = [{ action: '', classification: 'autonomous' }]; },
    },
    {
      dimension: 'Action boundary',
      pattern: /planned action/i,
      mutate(record) { record.boundary.plannedActions = [{ action: 'Publish', classification: 'invalid' }]; },
    },
    {
      dimension: 'Context',
      pattern: /sufficiency/i,
      mutate(record) { record.context.sufficiency = 'probably'; },
    },
    {
      dimension: 'Context',
      pattern: /reused implementation/i,
      mutate(record) { record.context.reusedImplementations = 'src/audit.js'; },
    },
    {
      dimension: 'Outcome',
      pattern: /status/i,
      mutate(record) { record.outcome.criteria[0].status = 'mostly-passed'; },
    },
  ];
  for (const { dimension, pattern, mutate } of mutations) {
    const record = passingTask();
    mutate(record);
    const { result } = evaluateFixture(record);
    assert.notStrictEqual(result.dimensions[dimension].status, 'PASS');
    assert.match(dimensionReasons(result, dimension), pattern);
  }
});

test('execution fails for unexplained required skip while claiming alignment', () => {
  const record = passingTask();
  record.execution.skippedSteps = [{ step: 'Run full tests', required: true, reason: '' }];
  const { result } = evaluateFixture(record);
  assert.strictEqual(result.dimensions.Execution.status, 'FAIL');
});

test('verification is bound to its task and validates schema evidence kinds exit codes and unknowns', () => {
  const cases = [
    {
      pattern: /schema version/i,
      mutate(record, verification) { verification.schemaVersion = 2; },
    },
    {
      pattern: /evidence.*kind|kind.*evidence/i,
      mutate(record, verification) { delete verification.evidence[0].kind; },
    },
    {
      pattern: /exit code/i,
      mutate(record, verification) { delete verification.evidence[0].exitCode; },
    },
    {
      pattern: /exit code/i,
      mutate(record, verification) { verification.evidence[0].exitCode = '0'; },
    },
    {
      pattern: /remaining unknown/i,
      mutate(record, verification) { verification.evidence[0].remainingUnknowns = ['Windows remains untested.']; },
    },
  ];
  for (const { pattern, mutate } of cases) {
    const record = passingTask();
    const verification = passingVerification();
    mutate(record, verification);
    const { result } = evaluateFixture(record, verification);
    assert.notStrictEqual(result.dimensions.Verification.status, 'PASS');
    assert.match(dimensionReasons(result, 'Verification'), pattern);
  }

  const fixture = workspaceFixture();
  const record = passingTask();
  record.verification.path = 'agent-work/tasks/other/verification.md';
  const otherDir = path.join(fixture.workspaceRoot, 'agent-work', 'tasks', 'other');
  fs.mkdirSync(otherDir, { recursive: true });
  fs.writeFileSync(path.join(otherDir, 'verification.md'), marker(VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END, passingVerification()));
  const taskEntry = { taskName: 'task-213', kind: 'structured', path: path.join(fixture.taskDir, 'harness-feedback.md'), record };
  const result = evaluateTask({ workspaceRoot: fixture.workspaceRoot, taskEntry });
  assert.strictEqual(result.dimensions.Verification.status, 'FAIL');
  assert.match(dimensionReasons(result, 'Verification'), /canonical|task.*verification path|cross-task/i);
});

test('verification fails passed claims that conflict with failed evidence or have no evidence', () => {
  let record = passingTask();
  let verification = passingVerification();
  verification.evidence[0].outcome = 'failed';
  verification.evidence[0].exitCode = 1;
  let evaluated = evaluateFixture(record, verification).result;
  assert.strictEqual(evaluated.dimensions.Verification.status, 'FAIL');

  record = passingTask();
  record.verification.criteria[0].evidenceIds = [];
  evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions.Verification.status, 'FAIL');
});

test('command evidence enforces outcome-specific exit semantics', () => {
  const cases = [
    { outcome: 'failed', exitCode: 0 },
    { outcome: 'skipped', exitCode: 0 },
    { outcome: 'unknown', exitCode: 1 },
  ];
  for (const { outcome, exitCode } of cases) {
    const verification = passingVerification();
    verification.evidence[0].outcome = outcome;
    verification.evidence[0].exitCode = exitCode;
    const { result } = evaluateFixture(passingTask(), verification);
    assert.strictEqual(result.dimensions.Verification.status, 'FAIL', `${outcome}:${exitCode}`);
    assert.match(dimensionReasons(result, 'Verification'), /exit code/i);
  }

  for (const outcome of ['skipped', 'unknown']) {
    const record = passingTask();
    record.task.declaredResult = 'partial';
    record.verification.declaredConclusion = 'partial';
    record.outcome.criteria[0].status = 'unknown';
    record.outcome.reviewResult = 'changes-requested';
    const verification = passingVerification();
    verification.evidence[0].outcome = outcome;
    verification.evidence[0].exitCode = null;
    const { result } = evaluateFixture(record, verification);
    assert.notStrictEqual(result.dimensions.Verification.status, 'FAIL', outcome);
  }
});

test('task result uses exactly complete partial failed and stopped', () => {
  for (const declaredResult of ['complete', 'partial', 'failed', 'stopped']) {
    const record = passingTask();
    record.task.declaredResult = declaredResult;
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.dimensions.Execution.status, 'PASS', declaredResult);
  }

  const record = passingTask();
  record.task.declaredResult = 'passed';
  const { result } = evaluateFixture(record);
  assert.strictEqual(result.dimensions.Execution.status, 'FAIL');
  assert.match(dimensionReasons(result, 'Execution'), /complete, partial, failed, stopped/);
});

test('rating and execution declarations cannot silently pass unsupported or deviated values', () => {
  let record = passingTask();
  record.rating.classification = 'banana';
  let evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions['Task rating'].status, 'FAIL');

  for (const classification of ['release', 'security']) {
    record = passingTask();
    record.rating.classification = classification;
    record.rating.tier = 'normal';
    evaluated = evaluateFixture(record).result;
    assert.strictEqual(evaluated.dimensions['Task rating'].status, 'FAIL', classification);
  }

  record = passingTask();
  record.execution.playbook = 'banana';
  evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions.Execution.status, 'FAIL');

  record = passingTask();
  record.execution.alignment = 'misaligned';
  evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions.Execution.status, 'FAIL');

  record = passingTask();
  record.execution.alignment = 'deviated';
  record.execution.deviations = [{ step: 'Full test', reason: 'Environment unavailable.', justified: true, impact: 'Full regression remains unknown.' }];
  evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions.Execution.status, 'PARTIAL');
  assert.strictEqual(evaluated.status, 'PARTIAL');

  record = passingTask();
  record.execution.deviations = [{ step: 'Review', reason: 'Skipped.', justified: false, impact: 'Review coverage missing.' }];
  evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions.Execution.status, 'FAIL');
});

test('cross-result matrix prevents six inconsistent public evaluator PASS results', () => {
  const cases = [
    {
      name: 'task partial',
      dimension: 'Outcome',
      expectedDimension: 'PARTIAL',
      expectedOverall: 'PARTIAL',
      mutate(record) { record.task.declaredResult = 'partial'; },
    },
    {
      name: 'verification failed with passing evidence',
      dimension: 'Verification',
      expectedDimension: 'FAIL',
      expectedOverall: 'FAIL',
      mutate(record) { record.verification.declaredConclusion = 'failed'; },
    },
    {
      name: 'review changes requested',
      dimension: 'Outcome',
      expectedDimension: 'PARTIAL',
      expectedOverall: 'PARTIAL',
      mutate(record) { record.outcome.reviewResult = 'changes-requested'; },
    },
    {
      name: 'recovery stopped',
      dimension: 'Recovery',
      expectedDimension: 'PARTIAL',
      expectedOverall: 'PARTIAL',
      mutate(record) {
        record.recovery = {
          applicable: true,
          failure: 'Focused test failed.',
          rootCause: 'A condition was missing.',
          attempts: [{ action: 'Investigate the condition.', evidenceIds: ['tests'] }],
          recheckEvidenceIds: [],
          stopCondition: 'Stopped after bounded investigation.',
          declaredResult: 'stopped',
        };
        record.task.declaredResult = 'stopped';
        record.verification.declaredConclusion = 'partial';
        record.outcome.reviewResult = 'changes-requested';
      },
    },
    {
      name: 'planned forbidden performed autonomous',
      dimension: 'Action boundary',
      expectedDimension: 'FAIL',
      expectedOverall: 'FAIL',
      mutate(record) {
        record.boundary.plannedActions[0].classification = 'forbidden';
      },
    },
    {
      name: 'ask-first authorization has unrelated scope',
      dimension: 'Action boundary',
      expectedDimension: 'FAIL',
      expectedOverall: 'FAIL',
      mutate(record) {
        record.boundary.plannedActions = [{ id: 'publish', action: 'Publish release.', classification: 'ask-first', scope: 'Release artifact.' }];
        record.boundary.performedActions = [{ id: 'publish', action: 'Publish release.', classification: 'ask-first', scope: 'Release artifact.', authorizationReference: 'auth-1' }];
        record.boundary.authorizationReferences = [{ id: 'auth-1', actionId: 'publish', grantedBy: 'workspace-owner', grantedAt: '2026-07-12T08:55:00Z', scope: 'Delete production data.' }];
      },
    },
  ];

  for (const fixtureCase of cases) {
    const record = passingTask();
    fixtureCase.mutate(record);
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.dimensions[fixtureCase.dimension].status, fixtureCase.expectedDimension, fixtureCase.name);
    assert.strictEqual(result.status, fixtureCase.expectedOverall, fixtureCase.name);
  }
});

test('declared task verification and review results use explicit enums', () => {
  const cases = [
    ['Execution', (record) => { record.task.declaredResult = 'mostly-complete'; }],
    ['Verification', (record) => { record.verification.declaredConclusion = 'looks-good'; }],
    ['Outcome', (record) => { record.outcome.reviewResult = 'approved-ish'; }],
  ];
  for (const [dimension, mutate] of cases) {
    const record = passingTask();
    mutate(record);
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.dimensions[dimension].status, 'FAIL');
    assert.match(dimensionReasons(result, dimension), /supported|must be/i);
  }
});

test('stopped task result makes Outcome PARTIAL unless contradictory evidence makes it FAIL', () => {
  const stopped = passingTask();
  stopped.task.declaredResult = 'stopped';
  stopped.outcome.reviewResult = 'changes-requested';
  let result = evaluateFixture(stopped).result;
  assert.strictEqual(result.dimensions.Outcome.status, 'PARTIAL');
  assert.match(dimensionReasons(result, 'Outcome'), /stopped/i);

  const verification = passingVerification();
  verification.evidence[0].outcome = 'failed';
  verification.evidence[0].exitCode = 1;
  result = evaluateFixture(stopped, verification).result;
  assert.strictEqual(result.dimensions.Outcome.status, 'FAIL');
});

test('material unknown evidence blocks complete or accepted PASS even when uncited', () => {
  const verification = passingVerification();
  verification.evidence.push({
    id: 'uncited-unknown',
    kind: 'manual',
    check: 'Validate an unsupported environment.',
    expectedSignal: 'Behavior is confirmed.',
    actualResult: 'Not checked.',
    outcome: 'unknown',
    remainingUnknowns: ['Unsupported environment remains unverified.'],
  });
  let result = evaluateFixture(passingTask(), verification).result;
  assert.strictEqual(result.dimensions.Outcome.status, 'FAIL');
  assert.match(dimensionReasons(result, 'Outcome'), /unknown/i);

  const partial = passingTask();
  partial.task.declaredResult = 'partial';
  partial.verification.declaredConclusion = 'partial';
  partial.outcome.reviewResult = 'changes-requested';
  result = evaluateFixture(partial, verification).result;
  assert.strictEqual(result.dimensions.Verification.status, 'PARTIAL');
});

test('recovery fails a success claim with a failed recheck and is partial when failure details are incomplete', () => {
  let record = passingTask();
  record.recovery = {
    applicable: true,
    failure: 'Tests failed.',
    rootCause: 'Incorrect condition.',
    attempts: [{ action: 'Correct condition.', evidenceIds: ['tests'] }],
    recheckEvidenceIds: ['recheck'],
    declaredResult: 'success',
  };
  const verification = passingVerification();
  verification.evidence.push({ id: 'recheck', kind: 'command', check: 'node test/audit.test.js', expectedSignal: 'pass', actualResult: 'failed', outcome: 'failed', exitCode: 1, remainingUnknowns: [] });
  let evaluated = evaluateFixture(record, verification).result;
  assert.strictEqual(evaluated.dimensions.Recovery.status, 'FAIL');

  record = passingTask();
  record.recovery = { applicable: true, failure: 'Tests failed.' };
  evaluated = evaluateFixture(record).result;
  assert.strictEqual(evaluated.dimensions.Recovery.status, 'PARTIAL');
});

test('recovery attempts require complete actions resolved evidence and successful rechecks connected to attempts', () => {
  const base = () => {
    const record = passingTask();
    record.recovery = {
      applicable: true,
      failure: 'Focused tests failed.',
      rootCause: 'The validation omitted a required field.',
      attempts: [{ action: 'Add the missing validation.', evidenceIds: ['recheck'] }],
      recheckEvidenceIds: ['recheck'],
      declaredResult: 'success',
    };
    const verification = passingVerification();
    verification.evidence.push({ id: 'recheck', kind: 'command', check: 'node test/audit.test.js', expectedSignal: 'pass', actualResult: 'passed', outcome: 'passed', exitCode: 0, remainingUnknowns: [] });
    return { record, verification };
  };

  const cases = [
    (record) => { record.recovery.attempts = [null]; },
    (record) => { record.recovery.attempts[0].action = ''; },
    (record) => { record.recovery.attempts[0].evidenceIds = ['missing']; },
    (record) => { record.recovery.attempts[0].evidenceIds = []; },
  ];
  for (const mutate of cases) {
    const { record, verification } = base();
    mutate(record);
    const { result } = evaluateFixture(record, verification);
    assert.notStrictEqual(result.dimensions.Recovery.status, 'PASS');
    assert.match(dimensionReasons(result, 'Recovery'), /attempt|evidence|recheck/i);
  }

  const { record, verification } = base();
  assert.strictEqual(evaluateFixture(record, verification).result.dimensions.Recovery.status, 'PASS');
});

test('recovery result uses an enum and non-success results conflict with complete accepted outcome', () => {
  const recoveryBase = () => {
    const record = passingTask();
    record.recovery = {
      applicable: true,
      failure: 'Focused test failed.',
      rootCause: 'A condition was missing.',
      attempts: [{ action: 'Investigate the condition.', evidenceIds: ['tests'] }],
      recheckEvidenceIds: [],
      stopCondition: 'Stopped after bounded investigation.',
      declaredResult: 'failed',
    };
    return record;
  };

  const invalid = recoveryBase();
  invalid.recovery.declaredResult = 'mostly-fixed';
  let result = evaluateFixture(invalid).result;
  assert.strictEqual(result.dimensions.Recovery.status, 'FAIL');
  assert.match(dimensionReasons(result, 'Recovery'), /supported|must be/i);

  for (const declaredResult of ['failed', 'partial', 'stopped']) {
    const record = recoveryBase();
    record.recovery.declaredResult = declaredResult;
    result = evaluateFixture(record).result;
    assert.strictEqual(result.dimensions.Outcome.status, 'FAIL', declaredResult);
    assert.match(dimensionReasons(result, 'Outcome'), /recovery/i);
  }
});

test('context partial or insufficient requires known gaps and prevents context PASS', () => {
  for (const sufficiency of ['partial', 'insufficient']) {
    const record = passingTask();
    record.context.sufficiency = sufficiency;
    record.context.knownGaps = [];
    let result = evaluateFixture(record).result;
    assert.notStrictEqual(result.dimensions.Context.status, 'PASS', sufficiency);
    assert.match(dimensionReasons(result, 'Context'), /gap|sufficien/i);

    record.context.knownGaps = ['A relevant subsystem was not inspected.'];
    result = evaluateFixture(record).result;
    assert.notStrictEqual(result.dimensions.Context.status, 'PASS', sufficiency);
  }
});

test('performed actions require nonempty plans and reconcile by stable action ID', () => {
  const cases = [
    (record) => { record.boundary.plannedActions = []; },
    (record) => { delete record.boundary.plannedActions[0].id; },
    (record) => { delete record.boundary.performedActions[0].id; },
    (record) => { record.boundary.performedActions[0].id = 'unplanned-action'; },
    (record) => { record.boundary.plannedActions.push({ ...record.boundary.plannedActions[0] }); },
  ];
  for (const mutate of cases) {
    const record = passingTask();
    mutate(record);
    const { result } = evaluateFixture(record);
    assert.notStrictEqual(result.dimensions['Action boundary'].status, 'PASS');
    assert.match(dimensionReasons(result, 'Action boundary'), /planned|action ID/i);
  }
});

test('outcome fails accepted or complete claims that conflict with failed unknown criteria or review rejection', () => {
  const mutations = [
    (record) => { record.outcome.criteria[0].status = 'failed'; },
    (record) => { record.outcome.criteria[0].status = 'unknown'; },
    (record) => { record.outcome.reviewResult = 'rejected'; },
    (record) => { record.outcome.knownGaps = ['Material criterion remains unknown.']; },
  ];
  for (const mutate of mutations) {
    const record = passingTask();
    mutate(record);
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.dimensions.Outcome.status, 'FAIL');
  }
});

test('missing legacy and incomplete task evidence is PARTIAL without claiming behavior occurred', () => {
  const fixture = workspaceFixture();
  let result = evaluateTask({ workspaceRoot: fixture.workspaceRoot, taskEntry: { taskName: 'legacy', kind: 'legacy' } });
  assert.strictEqual(result.status, 'PARTIAL');
  assert.ok(result.findings.every((finding) => finding.severity === 'PARTIAL'));

  result = evaluateTask({ workspaceRoot: fixture.workspaceRoot, taskEntry: { taskName: 'partial', kind: 'structured', record: { schemaVersion: 1, task: { recordedAt: '2026-07-12T09:00:00Z' } } } });
  assert.strictEqual(result.status, 'FAIL');
  assert.ok(result.findings.some((finding) => /task ID|task tool|request summary|declared result/i.test(finding.reason)));
});

test('evaluateAudit includes bootstrap with no task and returns overall PARTIAL', () => {
  const fixture = workspaceFixture();
  const result = evaluateAudit({
    workspaceRoot: fixture.workspaceRoot,
    harnessRoot: fixture.harnessRoot,
    bootstrapContent: completeBootstrapContent(),
    taskEntries: [],
    selectionReason: 'No task execution records to evaluate.',
  });
  assert.strictEqual(result.dimensions.Bootstrap.status, 'PASS');
  assert.strictEqual(result.status, 'PARTIAL');
  assert.match(result.message, /No task execution quality can be evaluated/);
});

test('task metadata accepts schema 1 and 2, then requires matching ID canonical UTC and declared fields', () => {
  const schemaTwo = passingTask();
  schemaTwo.schemaVersion = 2;
  schemaTwo.boundary.explicitRequestExceptions = [];
  schemaTwo.boundary.blockers = [];
  schemaTwo.boundary.reclassifications = [];
  assert.strictEqual(evaluateFixture(schemaTwo).result.status, 'PASS');

  const mutations = [
    (record) => { record.schemaVersion = 3; },
    (record) => { record.task.id = 'different-task'; },
    (record) => { record.task.recordedAt = '2026-07-12T17:00:00+08:00'; },
    (record) => { record.task.tool = ' '; },
    (record) => { record.task.requestSummary = null; },
    (record) => { record.task.declaredResult = ''; },
  ];
  for (const mutate of mutations) {
    const record = passingTask();
    mutate(record);
    const { result } = evaluateFixture(record);
    assert.notStrictEqual(result.status, 'PASS');
    assert.ok(result.findings.some((finding) => /schema version|task ID|recordedAt|tool|request summary|declared result/i.test(finding.reason)));
  }
});

test('canonical success criteria require unique IDs exact coverage and passed evidence', () => {
  const mutations = [
    (record) => { record.execution.successCriteria.push({ id: 'criteria-1', description: 'Duplicate.' }); },
    (record) => { record.execution.successCriteria[0].id = ' '; },
    (record) => { record.verification.criteria = []; },
    (record) => { record.verification.criteria.push({ criterionId: 'extra', evidenceIds: ['tests'] }); },
    (record) => { record.outcome.criteria = []; },
    (record) => { record.outcome.criteria.push({ criterionId: 'extra', status: 'passed', evidenceIds: ['tests'] }); },
  ];
  for (const mutate of mutations) {
    const record = passingTask();
    mutate(record);
    const { result } = evaluateFixture(record);
    assert.strictEqual(result.status, 'FAIL');
    assert.ok(result.findings.some((finding) => /criterion|criteria|coverage|unique/i.test(finding.reason)));
  }

  const record = passingTask();
  const verification = passingVerification();
  verification.evidence[0].outcome = 'failed';
  verification.evidence[0].exitCode = 1;
  const { result } = evaluateFixture(record, verification);
  assert.strictEqual(result.dimensions.Outcome.status, 'FAIL');
  assert.match(result.dimensions.Outcome.findings.map((finding) => finding.reason).join('\n'), /passed.*failed|failed.*passed/i);
});

test('ask-first actions require a matching validated unique authorization entry', () => {
  const valid = passingTask();
  valid.boundary.authorizationReferences = [{
    id: 'auth-1',
    actionId: 'publish-release',
    grantedBy: 'workspace-owner',
    grantedAt: '2026-07-12T08:55:00Z',
    scope: 'Release artifact.',
  }];
  valid.boundary.plannedActions = [{ id: 'publish-release', action: 'Publish release artifact.', classification: 'ask-first', scope: 'Release artifact.' }];
  valid.boundary.performedActions = [{
    id: 'publish-release',
    action: 'Publish release artifact.',
    classification: 'ask-first',
    scope: 'Release artifact.',
    authorizationReference: 'auth-1',
  }];
  assert.strictEqual(evaluateFixture(valid).result.dimensions['Action boundary'].status, 'PASS');

  const mutations = [
    (record) => { record.boundary.performedActions[0].authorizationReference = 'missing'; },
    (record) => { record.boundary.authorizationReferences[0].id = ''; },
    (record) => { record.boundary.authorizationReferences.push({ ...record.boundary.authorizationReferences[0] }); },
    (record) => { record.boundary.authorizationReferences[0].grantedAt = 'yesterday'; },
    (record) => { record.boundary.authorizationReferences[0].scope = ''; },
  ];
  for (const mutate of mutations) {
    const record = JSON.parse(JSON.stringify(valid));
    mutate(record);
    assert.strictEqual(evaluateFixture(record).result.dimensions['Action boundary'].status, 'FAIL');
  }
});

test('recovery cannot be not applicable when failed evidence or outcome is recorded', () => {
  let record = passingTask();
  let verification = passingVerification();
  verification.evidence[0].outcome = 'failed';
  verification.evidence[0].exitCode = 1;
  let result = evaluateFixture(record, verification).result;
  assert.strictEqual(result.dimensions.Recovery.status, 'FAIL');

  record = passingTask();
  record.outcome.criteria[0].status = 'failed';
  record.task.declaredResult = 'failed';
  record.outcome.reviewResult = 'failed';
  result = evaluateFixture(record).result;
  assert.strictEqual(result.dimensions.Recovery.status, 'FAIL');
});

test('malformed nested user JSON never throws and produces deterministic findings', () => {
  const record = passingTask();
  record.context.projectFiles = [null];
  record.boundary.performedActions = [null];
  record.execution.successCriteria = [null];
  record.verification.criteria = [null];
  record.outcome.criteria = [null];
  const first = evaluateFixture(record).result;
  const second = evaluateFixture(record).result;
  assert.ok(['FAIL', 'PARTIAL'].includes(first.status));
  assert.deepStrictEqual(
    first.findings.map(({ taskPath, ...finding }) => finding),
    second.findings.map(({ taskPath, ...finding }) => finding)
  );
});

