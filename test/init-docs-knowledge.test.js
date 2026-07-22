const test = require('node:test');
const {
  agentCases,
  assert,
  assertAgentEntryShape,
  assertCommonHarnessShape,
  assertFile,
  assertNoPath,
  fs,
  initWorkspace,
  path,
  read,
  run,
  tempDir,
} = require('./init-fixtures');

test('generated docs prioritize task facts and route context reading by need', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /## Fact priority/);
  assert.match(index, /1\. Current user instructions for this task decide the task objective, scope, and explicit constraints\./);
  assert.match(index, /2\. Current verifiable facts: current source, configuration, build definitions, tests, and actual command output\./);
  assert.match(index, /3\. Current project navigation and runtime material: current README, `harness\/docs\/project-context\.md`, and verified runbooks\./);
  assert.match(index, /4\. Governance and reusable knowledge: applicable Rules, accepted and unsuperseded ADRs, and active experience records\./);
  assert.match(index, /5\. Historical and task material: historical notes, migration material, old proposals, plans, task records, and superseded or expired experience\./);
  assert.match(index, /A file existing in the repository does not by itself make it a current fact/);
  assert.match(index, /## Policy exception/);
  assert.match(index, /Action permission, security boundaries, and ownership conflicts are not decided by ordinary fact priority/);
  assert.match(index, /more specific and stricter Policy rule decides/);
  assert.match(index, /Read only the task-relevant stable facts/);
  assert.match(index, /Before relying on a project-context fact, inspect task-relevant current README, build files, configuration, source, tests, or command output/);
  assert.doesNotMatch(index, /## Project pointers/);
  assert.doesNotMatch(index, /## Maintenance/);

  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  assert.match(context, /fact priority, and the Policy exception/);
  assert.match(context, /Classify each task-relevant source as current verifiable fact/);
  assert.match(context, /A file existing in the repository is not automatically a current fact/);
  assert.match(context, /Current verifiable evidence determines task-specific facts/);
  assert.match(context, /Use Rules, accepted and unsuperseded ADRs, and active experience/);
  assert.match(context, /historical materials only as background, search terms, or hypotheses/);
  assert.match(context, /more specific, stricter Policy rule/);

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /verified durable context, not an active-task override/);
  assert.match(projectContext, /Current user instructions and current workspace files take precedence/);
  assert.match(projectContext, /verify the current state, use the current facts for the task, and then update or mark the durable fact as stale/);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customIndex = read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md'));
  const customContext = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '01-context.md'));

  assert.match(customIndex, /`ai-harness\/docs\/project-context\.md`/);
  assert.match(customContext, /`ai-harness\/docs\/index\.md`/);
  const customEntry = read(path.join(customWorkspace, 'CLAUDE.md'));
  assert.match(customEntry, /Their single source of truth is[\s\S]*ai-harness\/docs\/project-context\.md/);
  assert.match(customContext, /`ai-harness\/docs\/project-context\.md`/);
  assert.doesNotMatch(customIndex, /{{HARNESS_DIR}}|`harness\/docs\//);
  assert.doesNotMatch(customContext, /{{HARNESS_DIR}}|`harness\/docs\//);
});

test('generated docs route module knowledge by scope', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  const memory = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  const index = read(path.join(h, 'docs', 'index.md'));

  assert.doesNotMatch(entry, /module-topology|module-local|module entry|local supplements/i);
  assert.match(entry, /root or cross-module durable facts/);
  assert.match(context, /module knowledge area/);
  assert.match(context, /current module files/);
  assert.match(memory, /module-local durable facts/i);
  assert.match(memory, /root or cross-module durable facts/i);
  assert.match(memory, /`agent-work\//);
  assert.match(index, /marker-external module knowledge/);
  assert.match(index, /Cross-module verification triggers/);
  assert.match(index, /module-local checks alone are insufficient/);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  for (const body of [
    read(path.join(customWorkspace, 'CLAUDE.md')),
    read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '01-context.md')),
    read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '06-memory.md')),
    read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md')),
  ]) {
    assert.doesNotMatch(body, /{{HARNESS_DIR}}|`harness\//);
  }
});


test('generated project context defines first-use bootstrap protocol', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /niuma-bootstrap-record:begin/);
  assert.match(projectContext, /"schemaVersion": 1/);
  assert.match(projectContext, /"status": "pending"/);
  assert.match(projectContext, /"recordedAt": null/);
  assert.match(projectContext, /"filesInspected": \[\]/);
  assert.match(projectContext, /"scanScope": "Not scanned"/);
  assert.match(projectContext, /"knownGaps"/);
  assert.match(projectContext, /## Bootstrap protocol/);
  assert.match(projectContext, /one-time full initial project scan after `niuma-harness init`/);
  assert.match(projectContext, /not scoped to the current user request/);
  assert.match(projectContext, /A small task, an obvious reference implementation, or a task-local shortcut is not a valid reason to skip bootstrap/);
  assert.match(projectContext, /Minimum bootstrap scan/);
  assert.match(projectContext, /package manifests, lockfiles, workspace or monorepo config/);
  assert.match(projectContext, /Set `status` to `complete` only when the basic project map, stack, commands, and known gaps are usefully initialized/);
  assert.match(projectContext, /Set `status` to `partial` only when the scan is blocked/);
  assert.match(projectContext, /Remove only this explanatory `Bootstrap protocol` section/);
  assert.match(projectContext, /## Maintenance standard/);
  assert.match(projectContext, /Update this file after bootstrap only when a task verifies a durable fact/);
  assert.match(projectContext, /Maintain these categories when evidence exists/);
  assert.match(projectContext, /Do not store/);
  assert.doesNotMatch(projectContext, /Unknown until verified/);
  assert.doesNotMatch(projectContext, /Record the product purpose/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /if bootstrap status is `pending`, complete its one-time initial project scan before non-trivial work/);
  assert.match(entry, /# Project overrides/);
  assert.match(entry, /Do not duplicate root project structure, code maps, commands, dependency or tooling state/);
  assert.match(entry, /Their single source of truth is[\s\S]*harness\/docs\/project-context\.md/);
  assert.match(projectContext, /is the single source of truth for durable root or cross-module project facts/);
  assert.match(projectContext, /Do not copy its project summary, code map, commands, dependency or tooling state, known gaps, or architecture facts into the root entry file's Project overrides area/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /Bootstrap `harness\/docs\/project-context\.md` when its structured bootstrap record has `"status": "pending"`/);
  assert.match(memoryMemo, /perform the one-time initial project scan defined in that file/);
  assert.match(memoryMemo, /record only verified durable facts/);
});

