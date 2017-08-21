import each from 'promise-each';

export default class Suite {
  constructor(title, options = {}) {
    if (typeof title !== 'string') {
      throw new Error(`\`title\` should be a "string", but "${typeof title}" was given`);
    }

    this.title = title;
    this.options = options;

    this.suites = [];
    this.orderedSnapshots = [];
    this.snapshotsLookup = {};

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
    this.orderedSnapshots.push(snapshot);
    this.snapshotsLookup[snapshot.fullTitle()] = snapshot;
  }

  hasSnapshot(title) {
    if (this.snapshotsLookup[title]) {
      return true;
    }
    if (this.suites.find(suite => suite.hasSnapshot(title))) {
      return true;
    }
    return false;
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

  getSnapshotDefinitions() {
    const nestedDefinitions = this.suites
      .map(suite => suite.getSnapshotDefinitions())
      .reduce((accumulated, definitions) => [...accumulated, ...definitions], []);

    const definitions = this.orderedSnapshots
      .map(snapshot => snapshot.getDefinition())
      .filter(definition => definition !== undefined);

    return [...nestedDefinitions, ...definitions];
  }

  getSnapshotMarkup(title) {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.snapshotsLookup[title]) {
          await this.runBeforeAll();
          await this.runBeforeEach();
          const markup = await this.snapshotsLookup[title].getMarkup();
          await this.runAfterEach();
          await this.runAfterAll();
          return resolve(markup);
        }

        const suiteWithSnapshot = this.suites.find(suite => suite.hasSnapshot(title));
        if (suiteWithSnapshot) {
          await this.runBeforeAll();
          const markup = await suiteWithSnapshot.getSnapshotMarkup(title);
          await this.runAfterAll();
          return resolve(markup);
        }

        return reject(`Could not find snapshot with title "${title}"`);
      } catch (e) {
        reject(e);
      }
    });
  }

  async runBeforeAll() {
    await each(fn => fn())(this.beforeAll);
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

  async runAfterAll() {
    await each(fn => fn())(this.afterAll);
  }
}
