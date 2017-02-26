import normalizeSizes from './normalizeSizes';

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
                throw new Error(`A test suite with title ${suite.title}` +
                    ` has already been added to suite ${this.fullTitle()}`);
            }
        }
        suite.parent = this;
        this.suites[suite.title] = suite;
    }

    addTest(test) {
        if (!this.parent) {
            throw new Error('`it` blocks must be inside a `describe` block');
        }
        if (this.tests[test.title]) {
            throw new Error(`A test with name ${test.title}` +
                ` has already been added to suite ${this.fullTitle()}`);
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

    getTestCases() {
        this.beforeAll.forEach(fn => fn());

        const nestedTestCases = Object.values(this.suites)
            .map(suite => suite.getTestCases())
            .reduce((accumulated, testCases) => [...accumulated, ...testCases], []);

        const testCases = Object.values(this.tests)
            .map((test) => {
                this.runBeforeEach();
                const testCase = test.getTestCase();
                this.runAfterEach();
                return testCase;
            });

        this.afterAll.forEach(fn => fn());

        return [...nestedTestCases, ...testCases];
    }

    runBeforeEach() {
        if (this.parent) {
            this.parent.runBeforeEach();
        }

        this.beforeEach.forEach(fn => fn());
    }

    runAfterEach() {
        this.afterEach.forEach(fn => fn());

        if (this.parent) {
            this.parent.runAfterEach();
        }
    }

}
