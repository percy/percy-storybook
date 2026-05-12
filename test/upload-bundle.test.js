import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import axios from 'axios';
import { uploadStorybookBundle } from '../src/upload-bundle.js';

describe('uploadStorybookBundle', () => {
  let directory;
  let percy;
  let log;
  let postSpy;

  beforeEach(() => {
    // Build a tiny fake storybook-static dir on disk.
    directory = mkdtempSync(path.join(tmpdir(), 'sb-poc-'));
    writeFileSync(path.join(directory, 'index.html'), '<html></html>');
    mkdirSync(path.join(directory, 'sb-manager'));
    writeFileSync(path.join(directory, 'sb-manager', 'runtime.js'), 'console.log("x")');

    log = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn')
    };

    percy = {
      client: {
        apiUrl: 'http://localhost:9090/api/v1',
        token: 'TEST_TOKEN'
      },
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
    expect(opts.maxBodyLength).toBe(Infinity);
    expect(log.info).toHaveBeenCalledWith('Uploaded Storybook bundle for build #42');
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('logs a warning and does not throw on a 4xx response', async () => {
    const err = new Error('bad request');
    err.response = { status: 400 };
    postSpy.and.callFake(() => Promise.reject(err));
    await expectAsync(
      uploadStorybookBundle({ percy, log, directory, buildId: 42 })
    ).toBeResolved();
    expect(log.warn).toHaveBeenCalledWith('Storybook bundle upload failed: HTTP 400');
    expect(log.info).not.toHaveBeenCalled();
  });

  it('logs a warning and does not throw on a 5xx response', async () => {
    const err = new Error('server error');
    err.response = { status: 500 };
    postSpy.and.callFake(() => Promise.reject(err));
    await expectAsync(
      uploadStorybookBundle({ percy, log, directory, buildId: 42 })
    ).toBeResolved();
    expect(log.warn).toHaveBeenCalledWith('Storybook bundle upload failed: HTTP 500');
  });

  it('logs a warning and does not throw on a network error', async () => {
    postSpy.and.callFake(() => Promise.reject(new Error('ECONNREFUSED')));
    await expectAsync(
      uploadStorybookBundle({ percy, log, directory, buildId: 42 })
    ).toBeResolved();
    expect(log.warn).toHaveBeenCalledWith('Storybook bundle upload failed: ECONNREFUSED');
  });

  it('skips the upload (no POST) when buildId is missing', async () => {
    await uploadStorybookBundle({ percy, log, directory, buildId: null });
    expect(postSpy).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  it('skips the upload (no POST) when directory is missing', async () => {
    await uploadStorybookBundle({ percy, log, directory: null, buildId: 42 });
    expect(postSpy).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  it('skips the upload when percy.client is missing apiUrl/token', async () => {
    percy.client = {};
    await uploadStorybookBundle({ percy, log, directory, buildId: 42 });
    expect(postSpy).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });
});
