import fs from 'fs';
import vm from 'vm';
import writeSnapshotsEntry from '../writeSnapshotsEntry';

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

let filePath;
let mockRequire;
let mockSuite;
let snapshotFiles;

const runSnapshotsEntry = () => {
  const context = vm.createContext();
  const global = vm.runInContext('this', context);
  global.global = global;
  global.suite = mockSuite;
  global.require = mockRequire;

  const [filePath, src] = fs.writeFileSync.mock.calls[0];
  const script = new vm.Script(src, {
    filename: filePath,
    displayErrors: true,
  });
  script.runInContext(context, {
    displayErrors: true,
  });
};

beforeEach(() => {
  fs.writeFileSync.mockReset();

  filePath = '/path/to/snapshots.js';
  snapshotFiles = ['/snapshot/file1.js', '/snapshot/file2.js', '/snapshot/file3.js'];

  mockRequire = jest.fn();
  mockSuite = jest.fn((name, cb) => cb());
});

it('writes entry to specified file path', () => {
  filePath = '/path/to/file.js';

  writeSnapshotsEntry(snapshotFiles, filePath);

  expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, expect.any(String));
});

it('executes each snapshot file', () => {
  snapshotFiles = [
    '/snapshot/file1.percy.js',
    '/snapshot/file2.percy.js',
    '/snapshot/file3.percy.js',
  ];

  writeSnapshotsEntry(snapshotFiles, filePath);

  runSnapshotsEntry();

  snapshotFiles.forEach(file => expect(mockRequire).toHaveBeenCalledWith(file));
});

it('creates a suite for each snapshot file', () => {
  snapshotFiles = [
    '/snapshot/file1.percy.js',
    '/snapshot/file2.percy.js',
    '/snapshot/file3.percy.js',
  ];

  writeSnapshotsEntry(snapshotFiles, filePath);

  runSnapshotsEntry();

  expect(mockSuite).toHaveBeenCalledTimes(3);
});
