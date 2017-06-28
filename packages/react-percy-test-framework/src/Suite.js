import normalizeSizes from './normalizeSizes';
import { each, mapSeries, reduce } from 'bluebird';

export default class Suite {

  constructor(title, sizes = []) {
    if (typeof title !== 'string') {
      throw new Error(`\`title\` should be a "string", but "${typeof title}" was given`);
    }

    this.title = title;
    this.sizes = normalizeSizes(sizes);

    this.suites = {};
    this.tests = {};

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
        throw new Error(`A test suite with name ${suite.title} has already been added`);
      } else {
        throw new Error(`A test suite with title ${suite.title} has already been added to suite ${this.fullTitle()}`);
      }
    }
    suite.parent = this;
    this.suites[suite.title] = suite;
  }

  addTest(test) {
    if (this.tests[test.title]) {
      throw new Error(`A test with name ${test.title} has already been added to suite ${this.fullTitle()}`);
    }
    test.parent = this;
    this.tests[test.title] = test;
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

  getSizes() {
    if (this.sizes.length === 0 && this.parent) {
      return this.parent.getSizes();
    }
    return this.sizes;
  }

  async getTestCases() {
    await each(this.beforeAll, fn => fn());

    const nestedTestCases = await reduce(
            mapSeries(Object.values(this.suites), suite => suite.getTestCases()),
            (accumulated, testCases) => [...accumulated, ...testCases],
            []
        );

    const testCases = await mapSeries(Object.values(this.tests), async (test) => {
      await this.runBeforeEach();
      const testCase = await test.getTestCase();
      await this.runAfterEach();
      return testCase;
    });

    await each(this.afterAll, fn => fn());

    return [...nestedTestCases, ...testCases];
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
