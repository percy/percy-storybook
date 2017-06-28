import * as args from './args';

import getStories from './getStories';
import getStaticAssets from './getStaticAssets';
import getWidths from './getWidths';
import getMinimumHeight from './getMinimumHeight';
import getRtlRegex from './getRtlRegex';
import selectStories from './selectStories';
import uploadStorybook from './uploadStorybook';

import ApiClient from '@percy-io/react-percy-api-client';
import createDebug from 'debug';

import yargs from 'yargs';

const debug = createDebug('percy-storybook');
const VERSION = require('../package.json').version;


// eslint-disable-next-line import/prefer-default-export
export async function run(argv) {
  argv = yargs(argv)
        .usage(args.usage)
        .help()
        .alias('help', 'h')
        .options(args.options)
        .epilogue(args.docs)
        .default('build_dir', 'storybook-static')
        .default('minimum_height', '800')
        .argv;

  if (argv.help) {
    yargs.showHelp();
    return;
  }

  if (argv.version) {
    process.stdout.write(`v${VERSION}\n`);
    return;
  }

  const widths = getWidths(argv.widths);
  const minimumHeight = getMinimumHeight(argv.minimum_height);
  const rtlRegex = getRtlRegex(argv.rtl, argv.rtl_regex);

  const options = {
    debug: argv.debug,
    buildDir: argv.build_dir
  };

  if (process.env.PERCY_ENABLE === '0') {
        // eslint-disable-next-line no-console
    console.log('The PERCY_ENABLE environment variable is set to 0. Exiting.');
    return;
  }

  if (!process.env.PERCY_TOKEN) {
    throw new Error('The PERCY_TOKEN environment variable is missing.');
  }

  if (!process.env.PERCY_PROJECT) {
    throw new Error('The PERCY_PROJECT environment variable is missing.');
  }

  const { storyHtml, assets, storybookJavascriptPath } = getStaticAssets(options);
    // debug('assets %o', assets);

  const stories = await getStories(assets[storybookJavascriptPath], options);
  debug('stories %o', stories);

  const selectedStories = selectStories(stories, rtlRegex);
  debug('selectedStories %o', selectedStories);

  if (selectedStories.length === 0) {
    console.log('WARNING: No stories were found.'); // eslint-disable-line no-console
    return;
  }

  const client = new ApiClient(
      process.env.PERCY_TOKEN,
      process.env.PERCY_API
    );

  return uploadStorybook(client, selectedStories, widths, minimumHeight, storyHtml, assets);
}
