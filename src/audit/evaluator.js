const fs = require('fs');
const path = require('path');
const { safeResolveInside } = require('../fs-safe');
const { parseBootstrapRecord, parseVerificationRecord } = require('./records');

const DIMENSIONS = [
  'Bootstrap',
  'Task rating',
  'Context',
  'Action boundary',
  'Execution',
  'Verification',
  'Recovery',
  'Outcome',
];
const STATUS_RANK = { NOT_APPLICABLE: 0, PASS: 0, PARTIAL: 1, FAIL: 2 };
const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const CAREFUL_RISKS = /security|user[- ]?data|permission|public[- ]?api|database|dependency|release|destructive|broad[- ]?shared|high[- ]?cost|auth|payment|crypto|deploy/i;
const TASK_CLASSIFICATIONS = ['question', 'small-edit', 'bugfix', 'feature', 'refactor', 'review', 'release', 'security', 'documentation', 'verification'];
const CAREFUL_CLASSIFICATIONS = new Set(['release', 'security']);
const PLAYBOOKS = ['none', 'bugfix', 'feature', 'refactor', 'review', 'release'];
const TASK_RESULTS = ['complete', 'partial', 'failed', 'stopped'];
const VERIFICATION_CONCLUSIONS = ['passed', 'partial', 'failed', 'skipped', 'unknown'];
const REVIEW_RESULTS = ['accepted', 'changes-requested', 'rejected', 'failed'];
const RECOVERY_RESULTS = ['success', 'partial', 'failed', 'stopped'];
const CROSS_RESULT_MATRIX = {
  task: {
    complete: null,
    partial: ['Outcome', 'PARTIAL'],
    failed: ['Outcome', 'FAIL'],
    stopped: ['Outcome', 'PARTIAL'],
  },
  verification: {
    passed: null,
    partial: ['Verification', 'PARTIAL'],
    failed: ['Verification', 'FAIL'],
    skipped: ['Verification', 'PARTIAL'],
    unknown: ['Verification', 'PARTIAL'],
  },
  review: {
    accepted: null,
    'changes-requested': ['Outcome', 'PARTIAL'],
    rejected: ['Outcome', 'FAIL'],
    failed: ['Outcome', 'FAIL'],
  },
  recovery: {
    success: null,
    partial: ['Recovery', 'PARTIAL'],
    failed: ['Recovery', 'FAIL'],
    stopped: ['Recovery', 'PARTIAL'],
  },
};

function evaluateAudit({ workspaceRoot, harnessRoot, bootstrapContent, taskEntries = [], selectionReason, workDirectory = 'agent-work' }) {
  const bootstrap = evaluateBootstrap({ workspaceRoot, content: bootstrapContent });
  const dimensions = { Bootstrap: bootstrap };
  const findings = bootstrap.findings.slice();
  const taskResults = taskEntries.map((taskEntry) => evaluateTask({ workspaceRoot, taskEntry, workDirectory }));

  if (taskResults.length === 1) {
    Object.assign(dimensions, taskResults[0].dimensions);
  } else if (taskResults.length > 1) {
    for (const name of DIMENSIONS.slice(1)) {
      dimensions[name] = aggregateDimension(name, taskResults.map((result) => result.dimensions[name]));
    }
  } else {
    for (const name of DIMENSIONS.slice(1)) dimensions[name] = dimension(name, 'PARTIAL', []);
  }
  for (const result of taskResults) findings.push(...result.findings);

  if (taskEntries.length === 0) {
    findings.push(finding('Outcome', 'PARTIAL', 'Task execution quality is evaluable.', selectionReason || 'No task record was selected.', 'No task execution quality can be evaluated.', 'Create or explicitly select a structured task record.'));
  }

  const status = aggregateStatus(Object.values(dimensions).map((entry) => entry.status).concat(
    taskEntries.length === 0 ? ['PARTIAL'] : [],
    selectionReason ? ['PARTIAL'] : []
  ));
  return {
    status,
    workspaceRoot,
    harnessRoot,
    selectedTasks: taskEntries.map((entry) => ({ taskName: entry.taskName, recordedAt: get(entry, 'record.task.recordedAt') || null })),
    dimensions,
    findings: stableFindings(findings),
    message: taskEntries.length === 0 ? 'No task execution quality can be evaluated.' : null,
    selectionReason,
  };
}

function evaluateBootstrap({ workspaceRoot, content }) {
  let record;
  try {
    record = parseBootstrapRecord(content);
  } catch (error) {
    if (/missing bootstrap record markers/u.test(error.message)) {
      return withFindings('Bootstrap', [finding('Bootstrap', 'PARTIAL', 'Bootstrap is structurally recorded.', 'Legacy Markdown metadata only.', 'Legacy bootstrap evidence has no schema 1 marker record.', 'Add a schema 1 bootstrap record without inventing prior evidence.')]);
    }
    return withFindings('Bootstrap', [finding('Bootstrap', 'FAIL', 'Bootstrap record is parseable.', error.message, 'The structured bootstrap record is invalid.', 'Keep exactly one valid marker-delimited JSON object.')]);
  }

  const findings = [];
  if (record.schemaVersion !== 1) partial(findings, 'Bootstrap', 'Bootstrap uses schema version 1.', String(record.schemaVersion), 'Bootstrap schema is missing or unsupported.');
  if (!['pending', 'partial', 'complete'].includes(record.status)) fail(findings, 'Bootstrap', 'Bootstrap status is valid.', String(record.status), 'Bootstrap status must be pending, partial, or complete.');
  if (record.status === 'pending') partial(findings, 'Bootstrap', 'Bootstrap evidence is complete.', 'status=pending', 'Bootstrap has not been completed.');

  if (record.status === 'partial' || record.status === 'complete') {
    requireUtc(findings, 'Bootstrap', record.recordedAt, 'bootstrap recordedAt', record.status === 'complete' ? 'FAIL' : 'PARTIAL');
    requireText(findings, 'Bootstrap', record.scanScope, 'scan scope', record.status === 'complete' ? 'FAIL' : 'PARTIAL');
    if (!Array.isArray(record.filesInspected) || record.filesInspected.length === 0) {
      addBySeverity(findings, record.status === 'complete' ? 'FAIL' : 'PARTIAL', 'Bootstrap', 'Inspected paths are recorded.', JSON.stringify(record.filesInspected), 'No inspected paths are recorded.');
    } else {
      for (const reference of record.filesInspected) validateWorkspaceReference(findings, workspaceRoot, reference, 'Bootstrap', 'inspected path', record.status === 'complete' ? 'FAIL' : 'PARTIAL');
    }
  }
  if (record.status === 'partial' && (!Array.isArray(record.knownGaps) || record.knownGaps.length === 0)) {
    partial(findings, 'Bootstrap', 'Partial bootstrap records known gaps.', JSON.stringify(record.knownGaps), 'Partial bootstrap has no explicit gap.');
  }
  if (record.status === 'complete') {
    for (const heading of ['Project summary', 'Technology stack', 'Code map']) {
      const section = markdownSection(content, heading);
      if (!isSubstantive(section)) fail(findings, 'Bootstrap', `${heading} is substantive.`, section || '(empty)', `${heading} is missing or placeholder-only.`);
    }
    const commands = markdownSection(content, 'Build and verification commands');
    if (!hasVerificationCommand(commands)) fail(findings, 'Bootstrap', 'At least one verification command is recorded.', commands || '(empty)', 'Complete bootstrap has no explicit verification command.');
  }
  return withFindings('Bootstrap', findings);
}

function evaluateTask({ workspaceRoot, taskEntry, workDirectory = 'agent-work' }) {
  if (!taskEntry || taskEntry.kind !== 'structured') {
    const invalid = taskEntry && taskEntry.kind === 'invalid';
    const missing = taskEntry && taskEntry.kind === 'missing';
    const reason = invalid || missing ? taskEntry.error : 'Legacy Markdown-only task record.';
    const consequence = invalid
      ? 'The task record is invalid.'
      : missing
        ? 'The task execution record is missing.'
        : 'Legacy evidence is incomplete.';
    const findings = DIMENSIONS.slice(1).map((name) => finding(name, invalid ? 'FAIL' : 'PARTIAL', 'Structured task evidence is available.', reason, consequence, 'Provide one schema 1 marker record.'));
    return taskEvaluation(findings, false, taskEntry);
  }

  const record = taskEntry.record || {};
  const findings = [];
  try {
    evaluateTaskMetadata(record, taskEntry, findings);
    const boundaryFacts = evaluateBoundary(record.boundary, findings);
    evaluateRating(record.rating, boundaryFacts, findings);
    evaluateContext(workspaceRoot, record.context, findings);
    const criterionIds = evaluateExecution(record.execution, findings);
    const evidence = evaluateVerification(workspaceRoot, workDirectory, taskEntry, record.verification, criterionIds, findings);
    evaluateRecovery(record.recovery, evidence, record.outcome, record.task, findings);
    evaluateOutcome(record.task, record.outcome, record.recovery, criterionIds, evidence, findings);
    evaluateCrossResultMatrix(record, findings);
    evaluateEvidenceSources(record.evidenceSources, findings);
  } catch (error) {
    fail(findings, 'Execution', 'Malformed nested task data is handled safely.', error.message, 'The task record contains malformed nested data that could not be evaluated.');
  }

  for (const name of DIMENSIONS.slice(1)) {
    if (!hasDimensionFinding(findings, name) && !hasDimensionData(record, name)) {
      partial(findings, name, `${name} evidence is recorded.`, 'Missing section.', `${name} evidence is incomplete; self-report cannot prove actual reads or execution.`);
    }
  }
  return taskEvaluation(findings, record.recovery && record.recovery.applicable === false, taskEntry);
}

function evaluateTaskMetadata(record, taskEntry, findings) {
  if (record.schemaVersion !== 1) fail(findings, 'Execution', 'Task record uses schema version 1.', String(record.schemaVersion), 'Task schema version must be 1.');
  const task = record.task;
  if (!isObject(task)) {
    fail(findings, 'Execution', 'Task metadata is recorded.', String(task), 'Task metadata is missing or invalid.');
    return;
  }
  if (!nonEmpty(task.id) || task.id !== taskEntry.taskName) fail(findings, 'Execution', 'Task ID matches its directory.', String(task.id), `Task ID must match task directory ${taskEntry.taskName}.`);
  requireUtc(findings, 'Execution', task.recordedAt, 'task recordedAt', 'FAIL');
  requireText(findings, 'Execution', task.tool, 'task tool', 'FAIL');
  requireText(findings, 'Execution', task.requestSummary, 'task request summary', 'FAIL');
  validateEnum(findings, 'Execution', task.declaredResult, TASK_RESULTS, 'task declared result');
}

function evaluateRating(rating, boundaryFacts, findings) {
  if (!isObject(rating)) return;
  if (!['quick', 'normal', 'careful'].includes(rating.tier)) partial(findings, 'Task rating', 'A valid tier is declared.', String(rating.tier), 'Tier is missing or invalid.');
  if (!TASK_CLASSIFICATIONS.includes(rating.classification)) fail(findings, 'Task rating', 'Task classification uses the supported schema.', String(rating.classification), `Task classification must be one of: ${TASK_CLASSIFICATIONS.join(', ')}.`);
  requireText(findings, 'Task rating', rating.rationale, 'rating rationale');
  if (!Array.isArray(rating.riskFactors)) partial(findings, 'Task rating', 'Risk factors are recorded.', String(rating.riskFactors), 'Risk factors must be an array, including an empty array when none are declared.');
  const riskText = Array.isArray(rating.riskFactors) ? rating.riskFactors.join(' ') : '';
  if ((CAREFUL_CLASSIFICATIONS.has(rating.classification) || CAREFUL_RISKS.test(riskText)) && rating.tier !== 'careful') fail(findings, 'Task rating', 'Declared task facts satisfy tier minima.', `classification=${rating.classification}; tier=${rating.tier}; risks=${riskText}`, 'Release, security, or declared careful risk factors require the careful tier.');
  if (boundaryFacts.substantiveScopeChange) {
    if (rating.reclassified !== true) {
      fail(findings, 'Task rating', 'Substantive scope changes trigger reclassification.', 'substantive scope change recorded; reclassified is not true', 'A substantive scope change was recorded without task reclassification.');
    } else if (!nonEmpty(rating.reclassificationRationale)) {
      fail(findings, 'Task rating', 'Reclassification has a dedicated rationale.', String(rating.reclassificationRationale), 'A substantive scope change requires a non-empty reclassification rationale.');
    } else if (rating.reclassificationRationale.trim() === String(rating.rationale || '').trim()) {
      fail(findings, 'Task rating', 'Reclassification rationale is distinct from the initial rating rationale.', rating.reclassificationRationale, 'The reclassification rationale must be dedicated and distinct from the initial rating rationale.');
    }
  }
}

function evaluateContext(workspaceRoot, context, findings) {
  if (!isObject(context)) return;
  for (const [field, label] of [['projectFiles', 'project file'], ['harnessDocs', 'Harness doc']]) {
    if (!Array.isArray(context[field]) || context[field].length === 0) {
      partial(findings, 'Context', `${label} references are recorded.`, JSON.stringify(context[field]), `No ${label} references are recorded.`);
      continue;
    }
    for (const entry of context[field]) {
      const reference = typeof entry === 'string' ? entry : entry && entry.path;
      validateWorkspaceReference(findings, workspaceRoot, reference, 'Context', label, 'FAIL');
      if (!isObject(entry) || !nonEmpty(entry.purpose)) partial(findings, 'Context', `${label} purpose is recorded.`, JSON.stringify(entry), `${label} reference has no stated purpose.`);
    }
  }
  if (!Array.isArray(context.reusedImplementations) || context.reusedImplementations.some((entry) => !nonEmpty(entry))) partial(findings, 'Context', 'Reused implementations are recorded as non-empty strings.', JSON.stringify(context.reusedImplementations), 'Reused implementations must be an array of non-empty strings.');
  if (!Array.isArray(context.knownGaps) || context.knownGaps.some((gap) => !nonEmpty(gap))) partial(findings, 'Context', 'Known context gaps are recorded as non-empty strings.', JSON.stringify(context.knownGaps), 'Known gaps must be an array of non-empty strings.');
  if (!['sufficient', 'partial', 'insufficient'].includes(context.sufficiency)) {
    partial(findings, 'Context', 'Context sufficiency uses a supported value.', String(context.sufficiency), 'Context sufficiency must be sufficient, partial, or insufficient.');
  } else if (context.sufficiency !== 'sufficient') {
    partial(findings, 'Context', 'Context is sufficient for the task.', `sufficiency=${context.sufficiency}`, 'Partial or insufficient context cannot pass the Context dimension.');
    if (!Array.isArray(context.knownGaps) || context.knownGaps.length === 0) fail(findings, 'Context', 'Limited context records known gaps.', JSON.stringify(context.knownGaps), `${context.sufficiency} context requires at least one known gap.`);
  }
}

function evaluateBoundary(boundary, findings) {
  const facts = { substantiveScopeChange: false };
  if (!isObject(boundary)) return facts;
  const plannedActions = Array.isArray(boundary.plannedActions) ? boundary.plannedActions : [];
  if (!Array.isArray(boundary.plannedActions)) {
    partial(findings, 'Action boundary', 'Planned actions are classified.', String(boundary.plannedActions), 'Planned action classifications are missing.');
  } else {
    const seenPlannedIds = new Set();
    for (const action of plannedActions) {
      validateAction(action, 'Planned', findings);
      if (isObject(action) && nonEmpty(action.id)) {
        if (seenPlannedIds.has(action.id)) fail(findings, 'Action boundary', 'Planned action IDs are unique.', action.id, `Planned action ID ${action.id} is duplicated.`);
        seenPlannedIds.add(action.id);
      }
    }
  }
  if (!Array.isArray(boundary.scopeChanges)) {
    partial(findings, 'Action boundary', 'Scope changes are recorded.', String(boundary.scopeChanges), 'Scope changes must be an array, including an empty array when none occurred.');
  } else {
    for (const scopeChange of boundary.scopeChanges) {
      if (!isObject(scopeChange) || !nonEmpty(scopeChange.change) || typeof scopeChange.substantive !== 'boolean' || !nonEmpty(scopeChange.rationale)) {
        fail(findings, 'Action boundary', 'Scope changes use the explicit object schema.', JSON.stringify(scopeChange), 'Each scope change requires a non-empty change, boolean substantive flag, and non-empty rationale.');
      } else if (scopeChange.substantive) {
        facts.substantiveScopeChange = true;
      }
    }
  }
  if (!Array.isArray(boundary.performedActions) || boundary.performedActions.length === 0) {
    partial(findings, 'Action boundary', 'Performed actions are classified.', JSON.stringify(boundary.performedActions), 'Performed action classifications are missing.');
    return facts;
  }
  if (plannedActions.length === 0) partial(findings, 'Action boundary', 'Performed actions have a non-empty plan.', JSON.stringify(boundary.plannedActions), 'Performed actions exist but planned actions are empty.');
  const plannedById = new Map(plannedActions.filter(isObject).filter((action) => nonEmpty(action.id)).map((action) => [action.id, action]));
  const seenPerformedIds = new Set();
  const authorizations = Array.isArray(boundary.authorizationReferences) ? boundary.authorizationReferences : [];
  const authorizationsById = new Map();
  for (const authorization of authorizations) {
    if (!isObject(authorization) || !nonEmpty(authorization.id) || authorizationsById.has(authorization.id)
        || !nonEmpty(authorization.actionId) || !nonEmpty(authorization.grantedBy) || !nonEmpty(authorization.scope) || !isCanonicalUtc(authorization.grantedAt)) {
      fail(findings, 'Action boundary', 'Authorization entries are complete with unique IDs.', JSON.stringify(authorization), 'An authorization entry must have a unique non-empty id, exact actionId, grantedBy, canonical UTC grantedAt, and scope.');
      continue;
    }
    authorizationsById.set(authorization.id, authorization);
  }
  for (const action of boundary.performedActions) {
    const classification = action && action.classification;
    validateAction(action, 'Performed', findings);
    if (isObject(action) && nonEmpty(action.id)) {
      if (seenPerformedIds.has(action.id)) fail(findings, 'Action boundary', 'Performed action IDs are unique.', action.id, `Performed action ID ${action.id} is duplicated.`);
      seenPerformedIds.add(action.id);
    }
    const planned = isObject(action) && nonEmpty(action.id) ? plannedById.get(action.id) : null;
    if (isObject(action) && nonEmpty(action.id) && !planned) {
      fail(findings, 'Action boundary', 'Performed action IDs resolve to planned actions.', action.id, `Performed action ID ${action.id} has no matching planned action.`);
    } else if (planned && (planned.action !== action.action || planned.classification !== action.classification || planned.scope !== action.scope)) {
      fail(findings, 'Action boundary', 'Performed actions exactly match their plans.', JSON.stringify({ planned, performed: action }), 'A performed action must exactly match its planned id, action, classification, and scope.');
    }
    const authorization = isObject(action) && nonEmpty(action.authorizationReference) ? authorizationsById.get(action.authorizationReference) : null;
    if (classification === 'ask-first' && (!authorization || authorization.actionId !== action.id || authorization.scope !== action.scope)) {
      fail(findings, 'Action boundary', 'Ask-first performed actions have exact scoped authorization.', JSON.stringify({ action, authorization }), 'An ask-first action requires a valid authorization reference whose actionId exactly matches the performed action ID and whose scope equals the performed action scope.');
    } else if (classification === 'forbidden' || classification === 'stop-and-escalate') {
      fail(findings, 'Action boundary', 'Forbidden and stop actions are not performed.', JSON.stringify(action), `A ${classification} action was reported as performed.`);
    }
  }
  return facts;
}

function validateAction(action, label, findings) {
  if (!isObject(action) || !nonEmpty(action.id) || !nonEmpty(action.action) || !nonEmpty(action.scope) || !['autonomous', 'ask-first', 'forbidden', 'stop-and-escalate'].includes(action.classification)) {
    partial(findings, 'Action boundary', `${label} action has a stable ID, non-empty action and scope, and valid classification.`, JSON.stringify(action), `${label} action is missing a stable action ID, non-empty action or scope, or valid classification.`);
  }
}

function evaluateExecution(execution, findings) {
  const criterionIds = new Set();
  if (!isObject(execution)) return criterionIds;
  if (!PLAYBOOKS.includes(execution.playbook)) fail(findings, 'Execution', 'Selected playbook uses the supported schema.', String(execution.playbook), `Selected playbook must be one of: ${PLAYBOOKS.join(', ')}.`);
  if (!Array.isArray(execution.successCriteria) || execution.successCriteria.length === 0) fail(findings, 'Execution', 'Success criteria are recorded.', JSON.stringify(execution.successCriteria), 'Canonical success criteria are missing.');
  else for (const criterion of execution.successCriteria) {
    if (!isObject(criterion) || !nonEmpty(criterion.id) || criterionIds.has(criterion.id) || !nonEmpty(criterion.description)) {
      fail(findings, 'Execution', 'Success criterion IDs are unique and non-empty.', JSON.stringify(criterion), 'Each canonical success criterion requires a unique non-empty ID and description.');
    } else criterionIds.add(criterion.id);
  }
  if (!Array.isArray(execution.performedSteps) || execution.performedSteps.length === 0) partial(findings, 'Execution', 'Performed steps are recorded.', JSON.stringify(execution.performedSteps), 'Performed steps are missing.');
  if (!Array.isArray(execution.skippedSteps)) partial(findings, 'Execution', 'Skipped steps are recorded.', String(execution.skippedSteps), 'Skipped steps must be an array.');
  requireText(findings, 'Execution', execution.decisionImpact, 'decision impact');
  if (!['aligned', 'deviated'].includes(execution.alignment)) {
    fail(findings, 'Execution', 'Execution alignment uses the supported schema.', String(execution.alignment), 'Execution alignment must be aligned or deviated.');
  }
  if (!Array.isArray(execution.deviations)) {
    partial(findings, 'Execution', 'Execution deviations are recorded.', String(execution.deviations), 'Execution deviations must be an array, including an empty array when none occurred.');
  } else {
    for (const deviation of execution.deviations) {
      if (!isObject(deviation) || !nonEmpty(deviation.step) || !nonEmpty(deviation.reason)
          || typeof deviation.justified !== 'boolean' || !nonEmpty(deviation.impact)) {
        fail(findings, 'Execution', 'Execution deviations use the explicit schema.', JSON.stringify(deviation), 'Each deviation requires step, reason, justified, and impact.');
      } else if (deviation.justified !== true) {
        fail(findings, 'Execution', 'Execution deviations are justified.', JSON.stringify(deviation), 'An unjustified execution deviation was recorded.');
      }
    }
  }
  if (execution.alignment === 'deviated') {
    if (!Array.isArray(execution.deviations) || execution.deviations.length === 0) {
      fail(findings, 'Execution', 'Deviated execution records its deviations.', JSON.stringify(execution.deviations), 'Execution was declared deviated without a deviation record.');
    } else {
      partial(findings, 'Execution', 'Execution remained aligned with the selected process.', 'alignment=deviated', 'A justified deviation still prevents the Execution dimension from passing.');
    }
  } else if (execution.alignment === 'aligned' && Array.isArray(execution.deviations) && execution.deviations.length > 0) {
    fail(findings, 'Execution', 'Aligned execution has no deviations.', JSON.stringify(execution.deviations), 'Execution was declared aligned while deviations were recorded.');
  }
  if (Array.isArray(execution.skippedSteps)) {
    for (const skipped of execution.skippedSteps) {
      if (skipped && skipped.required === true && !nonEmpty(skipped.reason) && String(execution.alignment).toLowerCase() === 'aligned') {
        fail(findings, 'Execution', 'Aligned execution explains required skips.', JSON.stringify(skipped), 'A required step was skipped without explanation while execution was declared aligned.');
      } else if (!skipped || !nonEmpty(skipped.reason)) {
        partial(findings, 'Execution', 'Skipped steps include reasons.', JSON.stringify(skipped), 'A skipped step has no reason.');
      }
    }
  }
  return criterionIds;
}

function evaluateVerification(workspaceRoot, workDirectory, taskEntry, verification, criterionIds, findings) {
  const empty = new Map();
  if (!isObject(verification)) return empty;
  const expectedPath = path.posix.join(workDirectory, 'tasks', taskEntry.taskName, 'verification.md');
  if (verification.path !== expectedPath) {
    fail(findings, 'Verification', 'Verification uses the canonical task-local path.', String(verification.path), `Task verification path must be exactly ${expectedPath} to prevent cross-task evidence.`);
    return empty;
  }
  const loaded = readWorkspaceMarkerFile(workspaceRoot, verification.path, 'verification record', parseVerificationRecord);
  if (loaded.error) {
    addBySeverity(findings, loaded.unsafe ? 'FAIL' : 'PARTIAL', 'Verification', 'Verification evidence is safely readable.', verification.path, loaded.error);
    return empty;
  }
  if (loaded.record.schemaVersion !== 1) fail(findings, 'Verification', 'Verification record uses schema version 1.', String(loaded.record.schemaVersion), 'Verification schema version must be 1.');
  const entries = Array.isArray(loaded.record.evidence) ? loaded.record.evidence : [];
  const evidence = new Map();
  for (const entry of entries) {
    if (!entry || !nonEmpty(entry.id) || evidence.has(entry.id)) {
      fail(findings, 'Verification', 'Evidence IDs are unique and non-empty.', JSON.stringify(entry), 'Verification evidence has a missing or duplicate ID.');
      continue;
    }
    evidence.set(entry.id, entry);
    if (!['command', 'manual', 'review'].includes(entry.kind)) partial(findings, 'Verification', 'Evidence kind is supported.', JSON.stringify(entry), `Evidence ${entry.id} kind must be command, manual, or review.`);
    if (!nonEmpty(entry.check) || !nonEmpty(entry.expectedSignal) || !nonEmpty(entry.actualResult) || !['passed', 'failed', 'skipped', 'unknown'].includes(entry.outcome)) {
      partial(findings, 'Verification', 'Evidence entries are complete.', JSON.stringify(entry), `Evidence ${entry.id} is incomplete.`);
    }
    if (!Array.isArray(entry.remainingUnknowns) || entry.remainingUnknowns.some((unknown) => !nonEmpty(unknown))) partial(findings, 'Verification', 'Remaining unknowns are recorded as non-empty strings.', JSON.stringify(entry.remainingUnknowns), `Evidence ${entry.id} remaining unknowns must be an array of non-empty strings.`);
    if (entry.outcome === 'passed' && Array.isArray(entry.remainingUnknowns) && entry.remainingUnknowns.length > 0) fail(findings, 'Verification', 'Passed evidence has no material remaining unknowns.', JSON.stringify(entry.remainingUnknowns), `Passed evidence ${entry.id} retains material remaining unknowns.`);
    if (entry.kind === 'command') {
      const completed = entry.outcome === 'passed' || entry.outcome === 'failed';
      if (completed && !Number.isInteger(entry.exitCode)) fail(findings, 'Verification', 'Completed command evidence has an integer exit code.', JSON.stringify(entry.exitCode), `Command evidence ${entry.id} requires an integer exit code when passed or failed.`);
      if (!completed && entry.exitCode !== null) fail(findings, 'Verification', 'Skipped or unknown command evidence has a null exit code.', JSON.stringify(entry.exitCode), `Command evidence ${entry.id} must use a null exit code when skipped or unknown.`);
      if (entry.outcome === 'passed' && entry.exitCode !== 0) fail(findings, 'Verification', 'Passed command evidence has a successful exit code.', JSON.stringify(entry), `Evidence ${entry.id} reports passed with a non-zero exit code.`);
      if (entry.outcome === 'failed' && (!Number.isInteger(entry.exitCode) || entry.exitCode === 0)) fail(findings, 'Verification', 'Failed command evidence has a non-zero exit code.', JSON.stringify(entry), `Evidence ${entry.id} reports failed without a non-zero exit code.`);
    }
  }
  const mappings = Array.isArray(verification.criteria) ? verification.criteria : [];
  const mappedCriteria = new Set();
  const referenced = [];
  for (const item of mappings) {
    if (!isObject(item) || !nonEmpty(item.criterionId) || mappedCriteria.has(item.criterionId)) {
      fail(findings, 'Verification', 'Verification criterion mappings are unique and valid.', JSON.stringify(item), 'Verification has a malformed or duplicate criterion mapping.');
      continue;
    }
    mappedCriteria.add(item.criterionId);
    if (!criterionIds.has(item.criterionId)) fail(findings, 'Verification', 'Verification uses canonical success criteria.', item.criterionId, `Verification references non-canonical criterion ${item.criterionId}.`);
    const ids = Array.isArray(item.evidenceIds) ? item.evidenceIds : [];
    referenced.push(...ids);
  }
  validateExactCriterionCoverage(findings, 'Verification', criterionIds, mappedCriteria);
  for (const id of referenced) if (!evidence.has(id)) fail(findings, 'Verification', 'Criterion evidence references resolve.', id, `Referenced evidence ID ${id} does not exist.`);
  const conclusion = String(verification.declaredConclusion || '').toLowerCase();
  validateEnum(findings, 'Verification', verification.declaredConclusion, VERIFICATION_CONCLUSIONS, 'verification declared conclusion');
  const materialUnknowns = [...evidence.values()].filter(hasMaterialUnknown);
  if (conclusion === 'passed') {
    if (referenced.length === 0) fail(findings, 'Verification', 'Passed conclusion cites evidence.', 'No evidence IDs cited.', 'A passed conclusion has no criterion evidence.');
    if (referenced.some((id) => evidence.has(id) && evidence.get(id).outcome !== 'passed')) fail(findings, 'Verification', 'Passed conclusion agrees with cited evidence.', referenced.join(', '), 'A passed conclusion conflicts with failed, skipped, or unknown evidence.');
  }
  if (materialUnknowns.length > 0) partial(findings, 'Verification', 'Verification has no material unknown evidence.', materialUnknowns.map((entry) => entry.id).join(', '), 'Material unknown evidence prevents Verification PASS even when it is not cited.');
  return evidence;
}

function evaluateRecovery(recovery, evidence, outcome, task, findings) {
  if (!isObject(recovery)) return;
  if (recovery.applicable === false) {
    const failedEvidence = [...evidence.values()].some((entry) => entry && entry.outcome === 'failed');
    const failedOutcome = isObject(outcome) && (Array.isArray(outcome.criteria) && outcome.criteria.some((criterion) => criterion && criterion.status === 'failed')
      || String(outcome.reviewResult || '').toLowerCase() === 'failed'
      || String(task && task.declaredResult || '').toLowerCase() === 'failed');
    if (failedEvidence || failedOutcome) fail(findings, 'Recovery', 'Recovery N/A agrees with failure evidence.', JSON.stringify({ failedEvidence, failedOutcome }), 'Recovery cannot be not applicable when failed evidence or outcome is recorded; record recovery or an explicit stop/non-recovery reason.');
    return;
  }
  if (recovery.applicable !== true) {
    partial(findings, 'Recovery', 'Recovery applicability is explicit.', String(recovery.applicable), 'Recovery applicability is missing.');
    return;
  }
  if (nonEmpty(recovery.declaredResult)) validateEnum(findings, 'Recovery', recovery.declaredResult, RECOVERY_RESULTS, 'recovery declared result');
  else partial(findings, 'Recovery', 'Recovery result is declared.', String(recovery.declaredResult), 'Recovery declared result is missing.');
  requireText(findings, 'Recovery', recovery.failure, 'observed failure');
  requireText(findings, 'Recovery', recovery.rootCause, 'root cause');
  const attempts = Array.isArray(recovery.attempts) ? recovery.attempts : [];
  if (attempts.length === 0) partial(findings, 'Recovery', 'Bounded recovery attempts are recorded.', JSON.stringify(recovery.attempts), 'Recovery attempts are missing.');
  const attemptEvidenceIds = new Set();
  for (const attempt of attempts) {
    if (!isObject(attempt) || !nonEmpty(attempt.action) || !Array.isArray(attempt.evidenceIds) || attempt.evidenceIds.length === 0) {
      partial(findings, 'Recovery', 'Recovery attempts include an action and evidence IDs.', JSON.stringify(attempt), 'Each recovery attempt requires a non-empty action and at least one evidence ID.');
      continue;
    }
    for (const id of attempt.evidenceIds) {
      attemptEvidenceIds.add(id);
      if (!nonEmpty(id) || !evidence.has(id)) fail(findings, 'Recovery', 'Recovery attempt evidence references resolve.', String(id), `Recovery attempt references missing evidence ID ${id}.`);
    }
  }
  const rechecks = Array.isArray(recovery.recheckEvidenceIds) ? recovery.recheckEvidenceIds : [];
  if (rechecks.length === 0 && !nonEmpty(recovery.stopCondition)) partial(findings, 'Recovery', 'Recovery has a recheck or stop reason.', JSON.stringify(recovery), 'Recovery has neither focused recheck evidence nor a stop reason.');
  if (String(recovery.declaredResult).toLowerCase() === 'success') {
    if (rechecks.length === 0) fail(findings, 'Recovery', 'Successful recovery cites recheck evidence.', '(none)', 'Recovery success was declared without a recheck.');
    if (rechecks.some((id) => !evidence.has(id) || evidence.get(id).outcome !== 'passed')) fail(findings, 'Recovery', 'Successful recovery agrees with recheck evidence.', rechecks.join(', '), 'Recovery success conflicts with a failed, unknown, or missing recheck.');
    if (rechecks.some((id) => !attemptEvidenceIds.has(id))) fail(findings, 'Recovery', 'Successful recovery rechecks are connected to recorded attempts.', rechecks.join(', '), 'A successful recovery recheck is not referenced by any recorded recovery attempt.');
  }
}

function evaluateOutcome(task, outcome, recovery, criterionIds, evidence, findings) {
  if (!isObject(outcome)) return;
  validateEnum(findings, 'Outcome', outcome.reviewResult, REVIEW_RESULTS, 'outcome review result');
  const criteria = Array.isArray(outcome.criteria) ? outcome.criteria : [];
  const mappedCriteria = new Set();
  if (criteria.length === 0) fail(findings, 'Outcome', 'Outcome evaluates each success criterion.', JSON.stringify(outcome.criteria), 'Outcome criteria are missing.');
  for (const criterion of criteria) {
    if (!isObject(criterion) || !nonEmpty(criterion.criterionId) || mappedCriteria.has(criterion.criterionId)) {
      fail(findings, 'Outcome', 'Outcome criterion mappings are unique and valid.', JSON.stringify(criterion), 'Outcome has a malformed or duplicate criterion mapping.');
      continue;
    }
    mappedCriteria.add(criterion.criterionId);
    if (!criterionIds.has(criterion.criterionId)) fail(findings, 'Outcome', 'Outcome uses canonical success criteria.', criterion.criterionId, `Outcome references non-canonical criterion ${criterion.criterionId}.`);
    if (!['passed', 'failed', 'unknown'].includes(criterion.status)) fail(findings, 'Outcome', 'Outcome criterion status is supported.', String(criterion.status), `Outcome criterion ${criterion.criterionId} status must be passed, failed, or unknown.`);
    const ids = Array.isArray(criterion.evidenceIds) ? criterion.evidenceIds : [];
    if (ids.length === 0) partial(findings, 'Outcome', 'Each criterion maps to evidence.', JSON.stringify(criterion), 'An outcome criterion has no evidence IDs.');
    for (const id of ids) {
      if (!evidence.has(id)) fail(findings, 'Outcome', 'Outcome evidence references resolve.', id, `Outcome references missing evidence ID ${id}.`);
      else if (criterion.status === 'passed' && evidence.get(id).outcome !== 'passed') fail(findings, 'Outcome', 'Passed outcome criteria cite only passed evidence.', id, `Passed outcome criterion ${criterion.criterionId} cites ${evidence.get(id).outcome} evidence ${id}.`);
    }
  }
  validateExactCriterionCoverage(findings, 'Outcome', criterionIds, mappedCriteria);
  const taskResult = String(task && task.declaredResult || '').toLowerCase();
  const complete = taskResult === 'complete'
    || String(outcome.reviewResult || '').toLowerCase() === 'accepted';
  const materialUnknowns = [...evidence.values()].filter(hasMaterialUnknown);
  if (taskResult === 'stopped') partial(findings, 'Outcome', 'Task execution reached a complete outcome.', 'task.declaredResult=stopped', 'A stopped task has a partial outcome unless contradictory evidence requires failure.');
  if (complete && criteria.some((criterion) => criterion.status !== 'passed')) fail(findings, 'Outcome', 'Complete or accepted outcome has only passed criteria.', JSON.stringify(criteria), 'Complete or accepted outcome conflicts with a failed or unknown criterion.');
  if (complete && Array.isArray(outcome.knownGaps) && outcome.knownGaps.length > 0) fail(findings, 'Outcome', 'Complete or accepted outcome has no material known gaps.', JSON.stringify(outcome.knownGaps), 'Complete or accepted outcome conflicts with recorded known gaps.');
  if (complete && materialUnknowns.length > 0) fail(findings, 'Outcome', 'Complete or accepted outcome has no material unknown evidence.', materialUnknowns.map((entry) => entry.id).join(', '), 'Complete or accepted outcome conflicts with material unknown evidence, including uncited evidence.');
  if (complete && isObject(recovery) && recovery.applicable === true && ['failed', 'partial', 'stopped'].includes(String(recovery.declaredResult || '').toLowerCase())) fail(findings, 'Outcome', 'Complete or accepted outcome agrees with recovery.', String(recovery.declaredResult), 'Complete or accepted outcome conflicts with failed, partial, or stopped recovery.');
  if (['rejected', 'failed'].includes(String(outcome.reviewResult || '').toLowerCase()) && String(task && task.declaredResult || '').toLowerCase() === 'complete') fail(findings, 'Outcome', 'Declared completion agrees with review.', String(outcome.reviewResult), 'Declared completion conflicts with review rejection.');
  if (!Array.isArray(outcome.knownGaps) || !Array.isArray(outcome.regressionRisks) || !nonEmpty(outcome.reviewResult)) partial(findings, 'Outcome', 'Outcome gaps, regression risks, and review are recorded.', JSON.stringify(outcome), 'Outcome evidence is incomplete.');
}

function evaluateCrossResultMatrix(record, findings) {
  const values = {
    task: get(record, 'task.declaredResult'),
    verification: get(record, 'verification.declaredConclusion'),
    review: get(record, 'outcome.reviewResult'),
    recovery: get(record, 'recovery.applicable') === true ? get(record, 'recovery.declaredResult') : null,
  };
  for (const [source, value] of Object.entries(values)) {
    const rule = CROSS_RESULT_MATRIX[source][value];
    if (!rule) continue;
    const [dimensionName, severity] = rule;
    addBySeverity(
      findings,
      severity,
      dimensionName,
      `${source} result permits ${dimensionName} PASS.`,
      `${source}=${value}`,
      `${source} result ${value} maps to ${dimensionName} ${severity}.`
    );
  }
}

function evaluateEvidenceSources(sources, findings) {
  if (!Array.isArray(sources) || sources.length === 0) {
    partial(findings, 'Context', 'Evidence sources are declared.', JSON.stringify(sources), 'Evidence sources are missing.');
    return;
  }
  for (const source of sources) {
    if (!source || source.kind !== 'self-report') partial(findings, 'Context', 'Evidence source is supported.', JSON.stringify(source), 'Unknown or hook evidence is not verified by this audit implementation.');
  }
}

function taskEvaluation(findings, recoveryNotApplicable = false, taskEntry = null) {
  const attributed = taskEntry ? findings.map((entry) => ({ ...entry, taskName: taskEntry.taskName, taskPath: taskEntry.path || taskEntry.label || null })) : findings;
  const dimensions = {};
  for (const name of DIMENSIONS.slice(1)) {
    const selected = stableFindings(attributed.filter((entry) => entry.dimension === name));
    dimensions[name] = dimension(name, selected.length ? aggregateStatus(selected.map((entry) => entry.severity)) : 'PASS', selected);
  }
  if (recoveryNotApplicable && dimensions.Recovery.findings.length === 0) dimensions.Recovery.status = 'NOT_APPLICABLE';
  return { status: aggregateStatus(Object.values(dimensions).map((entry) => entry.status)), dimensions, findings: stableFindings(attributed) };
}

function validateWorkspaceReference(findings, workspaceRoot, reference, dimensionName, label, severity) {
  try {
    const resolved = safeResolveInside(workspaceRoot, reference, label);
    if (!isRegularPathWithoutSymlink(workspaceRoot, resolved)) throw new Error(`${label} does not exist as a safe regular file: ${reference}`);
  } catch (error) {
    addBySeverity(findings, severity, dimensionName, `${label} is a safe existing workspace-relative file.`, String(reference), error.message);
  }
}

function readWorkspaceMarkerFile(workspaceRoot, reference, label, parser) {
  let resolved;
  try {
    resolved = safeResolveInside(workspaceRoot, reference, label);
    if (!isRegularPathWithoutSymlink(workspaceRoot, resolved)) return { error: `${label} is missing, not regular, or traverses a symlink: ${reference}`, unsafe: true };
  } catch (error) {
    return { error: error.message, unsafe: true };
  }
  try {
    return { record: parser(fs.readFileSync(resolved, 'utf8'), reference) };
  } catch (error) {
    return { error: error.message, unsafe: false };
  }
}

function isRegularPathWithoutSymlink(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  let current = path.resolve(root);
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) return false;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) return false;
    if (current !== target && !stat.isDirectory()) return false;
  }
  return fs.lstatSync(target).isFile();
}

function markdownSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'mu').exec(content);
  return match ? match[1].trim() : '';
}

function isSubstantive(value) {
  if (!nonEmpty(value)) return false;
  return !/^(unknown|none|not scanned|todo|tbd|n\/a|placeholder|[-`#\s]*)$/iu.test(value.trim());
}

function hasVerificationCommand(value) {
  if (!nonEmpty(value)) return false;
  return /(?:^|\n)\s*(?:npm|pnpm|yarn|node|npx|bun|deno|python|pytest|go|cargo|mvn|gradle|make|dotnet|ruby|bundle)\s+[^#\s]/u.test(value);
}

function requireUtc(findings, dimensionName, value, label, severity = 'PARTIAL') {
  if (!isCanonicalUtc(value)) addBySeverity(findings, severity, dimensionName, `${label} is canonical UTC.`, String(value), `${label} is missing or invalid.`);
}

function isCanonicalUtc(value) {
  const timestamp = typeof value === 'string' && STRICT_UTC.test(value) ? Date.parse(value) : NaN;
  const canonical = Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
  return Boolean(canonical && (value === canonical || value === canonical.replace('.000Z', 'Z')));
}

function validateExactCriterionCoverage(findings, dimensionName, expected, actual) {
  const missing = [...expected].filter((id) => !actual.has(id));
  const extra = [...actual].filter((id) => !expected.has(id));
  if (missing.length || extra.length) fail(findings, dimensionName, 'Canonical success criteria have exact coverage.', JSON.stringify({ missing, extra }), `${dimensionName} criterion coverage must exactly match execution success criteria.`);
}

function requireText(findings, dimensionName, value, label, severity = 'PARTIAL') {
  if (!nonEmpty(value)) addBySeverity(findings, severity, dimensionName, `${label} is recorded.`, String(value), `${label} is missing.`);
}

function validateEnum(findings, dimensionName, value, supported, label) {
  if (!supported.includes(value)) fail(findings, dimensionName, `${label} uses a supported value.`, String(value), `${label} must be one of: ${supported.join(', ')}.`);
}

function hasMaterialUnknown(entry) {
  return Boolean(entry && (entry.outcome === 'unknown' || (Array.isArray(entry.remainingUnknowns) && entry.remainingUnknowns.length > 0)));
}

function addBySeverity(findings, severity, dimensionName, claim, evidence, reason) {
  findings.push(finding(dimensionName, severity, claim, evidence, reason, 'Complete or correct the structured self-report with safe local references.'));
}
function partial(findings, dimensionName, claim, evidence, reason) { addBySeverity(findings, 'PARTIAL', dimensionName, claim, evidence, reason); }
function fail(findings, dimensionName, claim, evidence, reason) { addBySeverity(findings, 'FAIL', dimensionName, claim, evidence, reason); }
function finding(dimensionName, severity, claim, evidence, reason, recommendation) { return { dimension: dimensionName, severity, claim, evidence, reason, recommendation }; }
function withFindings(name, findings) { return dimension(name, findings.length ? aggregateStatus(findings.map((entry) => entry.severity)) : 'PASS', stableFindings(findings)); }
function dimension(name, status, findings) { return { name, status, findings }; }
function aggregateStatus(statuses) { return statuses.reduce((worst, status) => STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst, 'PASS'); }
function aggregateDimension(name, entries) { return dimension(name, aggregateStatus(entries.map((entry) => entry.status)), stableFindings(entries.flatMap((entry) => entry.findings))); }
function stableFindings(findings) { return findings.slice().sort((left, right) => DIMENSIONS.indexOf(left.dimension) - DIMENSIONS.indexOf(right.dimension) || STATUS_RANK[right.severity] - STATUS_RANK[left.severity] || left.reason.localeCompare(right.reason)); }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function get(value, dotted) { return dotted.split('.').reduce((current, key) => current && current[key], value); }
function hasDimensionFinding(findings, name) { return findings.some((entry) => entry.dimension === name); }
function hasDimensionData(record, name) {
  const fields = { 'Task rating': 'rating', Context: 'context', 'Action boundary': 'boundary', Execution: 'execution', Verification: 'verification', Recovery: 'recovery', Outcome: 'outcome' };
  return isObject(record[fields[name]]);
}

module.exports = {
  DIMENSIONS,
  evaluateAudit,
  evaluateBootstrap,
  evaluateTask,
};
