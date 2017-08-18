import each from 'promise-each';
import mapSeries from 'promise-map-series';

export default class Suite {
  constructor(title, options = {}) {
    if (typeof title !== 'string') {
      throw new Error(`\`title\` should be a "string", but "${typeof title}" was given`);
    }

    this.title = title;
    this.options = options;

    this.suites = [];
    this.snapshots = [];

    this.beforeAll = [];
    this.beforeEach = [];
    this.afterEach = [];
    this.afterAll = [];
  }

  addBeforeAll(fn) {
    this.beforeAll.push(fn);
  }

  addBeforeEach(fn) {
    this.beforeEach.push(fn);
  }

  addAfterEach(fn) {
    this.afterEach.push(fn);
  }

  addAfterAll(fn) {
    this.afterAll.push(fn);
  }

  addSuite(suite) {
    suite.parent = this;
    this.suites.push(suite);
  }

  addSnapshot(snapshot) {
    snapshot.parent = this;
    this.snapshots.push(snapshot);
  }

  fullTitle() {
    if (this.parent) {
      const parentTitle = this.parent.fullTitle();
      if (parentTitle) {
        return `${parentTitle}: ${this.title}`;
      }
    }

    return this.title;
  }

  getOptions() {
    if (this.parent) {
      return {
        ...this.parent.getOptions(),
        ...this.options,
      };
    }

    return this.options;
  }

  async getSnapshots() {
    await each(fn => fn())(this.beforeAll);

    const nestedSnapshots = await mapSeries(this.suites, suite =>
      suite.getSnapshots(),
    ).then(snapshots =>
      snapshots.reduce((accumulated, snapshots) => [...accumulated, ...snapshots], []),
    );

    const snapshots = await mapSeries(this.snapshots, async snapshot => {
      await this.runBeforeEach();
      const snapshotResult = await snapshot.getSnapshot();
      await this.runAfterEach();
      return snapshotResult;
    });
    const nonEmptySnapshots = snapshots.filter(snapshot => snapshot !== undefined);

    await each(fn => fn())(this.afterAll);

    return [...nestedSnapshots, ...nonEmptySnapshots];
  }

  async runBeforeEach() {
    if (this.parent) {
      await this.parent.runBeforeEach();
    }

    await each(fn => fn())(this.beforeEach);
  }

  async runAfterEach() {
    await each(fn => fn())(this.afterEach);

    if (this.parent) {
      await this.parent.runAfterEach();
    }
  }
}
