import { EntryNames } from '../constants';
import getEntryPath from '../getEntryPath';

const mockTempFile = '/path/to/temp.js';
jest.mock('tmp', () => ({
  fileSync: jest.fn(() => ({
    name: mockTempFile,
  })),
}));

it('returns absolute path of framework file for framework entry', () => {
  const entryPath = getEntryPath(EntryNames.framework);

  expect(entryPath).toBe(require.resolve('../framework'));
});

it('returns new JS temp file for render entry', () => {
  const entryPath = getEntryPath(EntryNames.render);

  expect(entryPath).toBe(mockTempFile);
});

it('returns new JS temp file for snapshots entry', () => {
  const entryPath = getEntryPath(EntryNames.snapshots);

  expect(entryPath).toBe(mockTempFile);
});

it('throws for other entries', () => {
  expect(() => getEntryPath('other')).toThrow();
});
