/* eslint-disable global-require, import/no-dynamic-require */

export default function registerCompiler(compiler) {
    if (!compiler) {
        return;
    }

    if (typeof compiler === 'string') {
        require(compiler);
    } else if (!Array.isArray(compiler)) {
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
