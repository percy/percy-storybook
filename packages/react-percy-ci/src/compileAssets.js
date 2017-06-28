import { compile, configureEntry } from '@percy-io/react-percy-webpack';

const escapePathForWindows = path => path.replace(/\\/g, '\\\\');

const getEntry = percyConfig => `
    const context = require.context('${escapePathForWindows(percyConfig.rootDir)}', true, ${percyConfig.testRegex});
    context.keys().forEach(function loadFile(key) {
        context(key);
    });
`;

export default function compileAssets(percyConfig, webpackConfig) {
  const entry = getEntry(percyConfig);
  webpackConfig = configureEntry(webpackConfig, percyConfig, entry);
  return compile(webpackConfig);
}
