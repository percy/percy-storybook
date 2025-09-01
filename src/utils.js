import { request, createRootResource, yieldTo } from '@percy/cli-command/utils';
import { logger } from '@percy/cli-command';
import spawn from 'cross-spawn';

// check storybook version
export function checkStorybookVersion() {
  return new Promise((resolve, reject) => {
    const childProcess = spawn('storybook', ['--version']);

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('exit', (code) => {
      if (code === 0) {
        // Successful execution
        const versionMatch = stdout.match(/\d+/); // Match only major version
        if (versionMatch) {
          resolve(parseInt(versionMatch[0], 10)); // Parse as integer
        } else {
          reject(new Error('Unable to parse Storybook version'));
        }
      } else {
        // Non-zero exit code
        reject(new Error(`Storybook command failed with exit code ${code}: ${stderr}`));
      }
    });

    childProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        resolve(6);
      }
      // Error occurred while spawning the child process
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
export async function* withPage(percy, url, callback, retry, args) {
  let log = logger('storybook:utils');
  let attempt = 0;
  let retries = 3;

  // Check if this is a context destruction error that needs to be propagated
  const isExecutionContextDestroyed = (error) => {
    return error.message?.includes('Execution context was destroyed') ||
           error.message?.includes('context was destroyed') ||
           error.message?.includes('execution context');
  };

  while (attempt < retries) {
    try {
      // provide discovery options that may impact how the page loads
      let page = yield percy.browser.page({
        networkIdleTimeout: percy.config.discovery.networkIdleTimeout,
        requestHeaders: getAuthHeaders(percy.config.discovery),
        captureMockedServiceWorker: percy.config.discovery.captureMockedServiceWorker,
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
        // For context destruction error, create a special error object with flag
        if (isExecutionContextDestroyed(error)) {
          log.debug(`Execution context was destroyed for: ${args?.snapshotName || url}`);
          const contextError = new Error(error.message);
          contextError.isExecutionContextDestroyed = true;
          throw contextError;
        }

        // if the page crashed and retry returns truthy, try again
        if (error.message?.includes('crashed') && retry?.()) {
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
    } catch (error) {
      attempt++;
      let enableRetry = process.env.PERCY_RETRY_STORY_ON_ERROR || 'true';
      const from = args?.from;

      if (!(enableRetry === 'true') || attempt === retries) {
        // Add snapshotName to the error message
        const snapshotName = args?.snapshotName;
        if (from) {
          error.message = `${from}: \n${error.message}`;
        }
        if (snapshotName) {
          error.message = `Snapshot Name: ${snapshotName}: \n${error.message}`;
        }
        throw error;
      }

      // throw warning message with snapshot name if it is present.
      if (args?.snapshotName) {
        log.warn(`Retrying Story: ${args.snapshotName}, attempt: ${attempt}`);
      }
      // throw warning message with from where it is called if from in present.
      if (from) {
        log.warn(
          `Retrying because error occurred in: ${from}, attempt: ${attempt}`
        );
      }

      // If it's a context destruction error, propagate it with special flag
      if (error.isExecutionContextDestroyed) {
        log.warn(`Detected execution context destruction for: ${args?.snapshotName || url}`);
        throw error;
      }
    }
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
    await window.__STORYBOOK_PREVIEW__?.ready?.();
    // uncache stories, if cached via storyStorev7: true
    await (window.__STORYBOOK_PREVIEW__?.cacheAllCSFFiles?.() ||
    window.__STORYBOOK_STORY_STORE__?.cacheAllCSFFiles?.());

    const storiesObj = await (window.__STORYBOOK_PREVIEW__?.extract?.());
    if (storiesObj && !Array.isArray(storiesObj)) {
      return Object.values(storiesObj);
    }

    await window.__STORYBOOK_STORY_STORE__?.extract?.();
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
  return waitFor(() => {
    // get the correct channel depending on the storybook version
    return window.__STORYBOOK_PREVIEW__?.channel ||
        window.__STORYBOOK_STORY_STORE__?._channel;
  }, 5000).catch(() => Promise.reject(new Error(
    'Storybook object not found on the window. ' +
      'Open Storybook and check the console for errors.'
  ))).then(channel => {
    let { id, queryParams, globals, args } = story;

    // emit a series of events to render the desired story
    channel.emit('setCurrentStory', { storyId: id });
    channel.emit('updateGlobals', { globals: {} });
    channel.emit('updateQueryParams', { ...queryParams });
    if (globals) channel.emit('updateGlobals', { globals: decodeStoryArgs(globals) });
    if (args) channel.emit('updateStoryArgs', { storyId: id, updatedArgs: decodeStoryArgs(args) });

    // resolve when rendered, reject on any other renderer event
    return new Promise((resolve, reject) => {
      channel.on('storyRendered', () => {
        // After the story is rendered, add a small delay before checking loaders
        // This helps ensure that any post-render loader state changes have time to occur
        setTimeout(() => {
          // Wait for any loaders to disappear before resolving
          waitForLoadersToDisappear().then(resolve).catch(reject);
        }, 100);
      });

      channel.on('storyMissing', (err) => reject(err || new Error('Story Missing')));
      channel.on('storyErrored', (err) => reject(err || new Error('Story Errored')));
      channel.on('storyThrewException', (err) => reject(err || new Error('Story Threw Exception')));
    });

    // Helper function to wait for all loaders to disappear
    function waitForLoadersToDisappear() {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          // Collect information about loaders that are still visible for debugging
          const initialLoader = document.getElementById('preview-loader');
          const preparingStory = document.querySelector('.sb-preparing-story');
          const preparingDocs = document.querySelector('.sb-preparing-docs');
          const bodyClasses = document.body.classList.toString();

          let loaderInfo = {};
          if (initialLoader) loaderInfo.initialLoader = true;
          if (preparingStory) loaderInfo.preparingStory = !!window.getComputedStyle(preparingStory).display !== 'none';
          if (preparingDocs) loaderInfo.preparingDocs = !!window.getComputedStyle(preparingDocs).display !== 'none';
          loaderInfo.bodyClasses = bodyClasses;
          // Proceed with the snapshot anyway
          resolve();
        }, 15000); // 15 second timeout

        // Track consecutive checks where loaders are gone to ensure stability
        let stableCheckCount = 0;
        const requiredStableChecks = 3; // Require multiple consecutive checks with loaders gone

        const checkLoaders = () => {
          // Check for the initial page loader
          const initialLoader = document.getElementById('preview-loader');

          // Direct DOM checks for preparing story and docs elements - more reliable than just class checks
          const preparingStoryElement = document.querySelector('.sb-preparing-story');
          const preparingDocsElement = document.querySelector('.sb-preparing-docs');

          // Check if these elements exist and are visible
          const isPreparingStoryVisible = preparingStoryElement &&
            window.getComputedStyle(preparingStoryElement).display !== 'none';

          const isPreparingDocsVisible = preparingDocsElement &&
            window.getComputedStyle(preparingDocsElement).display !== 'none';

          // Backup check via body class to cover all bases
          const hasPreparingStoryClass = document.body.classList.contains('sb-show-preparing-story');
          const hasPreparingDocsClass = document.body.classList.contains('sb-show-preparing-docs');

          // Check any standalone loaders that might be visible outside the main containers
          const allLoaders = document.querySelectorAll('.sb-loader');
          const visibleStandaloneLoaders = Array.from(allLoaders).filter(loader => {
            // Skip loaders already accounted for in preparing-story/docs
            if (loader.closest('.sb-preparing-story') || loader.closest('.sb-preparing-docs')) {
              return false;
            }

            // Check visibility of loader and its parent chain
            let element = loader;
            while (element) {
              const style = window.getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
              }
              element = element.parentElement;
            }
            return true;
          });

          // Consider loaders gone when all conditions are met
          if (!initialLoader &&
              !isPreparingStoryVisible &&
              !isPreparingDocsVisible &&
              !hasPreparingStoryClass &&
              !hasPreparingDocsClass &&
              visibleStandaloneLoaders.length === 0) {
            // Loaders appear to be gone, increment the stable count
            stableCheckCount++;

            // Only consider loaders truly gone after multiple stable checks
            if (stableCheckCount >= requiredStableChecks) {
              clearTimeout(timeout);
              resolve();
              return;
            }
          } else {
            // Reset stability counter if loaders are detected
            stableCheckCount = 0;
          }

          setTimeout(checkLoaders, 100);
        };

        checkLoaders();
      });
    }
  });
}

// Utility functions for responsive snapshot capture

// Process widths for DOM capture with proper hierarchy
// Returns: array of numbers (non-responsive mode) | array of {width, height} objects (responsive mode)
export function getWidthsForDomCapture(userPassedWidths, eligibleWidths, defaultHeight) {
  // Responsive mode: return width-height objects
  if (defaultHeight !== undefined) {
    return buildWidthHeightCombinations(userPassedWidths, eligibleWidths, defaultHeight);
  }

  // Non-responsive mode: return simple array of numbers
  return buildNonResponsiveWidthsArray(userPassedWidths, eligibleWidths);
}

/**
 * Build width-height combinations for responsive capture
 */
function buildWidthHeightCombinations(userPassedWidths, eligibleWidths, defaultHeight) {
  const widthHeightMap = new Map();

  // Add mobile devices with their heights
  eligibleWidths.mobile?.forEach(device => {
    if (device.width) {
      widthHeightMap.set(device.width, device.height || defaultHeight);
    }
  });

  // Add desktop widths with default height (overwrites mobile if same width)
  const desktopWidths = userPassedWidths?.length ? userPassedWidths : eligibleWidths.config;
  desktopWidths?.forEach(width => {
    if (width) {
      widthHeightMap.set(width, defaultHeight);
    }
  });

  // Convert to array of objects
  return Array.from(widthHeightMap.entries())
    .map(([width, height]) => ({ width, height }))
    .filter(item => item.width);
}

/**
 * Build non-responsive widths array (numbers only)
 */
function buildNonResponsiveWidthsArray(userPassedWidths, eligibleWidths) {
  const allWidths = [];

  // Add mobile widths
  if (eligibleWidths.mobile?.length) {
    allWidths.push(...eligibleWidths.mobile);
  }

  // Add user or config widths
  const desktopWidths = userPassedWidths?.length ? userPassedWidths : eligibleWidths.config;
  if (desktopWidths?.length) {
    allWidths.push(...desktopWidths);
  }

  // Remove duplicates and filter out falsy values
  return [...new Set(allWidths)].filter(Boolean);
}

// Check if responsive snapshot capture is enabled with proper hierarchy
export function isResponsiveSnapshotCaptureEnabled(options, config) {
  if (options && 'responsiveSnapshotCapture' in options) {
    const value = !!(options.responsiveSnapshotCapture);
    return value;
  }

  if (config?.snapshot && 'responsiveSnapshotCapture' in config.snapshot) {
    const value = !!(config.snapshot.responsiveSnapshotCapture);
    return value;
  }

  return false;
}

async function changeViewportDimensionAndWait(page, width, height, resizeCount, log) {
  try {
    // Use Percy's CDP-based resize method
    await page.resize({
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
  } catch (e) {
    log.debug('Resizing using CDP failed, falling back to page eval for width', width, e);
    // Fallback to JavaScript execution
    try {
      await page.eval(({ width, height }) => {
        window.resizeTo(width, height);
        // Trigger resize events and force layout
        window.dispatchEvent(new Event('resize'));
        document.body.offsetHeight;
      }, { width, height });
    } catch (fallbackError) {
      log.error('Fallback resize using page.eval failed', fallbackError);
      throw new Error(`Failed to resize viewport using both CDP and page.eval: ${fallbackError.message}`);
    }
  }

  try {
    // Wait for resize to complete
    await page.eval(({ resizeCount }) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 1000);
        const checkResize = () => {
          if (window.resizeCount === resizeCount) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkResize, 50);
          }
        };
        checkResize();
      });
    }, { resizeCount });
  } catch (e) {
    log.debug('Timed out waiting for window resize event for width', width, e);
  }
}

export async function captureSerializedDOM(page, options, log) {
  try {
    let { dom, domSnapshot = dom } = await page.snapshot(options);
    return domSnapshot;
  } catch (error) {
    log.error('Error in captureSerializedDOM:', error);
    throw new Error(`Failed to capture DOM snapshot: ${error.message}`);
  }
}

// Capture responsive DOM snapshots across different widths
export async function captureResponsiveDOM(page, options, percy, log) {
  const domSnapshots = [];

  // Get current viewport size
  const { width: currentWidth, height: currentHeight } = await page.eval(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));

  let lastWindowWidth = currentWidth;
  let lastWindowHeight = currentHeight;
  let resizeCount = 0;

  // Setup the resizeCount listener
  await page.eval(() => {
    if (typeof window.PercyDOM !== 'undefined' && window.PercyDOM.waitForResize) {
      window.PercyDOM.waitForResize();
    }
    window.resizeCount = window.resizeCount || 0;
  });

  // Fetch device details and build eligible widths
  const deviceDetails = await percy.client.getDeviceDetails(percy.build?.id);
  const eligibleWidths = {
    mobile: Array.isArray(deviceDetails) ? deviceDetails.filter(d => d.width) : [],
    config: percy.config.snapshot?.widths || []
  };

  // PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT: If set, overrides the minimum height for the viewport during capture.
  let defaultHeight = currentHeight;
  if (process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT) {
    const viewportOuterHeight = await page.eval(() => window.outerHeight);
    const configMinHeight = percy?.config?.snapshot?.minHeight || 600;
    defaultHeight = viewportOuterHeight - currentHeight + configMinHeight;
    log.debug(`Using custom minHeight for responsive capture: ${defaultHeight}`);
  }

  const widthHeightCombinations = getWidthsForDomCapture(
    options.widths,
    eligibleWidths,
    defaultHeight
  );

  for (const { width, height: targetHeight } of widthHeightCombinations) {
    log.debug(`Capturing snapshot at width: ${width}, height: ${targetHeight}`);

    // Resize if either width or height has changed
    if (lastWindowWidth !== width || lastWindowHeight !== targetHeight) {
      resizeCount++;
      log.debug(`Resizing viewport to width=${width}, height=${targetHeight}, resizeCount=${resizeCount}`);
      await page.eval(({ resizeCount }) => {
        window.resizeCount = resizeCount;
      }, { resizeCount });
      await changeViewportDimensionAndWait(page, width, targetHeight, resizeCount, log);
      lastWindowWidth = width;
      lastWindowHeight = targetHeight;
    }

    // PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE: If set, reloads the page before each snapshot width.
    if (process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE) {
      const currentUrl = await page.eval(() => window.location.href);
      log.debug('Reloading page for responsive capture');
      await page.goto(currentUrl, { forceReload: true });

      // Re-inject PercyDOM if needed
      await page.insertPercyDom();
    }

    // RESPONSIVE_CAPTURE_SLEEP_TIME: (number, seconds) If set, waits this many seconds before capturing each snapshot.
    if (process.env.RESPONSIVE_CAPTURE_SLEEP_TIME) {
      let sleepTime = parseInt(process.env.RESPONSIVE_CAPTURE_SLEEP_TIME, 10);
      if (isNaN(sleepTime) || sleepTime < 0) {
        log.warn(`Invalid value for RESPONSIVE_CAPTURE_SLEEP_TIME: "${process.env.RESPONSIVE_CAPTURE_SLEEP_TIME}". Using fallback value of 0 seconds.`);
        sleepTime = 0;
      }
      log.debug(`Sleeping for ${sleepTime} seconds before capturing snapshot`);
      await new Promise(resolve => setTimeout(resolve, sleepTime * 1000));
    }

    // Capture DOM snapshot
    log.debug(`Taking DOM snapshot at width=${width}, height=${targetHeight}`);
    const serializationOptions = {
      ...options,
      responsiveSnapshotCapture: true,
      widths: widthHeightCombinations.map(item => item.width) // Convert to simple widths array
    };
    const domSnapshot = await captureSerializedDOM(page, serializationOptions, log);
    domSnapshots.push({ ...domSnapshot, width });
    log.debug(`Snapshot captured for width=${width}, height=${targetHeight}`);
  }

  // Reset viewport size back to original dimensions
  log.debug('Resetting viewport to original size after responsive capture');
  await changeViewportDimensionAndWait(page, currentWidth, currentHeight, resizeCount + 1, log);
  log.debug('Responsive DOM capture complete');
  return domSnapshots;
}
