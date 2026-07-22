const { fs, path, tempDir } = require('../helpers');
const { evaluateTask } = require('../../src/audit/evaluator');
const {
  BOOTSTRAP_RECORD_BEGIN,
  BOOTSTRAP_RECORD_END,
  VERIFICATION_RECORD_BEGIN,
  VERIFICATION_RECORD_END,
} = require('../../src/audit/records');

function marker(begin, end, value) {
  return `${begin}\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n${end}\n`;
}

function workspaceFixture() {
  const workspaceRoot = tempDir();
  const harnessRoot = path.join(workspaceRoot, 'harness');
  const taskDir = path.join(workspaceRoot, 'agent-work', 'tasks', 'task-213');
  fs.mkdirSync(path.join(harnessRoot, 'docs'), { recursive: true });
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, 'package.json'), '{}\n');
  fs.writeFileSync(path.join(harnessRoot, 'docs', 'project-context.md'), '# Context\n');
  fs.writeFileSync(path.join(harnessRoot, 'docs', 'process.md'), '# Process\n');
  return { workspaceRoot, harnessRoot, taskDir };
}

function completeBootstrap() {
  return {
    schemaVersion: 1,
    status: 'complete',
    recordedAt: '2026-07-12T08:00:00Z',
    filesInspected: ['package.json'],
    scanScope: 'Package manifest, source, tests, and Harness docs.',
    knownGaps: [],
  };
}

function completeBootstrapContent(record = completeBootstrap()) {
  return [
    '# Project Context',
    marker(BOOTSTRAP_RECORD_BEGIN, BOOTSTRAP_RECORD_END, record).trim(),
    '## Project summary',
    'A dependency-free Node.js CLI for generated engineering harnesses.',
    '## Technology stack',
    'CommonJS on Node.js with built-in test tooling.',
    '## Code map',
    '`src/` contains CLI code and `test/` contains tests.',
    '## Build and verification commands',
    '```bash',
    'npm test',
    '```',
    '',
  ].join('\n');
}

function passingVerification() {
  return {
    schemaVersion: 1,
    evidence: [
      {
        id: 'tests',
        kind: 'command',
        check: 'npm test',
        expectedSignal: 'Exit code 0',
        actualResult: 'All tests passed.',
        outcome: 'passed',
        exitCode: 0,
        remainingUnknowns: [],
      },
    ],
  };
}

function passingTask() {
  return {
    schemaVersion: 1,
    task: {
      id: 'task-213',
      recordedAt: '2026-07-12T09:00:00Z',
      tool: 'claude-code',
      requestSummary: 'Implement deterministic audit evaluation.',
      declaredResult: 'complete',
    },
    rating: {
      classification: 'feature',
      tier: 'normal',
      rationale: 'Localized feature with explicit behavior and tests.',
      riskFactors: [],
      reclassified: false,
    },
    context: {
      projectFiles: [{ path: 'package.json', purpose: 'Confirm package commands.' }],
      harnessDocs: [{ path: 'harness/docs/process.md', purpose: 'Select the feature process.' }],
      reusedImplementations: ['src/audit/records.js'],
      knownGaps: [],
      sufficiency: 'sufficient',
    },
    boundary: {
      plannedActions: [{ id: 'edit-audit', action: 'Edit audit modules', classification: 'autonomous', scope: 'Audit evaluator and tests.' }],
      performedActions: [{ id: 'edit-audit', action: 'Edit audit modules', classification: 'autonomous', scope: 'Audit evaluator and tests.' }],
      authorizationReferences: [],
      scopeChanges: [],
    },
    execution: {
      playbook: 'feature',
      successCriteria: [{ id: 'criteria-1', description: 'Focused tests pass.' }],
      performedSteps: ['Added tests', 'Implemented evaluator'],
      skippedSteps: [],
      decisionImpact: 'TDD exposed required contradiction cases.',
      alignment: 'aligned',
      deviations: [],
    },
    verification: {
      path: 'agent-work/tasks/task-213/verification.md',
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

function evaluateFixture(record = passingTask(), verification = passingVerification()) {
  const fixture = workspaceFixture();
  fs.writeFileSync(
    path.join(fixture.taskDir, 'verification.md'),
    marker(VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END, verification)
  );
  const taskEntry = { taskName: 'task-213', kind: 'structured', path: path.join(fixture.taskDir, 'harness-feedback.md'), record };
  return { ...fixture, taskEntry, result: evaluateTask({ workspaceRoot: fixture.workspaceRoot, taskEntry }) };
}

function dimensionReasons(result, name) {
  return result.dimensions[name].findings.map((finding) => finding.reason).join('\n');
}

module.exports = {
  completeBootstrap,
  completeBootstrapContent,
  dimensionReasons,
  evaluateFixture,
  marker,
  passingTask,
  passingVerification,
  workspaceFixture,
};
