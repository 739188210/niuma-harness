const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  assertFile,
  assertNoPath,
  fs,
  getCommandId,
  path,
  read,
  readJson,
  run,
  tempDir,
  updateManifest,
} = require('./helpers');

const primaryCommand = allCommandFiles[0];
const primaryCommandId = getCommandId(primaryCommand);
const primarySkill = allSkillDirs[0];

function writeSelectedSkill(workspace, content) {
  const skillPath = path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md');
  fs.writeFileSync(skillPath, content, 'utf8');
  return skillPath;
}

test('doctor fails when skills is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    delete manifest.skills;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when skills is missing');
  assert.match(result.stdout, /missing skills/);
});

test('doctor fails when skills is a string', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.skills = primarySkill;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when skills is a string');
  assert.match(result.stdout, /skills must be an array/);
});

test('doctor fails when skills contains an unknown directory', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.skills = ['unknown'];
  });
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

test('doctor passes for ZenTao with only the distributed example config', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
  assert.strictEqual(init.status, 0, init.stderr);
  const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
  assertFile(path.join(skillRoot, 'zentao.config.example.json'));
  assertNoPath(path.join(skillRoot, 'zentao.config.json'));

  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
});

test('doctor requires the ZenTao example but ignores the local config', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
  assert.strictEqual(init.status, 0, init.stderr);
  const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
  fs.writeFileSync(path.join(skillRoot, 'zentao.config.json'), '{"local": true}\n', 'utf8');
  fs.unlinkSync(path.join(skillRoot, 'zentao.config.example.json'));

  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should require the distributed ZenTao example');
  assert.match(result.stdout, /missing \.claude\/skills\/zentao-bug-workflow\/zentao\.config\.example\.json/);
  assert.doesNotMatch(result.stdout, /missing .*zentao\.config\.json/);
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

test('doctor fails when schemaVersion 2 artifacts are missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    delete manifest.artifacts;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should require the ownership ledger');
  assert.match(result.stdout, /artifacts must be an array/);
});

test('doctor fails when a command artifact record is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  let missing;
  updateManifest(workspace, (manifest) => {
    missing = manifest.artifacts.shift();
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should require every expected command record');
  assert.match(result.stdout, new RegExp(`missing command artifact record ${missing.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('doctor fails when an owned command artifact drifts by one byte', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifest = readJson(path.join(workspace, 'harness', 'manifest.json'));
  const record = manifest.artifacts[0];
  const targetPath = path.join(workspace, ...record.target.split('/'));
  fs.appendFileSync(targetPath, 'x');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should detect exact-byte drift');
  assert.match(result.stdout, /artifact drifted/);
  assert.match(result.stdout, new RegExp(record.digest));
});

test('doctor fails when artifact ledger contains duplicate targets', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.artifacts.push({ ...manifest.artifacts[0] });
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should reject duplicate ownership');
  assert.match(result.stdout, /duplicate artifact target/);
});

test('doctor rejects schemaVersion 1 without migration', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.schemaVersion = 1;
    delete manifest.artifacts;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should reject schemaVersion 1');
  assert.match(result.stdout, /unsupported schemaVersion: 1/);
});

test('doctor fails when commands is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    delete manifest.commands;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when commands is missing');
  assert.match(result.stdout, /missing commands/);
});

test('doctor fails when commands is a string', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.commands = primaryCommand;
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when commands is a string');
  assert.match(result.stdout, /commands must be an array/);
});

test('doctor fails when commands contains an unknown file', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.commands = ['unknown.md'];
  });
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
  updateManifest(workspace, (manifest) => {
    manifest.rules = 'copy';
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when rules is a string');
  assert.match(result.stdout, /rules must be an array/);
});

test('doctor fails when rules contains an unknown directory', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  updateManifest(workspace, (manifest) => {
    manifest.rules = ['unknown'];
  });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when rules contains an unknown directory');
  assert.match(result.stdout, /invalid rules/);
});

test('doctor fails when a selected rule file is missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--rules', 'common']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, '.claude', 'rules', 'common', 'testing.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a selected rule file is missing');
  assert.match(result.stdout, /missing artifact \.claude\/rules\/common\/testing\.md/);
});

test('doctor fails when opencode rules instructions are missing', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'opencode.json'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when opencode rule instructions are missing');
  assert.match(result.stdout, /missing opencode\.json rules instructions/);
});

test('doctor honors custom harness-dir in native rule adapter checks', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'multi', '--harness-dir', 'ai-harness']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK artifact intact \.claude\/rules\/common\/testing\.md/);
  assert.match(result.stdout, /OK opencode\.json rules instructions/);
});

test('doctor does not require codex .codex rules', () => {
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(workspace, '.codex', 'rules')), 'codex rules directory should not be generated');
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
