import MemoryOutputPlugin from '../MemoryOutputPlugin';
import MemoryFileSystem from 'memory-fs';

it('sets the output file system to in-memory', () => {
  const plugin = new MemoryOutputPlugin('/output/path');
  const compiler = {};

  plugin.apply(compiler);

  expect(compiler.outputFileSystem).toBeInstanceOf(MemoryFileSystem);
});

it('sets the output path to the specified output path', () => {
  const plugin = new MemoryOutputPlugin('/output/path');
  const compiler = {};

  plugin.apply(compiler);

  expect(compiler.outputPath).toBe('/output/path');
});
