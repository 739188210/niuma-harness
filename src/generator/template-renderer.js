// 模板渲染只做简单 {{VARIABLE}} 替换，避免引入模板依赖。
const fs = require('fs');
const { safeResolveInside } = require('../fs-safe');
const { TEMPLATE_DIR } = require('./template-manifest');

function readTemplate(relativePath) {
  const templatePath = safeResolveInside(TEMPLATE_DIR, relativePath, 'template path');
  return fs.readFileSync(templatePath, 'utf8');
}

function renderTemplate(relativePath, variables) {
  let content = readTemplate(relativePath);
  for (const [key, value] of Object.entries(variables)) {
    content = content.split(`{{${key}}}`).join(value);
  }
  return content;
}

module.exports = {
  renderTemplate,
};
