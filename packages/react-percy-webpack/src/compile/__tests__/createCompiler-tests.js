import MemoryFileSystem from 'memory-fs';
import createCompiler from '../createCompiler';

class WebpackCompiler { }
const mockCompiler = () => new WebpackCompiler();
jest.mock('webpack', () => () => mockCompiler());

const config = { config: true };

it('returns a webpack compiler', () => {
    const compiler = createCompiler(config);

    expect(compiler).toBeInstanceOf(WebpackCompiler);
});

it('compiles files in memory', () => {
    const compiler = createCompiler(config);

    expect(compiler.outputFileSystem).toBeInstanceOf(MemoryFileSystem);
});

it('outputs files to root', () => {
    const compiler = createCompiler(config);

    expect(compiler.outputPath).toBe('/');
});
