import detectWebpackConfigPath from '../detectWebpackConfigPath';
import fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

const packageRoot = '/some/package/root';

let mockPackage;
jest.mock('/some/package/root/package.json', () => mockPackage, { virtual: true });

let exists;
let resolve;
let resolvePaths;

beforeEach(() => {
  jest.resetModules();

  exists = new Set();
  fs.existsSync.mockReset();
  fs.existsSync.mockImplementation(file => exists.has(file));

  resolvePaths = {};
  resolve = jest.fn(name => resolvePaths[name]);

  mockPackage = {};
});

it('returns path of webpack.config.js in package root when found', () => {
  exists.add('/some/package/root/webpack.config.js');

  const configPath = detectWebpackConfigPath(packageRoot, resolve);

  expect(configPath).toBe('/some/package/root/webpack.config.js');
});

it('returns path of react-scripts dev webpack.config.js when react-scripts is installed as a dependency', () => {
  mockPackage.dependencies = {
    'react-scripts': '^1.1.0',
  };
  resolvePaths['react-scripts/config/webpack.config.dev'] =
    '/some/package/root/node_modules/react-scripts/config/webpack.config.dev.js';

  const configPath = detectWebpackConfigPath(packageRoot, resolve);

  expect(configPath).toBe(
    '/some/package/root/node_modules/react-scripts/config/webpack.config.dev.js',
  );
});

it('returns path of react-scripts dev webpack.config.js when react-scripts is installed as a dev dependency', () => {
  mockPackage.devDependencies = {
    'react-scripts': '^1.1.0',
  };
  resolvePaths['react-scripts/config/webpack.config.dev'] =
    '/some/package/root/node_modules/react-scripts/config/webpack.config.dev.js';

  const configPath = detectWebpackConfigPath(packageRoot, resolve);

  expect(configPath).toBe(
    '/some/package/root/node_modules/react-scripts/config/webpack.config.dev.js',
  );
});

it('throws when there is no webpack config in the package root and it is not a create-react-app project', () => {
  expect(() => detectWebpackConfigPath(packageRoot, resolve)).toThrow();
});
