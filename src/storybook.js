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
    deferUploads: true
  },

  config: {
    schemas: [
      StorybookConfig.storybookSchema,
      StorybookConfig.configSchema
    ]
  }
}, async function*({ percy, args, flags, exit }) {
  if (!percy) exit(0, 'Percy is disabled');
  let { takeStorybookSnapshots } = yield import('./snapshots.js');
  let { createServer } = yield import('@percy/cli-command/utils');
  let server = args.serve && await createServer(args).listen();

  yield* takeStorybookSnapshots(percy, () => server?.close(), {
    baseUrl: args.url ?? server?.address(),
    flags
  });
});

export default storybook;
