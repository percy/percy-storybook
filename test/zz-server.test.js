import fs from 'fs';
import path from 'path';
import { PERCY_EVENTS } from '../src/constants.cjs';
import { PERCY_API_BASE, validateBuildId, basicAuth } from '../src/server/utils.cjs';
import {
  getEnvPath, getPercyYmlPath, parseEnv, setKey,
  readEnv, readEnvRaw, writeEnvRaw
} from '../src/server/env.cjs';
import { logApiCall, loggedFetch, getApiLogPath } from '../src/server/apiLogger.cjs';
import {
  readBsCredentials, writeBsCredentials, clearSessionCredentials, registerCredentialHandlers
} from '../src/server/credentials.cjs';
import { registerPercyApiHandlers } from '../src/server/percyApi.cjs';
import { registerBuildItemsHandlers } from '../src/server/buildItems.cjs';
import { registerSnapshotDetailHandlers } from '../src/server/snapshotDetail.cjs';
import { registerBuildApiHandlers } from '../src/server/buildApi.cjs';
import {
  readPercyYml, writePercyYml, fetchPercyToken, setPercyToken,
  registerProjectConfigHandlers
} from '../src/server/projectConfig.cjs';
import { runPercyBuild, registerSnapshotHandlers, runAsyncGenerator } from '../src/server/snapshots.cjs';

/* ─── Test helpers ────────────────────────────────────────────────────── */

function createMockChannel() {
  const handlers = {};
  return {
    on(event, cb) {
      handlers[event] = handlers[event] || [];
      handlers[event].push(cb);
    },
    emit: jasmine.createSpy('emit'),
    async trigger(event, payload) {
      for (const cb of (handlers[event] || [])) await cb(payload);
    }
  };
}

function mockResponse(body, { ok = true, status = 200, statusText = 'OK', headers = {} } = {}) {
  const headerMap = new Map(Object.entries(headers));
  return {
    ok,
    status,
    statusText,
    headers: { get: (name) => headerMap.get(name) || null },
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  };
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  1. utils.cjs                                                         */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / utils.cjs', () => {
  describe('PERCY_API_BASE', () => {
    it('equals the Percy v1 API URL', () => {
      expect(PERCY_API_BASE).toBe('https://percy.io/api/v1');
    });
  });

  describe('validateBuildId', () => {
    it('returns string for valid numeric IDs', () => {
      expect(validateBuildId(12345)).toBe('12345');
      expect(validateBuildId('999')).toBe('999');
      expect(validateBuildId('1')).toBe('1');
    });

    it('accepts up to 20-digit numbers', () => {
      const id20 = '12345678901234567890';
      expect(validateBuildId(id20)).toBe(id20);
    });

    it('throws on non-numeric input', () => {
      expect(() => validateBuildId('abc')).toThrowError('Invalid buildId: must be numeric');
      expect(() => validateBuildId('12.5')).toThrowError('Invalid buildId: must be numeric');
      expect(() => validateBuildId('-1')).toThrowError('Invalid buildId: must be numeric');
    });

    it('throws on empty/null/undefined', () => {
      expect(() => validateBuildId(null)).toThrowError('Invalid buildId: must be numeric');
      expect(() => validateBuildId(undefined)).toThrowError('Invalid buildId: must be numeric');
      expect(() => validateBuildId('')).toThrowError('Invalid buildId: must be numeric');
    });

    it('throws on strings exceeding 20 digits', () => {
      expect(() => validateBuildId('123456789012345678901')).toThrowError('Invalid buildId: must be numeric');
    });
  });

  describe('basicAuth', () => {
    it('returns base64 encoded username:accessKey', () => {
      const encoded = basicAuth('user', 'key123');
      expect(encoded).toBe(Buffer.from('user:key123').toString('base64'));
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  2. env.cjs                                                           */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / env.cjs', () => {
  describe('getEnvPath', () => {
    it('returns .env in cwd', () => {
      expect(getEnvPath()).toBe(path.join(process.cwd(), '.env'));
    });
  });

  describe('getPercyYmlPath', () => {
    it('returns .percy.yml in cwd', () => {
      expect(getPercyYmlPath()).toBe(path.join(process.cwd(), '.percy.yml'));
    });
  });

  describe('parseEnv', () => {
    it('parses KEY=VALUE pairs', () => {
      expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });

    it('ignores comments and blank lines', () => {
      expect(parseEnv('# comment\n\nFOO=bar\n  \n# another')).toEqual({ FOO: 'bar' });
    });

    it('ignores lines without =', () => {
      expect(parseEnv('NOEQUALHERE\nFOO=bar')).toEqual({ FOO: 'bar' });
    });

    it('trims keys and values', () => {
      expect(parseEnv('  KEY  =  value  ')).toEqual({ KEY: 'value' });
    });

    it('handles values containing =', () => {
      expect(parseEnv('KEY=val=ue')).toEqual({ KEY: 'val=ue' });
    });

    it('returns empty object for empty content', () => {
      expect(parseEnv('')).toEqual({});
    });
  });

  describe('setKey', () => {
    it('appends a new key to empty source', () => {
      expect(setKey('', 'FOO', 'bar')).toBe('FOO=bar\n');
    });

    it('appends a new key to existing content', () => {
      expect(setKey('A=1', 'B', '2')).toBe('A=1\nB=2\n');
    });

    it('updates an existing key', () => {
      expect(setKey('FOO=old\nBAR=x', 'FOO', 'new')).toBe('FOO=new\nBAR=x');
    });

    it('throws on value containing newline', () => {
      expect(() => setKey('', 'KEY', 'has\nnewline')).toThrowError(/contains newline/);
    });

    it('escapes regex special characters in key', () => {
      // key with special regex chars
      expect(setKey('FOO.BAR=old', 'FOO.BAR', 'new')).toBe('FOO.BAR=new');
    });
  });

  describe('readEnv', () => {
    it('returns {} when .env does not exist', () => {
      spyOn(fs, 'existsSync').and.returnValue(false);
      expect(readEnv()).toEqual({});
    });

    it('parses .env when it exists', () => {
      spyOn(fs, 'existsSync').and.returnValue(true);
      spyOn(fs, 'readFileSync').and.returnValue('FOO=bar\nBAZ=qux');
      expect(readEnv()).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });
  });

  describe('readEnvRaw', () => {
    it('returns empty string when .env does not exist', () => {
      spyOn(fs, 'existsSync').and.returnValue(false);
      expect(readEnvRaw()).toBe('');
    });

    it('returns raw content when .env exists', () => {
      spyOn(fs, 'existsSync').and.returnValue(true);
      spyOn(fs, 'readFileSync').and.returnValue('RAW=content');
      expect(readEnvRaw()).toBe('RAW=content');
    });
  });

  describe('writeEnvRaw', () => {
    it('writes content to .env path', () => {
      const spy = spyOn(fs, 'writeFileSync');
      writeEnvRaw('KEY=val');
      expect(spy).toHaveBeenCalledWith(getEnvPath(), 'KEY=val', 'utf8');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  3. apiLogger.cjs                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / apiLogger.cjs', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    spyOn(fs, 'existsSync').and.returnValue(true);
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getApiLogPath', () => {
    it('creates log directory if missing and returns log path', () => {
      fs.existsSync.and.returnValue(false);
      const result = getApiLogPath();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'log'),
        { recursive: true }
      );
      expect(result).toBe(path.join(process.cwd(), 'log', 'percy-api.log'));
    });

    it('does not create dir if it exists', () => {
      fs.existsSync.and.returnValue(true);
      getApiLogPath();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('logApiCall', () => {
    it('logs success with context and headers', () => {
      logApiCall({
        method: 'GET',
        url: 'https://percy.io/api/v1/user',
        status: 200,
        success: true,
        duration: 123,
        context: 'test-ctx',
        responseHeaders: { 'cf-ray': 'abc123' }
      });
      expect(fs.appendFileSync).toHaveBeenCalled();
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('[SUCCESS]');
      expect(line).toContain('GET https://percy.io/api/v1/user');
      expect(line).toContain('200');
      expect(line).toContain('123ms');
      expect(line).toContain('[test-ctx]');
      expect(line).toContain('cf-ray');
    });

    it('logs failure with error message', () => {
      logApiCall({
        method: 'POST',
        url: 'https://percy.io/api/v1/projects',
        status: 500,
        success: false,
        duration: 50,
        error: 'Server Error'
      });
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('[FAIL]');
      expect(line).toContain('Error: Server Error');
    });

    it('silently ignores appendFileSync errors', () => {
      fs.appendFileSync.and.throwError('disk full');
      expect(() => logApiCall({
        method: 'GET', url: 'x', status: 0, success: false, duration: 0
      })).not.toThrow();
    });
  });

  describe('loggedFetch', () => {
    it('returns response on success and logs', async () => {
      const resp = mockResponse({ ok: true }, { ok: true, status: 200, headers: { 'cf-ray': 'abc' } });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      const result = await loggedFetch('https://percy.io/api/v1/user', {}, 'test');
      expect(result).toBe(resp);
      expect(fs.appendFileSync).toHaveBeenCalled();
    });

    it('logs HTTP error but still returns the response', async () => {
      const resp = mockResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      const result = await loggedFetch('https://percy.io/api/v1/user', { method: 'POST' }, 'auth');
      expect(result.ok).toBe(false);
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('HTTP 401');
    });

    it('logs and rethrows on network error', async () => {
      const err = new Error('ECONNREFUSED');
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(err);

      await expectAsync(loggedFetch('https://percy.io/api/v1/user'))
        .toBeRejectedWithError('ECONNREFUSED');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('ECONNREFUSED');
    });

    it('logs abort errors with special message', async () => {
      const abortErr = new DOMException('The operation was aborted', 'AbortError');
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(abortErr);

      await expectAsync(loggedFetch('https://percy.io/api/v1/user', {}, 'ctx'))
        .toBeRejected();
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('Request aborted');
    });

    it('defaults method to GET', async () => {
      const resp = mockResponse({}, { ok: true, status: 200 });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api/v1/user');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('GET');
    });
  });

  // Test internal functions via loggedFetch behavior
  describe('sanitizeUrl (internal, via loggedFetch)', () => {
    it('masks token, access_key, secret params in logged URL', async () => {
      const resp = mockResponse({}, { ok: true, status: 200 });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api?token=secret123&access_key=abc&secret=xyz');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).not.toContain('secret123');
      expect(line).toContain('***');
    });

    it('preserves non-sensitive params', async () => {
      const resp = mockResponse({}, { ok: true, status: 200 });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api?page=2&filter=web');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('page=2');
      expect(line).toContain('filter=web');
    });
  });

  describe('extractResponseHeaders (internal, via loggedFetch)', () => {
    it('logs known headers when present', async () => {
      const resp = mockResponse({}, {
        ok: true,
        status: 200,
        headers: { 'cf-ray': 'ray123', 'x-request-id': 'req456' }
      });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api/v1/user');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('ray123');
      expect(line).toContain('req456');
    });

    it('omits Headers section when no known headers', async () => {
      const resp = mockResponse({}, {
        ok: true,
        status: 200,
        headers: {} // no known headers
      });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api/v1/user');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).not.toContain('Headers:');
    });

    it('handles response with null headers', async () => {
      const resp = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: null,
        json: async () => ({}),
        text: async () => ''
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api/v1/user');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).not.toContain('Headers:');
    });

    it('logs x-percy-request-id and x-ratelimit-remaining', async () => {
      const resp = mockResponse({}, {
        ok: true,
        status: 200,
        headers: { 'x-percy-request-id': 'percy-123', 'x-ratelimit-remaining': '99' }
      });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('https://percy.io/api/v1/user');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('percy-123');
      expect(line).toContain('99');
    });
  });

  describe('sanitizeUrl edge cases (internal)', () => {
    it('returns invalid URL string unchanged', async () => {
      const resp = mockResponse({}, { ok: true, status: 200 });
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await loggedFetch('not-a-valid-url');
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('not-a-valid-url');
    });
  });

  describe('logApiCall edge cases', () => {
    it('logs without optional context, error, or responseHeaders', () => {
      logApiCall({
        method: 'GET',
        url: 'https://example.com',
        status: 200,
        success: true,
        duration: 10
      });
      const line = fs.appendFileSync.calls.mostRecent().args[1];
      expect(line).toContain('[SUCCESS]');
      expect(line).not.toContain('Error:');
      expect(line).not.toContain('Headers:');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  4. credentials.cjs                                                   */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / credentials.cjs', () => {
  beforeEach(() => {
    clearSessionCredentials();
    spyOn(fs, 'existsSync');
    spyOn(fs, 'readFileSync');
    spyOn(fs, 'writeFileSync');
  });

  afterEach(() => {
    clearSessionCredentials();
  });

  describe('readBsCredentials', () => {
    it('returns empty creds when .env does not exist', () => {
      fs.existsSync.and.returnValue(false);
      const creds = readBsCredentials();
      expect(creds.username).toBe('');
      expect(creds.accessKey).toBe('');
    });

    it('reads credentials from .env', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.callFake((p) => {
        if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=user1\nBROWSERSTACK_ACCESS_KEY=key1';
        if (p.endsWith('package.json')) return '{"name":"my-app"}';
        return '';
      });
      const creds = readBsCredentials();
      expect(creds.username).toBe('user1');
      expect(creds.accessKey).toBe('key1');
      expect(creds.projectName).toBe('my-app');
    });

    it('returns empty username/accessKey when .env has other keys only', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.callFake((p) => {
        if (p.endsWith('.env')) return 'OTHER_KEY=val';
        if (p.endsWith('package.json')) return '{"name":"app"}';
        return '';
      });
      const creds = readBsCredentials();
      expect(creds.username).toBe('');
      expect(creds.accessKey).toBe('');
    });

    it('returns empty projectName when package.json is missing', () => {
      fs.existsSync.and.callFake((p) => {
        if (p.endsWith('.env')) return true;
        return false; // package.json does not exist
      });
      fs.readFileSync.and.returnValue('BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k');
      const creds = readBsCredentials();
      expect(creds.projectName).toBe('');
    });

    it('returns empty projectName when package.json has no name', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.callFake((p) => {
        if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
        if (p.endsWith('package.json')) return '{}';
        return '';
      });
      const creds = readBsCredentials();
      expect(creds.projectName).toBe('');
    });

    it('returns empty projectName when package.json is malformed', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.callFake((p) => {
        if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
        if (p.endsWith('package.json')) throw new Error('parse error');
        return '';
      });
      const creds = readBsCredentials();
      expect(creds.projectName).toBe('');
    });
  });

  describe('writeBsCredentials', () => {
    it('writes username and accessKey to .env', () => {
      fs.existsSync.and.returnValue(false);
      writeBsCredentials('user1', 'key1');
      expect(fs.writeFileSync).toHaveBeenCalled();
      const content = fs.writeFileSync.calls.mostRecent().args[1];
      expect(content).toContain('BROWSERSTACK_USERNAME=user1');
      expect(content).toContain('BROWSERSTACK_ACCESS_KEY=key1');
    });
  });

  describe('registerCredentialHandlers', () => {
    let channel;

    beforeEach(() => {
      channel = createMockChannel();
      registerCredentialHandlers(channel);
    });

    it('emits loaded credentials on LOAD_BS_CREDENTIALS', async () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.callFake((p) => {
        if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
        if (p.endsWith('package.json')) return '{"name":"app"}';
        return '';
      });

      await channel.trigger(PERCY_EVENTS.LOAD_BS_CREDENTIALS);
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BS_CREDENTIALS_LOADED,
        jasmine.objectContaining({ username: 'u', accessKey: 'k' })
      );
    });

    it('emits empty creds on LOAD_BS_CREDENTIALS error', async () => {
      fs.existsSync.and.callFake(() => { throw new Error('disk error'); });

      await channel.trigger(PERCY_EVENTS.LOAD_BS_CREDENTIALS);
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BS_CREDENTIALS_LOADED,
        { username: '', accessKey: '', projectName: '' }
      );
    });

    it('saves credentials on SAVE_BS_CREDENTIALS', async () => {
      fs.existsSync.and.returnValue(false);

      await channel.trigger(PERCY_EVENTS.SAVE_BS_CREDENTIALS, {
        username: 'u2', accessKey: 'k2'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BS_CREDENTIALS_SAVED,
        { success: true }
      );
    });

    it('emits error on SAVE_BS_CREDENTIALS failure', async () => {
      fs.writeFileSync.and.throwError('write error');
      fs.existsSync.and.returnValue(false);

      await channel.trigger(PERCY_EVENTS.SAVE_BS_CREDENTIALS, {
        username: 'u', accessKey: 'k'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BS_CREDENTIALS_SAVED,
        jasmine.objectContaining({ success: false, error: 'Failed to save credentials' })
      );
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  5. percyApi.cjs                                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / percyApi.cjs', () => {
  let channel, originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    channel = createMockChannel();
    registerPercyApiHandlers(channel);
    spyOn(fs, 'existsSync').and.returnValue(true);
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('VALIDATE_CREDENTIALS', () => {
    it('emits valid:true on 200', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse({}, { ok: true }));

      await channel.trigger(PERCY_EVENTS.VALIDATE_CREDENTIALS, {
        username: 'u', accessKey: 'k'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.CREDENTIALS_VALIDATED,
        { valid: true }
      );
    });

    it('emits valid:false on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 401 })
      );

      await channel.trigger(PERCY_EVENTS.VALIDATE_CREDENTIALS, {
        username: 'u', accessKey: 'k'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.CREDENTIALS_VALIDATED,
        { valid: false, error: 'Username/Access Key is incorrect' }
      );
    });

    it('emits network error on fetch failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('Network'));

      await channel.trigger(PERCY_EVENTS.VALIDATE_CREDENTIALS, {
        username: 'u', accessKey: 'k'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.CREDENTIALS_VALIDATED,
        { valid: false, error: 'Network error. Please check your connection.' }
      );
    });
  });

  describe('FETCH_PROJECTS', () => {
    it('emits projects on success', async () => {
      const json = {
        data: [
          { id: '1', attributes: { name: 'Proj A', 'updated-at': '2024-01-01' } },
          { id: '2', attributes: { slug: 'proj-b' } },
          { id: '3', attributes: {} }
        ]
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: 'Proj', page: 0
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({
          projects: [
            { id: '1', name: 'Proj A', updatedAt: '2024-01-01' },
            { id: '2', name: 'proj-b', updatedAt: '' },
            { id: '3', name: 'Project 3', updatedAt: '' }
          ],
          hasMore: false,
          search: 'Proj',
          page: 0
        })
      );
    });

    it('sets hasMore=true when results reach PAGE_LIMIT', async () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        id: String(i), attributes: { name: `P${i}` }
      }));
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse({ data }));

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: '', page: 0
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({ hasMore: true })
      );
    });

    it('uses default page 0 when not provided', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({ data: [] })
      );

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: ''
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({ page: 0 })
      );
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 500 })
      );

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: 'x', page: 1
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({ error: 'Failed to load projects', search: 'x', page: 1 })
      );
    });

    it('emits null error on AbortError', async () => {
      const err = new DOMException('Aborted', 'AbortError');
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(err);

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: 'x', page: 0
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({ error: null })
      );
    });

    it('emits error on non-abort network error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('timeout'));

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: '', page: 0
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({ error: 'Failed to load projects' })
      );
    });

    it('handles missing data.attributes gracefully', async () => {
      const json = { data: [{ id: '99' }] };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_PROJECTS, {
        username: 'u', accessKey: 'k', search: '', page: 0
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECTS_FETCHED,
        jasmine.objectContaining({
          projects: [{ id: '99', name: 'Project 99', updatedAt: '' }]
        })
      );
    });
  });

  describe('CREATE_PROJECT', () => {
    it('emits project on success', async () => {
      const json = { data: { id: '42', attributes: { name: 'New Proj' } } };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'New Proj'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { project: { id: '42', name: 'New Proj' } }
      );
    });

    it('emits auth error on 401', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 401 })
      );

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Authentication failed. Please update your credentials.' }
      );
    });

    it('emits permission error on 403', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 403 })
      );

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: "You don't have permission to create projects." }
      );
    });

    it('emits rate limit error on 429', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 429 })
      );

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Too many requests. Please try again later.' }
      );
    });

    it('emits server error on 500+', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 502 })
      );

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Something went wrong. Please try again.' }
      );
    });

    it('parses API error detail on 422', async () => {
      const resp = mockResponse(
        { errors: [{ detail: 'Name already taken' }] },
        { ok: false, status: 422, statusText: 'Unprocessable' }
      );
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Name already taken' }
      );
    });

    it('uses fallback message when no error detail', async () => {
      const resp = mockResponse(
        { errors: [{ title: 'Validation failed' }] },
        { ok: false, status: 422, statusText: 'Unprocessable' }
      );
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Failed to create project. Please try again.' }
      );
    });

    it('handles json parse error in error response', async () => {
      const resp = {
        ok: false,
        status: 422,
        statusText: 'Unprocessable',
        headers: { get: () => null },
        json: async () => { throw new Error('invalid json'); }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      // parseApiError receives null, returns fallback
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Failed to create project. Please try again.' }
      );
    });

    it('emits network error on fetch failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('net'));

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Network error. Please check your connection.' }
      );
    });

    it('parseApiError handles empty errors array', async () => {
      const resp = mockResponse(
        { errors: [] },
        { ok: false, status: 422 }
      );
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.CREATE_PROJECT, {
        username: 'u', accessKey: 'k', projectName: 'P'
      });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.PROJECT_CREATED,
        { error: 'Failed to create project. Please try again.' }
      );
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  6. buildItems.cjs                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / buildItems.cjs', () => {
  let channel, originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    channel = createMockChannel();
    registerBuildItemsHandlers(channel);
    spyOn(fs, 'existsSync').and.returnValue(true);
    spyOn(fs, 'readFileSync').and.callFake((p) => {
      if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
      if (p.endsWith('package.json')) return '{"name":"app"}';
      return '';
    });
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches build items with meta filters and emits result', async () => {
    const json = {
      data: [{ id: '1', type: 'build-items' }],
      meta: { filters: { browser: 'chrome' } }
    };
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '123',
      meta: {
        browser_ids_with_changes: [10, 20],
        browser_ids_without_changes: [30],
        widths_with_changes: [375, 1280],
        widths_without_changes: [768]
      }
    });

    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      jasmine.objectContaining({
        buildId: '123',
        items: json.data,
        filters: json.meta.filters,
        authToken: jasmine.any(String)
      })
    );
  });

  it('filters out non-numeric browser IDs', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      mockResponse({ data: [], meta: {} })
    );

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '1',
      meta: {
        browser_ids_with_changes: ['abc', 10],
        widths_with_changes: [-5, 0, 100]
      }
    });

    const url = globalThis.fetch.calls.mostRecent().args[0];
    expect(url).toContain('filter%5Bbrowser_ids%5D%5B%5D=10');
    expect(url).not.toContain('abc');
    // widths: only 100 passes (>0)
    expect(url).toContain('filter%5Bwidths%5D%5B%5D=100');
  });

  it('handles empty/null meta', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      mockResponse({ data: [], meta: {} })
    );

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '1', meta: null
    });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      jasmine.objectContaining({ buildId: '1', items: [] })
    );
  });

  it('emits HTTP error when response is not ok', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      mockResponse({}, { ok: false, status: 404 })
    );

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '123', meta: {}
    });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      { error: 'HTTP 404', buildId: '123' }
    );
  });

  it('emits error on invalid buildId', async () => {
    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: 'abc', meta: {}
    });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      { error: 'Invalid buildId: must be numeric', buildId: 'abc' }
    );
  });

  it('emits error on fetch failure', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('net'));

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '5', meta: {}
    });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      { error: 'net', buildId: '5' }
    );
  });

  it('handles missing meta.filters in response', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      mockResponse({ data: [] })
    );

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '1', meta: {}
    });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      jasmine.objectContaining({ filters: null })
    );
  });

  it('defaults data to empty array when json.data is undefined', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      mockResponse({})
    );

    await channel.trigger(PERCY_EVENTS.FETCH_BUILD_ITEMS, {
      buildId: '1', meta: {}
    });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.BUILD_ITEMS_FETCHED,
      jasmine.objectContaining({ items: [] })
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  7. snapshotDetail.cjs                                                */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / snapshotDetail.cjs', () => {
  let channel, originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    channel = createMockChannel();
    registerSnapshotDetailHandlers(channel);
    spyOn(fs, 'existsSync').and.returnValue(true);
    spyOn(fs, 'readFileSync').and.callFake((p) => {
      if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
      if (p.endsWith('package.json')) return '{"name":"app"}';
      return '';
    });
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and denormalizes snapshot detail', async () => {
    const json = {
      data: {
        id: '100',
        type: 'snapshots',
        attributes: { name: 'Test Snap', 'review-state': 'unreviewed' },
        relationships: {
          comparisons: {
            data: [{ id: '200', type: 'comparisons' }]
          }
        }
      },
      included: [
        {
          id: '200',
          type: 'comparisons',
          attributes: { 'diff-ratio': 0.05 },
          relationships: {
            browser: { data: { id: '300', type: 'browsers' } }
          }
        },
        {
          id: '300',
          type: 'browsers',
          attributes: { 'family-name': 'Chrome' }
        }
      ],
      meta: { foo: 'bar' }
    };
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

    await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '100' });

    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
      jasmine.objectContaining({
        snapshotId: '100',
        data: jasmine.objectContaining({ id: '100', name: 'Test Snap' }),
        entities: jasmine.any(Object),
        meta: { foo: 'bar' }
      })
    );
  });

  it('emits error on invalid snapshotId', async () => {
    await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: 'abc' });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
      jasmine.objectContaining({ error: 'Invalid snapshotId: must be numeric' })
    );
  });

  it('emits error on null/undefined snapshotId', async () => {
    await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: null });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
      jasmine.objectContaining({ error: 'Invalid snapshotId: must be numeric' })
    );
  });

  it('emits HTTP error on non-ok response', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      mockResponse({}, { ok: false, status: 404 })
    );

    await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '100' });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
      { error: 'HTTP 404', snapshotId: '100' }
    );
  });

  it('emits error on fetch failure', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('fail'));

    await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '100' });
    expect(channel.emit).toHaveBeenCalledWith(
      PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
      { error: 'fail', snapshotId: '100' }
    );
  });

  // Test denormalizeJsonApi edge cases
  describe('denormalizeJsonApi edge cases', () => {
    it('handles null/non-object response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(null));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
        jasmine.objectContaining({
          data: null,
          entities: {},
          meta: {}
        })
      );
    });

    it('handles response with no included', async () => {
      const json = {
        data: { id: '1', type: 'snapshots', attributes: { name: 'S' } }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED,
        jasmine.objectContaining({ entities: {} })
      );
    });

    it('handles included items without type or id', async () => {
      const json = {
        data: { id: '1', type: 'snapshots', attributes: {} },
        included: [
          { type: 'browsers' }, // no id
          { id: '2' }, // no type
          { id: '3', type: 'browsers', attributes: { name: 'Firefox' } }
        ]
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.entities.browsers).toBeDefined();
      expect(result.entities.browsers['3']).toBeDefined();
      expect(Object.keys(result.entities.browsers)).toEqual(['3']);
    });

    it('handles relationships with array data', async () => {
      const json = {
        data: {
          id: '1',
          type: 'snapshots',
          attributes: {},
          relationships: {
            comparisons: {
              data: [{ id: 'c1', type: 'comparisons' }, { id: 'c2', type: 'comparisons' }]
            }
          }
        },
        included: []
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.data.comparisons).toEqual(['c1', 'c2']);
    });

    it('handles array relationships in included items', async () => {
      const json = {
        data: { id: '1', type: 'snapshots', attributes: {} },
        included: [
          {
            id: '10',
            type: 'comparisons',
            attributes: { name: 'Comp' },
            relationships: {
              screenshots: {
                data: [{ id: 's1', type: 'screenshots' }, { id: 's2', type: 'screenshots' }]
              }
            }
          }
        ]
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.entities.comparisons['10'].screenshots).toEqual(['s1', 's2']);
    });

    it('handles relationships with null data', async () => {
      const json = {
        data: {
          id: '1',
          type: 'snapshots',
          attributes: {},
          relationships: {
            build: { data: null }
          }
        }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.data.build).toBeUndefined();
    });

    it('handles array data in root', async () => {
      const json = {
        data: [
          { id: '1', type: 'snapshots', attributes: { name: 'A' } },
          { id: '2', type: 'snapshots', attributes: { name: 'B' } }
        ]
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
    });
  });

  // Test camelCase conversion
  describe('camelCase conversion', () => {
    it('converts kebab and snake case attributes', async () => {
      const json = {
        data: {
          id: '1',
          type: 'snapshots',
          attributes: { 'review-state': 'approved', total_count: 5 }
        }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.data.reviewState).toBe('approved');
      expect(result.data.totalCount).toBe(5);
    });

    it('camelCaseKeys handles arrays and nested objects', async () => {
      const json = {
        data: {
          id: '1',
          type: 'snapshots',
          attributes: {
            'nested-obj': { 'inner-key': 'val' },
            'some-array': [1, 2]
          }
        }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId: '1' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.data.nestedObj).toEqual({ innerKey: 'val' });
      expect(result.data.someArray).toEqual([1, 2]);
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  8. buildApi.cjs                                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / buildApi.cjs', () => {
  let channel, originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    channel = createMockChannel();
    registerBuildApiHandlers(channel);
    spyOn(fs, 'existsSync').and.returnValue(true);
    spyOn(fs, 'readFileSync').and.callFake((p) => {
      if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
      if (p.endsWith('package.json')) return '{"name":"app"}';
      return '';
    });
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('FETCH_BUILD_STATUS', () => {
    const buildJson = {
      data: {
        id: '10',
        attributes: {
          'build-number': 42,
          state: 'finished',
          'web-url': 'https://percy.io/build/10',
          'failure-reason': null,
          'total-snapshots': 5,
          'total-comparisons': 10,
          'total-comparisons-finished': 10,
          'created-at': '2024-01-01',
          'average-duration': 300,
          'build-count-for-average': 20,
          'review-state': 'approved',
          'review-state-reason': 'all-approved',
          branch: 'main',
          'finished-at': '2024-01-01T01:00:00Z',
          type: 'web'
        },
        relationships: {
          'base-build': { data: { id: '9', type: 'builds' } }
        }
      },
      included: [
        {
          id: '9',
          type: 'builds',
          attributes: { branch: 'develop', 'finished-at': '2024-01-01T00:30:00Z' }
        }
      ],
      meta: { total: 1 }
    };

    it('emits full build status on success', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(buildJson));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_STATUS_FETCHED,
        jasmine.objectContaining({
          buildId: '10',
          buildNumber: 42,
          state: 'finished',
          headBranch: 'main',
          baseBranch: 'develop',
          finishedAt: '2024-01-01T01:00:00Z',
          baseBuildFinishedAt: '2024-01-01T00:30:00Z',
          buildType: 'web',
          meta: { total: 1 }
        })
      );
    });

    it('handles build with no base-build relationship', async () => {
      const json = {
        data: {
          id: '10',
          attributes: {
            'build-number': 1,
            state: 'pending',
            branch: 'feat',
            'finished-at': null,
            type: 'web',
            'web-url': '',
            'failure-reason': null,
            'total-snapshots': 0,
            'total-comparisons': 0,
            'total-comparisons-finished': 0,
            'created-at': '2024-01-01',
            'average-duration': 0,
            'build-count-for-average': 0,
            'review-state': null,
            'review-state-reason': null
          },
          relationships: {}
        }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.baseBranch).toBe('');
      expect(result.baseBuildFinishedAt).toBe(null);
    });

    it('uses fallback values when branch, finished-at, and type are missing', async () => {
      const json = {
        data: {
          id: '10',
          attributes: {
            'build-number': 1,
            state: 'pending',
            'web-url': '',
            'failure-reason': null,
            'total-snapshots': 0,
            'total-comparisons': 0,
            'total-comparisons-finished': 0,
            'created-at': '2024-01-01',
            'average-duration': 0,
            'build-count-for-average': 0,
            'review-state': null,
            'review-state-reason': null
          },
          relationships: {}
        }
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.headBranch).toBe('');
      expect(result.finishedAt).toBe(null);
      expect(result.buildType).toBe('web');
    });

    it('handles build with base-build rel but no matching included', async () => {
      const json = {
        data: {
          ...buildJson.data,
          relationships: { 'base-build': { data: { id: '999', type: 'builds' } } }
        },
        included: [] // no matching build
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.baseBranch).toBe('');
    });

    it('emits HTTP error when response not ok', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 404 })
      );

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_STATUS_FETCHED,
        { error: 'HTTP 404', buildId: '10' }
      );
    });

    it('emits error on invalid buildId', async () => {
      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: 'bad' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_STATUS_FETCHED,
        { error: 'Invalid buildId: must be numeric', buildId: 'bad' }
      );
    });

    it('emits error on network failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('timeout'));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_STATUS_FETCHED,
        { error: 'timeout', buildId: '10' }
      );
    });

    it('handles missing meta in response', async () => {
      const json = {
        data: {
          ...buildJson.data,
          relationships: {}
        }
      };
      delete json.meta;
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: '10' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.meta).toBe(null);
    });
  });

  describe('FETCH_BUILD_LOGS', () => {
    it('emits log content on success', async () => {
      const resp = mockResponse('line1\nline2\n');
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_LOGS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_LOGS_FETCHED,
        { content: 'line1\nline2\n', filename: 'percy-build-10.log' }
      );
    });

    it('truncates logs exceeding 5MB', async () => {
      const bigContent = 'x'.repeat(6 * 1024 * 1024);
      const resp = mockResponse(bigContent);
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_LOGS, { buildId: '10' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.content).toContain('[Log truncated');
      expect(result.content.length).toBeLessThanOrEqual(5 * 1024 * 1024 + 100);
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse('', { ok: false, status: 500 })
      );

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_LOGS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_LOGS_FETCHED,
        { error: 'Failed to download logs (HTTP 500)' }
      );
    });

    it('emits error on network failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('fail'));

      await channel.trigger(PERCY_EVENTS.FETCH_BUILD_LOGS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_LOGS_FETCHED,
        { error: 'fail' }
      );
    });
  });

  describe('APPROVE_BUILD', () => {
    it('emits success on ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse({}));

      await channel.trigger(PERCY_EVENTS.APPROVE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_APPROVED,
        { buildId: '10', success: true }
      );
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 403 })
      );

      await channel.trigger(PERCY_EVENTS.APPROVE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_APPROVED,
        { error: 'Failed to approve build (HTTP 403)', buildId: '10' }
      );
    });

    it('emits error on fetch failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('net'));

      await channel.trigger(PERCY_EVENTS.APPROVE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_APPROVED,
        { error: 'net', buildId: '10' }
      );
    });
  });

  describe('REJECT_BUILD', () => {
    it('emits success on ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse({}));

      await channel.trigger(PERCY_EVENTS.REJECT_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_REJECTED,
        { buildId: '10', success: true }
      );
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 500 })
      );

      await channel.trigger(PERCY_EVENTS.REJECT_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_REJECTED,
        { error: 'Failed to reject build (HTTP 500)', buildId: '10' }
      );
    });

    it('emits error on fetch failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('net'));

      await channel.trigger(PERCY_EVENTS.REJECT_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_REJECTED,
        { error: 'net', buildId: '10' }
      );
    });
  });

  describe('DELETE_BUILD', () => {
    it('emits success on ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse({}));

      await channel.trigger(PERCY_EVENTS.DELETE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_DELETED,
        { buildId: '10', success: true }
      );
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 403 })
      );

      await channel.trigger(PERCY_EVENTS.DELETE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_DELETED,
        { error: 'Failed to delete build (HTTP 403)', buildId: '10' }
      );
    });

    it('emits error on fetch failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('net'));

      await channel.trigger(PERCY_EVENTS.DELETE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_DELETED,
        { error: 'net', buildId: '10' }
      );
    });
  });

  describe('DOWNLOAD_BUILD_LOGS', () => {
    it('emits log content on success', async () => {
      const resp = mockResponse('log content');
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.DOWNLOAD_BUILD_LOGS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_LOGS_DOWNLOADED,
        { content: 'log content', filename: 'percy-build-10.log' }
      );
    });

    it('truncates logs exceeding 5MB', async () => {
      const bigContent = 'y'.repeat(6 * 1024 * 1024);
      const resp = mockResponse(bigContent);
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(resp);

      await channel.trigger(PERCY_EVENTS.DOWNLOAD_BUILD_LOGS, { buildId: '10' });
      const result = channel.emit.calls.mostRecent().args[1];
      expect(result.content).toContain('[Log truncated');
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse('', { ok: false, status: 404 })
      );

      await channel.trigger(PERCY_EVENTS.DOWNLOAD_BUILD_LOGS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_LOGS_DOWNLOADED,
        { error: 'Failed to download logs (HTTP 404)' }
      );
    });

    it('emits error on network failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('err'));

      await channel.trigger(PERCY_EVENTS.DOWNLOAD_BUILD_LOGS, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_LOGS_DOWNLOADED,
        { error: 'err' }
      );
    });
  });

  describe('MERGE_BUILD', () => {
    it('emits success on ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse({}));

      await channel.trigger(PERCY_EVENTS.MERGE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_MERGED,
        { buildId: '10', success: true }
      );
    });

    it('emits error on non-ok response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 409 })
      );

      await channel.trigger(PERCY_EVENTS.MERGE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_MERGED,
        { error: 'Failed to merge build (HTTP 409)', buildId: '10' }
      );
    });

    it('emits error on fetch failure', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('net'));

      await channel.trigger(PERCY_EVENTS.MERGE_BUILD, { buildId: '10' });
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.BUILD_MERGED,
        { error: 'net', buildId: '10' }
      );
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  9. projectConfig.cjs                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / projectConfig.cjs', () => {
  let originalFetch;

  beforeEach(() => {
    clearSessionCredentials();
    originalFetch = globalThis.fetch;
    spyOn(fs, 'existsSync');
    spyOn(fs, 'readFileSync');
    spyOn(fs, 'writeFileSync');
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    clearSessionCredentials();
    globalThis.fetch = originalFetch;
  });

  describe('readPercyYml', () => {
    it('returns null when .percy.yml does not exist', () => {
      fs.existsSync.and.returnValue(false);
      expect(readPercyYml()).toBe(null);
    });

    it('returns { id, name } when valid', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('project:\n  id: 42\n  name: "My Project"');
      expect(readPercyYml()).toEqual({ id: 42, name: 'My Project' });
    });

    it('returns null when no id match', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('project:\n  name: "No Id"');
      expect(readPercyYml()).toBe(null);
    });

    it('returns id with empty name when name not present', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('project:\n  id: 10');
      expect(readPercyYml()).toEqual({ id: 10, name: '' });
    });

    it('returns null on read error', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.throwError('read error');
      expect(readPercyYml()).toBe(null);
    });
  });

  describe('writePercyYml', () => {
    it('writes new project block to empty file', () => {
      fs.existsSync.and.returnValue(false);
      writePercyYml(42, 'Test');
      const content = fs.writeFileSync.calls.mostRecent().args[1];
      expect(content).toContain('project:');
      expect(content).toContain('id: 42');
      expect(content).toContain('name: "Test"');
    });

    it('appends to existing content without project section', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('version: 2\n');
      writePercyYml(42, 'Test');
      const content = fs.writeFileSync.calls.mostRecent().args[1];
      expect(content).toContain('version: 2');
      expect(content).toContain('project:\n  id: 42');
    });

    it('replaces existing project section', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('project:\n  id: 1\n  name: "Old"\nother: config\n');
      writePercyYml(99, 'New');
      const content = fs.writeFileSync.calls.mostRecent().args[1];
      expect(content).toContain('id: 99');
      expect(content).toContain('name: "New"');
      expect(content).not.toContain('id: 1');
      expect(content).toContain('other: config');
    });

    it('handles content without trailing newline', () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('version: 2');
      writePercyYml(1, 'P');
      const content = fs.writeFileSync.calls.mostRecent().args[1];
      expect(content).toContain('version: 2');
      expect(content).toContain('project:');
    });
  });

  describe('fetchPercyToken', () => {
    it('returns master token', async () => {
      const json = {
        data: [
          { attributes: { role: 'web', token: 'wrong' } },
          { attributes: { role: 'master', token: 'master-tok' } }
        ]
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      const tok = await fetchPercyToken(42, 'u', 'k');
      expect(tok).toBe('master-tok');
    });

    it('falls back to first token when no master', async () => {
      const json = {
        data: [{ attributes: { role: 'web', token: 'web-tok' } }]
      };
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse(json));

      const tok = await fetchPercyToken(42, 'u', 'k');
      expect(tok).toBe('web-tok');
    });

    it('throws when no tokens found', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({ data: [] })
      );

      await expectAsync(fetchPercyToken(42, 'u', 'k'))
        .toBeRejectedWithError('No token found for project');
    });

    it('throws when token attribute missing', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({ data: [{ attributes: { role: 'master' } }] })
      );

      await expectAsync(fetchPercyToken(42, 'u', 'k'))
        .toBeRejectedWithError('No token found for project');
    });

    it('throws on HTTP error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({}, { ok: false, status: 401 })
      );

      await expectAsync(fetchPercyToken(42, 'u', 'k'))
        .toBeRejectedWithError(/Token fetch failed/);
    });

    it('defaults to empty array when json.data is undefined', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        mockResponse({})
      );

      await expectAsync(fetchPercyToken(42, 'u', 'k'))
        .toBeRejectedWithError('No token found for project');
    });
  });

  describe('setPercyToken', () => {
    it('writes PERCY_TOKEN to .env', () => {
      fs.existsSync.and.returnValue(false);
      setPercyToken('tok123');
      const content = fs.writeFileSync.calls.mostRecent().args[1];
      expect(content).toContain('PERCY_TOKEN=tok123');
    });
  });

  describe('registerProjectConfigHandlers', () => {
    let channel;

    beforeEach(() => {
      channel = createMockChannel();
      registerProjectConfigHandlers(channel);
    });

    describe('LOAD_PROJECT_CONFIG', () => {
      it('emits invalid creds when no credentials saved', async () => {
        fs.existsSync.and.returnValue(false);

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_LOADED,
          { credentialsValid: false, project: null, hasValidToken: false }
        );
      });

      it('emits full config when credentials are valid and project exists', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "Proj"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({
              data: { attributes: { workflow: 'branchline', 'default-base-branch': 'main' } }
            }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_LOADED,
          jasmine.objectContaining({
            credentialsValid: true,
            username: 'u',
            accessKey: 'k',
            project: { id: 42, name: 'Proj' },
            hasValidToken: true
          })
        );
      });

      it('auto-fetches token when project exists but PERCY_TOKEN is missing', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "Proj"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/tokens')) {
            return Promise.resolve(mockResponse({
              data: [{ attributes: { role: 'master', token: 'auto-tok' } }]
            }));
          }
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({
              data: { attributes: { workflow: 'default' } }
            }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.hasValidToken).toBe(true);
        // setPercyToken should have been called
        expect(fs.writeFileSync).toHaveBeenCalled();
      });

      it('handles auto-fetch token failure gracefully', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "P"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/tokens')) {
            return Promise.resolve(mockResponse({}, { ok: false, status: 500 }));
          }
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({
              data: { attributes: { workflow: 'default' } }
            }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.hasValidToken).toBe(false);
        expect(result.credentialsValid).toBe(true);
      });

      it('emits invalid when API validation fails', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
          mockResponse({}, { ok: false, status: 401 })
        );

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_LOADED,
          { credentialsValid: false, project: null, hasValidToken: false }
        );
      });

      it('restores last build when PERCY_LAST_TRIGGER_BUILD exists', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok\nPERCY_LAST_TRIGGER_BUILD=555';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "P"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/builds/555')) {
            return Promise.resolve(mockResponse({
              data: {
                id: '555',
                attributes: {
                  state: 'finished',
                  'build-number': 10,
                  'web-url': 'url',
                  'review-state': null,
                  'review-state-reason': null,
                  branch: 'main',
                  'finished-at': '2024-01-01T01:00:00Z',
                  type: 'web'
                },
                relationships: {
                  'base-build': { data: { id: '554', type: 'builds' } }
                }
              },
              included: [
                { id: '554', type: 'builds', attributes: { branch: 'develop', 'finished-at': '2024-01-01T00:30:00Z' } }
              ]
            }));
          }
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({
              data: { attributes: { workflow: 'default' } }
            }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.lastBuild).toBeTruthy();
        expect(result.lastBuild.buildId).toBe('555');
      });

      it('handles last build fetch rejection gracefully', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok\nPERCY_LAST_TRIGGER_BUILD=555';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        // Build fetch rejects with network error
        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/builds/555')) return Promise.reject(new Error('network down'));
          return Promise.resolve(mockResponse({}));
        });

        spyOn(console, 'warn');
        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.credentialsValid).toBe(true);
        expect(result.lastBuild).toBe(null);
        expect(console.warn).toHaveBeenCalledWith('Failed to restore last build:', 'network down');
      });

      it('emits fallback on unexpected top-level error', async () => {
        // Corrupt fs so readBsCredentials throws unexpectedly
        fs.existsSync.and.callFake(() => { throw new TypeError('unexpected'); });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_LOADED,
          { credentialsValid: false, project: null, hasValidToken: false }
        );
      });

      it('handles no project with valid credentials (no .percy.yml)', async () => {
        fs.existsSync.and.callFake((p) => {
          if (p.endsWith('.percy.yml')) return false;
          return true;
        });
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.credentialsValid).toBe(true);
        expect(result.project).toBe(null);
        expect(result.hasValidToken).toBe(true);
      });

      it('skips fetchProjectDetails when no project id', async () => {
        fs.existsSync.and.callFake((p) => {
          if (p.endsWith('.percy.yml')) return false;
          return true;
        });
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.projectDetails).toBe(null);
      });

      it('handles fetchProjectDetails returning null on non-ok response', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "P"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({}, { ok: false, status: 404 }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.projectDetails).toBe(null);
      });

      it('handles fetchProjectDetails response with missing attributes', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "P"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({ data: {} }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.projectDetails).toBe(null);
      });

      it('uses fallback values for missing workflow and defaultBaseBranch', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "P"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/projects/42')) {
            return Promise.resolve(mockResponse({
              data: { attributes: {} }
            }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.projectDetails).toEqual({ workflow: 'default', defaultBaseBranch: '' });
      });

      it('handles projectDetails fetch rejection', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok';
          if (p.endsWith('.percy.yml')) return 'project:\n  id: 42\n  name: "P"';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/projects/42')) return Promise.reject(new Error('network'));
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.projectDetails).toBe(null);
      });

      it('handles fetchLastBuild with missing branch/type and non-ok response', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_TOKEN=tok\nPERCY_LAST_TRIGGER_BUILD=555';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
          if (url.includes('/user')) return Promise.resolve(mockResponse({}));
          if (url.includes('/builds/555')) {
            return Promise.resolve(mockResponse({
              data: {
                id: '555',
                attributes: {
                  state: 'pending',
                  'build-number': 1,
                  'web-url': '',
                  'review-state': null,
                  'review-state-reason': null
                },
                relationships: {}
              }
            }));
          }
          return Promise.resolve(mockResponse({}));
        });

        await channel.trigger(PERCY_EVENTS.LOAD_PROJECT_CONFIG);
        const result = channel.emit.calls.mostRecent().args[1];
        expect(result.lastBuild.headBranch).toBe('');
        expect(result.lastBuild.finishedAt).toBe(null);
        expect(result.lastBuild.buildType).toBe('web');
      });
    });

    describe('SAVE_PROJECT_CONFIG', () => {
      it('writes .percy.yml, fetches token, emits success', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
          if (p.endsWith('.percy.yml')) return '';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
          mockResponse({ data: [{ attributes: { role: 'master', token: 'tok1' } }] })
        );

        await channel.trigger(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
          projectId: 42, projectName: 'P'
        });

        // Wait for async token fetch
        await new Promise(r => setTimeout(r, 50));

        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_SAVED,
          { success: true }
        );
      });

      it('emits error when credentials not found', async () => {
        fs.existsSync.and.returnValue(false);

        await channel.trigger(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
          projectId: 42, projectName: 'P'
        });
        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_SAVED,
          { success: false, error: 'BrowserStack credentials not found' }
        );
      });

      it('emits error when token fetch fails', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
          mockResponse({}, { ok: false, status: 500 })
        );

        await channel.trigger(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
          projectId: 42, projectName: 'P'
        });

        await new Promise(r => setTimeout(r, 50));

        expect(channel.emit).toHaveBeenCalledWith(
          PERCY_EVENTS.PROJECT_CONFIG_SAVED,
          { success: false, error: 'Failed to save project configuration' }
        );
      });

      it('clears PERCY_LAST_TRIGGER_BUILD on save', async () => {
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k\nPERCY_LAST_TRIGGER_BUILD=123';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
          mockResponse({ data: [{ attributes: { role: 'master', token: 't' } }] })
        );

        await channel.trigger(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
          projectId: 42, projectName: 'P'
        });

        // Check that writeEnvRaw was called to clear the build reference
        const writeCalls = fs.writeFileSync.calls.allArgs();
        const envWrites = writeCalls.filter(c => c[0].endsWith('.env'));
        expect(envWrites.length).toBeGreaterThan(0);
        const firstEnvWrite = envWrites[0][1];
        expect(firstEnvWrite).toContain('PERCY_LAST_TRIGGER_BUILD=');
      });

      it('continues even if clearing last build reference fails', async () => {
        let writeCallCount = 0;
        fs.existsSync.and.returnValue(true);
        fs.readFileSync.and.callFake((p) => {
          if (p.endsWith('.env')) return 'BROWSERSTACK_USERNAME=u\nBROWSERSTACK_ACCESS_KEY=k';
          if (p.endsWith('package.json')) return '{"name":"app"}';
          return '';
        });
        fs.writeFileSync.and.callFake(() => {
          writeCallCount++;
          if (writeCallCount === 1) throw new Error('write error');
        });

        globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
          mockResponse({ data: [{ attributes: { role: 'master', token: 't' } }] })
        );

        await channel.trigger(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
          projectId: 42, projectName: 'P'
        });

        await new Promise(r => setTimeout(r, 50));

        // Should still attempt to write .percy.yml and fetch token
        expect(fs.writeFileSync.calls.count()).toBeGreaterThan(1);
      });
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
/*  10. snapshots.cjs                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

describe('Server / snapshots.cjs', () => {
  let channel, originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    channel = createMockChannel();
    spyOn(fs, 'existsSync');
    spyOn(fs, 'readFileSync');
    spyOn(fs, 'writeFileSync');
    spyOn(fs, 'mkdirSync');
    spyOn(fs, 'appendFileSync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('registerSnapshotHandlers', () => {
    it('registers handler on RUN_SNAPSHOT event', () => {
      registerSnapshotHandlers(channel);
      // Just verify it does not throw and the handler exists
      expect(channel.emit).not.toHaveBeenCalled();
    });
  });

  describe('runPercyBuild', () => {
    it('emits error when no .env file exists', async () => {
      fs.existsSync.and.returnValue(false);

      await runPercyBuild(channel, { baseUrl: 'http://localhost:6006' });

      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_STARTED, {}
      );
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_ERROR,
        jasmine.objectContaining({ message: jasmine.stringContaining('.env') })
      );
    });

    it('emits error when PERCY_TOKEN not in .env', async () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('OTHER_KEY=val');

      await runPercyBuild(channel, { baseUrl: 'http://localhost:6006' });

      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_ERROR,
        jasmine.objectContaining({ message: jasmine.stringContaining('PERCY_TOKEN') })
      );
    });

    it('emits error when Percy SDK import fails', async () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('PERCY_TOKEN=tok123');

      // The dynamic import of @percy/core will fail in test environment
      await runPercyBuild(channel, {
        baseUrl: 'http://localhost:6006',
        include: ['*'],
        exclude: []
      });

      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_STARTED, {}
      );
      expect(channel.emit).toHaveBeenCalledWith(
        PERCY_EVENTS.SNAPSHOT_ERROR,
        jasmine.objectContaining({ message: jasmine.any(String) })
      );
    });

    it('clears previous log file on start', async () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('PERCY_TOKEN=tok');

      await runPercyBuild(channel, { baseUrl: 'http://localhost:6006' });

      // writeFileSync is called to clear log (first call)
      const clearCall = fs.writeFileSync.calls.allArgs().find(
        args => args[0].endsWith('percy.log') && args[1] === ''
      );
      expect(clearCall).toBeTruthy();
    });

    it('uses default values for include and exclude', async () => {
      fs.existsSync.and.returnValue(true);
      fs.readFileSync.and.returnValue('PERCY_TOKEN=tok');

      await runPercyBuild(channel, { baseUrl: 'http://localhost:6006' });

      // appendLog should have been called with include/exclude info
      const logCalls = fs.appendFileSync.calls.allArgs();
      const includeLine = logCalls.find(c => c[1]?.includes('Include:'));
      expect(includeLine).toBeTruthy();
    });
  });

  describe('runAsyncGenerator (via runPercyBuild internals)', () => {
    it('handles the full error flow with stack trace logging', async () => {
      fs.existsSync.and.returnValue(false);

      await runPercyBuild(channel, { baseUrl: 'http://localhost:6006' });

      const errorLogCalls = fs.appendFileSync.calls.allArgs();
      const errorLine = errorLogCalls.find(c => c[1]?.includes('ERROR:'));
      expect(errorLine).toBeTruthy();
      const failLine = errorLogCalls.find(c => c[1]?.includes('build failed'));
      expect(failLine).toBeTruthy();
    });
  });

  describe('runAsyncGenerator', () => {
    it('drives a simple async generator to completion', async () => {
      async function* gen() {
        const a = yield Promise.resolve(1);
        const b = yield Promise.resolve(2);
        return a + b;
      }
      const result = await runAsyncGenerator(gen());
      expect(result).toBe(3);
    });

    it('handles plain (non-promise) yielded values', async () => {
      async function* gen() {
        const a = yield 42;
        return a;
      }
      const result = await runAsyncGenerator(gen());
      expect(result).toBe(42);
    });

    it('handles nested async generators', async () => {
      async function* inner() {
        yield Promise.resolve('inner');
        return 'nested-result';
      }
      async function* outer() {
        const result = yield inner();
        return result;
      }
      const result = await runAsyncGenerator(outer());
      expect(result).toBe('nested-result');
    });

    it('handles arrays of promises', async () => {
      async function* gen() {
        const results = yield [
          Promise.resolve('a'),
          Promise.resolve('b')
        ];
        return results;
      }
      const result = await runAsyncGenerator(gen());
      expect(result).toEqual(['a', 'b']);
    });

    it('handles arrays with nested async generators', async () => {
      async function* inner() {
        return 'from-gen';
      }
      async function* gen() {
        const results = yield [inner(), Promise.resolve('plain')];
        return results;
      }
      const result = await runAsyncGenerator(gen());
      expect(result).toEqual(['from-gen', 'plain']);
    });

    it('handles arrays with plain values', async () => {
      async function* gen() {
        const results = yield [42, 'str'];
        return results;
      }
      const result = await runAsyncGenerator(gen());
      expect(result).toEqual([42, 'str']);
    });

    it('propagates errors via generator.throw', async () => {
      async function* gen() {
        try {
          yield Promise.reject(new Error('oops'));
        } catch (e) {
          return `caught: ${e.message}`;
        }
      }
      const result = await runAsyncGenerator(gen());
      expect(result).toBe('caught: oops');
    });

    it('throws when generator does not catch the error', async () => {
      async function* gen() {
        yield Promise.reject(new Error('unhandled'));
      }
      await expectAsync(runAsyncGenerator(gen())).toBeRejectedWithError('unhandled');
    });
  });

  describe('runPercyBuild handler registration', () => {
    it('calls runPercyBuild when RUN_SNAPSHOT is triggered', async () => {
      registerSnapshotHandlers(channel);
      fs.existsSync.and.returnValue(false);

      await channel.trigger(PERCY_EVENTS.RUN_SNAPSHOT, { baseUrl: 'http://localhost:6006' });

      // Wait for async runPercyBuild to complete
      await new Promise(r => setTimeout(r, 50));

      expect(channel.emit).toHaveBeenCalledWith(PERCY_EVENTS.SNAPSHOT_STARTED, {});
    });
  });
});
