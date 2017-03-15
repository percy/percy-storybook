import getVirtualEntryContents from './getVirtualEntryContents';
import merge from 'webpack-merge';
import path from 'path';
import VirtualModulePlugin from 'virtual-module-webpack-plugin';

export default function configureVirtualEntry(webpackConfig, percyConfig) {
    const virtualEntryPath = path.join(__dirname, 'percy-virtual-entry.js');
    const virtualEntryContents = getVirtualEntryContents(percyConfig);

    return merge({
        ...webpackConfig,
        entry: {
            percy: [
                ...percyConfig.includeFiles,
                virtualEntryPath
            ]
        }
    }, {
        plugins: [
            new VirtualModulePlugin({
                moduleName: virtualEntryPath,
                contents: virtualEntryContents
            })
        ]
    });
}
