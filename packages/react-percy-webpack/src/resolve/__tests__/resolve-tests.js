import resolve from '../';

const mockExplicitConfig = { config: true };

const mockDetectedConfigPath = '/some/package/root/detected.config.js';
const mockDetectedConfig = { config: true, detected: true };

jest.mock('../detectWebpackConfigPath', () => () => mockDetectedConfigPath);
jest.mock('../requireWebpackConfig', () => path => {
  if (path === mockDetectedConfigPath) {
    return mockDetectedConfig;
  }
  return mockExplicitConfig;
});
jest.mock('../getWebpackConfigExports', () => config => config);

it('returns the webpack config given config path', () => {
  const config = resolve('/some/package/root', 'webpack.config.js');

  expect(config).toEqual(mockExplicitConfig);
});

it('returns the auto-detected webpack config given no config path', () => {
  const config = resolve('/some/package/root');

  expect(config).toEqual(mockDetectedConfig);
});
