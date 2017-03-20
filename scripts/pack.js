const fs = require('fs-extra');
const npm = require('./npm');
const path = require('path');

module.exports = function pack(packagePath, packageJson, outputDir) {
    // Backup package.json before modifying it
    const jsonPath = path.join(packagePath, 'package.json');
    const tempPath = `${jsonPath}.orig`;

    try {
        fs.moveSync(jsonPath, tempPath, { overwrite: true });

        const json = fs.readJsonSync(tempPath);
        Object.keys(json.dependencies || {}).forEach((dep) => {
            if (/^react-percy/.test(dep)) {
                json.dependencies[dep] = path.join(outputDir, `${dep}.tgz`);
            }
        });
        fs.writeJsonSync(jsonPath, json);

        npm('pack', packagePath);

        // Restore package.json
        fs.removeSync(jsonPath);
        fs.moveSync(tempPath, jsonPath);

        const tgzPath = path.join(packagePath, `${packageJson.name}-${packageJson.version}.tgz`);
        const outputPath = path.join(outputDir, `${packageJson.name}.tgz`);
        fs.moveSync(tgzPath, outputPath, { overwrite: true });

        return outputPath;
    } finally {
        if (fs.statSync(tempPath)) {
            // Restore package.json
            fs.removeSync(jsonPath);
            fs.moveSync(tempPath, jsonPath);
        }
    }
};
