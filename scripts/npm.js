const execSync = require('child_process').execSync;

module.exports = function npm(command, cwd) {
  execSync(`npm ${command}`, {
    cwd,
    stdio: ['ignore', 'ignore', process.stderr]
  });
};
