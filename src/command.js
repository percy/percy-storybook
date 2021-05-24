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
      description: 'prints a list of stories to snapshot without snapshotting'
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
    if (!dry) await this.start();

    this.log.info(`Found ${l} snapshot${l === 1 ? '' : 's'}`);

    await Promise.all(pages.map(page => {
      if (!dry) return this.snapshot(page);
      this.log.info(`Snapshot found: ${page.name}`);
      this.log.debug(`-> url: ${page.url}`);
      return Promise.resolve();
    }));
  }

  // Called to start Percy
  async start() {
    // patch client to override root resources when JS is enabled
    this.percy.client.sendSnapshot = options => {
      if (options.enableJavaScript && this.preview) {
        Object.assign(options.resources.find(r => r.root), this.preview);
      }

      let { sendSnapshot } = this.percy.client.constructor.prototype;
      return sendSnapshot.call(this.percy.client, options);
    };

    await this.percy.start();
  }

  // Called to snapshot a page
  async snapshot(page) {
    await this.percy.capture(page);
  }

  // Called on error, interupt, or after running
  async finally() {
    await this.percy?.stop();
    await this.percy?.discoverer.close();
  }

  // Resolves to an array of story pages to snapshot
  async getStoryPages(url) {
    let previewUrl = url.replace(/\/?$/, '/iframe.html');
    let stories = await this.getStories(previewUrl);

    let { include, exclude } = this.percy.config.storybook || {};
    include = include?.map(i => new RegExp(i));
    exclude = exclude?.map(e => new RegExp(e));

    let storyPage = (id, name, { skip, args, queryParams, ...options }) => {
      if (include?.length ? !include.some(i => i.test(name)) : skip) return;
      if (exclude?.some(e => e.test(name))) return;

      (queryParams ||= {}).id = id;
      if (args) queryParams.args = buildArgsParam({}, args);
      let url = `${previewUrl}?${qs.stringify(queryParams)}`;

      return { ...options, name, url };
    };

    return stories.reduce((all, { id, snapshots = [], ...options }) => all.concat(
      storyPage(id, options.name, options),
      snapshots.map(({ name, prefix, suffix, ...opts }) => {
        name ||= `${prefix || ''}${options.name}${suffix || ''}`;
        return storyPage(id, name, merge({}, options, opts));
      })
    ), []).filter(Boolean);
  }

  // Resolves to an array of Storybook stories
  async getStories(previewUrl) {
    let meta = { storybook: { url: previewUrl } };
    let page;

    try {
      this.log.debug(`Get stories: ${previewUrl}`, meta);

      // ensure the url is reachable while saving the response for when js is enabled
      let logTimeout = setTimeout(this.log.warn, 3000, 'Waiting on a response from Storybook...');
      let previewDOM = await request(previewUrl, { retries: 30, interval: 1000 });
      this.preview = { content: previewDOM, sha: sha256hash(previewDOM) };
      clearTimeout(logTimeout);

      // borrow a discoverer page to discover stories
      await this.percy.discoverer.launch();
      page = await this.percy.discoverer.page({ meta });
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
