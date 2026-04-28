import command from '@percy/cli-command';
import * as StorybookConfig from './config.js';
import * as common from './common.js';
import start from './start.js';

export const storybook = command('storybook', {
  description: 'Snapshot static or hosted Storybook stories',
  commands: [start],

  args: [{
    name: 'url|directory',
    description: 'Storybook url or build output directory',
    attribute: val => /^https?:\/\//.test(val) ? 'url' : 'serve',
    required: true
  }],

  flags: [
    ...common.flags
  ],

  examples: [
    '$0 ./build',
    '$0 http://localhost:9000/'
  ],

  percy: {
    delayUploads: true
  },

  config: {
    schemas: [
      StorybookConfig.storybookSchema,
      StorybookConfig.configSchema
    ]
  }
}, async function*({ percy, args, flags, exit, log }) {
  if (!percy) exit(0, 'Percy is disabled');
  let { takeStorybookSnapshots } = yield import('./snapshots.js');
  let { createServer } = yield import('@percy/cli-command/utils');
  let server = args.serve && await createServer(args).listen();

  yield* takeStorybookSnapshots(percy, () => server?.close(), {
    baseUrl: args.url ?? server?.address(),
    flags
  });

  // Storybook hosting POC — upload the static directory as a zip to percy-api
  // after the snapshot run completes successfully. Directory mode only; URL
  // mode has no on-disk bundle to upload. Best-effort: failures are logged
  // and swallowed so the snapshot run remains the source of truth.
  if (args.serve) {
    yield* percy.yield.flush(); // ensure createBuild has resolved (delayUploads: true above)
    if (percy.build?.id) {
      let { uploadStorybookBundle } = yield import('./upload-bundle.js');
      yield uploadStorybookBundle({
        percy,
        log,
        directory: args.serve,
        buildId: percy.build.id
      });
    } else {
      log?.warn?.('Storybook bundle upload skipped: build id not available');
    }
  }
});

export default storybook;
