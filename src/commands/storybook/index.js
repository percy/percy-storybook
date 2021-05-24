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

  // Called on error, interupt, or after running
  async finally() {
    await super.finally();
    this.server?.close();
  }

  // Serves a static directory and resolves when listening.
  async storybook() {
    let urlOrDir = this.args.url_or_build_dir;
    if (/^https?:\/\//.test(urlOrDir)) return urlOrDir;

    if (!existsSync(urlOrDir)) {
      return this.error(`Not found: ${urlOrDir}`);
    }

    this.log.debug(`Serving Storybook build: ${urlOrDir}`);

    let http = require('http');
    let serve = require('serve-handler');

    return new Promise(resolve => {
      this.server = http.createServer((req, res) => {
        serve(req, res, { public: urlOrDir, cleanUrls: false });
      }).listen(() => {
        let { port } = this.server.address();
        resolve(`http://localhost:${port}`);
      });
    });
  }
}
