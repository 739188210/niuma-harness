const assert = require('assert');
const path = require('path');
const test = require('node:test');

const { renderRuleArtifacts } = require('../src/rule-artifacts');

function createDependencies() {
  const templateDir = '/package/templates';
  const rulesRootPath = path.join(templateDir, 'rules');
  return {
    TEMPLATE_DIR: templateDir,
    digestBytes(value) {
      return `digest:${Buffer.from(value).toString('hex')}`;
    },
    getAvailableRuleDirs() {
      return ['common', 'web'];
    },
    getRulesRootPath() {
      return rulesRootPath;
    },
    getRuleTargetRootsForAgent(agent) {
      return agent === 'claude' ? ['.claude/rules'] : ['.opencode/rules'];
    },
    listFilesRecursive(directory) {
      if (directory.endsWith(path.join('rules', 'common'))) {
        return [
          path.join(directory, 'testing.md'),
          path.join(directory, 'coding-style.md'),
        ];
      }
      if (directory.endsWith(path.join('rules', 'web'))) {
        return [path.join(directory, 'design.md')];
      }
      throw new Error(`unexpected rule directory: ${directory}`);
    },
    renderTemplate(source, variables) {
      return `${source}:${variables.HARNESS_DIR}`;
    },
  };
}

test('renders sorted canonical rule artifact descriptors', () => {
  const artifacts = renderRuleArtifacts(
    'claude',
    ['web', 'common'],
    'rules',
    { HARNESS_DIR: 'harness' },
    createDependencies()
  );

  assert.deepStrictEqual(artifacts, [
    {
      kind: 'rule',
      rule: 'common',
      relativePath: 'coding-style.md',
      source: 'rules/common/coding-style.md',
      target: '.claude/rules/common/coding-style.md',
      content: 'rules/common/coding-style.md:harness',
      digest: 'digest:72756c65732f636f6d6d6f6e2f636f64696e672d7374796c652e6d643a6861726e657373',
    },
    {
      kind: 'rule',
      rule: 'common',
      relativePath: 'testing.md',
      source: 'rules/common/testing.md',
      target: '.claude/rules/common/testing.md',
      content: 'rules/common/testing.md:harness',
      digest: 'digest:72756c65732f636f6d6d6f6e2f74657374696e672e6d643a6861726e657373',
    },
    {
      kind: 'rule',
      rule: 'web',
      relativePath: 'design.md',
      source: 'rules/web/design.md',
      target: '.claude/rules/web/design.md',
      content: 'rules/web/design.md:harness',
      digest: 'digest:72756c65732f7765622f64657369676e2e6d643a6861726e657373',
    },
  ]);
});

test('uses the native target root for rule artifact targets', () => {
  const artifacts = renderRuleArtifacts(
    'opencode',
    ['common'],
    'rules',
    { HARNESS_DIR: 'tooling/niuma' },
    createDependencies()
  );

  assert.deepStrictEqual(
    artifacts.map((artifact) => artifact.target),
    [
      '.opencode/rules/common/coding-style.md',
      '.opencode/rules/common/testing.md',
    ]
  );
});

test('returns no rule artifacts for an empty selection', () => {
  assert.deepStrictEqual(
    renderRuleArtifacts('claude', [], 'rules', { HARNESS_DIR: 'harness' }, createDependencies()),
    []
  );
});

test('rejects an unknown rule artifact selection', () => {
  assert.throws(
    () => renderRuleArtifacts('claude', ['unknown'], 'rules', { HARNESS_DIR: 'harness' }, createDependencies()),
    /unknown rule directory: unknown/
  );
});
