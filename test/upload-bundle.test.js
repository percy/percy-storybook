import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import axios from 'axios';
import { uploadStorybookBundle, MAX_BUNDLE_BYTES } from '../src/upload-bundle.js';

// Resolves the internal backoff sleeps immediately so retry tests don't wait ~65s.
function fakeSleep() {
  return spyOn(global, 'setTimeout').and.callFake((fn) => { fn(); return 0; });
}

describe('uploadStorybookBundle', () => {
  let directory;
  let percy;
  let log;
  let postSpy;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'sb-poc-'));
    writeFileSync(path.join(directory, 'index.html'), '<html></html>');
    mkdirSync(path.join(directory, 'sb-manager'));
    writeFileSync(path.join(directory, 'sb-manager', 'runtime.js'), 'console.log("x")');

    log = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      debug: jasmine.createSpy('debug')
    };

    percy = {
      client: { apiUrl: 'http://localhost:9090/api/v1', token: 'TEST_TOKEN' },
      build: { id: 42 }
    };

    postSpy = spyOn(axios, 'post').and.returnValue(Promise.resolve({ status: 201 }));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('zips the directory and POSTs to the bundle endpoint with auth', async () => {
    await uploadStorybookBundle({ percy, log, directory, buildId: 42 });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, form, opts] = postSpy.calls.mostRecent().args;
    expect(url).toBe('http://localhost:9090/api/v1/builds/42/storybook_bundle');
    expect(form).toBeDefined();
    expect(opts.headers.Authorization).toBe('Token token=TEST_TOKEN');
    expect(opts.maxContentLength).toBe(Infinity);
    expect(log.info).toHaveBeenCalledWith('Uploaded Storybook bundle for build #42');
    expect(log.warn).not.toHaveBeenCalled();
  });

  describe('input guards', () => {
    it('skips (no POST) when buildId is missing', async () => {
      await uploadStorybookBundle({ percy, log, directory, buildId: null });
      expect(postSpy).not.toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalled();
    });

    it('skips when directory is missing', async () => {
      await uploadStorybookBundle({ percy, log, directory: null, buildId: 42 });
      expect(postSpy).not.toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalled();
    });

    it('skips when percy.client is missing apiUrl/token', async () => {
      percy.client = {};
      await uploadStorybookBundle({ percy, log, directory, buildId: 42 });
      expect(postSpy).not.toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe('terminal (non-retryable) failures', () => {
    it('does not retry or beacon on a 4xx (e.g. 403 feature_disabled)', async () => {
      const err = new Error('forbidden');
      err.response = { status: 403 };
      postSpy.and.callFake(() => Promise.reject(err));

      await expectAsync(uploadStorybookBundle({ percy, log, directory, buildId: 42 })).toBeResolved();
      expect(postSpy).toHaveBeenCalledTimes(1); // no retry, no beacon POST
      expect(log.warn).toHaveBeenCalledWith('Storybook bundle upload skipped: HTTP 403');
    });
  });

  describe('transient failures with retry', () => {
    it('retries up to 3 times on 5xx then sends a failure beacon', async () => {
      fakeSleep();
      const err = new Error('server error');
      err.response = { status: 500 };
      // 3 upload attempts reject; the 4th call (beacon) resolves. callFake creates each
      // promise only when called and it is awaited immediately (no unhandled rejection).
      let call = 0;
      postSpy.and.callFake(() => {
        call += 1;
        return call <= 3 ? Promise.reject(err) : Promise.resolve({ status: 201 });
      });

      await expectAsync(uploadStorybookBundle({ percy, log, directory, buildId: 42 })).toBeResolved();

      expect(postSpy).toHaveBeenCalledTimes(4); // 3 uploads + 1 beacon
      const beacon = postSpy.calls.mostRecent().args[1];
      expect(beacon.getBuffer().toString()).toContain('client_failed');
      expect(log.warn).toHaveBeenCalledWith(
        'Storybook bundle upload failed after 3 attempts: HTTP 500'
      );
    });

    it('retries on a network error (no response)', async () => {
      fakeSleep();
      let call = 0;
      postSpy.and.callFake(() => {
        call += 1;
        return call === 1 ? Promise.reject(new Error('ECONNRESET')) : Promise.resolve({ status: 201 });
      });
      await uploadStorybookBundle({ percy, log, directory, buildId: 42 });
      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(log.info).toHaveBeenCalledWith('Uploaded Storybook bundle for build #42');
    });
  });

  describe('size cap', () => {
    it('skips the upload and beacons size_cap when the zip exceeds the limit', async () => {
      // Inject a tiny cap so the ordinary fixture zip is "over the limit".
      await uploadStorybookBundle({ percy, log, directory, buildId: 42, maxBytes: 1 });

      // Exactly one POST — the beacon — and no bundle upload.
      expect(postSpy).toHaveBeenCalledTimes(1);
      const beacon = postSpy.calls.mostRecent().args[1];
      expect(beacon.getBuffer().toString()).toContain('size_cap');
      expect(log.warn.calls.mostRecent().args[0]).toContain('exceeds the');
      expect(log.info).not.toHaveBeenCalled();
    });

    it('defaults the cap to 200 MB', () => {
      expect(MAX_BUNDLE_BYTES).toBe(200 * 1024 * 1024);
    });
  });
});
