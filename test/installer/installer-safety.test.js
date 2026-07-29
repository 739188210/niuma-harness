const test = require('node:test');
const fs = require('fs');
const path = require('path');
const {
  assert,
  assertDir,
  assertFile,
  assertNoPath,
  assertTreeUnchanged,
  read,
  runInteractive,
  snapshotTree,
  tempDir,
} = require('../support/helpers');
const { digestBytes } = require('../../src/infrastructure/content-digest');
const { createAssetInstallPlan } = require('../../src/installer/plan');
const {
  createAssetInstallBackup,
  verifyAssetInstallBackup,
  restoreAssetInstallBackup,
} = require('../../src/installer/backup');
const { applyAssetInstallPlan } = require('../../src/installer/apply');
const supportsNoFollow = Boolean(fs.constants.O_NOFOLLOW);
const noFollowTest = supportsNoFollow ? test : test.skip;

function artifact(target, content) {
  return {
    kind: 'skill',
    source: 'test',
    target,
    content,
    digest: digestBytes(Buffer.from(content, 'utf8')),
  };
}

noFollowTest('a create-only selected skill installs directly without a backup', () => {
  const workspace = tempDir();
  const result = runInteractive(['install-skill', 'database-readonly'], '1\n', { cwd: workspace });

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Installed skills\./);
  assertFile(path.join(workspace, '.claude', 'skills', 'database-readonly', 'SKILL.md'));
  assertNoPath(path.join(workspace, '.niuma-harness', 'asset-installs'));
});

for (const answer of ['n', ' y ', 'y ']) {
  noFollowTest(`conflicts cancel without writes unless confirmation is exactly y (${JSON.stringify(answer)})`, () => {
    const workspace = tempDir();
    const target = path.join(workspace, '.claude', 'skills', 'database-readonly', 'SKILL.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'user bytes\n');
    const before = snapshotTree(workspace);

    const result = runInteractive(['install-skill', 'database-readonly'], `1\n${answer}\n`, { cwd: workspace });

    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /Conflicts:/);
    assert.match(result.stdout, /CONFLICT \.claude\/skills\/database-readonly\/SKILL\.md/);
    assert.match(result.stdout, /Continue\? \[y\/N\]/);
    assert.match(result.stdout, /Installation cancelled\. No files changed\./);
    assertTreeUnchanged(workspace, before);
  });
}

noFollowTest('dry-run prints CREATE and CONFLICT without prompting or writing', () => {
  const workspace = tempDir();
  const conflict = path.join(workspace, '.claude', 'commands', 'dev-check.md');
  fs.mkdirSync(path.dirname(conflict), { recursive: true });
  fs.writeFileSync(conflict, 'user bytes\n');
  const before = snapshotTree(workspace);

  const result = runInteractive(['install-command', 'dev-check', '--dry-run'], '4\n', { cwd: workspace });

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /CONFLICT \.claude\/commands\/dev-check\.md/);
  assert.match(result.stdout, /CREATE \.opencode\/commands\/dev-check\.md/);
  assert.doesNotMatch(result.stdout, /Continue\? \[y\/N\]/);
  assertNoPath(path.join(workspace, '.niuma-harness', 'asset-installs'));
  assertTreeUnchanged(workspace, before);
});

noFollowTest('confirmed conflicts are backed up at matching relative paths before overwrite', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'user bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });

  const backup = createAssetInstallBackup({ workspaceDir: workspace, conflicts: plan });
  verifyAssetInstallBackup({ backupRoot: backup.backupRoot, conflicts: plan });
  applyAssetInstallPlan({ workspaceDir: workspace, plan, backupRoot: backup.backupRoot });

  assert.strictEqual(read(path.join(backup.backupRoot, ...target.split('/'))), 'user bytes\n');
  assert.strictEqual(read(targetPath), 'package bytes\n');
  assert.match(path.relative(path.join(workspace, '.niuma-harness', 'asset-installs'), backup.backupRoot), /^[^/]+$/);
});

noFollowTest('create race after revalidation fails without deleting the external target', () => {
  const workspace = tempDir();
  const createdTarget = '.claude/skills/example/a-created.md';
  const racedTarget = '.claude/skills/example/z-raced.md';
  const createdPath = path.join(workspace, ...createdTarget.split('/'));
  const racedPath = path.join(workspace, ...racedTarget.split('/'));
  const plan = createAssetInstallPlan({
    workspaceDir: workspace,
    artifacts: [artifact(createdTarget, 'created package bytes\n'), artifact(racedTarget, 'raced package bytes\n')],
  });
  let revalidated = false;

  assert.throws(() => applyAssetInstallPlan({
    workspaceDir: workspace,
    plan,
    backupRoot: null,
    dependencies: {
      revalidateAssetInstallPlan(args) {
        require('../../src/installer/plan').revalidateAssetInstallPlan(args);
        revalidated = true;
      },
      writeFile(targetPath, content, options) {
        assert.strictEqual(revalidated, true);
        if (targetPath.endsWith(path.join('z-raced.md'))) {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, 'external bytes\n');
        }
        return require('../../src/infrastructure/fs-safe').writeFile(targetPath, content, options);
      },
    },
  }), /target changed after revalidation/);

  assertNoPath(createdPath);
  assert.strictEqual(read(racedPath), 'external bytes\n');
});

noFollowTest('partial create write failure preserves an unconfirmed target', () => {
  const workspace = tempDir();
  const createTarget = '.claude/skills/example/partial.md';
  const createPath = path.join(workspace, ...createTarget.split('/'));
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(createTarget, 'package bytes\n')] });

  assert.throws(() => applyAssetInstallPlan({
    workspaceDir: workspace,
    plan,
    backupRoot: null,
    dependencies: {
      writeFile(targetPath) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, 'partial bytes\n');
        throw new Error('injected partial create failure');
      },
    },
  }), /injected partial create failure/);
  assert.strictEqual(read(createPath), 'partial bytes\n');
});

noFollowTest('write failure restores both overwritten and not-yet-overwritten conflicts', () => {
  const workspace = tempDir();
  const firstConflict = '.claude/skills/example/a-first.md';
  const secondConflict = '.claude/skills/example/z-second.md';
  const firstPath = path.join(workspace, ...firstConflict.split('/'));
  const secondPath = path.join(workspace, ...secondConflict.split('/'));
  fs.mkdirSync(path.dirname(firstPath), { recursive: true });
  fs.writeFileSync(firstPath, 'first user bytes\n');
  fs.writeFileSync(secondPath, 'second user bytes\n');
  const plan = createAssetInstallPlan({
    workspaceDir: workspace,
    artifacts: [artifact(firstConflict, 'first package bytes\n'), artifact(secondConflict, 'second package bytes\n')],
  });
  const { backupRoot } = createAssetInstallBackup({ workspaceDir: workspace, conflicts: plan });

  assert.throws(() => applyAssetInstallPlan({
    workspaceDir: workspace,
    plan,
    backupRoot,
    dependencies: {
      writeFile(targetPath, content, options) {
        if (targetPath.endsWith('z-second.md')) throw new Error('injected second conflict failure');
        return require('../../src/infrastructure/fs-safe').writeFile(targetPath, content, options);
      },
    },
  }), /injected second conflict failure/);
  assert.strictEqual(read(firstPath), 'first user bytes\n');
  assert.strictEqual(read(secondPath), 'second user bytes\n');
  assertFile(path.join(backupRoot, ...firstConflict.split('/')));
  assertFile(path.join(backupRoot, ...secondConflict.split('/')));
});

noFollowTest('backup copy failure preserves workspace targets and leaves created parent directories', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'user bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });
  const backupParent = path.join(workspace, '.niuma-harness', 'asset-installs');
  assert.throws(() => createAssetInstallBackup({
    workspaceDir: workspace,
    conflicts: plan,
    dependencies: {
      beforeBackupWrite() {
        throw new Error('injected backup copy failure');
      },
    },
  }), /injected backup copy failure/);

  assert.strictEqual(read(targetPath), 'user bytes\n');
  assertDir(path.join(workspace, '.niuma-harness'));
  assertDir(backupParent);
});

noFollowTest('backup verification failure and preflight target changes leave targets byte-identical', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'user bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });
  const { backupRoot } = createAssetInstallBackup({ workspaceDir: workspace, conflicts: plan });
  fs.writeFileSync(path.join(backupRoot, ...target.split('/')), 'corrupt backup\n');
  assert.throws(() => verifyAssetInstallBackup({ backupRoot, conflicts: plan }), /verification failed/);
  assert.strictEqual(read(targetPath), 'user bytes\n');

  const createPlan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact('.claude/skills/example/new.md', 'new bytes\n')] });
  fs.writeFileSync(path.join(workspace, '.claude', 'skills', 'example', 'new.md'), 'race bytes\n');
  assert.throws(() => applyAssetInstallPlan({ workspaceDir: workspace, plan: createPlan, backupRoot: null }), /changed since planning/);
  assert.strictEqual(read(targetPath), 'user bytes\n');
});

noFollowTest('backup and restore reject symlink paths and restore reports individual failures', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'user bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });
  const { backupRoot } = createAssetInstallBackup({ workspaceDir: workspace, conflicts: plan });
  fs.unlinkSync(targetPath);
  fs.symlinkSync(path.join(workspace, 'elsewhere'), targetPath);

  const result = restoreAssetInstallBackup({ workspaceDir: workspace, backupRoot, conflicts: plan });
  assert.strictEqual(result.failures.length, 1);
  assert.match(result.failures[0].message, /unsafe|symlink|regular file/i);
});

noFollowTest('final create rejects a target swapped to a symlink immediately before its FD open', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  const externalPath = path.join(workspace, 'external.md');
  fs.writeFileSync(externalPath, 'external bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });

  assert.throws(() => applyAssetInstallPlan({
    workspaceDir: workspace,
    plan,
    backupRoot: null,
    dependencies: {
      beforeFinalWrite({ targetPath: writePath }) {
        fs.mkdirSync(path.dirname(writePath), { recursive: true });
        fs.symlinkSync(externalPath, writePath);
      },
    },
  }), /target changed after revalidation|no-follow|race invalid/i);

  assert.strictEqual(read(externalPath), 'external bytes\n');
  assert.ok(fs.lstatSync(targetPath).isSymbolicLink());
});

noFollowTest('backup creation rejects a backup leaf swapped to a symlink before FD open', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  const externalPath = path.join(workspace, 'external-backup.md');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'user bytes\n');
  fs.writeFileSync(externalPath, 'external bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });

  assert.throws(() => createAssetInstallBackup({
    workspaceDir: workspace,
    conflicts: plan,
    dependencies: {
      beforeBackupWrite({ backupPath }) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.symlinkSync(externalPath, backupPath);
      },
    },
  }), /backup.*no-follow|backup.*race invalid|backup.*symlink/i);

  assert.strictEqual(read(externalPath), 'external bytes\n');
  assert.strictEqual(read(targetPath), 'user bytes\n');
});

noFollowTest('backup verification rejects a backup leaf swapped to a symlink before no-follow read', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  const externalPath = path.join(workspace, 'external-backup.md');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'user bytes\n');
  fs.writeFileSync(externalPath, 'external bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });
  const backup = createAssetInstallBackup({ workspaceDir: workspace, conflicts: plan });

  assert.throws(() => verifyAssetInstallBackup({
    backupRoot: backup.backupRoot,
    conflicts: plan,
    dependencies: {
      beforeBackupRead({ backupPath }) {
        fs.unlinkSync(backupPath);
        fs.symlinkSync(externalPath, backupPath);
      },
    },
  }), /backup.*no-follow|backup.*race invalid|backup.*symlink/i);

  assert.strictEqual(read(externalPath), 'external bytes\n');
  assert.strictEqual(read(targetPath), 'user bytes\n');
});

noFollowTest('rollback refuses a replaced backup parent and does not overwrite the conflict target', () => {
  const workspace = tempDir();
  const target = '.claude/skills/example/SKILL.md';
  const targetPath = path.join(workspace, ...target.split('/'));
  const externalRoot = path.join(workspace, 'external-backup-root');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.mkdirSync(externalRoot);
  fs.writeFileSync(targetPath, 'user bytes\n');
  const plan = createAssetInstallPlan({ workspaceDir: workspace, artifacts: [artifact(target, 'package bytes\n')] });
  const backup = createAssetInstallBackup({ workspaceDir: workspace, conflicts: plan });
  fs.writeFileSync(targetPath, 'package bytes\n');

  const result = restoreAssetInstallBackup({
    workspaceDir: workspace,
    backupRoot: backup.backupRoot,
    conflicts: plan,
    originalBytes: backup.originalBytes,
    dependencies: {
      beforeBackupRestore({ backupRoot }) {
        const backupParent = path.join(backupRoot, '.claude');
        fs.renameSync(backupParent, path.join(workspace, 'held-backup-parent'));
        fs.symlinkSync(externalRoot, backupParent);
      },
    },
  });

  assert.strictEqual(result.failures.length, 1);
  assert.match(result.failures[0].message, /backup.*(symlink|race.invalid|parent.path.changed)/i);
  assert.strictEqual(read(targetPath), 'package bytes\n');
});
