import { logger, PercyConfig } from '@percy/cli-command';

import {
  buildStoryUrl,
  fetchStorybookPreviewResource,
  evalStorybookEnvironmentInfo,
  evalStorybookStorySnapshots,
  evalSetCurrentStory,
  withPage
} from './utils.js';

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
function getSnapshotConfig(story, config, validations) {
  let { id, ...options } = PercyConfig.migrate(story, '/storybook');

  let errors = PercyConfig.validate(options, '/storybook');
  for (let e of (errors || [])) validations.add(`- percy.${e.path}: ${e.message}`);

  return PercyConfig.merge([config, options, { id }], (path, prev, next) => {
    // normalize, but do not merge include or exclude options
    if (path.length === 1 && ['include', 'exclude'].includes(path[0])) {
      return [path, [].concat(next).filter(Boolean)];
    }
  });
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

// Map and reduce collected Storybook stories into an array of snapshot options
function mapStorybookSnapshots(stories, { previewUrl, flags, config }) {
  let log = logger('storybook:config');
  let validations = new Set();

  let snapshots = stories.reduce((all, story) => {
    if (shouldSkipStory(story.name, story, config)) {
      log.debug(`Skipping story: ${story.name}`);
      return all;
    }

    let { additionalSnapshots = [], ...options } =
      getSnapshotConfig(story, config, validations);

    return all.concat(options, (
      additionalSnapshots.reduce((add, {
        prefix = '', suffix = '', ...snap
      }) => shouldSkipStory(story.name, snap, config) ? add : (
        add.concat(PercyConfig.merge([options, {
          name: `${prefix}${story.name}${suffix}`
        }, snap]))
      ), [])
    ));
  }, []);

  // log validation warnings
  if (validations.size) {
    log.warn('Invalid Storybook parameters:');
    for (let msg of validations) log.warn(msg);
  }

  // maybe split snapshots into shards
  if ((flags.shardSize || flags.shardCount || flags.shardIndex) != null) {
    snapshots = shardSnapshots(snapshots, flags, log);
  }

  // error when missing snapshots
  if (!snapshots.length) throw new Error('No snapshots found');

  // remove filter options and generate story snapshot URLs
  return snapshots.map(({ skip, include, exclude, ...s }) => ({
    url: buildStoryUrl(previewUrl, s), ...s
  }));
}

// Starts the percy instance and collects Storybook snapshots, calling the callback when done
export async function* takeStorybookSnapshots(percy, callback, { baseUrl, flags }) {
  try {
    let aboutUrl = new URL('?path=/settings/about', baseUrl).href;
    let previewUrl = new URL('iframe.html', baseUrl).href;
    let log = logger('storybook');
    let lastCount;

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
    let [environmentInfo, stories] = yield Promise.all([
      withPage(percy, aboutUrl, p => p.eval(evalStorybookEnvironmentInfo)),
      withPage(percy, previewUrl, async p => mapStorybookSnapshots(
        await p.eval(evalStorybookStorySnapshots), {
          previewUrl, flags, config: percy.config.storybook
        }))
    ]);

    // set storybook environment info
    percy.setConfig({ environmentInfo });

    // use a single page to capture story snapshots without reloading
    yield withPage(percy, previewUrl, async page => {
      // determines when to retry page crashes
      lastCount = stories.length;

      while (stories.length) {
        // separate story and snapshot options
        let { id, args, globals, queryParams, ...options } = stories[0];
        // when javascript is enabled, the preview dom is used
        let domSnapshot = previewResource.content;

        // when javascript is not enabled and not dry-running, take a dom snapshot of the story
        if (!(flags.dryRun || options.enableJavaScript || percy.config.snapshot.enableJavaScript)) {
          await page.eval(evalSetCurrentStory, { id, args, globals, queryParams });
          ({ dom: domSnapshot } = await page.snapshot(options));
        }

        // snapshots are queued and do not need to be awaited on
        percy.snapshot({ domSnapshot, ...options });
        // discard this story when done
        stories.shift();
      }
    }, () => {
      log.debug(`Page crashed while loading story: ${stories[0].id}`);
      // return true to retry as long as the length decreases
      return lastCount > stories.length;
    });

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
