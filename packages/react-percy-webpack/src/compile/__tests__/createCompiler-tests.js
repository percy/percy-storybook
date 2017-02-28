import createCompiler from '../createCompiler';

class WebpackCompiler { }
const mockCompiler = () => new WebpackCompiler();
jest.mock('webpack', () => () => mockCompiler());

const config = { config: true };

it('returns a webpack compiler', () => {
    const compiler = createCompiler(config);

    expect(compiler).toBeInstanceOf(WebpackCompiler);
});
