import Command, { flags } from '@percy/cli-command';
import request from '@percy/client/dist/request';
import { sha256hash } from '@percy/client/dist/utils';
import Percy from '@percy/core';
import { buildArgsParam } from '@storybook/router/utils';
import qs from 'qs';

import pkg from '../package.json';

// basic deep merge of nested objects
function merge(target, ...sources) {
  return sources.reduce((target, src) => {
    return Object.entries(src).reduce((t, [k, v]) => {
      if (v.toString() === '[object Object]') v = merge(t[k] || {}, v);
      return Object.assign(t, { [k]: v });
    }, target);
  }, target);
}

export default class StorybookCommand extends Command {
  static flags = {
    ...flags.logging,
    ...flags.discovery,
    ...flags.config,

    include: flags.string({
      char: 'i',
      description: 'pattern matching story names to include in snapshots',
      percyrc: 'storybook.include',
      multiple: true
    }),
    exclude: flags.string({
      char: 'e',
      description: 'pattern matching story names to exclude from snapshots',
      percyrc: 'storybook.exclude',
      multiple: true
    }),
    'dry-run': flags.boolean({
      char: 'd',
      description: 'logs snapshots without creating a build'
    })
  };

  async run() {
    if (!this.isPercyEnabled()) {
      return this.log.info('Percy is disabled. Skipping snapshots');
    }

    this.percy = new Percy({
      ...this.percyrc(),
      clientInfo: `${pkg.name}/${pkg.version}`,
      server: false
    });

    let url = await this.storybook();
    let pages = await this.getStoryPages(url);
    let l = pages.length;

    if (!l) return this.error('No snapshots found');

    let dry = this.flags['dry-run'];
    if (dry) this.log.info(`Found ${l} snapshot${l === 1 ? '' : 's'}`);
    else await this.start();

    for (let page of pages) {
      if (dry) {
        this.log.info(`Snapshot found: ${page.name}`);
        this.log.debug(`-> url: ${page.url}`);
      } else {
        this.percy.snapshot(page);
      }
    }
  }

  // Called to start Percy
  async start() {
    // patch client to override root resources when JS is enabled
    this.percy.client.sendSnapshot = (buildId, options) => {
      if (options.enableJavaScript && this.preview) {
        Object.assign(options.resources.find(r => r.root), this.preview);
      }

      let { sendSnapshot } = this.percy.client.constructor.prototype;
      return sendSnapshot.call(this.percy.client, buildId, options);
    };

    await this.percy.start();
  }

  // Called on error, interupt, or after running
  async finally(error) {
    await this.percy?.stop(!!error);
    await this.percy?.browser.close();
  }

  // Resolves to an array of story pages to snapshot
  async getStoryPages(url) {
    let previewUrl = new URL('/iframe.html', url);
    let stories = await this.getStories(previewUrl);

    let conf = this.percy.config.storybook || {};
    conf.include = conf.include?.map(i => new RegExp(i));
    conf.exclude = conf.exclude?.map(e => new RegExp(e));

    let storyPage = (id, name, options) => {
      let { skip, include, exclude, args, queryParams, ...opts } = options;

      // percy config overrides story parameters
      include = conf.include?.length ? conf.include : include;
      exclude = conf.exclude?.length ? conf.exclude : exclude;

      // if included, don't skip; if excluded always exclude
      if (include?.length ? !include.some(i => i.test(name)) : skip) return;
      if (exclude?.some(e => e.test(name))) return;

      // add query params to the url
      (queryParams ||= {}).id = id;
      if (args) queryParams.args = buildArgsParam({}, args);
      let url = `${previewUrl}?${qs.stringify(queryParams)}`;

      // remove options that might cause issues
      delete opts.domSnapshot;
      delete opts.execute;

      if (opts.snapshots) {
        this.log.deprecated('The `snapshots` option will be ' + (
          'removed in 4.0.0. Use `additionalSnapshots` instead.'));
        delete opts.snapshots;
      }

      return { ...opts, name, url };
    };

    return stories.reduce((all, params) => {
      let { id, additionalSnapshots = [], ...options } = params;

      // deprecation will log later
      if (options.snapshots) {
        additionalSnapshots = options.snapshots;
      }

      return all.concat(
        storyPage(id, params.name, options),
        additionalSnapshots.map(({ name, prefix, suffix, ...opts }) => {
          name ||= `${prefix || ''}${params.name}${suffix || ''}`;
          return storyPage(id, name, merge({}, options, opts));
        })
      );
    }, []).filter(Boolean);
  }

  // Resolves to an array of Storybook stories
  async getStories(previewUrl) {
    let meta = { storybook: { url: previewUrl } };
    let page;

    try {
      this.log.debug(`Get stories: ${previewUrl}`, meta);

      // ensure the url is reachable while saving the response for when js is enabled
      let logTimeout = setTimeout(this.log.warn, 3000, 'Waiting on a response from Storybook...');
      let previewDOM = await request(previewUrl, { retries: 30, interval: 1000, retryNotFound: true });
      this.preview = { content: previewDOM, sha: sha256hash(previewDOM) };
      clearTimeout(logTimeout);

      // borrow a browser page to discover stories
      await this.percy.browser.launch();
      page = await this.percy.browser.page({ meta });
      await page.goto(previewUrl);

      /* istanbul ignore next: no instrumenting injected code */
      return await page.eval((util, previewUrl) => {
        let storybook = window.__STORYBOOK_CLIENT_API__;

        if (!storybook) {
          throw new Error(
            'Storybook object not found on the window. ' +
            'Open Storybook and check the console for errors.'
          );
        }

        return storybook.raw().map(story => ({
          name: `${story.kind}: ${story.name}`,
          ...story.parameters?.percy,
          id: story.id
        }));
      });
    } catch (error) {
      // remove stack traces from any eval error
      if (typeof error === 'string') {
        throw new Error(error.replace(/^Error:\s(.*?)\n\s{4}at\s.*$/s, '$1'));
      } else {
        throw error;
      }
    } finally {
      await page?.close();
    }
  }
}
