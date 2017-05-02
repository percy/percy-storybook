// Ignore includig css and related files from storybooks.
// This is okay at this point, because we're only trying to fetch a list of stories,
// not an accurate rendering of them.
import 'ignore-styles';
import path from 'path';
import readPkgUp from 'read-pkg-up';
import runWithRequireContext from './require_context';
import { transformFileSync } from 'babel-core';
import { getStorybook } from '@kadira/storybook';
import loadBabelConfig from '@kadira/storybook/dist/server/babel_config';

const pkg = readPkgUp.sync().pkg;
const isStorybook =
  (pkg.devDependencies && pkg.devDependencies['@kadira/storybook']) ||
  (pkg.dependencies && pkg.dependencies['@kadira/storybook']);


export default function getStories(ignoreString) {
    // Allow the adjustment of what babel ignores for transpilation.
    // Means that the default of node_modules can be overridden to include some modeules.
    // eslint-disable-next-line global-require
    require('babel-core/register')({
        ignore: new RegExp(ignoreString)
    });

    if (isStorybook) {
        const configDirPath = path.resolve('.storybook');
        const configPath = path.join(configDirPath, 'config.js');

        const babelConfig = loadBabelConfig(configDirPath);

        const content = transformFileSync(configPath, babelConfig).code;

        const contextOpts = {
            filename: configPath,
            dirname: configDirPath
        };

        runWithRequireContext(content, contextOpts);
    } else {
        throw new Error(
          'percy-storybook is intended only to be used with react storybook.',
        );
    }

    return getStorybook();
}
