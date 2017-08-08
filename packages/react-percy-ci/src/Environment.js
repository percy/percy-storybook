import createSuite from '@percy-io/react-percy-test-framework';
import vm from 'vm';

const GLOBALS = [
  'clearImmediate',
  'clearInterval',
  'clearTimeout',
  'console',
  'setImmediate',
  'setInterval',
  'setTimeout',
];

export default class Environment {
  constructor() {
    this.context = vm.createContext();
    this.global = vm.runInContext('this', this.context);
    this.global.global = this.global;
    GLOBALS.forEach(key => {
      this.global[key] = global[key];
    });
    this.suite = createSuite(this.global);
  }

  getSnapshots() {
    return this.suite.getSnapshots();
  }

  async runScript(file) {
    const script = new vm.Script(file.src, {
      filename: file.path,
      displayErrors: true,
    });
    await this.global.suite('', () => {
      script.runInContext(this.context, {
        displayErrors: true,
      });
    });
  }
}
