import { logger, PercyConfig, applyIntelliStory, writeIntelliStoryTrace, IntelliStoryBailError } from '@percy/cli-command';
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
  hasRules,
  getDocCaptureFlagsWithRules,
  generateDocRuleOptions,
  isDocAutodoc,
  viewModeFor,
  resolveViewportSize,
  viewportKey,
  fetchStorybookProjectVersion,
  fullVersionFromInstalledPackage
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

function sameList(a, b) {
  return JSON.stringify([].concat(a ?? [])) === JSON.stringify([].concat(b ?? []));
}

export function isTestEntry(story, meta) {
  return meta?.subtype ? meta.subtype === 'test' : [].concat(story.tags ?? []).includes('test-fn');
}

// Returns true or false if the provided story should be skipped. Order: `skip`, Storybook test
// entries, tag exclude, tag include, then name filters. A global name filter applies first and a
// story's own include/exclude still applies after it; filters inherited from the preview are
// project defaults, so a global filter replaces them.
export function shouldSkipStory(name, options, config, { meta, project } = {}) {
  // parameters.percy.skip is an opt-out switch, not a filter — honor it unconditionally,
  // even when --include/--exclude is present. See issue #1286.
  if (options.skip) return true;

  if (meta && !config?.captureTestEntries && isTestEntry(options, meta)) return true;

  let tags = [].concat(options.tags ?? []);
  let tagExclude = [].concat(config?.tags?.exclude ?? []);
  let tagInclude = [].concat(config?.tags?.include ?? []);
  if (tagExclude.some(t => tags.includes(t))) return true;
  if (tagInclude.length && !tagInclude.some(t => tags.includes(t))) return true;

  let matches = regexp => {
    /* istanbul ignore else: sanity check */
    if (typeof regexp === 'string') {
      let [, parsed, flags] = /^\/(.+)\/(\w+)?$/.exec(regexp) || [];
      regexp = new RegExp(parsed ?? regexp, flags);
    }

    return regexp?.test?.(name);
  };

  let filtered = filter => {
    let include = [].concat(filter?.include).filter(Boolean);
    let exclude = [].concat(filter?.exclude).filter(Boolean);
    // if included, don't skip; if excluded always exclude
    return (include.length ? !include.some(matches) : false) || exclude.some(matches);
  };

  if (!(config?.include || config?.exclude)) return filtered(options);
  if (filtered(config)) return true;

  let own = {
    include: sameList(options.include, project?.include) ? undefined : options.include,
    exclude: sameList(options.exclude, project?.exclude) ? undefined : options.exclude
  };
  return filtered(own);
}

// Returns snapshot config options for a Storybook story merged with global Storybook
// options. Validation error messages will be added to the provided validations set.
function getSnapshotConfig(story, config, invalid) {
  let { id, importPath, ...options } = PercyConfig.migrate(story, '/storybook');

  let errors = PercyConfig.validate(options, '/storybook');
  for (let e of (errors || [])) invalid.set(e.path, e.message);

  return PercyConfig.merge([config, options, { id, importPath }], (path, prev, next) => {
    // normalize, but do not merge include or exclude options
    if (path.length === 1 && ['include', 'exclude'].includes(path[0])) {
      return [path, [].concat(next).filter(Boolean)];
    }
    // config and story additional snapshots are separate snapshots; merging them by index
    // fused the two definitions into one
    if (path.length === 1 && path[0] === 'additionalSnapshots') {
      return [path, [].concat(prev ?? [], next ?? [])];
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
    )) || ((key === 'additionalSnapshots' || key === 'modes') && (
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

// Priority: rule-level capture > .percy.yml > env var
function mapDocSnapshots(docs, config = {}, conf, invalid, log, globalDocSettings) {
  const { captureDocs, captureAutodocs } = globalDocSettings;
  const mdxRules = config.docs?.mdx?.rules;
  const autodocsRules = config.docs?.autodocs?.rules;
  const hasMdxRules = hasRules(mdxRules);
  const hasAutodocsRules = hasRules(autodocsRules);

  const getDocTypeConfig = (isAutodoc) => isAutodoc
    ? { captureAll: captureAutodocs, rules: autodocsRules, hasTypeRules: hasAutodocsRules }
    : { captureAll: captureDocs, rules: mdxRules, hasTypeRules: hasMdxRules };

  return docs.reduce((all, doc) => {
    const isAutodoc = isDocAutodoc(doc);
    const { captureAll, rules, hasTypeRules } = getDocTypeConfig(isAutodoc);

    const ruleOptions = generateDocRuleOptions(doc, rules, hasTypeRules, captureAll, log);
    if (!ruleOptions) return all;

    const { id, name, type, ...docPercy } = doc;
    const { match, capture, ...storyParams } = ruleOptions || {};

    const docStoryConfig = {
      id,
      name,
      type: type || 'docs',
      ...docPercy,
      ...storyParams
    };

    let { additionalSnapshots = [], ...options } =
      getSnapshotConfig(docStoryConfig, conf, invalid);

    return all.concat(
      options,
      processAdditionalSnapshots(additionalSnapshots, options, doc.name)
    );
  }, []);
}

function processAdditionalSnapshots(additionalSnapshots, baseOptions, storyName, skipCallback = null, transform = null) {
  return (additionalSnapshots || []).reduce((add, { prefix = '', suffix = '', ...snap }) => {
    const snapshot = PercyConfig.merge([baseOptions, {
      name: `${prefix}${storyName}${suffix}`
    }, snap]);

    if (skipCallback?.(snap)) return add;
    transform?.(snapshot, snap);
    return add.concat(snapshot);
  }, []);
}

// Storybook-level options that select or expand stories; never forwarded as snapshot options
const SELECTION_OPTIONS = ['modes', 'modesReplaceBase', 'storyViewport', 'tags', 'captureTestEntries'];

function omit(object, keys) {
  return Object.fromEntries(Object.entries(object).filter(([k]) => !keys.includes(k)));
}

// Sets the snapshot width (and minHeight, unless set) from a Storybook viewport global
function applyViewportWidth(snapshot, value, meta, log) {
  let size = resolveViewportSize(value, meta?.viewport?.options, log);
  if (!size) return false;
  snapshot.widths = [size.width];
  if (size.height && snapshot.minHeight == null) snapshot.minHeight = size.height;
  return true;
}

function hasPinnedViewport(meta) {
  return meta?.pinnedGlobals ? 'viewport' in meta.pinnedGlobals : false;
}

// A mode whose globals the story already pins renders the same as the base snapshot
function duplicatesPinnedGlobals(mode, meta) {
  let keys = Object.keys(mode.globals ?? {});
  return !!meta?.pinnedGlobals && keys.length > 0 && !mode.args && !mode.queryParams &&
    keys.every(k => JSON.stringify(mode.globals[k]) === JSON.stringify(meta.pinnedGlobals[k]));
}

function processModes(modes, baseOptions, storyName, meta, keepBase, onViewport, log) {
  return [].concat(modes ?? []).reduce((all, { name, prefix, suffix, ...mode }) => {
    if (keepBase && duplicatesPinnedGlobals(mode, meta)) {
      log.debug(`Skipping mode "${name}" for ${storyName}: the story already pins its globals`);
      return all;
    }

    let snapshot = PercyConfig.merge([baseOptions, {
      name: (prefix || suffix) ? `${prefix ?? ''}${storyName}${suffix ?? ''}` : `${storyName} [${name}]`
    }, mode]);

    if (viewportKey(mode.globals?.viewport) && !hasPinnedViewport(meta) &&
        applyViewportWidth(snapshot, mode.globals.viewport, meta, log)) onViewport();
    return all.concat(snapshot);
  }, []);
}

// Map and reduce collected Storybook stories into an array of snapshot options
/**
 * Build the preview URL for a story.
 *
 * `queryParams` is story-author input. Its VALUES are already percent-encoded
 * when they are collected from the story in the browser
 * (evalStorybookStorySnapshots → serialize('queryParams') in utils.js), so they
 * are appended as-is here — encoding again would double-encode (`%20` → `%2520`).
 * Its KEYS were never encoded, which let `&`, `=` or `#` in a key inject extra
 * parameters into the URL (F-021); they are encoded here.
 */
export function buildStoryUrl(previewUrl, story) {
  let url = `${previewUrl}?id=${story.id}`;
  if (story.args) url += `&args=${buildStorybookArgsParam(story.args)}`;
  if (story.globals) url += `&globals=${buildStorybookArgsParam(story.globals)}`;
  for (let [k, v] of Object.entries(story.queryParams ?? {})) {
    url += `&${encodeURIComponent(k)}=${v ?? ''}`;
  }
  if (!story.queryParams?.viewMode) {
    url += `&viewMode=${viewModeFor(story)}`;
  }
  return url;
}

export function mapStorybookSnapshots(stories, { previewUrl, flags, config, globalDocSettings }) {
  let log = logger('storybook:config');
  let invalid = new Map(stories.invalid);
  let conf = encodeStorybookConfig(config, invalid);
  let project = stories.project ?? {};
  let metaFor = new WeakMap();
  let data = stories.data.map(({ storybookMeta, ...story }) => {
    metaFor.set(story, storybookMeta);
    return story;
  });

  // Extract snapshot options only, exclude doc config metadata
  const { captureDocs, captureAutodocs, docs, ...confSnapshot } = conf;
  const confOptions = omit(confSnapshot, SELECTION_OPTIONS);

  // Separate stories from docs: extract() may return docs without type='docs', so check id suffix
  const storyEntries = data.filter(s => s.type !== 'docs' && !String(s.id || '').endsWith('--docs'));
  const docEntries = data.filter(s => s.type === 'docs' || String(s.id || '').endsWith('--docs'));

  let counts = { stories: 0, modes: 0, additional: 0 };
  let viewportStories = new Set();

  let snapshots = storyEntries.reduce((all, story) => {
    let meta = metaFor.get(story);

    if (shouldSkipStory(story.name, story, config, { meta, project })) {
      log.debug(`Skipping story: ${story.name}`);
      return all;
    }

    // read from the raw story: merging drops an empty `modes: []`, which disables modes
    let { modes, modesReplaceBase, storyViewport } = story;
    let { additionalSnapshots = [], ...options } =
      omit(getSnapshotConfig(story, confOptions, invalid), SELECTION_OPTIONS.filter(k => k !== 'tags'));

    // precedence: the story's own percy.widths > its Storybook viewport > project widths
    let useViewport = (storyViewport ?? config?.storyViewport) !== false && !meta?.viewport?.disabled;
    let ownWidths = !!story.widths?.length && !sameList(story.widths, project.widths);
    let onViewport = () => viewportStories.add(story.id);

    if (useViewport && !ownWidths) {
      let vp = meta?.viewport;
      let value = [vp?.global, vp?.defaultViewport, project.viewport].find(v => viewportKey(v));
      if (value && value === vp?.defaultViewport && !vp?.global) {
        log.debug(`${story.name}: using the legacy viewport.defaultViewport parameter`);
      }
      if (value && applyViewportWidth(options, value, meta, log)) onViewport();
    }

    let keepBase = !(modesReplaceBase ?? conf.modesReplaceBase);
    let modeSnapshots = processModes(
      modes !== undefined ? modes : conf.modes,
      options, story.name, meta, keepBase, useViewport ? onViewport : () => {}, log
    );
    let additional = processAdditionalSnapshots(
      additionalSnapshots, options, story.name,
      (snap) => shouldSkipStory(story.name, snap),
      (snapshot, snap) => {
        if (useViewport && !snap.widths && viewportKey(snap.globals?.viewport) && !hasPinnedViewport(meta) &&
            applyViewportWidth(snapshot, snap.globals.viewport, meta, log)) onViewport();
      }
    );

    let base = (keepBase || !modeSnapshots.length) ? [options] : [];
    counts.stories += 1;
    counts.modes += modeSnapshots.length;
    counts.additional += additional.length;
    return all.concat(base, modeSnapshots, additional);
  }, []);

  if (counts.modes || counts.additional) {
    log.info(`Found ${counts.stories} ${counts.stories === 1 ? 'story' : 'stories'} with ` +
      `${counts.modes} mode snapshots and ${counts.additional} additional snapshots (${snapshots.length} story snapshots)`);
  }

  if (viewportStories.size) {
    log.info(`${viewportStories.size} ${viewportStories.size === 1 ? 'story' : 'stories'} captured at ` +
      'their Storybook viewport width (set `storybook.storyViewport: false` to disable)');
  }

  const docSnapshots = mapDocSnapshots(docEntries, config, confOptions, invalid, log, globalDocSettings);
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
    story = omit(story, SELECTION_OPTIONS.filter(k => k !== 'tags'));
    return Object.assign(story, { url: buildStoryUrl(previewUrl, story) });
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

// How long to wait for Storybook's render event before giving up on a story.
// The wait is evaluated in the page and awaited over CDP, which has no timeout
// of its own, so this deadline is the only thing standing between a dropped
// render event and a CLI that hangs until CI kills it (PER-10287).
export const DEFAULT_STORY_RENDER_TIMEOUT = 30000;

function storyRenderTimeout() {
  let configured = parseInt(process.env.PERCY_STORY_RENDER_TIMEOUT, 10);
  return configured > 0 ? configured : DEFAULT_STORY_RENDER_TIMEOUT;
}

// Process a single story and capture its DOM
export async function* processStory(page, story, previewResource, percy, flags, log) {
  let { id, args, globals, queryParams, importPath, ...options } = story;

  const enableJavaScript = options.enableJavaScript ?? percy.config.snapshot.enableJavaScript;
  if (flags.dryRun || enableJavaScript) {
    log.debug(`Loading story via previewResource: ${options.name}`);
    // when dry-running or when javascript is enabled, use the preview dom
    options.domSnapshot = previewResource.content;
  } else {
    log.debug(`Loading story: ${options.name}`);
    // when not dry-running and javascript is not enabled, capture the story dom
    let renderResult = yield page.eval(evalSetCurrentStory, {
      id, args, globals, queryParams, renderTimeout: storyRenderTimeout()
    });
    // A play function threw but we still snapshot — warn so the user understands the
    // snapshot may not reflect the interaction (e.g. a click that never landed).
    if (renderResult?.playError) {
      log.warn(`${options.name}: the story's play function reported an error, so this snapshot may ` +
        `not reflect the interaction. ${renderResult.playError}`);
    }
    options.domSnapshot = await captureDOM(page, options, percy, log, story);
  }

  // validate without logging to prune all other options
  PercyConfig.validate(options, '/snapshot/dom');

  return options;
}

export async function applyIntelliStoryFilter(
  percy, snapshots, intelliStoryConfig, buildDir, log, apply = applyIntelliStory
) {
  if (!intelliStoryConfig?.enabled) return snapshots;

  try {
    return await apply(percy, snapshots, intelliStoryConfig, buildDir);
  } catch (e) {
    if (e instanceof IntelliStoryBailError) {
      log.info(e.message);
    } else {
      log.warn(`IntelliStory failed (${e.message}); running full snapshot set`);
    }
    if (intelliStoryConfig.failBuildOnFailure) throw e;
    return snapshots;
  }
}

// Starts the percy instance and collects Storybook snapshots, calling the callback when done
// Viewport keys referenced by Percy config modes and additional snapshots, so the browser
// returns their sizes from each story's viewport options
function configViewportKeys(config) {
  return [].concat(config?.modes ?? [], config?.additionalSnapshots ?? [])
    .map(s => viewportKey(s?.globals?.viewport)).filter(Boolean);
}

// Version order: project.json, the about page, then (for `storybook:start` only) the installed
// package; the about page is only loaded when project.json has no version.
async function* resolveStorybookEnvironmentInfo(percy, baseUrl, localStorybook) {
  let version = await fetchStorybookProjectVersion(percy, baseUrl);
  if (version) return `storybook/${version}`;

  let aboutUrl = new URL('index.html?path=/settings/about', baseUrl).href;
  let info = yield* withPage(percy, aboutUrl, p => p.eval(evalStorybookEnvironmentInfo), undefined, { from: 'about url' });
  if (info === 'storybook/unknown' && localStorybook) {
    let installed = fullVersionFromInstalledPackage();
    if (installed) return `storybook/${installed}`;
  }
  return info;
}

export async function* takeStorybookSnapshots(percy, callback, { baseUrl, buildDir, flags, localStorybook }) {
  try {
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

    const storybookConfig = percy.config.storybook;
    const intelliStoryEnabled = !!storybookConfig?.intelliStory?.enabled;

    // IntelliStory selects snapshots server-side against the real Percy build,
    // so the build must exist before any snapshots are posted. Storybook delays
    // uploads (the build is otherwise created lazily on the first flush), so
    // create it up front here. Skipped on dry runs, where no build is created.
    if (intelliStoryEnabled && !percy.dryRun) {
      yield* percy.yield.startBuild();
    }

    const { isDocDiscoveryEnabled, isAutodocDiscoveryEnabled, globalDocSettings } = getDocCaptureFlagsWithRules(storybookConfig);

    let [environmentInfo, stories] = yield* yieldAll([
      resolveStorybookEnvironmentInfo(percy, baseUrl, localStorybook),
      withPage(
        percy,
        previewUrl,
        p => p.eval(
          evalStorybookStorySnapshots,
          {
            docCapture: isDocDiscoveryEnabled,
            autodocCapture: isAutodocDiscoveryEnabled,
            intelliStory: !!storybookConfig?.intelliStory?.enabled,
            viewportKeys: configViewportKeys(storybookConfig)
          }
        ),
        undefined,
        { from: 'preview url' }
      )
    ]);

    if (stories?.diagnostics) {
      log.debug(`Story extraction diagnostics: ${JSON.stringify(stories.diagnostics)}`);
    }

    // map stories to snapshot options
    let snapshots = mapStorybookSnapshots(stories, {
      config: storybookConfig,
      previewUrl,
      flags,
      globalDocSettings
    });

    // set storybook environment info
    percy.client.addEnvironmentInfo(environmentInfo);

    snapshots = yield applyIntelliStoryFilter(percy, snapshots, storybookConfig?.intelliStory, buildDir, log);

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

      // One page serves many stories, so this has to be a live reference: the
      // story that fails is whichever one the inner loop is on, not the one the
      // page was opened with. Reporting the batch's first story here sent a
      // previous investigation looking at the wrong component (PER-10287).
      let pageArgs = { snapshotName: snapshots[0].name };

      try {
        // Use a single page for as many stories as possible until a context error occurs
        // Only id and viewMode are needed here — args/globals are applied via evalSetCurrentStory channel events
        yield* withPage(percy, `${previewUrl}?id=${snapshots[0].id}&viewMode=${viewModeFor(snapshots[0])}`, async function*(page) {
          // Process snapshots one by one with the current page
          while (snapshots.length) {
            try {
              let currentStory = snapshots[0];
              pageArgs.snapshotName = currentStory.name;

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
        }, undefined, pageArgs);
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

    // Will stop once snapshots are done processing (this finalizes the build)
    yield* percy.yield.stop();

    if (intelliStoryEnabled && !percy.dryRun && percy.build?.id) {
      // Summarize the server-side selection outcome, derived from each snapshot
      // create response (skipped-via-smartsnap) tallied in @percy/client.
      const stats = percy.client.intelliStoryStats;
      if (stats) {
        const total = stats.kept + stats.skipped;
        log.info(`IntelliStory: filtered out ${stats.skipped} of ${total} snapshots with no detected changes; the remaining ${stats.kept} were processed.`);
      }

      // After finalize, the IntelliStory graph job's data is available from job
      // status, so fetch it once more and write the trace. Never let a trace
      // failure fail an otherwise-successful build.
      try {
        yield writeIntelliStoryTrace(percy, storybookConfig.intelliStory, log);
      } catch (e) {
        log.debug(`IntelliStory: failed to write trace after finalize: ${e.message}`);
      }
    }
  } catch (error) {
    // force stop and re-throw
    await percy.stop(true);
    throw error;
  } finally {
    await callback();
  }
}
