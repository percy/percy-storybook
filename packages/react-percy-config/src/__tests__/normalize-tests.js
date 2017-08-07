import defaults from '../defaults';
import normalize from '../normalize';

it('sets `ignoreRegexes` to exclude node_modules given no `ignoreRegexes` in config', () => {
  const config = {};
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.ignoreRegexes).toEqual([/node_modules/]);
});

it('sets `ignoreRegexes` to `ignoreRegexes` from config', () => {
  const config = {
    ignoreRegexes: [/foo/],
  };
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.ignoreRegexes).toEqual([/foo/]);
});

it('converts string `ignoreRegexes` from config to regexes', () => {
  const config = {
    ignoreRegexes: ['foo$'],
  };
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.ignoreRegexes).toEqual([/foo$/]);
});

it('sets `includeFiles` to an empty array given no `includeFiles` in config', () => {
  const config = {};
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.includeFiles).toEqual([]);
});

it('sets `includeFiles` to `includeFiles` from config', () => {
  const config = {
    includeFiles: ['foo.js', 'bar'],
  };
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.includeFiles).toEqual(['foo.js', 'bar']);
});

it('sets `rootDir` to the package root given no `rootDir` in config', () => {
  const config = {};
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.rootDir).toEqual(packageRoot);
});

it('sets `rootDir` to normalized `rootDir` from config', () => {
  const config = {
    rootDir: '/config/foo/../root',
  };
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.rootDir).toEqual('/config/root');
});

it('sets default `snapshotRegex` given none specified in config', () => {
  const config = {};
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.snapshotRegex).toEqual(defaults.snapshotRegex);
});

it('sets `snapshotRegex` to `snapshotRegex` from config', () => {
  const config = {
    snapshotRegex: /\.screenshots$/,
  };
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.snapshotRegex).toEqual(/\.screenshots$/);
});

it('converts string `snapshotRegex` from config to regex', () => {
  const config = {
    snapshotRegex: '\\.screenshots$',
  };
  const packageRoot = '/package/root';

  const normalizedConfig = normalize(config, packageRoot);

  expect(normalizedConfig.snapshotRegex).toEqual(/\.screenshots$/);
});
