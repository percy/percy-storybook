import configureVirtualEntry from '../configureVirtualEntry';
import path from 'path';
import VirtualModulePlugin from 'virtual-module-webpack-plugin';

it('does not mutate the original Webpack config', () => {
    const originalConfig = {
        old: 'config'
    };
    const percyConfig = {
        includeFiles: []
    };

    const modifiedConfig = configureVirtualEntry(originalConfig, percyConfig);

    expect(modifiedConfig).not.toBe(originalConfig);
    expect(originalConfig).toEqual({
        old: 'config'
    });
});

it('adds VirtualModulePlugin given Webpack config with no plugins', () => {
    const originalConfig = {};
    const percyConfig = {
        includeFiles: []
    };

    const modifiedConfig = configureVirtualEntry(originalConfig, percyConfig);

    expect(modifiedConfig.plugins).toEqual([
        expect.any(VirtualModulePlugin)
    ]);
});

it('adds VirtualModulePlugin given Webpack config with plugins', () => {
    const originalConfig = {
        plugins: [
            'old-plugin-1',
            'old-plugin-2'
        ]
    };
    const percyConfig = {
        includeFiles: []
    };

    const modifiedConfig = configureVirtualEntry(originalConfig, percyConfig);

    expect(modifiedConfig.plugins).toEqual([
        'old-plugin-1',
        'old-plugin-2',
        expect.any(VirtualModulePlugin)
    ]);
});

it('percy entry contains virtual entry given no additional includes specified in percy options', () => {
    const originalConfig = {};
    const percyConfig = {
        includeFiles: []
    };

    const modifiedConfig = configureVirtualEntry(originalConfig, percyConfig);

    expect(modifiedConfig.entry).toEqual({
        percy: [
            path.resolve(path.join(__dirname, '..', 'percy-virtual-entry.js'))
        ]
    });
});

it('percy entry contains virtual entry and additional includes specified in percy options', () => {
    const originalConfig = {};
    const percyConfig = {
        includeFiles: [
            'babel-polyfill',
            './src/foo.js'
        ]
    };

    const modifiedConfig = configureVirtualEntry(originalConfig, percyConfig);

    expect(modifiedConfig.entry).toEqual({
        percy: [
            'babel-polyfill',
            './src/foo.js',
            path.resolve(path.join(__dirname, '..', 'percy-virtual-entry.js'))
        ]
    });
});
