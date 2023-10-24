import command from '@percy/cli-command';
import * as common from './common.js';

export const start = command('start', {
  description: 'Run start-storybook to snapshot stories',
  loose: true,

  flags: [...common.flags, {
    name: 'port',
    description: 'Port to start Storybook',
    type: 'number',
    default: 9000
  }, {
    name: 'host',
    description: 'Host to start Storybook',
    type: 'hostname',
    default: 'localhost'
  }],

  examples: [
    '$0',
    '$0 --port 9000',
    '$0 --static-dir public'
  ],

  percy: {
    delayUploads: true
  }
}, async function*({ percy, flags, argv, log, exit }) {
  if (!percy) exit(0, 'Percy is disabled');
  let { takeStorybookSnapshots } = yield import('./snapshots.js');
  let { default: { spawn } } = yield import('cross-spawn');
  let { host, port } = flags;
  let storybookVersion = process.env.STORYBOOK_VERSION || '6';

  let args = storybookVersion === '7' ? ['dev'] : [];
  args = args.concat(['--ci', `--host=${host}`, `--port=${port}`, ...argv]);

  let storybookBinary = storybookVersion === '7' ? 'storybook' : 'start-storybook';

  log.info(`Running "${storybookBinary} ${args.join(' ')}"`);

  let proc = yield new Promise((resolve, reject) => resolve(
    spawn(storybookBinary, args, { stdio: 'inherit' }).on('error', reject)
  ));

  /* istanbul ignore next: this is a storybook flag we don't need to test */
  let baseUrl = `${argv.includes('--https') ? 'https' : 'http'}://${host}:${port}`;
  yield* takeStorybookSnapshots(percy, () => proc.kill(), { baseUrl, flags });
});

export default start;
