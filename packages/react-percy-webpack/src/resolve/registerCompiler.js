export default function registerCompiler(compiler) {
    if (!compiler) {
        return;
    }

    if (typeof compiler === 'string') {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        require(compiler);
    } else if (!Array.isArray(compiler)) {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        compiler.register(require(compiler.module));
    } else {
        for (let i = 0; i < compiler.length; i++) {
            try {
                registerCompiler(compiler[i]);
                break;
            } catch (e) {
                // continue trying subsequent compilers
            }
        }
    }
}
