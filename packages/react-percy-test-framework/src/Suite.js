import { each, mapSeries, reduce } from 'bluebird';

export default class Suite {
  constructor(title, options = {}) {
    if (typeof title !== 'string') {
      throw new Error(`\`title\` should be a "string", but "${typeof title}" was given`);
    }

    this.title = title;
    this.options = options;

    this.suites = {};
    this.snapshots = {};

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
    if (this.suites[suite.title]) {
      if (!this.parent) {
        throw new Error(`A suite with name ${suite.title} has already been added`);
      } else {
        throw new Error(
          `A suite with title ${suite.title} has already been added to suite ${this.fullTitle()}`,
        );
      }
    }
    suite.parent = this;
    this.suites[suite.title] = suite;
  }

  addSnapshot(snapshot) {
    if (this.snapshots[snapshot.title]) {
      throw new Error(
        `A snapshot with name ${snapshot.title} has already been added to suite ${this.fullTitle()}`,
      );
    }
    snapshot.parent = this;
    this.snapshots[snapshot.title] = snapshot;
  }

  fullTitle() {
    if (this.parent) {
      const parentTitle = this.parent.fullTitle();
      if (parentTitle) {
        return `${parentTitle} - ${this.title}`;
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
    await each(this.beforeAll, fn => fn());

    const nestedSnapshots = await reduce(
      mapSeries(Object.values(this.suites), suite => suite.getSnapshots()),
      (accumulated, snapshots) => [...accumulated, ...snapshots],
      [],
    );

    const snapshots = await mapSeries(Object.values(this.snapshots), async snapshot => {
      await this.runBeforeEach();
      const snapshotResult = await snapshot.getSnapshot();
      await this.runAfterEach();
      return snapshotResult;
    });

    await each(this.afterAll, fn => fn());

    return [...nestedSnapshots, ...snapshots];
  }

  async runBeforeEach() {
    if (this.parent) {
      await this.parent.runBeforeEach();
    }

    await each(this.beforeEach, fn => fn());
  }

  async runAfterEach() {
    await each(this.afterEach, fn => fn());

    if (this.parent) {
      await this.parent.runAfterEach();
    }
  }
}
