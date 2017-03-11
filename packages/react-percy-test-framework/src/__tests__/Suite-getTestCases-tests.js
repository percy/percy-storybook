import React from 'react';
import Suite from '../Suite';

jest.mock('../normalizeSizes');

let executed;
let suite;
let parent;

const execute = name => executed.push(name);
const executeAsync = (name, delay) => new Promise((resolve) => {
    setTimeout(() => {
        execute(name);
        resolve();
    }, delay);
});

const givenSyncBeforeAll = (targetSuite, name) => targetSuite.addBeforeAll(() => execute(name));
const givenAsyncBeforeAll = (targetSuite, name, delay = 1) => targetSuite.addBeforeAll(() => executeAsync(name, delay));

const givenSyncBeforeEach = (targetSuite, name) => targetSuite.addBeforeEach(() => execute(name));
const givenAsyncBeforeEach = (targetSuite, name, delay = 1) =>
    targetSuite.addBeforeEach(() => executeAsync(name, delay));

const givenSyncAfterEach = (targetSuite, name) => targetSuite.addAfterEach(() => execute(name));
const givenAsyncAfterEach = (targetSuite, name, delay = 1) => targetSuite.addAfterEach(() => executeAsync(name, delay));

const givenSyncAfterAll = (targetSuite, name) => targetSuite.addAfterAll(() => execute(name));
const givenAsyncAfterAll = (targetSuite, name, delay = 1) => targetSuite.addAfterAll(() => executeAsync(name, delay));

const givenSyncTest = (targetSuite, name) => targetSuite.addTest({
    title: name,
    getTestCase: () => {
        execute(name);
        return {};
    }
});
const givenAsyncTest = (targetSuite, name, delay = 1) => targetSuite.addTest({
    title: name,
    getTestCase: async () => {
        await executeAsync(name, delay);
        return {};
    }
});

beforeEach(() => {
    executed = [];
    suite = new Suite('title');
    suite.parent = parent = new Suite('parent');
});

describe('beforeAll hooks', () => {

    it('executes synchronous beforeAll hooks in the order specified in the suite', async () => {
        givenSyncBeforeAll(suite, 'beforeAll 1');
        givenSyncBeforeAll(suite, 'beforeAll 2');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll 1',
            'beforeAll 2',
            'test'
        ]);
    });

    it('executes asynchronous beforeAll hooks in the order specified in the suite', async () => {
        givenAsyncBeforeAll(suite, 'beforeAll 1', 2);
        givenAsyncBeforeAll(suite, 'beforeAll 2', 1);
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll 1',
            'beforeAll 2',
            'test'
        ]);
    });

    it('executes synchronous beforeAll hook before other hooks in suite', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes asynchronous beforeAll hook before other hooks in suite', async () => {
        givenAsyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes synchronous beforeAll hook before nested test suites', async () => {
        const nested = new Suite('nested');
        suite.addSuite(nested);

        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeAll(nested, 'nested beforeAll');
        givenSyncTest(nested, 'nested test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'nested beforeAll',
            'nested test'
        ]);
    });

    it('executes asynchronous beforeAll hook before nested test suites', async () => {
        const nested = new Suite('nested');
        suite.addSuite(nested);

        givenAsyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeAll(nested, 'nested beforeAll');
        givenSyncTest(nested, 'nested test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'nested beforeAll',
            'nested test'
        ]);
    });

    it('executes synchronous beforeAll hook only once given multiple tests', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'test 1',
            'test 2'
        ]);
    });

    it('executes asynchronous beforeAll hook only once given multiple tests', async () => {
        givenAsyncBeforeAll(suite, 'beforeAll');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'test 1',
            'test 2'
        ]);
    });

    it('executes synchronous beforeAll hook only once given multiple nested suites', async () => {
        const nested1 = new Suite('nested 1');
        const nested2 = new Suite('nested 2');
        suite.addSuite(nested1);
        suite.addSuite(nested2);

        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncTest(nested1, 'nested test 1');
        givenSyncTest(nested2, 'nested test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'nested test 1',
            'nested test 2'
        ]);
    });

    it('executes asynchronous beforeAll hook only once given multiple nested suites', async () => {
        const nested1 = new Suite('nested 1');
        const nested2 = new Suite('nested 2');
        suite.addSuite(nested1);
        suite.addSuite(nested2);

        givenAsyncBeforeAll(suite, 'beforeAll');
        givenSyncTest(nested1, 'nested test 1');
        givenSyncTest(nested2, 'nested test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'nested test 1',
            'nested test 2'
        ]);
    });

});

describe('beforeEach hooks', () => {

    it('executes synchronous beforeEach hooks in the order specified in the suite', async () => {
        givenSyncBeforeEach(suite, 'beforeEach 1');
        givenSyncBeforeEach(suite, 'beforeEach 2');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeEach 1',
            'beforeEach 2',
            'test'
        ]);
    });

    it('executes asynchronous beforeEach hooks in the order specified in the suite', async () => {
        givenAsyncBeforeEach(suite, 'beforeEach 1', 2);
        givenAsyncBeforeEach(suite, 'beforeEach 2', 1);
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeEach 1',
            'beforeEach 2',
            'test'
        ]);
    });

    it('executes synchronous beforeEach hook before test and after hooks', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes asynchronous beforeEach hook before test and after hooks', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenAsyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes synchronous beforeEach hook before each test', async () => {
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeEach',
            'test 1',
            'beforeEach',
            'test 2'
        ]);
    });

    it('executes asynchronous beforeEach hook before each test', async () => {
        givenAsyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeEach',
            'test 1',
            'beforeEach',
            'test 2'
        ]);
    });

    it('executes synchronous parent beforeEach hook before each test', async () => {
        givenSyncBeforeEach(parent, 'parent beforeEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'parent beforeEach',
            'test 1',
            'parent beforeEach',
            'test 2'
        ]);
    });

    it('executes asynchronous parent beforeEach hook before each test', async () => {
        givenAsyncBeforeEach(parent, 'parent beforeEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'parent beforeEach',
            'test 1',
            'parent beforeEach',
            'test 2'
        ]);
    });

    it('executes synchronous parent beforeEach hook before suite beforeEach hook', async () => {
        givenSyncBeforeEach(parent, 'parent beforeEach');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'parent beforeEach',
            'beforeEach',
            'test'
        ]);
    });

    it('executes asynchronous parent beforeEach hook before suite beforeEach hook', async () => {
        givenAsyncBeforeEach(parent, 'parent beforeEach');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'parent beforeEach',
            'beforeEach',
            'test'
        ]);
    });

});

describe('afterEach hooks', () => {

    it('executes synchronous afterEach hooks in the order specified in the suite', async () => {
        givenSyncAfterEach(suite, 'afterEach 1');
        givenSyncAfterEach(suite, 'afterEach 2');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterEach 1',
            'afterEach 2'
        ]);
    });

    it('executes asynchronous afterEach hooks in the order specified in the suite', async () => {
        givenAsyncAfterEach(suite, 'afterEach 1', 2);
        givenAsyncAfterEach(suite, 'afterEach 2', 1);
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterEach 1',
            'afterEach 2'
        ]);
    });

    it('executes synchronous afterEach hook after test and before afterAll hooks', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes asynchronous afterEach hook after test and before afterAll hooks', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenAsyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes synchronous afterEach hook after each test', async () => {
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'afterEach',
            'test 2',
            'afterEach'
        ]);
    });

    it('executes asynchronous afterEach hook after each test', async () => {
        givenAsyncAfterEach(suite, 'afterEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'afterEach',
            'test 2',
            'afterEach'
        ]);
    });

    it('executes synchronous parent afterEach hook after each test', async () => {
        givenSyncAfterEach(parent, 'parent afterEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'parent afterEach',
            'test 2',
            'parent afterEach'
        ]);
    });

    it('executes asynchronous parent afterEach hook after each test', async () => {
        givenAsyncAfterEach(parent, 'parent afterEach');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'parent afterEach',
            'test 2',
            'parent afterEach'
        ]);
    });

    it('executes synchronous parent afterEach hook after suite afterEach hook', async () => {
        givenSyncAfterEach(parent, 'parent afterEach');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterEach',
            'parent afterEach'
        ]);
    });

    it('executes asynchronous parent afterEach hook after suite afterEach hook', async () => {
        givenAsyncAfterEach(parent, 'parent afterEach');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterEach',
            'parent afterEach'
        ]);
    });

});

describe('afterAll hooks', () => {

    it('executes synchronous afterAll hooks in the order specified in the suite', async () => {
        givenSyncAfterAll(suite, 'afterAll 1');
        givenSyncAfterAll(suite, 'afterAll 2');
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterAll 1',
            'afterAll 2'
        ]);
    });

    it('executes asynchronous afterAll hooks in the order specified in the suite', async () => {
        givenAsyncAfterAll(suite, 'afterAll 1', 2);
        givenAsyncAfterAll(suite, 'afterAll 2', 1);
        givenSyncTest(suite, 'test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterAll 1',
            'afterAll 2'
        ]);
    });

    it('executes synchronous afterAll hook after other hooks in suite', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes asynchronous afterAll hook after other hooks in suite', async () => {
        givenSyncBeforeAll(suite, 'beforeAll');
        givenSyncBeforeEach(suite, 'beforeEach');
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenAsyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes synchronous afterAll hook after nested test suites', async () => {
        const nested = new Suite('nested');
        suite.addSuite(nested);

        givenSyncAfterAll(suite, 'afterAll');
        givenSyncAfterAll(nested, 'nested afterAll');
        givenSyncTest(nested, 'nested test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'nested test',
            'nested afterAll',
            'afterAll'
        ]);
    });

    it('executes asynchronous afterAll hook before nested test suites', async () => {
        const nested = new Suite('nested');
        suite.addSuite(nested);

        givenAsyncAfterAll(suite, 'afterAll');
        givenSyncAfterAll(nested, 'nested afterAll');
        givenSyncTest(nested, 'nested test');

        await suite.getTestCases();

        expect(executed).toEqual([
            'nested test',
            'nested afterAll',
            'afterAll'
        ]);
    });

    it('executes synchronous afterAll hook only once given multiple tests', async () => {
        givenSyncAfterAll(suite, 'afterAll');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'test 2',
            'afterAll'
        ]);
    });

    it('executes asynchronous afterAll hook only once given multiple tests', async () => {
        givenAsyncAfterAll(suite, 'afterAll');
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'test 2',
            'afterAll'
        ]);
    });

    it('executes synchronous afterAll hook only once given multiple nested suites', async () => {
        const nested1 = new Suite('nested 1');
        const nested2 = new Suite('nested 2');
        suite.addSuite(nested1);
        suite.addSuite(nested2);

        givenSyncAfterAll(suite, 'afterAll');
        givenSyncTest(nested1, 'nested test 1');
        givenSyncTest(nested2, 'nested test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'nested test 1',
            'nested test 2',
            'afterAll'
        ]);
    });

    it('executes asynchronous afterAll hook only once given multiple nested suites', async () => {
        const nested1 = new Suite('nested 1');
        const nested2 = new Suite('nested 2');
        suite.addSuite(nested1);
        suite.addSuite(nested2);

        givenAsyncAfterAll(suite, 'afterAll');
        givenSyncTest(nested1, 'nested test 1');
        givenSyncTest(nested2, 'nested test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'nested test 1',
            'nested test 2',
            'afterAll'
        ]);
    });

});

describe('tests', () => {

    it('runs synchronous tests in order specified in suite', async () => {
        givenSyncTest(suite, 'test 1');
        givenSyncTest(suite, 'test 2');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'test 2'
        ]);
    });

    it('runs asynchronous tests in order specified in suite', async () => {
        givenAsyncTest(suite, 'test 1', 2);
        givenAsyncTest(suite, 'test 2', 1);

        await suite.getTestCases();

        expect(executed).toEqual([
            'test 1',
            'test 2'
        ]);
    });

    it('runs synchronous tests before after hooks', async () => {
        givenSyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('runs asynchronous tests before after hooks', async () => {
        givenAsyncTest(suite, 'test');
        givenSyncAfterEach(suite, 'afterEach');
        givenSyncAfterAll(suite, 'afterAll');

        await suite.getTestCases();

        expect(executed).toEqual([
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('returns test cases', async () => {
        const testCase1 = {
            title: 'test 1',
            markup: <div>Test 1</div>
        };
        suite.addTest({
            title: 'test 1',
            getTestCase: () => testCase1
        });
        const testCase2 = {
            title: 'test 2',
            markup: <div>Test 2</div>
        };
        suite.addTest({
            title: 'test 2',
            getTestCase: () => testCase2
        });

        const testCases = await suite.getTestCases();

        expect(testCases).toEqual([
            testCase1,
            testCase2
        ]);
    });

});

it('nested suites', () => {

    it('returns test cases from nested suites', async () => {
        const testCase = {
            title: 'test',
            markup: <div>Test</div>
        };
        suite.addTest({
            title: 'test 1',
            getTestCase: () => testCase
        });
        const nestedSuite = new Suite('nested');
        suite.addSuite(nestedSuite);
        const nestedTestCase1 = {
            title: 'nested test 1',
            markup: <div>Nested Test 1</div>
        };
        nestedSuite.addTest({
            title: 'nested test 1',
            getTestCase: () => nestedTestCase1
        });
        const nestedTestCase2 = {
            title: 'nested test 2',
            markup: <div>Nested Test 2</div>
        };
        nestedSuite.addTest({
            title: 'nested test 2',
            getTestCase: () => nestedTestCase2
        });

        const testCases = await suite.getTestCases();

        expect(testCases).toEqual([
            nestedTestCase1,
            nestedTestCase2,
            testCase
        ]);
    });

});
