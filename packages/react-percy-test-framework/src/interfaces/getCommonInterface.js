import Snapshot from '../Snapshot';
import Suite from '../Suite';

export default function getCommonInterface(suites) {
  return {
    beforeAll(fn) {
      suites[0].addBeforeAll(fn);
    },
    beforeEach(fn) {
      suites[0].addBeforeEach(fn);
    },
    afterEach(fn) {
      suites[0].addAfterEach(fn);
    },
    afterAll(fn) {
      suites[0].addAfterAll(fn);
    },
    async suite(title, options, fn) {
      if (typeof fn === 'undefined') {
        fn = options;
        options = undefined;
      }
      const suite = new Suite(title, options);
      suites[0].addSuite(suite);
      suites.unshift(suite);
      if (typeof fn === 'function') {
        await fn.call(suite);
      } else {
        throw new Error(`Suite "${suite.fullTitle()}" was defined but no callback was supplied.`);
      }
      suites.shift();
      return suite;
    },
    snapshot(title, options, fn) {
      const snapshot = new Snapshot(title, options, fn);
      suites[0].addSnapshot(snapshot);
      return snapshot;
    },
  };
}
