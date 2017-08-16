import { compile, configureEntry } from '@percy-io/react-percy-webpack';

export default function compileAssets(percyConfig, webpackConfig) {
  webpackConfig = configureEntry(webpackConfig, percyConfig);
  return compile(percyConfig, webpackConfig);
}
