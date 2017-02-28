import MemoryOutputPlugin from '../MemoryOutputPlugin';
import MemoryFileSystem from 'memory-fs';

it('sets the output file system to in-memory', () => {
    const plugin = new MemoryOutputPlugin();
    const compiler = {};

    plugin.apply(compiler);

    expect(compiler.outputFileSystem).toBeInstanceOf(MemoryFileSystem);
});

it('sets the output path to `/`', () => {
    const plugin = new MemoryOutputPlugin();
    const compiler = {};

    plugin.apply(compiler);

    expect(compiler.outputPath).toBe('/');
});
