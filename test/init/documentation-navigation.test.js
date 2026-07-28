const test = require('node:test');
const {
  assert,
  fs,
  path,
  read,
  run,
  tempDir,
} = require('../support/init-fixtures');

const NAVIGATION_BEGIN = '<!-- niuma-navigation:begin -->';
const NAVIGATION_END = '<!-- niuma-navigation:end -->';

function navigationLinks(index) {
  const begin = index.indexOf(NAVIGATION_BEGIN);
  const end = index.indexOf(NAVIGATION_END);
  assert.ok(begin >= 0, 'index must contain the navigation begin marker');
  assert.ok(end > begin, 'index must contain the navigation end marker after the begin marker');

  return [...index.slice(begin + NAVIGATION_BEGIN.length, end).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1]);
}

function assertNavigationTargets(workspace, harnessDir) {
  const harnessRoot = path.join(workspace, harnessDir);
  const indexPath = path.join(harnessRoot, 'docs', 'index.md');
  const index = read(indexPath);
  const links = navigationLinks(index);

  assert.ok(links.length > 0, 'index navigation must contain links');
  assert.doesNotMatch(index, /{{HARNESS_DIR}}/);
  for (const link of links) {
    assert.ok(!/^[a-z][a-z0-9+.-]*:/i.test(link), `navigation link must be local: ${link}`);
    assert.ok(!link.startsWith('#'), `navigation link must not be anchor-only: ${link}`);
    const target = path.resolve(path.dirname(indexPath), link);
    const stat = fs.lstatSync(target);
    assert.ok(stat.isFile(), `navigation target must be a regular file: ${link}`);
  }

  return { index, links };
}

test('generated runtime index is the complete static documentation navigation map', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);

  const { index, links } = assertNavigationTargets(workspace, 'harness');
  const manifest = JSON.parse(read(path.join(__dirname, '..', '..', 'templates', 'manifest.json')));
  const requiredTargets = manifest.templateFiles
    .filter((file) => !file.dynamic && /^(docs\/layers|docs\/policy|docs\/process)\//.test(file.target))
    .map((file) => file.target.slice('docs/'.length));

  for (const target of requiredTargets) {
    assert.ok(links.includes(target), `index must directly link managed document: docs/${target}`);
  }

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.doesNotMatch(entry, /niuma-navigation:/);
  assert.match(entry, /harness\/docs\/layers\/01-context\.md/);
  assert.match(entry, /harness\/docs\/process\/task-triage\.md/);

  const readme = read(path.join(workspace, 'harness', 'README.md'));
  assert.match(readme, /\[the runtime index\]\(docs\/index\.md\)/);
  assert.doesNotMatch(readme, /## Directory map/);
  assert.doesNotMatch(readme, /## 7-layer harness model/);
  assert.doesNotMatch(readme, /## Task workflows/);

  assert.match(index, /\[Project knowledge index\]\(project-context\.md\)/);
  assert.doesNotMatch(index, /bootstrap|process\/bootstrap\.md/i);
  assert.match(index, /\[Task-local work area\]\(\.\.\/\.\.\/agent-work\/README\.md\)/);
});

test('runtime navigation remains valid for a custom harness directory', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);

  const { index } = assertNavigationTargets(workspace, 'ai-harness');
  assert.doesNotMatch(index, /{{HARNESS_DIR}}|`harness\/docs\//);
});
