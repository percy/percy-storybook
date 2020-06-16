import Command, { flags } from '@percy/cli-command';
import Percy from '@percy/core';
import log from '@percy/logger';
import qs from 'qs';

import pkg from '../../package.json';

function retry(fn, timeout = 60000, t = Date.now()) {
  return new Promise((resolve, reject) => {
    fn().then(resolve).catch(error => {
      if (Date.now() - t >= timeout) reject(error);
      else setTimeout(() => retry(fn, t).then(resolve), 1000);
    });
  });
}

export class Storybook extends Command {
  static description = 'Snapshot Storybook stories';
  static strict = false;

  static flags = {
    ...flags.logging,
    ...flags.discovery,
    ...flags.config,

    // run start-storybook
    port: flags.integer({
      description: 'port to run Storybook',
      exclusive: ['url', 'output-dir'],
      default: 9000
    }),
    host: flags.string({
      description: 'host to run Storybook',
      exclusive: ['url', 'output-dir'],
      default: 'localhost'
    }),
    'static-dir': flags.string({
      description: 'directory where to load static files from',
      exclusive: ['url', 'output-dir']
    }),
    'config-dir': flags.string({
      description: 'directory where to load Storybook configs from',
      exclusive: ['url', 'output-dir']
    }),
    // skip running storybook
    url: flags.string({
      description: 'url of running Storybook',
      exclusive: ['output-dir']
    }),
    // serve build output
    'output-dir': flags.string({
      description: 'directory where to find Storybook build output',
      exclusive: ['url']
    }),
    // dry run
    'dry-run': flags.boolean({
      char: 'd',
      description: 'prints a list of stories to snapshot without snapshotting'
    })
  };

  static examples = [
    '$ percy storybook',
    '$ percy storybook --port 9000',
    '$ percy storybook --url localhost:9000',
    '$ percy storybook --output-dir ./build'
  ];

  async run() {
    if (!this.isPercyEnabled()) {
      log.info('Percy is disabled. Skipping snapshots');
      return;
    }

    this.percy = new Percy({
      ...this.percyrc(),
      clientInfo: `${pkg.name}/${pkg.version}`,
      server: false
    });

    let url = this.flags.url || (
      this.flags['output-dir']
        ? await this.serve(this.flags['output-dir'])
        : await this.startStorybook());
    let pages = await this.getStorybookPages(url);

    if (!pages.length) {
      return this.error('No snapshots found');
    }

    if (this.flags['dry-run']) {
      log.info(`Found ${pages.length} snapshots:`);

      return pages.forEach(({ name, snapshots = [] }) => {
        (name ? [{ name }].concat(snapshots) : snapshots)
          .forEach(({ name }) => console.log(name));
      });
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
    this.storybook?.kill();
    this.server?.close();
  }

  // Serves a static directory and resolves when listening.
  async serve(staticDir) {
    let express = require('express');
    let app = express();

    app.use(require('cors')());
    app.use('/', express.static(staticDir));

    return new Promise(resolve => {
      this.server = app.listen(() => {
        let { port } = this.server.address();
        resolve(`http://localhost:${port}/`);
      });
    });
  }

  // Starts Storybook in a child process and returns its url
  startStorybook() {
    let { host, port } = this.flags;
    let args = ['--ci', `--host=${host}`, `--port=${port}`];

    if (this.flags['static-dir']) {
      args.push(`--static-dir=${this.flags['static-dir']}`);
    }

    if (this.flags['config-dir']) {
      args.push(`--config-dir=${this.flags['config-dir']}`);
    }

    args = args.concat(this.parse(Storybook).argv),
    this.storybook = require('cross-spawn')(
      'start-storybook', args, { stdio: 'inherit' });

    let proto = args.includes('--https') ? 'https' : 'http';
    return `${proto}://${host}:${port}/`;
  }

  // Resolves to an array of pages to snapshot
  async getStorybookPages(storybookUrl) {
    let iframeUrl = `${storybookUrl}iframe.html`;
    let stories = await this.getStories(iframeUrl);

    return stories.reduce((acc, story) => {
      let { skip, variants = [] } = story.parameters.percy;
      if (skip) return acc;

      let name = `${story.kind}: ${story.name}`;
      let url = `${iframeUrl}?id=${story.id}`;

      return acc.concat({ name, url }, (
        variants.map(({ prefix = '', suffix = '', params }) => ({
          name: `${prefix}${name}${suffix}`,
          url: qs.stringify(params)
        }))
      ));
    }, []);
  }

  // Resolves to an array of Storybook stories
  async getStories(url) {
    let page;

    try {
      await this.percy.discoverer.launch();
      page = await this.percy.discoverer.page();
      await retry(() => page.goto(url));

      return await page.evaluate(() => {
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
            percy: (
              story.parameters &&
                story.parameters.percy
            ) || {}
          }
        }));
      });
    } finally {
      await page?.close();
    }
  }
}
