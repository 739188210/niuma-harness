// 定位并读取生成态 manifest.json；不在这里做字段语义校验。
const fs = require('fs');
const path = require('path');
const { STATUS_FILE } = require('../harness-status');
const { addError } = require('./result');

function findStatusFile(targetDir, harnessDir) {
  const direct = path.join(targetDir, STATUS_FILE);
  if (fs.existsSync(direct)) {
    return direct;
  }

  const nested = path.join(targetDir, harnessDir || 'harness', STATUS_FILE);
  if (fs.existsSync(nested)) {
    return nested;
  }

  return null;
}

function readStatus(statusPath, result) {
  try {
    const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    if (!status || Array.isArray(status) || typeof status !== 'object') {
      addError(result, `${STATUS_FILE} must contain a JSON object`);
      return null;
    }
    return status;
  } catch (error) {
    addError(result, `invalid ${STATUS_FILE}: ${error.message}`);
    return null;
  }
}

module.exports = {
  findStatusFile,
  readStatus,
};
