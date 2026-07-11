const { getEntryFilesForAgent } = require('./agents');

function createTemplateVariables(options, workDirectory) {
  return {
    ENTRY_FILES: getEntryFilesForAgent(options.agent).join(', '),
    HARNESS_DIR: options.harnessDir,
    WORK_DIR: workDirectory,
  };
}

module.exports = {
  createTemplateVariables,
};
