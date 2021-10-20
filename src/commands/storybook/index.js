import { existsSync } from 'fs';
import logger from '@percy/logger';
import Command from '../../command';

export class Storybook extends Command {
  static description = 'Snapshot static or hosted Storybook stories';

  static args = [{
    name: 'url_or_build_dir',
    description: 'storybook url or build output directory',
    required: true
  }];

  static flags = Command.flags;

  static examples = [
    '$ percy storybook ./build',
    '$ percy storybook http://localhost:9000/'
  ];

  log = logger('cli:storybook');

  // Serves a static directory and resolves when listening.
  async startStorybook() {
    let done = async url => {
      let logTimeout = setTimeout(this.log.warn, 3000, (
        'Waiting on a response from Storybook...'));
      await this.setStorybookUrl(url);
      clearTimeout(logTimeout);
    };

    let dir = this.args.url_or_build_dir;
    if (/^https?:\/\//.test(dir)) return done(dir);
    if (!existsSync(dir)) return this.error(`Not found: ${dir}`);
    this.log.debug(`Serving Storybook build: ${dir}`);

    let http = require('http');
    let serve = require('serve-handler');

    return new Promise((resolve, reject) => {
      let server = http.createServer((req, res) => {
        serve(req, res, { public: dir, cleanUrls: false });
      }).on('error', reject).listen(() => {
        done(`http://localhost:${server.address().port}`)
          .then(() => resolve(server), reject);
      });
    });
  }
}
