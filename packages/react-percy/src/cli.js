import * as args from './args';
import chalk from 'chalk';
import pkgDir from 'pkg-dir';
import readPercyConfig from '@percy-io/react-percy-config';
import { resolve as readWebpackConfig } from '@percy-io/react-percy-webpack';
import runPercy from '@percy-io/react-percy-ci';
import yargs from 'yargs';

const VERSION = require('../package.json').version;

// eslint-disable-next-line import/prefer-default-export
export function run(argv) {
  argv = yargs(argv)
    .usage(args.usage)
    .help()
    .alias('help', 'h')
    .options(args.options)
    .epilogue(args.docs).argv;

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

  return runPercy(percyConfig, webpackConfig, process.env.PERCY_TOKEN)
    .then(() => {
      process.on('exit', () => process.exit(0));
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.log(chalk.bold.red(err.stack || err));
      process.on('exit', () => process.exit(1));
    });
}
