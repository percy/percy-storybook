import configureEntry from '../';
import { EntryNames } from '../constants';
import getEntryPath from '../getEntryPath';
import writeRenderEntry from '../writeRenderEntry';
import writeSnapshotsEntry from '../writeSnapshotsEntry';

const mockSnapshotFiles = ['/foo/bar.percy.js', '/foo/__percy__/bar.js'];
jest.mock('../findSnapshotFiles', () => jest.fn(() => mockSnapshotFiles));

const mockFrameworkFile = '/mock/framework.js';
const mockRenderFile = '/mock/render.js';
const mockSnapshotsFile = '/mock/snapshots.js';
jest.mock('../getEntryPath', () => jest.fn());

jest.mock('../writeRenderEntry');
jest.mock('../writeSnapshotsEntry');

beforeEach(() => {
  getEntryPath.mockImplementation(name => {
    switch (name) {
      case EntryNames.framework:
        return mockFrameworkFile;
      case EntryNames.render:
        return mockRenderFile;
      case EntryNames.snapshots:
        return mockSnapshotsFile;
    }
  });

  writeRenderEntry.mockReset();
  writeSnapshotsEntry.mockReset();
});

it('does not mutate the original Webpack config', () => {
  const originalConfig = {
    old: 'config',
    entry: 'foo',
  };
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  const modifiedConfig = configureEntry(originalConfig, percyConfig);

  expect(modifiedConfig).not.toBe(originalConfig);
  expect(originalConfig).toEqual({
    old: 'config',
    entry: 'foo',
  });
});

it('replaces all original entries', () => {
  const originalConfig = {
    entry: {
      foo: 'bar',
    },
  };
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  const modifiedConfig = configureEntry(originalConfig, percyConfig);

  expect(modifiedConfig.entry).not.toEqual(
    expect.objectContaining({
      foo: 'bar',
    }),
  );
});

it('adds framework entry to config', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  const modifiedConfig = configureEntry(originalConfig, percyConfig);

  expect(modifiedConfig.entry).toEqual(
    expect.objectContaining({
      [EntryNames.framework]: mockFrameworkFile,
    }),
  );
});

it('writes render entry file', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  configureEntry(originalConfig, percyConfig);

  expect(writeRenderEntry).toHaveBeenCalledWith(percyConfig, mockRenderFile);
});

it('adds render entry to config', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  const modifiedConfig = configureEntry(originalConfig, percyConfig);

  expect(modifiedConfig.entry).toEqual(
    expect.objectContaining({
      [EntryNames.render]: mockRenderFile,
    }),
  );
});

it('writes snapshots entry file', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  configureEntry(originalConfig, percyConfig);

  expect(writeSnapshotsEntry).toHaveBeenCalledWith(mockSnapshotFiles, mockSnapshotsFile);
});

it('adds snapshots entry to config containing snapshots entry file given no include files in percy config', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: [],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  const modifiedConfig = configureEntry(originalConfig, percyConfig);

  expect(modifiedConfig.entry).toEqual(
    expect.objectContaining({
      [EntryNames.snapshots]: [mockSnapshotsFile],
    }),
  );
});

it('adds snapshots entry to config containing include files and snapshots entry file given include files in percy config', () => {
  const originalConfig = {};
  const percyConfig = {
    includeFiles: ['babel-polyfill', './src/foo.js'],
    renderer: '@percy-io/percy-snapshot-render-react',
    rootDir: '/foo',
    snapshotPatterns: ['**/__percy__/*.js', '**/*.percy.js'],
  };

  const modifiedConfig = configureEntry(originalConfig, percyConfig);

  expect(modifiedConfig.entry).toEqual(
    expect.objectContaining({
      [EntryNames.snapshots]: ['babel-polyfill', './src/foo.js', mockSnapshotsFile],
    }),
  );
});
