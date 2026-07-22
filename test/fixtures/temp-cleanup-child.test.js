const test = require('node:test');
const { tempDir } = require('../helpers');

test('creates a tracked temporary root', () => {
  console.log(`TEMP_ROOT=${tempDir()}`);
});
