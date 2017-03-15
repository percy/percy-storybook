const escapePathForWindows = path => path.replace(/\\/g, '\\\\');

export default function getEntry(percyConfig) {
    return `
        const context = require.context('${escapePathForWindows(percyConfig.rootDir)}', true, ${percyConfig.testRegex});
        context.keys().forEach(function loadFile(key) {
            context(key);
        });
    `;
}
