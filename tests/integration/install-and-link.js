let { execSync } = require('child_process');
let { readdirSync } = require('fs');

readdirSync('./', { withFileTypes: true }).forEach(dirent => {
  if (dirent.isDirectory()) {
    let options = { cwd: dirent.name, stdio: 'inherit' };

    console.log(`\n--- ${options.cwd} ---\n`);
    execSync('yarn', options);
    execSync('yarn link @percy/storybook', options);
  }
});
