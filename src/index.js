import * as args from './args';

import getIframePath from './getIframePath';
import getStories from './getStories';
import getStaticAssets from './getStaticAssets';
import getWidths from './getWidths';
import getMinimumHeight from './getMinimumHeight';
import getOutputFormat from './getOutputFormat';
import getRtlRegex from './getRtlRegex';
import selectStories from './selectStories';
import uploadStorybook from './uploadStorybook';
import storybookVersion from './storybookVersion';
import frameworkVersion from './frameworkVersion';

import ApiClient from '@percy/react-percy-api-client';
import createDebug from 'debug';

import yargs from 'yargs';

const debug = createDebug('percy-storybook');
const VERSION = require('../package.json').version;

export async function run(argv) {
  argv = yargs(argv)
    .usage(args.usage)
    .help()
    .alias('help', 'h')
    .options(args.options)
    .epilogue(args.docs)
    .default('build_dir', 'storybook-static')
    .default('output_format', 'text')
    .default('minimum_height', '800')
    .default('fail_on_empty', 'false')
    .default('puppeteer_launch_retries', '0').argv;

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
    // Configure debug logging if flag specified, or if it was already enabled via DEBUG env var
    debug: argv.debug || debug.enabled,
    buildDir: argv.build_dir,
    outputFormat: getOutputFormat(argv.output_format),
    failOnEmpty: argv.fail_on_empty === 'true',
    puppeteerLaunchRetries: parseInt(argv.pupeteer_launch_retries, 10),
  };

  // Enable debug logging based on options.
  debug.enabled = options.debug;

  if (process.env.PERCY_ENABLE === '0') {
    if (options.outputFormat == 'text') {
      // eslint-disable-next-line no-console
      console.log('The PERCY_ENABLE environment variable is set to 0. Exiting.');
    } else if (options.outputFormat == 'json') {
      // eslint-disable-next-line no-console
      console.log(`{'exitReason':'The PERCY_ENABLE environment variable is set to 0.'}`);
    }
    return;
  }

  if (!process.env.PERCY_TOKEN) {
    throw new Error('The PERCY_TOKEN environment variable is missing.');
  }

  // Not skipping, so get the iframe path and verify it exists
  options.iframePath = getIframePath(options);

  const { storyHtml, assets } = getStaticAssets(options);
  // debug('assets %o', assets);

  const rawStories = await getStories(options);
  debug('rawStories %s', JSON.stringify(rawStories));

  const selectedStories = selectStories(rawStories, rtlRegex);
  debug('selectedStories %o', selectedStories);

  if (selectedStories.length === 0) {
    const message = 'percy-storybook found no stories in the static storybook.';
    if (options.failOnEmpty) {
      throw new Error(message);
    }
    if (options.outputFormat == 'text') {
      // eslint-disable-next-line no-console
      console.log(message);
    } else if (options.outputFormat == 'json') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ exitReason: message }));
    }
    return;
  }

  const client = new ApiClient(
    process.env.PERCY_TOKEN,
    process.env.PERCY_API,
    `@percy/storybook/${VERSION}`,
    `storybook/${storybookVersion()} ${frameworkVersion()}`
  );

  return uploadStorybook(client, selectedStories, widths, minimumHeight, storyHtml, assets, options.outputFormat);
}
