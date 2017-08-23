import MemoryOutputPlugin from './MemoryOutputPlugin';
import merge from 'webpack-merge';
import path from 'path';
import webpack from 'webpack';

export default function createCompiler(percyConfig, webpackConfig) {
  return webpack(
    merge(webpackConfig, {
      output: {
        chunkFilename: '[name].chunk.js',
        filename: '[name].js',
        path: path.join(percyConfig.rootDir, 'static'),
        publicPath: '/',
      },
      module: {
        rules: [
          {
            test: /\.percy\.(js|jsx)/,
            exclude: /node_modules/,
            enforce: 'pre',
            loader: require.resolve('./percySnapshotLoader'),
          },
        ],
      },
      plugins: [new MemoryOutputPlugin('/static/')],
    }),
  );
}
