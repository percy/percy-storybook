import path from 'path';
import spawn from 'cross-spawn';
import mockAPI from '@percy/client/test/helpers';
import { sha256hash } from '@percy/client/dist/utils';
import request from '@percy/client/dist/request';
import logger from '@percy/logger/test/helpers';
import createTestServer from '@percy/core/test/helpers/server';
import { Storybook } from '../src/commands/storybook';

describe('percy storybook', () => {
  let server, sbproc;

  beforeAll(async () => {
    require('../src/hooks/init').default();

    server = await createTestServer({
      default: () => [200, 'text/html', '<p>Not Storybook</p>']
    });

    sbproc = spawn('start-storybook', [
      `--config-dir=${path.join(__dirname, '.storybook')}`,
      '--port=9000',
      '--ci'
    ]);

    // wait for storybook to become available
    await request('http://localhost:9000', {
      retries: 30,
      interval: 1000,
      retryNotFound: true
    });
  });

  afterAll(async () => {
    await server.close();
    sbproc.kill(9);
  });

  beforeEach(() => {
    process.env.PERCY_TOKEN = '<<PERCY_TOKEN>>';
    mockAPI.start(50);
    logger.mock();
  });

  afterEach(() => {
    delete process.env.PERCY_TOKEN;
    delete process.env.PERCY_ENABLE;
    process.removeAllListeners();
  });

  it('snapshots live urls', async () => {
    await Storybook.run(['http://localhost:9000']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
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

  it('snapshots static builds', async () => {
    await Storybook.run([path.join(__dirname, '.storybook-build')]);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
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

  it('errors when the build directory does not exist', async () => {
    let dir = path.join(__dirname, '.sb-build');

    await expectAsync(Storybook.run([dir]))
      .toBeRejectedWithError('EEXIT: 1');

    expect(logger.stdout).toEqual([]);
    expect(logger.stderr).toEqual([
      `[percy] Error: Not found: ${dir}`
    ]);
  });

  it('does nothing when percy is disabled', async () => {
    process.env.PERCY_ENABLE = '0';

    await Storybook.run(['http://localhost:9000']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual([
      '[percy] Percy is disabled. Skipping snapshots'
    ]);
  });

  it('errors when the client api is missing', async () => {
    await expectAsync(Storybook.run(['http://localhost:8000']))
      .toBeRejectedWithError('EEXIT: 1');

    expect(logger.stdout).toEqual([]);
    expect(logger.stderr).toEqual([
      '[percy] Error: Storybook object not found on the window. ' +
        'Open Storybook and check the console for errors.'
    ]);
  });

  it('errors when no snapshots are found', async () => {
    // fake storybook client api with no stories
    server.reply('/iframe.html', () => [200, 'text/html', (
      '<script>__STORYBOOK_CLIENT_API__ = { raw: () => [] }</script>'
    )]);

    await expectAsync(Storybook.run(['http://localhost:8000']))
      .toBeRejectedWithError('EEXIT: 1');

    expect(logger.stdout).toEqual([]);
    expect(logger.stderr).toEqual([
      '[percy] Error: No snapshots found'
    ]);
  });

  it('errors when unable to reach storybook', async () => {
    server.reply('/iframe.html', () => new Promise(resolve => {
      setTimeout(resolve, 3000, [418, 'text/plain', 'no coffee']);
    }));

    await expectAsync(Storybook.run(['http://localhost:8000']))
      .toBeRejectedWithError('EEXIT: 1');

    expect(logger.stdout).toEqual([]);
    expect(logger.stderr).toEqual([
      '[percy] Waiting on a response from Storybook...',
      '[percy] Error: 418 I\'m a Teapot'
    ]);
  });

  it('replaces dom snapshots with the preview dom when javascript is enabled', async () => {
    let previewDOM = '<p>This is the preview</p>';
    let i = 0;

    let storyDOM = [
      '<!DOCTYPE html><html><head></head><body>',
      '<p>This is a story. The html needs to be complete since it gets serialized</p>',
      '<script>__STORYBOOK_CLIENT_API__ = { raw: () => ' + JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' },
        { id: '2', kind: 'foo', name: 'bar/baz', parameters: { percy: { enableJavaScript: true } } }
      ]) + ' }</script>',
      '</body></html>'
    ].join('');

    // respond with the preview dom only for the first request
    server.reply('/iframe.html', () => [200, 'text/html', i++ ? storyDOM : previewDOM]);

    await Storybook.run(['http://localhost:8000']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot taken: foo: bar',
      '[percy] Snapshot taken: foo: bar/baz'
    ]));

    // map to values we care about testing
    expect(mockAPI.requests['/builds/123/snapshots'].map(req => [
      req.body.data.attributes.name,
      req.body.data.relationships.resources
        .data.find(r => r.attributes['is-root']).id
    ]).sort((a, b) => a[0] > b[0] ? 1 : -1)).toEqual([
      ['foo: bar', sha256hash(storyDOM)],
      ['foo: bar/baz', sha256hash(previewDOM)]
    ]);
  });

  it('excludes stories from snapshots with --exclude', async () => {
    await Storybook.run(['http://localhost:9000', '--exclude=Snapshot']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Found 1 snapshot',
      '[percy] Snapshot taken: Skip: But Not Me'
    ]));
  });

  it('includes stories for snapshots with --include', async () => {
    await Storybook.run(['http://localhost:9000', '--include=Skip']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Found 2 snapshots',
      '[percy] Snapshot taken: Skip: Skipped',
      '[percy] Snapshot taken: Skip: But Not Me'
    ]));
  });

  it('does not upload and logs snapshots with --dry-run', async () => {
    await Storybook.run(['http://localhost:9000', '--dry-run']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Found 3 snapshots',
      '[percy] Snapshot found: Snapshot: First',
      '[percy] Snapshot found: Snapshot: Second',
      '[percy] Snapshot found: Skip: But Not Me'
    ]));
  });

  it('does not upload and logs urls with --dry-run and --verbose ', async () => {
    await Storybook.run(['http://localhost:9000', '--dry-run', '--verbose', '--include=Args']);

    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy:cli:storybook] Found 4 snapshots',
      '[percy:cli:storybook] Snapshot found: Args',
      '[percy:cli:storybook] Snapshot found: Args (bold)',
      '[percy:cli:storybook] Snapshot found: Custom Args',
      '[percy:cli:storybook] Snapshot found: Purple (Args)'
    ]));

    expect(logger.stderr).toEqual(jasmine.arrayContaining([
      '[percy:cli:storybook] -> url: http://localhost:9000/iframe.html?id=args--args',
      '[percy:cli:storybook] -> url: http://localhost:9000/iframe.html?id=args--args&args=' +
        encodeURIComponent('text:Snapshot+custom+args;style.font:1rem+sans-serif'),
      '[percy:cli:storybook] -> url: http://localhost:9000/iframe.html?id=args--args&args=' +
        encodeURIComponent('text:Snapshot+custom+bold+args;style.font:1rem+sans-serif;') +
        encodeURIComponent('style.fontWeight:bold'),
      '[percy:cli:storybook] -> url: http://localhost:9000/iframe.html?id=args--args&args=' +
        encodeURIComponent('text:Snapshot+purple+args;style.font:1rem+sans-serif;') +
        encodeURIComponent('style.fontWeight:bold;style.color:purple')
    ]));
  });
});
