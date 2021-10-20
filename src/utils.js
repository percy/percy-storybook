import logger from '@percy/logger';
import PercyConfig from '@percy/config';
import { merge } from '@percy/config/dist/utils';
import { buildArgsParam } from '@storybook/router/utils';
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

  for (let e of (PercyConfig.validate(options, '/storybook') || [])) {
    validations.add(`- percy.${e.path}: ${e.message}`);
  }

  return merge([config, options, { id }], (path, prev, next) => {
    // normalize, but do not merge include or exclude options
    if (path.length === 1 && ['include', 'exclude'].includes(path[0])) {
      return [path, [].concat(next).filter(Boolean)];
    }
  });
}

// Prunes non-snapshot options and adds a URL generated from story args and query params.
function toStorySnapshot(story, url) {
  let {
    id, args, queryParams,
    skip, include, exclude,
    ...snapshot
  } = story;

  let params = { ...queryParams, id };
  if (args) params.args = buildArgsParam({}, args);
  let storyPreview = `iframe.html?${qs.stringify(params)}`;
  snapshot.url = new URL(storyPreview, url).href;

  return snapshot;
}

// Reduces Storybook story options to snapshot options, including variations in story URLs due to
// story args and other query params.
export async function mapStorySnapshots(stories, { url, config }) {
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
      toStorySnapshot(options, url),
      additionalSnapshots.reduce((add, snap) => {
        let { prefix = '', suffix = '', ...opts } = snap;
        let name = `${prefix}${story.name}${suffix}`;
        opts = merge([options, { name }, opts]);

        if (shouldSkipStory(opts, config)) {
          log.debug(`Skipping story: ${opts.name}`);
          return add;
        }

        return add.concat(toStorySnapshot(opts, url));
      }, []));
  }, []);

  if (validations.size) {
    log.warn('Invalid Storybook parameters:');
    for (let msg of validations) log.warn(msg);
  }

  return snapshots;
}

// Transforms authorization credentials into a basic auth header and returns all config request
// headers with the additional authorization header if not already set.
export function getAuthHeaders(config) {
  let headers = { ...config.requestHeaders };
  let auth = config.authorization;

  if (auth && !(headers.authorization || headers.Authorization)) {
    let creds = auth.username + (auth.password ? `:${auth.password}` : '');
    headers.Authorization = `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  return headers;
}
