/* eslint-disable global-require, import/no-dynamic-require */

import * as path from 'path';
import interpret from 'interpret';
import getExtension from './getExtension';
import registerCompiler from './registerCompiler';

export default function requireConfig(configPath) {
    const resolvedConfigPath = path.resolve(configPath);

    const extension = getExtension(resolvedConfigPath);
    registerCompiler(interpret.extensions[extension]);

    return require(resolvedConfigPath);
}
