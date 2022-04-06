import { logger } from '@percy/cli-command';
import { request, createRootResource } from '@percy/cli-command/utils';

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

// Borrows a percy discovery browser page to navigate to a URL and evaluate a function, returning
// the results and normalizing any thrown errors.
async function evalOnPage(percy, url, fn) {
  // provide discovery options that may impact how the page loads
  let page = await percy.browser.page({
    networkIdleTimeout: percy.config.discovery.networkIdleTimeout,
    requestHeaders: getAuthHeaders(percy.config.discovery),
    userAgent: percy.config.discovery.userAgent
  });

  try {
    // navigate to the URL and evaluate the provided function
    await page.goto(url);
    return await page.eval(fn, 5000);
  } catch (error) {
    /* istanbul ignore next: purposefully not handling real errors */
    if (typeof error !== 'string') throw error;
    // make eval errors nicer by stripping the stack trace from the message
    throw new Error(error.replace(/^Error:\s(.*?)\n\s{4}at\s.*$/s, '$1'));
  } finally {
    // always clean up and close the page
    await page?.close();
  }
}

// Evaluate and return Storybook environment information
/* istanbul ignore next: no instrumenting injected code */
async function evalStorybookEnvInfo({ waitFor }, timeout) {
  // Use an xpath selector to find the appropriate element containing the version number
  let getPath = path => document.evaluate(path, document, null, 9, null).singleNodeValue;
  let headerPath = "//header[starts-with(text(), 'Storybook ')]";

  return waitFor(() => getPath(headerPath), timeout).then(() => {
    let ver = getPath(headerPath).innerText.match(/-?\d*\.?\d+/g);
    return `storybook/${ver.join('')}`;
  }).catch(() => {
    return 'storybook/unknown';
  });
}

// Evaluate and return Storybook stories to snapshot
/* istanbul ignore next: no instrumenting injected code */
async function evalStorybookStories({ waitFor }, timeout) {
  let serializeRegExp = r => r && [].concat(r).map(r => r.toString());
  let client = '__STORYBOOK_CLIENT_API__';

  return waitFor(() => !!window[client], timeout)
    .then(() => window[client].raw().map(story => ({
      name: `${story.kind}: ${story.name}`,
      ...story.parameters?.percy,
      include: serializeRegExp(story.parameters?.percy?.include),
      exclude: serializeRegExp(story.parameters?.percy?.exclude),
      id: story.id
    }))).catch(() => Promise.reject(new Error(
      'Storybook object not found on the window. ' +
        'Open Storybook and check the console for errors.'
    )));
}

export async function evaluatePercyStorybookData(percy, url) {
  let previewUrl = new URL('iframe.html', url);
  let aboutUrl = new URL('?path=/settings/about', url);
  let log = logger('storybook:eval');

  // start a timeout to show a log if storybook takes a few seconds
  log.debug(`Requesting Storybook: ${url}`);
  let logTimeout = setTimeout(log.warn, 3000, 'Waiting on a response from Storybook...');

  // ensure storybook is running and simultaneously capture a preview resource for later
  let previewResource = createRootResource(previewUrl, await request(previewUrl, {
    headers: getAuthHeaders(percy.config.discovery),
    retryNotFound: true,
    interval: 1000,
    retries: 30
  }));

  // clear the log timeout
  clearTimeout(logTimeout);

  // launch the percy browser if not launched for dry-runs
  await percy.browser.launch();

  // scrape pages for storybook stories and env info
  let [stories, environmentInfo] = await Promise.all([
    evalOnPage(percy, previewUrl, evalStorybookStories),
    evalOnPage(percy, aboutUrl, evalStorybookEnvInfo)
  ]);

  return {
    environmentInfo,
    previewResource,
    stories
  };
}

export default evaluatePercyStorybookData;
