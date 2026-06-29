// 保持 doctor 输出稳定，方便测试和用户复制排查。
function printDoctorResult(result) {
  console.log('Niuma Harness doctor');
  console.log(`Harness: ${result.harnessRoot || 'unknown'}`);
  console.log(`Status: ${result.errors.length > 0 ? 'ERROR' : 'OK'}`);

  for (const check of result.checks) {
    console.log(`${check.status} ${check.message}`);
  }
}

module.exports = {
  printDoctorResult,
};
