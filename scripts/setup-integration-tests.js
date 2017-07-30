/* eslint-disable no-console */

const chalk = require('chalk');
const fs = require('fs-extra');
const lerna = require('lerna');
const npm = require('./npm');
const pack = require('./pack');
const path = require('path');
const Repository = require('lerna/lib/Repository');

const integrationTestsDir = path.join(__dirname, '..', 'integration-tests');

const outputDir = path.join(integrationTestsDir, 'packages');
fs.mkdirsSync(outputDir);

const packages = lerna.getPackages(new Repository());
const packageLookup = packages.reduce((result, pkg) => {
  result[pkg.name] = pkg;
  return result;
}, {});

const packageTgz = {};
packages.forEach(pkg => {
  console.log(`Packing ${pkg.name}...`);
  const tgz = pack(pkg.location, pkg, outputDir);
  packageTgz[pkg.name] = tgz;
});

const installed = new Set();
const install = pkg => {
  if (installed.has(pkg.name)) {
    return;
  }

  const reactPercyDeps = Object.keys(pkg.dependencies || {}).filter(dep =>
    /^@percy-io\/react-percy/.test(dep),
  );
  reactPercyDeps.forEach(dep => install(packageLookup[dep]));

  console.log(`Installing ${pkg.name}...`);
  const tgzPath = packageTgz[pkg.name];
  npm(`install ${tgzPath} --force`, integrationTestsDir);
  installed.add(pkg.name);
};

packages.forEach(install);

console.log('Installing integration test dependencies...');
npm('install', integrationTestsDir);
npm('prune', integrationTestsDir);

console.log();
console.log(chalk.reset.green.bold('Successfully setup integration tests.'));
console.log();
