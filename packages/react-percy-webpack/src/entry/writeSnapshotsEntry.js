import fs from 'fs';

const getSuiteForFile = file => `global.suite('', () => require(${JSON.stringify(file)}));`;

export default function writeSnapshotsEntry(snapshotFiles, filePath) {
  fs.writeFileSync(filePath, snapshotFiles.map(getSuiteForFile).join('\n'));
}
