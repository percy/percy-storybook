import createCompiler from '../createCompiler';

class WebpackCompiler { }
const mockCompiler = () => new WebpackCompiler();
jest.mock('webpack', () => () => mockCompiler());

const webpackConfig = { config: true };

it('returns a webpack compiler', () => {
    const compiler = createCompiler(webpackConfig);

    expect(compiler).toBeInstanceOf(WebpackCompiler);
});
