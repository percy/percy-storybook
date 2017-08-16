import glob from 'glob';

export default function findSnapshotFiles(percyConfig) {
  const snapshotFiles = new Set();
  percyConfig.snapshotPatterns.forEach(pattern => {
    glob
      .sync(pattern, {
        absolute: true,
        cwd: percyConfig.rootDir,
        ignore: percyConfig.snapshotIgnorePatterns,
      })
      .forEach(file => snapshotFiles.add(file));
  });
  return Array.from(snapshotFiles);
}
