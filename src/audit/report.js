const { DIMENSIONS } = require('./evaluator');

const EVIDENCE_LIMITATION = 'Evidence limitation: This audit checks deterministic consistency of self-reported records and safe local references. It cannot prove actual reads, command execution, or objective correctness.';

function formatAuditReport(result) {
  const lines = [];
  if (result.workspaceRoot) lines.push(`Workspace: ${result.workspaceRoot}`);
  if (result.harnessRoot) lines.push(`Harness: ${result.harnessRoot}`);
  if (Array.isArray(result.selectedTasks) && result.selectedTasks.length > 0) {
    for (const task of result.selectedTasks) lines.push(`Selected task: ${task.taskName}${task.recordedAt ? ` (${task.recordedAt})` : ''}`);
  } else {
    lines.push('Selected task: None');
  }
  if (result.selectionReason) lines.push(`Selection: ${result.selectionReason}`);
  if (result.message) lines.push(result.message);

  for (const name of DIMENSIONS) {
    const entry = result.dimensions && result.dimensions[name];
    lines.push(`${name}: ${entry ? entry.status : 'PARTIAL'}`);
  }

  const findings = Array.isArray(result.findings) ? result.findings : [];
  if (findings.length === 0) {
    lines.push('Findings: None');
  } else {
    lines.push('Findings:');
    for (const finding of findings) {
      lines.push(`- [${finding.severity}] ${finding.dimension}: ${finding.reason}`);
      if (finding.taskName) lines.push(`  Task: ${finding.taskName}`);
      if (finding.taskPath) lines.push(`  Path: ${finding.taskPath}`);
      lines.push(`  Claim: ${finding.claim}`);
      lines.push(`  Evidence: ${finding.evidence}`);
      lines.push(`  Recommendation: ${finding.recommendation}`);
    }
  }
  lines.push(EVIDENCE_LIMITATION);
  if (result.error) lines.push(`Error: ${result.error}`);
  lines.push(`Audit: ${result.status}`);
  return `${lines.join('\n')}\n`;
}

function printAuditReport(result) {
  process.stdout.write(formatAuditReport(result));
}

module.exports = {
  EVIDENCE_LIMITATION,
  formatAuditReport,
  printAuditReport,
};
