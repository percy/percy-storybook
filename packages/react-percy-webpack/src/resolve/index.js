import getWebpackConfigExports from './getWebpackConfigExports';
import { configureVirtualEntry } from '../entry';
import requireWebpackConfig from './requireWebpackConfig';

export default function resolve(webpackConfigPath) {
    const webpackConfig = requireWebpackConfig(webpackConfigPath);
    return configureVirtualEntry(getWebpackConfigExports(webpackConfig));
}
