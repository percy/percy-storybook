const fs = require('fs-extra');
const npm = require('./npm');
const path = require('path');

module.exports = function pack(packagePath, packageJson, outputDir) {
  // Backup package.json before modifying it
  const jsonPath = path.join(packagePath, 'package.json');
  const tempPath = `${jsonPath}.orig`;

  try {
    const json = fs.readJsonSync(jsonPath);

    fs.moveSync(jsonPath, tempPath, { overwrite: true });

    Object.keys(json.dependencies || {}).forEach(dep => {
      if (/^react-percy/.test(dep)) {
        json.dependencies[dep] = path.join(outputDir, `${dep}.tgz`);
      }
    });
    fs.writeJsonSync(jsonPath, json);

    npm('pack', packagePath);

    // Restore package.json
    fs.removeSync(jsonPath);
    fs.moveSync(tempPath, jsonPath);

    const normalizedPackageName = packageJson.name.replace(/\//gi, '-').replace('@', '');
    const tgzPath = path.join(packagePath, `${normalizedPackageName}-${packageJson.version}.tgz`);
    const outputPath = path.join(outputDir, `${normalizedPackageName}.tgz`);
    fs.moveSync(tgzPath, outputPath, { overwrite: true });

    return outputPath;
  } finally {
    if (fs.existsSync(tempPath)) {
      // Restore package.json
      fs.moveSync(tempPath, jsonPath, { overwrite: true });
    }
  }
};
