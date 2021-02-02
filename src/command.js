import Command, { flags } from '@percy/cli-command';
import Percy from '@percy/core';
import qs from 'qs';

import pkg from '../package.json';

export default class StorybookCommand extends Command {
  static flags = {
    ...flags.logging,
    ...flags.discovery,
    ...flags.config,

    exclude: flags.boolean({
      char: 'e',
      description: 'pattern matching story names to exclude from snapshots',
      multiple: true
    }),
    include: flags.boolean({
      char: 'i',
      description: 'pattern matching story names to include in snapshots',
      multiple: true
    }),
    'dry-run': flags.boolean({
      char: 'd',
      description: 'prints a list of stories to snapshot without snapshotting'
    })
  };

  async run() {
    if (!this.isPercyEnabled()) {
      this.log.info('Percy is disabled. Skipping snapshots');
      return;
    }

    this.excludes = this.flags.exclude.map(e => new RegExp(e));
    this.includes = this.flags.include.map(i => new RegExp(i));

    this.percy = new Percy({
      ...this.percyrc(),
      clientInfo: `${pkg.name}/${pkg.version}`,
      server: false
    });

    let url = await this.storybook();
    let pages = await this.getPages(url);

    if (!pages.length) {
      return this.error('No snapshots found');
    }

    if (this.flags['dry-run']) {
      this.log.info(`Found ${pages.length} snapshots:\n${
        pages.map(({ name, snapshots = [] }) => (
          (name ? [{ name }].concat(snapshots) : snapshots)
            .map(({ name }) => name).join('\n')
        )).join('\n')
      }`);
    }

    await this.percy.start();
    await Promise.all(pages.map(page => (
      this.percy.capture(page)
    )));
  }

  // Called on error, interupt, or after running
  async finally() {
    await this.percy.stop();
    await this.percy.discoverer.close();
  }

  // Resolves to an array of pages to snapshot
  async getPages(url) {
    let iframeUrl = `${url}iframe.html`;
    let stories = await this.getStories(iframeUrl);

    return stories.reduce((acc, story) => {
      let { skip, variants = [], ...options } = story.parameters.percy;
      let name = `${story.kind}: ${story.name}`;
      let url = `${iframeUrl}?id=${story.id}`;

      if (skip || this.skipStory(name)) return acc;

      return acc.concat({ name, url, ...options }, (
        variants.map(({ prefix = '', suffix = '', params, ...opts }) => ({
          name: `${prefix}${name}${suffix}`,
          url: `${url}&${qs.stringify(params)}`,
          ...options,
          ...opts
        }))
      ));
    }, []);
  }

  // Resolves to an array of Storybook stories
  async getStories(url) {
    let meta = { storybook: { url } };
    let page;

    try {
      this.log.debug(`Get stories: ${url}`, meta);

      await this.percy.discoverer.launch();
      page = await this.percy.discoverer.page({ meta });
      // await retry(() => page.goto(url));
      await page.goto(url);

      return await page.eval(() => {
        let storybook = window.__STORYBOOK_CLIENT_API__;

        if (!storybook) {
          throw new Error(
            'Storybook object not found on the window. ' +
              'Open Storybook and check the console for errors.'
          );
        }

        return storybook.raw().map(story => ({
          id: story.id,
          name: story.name,
          kind: story.kind,
          parameters: {
            percy: story.parameters?.percy || {}
          }
        }));
      });
    } finally {
      await page?.close();
    }
  }

  // Returns true or false if a story should be skipped or not
  skipStory(name) {
    return this.excludes.some(e => e.test(name)) ||
      (this.includes.length && !this.includes.some(i => i.test(name)));
  }
}
