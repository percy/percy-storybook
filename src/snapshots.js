import { logger, PercyConfig } from '@percy/cli-command';
import { yieldAll } from '@percy/cli-command/utils';
import qs from 'qs';
import {
  fetchStorybookPreviewResource,
  evalStorybookEnvironmentInfo,
  evalStorybookStorySnapshots,
  evalSetCurrentStory,
  validateStoryArgs,
  encodeStoryArgs,
  withPage,
  getWidthsForDomCapture,
  isResponsiveSnapshotCaptureEnabled,
  captureSerializedDOM,
  captureResponsiveDOM
} from './utils.js';

// Main capture function
export async function captureDOM(page, options, percy, log, story) {
  const responsiveSnapshotCapture = isResponsiveSnapshotCaptureEnabled(
    options,
    percy.config
  );

  if (responsiveSnapshotCapture) {
    log.debug('captureDOM: Using responsive snapshot capture', { options });
    return await captureResponsiveDOM(page, options, percy, log, story);
  }

  log.debug('captureDOM: Using single snapshot capture');
  const eligibleWidths = { config: percy.config.snapshot?.widths || [] };
  const widths = getWidthsForDomCapture(options.widths, eligibleWidths);

  return await captureSerializedDOM(page, { ...options, widths }, log);
}

// Returns true or false if the provided story should be skipped by matching against include and
// exclude filter options. If any global filters are provided, they will override story filters.
function shouldSkipStory(name, options, config) {
  let matches = regexp => {
    /* istanbul ignore else: sanity check */
    if (typeof regexp === 'string') {
      let [, parsed, flags] = /^\/(.+)\/(\w+)?$/.exec(regexp) || [];
      regexp = new RegExp(parsed ?? regexp, flags);
    }

    return regexp?.test?.(name);
  };

  // if a global filter is present, disregard story filters
  let filter = (config?.include || config?.exclude) ? config : options;
  let include = [].concat(filter?.include).filter(Boolean);
  let exclude = [].concat(filter?.exclude).filter(Boolean);

  // if included, don't skip; if excluded always exclude
  let skip = include?.length ? !include.some(matches) : options.skip;
  if (!skip && !exclude?.some(matches)) return false;
  return true;
}

// Returns snapshot config options for a Storybook story merged with global Storybook
// options. Validation error messages will be added to the provided validations set.
function getSnapshotConfig(story, config, invalid) {
  // Remove type before validation
  const { type, ...storyWithoutType } = story;
  let { id, ...options } = PercyConfig.migrate(storyWithoutType, '/storybook');

  let errors = PercyConfig.validate(options, '/storybook');
  for (let e of (errors || [])) invalid.set(e.path, e.message);

  let merged = PercyConfig.merge([config, options, { id }], (path, prev, next) => {
    // normalize, but do not merge include or exclude options
    if (path.length === 1 && ['include', 'exclude'].includes(path[0])) {
      return [path, [].concat(next).filter(Boolean)];
    }
  });

  // Reattach type if present (robust for null/undefined)
  if (type != null) merged.type = type;
  return merged;
}

// Returns a copy of the provided config object with encoded Storybook args and globals
function encodeStorybookConfig(config = {}, invalid) {
  return Object.entries(config).reduce((acc, [key, value]) => Object.assign(acc, {
    [key]: ((key === 'args' || key === 'globals') && (
      encodeStoryArgs(Object.entries(value).reduce((acc, [k, v]) => {
        if (validateStoryArgs(k, v)) return Object.assign(acc, { [k]: v });
        invalid.set(`${key}.${k}`, `omitted potentially unsafe ${key.slice(0, -1)}`);
        return acc;
      }, {}))
    )) || (key === 'additionalSnapshots' && (
      value.map(s => encodeStorybookConfig(s, invalid))
    )) || value
  }), {});
}

// Split snapshots into chunks of shards according to the provided size, count, and index
function shardSnapshots(snapshots, { shardSize, shardCount, shardIndex }) {
  if (!shardSize && !shardCount) {
    throw new Error("Found '--shard-index' but missing '--shard-size' or '--shard-count'");
  } else if (shardSize && shardCount) {
    throw new Error("Must specify either '--shard-size' OR '--shard-count' not both");
  }

  let total = snapshots.length;
  let size = shardSize ?? Math.ceil(total / shardCount);
  let count = shardCount ?? Math.ceil(total / shardSize);

  if (shardIndex == null || shardIndex >= count) {
    throw new Error((!shardIndex ? "Missing '--shard-index'." : (
      `The provided '--shard-index' (${shardIndex}) is out of range.`
    )) + ` Found ${count} shards of ${size} snapshots each (${total} total)`);
  }

  return snapshots.splice(size * shardIndex, size);
}

// Transforms a set of pre-encoded args into a single query parameter value
function buildStorybookArgsParam(args) {
  let argsParam = qs.stringify(args, {
    encode: false,
    delimiter: ';',
    allowDots: true,
    format: 'RFC1738'
  });

  return argsParam
    .replace(/ /g, '+')
    .replace(/=/g, ':');
}

// Map and reduce collected Storybook stories into an array of snapshot options
function mapStorybookSnapshots(stories, { previewUrl, flags, config }) {
  let log = logger('storybook:config');
  let invalid = new Map(stories.invalid);
  let conf = encodeStorybookConfig(config, invalid);

  let snapshots = stories.data.reduce((all, story) => {
    if (shouldSkipStory(story.name, story, config)) {
      log.debug(`Skipping story: ${story.name}`);
      return all;
    }

    let { additionalSnapshots = [], ...options } =
      getSnapshotConfig(story, conf, invalid);

    return all.concat(options, (
      additionalSnapshots.reduce((add, {
        prefix = '', suffix = '', ...snap
      }) => shouldSkipStory(story.name, snap) ? add : (
        add.concat(PercyConfig.merge([options, {
          name: `${prefix}${story.name}${suffix}`
        }, snap]))
      ), [])
    ));
  }, []);

  // log validation warnings
  if (invalid.size) {
    log.warn('Invalid Storybook parameters:');
    invalid = Array.from(invalid.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (let [k, msg] of invalid) log.warn(`- percy.${k}: ${msg}`);
  }

  // maybe split snapshots into shards
  if ((flags.shardSize || flags.shardCount || flags.shardIndex) != null) {
    snapshots = shardSnapshots(snapshots, flags, log);
  }

  // error when missing snapshots
  if (!snapshots.length) throw new Error('No snapshots found');

  // remove filter options and generate story snapshot URLs
  return snapshots.map(({ skip, include, exclude, ...story }) => {
    let url = `${previewUrl}?id=${story.id}`;
    if (story.args) url += `&args=${buildStorybookArgsParam(story.args)}`;
    if (story.globals) url += `&globals=${buildStorybookArgsParam(story.globals)}`;
    for (let [k, v] of Object.entries(story.queryParams ?? {})) url += `&${k}=${v}`;
    return Object.assign(story, { url });
  });
}

// Helper function to check if a story has state that could contaminate the page
function hasContaminatingState(story) {
  return (story.globals && Object.keys(story.globals).length > 0) ||
         (story.queryParams && Object.keys(story.queryParams).length > 0);
}

// Helper function to determine if a fresh page is needed
function needsFreshPage(previousStory) {
  // Only need fresh page if previous story had contaminating state
  // The current story will be loaded correctly regardless of globals/queryParams
  return previousStory && (hasContaminatingState(previousStory) || previousStory.type === 'docs');
}

// Process a single story and capture its DOM
async function* processStory(page, story, previewResource, percy, flags, log) {
  // Extract story details
  let { id, args, globals, queryParams, ...options } = story;

  const enableJavaScript = options.enableJavaScript ?? percy.config.snapshot.enableJavaScript;
  if (flags.dryRun || enableJavaScript) {
    log.debug(`Loading story via previewResource: ${options.name}`);
    // when dry-running or when javascript is enabled, use the preview dom
    options.domSnapshot = previewResource.content;
  } else {
    log.debug(`Loading story: ${options.name}`);
    // when not dry-running and javascript is not enabled, capture the story dom
    yield page.eval(evalSetCurrentStory, { id, args, globals, queryParams });
    options.domSnapshot = await captureDOM(page, options, percy, log, story);
  }

  // validate without logging to prune all other options
  PercyConfig.validate(options, '/snapshot/dom');

  return options;
}

// Starts the percy instance and collects Storybook snapshots, calling the callback when done
export async function* takeStorybookSnapshots(percy, callback, { baseUrl, flags }) {
  try {
    let aboutUrl = new URL('?path=/settings/about', baseUrl).href;
    let previewUrl = new URL('iframe.html', baseUrl).href;
    let log = logger('storybook');

    log.debug(`Requesting Storybook: ${baseUrl}`);
    // start a timeout to show a log if storybook takes a few seconds to respond
    let logTimeout = setTimeout(log.warn, 3000, 'Waiting on a response from Storybook...');
    let previewResource = yield fetchStorybookPreviewResource(percy, previewUrl);
    clearTimeout(logTimeout);

    // start percy
    yield* percy.yield.start();
    // launch the percy browser if not launched during dry-runs
    yield percy.browser.launch();

    // gather storybook data in parallel
    let [environmentInfo, stories] = yield* yieldAll([
      withPage(percy, aboutUrl, p => p.eval(evalStorybookEnvironmentInfo), undefined, { from: 'about url' }),
      withPage(
        percy,
        previewUrl,
        p => p.eval(
          evalStorybookStorySnapshots,
          {
            docCapture: process.env.PERCY_STORYBOOK_DOC_CAPTURE === 'true',
            autodocCapture: process.env.PERCY_STORYBOOK_AUTODOC_CAPTURE === 'true'
          }
        ),
        undefined,
        { from: 'preview url' }
      )
    ]);

    // map stories to snapshot options
    let snapshots = mapStorybookSnapshots(stories, {
      config: percy.config.storybook,
      previewUrl,
      flags
    });

    // set storybook environment info
    percy.client.addEnvironmentInfo(environmentInfo);

    // Track previous story state to determine when fresh pages are needed
    let previousStory = null;

    // Main snapshot processing loop
    while (snapshots.length) {
      let initialSnapshotsCount = snapshots.length;
      let currentStory = snapshots[0];

      // Check if we need a fresh page (only when previous story had contaminating state)
      let needsNewPage = needsFreshPage(previousStory);

      if (needsNewPage) {
        log.debug(`Fresh page needed for story "${currentStory.name}" - previous story had contaminating state`);
      }

      try {
        // Use a single page for as many stories as possible until a context error occurs
        yield* withPage(percy, `${previewUrl}?id=${snapshots[0].id}&viewMode=story`, async function*(page) {
          // Process snapshots one by one with the current page
          while (snapshots.length) {
            try {
              let currentStory = snapshots[0];

              // If we need a fresh page for state reset, break out to create a new page
              if (needsNewPage && snapshots.length < initialSnapshotsCount) {
                log.debug(`Breaking to create fresh page for story: ${currentStory.name}`);
                break; // Break out of the inner loop to create a new page
              }

              // Process the story and capture its DOM
              const options = yield* processStory(page, currentStory, previewResource, percy, flags, log);

              // Take the snapshot
              percy.snapshot(options);

              // Update previous story tracking
              previousStory = currentStory;

              // Remove processed story from queue
              snapshots.shift();

              // Check if next story needs fresh page (only if current story has contaminating state)
              if (snapshots.length > 0) {
                needsNewPage = needsFreshPage(currentStory);
              }
            } catch (storyError) {
              // Handle execution context destruction errors specially
              if (storyError.isExecutionContextDestroyed) {
                log.warn(`Execution context was destroyed while processing story: ${snapshots[0].name}`);
              }

              // Need to create a new page - break out of the inner loop
              // but don't remove the story from the queue so it can be retried
              throw storyError;
            }
          }
        }, undefined, { snapshotName: snapshots[0].name });
      } catch (pageError) {
        // Check if the error is an execution context destruction
        if (pageError.isExecutionContextDestroyed) {
          log.debug(`Execution context error caught for: ${snapshots[0]?.name}, will create new page`);
          // Don't skip the story - we'll retry with a new page in the next iteration
        } else if (process.env.PERCY_SKIP_STORY_ON_ERROR === 'true') {
          let { name } = snapshots[0];
          log.error(`Failed to capture story: ${name}`);
          log.error(pageError);
          // Skip this story
          snapshots.shift();
        } else {
          // Propagate other errors
          throw pageError;
        }
      }

      // Safety check to prevent infinite loop - if we've processed no stories in this iteration
      // and we're not skipping on error, something is wrong
      if (initialSnapshotsCount === snapshots.length && !process.env.PERCY_SKIP_STORY_ON_ERROR) {
        log.error('No stories processed in this iteration, breaking loop to prevent infinite run');
        break;
      }
    }

    // Will stop once snapshots are done processing
    yield* percy.yield.stop();
  } catch (error) {
    // force stop and re-throw
    await percy.stop(true);
    throw error;
  } finally {
    await callback();
  }
}
