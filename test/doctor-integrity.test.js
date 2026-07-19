const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  fs,
  path,
  read,
  run,
  tempDir,
  updateManifest,
} = require('./helpers');

function initWorkspace(agent = 'claude', extra = []) {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', agent, ...extra]);
  assert.strictEqual(init.status, 0, init.stderr);
  return workspace;
}

function doctor(workspace, extra = []) {
  return run(['doctor', workspace, ...extra]);
}

function expectDoctorError(workspace, pattern, extra = []) {
  const result = doctor(workspace, extra);
  assert.notStrictEqual(result.status, 0, 'doctor should fail');
  assert.match(result.stdout, pattern);
  return result;
}

function append(filePath, content = '\nDRIFT\n') {
  fs.appendFileSync(filePath, content, 'utf8');
}

test('doctor binds manifest identity and actual harness directory', () => {
  const workspace = initWorkspace('claude', ['--harness-dir', 'ai-harness']);
  updateManifest(workspace, (manifest) => {
    manifest.createdBy = 'other';
    manifest.harnessDir = 'harness';
  }, 'ai-harness');
  const result = expectDoctorError(workspace, /createdBy must be niuma-harness/, ['--harness-dir', 'ai-harness']);
  assert.match(result.stdout, /harnessDir must match actual harness root: ai-harness/);
});

test('doctor binds workDir entryFiles and commands to package and agent', () => {
  const workspace = initWorkspace();
  updateManifest(workspace, (manifest) => {
    manifest.workDir = 'other-work';
    manifest.entryFiles = [];
    manifest.commands = [];
  });
  const result = expectDoctorError(workspace, /workDir must match package manifest: agent-work/);
  assert.match(result.stdout, /entryFiles must match agent claude: CLAUDE\.md/);
  assert.match(result.stdout, /invalid commands: must match package and agent claude/);
});

test('doctor rejects non-object manifests and malformed entryFiles without uncaught errors', () => {
  const workspace = initWorkspace();
  fs.writeFileSync(path.join(workspace, 'harness', 'manifest.json'), '[]\n', 'utf8');
  let result = expectDoctorError(workspace, /manifest\.json must contain a JSON object/);
  assert.strictEqual(result.stderr, '');

  const workspace2 = initWorkspace();
  updateManifest(workspace2, (manifest) => {
    manifest.entryFiles = [null];
  });
  result = expectDoctorError(workspace2, /entryFiles must match agent claude: CLAUDE\.md/);
  assert.strictEqual(result.stderr, '');
});

test('doctor preserves rules selection semantics and rejects stale excluded surfaces', () => {
  const noneWorkspace = initWorkspace('claude', ['--rules', 'none']);
  assert.strictEqual(doctor(noneWorkspace).status, 0);
  const staleRule = path.join(noneWorkspace, '.claude', 'rules', 'common', 'testing.md');
  fs.mkdirSync(path.dirname(staleRule), { recursive: true });
  fs.writeFileSync(staleRule, 'stale\n', 'utf8');
  expectDoctorError(noneWorkspace, /unexpected managed content \.claude\/rules\/common\/testing\.md/);

  const excludedWorkspace = initWorkspace('claude', ['--rules-out', 'web']);
  const manifest = JSON.parse(read(path.join(excludedWorkspace, 'harness', 'manifest.json')));
  assert.ok(!manifest.rules.includes('web'));
  const stalePointer = path.join(excludedWorkspace, '.claude', 'rules', 'web', 'testing.md');
  fs.mkdirSync(path.dirname(stalePointer), { recursive: true });
  fs.writeFileSync(stalePointer, 'stale\n', 'utf8');
  expectDoctorError(excludedWorkspace, /unexpected managed content \.claude\/rules\/web\/testing\.md/);
});

test('doctor rejects known files from unselected skills but preserves local files', () => {
  const workspace = initWorkspace('claude', ['--skills', 'none']);
  const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
  fs.mkdirSync(skillRoot, { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'zentao.config.json'), '{"local":true}\n', 'utf8');
  assert.strictEqual(doctor(workspace).status, 0);
  fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), 'stale\n', 'utf8');
  expectDoctorError(workspace, /unexpected managed content \.claude\/skills\/zentao-bug-workflow\/SKILL\.md/);
});

test('doctor detects exact drift in tool-managed core and work templates', () => {
  const workspace = initWorkspace();
  append(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'));
  append(path.join(workspace, 'agent-work', 'README.md'));
  const result = expectDoctorError(workspace, /managed content drifted docs\/layers\/01-context\.md/);
  assert.match(result.stdout, /managed content drifted agent-work\/README\.md/);
});

test('doctor detects decision-guide drift but ignores project-maintained ADRs', () => {
  const workspace = initWorkspace();
  const decisions = path.join(workspace, 'harness', 'docs', 'decisions');
  const projectAdr = path.join(decisions, '0001-example.md');
  fs.writeFileSync(projectAdr, '# Project ADR\n\nInitial project decision.\n', 'utf8');
  fs.appendFileSync(projectAdr, 'Updated project rationale.\n', 'utf8');
  let result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);

  append(path.join(decisions, 'README.md'));
  result = expectDoctorError(workspace, /managed content drifted docs\/decisions\/README\.md/);
  assert.doesNotMatch(result.stdout, /0001-example\.md/);
});

test('doctor detects experience-guide drift but ignores project-maintained experience records', () => {
  const workspace = initWorkspace();
  const experience = path.join(workspace, 'harness', 'docs', 'experience');
  const projectRecord = path.join(experience, 'pagination.md');
  fs.writeFileSync(projectRecord, '# Pagination lesson\n\nInitial project experience.\n', 'utf8');
  fs.appendFileSync(projectRecord, 'Updated project experience.\n', 'utf8');
  let result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);

  append(path.join(experience, 'README.md'));
  result = expectDoctorError(workspace, /managed content drifted docs\/experience\/README\.md/);
  assert.doesNotMatch(result.stdout, /pagination\.md/);
});

test('doctor detects exact drift in selected skill package files', () => {
  const skill = allSkillDirs[0];
  const workspace = initWorkspace('claude', ['--skills', skill]);
  append(path.join(workspace, '.claude', 'skills', skill, 'SKILL.md'));
  expectDoctorError(workspace, new RegExp(`managed content drifted \\.claude/skills/${skill}/SKILL\\.md`));
});

test('doctor detects exact drift in native Claude rules and OpenCode managed paths', () => {
  const claudeWorkspace = initWorkspace();
  append(path.join(claudeWorkspace, '.claude', 'rules', 'common', 'testing.md'));
  expectDoctorError(claudeWorkspace, /artifact drifted \.claude\/rules\/common\/testing\.md/);

  const openCodeWorkspace = initWorkspace('opencode');
  const configPath = path.join(openCodeWorkspace, 'opencode.json');
  const config = JSON.parse(read(configPath));
  config.instructions = config.instructions.filter((item) => !item.endsWith('/common/testing.md'));
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  expectDoctorError(openCodeWorkspace, /must contain \.opencode\/rules\/common\/testing\.md exactly once/);
});

test('doctor compares current command artifacts against package rendering even with a forged ledger', () => {
  const workspace = initWorkspace();
  const command = allCommandFiles[0];
  const target = path.join(workspace, '.claude', 'commands', command);
  append(target, 'FORGED');
  updateManifest(workspace, (manifest) => {
    const record = manifest.artifacts.find((item) => item.target === `.claude/commands/${command}`);
    const crypto = require('crypto');
    record.digest = `sha256:${crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')}`;
  });
  expectDoctorError(workspace, new RegExp(`managed content drifted \\.claude/commands/${command.replace('.', '\\.')}`));
});

test('doctor excludes user-maintained project context entry free content local config and unknown files', () => {
  const workspace = initWorkspace('claude', ['--skills', 'zentao-bug-workflow']);
  append(path.join(workspace, 'harness', 'docs', 'project-context.md'));
  append(path.join(workspace, 'CLAUDE.md'), '\nUser free content\n');
  fs.writeFileSync(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'zentao.config.json'), '{"local":true}\n', 'utf8');
  fs.writeFileSync(path.join(workspace, 'unknown.txt'), 'unknown\n', 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor rejects duplicate and stale OpenCode managed paths', () => {
  const workspace = initWorkspace('opencode');
  const configPath = path.join(workspace, 'opencode.json');
  const config = JSON.parse(read(configPath));
  config.instructions.push(config.instructions[0]);
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  expectDoctorError(workspace, /exactly once/);
});

test('doctor rejects managed content reached through a parent symlink', () => {
  const workspace = initWorkspace();
  const docsRoot = path.join(workspace, 'harness', 'docs');
  const outside = path.join(tempDir(), 'docs');
  fs.cpSync(docsRoot, outside, { recursive: true });
  fs.rmSync(docsRoot, { recursive: true, force: true });
  fs.symlinkSync(outside, docsRoot, process.platform === 'win32' ? 'junction' : 'dir');
  expectDoctorError(workspace, /Refusing to write through symlink/);
});

test('doctor rejects inactive entry contracts but allows user-only inactive entries', () => {
  const workspace = initWorkspace();
  fs.copyFileSync(path.join(workspace, 'CLAUDE.md'), path.join(workspace, 'AGENTS.md'));
  expectDoctorError(workspace, /stale contract zone in AGENTS\.md/);
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), 'user notes\n', 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor rejects a drifted inactive entry contract', () => {
  const workspace = initWorkspace();
  const drifted = read(path.join(workspace, 'CLAUDE.md'))
    .replace('Niuma Harness — Operating Loop', 'Niuma Harness — Drifted Loop');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), drifted, 'utf8');
  expectDoctorError(workspace, /stale contract zone in AGENTS\.md/);
});

test('direct doctor ignores an inactive entry contract owned by another harness directory', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const otherHarnessEntry = read(path.join(workspace, 'CLAUDE.md'))
    .replaceAll('ai-harness/', 'harness/');
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), otherHarnessEntry, 'utf8');
  result = doctor(path.join(workspace, 'ai-harness'));
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor reports a non-file inactive entry without crashing', () => {
  const workspace = initWorkspace();
  fs.mkdirSync(path.join(workspace, 'AGENTS.md'));
  const result = expectDoctorError(workspace, /not a regular file entry file AGENTS\.md/);
  assert.strictEqual(result.stderr, '');
});

test('doctor validates selected rule records against canonical package descriptors', async (t) => {
  const cases = [
    {
      name: 'missing record',
      mutate({ manifest, record }) {
        manifest.artifacts = manifest.artifacts.filter((item) => item !== record);
      },
      expected: /missing rule artifact record \.claude\/rules\/common\/testing\.md/,
    },
    {
      name: 'wrong kind',
      mutate({ record }) { record.kind = 'command'; },
      expected: /invalid rule artifact record \.claude\/rules\/common\/testing\.md/,
    },
    {
      name: 'unknown source',
      mutate({ record }) { record.source = 'rules/common/unknown.md'; },
      expected: /invalid rule artifact record \.claude\/rules\/common\/testing\.md/,
    },
    {
      name: 'wrong target',
      mutate({ record }) { record.target = '.claude/rules/common/wrong.md'; },
      expected: /missing rule artifact record \.claude\/rules\/common\/testing\.md/,
    },
    {
      name: 'package digest mismatch',
      mutate({ record }) { record.digest = `sha256:${'0'.repeat(64)}`; },
      expected: /rule artifact package mismatch \.claude\/rules\/common\/testing\.md/,
    },
    {
      name: 'forged digest and forged file',
      mutate({ workspace, record }) {
        const forged = Buffer.from('forged rule body\n');
        fs.writeFileSync(path.join(workspace, ...record.target.split('/')), forged);
        record.digest = `sha256:${require('crypto').createHash('sha256').update(forged).digest('hex')}`;
      },
      expected: /rule artifact package mismatch \.claude\/rules\/common\/testing\.md/,
    },
    {
      name: 'disk drift',
      mutate({ workspace, record }) {
        fs.appendFileSync(path.join(workspace, ...record.target.split('/')), 'drift\n');
      },
      expected: /artifact drifted \.claude\/rules\/common\/testing\.md/,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      const workspace = initWorkspace();
      updateManifest(workspace, (manifest) => {
        const record = manifest.artifacts.find((item) => item.target === '.claude/rules/common/testing.md');
        scenario.mutate({ manifest, record, workspace });
      });
      expectDoctorError(workspace, scenario.expected);
    });
  }
});

test('doctor rejects duplicate and stale unselected rule records', async (t) => {
  await t.test('duplicate target', () => {
    const workspace = initWorkspace();
    updateManifest(workspace, (manifest) => {
      const record = manifest.artifacts.find((item) => item.kind === 'rule');
      manifest.artifacts.push({ ...record });
    });
    expectDoctorError(workspace, /duplicate artifact target/);
  });

  await t.test('stale unselected record', () => {
    const workspace = initWorkspace();
    updateManifest(workspace, (manifest) => {
      manifest.rules = manifest.rules.filter((rule) => rule !== 'common');
    });
    expectDoctorError(workspace, /inactive rule artifact record \.claude\/rules\/common\/testing\.md/);
  });
});

test('doctor rejects non-regular and linked selected rule targets', async (t) => {
  await t.test('directory target', () => {
    const workspace = initWorkspace();
    const target = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
    fs.rmSync(target);
    fs.mkdirSync(target);
    expectDoctorError(workspace, /not a regular artifact file \.claude\/rules\/common\/testing\.md/);
  });

  await t.test('symlink target', () => {
    const workspace = initWorkspace();
    const target = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
    const outside = path.join(tempDir(), 'testing.md');
    fs.writeFileSync(outside, read(target));
    fs.rmSync(target);
    fs.symlinkSync(outside, target);
    expectDoctorError(workspace, /Refusing to write through symlink/);
  });
});

test('doctor accepts unknown local files beside selected and unselected known rules', () => {
  const workspace = initWorkspace('claude', ['--rules-out', 'python']);
  const rulesRoot = path.join(workspace, '.claude', 'rules');
  fs.writeFileSync(path.join(rulesRoot, 'common', 'local.md'), 'selected local file\n');
  fs.mkdirSync(path.join(rulesRoot, 'python'), { recursive: true });
  fs.writeFileSync(path.join(rulesRoot, 'python', 'local.md'), 'unselected local file\n');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor uses the actual custom harness directory for rule descriptors in workspace and direct modes', () => {
  const workspace = initWorkspace('claude', ['--harness-dir', 'ai-harness']);
  let result = doctor(workspace, ['--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stdout);
  result = doctor(path.join(workspace, 'ai-harness'));
  assert.strictEqual(result.status, 0, result.stdout);

  updateManifest(workspace, (manifest) => {
    const record = manifest.artifacts.find((item) => item.target === '.claude/rules/common/testing.md');
    record.target = '.claude/rules/common/wrong.md';
  }, 'ai-harness');
  expectDoctorError(path.join(workspace, 'ai-harness'), /missing rule artifact record \.claude\/rules\/common\/testing\.md/);
});

test('doctor rejects inactive command artifact records', () => {
  const workspace = initWorkspace();
  updateManifest(workspace, (manifest) => {
    manifest.artifacts.push({
      kind: 'command',
      source: 'commands/dev-check.md',
      target: '.opencode/commands/dev-check.md',
      digest: manifest.artifacts[0].digest,
    });
  });
  expectDoctorError(workspace, /inactive command artifact record \.opencode\/commands\/dev-check\.md/);
});

test('doctor ignores OpenCode fields and user instruction paths', () => {
  const workspace = initWorkspace('opencode');
  const configPath = path.join(workspace, 'opencode.json');
  const config = JSON.parse(read(configPath));
  config.theme = 'user-theme';
  config.instructions = ['docs/team-rules.md', ...config.instructions, 'https://example.com/rules.md'];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});
