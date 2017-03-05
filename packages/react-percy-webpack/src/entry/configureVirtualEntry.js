import defaults from './defaults';
import getVirtualEntryContents from './getVirtualEntryContents';
import merge from 'webpack-merge';
import path from 'path';
import VirtualModulePlugin from 'virtual-module-webpack-plugin';

export default function configureVirtualEntry(config) {
    const options = Object.assign({}, defaults, config.percy);

    const context = config.context || process.cwd();
    const root = path.isAbsolute(options.root)
        ? options.root
        : path.join(context, options.root);

    const virtualEntryPath = path.join(__dirname, 'percy-virtual-entry.js');
    const virtualEntryContents = getVirtualEntryContents(root, options);

    return merge({
        ...config,
        entry: {
            percy: [
                ...options.include,
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
