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
export async function captureDOM(page, options, percy, log) {
  const responsiveSnapshotCapture = isResponsiveSnapshotCaptureEnabled(
    options,
    percy.config
  );

  let widths;
  if (responsiveSnapshotCapture) {
    const deviceDetails = await percy.client.getDeviceDetails(percy.build?.id);
    const eligibleWidths = {
      mobile: Array.isArray(deviceDetails) ? deviceDetails.map(d => d.width).filter(Boolean) : [],
      config: percy.config.snapshot?.widths || []
    };
    widths = getWidthsForDomCapture(
      options.widths,
      eligibleWidths
    );

    const responsiveOptions = { ...options, responsiveSnapshotCapture: true, widths };
    log.debug('captureDOM: Using responsive snapshot capture', { responsiveOptions });
    return await captureResponsiveDOM(page, responsiveOptions, percy, log);
  } else {
    const eligibleWidths = {
      config: percy.config.snapshot?.widths || []
    };
    widths = getWidthsForDomCapture(
      options.widths,
      eligibleWidths
    );

    const singleDOMOptions = { ...options, widths };
    log.debug('captureDOM: Using single snapshot capture', {
      singleDOMOptions
    });
    return await captureSerializedDOM(page, singleDOMOptions, log);
  }
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
  let { id, ...options } = PercyConfig.migrate(story, '/storybook');

  let errors = PercyConfig.validate(options, '/storybook');
  for (let e of (errors || [])) invalid.set(e.path, e.message);

  return PercyConfig.merge([config, options, { id }], (path, prev, next) => {
    // normalize, but do not merge include or exclude options
    if (path.length === 1 && ['include', 'exclude'].includes(path[0])) {
      return [path, [].concat(next).filter(Boolean)];
    }
  });
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

// Starts the percy instance and collects Storybook snapshots, calling the callback when done
export async function* takeStorybookSnapshots(percy, callback, {
  baseUrl,
  flags
}) {
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
      withPage(percy, aboutUrl, p => p.eval(evalStorybookEnvironmentInfo), undefined, {
        from: 'about url'
      }),
      withPage(percy, previewUrl, p => p.eval(evalStorybookStorySnapshots), undefined, {
        from: 'preview url'
      })
    ]);

    // map stories to snapshot options
    let snapshots = mapStorybookSnapshots(stories, {
      config: percy.config.storybook,
      previewUrl,
      flags
    });

    // set storybook environment info
    percy.client.addEnvironmentInfo(environmentInfo);

    // Track processed stories to avoid duplicates
    const processedStories = new Set();

    // Track retry attempts per story to avoid infinite loops
    const retryAttempts = new Map();

    // CRITICAL CHANGE: Process ONE story per page
    // This eliminates race conditions between story name tracking and error handling
    while (snapshots.length > 0) {
      // Get the current story
      const currentStory = snapshots[0];
      const { id, name } = currentStory;

      // Skip if already processed
      if (processedStories.has(id)) {
        log.debug(`Story already processed, skipping: ${name}`);
        snapshots.shift();
        continue;
      }

      // Check retry attempts for this specific story
      const attempts = retryAttempts.get(id) || 0;
      if (attempts >= 3) {
        log.warn(`Maximum retry attempts reached for story, skipping: ${name}`);
        snapshots.shift();
        continue;
      }

      // Increment attempt counter
      retryAttempts.set(id, attempts + 1);

      try {
        // Create a dedicated page for this single story
        yield* withPage(percy, `${previewUrl}?id=${id}&viewMode=story`, async function*(page) {
          // Process just this one story
          const {
            id,
            args,
            globals,
            queryParams,
            ...options
          } = currentStory;

          const enableJavaScript = options.enableJavaScript ?? percy.config.snapshot.enableJavaScript;

          if (flags.dryRun || enableJavaScript) {
            log.debug(`Loading story via previewResource: ${options.name}`);
            options.domSnapshot = previewResource.content;
          } else {
            log.debug(`Loading story: ${options.name}`);

            // Set the current story
            yield page.eval(evalSetCurrentStory, {
              id,
              args,
              globals,
              queryParams
            });

            // Take the snapshot
            let {
              dom,
              domSnapshot = dom
            } = yield page.snapshot(options);
            options.domSnapshot = domSnapshot;
          }

          // validate without logging to prune all other options
          PercyConfig.validate(options, '/snapshot/dom');

          // Take the Percy snapshot
          percy.snapshot(options);

          // log.info(`Snapshot taken: ${options.name}`);

          // Mark as successfully processed
          processedStories.add(id);

          // Remove from queue only after successful processing
          snapshots.shift();
        }, undefined, {
          // Pass the EXACT story name for this story - no more dynamic resolution needed
          snapshotName: name
        });
      } catch (error) {
        // Handle errors for this specific story
        const isExecContextError = error.message?.includes('Execution context was destroyed') ||
                                  error.message?.includes('Protocol error (Runtime.callFunctionOn)');

        if (isExecContextError) {
          // For execution context errors, we'll retry if attempts < 3
          log.warn(`Execution context error for story ${name}, attempt ${attempts + 1}/3`);

          // Only remove from queue on final attempt
          if (attempts >= 2) {
            log.error(`Failed to capture story after 3 attempts, skipping: ${name}`);
            snapshots.shift();
          }

          // Wait before trying again
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (process.env.PERCY_SKIP_STORY_ON_ERROR === 'true') {
          // For other errors, skip if configured
          log.error(`Failed to capture story: ${name}`);
          log.error(error);
          snapshots.shift();
        } else {
          // Otherwise throw the error
          throw error;
        }
      }
    }

    // will stop once snapshots are done processing
    yield* percy.yield.stop();
  } catch (error) {
    // force stop and re-throw
    await percy.stop(true);
    throw error;
  } finally {
    await callback();
  }
}
