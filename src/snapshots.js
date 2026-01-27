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
  captureResponsiveDOM,
  findMatchingDocRule,
  getDocSnapshotConfig,
  hasRules
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

// Helper function to check if a config flag should be enabled with fallback to env var
function getCaptureFlagValue(configValue, envVarName) {
  return configValue != null ? !!configValue : process.env[envVarName] === 'true';
}

// Helper function to determine doc capture flags considering config, rules, and env vars
function getDocCaptureFlagsWithRules(config) {
  const hasMdxRules = hasRules(config.docs?.mdx?.rules);
  const hasAutodocsRules = hasRules(config.docs?.autodocs?.rules);

  // If rules exist OR config is explicitly set OR env var is set, enable capture
  const docCaptureFlag = !!config.captureDocs || hasMdxRules ||
    process.env.PERCY_STORYBOOK_DOC_CAPTURE === 'true';
  const autodocCaptureFlag = !!config.captureAutodocs || hasAutodocsRules ||
    process.env.PERCY_STORYBOOK_AUTODOC_CAPTURE === 'true';

  return {
    docCaptureFlag,
    autodocCaptureFlag,
    hasMdxRules,
    hasAutodocsRules
  };
}

// Priority: rule-level capture > .percy.yml > env var
function mapDocSnapshots(docs, config, conf, invalid, log) {
  const captureDocs = getCaptureFlagValue(config.captureDocs, 'PERCY_STORYBOOK_DOC_CAPTURE');
  const captureAutodocs = getCaptureFlagValue(config.captureAutodocs, 'PERCY_STORYBOOK_AUTODOC_CAPTURE');
  const mdxRules = config.docs?.mdx?.rules;
  const autodocsRules = config.docs?.autodocs?.rules;
  const hasMdxRules = hasRules(mdxRules);
  const hasAutodocsRules = hasRules(autodocsRules);

  const isDocAutodoc = (doc) => {
    const tags = doc.tags || [];
    if (tags.includes('unattached-mdx')) return false;
    return tags.includes('autodocs');
  };

  // Log available doc ids once when we have rules, so users can fix .percy.yml match patterns
  if (docs.length > 0 && (hasMdxRules || hasAutodocsRules)) {
    const byType = { mdx: [], autodocs: [] };
    docs.forEach(doc => {
      const key = isDocAutodoc(doc) ? 'autodocs' : 'mdx';
      byType[key].push({ id: doc.id, name: doc.name });
    });
    if (byType.mdx.length) log.info(`MDX doc IDs available for match: ${byType.mdx.map(d => d.id).join(', ')}`);
    if (byType.autodocs.length) log.info(`Autodoc IDs available for match: ${byType.autodocs.map(d => d.id).join(', ')}`);
  }

  return docs.reduce((all, doc) => {
    const isAutodoc = isDocAutodoc(doc);
    const captureAll = isAutodoc ? captureAutodocs : captureDocs;
    const rules = isAutodoc ? autodocsRules : mdxRules;
    const hasRules = isAutodoc ? hasAutodocsRules : hasMdxRules;

    let ruleOptions = null;
    if (hasRules) {
      const rule = findMatchingDocRule(doc, rules);
      if (!rule) {
        // No matching rule: if captureAll is true (from .percy.yml or env var), capture with default options
        // If captureAll is false, skip (rules exist but none match and global flag is off)
        if (!captureAll) {
          log.debug(`Skipping doc (no matching rule, captureAll=false): id=${doc.id} name=${doc.name}`);
          return all;
        }
        // captureAll is true but no rule matches → capture with default options
        ruleOptions = {};
      } else {
        // Rule matched: check rule.capture vs captureAll
        // captureDocs/captureAutodocs true → capture by default unless rule has capture: false
        // captureDocs/captureAutodocs false → capture only when rule has capture: true
        if (captureAll) {
          if (rule.capture === false) {
            log.debug(`Skipping doc (capture: false): ${doc.id}`);
            return all;
          }
        } else {
          if (rule.capture !== true) {
            log.debug(`Skipping doc (needs capture: true): ${doc.id}`);
            return all;
          }
        }
        ruleOptions = rule;
      }
    } else if (!captureAll) {
      return all;
    } else {
      ruleOptions = {};
    }

    log.info(`Capturing doc: id=${doc.id} name=${doc.name}`);

    let { additionalSnapshots = [], ...options } =
      getDocSnapshotConfig(doc, ruleOptions, conf, invalid);

    return all.concat(options, processAdditionalSnapshots(additionalSnapshots, options, doc.name));
  }, []);
}

// Helper function to process additional snapshots for a story/doc
function processAdditionalSnapshots(additionalSnapshots, baseOptions, storyName, skipCallback = null) {
  return (additionalSnapshots || []).reduce((add, { prefix = '', suffix = '', ...snap }) => {
    // If skipCallback is provided and returns true, skip this additional snapshot
    if (skipCallback && skipCallback(snap)) {
      return add;
    }
    return add.concat(PercyConfig.merge([baseOptions, {
      name: `${prefix}${storyName}${suffix}`
    }, snap]));
  }, []);
}

// Map and reduce collected Storybook stories into an array of snapshot options
function mapStorybookSnapshots(stories, { previewUrl, flags, config }) {
  let log = logger('storybook:config');
  let invalid = new Map(stories.invalid);
  let conf = encodeStorybookConfig(config, invalid);

  // Separate stories from docs: extract() may return docs without type='docs', so check id suffix
  const storyEntries = stories.data.filter(s => s.type !== 'docs' && !String(s.id || '').endsWith('--docs'));
  const docCandidates = stories.data.filter(s => s.type === 'docs' || String(s.id || '').endsWith('--docs'));
  const docEntries = [...new Map(docCandidates.map(s => [s.id, s])).values()];

  let snapshots = storyEntries.reduce((all, story) => {
    if (shouldSkipStory(story.name, story, config)) {
      log.debug(`Skipping story: ${story.name}`);
      return all;
    }

    let { additionalSnapshots = [], ...options } =
      getSnapshotConfig(story, conf, invalid);

    return all.concat(
      options,
      processAdditionalSnapshots(additionalSnapshots, options, story.name, (snap) => shouldSkipStory(story.name, snap))
    );
  }, []);

  const docSnapshots = mapDocSnapshots(docEntries, config, conf, invalid, log);
  snapshots = snapshots.concat(docSnapshots);

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
  return previousStory && (previousStory.type === 'docs' || hasContaminatingState(previousStory));
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

    const storybookConfig = (percy?.config && percy.config.storybook) || {};
    const { docCaptureFlag, autodocCaptureFlag } = getDocCaptureFlagsWithRules(storybookConfig);

    let [environmentInfo, stories] = yield* yieldAll([
      withPage(percy, aboutUrl, p => p.eval(evalStorybookEnvironmentInfo), undefined, { from: 'about url' }),
      withPage(
        percy,
        previewUrl,
        p => p.eval(
          evalStorybookStorySnapshots,
          {
            docCapture: docCaptureFlag,
            autodocCapture: autodocCaptureFlag
          }
        ),
        undefined,
        { from: 'preview url' }
      )
    ]);

    // map stories to snapshot options
    let snapshots = mapStorybookSnapshots(stories, {
      config: storybookConfig,
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
