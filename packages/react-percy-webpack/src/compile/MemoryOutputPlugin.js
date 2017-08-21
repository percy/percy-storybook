import MemoryFileSystem from 'memory-fs';

export default class MemoryOutputPlugin {
  constructor(outputPath) {
    this.outputPath = outputPath;
  }

  apply(compiler) {
    compiler.outputFileSystem = new MemoryFileSystem();
    compiler.outputPath = this.outputPath;
  }
}
