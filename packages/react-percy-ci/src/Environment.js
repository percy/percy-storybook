import { evalVMScript, jsdom } from 'jsdom';
import createSuite from '@percy-io/react-percy-test-framework';
import vm from 'vm';

export default class Environment {
  constructor() {
    this.context = {};
    this.rootSuite = createSuite(this.context);
  }

  getSnapshotDefinitions() {
    return this.rootSuite.getSnapshotDefinitions();
  }

  runScript(src) {
    const document = jsdom();
    const window = document.defaultView;
    Object.keys(this.context).forEach(key => {
      window[key] = this.context[key];
    });
    const script = new vm.Script(src, {
      displayErrors: true,
    });
    evalVMScript(window, script);
  }
}
