let { promisify } = require('util');
let ogExec = require('child_process').exec;
let { readdirSync } = require('fs');

let getDirectories = (source = './') =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

let dirs = getDirectories();

function exec(cmd, options) {
  return new Promise((resolve, reject) => {
    ogExec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }

      resolve({ stdout, stderr });
    });
  });
}

async function installAndLink(testProjectDir) {
  function output({ stderr, stdout }) {
    console.log(stdout);

    if (stderr) {
      console.log(stderr);
    }
  }

  let options = {
    cwd: testProjectDir
  };

  console.log('---');
  output(await exec('yarn', options));
  console.log('Linking `@percy/storybook`');
  output(await exec('yarn link @percy/storybook', options));
}

(async () => {
  for (testProj of dirs) {
    await installAndLink(`./${testProj}`);
  }
})();
