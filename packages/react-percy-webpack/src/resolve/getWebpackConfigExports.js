export default function getWebpackConfigExports(webpackConfig) {
  if (typeof webpackConfig !== 'object' || Array.isArray(webpackConfig)) {
    throw new Error('Webpack config did not export an object');
  }

  if (typeof webpackConfig.default === 'object') {
    return getWebpackConfigExports(webpackConfig.default);
  }

  return webpackConfig;
}
