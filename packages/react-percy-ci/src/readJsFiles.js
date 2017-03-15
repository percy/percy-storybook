import parseJsFile from './parseJsFile';

export default function readJsFiles(assets) {
    Object.keys(assets)
        .filter(name => /\.js$/.test(name))
        .forEach(name => parseJsFile(name, assets[name]));
}
