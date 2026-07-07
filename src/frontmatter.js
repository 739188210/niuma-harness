// 简单 Markdown frontmatter 解析器，供 command/skill 元数据校验复用。
function parseMarkdownFrontmatter(content) {
  const normalized = content.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines[0] !== '---') {
    return null;
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (closingIndex === -1) {
    return null;
  }

  const frontmatter = lines.slice(1, closingIndex).join('\n');
  const body = lines.slice(closingIndex + 1).join('\n');
  return {
    fields: parseFrontmatterFields(frontmatter),
    body,
  };
}

function parseFrontmatterFields(frontmatter) {
  const fields = {};
  for (const line of frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripSimpleQuotes(line.slice(separatorIndex + 1).trim());
    if (key) {
      fields[key] = value;
    }
  }
  return fields;
}

function stripSimpleQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).trim();
    }
  }
  return value;
}

module.exports = {
  parseMarkdownFrontmatter,
  parseFrontmatterFields,
};
