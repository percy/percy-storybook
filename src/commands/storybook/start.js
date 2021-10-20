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

  // Starts Storybook in a child process and resolves when ready
  async startStorybook() {
    let { host, port } = this.flags;
    let args = ['--ci', `--host=${host}`, `--port=${port}`];

    let spawn = require('cross-spawn');
    args = args.concat(this.parse(Start).argv);
    this.log.info(`Running "start-storybook ${args.join(' ')}"`);

    return new Promise((resolve, reject) => {
      let proc = spawn('start-storybook', args, { stdio: 'inherit' });
      proc.on('error', reject);

      if (proc.pid) {
        /* istanbul ignore next: this is a storybook flag we don't need to test */
        let proto = args.includes('--https') ? 'https' : 'http';
        let close = () => proc.kill();

        this.setStorybookUrl(`${proto}://${host}:${port}`)
          .then(() => resolve({ close }), reject);
      }
    });
  }
}
