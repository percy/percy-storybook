import MemoryOutputPlugin from './MemoryOutputPlugin';
import merge from 'webpack-merge';
import webpack from 'webpack';

export default function createCompiler(percyConfig, webpackConfig) {
  return webpack(
    merge(webpackConfig, {
      output: {
        path: percyConfig.rootDir,
      },
      plugins: [new MemoryOutputPlugin()],
    }),
  );
}
