import fs from 'fs';
import spawn from 'cross-spawn';
import { request } from '@percy/cli-command/utils';
import { api, logger, setupTest, createTestServer } from '@percy/cli-command/test/helpers';
import { storybook } from '../src/index.js';
import { checkStorybookVersion } from '../src/utils.js';

describe('percy storybook', () => {
  let server, proc;

  const FAKE_PREVIEW = '{ async extract() { return [] }, ' +
    'channel: { emit() {}, on: (a, c) => a === "storyRendered" && c() }' +
  ' }';

  beforeAll(async () => {
    server = await createTestServer({
      default: () => [200, 'text/html', '<p>Not Storybook</p>']
    });

    let storybookVersion = await checkStorybookVersion();
    let args = storybookVersion >= 7 ? ['dev'] : [];
    args = args.concat([
      '--config-dir=./test/.storybook',
      '--port=9000',
      '--ci'
    ]);
    let storybookBinary = storybookVersion >= 7 ? 'storybook' : 'start-storybook';

    proc = spawn(storybookBinary, args, { stdio: 'inherit' });

    // wait for storybook to become available
    await request('http://localhost:9000', {
      retries: 30,
      interval: 1000,
      retryNotFound: true
    });
  });

  afterAll(async () => {
    await server.close();
    proc.kill(9);
  });

  beforeEach(async () => {
    storybook.packageInformation = { name: '@percy/storybook' };
    process.env.PERCY_TOKEN = '<<PERCY_TOKEN>>';
    process.env.PERCY_CLIENT_ERROR_LOGS = false;
    await setupTest();
  });

  afterEach(() => {
    delete process.env.PERCY_TOKEN;
    delete process.env.PERCY_ENABLE;
    delete process.env.PERCY_CLIENT_ERROR_LOGS;
  });

  it('snapshots live urls', async () => {
    await storybook(['http://localhost:9000']);

    // if there are stderr logs ensure it is only an acceptable warning
    expect(logger.stderr).toEqual(logger.stderr.length ? [
      '[percy] Waiting on a response from Storybook...'
    ] : []);

    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Percy has started!',
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Skip: But Not Me',
      jasmine.stringMatching('\\[percy\\] Processing \\d snapshots?'),
      '[percy] Finalized build #1: https://percy.io/test/test/123'
    ]));
  });

  it('snapshots static builds', async () => {
    fs.$bypass.push(p => p.includes?.('.storybook-build'));
    await storybook(['./test/.storybook-build']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Percy has started!',
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Skip: But Not Me',
      jasmine.stringMatching('\\[percy\\] Processing \\d snapshots?'),
      '[percy] Finalized build #1: https://percy.io/test/test/123'
    ]));
  });

  it('errors when the build directory does not exist', async () => {
    await expectAsync(storybook(['.sb-build']))
      .toBeRejectedWithError('Not found: .sb-build');

    expect(logger.stderr).toEqual([
      '[percy] Error: Not found: .sb-build'
    ]);
  });

  it('does nothing when percy is disabled', async () => {
    process.env.PERCY_ENABLE = '0';
    await storybook(['http://localhost:9000']);

    expect(logger.stdout).toEqual([]);
    expect(logger.stderr).toEqual([
      '[percy] Percy is disabled'
    ]);
  });

  it('errors when the client api is missing', async () => {
    await expectAsync(storybook(['http://localhost:8000'])).toBeRejected();

    expect(logger.stderr).toEqual([
      '[percy] Build not created',
      '[percy] Error: Storybook object not found on the window. ' +
        'Open Storybook and check the console for errors.'
    ]);
  });

  it('errors when no snapshots are found', async () => {
    // fake storybook client api with no stories
    server.reply('/iframe.html', () => [200, 'text/html', [
      `<script>__STORYBOOK_PREVIEW__ = ${FAKE_PREVIEW}</script>`,
      '<script>__STORYBOOK_STORY_STORE__ = { raw: () => [] }</script>'
    ].join('')]);

    await expectAsync(storybook(['http://localhost:8000']))
      .toBeRejectedWithError('No snapshots found');

    expect(logger.stderr).toEqual([
      '[percy] Build not created',
      '[percy] Error: No snapshots found'
    ]);
  });

  it('errors when unable to reach storybook', async () => {
    const errorMessage = 'no coffee';
    server.reply('/iframe.html', () => new Promise(resolve => {
      setTimeout(resolve, 3000, [418, 'text/plain', errorMessage]);
    }));
    await expectAsync(storybook(['http://localhost:8000']))
      .toBeRejectedWithError(`418 I'm a Teapot\n${errorMessage}`);

    expect(logger.stderr).toEqual([
      '[percy] Waiting on a response from Storybook...',
      `[percy] Error: 418 I'm a Teapot\n${errorMessage}`
    ]);
  });

  it('errors when the storybook page errors', async () => {
    server.reply('/iframe.html', () => [200, 'text/html', [
      `<script>__STORYBOOK_PREVIEW__ = { async extract() { return ${JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' }
      ])}  }, ${
        'channel: { emit() {}, on: (a, c) => a === "storyErrored" && c(new Error("Story Error")) }'
      } }</script>`,
      `<script>__STORYBOOK_STORY_STORE__ = { raw: () => ${JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' }
      ])} }</script>`
    ].join('')]);

    server.reply('/iframe.html?id=1&viewMode=story', () => [200, 'text/html', [
      `<script>__STORYBOOK_PREVIEW__ = { async extract() { return ${JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' }
      ])}  }, ${
        'channel: { emit() {}, on: (a, c) => a === "storyErrored" && c(new Error("Story Error")) }'
      } }</script>`,
      `<script>__STORYBOOK_STORY_STORE__ = { raw: () => ${JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' }
      ])} }</script>`
    ].join('')]);

    await expectAsync(storybook(['http://localhost:8000']))
    // message contains the client stack trace
      .toBeRejectedWithError(/^Story Error\n.*\/iframe\.html.*$/s);

    expect(logger.stderr).toEqual([
      '[percy] Build not created',
      // message contains the client stack trace
      jasmine.stringMatching(/^\[percy\] Error: Story Error\n.*\/iframe\.html.*$/s)
    ]);
  });

  describe('with PERCY_SKIP_STORY_ON_ERROR set to true', () => {
    beforeAll(() => {
      process.env.PERCY_SKIP_STORY_ON_ERROR = true;
    });

    afterAll(() => {
      delete process.env.PERCY_SKIP_STORY_ON_ERROR;
    });

    it('skips the story and logs the error but does not break build', async () => {
      server.reply('/iframe.html', () => [200, 'text/html', [
        `<script>__STORYBOOK_PREVIEW__ = { async extract() { return ${JSON.stringify([
          { id: '1', kind: 'foo', name: 'bar' }
        ])} }, ${
          'channel: { emit() {}, on: (a, c) => a === "storyErrored" && c(new Error("Story Error")) }'
        } }</script>`,
        `<script>__STORYBOOK_STORY_STORE__ = { raw: () => ${JSON.stringify([
          { id: '1', kind: 'foo', name: 'bar' }
        ])} }</script>`
      ].join('')]);

      server.reply('/iframe.html?id=1&viewMode=story', () => [200, 'text/html', [
        `<script>__STORYBOOK_PREVIEW__ = { async extract() { return ${JSON.stringify([
          { id: '1', kind: 'foo', name: 'bar' }
        ])} }, ${
          'channel: { emit() {}, on: (a, c) => a === "storyErrored" && c(new Error("Story Error")) }'
        } }</script>`,
        `<script>__STORYBOOK_STORY_STORE__ = { raw: () => ${JSON.stringify([
          { id: '1', kind: 'foo', name: 'bar' }
        ])} }</script>`
      ].join('')]);

      // does not reject
      await storybook(['http://localhost:8000']);

      // contains logs of story error
      expect(logger.stderr).toEqual([
        '[percy] Failed to capture story: foo: bar',
        // error logs contain the client stack trace
        jasmine.stringMatching(/^\[percy\] Error: Story Error\n.*\/iframe\.html.*$/s),
        // does not create a build if all stories failed [ 1 in this case ]
        '[percy] Build not created'
      ]);
    });
  });

  it('uses the preview dom when javascript is enabled', async () => {
    const FAKE_PREVIEW_V8 = `{ async extract() { return ${JSON.stringify([
      { id: '1', kind: 'foo', name: 'bar' },
      { id: '2', kind: 'foo', name: 'bar/baz', parameters: { percy: { enableJavaScript: true } } }
    ])}
    }, ` +
    'channel: { emit() {}, on: (a, c) => a === "storyRendered" && c() }' +
    ' }';

    let previewDOM = [`<script>__STORYBOOK_PREVIEW__ = ${FAKE_PREVIEW_V8}</script>`,
      '<script>__STORYBOOK_STORY_STORE__ = { raw: () => ' + JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' },
        { id: '2', kind: 'foo', name: 'bar/baz', parameters: { percy: { enableJavaScript: true } } }
      ]) + ' }</script>',
      '<p>This is the preview</p>'
    ].join('');
    let storyDOM = [
      '<!DOCTYPE html><html><head></head><body>',
      '<p>This is a story. The html needs to be complete since it gets serialized</p>',
      `<script>__STORYBOOK_PREVIEW__ = ${FAKE_PREVIEW_V8}</script>`,
      '<script>__STORYBOOK_STORY_STORE__ = { raw: () => ' + JSON.stringify([
        { id: '1', kind: 'foo', name: 'bar' },
        { id: '2', kind: 'foo', name: 'bar/baz', parameters: { percy: { enableJavaScript: true } } }
      ]) + ' }</script>',
      '</body></html>'
    ].join('');

    // respond with the preview dom only for the first request
    server.reply('/iframe.html', () => [200, 'text/html', previewDOM]);
    server.reply('/iframe.html?id=1&viewMode=story', () => [200, 'text/html', storyDOM]);

    // eslint-disable-next-line import/no-extraneous-dependencies
    let { Percy } = await import('@percy/core');
    spyOn(Percy.prototype, 'snapshot').and.callThrough();

    await storybook(['http://localhost:8000']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot taken: foo: bar',
      '[percy] Snapshot taken: foo: bar/baz'
    ]));

    const callArgs = Percy.prototype.snapshot.calls.allArgs();

    // match only body
    expect(callArgs[0][0].domSnapshot).toEqual(jasmine.objectContaining({
      html: jasmine.stringContaining(storyDOM.replace(/^.*<\/head>/, ''))
    }));

    expect(callArgs[1][0].domSnapshot).toEqual(previewDOM);
  });

  it('removes element when domTransformation is passed', async () => {
    // eslint-disable-next-line import/no-extraneous-dependencies
    let { Percy } = await import('@percy/core');
    spyOn(Percy.prototype, 'snapshot').and.callThrough();

    await storybook(['http://localhost:9000', '--include=First']);

    const callArgs = Percy.prototype.snapshot.calls.allArgs();

    expect(callArgs[0][0].domSnapshot).not.toEqual(jasmine.objectContaining({
      html: jasmine.stringContaining('<p class="removeMe">This heading should be removed using domTransformation</p>')
    }));
  });

  it('sends the version of storybook when creating snapshots', async () => {
    await storybook(['http://localhost:9000']);

    let ua = api.requests['/builds/123/snapshots'].map(req => req.headers['User-Agent'])[0];
    expect(ua).toMatch(/storybook\/\d+\.\d+\.\d+.*?/);
    expect(logger.stderr).toEqual([]);
  });

  it('excludes stories from snapshots with --exclude', async () => {
    await storybook(['http://localhost:9000', '--exclude=Snapshot', '--exclude=Options']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Processing 1 snapshot...',
      '[percy] Snapshot taken: Skip: But Not Me'
    ]));
  });

  it('includes stories for snapshots with --include', async () => {
    await storybook(['http://localhost:9000', '--include=Skip']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot taken: Skip: Skipped',
      '[percy] Snapshot taken: Skip: But Not Me',
      jasmine.stringMatching('\\[percy\\] Processing \\d snapshots?')
    ]));
  });

  it('includes additional snapshots defined by config options', async () => {
    fs.writeFileSync('.percy.yml', [
      'version: 2',
      'storybook:',
      '  additional-snapshots:',
      '    - include: [First, Second]',
      '      suffix: " (added)"',
      '      args: { foo: bar }'
    ].join('\n'));

    await storybook(['http://localhost:9000']);

    expect(logger.stderr).toEqual([]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: Snapshot: First (added)',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Snapshot: Second (added)',
      '[percy] Snapshot taken: Skip: But Not Me'
    ]));
  });

  it('warns when additional snapshots specify conflicting name options', async () => {
    fs.writeFileSync('.percy.yml', [
      'version: 2',
      'storybook:',
      '  additional-snapshots:',
      '    - include: /first/i',
      '      prefix: "A "',
      '      suffix: " (added)"',
      '      name: No prefix or suffix',
      '    - include: /second/i'
    ].join('\n'));

    await storybook(['http://localhost:9000']);

    expect(logger.stderr).toEqual([
      '[percy] Invalid config:',
      '[percy] - storybook.additionalSnapshots[0]: prefix & suffix are ignored when a name is provided',
      '[percy] - storybook.additionalSnapshots[1]: missing required name, prefix, or suffix'
    ]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: No prefix or suffix',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Skip: But Not Me'
    ]));
  });

  it('does not upload and logs snapshots with --dry-run', async () => {
    await storybook(['http://localhost:9000', '--dry-run']);

    expect(logger.stderr).toEqual([
      '[percy] Build not created'
    ]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot found: Snapshot: First',
      '[percy] Snapshot found: Snapshot: Second',
      '[percy] Snapshot found: Skip: But Not Me',
      '[percy] Found 3 snapshots'
    ]));

    // coverage for `snapshot(s)` log
    logger.reset();
    await storybook(['http://localhost:9000', '--dry-run', '--include=First']);

    expect(logger.stderr).toEqual([
      '[percy] Build not created'
    ]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot found: Snapshot: First',
      '[percy] Found 1 snapshot'
    ]));
  });

  it('does not upload and logs urls with --dry-run and --verbose ', async () => {
    await storybook(['http://localhost:9000', '--dry-run', '--verbose', '--include=Args']);

    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy:core] Snapshot found: Args',
      '[percy:core] Snapshot found: Args (bold)',
      '[percy:core] Snapshot found: Custom Args',
      '[percy:core] Snapshot found: Purple (Args)',
      '[percy:core] Snapshot found: Special Args',
      '[percy:core] Found 5 snapshots'
    ]));

    expect(logger.stderr).toEqual(jasmine.arrayContaining([
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=args--args',
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=args--args&args=' +
        'text:Snapshot+custom+args;style.font:1rem+sans-serif',
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=args--args&args=' +
        'text:Snapshot+custom+bold+args;style.font:1rem+sans-serif;style.fontWeight:bold',
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=args--args&args=' +
        'text:Snapshot+purple+args;' +
        'style.font:1rem+sans-serif;' +
        'style.fontWeight:bold;' +
        'style.color:purple',
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=args--args&args=' +
        'null:!null;undefined:!undefined;' +
        'smallNum:3;largeNum:12000000;' +
        'date:!date(2022-01-01T00:00:00.000Z);' +
        'rgb:!rgb(20,30,40);rgba:!rgba(20,30,40,.5);' +
        'hsl:!hsl(120,80,30);hsla:!hsla(120,80,30,.5);' +
        'shortHex:!hex(c6c);longHex:!hex(a907cf);alphaHex:!hex(a907cf9f)'
    ]));
  });

  it('warns when using invalid percy options', async () => {
    fs.writeFileSync('.percy.yml', [
      'version: 2',
      'storybook:',
      '  additional-snapshots:',
      '    - include: /two/i',
      '      suffix: " (2)"',
      '      args: { invalid: "!@#$%" }',
      '      globals: { invalid: "^&*()" }',
      '      waitForSelector: .foo-bar'
    ].join('\n'));

    await storybook(['http://localhost:9000', '--dry-run', '--include=Options: Invalid']);

    expect(logger.stderr).toEqual([
      '[percy] Invalid Storybook parameters:',
      '[percy] - percy.args.invalid: omitted potentially unsafe arg',
      '[percy] - percy.globals.invalid: omitted potentially unsafe global',
      '[percy] - percy.invalid: unknown property',
      '[percy] Build not created'
    ]);
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot found: Options: Invalid One',
      '[percy] Snapshot found: Options: Invalid Two',
      '[percy] Snapshot found: Options: Invalid Two (2)',
      '[percy] Found 3 snapshots'
    ]));
  });

  it('warns when using capture options with javascript enabled', async () => {
    fs.writeFileSync('.percy.yml', [
      'version: 2',
      'snapshot:',
      '  enableJavaScript: true',
      'storybook:',
      '  waitForSelector: "#root"',
      '  additionalSnapshots:',
      '    - include: Skip',
      '      suffix: " (Invalid Wait)"',
      '      waitForSelector: "body"',
      '    - include: Skip',
      '      suffix: " (Valid Wait)"',
      '      waitForSelector: "body"'
    ].join('\n'));

    await storybook(['http://localhost:9000']);

    expect(logger.stderr).toEqual(jasmine.arrayContaining([
      '[percy] Invalid config:',
      '[percy] - storybook.waitForSelector: not used with JavaScript enabled',
      '[percy] - storybook.additionalSnapshots[0].waitForSelector: not used with JavaScript enabled'
    ]));
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy] Snapshot taken: Snapshot: First',
      '[percy] Snapshot taken: Snapshot: Second',
      '[percy] Snapshot taken: Skip: But Not Me',
      '[percy] Snapshot taken: Skip: But Not Me (Invalid Wait)',
      '[percy] Snapshot taken: Skip: But Not Me (Valid Wait)'
    ]));
  });

  it('appends custom args, globals, and query params to story urls', async () => {
    await storybook(['http://localhost:9000', '--dry-run', '--verbose', '--include=/params/']);

    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy:core] Snapshot found: From params',
      '[percy:core] Snapshot found: From params w/ globals',
      '[percy:core] Snapshot found: From params w/ query params',
      '[percy:core] Snapshot found: From params w/ mixed params',
      '[percy:core] Found 4 snapshots'
    ]));

    expect(logger.stderr).toEqual(jasmine.arrayContaining([
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=mixed--params',
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=mixed--params' +
        '&globals=text:+with+globals',
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=mixed--params' +
        `&text=${encodeURIComponent(' with query params')}`,
      '[percy:core:snapshot] - url: http://localhost:9000/iframe.html?id=mixed--params' +
        `&args=text:Args&globals=text:+globals&text=${encodeURIComponent(' and params')}`
    ]));
  });

  it('handles page crashes while taking snapshots', async () => {
    // eslint-disable-next-line import/no-extraneous-dependencies
    let { Percy } = await import('@percy/core');

    let error = new Error('Page crashed');
    let spy = spyOn(Percy.prototype, 'snapshot').and.callThrough()
      .withArgs(jasmine.objectContaining({ name: 'Snapshot: Second' }))
      .and.throwError(error);

    await expectAsync(storybook(['http://localhost:9000', '--dry-run', '--verbose']))
      .toBeRejectedWith(error);

    // called once for the first snapshot and twice while retrying the second
    expect(spy).toHaveBeenCalledTimes(3);

    expect(logger.stderr).toEqual(jasmine.arrayContaining([
      '[percy:storybook] Page crashed while loading story: Snapshot: Second',
      '[percy:core] Build not created',
      `[percy:cli] ${error.stack}`
    ]));
    expect(logger.stdout).toEqual(jasmine.arrayContaining([
      '[percy:core] Snapshot found: Snapshot: First'
    ]));
  });

  describe('with protected urls', () => {
    beforeAll(() => {
      let auth = [
        `Basic ${Buffer.from('foo:bar').toString('base64')}`,
        `Basic ${Buffer.from('foobar').toString('base64')}`,
        'Token xyzzy'
      ];

      let stories = [{
        id: 'test--test',
        kind: 'Test',
        name: 'test'
      }];

      const FAKE_PREVIEW_V8 = `{ async extract() { return ${JSON.stringify(stories)} }, ` +
      'channel: { emit() {}, on: (a, c) => a === "storyRendered" && c() }' +
      ' }';

      server.reply('/iframe.html', req => {
        if (!auth.includes(req.headers.authorization)) {
          return [403, 'text/plain', 'Invalid auth'];
        }
        return [200, 'text/html', [
          `<script>__STORYBOOK_PREVIEW__ = ${FAKE_PREVIEW_V8}</script>`,
          `<script>__STORYBOOK_STORY_STORE__ = { raw: () => ${JSON.stringify(stories)} }</script>`
        ].join('')];
      });

      server.reply('/iframe.html?id=test--test&viewMode=story', req => {
        if (!auth.includes(req.headers.authorization)) {
          return [403, 'text/plain', 'Invalid auth'];
        }
        return [200, 'text/html', [
          `<script>__STORYBOOK_PREVIEW__ = ${FAKE_PREVIEW_V8}</script>`,
          `<script>__STORYBOOK_STORY_STORE__ = { raw: () => ${JSON.stringify(stories)} }</script>`
        ].join('')];
      });
    });

    it('takes snapshots with discovery auth username & password', async () => {
      fs.writeFileSync('.percy.yml', [
        'version: 2',
        'discovery:',
        '  authorization:',
        '    username: foo',
        '    password: bar'
      ].join('\n'));

      await storybook(['http://localhost:8000']);

      expect(logger.stderr).toEqual([]);
      expect(logger.stdout).toEqual(jasmine.arrayContaining([
        '[percy] Snapshot taken: Test: test'
      ]));
    });

    it('takes snapshots with discovery auth username only', async () => {
      fs.writeFileSync('.percy.yml', [
        'version: 2',
        'discovery:',
        '  authorization:',
        '    username: foobar'
      ].join('\n'));

      await storybook(['http://localhost:8000']);

      expect(logger.stderr).toEqual([]);
      expect(logger.stdout).toEqual(jasmine.arrayContaining([
        '[percy] Snapshot taken: Test: test'
      ]));
    });

    it('takes snapshots with discovery request-headers', async () => {
      fs.writeFileSync('.percy.yml', [
        'version: 2',
        'discovery:',
        '  request-headers:',
        '    Authorization: Token xyzzy'
      ].join('\n'));

      await storybook(['http://localhost:8000']);

      expect(logger.stderr).toEqual([]);
      expect(logger.stdout).toEqual(jasmine.arrayContaining([
        '[percy] Snapshot taken: Test: test'
      ]));
    });
  });

  describe('splitting snapshots', () => {
    beforeEach(() => {
      delete process.env.PERCY_PARALLEL_TOTAL;
      delete process.env.PERCY_PARTIAL_BUILD;
    });

    it('can use --shard-count to split snapshots and set PERCY_PARALLEL_TOTAL', async () => {
      expect(process.env.PERCY_PARALLEL_TOTAL).toBeUndefined();

      await expectAsync(storybook(['http://localhost:9000', '--dry-run', '--shard-count=2']))
        .toBeRejectedWithError("Missing '--shard-index'. Found 2 shards of 2 snapshots each (3 total)");

      expect(process.env.PERCY_PARALLEL_TOTAL).toEqual('2');

      expect(logger.stderr).toEqual([
        '[percy] Build not created',
        "[percy] Error: Missing '--shard-index'. Found 2 shards of 2 snapshots each (3 total)"
      ]);
    });

    it('can use --shard-size to split snapshots and imply PERCY_PARALLEL_TOTAL=-1', async () => {
      expect(process.env.PERCY_PARALLEL_TOTAL).toBeUndefined();

      await expectAsync(storybook(['http://localhost:9000', '--dry-run', '--shard-size=1']))
        .toBeRejectedWithError("Missing '--shard-index'. Found 3 shards of 1 snapshots each (3 total)");

      expect(process.env.PERCY_PARALLEL_TOTAL).toEqual('-1');

      expect(logger.stderr).toEqual([
        '[percy] Build not created',
        "[percy] Error: Missing '--shard-index'. Found 3 shards of 1 snapshots each (3 total)"
      ]);
    });

    it('can use --shard-index to select a group of split snapshots to take', async () => {
      await storybook(['http://localhost:9000', '--dry-run', '--shard-count=3', '--shard-index=1']);

      expect(logger.stderr).toEqual([
        '[percy] Build not created'
      ]);
      expect(logger.stdout).toEqual(jasmine.arrayContaining([
        '[percy] Percy has started!',
        '[percy] Snapshot found: Snapshot: Second',
        '[percy] Found 1 snapshot'
      ]));
    });

    it('can use --partial to set PERCY_PARTIAL_BUILD', async () => {
      expect(process.env.PERCY_PARTIAL_BUILD).toBeUndefined();
      expect(process.env.PERCY_PARALLEL_TOTAL).toBeUndefined();

      await expectAsync(storybook(['http://localhost:9000', '--dry-run', '--shard-count=2', '--partial']))
        .toBeRejectedWithError("Missing '--shard-index'. Found 2 shards of 2 snapshots each (3 total)");

      expect(process.env.PERCY_PARTIAL_BUILD).toEqual('1');
      // --shard-count + --partial should set PERCY_PARALLEL_TOTAL=-1
      expect(process.env.PERCY_PARALLEL_TOTAL).toEqual('-1');

      expect(logger.stderr).toEqual([
        '[percy] Build not created',
        "[percy] Error: Missing '--shard-index'. Found 2 shards of 2 snapshots each (3 total)"
      ]);
    });

    it('errors when providing both --shard-count and --shard-size', async () => {
      await expectAsync(storybook(['http://localhost:9000', '--dry-run', '--shard-size=1', '--shard-count=3']))
        .toBeRejectedWithError("Must specify either '--shard-size' OR '--shard-count' not both");

      expect(logger.stderr).toEqual([
        '[percy] Build not created',
        "[percy] Error: Must specify either '--shard-size' OR '--shard-count' not both"
      ]);
    });

    it('errors when providing --shard-index without either --shard-count or --shard-size', async () => {
      await expectAsync(storybook(['http://localhost:9000', '--dry-run', '--shard-index=0']))
        .toBeRejectedWithError("Found '--shard-index' but missing '--shard-size' or '--shard-count'");

      expect(logger.stderr).toEqual([
        '[percy] Build not created',
        "[percy] Error: Found '--shard-index' but missing '--shard-size' or '--shard-count'"
      ]);
    });

    it('errors when providing --shard-index outside the possible range', async () => {
      await expectAsync(
        storybook(['http://localhost:9000', '--dry-run', '--shard-size=2', '--shard-index=7'])
      ).toBeRejectedWithError(
        "The provided '--shard-index' (7) is out of range." +
          ' Found 2 shards of 2 snapshots each (3 total)'
      );

      expect(logger.stderr).toEqual([
        '[percy] Build not created',
        "[percy] Error: The provided '--shard-index' (7) is out of range." +
          ' Found 2 shards of 2 snapshots each (3 total)'
      ]);
    });
  });
});
