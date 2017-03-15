import * as path from 'path';
import interpret from 'interpret';
import getExtension from './getExtension';
import registerCompiler from './registerCompiler';

export default function requireWebpackConfig(webpackConfigPath) {
    const resolvedWebpackConfigPath = path.resolve(webpackConfigPath);

    const extension = getExtension(resolvedWebpackConfigPath);
    registerCompiler(interpret.extensions[extension]);

    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(resolvedWebpackConfigPath);
}
