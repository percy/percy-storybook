import { logger, PercyConfig } from '@percy/cli-command';
import { buildArgsParam } from '@storybook/router/utils.js';
import evaluatePercyStorybookData from './eval.js';
import qs from 'qs';

// Returns true or false if the provided story should be skipped by matching against include and
// exclude filter options. If any global filters are provided, they will override story filters.
function shouldSkipStory(story, config) {
  let { skip, include, exclude } = story;

  let matches = regexp => {
    /* istanbul ignore else: sanity check */
    if (typeof regexp === 'string') {
      let [, parsed, flags] = /^\/(.+)\/(\w+)?$/.exec(regexp) || [];
      regexp = new RegExp(parsed ?? regexp, flags);
    }

    return regexp?.test?.(story.name);
  };

  // if a global filter is present, override story filters
  if (config?.include || config?.exclude) {
    include = [].concat(config.include).filter(Boolean);
    exclude = [].concat(config.exclude).filter(Boolean);
  }

  // if included, don't skip; if excluded always exclude
  skip = include?.length ? !include.some(matches) : skip;
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

// Prunes non-snapshot options and adds a URL generated from story args and query params.
function toStorybookSnapshot({
  id, args, queryParams,
  skip, include, exclude,
  baseUrl, ...snapshot
}) {
  let params = { ...queryParams, id };
  if (args) params.args = buildArgsParam({}, args);
  let storyPreview = `iframe.html?${qs.stringify(params)}`;
  snapshot.url = new URL(storyPreview, baseUrl).href;
  return snapshot;
}

// Reduces Storybook story options to snapshot options, including variations in story URLs due to
// story args and other query params.
async function mapStorybookSnapshots(stories, config) {
  let log = logger('storybook:config');
  let validations = new Set();

  let snapshots = stories.reduce((all, story) => {
    if (shouldSkipStory(story, config)) {
      log.debug(`Skipping story: ${story.name}`);
      return all;
    }

    let { additionalSnapshots = [], ...options } =
      getSnapshotConfig(story, config, validations);

    return all.concat(
      toStorybookSnapshot(options),
      additionalSnapshots.reduce((add, snap) => {
        let { prefix = '', suffix = '', ...opts } = snap;
        let name = `${prefix}${story.name}${suffix}`;
        opts = PercyConfig.merge([options, { name }, opts]);

        if (shouldSkipStory(opts, config)) {
          log.debug(`Skipping story: ${opts.name}`);
          return add;
        }

        return add.concat(toStorybookSnapshot(opts));
      }, []));
  }, []);

  if (validations.size) {
    log.warn('Invalid Storybook parameters:');
    for (let msg of validations) log.warn(msg);
  }

  return snapshots;
}

// Collects Storybook snapshots, sets environment info, and patches client to optionally deal with
// JavaScript enabled Storybook stories.
export async function getStorybookSnapshots(percy, url) {
  let data = await evaluatePercyStorybookData(percy, url);
  let { environmentInfo, previewResource, stories } = data;
  percy.setConfig({ environmentInfo });

  // patch client to override root resources with the raw preview when JS is enabled
  percy.client.sendSnapshot = (buildId, options) => {
    if (options.enableJavaScript) {
      let root = options.resources.find(r => r.root);
      Object.assign(root, previewResource, { url: root.url });
    }

    // super.sendSnapshot(buildId, options)
    let { sendSnapshot } = percy.client.constructor.prototype;
    return sendSnapshot.call(percy.client, buildId, options);
  };

  // map stories and global config into snapshots
  return mapStorybookSnapshots(stories, {
    ...percy.config.storybook,
    baseUrl: url
  });
}

export default getStorybookSnapshots;
