import Module from 'module';

export default function parseJsFile(file, src) {
    const m = new Module();
    m.paths = module.paths;
    m._compile(src, file);
    return m.exports;
}
