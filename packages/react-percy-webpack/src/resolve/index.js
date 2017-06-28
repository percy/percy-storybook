import getWebpackConfigExports from './getWebpackConfigExports';
import requireWebpackConfig from './requireWebpackConfig';

export default function resolve(webpackConfigPath) {
  const webpackConfig = requireWebpackConfig(webpackConfigPath);
  return getWebpackConfigExports(webpackConfig);
}
