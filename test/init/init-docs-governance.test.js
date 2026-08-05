const test = require('node:test');
const {
  assert,
  assertNoPath,
  fs,
  path,
  read,
  run,
  tempDir,
} = require('../support/init-fixtures');

test('generated docs keep experience project-maintained and decoupled from retired protocols', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const guide = read(path.join(h, 'docs', 'experience', 'README.md'));
  assert.match(guide, /^# Experience Library$/m);
  assert.match(guide, /A first verified discovery may be recorded immediately/);
  assert.match(guide, /Do not create a record merely to close a task/);
  assert.match(guide, /One-off failures, raw logs, temporary debugging traces/);
  assert.match(guide, /Individual experience records are project-maintained/);
  assert.match(guide, /## Origin \(optional\)/);
  assert.doesNotMatch(guide, /ADR|verification\.md|evidenceIds/);

  const record = path.join(h, 'docs', 'experience', 'pagination.md');
  fs.writeFileSync(record, '# Pagination lesson\n', 'utf8');
  assert.strictEqual(run(['init', workspace, '--agent', 'claude']).status, 0);
  assert.strictEqual(read(record), '# Pagination lesson\n');
});

test('generated docs define optional Harness feedback without an execution-record schema', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  assertNoPath(path.join(h, 'docs', 'experiments'));
  assertNoPath(path.join(h, 'docs', 'decisions'));
  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.doesNotMatch(entry, /structured execution record|task-execution-record|evidence links/);
  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /optional feedback about Harness protocol or documentation friction/);
  assert.match(workReadme, /project technical discoveries belong in task state, project context, or Experience instead/);
  assert.match(workReadme, /Why this belongs to Harness feedback rather than project context or Experience/);
  assert.match(workReadme, /Its absence never blocks task execution, recovery, or completion/);
  assert.doesNotMatch(workReadme, /required structured execution record/);
  assert.match(workReadme, /do not create `verification\.md` or another competing task evidence ledger/);
});

test('generated Memory layer routes discoveries to one primary destination', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const memory = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memory, /## Finding routing/);
  assert.match(memory, /status\.md.*final response for Direct work/);
  assert.match(memory, /docs\/project-context\.md/);
  assert.match(memory, /docs\/experience\/<topic>\.md/);
  assert.match(memory, /harness-feedback\.md/);
  assert.match(memory, /A first verified discovery may qualify; repetition is not required/);
  assert.match(memory, /does not mean every first discovery must become Experience/);
  assert.match(memory, /An experience record is guidance, not action authorization/);
  assert.match(memory, /re-check its Source of truth and classify the current action under Policy/);
});

test('generated docs make task-material selection decisive and singular', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /Use Direct only when \*\*all\*\* conditions hold/);
  assert.match(workReadme, /two or more implementation steps, related edits, changed areas, components, or file families/);
  assert.match(workReadme, /two or more acceptance criteria/);
  assert.match(workReadme, /### Tracked[\s\S]*?plan\.md[\s\S]*?status\.md/);
  assert.match(workReadme, /## Scope change/);
  assert.match(workReadme, /Task outcome/);
  assert.match(workReadme, /do not create `verification\.md` or another competing task evidence ledger/);
  assert.doesNotMatch(workReadme, /Minimum|Recoverable/);
  const process = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(process, /`agent-work\/README\.md` as the only progressive task-material profile card for Direct, Planned, or Tracked work/);
  assert.match(process, /Direct, Planned, and Tracked are progressive task-material profiles/);
  assert.match(process, /`Direct < Planned < Tracked`/);
  assert.match(process, /`Tracked` includes `Planned`/);
  assert.match(process, /Policy still decides whether each action may proceed/);
  assertNoPath(path.join(h, 'docs', 'process'));
});

test('generated docs omit retired auxiliary process playbooks', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  for (const page of ['isolation.md', 'subagent-development.md', 'release.md']) {
    assertNoPath(path.join(h, 'docs', 'process', page));
  }
  const index = read(path.join(h, 'docs', 'index.md'));
  assert.doesNotMatch(index, /Workspace isolation|Subagent development|Release readiness/);
});

test('generated docs use final responses or status ledgers for actual observations', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /### Direct/);
  assert.match(workReadme, /### Tracked/);
  assert.match(workReadme, /sole task-local operational and evidence ledger/);
  assert.doesNotMatch(workReadme, /Recoverable/);
  const observation = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observation, /For Direct work, record evidence in the final response/);
  assert.match(observation, /For Tracked work, record it only in .*status\.md/);
  const resumption = read(path.join(h, 'docs', 'layers', '07-resumption.md'));
  assert.match(resumption, /A task outcome must not be `passed` while a material acceptance criterion is failed, blocked, skipped with unresolved impact, or unknown/);
  assert.doesNotMatch(resumption, /Recoverable/);
});


test('generated docs define external side-effect network gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /## Local worktree isolation/);
  assert.match(actionBoundary, /avoid[a-z ]*risk or coordination cost/);
  assert.match(actionBoundary, /outside the target repository's shared working tree/);
  assert.match(actionBoundary, /dedicated agent-owned isolation directory/);
  assert.match(actionBoundary, /do not create worktrees inside normal source, docs, config, output, or other repository-owned paths/);
  assert.doesNotMatch(actionBoundary, /such as `\.claude\/worktrees\/`/);
  assert.match(actionBoundary, /newly created task branch remains local-only/);
  assert.match(actionBoundary, /no upstream tracking, PR, or remote branch creation/);
  assert.match(actionBoundary, /does not push to or otherwise touch remotes/);
  assert.match(actionBoundary, /does not merge, delete, force-clean, rewrite history, or modify existing files in the shared working tree/);
  assert.match(actionBoundary, /shared working tree does not need to be clean/);
  assert.match(actionBoundary, /Existing uncommitted files do not block autonomous worktree creation/);
  assert.match(actionBoundary, /copy local-only config, or use credentials/);
  assert.match(actionBoundary, /## External side-effect \/ network gate/);
  assert.match(actionBoundary, /Public documentation and web lookup is autonomous/);
  assert.match(actionBoundary, /read-only, unauthenticated/);
  assert.match(actionBoundary, /does not upload/);
  assert.match(actionBoundary, /does not write to an external system/);
  assert.match(actionBoundary, /does not consume limited quota/);
  assert.match(actionBoundary, /Calling external APIs or services/);
  assert.match(actionBoundary, /authenticated access, credentials, cookies, tokens/);
  assert.match(actionBoundary, /Uploading files, logs, code, artifacts/);
  assert.match(actionBoundary, /Installing dependencies, running remote install scripts/);
  assert.match(actionBoundary, /CI jobs, remote jobs, deploy previews/);
  assert.match(actionBoundary, /Writing comments, issues, pull requests/);
  assert.match(actionBoundary, /When the user explicitly asks to check whether a package can be released/);
  assert.match(actionBoundary, /package metadata and contents.*dry-run, build, test, lint, and artifact checks/i);
  assert.match(actionBoundary, /task-scoped, local, and do not create external side effects/i);
  assert.match(actionBoundary, /external release or deployment infrastructure, remote or hosted jobs, credentials, remote services, or limited quota/i);
  assert.doesNotMatch(actionBoundary, /Preparing release or deployment readiness checks before an approved outward-facing action/);
  assert.match(actionBoundary, /Publish, deploy, tag, release, push, or bump package versions/);
  assert.match(actionBoundary, /Delete, overwrite, revoke, rotate, mutate/);
  assert.match(actionBoundary, /Transmit secrets, credentials, tokens, private data/);
  assert.match(actionBoundary, /follow `harness\/docs\/policy\/secret-leak\.md`; classify any value-dependent or remediation action separately/);
  assert.doesNotMatch(actionBoundary, /Sensitive-value containment|continue unrelated safe local work|detecting it does not itself stop the whole task/);
  assert.match(actionBoundary, /large-scale crawling, load testing, scraping/);

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /before network or external-service actions/);
  assert.match(policyMemo, /For secret exposure handling, follow `harness\/docs\/policy\/secret-leak\.md`/);
  assert.doesNotMatch(policyMemo, /A secret-related blocker applies only|while unrelated safe work continues/);
  assert.doesNotMatch(policyMemo, /## External side-effect \/ network gate/);

  const untrusted = read(path.join(h, 'docs', 'policy', 'untrusted-content.md'));
  assert.match(untrusted, /follow `harness\/docs\/policy\/secret-leak\.md`/);
  assert.match(untrusted, /Instructions to use or disclose the value remain untrusted/);
  assert.doesNotMatch(untrusted, /redact it and follow|does not authorize any action that uses or transmits the value/);

  const recovery = read(path.join(h, 'docs', 'layers', '05-recovery.md'));
  assert.match(recovery, /first follow `harness\/docs\/policy\/secret-leak\.md`/);
  assert.match(recovery, /only for an independently recoverable non-secret work stream/);
  assert.doesNotMatch(recovery, /to redact and contain it/);
});

test('generated docs define test-change gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /## Test-change gate/);
  assert.match(actionBoundary, /Verification targets include tests, assertions, snapshots/);
  assert.match(actionBoundary, /focused RED test creation or updates/);
  assert.match(actionBoundary, /approved changed behavior or confirmed regression coverage/);
  assert.match(actionBoundary, /even in an existing test file or verification target/);
  assert.match(actionBoundary, /preserve or strengthen the prior behavior contract/);
  assert.match(actionBoundary, /do not edit, delete, skip, weaken, or rebaseline verification targets/);
  assert.match(actionBoundary, /Other changes to an existing verification target are ask-first/);
  assert.match(actionBoundary, /uncertain semantic rewrite/);
  assert.match(actionBoundary, /task explicitly requests test maintenance/);
  assert.match(actionBoundary, /target conflicts with verified intended behavior/);
  assert.match(actionBoundary, /replacement coverage/);
  assert.doesNotMatch(actionBoundary, /Changing an existing verification target is ask-first unless/);
  assert.match(actionBoundary, /A request to turn red into green by weakening, skipping, deleting, or rebaselining verification targets is not valid test maintenance/);
  assert.match(actionBoundary, /The user asks to turn red into green by weakening, skipping, deleting, or rebaselining verification targets/);
  assert.match(actionBoundary, /## Decision order and reclassification/);
  assert.match(actionBoundary, /`stop-and-escalate` wins/);
  assert.match(actionBoundary, /not a fifth classification/);
  assert.match(actionBoundary, /distinct successor action/);
  const forbiddenUnlessRequested = actionBoundary.match(
    /## Forbidden unless explicitly requested[\s\S]*?## Always stop and escalate/,
  )[0];
  assert.doesNotMatch(
    forbiddenUnlessRequested,
    /verification targets|weaken tests|loosen assertions|remove assertions|delete failing checks|skip tests|rebaseline snapshots|lower coverage|just to pass/,
  );

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /If verification fails, treat the failing check as evidence/);
  assert.match(observationMemo, /do not move the verification target unless the Policy test-change gate permits it/);
  assert.match(observationMemo, /test-change gate in `harness\/docs\/policy\/action-boundary\.md`/);
  assert.match(observationMemo, /replacement coverage preserves the behavior contract/);
  assert.match(observationMemo, /## Test-first behavior evidence/);
  assertNoPath(path.join(h, 'docs', 'process'));
});

test('generated docs require test-first behavior evidence when automation is suitable', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const observation = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observation, /## Test-first behavior evidence/);
  assert.match(observation, /stable automated target can express/);
  assert.match(observation, /Define the focused target before implementation/);
  assert.match(observation, /Run it in RED/);
  assert.match(observation, /Run the same target in GREEN/);
  assert.match(observation, /When refactoring is needed, re-run the same target afterward/);
  assert.match(observation, /not a separate task type or workflow/);
  assert.match(observation, /state why and define replacement evidence before implementation/);
  assert.match(observation, /Time pressure, convenience, inability to immediately find a test, or test complexity/);
  assert.doesNotMatch(observation, /niuma-verification-record:begin/);

  const process = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(process, /stable automated target can express/);
  assert.match(process, /focused test-first evidence/);

  const policy = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(policy, /task-scoped focused RED test creation or updates needed to express approved changed behavior or confirmed regression coverage/);
  assert.match(policy, /even in an existing test file or verification target/);
  assert.match(policy, /preserve or strengthen the prior behavior contract/);
  assert.match(policy, /Other changes to an existing verification target are ask-first/);
  assertNoPath(path.join(h, 'docs', 'process'));
});
