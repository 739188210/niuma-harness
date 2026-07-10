// 共享校验 command-derived skill 和 native skill 的 Markdown metadata。
const fs = require('fs');
const { parseMarkdownFrontmatter } = require('../frontmatter');
const { addError, addOk } = require('./result');

function isRegularFile(filePath) {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
}

function checkMarkdownMetadata(filePath, label, expectedName, result) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMarkdownFrontmatter(content);
  if (!parsed) {
    addError(result, `missing frontmatter in ${label}`);
    return;
  }

  const name = parsed.fields.name || '';
  const description = parsed.fields.description || '';
  const body = parsed.body.trim();
  if (!name) {
    addError(result, `missing name in ${label} frontmatter`);
  } else if (name !== expectedName) {
    addError(result, `name mismatch in ${label} frontmatter: expected ${expectedName}, got ${name}`);
  }

  if (!description) {
    addError(result, `missing description in ${label} frontmatter`);
  }

  if (!body) {
    addError(result, `empty body in ${label}`);
  }

  if (name === expectedName && description && body) {
    addOk(result, `${label} metadata`);
  }
}

module.exports = {
  checkMarkdownMetadata,
  isRegularFile,
};
