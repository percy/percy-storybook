import * as args from './args';
import pkgDir from 'pkg-dir';
import readPercyConfig from 'react-percy-config';
import { resolve as readWebpackConfig } from 'react-percy-webpack';
import runPercy from './runPercy';
import yargs from 'yargs';

const VERSION = require('../package.json').version;

// eslint-disable-next-line import/prefer-default-export
export function run(argv) {
    argv = yargs(argv)
        .usage(args.usage)
        .help()
        .alias('help', 'h')
        .options(args.options)
        .epilogue(args.docs)
        .argv;

    if (argv.help) {
        yargs.showHelp();
        process.on('exit', () => process.exit(1));
        return;
    }

    if (argv.version) {
        process.stdout.write(`v${VERSION}\n`);
        process.on('exit', () => process.exit(0));
        return;
    }

    const packageRoot = pkgDir.sync();

    const percyConfig = readPercyConfig(packageRoot);
    const webpackConfig = readWebpackConfig(argv.config);

    return runPercy(percyConfig, webpackConfig)
        .then(() => process.on('exit', () => process.exit(0)))
        .catch(() => process.on('exit', () => process.exit(1)));
}
