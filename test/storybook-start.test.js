import path from 'path';
import EventEmitter from 'events';
import mockRequire from 'mock-require';
import logger from '@percy/logger/test/helpers';
import mockAPI from '@percy/client/test/helpers';
import { StorybookStart } from '../src/commands/storybook/start';

describe('percy storybook:start', () => {
  const args = [
    `--config-dir=${path.join(__dirname, '.storybook')}`,
    '--loglevel', 'error',
    '--ci'
  ];

  beforeEach(() => {
    process.env.PERCY_TOKEN = '<<PERCY_TOKEN>>';
    mockAPI.start(50);
    logger.mock();
  });

  afterEach(() => {
    delete process.env.PERCY_TOKEN;
    process.removeAllListeners();
    mockRequire.stopAll();
  });

  it('starts storybook and snapshots stories', async () => {
    await StorybookStart.run([...args]);

    expect(logger.stderr).toEqual([
      '[percy] Waiting on a response from Storybook...'
    ]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      `[percy] Running "start-storybook --host=localhost --port=9000 ${args.join(' ')}"`,
      '[percy] Percy has started!',
      '[percy] Created build #1: https://percy.io/test/test/123',
      '[percy] Found 3 snapshots',
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Skip: But Not Me',
      '[percy] Finalized build #1: https://percy.io/test/test/123',
      '[percy] Done!'
    ]));
  });

  it('logs any errors encountered while starting storybook', async () => {
    let fakeProc = Object.assign(new EventEmitter(), { kill: () => {} });
    setTimeout(() => fakeProc.emit('error', new Error('FAKE ENOENT')), 100);
    mockRequire('cross-spawn', () => fakeProc);

    await expectAsync(StorybookStart.run([...args]))
      .toBeRejectedWithError('EEXIT: 1');

    expect(logger.stdout).toEqual([
      `[percy] Running "start-storybook --host=localhost --port=9000 ${args.join(' ')}"`
    ]);
    expect(logger.stderr).toEqual([
      '[percy] Error: FAKE ENOENT'
    ]);
  });
});
