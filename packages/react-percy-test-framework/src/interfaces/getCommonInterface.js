import Snapshot from '../Snapshot';
import Suite from '../Suite';

export default function getCommonInterface(suites) {
  const snapshotNames = {};

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
      }
      suites.shift();
      return suite;
    },
    snapshot(title, options, fn) {
      const snapshot = new Snapshot(title, options, fn);
      suites[0].addSnapshot(snapshot);
      const snapshotFullTitle = snapshot.fullTitle();
      if (snapshotNames[snapshotFullTitle]) {
        throw new Error(
          `A snapshot named \`${snapshotFullTitle}\` has already been added, please use a different name`,
        );
      }
      snapshotNames[snapshotFullTitle] = true;
      return snapshot;
    },
  };
}
