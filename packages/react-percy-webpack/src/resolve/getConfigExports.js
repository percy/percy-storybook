export default function getConfigExports(config) {
    if (typeof config !== 'object' || Array.isArray(config)) {
        throw new Error('Webpack config did not export an object');
    }

    if (typeof config.default === 'object') {
        return getConfigExports(config.default);
    }

    return config;
}
