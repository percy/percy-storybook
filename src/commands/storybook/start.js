import { flags } from '@percy/cli-command';
import logger from '@percy/logger';
import Command from '../../command';

export class Start extends Command {
  static description = 'Run start-storybook to snapshot stories';
  static strict = false;

  static flags = {
    ...Command.flags,

    port: flags.integer({
      description: 'port to start Storybook',
      default: 9000
    }),
    host: flags.string({
      description: 'host to start Storybook',
      default: 'localhost'
    })
  };

  static examples = [
    '$ percy storybook:start',
    '$ percy storybook:start --port 9000',
    '$ percy storybook:start --static-dir public'
  ];

  log = logger('cli:storybook:start');

  // Called on error, interupt, or after running
  async finally() {
    await super.finally();
    this.process?.kill();
  }

  // Starts Storybook in a child process and returns its url
  async storybook() {
    let { host, port } = this.flags;
    let args = [`--host=${host}`, `--port=${port}`];

    let spawn = require('cross-spawn');
    args = args.concat(this.parse(Start).argv);
    this.log.info(`Running "start-storybook ${args.join(' ')}"`);

    return new Promise((resolve, reject) => {
      this.process = spawn('start-storybook', args, { stdio: 'inherit' });
      this.process.on('error', reject);
      if (!this.process.pid) return;

      /* istanbul ignore next: this is a storybook flag we don't need to test */
      resolve(`${args.includes('--https') ? 'https' : 'http'}://${host}:${port}/`);
    });
  }
}
