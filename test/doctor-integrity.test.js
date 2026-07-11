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
  const staleRule = path.join(noneWorkspace, 'harness', 'docs', 'rules', 'common', 'testing.md');
  fs.mkdirSync(path.dirname(staleRule), { recursive: true });
  fs.writeFileSync(staleRule, 'stale\n', 'utf8');
  expectDoctorError(noneWorkspace, /unexpected managed content docs\/rules\/common\/testing\.md/);

  const excludedWorkspace = initWorkspace('claude', ['--rules-out', 'claude']);
  const manifest = JSON.parse(read(path.join(excludedWorkspace, 'harness', 'manifest.json')));
  assert.ok(!manifest.rules.includes('claude'));
  const stalePointer = path.join(excludedWorkspace, '.claude', 'rules', 'niuma-claude.md');
  fs.writeFileSync(stalePointer, 'stale\n', 'utf8');
  expectDoctorError(excludedWorkspace, /unexpected managed content \.claude\/rules\/niuma-claude\.md/);
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

test('doctor detects exact drift in selected skill package files', () => {
  const skill = allSkillDirs[0];
  const workspace = initWorkspace('claude', ['--skills', skill]);
  append(path.join(workspace, '.claude', 'skills', skill, 'SKILL.md'));
  expectDoctorError(workspace, new RegExp(`managed content drifted \\.claude/skills/${skill}/SKILL\\.md`));
});

test('doctor detects exact drift in Claude pointers and OpenCode managed block', () => {
  const claudeWorkspace = initWorkspace();
  append(path.join(claudeWorkspace, '.claude', 'rules', 'niuma-common.md'));
  expectDoctorError(claudeWorkspace, /managed content drifted \.claude\/rules\/niuma-common\.md/);

  const openCodeWorkspace = initWorkspace('opencode');
  const configPath = path.join(openCodeWorkspace, 'opencode.json');
  fs.writeFileSync(configPath, read(configPath).replace('Do not duplicate rule text', 'Do not copy rule text'), 'utf8');
  expectDoctorError(openCodeWorkspace, /managed content drifted opencode\.json rules instructions/);
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

test('doctor excludes user-maintained docs entry free content local config unknown files and generated rules bodies', () => {
  const workspace = initWorkspace('claude', ['--skills', 'zentao-bug-workflow']);
  append(path.join(workspace, 'harness', 'docs', 'project-context.md'));
  append(path.join(workspace, 'harness', 'docs', 'automation', 'automation-intent.md'));
  append(path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md'));
  append(path.join(workspace, 'CLAUDE.md'), '\nUser free content\n');
  fs.writeFileSync(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'zentao.config.json'), '{"local":true}\n', 'utf8');
  fs.writeFileSync(path.join(workspace, 'unknown.txt'), 'unknown\n', 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});

test('doctor rejects extra or incomplete OpenCode managed markers', () => {
  const workspace = initWorkspace('opencode');
  const configPath = path.join(workspace, 'opencode.json');
  const config = JSON.parse(read(configPath));
  config.instructions = `<!-- niuma-harness:rules begin -->\n${config.instructions}`;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  expectDoctorError(workspace, /managed content drifted opencode\.json rules instructions/);

  const noneWorkspace = initWorkspace('opencode', ['--rules', 'none']);
  fs.writeFileSync(
    path.join(noneWorkspace, 'opencode.json'),
    '{"instructions":"<!-- niuma-harness:rules begin -->"}\n',
    'utf8'
  );
  expectDoctorError(noneWorkspace, /managed content drifted opencode\.json rules instructions/);
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

test('doctor ignores OpenCode fields and instructions outside the managed block', () => {
  const workspace = initWorkspace('opencode');
  const configPath = path.join(workspace, 'opencode.json');
  const config = JSON.parse(read(configPath));
  config.theme = 'user-theme';
  config.instructions = ['user instruction', config.instructions, 'another user instruction'];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  const result = doctor(workspace);
  assert.strictEqual(result.status, 0, result.stdout);
});
