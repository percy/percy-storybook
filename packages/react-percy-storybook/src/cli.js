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
        .default('build_dir', 'storybook-static')
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

    const options = {
        debug: argv.debug,
        buildDir: argv.build_dir
    };

    if (!process.env.PERCY_TOKEN) {
        // eslint-disable-next-line no-console
        console.log('The PERCY_TOKEN environment variable is missing. Exiting.');
        return;
    }

    if (!process.env.PERCY_PROJECT) {
        // eslint-disable-next-line no-console
        console.log('The PERCY_PROJECT environment variable is missing. Exiting.');
        return;
    }

    const { storyHtml, assets, storybookJavascriptPath } = getStaticAssets(options);
    // debug('assets %o', assets);

    getStories(assets[storybookJavascriptPath], options).then((stories) => {
        debug('stories %o', stories);

        const selectedStories = selectStories(stories);
        debug('selectedStories %o', selectedStories);

        if (selectedStories.length === 0) {
            console.log('No stories were found.'); // eslint-disable-line no-console
            return;
        }

        const client = new ApiClient(
          process.env.PERCY_TOKEN,
          process.env.PERCY_API
        );

        return uploadStorybook(client, selectedStories, widths, storyHtml, assets);
    }).catch((reason) => {
        console.log('Error encountered taking snapshots.'); // eslint-disable-line no-console
        console.log(reason); // eslint-disable-line no-console
    });
}
