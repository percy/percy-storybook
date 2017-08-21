import createCompiler from '../createCompiler';

class WebpackCompiler {}
const mockCompiler = () => new WebpackCompiler();
jest.mock('webpack', () => () => mockCompiler());

it('returns a webpack compiler', () => {
  const percyConfig = {
    rootDir: '/foo/bar',
  };
  const webpackConfig = {
    config: true,
  };

  const compiler = createCompiler(percyConfig, webpackConfig);

  expect(compiler).toBeInstanceOf(WebpackCompiler);
});
