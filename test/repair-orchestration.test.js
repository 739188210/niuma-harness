const test = require('node:test');
const { parseArgs } = require('../src/args');
const { runRepair } = require('../src/repair');
const { applyRepairPlan, rollback: realRollback } = require('../src/repair/apply');
const { copyNodeNoFollow, verifyNodeCopy } = require('../src/repair/backup');
const {
  allCommandFiles,
  assert,
  fs,
  path,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');

function initDamagedWorkspace() {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  fs.appendFileSync(path.join(workspace, '.claude', 'commands', allCommandFiles[0]), 'drift\n');
  return workspace;
}

function repairOptions(workspace, extra = []) {
  return parseArgs(['repair', workspace, ...extra]);
}

test('apply repair rolls back an earlier replacement when a later action is unsupported', () => {
  const targetDir = tempDir();
  const backupRoot = tempDir();
  const targetPath = path.join(targetDir, 'managed.txt');
  const original = Buffer.from('original\n');
  fs.writeFileSync(targetPath, original);
  fs.mkdirSync(path.join(backupRoot, 'files'), { recursive: true });
  fs.writeFileSync(path.join(backupRoot, 'files', 'managed.txt'), original);

  assert.throws(
    () => applyRepairPlan({
      backupRoot,
      operations: [
        {
          action: 'replace-file',
          targetPath,
          relativePath: 'managed.txt',
          content: Buffer.from('replacement\n'),
          requiresBackup: true,
        },
        {
          action: 'unsupported-action',
          targetPath: path.join(targetDir, 'unsupported.txt'),
          relativePath: 'unsupported.txt',
          requiresBackup: false,
        },
      ],
    }),
    /Unknown repair action: unsupported-action/
  );

  assert.deepStrictEqual(fs.readFileSync(targetPath), original);
});

test('write-file removes a partially created target when writing a missing file fails', () => {
  const targetDir = tempDir();
  const backupRoot = tempDir();
  const targetPath = path.join(targetDir, 'created', 'managed.txt');

  assert.throws(
    () => applyRepairPlan({
      backupRoot,
      operations: [{
        action: 'write-file',
        targetPath,
        relativePath: 'created/managed.txt',
        content: Buffer.from('replacement\n'),
        requiresBackup: false,
      }],
    }, {
      writeFile: (filePath) => {
        fs.writeFileSync(filePath, 'partial mutation\n');
        throw new Error('injected partial create failure');
      },
    }),
    /injected partial create failure/
  );
  assert.strictEqual(fs.existsSync(targetPath), false);
});

test('write-file restores its partially mutated target when writing fails', () => {
  const targetDir = tempDir();
  const backupRoot = tempDir();
  const targetPath = path.join(targetDir, 'managed.txt');
  const original = Buffer.from('original\n');
  fs.writeFileSync(targetPath, original);
  fs.mkdirSync(path.join(backupRoot, 'files'), { recursive: true });
  fs.writeFileSync(path.join(backupRoot, 'files', 'managed.txt'), original);

  assert.throws(
    () => applyRepairPlan({
      backupRoot,
      operations: [{
        action: 'write-file',
        targetPath,
        relativePath: 'managed.txt',
        content: Buffer.from('replacement\n'),
        requiresBackup: true,
      }],
    }, {
      writeFile: (filePath) => {
        fs.writeFileSync(filePath, 'partial mutation\n');
        throw new Error('injected partial write failure');
      },
    }),
    /injected partial write failure/
  );
  assert.deepStrictEqual(fs.readFileSync(targetPath), original);
});

test('replace-file restores its own removed target when writing the replacement fails', () => {
  const targetDir = tempDir();
  const backupRoot = tempDir();
  const targetPath = path.join(targetDir, 'managed.txt');
  const original = Buffer.from('original\n');
  fs.writeFileSync(targetPath, original);
  fs.mkdirSync(path.join(backupRoot, 'files'), { recursive: true });
  fs.writeFileSync(path.join(backupRoot, 'files', 'managed.txt'), original);

  assert.throws(
    () => applyRepairPlan({
      backupRoot,
      operations: [{
        action: 'replace-file',
        targetPath,
        relativePath: 'managed.txt',
        content: Buffer.from('replacement\n'),
        requiresBackup: true,
      }],
    }, {
      writeFile: () => { throw new Error('injected write failure'); },
    }),
    /injected write failure/
  );
  assert.deepStrictEqual(fs.readFileSync(targetPath), original);
});

test('replace-directory restores its own removed target when recreation fails', () => {
  const targetDir = tempDir();
  const backupRoot = tempDir();
  const targetPath = path.join(targetDir, 'managed');
  fs.mkdirSync(targetPath);
  fs.writeFileSync(path.join(targetPath, 'original.txt'), 'original\n');
  fs.mkdirSync(path.join(backupRoot, 'files'), { recursive: true });
  fs.cpSync(targetPath, path.join(backupRoot, 'files', 'managed'), { recursive: true });

  assert.throws(
    () => applyRepairPlan({
      backupRoot,
      operations: [{
        action: 'replace-directory',
        targetPath,
        relativePath: 'managed',
        requiresBackup: true,
      }],
    }, {
      makeDirectory: () => { throw new Error('injected mkdir failure'); },
    }),
    /injected mkdir failure/
  );
  assert.strictEqual(fs.readFileSync(path.join(targetPath, 'original.txt'), 'utf8'), 'original\n');
});

test('backup verification compares relevant file and directory mode bits', () => {
  if (process.platform === 'win32') return;
  const root = tempDir();
  const source = path.join(root, 'source');
  const destination = path.join(root, 'destination');
  fs.mkdirSync(source, { mode: 0o777 });
  fs.chmodSync(source, 0o777);
  fs.writeFileSync(path.join(source, 'file.txt'), 'same bytes\n', { mode: 0o640 });
  copyNodeNoFollow(source, destination);
  verifyNodeCopy(source, destination);

  fs.chmodSync(destination, 0o755);
  assert.throws(() => verifyNodeCopy(source, destination), /mode verification failed/i);
  fs.chmodSync(destination, 0o777);
  fs.chmodSync(path.join(destination, 'file.txt'), 0o644);
  assert.throws(() => verifyNodeCopy(source, destination), /mode verification failed/i);
});

test('repair cancellation skips all repair stages and leaves the source tree unchanged', async () => {
  const workspace = initDamagedWorkspace();
  const before = snapshotTree(workspace);
  const calls = [];
  const output = [];
  const originalLog = console.log;
  console.log = (...values) => output.push(values.join(' '));

  try {
    await runRepair(repairOptions(workspace), {
      confirmRepair: async () => {
        calls.push('confirm');
        return false;
      },
      createVerifiedBackup: () => calls.push('backup'),
      revalidateOperations: () => calls.push('revalidate'),
      applyRepairPlan: () => calls.push('apply'),
      inspectHarness: () => {
        calls.push('doctor');
        return { errors: [] };
      },
      rollback: () => calls.push('rollback'),
    });
  } finally {
    console.log = originalLog;
  }

  assert.deepStrictEqual(calls, ['confirm']);
  assert.deepStrictEqual(snapshotTree(workspace), before);
  assert.ok(output.some((line) => line.includes('Repair cancelled. No files changed.')));
});

test('confirmed repair invokes injectable orchestration stages in production order', async () => {
  const workspace = initDamagedWorkspace();
  let confirmations = 0;
  const stages = [];
  const originalLog = console.log;
  console.log = () => {};

  try {
    await runRepair(repairOptions(workspace), {
      confirmRepair: async () => {
        confirmations += 1;
        return true;
      },
      createVerifiedBackup: () => stages.push('backup'),
      revalidateOperations: () => stages.push('revalidate'),
      applyRepairPlan: () => stages.push('apply'),
      inspectHarness: () => {
        stages.push('doctor');
        return { errors: [] };
      },
      rollback: () => stages.push('rollback'),
      printRepairPlan: () => {},
      printRepairSuccess: () => stages.push('success'),
    });
  } finally {
    console.log = originalLog;
  }

  assert.strictEqual(confirmations, 1);
  assert.deepStrictEqual(stages, ['backup', 'revalidate', 'apply', 'doctor', 'success']);
});

test('repair --yes bypasses injected confirmation', async () => {
  const workspace = initDamagedWorkspace();
  let confirmations = 0;
  const originalLog = console.log;
  console.log = () => {};

  try {
    await runRepair(repairOptions(workspace, ['--yes']), {
      confirmRepair: async () => {
        confirmations += 1;
        return true;
      },
      createVerifiedBackup: () => {},
      revalidateOperations: () => {},
      applyRepairPlan: () => {},
      inspectHarness: () => ({ errors: [] }),
      printRepairPlan: () => {},
      printRepairSuccess: () => {},
    });
  } finally {
    console.log = originalLog;
  }

  assert.strictEqual(confirmations, 0);
});

test('repair backup failure prevents later stages and leaves the source tree unchanged', async () => {
  const workspace = initDamagedWorkspace();
  const before = snapshotTree(workspace);
  const stages = [];
  const originalLog = console.log;
  console.log = () => {};

  try {
    await assert.rejects(
      runRepair(repairOptions(workspace, ['--yes']), {
        createVerifiedBackup: () => {
          stages.push('backup');
          throw new Error('injected backup failure');
        },
        revalidateOperations: () => stages.push('revalidate'),
        applyRepairPlan: () => stages.push('apply'),
        inspectHarness: () => {
          stages.push('doctor');
          return { errors: [] };
        },
        printRepairSuccess: () => stages.push('success'),
      }),
      /injected backup failure/
    );
  } finally {
    console.log = originalLog;
  }

  assert.deepStrictEqual(stages, ['backup']);
  assert.deepStrictEqual(snapshotTree(workspace), before);
});

test('repair revalidation failure retains a verified backup without applying changes', async () => {
  const workspace = initDamagedWorkspace();
  const repairId = '20260712T000000Z-revalidate';
  const damagedCommand = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  const stages = [];
  const originalLog = console.log;
  console.log = () => {};

  try {
    await assert.rejects(
      runRepair(repairOptions(workspace, ['--yes']), {
        now: () => new Date('2026-07-12T00:00:00.000Z'),
        createRepairId: () => repairId,
        revalidateOperations: () => {
          stages.push('revalidate');
          throw new Error('injected revalidation failure');
        },
        applyRepairPlan: () => stages.push('apply'),
        inspectHarness: () => {
          stages.push('doctor');
          return { errors: [] };
        },
        printRepairSuccess: () => stages.push('success'),
      }),
      /injected revalidation failure/
    );
  } finally {
    console.log = originalLog;
  }

  const backupRoot = path.join(fs.realpathSync(workspace), '.niuma-harness', 'repairs', repairId);
  const backedUpCommand = path.join(backupRoot, 'files', '.claude', 'commands', allCommandFiles[0]);
  assert.deepStrictEqual(stages, ['revalidate']);
  assert.deepStrictEqual(fs.readFileSync(damagedCommand), fs.readFileSync(backedUpCommand));
  assert.ok(fs.existsSync(path.join(backupRoot, 'repair-manifest.json')));
});

test('repair apply failure stops orchestration before Doctor, rollback, and success', async () => {
  const workspace = initDamagedWorkspace();
  const stages = [];
  const originalLog = console.log;
  console.log = () => {};

  try {
    await assert.rejects(
      runRepair(repairOptions(workspace, ['--yes']), {
        createVerifiedBackup: () => stages.push('backup'),
        revalidateOperations: () => stages.push('revalidate'),
        applyRepairPlan: () => {
          stages.push('apply');
          throw new Error('injected apply failure');
        },
        inspectHarness: () => {
          stages.push('doctor');
          return { errors: [] };
        },
        rollback: () => stages.push('rollback'),
        printRepairSuccess: () => stages.push('success'),
      }),
      /injected apply failure/
    );
  } finally {
    console.log = originalLog;
  }

  assert.deepStrictEqual(stages, ['backup', 'revalidate', 'apply']);
});

test('repair Doctor failure restores the original rule and manifest while retaining the permanent backup', async () => {
  const workspace = initDamagedWorkspace();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifestBytes = fs.readFileSync(manifestPath);
  const rulePath = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  fs.writeFileSync(rulePath, 'damaged rule before repair\n');
  const ruleBytes = fs.readFileSync(rulePath);
  const repairId = '20260712T000000Z-rule-doctor';
  const originalLog = console.log;
  console.log = () => {};

  try {
    await assert.rejects(
      runRepair(repairOptions(workspace, ['--yes']), {
        now: () => new Date('2026-07-12T00:00:00.000Z'),
        createRepairId: () => repairId,
        inspectHarness: () => ({ errors: ['injected Doctor failure'] }),
      }),
      /Original state restored from backup/
    );
  } finally {
    console.log = originalLog;
  }

  const backupRoot = path.join(fs.realpathSync(workspace), '.niuma-harness', 'repairs', repairId);
  assert.deepStrictEqual(fs.readFileSync(rulePath), ruleBytes);
  assert.deepStrictEqual(fs.readFileSync(manifestPath), manifestBytes);
  assert.deepStrictEqual(fs.readFileSync(path.join(backupRoot, 'files', '.claude', 'rules', 'common', 'testing.md')), ruleBytes);
  assert.ok(fs.existsSync(path.join(backupRoot, 'repair-manifest.json')));
});

test('repair Doctor failure restores the original command and retains the permanent backup', async () => {
  const workspace = initDamagedWorkspace();
  const repairId = '20260712T000000Z-doctor';
  const damagedCommand = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  const damagedBytes = fs.readFileSync(damagedCommand);
  const rollbackCalls = [];
  const stages = [];
  const originalLog = console.log;
  console.log = () => {};

  try {
    await assert.rejects(
      runRepair(repairOptions(workspace, ['--yes']), {
        now: () => new Date('2026-07-12T00:00:00.000Z'),
        createRepairId: () => repairId,
        inspectHarness: () => ({ errors: ['injected Doctor failure'] }),
        rollback: (plan, operations) => {
          rollbackCalls.push([plan, operations]);
          return realRollback(plan, operations);
        },
        printRepairSuccess: () => stages.push('success'),
      }),
      /Repair validation failed: injected Doctor failure\. Original state restored from backup\./
    );
  } finally {
    console.log = originalLog;
  }

  const backupRoot = path.join(fs.realpathSync(workspace), '.niuma-harness', 'repairs', repairId);
  assert.strictEqual(rollbackCalls.length, 1);
  assert.deepStrictEqual(fs.readFileSync(damagedCommand), damagedBytes);
  assert.ok(fs.existsSync(path.join(backupRoot, 'repair-manifest.json')));
  assert.deepStrictEqual(stages, []);
});
