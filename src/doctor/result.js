// doctor 全程累积结构化检查结果，最后统一打印。
function createResult() {
  return {
    harnessRoot: null,
    checks: [],
    errors: [],
  };
}

function addOk(result, message) {
  result.checks.push({ status: 'OK', message });
}

function addError(result, message) {
  result.errors.push(message);
  result.checks.push({ status: 'ERROR', message });
}

module.exports = {
  createResult,
  addOk,
  addError,
};
