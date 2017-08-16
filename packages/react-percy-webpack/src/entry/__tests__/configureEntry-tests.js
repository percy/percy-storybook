import configureEntry from '../';

let mockSnapshotFiles = ['/foo/bar.percy.js', '/foo/__percy__/bar.js'];
jest.mock('../findSnapshotFiles', () => jest.fn(() => mockSnapshotFiles));

it('does not mutate the original Webpack config', () => {
  const originalConfig = {
    old: 'config',
  };
  const percyConfig = {
    includeFiles: [],
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };
  const entry = 'const entry = true;';

  const modifiedConfig = configureEntry(originalConfig, percyConfig, entry);

  expect(modifiedConfig).not.toBe(originalConfig);
  expect(originalConfig).toEqual({
    old: 'config',
  });
});

it('percy entry contains snapshot files given no additional includes specified in percy options', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: [],
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };
  const entry = 'const entry = true;';

  const modifiedConfig = configureEntry(originalConfig, percyConfig, entry);

  expect(modifiedConfig.entry).toEqual({
    '__percy__/bar': '/foo/__percy__/bar.js',
    'bar.percy': '/foo/bar.percy.js',
  });
});

it('percy entry contains snapshot files and additional includes specified in percy options', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: ['babel-polyfill', './src/foo.js'],
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };
  const entry = 'const entry = true;';

  const modifiedConfig = configureEntry(originalConfig, percyConfig, entry);

  expect(modifiedConfig.entry).toEqual({
    __percy_include__: ['babel-polyfill', './src/foo.js'],
    '__percy__/bar': '/foo/__percy__/bar.js',
    'bar.percy': '/foo/bar.percy.js',
  });
});
