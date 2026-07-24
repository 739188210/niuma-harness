function schemaTwoTask() {
  const { passingTask } = require('./audit-evaluator-fixtures');
  const record = passingTask();
  record.schemaVersion = 2;
  record.boundary.explicitRequestExceptions = [];
  record.boundary.blockers = [];
  record.boundary.reclassifications = [];
  return record;
}

function explicitRequestSuccessorTask(classification = 'autonomous') {
  const record = schemaTwoTask();
  const source = {
    id: 'publish-release',
    action: 'Publish release artifact.',
    classification: 'forbidden',
    scope: 'Release artifact.',
  };
  const successor = {
    ...source,
    id: 'publish-release-authorized',
    classification,
  };
  record.boundary.plannedActions = [source, successor];
  record.boundary.performedActions = [successor];
  record.boundary.explicitRequestExceptions = [{
    id: 'request-publish',
    actionId: source.id,
    requestedBy: 'workspace-owner',
    requestedAt: '2026-07-12T08:55:00Z',
    scope: source.scope,
    rationale: 'The user directly requested the named release artifact.',
  }];
  record.boundary.reclassifications = [{
    id: 'reclass-publish',
    fromActionId: source.id,
    toActionId: successor.id,
    fromClassification: 'forbidden',
    toClassification: classification,
    basis: 'explicit-request-exception',
    exceptionReference: 'request-publish',
    rationale: 'The exact request removed only the default prohibition.',
  }];
  if (classification === 'ask-first') {
    record.boundary.authorizationReferences = [{
      id: 'auth-publish',
      actionId: successor.id,
      grantedBy: 'workspace-owner',
      grantedAt: '2026-07-12T08:56:00Z',
      scope: successor.scope,
    }];
    record.boundary.performedActions[0].authorizationReference = 'auth-publish';
  }
  return record;
}

function resolvedStopBlockerTask() {
  const record = schemaTwoTask();
  const source = {
    id: 'publish-release',
    action: 'Publish release artifact.',
    classification: 'stop-and-escalate',
    scope: 'Release artifact.',
  };
  const successor = {
    id: 'record-blocked-release-state',
    action: 'Record blocked release state locally.',
    classification: 'autonomous',
    scope: 'Local task status record.',
  };
  record.boundary.plannedActions = [source, successor];
  record.boundary.performedActions = [successor];
  record.boundary.blockers = [{
    id: 'blocker-credentials',
    actionId: source.id,
    classification: 'stop-and-escalate',
    reason: 'Required credentials are unavailable.',
    status: 'resolved',
    resolution: 'Reduce scope to recording blocked state locally.',
    resolvedAt: '2026-07-12T09:00:00Z',
    successorActionId: successor.id,
  }];
  record.boundary.reclassifications = [{
    id: 'reclass-readiness',
    fromActionId: source.id,
    toActionId: successor.id,
    fromClassification: 'stop-and-escalate',
    toClassification: 'autonomous',
    basis: 'blocker-resolution',
    blockerReference: 'blocker-credentials',
    rationale: 'The local blocked-state record avoids release preparation, credentials, and external writes.',
  }];
  return record;
}

module.exports = {
  explicitRequestSuccessorTask,
  resolvedStopBlockerTask,
  schemaTwoTask,
};
