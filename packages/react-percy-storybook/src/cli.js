import * as args from './args';

import getStories from './getStories';
import getStaticAssets from './getStaticAssets';
import getWidths from './getWidths';
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
        .default('ignore', 'node_modules')
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

    const widths = getWidths(argv.widths);

    const { storyHtml, assets } = getStaticAssets();
    // debug('assets %o', assets);

    const options = {
        debug: argv.debug
    };

    getStories(assets, options).then((stories) => {
        debug('stories %o', stories);

        const selectedStories = selectStories(stories);
        debug('selectedStories %o', selectedStories);

        if (selectedStories.length === 0) {
            console.log('No stories were found.'); // eslint-disable no-console
            return;
        }

        const client = new ApiClient(
          process.env.PERCY_TOKEN,
          process.env.PERCY_API
        );

        return uploadStorybook(client, selectedStories, widths, storyHtml, assets);
    }).catch((reason) => {
        console.log('Error encountered taking snapshots.'); // eslint-disable no-console
        console.log(reason); // eslint-disable no-console
    });
}
