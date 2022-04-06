import { logger, setupTest } from '@percy/cli-command/test/helpers';
import { start } from '../src/index.js';

describe('percy storybook:start', () => {
  const args = [
    '--config-dir=./test/.storybook',
    '--loglevel=error'
  ];

  beforeEach(async () => {
    start.packageInformation = { name: '@percy/storybook' };
    process.env.PERCY_TOKEN = '<<PERCY_TOKEN>>';
    await setupTest();
  });

  afterEach(() => {
    delete process.env.PERCY_TOKEN;
  });

  it('starts storybook and snapshots stories', async () => {
    await start([...args]);

    // if there are stderr logs ensure it is only an acceptable warning
    expect(logger.stderr).toEqual(logger.stderr.length ? [
      '[percy] Waiting on a response from Storybook...'
    ] : []);

    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      `[percy] Running "start-storybook --ci --host=localhost --port=9000 ${args.join(' ')}"`,
      '[percy] Percy has started!',
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Skip: But Not Me',
      '[percy] Uploading 3 snapshots...',
      '[percy] Finalized build #1: https://percy.io/test/test/123'
    ]));
  });

  it('logs any errors encountered while starting storybook', async () => {
    let { default: EventEmitter } = await import('events');
    let { default: crossSpawn } = await import('cross-spawn');

    // stub cross-spawn to return an event emitter that emits an error
    spyOn(crossSpawn, 'spawn').and.callFake(() => {
      let fake = Object.assign(new EventEmitter(), { kill: () => {} });
      fake.emit('error', new Error('FAKE ENOENT'));
      return fake;
    });

    await expectAsync(start([...args])).toBeRejectedWithError('FAKE ENOENT');

    expect(logger.stdout).toEqual([
      `[percy] Running "start-storybook --ci --host=localhost --port=9000 ${args.join(' ')}"`
    ]);
    expect(logger.stderr).toEqual([
      '[percy] Error: FAKE ENOENT'
    ]);
  });
});
