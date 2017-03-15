import MemoryOutputPlugin from './MemoryOutputPlugin';
import merge from 'webpack-merge';
import webpack from 'webpack';

export default function createCompiler(webpackConfig) {
    return webpack(
        merge(webpackConfig, {
            plugins: [
                new MemoryOutputPlugin()
            ]
        })
    );
}
