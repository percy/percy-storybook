import MemoryFileSystem from 'memory-fs';
import webpack from 'webpack';

export default function createCompiler(config) {
    const compiler = webpack(config);
    compiler.outputFileSystem = new MemoryFileSystem();
    compiler.outputPath = '/';
    return compiler;
}
