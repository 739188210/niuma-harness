const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  fs,
  getCommandId,
  path,
  read,
  readJson,
  run,
  tempDir,
} = require('./helpers');

const primaryCommand = allCommandFiles[0];
const primaryCommandId = getCommandId(primaryCommand);
const primarySkill = allSkillDirs[0];

function writeSelectedSkill(workspace, content) {
  const skillPath = path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md');
  fs.writeFileSync(skillPath, content, 'utf8');
  return skillPath;
}

test('doctor passes on a valid harness', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /OK manifest\.json/);
  assert.match(result.stdout, /OK docs\/layers\/01-context\.md/);
  assert.match(result.stdout, /OK docs\/policy\/action-boundary\.md/);
  assert.match(result.stdout, /OK docs\/policy\/untrusted-content\.md/);
  assert.match(result.stdout, /OK docs\/process\/refactor\.md/);
  assert.match(result.stdout, /OK docs\/process\/review\.md/);
  assert.match(result.stdout, /OK docs\/process\/release\.md/);
  assert.match(result.stdout, /OK agent-work\//);
  assert.match(result.stdout, /OK agent-work\/README\.md/);
  assert.match(result.stdout, /OK agent-work\/tasks\//);
});

test('check alias runs the same validation', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['check', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
});

test('doctor works when pointed at the harness subdir', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', path.join(workspace, 'harness')]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
});

test('doctor works with a custom harness-dir', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'multi', '--harness-dir', 'ai-harness']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
});

test('doctor fails without a manifest', () => {
  const workspace = tempDir();
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail without manifest');
  assert.match(result.stdout, /missing manifest\.json/);
});

test('doctor fails on invalid JSON manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(path.join(workspace, 'harness', 'manifest.json'), '{bad json', 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail on invalid JSON');
  assert.match(result.stdout, /invalid manifest\.json/);
});

test('doctor fails when an entry file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'CLAUDE.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when entry file is missing');
  assert.match(result.stdout, /missing entry file CLAUDE\.md/);
});

test('doctor reports the entry contract zone intact on a fresh init', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /contract intact in CLAUDE\.md/);
});

test('doctor tolerates CRLF line endings in the entry contract', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const body = read(entry).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  fs.writeFileSync(entry, body, 'utf8');
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /contract intact in CLAUDE\.md/);
});

test('doctor fails when the entry contract zone is tampered', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const body = read(entry).replace('Operating Loop', 'Operating Loop (hacked)');
  fs.writeFileSync(entry, body, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when the contract zone is tampered');
  assert.match(result.stdout, /contract zone drifted in CLAUDE\.md/);
});

test('doctor leaves a user-managed entry without contract markers alone', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(path.join(workspace, 'CLAUDE.md'), 'my own entry\n', 'utf8');
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /contract/);
});

test('doctor fails when a layer memo is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'layers', '05-recovery.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a layer memo is missing');
  assert.match(result.stdout, /missing docs\/layers\/05-recovery\.md/);
});

test('doctor fails when action-boundary is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'policy', 'action-boundary.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when action boundary policy is missing');
  assert.match(result.stdout, /missing docs\/policy\/action-boundary\.md/);
});

test('doctor fails when secret-leak is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'policy', 'secret-leak.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when secret leak policy is missing');
  assert.match(result.stdout, /missing docs\/policy\/secret-leak\.md/);
});

test('doctor fails when untrusted-content is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'policy', 'untrusted-content.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when untrusted content policy is missing');
  assert.match(result.stdout, /missing docs\/policy\/untrusted-content\.md/);
});

test('doctor fails when a process playbook is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'process', 'review.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a process playbook is missing');
  assert.match(result.stdout, /missing docs\/process\/review\.md/);
});

test('doctor checks templateFiles declared in package manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'automation', 'automation-intent.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a manifest template file is missing');
  assert.match(result.stdout, /missing docs\/automation\/automation-intent\.md/);
});

test('doctor fails when agent-work is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, 'agent-work'), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work is missing');
  assert.match(result.stdout, /missing agent-work\//);
});

test('doctor fails when agent-work README is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'agent-work', 'README.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work README is missing');
  assert.match(result.stdout, /missing agent-work\/README\.md/);
});

test('doctor fails when agent-work tasks directory is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, 'agent-work', 'tasks'), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work tasks directory is missing');
  assert.match(result.stdout, /missing agent-work\/tasks\//);
});

test('doctor fails when workDir is missing from manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  delete manifest.workDir;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when workDir is missing');
  assert.match(result.stdout, /missing workDir/);
});

test('doctor fails when skills is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  delete manifest.skills;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when skills is missing');
  assert.match(result.stdout, /missing skills/);
});

test('doctor fails when skills is a string', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.skills = primarySkill;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when skills is a string');
  assert.match(result.stdout, /skills must be an array/);
});

test('doctor fails when skills contains an unknown directory', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.skills = ['unknown'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when skills contains an unknown directory');
  assert.match(result.stdout, /invalid skills/);
});

test('doctor passes with selected skills and ignores unknown user skills', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  const localSkill = path.join(workspace, '.claude', 'skills', 'local-user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(localSkill), { recursive: true });
  fs.writeFileSync(localSkill, 'local skill\n', 'utf8');
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`skills ${primarySkill}`));
});

test('doctor fails when a selected skill file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a selected skill file is missing');
  assert.match(result.stdout, new RegExp(`missing \\.claude/skills/${primarySkill}/SKILL\\.md`));
});

test('doctor fails when a multi selected skill target is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'multi', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, '.opencode', 'skills', primarySkill), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when one multi skill target is missing');
  assert.match(result.stdout, new RegExp(`missing \\.opencode/skills/${primarySkill}/`));
});

test('doctor fails when commands is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  delete manifest.commands;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when commands is missing');
  assert.match(result.stdout, /missing commands/);
});

test('doctor fails when commands is a string', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.commands = primaryCommand;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when commands is a string');
  assert.match(result.stdout, /commands must be an array/);
});

test('doctor fails when commands contains an unknown file', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.commands = ['unknown.md'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when commands contains an unknown file');
  assert.match(result.stdout, /invalid commands/);
});

test('doctor fails when a command file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, '.claude', 'commands', primaryCommand));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a command file is missing');
  assert.match(result.stdout, new RegExp(`missing \\.claude/commands/${primaryCommand}`));
});

test('doctor fails when a codex command skill file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, '.agents', 'skills', primaryCommandId, 'SKILL.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a codex command skill file is missing');
  assert.match(result.stdout, new RegExp(`missing \.agents/skills/${primaryCommandId}/SKILL\.md`));
});

test('doctor fails when a codex command openai metadata file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, '.agents', 'skills', primaryCommandId, 'agents', 'openai.yaml'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a codex command metadata file is missing');
  assert.match(result.stdout, new RegExp(`missing \.agents/skills/${primaryCommandId}/agents/openai\.yaml`));
});

test('doctor fails when a codex command skill frontmatter is invalid', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(
    path.join(workspace, '.agents', 'skills', primaryCommandId, 'SKILL.md'),
    '---\nname: wrong-command\ndescription: Valid description\n---\n\n# Body\n',
    'utf8'
  );
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when codex command skill metadata is invalid');
  assert.match(result.stdout, new RegExp(`name mismatch in \.agents/skills/${primaryCommandId}/SKILL\.md frontmatter: expected ${primaryCommandId}, got wrong-command`));
});

test('doctor fails when selected skill frontmatter is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  writeSelectedSkill(workspace, '# Skill without frontmatter\n');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when selected skill frontmatter is missing');
  assert.match(result.stdout, new RegExp(`missing frontmatter in \\.claude/skills/${primarySkill}/SKILL\\.md`));
});

test('doctor fails when selected skill name is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  writeSelectedSkill(workspace, '---\ndescription: Valid description\n---\n\n# Body\n');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when selected skill name is missing');
  assert.match(result.stdout, new RegExp(`missing name in \\.claude/skills/${primarySkill}/SKILL\\.md frontmatter`));
});

test('doctor fails when selected skill description is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  writeSelectedSkill(workspace, `---\nname: ${primarySkill}\n---\n\n# Body\n`);
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when selected skill description is missing');
  assert.match(result.stdout, new RegExp(`missing description in \\.claude/skills/${primarySkill}/SKILL\\.md frontmatter`));
});

test('doctor fails when selected skill name does not match directory', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  writeSelectedSkill(workspace, '---\nname: wrong-skill\ndescription: Valid description\n---\n\n# Body\n');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when selected skill name does not match directory');
  assert.match(result.stdout, new RegExp(`name mismatch in \\.claude/skills/${primarySkill}/SKILL\\.md frontmatter: expected ${primarySkill}, got wrong-skill`));
});

test('doctor fails when selected skill body is empty', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(init.status, 0, init.stderr);
  writeSelectedSkill(workspace, `---\nname: ${primarySkill}\ndescription: Valid description\n---\n\n`);
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when selected skill body is empty');
  assert.match(result.stdout, new RegExp(`empty body in \\.claude/skills/${primarySkill}/SKILL\\.md`));
});

test('doctor fails when rules is a string', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = 'copy';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when rules is a string');
  assert.match(result.stdout, /rules must be an array/);
});

test('doctor fails when rules contains an unknown directory', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = ['unknown'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when rules contains an unknown directory');
  assert.match(result.stdout, /invalid rules/);
});

test('doctor fails when a selected rule file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--rules', 'common']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'rules', 'common', 'testing.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a selected rule file is missing');
  assert.match(result.stdout, /missing docs\/rules\/common\/testing\.md/);
});

test('doctor fails when a selected agent-specific rule file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'rules', 'claude', 'hooks.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a selected agent rule file is missing');
  assert.match(result.stdout, /missing docs\/rules\/claude\/hooks\.md/);
});

test('doctor does not modify the manifest', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const before = read(manifestPath);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(manifestPath), before, 'doctor should not modify manifest');
});
