const test = require('node:test');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  assertFile,
  assertManifest,
  assertNoPath,
  fs,
  getExpectedCommandArtifactTargets,
  path,
  read,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');
const { getEntryFilesForAgent } = require('../src/agents');
const { getSkillTargetRootsForAgent } = require('../src/skills');

const agents = ['claude', 'codex', 'opencode', 'multi'];

for (const from of agents) {
  for (const to of agents) {
    test(`agent switch ${from} -> ${to} converges managed surfaces`, () => {
      const workspace = tempDir();
      const skill = allSkillDirs[0];
      let result = run(['init', workspace, '--agent', from, '--skills', skill]);
      assert.strictEqual(result.status, 0, result.stderr);
      result = run(['init', workspace, '--agent', to, '--skills', skill]);
      assert.strictEqual(result.status, 0, result.stderr);

      const activeEntries = new Set(getEntryFilesForAgent(to));
      for (const entry of ['CLAUDE.md', 'AGENTS.md']) {
        const target = path.join(workspace, entry);
        if (activeEntries.has(entry)) {
          assertFile(target);
          assert.match(read(target), /niuma-harness:contract begin/);
        } else if (fs.existsSync(target)) {
          assert.doesNotMatch(read(target), /niuma-harness:contract/);
        }
      }

      const activeRoots = new Set(getSkillTargetRootsForAgent(to));
      for (const root of getSkillTargetRootsForAgent(from)) {
        const target = path.join(workspace, root, skill, 'SKILL.md');
        if (activeRoots.has(root)) {
          assertFile(target);
        } else {
          assertNoPath(target);
        }
      }

      assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
        agent: to,
        skills: [skill],
        entryFiles: getEntryFilesForAgent(to),
        artifactTargets: getExpectedCommandArtifactTargets(to, allCommandFiles),
      });
      const doctor = run(['doctor', workspace]);
      assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
    });
  }
}

test('agent switch dry-run reports removals without mutation', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi', '--skills', allSkillDirs[0]]);
  assert.strictEqual(result.status, 0, result.stderr);
  const before = snapshotTree(workspace);
  result = run(['init', workspace, '--agent', 'claude', '--skills', allSkillDirs[0], '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /REMOVE/);
  assert.deepStrictEqual(snapshotTree(workspace), before);
});
