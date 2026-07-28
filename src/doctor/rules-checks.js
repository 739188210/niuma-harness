// 从包模板发现可选规则目录；实际文件由 artifact ledger 校验。
const { getAvailableRuleDirs } = require('../rule/catalog');

function getAvailableRules(rulesRoot) {
  return getAvailableRuleDirs(rulesRoot);
}

module.exports = {
  getAvailableRules,
};
