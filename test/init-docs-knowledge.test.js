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
  assert.match(projectContext, /verified stable facts about this project/);
  assert.match(projectContext, /Use `harness\/docs\/process\/bootstrap\.md` for bootstrap and context-maintenance rules/);
  assert.doesNotMatch(projectContext, /## Bootstrap protocol/);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customIndex = read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md'));
  const customContext = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '01-context.md'));

  assert.match(customIndex, /\[Verified project facts\]\(project-context\.md\)/);
  assert.match(customIndex, /\[Project bootstrap and context maintenance\]\(process\/bootstrap\.md\)/);
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


test('generated project context separates user facts from managed bootstrap protocol', () => {
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
  assert.match(projectContext, /## Project summary/);
  assert.match(projectContext, /## Technology stack/);
  assert.match(projectContext, /## Code map/);
  assert.match(projectContext, /## Build and verification commands/);
  assert.match(projectContext, /process\/bootstrap\.md`/);
  assert.doesNotMatch(projectContext, /## Bootstrap protocol|## Maintenance standard/);

  const contextProtocol = read(path.join(h, 'docs', 'process', 'bootstrap.md'));
  assert.match(contextProtocol, /one-time initial project scan after `niuma-harness init`/);
  assert.match(contextProtocol, /not scoped to the current user request/);
  assert.match(contextProtocol, /A small task, an obvious reference implementation, or a task-local shortcut is not a reason to skip bootstrap/);
  assert.match(contextProtocol, /package manifests, lockfiles, workspace or monorepo configuration/);
  assert.match(contextProtocol, /`pending`|`partial`|`complete`/);
  assert.match(contextProtocol, /Do not remove or change the marker's schema and fields/);
  assert.match(contextProtocol, /Do not store secrets, credentials, private data, task logs/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /For bootstrap, context staleness, or durable-fact maintenance, read `harness\/docs\/process\/bootstrap\.md`/);
  assert.match(entry, /# Project overrides/);
  assert.match(entry, /Their single source of truth is[\s\S]*harness\/docs\/project-context\.md/);

  const contextMemo = read(path.join(h, 'docs', 'layers', '01-context.md'));
  assert.match(contextMemo, /bootstrap, context staleness, or durable-fact maintenance is needed, also read `harness\/docs\/process\/bootstrap\.md`/);
  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /follow `harness\/docs\/process\/bootstrap\.md` for the one-time initial scan/);
  assert.match(memoryMemo, /record only verified durable facts/);
});

