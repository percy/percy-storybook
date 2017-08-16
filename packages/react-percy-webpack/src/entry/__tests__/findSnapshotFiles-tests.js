import findSnapshotFiles from '../findSnapshotFiles';
import path from 'path';

const absPath = file => path.resolve(path.join(__dirname, file));

it('returns files matching snapshot patterns', () => {
  const percyConfig = {
    rootDir: absPath('test-project'),
    snapshotPatterns: ['**/src/**/__percy__/*.js'],
  };

  const snapshotFiles = findSnapshotFiles(percyConfig);

  expect(snapshotFiles).toEqual([
    absPath('test-project/src/__percy__/snapshot.js'),
    absPath('test-project/src/__percy__/snapshot.percy.js'),
  ]);
});

it('only returns files once even if they match multiple patterns', () => {
  const percyConfig = {
    rootDir: absPath('test-project'),
    snapshotPatterns: ['**/src/**/__percy__/*.js', '**/src/**/*.percy.js'],
  };

  const snapshotFiles = findSnapshotFiles(percyConfig);

  expect(snapshotFiles).toEqual([
    absPath('test-project/src/__percy__/snapshot.js'),
    absPath('test-project/src/__percy__/snapshot.percy.js'),
    absPath('test-project/src/snapshot.percy.js'),
  ]);
});

it('does not return files that match ignore patterns', () => {
  const percyConfig = {
    rootDir: absPath('test-project'),
    snapshotIgnorePatterns: ['**/lib/**'],
    snapshotPatterns: ['**/__percy__/*.js'],
  };

  const snapshotFiles = findSnapshotFiles(percyConfig);

  expect(snapshotFiles).toEqual([
    absPath('test-project/src/__percy__/snapshot.js'),
    absPath('test-project/src/__percy__/snapshot.percy.js'),
  ]);
});
