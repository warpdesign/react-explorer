revision = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

module.exports = revision;
