const crypto = require('crypto');

function digestBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

module.exports = {
  digestBytes,
};
