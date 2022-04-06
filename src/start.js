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
    deferUploads: true
  }
}, async function*({ percy, flags, argv, log, exit }) {
  if (!percy) exit(0, 'Percy is disabled');
  let { getStorybookSnapshots } = await import('./snapshots.js');
  let { default: { spawn } } = await import('cross-spawn');
  let { host, port } = flags;

  let args = ['--ci', `--host=${host}`, `--port=${port}`, ...argv];
  log.info(`Running "start-storybook ${args.join(' ')}"`);

  let proc = yield new Promise((resolve, reject) => resolve(
    spawn('start-storybook', args, { stdio: 'inherit' }).on('error', reject)
  ));

  try {
    yield* percy.yield.start();

    yield* percy.yield.snapshot({
      /* istanbul ignore next: this is a storybook flag we don't need to test */
      baseUrl: `${argv.includes('--https') ? 'https' : 'http'}://${host}:${port}`,
      snapshots: baseUrl => getStorybookSnapshots(percy, baseUrl)
    });

    yield* percy.yield.stop();
  } catch (error) {
    await percy.stop(true);
    throw error;
  } finally {
    proc.kill();
  }
});

export default start;
