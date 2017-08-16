import defaults from '../defaults';
import micromatch from 'micromatch';

const expectFileToMatchPatterns = (file, patterns) => {
  const matches = micromatch([file], patterns);
  expect(matches).toEqual([file]);
};

const expectFileNotToMatchPatterns = (file, patterns) => {
  const matches = micromatch([file], patterns);
  expect(matches).toEqual([]);
};

describe('snapshotIgnorePatterns', () => {
  [
    '/node_modules/foo.js',
    '/node_modules/foo.jsx',
    '/node_modules/foo.json',
    '/node_modules/package/foo.js',
    '/node_modules/package/foo.jsx',
    '/node_modules/package/foo.json',
    '/node_modules/package/foo.percy.js',
    '/node_modules/package/foo.percy.jsx',
    '/node_modules/package/foo.percy.json',
    '/node_modules/package/__percy__/foo.js',
    '/node_modules/package/__percy__/foo.jsx',
    '/node_modules/package/__percy__/foo.json',
    '/packages/foo/node_modules/package/foo.js',
    '/packages/foo/node_modules/package/foo.jsx',
    '/packages/foo/node_modules/package/foo.json',
    '/packages/foo/node_modules/package/foo.percy.js',
    '/packages/foo/node_modules/package/foo.percy.jsx',
    '/packages/foo/node_modules/package/foo.percy.json',
    '/packages/foo/node_modules/package/__percy__/foo.js',
    '/packages/foo/node_modules/package/__percy__/foo.jsx',
    '/packages/foo/node_modules/package/__percy__/foo.json',
  ].forEach(file => {
    it(`matches file in \`node_modules\` directory: ${file}`, () => {
      expectFileToMatchPatterns(file, defaults.snapshotIgnorePatterns);
    });
  });
});

describe('snapshotPatterns', () => {
  it('matches JS files in `__percy__` directories', () => {
    expectFileToMatchPatterns('/package/src/__percy__/foo.js', defaults.snapshotPatterns);
  });

  it('matches JSX files in `__percy__` directories', () => {
    expectFileToMatchPatterns('/package/src/__percy__/foo.jsx', defaults.snapshotPatterns);
  });

  it('does not match non-JS files in `__percy__` directories', () => {
    expectFileNotToMatchPatterns('/package/src/__percy__/foo.json', defaults.snapshotPatterns);
  });

  it('matches JS files with `.percy` suffix', () => {
    expectFileToMatchPatterns('/package/src/foo/foo.percy.js', defaults.snapshotPatterns);
  });

  it('matches JSX files with `.percy` suffix', () => {
    expectFileToMatchPatterns('/package/src/foo/foo.percy.jsx', defaults.snapshotPatterns);
  });

  it('does not match non-JS files with `.percy` suffix', () => {
    expectFileNotToMatchPatterns('/package/src/foo/foo.percy.json', defaults.snapshotPatterns);
  });

  it('does not match other JS files', () => {
    expectFileNotToMatchPatterns('/package/src/foo/foo.js', defaults.snapshotPatterns);
  });

  it('does not match other JSX files', () => {
    expectFileNotToMatchPatterns('/package/src/foo/foo.jsx', defaults.snapshotPatterns);
  });
});
