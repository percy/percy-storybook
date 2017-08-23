import detectWebpackConfigPath from './detectWebpackConfigPath';
import getWebpackConfigExports from './getWebpackConfigExports';
import requireWebpackConfig from './requireWebpackConfig';

export default function resolve(packageRoot, webpackConfigPath) {
  webpackConfigPath = webpackConfigPath || detectWebpackConfigPath(packageRoot);
  const webpackConfig = requireWebpackConfig(webpackConfigPath);
  return getWebpackConfigExports(webpackConfig);
}
