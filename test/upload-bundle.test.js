import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import axios from 'axios';
import { uploadStorybookBundle, MAX_FILE_COUNT } from '../src/upload-bundle.js';

const sha256 = s => createHash('sha256').update(s).digest('hex');

describe('uploadStorybookBundle (CAS)', () => {
  let directory;
  let percy;
  let log;
  let postSpy;
  let putSpy;
  let indexSha;
  let appSha;

  // Route axios.post by URL: /check returns the missing set, /commit + beacon resolve.
  function stubPost({ missing }) {
    postSpy = spyOn(axios, 'post').and.callFake((url) => {
      if (url.endsWith('/check')) return Promise.resolve({ data: { missing } });
      return Promise.resolve({ status: 201 }); // /commit or beacon
    });
  }

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'sb-cas-'));
    writeFileSync(path.join(directory, 'index.html'), '<html>A</html>');
    mkdirSync(path.join(directory, 'assets'));
    writeFileSync(path.join(directory, 'assets', 'app.js'), 'console.log(1)');
    indexSha = sha256('<html>A</html>');
    appSha = sha256('console.log(1)');

    log = { info: jasmine.createSpy('info'), warn: jasmine.createSpy('warn'), debug: jasmine.createSpy('debug') };
    percy = { client: { apiUrl: 'http://localhost:9090/api/v1', token: 'TEST_TOKEN' }, build: { id: 42 } };
    putSpy = spyOn(axios, 'put').and.returnValue(Promise.resolve({ status: 200 }));
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('hashes files, checks, PUTs only missing blobs to GCS, then commits', async () => {
    stubPost({
      missing: [
        { sha256: indexSha, signed_url: 'https://gcs/index', headers: { 'x-goog-content-sha256': indexSha } },
        { sha256: appSha, signed_url: 'https://gcs/app', headers: { 'x-goog-content-sha256': appSha } }
      ]
    });

    await uploadStorybookBundle({ percy, log, directory, buildId: 42 });

    const checkCall = postSpy.calls.all().find(c => c.args[0].endsWith('/check'));
    expect(checkCall.args[1].files.map(f => f.sha256).sort()).toEqual([indexSha, appSha].sort());

    // Both missing blobs PUT directly to GCS, replaying the signed content-sha header.
    expect(putSpy).toHaveBeenCalledTimes(2);
    const putUrls = putSpy.calls.all().map(c => c.args[0]).sort();
    expect(putUrls).toEqual(['https://gcs/app', 'https://gcs/index']);
    expect(putSpy.calls.first().args[2].headers['x-goog-content-sha256']).toBeDefined();

    // Commit sent the full manifest (path -> sha).
    const commitCall = postSpy.calls.all().find(c => c.args[0].endsWith('/commit'));
    expect(commitCall.args[1].manifest.map(e => e.path).sort()).toEqual(['assets/app.js', 'index.html']);
    expect(log.info).toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('uploads only the missing shas (dedup) — already-stored files are skipped', async () => {
    stubPost({
      missing: [
        { sha256: appSha, signed_url: 'https://gcs/app', headers: {} }
      ]
    });

    await uploadStorybookBundle({ percy, log, directory, buildId: 42 });

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy.calls.first().args[0]).toBe('https://gcs/app');
    expect(postSpy.calls.all().some(c => c.args[0].endsWith('/commit'))).toBe(true);
  });

  describe('input guards', () => {
    it('skips (no /check) when buildId is missing', async () => {
      stubPost({ missing: [] });
      await uploadStorybookBundle({ percy, log, directory, buildId: null });
      expect(postSpy).not.toHaveBeenCalled();
      expect(putSpy).not.toHaveBeenCalled();
    });

    it('skips when percy.client lacks apiUrl/token', async () => {
      stubPost({ missing: [] });
      percy.client = {};
      await uploadStorybookBundle({ percy, log, directory, buildId: 42 });
      expect(postSpy).not.toHaveBeenCalled();
    });
  });

  describe('size cap', () => {
    it('beacons size_cap and does not /check when over the (injected) file-count cap', async () => {
      postSpy = spyOn(axios, 'post').and.returnValue(Promise.resolve({ status: 201 }));
      await uploadStorybookBundle({ percy, log, directory, buildId: 42, caps: { maxFileCount: 1 } });

      // No /check, no PUTs — only the beacon.
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy.calls.first().args[0]).toMatch(/\/storybook_bundle$/);
      expect(postSpy.calls.first().args[1].getBuffer().toString()).toContain('size_cap');
      expect(putSpy).not.toHaveBeenCalled();
    });
  });

  describe('terminal 403 on /check', () => {
    it('does not beacon (feature disabled is not a client failure)', async () => {
      const err = new Error('forbidden'); err.response = { status: 403 };
      postSpy = spyOn(axios, 'post').and.callFake((url) => {
        if (url.endsWith('/check')) return Promise.reject(err);
        return Promise.resolve({ status: 201 });
      });
      await uploadStorybookBundle({ percy, log, directory, buildId: 42 });
      const beacon = postSpy.calls.all().find(c => c.args[0].endsWith('/storybook_bundle'));
      expect(beacon).toBeUndefined();
      expect(log.warn).toHaveBeenCalledWith('Storybook bundle upload skipped: HTTP 403');
    });
  });

  describe('failure beacon', () => {
    it('beacons client_failed when a GCS PUT fails', async () => {
      stubPost({ missing: [{ sha256: indexSha, signed_url: 'https://gcs/index', headers: {} }] });
      putSpy.and.returnValue(Promise.reject(new Error('ECONNRESET')));
      await uploadStorybookBundle({ percy, log, directory, buildId: 42 });
      const beacon = postSpy.calls.all().find(c => c.args[0].endsWith('/storybook_bundle'));
      expect(beacon).toBeDefined();
      expect(beacon.args[1].getBuffer().toString()).toContain('client_failed');
    });
  });

  it('exposes MAX_FILE_COUNT', () => {
    expect(MAX_FILE_COUNT).toBe(5000);
  });
});
