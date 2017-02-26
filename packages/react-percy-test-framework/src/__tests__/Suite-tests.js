import React from 'react';
import Suite from '../Suite';

jest.mock('../normalizeSizes', () => sizes => sizes);

describe('constructor', () => {

    it('throws when no title is specified', () => {
        expect(() => new Suite()).toThrow();
    });

});

describe('addSuite', () => {

    it('sets parent on suite being added', () => {
        const suite = new Suite('title');
        const nestedSuite = new Suite('nested');

        suite.addSuite(nestedSuite);

        expect(nestedSuite.parent).toEqual(suite);
    });

    it('throws when suite with the same title has already been added', () => {
        const suite = new Suite('parent');

        const nestedSuite1 = new Suite('nested');
        suite.addSuite(nestedSuite1);

        const nestedSuite2 = new Suite('nested');
        expect(() => suite.addSuite(nestedSuite2)).toThrow();
    });

});

describe('addTest', () => {

    it('throws when test with the same title has already been added', () => {
        const suite = new Suite('title');
        suite.parent = new Suite('parent');

        const test1 = { title: 'test' };
        suite.addTest(test1);

        const test2 = { title: 'test' };
        expect(() => suite.addTest(test2)).toThrow();
    });

    it('sets parent on test being added', () => {
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
        const test = { title: 'test' };

        suite.addTest(test);

        expect(test.parent).toEqual(suite);
    });

});

describe('fullTitle', () => {

    it('returns title given no parent', () => {
        const suite = new Suite('title');

        expect(suite.fullTitle()).toEqual('title');
    });

    it('returns title given parent with no title', () => {
        const suite = new Suite('title');
        suite.parent = {
            fullTitle: () => ''
        };

        expect(suite.fullTitle()).toEqual('title');
    });

    it('returns combined title given parent with title', () => {
        const suite = new Suite('title');
        suite.parent = {
            fullTitle: () => 'parent title'
        };

        expect(suite.fullTitle()).toEqual('parent title - title');
    });

});

describe('getSizes', () => {

    it('returns an empty array given no sizes specified and no parent', () => {
        const suite = new Suite('title');

        expect(suite.getSizes()).toEqual([]);
    });

    it('returns parent sizes given no sizes specified', () => {
        const suite = new Suite('title');
        suite.parent = {
            getSizes: () => [320, 768]
        };

        expect(suite.getSizes()).toEqual([320, 768]);
    });

    it('returns sizes specified on suite, ignoring parent sizes', () => {
        const suite = new Suite('title', [500, 1024]);
        suite.parent = {
            getSizes: () => [320, 768]
        };

        expect(suite.getSizes()).toEqual([500, 1024]);
    });

});

describe('getTestCases', () => {

    it('executes hooks in correct order', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
        suite.addBeforeAll(() => hooks.push('beforeAll'));
        suite.addBeforeEach(() => hooks.push('beforeEach'));
        suite.addAfterEach(() => hooks.push('afterEach'));
        suite.addAfterAll(() => hooks.push('afterAll'));
        suite.addTest({
            title: 'test',
            getTestCase: () => {
                hooks.push('test');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'beforeAll',
            'beforeEach',
            'test',
            'afterEach',
            'afterAll'
        ]);
    });

    it('executes parent beforeEach hooks between suite beforeAll and beforeEach hooks', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = {
            runBeforeEach: () => hooks.push('parent beforeEach'),
            runAfterEach: () => {}
        };
        suite.addBeforeAll(() => hooks.push('beforeAll'));
        suite.addBeforeEach(() => hooks.push('beforeEach'));
        suite.addTest({
            title: 'test',
            getTestCase: () => {
                hooks.push('test');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'beforeAll',
            'parent beforeEach',
            'beforeEach',
            'test'
        ]);
    });

    it('executes parent afterEach hooks between suite afterEach and afterAll hooks', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = {
            runBeforeEach: () => {},
            runAfterEach: () => hooks.push('parent afterEach')
        };
        suite.addAfterAll(() => hooks.push('afterAll'));
        suite.addAfterEach(() => hooks.push('afterEach'));
        suite.addTest({
            title: 'test',
            getTestCase: () => {
                hooks.push('test');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'test',
            'afterEach',
            'parent afterEach',
            'afterAll'
        ]);
    });

    it('runs beforeEach hooks before each test', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
        suite.addBeforeEach(() => hooks.push('beforeEach'));
        suite.addTest({
            title: 'test 1',
            getTestCase: () => {
                hooks.push('test 1');
                return {};
            }
        });
        suite.addTest({
            title: 'test 2',
            getTestCase: () => {
                hooks.push('test 2');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'beforeEach',
            'test 1',
            'beforeEach',
            'test 2'
        ]);
    });

    it('runs parent beforeEach hooks before each test', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = {
            runBeforeEach: () => hooks.push('parent beforeEach'),
            runAfterEach: () => {}
        };
        suite.addTest({
            title: 'test 1',
            getTestCase: () => {
                hooks.push('test 1');
                return {};
            }
        });
        suite.addTest({
            title: 'test 2',
            getTestCase: () => {
                hooks.push('test 2');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'parent beforeEach',
            'test 1',
            'parent beforeEach',
            'test 2'
        ]);
    });

    it('runs afterEach hooks after each test', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
        suite.addAfterEach(() => hooks.push('afterEach'));
        suite.addTest({
            title: 'test 1',
            getTestCase: () => {
                hooks.push('test 1');
                return {};
            }
        });
        suite.addTest({
            title: 'test 2',
            getTestCase: () => {
                hooks.push('test 2');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'test 1',
            'afterEach',
            'test 2',
            'afterEach'
        ]);
    });

    it('runs parent afterEach hooks after each test', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = {
            runBeforeEach: () => {},
            runAfterEach: () => hooks.push('parent afterEach')
        };
        suite.addTest({
            title: 'test 1',
            getTestCase: () => {
                hooks.push('test 1');
                return {};
            }
        });
        suite.addTest({
            title: 'test 2',
            getTestCase: () => {
                hooks.push('test 2');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'test 1',
            'parent afterEach',
            'test 2',
            'parent afterEach'
        ]);
    });

    it('only runs beforeAll hook once', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
        suite.addBeforeAll(() => hooks.push('beforeAll'));
        suite.addTest({
            title: 'test 1',
            getTestCase: () => {
                hooks.push('test 1');
                return {};
            }
        });
        suite.addTest({
            title: 'test 2',
            getTestCase: () => {
                hooks.push('test 2');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'beforeAll',
            'test 1',
            'test 2'
        ]);
    });

    it('only runs afterAll hook once', () => {
        const hooks = [];
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
        suite.addAfterAll(() => hooks.push('afterAll'));
        suite.addTest({
            title: 'test 1',
            getTestCase: () => {
                hooks.push('test 1');
                return {};
            }
        });
        suite.addTest({
            title: 'test 2',
            getTestCase: () => {
                hooks.push('test 2');
                return {};
            }
        });

        suite.getTestCases();

        expect(hooks).toEqual([
            'test 1',
            'test 2',
            'afterAll'
        ]);
    });

    it('returns test cases', () => {
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
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

        const testCases = suite.getTestCases();

        expect(testCases).toEqual([
            testCase1,
            testCase2
        ]);
    });

    it('returns test cases from nested suites', () => {
        const suite = new Suite('title');
        suite.parent = new Suite('parent');
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

        const testCases = suite.getTestCases();

        expect(testCases).toEqual([
            nestedTestCase1,
            nestedTestCase2,
            testCase
        ]);
    });

});
