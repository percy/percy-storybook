import Command, { flags } from '@percy/cli-command';
import request from '@percy/client/dist/request';
import { sha256hash } from '@percy/client/dist/utils';
import Percy from '@percy/core';

import pkg from '../package.json';
import { mapStorySnapshots, getAuthHeaders } from './utils';

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

    this.storybook = await this.startStorybook();

    let [version, snapshots] = await Promise.all([
      this.getStorybookVersion(),
      this.getStorybookSnapshots()
    ]);

    if (!snapshots.length) {
      return this.error('No snapshots found');
    }

    this.percy.client.addEnvironmentInfo(`storybook/${version}`);

    // patch client to override root resources when JS is enabled
    this.percy.client.sendSnapshot = (buildId, options) => {
      if (options.enableJavaScript && this.preview) {
        Object.assign(options.resources.find(r => r.root), this.preview);
      }

      let { sendSnapshot } = this.percy.client.constructor.prototype;
      return sendSnapshot.call(this.percy.client, buildId, options);
    };

    await this.percy.start();
    this.percy.snapshot(snapshots);
  }

  // Called on error, interupt, or after running
  async finally(error) {
    await this.percy?.stop(!!error);
    await this.percy?.browser.close();
    await this.storybook?.close();
  }

  // Set the url after ensuring it is reachable while saving the preview response
  async setStorybookUrl(url, log) {
    let previewUrl = new URL('iframe.html', url).href;
    let previewDOM = await request(previewUrl, {
      headers: getAuthHeaders(this.percy.config.discovery),
      retryNotFound: true,
      interval: 1000,
      retries: 30
    });

    this.url = url;
    this.preview = {
      content: previewDOM,
      sha: sha256hash(previewDOM)
    };
  }

  // Resolves to the discovered Storybook version
  async getStorybookVersion() {
    let aboutUrl = new URL('?path=/settings/about', this.url).href;
    this.log.debug(`Get Storybook version: ${aboutUrl}`);

    /* istanbul ignore next: no instrumenting injected code */
    return this._eval(aboutUrl, async ({ waitFor }, timeout) => {
      // Use an xpath selector to find the appropriate element containing the version number
      let getPath = path => document.evaluate(path, document, null, 9, null).singleNodeValue;
      let headerPath = "//header[starts-with(text(), 'Storybook ')]";

      await waitFor(() => getPath(headerPath), timeout)
        .catch(() => Promise.reject(new Error(
          'Failed to find a Storybook <header> element'
        )));

      return getPath(headerPath).innerText
        .match(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g, '')
        .join('');
    }).catch(error => {
      this.log.debug('Unable to retrieve Storybook version');
      this.log.debug(error);
      return 'unknown';
    }).then(v => {
      return v;
    });
  }

  // Resolves to an array of Storybook stories
  async getStorybookSnapshots() {
    let previewUrl = new URL('iframe.html', this.url).href;
    this.log.debug(`Get Storybook stories: ${previewUrl}`);

    /* istanbul ignore next: no instrumenting injected code */
    return this._eval(previewUrl, async ({ waitFor }, timeout) => {
      let serializeRegExp = r => r && [].concat(r).map(r => r.toString());

      await waitFor(() => !!window.__STORYBOOK_CLIENT_API__, timeout)
        .catch(() => Promise.reject(new Error(
          'Storybook object not found on the window. ' +
            'Open Storybook and check the console for errors.'
        )));

      return window.__STORYBOOK_CLIENT_API__.raw()
        .map(({ id, kind, name, parameters }) => ({
          name: `${kind}: ${name}`,
          ...parameters?.percy,
          include: serializeRegExp(parameters?.percy?.include),
          exclude: serializeRegExp(parameters?.percy?.exclude),
          id
        }));
    }).then(stories => {
      return mapStorySnapshots(stories, {
        config: this.percy.config.storybook,
        url: this.url
      });
    });
  }

  // Borrows a percy discovery browser page to navigate to a URL and evaluate a function, returning
  // the results and normalizing any thrown errors.
  async _eval(url, fn) {
    let page;

    try {
      // always ensure the browser is launched before borrowing a page
      await (this._launchingBrowser ||= this.percy.browser.launch());

      // provide discovery options that may impact how the page loads
      page = await this.percy.browser.page({
        networkIdleTimeout: this.percy.config.discovery.networkIdleTimeout,
        requestHeaders: getAuthHeaders(this.percy.config.discovery),
        userAgent: this.percy.config.discovery.userAgent
      });

      // navigate to the URL and evaluate the provided function
      await page.goto(url);
      return await page.eval(fn, 5000);
    } catch (error) {
      /* istanbul ignore next: purposefully not handling real errors */
      if (typeof error !== 'string') throw error;
      // make eval errors nicer by stripping the stack trace from the message
      throw new Error(error.replace(/^Error:\s(.*?)\n\s{4}at\s.*$/s, '$1'));
    } finally {
      // always clean up and close the page
      await page?.close();
    }
  }
}
