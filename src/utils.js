import { request, createRootResource } from '@percy/cli-command/utils';
import { buildArgsParam } from '@storybook/router';

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

// Build a url for storybook to determine initial state from
export function buildStoryUrl(baseUrl, story) {
  let url = `${baseUrl}?id=${story.id}`;
  if (story.args) url += `&args=${buildArgsParam(null, story.args)}`;
  if (story.globals) url += `&globals=${buildArgsParam(null, story.globals)}`;
  if (story.queryParams) url += `&${new URLSearchParams(story.queryParams)}`;
  return url;
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

// Borrows a percy discovery browser page to navigate to a URL and evaluate a function, returning
// the results and normalizing any thrown errors.
export async function withPage(percy, url, callback, retry) {
  // provide discovery options that may impact how the page loads
  let page = await percy.browser.page({
    networkIdleTimeout: percy.config.discovery.networkIdleTimeout,
    requestHeaders: getAuthHeaders(percy.config.discovery),
    userAgent: percy.config.discovery.userAgent
  });

  try {
    await page.goto(url);
    return await callback(page);
  } catch (error) {
    // if the page crashed and retry returns truthy, try again
    if (error.message?.includes('crashed') && retry?.()) return withPage(...arguments);
    /* istanbul ignore next: purposefully not handling real errors */
    if (typeof error !== 'string') throw error;
    // make eval errors nicer by stripping the stack trace from the message
    throw new Error(error.replace(/^Error:\s(.*?)\n\s{4}at\s.*$/s, '$1'));
  } finally {
    // always clean up and close the page
    await page?.close();
  }
}

// Evaluate and return Storybook environment information from the about page
/* istanbul ignore next: no instrumenting injected code */
export function evalStorybookEnvironmentInfo({ waitForXPath }) {
  return waitForXPath("//header[starts-with(text(), 'Storybook ')]", 5000)
    .then(el => `storybook/${el.innerText.match(/-?\d*\.?\d+/g).join('')}`)
    .catch(() => 'storybook/unknown');
}

// Evaluate and return Storybook stories to snapshot
/* istanbul ignore next: no instrumenting injected code */
export function evalStorybookStorySnapshots({ waitFor }) {
  let serializeRegExp = r => r && [].concat(r).map(r => r.toString());

  return waitFor(async () => {
    // use newer storybook APIs before old APIs
    await (window.__STORYBOOK_PREVIEW__?.extract?.() ||
           window.__STORYBOOK_STORY_STORE__?.extract?.());
    return window.__STORYBOOK_STORY_STORE__.raw();
  }, 5000).catch(() => Promise.reject(new Error(
    'Storybook object not found on the window. ' +
      'Open Storybook and check the console for errors.'
  ))).then(stories => stories.map(story => ({
    name: `${story.kind}: ${story.name}`,
    ...story.parameters?.percy,
    include: serializeRegExp(story.parameters?.percy?.include),
    exclude: serializeRegExp(story.parameters?.percy?.exclude),
    id: story.id
  })));
}

// Change the currently selected story within Storybook
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
    // emit a series of events to render the desired story
    channel.emit('updateGlobals', { globals: {} });
    channel.emit('setCurrentStory', { storyId: story.id });
    channel.emit('updateQueryParams', { ...story.queryParams });
    channel.emit('updateGlobals', { globals: story.globals });
    channel.emit('updateStoryArgs', { storyId: story.id, updatedArgs: story.args });

    // resolve when rendered, reject on any other renderer event
    return new Promise((resolve, reject) => {
      channel.on('storyRendered', resolve);
      channel.on('storyMissing', reject);
      channel.on('storyErrored', reject);
      channel.on('storyThrewException', reject);
    });
  });
}
