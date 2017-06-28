import MemoryFileSystem from 'memory-fs';

export default class MemoryOutputPlugin {

  apply(compiler) {
    compiler.outputFileSystem = new MemoryFileSystem();
    compiler.outputPath = '/';
  }

}
