import * as path from 'path';
import interpret from 'interpret';
import registerCompiler from '../registerCompiler';
import requireWebpackConfig from '../requireWebpackConfig';

jest.mock('interpret', () => ({
  extensions: {
    '.foo.js': {
      'interpret-foo': 'mock'
    }
  }
}));

jest.mock('../getExtension', () => () => '.foo.js');
jest.mock('../registerCompiler', () => jest.fn());

const configPath = 'webpack.config.foo.js';

beforeEach(() => {
  jest.resetModules();
});

const givenWebpackConfig = (mockConfig = {}) => {
  jest.mock(path.resolve(configPath), () => mockConfig, { virtual: true });
};

it('registers the necessary compilers before loading the config', () => {
  givenWebpackConfig();

  requireWebpackConfig(configPath);

  expect(registerCompiler).toHaveBeenCalledWith(interpret.extensions['.foo.js']);
});

it('returns webpack config', () => {
  givenWebpackConfig({
    entry: {
      foo: 'bar'
    },
    module: {
      loaders: []
    }
  });

  const config = requireWebpackConfig(configPath);

  expect(config).toEqual({
    entry: {
      foo: 'bar'
    },
    module: {
      loaders: []
    }
  });
});
