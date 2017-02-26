import getCommonInterface from '../getCommonInterface';
import Suite from '../../Suite';
import Test from '../../Test';

jest.mock('../../Suite');
jest.mock('../../Test');

let suites;
let common;

beforeEach(() => {
    const rootSuite = new Suite();
    suites = [rootSuite];
    common = getCommonInterface(suites);
});

describe('beforeAll', () => {

    it('adds beforeAll hook to the current suite', () => {
        const hook = jest.fn();

        common.beforeAll(hook);

        expect(suites[0].addBeforeAll).toHaveBeenCalledWith(hook);
    });

});

describe('beforeEach', () => {

    it('adds beforeEach hook to the current suite', () => {
        const hook = jest.fn();

        common.beforeEach(hook);

        expect(suites[0].addBeforeEach).toHaveBeenCalledWith(hook);
    });

});

describe('afterEach', () => {

    it('adds afterEach hook to the current suite', () => {
        const hook = jest.fn();

        common.afterEach(hook);

        expect(suites[0].addAfterEach).toHaveBeenCalledWith(hook);
    });

});

describe('afterAll', () => {

    it('adds afterAll hook to the current suite', () => {
        const hook = jest.fn();

        common.afterAll(hook);

        expect(suites[0].addAfterAll).toHaveBeenCalledWith(hook);
    });

});

describe('suite', () => {

    it('throws when no callback is specified', () => {
        expect(() => common.suite('suite')).toThrow();
    });

    it('adds the suite as a child of the current suite', () => {
        common.suite('suite', jest.fn());

        expect(suites[0].addSuite).toHaveBeenCalledWith(expect.any(Suite));
    });

    it('returns the new suite', () => {
        const newSuite = common.suite('suite', jest.fn());

        expect(newSuite).toEqual(expect.any(Suite));
    });

    it('sets the new suite as the current suite while executing the callback', () => {
        let callbackCurrentSuite;
        const callback = jest.fn(() => { callbackCurrentSuite = suites[0]; });

        const newSuite = common.suite('suite', callback);

        expect(callbackCurrentSuite).toBe(newSuite);
        expect(callbackCurrentSuite).not.toBe(suites[0]);
    });

    it('restores the current suite after executing the callback', () => {
        const currentSuite = suites[0];

        const newSuite = common.suite('suite', jest.fn());

        expect(suites[0]).toBe(currentSuite);
        expect(suites[0]).not.toBe(newSuite);
    });

});

describe('test', () => {

    it('adds test to the current suite', () => {
        common.test('test', jest.fn());

        expect(suites[0].addTest).toHaveBeenCalledWith(expect.any(Test));
    });

    it('returns the new test', () => {
        const newTest = common.test('test', jest.fn());

        expect(newTest).toEqual(expect.any(Test));
    });

});
