import { request, createRootResource, yieldTo } from '@percy/cli-command/utils';
import spawn from 'cross-spawn';

// check storybook version
export function checkStorybookVersion() {
  return new Promise((resolve, reject) => {
    spawn('storybook', ['--version'])
      .on('exit', (code) => { if (code === 0) resolve(7); })
      .on('error', (err) => {
        if (err.code === 'ENOENT') {
          resolve(6);
        }
        reject(err);
      });
  });
}

// Transforms authorization credentials into a basic auth header and returns all config request
// headers with the additional authorization header if not already set.
function getAuthHeaders(config) {
  let headers = { ...config.requestHeaders };
  let auth = config.authorization;

  if (auth && !(headers.authorization || headers.Authorization)) {
    let creds = auth.username + (auth.password ? `:${auth.password}` : '');
    headers.Authorization = `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  return headers;
}

// Fetch the raw Storybook preview resource to use when JS is enabled
export async function fetchStorybookPreviewResource(percy, previewUrl) {
  return createRootResource(previewUrl, await request(previewUrl, {
    headers: getAuthHeaders(percy.config.discovery),
    retryNotFound: true,
    interval: 1000,
    retries: 30
  }));
}

// Used during args/globals validation, encoding, and decoding
const VAL_REG = /^[a-zA-Z0-9 _-]*$/;
const NUM_REG = /^-?[0-9]+(\.[0-9]+)?$/;
const HEX_REG = /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i;
const COL_REG = /^(rgba?|hsla?)\(([0-9]{1,3}),\s*([0-9]{1,3})%?,\s*([0-9]{1,3})%?,?\s*([0-9]?(\.[0-9]{1,2})?)?\)$/i;
const VALID_REG = new RegExp([VAL_REG, NUM_REG, HEX_REG, COL_REG].map(r => r.source).join('|'), 'i');

function isPlainObject(obj) {
  return (typeof obj === 'object' && (
    Object.getPrototypeOf(obj) === null ||
    Object.getPrototypeOf(obj) === Object.prototype
  ));
}

// Validate story args & globals like storybook
export function validateStoryArgs(key, value) {
  if (key == null || key === '' || !VAL_REG.test(key)) return false;
  if (value == null || value instanceof Date) return true;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (typeof value === 'string') return VALID_REG.test(value);
  if (Array.isArray(value)) return value.every(v => validateStoryArgs(key, v));
  if (isPlainObject(value)) return Object.entries(value).every(e => validateStoryArgs(...e));
  return false;
}

// Encode story args & globals like storybook
export function encodeStoryArgs(value) {
  if (value == null) return `!${value}`;
  if (value instanceof Date) return `!date(${value.toISOString()})`;
  if (typeof value === 'string' && HEX_REG.test(value)) return `!hex(${value.slice(1)})`;
  if (typeof value === 'string' && COL_REG.test(value)) return `!${value.replace(/\s|%/g, '')}`;

  if (Array.isArray(value)) {
    return value.map(encodeStoryArgs);
  } else if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [k, v]) => (
      Object.assign(acc, { [k]: encodeStoryArgs(v) })
    ), {});
  } else {
    return value;
  }
}

// Decode story args & globals from encoded values
export function decodeStoryArgs(value) {
  if (typeof value === 'string') {
    if (value === '!null') return null;
    if (value === '!undefined') return undefined;
    if (value.startsWith('!date(')) return new Date(value.slice(6, -1));
    if (value.startsWith('!hex(')) return `#${value.slice(5, -1)}`;

    if (COL_REG.test(value.slice(1))) {
      let c = value.slice(1).match(COL_REG);
      let p = c[1][0] === 'h' ? '%' : '';
      let a = c[1][3] === 'a' ? `, ${c[5]}` : '';
      return `${c[1]}(${c[2]}, ${c[3]}${p}, ${c[4]}${p}${a})`;
    }

    return NUM_REG.test(value) ? Number(value) : value;
  } else if (Array.isArray(value)) {
    return value.map(decodeStoryArgs);
  } else if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [k, v]) => (
      Object.assign(acc, { [k]: decodeStoryArgs(v) })
    ), {});
  } else {
    return value;
  }
}

// Borrows a percy discovery browser page to navigate to a URL and evaluate a function, returning
// the results and normalizing any thrown errors.
export async function* withPage(percy, url, callback, retry) {
  // provide discovery options that may impact how the page loads
  let page = yield percy.browser.page({
    networkIdleTimeout: percy.config.discovery.networkIdleTimeout,
    requestHeaders: getAuthHeaders(percy.config.discovery),
    userAgent: percy.config.discovery.userAgent
  });

  // patch eval to include storybook specific helpers in the local scope
  page.eval = (fn, ...args) => page.constructor.prototype.eval.call(page, (
    typeof fn === 'string' ? fn : [
      'function withPercyStorybookHelpers() {',
      `  const VAL_REG = ${VAL_REG};`,
      `  const NUM_REG = ${NUM_REG};`,
      `  const HEX_REG = ${HEX_REG};`,
      `  const COL_REG = ${COL_REG};`,
      `  const VALID_REG = ${VALID_REG};`,
      `  return (${fn})(...arguments);`,
      `  ${isPlainObject}`,
      `  ${validateStoryArgs}`,
      `  ${encodeStoryArgs}`,
      `  ${decodeStoryArgs}`,
      '}'
    ].join('\n')
  ), ...args);

  try {
    yield page.goto(url);
    return yield* yieldTo(callback(page));
  } catch (error) {
    // if the page crashed and retry returns truthy, try again
    if (error?.message?.includes('crashed') && retry?.()) {
      return yield* withPage(...arguments);
    }

    /* istanbul ignore next: purposefully not handling real errors */
    throw (typeof error !== 'string' ? error : new Error(error.replace(
      // strip generic error names and confusing stack traces
      /^Error:\s((.+?)\n\s+at\s.+)$/s,
      // keep the stack trace if the error came from a client script
      /\n\s+at\s.+?\(https?:/.test(error) ? '$1' : '$2'
    )));
  } finally {
    // always clean up and close the page
    await page?.close();
  }
}

// Evaluate and return Storybook environment information from the about page
/* istanbul ignore next: no instrumenting injected code */
export function evalStorybookEnvironmentInfo({ waitForXPath }) {
  let possibleEnvs = [];
  possibleEnvs.push(waitForXPath("//header[starts-with(text(), 'Storybook ')]", 5000));
  possibleEnvs.push(waitForXPath("//strong[starts-with(text(), 'You are on Storybook ')]", 5000));
  return Promise.any(possibleEnvs)
    .then(el => `storybook/${el.innerText.match(/-?\d*\.?\d+/g).join('')}`)
    .catch(() => 'storybook/unknown');
}

// Evaluate and return serialized Storybook stories to snapshot
/* istanbul ignore next: no instrumenting injected code */
export function evalStorybookStorySnapshots({ waitFor }) {
  let serialize = (what, value, invalid) => {
    if (what === 'include' || what === 'exclude') {
      return [].concat(value).filter(Boolean).map(v => v.toString());
    } else if (what === 'args' || what === 'globals') {
      return encodeStoryArgs(Object.entries(value).reduce((acc, [k, v]) => {
        if (validateStoryArgs(k, v)) return Object.assign(acc, { [k]: v });
        invalid.set(`${what}.${k}`, `omitted potentially unsafe ${what.slice(0, -1)}`);
        return acc;
      }, {}));
    } else if (what === 'queryParams') {
      return Object.entries(value).reduce((acc, [k, v]) => (
        Object.assign(acc, { [k]: encodeURIComponent(v) })
      ), {});
    } else if (what === 'additionalSnapshots') {
      return value.map(s => serialize('snapshot', s, invalid));
    } else if (what === 'snapshot') {
      return Object.entries(value).reduce((acc, [k, v], i, a) => (
        Object.assign(acc, { [k]: serialize(k, v, invalid) })
      ), {});
    } else {
      return value;
    }
  };

  return waitFor(async () => {
    // uncache stories, if cached via storyStorev7: true
    await (window.__STORYBOOK_PREVIEW__?.cacheAllCSFFiles?.() ||
      window.__STORYBOOK_STORY_STORE__?.cacheAllCSFFiles?.());
    // use newer storybook APIs before old APIs
    await (window.__STORYBOOK_PREVIEW__?.extract?.() ||
           window.__STORYBOOK_STORY_STORE__?.extract?.());
    return window.__STORYBOOK_STORY_STORE__.raw();
  }, 5000).catch(() => Promise.reject(new Error(
    'Storybook object not found on the window. ' +
      'Open Storybook and check the console for errors.'
  ))).then(stories => {
    let invalid = new Map();

    let data = stories.map(story => serialize('snapshot', {
      name: `${story.kind}: ${story.name}`,
      ...story.parameters?.percy,
      id: story.id
    }, invalid));

    return {
      invalid: Array.from(invalid),
      data
    };
  });
}

// Change the currently selected story within Storybook, decoding args and globals as necessary
/* istanbul ignore next: no instrumenting injected code */
export function evalSetCurrentStory({ waitFor }, story) {
  return waitFor(() => (
    // get the correct channel depending on the storybook version
    window.__STORYBOOK_PREVIEW__?.channel ||
    window.__STORYBOOK_STORY_STORE__?._channel
  ), 5000).catch(() => Promise.reject(new Error(
    'Storybook object not found on the window. ' +
      'Open Storybook and check the console for errors.'
  ))).then(channel => {
    let { id, queryParams, globals, args } = story;

    // emit a series of events to render the desired story
    channel.emit('updateGlobals', { globals: {} });
    channel.emit('setCurrentStory', { storyId: id });
    channel.emit('updateQueryParams', { ...queryParams });
    if (globals) channel.emit('updateGlobals', { globals: decodeStoryArgs(globals) });
    if (args) channel.emit('updateStoryArgs', { storyId: id, updatedArgs: decodeStoryArgs(args) });

    // resolve when rendered, reject on any other renderer event
    return new Promise((resolve, reject) => {
      channel.on('storyRendered', resolve);
      channel.on('storyMissing', reject);
      channel.on('storyErrored', reject);
      channel.on('storyThrewException', reject);
    });
  });
}
