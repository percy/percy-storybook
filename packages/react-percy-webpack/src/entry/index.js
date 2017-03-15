import merge from 'webpack-merge';
import path from 'path';
import VirtualModulePlugin from 'virtual-module-webpack-plugin';

export default function configureVirtualEntry(webpackConfig, percyConfig, entry) {
    const virtualEntryPath = path.join(__dirname, 'percy-virtual-entry.js');

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
                contents: entry
            })
        ]
    });
}
